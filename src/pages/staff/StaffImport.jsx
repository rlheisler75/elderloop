import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Upload, Check, AlertTriangle, FileSpreadsheet, Info } from 'lucide-react'
import { STAFF_LEVELS } from '../../lib/departments'

// Bulk staff import from a CSV (e.g. an HR/payroll export saved as CSV from Excel).
// Each row goes through the same create-user Edge Function as "Add Staff Member",
// so permissions, the staff limit and the welcome email all work the same way.

const FIELD_ALIASES = {
  first_name: ['first name', 'firstname', 'first', 'fname', 'given name'],
  last_name:  ['last name', 'lastname', 'last', 'lname', 'surname'],
  email:      ['email', 'e-mail', 'email address', 'primary email', 'work email'],
  phone:      ['phone', 'cell phone', 'cell', 'mobile', 'mobile phone', 'phone number', 'primary phone'],
  department: ['department', 'department(1)', 'dept', 'home department'],
  level:      ['level', 'role profile', 'access level', 'staff level'],
  job_title:  ['job title', 'title', 'position', 'job'],
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i

const detectField = (header) => {
  const h = header.toLowerCase().trim()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(h)) return field
  }
  return null
}

// Quote-aware CSV parser (handles commas and "" inside quoted fields)
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
  const headers = nonEmpty[0].map(h => h.replace(/^﻿/, ''))
  return {
    headers,
    rows: nonEmpty.slice(1).map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] || '']))),
  }
}

const parseLevel = (val) => {
  const v = (val || '').toLowerCase()
  if (v.includes('manager') || v.includes('director')) return 'manager'
  if (v.includes('supervisor') || v.includes('lead')) return 'supervisor'
  return 'employee'
}

