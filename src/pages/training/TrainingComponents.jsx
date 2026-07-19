export function Frame({ src, alt, caption }) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-6">
      <img src={src} alt={alt} className="w-full h-auto block" />
      <figcaption className="text-xs text-slate-400 px-4 py-2.5 border-t border-slate-100 bg-slate-50">{caption}</figcaption>
    </div>
  )
}

export function ShotsPair({ children }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>
}

export function Steps({ items }) {
  return (
    <ul className="flex flex-col gap-2.5 mb-6">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-[15px] text-slate-700 bg-white border border-slate-200 rounded-xl px-3.5 py-3">
          <span className="font-bold text-brand-700 bg-brand-50 rounded-md px-2 py-0.5 text-xs flex-shrink-0 self-start mt-0.5">{item.k}</span>
          <span className="flex-1 min-w-0 leading-relaxed">{item.text}</span>
        </li>
      ))}
    </ul>
  )
}

export function Tip({ children, warn }) {
  return (
    <div className={`flex gap-3 rounded-xl px-4 py-3.5 text-[15px] leading-relaxed ${warn ? 'bg-amber-50 border border-amber-200 text-slate-700' : 'bg-sage-50 border border-sage-200 text-slate-700'}`}>
      <span className={`font-bold flex-shrink-0 ${warn ? 'text-amber-700' : 'text-sage-700'}`}>Tip —</span>
      <span className="flex-1 min-w-0">{children}</span>
    </div>
  )
}

export function SectionBlock({ id, num, title, dek, roleNote, children }) {
  return (
    <section id={id} className="scroll-mt-6 py-10 border-b border-slate-100 last:border-0">
      <div className="flex items-baseline gap-3 mb-2 flex-wrap">
        {num && (
          <span className="font-display font-semibold text-sm text-brand-600 bg-brand-50 w-7 h-7 rounded-lg inline-flex items-center justify-center flex-shrink-0">{num}</span>
        )}
        <h2 className="font-display font-bold text-slate-900 text-2xl">{title}</h2>
        {roleNote && (
          <span className="ml-auto text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full whitespace-nowrap">{roleNote}</span>
        )}
      </div>
      <p className="text-slate-500 text-[16.5px] max-w-2xl mb-6">{dek}</p>
      {children}
    </section>
  )
}

export function GuideHeader({ backTo, backLabel }) {
  return (
    <div className="bg-brand-950 py-4 px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center overflow-hidden">
            <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
        </a>
        <a href={backTo} className="text-brand-300 hover:text-white text-sm transition-colors">{backLabel}</a>
      </div>
    </div>
  )
}

export function GuideMasthead({ eyebrow, title, dek, chips }) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="text-xs font-semibold tracking-widest uppercase text-brand-600 mb-3">{eyebrow}</div>
        <h1 className="font-display font-bold text-slate-900 text-4xl sm:text-5xl mb-4">{title}</h1>
        <p className="text-slate-500 text-lg max-w-2xl">{dek}</p>
        {chips && (
          <div className="flex flex-wrap gap-2 mt-6">
            {chips.map(c => (
              <span key={c} className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">{c}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function GuideTOC({ nav }) {
  return (
    <nav className="hidden md:flex flex-col gap-0.5 sticky top-6 self-start">
      <div className="text-xs font-bold uppercase tracking-wide text-slate-400 px-3 pb-2">On this page</div>
      {nav.map(n => (
        <a key={n.id} href={`#${n.id}`}
          className="flex items-baseline gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-3 py-2 transition-colors">
          <span className="text-brand-600 font-bold text-xs w-4 flex-shrink-0">{n.num}</span>{n.label}
        </a>
      ))}
      <a href="#quickref" className="mt-2 pt-3 border-t border-slate-200 text-sm font-semibold text-brand-700 hover:text-brand-800 px-3 py-2">
        Quick reference
      </a>
    </nav>
  )
}

export function QuickRefTable({ rows }) {
  return (
    <section id="quickref" className="scroll-mt-6 py-10">
      <h2 className="font-display font-bold text-slate-900 text-2xl mb-2">Quick reference</h2>
      <p className="text-slate-500 mb-6">Not sure where to go? Start here.</p>
      <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
        <table className="w-full text-sm min-w-[520px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-bold uppercase tracking-wide text-slate-400 px-4 py-3">I need to&hellip;</th>
              <th className="text-left text-xs font-bold uppercase tracking-wide text-slate-400 px-4 py-3">Go to</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([task, where], i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3.5 font-semibold text-slate-700">{task}</td>
                <td className="px-4 py-3.5 text-brand-700 font-semibold whitespace-nowrap">{where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function GuideFooter({ label }) {
  return <footer className="text-center text-slate-400 text-xs py-10">ElderLoop Staff Training · {label}</footer>
}
