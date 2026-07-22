import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/incidents/${name}`

const NAV = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'filing',   num: '02', label: 'Filing a Report' },
  { id: 'review',   num: '03', label: 'Manager Review' },
]

export default function IncidentsGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Incident Reports"
        dek="A working guide to filing, tracking, and reviewing incident reports — from a fall to a medication error."
        chips={['For: All staff (family/resident cannot file)', 'Where: Sidebar → Incident Reports', '3 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="overview" num="01" title="Overview"
            dek="A filterable list of every incident, with a colored severity stripe and status pill on each card.">
            <Frame src={SHOT('overview.png')} alt="Incident Reports list" caption="Search by resident, location, or description, or filter by status and type" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Supervisors and above see stat tiles for <b className="text-slate-900">Open/In Review</b>, <b className="text-slate-900">This Month</b>, <b className="text-slate-900">Follow-Up Needed</b>, and <b className="text-slate-900">Critical Open</b> counts.</> },
              { k: 2, text: <>Staff only ever see their own filed reports; supervisors and above see every report for the community — this is enforced at the database level, not just hidden in the UI.</> },
              { k: 3, text: <>Click any card to open it — editable if it's yours and still a Draft, view-only otherwise.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="filing" num="02" title="Filing a Report"
            dek="One form covers all 11 incident types, from a fall to an elopement.">
            <Frame src={SHOT('file-report-modal.png')} alt="File Incident Report form" caption="Description is the only field that's truly required — fill in what you know" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">File Incident Report</b>, pick a Type (Fall, Injury, Medication Error, Behavioral, Property Damage, Elopement, Choking, Skin/Wound, Altercation, Visitor Incident, Other) and Severity (Minor, Moderate, Serious, Critical).</> },
              { k: 2, text: <>Search for the resident by name — Room/Unit auto-fills — or leave it as N/A for a visitor or non-resident incident.</> },
              { k: 3, text: <>Check off any that apply: <b className="text-slate-900">911 Called</b>, <b className="text-slate-900">Doctor Notified</b>, <b className="text-slate-900">Family Notified</b>, <b className="text-slate-900">Supervisor Notified</b> — these are tracked separately from the narrative fields.</> },
              { k: 4, text: <>Toggle <b className="text-slate-900">Follow-Up Required</b> if something needs to happen later, which reveals a due date and notes field.</> },
              { k: 5, text: <><b className="text-slate-900">Save Draft</b> keeps it editable and private to you; <b className="text-slate-900">Submit Report</b> locks it for your editing and sends it to the review queue.</> },
            ]} />
            <Tip warn>Once submitted, a staff-filed report locks — you can't go back and edit it. Use Save Draft if you're not sure you've captured everything yet.</Tip>
          </SectionBlock>

          <SectionBlock id="review" num="03" title="Manager Review"
            dek="Managers and above get an extra section on every report to move it through the review workflow."
            roleNote="Manager+">
            <Frame src={SHOT('report-detail.png')} alt="Incident report detail" caption="Managers can edit and review any report at any status" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Status moves linearly: <b className="text-slate-900">Draft → Submitted → Under Review → Closed</b>.</> },
              { k: 2, text: <>Moving a report to Under Review or Closed automatically stamps who reviewed it and when.</> },
              { k: 3, text: <>Leave <b className="text-slate-900">Review Notes</b> for the record — staff who filed the report can see these, even though they can't edit their own submitted report anymore.</> },
              { k: 4, text: <>Print a formatted, signature-ready copy of any report for physical filing or a survey binder.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['File a new incident report', 'File Incident Report'],
            ['Save without submitting yet', 'Save Draft (in the report form)'],
            ['Move a report through review', 'Open the report → Manager Review section'],
            ['See only critical, still-open reports', 'Critical Open stat tile'],
            ['Print a report for the record', 'Open the report → print icon'],
          ]} />

          <GuideFooter label="Incident Reports Module" />
        </main>
      </div>
    </div>
  )
}
