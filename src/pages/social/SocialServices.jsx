import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Heart, ClipboardList, AlertTriangle, Users, FileText, BarChart3, BookOpen, LogOut } from 'lucide-react'
import SocialProfile     from './SocialProfile'
import MoodTracker       from './MoodTracker'
import Grievances        from './Grievances'
import CareConferences   from './CareConferences'
import SocialDashboard   from './SocialDashboard'
import Resources         from './Resources'
import CaseNotes         from './CaseNotes'
import DischargePlanning from './DischargePlanning'

const TABS = [
  { key: 'profiles',     label: 'Social Profiles',   icon: FileText,     desc: 'Psycho-social history & advance directives' },
  { key: 'mood',         label: 'Mood & Behavior',   icon: Heart,        desc: 'Daily mood tracking & behavioral logs' },
  { key: 'casenotes',    label: 'Case Notes',        icon: ClipboardList,desc: 'Contact log & follow-ups' },
  { key: 'grievances',   label: 'Grievances',        icon: AlertTriangle,desc: 'Complaints, investigations & resolutions' },
  { key: 'conferences',  label: 'Care Conferences',  icon: Users,        desc: 'Scheduled conferences & meeting notes' },
  { key: 'discharge',    label: 'Discharge Planning',icon: LogOut,       desc: 'Discharge plans & post-acute coordination' },
  { key: 'resources',    label: 'Resources',         icon: BookOpen,     desc: 'Community resource directory & referrals' },
  { key: 'dashboard',    label: 'Director Dashboard', icon: BarChart3,   desc: 'Compliance alerts and facility-wide analytics', directorOnly: true },
]

export default function SocialServices() {
  const { profile, canEdit } = useAuth()
  const [tab, setTab] = useState('profiles')

  const canWrite = canEdit('social_services', ['social_services', 'supervisor', 'manager'])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-slate-800 dark:text-slate-100 text-2xl flex items-center gap-2.5">
            <Heart size={22} className="text-brand-600" /> Social Services
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Resident psycho-social records, behavioral tracking, grievances and care conferences</p>
        </div>
        {!canWrite && (
          <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 px-3 py-1.5 rounded-lg">
            View-only — contact your administrator to request write access
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl flex-wrap">
        {TABS.filter(t => !t.directorOnly || ['social_services','supervisor','manager','org_admin','ceo','super_admin'].includes(profile?.role)).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex-1 justify-center
              ${tab === t.key
                ? 'bg-white dark:bg-slate-900 text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-900/50'}`}>
            <t.icon size={15} />
            <span className="hidden sm:inline">{t.label}</span>
            <span className="sm:hidden">{t.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'profiles'    && <SocialProfile     canWrite={canWrite} />}
        {tab === 'mood'        && <MoodTracker       canWrite={canWrite} />}
        {tab === 'casenotes'   && <CaseNotes         canWrite={canWrite} />}
        {tab === 'grievances'  && <Grievances        canWrite={canWrite} />}
        {tab === 'conferences' && <CareConferences   canWrite={canWrite} />}
        {tab === 'discharge'   && <DischargePlanning canWrite={canWrite} />}
        {tab === 'resources'   && <Resources         canWrite={canWrite} />}
        {tab === 'dashboard'   && <SocialDashboard />}
      </div>
    </div>
  )
}
