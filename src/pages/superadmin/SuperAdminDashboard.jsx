import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Building2, Users, Shield, Plus, Settings, CheckCircle2,
  Activity, Globe, BarChart3, Eye, LogOut, Zap, X,
  Edit2, Check, ChevronRight, TrendingUp, AlertCircle
} from 'lucide-react'

const BILLING_LABELS = {
  pilot:    { label: 'Pilot',     color: 'bg-blue-900/50 text-blue-400 border-blue-700' },
  active:   { label: 'Active',    color: 'bg-green-900/50 text-green-400 border-green-700' },
  past_due: { label: 'Past Due',  color: 'bg-red-900/50 text-red-400 border-red-700' },
  trial:    { label: 'Trial',     color: 'bg-amber-900/50 text-amber-400 border-amber-700' },
  cancelled:{ label: 'Cancelled', color: 'bg-slate-800 text-slate-500 border-slate-700' },
}

const PLAN_LABELS = {
  starter:    '$199/mo',
  community:  '$349/mo',
  enterprise: 'Custom',
  pilot:      'Free Pilot',
}

function AddOrgModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', slug: '', city: '', state: '', contact_name: '', contact_email: '', plan: 'community', billing_status: 'pilot', billing_note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) { setError('Name and slug are required'); return }
    setSaving(true)
    const { error: err } = await supabase.from('organizations').insert({
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      city: form.city || null,
      state: form.state || null,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      plan: form.plan,
      billing_status: form.billing_status,
      billing_note: form.billing_note || null,
      is_active: true,
    })
    if (err) { setError(err.message); setSaving(false); return }
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>Add Organization</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Organization Name *</label>
              <input value={form.name} onChange={e => { set('name', e.target.value); set('slug', e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')) }}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Sunrise Senior Living" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Slug *</label>
              <input value={form.slug} onChange={e => set('slug', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="sunrise-senior" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Springfield" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">State</label>
                <input value={form.state} onChange={e => set('state', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="MO" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Contact Name</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="CEO name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Contact Email</label>
              <input value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ceo@community.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Plan</label>
              <select value={form.plan} onChange={e => set('plan', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="pilot">Free Pilot</option>
                <option value="starter">Starter $199/mo</option>
                <option value="community">Community $349/mo</option>
                <option value="enterprise">Enterprise Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Billing Status</label>
              <select value={form.billing_status} onChange={e => set('billing_status', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="pilot">Pilot</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="past_due">Past Due</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Notes</label>
              <input value={form.billing_note} onChange={e => set('billing_note', e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. Met at Branson conference, follow up March" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 font-medium">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-900 text-white text-sm font-medium rounded-lg transition-colors">
            {saving ? 'Adding...' : 'Add Organization'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [orgs, setOrgs]         = useState([])
  const [stats, setStats]       = useState({})
  const [loading, setLoading]   = useState(true)
  const [showAddOrg, setShowAddOrg] = useState(false)
  const [activeTab, setActiveTab]   = useState('overview')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const { data: orgData } = await supabase
      .from('organizations')
      .select('*, organization_modules(module_key, is_enabled)')
      .eq('is_active', true)
      .order('created_at')

    if (!orgData) { setLoading(false); return }

    const orgIds = orgData.map(o => o.id)
    const { data: profileData } = await supabase
      .from('profiles').select('organization_id, role')
      .in('organization_id', orgIds)

    const orgsWithStats = orgData.map(org => {
      const p = profileData?.filter(x => x.organization_id === org.id) || []
      return {
        ...org,
        user_count:      p.length,
        staff_count:     p.filter(x => !['resident','family'].includes(x.role)).length,
        resident_count:  p.filter(x => x.role === 'resident').length,
        enabled_modules: org.organization_modules?.filter(m => m.is_enabled !== false).length || 0,
      }
    })

    setOrgs(orgsWithStats)
    setStats({
      total_orgs:   orgData.length,
      active_orgs:  orgData.filter(o => o.billing_status === 'active').length,
      pilot_orgs:   orgData.filter(o => o.billing_status === 'pilot').length,
      total_users:  profileData?.length || 0,
      mrr:          orgData.filter(o => o.billing_status === 'active').reduce((a, o) => {
        const prices = { starter: 199, community: 349 }
        return a + (prices[o.plan] || 0)
      }, 0),
    })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap" rel="stylesheet" />

      {/* ── Sidebar ── */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">EL</span>
            </div>
            <span className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Shield size={11} className="text-purple-400" />
            <span className="text-xs text-purple-400 font-semibold tracking-wide">Super Admin</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {[
            { key: 'overview',       icon: BarChart3,   label: 'Overview' },
            { key: 'organizations',  icon: Building2,   label: 'Organizations' },
            { key: 'activity',       icon: Activity,    label: 'Platform Activity' },
          ].map(item => {
            const Icon = item.icon
            return (
              <button key={item.key} onClick={() => setActiveTab(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${activeTab === item.key ? 'bg-brand-700 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <Icon size={16} />{item.label}
              </button>
            )
          })}
          <div className="pt-3 pb-1">
            <div className="text-xs text-slate-600 uppercase tracking-widest px-3 mb-1">Jump To</div>
          </div>
          <button onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-800 hover:text-white transition-all text-left">
            <Globe size={16} />Maranatha Dashboard
          </button>
          <button onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-800 hover:text-white transition-all text-left">
            <Settings size={16} />Org Admin Panel
          </button>
        </nav>

        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-2.5 mb-3 px-3">
            <div className="w-7 h-7 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {profile?.first_name?.[0]}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">{profile?.first_name} {profile?.last_name}</div>
              <div className="text-slate-500 text-xs">Platform Admin</div>
            </div>
          </div>
          <button onClick={async () => { await signOut(); navigate('/login') }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors">
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: '"Playfair Display", serif' }} className="text-2xl font-bold text-white">
              {activeTab === 'overview' ? 'Platform Overview' : activeTab === 'organizations' ? 'Organizations' : 'Platform Activity'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}
            </p>
          </div>
          <button onClick={() => setShowAddOrg(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={15} /> Add Organization
          </button>
        </div>

        <div className="px-8 py-6 space-y-8">
          {loading ? (
            <div className="text-center py-20 text-slate-500">Loading platform data...</div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { icon: Building2,    label: 'Total Orgs',      value: stats.total_orgs,   color: 'text-brand-400',   bg: 'bg-brand-900/30' },
                  { icon: CheckCircle2, label: 'Active Paying',   value: stats.active_orgs,  color: 'text-green-400',   bg: 'bg-green-900/30' },
                  { icon: AlertCircle,  label: 'In Pilot',        value: stats.pilot_orgs,   color: 'text-blue-400',    bg: 'bg-blue-900/30' },
                  { icon: Users,        label: 'Total Users',     value: stats.total_users,  color: 'text-purple-400',  bg: 'bg-purple-900/30' },
                  { icon: TrendingUp,   label: 'MRR',             value: stats.mrr ? `$${stats.mrr.toLocaleString()}` : '$0', color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
                ].map(s => {
                  const Icon = s.icon
                  return (
                    <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                        <Icon size={16} className={s.color} />
                      </div>
                      <div className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: '"Playfair Display", serif' }}>
                        {s.value ?? '—'}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
                    </div>
                  )
                })}
              </div>

              {/* Organizations table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-white font-semibold">
                    Organizations ({orgs.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-800">
                        {['Organization','Location','Plan','Billing','Users','Modules','Contact'].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orgs.map(org => {
                        const billing = BILLING_LABELS[org.billing_status || 'pilot']
                        return (
                          <tr key={org.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-brand-800/60 border border-brand-700/50 rounded-xl flex items-center justify-center text-brand-400 text-sm font-bold flex-shrink-0"
                                  style={{ fontFamily: '"Playfair Display", serif' }}>
                                  {org.name[0]}
                                </div>
                                <div>
                                  <div className="text-white font-medium text-sm">{org.name}</div>
                                  <div className="text-slate-600 text-xs font-mono">{org.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">
                              {[org.city, org.state].filter(Boolean).join(', ') || <span className="text-slate-700">—</span>}
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-slate-300 text-sm">{PLAN_LABELS[org.plan] || org.plan || '—'}</div>
                              {org.billing_note && <div className="text-slate-600 text-xs mt-0.5 max-w-32 truncate">{org.billing_note}</div>}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${billing?.color || 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                                {billing?.label || org.billing_status || 'pilot'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="text-white text-sm font-medium">{org.user_count}</div>
                              <div className="text-slate-600 text-xs">{org.staff_count} staff / {org.resident_count} res</div>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className="text-white text-sm">{org.enabled_modules}<span className="text-slate-600 text-xs"> /11</span></div>
                              </div>
                              <div className="w-20 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                                <div className="h-full bg-brand-500 rounded-full transition-all"
                                  style={{ width: `${Math.round((org.enabled_modules / 11) * 100)}%` }} />
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {org.contact_name ? (
                                <div>
                                  <div className="text-slate-300 text-xs font-medium">{org.contact_name}</div>
                                  <div className="text-slate-600 text-xs truncate max-w-36">{org.contact_email}</div>
                                </div>
                              ) : <span className="text-slate-700 text-xs">No contact</span>}
                            </td>
                          </tr>
                        )
                      })}
                      {orgs.length === 0 && (
                        <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-600 text-sm">No organizations yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { icon: Globe,       label: 'View Live Signage',    desc: 'Open Maranatha Village TV display', action: () => window.open('/signage?org=maranatha-village', '_blank'), color: 'text-green-400' },
                  { icon: Settings,    label: 'Org Admin Panel',      desc: 'Manage users, modules, and settings', action: () => navigate('/admin'), color: 'text-brand-400' },
                  { icon: BarChart3,   label: 'Community Dashboard',  desc: 'View operational dashboard', action: () => navigate('/dashboard'), color: 'text-purple-400' },
                ].map(item => {
                  const Icon = item.icon
                  return (
                    <button key={item.label} onClick={item.action}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left hover:border-slate-700 hover:bg-slate-800/50 transition-all group">
                      <Icon size={20} className={`${item.color} mb-3 group-hover:scale-110 transition-transform`} />
                      <div className="text-white font-medium text-sm mb-1">{item.label}</div>
                      <div className="text-slate-500 text-xs">{item.desc}</div>
                      <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 mt-3 transition-colors" />
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </main>

      {showAddOrg && (
        <AddOrgModal
          onClose={() => setShowAddOrg(false)}
          onSave={() => { setShowAddOrg(false); fetchAll() }} />
      )}
    </div>
  )
}
