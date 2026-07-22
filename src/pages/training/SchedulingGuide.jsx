import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/scheduling/${name}`

const NAV = [
  { id: 'calendar', num: '01', label: 'Calendar' },
  { id: 'creating', num: '02', label: 'Scheduling a Shift' },
  { id: 'swaps',    num: '03', label: 'Swap Requests' },
]

export default function SchedulingGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Scheduling"
        dek="A working guide to the shift calendar, scheduling shifts, and handling swap requests."
        chips={['For: All staff (create/edit: Supervisor+)', 'Where: Sidebar → Scheduling', '3 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="calendar" num="01" title="Calendar"
            dek="A full month view — every shift as a colored pill, called-off shifts struck through in red.">
            <ShotsPair>
              <Frame src={SHOT('calendar.png')} alt="Scheduling calendar" caption="Colors match shift templates; gray pills have no matching template" />
              <Frame src={SHOT('day-detail.png')} alt="Day Detail modal" caption="Grouped by department, with status and an OT badge if a shift ran over" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Filter by department, and navigate months with the arrows. A day showing 3+ shifts collapses extras into a "+N more."</> },
              { k: 2, text: <>Click any day to open its full detail. Managers get an <b className="text-slate-900">Update</b> dropdown per shift (Mark Completed, No Show, Called Off); staff viewing their own shift get a <b className="text-slate-900">Call Off</b> button instead.</> },
              { k: 3, text: <>A red "N off" badge on a day means someone called off — worth a glance before it sneaks up on you.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="creating" num="02" title="Scheduling a Shift"
            dek="Managers create shifts one at a time or on a repeating schedule, with live overlap and overtime warnings."
            roleNote="Supervisor+">
            <Frame src={SHOT('schedule-shift-modal.png')} alt="Schedule Shift form" caption="Quick Fill buttons pull start/end/department straight from a saved Template" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Pick the staff member (filtered by department), date, and start/end time. Shift hours calculate live as you type.</> },
              { k: 2, text: <>Set <b className="text-slate-900">Repeat</b> to Daily, Weekly, or Every 2 Weeks with an end date to generate a run of shifts in one save — up to 90 days out if you don't set one.</> },
              { k: 3, text: <>An amber warning appears if the staff member already has an overlapping shift that day, and an orange one if this shift pushes them over 40 hours for the week — both require an explicit confirm to save anyway.</> },
              { k: 4, text: <>Manage reusable presets under the <b className="text-slate-900">Templates</b> button (name, department, time, color) — these power the Quick Fill buttons and the calendar's color-coding.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="swaps" num="03" title="Swap Requests"
            dek="Staff-initiated shift swaps, with a 3-step tracker: Requested → Accepted → Manager Approved.">
            <Frame src={SHOT('swap-requests.png')} alt="Swap Requests tab" caption="A badge on the tab shows requests waiting on you specifically" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Any staff member can click <b className="text-slate-900">Request Swap</b>, choose one of their own upcoming shifts, then either leave it open for anyone to pick up or target a specific coworker.</> },
              { k: 2, text: <>The targeted coworker gets Accept/Decline buttons.</> },
              { k: 3, text: <>Once accepted, a manager sees Approve/Reject — approving actually swaps the shift assignment between the two staff members.</> },
            ]} />
            <Tip>Nothing changes on the calendar until a manager approves — an accepted-but-unapproved swap is still just a request.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Schedule a new shift', 'Schedule Shift (header)'],
            ['Call off your own shift', 'Calendar → click the day → Call Off'],
            ['Mark a shift completed or no-show', 'Calendar → click the day → Update dropdown'],
            ['Set up a recurring shift', 'Schedule Shift → Repeat'],
            ['Request to swap a shift', 'Swap Requests tab → Request Swap'],
            ['Approve a shift swap', 'Swap Requests tab → Approve (after coworker accepts)'],
          ]} />

          <GuideFooter label="Scheduling Module" />
        </main>
      </div>
    </div>
  )
}
