import { Link } from 'react-router-dom'
import { Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

// Text first; screenshots are added in the screenshot pass (public/training/admin/).
const NAV = [
  { id: 'start',     num: '01', label: 'Before you start' },
  { id: 'settings',  num: '02', label: 'Org Settings' },
  { id: 'lists',     num: '03', label: 'Departments & lists' },
  { id: 'users',     num: '04', label: 'Adding staff' },
  { id: 'templates', num: '05', label: 'Job Roles' },
  { id: 'access',    num: '06', label: "One person's access" },
  { id: 'residents', num: '07', label: 'Residents & families' },
  { id: 'billing',   num: '08', label: 'Billing & add-ons' },
  { id: 'celebrate', num: '09', label: 'Celebrations' },
]

const B = ({ children }) => <b className="text-slate-900">{children}</b>
const H3 = ({ children }) => <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">{children}</h3>
const P = ({ children }) => <p className="text-[15px] text-slate-700 mb-6">{children}</p>
const GuideLink = ({ to, children }) => <Link to={to} className="text-brand-700 font-semibold hover:underline">{children}</Link>

export default function AdminSetupGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Admin Training"
        title="Admin Setup"
        dek="Everything an Org Admin sets up for a community: settings and modules, departments, staff logins, what each role can see and change, residents, billing, and the staff celebration calendar."
        chips={['For: Org Admins, Platform Admins', 'Where: Sidebar → Admin Panel', '10 tabs']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="start" num="01" title="Before you start"
            dek="Who can use the Admin Panel, and the order that makes setup go smoothly.">
            <H3>Who sees what</H3>
            <P>
              <B>Org Admins</B> see every Admin Panel tab. The <B>Administrator</B> (the community's NHA) sees only <B>Billing</B>, unless they've also been made a <B>Platform Admin</B> (Users → edit the Administrator → <B>Also a Platform Admin</B>). Org Admin is the system role that runs ElderLoop. It isn't a rank above the Administrator.
            </P>
            <H3>Recommended order</H3>
            <Steps items={[
              { k: 1, text: <><B>Org Settings</B>: name, logo, regulatory state, which modules are on, approval thresholds.</> },
              { k: 2, text: <><B>Lists &amp; Pick Lists</B>: departments, vehicles, inspection areas, checkpoints, and the other lists your modules use.</> },
              { k: 3, text: <><B>Job Roles</B>: check the default roles (one per department and level), and build any custom ones before you add people.</> },
              { k: 4, text: <><B>Users</B>: add staff with their department and level.</> },
              { k: 5, text: <><B>Residents</B>: import from a spreadsheet, then link family members.</> },
              { k: 6, text: <><B>One person's access</B>: add an extra Job Role, or add or remove a single permission, only where someone needs something different.</> },
            ]} />
            <Tip>For how Job Roles, levels, approvals, and Emergency Edit work, see <GuideLink to="/training/access">Roles &amp; Access</GuideLink>.</Tip>
          </SectionBlock>

          <SectionBlock id="settings" num="02" title="Org Settings"
            dek="The community's details and which modules appear in the sidebar.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Org Settings</B> and click <B>Edit</B>.</> },
              { k: 2, text: <>Set the <B>Organization Name</B>, <B>Phone</B>, <B>Website</B>, and upload a <B>Community Logo</B> (square works best). The logo appears in the sidebar and on printouts.</> },
              { k: 3, text: <>Choose the <B>Regulatory State</B> the community is licensed under. It drives the state-specific citations in Maintenance → Compliance.</> },
              { k: 4, text: <>Under <B>Enabled Modules</B>, click modules on or off. Off modules disappear from everyone's sidebar.</> },
              { k: 5, text: <>Click <B>Save Settings</B>. The sidebar updates right away.</> },
            ]} />
            <H3>Locked modules</H3>
            <P>
              A lock with <B>Upgrade</B> means the module isn't in your plan (see Billing). <B>Needs BAA</B> marks the health modules (Nursing, Social Services, Incident Reports, clinical AI). ElderLoop turns those on once the business associate agreements are signed, so health information is protected from day one.
            </P>
            <H3>Approval thresholds</H3>
            <P>
              On the same tab, set the amounts above which the Administrator approves first: <B>purchase order or vendor job over ($)</B> (default $1,000) and <B>overtime per employee per week over (hours)</B> (default 8). Click <B>Save Thresholds</B>.
            </P>
            <Tip>PointClickCare Facility ID is optional. Fill it in only if the community uses PointClickCare; it enables a Sync Now button when importing residents.</Tip>
          </SectionBlock>

          <SectionBlock id="lists" num="03" title="Departments & lists"
            dek="The pick lists every module draws from. Set them up once; staff choose from them every day.">
            <P>Open <B>Admin Panel → Lists &amp; Pick Lists</B>. Each list has its own tab:</P>
            <Steps items={[
              { k: '•', text: <><B>Departments</B>: the departments staff belong to. ElderLoop starts with the common ones (Nursing, Dietary, Housekeeping, Maintenance, Activities, and more); add any your community uses.</> },
              { k: '•', text: <><B>Vehicles</B>: name, plate, and capacity for Transportation.</> },
              { k: '•', text: <><B>Inspection Areas</B> and <B>Inspect. Checklist</B>: rooms and common areas for Housekeeping inspections, and the items checked in each.</> },
              { k: '•', text: <><B>Security Checkpoints</B>: each checkpoint's location and radius for GPS-verified rounds.</> },
              { k: '•', text: <><B>Certification Types</B>: custom certifications to track, with how many days ahead to warn before they expire.</> },
              { k: '•', text: <><B>Utility Types</B>, <B>IT Categories</B>, <B>Asset Types</B>, <B>Asset Locations</B>: for Meter Readings and IT.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="users" num="04" title="Adding staff"
            dek="Each person gets their own login. Their department and level hand out the matching Job Roles.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Users</B> and click <B>Add User</B>.</> },
              { k: 2, text: <>Enter their name and <B>email</B>. They'll get an email with a link to set their own password, so there's no temporary password to hand out.</> },
              { k: 3, text: <>Choose the <B>Account Type</B>: <B>Staff</B> for almost everyone, <B>Administrator</B> for the NHA, <B>Org Admin</B> for the person who runs ElderLoop. (Resident and Family logins are made from the resident's profile instead.)</> },
              { k: 4, text: <>For Staff, add their <B>department and level</B>: Employee, Supervisor, or Manager. Each one gives them that department's default Job Role. Someone can belong to more than one department (for example a Dietary Manager who also supervises Housekeeping).</> },
              { k: 5, text: <>Click <B>Create User</B>. Edit them later (pencil icon) to add a job title, phones, hire date, or admin-only notes.</> },
            ]} />
            <Tip warn>Department and level matter. Someone with no department has only the Everyone role: the shared pages and their own items. Check every person's department before go-live.</Tip>
            <H3>When someone leaves</H3>
            <P>Click the <B>deactivate</B> icon on their row. Their login stops working, but their history (notes, work orders, time punches) stays. Uncheck <B>Active Account</B> in their edit form to do the same thing. Your plan's staff limit counts active accounts only.</P>
            <P>The <B>2FA</B> column shows who has two-factor sign-in on. See <GuideLink to="/training/two-factor">Two-Factor Sign-In</GuideLink> for resets.</P>
          </SectionBlock>

          <SectionBlock id="templates" num="05" title="Job Roles"
            dek="A Job Role is a set of things someone can do, module by module. People can hold several; the database enforces exactly what they add up to.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Job Roles</B>. Roles are grouped: <B>Everyone</B> (every staff login), <B>Administrator</B> (the NHA), <B>Custom roles</B>, <B>Department roles</B> (one per department and level), and roles <B>carried over</B> from the old Role Templates.</> },
              { k: 2, text: <>Click a role to see its grid: modules down the side, the seven actions across the top (<B>View, Create, Edit, Approve, Delete, Settings, Costs</B>). Click a box to turn it on or off; it saves right away. Hover a box to see what that action allows in that module.</> },
              { k: 3, text: <>Click <B>New Job Role</B> to make your own, for example "Transportation Coordinator" or "Dietary Aide (no costs)". Start empty or from a copy of an existing role. Add people under <B>People with this role</B>.</> },
              { k: 4, text: <>Changing a role changes it for everyone who has it, the next time they sign in or refresh.</> },
            ]} />
            <Tip>Department roles are handed out automatically from each person's department and level, so you rarely need to assign them by hand. View is separate: give View when people should see everyone's records, and leave it off when they only file requests (they always see their own). Org Admins can always do everything; Job Roles don't apply to them.</Tip>
          </SectionBlock>

          <SectionBlock id="access" num="06" title="One person's access"
            dek="Extra roles and one-off changes for a single person, on their Edit User screen.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Users</B> and edit the person. Their Job Roles are listed; ones marked <B>auto</B> come from their department and level or account type.</> },
              { k: 2, text: <>Use <B>Add a Job Role</B> for anything extra. For example, a Social Services Director who also oversees rides gets <B>Transportation Supervisor</B>. Remove a role you added with its ×.</> },
              { k: 3, text: <>Open <B>Effective access</B> to see the grid of what they can do. <B>Blue</B> boxes come from their roles (hover to see which), <B>green</B> are added just for them, <B>red</B> are removed just for them. Click a box to add or remove one permission; click again to go back.</> },
            ]} />
            <Tip>Use one-off changes sparingly. If several people need the same thing, make or change a Job Role instead. That keeps everyone's access easy to read.</Tip>
          </SectionBlock>

          <SectionBlock id="residents" num="07" title="Residents & families"
            dek="Bring residents in from a spreadsheet, then connect their family members.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Lists &amp; Pick Lists → Residents</B> and click <B>Import from CSV/Excel</B>. Download the CSV template if you need one.</> },
              { k: 2, text: <>Drop in a CSV or Excel file (up to 5,000 residents), match your columns to ElderLoop's, and choose what to do with residents who are already in ElderLoop.</> },
              { k: 3, text: <>Review the result. Any rows that couldn't be imported are listed with the reason.</> },
              { k: 4, text: <>Under <B>Family Links</B>, connect family members to their resident. Family Portal logins are granted from the resident's profile in the Directory.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="billing" num="08" title="Billing & add-ons" roleNote="Org Admin & Administrator"
            dek="Your plan, add-ons, and invoices. The Administrator can use this tab too.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Billing</B> to see your plan and status.</> },
              { k: 2, text: <><B>Change Plan</B> to move up or down. Paid plans differ in how many residents and active staff you can have (Starter also has fewer modules). Upgrades are prorated; downgrades take effect at the end of the billing period.</> },
              { k: 3, text: <>Add or remove <B>add-ons</B> on Essential and Plus: the <B>AI Add-on</B> ($99/month) and <B>Budgets Add-on</B> ($79/month). Professional includes both. Budgets is also included for groups of three or more communities.</> },
              { k: 4, text: <>Download past <B>invoices</B> at the bottom of the tab.</> },
            ]} />
            <P>After adding AI, choose which sections use it and which model under <B>Admin Panel → AI Add-on</B>. See <GuideLink to="/training/ai">AI Assist</GuideLink>.</P>
          </SectionBlock>

          <SectionBlock id="celebrate" num="09" title="Celebrations"
            dek="The 'Celebrate Our Staff' calendar: appreciation weeks that briefly change ElderLoop's accent color for everyone who chose it.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Celebrations</B>. Until you customize it, the community uses ElderLoop's standard calendar (National Nurses Week, Skilled Nursing Care Week, CNA Week, Environmental Services Week, and more).</> },
              { k: 2, text: <>Add, edit, pause, or remove celebrations, with a name, emoji, color, and when it happens (fixed dates, or "the 2nd week of May").</> },
              { k: 3, text: <>Staff who pick <B>Celebrate</B> as their accent color in Settings see each celebration's color during its week.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Change the community name or logo', 'Org Settings → Edit'],
            ['Turn a module on or off', 'Org Settings → Edit → Enabled Modules'],
            ['Set PO / overtime approval amounts', 'Org Settings → Approval Thresholds'],
            ['Add a department, vehicle, or checkpoint', 'Lists & Pick Lists'],
            ['Add a staff member', 'Users → Add User'],
            ['Change someone\'s department or level', 'Users → pencil icon'],
            ['Turn off a login for someone who left', 'Users → deactivate icon'],
            ['Change what a role can do', 'Job Roles → click the role → click boxes'],
            ['Make a custom role', 'Job Roles → New Job Role'],
            ['Give one person an extra role', 'Users → edit → Add a Job Role'],
            ['Add or remove one permission for one person', 'Users → edit → Effective access'],
            ['Import residents', 'Lists & Pick Lists → Residents → Import from CSV/Excel'],
            ['Change plan or add AI / Budgets', 'Billing'],
            ['Reset someone\'s two-factor', 'Users → reset icon'],
          ]} />

          <GuideFooter label="Admin Setup" />
        </main>
      </div>
    </div>
  )
}
