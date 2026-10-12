import { Component } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

// Catches a crash while rendering, so one broken page shows a message instead
// of turning the whole app white. Layout wraps each page in one (keyed by the
// URL, so clicking to another page clears it); main.jsx wraps the whole app.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ElderLoop] page crashed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    // After a deploy, an open tab can ask for page code that no longer exists.
    const stale = /dynamically imported module|Loading chunk|Importing a module script failed/i.test(this.state.error?.message || '')
    return (
      <div className={`flex items-center justify-center p-6 ${this.props.fullScreen ? 'min-h-screen bg-slate-50 dark:bg-slate-950' : 'py-20'}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {stale ? 'ElderLoop was just updated' : 'Something went wrong on this page'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {stale
              ? 'Reload to get the latest version.'
              : 'Anything already saved is safe. Reload to try again. If it keeps happening, let your administrator or ElderLoop support know what you clicked.'}
          </p>
          <button onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">
            <RotateCw size={14} /> Reload
          </button>
        </div>
      </div>
    )
  }
}
