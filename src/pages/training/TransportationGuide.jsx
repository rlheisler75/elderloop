import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/transportation/${name}`

const NAV = [
  { id: 'month',      num: '01', label: 'Calendar Views' },
  { id: 'scheduling', num: '02', label: 'Scheduling a Trip' },
  { id: 'day',        num: '03', label: 'Day View & Trip Log' },
  { id: 'list',       num: '04', label: 'All Trips' },
  { id: 'sheet',      num: '05', label: 'Trip Sheet' },
  { id: 'requests',   num: '06', label: 'Ride Requests' },
  { id: 'driversout', num: '07', label: 'Drivers Out' },
]

export default function TransportationGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Transportation"
        dek="A working guide to medical transport — scheduling trips, handling ride requests from Nursing and residents, logging what actually happened, and printing a driver's sheet for the day."
        chips={['For: Transportation staff, Drivers, Nursing', 'Where: Sidebar → Transportation', '7 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="month" num="01" title="Calendar Views"
            dek="Day, Work Week, Week, and Month views of every trip on the books — color-coded by status, so you can spot a busy day or a cancellation at a glance.">
            <Frame src={SHOT('month-view.png')} alt="Transportation Month view calendar" caption="Click any day to schedule a trip, or click a trip chip to open it" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Pick a view with the buttons above the calendar: <b className="text-slate-900">Day View</b>, <b className="text-slate-900">Work Week</b> (Monday to Friday), <b className="text-slate-900">Week</b> (Sunday to Saturday), or <b className="text-slate-900">Month</b>. The arrows move one day, one week, or one month at a time.</> },
              { k: 2, text: <>In the week views each day is a column listing its trips in pickup order, with the resident and driver. <b className="text-slate-900">This week</b> under the dates jumps back to the current week.</> },
              { k: 3, text: <>Click any empty day to open a new trip pre-dated to that day, or click an existing trip to open and edit it. A driver who is out shows on that day as an amber <b className="text-slate-900">Name out</b> marker (see Drivers Out below).</> },
              { k: 4, text: <>The stat tiles above track <b className="text-slate-900">Today's Trips</b>, <b className="text-slate-900">Upcoming</b> scheduled trips, trips <b className="text-slate-900">This Month</b>, and the number of active <b className="text-slate-900">Vehicles</b>.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="scheduling" num="02" title="Scheduling a Trip"
            dek="Resident, date, and pickup time are required — everything about the appointment itself, the driver, and the vehicle can be filled in as you know it.">
            <Frame src={SHOT('schedule-trip-modal.png')} alt="Schedule Trip form" caption="Appointment Details captures the provider so the driver knows exactly where to go" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Schedule Trip</b>, then search for the resident by name or room — selecting one fills in their unit and phone automatically.</> },
              { k: 2, text: <>Set the trip <b className="text-slate-900">Date</b> and <b className="text-slate-900">Pickup</b> time — Estimated Return is optional but helps with vehicle planning.</> },
              { k: 3, text: <>Fill in <b className="text-slate-900">Appointment Details</b> — type (Medical, Dental, Therapy, Vision, Lab/Tests), provider name, address, and phone.</> },
              { k: 4, text: <>Assign a <b className="text-slate-900">Driver</b> and <b className="text-slate-900">Vehicle</b> if you know them ahead of time — both can be added or changed later. If a driver is out on the trip date, the form says so at the top, and turns red if you pick that driver.</> },
            ]} />
            <Tip>Only people whose Job Roles include Transportation Edit schedule and change trips: by default, everyone in the Transportation department at any level, including whoever supervises it from another department. Everyone else sees the calendar as view only. Nursing staff and IL residents send a ride request instead (see Ride Requests below). To give someone access, an Org Admin adds Transportation to their departments, or adds a Transportation Job Role, in Admin Panel → Users → edit.</Tip>
          </SectionBlock>

          <SectionBlock id="day" num="03" title="Day View & Trip Log"
            dek="A single day's trips laid out in order, with room to log what actually happened — actual pickup/return times and mileage — once the trip is underway or done.">
            <Frame src={SHOT('day-view.png')} alt="Transportation Day view" caption="Each card shows appointment, driver, and return time at a glance" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Step through days with the arrows, or jump straight to a date with the date picker.</> },
              { k: 2, text: <>Open a trip and change its <b className="text-slate-900">Status</b> to In Progress or Completed to reveal the <b className="text-slate-900">Trip Log</b> section — actual pickup/return times and start/end mileage.</> },
              { k: 3, text: <>Mileage is calculated automatically once both odometer readings are entered, and shown on the trip card.</> },
            ]} />
            <Tip>Status options include No Show and Cancelled in addition to the usual Scheduled → In Progress → Completed flow — use whichever fits what actually happened.</Tip>
          </SectionBlock>

          <SectionBlock id="list" num="04" title="All Trips"
            dek="Every trip across every date in one searchable, filterable table — the place to look when you need to find a specific trip fast.">
            <Frame src={SHOT('all-trips.png')} alt="All Trips list view" caption="Search by resident, unit, or provider name; filter by status" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Search by resident name, unit, or provider, and filter by status to narrow the list.</> },
              { k: 2, text: <>Click any row to open and edit that trip.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="sheet" num="05" title="Trip Sheet"
            dek="A printable roster for drivers — resident, pickup time, provider, driver, and a signature line, ready to hand off before the day starts.">
            <Frame src={SHOT('trip-sheet-modal.png')} alt="Daily Trip Sheet print preview" caption="Pick a From and To date to print one day or several" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">Trip Sheet</b> and set the <b className="text-slate-900">From</b> and <b className="text-slate-900">To</b> dates (it starts on the day you're viewing). The preview lists each day's trips.</> },
              { k: 2, text: <>Click <b className="text-slate-900">Print Sheet</b> to open a print-formatted page with resident, pickup, provider, driver, and mileage columns, plus driver and supervisor signature lines.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="requests" num="06" title="Ride Requests"
            dek="Nursing staff and IL residents ask for a ride; Transportation picks the pickup time and schedules it.">
            <Frame src={SHOT('ride-requests.png')} alt="Ride requests list" caption="Transportation sees each request with Schedule and Decline; the badge counts what's waiting" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Asking for a ride</h3>
            <Steps items={[
              { k: 1, text: <><b className="text-slate-900">Nursing staff:</b> in Transportation, click <b className="text-slate-900">Request a Ride</b>. Any drivers out are listed at the top; the one on your appointment date turns red, so pick another day if you can. Choose the resident, the appointment date and time, the type, where it is, and any needs (wheelchair, walker, escort). Click <b className="text-slate-900">Send request</b>.</> },
              { k: 2, text: <><b className="text-slate-900">IL residents:</b> in the resident portal, open <b className="text-slate-900">Rides → Request a Ride</b> and fill in the same details for themselves.</> },
              { k: 3, text: <>Track it on the <b className="text-slate-900">Requests</b> tab (residents: <b className="text-slate-900">Rides → My requests</b>). It shows <b className="text-slate-900">Requested</b>, then <b className="text-slate-900">Scheduled</b> with the ride date and pickup time, or <b className="text-slate-900">Declined</b> with the reason. You can <b className="text-slate-900">Cancel request</b> while it's still waiting.</> },
            ]} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Working the requests (Transportation)</h3>
            <Steps items={[
              { k: 1, text: <>A new request rings the bell for everyone in the Transportation department (Org Admins, if the department has nobody yet). The <b className="text-slate-900">Requests</b> tab shows how many are waiting.</> },
              { k: 2, text: <>Click <b className="text-slate-900">Schedule</b>. The trip form opens filled in from the request; set the <b className="text-slate-900">Pickup</b> time, driver, and vehicle, and save. The request turns Scheduled and the nurse who asked gets a bell.</> },
              { k: 3, text: <>Can't do it? Click <b className="text-slate-900">Decline</b> and give a reason. The requester sees it.</> },
            ]} />
            <Tip>Requests are never deleted. Nursing staff see every request filed by staff, so a nurse on the next shift can follow up. Residents see only their own requests and their own rides, never anyone else's.</Tip>
          </SectionBlock>

          <SectionBlock id="driversout" num="07" title="Drivers Out" roleNote="Transportation Manager"
            dek="Mark a driver out for a day, or several days, ahead of time so nobody books rides around them by mistake.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Adding a day off (Transportation Manager)</h3>
            <Steps items={[
              { k: 1, text: <>At the top of Transportation, in the amber <b className="text-slate-900">Drivers Out</b> box, click <b className="text-slate-900">+ Driver Out</b>.</> },
              { k: 2, text: <>Pick or type the driver, set the <b className="text-slate-900">First day out</b> and <b className="text-slate-900">Last day out</b> (the same day for a single day), and add a short note if it helps, such as "back at noon". Click <b className="text-slate-900">Save</b>.</> },
              { k: 3, text: <>To take one off, click the <b className="text-slate-900">×</b> next to it in the Drivers Out box.</> },
            ]} />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Where staff see it</h3>
            <Steps items={[
              { k: 1, text: <>The <b className="text-slate-900">Drivers Out</b> box at the top of Transportation lists every upcoming day off.</> },
              { k: 2, text: <>The Day, Week, Work Week, and Month views mark the day with an amber <b className="text-slate-900">Name out</b> chip.</> },
              { k: 3, text: <><b className="text-slate-900">Request a Ride</b> and <b className="text-slate-900">Schedule Trip</b> show who is out, and warn when the chosen date or driver is affected.</> },
            ]} />
            <Tip>Only the Transportation Manager, an Org Admin, or a super admin can add or remove a Driver Out notice; everyone else on staff can see them. Residents and families never see them in their portals. Keep the note practical; don’t include medical or personal reasons for the time off.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['See every trip for a month at a glance', 'Month View'],
            ['See this week’s trips day by day', 'Work Week or Week'],
            ['Mark a driver out ahead of time', 'Drivers Out → + Driver Out (Manager)'],
            ['Book a new medical transport', 'Schedule Trip'],
            ['Ask Transportation for a ride (Nursing)', 'Request a Ride'],
            ['Schedule or decline a ride request', 'Requests → Schedule / Decline'],
            ['Log actual pickup/return time and mileage', 'Open trip → Status → In Progress/Completed'],
            ['Find a specific past or future trip', 'All Trips → search'],
            ['Print a driver roster for the day', 'Day View → Trip Sheet → Print Sheet'],
          ]} />

          <GuideFooter label="Transportation Module" />
        </main>
      </div>
    </div>
  )
}
