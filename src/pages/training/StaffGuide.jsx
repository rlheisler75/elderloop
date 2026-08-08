import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/staff/${name}`

const NAV = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'adding',   num: '02', label: 'Adding a Staff Member' },
  { id: 'access',   num: '03', label: 'Module Access' },
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
            dek="Creates a real login, not just a directory entry. Role sets their identity and a couple of default permissions — but on its own it does not grant them access to the modules they'll actually need. That's a separate, required step covered next."
            roleNote="Org Admin only">
            <Frame src={SHOT('add-staff-modal.png')} alt="Add Staff Member form" caption="No password field — they set their own from an emailed link" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Staff Member</b> and enter First Name and Email — everything else is optional up front and can be filled in later.</> },
              { k: 2, text: <>Pick a <b className="text-slate-900">Role</b> (Staff, Nursing, Supervisor, Manager, Admin, etc.) — separate from Job Title and Department, which are just descriptive labels for the directory. Role can be changed later from Admin Panel → Users → the pencil icon on their row.</> },
              { k: 3, text: <>Saving sends them a branded email with a link to set their own password — there's no temporary password for you to invent, remember, or hand off. The link expires in 1 hour; if they miss it, they can use Forgot Password on the login screen to get a new one.</> },
            ]} />
            <Tip warn>If your plan has a staff seat limit and you're at capacity, you'll be prompted to upgrade in Admin Panel → Billing instead of being able to add someone.</Tip>
          </SectionBlock>

          <SectionBlock id="access" num="03" title="Module Access"
            dek="The step that's easy to miss: a brand-new login can only see the Dashboard, plus Incident Reports and (for Supervisor and above) Surveys, until you explicitly grant them anything else — regardless of what Role you picked."
            roleNote="Org Admin only">
            <Frame src={SHOT('module-access.jpg')} alt="Module Access by user" caption="Every module defaults to No Access for a new login — click a module pill to cycle Edit → View Only → No Access" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Go to <b className="text-slate-900">Admin Panel → Module Access</b>, search for the person, and click their row to expand the full module list.</> },
              { k: 2, text: <>Click a module pill to cycle it: <b className="text-slate-900">No Access → Edit → View Only → No Access</b>. Grant based on what the person's job actually needs — e.g. a nursing hire typically needs Edit on Nursing Notes, not necessarily anything in Marketing or Property Mgmt.</> },
              { k: 3, text: <>Org Admins and CEOs always have full access to every enabled module and don't appear here needing configuration — this screen is for everyone else.</> },
            ]} />
            <Tip warn>Do this right after creating the account. A new nursing or dietary hire who logs in before you've granted anything will see almost nothing useful — just the Dashboard and Incident Reports — and will assume something's broken.</Tip>
            <Tip>Role isn't decorative, though: for a couple of built-in modules (Incident Reports for most operational roles, Surveys for Supervisor and above) it grants visibility automatically. And once someone <em>can</em> see a module — whether via that default or a grant you make here — their Role can still decide whether they get Edit or just View by default on some modules (e.g. Nursing role gets Edit on Nursing Notes out of the box). Module Access always wins if you've set it explicitly here.</Tip>
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
            ['Grant or adjust what modules someone can see', 'Admin Panel → Module Access → search their name → click a module pill'],
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
