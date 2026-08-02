import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../context/AuthContext'
import { Plus, Search, Megaphone, Edit2, Trash2, ArrowRight, Mail, History } from 'lucide-react'
import { Badge, Modal, Field, inputCls, selectCls } from '../ui'
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES, CARE_LEVELS, fmt, fmtDate, fmtMoney, getCampStatus } from '../constants'
import EmailComposerModal from '../EmailComposerModal'
import EmailHistoryModal from '../EmailHistoryModal'

// ── Campaign Form ─────────────────────────────────────────────

export function CampaignForm({ campaign, onSave, onClose }) {
  const { profile } = useAuth()
  const [form, setForm] = useState({
    name: '', description: '', campaign_type: 'general',
    status: 'draft', start_date: '', end_date: '',
    budget: '', actual_spend: '',
    goal_leads: '', goal_tours: '', goal_move_ins: '',
    target_care_levels: [], target_geography: '', target_audience: '',
    headline: '', body_copy: '', call_to_action: '', landing_url: '',
    promo_code: '',
    ...campaign,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleCareLevel = (lvl) => set('target_care_levels',
    form.target_care_levels.includes(lvl)
      ? form.target_care_levels.filter(x => x !== lvl)
      : [...form.target_care_levels, lvl]
  )

  const handleSave = async () => {
    if (!form.name) return
    setSaving(true)
    const payload = {
      ...form,
      budget: form.budget || null,
      actual_spend: form.actual_spend || null,
      goal_leads: form.goal_leads || null,
      goal_tours: form.goal_tours || null,
      goal_move_ins: form.goal_move_ins || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      promo_code: form.promo_code || null,
      created_by: profile?.id,
    }
    const { error } = campaign?.id
      ? await supabase.from('marketing_campaigns').update(payload).eq('id', campaign.id)
      : await supabase.from('marketing_campaigns').insert(payload)
    setSaving(false)
    if (!error) onSave()
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Campaign Name" required>
            <input className={inputCls} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Spring Open House 2026" />
          </Field>
        </div>
        <Field label="Type">
          <select className={selectCls} value={form.campaign_type} onChange={e=>set('campaign_type',e.target.value)}>
            {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={e=>set('status',e.target.value)}>
            {CAMPAIGN_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Start Date">
          <input className={inputCls} type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} />
        </Field>
        <Field label="End Date">
          <input className={inputCls} type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} />
        </Field>
        <Field label="Budget">
          <input className={inputCls} type="number" value={form.budget} onChange={e=>set('budget',e.target.value)} placeholder="$0" />
        </Field>
        <Field label="Actual Spend">
          <input className={inputCls} type="number" value={form.actual_spend} onChange={e=>set('actual_spend',e.target.value)} />
        </Field>
        <Field label="Goal: Leads">
          <input className={inputCls} type="number" value={form.goal_leads} onChange={e=>set('goal_leads',e.target.value)} />
        </Field>
        <Field label="Goal: Tours">
          <input className={inputCls} type="number" value={form.goal_tours} onChange={e=>set('goal_tours',e.target.value)} />
        </Field>
        <Field label="Target Geography">
          <input className={inputCls} value={form.target_geography} onChange={e=>set('target_geography',e.target.value)} placeholder="Springfield metro area" />
        </Field>
        <Field label="Promo Code">
          <input className={inputCls} value={form.promo_code} onChange={e=>set('promo_code',e.target.value)} placeholder="SPRING26" />
        </Field>
        <Field label="Headline">
          <input className={inputCls} value={form.headline} onChange={e=>set('headline',e.target.value)} />
        </Field>
        <Field label="Call to Action">
          <input className={inputCls} value={form.call_to_action} onChange={e=>set('call_to_action',e.target.value)} placeholder="Schedule a Tour Today" />
        </Field>
        <div className="col-span-2">
          <Field label="Landing URL">
            <input className={inputCls} value={form.landing_url} onChange={e=>set('landing_url',e.target.value)} placeholder="https://…" />
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Body Copy">
            <textarea className={inputCls} rows={3} value={form.body_copy} onChange={e=>set('body_copy',e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Target Care Levels">
          <div className="flex flex-wrap gap-2 mt-1">
            {CARE_LEVELS.map(lvl => (
              <button key={lvl} type="button" onClick={() => toggleCareLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  form.target_care_levels.includes(lvl)
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-300'
                }`}>
                {fmt(lvl)}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.name}
          className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
          {saving ? 'Saving…' : campaign?.id ? 'Save Changes' : 'Create Campaign'}
        </button>
      </div>
    </>
  )
}

// ── Campaigns Tab ─────────────────────────────────────────────

export default function CampaignsTab({ campaigns, leads, onRefetch }) {
  const [campSearch, setCampSearch] = useState('')
  const [campStatusFilter, setCampStatusFilter] = useState('all')
  const [showCampForm, setShowCampForm] = useState(false)
  const [editCamp, setEditCamp] = useState(null)
  const [emailCampaign, setEmailCampaign] = useState(null)
  const [historyCampaign, setHistoryCampaign] = useState(null)

  const filteredCamps = campaigns.filter(c => {
    const q = campSearch.toLowerCase()
    const match = !q || c.name.toLowerCase().includes(q)
    const status = campStatusFilter === 'all' || c.status === campStatusFilter
    return match && status
  })

  const deleteCampaign = async (id) => {
    if (!confirm('Delete this campaign?')) return
    await supabase.from('marketing_campaigns').delete().eq('id', id)
    onRefetch()
  }

  const cycleCampStatus = async (camp) => {
    const order = ['draft','active','paused','completed']
    const idx = order.indexOf(camp.status)
    const next = order[(idx + 1) % order.length]
    await supabase.from('marketing_campaigns').update({ status: next }).eq('id', camp.id)
    onRefetch()
  }

  const recipientCount = (campaignId) =>
    leads.filter(l => l.campaign_id === campaignId && l.email && !l.email_opt_out).length

  const campaignPerformance = (campaignId) => {
    const campLeads = leads.filter(l => l.campaign_id === campaignId)
    const tours = campLeads.filter(l => ['tour_scheduled', 'tour_completed'].includes(l.status)).length
    const moveIns = campLeads.filter(l => l.status === 'move_in').length
    return { leads: campLeads.length, tours, moveIns }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Search campaigns…" value={campSearch} onChange={e=>setCampSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={campStatusFilter} onChange={e=>setCampStatusFilter(e.target.value)}>
            <option value="all">All</option>
            {CAMPAIGN_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <button onClick={() => { setEditCamp(null); setShowCampForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {filteredCamps.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone size={40} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 font-medium">No campaigns yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCamps.map(camp => {
            const st = getCampStatus(camp.status)
            const StatusIcon = st.icon
            const pctBudget = camp.budget && camp.actual_spend ? Math.min(100, Math.round((camp.actual_spend / camp.budget) * 100)) : null
            return (
              <div key={camp.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={st.color}><StatusIcon size={11} className="mr-1 inline" />{st.label}</Badge>
                      <span className="text-xs text-slate-400">{fmt(camp.campaign_type)}</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{camp.name}</h3>
                    {camp.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{camp.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button onClick={() => setEmailCampaign(camp)} title="Send Email"
                      className="p-1.5 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors text-slate-300">
                      <Mail size={14} />
                    </button>
                    <button onClick={() => setHistoryCampaign(camp)} title="Email History"
                      className="p-1.5 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors text-slate-300">
                      <History size={14} />
                    </button>
                    <button onClick={() => cycleCampStatus(camp)} title="Advance status"
                      className="p-1.5 hover:bg-brand-50 hover:text-brand-600 rounded-lg transition-colors text-slate-300">
                      <ArrowRight size={14} />
                    </button>
                    <button onClick={() => { setEditCamp(camp); setShowCampForm(true) }}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteCampaign(camp.id)}
                      className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {(() => {
                  const perf = campaignPerformance(camp.id)
                  const costPerLead = camp.actual_spend && perf.leads ? fmtMoney(camp.actual_spend / perf.leads) : '—'
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-3 mb-2">
                        {[
                          { label: 'Budget', value: fmtMoney(camp.budget) },
                          { label: 'Spent',  value: fmtMoney(camp.actual_spend) },
                          { label: 'Cost / Lead', value: costPerLead },
                        ].map(m => (
                          <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5 text-center">
                            <p className="text-xs text-slate-400">{m.label}</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mt-0.5">{m.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {[
                          { label: 'Leads', value: perf.leads, goal: camp.goal_leads },
                          { label: 'Tours', value: perf.tours, goal: camp.goal_tours },
                          { label: 'Move-ins', value: perf.moveIns, goal: camp.goal_move_ins },
                        ].map(m => (
                          <div key={m.label} className="bg-brand-50/60 dark:bg-brand-950/30 rounded-xl p-2.5 text-center">
                            <p className="text-xs text-slate-400">{m.label}</p>
                            <p className="font-semibold text-brand-700 dark:text-brand-400 text-sm mt-0.5">
                              {m.value}{m.goal ? <span className="text-slate-400 font-normal"> / {m.goal}</span> : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  )
                })()}

                {pctBudget !== null && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>Budget used</span><span>{pctBudget}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pctBudget > 90 ? 'bg-red-400' : pctBudget > 70 ? 'bg-amber-400' : 'bg-brand-500'}`}
                        style={{ width: `${pctBudget}%` }} />
                    </div>
                  </div>
                )}

                {(camp.start_date || camp.end_date) && (
                  <p className="text-xs text-slate-400 mt-3">
                    {fmtDate(camp.start_date)} — {fmtDate(camp.end_date)}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCampForm && (
        <Modal title={editCamp ? 'Edit Campaign' : 'New Campaign'} onClose={() => setShowCampForm(false)} wide>
          <CampaignForm campaign={editCamp}
            onSave={() => { setShowCampForm(false); onRefetch() }} onClose={() => setShowCampForm(false)} />
        </Modal>
      )}

      {emailCampaign && (
        <EmailComposerModal campaign={emailCampaign} recipientCount={recipientCount(emailCampaign.id)}
          onClose={() => setEmailCampaign(null)} />
      )}

      {historyCampaign && (
        <EmailHistoryModal campaign={historyCampaign} onClose={() => setHistoryCampaign(null)} />
      )}
    </div>
  )
}
