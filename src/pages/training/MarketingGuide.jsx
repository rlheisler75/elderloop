import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/marketing/${name}`

const NAV = [
  { id: 'pipeline',   num: '01', label: 'Lead Pipeline' },
  { id: 'adding',     num: '02', label: 'Adding a Lead' },
  { id: 'activity',   num: '03', label: 'Logging Activity' },
  { id: 'campaigns',  num: '04', label: 'Campaigns' },
  { id: 'sources',    num: '05', label: 'Referral Sources' },
]

export default function MarketingGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Marketing"
        dek="A working guide to the lead pipeline, campaign tracking, and referral sources behind move-in growth."
        chips={['For: Marketing, Admissions, Executive Directors', 'Where: Sidebar → Marketing', '5 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="pipeline" num="01" title="Lead Pipeline"
            dek="Every inquiry in one table, with the stat tiles above tracking totals, active leads, tours, and move-ins at a glance.">
            <Frame src={SHOT('lead-pipeline.png')} alt="Marketing Lead Pipeline tab" caption="Search, filter by status, and see contact, care interest, and assignment in one row" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>The stat tiles track <b className="text-slate-900">Total Leads</b>, <b className="text-slate-900">Active</b> (everyone still in the pipeline — not lost, disqualified, or moved in), <b className="text-slate-900">Tours</b>, and <b className="text-slate-900">Move-ins</b>.</> },
              { k: 2, text: <>Use the search box or the status dropdown to narrow the list — statuses run from <b className="text-slate-900">New</b> through <b className="text-slate-900">Tour Scheduled</b>, <b className="text-slate-900">Deposit Paid</b>, and <b className="text-slate-900">Moved In</b>, plus <b className="text-slate-900">Lost</b> and <b className="text-slate-900">Disqualified</b>.</> },
              { k: 3, text: <>Each row has quick actions on the right: a clock icon to log an activity, a pencil to edit the lead, and a trash icon to delete it.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="adding" num="02" title="Adding a Lead"
            dek="Capture who's asking, who they're asking for, and where the inquiry came from — all on one form.">
            <Frame src={SHOT('add-lead-modal.png')} alt="Add Lead form" caption="Inquiry type, care level interest, budget, and referral source all live on the same form" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Lead</b> and fill in the contact's name — that's the only required field. Everything else can be filled in as you learn it.</> },
              { k: 2, text: <>Set <b className="text-slate-900">Inquiry Type</b> if the caller is asking on behalf of someone else (a parent, spouse, or sibling) — a Prospect Name field appears so you can track both people separately.</> },
              { k: 3, text: <>Tag <b className="text-slate-900">Care Level Interest</b> (Independent, Assisted, Memory Care, Skilled Nursing, Rehab) — you can select more than one — and pick a <b className="text-slate-900">Referral Source</b> if one applies.</> },
              { k: 4, text: <>Set <b className="text-slate-900">Assigned To</b> so the right staff member owns follow-up on this lead.</> },
            ]} />
            <Tip>Referral Source is a dropdown pulled from the Referral Sources tab — add the source there first if it's not in the list yet.</Tip>
          </SectionBlock>

          <SectionBlock id="activity" num="03" title="Logging Activity"
            dek="A running history of every call, email, tour, and note for a lead, visible to anyone who picks up the follow-up.">
            <Frame src={SHOT('activity-modal.png')} alt="Activity log modal for a lead" caption="Each entry records type, subject, notes, and outcome" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click the clock icon on a lead's row to open its activity log.</> },
              { k: 2, text: <>Pick an activity type (Call, Email, Text, Tour, Application, Note, and more), add a subject and any notes, and log the outcome — like "Left voicemail, call back Friday."</> },
              { k: 3, text: <>Click <b className="text-slate-900">Log Activity</b> to save it. Past entries stack below, newest first, each showing who logged it.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="campaigns" num="04" title="Campaigns"
            dek="Track budget, spend, and lead goals for open houses, direct mail, digital campaigns, and referral programs — with status you can advance in one click.">
            <Frame src={SHOT('campaigns.png')} alt="Campaigns tab" caption="Budget-used bar turns amber past 70% and red past 90%" />
            <Frame src={SHOT('new-campaign-modal.png')} alt="New Campaign form" caption="Name, type, budget, goals, and the copy for the campaign itself" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Campaign</b> and give it a name — set a type (Email, Direct Mail, Event, Digital, Social Media, Open House, and more), budget, and lead/tour goals.</> },
              { k: 2, text: <>Fill in <b className="text-slate-900">Headline</b>, <b className="text-slate-900">Call to Action</b>, and <b className="text-slate-900">Body Copy</b> if you want the campaign's messaging recorded alongside its performance.</> },
              { k: 3, text: <>On each campaign card, click the arrow icon to advance its status — Draft → Active → Paused → Completed — one click at a time.</> },
              { k: 4, text: <>Track <b className="text-slate-900">Actual Spend</b> against budget as the campaign runs — the progress bar on the card updates automatically.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="sources" num="05" title="Referral Sources"
            dek="The list of hospitals, physicians, and other partners that feed leads into the pipeline — kept separate from campaigns since referrals are ongoing relationships, not time-boxed efforts.">
            <Frame src={SHOT('referral-sources.png')} alt="Referral Sources tab" caption="Toggle a source Active or Inactive without deleting its history" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Source</b>, name it, and pick a category — Hospital, Physician, Home Health, Hospice, Family, Web, Senior Advisor, Broker, and more.</> },
              { k: 2, text: <>New sources appear immediately in the Referral Source dropdown on the Add Lead form.</> },
              { k: 3, text: <>Click a source's status pill to toggle it between <b className="text-slate-900">Active</b> and <b className="text-slate-900">Inactive</b> — inactive sources drop out of the dropdown but stay attached to any leads that already reference them.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Add a new inquiry', 'Add Lead'],
            ['Log a call, tour, or note for a lead', 'Lead row → clock icon'],
            ['Change a lead’s status', 'Lead row → edit icon → Status'],
            ['Start a new marketing campaign', 'Campaigns tab → New Campaign'],
            ['Advance a campaign’s status', 'Campaign card → arrow icon'],
            ['Add a hospital or physician partner', 'Referral Sources tab → Add Source'],
          ]} />

          <GuideFooter label="Marketing Module" />
        </main>
      </div>
    </div>
  )
}
