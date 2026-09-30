import { Frame, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const NAV = [
  { id: 'overview', num: '01', label: 'What AI Assist Does' },
  { id: 'using',    num: '02', label: 'Using a Suggestion' },
  { id: 'settings', num: '03', label: 'Admin Settings' },
  { id: 'privacy',  num: '04', label: 'Privacy & HIPAA' },
]

// Mirrors the features wired to the ai-assist Edge Function — update together
const FEATURES = [
  { module: 'Maintenance',     where: 'New Work Order',                   what: 'Suggests category, priority (with a reason), and a technician-ready description.', guide: '/training/maintenance#ai' },
  { module: 'Marketing',       where: 'Send Email · New Template',        what: 'Writes or polishes a campaign email from a one-line brief, with merge tags and placeholders.', guide: '/training/marketing#ai' },
  { module: 'Communication',   where: 'New Message · New Announcement',   what: 'Writes, improves, or translates messages; keeps SMS under 160 characters.', guide: '/training/communication#ai' },
  { module: 'Social Services', where: 'Case Notes · Care Conferences · Goals', what: 'DAP case notes, organized conference notes, and care-plan goal ideas from a resident’s records.', guide: '/training/social-services#ai', clinical: true },
]

export default function AiGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="AI Assist"
        dek="The AI Add-on puts a writing and triage assistant inside the forms your team already uses. It drafts; your staff decide. This guide covers what it does, how to use it well, and how administrators control it."
        chips={['For: All staff · Admins for settings', 'Where: Look for the ✨ buttons in each module', 'AI Add-on']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="overview" num="01" title="What AI Assist Does"
            dek="AI Assist shows up as a sparkle (✨) button or a “Write with AI” panel on specific forms. Each one handles a single, well-defined job and hands you a suggestion to review.">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm mb-6">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Module', 'Where', 'What it does'].map(h => (
                      <th key={h} className="text-left text-xs font-bold uppercase tracking-wide text-slate-400 px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map(f => (
                    <tr key={f.module} className="border-b border-slate-100 last:border-0 align-top">
                      <td className="px-4 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                        <a href={f.guide} className="text-brand-700 hover:underline">{f.module}</a>
                        {f.clinical && <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700 mt-1">Clinical</div>}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{f.where}</td>
                      <td className="px-4 py-3.5 text-slate-600">{f.what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Tip>Each module's own training guide has a step-by-step <b className="text-slate-900">AI Assist</b> section — click a module name above to jump straight to it.</Tip>
          </SectionBlock>

          <SectionBlock id="using" num="02" title="Using a Suggestion"
            dek="Every AI feature works the same way: you give it something to work from, it shows a suggestion, and nothing changes until you choose to use it.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Give it something to work from — a rough title and description, your shorthand notes, or a one-line brief. The more specific you are, the better the result.</> },
              { k: 2, text: <>Click the AI button. Suggestions usually take 3–10 seconds.</> },
              { k: 3, text: <>Read the suggestion. Anything the AI needed but didn't have — a time, a phone number, a name — appears as a <b className="text-slate-900">[BRACKETED]</b> placeholder for you to fill in.</> },
              { k: 4, text: <>Click <b className="text-slate-900">Use this</b> (the exact label varies by form) to fill in the fields. Changed your mind? <b className="text-slate-900">Undo</b> puts back exactly what you had.</> },
              { k: 5, text: 'Edit anything you like, then save or send as usual. The AI never saves, sends, or posts anything on its own.' },
            ]} />
            <Tip>The AI is instructed to use only the facts you gave it and never to invent names, dates, room numbers, diagnoses, or plans. If your input is vague, expect a short, careful suggestion rather than a confident guess.</Tip>
            <div className="mt-4" />
            <Tip warn>You're responsible for anything you save or send. Treat AI output like a draft from a new coworker: usually helpful, occasionally wrong — always read it first. If the AI can't help right now, you'll see a short message and your text will be left exactly as it was.</Tip>
          </SectionBlock>

          <SectionBlock id="settings" num="03" title="Admin Settings" roleNote="Org Admins & Administrators"
            dek="Control AI per section of the app — turn it on or off and choose the model — and see this month's usage and estimated cost.">
            <Frame src="/training/ai/ai-settings.png" alt="Admin Panel AI Add-on settings" caption="One card per section — on/off switch, model choice, and this month's suggestions and estimated cost" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Go to <b className="text-slate-900">Admin Panel → AI Add-on</b>. Each section — Maintenance, Social Services, Marketing, Communication — has its own card.</> },
              { k: 2, text: <>Use the switch to turn AI on or off for that section. Turned off, its AI buttons disappear from the forms for everyone in your community.</> },
              { k: 3, text: <>Pick a model per section: <b className="text-slate-900">Haiku 4.5</b> (fastest, lowest cost — the default), <b className="text-slate-900">Sonnet 5</b> (balanced, about 2× Haiku), or <b className="text-slate-900">Opus 5</b> (highest quality, about 5× Haiku). Changes save automatically.</> },
              { k: 4, text: <>Each card shows this month's number of suggestions and estimated cost, with a month-to-date total at the bottom.</> },
            ]} />
            <Tip>Haiku handles most day-to-day tasks well — sorting work orders, drafting announcements. Consider Sonnet or Opus for sections where writing quality matters most, like clinical documentation or marketing emails, and compare the cost on this page after a few weeks.</Tip>
            <div className="mt-4" />
            <Tip warn>If the page says the AI Add-on isn't active for your community, an Org Admin or Administrator can add it in <b className="text-slate-900">Admin Panel → Billing → AI Add-on</b> ($99/month on the Essential and Plus plans, included with Professional; the first partial month is prorated). Removing it there turns AI off right away and credits unused time on your next invoice. Each community is limited to 200 AI suggestions per 24 hours plus a monthly AI allowance — the meter at the top of Admin Panel → AI Add-on shows how much is used, and it resets on the 1st. Haiku 4.5 uses the least allowance per suggestion.</Tip>
          </SectionBlock>

          <SectionBlock id="privacy" num="04" title="Privacy & HIPAA"
            dek="What is and isn't sent to the AI, and why Social Services AI needs a separate approval.">
            <Steps items={[
              { k: '✓', text: <><b className="text-slate-900">Resident and recipient names are never sent.</b> Clinical features refer to “the resident”; messaging features send only the audience type (e.g. “all residents”), not who's on the list.</> },
              { k: '✓', text: <><b className="text-slate-900">Marketing sends no lead data</b> — only your brief, the filters you picked, and your community's name and city.</> },
              { k: '✓', text: <><b className="text-slate-900">Only the text on the form is sent</b>, plus, for goal suggestions, a limited set of that resident's Social Services records (interests, strengths, recent notes and mood logs — never guardian names or phone numbers).</> },
              { k: '✓', text: <><b className="text-slate-900">Usage is logged for billing</b> as counts and token totals only — the text you typed and the AI's reply are not stored by the AI Add-on.</> },
            ]} />
            <Tip warn>Social Services AI works with resident health information, so ElderLoop enables it for a community only once the required HIPAA agreements are in place. Until then, the Social Services card in Admin Panel → AI Add-on shows <b className="text-slate-900">“Requires HIPAA approval”</b> and the Social Services AI buttons don't appear.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Turn AI on or off for a section', 'Admin Panel → AI Add-on → section switch'],
            ['Change which AI model a section uses', 'Admin Panel → AI Add-on → Model'],
            ['See how much AI we’ve used this month', 'Admin Panel → AI Add-on'],
            ['Let AI triage a work order', 'Maintenance → New Work Order'],
            ['Have AI write a marketing email', 'Marketing → Send Email → Write with AI'],
            ['Write, improve, or translate an announcement', 'Communication → Write with AI'],
            ['Polish a case note or conference notes', 'Social Services → Case Notes / Care Conferences'],
            ['Undo an AI suggestion I applied', 'Click Undo right below the AI panel'],
          ]} />

          <GuideFooter label="AI Assist" />
        </main>
      </div>
    </div>
  )
}
