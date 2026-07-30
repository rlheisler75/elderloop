import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { X, Printer } from 'lucide-react'

const TODAY = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

export default function PccAuthorizationLetter({ orgId, onClose }) {
  const [org, setOrg] = useState(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('organizations')
      .select('name, address, city, state, zip, phone, contact_name, pcc_facility_id')
      .eq('id', orgId).single()
      .then(({ data }) => { if (!cancelled) setOrg(data) })
    return () => { cancelled = true }
  }, [orgId])

  const cityStateZip = org ? [org.city, [org.state, org.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-transparent print:p-0">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col print:max-w-none print:max-h-none print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 print:hidden">
          <div>
            <h2 className="font-display font-semibold text-slate-800 dark:text-slate-100">PointClickCare Authorization Letter</h2>
            <p className="text-xs text-slate-400 mt-0.5">Auto-filled with your community's info. Print it, save as PDF, or forward it to your PointClickCare account rep.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors">
              <Printer size={14} /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20} /></button>
          </div>
        </div>

        <style>{`
          @media print {
            @page { size: letter; margin: 0.6in; }
            body * { visibility: hidden; }
            #pcc-auth-letter, #pcc-auth-letter * { visibility: visible; }
            #pcc-auth-letter { position: absolute; top: 0; left: 0; width: 100%; }
          }
        `}</style>

        <div className="flex-1 overflow-y-auto px-6 py-5 print:overflow-visible print:p-0">
          {!org ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading...</div>
          ) : (
            <div id="pcc-auth-letter" className="mx-auto bg-white" style={{ width: '8.5in', minHeight: '11in', padding: '0.6in 0.7in', color: '#16202b', fontFamily: '"Source Sans 3", system-ui, sans-serif' }}>

              <div className="flex items-center justify-between pb-4 mb-6" style={{ borderBottom: '2px solid #0c2340' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-extrabold text-xs flex-shrink-0" style={{ background: '#0c90e1' }}>EL</div>
                  <div style={{ fontFamily: 'Georgia, "Playfair Display", serif', fontSize: 20, fontWeight: 700, color: '#0c2340' }}>ElderLoop</div>
                </div>
                <div className="text-right" style={{ fontSize: 11, color: '#55636f' }}>{TODAY}</div>
              </div>

              <p style={{ fontSize: 13, margin: '0 0 4px' }}>To: PointClickCare Account Representative</p>
              <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 20px', color: '#0c2340' }}>
                Re: Authorization to Enable Data Interoperability — {org.name}
              </p>

              <p style={{ fontSize: 12.5, lineHeight: 1.7, margin: '0 0 14px' }}>Dear PointClickCare Team,</p>
              <p style={{ fontSize: 12.5, lineHeight: 1.7, margin: '0 0 14px' }}>
                <strong>{org.name}</strong> is a PointClickCare customer that also uses <strong>ElderLoop</strong>, a senior
                living management platform, alongside PointClickCare for day-to-day community operations. We are requesting
                that PointClickCare enable an interoperability (API) connection between our facility and ElderLoop so that
                resident information can sync directly between the two systems.
              </p>
              <p style={{ fontSize: 12.5, lineHeight: 1.7, margin: '0 0 20px' }}>
                Please treat this letter as our authorization to share the applicable resident data — as permitted under our
                organization's existing PointClickCare agreement — with ElderLoop for this purpose.
              </p>

              <div className="grid grid-cols-2" style={{ gap: 24, marginBottom: 22 }}>
                <div>
                  <h3 style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#076bb0', fontWeight: 700, margin: '0 0 6px' }}>Facility Information</h3>
                  <div style={{ fontSize: 12, lineHeight: 1.8, border: '1px solid #e1e6e9', borderRadius: 10, padding: '10px 14px' }}>
                    <div><strong>Community:</strong> {org.name}</div>
                    {(org.address || cityStateZip) && <div><strong>Address:</strong> {[org.address, cityStateZip].filter(Boolean).join(', ')}</div>}
                    {org.phone && <div><strong>Phone:</strong> {org.phone}</div>}
                    <div><strong>PCC Facility ID:</strong> {org.pcc_facility_id || <span style={{ color: '#8a97a3' }}>(if known — otherwise leave blank)</span>}</div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#076bb0', fontWeight: 700, margin: '0 0 6px' }}>Vendor Information</h3>
                  <div style={{ fontSize: 12, lineHeight: 1.8, border: '1px solid #e1e6e9', borderRadius: 10, padding: '10px 14px' }}>
                    <div><strong>Company:</strong> Loopware Solutions LLC (ElderLoop)</div>
                    <div><strong>Contact:</strong> Robert Heisler</div>
                    <div><strong>Email:</strong> robert.heisler@loopwaresolutions.com</div>
                    <div><strong>Website:</strong> elderloop.xyz</div>
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 12.5, lineHeight: 1.7, margin: '0 0 30px' }}>
                Please reach out to the vendor contact above if any additional verification is needed to process this request.
                Thank you for your assistance.
              </p>

              <div style={{ borderTop: '1px solid #e1e6e9', paddingTop: 18 }}>
                <div className="grid grid-cols-2" style={{ gap: 24, fontSize: 12 }}>
                  <div>
                    <div style={{ borderBottom: '1px solid #16202b', height: 28 }} />
                    <div style={{ color: '#55636f', marginTop: 4 }}>Authorized Signature</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #16202b', height: 28, display: 'flex', alignItems: 'flex-end' }}>{org.contact_name || ''}</div>
                    <div style={{ color: '#55636f', marginTop: 4 }}>Printed Name / Title</div>
                  </div>
                  <div>
                    <div style={{ borderBottom: '1px solid #16202b', height: 28 }} />
                    <div style={{ color: '#55636f', marginTop: 4 }}>Date</div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
