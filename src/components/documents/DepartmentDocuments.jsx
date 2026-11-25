import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Plus, X, Search, Loader2, AlertCircle, FileText, FileSpreadsheet, FileImage, File as FileIcon,
         Printer, Download, Pencil, Trash2, FolderOpen, Info } from 'lucide-react'

// Department documents (20261124_department_documents.sql): blank forms and handouts a
// department keeps on file to print as needed. Anyone who can view the module opens,
// prints and downloads; its Supervisors and Managers (edit or settings permission) and Org
// Admins upload, rename, replace and remove. Social Services → Documents uses it first.

const BUCKET = 'department-documents'
const MAX_BYTES = 25 * 1024 * 1024
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.rtf,.txt,.jpg,.jpeg,.png,application/pdf'
const inputCls = 'w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-slate-800 dark:text-slate-100'
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5'

const isPrintable = (d) => d.mime_type === 'application/pdf' || d.mime_type?.startsWith('image/')
const kindOf = (d) => {
  const m = d.mime_type || ''
  if (m === 'application/pdf') return { label: 'PDF', Icon: FileText, cls: 'text-red-500' }
  if (m.includes('word') || m === 'application/msword' || m === 'application/rtf') return { label: 'Word', Icon: FileText, cls: 'text-blue-500' }
  if (m.includes('sheet') || m.includes('excel')) return { label: 'Excel', Icon: FileSpreadsheet, cls: 'text-green-600' }
  if (m.startsWith('image/')) return { label: 'Image', Icon: FileImage, cls: 'text-purple-500' }
  return { label: 'File', Icon: FileIcon, cls: 'text-slate-400' }
}
const fmtSize = (b) => !b ? '' : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`
const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
// "Admission_Agreement-v2.pdf" -> "Admission Agreement v2"
const titleFromName = (name) => name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150)
const extOf = (name) => (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] || 'bin').toLowerCase()
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

// Stored as <org>/<module>/<8-char id>_<original name>, so a printed or saved PDF keeps a
// recognizable name (the browser's PDF tab shows it) while the id keeps paths unique.
const safeName = (name) => name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^[._]+|[._]+$/g, '').slice(0, 80) || 'document'

async function uploadFile(orgId, module, file) {
  const path = `${orgId}/${module}/${newId().slice(0, 8)}_${safeName(file.name)}.${extOf(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false })
  if (error) throw new Error(`${file.name}: ${error.message}`)
  return path
}

