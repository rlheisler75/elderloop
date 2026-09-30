import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Sparkles, Wrench, HeartHandshake, Lock, Loader2, ShieldCheck, Check } from 'lucide-react'

// Must match ALLOWED_MODELS in supabase/functions/ai-assist and the ai_settings.model check constraint.
// Prices are Anthropic list prices per million tokens (input / output), used only for estimates.
const AI_MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', blurb: 'Fastest, lowest cost', price: [1, 5] },
  { id: 'claude-sonnet-5',           label: 'Sonnet 5',  blurb: 'Balanced — about 2× Haiku', price: [2, 10] },
  { id: 'claude-opus-5',             label: 'Opus 5',    blurb: 'Highest quality — about 5× Haiku', price: [5, 25] },
]
const DEFAULT_MODEL = AI_MODELS[0].id

// Must match the ai_settings.section check constraint and TASK_SECTIONS in the Edge Function
const SECTIONS = [
  { key: 'maintenance',     label: 'Maintenance',     icon: Wrench,
    desc: 'Suggests category, priority, and a clear description for new work orders.',
    tasks: ['wo_triage'] },
  { key: 'social_services', label: 'Social Services', icon: HeartHandshake, clinical: true,
    desc: 'Polishes case notes, organizes care conference notes, and suggests care-plan goals.',
    tasks: ['ss_case_note', 'ss_care_conference', 'ss_goal_suggest'] },
]

const costOf = (row) => {
  const m = AI_MODELS.find(x => row.model?.startsWith(x.id.replace(/-\d{8}$/, ''))) || AI_MODELS[0]
  return (row.input_tokens * m.price[0] + row.output_tokens * m.price[1]) / 1e6
}
const fmtCost = (n) => n < 0.01 && n > 0 ? '< $0.01' : `$${n.toFixed(2)}`

