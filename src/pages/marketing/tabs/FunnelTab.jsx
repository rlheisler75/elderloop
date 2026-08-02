import { useMemo } from 'react'
import { TrendingDown, Users } from 'lucide-react'

const FUNNEL_STAGES = [
  { key: 'new',            label: 'New Inquiry' },
  { key: 'contacted',      label: 'Contacted' },
  { key: 'tour_scheduled', label: 'Tour Scheduled' },
  { key: 'tour_completed', label: 'Tour Completed' },
  { key: 'application',    label: 'Application' },
  { key: 'deposit_paid',   label: 'Deposit Paid' },
  { key: 'move_in',        label: 'Moved In' },
]
const STAGE_INDEX = Object.fromEntries(FUNNEL_STAGES.map((s, i) => [s.key, i]))

// No stage-history table exists, so a lead's current status stands in for the
// furthest stage it reached — lost/disqualified/waitlisted leads only count
// at the "New Inquiry" base of the funnel since we can't know how far they got.
function attributionStats(items, keyField, leads) {
  return items
    .map(item => {
      const itemLeads = leads.filter(l => l[keyField] === item.id)
      const moveIns = itemLeads.filter(l => l.status === 'move_in').length
      return {
        id: item.id,
        name: item.name,
        leads: itemLeads.length,
        moveIns,
        conversion: itemLeads.length ? Math.round((moveIns / itemLeads.length) * 100) : null,
      }
    })
    .filter(x => x.leads > 0)
    .sort((a, b) => b.moveIns - a.moveIns || b.leads - a.leads)
}

export default function FunnelTab({ leads, campaigns, sources }) {
  // Every lead was a "New Inquiry" regardless of where it ended up, so that base
  // stage always counts all leads; later stages rely on current status as a proxy
  // for furthest reached, so lost/disqualified/waitlisted leads drop out of those.
  const stageCounts = useMemo(() => FUNNEL_STAGES.map(stage => ({
    ...stage,
    count: stage.key === 'new'
      ? leads.length
      : leads.filter(l => (STAGE_INDEX[l.status] ?? -1) >= STAGE_INDEX[stage.key]).length,
  })), [leads])

  const total = leads.length
  const lost = leads.filter(l => l.status === 'lost').length
  const disqualified = leads.filter(l => l.status === 'disqualified').length
  const waitlisted = leads.filter(l => l.status === 'waitlisted').length
  const moveIns = stageCounts[stageCounts.length - 1]?.count || 0
  const overallConversion = total ? Math.round((moveIns / total) * 100) : 0

  const topCampaigns = useMemo(() => attributionStats(campaigns, 'campaign_id', leads).slice(0, 5), [campaigns, leads])
  const topSources = useMemo(() => attributionStats(sources, 'referral_source_id', leads).slice(0, 5), [sources, leads])

  if (total === 0) {
    return (
      <div className="text-center py-20">
        <Users size={40} className="mx-auto text-slate-200 mb-3" />
        <p className="text-slate-400 font-medium">No leads yet</p>
        <p className="text-slate-300 text-sm mt-1">The funnel fills in once leads start coming through the pipeline</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100" style={{ fontFamily: '"Playfair Display", serif' }}>Lead Funnel</h3>
          <span className="text-sm text-slate-400">{overallConversion}% overall conversion to move-in</span>
        </div>

        <div className="space-y-3">
          {stageCounts.map((stage, i) => {
            const pctOfTotal = total ? Math.round((stage.count / total) * 100) : 0
            const prev = stageCounts[i - 1]
            const stepConversion = prev && prev.count ? Math.round((stage.count / prev.count) * 100) : null
            return (
              <div key={stage.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600 dark:text-slate-300">{stage.label}</span>
                  <span className="text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{stage.count}</span>
                    <span className="text-slate-400"> ({pctOfTotal}%)</span>
                    {stepConversion != null && <span className="text-slate-300 ml-2">· {stepConversion}% of prior stage</span>}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${pctOfTotal || (stage.count ? 2 : 0)}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
          {[
            { label: 'Lost', value: lost },
            { label: 'Disqualified', value: disqualified },
            { label: 'Waitlisted', value: waitlisted },
          ].map(m => (
            <div key={m.label} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1"><TrendingDown size={11} />{m.label}</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-lg mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerformanceTable title="Top Campaigns" rows={topCampaigns} />
        <PerformanceTable title="Top Referral Sources" rows={topSources} />
      </div>
    </div>
  )
}

function PerformanceTable({ title, rows }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5">
      <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: '"Playfair Display", serif' }}>{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No leads attributed yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium text-right">Leads</th>
              <th className="pb-2 font-medium text-right">Move-ins</th>
              <th className="pb-2 font-medium text-right">Conv.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                <td className="py-2 text-slate-700 dark:text-slate-300 truncate max-w-[160px]">{r.name}</td>
                <td className="py-2 text-right text-slate-600 dark:text-slate-300">{r.leads}</td>
                <td className="py-2 text-right text-slate-600 dark:text-slate-300">{r.moveIns}</td>
                <td className="py-2 text-right text-slate-500">{r.conversion != null ? `${r.conversion}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
