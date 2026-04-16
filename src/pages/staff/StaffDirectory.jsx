import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Search, Phone, Mail, MapPin, Building2, Edit2, X,
  Check, Eye, EyeOff, User, Shield, ChevronDown,
  ChevronUp, Filter, Save, Upload, Info
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

const ROLE_LABELS = {
  super_admin:  { label: 'Super Admin',  color: 'bg-purple-100 text-purple-700' },
  org_admin:    { label: 'Org Admin',    color: 'bg-brand-100 text-brand-700' },
  ceo:          { label: 'CEO',          color: 'bg-purple-100 text-purple-700' },
  supervisor:   { label: 'Supervisor',   color: 'bg-blue-100 text-blue-700' },
  manager:      { label: 'Manager',      color: 'bg-indigo-100 text-indigo-700' },
  maintenance:  { label: 'Maintenance',  color: 'bg-amber-100 text-amber-700' },
  dietary:      { label: 'Dietary',      color: 'bg-green-100 text-green-700' },
  housekeeping: { label: 'Housekeeping', color: 'bg-teal-100 text-teal-700' },
  nursing:      { label: 'Nursing',      color: 'bg-rose-100 text-rose-700' },
  staff:        { label: 'Staff',        color: 'bg-slate-100 text-slate-600' },
}

const isPrivileged = (role) =>
  ['org_admin','ceo','super_admin','supervisor','manager'].includes(role)

const getDept = (key) => DEPARTMENTS.find(d => d.key === key)?.label || key || '—'
const getRoleCfg = (role) => ROLE_LABELS[role] || { label: role, color: 'bg-slate-100 text-slate-500' }

