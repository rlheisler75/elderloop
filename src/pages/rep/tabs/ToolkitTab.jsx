import { ExternalLink, Video, FileSignature, CalendarClock, Clapperboard, Phone, KeyRound } from 'lucide-react'

const TOOLS = [
  {
    name: 'Jitsi Meet',
    icon: Video,
    color: 'text-blue-600', bg: 'bg-blue-50',
    desc: 'Free video calls for demos and client check-ins. No account needed — start a room and share the link.',
    url: 'https://meet.jit.si',
    cta: 'meet.jit.si',
  },
  {
    name: 'PDFgear',
    icon: FileSignature,
    color: 'text-red-600', bg: 'bg-red-50',
    desc: 'Free PDF editor and e-signer — mark up sales sheets or get agreements signed.',
    url: 'https://www.pdfgear.com',
    cta: 'pdfgear.com',
  },
  {
    name: 'Calendly',
    icon: CalendarClock,
    color: 'text-amber-600', bg: 'bg-amber-50',
    desc: 'Let prospects book a demo slot straight off your link or email signature — no back-and-forth scheduling.',
    url: 'https://calendly.com',
    cta: 'calendly.com',
  },
  {
    name: 'Loom',
    icon: Clapperboard,
    color: 'text-purple-600', bg: 'bg-purple-50',
    desc: 'Quick screen + webcam recordings for a "here\'s your dashboard" follow-up when a live demo isn\'t practical.',
    url: 'https://www.loom.com',
    cta: 'loom.com',
  },
  {
    name: 'Google Voice',
    icon: Phone,
    color: 'text-green-600', bg: 'bg-green-50',
    desc: 'A free business phone number and texting, so you\'re not handing out your personal cell.',
    url: 'https://voice.google.com',
    cta: 'voice.google.com',
  },
  {
    name: 'Bitwarden',
    icon: KeyRound,
    color: 'text-slate-600', bg: 'bg-slate-100',
    desc: 'Free password manager — handy once you\'re juggling dashboard logins, promo codes, and prospect info.',
    url: 'https://bitwarden.com',
    cta: 'bitwarden.com',
  },
]

export default function ToolkitTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-slate-800 text-lg">Rep Toolkit</h2>
        <p className="text-xs text-slate-400 mt-0.5">Free software that's handy for the job — none of it required, all of it optional</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TOOLS.map(t => {
          const Icon = t.icon
          return (
            <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer"
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-brand-200 hover:shadow-md transition-all group">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 ${t.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={t.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 text-sm flex items-center gap-1.5">
                    <span className="truncate">{t.name}</span>
                    <ExternalLink size={11} className="text-slate-300 group-hover:text-brand-500 flex-shrink-0 transition-colors" />
                  </div>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-3">{t.desc}</p>
                  <p className="text-xs text-brand-600 font-mono mt-2">{t.cta}</p>
                </div>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
