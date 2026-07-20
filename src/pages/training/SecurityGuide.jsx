import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/security/${name}`

const NAV = [
  { id: 'overview',    num: '01', label: 'Overview' },
  { id: 'checkpoints', num: '02', label: 'Checkpoints' },
  { id: 'rounds',      num: '03', label: 'Starting a Guard Round' },
  { id: 'reports',     num: '04', label: 'Security Reports' },
  { id: 'history',     num: '05', label: 'Round History' },
]

export default function SecurityGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Security"
        dek="A working guide to GPS-verified guard rounds, security checkpoints, and incident reporting."
        chips={['For: Security guards, Supervisors, Managers', 'Where: Sidebar → Security', '5 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="overview" num="01" title="Overview"
            dek="A dashboard of checkpoint health and recent rounds — the first place to check whether the building is being covered.">
            <Frame src={SHOT('overview.png')} alt="Security Overview tab" caption="A checkpoint turns red once it's gone 2+ hours without a check-in" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>The stat tiles track total <b className="text-slate-900">Checkpoints</b>, <b className="text-slate-900">Today's Rounds</b>, whether a round is <b className="text-slate-900">Active</b> right now, and how many checkpoints are <b className="text-slate-900">Overdue</b> (no check-in in 2+ hours).</> },
              { k: 2, text: <><b className="text-slate-900">Checkpoint Status</b> on the left shows every checkpoint with when it was last checked and by whom.</> },
              { k: 3, text: <>Click any entry under <b className="text-slate-900">Recent Rounds</b> to open its full detail — every checkpoint, whether it was verified, and the exact time.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="checkpoints" num="02" title="Checkpoints"
            dek="GPS-anchored locations a guard must physically be near to check in — set once by a supervisor, then used on every round.">
            <Frame src={SHOT('checkpoints.png')} alt="Security Checkpoints tab" caption="Each card shows exact coordinates and time since the last check-in" />
            <Frame src={SHOT('add-checkpoint-modal.png')} alt="New Checkpoint form" caption="Use My Current Location captures GPS automatically — no need to look up coordinates" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Only supervisors and admins can add or edit checkpoints — click <b className="text-slate-900">Add Checkpoint</b>, name it, and tap <b className="text-slate-900">Use My Current Location</b> while standing at the spot (or enter latitude/longitude manually).</> },
              { k: 2, text: <>Set the <b className="text-slate-900">Check-in Radius</b> — how close a guard's phone GPS must be to count as a valid check-in, from 25 to 500 feet.</> },
              { k: 3, text: <>Checkpoints are numbered in the order they were added — that's the order they'll appear during a round.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="rounds" num="03" title="Starting a Guard Round"
            dek="A live, full-screen GPS check-in flow — walk to each checkpoint and check in only once you're physically within range.">
            <Frame src={SHOT('guard-round.png')} alt="Guard Round in progress" caption="A checkpoint's Check In button only turns green once you're within its radius" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Start Round</b> — your phone's GPS starts tracking, and the round begins immediately.</> },
              { k: 2, text: <>Walk to each checkpoint. The distance shown updates live; once you're within the checkpoint's radius, its button turns green and reads <b className="text-slate-900">Check In Here</b>.</> },
              { k: 3, text: <>If you check in from too far away, it's logged as a failed check-in — the app tells you exactly how many feet away you are.</> },
              { k: 4, text: <>Tap <b className="text-slate-900">File Report</b> mid-round to log an incident without losing your progress, or <b className="text-slate-900">End Round</b> once you've covered every checkpoint.</> },
            ]} />
            <Tip>Only one round can be active at a time — the header button reads "Round In Progress" and is disabled until the current round ends.</Tip>
          </SectionBlock>

          <SectionBlock id="reports" num="04" title="Security Reports"
            dek="Incident and observation logs — filed during a round or on their own — with priority, status, and supervisor review.">
            <Frame src={SHOT('file-report-modal.png')} alt="Security Report form" caption="Persons Involved and Action Taken capture the details a follow-up will need" />
            <Frame src={SHOT('reports.png')} alt="Security Reports tab" caption="Open reports are counted right in the Reports tab label" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">File Report</b>, pick a type (Suspicious Activity, Trespassing, Theft, Medical, and more) and a priority, then describe what happened.</> },
              { k: 2, text: <>Check <b className="text-slate-900">Police Called</b> or <b className="text-slate-900">Management Notified</b> if either applies — these are tracked separately from status.</> },
              { k: 3, text: <>Supervisors and admins get an extra <b className="text-slate-900">Supervisor Review</b> section when reopening a report — move it through Open → Under Review → Resolved (or Escalated) and leave review notes.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="history" num="05" title="Round History"
            dek="Every round ever run, with guard, date, duration, and status — click into any one for a full per-checkpoint breakdown.">
            <Frame src={SHOT('round-history.png')} alt="Round History tab" caption="Status is Completed only when every checkpoint was verified in range" />
            <Frame src={SHOT('round-detail-modal.png')} alt="Round Detail modal" caption="Shows exactly which checkpoints were verified and which were missed" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click any row to see that round's full checkpoint-by-checkpoint breakdown.</> },
              { k: 2, text: <>A round is marked <b className="text-slate-900">Incomplete</b> if it ended before every checkpoint was verified — useful for spotting coverage gaps.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Set up a new GPS checkpoint', 'Checkpoints tab → Add Checkpoint'],
            ['Start a guard round', 'Start Round (header)'],
            ['Check in at a checkpoint', 'Guard Round → walk into range → Check In Here'],
            ['Log an incident or observation', 'File Report'],
            ['Review and resolve a filed report', 'Reports tab → click the report → Supervisor Review'],
            ['See a past round’s detail', 'Round History → click a row'],
          ]} />

          <GuideFooter label="Security Module" />
        </main>
      </div>
    </div>
  )
}