const initials = (first, last) =>
  `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || '?'

// ── Edit Profile Modal ─────────────────────────────────────────
function EditProfileModal({ staffMember, isSelf, canEditAll, onClose, onSaved }) {
  const [form, setForm] = useState({
    job_title:       staffMember.job_title       || '',
    department:      staffMember.department      || '',
    work_phone:      staffMember.work_phone      || '',
    cell_phone:      staffMember.cell_phone      || '',
    email:           staffMember.email           || '',
    office_location: staffMember.office_location || '',
    bio:             staffMember.bio             || '',
    directory_public:staffMember.directory_public ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const payload = canEditAll
      ? form                                    // supervisor+ can edit everything
      : {                                       // staff can only edit own public fields
          cell_phone:       form.cell_phone,
          bio:              form.bio,
          directory_public: form.directory_public,
        }

    const { error: err } = await supabase.from('profiles')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', staffMember.id)

    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-slate-800">
              {isSelf ? 'My Directory Profile' : `Edit — ${staffMember.first_name} ${staffMember.last_name}`}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {canEditAll ? 'Editing all fields' : 'You can update your contact info and visibility'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

          {/* Supervisor-only fields */}
          {canEditAll && (
            <>
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="work@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Work Phone / Ext.</label>
                  <input value={form.work_phone} onChange={e => set('work_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="417-555-0100 x102" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Office / Location</label>
                  <input value={form.office_location} onChange={e => set('office_location', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="e.g. Admin Wing, Room 102" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cell Phone</label>
                  <input value={form.cell_phone} onChange={e => set('cell_phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="417-555-0200" />
                </div>
              </div>
            </>
          )}

          {/* Staff-editable: cell phone if not already shown */}
          {!canEditAll && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Cell Phone</label>
              <input value={form.cell_phone} onChange={e => set('cell_phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Your mobile number" />
            </div>
          )}

          {/* Bio — editable by all */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Short Bio</label>
            <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="A few words about your role, background, or anything you'd like coworkers to know..." />
          </div>

          {/* Visibility toggle — always editable by the profile owner */}
          {(isSelf || canEditAll) && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Directory Visibility</label>
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border-2 transition-all ${form.directory_public ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'}`}>
                <input type="checkbox" checked={form.directory_public}
                  onChange={e => set('directory_public', e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 font-medium text-slate-800 text-sm">
                    {form.directory_public
                      ? <><Eye size={14} className="text-green-600" /> Visible to all staff</>
                      : <><EyeOff size={14} className="text-slate-500" /> Supervisors & above only</>
                    }
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {form.directory_public
                      ? 'All coworkers can see your contact info in the directory.'
                      : 'Only supervisors, managers, and admins can see your contact info.'}
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Staff Card ─────────────────────────────────────────────────
function StaffCard({ member, canSeeAll, isSelf, canEdit, onEdit }) {
  const [expanded, setExpanded] = useState(false)
  const roleCfg = getRoleCfg(member.role)

  return (
    <div className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${!member.directory_public && !canSeeAll ? 'opacity-50' : ''} ${isSelf ? 'border-brand-300 ring-2 ring-brand-100' : 'border-slate-100'}`}>
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-display font-bold text-lg flex-shrink-0 ${member.avatar_url ? '' : 'bg-gradient-to-br from-brand-500 to-brand-700'}`}>
            {member.avatar_url
              ? <img src={member.avatar_url} alt="" className="w-full h-full object-cover rounded-2xl" />
              : initials(member.first_name, member.last_name)
            }
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3 className="font-display font-semibold text-slate-800">
                {member.first_name} {member.last_name}
              </h3>
              {isSelf && <span className="text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-medium">You</span>}
              {!member.directory_public && canSeeAll && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <EyeOff size={10} /> Private
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">{member.job_title || getRoleCfg(member.role).label}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleCfg.color}`}>{roleCfg.label}</span>
              {member.department && (
                <span className="text-xs text-slate-400">{getDept(member.department)}</span>
              )}
              {member.office_location && (
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <MapPin size={9} /> {member.office_location}
                </span>
              )}
            </div>
          </div>

          {/* Edit button */}
          {canEdit && (
            <button onClick={() => onEdit(member)}
              className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg hover:bg-brand-50 transition-colors flex-shrink-0">
              <Edit2 size={14} />
            </button>
          )}
        </div>

        {/* Contact info — always show if can see */}
        {(canSeeAll || member.directory_public) && (
          <div className="mt-4 space-y-1.5">
            {member.email && (
              <a href={`mailto:${member.email}`}
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-brand-600 transition-colors group">
                <Mail size={12} className="text-slate-400 group-hover:text-brand-500 flex-shrink-0" />
                <span className="truncate">{member.email}</span>
              </a>
            )}
            {member.work_phone && (
              <a href={`tel:${member.work_phone}`}
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-brand-600 transition-colors group">
                <Phone size={12} className="text-slate-400 group-hover:text-brand-500 flex-shrink-0" />
                <span>{member.work_phone}</span>
                <span className="text-slate-400">work</span>
              </a>
            )}
            {member.cell_phone && (
              <a href={`tel:${member.cell_phone}`}
                className="flex items-center gap-2 text-xs text-slate-600 hover:text-brand-600 transition-colors group">
                <Phone size={12} className="text-slate-400 group-hover:text-brand-500 flex-shrink-0" />
                <span>{member.cell_phone}</span>
                <span className="text-slate-400">cell</span>
              </a>
            )}
          </div>
        )}

        {/* Bio */}
        {member.bio && (canSeeAll || member.directory_public) && (
          <p className="mt-3 text-xs text-slate-500 italic leading-relaxed border-t border-slate-50 pt-3">
            "{member.bio}"
          </p>
        )}
      </div>
    </div>
  )
}

// ── Main Staff Directory ───────────────────────────────────────
export default function StaffDirectory() {
  const { profile, organization } = useAuth()
  const [staff, setStaff]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterDept, setFilterDept] = useState('all')
  const [editMember, setEditMember] = useState(null)

  const canSeeAll    = isPrivileged(profile?.role)
  const canEditOthers = isPrivileged(profile?.role)

  useEffect(() => { if (organization) fetchStaff() }, [organization])

  async function fetchStaff() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id,first_name,last_name,role,department,job_title,email,work_phone,cell_phone,office_location,bio,directory_public,avatar_url,status,is_active')
      .eq('organization_id', organization.id)
      .not('role', 'in', '(resident,family)')
      .eq('is_active', true)
      .order('last_name').order('first_name')
    setStaff(data || [])
    setLoading(false)
  }

  const handleEdit = (member) => setEditMember(member)

  const canEditMember = (member) =>
    member.id === profile.id   // own profile
    || canEditOthers            // supervisor+

  // Filter
  const filtered = staff.filter(s => {
    const matchSearch = !search || [
      s.first_name, s.last_name, s.job_title, s.department,
      s.email, s.work_phone, s.cell_phone,
    ].some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchDept = filterDept === 'all' || s.department === filterDept
    // Non-privileged users only see public profiles + their own
    const canSee = canSeeAll || s.directory_public || s.id === profile.id
    return matchSearch && matchDept && canSee
  })

  // Group by department
  const grouped = {}
  filtered.forEach(s => {
    const dept = s.department || 'other'
    if (!grouped[dept]) grouped[dept] = []
    grouped[dept].push(s)
  })
  const sortedDepts = Object.keys(grouped).sort()

  const publicCount  = staff.filter(s => s.directory_public).length
  const privateCount = staff.filter(s => !s.directory_public).length

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800">Staff Directory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Find and contact your coworkers</p>
        </div>
        {/* Edit own profile shortcut */}
        <button onClick={() => setEditMember(staff.find(s => s.id === profile.id) || null)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:border-brand-300 text-slate-600 hover:text-brand-600 rounded-xl text-sm font-medium transition-colors">
          <Edit2 size={15} /> My Profile
        </button>
      </div>

      {/* Stats */}
      {canSeeAll && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total Staff',    value: staff.length,  color: 'text-brand-600', bg: 'bg-brand-50' },
            { label: 'Public Profiles',value: publicCount,   color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Private',        value: privateCount,  color: 'text-slate-500', bg: 'bg-slate-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <div className={`text-3xl font-display font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Visibility notice for regular staff */}
      {!canSeeAll && (
        <div className="mb-5 flex items-start gap-3 p-4 bg-brand-50 border border-brand-100 rounded-2xl text-xs text-brand-800">
          <Info size={14} className="flex-shrink-0 mt-0.5 text-brand-600" />
          <span>You can see coworkers who have made their profile public. Click <strong>My Profile</strong> to choose your own visibility and add your contact info.</span>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-60">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, title, department, phone..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="all">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </div>

      {/* Staff grid grouped by department */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading directory...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-display text-lg">No staff found</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDepts.map(deptKey => {
            const members = grouped[deptKey]
            const deptLabel = getDept(deptKey)
            return (
              <div key={deptKey}>
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{deptLabel}</span>
                  <span className="text-xs text-slate-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {members.map(member => (
                    <StaffCard
                      key={member.id}
                      member={member}
                      canSeeAll={canSeeAll}
                      isSelf={member.id === profile.id}
                      canEdit={canEditMember(member)}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit modal */}
      {editMember && (
        <EditProfileModal
          staffMember={editMember}
          isSelf={editMember.id === profile.id}
          canEditAll={canEditOthers}
          onClose={() => setEditMember(null)}
          onSaved={() => { setEditMember(null); fetchStaff() }}
        />
      )}
    </div>
  )
}