export default function DepartmentDocuments({ module, departmentLabel }) {
  const { organization, can } = useAuth()
  const canManage = can(module, 'edit') || can(module, 'settings')
  const [docs,     setDocs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [search,   setSearch]   = useState('')
  const [folder,   setFolder]   = useState('')
  const [editing,  setEditing]  = useState(null)     // null | 'new' | doc
  const [busyId,   setBusyId]   = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase.from('department_documents').select('*')
      .eq('organization_id', organization.id).eq('module', module).order('category', { nullsFirst: false }).order('title')
    if (err) setError(err.message)
    setDocs(data || [])
    setLoading(false)
  }
  useEffect(() => { if (organization?.id) load() }, [organization?.id, module])   // eslint-disable-line react-hooks/exhaustive-deps

  const folders = useMemo(() => [...new Set(docs.map(d => d.category).filter(Boolean))].sort(), [docs])
  const shown = docs.filter(d => {
    if (folder && (d.category || '') !== folder) return false
    if (!search.trim()) return true
    return `${d.title} ${d.description || ''} ${d.category || ''} ${d.file_name}`.toLowerCase().includes(search.trim().toLowerCase())
  })
  const groups = useMemo(() => {
    const m = new Map()
    for (const d of shown) {
      const k = d.category || 'Other forms'
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(d)
    }
    return [...m.entries()]
  }, [shown])

  // Open in a new tab (PDFs and pictures open in the browser, where Print is one click),
  // or download with the original file name.
  async function open(d, download = false) {
    const win = download ? null : window.open('', '_blank')   // inside the click, so pop-up blockers allow it
    setBusyId(d.id); setError('')
    const { data, error: err } = await supabase.storage.from(BUCKET)
      .createSignedUrl(d.file_path, 300, download ? { download: d.file_name } : undefined)
    setBusyId(null)
    if (err || !data?.signedUrl) {
      win?.close()
      setError(`Couldn't open ${d.title}: ${err?.message || 'unknown error'}`)
      return
    }
    if (win) win.location.href = data.signedUrl
    else window.location.href = data.signedUrl
  }

  async function remove(d) {
    setBusyId(d.id); setError(''); setConfirmId(null)
    const { error: err } = await supabase.from('department_documents').delete().eq('id', d.id)
    if (err) { setBusyId(null); setError(err.message); return }
    await supabase.storage.from(BUCKET).remove([d.file_path])
    setBusyId(null)
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        {folders.length > 0 && (
          <select value={folder} onChange={e => setFolder(e.target.value)} aria-label="Folder"
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">All folders</option>
            {folders.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        {canManage && (
          <button onClick={() => setEditing('new')}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors">
            <Plus size={15} /> Upload Documents
          </button>
        )}
      </div>

      <div className="flex items-start gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <span>Blank forms and handouts for {departmentLabel} to print as needed. A form filled in with a resident's information belongs in that resident's record, not here.</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 flex items-center justify-center">
          <Loader2 size={28} className="animate-spin text-brand-400" />
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-16 text-center text-slate-400">
          <FolderOpen size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm mt-1">{canManage ? 'Upload your paper forms (PDF prints best) so anyone can print a fresh copy.' : `Your ${departmentLabel} supervisor or manager can upload forms here.`}</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm py-10 text-center text-slate-400 text-sm">Nothing matches.</div>
      ) : (
        <div className="space-y-5">
          {groups.map(([name, list]) => (
            <div key={name}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{name} <span className="font-normal">({list.length})</span></div>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                {list.map(d => {
                  const k = kindOf(d)
                  const busy = busyId === d.id
                  return (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3 flex-wrap">
                      <k.Icon size={22} className={`flex-shrink-0 ${k.cls}`} />
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{d.title}</div>
                        {d.description && <div className="text-xs text-slate-500 dark:text-slate-400">{d.description}</div>}
                        <div className="text-[11px] text-slate-400 mt-0.5">{[k.label, fmtSize(d.file_size), `Updated ${fmtDate(d.updated_at)}`].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {busy && <Loader2 size={14} className="animate-spin text-brand-400" />}
                        {isPrintable(d) && (
                          <button onClick={() => open(d)} disabled={busy} title="Opens in a new tab; print from there"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 hover:bg-brand-100 dark:hover:bg-brand-900/50">
                            <Printer size={13} /> Print
                          </button>
                        )}
                        <button onClick={() => open(d, true)} disabled={busy} title={isPrintable(d) ? 'Download' : 'Download, then open it to print'}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <Download size={13} /> Download
                        </button>
                        {canManage && confirmId !== d.id && (
                          <>
                            <button onClick={() => setEditing(d)} disabled={busy} aria-label={`Edit ${d.title}`}
                              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Pencil size={14} /></button>
                            <button onClick={() => setConfirmId(d.id)} disabled={busy} aria-label={`Remove ${d.title}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40"><Trash2 size={14} /></button>
                          </>
                        )}
                        {canManage && confirmId === d.id && (
                          <span className="flex items-center gap-1.5 text-xs">
                            <span className="text-slate-500">Remove?</span>
                            <button onClick={() => remove(d)} className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold">Remove</button>
                            <button onClick={() => setConfirmId(null)} className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">Keep</button>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <DocumentModal module={module} orgId={organization.id} doc={editing === 'new' ? null : editing} folders={folders}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}

// Upload one or more files (new), or rename / move / replace one (edit).
function DocumentModal({ module, orgId, doc, folders, onClose, onSaved }) {
  const isNew = !doc
  const [files,    setFiles]    = useState([])
  const [title,    setTitle]    = useState(doc?.title || '')
  const [category, setCategory] = useState(doc?.category || '')
  const [desc,     setDesc]     = useState(doc?.description || '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [progress, setProgress] = useState('')

  function pick(e) {
    const list = [...(e.target.files || [])]
    const tooBig = list.find(f => f.size > MAX_BYTES)
    if (tooBig) { setError(`${tooBig.name} is over 25 MB.`); return }
    setError('')
    setFiles(list)
    if (list.length === 1 && (isNew ? !title : false)) setTitle(titleFromName(list[0].name))
  }

  async function save() {
    setError('')
    if (isNew && !files.length) { setError('Choose at least one file.'); return }
    if ((!isNew || files.length === 1) && !title.trim()) { setError('Give it a title.'); return }
    setSaving(true)
    const folderName = category.trim().slice(0, 80) || null
    try {
      if (isNew) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          setProgress(files.length > 1 ? `Uploading ${i + 1} of ${files.length}…` : 'Uploading…')
          const path = await uploadFile(orgId, module, f)
          const { error: err } = await supabase.from('department_documents').insert({
            organization_id: orgId, module, file_path: path, file_name: f.name.slice(0, 255),
            mime_type: f.type || null, file_size: f.size,
            title: files.length === 1 ? title.trim().slice(0, 150) : titleFromName(f.name) || 'Document',
            category: folderName, description: files.length === 1 ? (desc.trim() || null) : null,
          })
          if (err) { await supabase.storage.from(BUCKET).remove([path]); throw new Error(`${f.name}: ${err.message}`) }
        }
      } else {
        const patch = { title: title.trim().slice(0, 150), category: folderName, description: desc.trim() || null }
        let oldPath = null
        if (files[0]) {
          setProgress('Uploading the new file…')
          const f = files[0]
          patch.file_path = await uploadFile(orgId, module, f)
          patch.file_name = f.name.slice(0, 255); patch.mime_type = f.type || null; patch.file_size = f.size
          oldPath = doc.file_path
        }
        const { error: err } = await supabase.from('department_documents').update(patch).eq('id', doc.id)
        if (err) {
          if (patch.file_path) await supabase.storage.from(BUCKET).remove([patch.file_path])
          throw new Error(err.message)
        }
        if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath])
      }
      onSaved()
    } catch (e) {
      setError(e.message || 'Something went wrong.')
      setSaving(false); setProgress('')
    }
  }

  const single = !isNew || files.length <= 1
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-100">{isNew ? 'Upload Documents' : 'Edit Document'}</h2>
          <button onClick={onClose} disabled={saving} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div>
            <label className={labelCls}>{isNew ? 'Files' : 'Replace the file (optional)'}</label>
            <input type="file" accept={ACCEPT} multiple={isNew} onChange={pick} disabled={saving}
              className="block w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border-0 file:bg-brand-50 file:text-brand-700 file:font-semibold hover:file:bg-brand-100" />
            <p className="text-xs text-slate-400 mt-1.5">
              {isNew ? 'PDF prints in one click; Word and Excel files download and print from Word or Excel. Up to 25 MB each.'
                : `Now: ${doc.file_name}`}
            </p>
            {isNew && files.length > 1 && <p className="text-xs text-slate-500 mt-1">{files.length} files: each one is titled from its file name (you can rename them after).</p>}
          </div>
          {single && (
            <div>
              <label className={labelCls}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} maxLength={150} placeholder="e.g. Advance Directive Acknowledgment" className={inputCls} />
            </div>
          )}
          <div>
            <label className={labelCls}>Folder</label>
            <input value={category} onChange={e => setCategory(e.target.value)} maxLength={80} list="dept-doc-folders"
              placeholder="e.g. Admission, Discharge, Grievances" className={inputCls} />
            <datalist id="dept-doc-folders">{folders.map(f => <option key={f} value={f} />)}</datalist>
          </div>
          {single && (
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} maxLength={1000}
                placeholder="When to use it (optional)" className={inputCls + ' resize-none'} />
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          {progress && <span className="text-xs text-slate-400 mr-auto">{progress}</span>}
          <button onClick={onClose} disabled={saving} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-sm">
            {saving && <Loader2 size={14} className="animate-spin" />} {isNew ? 'Upload' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
