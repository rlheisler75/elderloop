import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/it/${name}`

const NAV = [
  { id: 'tickets',    num: '01', label: 'Tickets' },
  { id: 'submitting', num: '02', label: 'Submitting a Ticket' },
  { id: 'managing',   num: '03', label: 'Managing a Ticket' },
  { id: 'assets',     num: '04', label: 'Assets' },
  { id: 'adding',     num: '05', label: 'Adding an Asset' },
  { id: 'licenses',   num: '06', label: 'Licenses' },
]

export default function ITGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="IT & Technology"
        dek="A working guide to support ticketing, device inventory, and software license tracking — submitting an issue, tracking it to resolution, and keeping tabs on every piece of equipment and every license in the building."
        chips={['For: All staff, IT staff, Admins', 'Where: Sidebar → IT', '6 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="tickets" num="01" title="Tickets"
            dek="Every support request in one list — filter by who it belongs to, its status, or priority, and jump straight to the ones that need attention.">
            <Frame src={SHOT('tickets.png')} alt="IT Tickets tab" caption="Urgent tickets get a red warning icon right in the list" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>The stat tiles track <b className="text-slate-900">Open Tickets</b>, tickets <b className="text-slate-900">In Progress</b>, and total <b className="text-slate-900">Tracked Assets</b>.</> },
              { k: 2, text: <>Switch between <b className="text-slate-900">All</b>, <b className="text-slate-900">My Tickets</b>, and (for admins) <b className="text-slate-900">Assigned to Me</b> — regular staff only ever see their own tickets by default.</> },
              { k: 3, text: <>Filter by status or priority, or search by title, to narrow a long list down fast.</> },
              { k: 4, text: <>Click any ticket to open it — what you see depends on whether you're an admin (see Managing a Ticket below).</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="submitting" num="02" title="Submitting a Ticket"
            dek="Title and category are all that's required — everything else helps IT triage and resolve it faster.">
            <Frame src={SHOT('new-ticket-modal.png')} alt="Submit IT Ticket form" caption="Linking a Related Asset helps IT pull up its full history immediately" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Ticket</b>, describe the issue in the Title, and pick a Category (Network/WiFi, Computer/Laptop, Printer/Scanner, and more) and Priority.</> },
              { k: 2, text: <>Link a <b className="text-slate-900">Related Asset</b> if the issue is with a specific tracked device.</> },
              { k: 3, text: <>Add any error messages or steps to reproduce under Details, then click <b className="text-slate-900">Submit Ticket</b> — it starts as Open with no one assigned.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="managing" num="03" title="Managing a Ticket"
            dek="Admins get full control over a ticket's lifecycle — status, priority, assignment, and resolution notes all live in one place.">
            <Frame src={SHOT('ticket-detail-modal.png')} alt="Ticket detail and edit modal" caption="Non-admins see a read-only view with status, priority, and any resolution notes" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Move <b className="text-slate-900">Status</b> through Open → In Progress → Waiting → Resolved → Closed as work happens — marking Resolved or Closed timestamps it automatically.</> },
              { k: 2, text: <>Set <b className="text-slate-900">Assign To</b> to claim a ticket or hand it to the right person.</> },
              { k: 3, text: <>Fill in <b className="text-slate-900">Resolution Notes</b> once it's fixed — the person who submitted it sees these notes on their end.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="assets" num="04" title="Assets"
            dek="Every tracked device — computers, printers, network gear, displays — with make, model, location, assignment, and warranty status.">
            <Frame src={SHOT('assets.png')} alt="IT Assets tab" caption="Warranty dates turn red once expired, amber within 90 days of expiring" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Search by name, tag, or serial number, or filter by asset type, to find a specific device.</> },
              { k: 2, text: <>Click the pencil icon on any row (admins only) to edit that asset's details.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="adding" num="05" title="Adding an Asset"
            dek="Log a new device once it's in service so tickets can reference it and IT always knows where equipment lives.">
            <Frame src={SHOT('add-asset-modal.png')} alt="Add Asset form" caption="Asset Name is the only required field — everything else can be filled in as you know it" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Asset</b>, name it, and pick an Asset Type (Desktop Computer, Laptop, Printer, Network Switch, and more).</> },
              { k: 2, text: <>Fill in Make, Model, and Serial Number, plus Purchase Date and Warranty Expires so the Assets table can flag it as it nears expiration.</> },
              { k: 3, text: <>Set Location and Assigned To — leave Assigned To as Unassigned/Shared for equipment like printers or network gear that isn't tied to one person.</> },
            ]} />
            <Tip>Status options include In Repair, In Storage, Retired, and Missing in addition to Active — updating status here keeps the Assets table an accurate picture of what's actually in service.</Tip>
          </SectionBlock>

          <SectionBlock id="licenses" num="06" title="Licenses"
            dek="Every piece of paid software — seats, cost, renewal date, and who owns it — so a subscription never lapses because nobody remembered it existed.">
            <Frame src={SHOT('licenses.png')} alt="IT Licenses tab" caption="Renewal dates turn amber within 30 days and red once passed; a banner surfaces the count up top" />
            <Frame src={SHOT('add-license-modal.png')} alt="Add License form" caption="Software Name is the only required field — everything else can be filled in as you know it" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add License</b>, name the software, and set its Vendor, License Type (Subscription, Perpetual, Volume License, Trial, Open Source), and Billing Cycle.</> },
              { k: 2, text: <>Fill in <b className="text-slate-900">Seats Total</b> and <b className="text-slate-900">Seats Used</b> to track utilization, and <b className="text-slate-900">Renewal / Expiration Date</b> so the table can flag it as it approaches.</> },
              { k: 3, text: <>Set a <b className="text-slate-900">License Owner</b> — the staff member who should be the point of contact if a vendor has questions or the license needs renewing.</> },
              { k: 4, text: <>Anything renewing within 30 days shows in amber and triggers the banner at the top of the tab; anything already past its renewal date while still marked Active shows in red.</> },
            ]} />
            <Tip>License Key is optional — use it for a serial number or activation code if you need one on hand, but plenty of subscriptions (Microsoft 365, Adobe) don't need one tracked here at all.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Report a tech issue', 'New Ticket'],
            ['See only your own tickets', 'Tickets tab → My Tickets'],
            ['Assign or resolve a ticket', 'Click ticket → Status / Assign To / Resolution Notes'],
            ['Look up a device’s details', 'Assets tab → search'],
            ['Log a new piece of equipment', 'Assets tab → Add Asset'],
            ['Check what warranties are expiring soon', 'Assets tab → Warranty column'],
            ['Track a new software subscription', 'Licenses tab → Add License'],
            ['Check what licenses are renewing soon', 'Licenses tab → banner / Renewal column'],
          ]} />

          <GuideFooter label="IT & Technology Module" />
        </main>
      </div>
    </div>
  )
}
