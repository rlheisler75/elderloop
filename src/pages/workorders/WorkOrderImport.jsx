import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Upload, Check, AlertTriangle, FileSpreadsheet, Info } from 'lucide-react'

// Bring a community's work order history over from its old system (built for the
// Work Hub "Work Orders" CSV export). Each row keeps its old WO number; locations,
// workers, requestors, residents and categories are matched to this community's
// records, and whatever can't be matched is kept in the work order's notes.
// Re-running the same file skips WO numbers that are already here.

const REQUIRED = ['WO Number', 'Description']
const BATCH = 250

// Quote-aware CSV parser (same as Staff Import; keeps line breaks inside quoted fields)
const parseCSV = (text) => {
  const rows = []
  let row = [], cur = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') inQ = false
      else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(cur.trim()); cur = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(cur.trim()); rows.push(row); row = []; cur = ''
    } else cur += ch
  }
  if (cur || row.length) { row.push(cur.trim()); rows.push(row) }
  const nonEmpty = rows.filter(r => r.some(v => v))
  if (nonEmpty.length < 2) return { headers: [], rows: [] }
  const headers = nonEmpty[0].map(h => h.replace(/^﻿/, '').trim())
  return {
    headers,
    rows: nonEmpty.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] || '']))),
  }
}

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

// "11/3/2026 1:02:40 PM" (the community's local time) -> ISO timestamp
function localToISO(value, timeZone) {
  const m = (value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?$/i)
  if (!m) return null
  let h = Number(m[4] || 0)
  if (m[7]) h = (h % 12) + (m[7].toUpperCase() === 'PM' ? 12 : 0)
  const wall = Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), h, Number(m[5] || 0), Number(m[6] || 0))
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
  const offsetAt = (t) => {
    const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map(x => [x.type, x.value]))
    return Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second) - t
  }
  let t = wall - offsetAt(wall)
  t = wall - offsetAt(t) // second pass lands on the right side of a DST change
  return new Date(t).toISOString()
}

