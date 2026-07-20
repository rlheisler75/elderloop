import { Frame, ShotsPair, Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

const SHOT = (name) => `/training/communication/${name}`

const NAV = [
  { id: 'board',     num: '01', label: 'Announcements Board' },
  { id: 'posting',   num: '02', label: 'Posting an Announcement' },
  { id: 'broadcast', num: '03', label: 'Broadcast Messaging' },
  { id: 'compose',   num: '04', label: 'Composing a Broadcast' },
]

export default function CommunicationGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Communication"
        dek="A working guide to the announcements board and broadcast messaging — how community updates get posted, and how staff reach residents, family, and each other directly."
        chips={['For: All staff, Admins, Supervisors', 'Where: Sidebar → Communication', '4 sections']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="board" num="01" title="Announcements Board"
            dek="A shared feed of community news — pinned items stay at the top, and the same posts can display on the Digital Signage screens.">
            <Frame src={SHOT('announcements-board.png')} alt="Communication Announcements board" caption="Filter by category; pinned posts always sort first" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Use the category chips (General, Birthday, Resident Spotlight, Event, Weather, Chapel, Menu, Alert) to filter the board, or search by title and message text.</> },
              { k: 2, text: <>Click <b className="text-slate-900">Digital Signage</b> to open the same announcements in the format shown on lobby and hallway screens.</> },
              { k: 3, text: <>Posts with a dashed amber border are scheduled and not visible yet — click the scheduled banner above the board to preview them before they go live.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="posting" num="02" title="Posting an Announcement"
            dek="Title and category are all that's required — photo, background color, scheduling, and pinning are all optional extras for making a post stand out.">
            <Frame src={SHOT('new-announcement-modal.png')} alt="New Announcement form" caption="Background color only affects how the post looks on Digital Signage" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Announcement</b>, add a title, and pick a category — the category sets the icon and color shown on the board.</> },
              { k: 2, text: <>Attach a photo (JPG, PNG, or GIF up to 5MB) if you have one — it displays under the message on both the board and Digital Signage.</> },
              { k: 3, text: <>Set a future <b className="text-slate-900">Post Date</b> to schedule it ahead of time, and an <b className="text-slate-900">Expiration Date</b> so it automatically stops showing once it's no longer relevant.</> },
              { k: 4, text: <>Check <b className="text-slate-900">Pin to top of board</b> for anything that should stay above the regular feed, like an elevator outage or a policy change.</> },
            ]} />
            <Tip>Background Color only matters for Digital Signage — it has no effect on how the post looks in the staff app itself.</Tip>
          </SectionBlock>

          <SectionBlock id="broadcast" num="03" title="Broadcast Messaging"
            dek="Direct messages to residents, family, and staff over in-app push, email, and SMS — separate from the announcements board, and only visible to admins, managers, and supervisors.">
            <Frame src={SHOT('broadcast-messaging.png')} alt="Broadcast Messaging tab" caption="Quick Send buttons prefill a message you can send in one more click" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>The stat tiles track <b className="text-slate-900">Total Sent</b>, <b className="text-slate-900">Sent Today</b>, <b className="text-slate-900">Push Delivered</b>, and <b className="text-slate-900">Emails Sent</b>.</> },
              { k: 2, text: <>Use a <b className="text-slate-900">Quick Send</b> button — Meal is ready, Activity starting, Emergency alert, Staff reminder — to prefill a message you can review and send right away.</> },
              { k: 3, text: <>Click any message in the log to expand it and see exact recipient counts and delivery status per channel.</> },
            ]} />
          </SectionBlock>

          <SectionBlock id="compose" num="04" title="Composing a Broadcast"
            dek="Pick channels, a category, and an audience — everyone, one group, a department, or specific people — then write and send.">
            <Frame src={SHOT('compose-modal.png')} alt="New Message compose form" caption="Individuals picker supports search by name, room, or email" />
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">How to use it</h3>
            <Steps items={[
              { k: 1, text: <>Click <b className="text-slate-900">New Message</b>, choose <b className="text-slate-900">Send via</b> channels (In-App, Email, SMS — SMS requires Twilio A2P registration and queues until approved), and a category.</> },
              { k: 2, text: <>Pick a <b className="text-slate-900">Send to</b> audience — Everyone, All Staff, All Residents, All Family, one Department, or specific Individuals via search.</> },
              { k: 3, text: <>Click <b className="text-slate-900">Templates</b> for ready-made subject and body text for common messages, or write your own Subject and Message.</> },
              { k: 4, text: <>Click <b className="text-slate-900">Send</b> — the footer always shows exactly which channels and audience the message is about to go to before you send it.</> },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Post a community update', 'New Announcement'],
            ['Pin something important to the top', 'New Announcement → Pin to top of board'],
            ['Schedule a post for later', 'New Announcement → Post Date'],
            ['View announcements on lobby screens', 'Digital Signage'],
            ['Send a direct message to residents or staff', 'Broadcast Messages tab → New Message'],
            ['Send a common message fast', 'Broadcast Messages tab → Quick Send'],
          ]} />

          <GuideFooter label="Communication Module" />
        </main>
      </div>
    </div>
  )
}
