import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/housekeeping/${name}`

const NAV = [
  { id: 'ltc', num: '01', label: 'LTC Inspections' },
  { id: 'il',  num: '02', label: 'Independent Living' },
  { id: 'linen', num: '03', label: 'Linen' },
]

export default function HousekeepingGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Housekeeping"
        dek="A working guide to the Housekeeping module — routine room and common-area inspections, booking, completing, and billing independent living cleaning requests, and tracking linen loss."
        chips={['For: Housekeeping staff, Supervisors, Managers', 'Where: Sidebar → Housekeeping', '3 tabs']}
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
            <p className="text-[15px] text-slate-700 mb-6">Click any row in the <b className="text-slate-900">Inspection Log</b> to see that inspection in full: every checklist item, its result, and the notes. Housekeepers see their own inspections in the log; the Housekeeping Manager sees everyone's.</p>
            <Tip>Housekeepers record and edit their own inspections. Supervisors can correct anyone's. Only the Housekeeping Manager sets up areas and checklists or deletes an inspection.</Tip>
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
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Requests from the portals</h3>
            <p className="text-[15px] text-slate-700 mb-6">When an IL resident or a family member picks <b className="text-slate-900">Housekeeping</b> on a maintenance request in their portal, it lands here as a Pending request, tagged <b className="text-slate-900">🏠 Resident</b> or <b className="text-slate-900">👨‍👩‍👧 Family</b>. They see its status in their portal as you book and complete it. Marking a visit billed is for Supervisors and above.</p>
          </SectionBlock>

          <SectionBlock id="linen" num="03" title="Linen"
            dek="Log linen pulled from service so replacement cost is tied to loss. With the Budgets add-on, the tab also shows linen and chemical cost per occupied room day.">
            <Frame src={SHOT('linen.png')} alt="Linen tab" caption="Linen and chemical cost per occupied room day, the loss rate, and a six-month trend" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Open <b className="text-slate-900">Linen</b> and click <b className="text-slate-900">Log discarded linen</b>. Enter the item, quantity, date, and reason (<b className="text-slate-900">Torn</b>, <b className="text-slate-900">Stained</b>, <b className="text-slate-900">Worn out</b>, <b className="text-slate-900">Lost</b>, <b className="text-slate-900">Other</b>), plus an optional note.</> },
              { k: 2, text: <>A mistake is marked <b className="text-slate-900">Entered in error</b>, never deleted. Housekeepers fix their own; Supervisors fix anyone's.</> },
              { k: 3, text: <>The Housekeeping Manager sets <b className="text-slate-900">linen in circulation</b> with the pencil on the Linen loss rate tile, so the loss rate is a true percentage.</> },
            ]} />
            <p className="text-[15px] text-slate-700 mb-6">Managers with the Budgets add-on also see <b className="text-slate-900">Linen per occupied room day</b>, <b className="text-slate-900">Chemical units per occupied room day</b> (counted in units, so a price change can't hide overuse), the loss rate, the value of discarded linen, and a six-month trend. See the <a href="/training/budgets" className="text-brand-700 font-semibold hover:underline">Budgets</a> guide.</p>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Set up rooms and common areas to inspect', 'LTC Inspections → Add Area'],
            ['Log a room or common-area inspection', 'LTC Inspections → Start Inspection'],
            ['Take a resident’s cleaning request', 'Independent Living → New Request'],
            ['Schedule a booked cleaning', 'Open the request → set status to Booked'],
            ['Record hours and services after a job', 'Open the request → set status to Completed'],
            ['Print a receipt for a resident', 'Independent Living → print icon on a completed request'],
            ['See what still needs to be billed', 'Independent Living → Unbilled stat tile'],
            ['Log torn or lost linen', 'Linen → Log discarded linen'],
            ['See a past inspection in full', 'LTC Inspections → click a row in the Inspection Log'],
          ]} />

          <GuideFooter label="Housekeeping Module" />
        </main>
      </div>
    </div>
  )
}