export default function StaffImport({ orgId, departments, existingEmails, onClose, onImported }) {
  const fileRef = useRef()
  const [step, setStep]         = useState('upload')   // upload → review → importing → done
  const [error, setError]       = useState('')
  const [rows, setRows]         = useState([])         // normalized rows
  const [deptMap, setDeptMap]   = useState({})         // CSV department text → department key ('' = skip)
  const [selectedDepts, setSelectedDepts] = useState({}) // CSV department text → include?
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [results, setResults]   = useState([])         // { name, email, ok, error }

  const matchDept = (text) => {
    const t = text.toLowerCase().trim()
    return departments.find(d => d.key === t || d.label.toLowerCase() === t)?.key || ''
  }

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')
    if (!/\.csv$/i.test(f.name)) {
      setError('Please choose a .csv file. In Excel: File → Save As → "CSV (Comma delimited)".')
      return
    }
    const { headers, rows: raw } = parseCSV(await f.text())
    const mapping = {}
    headers.forEach(h => { const field = detectField(h); if (field && !mapping[field]) mapping[field] = h })
    if (!mapping.first_name || !mapping.email) {
      setError(`Couldn't find First Name and Email columns. Columns found: ${headers.join(', ') || 'none'}`)
      return
    }

    const seen = new Set()
    const normalized = raw.map(r => {
      const get = (field) => (mapping[field] ? r[mapping[field]] : '').trim()
      const email = get('email').toLowerCase()
      let problem = ''
      if (!get('first_name')) problem = 'No first name'
      else if (!email) problem = 'No email'
      else if (!EMAIL_RE.test(email)) problem = 'Email looks wrong'
      else if (existingEmails.has(email)) problem = 'Already in ElderLoop'
      else if (seen.has(email)) problem = 'Duplicate email in file'
      if (email) seen.add(email)
      return {
        first_name: get('first_name'),
        last_name:  get('last_name'),
        email,
        phone:      get('phone'),
        deptText:   get('department'),
        level:      parseLevel(get('level')),
        job_title:  get('job_title'),
        problem,
      }
    })

    const deptTexts = [...new Set(normalized.map(r => r.deptText))]
    setDeptMap(Object.fromEntries(deptTexts.map(t => [t, matchDept(t)])))
    setSelectedDepts(Object.fromEntries(deptTexts.map(t => [t, true])))
    setRows(normalized)
    setStep('review')
  }

  const deptGroups = Object.keys(deptMap).sort((a, b) => a.localeCompare(b)).map(text => ({
    text,
    count: rows.filter(r => r.deptText === text).length,
  }))

  const toImport = rows.filter(r => !r.problem && selectedDepts[r.deptText] && (deptMap[r.deptText] || !r.deptText))
  const problemRows = rows.filter(r => r.problem && selectedDepts[r.deptText])

  const runImport = async () => {
    setStep('importing')
    setProgress({ done: 0, total: toImport.length })
    const out = []
    for (const r of toImport) {
      const name = `${r.first_name} ${r.last_name}`.trim()
      const { data, error: fnErr } = await supabase.functions.invoke('create-user', {
        body: {
          email: r.email, first_name: r.first_name, last_name: r.last_name,
          phone: r.phone || null, role: 'staff', organization_id: orgId,
        },
      })
      if (fnErr || !data?.success) {
        out.push({ name, email: r.email, ok: false, error: data?.error || fnErr?.message || 'Failed' })
        setProgress(p => ({ ...p, done: p.done + 1 }))
        if (data?.limit_reached) break
        continue
      }
      const deptKey = deptMap[r.deptText] || null
      await supabase.from('profiles').update({
        department: deptKey,
        job_title:  r.job_title || null,
      }).eq('id', data.user_id)
      if (deptKey) {
        await supabase.from('staff_department_roles').insert({
          profile_id: data.user_id, organization_id: orgId, department: deptKey, level: r.level,
        })
      }
      out.push({ name, email: r.email, ok: true })
      setProgress(p => ({ ...p, done: p.done + 1 }))
      // Each account sends a welcome email; pace requests so the email provider doesn't rate-limit
      await new Promise(res => setTimeout(res, 600))
    }
    setResults(out)
    setStep('done')
    if (out.some(o => o.ok)) onImported()
  }

  const levelLabel = (key) => STAFF_LEVELS.find(l => l.key === key)?.label || key
  const okCount = results.filter(r => r.ok).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-brand-600" /> Import Staff from CSV
          </h2>
          <button onClick={onClose} disabled={step === 'importing'}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-40"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-700 dark:text-red-400 text-sm">{error}</div>}

          {step === 'upload' && (
            <div className="space-y-4">
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors flex flex-col items-center gap-2">
                <Upload size={28} />
                <span className="font-medium">Choose a CSV file</span>
                <span className="text-xs text-slate-400">From Excel: File → Save As → "CSV (Comma delimited)"</span>
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="font-semibold text-slate-600 dark:text-slate-300">Columns it looks for</div>
                <div><strong>Required:</strong> First Name, Email</div>
                <div><strong>Optional:</strong> Last Name, Phone / Cell Phone, Department, Job Title, Level / Role Profile (Employee, Supervisor, Manager)</div>
                <div>Everyone is added as Staff. Make admins afterward from their profile.</div>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Departments to import now</div>
                <p className="text-xs text-slate-400 mb-3">Uncheck departments that aren't starting yet. You can import the same file again later — people already in ElderLoop are skipped.</p>
                <div className="space-y-2">
                  {deptGroups.map(g => (
                    <div key={g.text} className="flex items-center gap-3">
                      <input type="checkbox" checked={!!selectedDepts[g.text]}
                        onChange={e => setSelectedDepts(s => ({ ...s, [g.text]: e.target.checked }))}
                        className="w-4 h-4 accent-brand-600" />
                      <span className="w-44 text-sm text-slate-700 dark:text-slate-200 truncate">{g.text || '(no department)'}</span>
                      <span className="w-10 text-xs text-slate-400">{g.count}</span>
                      {g.text && (
                        <select value={deptMap[g.text]} onChange={e => setDeptMap(m => ({ ...m, [g.text]: e.target.value }))}
                          className={`flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100 ${deptMap[g.text] ? 'border-slate-200 dark:border-slate-700' : 'border-amber-300 dark:border-amber-800'}`}>
                          <option value="">— Not in your list (skipped) —</option>
                          {departments.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
                {deptGroups.some(g => g.text && !deptMap[g.text] && selectedDepts[g.text]) && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <Info size={12} className="mt-0.5 flex-shrink-0" />
                    Rows in an unmatched department are skipped. Pick a department for them, or add it under Admin Panel → Settings and upload again.
                  </p>
                )}
              </div>

              {problemRows.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Will be skipped ({problemRows.length})</div>
                  <div className="max-h-40 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {problemRows.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                        <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                        <span className="text-slate-700 dark:text-slate-200 w-40 truncate">{r.first_name} {r.last_name}</span>
                        <span className="text-slate-400 flex-1 truncate">{r.email || '—'}</span>
                        <span className="text-amber-600 dark:text-amber-400">{r.problem}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ready to add ({toImport.length})</div>
                <div className="max-h-56 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {toImport.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                      <span className="text-slate-700 dark:text-slate-200 w-40 truncate">{r.first_name} {r.last_name}</span>
                      <span className="text-slate-400 flex-1 truncate">{r.email}</span>
                      <span className="text-slate-500 w-28 truncate">{departments.find(d => d.key === deptMap[r.deptText])?.label || '—'}</span>
                      <span className="text-slate-500 w-20">{levelLabel(r.level)}</span>
                    </div>
                  ))}
                  {toImport.length === 0 && <div className="px-3 py-4 text-xs text-slate-400 text-center">Nobody selected</div>}
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                Each person gets a welcome email right away, and its password link expires in 1 hour. Import a department when its staff are ready to set up — anyone who misses it can use "Forgot password" on the sign-in page.
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="py-10 text-center">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-3">Adding staff… {progress.done} of {progress.total}</div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-sm mx-auto">
                <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-3">Keep this window open until it finishes.</p>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/50 rounded-xl text-green-700 dark:text-green-400 text-sm">
                <Check size={18} /> Added {okCount} of {results.length} staff.
              </div>
              {results.some(r => !r.ok) && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Not added</div>
                  <div className="max-h-56 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {results.filter(r => !r.ok).map((r, i) => (
                      <div key={i} className="px-3 py-1.5 text-xs">
                        <span className="text-slate-700 dark:text-slate-200">{r.name}</span>
                        <span className="text-slate-400"> · {r.email}</span>
                        <div className="text-red-600 dark:text-red-400">{r.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          {step === 'review' && (
            <>
              <button onClick={() => { setStep('upload'); setRows([]) }}
                className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Choose Another File
              </button>
              <button onClick={runImport} disabled={toImport.length === 0}
                className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors">
                Add {toImport.length} Staff
              </button>
            </>
          )}
          {(step === 'upload' || step === 'done') && (
            <button onClick={onClose}
              className="ml-auto px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
              {step === 'done' ? 'Done' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
