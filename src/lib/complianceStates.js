// Shared state list + regulatory reference data for state-specific compliance content.
// A community operates under exactly one state's licensing authority, so this is
// driven by a single organizations.compliance_state value (set in Org Settings)
// rather than per-module selectors.

export const STATE_REFS = {
  MO: {
    label: 'Missouri',
    summary: 'Inspections follow NFPA 101 Life Safety Code (2012 edition), Missouri DHSS §19 CSR 30-85, NFPA 10/25/72/110, CMS Conditions of Participation, Missouri DOLIR elevator regulations, and §19 CSR 30-85.042(17) fire drill requirements.',
    retention: 'Maintain all completed inspection records for a minimum of 3 years.',
    authority: 'Missouri DHSS / CMS',
  },
  KS: {
    label: 'Kansas',
    summary: 'Inspections follow NFPA 101, Kansas KDHE K.A.R. 28-39, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years per KDHE requirements.',
    authority: 'Kansas KDHE / CMS',
  },
  IL: {
    label: 'Illinois',
    summary: 'Inspections follow NFPA 101, Illinois IDPH 77 Ill. Adm. Code 300, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years.',
    authority: 'Illinois IDPH / CMS',
  },
  AR: {
    label: 'Arkansas',
    summary: 'Inspections follow NFPA 101, Arkansas DPSQA Reg. 2000-F, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all completed inspection records for a minimum of 3 years.',
    authority: 'Arkansas DPSQA / CMS',
  },
  OK: {
    label: 'Oklahoma',
    summary: 'Inspections follow NFPA 101, Oklahoma OSDH OAC 310:675, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 3 years.',
    authority: 'Oklahoma OSDH / CMS',
  },
  TX: {
    label: 'Texas',
    summary: 'Inspections follow NFPA 101, Texas HHSC 40 TAC §19, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years per HHSC.',
    authority: 'Texas HHSC / CMS',
  },
  TN: {
    label: 'Tennessee',
    summary: 'Inspections follow NFPA 101, Tennessee TDH Rule 1200-08-06, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years.',
    authority: 'Tennessee TDH / CMS',
  },
  IN: {
    label: 'Indiana',
    summary: 'Inspections follow NFPA 101, Indiana ISDH 410 IAC 16.2, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 3 years.',
    authority: 'Indiana ISDH / CMS',
  },
  OH: {
    label: 'Ohio',
    summary: 'Inspections follow NFPA 101, Ohio ODH OAC 3701-17, NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years.',
    authority: 'Ohio ODH / CMS',
  },
  FL: {
    label: 'Florida',
    summary: 'Inspections follow NFPA 101, Florida AHCA 59A-4 F.A.C., NFPA 10/25/72/110, and CMS Conditions of Participation.',
    retention: 'Maintain all inspection records for a minimum of 5 years per AHCA.',
    authority: 'Florida AHCA / CMS',
  },
  OTHER: {
    label: 'Other / Federal Only',
    summary: 'Inspections follow NFPA 101 Life Safety Code, NFPA 10/25/72/110, and CMS Conditions of Participation (42 CFR Part 483).',
    retention: 'Maintain all completed inspection records for a minimum of 3 years per CMS requirements.',
    authority: 'CMS Federal',
  },
}

export const ALL_STATES = [
  { code: 'MO', label: 'Missouri' }, { code: 'KS', label: 'Kansas' },
  { code: 'IL', label: 'Illinois' }, { code: 'AR', label: 'Arkansas' },
  { code: 'OK', label: 'Oklahoma' }, { code: 'TX', label: 'Texas' },
  { code: 'TN', label: 'Tennessee' }, { code: 'IN', label: 'Indiana' },
  { code: 'OH', label: 'Ohio' }, { code: 'FL', label: 'Florida' },
  { code: 'AL', label: 'Alabama' }, { code: 'GA', label: 'Georgia' },
  { code: 'NC', label: 'North Carolina' }, { code: 'SC', label: 'South Carolina' },
  { code: 'VA', label: 'Virginia' }, { code: 'WV', label: 'West Virginia' },
  { code: 'KY', label: 'Kentucky' }, { code: 'MS', label: 'Mississippi' },
  { code: 'LA', label: 'Louisiana' }, { code: 'CA', label: 'California' },
  { code: 'AZ', label: 'Arizona' }, { code: 'CO', label: 'Colorado' },
  { code: 'NM', label: 'New Mexico' }, { code: 'NV', label: 'Nevada' },
  { code: 'WA', label: 'Washington' }, { code: 'OR', label: 'Oregon' },
  { code: 'ID', label: 'Idaho' }, { code: 'MT', label: 'Montana' },
  { code: 'WY', label: 'Wyoming' }, { code: 'UT', label: 'Utah' },
  { code: 'ND', label: 'North Dakota' }, { code: 'SD', label: 'South Dakota' },
  { code: 'NE', label: 'Nebraska' }, { code: 'MN', label: 'Minnesota' },
  { code: 'IA', label: 'Iowa' }, { code: 'WI', label: 'Wisconsin' },
  { code: 'MI', label: 'Michigan' }, { code: 'PA', label: 'Pennsylvania' },
  { code: 'NY', label: 'New York' }, { code: 'NJ', label: 'New Jersey' },
  { code: 'CT', label: 'Connecticut' }, { code: 'MA', label: 'Massachusetts' },
  { code: 'OTHER', label: 'Other / Federal Only' },
]
