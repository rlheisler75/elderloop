import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

const EFFECTIVE_DATE = 'June 25, 2026'
const COMPANY = 'Loopware Solutions LLC'
const PRODUCT = 'ElderLoop'
const CONTACT = 'info@loopwaresolutions.com'
const SITE = 'elderloop.xyz'

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

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand-950 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Heart size={13} className="text-white fill-white" />
            </div>
            <span className="text-white font-semibold" style={{ fontFamily: '"Playfair Display", serif' }}>ElderLoop</span>
          </Link>
          <Link to="/terms" className="text-brand-300 hover:text-white text-sm transition-colors">Terms of Service →</Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white border-b border-slate-200 py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display font-bold text-slate-900 text-4xl mb-3">Privacy Policy</h1>
          <p className="text-slate-500">{COMPANY} · <strong>{PRODUCT}</strong></p>
          <p className="text-slate-400 text-sm mt-1">Effective Date: {EFFECTIVE_DATE} · Last Updated: {EFFECTIVE_DATE}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">

        <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 mb-10 text-sm text-brand-800">
          This Privacy Policy describes how {COMPANY} collects, uses, shares, and protects information obtained through the {PRODUCT} platform. By using the Service, you agree to the practices described here.
        </div>

        <p className="text-slate-600 mb-8 leading-relaxed">This Privacy Policy applies to: (1) administrators and staff who use {PRODUCT} on behalf of their organization; (2) residents and family members who access the resident or family portal; and (3) visitors to {SITE}.</p>

        <Section number="1" title="Information We Collect">
          <Sub title="1.1 Account and Organization Information">
            <p>When you create an account or set up an organization, we collect:</p>
            <Bullets items={[
              'Name, email address, and password',
              'Organization name, address, and contact information',
              'Subscription and billing information (payment cards are processed by Stripe — we do not store full card numbers)',
              'User role and permissions within your organization',
            ]} />
          </Sub>
          <Sub title="1.2 Resident and Clinical Data">
            <p>As part of providing the Service, we store data that you and your staff enter about residents, including:</p>
            <Bullets items={[
              'Resident demographics (name, date of birth, room assignment, care level)',
              'Health information (nursing notes, vitals, medications, dietary preferences, incident reports)',
              'Emergency contacts and family information',
              'Activities, transportation, and scheduling records',
            ]} />
            <p className="mt-2">This information is entered by your staff and is considered Customer Data. You control what information is entered, who can access it, and how it is used. We process this data only on your behalf.</p>
          </Sub>
          <Sub title="1.3 Usage and Technical Data">
            <p>When you use the Service, we automatically collect:</p>
            <Bullets items={[
              'Log data (IP address, browser type, pages visited, timestamps)',
              'Device information (device type, operating system)',
              'Session information and feature usage patterns',
            ]} />
            <p className="mt-2">This is used to operate, maintain, and improve the Service, and to detect and prevent fraud and abuse.</p>
          </Sub>
          <Sub title="1.4 Communications">
            <p>If you contact us for support or communicate with us by email, we retain records of those communications.</p>
          </Sub>
        </Section>

        <Section number="2" title="How We Use Information">
          <p>We use the information we collect to:</p>
          <Bullets items={[
            'Provide, operate, and maintain the Service',
            'Process payments and manage your subscription',
            'Send transactional communications (account confirmations, invoices, password resets)',
            'Respond to support requests and inquiries',
            'Detect, investigate, and prevent security incidents and fraudulent activity',
            'Improve and develop new features for the Service',
            'Comply with applicable legal obligations',
          ]} />
          <p className="font-medium text-slate-700 mt-3">We do not use Customer Data (including resident health information) for advertising purposes. We do not sell Customer Data to third parties.</p>
        </Section>

        <Section number="3" title="How We Share Information">
          <Sub title="3.1 Service Providers">
            <p>We share information with trusted third-party providers who assist us in operating the Service, subject to confidentiality obligations:</p>
            <Bullets items={[
              'Supabase — database infrastructure and authentication',
              'Stripe — payment processing',
              'Resend — transactional email delivery',
              'Vercel — application hosting',
            ]} />
            <p className="mt-2">These providers are permitted to use your information only to provide services to us and are prohibited from using it for any other purpose.</p>
          </Sub>
          <Sub title="3.2 Legal Requirements">
            <p>We may disclose information if required by law, subpoena, or court order, or if we believe in good faith that disclosure is necessary to protect the rights, property, or safety of {COMPANY}, our users, or the public.</p>
          </Sub>
          <Sub title="3.3 Business Transfers">
            <p>If {COMPANY} is acquired or undergoes a similar corporate transaction, Customer Data may be transferred to the acquiring entity, subject to the same privacy protections described in this Policy.</p>
          </Sub>
        </Section>

        <Section number="4" title="Health Information and HIPAA">
          <p>The Service may be used to store and process health-related information about residents. Customers who are Covered Entities or Business Associates under HIPAA and who use the Service to handle Protected Health Information ("PHI") must execute a Business Associate Agreement ("BAA") with us prior to transmitting any PHI through the Service.</p>
          <p>We implement administrative, physical, and technical safeguards designed to protect health information stored in the Service. However, your organization remains responsible for ensuring your own compliance with HIPAA and any other applicable healthcare privacy laws.</p>
          <p>To request a BAA, please contact us at <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline font-medium">{CONTACT}</a>.</p>
        </Section>

        <Section number="5" title="Data Security">
          <p>We take the security of your data seriously and implement commercially reasonable measures, including:</p>
          <Bullets items={[
            'Encryption of data in transit using TLS/HTTPS',
            'Encryption of data at rest',
            'Role-based access controls limiting data access to authorized personnel',
            'Audit logging of data access and modification',
            'Regular security monitoring',
          ]} />
          <p>Despite these measures, no security system is impenetrable. In the event of a data breach that affects your organization, we will notify you in accordance with applicable law.</p>
        </Section>

        <Section number="6" title="Data Retention">
          <p>We retain Customer Data for the duration of your active subscription and for 90 days following termination, during which you may export your data. After the 90-day period, we will delete your Customer Data from our systems, except as required by applicable law.</p>
          <p>Aggregated, anonymized usage data that cannot identify you or your residents may be retained indefinitely.</p>
        </Section>

        <Section number="7" title="Your Rights and Choices">
          <Sub title="7.1 Access and Correction">
            <p>You may access, correct, or update your account information at any time through the Service settings or by contacting us at <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a>.</p>
          </Sub>
          <Sub title="7.2 Data Export">
            <p>You may request an export of your Customer Data at any time. We will provide data in a commonly used, machine-readable format within a reasonable time.</p>
          </Sub>
          <Sub title="7.3 Account Deletion">
            <p>You may request deletion of your account and associated Customer Data by contacting us at <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a>. Requests will be processed within 30 days, subject to our retention obligations.</p>
          </Sub>
          <Sub title="7.4 Marketing Communications">
            <p>You may opt out of marketing emails by clicking the unsubscribe link in any marketing email or by contacting us. Transactional communications (invoices, security alerts) cannot be opted out of while you maintain an active account.</p>
          </Sub>
          <Sub title="7.5 California Residents (CCPA)">
            <p>If you are a California resident, you may have additional rights under the CCPA, including the right to know what personal information we collect, the right to delete it, and the right to opt out of its sale. We do not sell personal information. To exercise your rights, contact us at <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a>.</p>
          </Sub>
        </Section>

        <Section number="8" title="Cookies and Tracking">
          <p>The Service uses cookies and similar technologies to maintain session state, remember your preferences, and analyze usage patterns. We do not use cookies for third-party advertising. You may control cookie settings through your browser, but disabling certain cookies may affect Service functionality.</p>
        </Section>

        <Section number="9" title="Third-Party Links">
          <p>The Service may contain links to third-party websites or services. We are not responsible for the privacy practices or content of those third parties. We encourage you to review the privacy policies of any third-party sites you visit.</p>
        </Section>

        <Section number="10" title="Children's Privacy">
          <p>The Service is designed for use by adults and senior living organizations. We do not knowingly collect personal information from individuals under the age of 18. If we become aware that we have collected personal information from a minor, we will take steps to delete such information promptly.</p>
        </Section>

        <Section number="11" title="International Data Transfers">
          <p>{PRODUCT} is operated from the United States. If you are located outside the United States, please be aware that information you submit through the Service may be transferred to and processed in the United States. By using the Service, you consent to the transfer of your information to the United States.</p>
        </Section>

        <Section number="12" title="Changes to This Privacy Policy">
          <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated Policy on the Service or by sending you an email. Your continued use of the Service following notice of changes constitutes your acceptance of the revised Policy.</p>
        </Section>

        <Section number="13" title="Contact Us">
          <p>If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:</p>
          <div className="mt-3 space-y-1 not-prose">
            <p><strong>{COMPANY}</strong></p>
            <p>Email: <a href={`mailto:${CONTACT}`} className="text-brand-600 hover:underline">{CONTACT}</a></p>
            <p>Website: <a href={`https://${SITE}`} className="text-brand-600 hover:underline">{SITE}</a></p>
            <p>State of Incorporation: Missouri</p>
          </div>
        </Section>

        <p className="text-center text-slate-400 text-xs mt-10">© {new Date().getFullYear()} {COMPANY}. All rights reserved.</p>
      </div>

      {/* Footer nav */}
      <div className="border-t border-slate-200 py-6 text-center">
        <div className="flex items-center justify-center gap-6 text-sm">
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">← Back to Home</Link>
          <Link to="/terms" className="text-slate-400 hover:text-slate-600 transition-colors">Terms of Service</Link>
          <Link to="/login" className="text-slate-400 hover:text-slate-600 transition-colors">Sign In</Link>
        </div>
      </div>
    </div>
  )
}
