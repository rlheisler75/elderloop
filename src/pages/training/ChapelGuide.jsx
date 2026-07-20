import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/chapel/${name}`

const NAV = [
  { id: 'dashboard', num: '01', label: 'Chaplain Dashboard' },
  { id: 'scheduling', num: '02', label: 'Scheduling a Service' },
  { id: 'live',       num: '03', label: 'Going Live' },
  { id: 'past',        num: '04', label: 'Past Services' },
]

export default function ChapelGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Chapel"
        dek="A working guide to the Chaplain Portal — scheduling services, streaming them live to YouTube, and keeping a record of past services and recordings."
        chips={['For: Chaplains, Activities staff, Supervisors', 'Where: Sidebar → Chapel', '4 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="dashboard" num="01" title="Chaplain Dashboard"
            dek="One screen for everything chapel-related — upcoming services, live stream status, average attendance, and a quick way to go live.">
            <Frame src={SHOT('chapel-dashboard.png')} alt="Chapel Management dashboard" caption="Stats, Live Stream Control, and the Go Live picker" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>The four stat tiles track <b className="text-slate-900">Upcoming Services</b>, <b className="text-slate-900">Avg Attendance</b> (calculated from past services with an attendance count logged), current <b className="text-slate-900">Stream Status</b>, and services scheduled <b className="text-slate-900">This Month</b>.</> },
              { k: 2, text: 'Live Stream Control on the left shows what’s currently streaming, or an offline placeholder when nothing is live.' },
              { k: 3, text: <>The <b className="text-slate-900">Go Live</b> panel on the right lists your next few upcoming services — click to start streaming any of them.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="scheduling" num="02" title="Scheduling a Service"
            dek="Title, type, date and time, and the YouTube links for both the live stream and (afterward) the recording — plus recurring service support.">
            <Frame src={SHOT('new-service-modal.png')} alt="New Chapel Service form" caption="YouTube Streaming section handles both live and recorded links" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Service</b>, pick a Service Type (Sunday Service, Wednesday Prayer, Bible Study, Special Event, Holiday, Other), and set the date and start time.</> },
              { k: 2, text: <>Paste the <b className="text-slate-900">Live Stream URL</b> ahead of time if you already know it — you can also paste just the video ID instead of the full link.</> },
              { k: 3, text: <>Turn on <b className="text-slate-900">Recurring service</b> and pick a day of the week for something like a standing Sunday service or weekly Bible study.</> },
            ]} />
            <Tip>You don't need the recording link when you first schedule a service — come back and edit it in afterward once the recording is posted, and it'll show up under Past Services with a Watch link.</Tip>
          </SectionBlock>

          <SectionBlock id="live" num="03" title="Going Live"
            dek="One click starts (or stops) streaming a service's YouTube link to the Live Stream Control panel, visible to anyone viewing Chapel.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>In the <b className="text-slate-900">Go Live</b> panel, click the green <b className="text-slate-900">Go Live</b> button next to the service you're starting.</> },
              { k: 2, text: <>A service without a stream URL saved shows a disabled <b className="text-slate-900">No URL</b> button instead — add the Live Stream URL by editing the service first.</> },
              { k: 3, text: <>Click <b className="text-slate-900">Stop Stream</b> in Live Stream Control when the service ends — only one service can be live at a time, starting a new one automatically stops any other.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="past" num="04" title="Past Services"
            dek="A running record of every service held, with officiant, attendance, and a link to the recording when one's been added.">
            <Frame src={SHOT('past-services.png')} alt="Past Services table" caption="Attendance and recording links for every past service" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: 'A service automatically moves from Upcoming to Past once its date passes — no action needed.' },
              { k: 2, text: <>Edit a past service afterward to fill in <b className="text-slate-900">Attendance</b> and the <b className="text-slate-900">Past Recording URL</b> — both feed the dashboard's Avg Attendance stat and the Watch link in this table.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Schedule a new service', 'New Service'],
            ['Set up a standing weekly service', 'New Service → Recurring service'],
            ['Start streaming a service', 'Go Live panel → Go Live'],
            ['End a live stream', 'Live Stream Control → Stop Stream'],
            ['Add attendance or a recording after the fact', 'Past Services → edit icon'],
            ['Check average attendance', 'Dashboard stat tiles'],
          ]} />

          <GuideFooter label="Chapel Module" />
        </main>
      </div>
    </div>
  )
}
