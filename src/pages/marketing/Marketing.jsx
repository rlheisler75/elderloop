import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Users, Megaphone, TrendingUp, Calendar, CheckCircle, Tag, UserPlus, FileText, BarChart3, CalendarClock, Zap, Mail } from 'lucide-react'
import { StatCard, Modal } from './ui'
import PipelineTab, { LeadForm, ActivityModal } from './tabs/PipelineTab'
import CampaignsTab from './tabs/CampaignsTab'
import SourcesTab from './tabs/SourcesTab'
import LandingPagesTab from './tabs/LandingPagesTab'
import FunnelTab from './tabs/FunnelTab'
import FollowUpsTab from './tabs/FollowUpsTab'
import SequencesTab from './tabs/SequencesTab'
import TemplatesTab from './tabs/TemplatesTab'
import SequenceEnrollModal from './SequenceEnrollModal'

export default function Marketing() {
  const { profile, organization } = useAuth()
  const orgId = organization?.id || profile?.organization_id
  const [tab, setTab] = useState('pipeline')

  const [leads, setLeads] = useState([])
  const [sources, setSources] = useState([])
  const [staff, setStaff] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [units, setUnits] = useState([])
  const [loading, setLoading] = useState(true)

  const [showLeadForm, setShowLeadForm] = useState(false)
  const [editLead, setEditLead] = useState(null)
  const [activityLead, setActivityLead] = useState(null)
  const [enrollLead, setEnrollLead] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    const [leadsR, sourcesR, staffR, campsR, unitsR] = await Promise.all([
      supabase.from('leads').select('*, referral_source:referral_sources(name), assigned:profiles!leads_assigned_to_fkey(first_name,last_name), interested_unit:il_units(unit_number,building,unit_type)')
        .eq('organization_id', orgId).order('inquiry_date', { ascending: false }),
      supabase.from('referral_sources').select('*').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('profiles').select('id,first_name,last_name').eq('organization_id', orgId).order('first_name'),
      supabase.from('marketing_campaigns').select('*').eq('organization_id', orgId).order('created_at', { ascending: false }),
      supabase.from('il_units').select('id,unit_number,building,unit_type,status').eq('organization_id', orgId).eq('is_active', true).order('unit_number'),
    ])
    setLeads(leadsR.data || [])
    setSources(sourcesR.data || [])
    setStaff(staffR.data || [])
    setCampaigns(campsR.data || [])
    setUnits(unitsR.data || [])
    setLoading(false)
  }, [orgId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const stats = {
    total: leads.length,
    active: leads.filter(l => !['lost','disqualified','move_in'].includes(l.status)).length,
    tours: leads.filter(l => ['tour_scheduled','tour_completed'].includes(l.status)).length,
    moveIns: leads.filter(l => l.status === 'move_in').length,
  }

  const tabs = [
    { key: 'pipeline',      label: 'Lead Pipeline',   icon: Users },
    { key: 'followups',     label: 'Follow-Ups',      icon: CalendarClock },
    { key: 'sequences',     label: 'Sequences',       icon: Zap },
    { key: 'funnel',        label: 'Funnel',          icon: BarChart3 },
    { key: 'campaigns',     label: 'Campaigns',       icon: Megaphone },
    { key: 'templates',     label: 'Templates',       icon: Mail },
    { key: 'landing_pages', label: 'Landing Pages',   icon: FileText },
    { key: 'sources',       label: 'Referral Sources', icon: Tag },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-800 dark:text-slate-100">Marketing</h1>
          <p className="text-slate-500 text-sm mt-0.5">Lead pipeline, campaigns, landing pages, and referral tracking</p>
        </div>
        <button onClick={() => { setEditLead(null); setShowLeadForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors">
          <UserPlus size={15} /> Add Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}     label="Total Leads"   value={stats.total}   sub="All time" />
        <StatCard icon={TrendingUp} label="Active"       value={stats.active}  sub="In pipeline" color="text-green-600" />
        <StatCard icon={Calendar}  label="Tours"         value={stats.tours}   sub="Scheduled + completed" color="text-purple-600" />
        <StatCard icon={CheckCircle} label="Move-ins"    value={stats.moveIns} sub="Converted" color="text-amber-600" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${tab === t.key ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
              <Icon size={15} />{t.label}
            </button>
          )
        })}
      </div>

      {tab === 'pipeline' && (
        <PipelineTab
          leads={leads}
          loading={loading}
          onEditLead={(lead) => { setEditLead(lead); setShowLeadForm(true) }}
          onLogActivity={(lead) => setActivityLead(lead)}
          onEnroll={(lead) => setEnrollLead(lead)}
          onDeleted={fetchAll}
        />
      )}

      {tab === 'followups' && <FollowUpsTab orgId={orgId} />}

      {tab === 'sequences' && <SequencesTab orgId={orgId} />}

      {tab === 'funnel' && (
        <FunnelTab leads={leads} campaigns={campaigns} sources={sources} />
      )}

      {tab === 'campaigns' && (
        <CampaignsTab campaigns={campaigns} leads={leads} onRefetch={fetchAll} />
      )}

      {tab === 'templates' && <TemplatesTab orgId={orgId} />}

      {tab === 'landing_pages' && (
        <LandingPagesTab orgId={orgId} campaigns={campaigns} leads={leads} />
      )}

      {tab === 'sources' && <SourcesTab orgId={orgId} leads={leads} />}

      {/* Modals */}
      {showLeadForm && (
        <Modal title={editLead ? 'Edit Lead' : 'Add Lead'} onClose={() => setShowLeadForm(false)} wide>
          <LeadForm lead={editLead} sources={sources} staff={staff} units={units}
            onSave={() => { setShowLeadForm(false); fetchAll() }} onClose={() => setShowLeadForm(false)} />
        </Modal>
      )}
      {activityLead && <ActivityModal lead={activityLead} onClose={() => setActivityLead(null)} />}
      {enrollLead && <SequenceEnrollModal lead={enrollLead} onClose={() => setEnrollLead(null)} />}
    </div>
  )
}
