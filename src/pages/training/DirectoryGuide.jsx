import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/directory/${name}`

const NAV = [
  { id: 'overview',   num: '01', label: 'Resident Directory' },
  { id: 'contacts',   num: '02', label: 'Emergency & Medical Contacts' },
  { id: 'staff-dir',  num: '03', label: 'Staff Directory' },
]

export default function DirectoryGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Directory"
        dek="A working guide to the resident directory and staff directory — who's who, and how to keep their records current."
        chips={['For: All staff (edit rights vary by role)', 'Where: Sidebar → Residents / Staff Directory', '3 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="overview" num="01" title="Resident Directory"
            dek="Every active resident, grouped by care level, with a quick-glance emergency contact on each card.">
            <Frame src={SHOT('overview.png')} alt="Resident Directory" caption="Residents auto-group into 5 care levels — click a stat tile or chip to filter" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Search by name, room, or unit, or click a care-level chip (<b className="text-slate-900">Independent Living</b>, <b className="text-slate-900">Assisted Living</b>, <b className="text-slate-900">Memory Care</b>, <b className="text-slate-900">Skilled Nursing</b>, <b className="text-slate-900">Rehab</b>) to narrow the list.</> },
              { k: 2, text: <>An amber <b className="text-slate-900">No emergency contact on file</b> warning on a card means exactly that — add one before it's needed.</> },
              { k: 3, text: <>Click any card to open the resident's full profile, or <b className="text-slate-900">Add Resident</b> to create a new one.</> },
            ]} />
            <Tip>A green <b>Public</b> badge means the resident opted into being visible in the in-portal directory other residents can browse — it never exposes phone, medical, or emergency-contact info there.</Tip>
          </SectionBlock>

          <SectionBlock id="contacts" num="02" title="Emergency & Medical Contacts"
            dek="A resident's full profile is three tabs: Info, Emergency Contacts, and Medical Contacts."
            roleNote="Edit: directory permission">
            <ShotsPair>
              <Frame src={SHOT('resident-detail-info.png')} alt="Resident Info tab" caption="Save the Info tab first — contacts can't be added to an unsaved resident" />
              <Frame src={SHOT('resident-detail-emergency.png')} alt="Emergency Contacts tab" caption="Use Set Primary to choose which contact shows on the directory card" />
            </ShotsPair>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>On <b className="text-slate-900">Info</b>: name, DOB (age calculates automatically), room/unit/building, care level, admission date, and a photo upload.</> },
              { k: 2, text: <>Two portal-access panels live here too — <b className="text-slate-900">Resident Portal Access</b> and <b className="text-slate-900">Family Portal Access</b> — where you grant a resident or family member their own login. See the Family training guide for the full flow.</> },
              { k: 3, text: <><b className="text-slate-900">Emergency Contacts</b> and <b className="text-slate-900">Medical Contacts</b> (physician, specialist, dentist, pharmacy, hospital) are both repeatable — add as many as needed and mark one emergency contact <b className="text-slate-900">Primary</b>.</> },
              { k: 4, text: <>The print icon in the header generates a confidential profile sheet. "Deleting" a resident actually deactivates them — records are retained, not erased.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="staff-dir" num="03" title="Staff Directory"
            dek="Coworker contact info, grouped by department — separate from Staff Management, which handles HR records and certifications.">
            <Frame src={SHOT('staff-directory.png')} alt="Staff Directory" caption="Regular staff only see profiles marked Public, plus their own" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Search or filter by department. Click <b className="text-slate-900">My Profile</b> to edit your own entry.</> },
              { k: 2, text: <>Everyone can edit their own <b className="text-slate-900">Bio</b> and toggle <b className="text-slate-900">Directory Visibility</b> (Public to all staff, or Supervisors &amp; above only).</> },
              { k: 3, text: <>Supervisors and above can edit anyone's job title, department, email, phone, and office location, and see a "Private" label on profiles hidden from regular staff.</> },
            ]} />
            <Tip warn>This is a read-mostly contact list, not the place to hire someone. New staff accounts and role/permission assignment happen in Staff Management.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Find a resident’s emergency contact', 'Residents → click a card → Emergency Contacts'],
            ['Add a new resident', 'Residents → Add Resident'],
            ['Grant family or resident portal access', 'Residents → click a card → Info tab'],
            ['Find a coworker’s phone number', 'Staff Directory → search'],
            ['Edit your own directory listing', 'Staff Directory → My Profile'],
          ]} />

          <GuideFooter label="Directory Module" />
        </main>
      </div>
    </div>
  )
}
