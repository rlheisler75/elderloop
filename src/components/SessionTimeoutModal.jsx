import { Clock, LogOut } from 'lucide-react'

export default function SessionTimeoutModal({ timeLeft, onExtend, onLogout }) {
  const minutes   = Math.floor(timeLeft / 60)
  const seconds   = timeLeft % 60
  const formatted = `${minutes}:${String(seconds).padStart(2, '0')}`
  const isUrgent  = timeLeft <= 30

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-4 flex items-center gap-3 ${isUrgent ? 'bg-red-600' : 'bg-amber-500'}`}>
          <Clock className="text-white flex-shrink-0" size={20} />
          <h2 className="text-white font-semibold text-base">Session Expiring Soon</h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
            For the security of resident information, your session will automatically
            sign out after 30 minutes of inactivity.
          </p>

          {/* Countdown */}
          <div className={`text-center py-4 rounded-xl mb-5 ${isUrgent ? 'bg-red-50 dark:bg-red-950/50' : 'bg-amber-50 dark:bg-amber-950/50'}`}>
            <div className={`text-4xl font-mono font-bold tabular-nums ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {formatted}
            </div>
            <p className={`text-xs mt-1 ${isUrgent ? 'text-red-400' : 'text-amber-500'}`}>
              until automatic sign-out
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex-1"
            >
              <LogOut size={14} />
              Sign Out
            </button>
            <button
              onClick={onExtend}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                isUrgent ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-600 hover:bg-brand-700'
              }`}
            >
              Stay Logged In
            </button>
          </div>
        </div>

        <div className="px-6 pb-4">
          <p className="text-xs text-slate-400 text-center">
            HIPAA requires automatic sign-out after 30 minutes of inactivity.
          </p>
        </div>
      </div>
    </div>
  )
}
