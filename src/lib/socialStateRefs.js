// State-specific Social Services regulatory reference data — grievance response
// requirements, involuntary discharge/transfer notice rules, Long-Term Care
// Ombudsman contacts, and mandatory abuse-reporting requirements.
//
// Keyed off the same organizations.compliance_state value as complianceStates.js
// (one state per org — see that file's header comment for why).
//
// SOURCING: every fact below was researched against primary sources (state
// statute/regulation text, official .gov agency pages) where fetchable; where
// only a secondary source (legal-aid nonprofit, statute mirror site, law firm
// summary) could be reached, `confidence` is 'medium' or 'low' and a `note`
// explains the gap. Anything below 'high' confidence should be verified
// against the primary source (see `source`) before being relied on for an
// actual survey/inspection — this is reference material, not legal advice.
// Only Missouri has a live customer today; the other 9 states mirror the
// Compliance module's existing state list for when that changes.

export const SOCIAL_STATE_REFS = {
  MO: {
    label: 'Missouri',
    grievance: {
      summary: 'No fixed response-day requirement in state rule. Facility must designate a staff person to receive grievances and allow residents to complain to staff, the ombudsman, or any outside party.',
      statute: '19 CSR 30-88.010(20)',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/missouri/19-CSR-30-88-010',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: '19 CSR 30-82.050(5)',
      recipients: ['Resident', 'Legal representative', 'A family member (if known) — otherwise the regional Ombudsman office'],
      summary: 'Matches the federal 30-day floor. Notice must include the regional Long-Term Care Ombudsman\'s name, address, and phone.',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/missouri/19-CSR-30-82-050',
    },
    ombudsman: {
      programName: 'Missouri Long-Term Care Ombudsman Program',
      phone: '(800) 309-3282',
      website: 'https://health.mo.gov/seniors/ombudsman/',
      confidence: 'high',
      source: 'https://health.mo.gov/seniors/ombudsman/',
    },
    abuseReporting: {
      agency: 'Missouri DHSS Adult Abuse & Neglect / Nursing Home Hotline',
      phone: '1-800-392-0210',
      statute: 'RSMo § 198.070',
      window: 'Report immediately. DHSS must investigate within 24 hours; facility must notify the reporter in writing within 5 working days.',
      confidence: 'high',
      source: 'https://law.justia.com/codes/missouri/title-xii/chapter-198/section-198-070/',
    },
  },

  KS: {
    label: 'Kansas',
    grievance: {
      summary: 'No fixed response-day requirement. Regulation guarantees only "prompt efforts" to resolve grievances.',
      statute: 'K.A.R. 28-39-147(i)',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-39-147',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: 'K.S.A. 39-936; K.A.R. 28-39-148',
      recipients: ['Resident', 'Legal representative', 'Notice must list KDHE complaint program + Kansas LTC Ombudsman contact info', 'Kansas Advocacy and Protective Services (residents with developmental disability/mental illness)'],
      summary: 'Matches the federal 30-day floor, except safety/urgent medical emergencies.',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-39-148',
    },
    ombudsman: {
      programName: 'Office of the Kansas Long-Term Care Ombudsman',
      phone: '877-662-8362',
      altPhone: '785-296-3017 (local)',
      website: 'https://www.ombudsman.ks.gov/',
      confidence: 'high',
      source: 'https://www.ombudsman.ks.gov/contact-us',
    },
    abuseReporting: {
      agency: 'Kansas Dept. for Aging and Disability Services (KDADS)',
      phone: '1-800-842-0078',
      statute: 'K.S.A. 39-1401 / 39-1402',
      window: 'Report immediately, during the receiving department\'s normal weekday hours. Failure to report is a class B misdemeanor.',
      confidence: 'high',
      source: 'https://ksrevisor.gov/statutes/chapters/ch39/039_014_0002.html',
    },
  },

  IL: {
    label: 'Illinois',
    grievance: {
      summary: 'Facility grievance procedure must provide a timely response within 25 days by an impartial, non-affiliated third party (e.g. the LTC Ombudsman) if the facility hasn\'t resolved it.',
      statute: '210 ILCS 45/2-112 (Nursing Home Care Act)',
      confidence: 'medium',
      note: 'Sourced via a legal-aid nonprofit summary — ilga.gov\'s own statute pages blocked automated fetch, so the primary text wasn\'t directly confirmed.',
      source: 'https://www.illinoislegalaid.org/legal-information/understanding-nursing-home-residents-rights',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: '210 ILCS 45/3-401 et seq. (esp. Section 3-408)',
      recipients: ['Resident', 'Resident\'s representative', 'Illinois Dept. of Public Health', 'Copy placed in resident\'s clinical record'],
      summary: 'State text technically sets a 21-day minimum, shorter than the federal floor — but Medicare/Medicaid-certified facilities remain bound by the federal 30-day requirement (42 CFR 483.15(c)(3)) regardless, so 30 days is the effective number for virtually all facilities.',
      confidence: 'medium',
      note: 'The 21-vs-30 day discrepancy should be presented carefully to staff — don\'t let the shorter state figure override the federal floor for certified facilities.',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.15',
    },
    ombudsman: {
      programName: 'Illinois Long-Term Care Ombudsman Program (Dept. on Aging)',
      phone: '1-800-252-8966',
      altPhone: 'TTY 1-888-206-1327',
      website: 'https://ilaging.illinois.gov/programs/ltcombudsman.html',
      confidence: 'high',
      source: 'https://ilaging.illinois.gov/programs/ltcombudsman.html',
    },
    abuseReporting: {
      agency: 'Illinois Dept. of Public Health (IDPH) Nursing Home/LTC Hotline',
      phone: '1-800-252-4343',
      statute: '210 ILCS 30 (Abused and Neglected Long Term Care Facility Residents Reporting Act), § 4',
      window: 'Report immediately. Failure to report is a Class A misdemeanor.',
      confidence: 'medium',
      source: 'https://law.onecle.com/illinois/210ilcs30/4.html',
    },
  },

  AR: {
    label: 'Arkansas',
    grievance: {
      summary: 'No fixed response-day requirement found in the current Rules for Nursing Homes or in the Residents\' Rights statute — both use "prompt efforts"/policy language without a day count.',
      statute: '016.25.24 Ark. Code R. 002 §316; Ark. Code Ann. § 20-10-1204',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/arkansas/016-25-24-Ark-Code-R-002',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: 'Ark. Code Ann. § 20-10-1204; § 20-10-1005',
      recipients: ['Resident', 'Sponsor / legal representative', 'Other appropriate parties'],
      summary: 'Matches the federal 30-day floor, except emergency/welfare/safety exceptions.',
      confidence: 'high',
      source: 'https://law.justia.com/codes/arkansas/title-20/subtitle-2/chapter-10/subchapter-10/section-20-10-1005/',
    },
    ombudsman: {
      programName: 'Arkansas Long-Term Care Ombudsman Program',
      phone: '(866) 245-5498',
      website: 'https://arombudsman.dhs.arkansas.gov/',
      confidence: 'medium',
      note: 'Program name/URL confirmed on the official state portal; the phone number was corroborated across multiple Area Agency on Aging sites rather than pulled directly off the .gov page.',
      source: 'https://portal.arkansas.gov/service/ar-state-long-term-care-ombudsman/',
    },
    abuseReporting: {
      agency: 'Arkansas Adult Maltreatment Hotline',
      phone: '1-800-482-8049',
      statute: 'Ark. Code Ann. § 12-12-1701 to § 12-12-1721 (Adult and Long-Term Care Facility Resident Maltreatment Act), esp. § 12-12-1708',
      window: 'Facility staff must immediately notify the person in charge, who must report within 24 hours or the next business day, whichever is earlier. Must also go immediately to local law enforcement.',
      confidence: 'medium',
      source: 'https://law.onecle.com/arkansas/title-12/12-12-1708.html',
    },
  },

  OK: {
    label: 'Oklahoma',
    grievance: {
      summary: 'No fixed response-day requirement — "prompt efforts to resolve grievances," mirroring federal language.',
      statute: '63 O.S. § 1-1918 (Nursing Home Care Act)',
      confidence: 'medium',
      note: 'A separate rule (OAC 310:678-5-9) sets a 7-business-day response, but that\'s a general DHS client-complaint mechanism, not specific to nursing facility licensure — don\'t cite it as the nursing-home grievance deadline.',
      source: 'https://law.justia.com/codes/oklahoma/2021/title-63/section-63-1-1918/',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: 'OAC § 310:675-7-4',
      recipients: ['Resident', 'Legal representative'],
      summary: 'Matches the federal 30-day floor. Resident/representative may request a hearing within 10 days; the Department must convene it within 10 working days, and the facility generally cannot discharge while a hearing is pending.',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/OAC-310-675-7-4',
    },
    ombudsman: {
      programName: 'Office of the State Long-Term Care Ombudsman (Oklahoma Attorney General)',
      phone: '1-800-211-2116',
      website: 'https://www.oklahoma.gov/oag/about/divisions/ltco.html',
      confidence: 'high',
      source: 'https://www.oklahoma.gov/oag/about/divisions/ltco.html',
    },
    abuseReporting: {
      agency: 'Oklahoma DHS Adult Protective Services Abuse & Neglect Hotline',
      phone: '1-800-522-3511',
      statute: '43A O.S. § 10-104 (Protective Services for Vulnerable Adults Act)',
      window: 'Report immediately / as soon as aware. No specific hour-count deadline found in statute text.',
      confidence: 'medium',
      source: 'https://law.justia.com/codes/oklahoma/2015/title-43a/section-43a-10-104v2',
    },
  },

  TX: {
    label: 'Texas',
    grievance: {
      summary: 'No fixed response-day requirement — "prompt efforts by the facility to resolve grievances."',
      statute: '26 Tex. Admin. Code § 554.408',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-554-408',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: '26 TAC § 554.502',
      recipients: ['Resident', 'Resident representative', 'Long-Term Care Ombudsman Program (copy sent when notice is presented to the resident)'],
      summary: 'Matches the federal 30-day floor. Shorter notice allowed only for genuine emergencies.',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-554-502',
    },
    ombudsman: {
      programName: 'Office of the State Long-Term Care Ombudsman (Texas HHSC)',
      phone: '1-800-252-2412',
      altPhone: '512-438-4265 (main office)',
      website: 'https://ltco.texas.gov/',
      confidence: 'high',
      source: 'https://ltco.texas.gov/about-us',
    },
    abuseReporting: {
      agency: 'Texas Abuse Hotline (DFPS/HHSC)',
      phone: '1-800-252-5400',
      statute: 'Tex. Health & Safety Code § 260A.002',
      window: 'Report immediately (oral/electronic). Written provider investigation report due to HHSC no later than the 5th day after the oral report.',
      confidence: 'medium',
      note: 'Statute text pulled via a secondary aggregator, not the official statutes.capitol.texas.gov PDF — worth a direct pull before publishing.',
      source: 'https://statutes.capitol.texas.gov/Docs/HS/pdf/HS.260A.pdf',
    },
  },

  TN: {
    label: 'Tennessee',
    grievance: {
      summary: 'No fixed response-day requirement — facility must "establish a grievance procedure," but no deadline is specified.',
      statute: 'Tenn. Comp. R. & Regs. 0720-18-.12',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0720-18-.12',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: 'Tenn. Comp. R. & Regs. 0720-18-.05',
      recipients: ['Resident', 'Resident representative', 'State LTC Ombudsman — same-day email to ombudsman.notification@tn.gov'],
      summary: 'Matches the federal 30-day floor. Tennessee-specific: notice emailed to the Ombudsman the same day it\'s given to the resident; add 5 extra days if the notice is mailed rather than hand-delivered.',
      confidence: 'medium',
      note: 'Could not directly fetch the raw administrative-code text (site blocked); this is search-engine-synthesized from official TN.gov/TennCare pages, not a direct quote.',
      source: 'https://www.tn.gov/disability-and-aging/disability-aging-programs/long-term-care-ombudsman/transfers-and-discharges-faq.html',
    },
    ombudsman: {
      programName: 'Office of the State Long-Term Care Ombudsman (TN Commission on Aging and Disability)',
      phone: '1-877-236-0013',
      website: 'https://www.tn.gov/disability-and-aging/disability-aging-programs/long-term-care-ombudsman.html',
      confidence: 'high',
      source: 'https://www.tn.gov/disability-and-aging/disability-aging-programs/long-term-care-ombudsman.html',
    },
    abuseReporting: {
      agency: 'TN Division of Adult Protective Services',
      phone: '1-888-277-8366',
      statute: 'Tenn. Code Ann. § 71-6-103 (universal mandatory reporting — everyone, not just professionals); failure to report is a Class A misdemeanor under § 71-6-110',
      window: 'No specific numeric deadline codified — report required, but no "within X hours" window found.',
      confidence: 'medium',
      source: 'https://law.justia.com/codes/tennessee/title-71/chapter-6/part-1/section-71-6-103/',
    },
  },

  IN: {
    label: 'Indiana',
    grievance: {
      summary: 'No fixed response-day requirement — "prompt efforts by the facility to resolve grievances."',
      statute: '410 IAC 16.2-3.1-7',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/indiana/410-IAC-16.2-3.1-7',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: '410 IAC 16.2-3.1-12',
      recipients: ['Resident', 'Known family member', 'Known legal representative', 'The person/agency responsible for the resident\'s placement/care', 'Local Long-Term Care Ombudsman program'],
      summary: 'Matches the federal 30-day floor. Indiana-specific: a resident who appeals cannot be discharged for up to 34 days after receiving notice, and has 10 days from receipt to postmark a hearing request with the Indiana State Dept. of Health.',
      confidence: 'medium',
      note: 'The 30-day/recipients figure is primary-source-verified; the 34-day appeal-hold figure comes from the official state discharge-notice form rather than directly-fetched administrative code text.',
      source: 'https://www.law.cornell.edu/regulations/indiana/410-IAC-16.2-3.1-12',
    },
    ombudsman: {
      programName: 'Indiana State Long-Term Care Ombudsman Program',
      phone: '1-800-622-4484',
      altPhone: '317-232-7134',
      website: 'https://www.in.gov/ombudsman/long-term-care-ombudsman/',
      confidence: 'high',
      source: 'https://www.in.gov/ombudsman/long-term-care-ombudsman/contact-information/',
    },
    abuseReporting: {
      agency: 'Indiana Adult Protective Services',
      phone: '1-800-992-6978',
      statute: 'Indiana Code 12-10-3-9 (Duty to Report Endangered Adult — universal, not limited to professionals)',
      window: 'No specific numeric deadline confirmed in statute text.',
      confidence: 'medium',
      note: 'A separately-circulating "1-800-246-8909" nursing-home-specific number and a "48-hour" reporting window for healthcare professionals could NOT be verified against primary statute text — do not publish those two figures without direct confirmation against IC 12-10-3.',
      source: 'https://www.in.gov/fssa/ddars/bba/adult-protective-services/',
    },
  },

  OH: {
    label: 'Ohio',
    grievance: {
      summary: 'Facility-internal correction/escalation mechanism rather than a simple response deadline: if a grievance-committee-identified violation isn\'t corrected within 10 days, the committee must refer it to the Ohio Dept. of Health, which then has 30 days to investigate.',
      statute: 'ORC § 3721.17',
      confidence: 'high',
      source: 'https://codes.ohio.gov/ohio-revised-code/section-3721.17',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: 'ORC § 3721.16',
      recipients: ['Resident', 'Resident\'s sponsor — by certified mail, return receipt requested', 'Ohio Dept. of Health (copy from the administrator)'],
      summary: 'Matches the federal 30-day floor, with exceptions for improved health, residency under 30 days, or emergencies. Notice must include the state LTC ombudsman program\'s contact info (statute doesn\'t require the ombudsman be directly copied, just referenced in the notice).',
      confidence: 'high',
      source: 'https://codes.ohio.gov/ohio-revised-code/section-3721.16',
    },
    ombudsman: {
      programName: 'Ohio Dept. of Aging, State Long-Term Care Ombudsman Program',
      phone: '1-800-282-1206',
      website: 'https://aging.ohio.gov/care-and-living/ombudsman',
      confidence: 'medium',
      note: 'Program name/URL confirmed on the official ODA page; the specific phone number was confirmed via a regional ombudsman nonprofit PDF rather than directly off the ODA page.',
      source: 'https://aging.ohio.gov/care-and-living/ombudsman',
    },
    abuseReporting: {
      agency: 'Ohio Dept. of Health',
      phone: '',
      statute: 'ORC § 3721.22 — designated individuals (incl. licensed administrators) who know/suspect abuse, neglect, exploitation, or misappropriation must report; administrators report to the Director of Health, others to the facility.',
      window: 'No specific numeric deadline found in statute text.',
      confidence: 'low',
      note: 'The commonly-cited hotline (1-800-342-0553) could NOT be confirmed on an official odh.ohio.gov page (404\'d) — only found on law-firm blogs. Confirm directly with ODH before publishing a phone number.',
      source: 'https://codes.ohio.gov/ohio-revised-code/section-3721.22',
    },
  },

  FL: {
    label: 'Florida',
    grievance: {
      summary: 'No fixed response-day requirement — resident has "the right to prompt efforts by the facility to resolve resident grievances."',
      statute: 'Fla. Stat. § 400.022(1)(d)',
      confidence: 'high',
      source: 'https://www.flsenate.gov/Laws/Statutes/2025/400.022',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: 'Fla. Stat. § 400.0255',
      recipients: ['Resident', 'Family member/legal guardian/representative (if known)', 'Local ombudsman council — within 5 business days of the resident/designee signing the notice'],
      summary: 'Matches the federal 30-day floor except in emergencies. Florida-specific: if the resident requests ombudsman review, the facility must forward the request within 24 hours, which tolls (pauses) the 30-day notice period.',
      confidence: 'high',
      source: 'https://www.flsenate.gov/Laws/Statutes/2024/400.0255',
    },
    ombudsman: {
      programName: 'Florida Long-Term Care Ombudsman Program (Dept. of Elder Affairs)',
      phone: '1-888-831-0404',
      altPhone: '850-414-2323 (local)',
      website: 'https://ombudsman.elderaffairs.org/',
      confidence: 'high',
      source: 'https://ombudsman.elderaffairs.org/contact-us/',
    },
    abuseReporting: {
      agency: 'Florida Abuse Hotline (Dept. of Children and Families)',
      phone: '1-800-962-2873',
      statute: 'Fla. Stat. § 415.1034',
      window: 'Report immediately — statute uses "immediately," not a specific hour count.',
      confidence: 'high',
      source: 'https://www.flsenate.gov/Laws/Statutes/2025/415.1034',
    },
  },

  // Federal baseline — used for any state without a dedicated entry above.
  OTHER: {
    label: 'Other / Federal Only',
    grievance: {
      summary: 'Facilities must establish a grievance process and make prompt efforts to resolve resident grievances. No fixed federal response-day deadline.',
      statute: '42 CFR 483.10(j)',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.10',
    },
    involuntaryDischarge: {
      noticeDays: 30,
      statute: '42 CFR 483.15(c)(3)',
      recipients: ['Resident', 'Resident representative', 'State Long-Term Care Ombudsman (copy of notice)'],
      summary: 'At least 30 days\' written notice, in a language/manner the resident understands, with reasons recorded in the medical record. Shortened ("as soon as practicable") only when: health/safety of others is endangered, the resident\'s urgent medical needs require faster transfer, or the resident\'s health has improved enough to allow it.',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.15',
    },
    ombudsman: {
      programName: 'Eldercare Locator (Administration for Community Living) — connects you to your state/local Ombudsman program',
      phone: '1-800-677-1116',
      website: 'https://eldercare.acl.gov/',
      confidence: 'high',
      source: 'https://eldercare.acl.gov/',
    },
    abuseReporting: {
      agency: 'Contact your state Adult Protective Services or state survey agency directly',
      phone: '',
      statute: '42 U.S.C. § 1150b (Elder Justice Act) — covered individuals must report reasonable suspicion of a crime against a resident to the state agency and law enforcement.',
      window: 'Immediately, and no later than 2 hours after forming the suspicion if it resulted in serious bodily injury; no later than 24 hours otherwise.',
      confidence: 'high',
      source: 'https://www.ssa.gov/OP_Home/ssact/title11/1150B.htm',
    },
  },
}
