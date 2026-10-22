import { Link } from 'react-router-dom'
import { Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

// Text first; screenshots are added in the screenshot pass (public/training/admin/).
const NAV = [
  { id: 'start',     num: '01', label: 'Before you start' },
  { id: 'settings',  num: '02', label: 'Org Settings' },
  { id: 'lists',     num: '03', label: 'Departments & lists' },
  { id: 'users',     num: '04', label: 'Adding staff' },
  { id: 'templates', num: '05', label: 'Role Templates' },
  { id: 'access',    num: '06', label: 'Module Access by User' },
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
              { k: 3, text: <><B>Role Templates</B>: what each role sees (and can change) by default, set <i>before</i> you add people.</> },
              { k: 4, text: <><B>Users</B>: add staff with their department and level.</> },
              { k: 5, text: <><B>Residents</B>: import from a spreadsheet, then link family members.</> },
              { k: 6, text: <><B>Module Access</B>: individual exceptions, only where someone needs something different from their role.</> },
            ]} />
            <Tip>For how the five access levels work (Employee, Supervisor, Manager, Administrator, Corporate), approvals, and Emergency Edit, see <GuideLink to="/training/access">Roles &amp; Access</GuideLink>.</Tip>
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
            dek="Each person gets their own login. Their department and level decide what they can do.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Users</B> and click <B>Add User</B>.</> },
              { k: 2, text: <>Enter their name and <B>email</B>. They'll get an email with a link to set their own password, so there's no temporary password to hand out.</> },
              { k: 3, text: <>Choose the <B>Account Type</B>: <B>Staff</B> for almost everyone, <B>Administrator</B> for the NHA, <B>Org Admin</B> for the person who runs ElderLoop. (Resident and Family logins are made from the resident's profile instead.)</> },
              { k: 4, text: <>For Staff, add their <B>department and level</B>: Employee, Supervisor, or Manager. Someone can belong to more than one department (for example a Dietary Manager who also supervises Housekeeping).</> },
              { k: 5, text: <>Click <B>Create User</B>. Edit them later (pencil icon) to add a job title, phones, hire date, or admin-only notes.</> },
            ]} />
            <Tip warn>Department and level matter. Someone with no department sees only their own items in most modules. Check every person's department before go-live.</Tip>
            <H3>When someone leaves</H3>
            <P>Click the <B>deactivate</B> icon on their row. Their login stops working, but their history (notes, work orders, time punches) stays. Uncheck <B>Active Account</B> in their edit form to do the same thing. Your plan's staff limit counts active accounts only.</P>
            <P>The <B>2FA</B> column shows who has two-factor sign-in on. See <GuideLink to="/training/two-factor">Two-Factor Sign-In</GuideLink> for resets.</P>
          </SectionBlock>

          <SectionBlock id="templates" num="05" title="Role Templates"
            dek="The starting point for what each role sees and can change, so new staff aren't stuck with an empty sidebar.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Role Templates</B> and click a role to expand it.</> },
              { k: 2, text: <>Click a module to cycle: <B>Off</B> → <B>Edit</B> → <B>View Only</B> → Off.</> },
              { k: 3, text: <><B>Edit</B> follows the module's normal rules for the person's level. <B>View Only</B> lets the role look but not change anything. Saving is blocked, and they see a "View only" bar on that module.</> },
            ]} />
            <Tip>View Only never applies in someone's own department. Set Managers to View Only on Dietary and Housekeeping, and the Dietary Manager still runs Dietary fully while only viewing Housekeeping. Even under View Only, people can still file new requests: work orders, IT tickets, meal and dietary requests, and cleaning requests.</Tip>
            <div className="mt-6" />
            <P>Modules shared across departments (Communication, Incident Reports, Surveys, Staff, Time Clock, Family) are on/off only. Org Admins and the Administrator always see everything and aren't listed.</P>
          </SectionBlock>

          <SectionBlock id="access" num="06" title="Module Access by User"
            dek="Exceptions for one person. Their own setting always beats their role template.">
            <Steps items={[
              { k: 1, text: <>Open <B>Admin Panel → Module Access</B> and click the person.</> },
              { k: 2, text: <>Tiles with a dashed border marked <B>role</B> follow their Role Template. Green means their role gives them the module, gray means it doesn't, and <B>role · view</B> means view only.</> },
              { k: 3, text: <>Click a tile to cycle: <B>Role default</B> → <B>Edit</B> → <B>View</B> → <B>No Access</B> → Role default. <B>No Access</B> (red) hides the module even when their role would show it.</> },
            ]} />
            <Tip>Use this sparingly. Set the rule once in Role Templates; use Module Access only for the person who really is different. The count on each row ("8 modules") is what they can actually open. Changes take effect the next time they sign in or refresh.</Tip>
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
            ['Set what a role sees by default', 'Role Templates'],
            ['Make a role view-only in a module', 'Role Templates → click module until View Only'],
            ['Give or block one person\'s access', 'Module Access → click the person'],
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
