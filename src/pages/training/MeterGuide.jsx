import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/meters/${name}`

const NAV = [
  { id: 'dashboard', num: '01', label: 'Meter Dashboard' },
  { id: 'reading',   num: '02', label: 'Entering a Reading' },
  { id: 'adding',    num: '03', label: 'Adding a Meter' },
  { id: 'history',   num: '04', label: 'Meter History' },
  { id: 'setup',     num: '05', label: 'Utility Types & Scanning' },
  { id: 'billing',   num: '06', label: 'Billing Export' },
]

export default function MeterGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Meter Readings"
        dek="A working guide to tracking resident utility meters — logging readings, calculating usage and cost automatically, and keeping a full history per meter."
        chips={['For: Property staff, Maintenance, Admins', 'Where: Sidebar → Meter Readings', '5 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="dashboard" num="01" title="Meter Dashboard"
            dek="Meters are grouped by utility type — Electric, Water, Natural Gas, or any custom type — with a stat bar for that type's totals.">
            <Frame src={SHOT('dashboard.png')} alt="Meter Readings dashboard" caption="A card with an amber border and no reading yet means it's never been read" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click a utility type tab (Electric, Water, Natural Gas) to switch which meters you're viewing — the badge on each tab shows how many meters exist for it.</> },
              { k: 2, text: <>The stat tiles track <b className="text-slate-900">Meters</b>, <b className="text-slate-900">Unread</b> (never had a reading logged), <b className="text-slate-900">Total Usage</b>, and <b className="text-slate-900">Est. Total</b> cost for that type — all based on each meter's most recent reading.</> },
              { k: 3, text: <>Search by resident, unit, or meter number to find a specific meter quickly.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="reading" num="02" title="Entering a Reading"
            dek="Type in the current number — usage and estimated cost calculate automatically against the previous reading and that utility's rate.">
            <Frame src={SHOT('enter-reading-modal.png')} alt="Enter Reading form" caption="Usage and cost preview update live as you type the current reading" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Enter Reading</b> on any meter card — the previous reading is shown for reference.</> },
              { k: 2, text: <>Type the <b className="text-slate-900">Current Reading</b> — usage (this reading minus the last one) and estimated cost calculate instantly below.</> },
              { k: 3, text: <>If you enter a value lower than the previous reading, the app asks you to confirm before saving — this catches typos before they throw off usage history.</> },
              { k: 4, text: <>Click <b className="text-slate-900">Save Reading</b> to log it — the meter card updates immediately.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="adding" num="03" title="Adding a Meter"
            dek="Attach a physical meter to a unit, building, or resident so readings can start being tracked against it.">
            <Frame src={SHOT('add-meter-modal.png')} alt="Add Meter form" caption="Meter Number is the physical ID printed on the meter — used for barcode scanning" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Meter</b>, pick the utility type, and enter the unit — the only two required fields.</> },
              { k: 2, text: <>Add a Building name and search for a Resident if the meter is tied to one — both help identify the meter at a glance later.</> },
              { k: 3, text: <>Set <b className="text-slate-900">Meter Number</b> to the physical ID printed on the meter itself, so it can be matched during barcode scanning.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="history" num="04" title="Meter History"
            dek="Every reading ever logged for a meter, with usage, estimated cost, and who read it — the record to check for billing disputes or usage spikes.">
            <Frame src={SHOT('meter-history-modal.png')} alt="Meter History modal" caption="The most recent reading is always at the top" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click the trending-up icon on any meter card to open its full reading history.</> },
              { k: 2, text: <>Each row shows the reading value, calculated usage, estimated cost, and who logged it — up to the last 24 readings.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="setup" num="05" title="Utility Types & Scanning"
            dek="Utility types set the unit and billing rate every meter and reading calculates against — set these up once before adding meters.">
            <Frame src={SHOT('utility-types-modal.png')} alt="Utility Types manager" caption="Changing a rate here doesn't recalculate past readings, only future ones" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Utility Types</b> to add a new type (name, unit like kWh or Gallons, and a rate per unit) or update an existing rate.</> },
              { k: 2, text: <>Click <b className="text-slate-900">Print Barcodes</b> to generate scannable labels for physical meters.</> },
              { k: 3, text: <>Click <b className="text-slate-900">Scan Meter</b> and scan a printed label to jump straight to that meter's Enter Reading form — no searching needed.</> },
            ]} />
            <Tip>Set up Utility Types before adding meters — each meter must be assigned to one, and the rate you set there is what every future reading's cost estimate uses.</Tip>
          </SectionBlock>

          <SectionBlock id="billing" num="06" title="Billing Export" roleNote="Business office (meter costs permission)"
            dek="Turn a month of readings into resident charges: download or print them, then mark them billed so nothing is charged twice. Communities connected to PointClickCare can post the charges straight to residents' PointClickCare accounts.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Billing Export</b>, pick the dates (last month by default), and leave <b className="text-slate-900">Not yet billed only</b> checked.</> },
              { k: 2, text: <><b className="text-slate-900">Download CSV</b> or <b className="text-slate-900">Print Statements</b> for your billing system.</> },
              { k: 3, text: <>Type a <b className="text-slate-900">billing reference</b> (e.g. "GP batch Oct 2026") and click <b className="text-slate-900">Mark billed</b>. A billed reading's numbers are locked. <b className="text-slate-900">Mark not billed</b> undoes it.</> },
            ]} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Sending charges to PointClickCare</h3>
            <Steps items={[
              { k: 1, text: <>Instead of Mark billed, click <b className="text-slate-900">Send to PointClickCare</b>. ElderLoop queues one charge per resident for the readings shown and tells you about any resident who isn't linked to PointClickCare yet, or any meter with no resident.</> },
              { k: 2, text: <>Approve them under <b className="text-slate-900">Charges for PointClickCare</b> at the bottom of the same window. Click the arrow on an item to see each reading and the total before you approve.</> },
              { k: 3, text: <><b className="text-slate-900">Send approved now</b> posts them. Readings are marked billed only after PointClickCare accepts them, with the reference "PCC" and PointClickCare's number.</> },
            ]} />
            <Tip>A reading can be queued only once, so sending the same month twice doesn't double-charge anyone. Everyone with the meter costs permission gets a bell when charges are waiting for approval.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Log a new reading', 'Meter card → Enter Reading'],
            ['See a meter’s full reading history', 'Meter card → trending-up icon'],
            ['Set up a new meter', 'Add Meter'],
            ['Add a utility type or change its rate', 'Utility Types'],
            ['Look up a meter fast by scanning', 'Scan Meter'],
            ['Export and mark a month billed', 'Billing Export → Mark billed'],
            ['Post charges to PointClickCare', 'Billing Export → Send to PointClickCare → Approve'],
            ['Print scannable meter labels', 'Print Barcodes'],
          ]} />

          <GuideFooter label="Meter Readings Module" />
        </main>
      </div>
    </div>
  )
}
