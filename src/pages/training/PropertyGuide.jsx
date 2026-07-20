import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/property/${name}`

const NAV = [
  { id: 'units',        num: '01', label: 'Units' },
  { id: 'tenants',      num: '02', label: 'Tenants' },
  { id: 'leases',       num: '03', label: 'Leases & Rent Ledger' },
  { id: 'keys',         num: '04', label: 'Keys' },
  { id: 'walkthroughs', num: '05', label: 'Walkthroughs' },
  { id: 'notices',      num: '06', label: 'Notices' },
]

export default function PropertyGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Property Management"
        dek="A working guide to running independent living units — from vacancy to lease to rent collection, plus keys, move-in/move-out walkthroughs, and legal notices."
        chips={['For: Property managers, Leasing staff, Admins', 'Where: Sidebar → Property Mgmt', '6 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="units" num="01" title="Units"
            dek="Every independent living unit with its status, rent, size, and — if occupied — a direct link to the current tenant's lease and ledger.">
            <Frame src={SHOT('units.png')} alt="Property Management Units tab" caption="Occupancy percentage and open notice count sit above the tab bar" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Unit</b> to add a unit number, building, type, bedrooms/bathrooms, square footage, market rent, and amenities.</> },
              { k: 2, text: <>Set <b className="text-slate-900">Status</b> — Available, Occupied, Notice Given, On Hold, Maintenance, or Offline — to keep the occupancy stat accurate.</> },
              { k: 3, text: <>An occupied unit's card shows its current tenant and lease number, with a dollar-sign shortcut straight to that lease's rent ledger.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="tenants" num="02" title="Tenants"
            dek="Contact and emergency contact info, plus background check status, for everyone who has or has had a lease.">
            <Frame src={SHOT('tenants.png')} alt="Property Management Tenants tab" caption="Each row links to that tenant's active lease number and unit" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Tenant</b> and fill in name, contact info, date of birth, and emergency contact.</> },
              { k: 2, text: <>Set <b className="text-slate-900">Background Check</b> status (Pending, Passed, Failed, Waived) as it's completed — a colored pill on the table tracks it at a glance.</> },
              { k: 3, text: <>A tenant isn't tied to a unit until they're attached to a lease — add the tenant first, then create their lease.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="leases" num="03" title="Leases & Rent Ledger"
            dek="Lease terms — rent, due day, late fee, utilities — and a running rent ledger per lease with a live balance.">
            <Frame src={SHOT('leases.png')} alt="Property Management Leases tab" caption="Status updates automatically feed the dashboard's occupancy stats" />
            <Frame src={SHOT('rent-ledger-modal.png')} alt="Rent Ledger modal" caption="Charges push the balance up, payments and credits bring it down" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Lease</b>, pick a unit and tenant, set monthly rent, rent due day, and lease type (Month-to-Month, Fixed Term, Short Term).</> },
              { k: 2, text: <>Set which utilities the tenant pays, and pet deposit/fee if applicable.</> },
              { k: 3, text: <>Click the dollar-sign icon on any lease to open its <b className="text-slate-900">Rent Ledger</b> — post charges, payments, credits, late fees, or refunds, and the balance updates live.</> },
              { k: 4, text: <>Made a posting mistake? Click the <b className="text-slate-900">×</b> next to any ledger entry to void it — voided entries drop out of the balance but stay on record.</> },
            ]} />
            <Tip>Charges (rent, late fees, damage charges) push the balance up; payments, credits, and refunds bring it down — the balance banner turns red when a tenant owes money.</Tip>
          </SectionBlock>

          <SectionBlock id="keys" num="04" title="Keys"
            dek="A chain-of-custody log for every unit key, mailbox key, fob, and access code issued — so you always know what's out and to whom.">
            <Frame src={SHOT('keys.png')} alt="Property Management Keys tab" caption="Green checkmark returns a key; the warning icon marks one lost" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Issue Key</b>, pick the unit and tenant, key type (unit, mailbox, fob, keypad code, and more), and how many copies.</> },
              { k: 2, text: <>Click the checkmark icon when a key is returned, or the warning icon to mark it lost — both close out that key record.</> },
              { k: 3, text: <>The header count shows how many key records exist and how many are still checked out.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="walkthroughs" num="05" title="Walkthroughs"
            dek="A room-by-room condition checklist for move-in, move-out, periodic, and pre-lease inspections, with per-item notes and damage charges.">
            <Frame src={SHOT('walkthroughs.png')} alt="Property Management Walkthroughs tab" caption="Damage charges roll up from the itemized checklist" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Walkthrough</b>, choose the unit and type, and note whether the tenant was present.</> },
              { k: 2, text: <>Work through the room-by-room checklist — each item gets a condition (Good, Fair, Poor, Damaged, Missing), notes, and an optional charge.</> },
              { k: 3, text: <>Set the <b className="text-slate-900">Total Damage Charges</b> and notes to summarize what's owed — this shows directly on the walkthrough card.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="notices" num="06" title="Notices"
            dek="Legal notices tied to a specific lease — late rent, pay-or-quit, lease violations, and more — tracked from draft through resolution.">
            <Frame src={SHOT('notices.png')} alt="Property Management Notices tab" caption="Overdue cure deadlines are highlighted in red" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Issue Notice</b> and select the lease — the unit and tenant fill in automatically.</> },
              { k: 2, text: <>Pick a <b className="text-slate-900">Notice Type</b> (Late Rent, Pay or Quit, Lease Violation, Eviction Filing, Rent Increase, and more), amount owed if applicable, and a cure deadline.</> },
              { k: 3, text: <>Move the <b className="text-slate-900">Status</b> forward as it progresses — Draft → Issued → Delivered → Acknowledged → Resolved, or Escalated if it needs to go further.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Add a new unit', 'Units tab → Add Unit'],
            ['Move a new resident in', 'Add Tenant, then New Lease'],
            ['Record a rent payment', 'Leases tab → $ icon → Post Entry'],
            ['Issue or return a key', 'Keys tab → Issue Key / checkmark icon'],
            ['Document a move-in or move-out condition', 'Walkthroughs tab → New Walkthrough'],
            ['Start a late rent or lease violation notice', 'Notices tab → Issue Notice'],
          ]} />

          <GuideFooter label="Property Management Module" />
        </main>
      </div>
    </div>
  )
}
