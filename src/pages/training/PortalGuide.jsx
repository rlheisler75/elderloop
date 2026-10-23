import { Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

// Written for families and residents, not staff. Text first; screenshots are added
// in the screenshot pass (public/training/portal/).
const NAV = [
  { id: 'start',    num: '01', label: 'Signing in' },
  { id: 'family',   num: '02', label: 'Family Portal' },
  { id: 'resident', num: '03', label: 'Resident Portal' },
  { id: 'rides',    num: '04', label: 'Requesting a ride' },
  { id: 'account',  num: '05', label: 'Your account & texts' },
  { id: 'privacy',  num: '06', label: 'Privacy & help' },
]

const B = ({ children }) => <b className="text-slate-900">{children}</b>
const H3 = ({ children }) => <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">{children}</h3>
const P = ({ children }) => <p className="text-[15px] text-slate-700 mb-6">{children}</p>

export default function PortalGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="For Families & Residents"
        title="Family & Resident Portal"
        dek="Stay connected with the community from your phone or computer: updates and photos, messages with staff, maintenance and meal requests, activities, chapel services, and rides."
        chips={['For: Family members, Independent Living residents', 'Where: elderloop.xyz/login', 'Works on any phone']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="start" num="01" title="Signing in"
            dek="The community sets up your login. You choose your own password.">
            <Steps items={[
              { k: 1, text: <>Watch for an email from <B>ElderLoop Support</B> (info@elderloop.xyz). Check your spam folder if it doesn't arrive.</> },
              { k: 2, text: <>Click the link in the email and choose a password (at least 12 characters).</> },
              { k: 3, text: <>From then on, sign in at <B>elderloop.xyz/login</B> with your email and password.</> },
            ]} />
            <P>Forgot your password? Click <B>Forgot password?</B> on the sign-in page and we'll email you a new link.</P>
            <Tip>On a phone, open the site in your browser and choose <b className="text-slate-900">Add to Home Screen</b>. It then opens like an app.</Tip>
          </SectionBlock>

          <SectionBlock id="family" num="02" title="Family Portal"
            dek="For family members linked to a resident. If you're linked to more than one resident, tap their name at the top to switch.">
            <Steps items={[
              { k: '•', text: <><B>Updates</B>: news and photos the staff post about your loved one.</> },
              { k: '•', text: <><B>Profile</B>: their room, care level, and the emergency and medical contacts on file, plus your relationship to them.</> },
              { k: '•', text: <><B>Messages</B>: tap <B>New Message</B>, choose a department (Nursing, Dining, Maintenance, Activities, and so on), and write. Staff reply in the same conversation, and a dot shows what's unread.</> },
              { k: '•', text: <><B>Requests</B>: tap <B>New Maintenance Request</B> to report something in their room. You'll see it go from Open to Completed.</> },
              { k: '•', text: <><B>Dining</B>: their diet details, and <B>Order Meal Delivery</B> to have a meal brought to their room.</> },
              { k: '•', text: <><B>Photos</B>, <B>Activities</B> (tap <B>RSVP</B> to sign them up), and <B>Chapel</B>, where you can watch services live or past recordings.</> },
            ]} />
            <P>The bell at the top shows community announcements and messages sent to families.</P>
          </SectionBlock>

          <SectionBlock id="resident" num="03" title="Resident Portal"
            dek="For Independent Living residents with their own login.">
            <Steps items={[
              { k: '•', text: <><B>Home</B>: today's activities, announcements, and quick buttons for <B>Request Repair</B> and <B>Order Food</B>. When a chapel service is live, a banner lets you watch it.</> },
              { k: '•', text: <><B>Maintenance</B>: tap <B>New Maintenance Request</B>, describe the problem, and choose how urgent it is. Housekeeping requests go straight to the housekeeping team.</> },
              { k: '•', text: <><B>Dining</B>: your diet details, recent meal orders, and <B>My Food Preferences</B>, where you tell the kitchen what you love and what to avoid.</> },
              { k: '•', text: <><B>Activities</B> (tap <B>RSVP</B> to sign up) and <B>Chapel</B> services.</> },
              { k: '•', text: <><B>Rides</B>: your upcoming rides and ride requests. See the next section.</> },
            ]} />
            <Tip warn>For emergencies, call the front desk or press your call button. Don't use the portal.</Tip>
          </SectionBlock>

          <SectionBlock id="rides" num="04" title="Requesting a ride" roleNote="Residents"
            dek="Ask the Transportation team for a ride to an appointment. They choose the pickup time.">
            <Steps items={[
              { k: 1, text: <>Open <B>Rides</B> and tap <B>Request a Ride</B>.</> },
              { k: 2, text: <>Enter the appointment date and time, the type (Medical, Dental, Therapy, Vision, Lab / Tests, Other), where it is, and anything you need, like a wheelchair or someone to go with you. Tap <B>Send request</B>.</> },
              { k: 3, text: <>Your request shows <B>Requested</B> until Transportation schedules it. Then it shows <B>Scheduled</B> with the ride date and pickup time, and the ride appears under <B>My upcoming rides</B>.</> },
              { k: 4, text: <>Plans changed? Tap <B>Cancel request</B> while it's still waiting. If a ride is already scheduled, call the front desk.</> },
            ]} />
            <P>If Transportation can't take you, the request shows <B>Declined</B> with the reason.</P>
            <Tip>You only ever see your own rides and requests. Nobody else's are shown to you.</Tip>
          </SectionBlock>

          <SectionBlock id="account" num="05" title="Your account & texts"
            dek="Tap the person icon at the top (My Account) to update your details.">
            <Steps items={[
              { k: '•', text: <><B>Profile</B>: your name and phone number.</> },
              { k: '•', text: <><B>Password</B>: choose a new password.</> },
              { k: '•', text: <><B>Notifications</B>: email notifications, and <B>Text Messages</B>.</> },
            ]} />
            <H3>Text messages</H3>
            <P>Texts are off until you turn them on. Add a mobile number to your profile first, then switch on <B>Text Messages</B> to get community announcements by text. Texts start with the community's name and are sent by Loopware Solutions LLC through ElderLoop. Message frequency varies, and message and data rates may apply. Reply <B>STOP</B> to any text to stop them, or <B>HELP</B> for help.</P>
          </SectionBlock>

          <SectionBlock id="privacy" num="06" title="Privacy & help"
            dek="What you can see, and who to ask.">
            <Steps items={[
              { k: '•', text: 'Families see only the residents they are linked to. Residents see only their own information.' },
              { k: '•', text: 'Texts and emails never include health information. Ask the care team in person or by phone about health questions.' },
              { k: '•', text: "Missing a resident, or seeing \"No Residents Linked\"? Ask the community's front desk to link your account." },
              { k: '•', text: 'Locked out or the link expired? Use Forgot password?, or ask the front desk to resend your invitation.' },
            ]} />
          </SectionBlock>

          <QuickRefTable rows={[
            ['Sign in', 'elderloop.xyz/login'],
            ['Reset my password', 'Sign-in page → Forgot password?'],
            ['Message the staff (family)', 'Messages → New Message'],
            ['Report something broken', 'Requests / Maintenance → New Maintenance Request'],
            ['Order a meal to the room', 'Dining → Order Meal Delivery / Order Food'],
            ['Sign up for an activity', 'Activities → RSVP'],
            ['Ask for a ride (residents)', 'Rides → Request a Ride'],
            ['Turn texts on or off', 'My Account → Notifications → Text Messages'],
          ]} />

          <GuideFooter label="Family & Resident Portal" />
        </main>
      </div>
    </div>
  )
}
