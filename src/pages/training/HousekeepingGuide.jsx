import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/housekeeping/${name}`

const NAV = [
  { id: 'ltc', num: '01', label: 'LTC Inspections' },
  { id: 'il',  num: '02', label: 'Independent Living' },
]

export default function HousekeepingGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Housekeeping"
        dek="A working guide to both sides of the Housekeeping module — routine room and common-area inspections, and booking, completing, and billing independent living cleaning requests."
        chips={['For: Housekeeping staff, Supervisors, Managers', 'Where: Sidebar → Housekeeping', '2 tabs']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="ltc" num="01" title="LTC Inspections"
            dek="A checklist-based inspection for every room and common area in the community — pass/fail per item, with a running log of every inspection ever logged.">
            <Frame src={SHOT('ltc-inspections.png')} alt="LTC Inspections tab" caption="Areas with their last inspection result, plus the full Inspection Log below" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Add Area</b> once to build out your rooms and common areas — after that, every area shows its last inspection result right on its card.</> },
              { k: 2, text: <>Click <b className="text-slate-900">Start Inspection</b> on an area to open the checklist — every item defaults to Pass; click an item to flip it to Fail.</> },
              { k: 3, text: 'A failed item reveals a note field so you can record exactly what was wrong — add General Notes for anything that doesn’t fit one checklist line.' },
              { k: 4, text: <>Click <b className="text-slate-900">Save Inspection</b> — the overall Pass/Issues result is calculated automatically from the checklist, no separate step needed.</> },
            ]} />
            <Frame src={SHOT('inspection-modal.png')} alt="Inspection checklist with one failed item" caption="A failed item reveals a note field; the footer tracks the running pass/fail count" />
          </SectionBlock>

          <SectionBlock id="il" num="02" title="Independent Living"
            dek="Cleaning requests from independent-living residents — from the initial ask through booking, completion, and billing — with a printable receipt at the end.">
            <Frame src={SHOT('il-requests.png')} alt="Independent Living requests list" caption="Pending, Booked, and Unbilled counts at a glance" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Request</b> and take down the resident's name, unit, phone, and what they're asking for.</> },
              { k: 2, text: <>Move status from <b className="text-slate-900">Pending</b> to <b className="text-slate-900">Booked</b> once you've scheduled it — a Booking Details panel appears for the date, time, and estimated hours.</> },
              { k: 3, text: <>Move to <b className="text-slate-900">Completed</b> after the job is done — a Completion Report panel appears for actual hours worked, services performed, and completion notes.</> },
              { k: 4, text: <>Check <b className="text-slate-900">Marked as billed</b> once invoiced — until then, a completed job shows an orange <b className="text-slate-900">Unbilled</b> tag so nothing falls through the cracks.</> },
            ]} />
            <Frame src={SHOT('il-request-modal.png')} alt="Cleaning request form with Completed status selected" caption="Selecting Completed reveals the Completion Report section" />
            <Frame src={SHOT('print-receipt-modal.png')} alt="Cleaning receipt preview" caption="A completed request's printable receipt" />
            <Tip>The print icon only appears once a request is marked Completed — it prints a simple receipt with the resident, date, hours, and services performed, ready to hand over or file.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Set up rooms and common areas to inspect', 'LTC Inspections → Add Area'],
            ['Log a room or common-area inspection', 'LTC Inspections → Start Inspection'],
            ['Take a resident’s cleaning request', 'Independent Living → New Request'],
            ['Schedule a booked cleaning', 'Open the request → set status to Booked'],
            ['Record hours and services after a job', 'Open the request → set status to Completed'],
            ['Print a receipt for a resident', 'Independent Living → print icon on a completed request'],
            ['See what still needs to be billed', 'Independent Living → Unbilled stat tile'],
          ]} />

          <GuideFooter label="Housekeeping Module" />
        </main>
      </div>
    </div>
  )
}