const toDate = (value) => {
  const m = (value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null
}

const PRIORITY = { '1': 'urgent', '2': 'urgent', '3': 'high', '4': 'normal', '5': 'low', '6': 'low' }
const PLANNED_SOURCES = ['inspections', 'pm', 'projects', 'refurbishments']
const CATEGORY_ALIASES = { paint: 'painting', 'pest control': 'pest_control' }
const NICKNAMES = {
  jim: 'james', jimmy: 'james', don: 'donald', ray: 'raymond', patty: 'patricia', pat: 'patricia', bob: 'robert', bobby: 'robert',
  bill: 'william', billy: 'william', dick: 'richard', rick: 'richard', tom: 'thomas', mike: 'michael', dave: 'david', joe: 'joseph',
  ken: 'kenneth', larry: 'lawrence', jerry: 'gerald', chuck: 'charles', charlie: 'charles', ed: 'edward', fred: 'frederick',
  liz: 'elizabeth', beth: 'elizabeth', betty: 'elizabeth', peggy: 'margaret', marge: 'margaret', sue: 'susan', kathy: 'kathleen',
  barb: 'barbara', deb: 'deborah', debbie: 'deborah', jan: 'janet', judy: 'judith', andy: 'andrew', steve: 'stephen', ron: 'ronald',
  gene: 'eugene', hank: 'henry', walt: 'walter', al: 'albert', dot: 'dorothy', dottie: 'dorothy', connie: 'constance',
}

function makeTitle(text) {
  const first = (text || '').split(/\r?\n/)[0].trim()
  if (first.length <= 120) return first || 'Work order'
  return first.slice(0, 117).replace(/\s+\S*$/, '') + '…'
}

export default function WorkOrderImport({ orgId, timeZone = 'America/Chicago' }) {
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [plan, setPlan]         = useState(null)   // { rows, newCats, summary }
  const [progress, setProgress] = useState(null)   // { done, total }
  const [result, setResult]     = useState(null)

  async function fetchAllRows(table, select, filter) {
    const out = []
    for (let from = 0; ; from += 1000) {
      let q = supabase.from(table).select(select).range(from, from + 999)
      q = filter(q)
      const { data, error: err } = await q
      if (err) throw err
      out.push(...(data || []))
      if (!data || data.length < 1000) return out
    }
  }

  async function handleFile(file) {
    if (!file) return
    setFileName(file.name); setError(''); setPlan(null); setResult(null); setLoading(true)
    try {
      const { headers, rows } = parseCSV(await file.text())
      const missing = REQUIRED.filter(h => !headers.includes(h))
      if (missing.length) throw new Error(`This doesn't look like a work order export: missing ${missing.join(', ')} column.`)

      const byOrg = (q) => q.eq('organization_id', orgId)
      const [locations, profiles, deptRoles, residents, existing, catRes] = await Promise.all([
        fetchAllRows('locations', 'id,parent_id,name', byOrg),
        fetchAllRows('profiles', 'id,first_name,last_name,role', byOrg),
        fetchAllRows('staff_department_roles', 'profile_id,department', q => byOrg(q).eq('department', 'maintenance')),
        fetchAllRows('residents', 'id,first_name,last_name,is_active', byOrg),
        fetchAllRows('work_orders', 'wo_number', q => byOrg(q).not('wo_number', 'is', null)),
        supabase.from('wo_categories').select('*').or(`organization_id.is.null,organization_id.eq.${orgId}`),
      ])
      const categories = catRes.data || []

      // Locations: full "A > B > C" path -> id
      const locById = Object.fromEntries(locations.map(l => [l.id, l]))
      const pathOf = (l) => { const parts = []; let cur = l; while (cur) { parts.unshift(cur.name); cur = cur.parent_id ? locById[cur.parent_id] : null } return parts }
      const locByPath = {}
      locations.forEach(l => { locByPath[pathOf(l).map(norm).join(' > ')] = { id: l.id, path: pathOf(l).join(' > ') } })
      const matchLocation = (text) => {
        const parts = (text || '').split('>').map(norm).filter(Boolean)
        for (let n = parts.length; n > 0; n--) {
          const hit = locByPath[parts.slice(0, n).join(' > ')]
          if (hit) return { ...hit, exact: n === parts.length }
        }
        return null
      }

      // People: Work Hub writes workers as "Last  First [Middle]" (two spaces)
      const maint = new Set(deptRoles.map(d => d.profile_id))
      const staff = profiles.filter(p => !['resident', 'family'].includes(p.role))
      const preferMaint = (list) => list.length > 1 ? list.filter(p => maint.has(p.id)) : list
      const matchWorker = (last, first) => {
        let hits = preferMaint(staff.filter(p => norm(p.last_name) === last && norm(p.first_name).split(' ')[0] === first))
        if (hits.length === 1) return hits[0]
        hits = staff.filter(p => maint.has(p.id) && norm(p.last_name) === last)
        return hits.length === 1 ? hits[0] : null
      }
      const matchFullName = (name) => {
        const hits = preferMaint(staff.filter(p => norm(`${p.first_name} ${p.last_name}`) === norm(name)))
        return hits.length === 1 ? hits[0] : null
      }
      // Residents by "first last", with common nicknames folded (Jim Wilkins = James Wilkins)
      const resKey = (name) => {
        const words = norm(name.replace(/\([^)]*\)/g, ' ').replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i, '')).split(' ').filter(Boolean)
        if (words.length < 2) return null
        return `${NICKNAMES[words[0]] || words[0]} ${words.at(-1)}`
      }
      const resByName = {}
      residents.forEach(r => { const k = resKey(`${r.first_name} ${r.last_name}`); if (k) (resByName[k] ||= []).push(r) })
      const matchResident = (text) => {
        const parts = (text || '').split(/\s*(?:&|\band\b|,|\/)\s*/i).map(s => s.trim()).filter(Boolean)
        const lastWord = (parts.at(-1) || '').split(/\s+/).at(-1)
        for (const p of parts) {
          for (const key of [resKey(p), resKey(`${p} ${lastWord}`)]) {
            const hits = resByName[key] || []
            const pick = hits.length > 1 ? hits.filter(r => r.is_active) : hits
            if (pick.length === 1) return pick[0]
          }
        }
        return null
      }

      // Categories: reuse this community's (or the starter) categories by name; new ones get created
      const top = categories.filter(c => !c.parent_id)
      const usedKeys = new Set(categories.map(c => c.key))
      const newCats = []          // { tempKey, label, parentKey }
      const topByLabel = {}
      top.forEach(c => { topByLabel[norm(c.label)] = c.key })
      Object.entries(CATEGORY_ALIASES).forEach(([label, key]) => { if (usedKeys.has(key) && !topByLabel[label]) topByLabel[label] = key })
      const subByLabel = {}
      categories.filter(c => c.parent_id).forEach(c => {
        const parent = categories.find(p => p.id === c.parent_id)
        if (parent) subByLabel[`${parent.key}|${norm(c.label)}`] = c.key
      })
      const uniqueKey = (base) => { let k = base, i = 2; while (usedKeys.has(k)) k = `${base}_${i++}`; usedKeys.add(k); return k }
      const categoryKey = (label) => {
        if (!label) return 'other'
        const n = norm(label)
        if (!topByLabel[n]) { topByLabel[n] = uniqueKey(slug(label) || 'category'); newCats.push({ key: topByLabel[n], label: label.trim(), parentKey: null }) }
        return topByLabel[n]
      }
      const subcategoryKey = (parentKey, label) => {
        if (!label || parentKey === 'other') return null
        const k = `${parentKey}|${norm(label)}`
        if (!subByLabel[k]) { subByLabel[k] = uniqueKey(`${parentKey}__${slug(label)}`); newCats.push({ key: subByLabel[k], label: label.trim(), parentKey }) }
        return subByLabel[k]
      }

      const have = new Set(existing.map(w => w.wo_number))
      const summary = { total: rows.length, skipped: 0, badNumber: 0, statuses: {}, locExact: 0, locPartial: 0, locNone: 0,
        assigned: 0, vendors: new Set(), unmatchedPeople: new Set(), residents: 0, residentsUnmatched: 0 }
      const out = []

      for (const r of rows) {
        const woNumber = parseInt(r['WO Number'], 10)
        if (!woNumber) { summary.badNumber++; continue }
        if (have.has(woNumber)) { summary.skipped++; continue }
        have.add(woNumber)

        const notes = [`Imported from Work Hub (WO #${woNumber}).`]

        // Workers
        const workers = [...new Set((r.Worker || '').split(';').map(s => s.trim()).filter(Boolean))]
        let assignee = null, vendor = null
        const unmatched = []
        for (const w of workers) {
          const m = w.match(/^(.+?)\s{2,}(.+)$/)
          if (!m) { vendor ||= w; summary.vendors.add(w); continue }
          const hit = matchWorker(norm(m[1]), norm(m[2]).split(' ')[0])
          if (hit) { assignee ||= hit }
          else { unmatched.push(`${m[2].trim()} ${m[1].trim()}`); summary.unmatchedPeople.add(`${m[2].trim()} ${m[1].trim()}`) }
        }
        if (workers.length > 1 || unmatched.length) notes.push(`Worker(s) in Work Hub: ${workers.join('; ').replace(/\s{2,}/g, ' ')}`)
        if (assignee) summary.assigned++

        // Status
        const st = norm(r.Status)
        let status = st === 'complete' ? 'closed'
          : (st === 'cancelled' || st === 'rejected') ? 'cancelled'
          : (assignee || vendor) ? 'in_progress' : 'open'
        if (st === 'rejected') notes.push('Rejected in Work Hub.')
        summary.statuses[r.Status || '(blank)'] = (summary.statuses[r.Status || '(blank)'] || 0) + 1

        const createdAt = localToISO(r['Created On'], timeZone) || localToISO(r['Start Date'], timeZone)
        const completedAt = status === 'closed' ? (localToISO(r['Complete Date'], timeZone) || createdAt) : null

        // Location
        const loc = r.Location ? matchLocation(r.Location) : null
        if (!r.Location) { /* none given */ }
        else if (!loc) summary.locNone++
        else if (loc.exact) summary.locExact++
        else summary.locPartial++

        // Resident / requestor
        const resident = r.Resident ? matchResident(r.Resident) : null
        if (r.Resident && resident) summary.residents++
        if (r.Resident && !resident) { summary.residentsUnmatched++; notes.push(`Resident: ${r.Resident}`) }
        const requestor = r.Requestor ? matchFullName(r.Requestor) : null

        const src = norm(r['Source Of Work'])
        const source = src === 'resident' ? 'resident' : src === 'resident family' ? 'family' : 'staff'
        if (r['Source Of Work'] && !['staff', 'resident', 'resident family'].includes(src)) notes.push(`Source: ${r['Source Of Work']}`)
        if (r.Priority) notes.push(`Work Hub priority: ${r.Priority}`)
        if (norm(r.Billable) === 'true') notes.push(`Billable${Number(r['Bill Amount']) ? `: $${Number(r['Bill Amount']).toFixed(2)}` : ''}`)
        if (r['Created By'] && r['Created By'] !== r.Requestor) notes.push(`Entered by: ${r['Created By']}`)

        const category = categoryKey(r.Category)
        const description = (r.Description || '').trim()
        const title = makeTitle(description)
        const cost = Number(r.Cost)

        out.push({
          organization_id: orgId,
          wo_number: woNumber,
          title,
          description: description && description !== title ? description : null,
          category,
          subcategory: subcategoryKey(category, r.Subcategory),
          status,
          priority: PRIORITY[(r.Priority || '').trim()[0]] || 'normal',
          source,
          work_type: PLANNED_SOURCES.includes(src) ? 'planned' : null,
          location_id: loc?.id || null,
          location_path: (loc?.exact ? loc.path : r.Location) || null,
          resident_id: resident?.id || null,
          submitted_by: requestor?.id || null,
          submitted_by_name: r.Requestor || r['Created By'] || null,
          assigned_to: assignee?.id || null,
          vendor_name: vendor,
          due_date: toDate(r['Due Date']),
          completed_at: completedAt,
          parts_cost: cost > 0 ? cost : null,
          notes: notes.join('\n'),
          created_at: createdAt,
          updated_at: completedAt || createdAt,
        })
      }
      setPlan({ rows: out, newCats, summary })
    } catch (e) {
      setError(e.message || String(e))
    }
    setLoading(false)
  }

  async function runImport() {
    if (!plan) return
    setError(''); setProgress({ done: 0, total: plan.rows.length })
    try {
      // Categories first (parents before their subcategories)
      if (plan.newCats.length) {
        const { data: cats } = await supabase.from('wo_categories').select('id,key').or(`organization_id.is.null,organization_id.eq.${orgId}`)
        const idByKey = Object.fromEntries((cats || []).map(c => [c.key, c.id]))
        const parents = plan.newCats.filter(c => !c.parentKey && !idByKey[c.key])
        if (parents.length) {
          const { data, error: err } = await supabase.from('wo_categories')
            .insert(parents.map(c => ({ organization_id: orgId, key: c.key, label: c.label, is_custom: true, sort_order: 999 })))
            .select('id,key')
          if (err) throw err
          data.forEach(c => { idByKey[c.key] = c.id })
        }
        const subs = plan.newCats.filter(c => c.parentKey && !idByKey[c.key])
        if (subs.length) {
          const { error: err } = await supabase.from('wo_categories')
            .insert(subs.map(c => ({ organization_id: orgId, parent_id: idByKey[c.parentKey], key: c.key, label: c.label, is_custom: true, sort_order: 999 })))
          if (err) throw err
        }
      }
      for (let i = 0; i < plan.rows.length; i += BATCH) {
        const { error: err } = await supabase.from('work_orders').insert(plan.rows.slice(i, i + BATCH))
        if (err) throw new Error(`Stopped after ${i} work orders: ${err.message}. Fix the problem and choose the file again — the ones already imported will be skipped.`)
        setProgress({ done: Math.min(i + BATCH, plan.rows.length), total: plan.rows.length })
      }
      setResult({ imported: plan.rows.length, categories: plan.newCats.length })
      setPlan(null)
    } catch (e) {
      setError(e.message || String(e))
    }
    setProgress(null)
  }

  const s = plan?.summary
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex gap-3 p-4 bg-brand-50 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900 rounded-xl text-sm text-slate-700 dark:text-slate-300">
        <Info size={18} className="text-brand-600 flex-shrink-0 mt-0.5" />
        <div>
          Bring over work order history from Work Hub: export <b>Work Orders</b> as CSV and choose the file here.
          Work orders keep their old numbers, and locations, workers, requestors, residents and categories are matched to this community.
          Anything that can't be matched is kept in each work order's notes. Choosing the same file again skips work orders already imported.
        </div>
      </div>

      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={e => { handleFile(e.target.files?.[0]); e.target.value = '' }} />
      <button onClick={() => fileRef.current?.click()} disabled={loading || !!progress}
        className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
        <Upload size={16} /> {loading ? 'Reading file…' : 'Choose CSV file'}
      </button>
      {fileName && <div className="flex items-center gap-2 text-sm text-slate-500"><FileSpreadsheet size={14} /> {fileName}</div>}

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> {error}
        </div>
      )}

      {s && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <div className="font-semibold text-slate-800 dark:text-slate-100">
            {plan.rows.length.toLocaleString()} work orders ready to import
            {s.skipped > 0 && <span className="font-normal text-slate-500"> · {s.skipped.toLocaleString()} already imported (skipped)</span>}
            {s.badNumber > 0 && <span className="font-normal text-amber-600"> · {s.badNumber} rows without a WO number (skipped)</span>}
          </div>
          <div>Status: {Object.entries(s.statuses).map(([k, v]) => `${k} ${v.toLocaleString()}`).join(' · ')}
            <div className="text-xs text-slate-400">Complete → Closed; Cancelled and Rejected → Cancelled; In Progress → In Progress when someone is assigned, otherwise Open.</div>
          </div>
          <div>Locations: {s.locExact.toLocaleString()} matched exactly, {s.locPartial.toLocaleString()} matched to a parent location, {s.locNone.toLocaleString()} not found (the Work Hub location is kept as text)</div>
          <div>Assigned to a staff member: {s.assigned.toLocaleString()}
            {s.unmatchedPeople.size > 0 && <div className="text-xs text-amber-700 dark:text-amber-400">No ElderLoop account (kept in notes): {[...s.unmatchedPeople].join(', ')}</div>}
            {s.vendors.size > 0 && <div className="text-xs text-slate-400">Vendors: {[...s.vendors].join(', ')}</div>}
          </div>
          <div>Residents linked: {s.residents.toLocaleString()}{s.residentsUnmatched > 0 && ` · ${s.residentsUnmatched.toLocaleString()} not found (moved out or a family name; kept in notes)`}</div>
          {plan.newCats.length > 0 && (
            <div>New categories: {plan.newCats.filter(c => !c.parentKey).length} categories and {plan.newCats.filter(c => c.parentKey).length} subcategories
              <div className="text-xs text-slate-400">{plan.newCats.filter(c => !c.parentKey).map(c => c.label).join(', ')}</div>
            </div>
          )}
          <button onClick={runImport} disabled={!!progress || !plan.rows.length}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium">
            <Check size={16} /> Import {plan.rows.length.toLocaleString()} work orders
          </button>
        </div>
      )}

      {progress && (
        <div className="text-sm text-slate-600 dark:text-slate-300">
          Importing… {progress.done.toLocaleString()} of {progress.total.toLocaleString()}
          <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
          </div>
        </div>
      )}

      {result && (
        <div className="flex gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl text-sm text-green-800 dark:text-green-300">
          <Check size={16} className="flex-shrink-0 mt-0.5" />
          Imported {result.imported.toLocaleString()} work orders{result.categories ? ` and ${result.categories} categories` : ''}.
        </div>
      )}
    </div>
  )
}
