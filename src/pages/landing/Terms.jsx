import { Link } from 'react-router-dom'

const EFFECTIVE_DATE = 'June 25, 2026'
const COMPANY = 'Loopware Solutions LLC'
const PRODUCT = 'ElderLoop'
const CONTACT = 'info@loopwaresolutions.com'
const STATE = 'Missouri'

function Section({ number, title, children }) {
  return (
    <div className="mb-10">
      <h2 className="font-display font-bold text-slate-800 text-xl mb-4 pb-2 border-b border-slate-100">
        {number}. {title}
      </h2>
      <div className="space-y-3 text-slate-600 leading-relaxed">{children}</div>
    </div>
  )
}

function Sub({ title, children }) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold text-slate-700 mb-2">{title}</h3>
      <div className="space-y-2 text-slate-600">{children}</div>
    </div>
  )
}

function Bullets({ items }) {
  return (
    <ul className="list-disc pl-6 space-y-1.5">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand-950 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src="/icon-192.png" alt="ElderLoop" className="w-full h-full object-cover" />
            </div>
            <span className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
          </Link>
          <Link to="/privacy" className="text-brand-300 hover:text-white text-sm transition-colors">Privacy Policy →</Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white border-b border-slate-200 py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-bold text-slate-900 text-4xl mb-3">Terms of Service</h1>
          <p className="text-slate-500">{COMPANY} · <strong>{PRODUCT}</strong></p>
          <p className="text-slate-400 text-sm mt-1">Effective Date: {EFFECTIVE_DATE} · Last Updated: {EFFECTIVE_DATE}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-10 text-sm text-amber-800">
          <strong>Please read these Terms carefully.</strong> By creating an account or using {PRODUCT}, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
        </div>

        <Section number="1" title="Acceptance of Terms">
          <p>These Terms of Service ("Terms") constitute a legally binding agreement between you ("Customer," "you," or "your") and {COMPANY}, a {STATE} limited liability company, governing your access to and use of the {PRODUCT} software platform and related services (the "Service").</p>
          <p>By creating an account, clicking "I Agree," or otherwise accessing or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you are entering into these Terms on behalf of an organization, you represent and warrant that you have authority to bind that organization.</p>
          <p>We reserve the right to update these Terms at any time. Continued use of the Service following notice of changes constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section number="2" title="Description of Service">
          <p>{PRODUCT} is a cloud-based management platform designed for senior living communities. The Service includes modules for resident management, staff scheduling, dietary planning, maintenance tracking, nursing notes, family communication, and related operational functions.</p>
          <Sub title="Subscription Plans">
            <Bullets items={[
              `Starter Plan — Free of charge, limited to 50 residents and 10 staff, with access to core modules only.`,
              `Essential Plan — $299 per month, including additional clinical and programming modules with no resident or staff limits.`,
              `Professional Plan — $999 per month, including all available modules with no limits and priority support.`,
            ]} />
          </Sub>
          <p>We reserve the right to modify, suspend, or discontinue any module or feature of the Service at any time with reasonable notice, and we will not be liable to you or any third party for any such modification.</p>
        </Section>

        <Section number="3" title="Account Registration and Security">
          <p>To use the Service, you must create an account by providing accurate, complete, and current information. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>
          <p>You must immediately notify us at <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a> of any unauthorized use of your account or any other breach of security. Each individual user of the Service must have their own account.</p>
        </Section>

        <Section number="4" title="Subscription, Billing, and Payment">
          <Sub title="4.1 Subscription Fees">
            <p>Paid subscription fees are billed monthly in advance. All fees are non-refundable except as expressly set forth in these Terms or required by applicable law. We reserve the right to change pricing at any time with at least 30 days' notice.</p>
          </Sub>
          <Sub title="4.2 Payment Processing">
            <p>Payment is processed through Stripe. By providing payment information, you authorize us to charge your payment method for all fees incurred. You represent that you are authorized to use the payment method provided.</p>
          </Sub>
          <Sub title="4.3 Upgrades and Downgrades">
            <p>You may upgrade your subscription at any time. Upgrades take effect immediately, and you will be charged a prorated amount for the remainder of your current billing cycle at the new rate. Downgrades take effect at the end of your current billing period.</p>
          </Sub>
          <Sub title="4.4 Non-Payment and Suspension">
            <p>If payment is not received within 10 days of the due date, we reserve the right to suspend or terminate your access to the Service. Reactivation may require payment of all outstanding amounts.</p>
          </Sub>
          <Sub title="4.5 Starter Plan">
            <p>The Starter Plan is provided free of charge subject to usage limitations. We reserve the right to modify or discontinue the Starter Plan at any time with 30 days' written notice.</p>
          </Sub>
        </Section>

        <Section number="5" title="Acceptable Use">
          <p>You agree to use the Service only for lawful purposes. You agree not to:</p>
          <Bullets items={[
            'Use the Service in any way that violates applicable federal, state, local, or international laws or regulations.',
            'Upload or store any data that infringes any third party\'s intellectual property rights, or that is defamatory or otherwise objectionable.',
            'Attempt to gain unauthorized access to any part of the Service, other accounts, or systems connected to the Service.',
            'Use automated means, including bots or scrapers, to access or index the Service or its data.',
            'Interfere with or disrupt the integrity or performance of the Service.',
            'Reproduce, sell, or exploit any portion of the Service without our express written permission.',
          ]} />
        </Section>

        <Section number="6" title="Data, Privacy, and Security">
          <Sub title="6.1 Customer Data">
            <p>"Customer Data" means all data you submit, upload, or input into the Service, including information about residents, staff, and facility operations. You retain all ownership rights to your Customer Data. By using the Service, you grant us a limited, non-exclusive license to store, process, and transmit your Customer Data solely to provide the Service to you.</p>
          </Sub>
          <Sub title="6.2 Health Information and HIPAA">
            <p>The Service may be used to store and process health-related information about residents, including clinical notes, medication records, and incident reports. You are solely responsible for ensuring that your use of the Service complies with all applicable laws governing health information, including HIPAA where applicable.</p>
            <p className="mt-2 font-medium text-slate-700">Business Associate Agreement (BAA): If you are a Covered Entity or Business Associate under HIPAA and intend to use the Service to create, receive, maintain, or transmit Protected Health Information ("PHI"), you must enter into a BAA with us before doing so. Contact us at <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a> to request a BAA. Use of the Service to process PHI without an executed BAA is strictly prohibited.</p>
          </Sub>
          <Sub title="6.3 Data Security">
            <p>We implement commercially reasonable technical and organizational measures to protect Customer Data. However, no method of transmission over the Internet is 100% secure.</p>
          </Sub>
          <Sub title="6.4 Data Retention and Deletion">
            <p>Upon termination of your subscription, we will retain your Customer Data for 90 days, during which you may request an export. After 90 days, we may permanently delete your Customer Data.</p>
          </Sub>
        </Section>

        <Section number="7" title="Intellectual Property">
          <p>The Service and all related software, algorithms, interfaces, and documentation are and remain the exclusive intellectual property of {COMPANY}. We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Service during your subscription term solely for your internal business operations.</p>
          <p>This license does not include the right to sublicense, modify, reverse engineer, decompile, or disassemble any part of the Service.</p>
        </Section>

        <Section number="8" title="Third-Party Services">
          <p>The Service integrates with third-party services including Stripe (payment processing), Resend (email delivery), and Supabase (database infrastructure). Your use of such services is subject to their respective terms and privacy policies. We are not responsible for the acts or omissions of any third-party service provider.</p>
        </Section>

        <Section number="9" title="Warranties and Disclaimers">
          <p className="uppercase font-medium text-sm text-slate-700">The Service is provided "as is" and "as available," without warranty of any kind, express or implied. To the fullest extent permitted by applicable law, {COMPANY} disclaims all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.</p>
          <p>The Service is designed as an operational management tool. It is not a substitute for professional medical, legal, or financial advice. Clinical decisions must always be made by qualified healthcare professionals.</p>
        </Section>

        <Section number="10" title="Limitation of Liability">
          <p className="uppercase font-medium text-sm text-slate-700">To the fullest extent permitted by applicable law, in no event shall {COMPANY}, its officers, directors, employees, or agents be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages arising out of or in connection with these Terms or your use of the Service.</p>
          <p className="uppercase font-medium text-sm text-slate-700">Our total cumulative liability to you for all claims shall not exceed the greater of (a) the amount you paid us in the twelve months preceding the claim, or (b) one hundred dollars ($100).</p>
        </Section>

        <Section number="11" title="Indemnification">
          <p>You agree to indemnify and hold harmless {COMPANY} and its officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to: (a) your use of the Service; (b) your Customer Data; (c) your violation of these Terms; or (d) your violation of any applicable law or third-party rights.</p>
        </Section>

        <Section number="12" title="Dispute Resolution">
          <Sub title="12.1 Informal Resolution">
            <p>Before initiating any formal dispute resolution, you agree to contact us at <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a> with a written description of your dispute. We will attempt to resolve it informally within 30 days.</p>
          </Sub>
          <Sub title="12.2 Binding Arbitration">
            <p>If informal resolution fails, any dispute arising out of or relating to these Terms shall be settled by binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. Arbitration shall take place in Springfield, {STATE}, or via video conference by mutual agreement. The arbitrator's decision shall be final and binding.</p>
          </Sub>
          <Sub title="12.3 Class Action Waiver">
            <p className="uppercase font-medium text-sm text-slate-700">You and {COMPANY} agree that each may bring claims only in an individual capacity, and not as a plaintiff or class member in any purported class or representative proceeding.</p>
          </Sub>
        </Section>

        <Section number="13" title="Governing Law">
          <p>These Terms shall be governed by and construed in accordance with the laws of the State of {STATE}, without regard to its conflict of law provisions. To the extent any claim is not subject to arbitration, the parties consent to the exclusive jurisdiction of the state and federal courts located in Greene County, {STATE}.</p>
        </Section>

        <Section number="14" title="Term and Termination">
          <p>Either party may terminate these Terms at any time upon written notice. We may suspend or terminate your access immediately if you breach these Terms, fail to pay fees when due, or engage in conduct that poses a risk to the Service or other users.</p>
          <p>Upon termination, your right to access and use the Service will immediately cease. Sections 6, 7, 9, 10, 11, 12, and 13 survive termination.</p>
        </Section>

        <Section number="15" title="General Provisions">
          <Bullets items={[
            `Entire Agreement: These Terms, together with our Privacy Policy, constitute the entire agreement between you and ${COMPANY} regarding the Service.`,
            `Severability: If any provision of these Terms is found unenforceable, the remaining provisions continue in full force.`,
            `Waiver: Our failure to enforce any provision shall not constitute a waiver of our right to enforce it in the future.`,
            `Assignment: You may not assign these Terms without our prior written consent. We may freely assign these Terms in connection with a merger or acquisition.`,
            `Notices: Legal notices to ${COMPANY} must be sent to ${CONTACT}.`,
          ]} />
        </Section>

        {/* Contact */}
        <div className="bg-slate-100 rounded-2xl p-6 mt-10">
          <h3 className="font-display font-bold text-slate-800 mb-2">Questions?</h3>
          <p className="text-slate-600 text-sm">Contact {COMPANY} at <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline font-medium">{CONTACT}</a></p>
        </div>

        <p className="text-center text-slate-400 text-xs mt-10">© {new Date().getFullYear()} {COMPANY}. All rights reserved.</p>
      </div>

      {/* Footer nav */}
      <div className="border-t border-slate-200 py-6 text-center">
        <div className="flex items-center justify-center gap-6 text-sm">
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">← Back to Home</Link>
          <Link to="/privacy" className="text-slate-400 hover:text-slate-600 transition-colors">Privacy Policy</Link>
          <Link to="/login" className="text-slate-400 hover:text-slate-600 transition-colors">Sign In</Link>
        </div>
      </div>
    </div>
  )
}
