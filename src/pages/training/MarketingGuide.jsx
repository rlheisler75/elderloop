import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/marketing/${name}`

const NAV = [
  { id: 'pipeline',   num: '01', label: 'Lead Pipeline' },
  { id: 'adding',     num: '02', label: 'Adding a Lead' },
  { id: 'activity',   num: '03', label: 'Activity & Follow-Ups' },
  { id: 'sequences',  num: '04', label: 'Nurture Sequences' },
  { id: 'funnel',     num: '05', label: 'Funnel' },
  { id: 'campaigns',  num: '06', label: 'Campaigns' },
  { id: 'templates',  num: '07', label: 'Templates' },
  { id: 'landing',    num: '08', label: 'Landing Pages' },
  { id: 'sources',    num: '09', label: 'Referral Sources' },
]

export default function MarketingGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Marketing"
        dek="A working guide to the lead pipeline, automated follow-up, campaign tracking, and referral sources behind move-in growth."
        chips={['For: Marketing, Admissions, Executive Directors', 'Where: Sidebar → Marketing', '9 sections']}
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
              { k: 3, text: <>Each row has quick actions on the right: a clock icon to log activity or schedule a follow-up, a lightning bolt to enroll the lead in a nurture sequence, and a pencil to edit the lead.</> },
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
              { k: 4, text: <>If Property Management is set up, pick <b className="text-slate-900">Interested In Specific Unit</b> to point this lead at one exact available unit instead of just a category — it shows up on that unit's card in Property Management too.</> },
              { k: 5, text: <>Set <b className="text-slate-900">Assigned To</b> so the right staff member owns follow-up on this lead.</> },
            ]} />
            <Tip>Referral Source is a dropdown pulled from the Referral Sources tab — add the source there first if it's not in the list yet.</Tip>
          </SectionBlock>

          <SectionBlock id="activity" num="03" title="Activity & Follow-Ups"
            dek="A running history of every call, email, tour, and note for a lead — and a way to schedule the next one so it doesn't get forgotten.">
            <Frame src={SHOT('activity-modal.png')} alt="Activity log modal for a lead" caption="Toggle between logging something that already happened and scheduling something for later" />
            <Frame src={SHOT('followups.png')} alt="Follow-Ups tab" caption="Every scheduled follow-up across all leads, grouped into Overdue, Due Today, and Upcoming" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click the clock icon on a lead's row to open its activity log. Use <b className="text-slate-900">Log Completed Activity</b> for something that already happened — pick a type, add notes, and log the outcome.</> },
              { k: 2, text: <>Switch to <b className="text-slate-900">Schedule Follow-Up</b> to set a date/time for something you still need to do — it won't show as completed until you mark it done.</> },
              { k: 3, text: <>Every scheduled follow-up across every lead shows up on the <b className="text-slate-900">Follow-Ups</b> tab, bucketed into Overdue, Due Today, and Upcoming — click <b className="text-slate-900">Open</b> to jump to that lead's log, or <b className="text-slate-900">Mark Done</b> to close it out right there.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="sequences" num="04" title="Nurture Sequences"
            dek="Automated, multi-step email drips that send themselves — enroll a lead once and a background job checks every 15 minutes for what's due.">
            <Frame src={SHOT('sequences.png')} alt="Sequences tab" caption="Each sequence shows its step count and how many leads are currently enrolled" />
            <Frame src={SHOT('new-sequence-modal.png')} alt="New Sequence form with repeat mode enabled" caption="Repeat mode turns the last step into a recurring check-in instead of a one-time send" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Sequence</b>, name it, and build out steps — each one has a <b className="text-slate-900">Send After (days)</b> delay counted from when the lead enrolls, plus its own subject and body.</> },
              { k: 2, text: <>Check <b className="text-slate-900">Repeat the last step indefinitely</b> and set an interval to turn a sequence into a recurring check-in — useful for a waitlist "still interested?" email that goes out every 30 days instead of stopping after one send.</> },
              { k: 3, text: <>From any lead's row in the Pipeline, click the lightning bolt icon to enroll it in an active sequence, see what it's already enrolled in, or remove it.</> },
              { k: 4, text: <>A lead exits a sequence automatically the moment it moves in, is marked lost or disqualified, or unsubscribes — you never have to manually clean up a sequence for a lead who's no longer prospective.</> },
            ]} />
            <Tip>Sequence steps use the same merge tags as a one-off campaign email — <code>{'{{first_name}}'}</code>, <code>{'{{last_name}}'}</code>, <code>{'{{prospect_first_name}}'}</code>.</Tip>
          </SectionBlock>

          <SectionBlock id="funnel" num="05" title="Funnel"
            dek="The whole pipeline in one chart — every stage from first inquiry to move-in, with the conversion rate between each one.">
            <Frame src={SHOT('funnel.png')} alt="Funnel tab" caption="Lost, Disqualified, and Waitlisted counts sit below the funnel; top campaigns and sources by move-ins sit below that" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Each stage shows the count and percentage of all leads that reached at least that far, plus what percentage of the prior stage carried through — a quick read on where leads are stalling.</> },
              { k: 2, text: <>Because there's no separate stage-history log, a lead's <b className="text-slate-900">current</b> status stands in for the furthest stage it reached — the New Inquiry stage always counts every lead, including ones later marked Lost.</> },
              { k: 3, text: <><b className="text-slate-900">Top Campaigns</b> and <b className="text-slate-900">Top Referral Sources</b> rank by move-ins first, so you can see at a glance what's actually converting, not just generating volume.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="campaigns" num="06" title="Campaigns"
            dek="Track budget, spend, and real performance for open houses, direct mail, digital campaigns, and referral programs — with status you can advance in one click.">
            <Frame src={SHOT('campaigns.png')} alt="Campaigns tab" caption="Leads / Tours / Move-ins sit right below Budget / Spent / Cost per Lead on every card" />
            <Frame src={SHOT('new-campaign-modal.png')} alt="New Campaign form" caption="Name, type, budget, goals, and the copy for the campaign itself" />
            <Frame src={SHOT('email-composer-modal.png')} alt="Send Email modal with segmentation filters" caption="Filter by status or care level before sending — the recipient count and Send button update live" />
            <Frame src={SHOT('email-history-modal.png')} alt="Email History modal" caption="Every blast, expandable down to each recipient's delivery status" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Campaign</b> and give it a name — set a type (Email, Direct Mail, Event, Digital, Social Media, Open House, and more), budget, and lead/tour goals.</> },
              { k: 2, text: <>On each campaign card, click the arrow icon to advance its status — Draft → Active → Paused → Completed — one click at a time. The Leads / Tours / Move-ins row tracks real performance against your goals automatically, and Cost / Lead updates as spend and leads both change.</> },
              { k: 3, text: <>Click the mail icon to send a campaign email — filter recipients by <b className="text-slate-900">status</b> or <b className="text-slate-900">care level interest</b> before sending, optionally start from a saved template, and the recipient count updates live as you adjust filters.</> },
              { k: 4, text: <>Click the history icon (clock with an arrow) to see every email blast sent for that campaign — expand one to see exactly who received it and whether it delivered.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="templates" num="07" title="Templates"
            dek="Save a subject and body once, reuse it across campaigns instead of retyping the same invite every time.">
            <Frame src={SHOT('templates.png')} alt="Templates tab" caption="Templates show up in the Start from a Template dropdown when composing any campaign email" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Template</b>, give it a name (for your own reference — it's not shown to recipients), and write the subject and body.</> },
              { k: 2, text: <>When composing a campaign email, pick it from the <b className="text-slate-900">Start from a Template</b> dropdown — it fills in the subject and body, which you can still edit before sending.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="landing" num="08" title="Landing Pages"
            dek="A public page that captures leads straight into the pipeline, with real view tracking so you know the conversion rate, not just the submission count.">
            <Frame src={SHOT('landing-pages.png')} alt="Landing Pages tab" caption="Views, Leads, and Convert % sit on every published page" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Landing Page</b>, give it a title — the public URL slug fills in automatically from the title but can be edited — and write a subheadline, body copy, and call-to-action text.</> },
              { k: 2, text: <>Link it to a <b className="text-slate-900">Campaign</b> so leads it captures get attributed correctly, and check <b className="text-slate-900">Published</b> when it's ready to go live.</> },
              { k: 3, text: <>Copy the public link with the copy icon, or preview it with the external-link icon. Every real visit increments <b className="text-slate-900">Views</b>, so the Convert % is an honest views-to-leads rate, not just a raw submission count.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="sources" num="09" title="Referral Sources"
            dek="The list of hospitals, physicians, and other partners that feed leads into the pipeline, ranked by how many of those leads actually convert.">
            <Frame src={SHOT('referral-sources.png')} alt="Referral Sources tab" caption="Sorted by lead volume, with Leads / Tours / Move-ins / Convert on every source" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Source</b>, name it, and pick a category — Hospital, Physician, Home Health, Hospice, Family, Web, Senior Advisor, Broker, and more.</> },
              { k: 2, text: <>New sources appear immediately in the Referral Source dropdown on the Add Lead form.</> },
              { k: 3, text: <>Each source card tracks <b className="text-slate-900">Leads</b>, <b className="text-slate-900">Tours</b>, <b className="text-slate-900">Move-ins</b>, and a <b className="text-slate-900">Convert</b> rate, sorted with the highest-volume sources first — the read on which relationships are actually worth the lunch.</> },
              { k: 4, text: <>Click a source's status pill to toggle it between <b className="text-slate-900">Active</b> and <b className="text-slate-900">Inactive</b> — inactive sources drop out of the dropdown but stay attached to any leads that already reference them.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Add a new inquiry', 'Add Lead'],
            ['Log a call, tour, or note for a lead', 'Lead row → clock icon'],
            ['Schedule a future follow-up', 'Lead row → clock icon → Schedule Follow-Up'],
            ['See everything due today or overdue', 'Follow-Ups tab'],
            ['Put a lead on an automated email drip', 'Lead row → lightning bolt icon'],
            ['Build a recurring waitlist check-in', 'Sequences tab → New Sequence → Repeat toggle'],
            ['See where leads are stalling in the pipeline', 'Funnel tab'],
            ['Start a new marketing campaign', 'Campaigns tab → New Campaign'],
            ['Email a filtered slice of a campaign’s leads', 'Campaign card → mail icon'],
            ['Save a reusable email subject/body', 'Templates tab → New Template'],
            ['Publish a public lead-capture page', 'Landing Pages tab → New Landing Page'],
            ['Add a hospital or physician partner', 'Referral Sources tab → Add Source'],
          ]} />

          <GuideFooter label="Marketing Module" />
        </main>
      </div>
    </div>
  )
}
