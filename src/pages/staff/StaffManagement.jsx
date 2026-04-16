import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, X, Edit2, Trash2, Search, Upload, Download,
  AlertTriangle, CheckCircle2, Clock, User, Shield,
  FileText, ChevronRight, Filter, Award, Phone,
  Calendar, Building2, Eye, XCircle
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────
const DEPARTMENTS = [
  { key: 'nursing',        label: 'Nursing' },
  { key: 'maintenance',    label: 'Maintenance' },
  { key: 'dietary',        label: 'Dietary' },
  { key: 'housekeeping',   label: 'Housekeeping' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'administration', label: 'Administration' },
  { key: 'activities',     label: 'Activities' },
  { key: 'security',       label: 'Security' },
  { key: 'other',          label: 'Other' },
]

const STAFF_STATUSES = [
  { key: 'active',     label: 'Active',     color: 'bg-green-100 text-green-700' },
  { key: 'on_leave',   label: 'On Leave',   color: 'bg-amber-100 text-amber-700' },
  { key: 'inactive',   label: 'Inactive',   color: 'bg-slate-100 text-slate-500' },
  { key: 'terminated', label: 'Terminated', color: 'bg-red-100 text-red-600' },
]

const CERT_STATUS_COLOR = {
  active:          'text-green-600 bg-green-50 border-green-200',
  expiring_soon:   'text-amber-600 bg-amber-50 border-amber-200',
  expired:         'text-red-600 bg-red-50 border-red-200',
}

const getDept   = (key) => DEPARTMENTS.find(d => d.key === key) || { label: key || 'Unknown' }
const getStatus = (key) => STAFF_STATUSES.find(s => s.key === key) || STAFF_STATUSES[0]

