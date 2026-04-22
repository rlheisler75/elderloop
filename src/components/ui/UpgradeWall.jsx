import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// Module → friendly name map
const MODULE_LABELS = {
  nursing:         'Nursing & Clinical',
  incidents:       'Incident Reports',
  staff:           'Staff Management',
  scheduling:      'Scheduling',
  timeclock:       'Time Clock',
  transportation:  'Transportation',
  meters:          'Meter Readings',
  security:        'Security Rounds',
  it:              'IT & Technology',
  marketing:       'Marketing',
  property_management: 'Property Management',
}

export default function UpgradeWall({ moduleKey }) {
  const navigate  = useNavigate()
  const { organization } = useAuth()
  const label = MODULE_LABELS[moduleKey] || moduleKey

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-md w-full text-center px-6">

        {/* Lock icon */}
        <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-slate-400" />
        </div>

        {/* Heading */}
        <h2 className="text-2xl font-bold text-slate-800 mb-3"
          style={{ fontFamily: '"Playfair Display", serif' }}>
          {label} is a Community feature
        </h2>

        <p className="text-slate-500 mb-2 leading-relaxed">
          Your current <span className="font-semibold text-slate-700 capitalize">{organization?.plan || 'Starter'}</span> plan
          doesn't include this module. Upgrade to <span className="font-semibold text-brand-600">Community</span> at $349/mo
          to unlock all 20 modules.
        </p>

        <p className="text-slate-400 text-sm mb-8">
          14-day free trial included on upgrades.
        </p>

        {/* What you get */}
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={15} className="text-brand-600" />
            <span className="text-sm font-semibold text-brand-700">Community plan includes:</span>
          </div>
          <ul className="space-y-1.5 text-sm text-slate-600">
            {[
              'Unlimited residents',
              'All 20 modules',
              'Nursing & clinical documentation',
              'GPS time clock & security rounds',
              'Marketing & lead pipeline',
              'Property management',
              'Staff scheduling & certifications',
              'Priority support + onboarding',
            ].map(f => (
              <li key={f} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/app/admin?tab=billing')}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-2xl transition-colors shadow-lg shadow-brand-900/20 mb-3">
          Upgrade to Community <ArrowRight size={16} />
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full py-3 text-slate-500 hover:text-slate-700 text-sm transition-colors">
          Go back
        </button>

      </div>
    </div>
  )
}
