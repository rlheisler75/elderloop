import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Loader2, Building2, Calendar, Users, Layers, Eye } from 'lucide-react'

const PLAN_LABELS = { starter: 'Starter', essential: 'Essential', professional: 'Professional', pilot: 'Pilot' }

const STATUS_STYLES = {
  active:    'bg-green-100 text-green-700',
  trialing:  'bg-blue-100 text-blue-700',
  past_due:  'bg-red-100 text-red-700',
  canceled:  'bg-slate-100 text-slate-500',
  inactive:  'bg-slate-100 text-slate-500',
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function OrgSupportModal({ org, onClose }) {
  const [loading, setLoading]   = useState(true)
  const [modules, setModules]   = useState([])
  const [staff, setStaff]       = useState([])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [{ data: orgMods }, { data: allModules }, { data: staffData }] = await Promise.all([
        supabase.from('organization_modules').select('module_key').eq('organization_id', org.id).eq('is_enabled', true),
        supabase.from('modules').select('key, label'),
        supabase.from('profiles').select('first_name, last_name, role, email, is_active').eq('organization_id', org.id).order('first_name'),
      ])
      const labelByKey = {}
      ;(allModules || []).forEach(m => { labelByKey[m.key] = m.label })
      setModules((orgMods || []).map(m => labelByKey[m.module_key] || m.module_key).sort())
      setStaff(staffData || [])
      setLoading(false)
    })()
  }, [org.id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-brand-600" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-slate-800 truncate">{org.name}</h2>
              <p className="text-xs text-slate-400">{[org.city, org.state].filter(Boolean).join(', ') || 'View only — for support & setup reference'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <Eye size={13} className="flex-shrink-0" />
            View-only reference — no resident data, and changes must be made by the community's own admin or ElderLoop support.
          </div>

          {/* Plan & billing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 mb-1">Plan</div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">
                {PLAN_LABELS[org.plan] || org.plan || '—'}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 mb-1">Status</div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[org.subscription_status] || 'bg-slate-100 text-slate-500'}`}>
                {org.subscription_status?.replace('_', ' ') || 'inactive'}
              </span>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Onboarded</div>
              <div className="text-sm text-slate-700">{fmtDate(org.onboarded_at || org.created_at)}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar size={11} /> Renews</div>
              <div className="text-sm text-slate-700">{fmtDate(org.current_period_end)}</div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-400" /></div>
          ) : (
            <>
              {/* Enabled modules */}
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <Layers size={13} /> Enabled Modules ({modules.length})
                </h3>
                {modules.length === 0 ? (
                  <p className="text-sm text-slate-400">No modules enabled yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {modules.map(label => (
                      <span key={label} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{label}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Staff list */}
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  <Users size={13} /> Staff Accounts ({staff.length})
                </h3>
                {staff.length === 0 ? (
                  <p className="text-sm text-slate-400">No staff accounts yet.</p>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          {['Name', 'Role', 'Email', 'Status'].map(h => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {staff.map((s, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 text-sm text-slate-800">{s.first_name} {s.last_name}</td>
                            <td className="px-4 py-2 text-xs text-slate-500 capitalize">{s.role?.replace('_', ' ')}</td>
                            <td className="px-4 py-2 text-xs text-slate-500">{s.email}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active === false ? 'bg-slate-100 text-slate-400' : 'bg-green-100 text-green-700'}`}>
                                {s.is_active === false ? 'Inactive' : 'Active'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}
