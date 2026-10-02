import { Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

// Roles & Access: the five access tiers (communities on access_model 'tiered').
// Keep in step with src/lib/accessMatrix.json and the access tiers design page.

const NAV = [
  { id: 'levels',    num: '01', label: 'The Five Levels' },
  { id: 'modules',   num: '02', label: 'Who Can Do What' },
  { id: 'nha',       num: '03', label: 'The Administrator' },
  { id: 'approvals', num: '04', label: 'Approvals' },
  { id: 'records',   num: '05', label: 'Records Are Never Deleted' },
  { id: 'corporate', num: '06', label: 'Corporate Portal' },
  { id: 'setup',     num: '07', label: 'Setting People Up' },
  { id: 'quickref',  num: '08', label: 'Quick Reference' },
]

const B = ({ children }) => <b className="text-slate-900">{children}</b>

const MODULE_ROWS = [
  ['Work Orders', 'Your jobs + the open queue; claim jobs', 'Whole queue; assign and triage', 'PM schedules, settings, deletes'],
  ['Dietary', 'Log food waste, special requests', 'Diet profiles, seating, physician orders', 'Menus, recipes, food budget'],
  ['Housekeeping', 'Record your own inspections', 'Correct any inspection; bill IL cleaning', 'Areas, checklists, deletes'],
  ['Central Supply', 'Receive, issue, count stock', 'Same as staff', 'Items, vendors, prices, purchase orders'],
  ['Social Services', 'Your caseload + unassigned residents', 'Everyone; assign caseloads', 'Close grievances (with the NHA)'],
  ['Nursing', 'Notes and vitals under your name', 'Correct any note', 'Medication lists (DON)'],
  ['Incidents', 'File and see your own reports', 'See and investigate every report', 'Close: NHA or Org Admin'],
  ['Activities & Chapel', 'Take attendance', 'Run the calendar and services', 'Deletes'],
  ['Transportation', 'Work trips (anyone can book one)', 'Same as staff', 'Delete trips, vehicles'],
  ['Security', 'Rounds, check-ins, reports', 'Guard schedules, review reports', 'Checkpoints'],
  ['IT', 'Work the ticket queue, update assets', 'Same as staff', 'Add assets, licenses and costs'],
  ['Meters', 'Record readings', 'Same as staff', 'Meters and utility rates'],
  ['Property (IL)', 'Units, keys, walkthroughs', 'Same as staff', 'Tenants, leases, rent, notices'],
  ['Marketing', 'Work leads and follow-ups', 'Campaigns, templates, sequences, sources', 'Deletes'],
  ['Scheduling & Time Clock', 'Your shifts and punches', 'Build the schedule; HR/Payroll fix punches', 'Shift templates'],
  ['Announcements', 'Read', 'Post and edit', 'Post and edit'],
]

export default function AccessGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Roles & Access"
        dek="How ElderLoop decides what you can see and change: five levels, from front-line staff to the corporate office, built around how a licensed community actually runs."
        chips={['For: Everyone, especially Administrators and Org Admins', 'Applies to: communities on the new access model', '8 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="levels" num="01" title="The Five Levels"
            dek="Your level comes from your department assignment. Someone can hold different levels in different departments.">
            <Steps items={[
              { k: 1, text: <><B>Employee</B> — does the work: your own jobs, notes, readings, and reports in your department.</> },
              { k: 2, text: <><B>Supervisor</B> — runs the shift: sees the whole department, assigns and corrects work, reviews reports.</> },
              { k: 3, text: <><B>Manager / Director</B> — owns the department: setup, settings, costs, vendors, and deletes.</> },
              { k: 4, text: <><B>Administrator</B> — the Nursing Home Administrator. Sees every department and approves, but doesn't edit department records (see section 03).</> },
              { k: 5, text: <><B>Corporate</B> — the corporate office of a multi-community group. Sees counts across communities, never names (see section 06).</> },
            ]} />
            <Tip>The <B>Org Admin</B> is separate from these levels. It is the system administrator who manages users, modules, and settings. An Administrator can also be given Platform Admin rights.</Tip>
          </SectionBlock>

          <SectionBlock id="modules" num="02" title="Who Can Do What"
            dek="Each level can do everything the level before it can, plus the column shown. If a button isn't there for you, your level doesn't include that action.">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm mb-6">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">Module</th><th className="px-4 py-3">Employee</th><th className="px-4 py-3">Supervisor adds</th><th className="px-4 py-3">Manager adds</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULE_ROWS.map(([m, e, s, mg]) => (
                    <tr key={m} className="border-b border-slate-100 last:border-0 align-top">
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{m}</td>
                      <td className="px-4 py-3 text-slate-600">{e}</td>
                      <td className="px-4 py-3 text-slate-600">{s}</td>
                      <td className="px-4 py-3 text-slate-600">{mg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Tip>Security, Marketing, Property, and Meters only appear in the sidebar for people in those departments. Everyone can still file an IT ticket, book a trip, and submit a work order.</Tip>
          </SectionBlock>

          <SectionBlock id="nha" num="03" title="The Administrator"
            dek="The NHA sees everything and is accountable for everything, but department records are kept by the people who do the work.">
            <Steps items={[
              { k: 1, text: <><B>View everything:</B> every department, every dashboard, the Administrator Dashboard.</> },
              { k: 2, text: <><B>Write directly:</B> incidents and state reporting, announcements and messages, family communication, surveys, grievances, and the staff directory.</> },
              { k: 3, text: <><B>Approve:</B> purchase orders over the threshold, cycle menus, grievance resolution (see section 04).</> },
              { k: 4, text: <><B>Emergency Edit:</B> when a record must be fixed right now and nobody in the department is available, click <B>Emergency Edit</B> in the banner, give a reason (at least 10 characters), and you can edit department records for 24 hours. It's logged and the Org Admins are alerted. It never unlocks settings or users.</> },
            ]} />
            <Tip warn>If you try to change a department record without Emergency Edit, ElderLoop tells you who owns it. Nothing is silently lost.</Tip>
          </SectionBlock>

          <SectionBlock id="approvals" num="04" title="Approvals"
            dek="Some actions need a second person. ElderLoop routes them automatically.">
            <Steps items={[
              { k: 1, text: <><B>Purchase orders</B> over the community's threshold (default $1,000, set by the Org Admin) go to <B>Awaiting approval</B>. The Administrator or Org Admin approves and submits them, or sends them back.</> },
              { k: 2, text: <><B>Cycle menus</B> are built by the Dietary Manager and approved by the Administrator.</> },
              { k: 3, text: <><B>Grievances</B> are resolved by the Social Services Director, the Administrator (the grievance official), or the Org Admin.</> },
              { k: 4, text: <><B>Incidents</B> are closed, and state reports recorded (42 CFR 483.12: 2 or 24 hours initial, 5 working days for results), by the Administrator or Org Admin. The reporting clock on each incident shows what's due.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="records" num="05" title="Records Are Never Deleted"
            dek="Clinical, incident, and financial records are part of the legal record.">
            <Steps items={[
              { k: 1, text: <>If a nursing note, vital, or Social Services case note was wrong, open it and choose <B>Mark entered in error</B>. It stays in the record, crossed out, with who marked it and when.</> },
              { k: 2, text: <>You can edit your own notes. Your Supervisor can correct anyone's notes in the department.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="corporate" num="06" title="Corporate Portal"
            dek="For groups that run several communities.">
            <Steps items={[
              { k: 1, text: <>Corporate users sign in to their own <B>Corporate Portal</B>, not a community.</> },
              { k: 2, text: <>The <B>Portfolio</B> shows one row per community: census, staff, occupancy, work orders, overdue maintenance, incidents and state reports, grievances, certifications, leads, and supply spending. Problems are shown in red.</> },
              { k: 3, text: <>Click a community for a breakdown in counts. <B>No resident, staff, or prospect names</B> ever reach the corporate office.</> },
              { k: 4, text: <><B>Announcements</B> posts one message to every community at once, signed with the corporation's name.</> },
            ]} />
            <Tip>Corporations are set up by ElderLoop. Contact us to link communities or add corporate logins.</Tip>
          </SectionBlock>

          <SectionBlock id="setup" num="07" title="Setting People Up"
            dek="For Org Admins.">
            <Steps items={[
              { k: 1, text: <>In <B>Staff Management</B>, open a person and use <B>Departments &amp; Access Levels</B> to give them a department and a level (Employee, Supervisor, or Manager). Someone can hold different levels in more than one department.</> },
              { k: 2, text: <>Use the <B>Administrator</B> role for the Nursing Home Administrator. Tick <B>Also a Platform Admin</B> only if they should manage users and settings too.</> },
              { k: 3, text: <>Someone with no department sees only their own items and the community-wide pages. If someone says a page is empty, check their department first.</> },
            ]} />
            <Tip>ElderLoop switches a community to this access model when you're ready. Ask us before go-live so we can review department assignments with you.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Fix a record in another department urgently', 'Emergency Edit banner (Administrator)'],
            ['Approve a large purchase order', 'Central Supply → Purchase Orders'],
            ['Correct a wrong clinical note', 'Open the note → Mark entered in error'],
            ['Change someone’s level', 'Staff Management → Departments & Access Levels'],
            ['See all communities at once', 'Corporate Portal'],
          ]} />
          <GuideFooter label="Roles & Access" />
        </main>
      </div>
    </div>
  )
}
