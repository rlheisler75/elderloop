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
            dek="Creates a real login, not just a directory entry. Role sets their identity and, via your org's Role Templates, their default module access — no separate step required for the common case, though you can still fine-tune one person's access afterward."
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
            dek="A new login gets a sensible baseline automatically, based on their Role (set org-wide in Role Templates) — this screen is for granting or revoking access beyond that baseline for one specific person."
            roleNote="Org Admin only">
            <Frame src={SHOT('module-access.jpg')} alt="Module Access by user" caption="Click a module pill to cycle Edit → View Only → No Access — this overrides that person's Role Template default" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Go to <b className="text-slate-900">Admin Panel → Module Access</b>, search for the person, and click their row to expand the full module list.</> },
              { k: 2, text: <>Click a module pill to cycle it: <b className="text-slate-900">No Access → Edit → View Only → No Access</b>. Use this for exceptions — e.g. one Dietary staffer who also needs to see Marketing — not for the baseline every Dietary hire should get, which belongs in Role Templates instead.</> },
              { k: 3, text: <>Org Admins and CEOs always have full access to every enabled module and don't appear here needing configuration — this screen is for everyone else.</> },
            ]} />
            <Tip>The baseline itself lives in <b className="text-slate-900">Admin Panel → Role Templates</b>: an editable, per-role default (e.g. Dietary role → Dietary, Activities, Communication, Directory, Time Clock) that every new hire with that Role gets automatically, with no manual step required. An explicit grant or revoke here in Module Access for one person always overrides their Role Template default.</Tip>
            <Tip warn>Org Admins, CEOs, and Super Admins aren't affected by Role Templates — they already have full access unconditionally. Family and Resident logins use a separate fixed portal, not this module list, so Role Templates has no effect on them either.</Tip>
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
