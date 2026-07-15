import { useState } from 'react'
import { Bell, BellOff, X, Smartphone } from 'lucide-react'
import { usePushNotifications } from '../../hooks/usePushNotifications'

export default function PushPermissionModal({ profileId, onClose }) {
  const { supported, loading, subscribe } = usePushNotifications(profileId)
  const [declined, setDeclined] = useState(false)

  if (!supported) return null

  const handleAllow = async () => {
    const success = await subscribe()
    onClose(success ? 'granted' : 'denied')
  }

  const handleDecline = () => {
    // Remember they declined for this session — don't ask again until next login
    sessionStorage.setItem('push_permission_asked', '1')
    setDeclined(true)
    setTimeout(() => onClose('declined'), 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm transition-all duration-300 ${declined ? 'opacity-0 translate-y-4' : 'opacity-100'}`}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-0">
          <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Bell size={22} className="text-brand-600" />
          </div>
          <button onClick={handleDecline} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg mb-1.5">
            Stay notified
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">
            Enable notifications so you don't miss urgent broadcasts, care alerts, or messages from your team — even when the app isn't open.
          </p>

          {/* What you'll get */}
          <div className="space-y-2 mb-5">
            {[
              'Urgent community broadcasts',
              'Family messages and requests',
              'Care alerts from your team',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 mb-5 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
            <Smartphone size={13} className="flex-shrink-0" />
            Works on desktop and mobile — install as an app for the best experience
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={handleAllow}
            disabled={loading}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Setting up...
              </span>
            ) : (
              <><Bell size={15} /> Enable Notifications</>
            )}
          </button>
          <button
            onClick={handleDecline}
            className="w-full py-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-medium transition-colors flex items-center justify-center gap-1.5">
            <BellOff size={13} /> Not now
          </button>
        </div>
      </div>
    </div>
  )
}
