import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  Building2, Users, Shield, Plus, Settings, CheckCircle2,
  Activity, Globe, BarChart3, Eye, LogOut, Zap, X,
  Edit2, Check, ChevronRight, TrendingUp, AlertCircle,
  ClipboardList, Link, Copy, Star, Image as ImageIcon,
  Trash2, Upload, AlertTriangle, RefreshCw
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

// ── Logo Upload Modal ──────────────────────────────────────────
function LogoModal({ org, onClose, onSaved }) {
  const fileRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview]     = useState(org.logo_url || null)
  const [color, setColor]         = useState(org.primary_color || '#0c90e1')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const handleFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `logos/${org.id}/logo.${ext}`
    const { error: upErr } = await supabase.storage
      .from('announcement-images')
      .upload(path, file, { upsert: true })
    if (upErr) { setError(upErr.message); setUploading(false); return }
    const { data } = supabase.storage.from('announcement-images').getPublicUrl(path)
    setPreview(data.publicUrl)
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { error: err } = await supabase.from('organizations')
      .update({ logo_url: preview || null, primary_color: color })
      .eq('id', org.id)
    if (err) { setError(err.message); setSaving(false); return }
    onSaved()
  }

  const handleRemove = async () => {
    setSaving(true)
    await supabase.from('organizations').update({ logo_url: null }).eq('id', org.id)
    setPreview(null)
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="font-semibold text-white">Community Branding</h2>
            <p className="text-xs text-slate-400 mt-0.5">{org.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {error && <div className="px-4 py-2 bg-red-900/40 border border-red-700 rounded-lg text-red-400 text-sm">{error}</div>}

          {/* Logo */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Community Logo</label>
            {preview ? (
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-slate-700">
                  <img src={preview} alt="Logo" className="w-full h-full object-contain p-2" />
                </div>
                <div className="space-y-2">
                  <button onClick={() => fileRef.current.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors">
                    <Upload size={12} /> Replace Logo
                  </button>
                  <button onClick={handleRemove}
                    className="flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-900/30 text-xs font-medium rounded-lg transition-colors">
                    <X size={12} /> Remove Logo
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current.click()} disabled={uploading}
                className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:border-brand-600 hover:text-brand-400 transition-colors">
                <ImageIcon size={28} />
                <span className="text-sm font-medium">{uploading ? 'Uploading...' : 'Click to upload logo'}</span>
                <span className="text-xs">PNG, JPG, SVG — recommended 200×200px or wider</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* Brand color */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Brand Color</label>
            <div className="flex items-center gap-3">
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer p-1" />
              <input value={color} onChange={e => setColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="#0c90e1" />
              <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: color }} />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Used for sidebar accent color in the community's interface.</p>
          </div>

          {/* Preview */}
          {(preview || color !== '#0c90e1') && (
            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">Sidebar Preview</p>
              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: color + '22' }}>
                {preview
                  ? <img src={preview} alt="" className="w-8 h-8 object-contain rounded bg-white p-1" />
                  : <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>{org.name[0]}</div>
                }
                <div>
                  <div className="text-white text-sm font-semibold">{org.name}</div>
                  <div className="text-xs" style={{ color }}>{org.plan || 'Community'} Plan</div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 text-white text-sm font-medium rounded-lg transition-colors">
            <Check size={14} /> {saving ? 'Saving...' : 'Save Branding'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Wipe Org Data Modal ────────────────────────────────────────
function WipeModal({ org, onClose, onDone }) {
  const [step, setStep]       = useState('confirm')  // 'confirm' | 'wiping' | 'done'
  const [typeConfirm, setTypeConfirm] = useState('')
  const [deleteAccounts, setDeleteAccounts] = useState(false)
  const [log, setLog]         = useState([])
  const addLog = (msg) => setLog(l => [...l, msg])

  const WIPE_TABLES = [
    'compliance_inspection_results','compliance_inspections',
    'care_notes','resident_vitals','resident_medications',
    'resident_updates','family_resident_links',
    'wo_photos','wo_activity','work_orders',
    'pm_schedules','maintenance_assets',
    'scheduled_shifts','shift_swaps','shift_templates',
    'staff_certifications','survey_responses',
    'messages','announcements','activities','chapel_services',
    'trips','meter_readings','meters',
    'security_rounds','security_checkpoints','incident_reports',
    'resident_dietary_profiles','residents',
    'user_module_permissions','organization_modules',
  ]

  const handleWipe = async () => {
    if (typeConfirm !== org.name) return
    setStep('wiping')
    addLog(`Starting data wipe for ${org.name}...`)

    for (const table of WIPE_TABLES) {
      try {
        const { error } = await supabase.from(table)
          .delete().eq('organization_id', org.id)
        if (error && !error.message.includes('does not exist')) {
          addLog(`⚠️  ${table}: ${error.message}`)
        } else {
          addLog(`✓ Cleared ${table}`)
        }
      } catch (e) {
        addLog(`⚠️  ${table}: ${e.message}`)
      }
    }

    // Delete staff/user profiles if requested
    if (deleteAccounts) {
      addLog('Removing staff profiles...')
      const { data: profiles } = await supabase.from('profiles')
        .select('id').eq('organization_id', org.id)
        .not('role', 'in', '(super_admin)')
      if (profiles?.length) {
        await supabase.from('profiles').delete().eq('organization_id', org.id)
          .not('role', 'in', '(super_admin)')
        addLog(`✓ Removed ${profiles.length} staff profiles`)
        addLog('⚠️  Auth accounts must be deleted manually in Supabase dashboard → Authentication')
      }
    }

    addLog('✅ Wipe complete.')
    setStep('done')
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-slate-900 border border-red-900/60 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-900/40 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Wipe Organization Data</h2>
              <p className="text-xs text-red-400 mt-0.5">This cannot be undone</p>
            </div>
          </div>
          {step !== 'wiping' && <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>}
        </div>

        <div className="px-6 py-5">
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-sm text-red-300 space-y-1">
                <p className="font-semibold">This will permanently delete:</p>
                <p>All residents, work orders, care notes, vitals, medications, activities, chapel services, dietary menus, announcements, surveys, messages, assets, PM schedules, and compliance records for <strong>{org.name}</strong>.</p>
              </div>

              <div>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-red-700 transition-colors">
                  <input type="checkbox" checked={deleteAccounts} onChange={e => setDeleteAccounts(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600" />
                  <div>
                    <div className="text-white text-sm font-medium">Also delete staff user accounts</div>
                    <div className="text-slate-400 text-xs">Removes all profiles. Auth accounts must still be deleted in Supabase dashboard.</div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Type <span className="text-red-400 font-mono">{org.name}</span> to confirm
                </label>
                <input value={typeConfirm} onChange={e => setTypeConfirm(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder={org.name} />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                <button onClick={handleWipe} disabled={typeConfirm !== org.name}
                  className="flex items-center gap-2 px-5 py-2 bg-red-700 hover:bg-red-600 disabled:bg-red-900 disabled:text-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                  <Trash2 size={14} /> Wipe All Data
                </button>
              </div>
            </div>
          )}

          {step === 'wiping' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-amber-400">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm font-medium">Wiping data...</span>
              </div>
              <div className="bg-slate-950 rounded-xl p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
                {log.map((l, i) => (
                  <div key={i} className={l.startsWith('✅') ? 'text-green-400' : l.startsWith('⚠️') ? 'text-amber-400' : l.startsWith('✓') ? 'text-slate-400' : 'text-slate-300'}>{l}</div>
                ))}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-900/40 rounded-full flex items-center justify-center">
                  <Check size={18} className="text-green-400" />
                </div>
                <div>
                  <div className="text-white font-medium">Wipe complete</div>
                  <div className="text-slate-400 text-xs">{org.name} data has been cleared</div>
                </div>
              </div>
              <div className="bg-slate-950 rounded-xl p-4 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
                {log.map((l, i) => (
                  <div key={i} className={l.startsWith('✅') ? 'text-green-400' : l.startsWith('⚠️') ? 'text-amber-400' : l.startsWith('✓') ? 'text-slate-400' : 'text-slate-300'}>{l}</div>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={onClose} className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors">Close</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [orgs, setOrgs]           = useState([])
  const [platformSurveys, setPlatformSurveys] = useState([])
  const [surveyResponses, setSurveyResponses] = useState({})
  const [copiedToken, setCopiedToken] = useState(null)
  const [stats, setStats]         = useState({})
  const [loading, setLoading]     = useState(true)
  const [showAddOrg, setShowAddOrg] = useState(false)
  const [activeTab, setActiveTab]   = useState('overview')
  const [logoModal, setLogoModal]   = useState(null)   // kept for compatibility
  const [wipeModal, setWipeModal]   = useState(null)   // org object

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

    // Fetch platform surveys
    const { data: pSurveys } = await supabase.from('surveys')
      .select('*').eq('is_platform', true).eq('is_active', true).order('created_at')
    setPlatformSurveys(pSurveys || [])

    // Fetch response counts per platform survey
    if (pSurveys?.length) {
      const { data: responses } = await supabase.from('survey_responses')
        .select('survey_id').in('survey_id', pSurveys.map(s => s.id))
      const counts = {}
      responses?.forEach(r => { counts[r.survey_id] = (counts[r.survey_id] || 0) + 1 })
      setSurveyResponses(counts)
    }

    setLoading(false)
  }

  const copyLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/survey/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
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
            { key: 'overview',       icon: BarChart3,     label: 'Overview' },
            { key: 'organizations',  icon: Building2,     label: 'Organizations' },
            { key: 'surveys',        icon: ClipboardList, label: 'Platform Surveys' },
            { key: 'activity',       icon: Activity,      label: 'Platform Activity' },
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
            <div className="text-xs text-slate-600 uppercase tracking-widest px-3 mb-2">Jump To Org</div>
            {orgs.slice(0, 8).map(org => (
              <div key={org.id} className="flex items-center gap-1 mb-0.5">
                <button
                  onClick={() => navigate(`/admin?org=${org.id}`)}
                  title="Open Admin Panel"
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-800 hover:text-white transition-all text-left truncate">
                  <Settings size={12} className="flex-shrink-0" />
                  <span className="truncate">{org.name}</span>
                </button>
                <button
                  onClick={() => navigate(`/dashboard?org=${org.id}`)}
                  title="View Dashboard"
                  className="p-1.5 text-slate-700 hover:text-green-400 hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0">
                  <BarChart3 size={12} />
                </button>
              </div>
            ))}
            {orgs.length === 0 && (
              <div className="px-3 text-xs text-slate-700">No orgs yet</div>
            )}
          </div>
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
                        {['Organization','Location','Plan','Billing','Users','Modules','Contact','Actions'].map(h => (
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
                                {org.logo_url
                                  ? <img src={org.logo_url} alt="" className="w-9 h-9 rounded-xl object-contain bg-white p-1 flex-shrink-0" />
                                  : <div className="w-9 h-9 bg-brand-800/60 border border-brand-700/50 rounded-xl flex items-center justify-center text-brand-400 text-sm font-bold flex-shrink-0"
                                      style={{ fontFamily: '"Playfair Display", serif' }}>{org.name[0]}</div>
                                }
                                <div>
                                  <div className="text-white font-medium text-sm">{org.name}</div>
                                  <div className="text-slate-600 text-xs font-mono">{org.slug}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-400 whitespace-nowrap">
                              {[org.city, org.state].filter(Boolean).join(', ') || <span className="text-slate-700">—</span>}
                            </td>

                            {/* Plan — click to cycle */}
                            <td className="px-5 py-4">
                              <button
                                onClick={async () => {
                                  const plans = ['starter','community','enterprise','pilot']
                                  const next  = plans[(plans.indexOf(org.plan || 'pilot') + 1) % plans.length]
                                  await supabase.from('organizations').update({ plan: next }).eq('id', org.id)
                                  fetchAll()
                                }}
                                title="Click to change plan"
                                className="text-left hover:opacity-70 transition-opacity">
                                <div className="text-slate-300 text-sm font-medium">{PLAN_LABELS[org.plan] || org.plan || 'Pilot'}</div>
                                <div className="text-slate-700 text-xs mt-0.5">click to change</div>
                              </button>
                            </td>

                            {/* Billing status — click to cycle */}
                            <td className="px-5 py-4">
                              <button
                                onClick={async () => {
                                  const statuses = ['pilot','trial','active','past_due','cancelled']
                                  const next = statuses[(statuses.indexOf(org.billing_status || 'pilot') + 1) % statuses.length]
                                  await supabase.from('organizations').update({ billing_status: next }).eq('id', org.id)
                                  fetchAll()
                                }}
                                title="Click to change billing status"
                                className="hover:opacity-70 transition-opacity">
                                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${billing?.color || 'text-slate-500 bg-slate-800 border-slate-700'}`}>
                                  {billing?.label || org.billing_status || 'pilot'}
                                </span>
                              </button>
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

                            {/* Actions */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => navigate(`/admin?org=${org.id}`)}
                                  title="Open Admin Panel for this org"
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-brand-400 hover:bg-brand-900/30 rounded-lg transition-colors font-medium">
                                  <Settings size={12} /> Admin
                                </button>
                                <button
                                  onClick={() => navigate(`/dashboard?org=${org.id}`)}
                                  title="View Dashboard for this org"
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-green-400 hover:bg-green-900/30 rounded-lg transition-colors font-medium">
                                  <BarChart3 size={12} /> View
                                </button>
                                <button onClick={() => setWipeModal(org)}
                                  title="Wipe All Data"
                                  className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              </div>
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
                {orgs.slice(0, 3).map(org => {
                  const Icon = Globe
                  return (
                    <button key={org.id}
                      onClick={() => window.open(`/signage?org=${org.slug}`, '_blank')}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left hover:border-slate-700 hover:bg-slate-800/50 transition-all group">
                      <Icon size={20} className="text-green-400 mb-3 group-hover:scale-110 transition-transform" />
                      <div className="text-white font-medium text-sm mb-1">{org.name}</div>
                      <div className="text-slate-500 text-xs">Open TV Signage display</div>
                      <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 mt-3 transition-colors" />
                    </button>
                  )
                })}
              </div>

              {/* ── PLATFORM SURVEYS TAB ── */}
          {activeTab === 'surveys' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-white font-semibold text-lg">Platform Feedback Surveys</h2>
                  <p className="text-slate-500 text-xs mt-1">Surveys you send to customers, prospects, and internally to gather product feedback.</p>
                </div>
                <button onClick={() => window.open('/surveys', '_blank')}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
                  <Plus size={15} /> Create in Survey Builder
                </button>
              </div>

              {/* Stat strip */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Platform Surveys', value: platformSurveys.length, color: 'text-brand-400' },
                  { label: 'Total Responses', value: Object.values(surveyResponses).reduce((a, b) => a + b, 0), color: 'text-green-400' },
                  { label: 'Published', value: platformSurveys.filter(s => s.is_published).length, color: 'text-purple-400' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                    <div className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: '"Playfair Display", serif' }}>{s.value}</div>
                    <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Survey cards */}
              <div className="space-y-4">
                {platformSurveys.map(s => (
                  <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white font-semibold">{s.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_published ? 'bg-green-900/50 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                            {s.is_published ? 'Published' : 'Draft'}
                          </span>
                          <span className="text-xs text-slate-500 capitalize">{s.survey_type?.replace('_', ' ')}</span>
                          {s.platform_target && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-brand-900/50 text-brand-400 capitalize">{s.platform_target}</span>
                          )}
                        </div>
                        {s.description && <p className="text-slate-400 text-sm">{s.description}</p>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-white" style={{ fontFamily: '"Playfair Display", serif' }}>
                          {surveyResponses[s.id] || 0}
                        </div>
                        <div className="text-slate-500 text-xs">responses</div>
                      </div>
                    </div>

                    {/* Public link section */}
                    {s.is_published && (
                      <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl border border-slate-700 mb-3">
                        <Link size={14} className="text-brand-400 flex-shrink-0" />
                        <code className="text-xs text-slate-300 flex-1 truncate">
                          {window.location.origin}/survey/{s.public_token}
                        </code>
                        <button onClick={() => copyLink(s.public_token)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all flex-shrink-0 ${copiedToken === s.public_token ? 'border-green-700 text-green-400' : 'border-slate-600 text-slate-400 hover:border-brand-500 hover:text-brand-400'}`}>
                          {copiedToken === s.public_token ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => window.open(`/survey/${s.public_token}`, '_blank')}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:border-brand-500 hover:text-brand-400 transition-colors">
                        <Eye size={12} /> Preview
                      </button>
                      <button onClick={() => navigate('/surveys')}
                        className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:border-brand-500 hover:text-brand-400 transition-colors">
                        <BarChart3 size={12} /> View Results
                      </button>
                    </div>
                  </div>
                ))}

                {platformSurveys.length === 0 && (
                  <div className="text-center py-16 text-slate-600">
                    <ClipboardList size={40} className="mx-auto mb-4 opacity-30" />
                    <p className="text-slate-400 font-medium mb-2">No platform surveys yet</p>
                    <p className="text-sm mb-6">Create surveys to gather feedback from your customers about ElderLoop.</p>
                    <button onClick={() => navigate('/surveys')}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors">
                      <Plus size={15} /> Open Survey Builder
                    </button>
                  </div>
                )}
              </div>

              {/* How to use section */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Star size={15} className="text-amber-400" /> How to Use Platform Surveys
                </h3>
                <div className="space-y-3 text-sm text-slate-400">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand-800 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                    <p>Go to <strong className="text-slate-300">Survey Builder</strong> (Surveys in the sidebar) and create a new survey. Mark it as published when ready.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand-800 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                    <p>Copy the public link and paste it into an email to your customers — no login required to respond.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-brand-800 text-brand-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                    <p>Watch responses come in here. View detailed results, comments, and satisfaction scores to guide your roadmap.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 style={{ fontFamily: '"Playfair Display", serif' }} className="text-white font-semibold flex items-center gap-2">
                    <ClipboardList size={16} className="text-brand-400" /> Platform Feedback Surveys
                  </h2>
                  <button onClick={() => setActiveTab('surveys')}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors flex items-center gap-1">
                    Manage all <ChevronRight size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {platformSurveys.map(s => (
                    <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="text-white font-medium text-sm">{s.title}</div>
                          <div className="text-slate-500 text-xs mt-0.5 line-clamp-2">{s.description}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.is_published ? 'bg-green-900/50 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                          {s.is_published ? 'Live' : 'Draft'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {surveyResponses[s.id] || 0} response{(surveyResponses[s.id] || 0) !== 1 ? 's' : ''}
                        </span>
                        <span className="capitalize">{s.survey_type?.replace('_', ' ')}</span>
                      </div>
                      {s.is_published && (
                        <button onClick={() => copyLink(s.public_token)}
                          className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-medium transition-all ${copiedToken === s.public_token ? 'border-green-700 text-green-400 bg-green-900/20' : 'border-slate-700 text-slate-400 hover:border-brand-600 hover:text-brand-400'}`}>
                          {copiedToken === s.public_token ? <><Check size={12} /> Copied!</> : <><Link size={12} /> Copy Survey Link</>}
                        </button>
                      )}
                    </div>
                  ))}
                  {platformSurveys.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-slate-600 text-sm">
                      No platform surveys yet. Go to Platform Surveys tab to create one.
                    </div>
                  )}
                </div>
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

      {logoModal && (
        <LogoModal
          org={logoModal}
          onClose={() => setLogoModal(null)}
          onSaved={() => { setLogoModal(null); fetchAll() }} />
      )}

      {wipeModal && (
        <WipeModal
          org={wipeModal}
          onClose={() => setWipeModal(null)}
          onDone={() => fetchAll()} />
      )}
    </div>
  )
}
