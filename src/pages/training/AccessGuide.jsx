import { Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

// Roles & Access: Job Roles (module x action, per community) and the default roles
// that department & level hand out. Keep the default table in step with
// job_role_default_permissions() (20261023_job_roles_seed.sql) and src/lib/permissions.js.

const NAV = [
  { id: 'jobroles',  num: '01', label: 'Job Roles' },
  { id: 'levels',    num: '02', label: 'Levels & Default Roles' },
  { id: 'modules',   num: '03', label: 'What the Defaults Allow' },
  { id: 'nha',       num: '04', label: 'The Administrator' },
  { id: 'approvals', num: '05', label: 'Approvals' },
  { id: 'records',   num: '06', label: 'Records Are Never Deleted' },
  { id: 'corporate', num: '07', label: 'Corporate Portal' },
  { id: 'setup',     num: '08', label: 'Setting People Up' },
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
  ['Transportation', 'Schedule, drive, and log trips (others view only; Nursing and IL residents request rides)', 'Same as staff', 'Delete trips, vehicles'],
  ['Security', 'Rounds, check-ins, reports', 'Guard schedules, review reports', 'Checkpoints'],
  ['IT', 'Work the ticket queue, update assets', 'Same as staff', 'Add assets, licenses and costs'],
  ['Meters', 'Record readings', 'Same as staff', 'Meters and utility rates'],
  ['Property (IL)', 'Units, keys, walkthroughs', 'Same as staff', 'Tenants, leases, rent, notices'],
  ['Marketing', 'Work leads and follow-ups', 'Campaigns, templates, sequences, sources', 'Deletes'],
  ['Scheduling & Time Clock', "Your departments' schedules; your punches", "Build your departments' schedule; HR/Payroll fix punches", 'Shift templates'],
  ['Announcements', 'Read', 'Post and edit', 'Post and edit'],
]

export default function AccessGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Roles & Access"
        dek="How ElderLoop decides what you can see and change: Job Roles that list, module by module, what someone may do, with sensible defaults from each person's department and level."
        chips={['For: Everyone, especially Administrators and Org Admins', 'Set up in: Admin Panel → Job Roles and Users', '8 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="jobroles" num="01" title="Job Roles"
            dek="A Job Role is a list of what someone may do, module by module. A person can hold several, and the database enforces exactly what they add up to.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Seven actions in every module</h3>
            <Steps items={[
              { k: '•', text: <><B>View</B> see the module's records. <B>Create</B> add new ones. <B>Edit</B> change them.</> },
              { k: '•', text: <><B>Approve</B> sign off (for example, assign and triage work orders, or close grievances). <B>Delete</B> remove records that allow it.</> },
              { k: '•', text: <><B>Settings</B> set the module up (lists, areas, menus, vehicles). <B>Costs</B> see prices, costs, and the budget.</> },
            ]} />
            <p className="text-[15px] text-slate-700 mb-6">Each action means something specific in each module; hover a box on the Job Roles page to see it. View is separate from Create: someone who can only file a work order sees just their own, not everyone's.</p>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Where someone's roles come from</h3>
            <Steps items={[
              { k: '•', text: <><B>Everyone</B>: every staff login can file work orders, IT tickets, and incidents and read the shared pages.</> },
              { k: '•', text: <><B>Department roles</B>, given automatically by department and level, for example <B>Nursing Employee</B> or <B>Transportation Supervisor</B>. Someone in two departments gets both.</> },
              { k: '•', text: <><B>Any other role</B> the Org Admin adds, such as a custom "Transportation Coordinator".</> },
              { k: '•', text: <><B>One-off changes</B> for a single person: add or remove one permission.</> },
            ]} />
            <Tip>If a button isn't there for you, none of your Job Roles includes that action. A <B>View only</B> bar at the top of a page means you can see that module but not change it. Ask your Org Admin.</Tip>
          </SectionBlock>

          <SectionBlock id="levels" num="02" title="Levels & Default Roles"
            dek="Department and level still matter: they hand out the default role. Someone can hold different levels in different departments.">
            <Steps items={[
              { k: 1, text: <><B>Employee</B> — does the work: your own jobs, notes, readings, and reports in your department.</> },
              { k: 2, text: <><B>Supervisor</B> — runs the shift: sees the whole department, assigns and corrects work, reviews reports.</> },
              { k: 3, text: <><B>Manager / Director</B> — owns the department: setup, settings, costs, vendors, and deletes.</> },
              { k: 4, text: <><B>Administrator</B> — the Nursing Home Administrator. Sees every department and approves, but doesn't edit department records (see section 04).</> },
              { k: 5, text: <><B>Corporate</B> — the corporate office of a multi-community group. Sees counts across communities, never names (see section 07).</> },
            ]} />
            <Tip>The <B>Org Admin</B> is separate from these levels. It is the system administrator who manages users, modules, and settings. An Administrator can also be given Platform Admin rights.</Tip>
          </SectionBlock>

          <SectionBlock id="modules" num="03" title="What the Defaults Allow"
            dek="What each department's default roles include. Each level can do everything the level before it can, plus the column shown. An Org Admin can change any of it on the Job Roles page.">
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
            <Tip>Security, Marketing, Property, and Meters only appear for people whose roles include them. Everyone can still file an IT ticket and submit a work order. Transportation trips are view only outside the Transportation department; Nursing staff and IL residents send ride requests instead.</Tip>
          </SectionBlock>

          <SectionBlock id="nha" num="04" title="The Administrator"
            dek="The NHA sees everything and is accountable for everything, but department records are kept by the people who do the work.">
            <Steps items={[
              { k: 1, text: <><B>View everything:</B> every department, every dashboard, the Administrator Dashboard.</> },
              { k: 2, text: <><B>Write directly:</B> incidents and state reporting, announcements and messages, family communication, surveys, grievances, and the staff directory.</> },
              { k: 3, text: <><B>Approve:</B> purchase orders over the threshold, cycle menus, grievance resolution (see section 05).</> },
              { k: 4, text: <><B>Emergency Edit:</B> when a record must be fixed right now and nobody in the department is available, click <B>Emergency Edit</B> in the banner, give a reason (at least 10 characters), and you can edit department records for 24 hours. It's logged and the Org Admins are alerted. It never unlocks settings or users.</> },
            ]} />
            <Tip warn>If you try to change a department record without Emergency Edit, ElderLoop tells you who owns it. Nothing is silently lost.</Tip>
          </SectionBlock>

          <SectionBlock id="approvals" num="05" title="Approvals"
            dek="Some actions need a second person. ElderLoop routes them automatically.">
            <Steps items={[
              { k: 1, text: <><B>Purchase orders</B> over the community's threshold (default $1,000, set by the Org Admin) go to <B>Awaiting approval</B>. The Administrator or Org Admin approves and submits them, or sends them back.</> },
              { k: 2, text: <><B>Cycle menus</B> are built by the Dietary Manager and approved by the Administrator.</> },
              { k: 3, text: <><B>Grievances</B> are resolved by the Social Services Director, the Administrator (the grievance official), or the Org Admin.</> },
              { k: 4, text: <><B>Incidents</B> are closed, and state reports recorded (42 CFR 483.12: 2 or 24 hours initial, 5 working days for results), by the Administrator or Org Admin. The reporting clock on each incident shows what's due.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="records" num="06" title="Records Are Never Deleted"
            dek="Clinical, incident, and financial records are part of the legal record.">
            <Steps items={[
              { k: 1, text: <>If a nursing note, vital, or Social Services case note was wrong, open it and choose <B>Mark entered in error</B>. It stays in the record, crossed out, with who marked it and when.</> },
              { k: 2, text: <>You can edit your own notes. Your Supervisor can correct anyone's notes in the department.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="corporate" num="07" title="Corporate Portal"
            dek="For groups that run several communities.">
            <Steps items={[
              { k: 1, text: <>Corporate users sign in to their own <B>Corporate Portal</B>, not a community.</> },
              { k: 2, text: <>The <B>Portfolio</B> shows one row per community: census, staff, occupancy, work orders, overdue maintenance, incidents and state reports, grievances, certifications, leads, and supply spending. Problems are shown in red.</> },
              { k: 3, text: <>Click a community for a breakdown in counts. <B>No resident, staff, or prospect names</B> ever reach the corporate office.</> },
              { k: 4, text: <><B>Announcements</B> posts one message to every community at once, signed with the corporation's name.</> },
            ]} />
            <Tip>Corporations are set up by ElderLoop. Contact us to link communities or add corporate logins.</Tip>
          </SectionBlock>

          <SectionBlock id="setup" num="08" title="Setting People Up"
            dek="For Org Admins.">
            <Steps items={[
              { k: 1, text: <>In <B>Admin Panel → Users</B>, edit the person and add each <B>department &amp; level</B> they work in (Employee, Supervisor, or Manager). That gives them the matching Department roles automatically. Someone can be in several departments.</> },
              { k: 2, text: <>Under <B>Job Roles</B> on the same screen, add any extra role they need. For example, a Social Services Director who also oversees rides gets <B>Transportation Supervisor</B>.</> },
              { k: 3, text: <>Open <B>Effective access</B> to see exactly what they can do and where each permission comes from. Click a box to add or remove one permission for just this person.</> },
              { k: 4, text: <>To change what a whole group can do, edit the role in <B>Admin Panel → Job Roles</B>. It applies to everyone who has it. Make a custom role with <B>New Job Role</B>, or <B>Copy</B> an existing one.</> },
              { k: 5, text: <>Use the <B>Administrator</B> account type for the Nursing Home Administrator. Tick <B>Also a Platform Admin</B> only if they should manage users and settings too.</> },
            ]} />
            <Tip>Someone with only the Everyone role sees just the shared pages and their own items. If someone says a page is empty, check their departments and Job Roles first.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Give someone a department and level', 'Admin Panel → Users → edit → department & level'],
            ['Give someone an extra role', 'Admin Panel → Users → edit → Job Roles → Add'],
            ['Add or remove one permission for one person', 'Edit User → Effective access → click a box'],
            ['Change what a whole role can do', 'Admin Panel → Job Roles'],
            ['Fix a record in another department urgently', 'Emergency Edit banner (Administrator)'],
            ['Approve a large purchase order', 'Central Supply → Purchase Orders'],
            ['Correct a wrong clinical note', 'Open the note → Mark entered in error'],
            ['See all communities at once', 'Corporate Portal'],
          ]} />
          <GuideFooter label="Roles & Access" />
        </main>
      </div>
    </div>
  )
}
