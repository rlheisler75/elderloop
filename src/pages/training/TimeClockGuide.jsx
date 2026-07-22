import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/timeclock/${name}`

const NAV = [
  { id: 'my-clock', num: '01', label: 'My Clock' },
  { id: 'team',     num: '02', label: 'Team & Payroll Export' },
  { id: 'settings', num: '03', label: 'Geofence Settings' },
]

export default function TimeClockGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Time Clock"
        dek="A working guide to GPS-verified clock in/out, payroll export, and configuring the facility geofence."
        chips={['For: All staff (Team/Payroll/Settings: Admin)', 'Where: Sidebar → Time Clock', '3 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="my-clock" num="01" title="My Clock"
            dek="Everyone's personal clock in/out screen — GPS-verified against the facility's geofence.">
            <Frame src={SHOT('my-clock.png')} alt="My Clock tab" caption="The button stays disabled until you're within the required radius, showing exactly how far off you are" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Your phone or computer's GPS is checked continuously. Once you're within the configured radius, the status flips to <b className="text-slate-900">On-site</b> and the Clock In button activates.</> },
              { k: 2, text: <>Clock In and Clock Out are the same button — it reads whichever action applies to your current state.</> },
              { k: 3, text: <><b className="text-slate-900">My History</b> is a read-only log of your own punches, with on/off-site flags, distance, and computed shift duration for each pair.</> },
            ]} />
            <Tip warn>There's no manual time-entry override anywhere in this module — accuracy depends entirely on GPS-verified punches. If the geofence requirement is off for your org, remote clock-in is allowed with no location check.</Tip>
          </SectionBlock>

          <SectionBlock id="team" num="02" title="Team & Payroll Export"
            dek="The supervisor's view of everyone's time — who's on shift right now, and a payroll-ready export."
            roleNote="Org Admin only">
            <ShotsPair>
              <Frame src={SHOT('team.png')} alt="Team tab" caption="Live view of everyone currently clocked in, plus all-time hours per employee" />
              <Frame src={SHOT('payroll-export.png')} alt="Payroll Export tab" caption="Overtime is calculated as anything beyond 8 hours in a single shift, not weekly" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <><b className="text-slate-900">Team</b> shows who's currently on shift and a running all-time hours total per employee.</> },
              { k: 2, text: <>On <b className="text-slate-900">Payroll Export</b>, pick a date range (or a quick preset: This week / This month / Last month) and click <b className="text-slate-900">Generate Report</b>.</> },
              { k: 3, text: <>Download either a <b className="text-slate-900">Summary CSV</b> (totals per employee) or a <b className="text-slate-900">Detail CSV</b> (every individual shift) for your payroll system.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="settings" num="03" title="Geofence Settings"
            dek="Set exactly where staff are allowed to clock in from, and how strict that requirement is."
            roleNote="Org Admin only">
            <Frame src={SHOT('settings.png')} alt="Geofence Settings" caption="Drag the pin on the map, or type coordinates directly" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Set the facility name and location — drag the pin on the embedded map, click anywhere on it, or type latitude/longitude directly.</> },
              { k: 2, text: <>Adjust the radius slider anywhere from 100 to 1,640 feet (30–500 meters).</> },
              { k: 3, text: <>Uncheck <b className="text-slate-900">Require on-site GPS to punch</b> to allow remote clock-in for off-site or traveling staff — this applies org-wide, not per-person.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Clock in or out', 'My Clock → Clock In / Clock Out'],
            ['See your own past punches', 'My History tab'],
            ['See who’s clocked in right now', 'Team tab'],
            ['Export hours for payroll', 'Payroll Export tab → Generate Report'],
            ['Move or resize the facility geofence', 'Settings tab'],
            ['Allow remote clock-in', 'Settings tab → uncheck Require on-site GPS to punch'],
          ]} />

          <GuideFooter label="Time Clock Module" />
        </main>
      </div>
    </div>
  )
}
