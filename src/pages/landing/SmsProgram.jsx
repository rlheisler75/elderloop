import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'

// Public page describing ElderLoop's text-message program and exactly where people
// consent. Twilio's toll-free verification uses it as the opt-in proof URL
// (https://www.elderloop.xyz/sms). Keep the consent wording identical to
// src/components/communication/SmsConsentRow.jsx, Privacy 7.5, and Terms 2.1.
const COMPANY = 'Loopware Solutions LLC'
const CONTACT = 'info@loopwaresolutions.com'
const UPDATED = 'October 8, 2026'
const CONSENT = 'By turning this on you agree to receive community announcements by text from ElderLoop. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out or HELP for help. Texts never include health information.'

function Block({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="font-display font-bold text-slate-800 text-xl mb-4 pb-2 border-b border-slate-100">{title}</h2>
      <div className="space-y-3 text-slate-600 leading-relaxed">{children}</div>
    </div>
  )
}

// A copy of the switch people see in the app (Settings, or My Profile → Notifications)
function ConsentSwitchExample({ on }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <MessageSquare size={18} className="text-slate-400 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-slate-700">Text Messages</div>
            <div className="text-xs text-slate-400">Community announcements by text to (555) 123-4567</div>
          </div>
        </div>
        <span className={`relative w-11 h-6 rounded-full flex-shrink-0 ${on ? 'bg-brand-600' : 'bg-slate-200'}`}>
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow ${on ? 'translate-x-5' : ''}`} />
        </span>
      </div>
      <p className="text-[11px] leading-snug text-slate-400 mt-2 pl-[30px]">{CONSENT}</p>
    </div>
  )
}

export default function SmsProgram() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-brand-950 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
          </Link>
          <Link to="/privacy" className="text-brand-300 hover:text-white text-sm transition-colors">Privacy Policy →</Link>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-bold text-slate-900 text-4xl mb-3">ElderLoop Text Messages</h1>
          <p className="text-slate-500">{COMPANY} · Text message (SMS) program</p>
          <p className="text-slate-400 text-sm mt-1">Last Updated: {UPDATED}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <Block title="What these messages are">
          <p>ElderLoop is software that senior living communities use to run their community. Through ElderLoop, a community can send text messages to residents, family members, and staff who have agreed to receive them: event and activity reminders, dining changes, weather closures, maintenance notices, and other facility updates.</p>
          <p>Each text names the staff member who sent it and ends with "via ElderLoop. Reply STOP to opt out." Texts are <strong>never marketing</strong> and <strong>never include health information</strong>.</p>
          <p className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">
            <span className="text-slate-400 text-xs block mb-1">Example</span>
            Holiday Lunch: The dining room opens at 11:30 today for the holiday lunch. All residents and families welcome! — Jane Smith via ElderLoop. Reply STOP to opt out.
          </p>
        </Block>

        <Block title="How people agree to receive texts">
          <p>Text messages are <strong>off for everyone</strong> until the person agrees. There are two ways to agree:</p>

          <h3 className="font-semibold text-slate-700 mt-4">1. In the ElderLoop app</h3>
          <p>Staff open <strong>Settings</strong>; residents and family members open <strong>My Profile → Notifications</strong> in their portal. They turn on <strong>Text Messages</strong>. The agreement text is shown directly under the switch:</p>
          <div className="grid sm:grid-cols-2 gap-4 my-4">
            <div><p className="text-xs text-slate-400 mb-1.5">Before agreeing (off, the default)</p><ConsentSwitchExample on={false} /></div>
            <div><p className="text-xs text-slate-400 mb-1.5">After agreeing (on)</p><ConsentSwitchExample on /></div>
          </div>
          <p>ElderLoop records the date each person agreed. Only the person can turn their own texts on; a community's staff cannot do it for them.</p>

          <h3 className="font-semibold text-slate-700 mt-6">2. On paper (residents)</h3>
          <p>A resident, or their representative, may agree in writing, for example on move-in paperwork. Community staff then record that agreement on the resident's record in ElderLoop, which notes who recorded it and when. The paper wording is:</p>
          <p className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700">
            ☐ I agree to receive community announcements by text message from [Community name] via ElderLoop at the mobile number above. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to opt out or HELP for help. Agreeing is not a condition of residency or of any purchase.
          </p>
        </Block>

        <Block title="Stopping texts and getting help">
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Reply <strong>STOP</strong> to any message to stop all texts. You'll get one confirmation and no more texts after that.</li>
            <li>Or turn <strong>Text Messages</strong> off in the ElderLoop app at any time.</li>
            <li>Reply <strong>HELP</strong> for help, or email <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a>.</li>
          </ul>
        </Block>

        <Block title="Frequency and costs">
          <p>Message frequency varies with your community's announcements, typically a few messages a month. Message and data rates may apply, depending on your mobile plan. Carriers are not liable for delayed or undelivered messages.</p>
        </Block>

        <Block title="Your mobile number">
          <p>Your mobile number is used only to send the messages you agreed to receive. <strong>We do not sell, rent, or share mobile numbers or text-message consent with third parties or affiliates for marketing or promotional purposes.</strong> Numbers are shared only with our text-message provider (Twilio) to deliver messages.</p>
          <p>See our <Link to="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link> (section 7.5) and <Link to="/terms" className="text-brand-600 hover:underline">Terms of Service</Link> (section 2.1).</p>
        </Block>

        <Block title="Contact">
          <p>{COMPANY} · <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a> · <a href="https://www.elderloop.xyz" className="text-brand-600 hover:underline">elderloop.xyz</a></p>
        </Block>
      </div>
    </div>
  )
}
