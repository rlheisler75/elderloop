import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { MessageSquare, Loader2 } from 'lucide-react'

// Text-message consent (Settings for staff, My Profile in the family / resident portals).
// Off until the person turns it on; set_my_sms_opt_in() stamps the date and audit-logs it.
// The wording below is what the Twilio toll-free verification describes — keep them in step.
export default function SmsConsentRow({ profile, refreshProfile, phoneHint }) {
  const [on, setOn]       = useState(!!profile?.sms_opt_in)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const phone = profile?.cell_phone || profile?.phone

  const toggle = async () => {
    const next = !on
    setSaving(true)
    setError('')
    const { error: err } = await supabase.rpc('set_my_sms_opt_in', { p_on: next })
    setSaving(false)
    if (err) { setError(err.message); return }
    setOn(next)
    await refreshProfile?.()
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <MessageSquare size={18} className="text-slate-400 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Text Messages</div>
            <div className="text-xs text-slate-400">
              {phone ? `Community announcements by text to ${phone}` : (phoneHint || 'Add a mobile number to your profile to get texts')}
            </div>
          </div>
        </div>
        {saving
          ? <Loader2 size={18} className="animate-spin text-slate-400" />
          : <button onClick={toggle} disabled={!phone && !on}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-brand-600' : 'bg-slate-200 dark:bg-slate-700'} ${!phone && !on ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
            </button>}
      </div>
      <p className="text-[11px] leading-snug text-slate-400 mt-2 pl-[30px]">
        {on && profile?.sms_opt_in_at && <>You agreed on {new Date(profile.sms_opt_in_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. </>}
        By turning this on you agree to receive community announcements by text from ElderLoop.
        Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out or HELP for help.
        Texts never include health information.
      </p>
      {error && <p className="text-xs text-red-600 mt-1 pl-[30px]">{error}</p>}
    </div>
  )
}
