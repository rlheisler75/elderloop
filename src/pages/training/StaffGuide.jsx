import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/staff/${name}`

const NAV = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'adding',   num: '02', label: 'Adding a Staff Member' },
  { id: 'access',   num: '03', label: 'Access (Job Roles)' },
  { id: 'certs',    num: '04', label: 'Certifications' },
]

export default function StaffGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Staff Management"
        dek="A working guide to creating staff logins and tracking certification compliance — distinct from the Staff Directory, which is just a contact list."
        chips={['For: Org Admins (add staff)', 'Where: Sidebar → Staff', '4 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="overview" num="01" title="Overview"
            dek="Every active staff member grouped by department, with certification compliance surfaced right at the top.">
            <Frame src={SHOT('overview.png')} alt="Staff Management overview" caption="The Certification Alerts banner lists everyone with a cert expiring soon or already expired" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Stat tiles track <b className="text-slate-900">Active Staff</b>, <b className="text-slate-900">On Leave</b>, <b className="text-slate-900">Certs Expiring</b> (within 30 days), and <b className="text-slate-900">Expired Certs</b> — the last two ring red once above zero.</> },
              { k: 2, text: <>Search or filter by department and status. Click any card to open that person's full record.</> },
              { k: 3, text: <>This is HR/compliance data — different from Staff Directory, which is a lighter contact list everyone can browse.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="adding" num="02" title="Adding a Staff Member"
            dek="Creates a real login, not just a directory entry. Their department and level then hand out their default Job Roles, so the common case needs no extra step."
            roleNote="Org Admin only">
            <Frame src={SHOT('add-staff-modal.png')} alt="Add Staff Member form" caption="No password field — they set their own from an emailed link" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Staff Member</b> and enter First Name and Email — everything else is optional up front and can be filled in later.</> },
              { k: 2, text: <>Pick a <b className="text-slate-900">Role</b> (Staff, Nursing, Supervisor, Manager, Admin, etc.) — separate from Job Title and Department, which are just descriptive labels for the directory. Role can be changed later from Admin Panel → Users → the pencil icon on their row.</> },
              { k: 3, text: <>Saving sends them a branded email with a link to set their own password — there's no temporary password for you to invent, remember, or hand off. The link expires in 1 hour; if they miss it, they can use Forgot Password on the login screen to get a new one.</> },
            ]} />
            <Tip warn>The <b className="text-slate-900">Starter</b> plan includes up to 10 active staff accounts, <b className="text-slate-900">Essential</b> up to 40, and <b className="text-slate-900">Plus</b> up to 75 (resident and family portal logins don't count). At the limit, <b className="text-slate-900">Add Staff Member</b> shows an upgrade prompt instead — and reactivating a former staff member or changing a family login into a staff account counts as adding a seat, too. To make room, deactivate someone who's left, or upgrade in Admin Panel → Billing. The Professional plan has no staff limit.</Tip>
          </SectionBlock>

          <SectionBlock id="access" num="03" title="Access (Job Roles)"
            dek="What someone can do comes from their Job Roles. Most come automatically from their department and level; an Org Admin adds anything else on their Edit User screen."
            roleNote="Org Admin only">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>In <b className="text-slate-900">Admin Panel → Users</b>, edit the person and add each <b className="text-slate-900">department &amp; level</b> they work in. That gives them the matching Department role (for example Dietary Employee).</> },
              { k: 2, text: <>Under <b className="text-slate-900">Job Roles</b>, add any extra role they need, and open <b className="text-slate-900">Effective access</b> to see exactly what they can do or to add or remove one permission for just them.</> },
              { k: 3, text: <>To change what a whole group can do, edit the role in <b className="text-slate-900">Admin Panel → Job Roles</b>.</> },
            ]} />
            <Tip>Org Admins can always do everything. Family and Resident logins use their own portals, so Job Roles don't apply to them. See <a href="/training/access" className="font-semibold underline">Roles &amp; Access</a> for the full picture.</Tip>
          </SectionBlock>

          <SectionBlock id="certs" num="04" title="Certifications"
            dek="Track license/certification numbers, issuing bodies, and expiration dates per staff member, with a scanned copy attached.">
            <ShotsPair>
              <Frame src={SHOT('staff-detail-profile.png')} alt="Staff Detail — Profile tab" caption="Status (Active/On Leave/Inactive/Terminated) and Emergency Contact live here too" />
              <Frame src={SHOT('staff-detail-certs.png')} alt="Staff Detail — Certifications tab" caption="Each cert is color-coded: green active, amber expiring soon, red expired" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Open a staff member's card, switch to the <b className="text-slate-900">Certifications</b> tab, and click <b className="text-slate-900">Add Certification</b>.</> },
              { k: 2, text: <>Pick a type from your org's list (or Custom/Other), then fill in name, license number, issuing body, issue date, expiry date, and attach a scanned copy (PDF/JPG/PNG).</> },
              { k: 3, text: <>Status is calculated automatically from the expiry date — you never set it manually. Expired and expiring-soon certs also roll up into the org-wide banner on the main Staff Management screen.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Add a new staff login', 'Add Staff Member'],
            ['Change someone’s Role', 'Admin Panel → Users → pencil icon on their row'],
            ['Change what someone can do', 'Admin Panel → Users → edit → Job Roles / Effective access'],
            ['Mark someone on leave or terminated', 'Open their card → Profile tab → Status'],
            ['Add or renew a certification', 'Open their card → Certifications tab → Add Certification'],
            ['See who has a cert expiring soon', 'Certification Alerts banner or Certs Expiring stat tile'],
          ]} />

          <GuideFooter label="Staff Management Module" />
        </main>
      </div>
    </div>
  )
}
