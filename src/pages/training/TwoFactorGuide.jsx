import { Steps, Tip, SectionBlock, GuideHeader, GuideMasthead, GuideTOC, QuickRefTable, GuideFooter } from './TrainingComponents'

// Text only — demo logins can't add an authenticator (block_demo_mfa_enroll), so
// there are no screenshots for this guide.
const NAV = [
  { id: 'what',   num: '01', label: 'What it is & who needs it' },
  { id: 'setup',  num: '02', label: 'Setting it up' },
  { id: 'daily',  num: '03', label: 'Signing in each day' },
  { id: 'phones', num: '04', label: 'New or lost phone' },
  { id: 'admins', num: '05', label: 'For admins' },
]

export default function TwoFactorGuide() {
  return (
    <div className="min-h-screen bg-slate-50">
      <GuideHeader backTo="/training" backLabel="← All training guides" />
      <GuideMasthead
        eyebrow="ElderLoop Staff Training"
        title="Two-Factor Sign-In"
        dek="A second step after your password: a 6-digit code from an app on your phone. It keeps resident health information safe even if someone learns your password."
        chips={['For: Everyone (required for some roles)', 'Where: Settings → Two-Factor Sign-In', 'About 1 minute to set up']}
      />

      <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-[200px_minmax(0,1fr)] gap-10 py-4">
        <GuideTOC nav={NAV} />

        <main className="min-w-0">

          <SectionBlock id="what" num="01" title="What it is & who needs it"
            dek="After you type your password, ElderLoop asks for a code from an authenticator app on your phone. The code changes every 30 seconds, so a stolen password alone can't get anyone in.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Who must use it</h3>
            <p className="text-[15px] text-slate-700 mb-4">When your community has two-factor turned on, it is <b className="text-slate-900">required</b> for:</p>
            <Steps items={[
              { k: '•', text: 'Org Admins and the Administrator' },
              { k: '•', text: 'Anyone who has been made a Platform Admin' },
              { k: '•', text: 'Everyone in the Nursing or Social Services department, at any level' },
            ]} />
            <p className="text-[15px] text-slate-700 mb-6">Everyone else may turn it on by choice, and we recommend it.</p>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Which app to use</h3>
            <p className="text-[15px] text-slate-700 mb-6">
              Any authenticator app works: <b className="text-slate-900">Google Authenticator</b>, <b className="text-slate-900">Microsoft Authenticator</b>, <b className="text-slate-900">Duo Mobile</b>, or <b className="text-slate-900">1Password</b>. They're free. ElderLoop does not send codes by text message.
            </p>
            <Tip>Two-factor is turned on for a community by ElderLoop at the community's request, usually as part of go-live. If it's required for your role, you'll be asked to set it up the next time you sign in.</Tip>
          </SectionBlock>

          <SectionBlock id="setup" num="02" title="Setting it up"
            dek="If your role requires it, a setup screen appears right after your password. Otherwise, start from Settings.">
            <Steps items={[
              { k: 1, text: <>Install an authenticator app on your phone if you don't have one yet.</> },
              { k: 2, text: <>In ElderLoop, go to <b className="text-slate-900">Settings → Two-Factor Sign-In</b> and click <b className="text-slate-900">Turn on two-factor sign-in</b>. If your role requires it, the setup screen is already open after you sign in.</> },
              { k: 3, text: <>In the app, choose <b className="text-slate-900">Add account</b> and scan the QR code on the screen. Can't scan? Use the key shown under the code instead (the copy button copies it).</> },
              { k: 4, text: <>Type the 6-digit code the app now shows for ElderLoop and click <b className="text-slate-900">Turn on</b>. You're done. Settings shows <b className="text-slate-900">On</b>.</> },
            ]} />
            <Tip warn>If the code doesn't match, wait for the next code and try again. Codes only work for about 30 seconds. If it keeps failing, check that your phone's clock is set automatically.</Tip>
          </SectionBlock>

          <SectionBlock id="daily" num="03" title="Signing in each day"
            dek="Your password first, then the code. Nothing else changes.">
            <Steps items={[
              { k: 1, text: 'Sign in with your email and password as usual.' },
              { k: 2, text: <>On <b className="text-slate-900">Enter your code</b>, open your authenticator app and type the current 6-digit code for ElderLoop.</> },
              { k: 3, text: <>Click <b className="text-slate-900">Continue</b>. If you set up more than one phone, pick which one from the list first.</> },
            ]} />
            <Tip>Wrong codes are recorded in the audit log. A few mistyped codes are no problem. Just use the newest code in the app.</Tip>
          </SectionBlock>

          <SectionBlock id="phones" num="04" title="New or lost phone"
            dek="Add the new phone before you get rid of the old one. If the phone is already gone, an admin resets it for you.">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Getting a new phone</h3>
            <Steps items={[
              { k: 1, text: <>While you still have the old phone, go to <b className="text-slate-900">Settings → Two-Factor Sign-In → Add another phone</b> and set up the new one.</> },
              { k: 2, text: 'Remove the old phone with the trash icon next to it.' },
            ]} />
            <p className="text-[15px] text-slate-700 mb-6">If your role requires two-factor, you can't remove your only phone. Add the new one first.</p>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Lost, broken, or replaced phone</h3>
            <Steps items={[
              { k: 1, text: 'Ask your Org Admin to reset your two-factor sign-in.' },
              { k: 2, text: 'Sign in again. If your role requires it, you\'ll set up your new phone right away; otherwise turn it back on in Settings.' },
            ]} />
          </SectionBlock>

          <SectionBlock id="admins" num="05" title="For admins" roleNote="Org Admin"
            dek="See who has two-factor on, who still needs to set it up, and reset it when someone loses a phone.">
            <Steps items={[
              { k: 1, text: <>Open <b className="text-slate-900">Admin Panel → Users</b>. The <b className="text-slate-900">2FA</b> column shows <b className="text-slate-900">On</b>, <b className="text-slate-900">Setup due</b> (required for their role, they'll be asked at their next sign-in), or a dash.</> },
              { k: 2, text: <>To reset someone's phone, click the <b className="text-slate-900">reset</b> icon (circular arrow) on their row and confirm. Their old authenticator stops working for ElderLoop immediately.</> },
              { k: 3, text: 'Tell them to sign in again and set up their new phone.' },
            ]} />
            <Tip>Org Admins can reset two-factor for anyone in their community. The Administrator can too, if they've been made a Platform Admin. You can't reset your own. Ask another admin or ElderLoop support. Every reset is written to the audit log.</Tip>
          </SectionBlock>

          <QuickRefTable rows={[
            ['Turn on two-factor', 'Settings → Two-Factor Sign-In'],
            ['Add a new phone', 'Settings → Two-Factor Sign-In → Add another phone'],
            ['Remove an old phone', 'Settings → Two-Factor Sign-In → trash icon'],
            ['Lost my phone', 'Ask your Org Admin to reset it'],
            ['See who still needs to set it up', 'Admin Panel → Users → 2FA column'],
            ['Reset someone\'s two-factor', 'Admin Panel → Users → reset icon on their row'],
          ]} />

          <GuideFooter label="Two-Factor Sign-In" />
        </main>
      </div>
    </div>
  )
}
