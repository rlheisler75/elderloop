import { Edit2, Play, Pause, CheckCircle, XCircle } from 'lucide-react'

export const LEAD_STATUSES = [
  { key: 'new',             label: 'New',             color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  { key: 'contacted',       label: 'Contacted',       color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900' },
  { key: 'tour_scheduled',  label: 'Tour Scheduled',  color: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900' },
  { key: 'tour_completed',  label: 'Tour Completed',  color: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900' },
  { key: 'application',     label: 'Application',     color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900' },
  { key: 'deposit_paid',    label: 'Deposit Paid',    color: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-900' },
  { key: 'waitlisted',      label: 'Waitlisted',      color: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900' },
  { key: 'move_in',         label: 'Moved In',        color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900' },
  { key: 'lost',            label: 'Lost',            color: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900' },
  { key: 'disqualified',    label: 'Disqualified',    color: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
]

export const CAMPAIGN_STATUSES = [
  { key: 'draft',     label: 'Draft',     color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',   icon: Edit2 },
  { key: 'active',    label: 'Active',    color: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900',   icon: Play },
  { key: 'paused',    label: 'Paused',    color: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900',   icon: Pause },
  { key: 'completed', label: 'Completed', color: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900',      icon: CheckCircle },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-red-100 dark:bg-red-950/50 text-red-500 dark:text-red-400 border-red-200 dark:border-red-900',         icon: XCircle },
]

export const CAMPAIGN_TYPES = [
  'email','direct_mail','event','digital','social_media','print','radio','tv','referral_program','open_house','other','general'
]

export const INQUIRY_TYPES = ['self','spouse','parent','sibling','other_family','friend','professional_referral']
export const LOST_REASONS  = ['chose_competitor','cost','health_change','deceased','not_ready','no_availability','other']
export const CARE_LEVELS   = ['independent','assisted','memory_care','skilled_nursing','rehab']
export const UNIT_TYPES    = ['studio','one_bedroom','two_bedroom','cottage','house','other']
export const ACTIVITY_TYPES = ['call','email','text','tour','application','note','status_change','campaign_touch','follow_up','voicemail','visit','other']
export const SOURCE_CATEGORIES = ['hospital','physician','home_health','hospice','family','resident','web','social_media','print_ad','event','direct_mail','senior_advisor','broker','other']

export const fmt = (s) => s?.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) || '—'
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—'
export const fmtMoney = (n) => n != null ? `$${Number(n).toLocaleString()}` : '—'

export const getLeadStatus = (key) => LEAD_STATUSES.find(s => s.key === key)     || LEAD_STATUSES[0]
export const getCampStatus = (key) => CAMPAIGN_STATUSES.find(s => s.key === key) || CAMPAIGN_STATUSES[0]