export default function AiSettingsTab({ orgId }) {
  const { profile, isSuperAdmin, refreshModules } = useAuth()
  const [loading, setLoading]   = useState(true)
  const [modules, setModules]   = useState({ ai_assist: false, ai_assist_clinical: false })
  const [settings, setSettings] = useState({}) // section -> { enabled, model }
  const [usage, setUsage]       = useState([])
  const [saving, setSaving]     = useState(null) // section or module key being saved
  const [savedFlash, setSavedFlash] = useState(null)
  const [error, setError]       = useState('')

  useEffect(() => { if (orgId) load() }, [orgId])

  async function load() {
    setLoading(true)
    const d = new Date()
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
    const [{ data: mods }, { data: rows }, { data: use }] = await Promise.all([
      supabase.from('organization_modules').select('module_key, is_enabled')
        .eq('organization_id', orgId).in('module_key', ['ai_assist', 'ai_assist_clinical']),
      supabase.from('ai_settings').select('section, enabled, model').eq('organization_id', orgId),
      supabase.from('ai_usage').select('task, model, input_tokens, output_tokens')
        .eq('organization_id', orgId).gte('created_at', monthStart),
    ])
    const on = (k) => !!mods?.find(m => m.module_key === k && m.is_enabled !== false)
    setModules({ ai_assist: on('ai_assist'), ai_assist_clinical: on('ai_assist_clinical') })
    setSettings(Object.fromEntries((rows || []).map(r => [r.section, r])))
    setUsage(use || [])
    setLoading(false)
  }

  const current = (section) => ({ enabled: settings[section]?.enabled ?? true, model: settings[section]?.model ?? DEFAULT_MODEL })

  async function saveSection(section, patch) {
    setSaving(section); setError('')
    const next = { ...current(section), ...patch }
    const { error: err } = await supabase.from('ai_settings').upsert({
      organization_id: orgId, section, ...next, updated_by: profile?.id, updated_at: new Date().toISOString(),
    })
    setSaving(null)
    if (err) { setError(err.message); return }
    setSettings(s => ({ ...s, [section]: { section, ...next } }))
    setSavedFlash(section); setTimeout(() => setSavedFlash(null), 1500)
  }

  // Super admin only: the add-on and clinical switches (organization_modules)
  async function toggleModule(key) {
    setSaving(key); setError('')
    const { error: err } = await supabase.from('organization_modules').upsert(
      { organization_id: orgId, module_key: key, is_enabled: !modules[key] },
      { onConflict: 'organization_id,module_key' })
    setSaving(null)
    if (err) { setError(err.message); return }
    setModules(m => ({ ...m, [key]: !m[key] }))
    refreshModules?.()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
  )

  const monthTotal = usage.reduce((sum, u) => sum + costOf(u), 0)

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/50 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-brand-600" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">AI Add-on</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            AI suggestions that help staff fill out forms faster. Staff always review a suggestion before anything is saved.
          </p>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-700 dark:text-red-400">{error}</div>}

      {isSuperAdmin && (
        <div className="p-4 border border-purple-200 dark:border-purple-900 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl space-y-3">
          <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck size={13} /> Super Admin
          </div>
          {[
            { key: 'ai_assist',          label: 'AI Add-on active for this organization', hint: 'Turn on when they purchase the add-on.' },
            { key: 'ai_assist_clinical', label: 'Clinical AI (resident health information)', hint: 'Only after a HIPAA BAA with Anthropic is signed.' },
          ].map(m => (
            <div key={m.key} className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{m.label}</div>
                <div className="text-xs text-slate-500">{m.hint}</div>
              </div>
              <Toggle on={modules[m.key]} busy={saving === m.key} onClick={() => toggleModule(m.key)} />
            </div>
          ))}
        </div>
      )}

      {!modules.ai_assist ? (
        <div className="p-6 border border-slate-200 dark:border-slate-700 rounded-2xl text-center">
          <Lock size={22} className="mx-auto text-slate-400 mb-2" />
          <div className="font-medium text-slate-700 dark:text-slate-200">The AI Add-on isn't active for your community</div>
          <p className="text-sm text-slate-500 mt-1">Contact ElderLoop support to add it to your plan.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {SECTIONS.map(s => {
              const Icon = s.icon
              const locked = s.clinical && !modules.ai_assist_clinical
              const cfg = current(s.key)
              const secUsage = usage.filter(u => s.tasks.includes(u.task))
              return (
                <div key={s.key} className={`p-5 border rounded-2xl ${locked ? 'border-slate-200 dark:border-slate-800 opacity-70' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-900`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Icon size={18} className="text-slate-500 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          {s.label}
                          {savedFlash === s.key && <span className="text-xs font-medium text-green-600 flex items-center gap-1"><Check size={12} /> Saved</span>}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{s.desc}</p>
                      </div>
                    </div>
                    {locked
                      ? <span className="flex items-center gap-1 text-xs font-medium text-slate-500 whitespace-nowrap"><Lock size={12} /> Requires HIPAA approval</span>
                      : <Toggle on={cfg.enabled} busy={saving === s.key} onClick={() => saveSection(s.key, { enabled: !cfg.enabled })} />}
                  </div>

                  {!locked && cfg.enabled && (
                    <div className="mt-4 pl-7">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Model</div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        {AI_MODELS.map(m => (
                          <button key={m.id} type="button" disabled={saving === s.key}
                            onClick={() => cfg.model !== m.id && saveSection(s.key, { model: m.id })}
                            className={`text-left px-3 py-2.5 rounded-xl border transition-all ${cfg.model === m.id
                              ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50 ring-1 ring-brand-500'
                              : 'border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{m.label}</div>
                            <div className="text-xs text-slate-500">{m.blurb}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {!locked && (
                    <div className="mt-4 pl-7 text-xs text-slate-500">
                      This month: <strong className="text-slate-700 dark:text-slate-300">{secUsage.length}</strong> suggestion{secUsage.length === 1 ? '' : 's'}
                      {' · '}est. <strong className="text-slate-700 dark:text-slate-300">{fmtCost(secUsage.reduce((sum, u) => sum + costOf(u), 0))}</strong>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-xs text-slate-400">
            Month to date across all sections: {usage.length} suggestions, est. {fmtCost(monthTotal)} in AI usage.
            Estimates use Anthropic list prices. Each community is limited to 200 suggestions per 24 hours.
          </p>
        </>
      )}
    </div>
  )
}

function Toggle({ on, busy, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={busy} aria-pressed={on}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 disabled:opacity-60 ${on ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  )
}
