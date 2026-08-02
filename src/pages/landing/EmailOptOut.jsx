import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { CheckCircle, XCircle } from 'lucide-react'

export default function EmailOptOut() {
  const [searchParams] = useSearchParams()
  const leadId = searchParams.get('lead')
  const [status, setStatus] = useState('pending') // pending | done | error

  useEffect(() => {
    if (!leadId) { setStatus('error'); return }
    supabase.rpc('opt_out_lead_email', { p_lead_id: leadId })
      .then(({ error }) => setStatus(error ? 'error' : 'done'))
  }, [leadId])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" style={{ fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        {status === 'done' && (<>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-3">You're Unsubscribed</h2>
          <p className="text-slate-500">You won't receive any further marketing emails from us.</p>
        </>)}
        {status === 'error' && (<>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle size={32} className="text-red-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-800 mb-3">Something Went Wrong</h2>
          <p className="text-slate-500">We couldn't process your unsubscribe request. Please contact us directly.</p>
        </>)}
        {status === 'pending' && <p className="text-slate-400">Processing…</p>}
        <div className="mt-6 text-xs text-slate-400">Powered by ElderLoop</div>
      </div>
    </div>
  )
}
