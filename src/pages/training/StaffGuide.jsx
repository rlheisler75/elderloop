import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/staff/${name}`

const NAV = [
  { id: 'overview', num: '01', label: 'Overview' },
  { id: 'adding',   num: '02', label: 'Adding a Staff Member' },
  { id: 'certs',    num: '03', label: 'Certifications' },
]

export default function StaffGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Staff Management"
        dek="A working guide to creating staff logins and tracking certification compliance — distinct from the Staff Directory, which is just a contact list."
        chips={['For: Org Admins (add staff)', 'Where: Sidebar → Staff', '3 sections']}
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
            dek="Creates a real login, not just a directory entry — the Role you choose here drives what they can do in the app."
            roleNote="Org Admin only">
            <Frame src={SHOT('add-staff-modal.png')} alt="Add Staff Member form" caption="No password field — they set their own from an emailed link" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Staff Member</b> and enter First Name and Email — everything else is optional up front and can be filled in later.</> },
              { k: 2, text: <>Pick a <b className="text-slate-900">Role</b> (Staff, Nursing, Supervisor, Manager, Admin) — this is what actually controls their permissions, separate from Job Title and Department, which are just descriptive.</> },
              { k: 3, text: <>Saving sends them a branded email with a link to set their own password — there's no temporary password for you to invent, remember, or hand off.</> },
            ]} />
            <Tip warn>If your plan has a staff seat limit and you're at capacity, you'll be prompted to upgrade in Admin Panel → Billing instead of being able to add someone.</Tip>
          </SectionBlock>

          <SectionBlock id="certs" num="03" title="Certifications"
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
            ['Change someone’s role/permissions', 'Open their card → Profile tab is descriptive only — role is set at creation'],
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