const daysUntil = (date) => {
  if (!date) return null
  return Math.ceil((new Date(date + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24))
}

const certStatus = (expiry) => {
  if (!expiry) return 'active'
  const days = daysUntil(expiry)
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'active'
}

// ── Certification Modal ────────────────────────────────────────
function CertModal({ cert, staffId, orgId, certTypes, onClose, onSave }) {
  const { profile } = useAuth()
  const fileRef = useRef()
  const isNew = !cert
  const [form, setForm] = useState({
    name:         cert?.name         || '',
    cert_type_id: cert?.cert_type_id || '',
    cert_number:  cert?.cert_number  || '',
    issued_date:  cert?.issued_date  || '',
    expiry_date:  cert?.expiry_date  || '',
    issuing_body: cert?.issuing_body || '',
    notes:        cert?.notes        || '',
    file_url:     cert?.file_url     || '',
    file_name:    cert?.file_name    || '',
  })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleTypeChange = (id) => {
    set('cert_type_id', id)
    const t = certTypes.find(c => c.id === id)
    if (t && !form.name) set('name', t.name)
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `certifications/${orgId}/${staffId}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from('announcement-images').upload(path, file)
    if (upErr) { setError('File upload failed'); setUploading(false); return }
    const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
    set('file_url', data.publicUrl)
    set('file_name', file.name)
    setUploading(false)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Certification name is required'); return }
    setSaving(true)
    const payload = {
      ...form,
      organization_id: orgId,
      staff_id:        staffId,
      cert_type_id:    form.cert_type_id || null,
      issued_date:     form.issued_date  || null,
      expiry_date:     form.expiry_date  || null,
      status:          certStatus(form.expiry_date),
      created_by:      profile.id,
      updated_at:      new Date().toISOString(),
    }
    let err
    if (cert?.id) {
      ({ error: err } = await supabase.from('staff_certifications').update(payload).eq('id', cert.id))
    } else {
      ({ error: err } = await supabase.from('staff_certifications').insert(payload))
    }
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <h2 className="font-display font-semibold text-slate-800">{isNew ? 'Add Certification' : 'Edit Certification'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Certification Type</label>
            <select value={form.cert_type_id} onChange={e => handleTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              <option value="">Custom / Other</option>
              {certTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Certification Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. CNA License" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Certificate / License #</label>
              <input value={form.cert_number} onChange={e => set('cert_number', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="License number" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Issuing Body</label>
              <input value={form.issuing_body} onChange={e => set('issuing_body', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. State of Missouri" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Issue Date</label>
              <input type="date" value={form.issued_date} onChange={e => set('issued_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Certificate File</label>
            {form.file_url ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <FileText size={16} className="text-green-600 flex-shrink-0" />
                <span className="text-sm text-green-700 flex-1 truncate">{form.file_name || 'Uploaded file'}</span>
                <div className="flex gap-1">
                  <a href={form.file_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 text-green-600 hover:text-green-800 rounded-lg transition-colors"><Eye size={14} /></a>
                  <button onClick={() => { set('file_url', ''); set('file_name', '') }}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors disabled:opacity-50">
                <Upload size={15} /> {uploading ? 'Uploading...' : 'Upload Certificate (PDF, JPG, PNG)'}
              </button>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Optional notes..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Saving...' : isNew ? 'Add Certification' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Staff Detail Modal ─────────────────────────────────────────
function StaffDetail({ staff, certTypes, onClose, onSave }) {
  const { profile, organization } = useAuth()
  const isNew = !staff
  const [tab, setTab]     = useState('info')
  const [form, setForm]   = useState({
    first_name:               staff?.first_name               || '',
    last_name:                staff?.last_name                || '',
    job_title:                staff?.job_title                || '',
    department:               staff?.department               || '',
    phone:                    staff?.phone                    || '',
    status:                   staff?.status                   || 'active',
    hire_date:                staff?.hire_date                || '',
    emergency_contact_name:   staff?.emergency_contact_name   || '',
    emergency_contact_phone:  staff?.emergency_contact_phone  || '',
    notes:                    staff?.notes                    || '',
  })
  const [certs, setCerts] = useState([])
  const [showCertModal, setShowCertModal] = useState(false)
  const [editCert, setEditCert] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => { if (staff?.id) fetchCerts() }, [staff?.id])

  async function fetchCerts() {
    const { data } = await supabase.from('staff_certifications')
      .select('*').eq('staff_id', staff.id).order('expiry_date')
    setCerts(data || [])
  }

  const handleSaveInfo = async () => {
    if (!form.first_name.trim()) { setError('First name required'); return }
    setSaving(true)
    const payload = {
      ...form,
      hire_date: form.hire_date || null,
      updated_at: new Date().toISOString(),
    }
    const { error: err } = await supabase.from('profiles')
      .update(payload).eq('id', staff.id)
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSave()
  }

  const handleDeleteCert = async (id) => {
    if (!confirm('Remove this certification?')) return
    await supabase.from('staff_certifications').delete().eq('id', id)
    fetchCerts()
  }

  // Cert alerts
  const expiring = certs.filter(c => certStatus(c.expiry_date) === 'expiring_soon')
  const expired  = certs.filter(c => certStatus(c.expiry_date) === 'expired')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold flex-shrink-0">
              {form.first_name?.[0] || '?'}
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-800">
                {isNew ? 'Add Staff Member' : `${staff.first_name} ${staff.last_name}`}
              </h2>
              {!isNew && <p className="text-xs text-slate-400">{form.job_title || form.role?.replace('_',' ') || 'Staff'}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-slate-100 flex-shrink-0">
          {[
            { key: 'info',  label: 'Profile' },
            { key: 'certs', label: `Certifications${certs.length ? ` (${certs.length})` : ''}${expired.length ? ' ⚠' : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* PROFILE TAB */}
          {tab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">First Name *</label>
                  <input value={form.first_name} onChange={e => set('first_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Last Name</label>
                  <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Job Title</label>
                  <input value={form.job_title} onChange={e => set('job_title', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. Charge Nurse, Head Cook" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Department</label>
                  <select value={form.department} onChange={e => set('department', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Mobile or work phone" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Hire Date</label>
                  <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Status</label>
                <div className="flex gap-2 flex-wrap">
                  {STAFF_STATUSES.map(s => (
                    <button key={s.key} onClick={() => set('status', s.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.status === s.key ? s.color + ' ring-2 ring-offset-1 ring-brand-400 border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                <div className="col-span-2 text-xs font-semibold text-red-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Phone size={12} /> Emergency Contact
                </div>
                <input value={form.emergency_contact_name} onChange={e => set('emergency_contact_name', e.target.value)}
                  className="px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  placeholder="Contact name" />
                <input value={form.emergency_contact_phone} onChange={e => set('emergency_contact_phone', e.target.value)}
                  className="px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
                  placeholder="Contact phone" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                  placeholder="Internal notes about this staff member..." />
              </div>
            </div>
          )}

          {/* CERTIFICATIONS TAB */}
          {tab === 'certs' && (
            <div className="space-y-3">
              {/* Alerts */}
              {(expired.length > 0 || expiring.length > 0) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  {expired.length > 0 && <div className="flex items-center gap-1.5 font-medium"><XCircle size={14} className="text-red-500" /> {expired.length} expired certification{expired.length > 1 ? 's' : ''}</div>}
                  {expiring.length > 0 && <div className="flex items-center gap-1.5"><AlertTriangle size={14} /> {expiring.length} expiring within 30 days</div>}
                </div>
              )}

              {isNew && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                  Save the staff profile first, then add certifications.
                </div>
              )}

              {certs.map(c => {
                const status = certStatus(c.expiry_date)
                const days   = daysUntil(c.expiry_date)
                return (
                  <div key={c.id} className={`p-4 rounded-2xl border ${CERT_STATUS_COLOR[status]}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Award size={16} className={`flex-shrink-0 mt-0.5 ${status === 'expired' ? 'text-red-500' : status === 'expiring_soon' ? 'text-amber-500' : 'text-green-500'}`} />
                        <div>
                          <div className="font-medium text-slate-800 text-sm">{c.name}</div>
                          {c.cert_number && <div className="text-xs text-slate-500 mt-0.5">#{c.cert_number}</div>}
                          {c.issuing_body && <div className="text-xs text-slate-400">{c.issuing_body}</div>}
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            {c.issued_date && <span className="text-slate-400">Issued: {new Date(c.issued_date + 'T12:00:00').toLocaleDateString()}</span>}
                            {c.expiry_date && (
                              <span className={`font-medium ${status === 'expired' ? 'text-red-600' : status === 'expiring_soon' ? 'text-amber-600' : 'text-green-600'}`}>
                                {status === 'expired' ? `Expired ${Math.abs(days)} days ago` :
                                 status === 'expiring_soon' ? `Expires in ${days} days` :
                                 `Expires ${new Date(c.expiry_date + 'T12:00:00').toLocaleDateString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {c.file_url && (
                          <a href={c.file_url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Eye size={13} /></a>
                        )}
                        <button onClick={() => { setEditCert(c); setShowCertModal(true) }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => handleDeleteCert(c.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {!isNew && (
                <button onClick={() => { setEditCert(null); setShowCertModal(true) }}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors flex items-center justify-center gap-2">
                  <Plus size={14} /> Add Certification
                </button>
              )}
            </div>
          )}
        </div>

        {tab === 'info' && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
            <button onClick={handleSaveInfo} disabled={saving || isNew}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
              {isNew ? 'Create User in Admin Panel' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
        {tab === 'certs' && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors">Done</button>
          </div>
        )}
      </div>

      {showCertModal && (
        <CertModal
          cert={editCert}
          staffId={staff?.id}
          orgId={organization.id}
          certTypes={certTypes}
          onClose={() => { setShowCertModal(false); setEditCert(null) }}
          onSave={() => { setShowCertModal(false); setEditCert(null); fetchCerts() }} />
      )}
    </div>
  )
}

// ── Main Staff Management Page ─────────────────────────────────
export default function StaffManagement() {
  const { profile, organization, isOrgAdmin } = useAuth()
  const [staff, setStaff]           = useState([])
  const [certTypes, setCertTypes]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [filterStatus, setFilterStatus] = useState('active')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [certAlerts, setCertAlerts] = useState([])

  useEffect(() => { if (organization) fetchAll() }, [organization])

  async function fetchAll() {
    setLoading(true)
    const [staffRes, certTypesRes, certRes] = await Promise.all([
      supabase.from('profiles').select('*')
        .eq('organization_id', organization.id)
        .not('role', 'in', '(resident,family)')
        .order('last_name').order('first_name'),
      supabase.from('certification_types').select('*')
        .or(`organization_id.is.null,organization_id.eq.${organization.id}`)
        .eq('is_active', true).order('sort_order'),
      supabase.from('staff_certifications').select('*, profiles(first_name,last_name)')
        .eq('organization_id', organization.id)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('expiry_date'),
    ])
    setStaff(staffRes.data || [])
    setCertTypes(certTypesRes.data || [])
    setCertAlerts(certRes.data || [])
    setLoading(false)
  }

  const filtered = staff.filter(s => {
    const matchSearch = !search || `${s.first_name} ${s.last_name} ${s.job_title} ${s.department}`.toLowerCase().includes(search.toLowerCase())
    const matchDept   = filterDept === 'all' || s.department === filterDept
    const matchStatus = filterStatus === 'all' || (s.status || 'active') === filterStatus
    return matchSearch && matchDept && matchStatus
  })

  // Group by department
  const grouped = {}
  filtered.forEach(s => {
    const dept = s.department || 'other'
    if (!grouped[dept]) grouped[dept] = []
    grouped[dept].push(s)
  })

  // Stats
  const activeCount   = staff.filter(s => (s.status || 'active') === 'active').length
  const onLeaveCount  = staff.filter(s => s.status === 'on_leave').length
  const expiredCerts  = certAlerts.filter(c => certStatus(c.expiry_date) === 'expired').length
  const expiringSoon  = certAlerts.filter(c => certStatus(c.expiry_date) === 'expiring_soon').length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Staff Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Staff profiles, certifications, and compliance tracking</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Staff',     value: activeCount,  color: 'text-brand-600',  bg: 'bg-brand-50' },
          { label: 'On Leave',         value: onLeaveCount, color: 'text-amber-600',  bg: 'bg-amber-50' },
          { label: 'Certs Expiring',   value: expiringSoon, color: expiringSoon > 0 ? 'text-amber-600' : 'text-slate-400', bg: expiringSoon > 0 ? 'bg-amber-50' : 'bg-slate-100', alert: expiringSoon > 0 },
          { label: 'Expired Certs',    value: expiredCerts, color: expiredCerts > 0 ? 'text-red-600' : 'text-slate-400',   bg: expiredCerts > 0 ? 'bg-red-50' : 'bg-slate-100',   alert: expiredCerts > 0 },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 ${s.alert ? 'ring-2 ring-red-300' : ''}`}>
            <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
            <div className="text-slate-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Cert alerts banner */}
      {(expiredCerts > 0 || expiringSoon > 0) && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="font-semibold text-amber-800 text-sm mb-2 flex items-center gap-2">
            <AlertTriangle size={15} /> Certification Alerts
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {certAlerts.map(c => {
              const status = certStatus(c.expiry_date)
              const days   = daysUntil(c.expiry_date)
              return (
                <div key={c.id} className="flex items-center gap-3 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'expired' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <span className="font-medium text-slate-700">{c.profiles?.first_name} {c.profiles?.last_name}</span>
                  <span className="text-slate-500">{c.name}</span>
                  <span className={`ml-auto font-medium ${status === 'expired' ? 'text-red-600' : 'text-amber-600'}`}>
                    {status === 'expired' ? `Expired ${Math.abs(days)}d ago` : `Expires in ${days}d`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All Statuses</option>
          {STAFF_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Staff list grouped by department */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No staff found</p>
          <p className="text-sm mt-1">Add staff in the Admin Panel, then manage their profiles here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(grouped).sort().map(deptKey => {
            const dept      = getDept(deptKey)
            const members   = grouped[deptKey]
            return (
              <div key={deptKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{dept.label}</span>
                  <span className="text-xs text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {members.map(s => {
                    const status = getStatus(s.status || 'active')
                    return (
                      <button key={s.id}
                        onClick={() => { setSelectedStaff(s); setShowDetail(true) }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:shadow-md hover:border-brand-200 transition-all group">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-display font-bold flex-shrink-0">
                            {s.first_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-slate-800 text-sm group-hover:text-brand-700 transition-colors truncate">
                              {s.first_name} {s.last_name}
                            </div>
                            <div className="text-xs text-slate-400 truncate">{s.job_title || s.role?.replace('_',' ')}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        {s.phone && (
                          <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                            <Phone size={10} /> {s.phone}
                          </div>
                        )}
                        {s.hire_date && (
                          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
                            <Calendar size={10} /> Since {new Date(s.hire_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showDetail && (
        <StaffDetail
          staff={selectedStaff}
          certTypes={certTypes}
          onClose={() => { setShowDetail(false); setSelectedStaff(null) }}
          onSave={() => { setShowDetail(false); setSelectedStaff(null); fetchAll() }} />
      )}
    </div>
  )
}
