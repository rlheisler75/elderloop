import { Link } from 'react-router-dom'

const SHOT = (name) => `/training/social-services/${name}`

function Frame({ src, alt, caption }) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white mb-6">
      <img src={src} alt={alt} className="w-full h-auto block" />
      <figcaption className="text-xs text-slate-400 px-4 py-2.5 border-t border-slate-100 bg-slate-50">{caption}</figcaption>
    </div>
  )
}

function ShotsPair({ children }) {
  return <div className="grid sm:grid-cols-2 gap-4">{children}</div>
}

function Steps({ items }) {
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

function Tip({ children, warn }) {
  return (
    <div className={`flex gap-3 rounded-xl px-4 py-3.5 text-[15px] leading-relaxed ${warn ? 'bg-amber-50 border border-amber-200 text-slate-700' : 'bg-sage-50 border border-sage-200 text-slate-700'}`}>
      <span className={`font-bold flex-shrink-0 ${warn ? 'text-amber-700' : 'text-sage-700'}`}>Tip —</span>
      <span className="flex-1 min-w-0">{children}</span>
    </div>
  )
}

function SectionBlock({ id, num, title, dek, roleNote, children }) {
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

const NAV = [
  { id: 'profiles', num: '01', label: 'Social Profiles' },
  { id: 'mood', num: '02', label: 'Mood & Behavior' },
  { id: 'notes', num: '03', label: 'Case Notes' },
  { id: 'grievances', num: '04', label: 'Grievances' },
  { id: 'conferences', num: '05', label: 'Care Conferences' },
  { id: 'discharge', num: '06', label: 'Discharge Planning' },
  { id: 'resources', num: '07', label: 'Resources' },
  { id: 'dashboard', num: '08', label: 'Director Dashboard' },
]

export default function SocialServicesGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand-950 py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
          </Link>
          <Link to="/training" className="text-brand-300 hover:text-white text-sm transition-colors">← All training guides</Link>
        </div>
      </div>

      {/* Masthead */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="text-xs font-semibold tracking-widest uppercase text-brand-600 mb-3">ElderLoop Staff Training</div>
          <h1 className="font-display font-bold text-slate-900 text-4xl sm:text-5xl mb-4">Social Services</h1>
          <p className="text-slate-500 text-lg max-w-2xl">
            A working guide to every tab in the Social Services module — what each screen is for, how to use it day-to-day, and where the data ends up.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">For: Social Services staff, Supervisors, Managers</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">Where: Sidebar → Social Services</span>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">8 tabs</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        {/* TOC */}
        <nav className="hidden md:flex flex-col gap-0.5 sticky top-6 self-start">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400 px-3 pb-2">On this page</div>
          {NAV.map(n => (
            <a key={n.id} href={`#${n.id}`}
              className="flex items-baseline gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg px-3 py-2 transition-colors">
              <span className="text-brand-600 font-bold text-xs w-4 flex-shrink-0">{n.num}</span>{n.label}
            </a>
          ))}
          <a href="#quickref" className="mt-2 pt-3 border-t border-slate-200 text-sm font-semibold text-brand-700 hover:text-brand-800 px-3 py-2">
            Quick reference
          </a>
        </nav>

        {/* Content */}
        <main className="min-w-0">

          <SectionBlock id="profiles" num="01" title="Social Profiles"
            dek="The full psycho-social record for a resident — cognitive status, background, family & support system, advance directives, and (new) caseload assignment and annual review tracking.">
            <Frame src={SHOT('social-profiles.png')} alt="Social Profile detail view" caption="A resident's Social Profile, open to the Case Management & Review section" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Search or scroll the resident list on the left, then click a name to open their profile.' },
              { k: 2, text: 'Work down the sections: Cognitive & Functional Status, Personal Background, Family & Support, Psycho-Social Assessment, Advance Directives & Legal.' },
              { k: 3, text: <>In <b className="text-slate-900">Case Management &amp; Review</b>, set the <b className="text-slate-900">Assigned Social Worker</b> and click <b className="text-slate-900">Mark Reviewed Today</b> once you've completed an annual review — this logs today's date and automatically sets the next review due date one year out.</> },
              { k: 4, text: <>A resident with no profile yet shows an amber <b className="text-slate-900">No profile yet</b> badge; residents nearing or past their review date show a due-soon or overdue badge next to their name.</> },
            ]} />
            <Tip>Only staff with the Social Services, Supervisor, Manager, Org Admin, or CEO role appear in the Assigned Social Worker dropdown. That's intentional: it's the same set of roles the Director Dashboard's caseload table counts, so every assignment you make here shows up there.</Tip>
          </SectionBlock>

          <SectionBlock id="mood" num="02" title="Mood & Behavior"
            dek="A quick daily log of resident mood and any behavioral concerns — built for logging in seconds between rounds, not a long-form note.">
            <Frame src={SHOT('mood-behavior.png')} alt="Mood and Behavior log" caption="The Mood & Behavior log, filterable by resident, mood, and shift" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Quick Log Mood</b>, pick the resident, mood, and shift.</> },
              { k: 2, text: <>If anything is off, flag <b className="text-slate-900">Concerns</b> and add a short trigger note (e.g. "Family visit," "Medication change") — these notes feed the Director Dashboard's trigger-keyword chart.</> },
              { k: 3, text: "Use the filter bar to pull up one resident's history before a care conference or physician visit." },
            ]} />
          </SectionBlock>

          <SectionBlock id="notes" num="03" title="Case Notes"
            dek="A general contact log — phone calls, family meetings, hallway check-ins — for anything worth a record that doesn't need its own dedicated form.">
            <ShotsPair>
              <Frame src={SHOT('case-notes-list.png')} alt="Case Notes list" caption="Case Notes list, with follow-up and EMR badges" />
              <Frame src={SHOT('case-notes-modal.png')} alt="New Case Note form" caption="Logging a new contact" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Click New Case Note, choose the resident and contact type (in person, phone, family meeting, email, other).' },
              { k: 2, text: <>Write what was discussed or observed in <b className="text-slate-900">Summary</b>. Add duration if useful for your records.</> },
              { k: 3, text: <>Toggle <b className="text-slate-900">Follow-up needed</b> and set a date if something needs a second touch.</> },
            ]} />
            <Tip><b className="text-slate-900">Also documented in EMR</b> doesn't sync anything automatically — it's a manual flag so your team knows a contact is already charted in PointClickCare or MatrixCare, and this entry is just the quick internal log, not a duplicate of the official chart.</Tip>
          </SectionBlock>

          <SectionBlock id="grievances" num="04" title="Grievances"
            dek="Formal complaint intake through investigation and resolution — filed by or on behalf of a resident, tracked until closed.">
            <Frame src={SHOT('grievances.png')} alt="Grievances list" caption="Open and resolved grievances, with days-open tracking" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: "Click New Grievance to file a complaint — who it's from, what it's about, and the date received." },
              { k: 2, text: 'Move it through Investigating to Resolved (or Withdrawn), logging your findings and resolution along the way.' },
              { k: 3, text: "Grievances open longer than 30 days surface as a compliance alert on the Director Dashboard — don't let one sit untouched." },
            ]} />
          </SectionBlock>

          <SectionBlock id="conferences" num="05" title="Care Conferences"
            dek="Scheduled care-plan meetings with residents and families — the agenda, attendees, and notes all live in one place.">
            <Frame src={SHOT('care-conferences.png')} alt="Care Conferences list" caption="Scheduled and completed care conferences" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Schedule a conference with a date, facilitator, and the resident it’s for.' },
              { k: 2, text: 'After the meeting, log attendees and notes, and mark it complete.' },
            ]} />
          </SectionBlock>

          <SectionBlock id="discharge" num="06" title="Discharge Planning"
            dek="The full discharge workflow — destination, post-acute needs, barriers, family involvement, and the resources you've lined up — from first planning conversation to the day someone leaves.">
            <Frame src={SHOT('discharge-planning.png')} alt="Discharge Planning list" caption="Discharge Planning — status tiles and plan list" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Discharge Plan</b> as soon as discharge becomes a real possibility — status starts at Planning.</> },
              { k: 2, text: <>Check off <b className="text-slate-900">Post-Acute Needs</b> (home health, PT/OT, DME, transportation, etc.) as you identify them, and note what's been arranged and any barriers.</> },
              { k: 3, text: <>Move status to <b className="text-slate-900">Ready</b> when the plan is set, then to <b className="text-slate-900">Discharged</b> on the day itself — that unlocks the Actual Discharge Date field and writes the final Discharge Summary.</> },
            ]} />
            <Tip>Plans due within 14 days show up under <b className="text-slate-900">Due Within 14 Days</b> on this tab and on the Director Dashboard's <b className="text-slate-900">Upcoming Discharges</b> tile — a quick way to see who needs attention this week.</Tip>
          </SectionBlock>

          <SectionBlock id="resources" num="07" title="Resources"
            dek="Your community's own directory of outside agencies — hospice, home health, transportation, legal aid, and more — plus a log of every referral you send out.">
            <ShotsPair>
              <Frame src={SHOT('resources-directory.png')} alt="Resources directory" caption="Directory — build this once, reuse it for every referral" />
              <Frame src={SHOT('resources-referrals.png')} alt="Referral log" caption="Referral Log — tracked from Pending through Completed" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'Build the Directory once: click Add Resource, pick a category, add contact details and the area they serve.' },
              { k: 2, text: <>To refer a resident, click <b className="text-slate-900">Log Referral</b> directly on a resource's card — it pre-fills that agency so you only need to pick the resident and reason.</> },
              { k: 3, text: <>For a one-off agency that isn't in your directory yet, start a referral from scratch and switch to <b className="text-slate-900">Not in directory</b> to type the name in free-text.</> },
              { k: 4, text: 'Update the referral’s status as it moves from Pending → Contacted → Scheduled → Completed (or Declined), and log the outcome.' },
            ]} />
            <Tip>This directory is entirely local to your organization — it's a reference tool for your team, not something that syncs to PointClickCare, MatrixCare, or any outside system. Keep it current directly here.</Tip>
          </SectionBlock>

          <SectionBlock id="dashboard" num="08" title="Director Dashboard" roleNote="Directors & Admins only"
            dek="Facility-wide compliance alerts, trend charts, and a per-worker caseload summary — the view a Social Services Director uses to know where to spend the week's attention.">
            <Frame src={SHOT('director-dashboard.png')} alt="Director Dashboard compliance alerts" caption="Compliance alert banner and the Open Referrals / Upcoming Discharges tiles" />
            <Frame src={SHOT('director-dashboard-caseload.png')} alt="Caseload Summary table" caption="Caseload Summary — assigned residents, open grievances, and workload per worker" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">What's on it</h3>
            <Steps items={[
              { k: '•', text: 'Compliance alerts: residents missing an initial assessment, past their review due date, missing an advance directive on file, or with a grievance open more than 30 days.' },
              { k: '•', text: 'Open Referrals and Upcoming Discharges: live counts pulled from the Resources and Discharge Planning tabs.' },
              { k: '•', text: 'Trend charts: mood distribution, grievances by month, behavioral concern trend, and common trigger keywords.' },
              { k: '•', text: 'Caseload Summary: every Social Services / Supervisor / Manager / Org Admin / CEO, with their assigned residents, open grievances, scheduled conferences, and a workload indicator.' },
            ]} />
          </SectionBlock>

          <section id="quickref" className="scroll-mt-6 py-10">
            <h2 className="font-display font-bold text-slate-900 text-2xl mb-2">Quick reference</h2>
            <p className="text-slate-500 mb-6">Not sure which tab you need? Start here.</p>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-bold uppercase tracking-wide text-slate-400 px-4 py-3">I need to&hellip;</th>
                    <th className="text-left text-xs font-bold uppercase tracking-wide text-slate-400 px-4 py-3">Go to</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Log today’s mood or a behavioral concern', 'Mood & Behavior → Quick Log Mood'],
                    ['Record a phone call or family meeting', 'Case Notes → New Case Note'],
                    ['File a complaint', 'Grievances → New Grievance'],
                    ['Schedule or write up a care conference', 'Care Conferences'],
                    ['Start or update a discharge plan', 'Discharge Planning'],
                    ['Refer a resident to an outside agency', 'Resources → Log Referral'],
                    ['See who’s overdue for their annual review', 'Social Profiles badge, or Director Dashboard'],
                    ['Check my caseload or team workload', 'Director Dashboard → Caseload Summary'],
                  ].map(([task, where], i) => (
                    <tr key={i} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{task}</td>
                      <td className="px-4 py-3.5 text-brand-700 font-semibold whitespace-nowrap">{where}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="text-center text-slate-400 text-xs py-10">ElderLoop Staff Training · Social Services Module</footer>
        </main>
      </div>
    </div>
  )
}
