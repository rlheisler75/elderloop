// State-specific Housekeeping / Environmental Services regulatory reference
// data — infection prevention & control, general sanitation/housekeeping
// standards, and pest control requirements.
//
// Keyed off the same organizations.compliance_state value as
// complianceStates.js / socialStateRefs.js (one state per org).
//
// SOURCING: see the header comment in socialStateRefs.js for the sourcing
// methodology — the same rules apply here. `confidence` below 'high' means
// verify against the primary source (`source`) before relying on it for an
// actual survey/inspection. Only Missouri has a live customer today; the
// other 9 states mirror the Compliance module's existing state list.

export const HOUSEKEEPING_STATE_REFS = {
  MO: {
    label: 'Missouri',
    infectionControl: {
      summary: 'Requires day-one infection-control orientation, ongoing in-service training, and employee communicable-disease screening policies. No state-specific Infection Preventionist role, credential, or dedicated hours beyond the federal baseline.',
      statute: '19 CSR 30-85.042',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/missouri/19-CSR-30-85-042',
    },
    sanitation: {
      summary: 'Soiled linen from incontinent residents must be washed/prewashed immediately; waste containers cleaned to prevent insect/rodent attraction; hot/cold tempered water at lavatories/tubs/showers. Deodorizers/sprays to mask odors are explicitly barred — odors must be eliminated at the source.',
      statute: '19 CSR 30-87.020',
      confidence: 'high',
      note: 'No specific laundry water-temperature figure found in this section.',
      source: 'https://www.law.cornell.edu/regulations/missouri/19-CSR-30-87-020',
    },
    pestControl: {
      summary: '"Effective measures" required to minimize rodents, flies, cockroaches, and other insects; exterior openings must be protected against rodent entry; screens ≥16-mesh-to-the-inch.',
      statute: '19 CSR 30-87.020',
      confidence: 'high',
      note: 'No mandatory pest-control-operator contract or documented inspection frequency found.',
      source: 'https://www.law.cornell.edu/regulations/missouri/19-CSR-30-87-020',
    },
  },

  KS: {
    label: 'Kansas',
    infectionControl: {
      summary: 'Requires an infection control program per CDC universal precautions/isolation/employee-health guidance, new-employee orientation, periodic in-service training, TB skin testing, and handwashing/linen-handling protocols. No state-specific IP title, certification, or dedicated hours found.',
      statute: 'K.A.R. 28-39-161',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-39-161',
    },
    sanitation: {
      summary: 'Housekeeping must maintain a "safe, sanitary, and comfortable environment" and help prevent infection transmission; interior/exterior kept clean, safe, and orderly.',
      statute: 'K.A.R. 28-39-407',
      confidence: 'medium',
      note: 'General language only — no specific cleaning-frequency schedule or laundry water temperature found.',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-39-407',
    },
    pestControl: {
      summary: '"The facility shall be kept free of insects, rodents, and vermin" — general statement.',
      statute: 'K.A.R. 28-39-407',
      confidence: 'medium',
      note: 'No mandatory pest-control-operator contract, inspection frequency, or documentation requirement found.',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-39-407',
    },
  },

  IL: {
    label: 'Illinois',
    infectionControl: {
      summary: 'Requires a designated Infection Preventionist with a minimum of 19 hours of specified training (precautions, HAI prevention, hand hygiene, environmental cleaning/sterilization, water management, occupational health, surveillance/epidemiology, antimicrobial stewardship) plus relevant clinical experience. Standard facilities need the IP on-site ≥20 hrs/week; high-acuity facilities (>100 licensed beds, or offering dialysis/infusion/ventilator care) need ≥40 hrs/week.',
      statute: '77 Ill. Adm. Code 300.696, 300.697',
      confidence: 'high',
      note: 'The most detailed, quantified Infection Preventionist requirement found across every state and module researched — worth surfacing prominently.',
      source: 'https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-77-SS-300.697',
    },
    sanitation: {
      summary: 'Requires a written housekeeping plan; building kept clean/safe/orderly; floors nonslip and free of tripping hazards; deodorants explicitly barred from covering unsanitary odors. Laundry: minimum 3 sets of sheets/draw sheets/pillowcases per resident bed, sanitary laundry-area operation, staff hand hygiene before/after handling soiled linen.',
      statute: '77 Ill. Adm. Code 300.2220, 300.2230',
      confidence: 'high',
      note: 'No specific water-temperature figure or cleaning-frequency schedule found.',
      source: 'https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-77-SS-300.2220',
    },
    pestControl: {
      summary: 'Grounds must be free of refuse/litter/insect/rodent breeding areas; building/grounds kept free of infestations by eliminating breeding/harborage sites, sealing entry points with ≥16-mesh screens, and repairing construction breaks.',
      statute: '77 Ill. Adm. Code 300.2210',
      confidence: 'high',
      note: 'No mandatory pest-control-operator contract or inspection-frequency requirement found.',
      source: 'https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-77-SS-300.2210',
    },
  },

  AR: {
    label: 'Arkansas',
    infectionControl: {
      summary: 'Explicitly defers to the federal standard for certified skilled nursing facilities: infection prevention and control is "governed by federal regulations at 42 C.F.R. § 483.80." Non-certified facility types need CDC-consistent written policies and TB screening.',
      statute: '20 CAR § 400-413',
      confidence: 'high',
      source: 'https://codeofarrules.arkansas.gov',
    },
    sanitation: {
      summary: 'Could not confirm a currently-numbered housekeeping/laundry section specific to the skilled-nursing-facility rule part. A secondary, unverified cross-reference mentions bedpan sanitization by boiling for a minimum of 20 minutes at least weekly, but the section number couldn\'t be confirmed against the current numbering.',
      statute: 'NOT FULLY VERIFIED',
      confidence: 'low',
      note: 'Parallel "housekeeping" sections exist in the regulations for different facility types (post-acute head injury/residential adult care; ICF/IID) — do not cite those for SNF compliance content. Recommend a follow-up direct read of the primary PDF.',
      source: 'https://www.humanservices.arkansas.gov/wp-content/uploads/Rules-for-Nursing-Homes-11.01.2024.pdf',
    },
    pestControl: {
      summary: 'No dedicated, confirmed pest-control section specific to the skilled-nursing-facility rule part was located, despite a targeted search.',
      statute: 'NOT FOUND',
      confidence: 'low',
      note: 'Federal 42 CFR 483.90(i) still applies as the floor regardless. Genuine research gap, not a claim that Arkansas has no rule — recommend a follow-up direct read of the primary PDF.',
      source: 'https://www.humanservices.arkansas.gov/wp-content/uploads/Rules-for-Nursing-Homes-11.01.2024.pdf',
    },
  },

  OK: {
    label: 'Oklahoma',
    infectionControl: {
      summary: 'Requires CDC universal precautions, a facility TB risk assessment, and resident TB testing within 30 days of admission. No dedicated IP hours/certification requirement beyond the federal baseline found.',
      statute: 'OAC 310:675-7-17.1',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/',
    },
    sanitation: {
      summary: 'Odor must be eliminated at the source (not masked); linen changed at least twice per bed; soiled linen removed at least every 8 hours.',
      statute: 'OAC 310:675-7-15.1',
      confidence: 'high',
      note: 'No specific laundry water-temperature figure found.',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/',
    },
    pestControl: {
      summary: 'Pest control via facility maintenance staff or a contracted pest control company, using "least toxic, least flammable, and most effective" methods.',
      statute: 'OAC 310:675-7-14.1',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/',
    },
  },

  TX: {
    label: 'Texas',
    infectionControl: {
      summary: 'Codifies specific Infection Preventionist qualification criteria: primary professional training in nursing, medical technology, microbiology, epidemiology, or a related field; qualified by education/training/experience/certification; completed specialized IP training; must work at least part-time at the facility and sit on the Quality Assessment and Assurance Committee.',
      statute: '26 TAC § 554.1601(c)',
      confidence: 'high',
      note: 'No formal certification credential or specific weekly-hour count is mandated beyond "part-time."',
      source: 'https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-554-1601',
    },
    sanitation: {
      summary: 'Hot water for laundry/kitchen use must normally be 140°F (dish sanitizing by hot water must reach 180°F). Linen must be washed/dried/stored/transported to be "hygienically clean," soiled and clean linen kept separated and not allowed to accumulate, and laundry areas physically separated from resident rooms with soiled/clean traffic separation.',
      statute: '26 TAC § 554.325, § 554.340',
      confidence: 'high',
      note: 'The most quantified sanitation rule (specific water temperatures) found among the 10 states researched.',
      source: 'https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-554-340',
    },
    pestControl: {
      summary: 'Requires an "effective, safe, and continuing" pest control system — facility personnel or a licensed pest control company (contract not mandatory), least-toxic/least-flammable products locked away from food areas, plus physical exclusion measures (self-closing exterior doors, sealed garbage).',
      statute: '26 TAC § 554.324',
      confidence: 'high',
      note: 'No inspection-frequency or documentation requirement found.',
      source: 'https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-554-324',
    },
  },

  TN: {
    label: 'Tennessee',
    infectionControl: {
      summary: 'Requires a comprehensive infection control program with isolation capability and physician-ordered isolation for contagious residents; standard precautions and CDC-aligned hand hygiene, with surveillance data fed back to stakeholders.',
      statute: 'Tenn. Code Ann. § 68-11-269; Tenn. Comp. R. & Regs. 0720-18-.06(3)',
      confidence: 'medium',
      note: 'The primary rule-text host blocked automated fetch — relied on secondary mirrors of the same codified rule.',
      source: 'https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0720-18-.06',
    },
    sanitation: {
      summary: 'Requires a designated housekeeping supervisor; buildings kept "in good repair, clean, sanitary and safe at all times"; individual wash cloths/towels/linens per resident; prompt replacement of wet/soiled linen; separated clean/soiled linen carts.',
      statute: 'Tenn. Comp. R. & Regs. 0720-18-.06',
      confidence: 'medium',
      note: 'No specific laundry water temperature found.',
      source: 'https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0720-18-.06',
    },
    pestControl: {
      summary: 'Prohibits conditions "conducive to harboring or breeding of insects, rodents or other vermin"; pest-control chemicals must be properly identified and stored away from food/medications.',
      statute: 'Tenn. Comp. R. & Regs. 0720-18-.06',
      confidence: 'medium',
      note: 'No mandatory contract, inspection frequency, or documentation requirement found.',
      source: 'https://www.law.cornell.edu/regulations/tennessee/Tenn-Comp-R-Regs-0720-18-.06',
    },
  },

  IN: {
    label: 'Indiana',
    infectionControl: {
      summary: 'Requires an infection control program with a specific state-added training requirement: all TB skin testing must use the Mantoux method (5 TU PPD), administered only by persons trained via a department-approved course.',
      statute: '410 IAC 16.2-3.1-18',
      confidence: 'high',
      note: 'No formal IP certification credential or minimum weekly-hours requirement beyond the TB-testing training mandate.',
      source: 'https://www.law.cornell.edu/regulations/indiana/410-IAC-16.2-3.1-18',
    },
    sanitation: {
      summary: 'Soiled linen must be "securely contained at the source"; clean commercial-laundry linen delivered to a designated clean area preventing contamination; common towels/washcloths/toilet articles prohibited; hot water at bathing/handwashing fixtures held between 100–120°F via automatic control valves.',
      statute: '410 IAC 16.2-3.1-19',
      confidence: 'high',
      note: 'The 100–120°F figure is a scald-prevention range for resident fixtures, not a laundry-processing water temperature — don\'t conflate the two. No specific cleaning-frequency schedule found.',
      source: 'https://www.law.cornell.edu/regulations/indiana/410-IAC-16.2-3.1-19',
    },
    pestControl: {
      summary: 'Facility must "maintain an effective pest control program so that the facility is free of pests and rodents" — essentially restates the federal baseline with no Indiana-specific addition found.',
      statute: '410 IAC 16.2-3.1-19',
      confidence: 'high',
      note: 'Indiana appears not to exceed the federal baseline here.',
      source: 'https://www.law.cornell.edu/regulations/indiana/410-IAC-16.2-3.1-19',
    },
  },

  OH: {
    label: 'Ohio',
    infectionControl: {
      summary: 'Requires a designated "infection prevention and control coordinator" — an appropriately licensed health professional with post-secondary education in a health-related field plus IC education/training/experience, working at least part-time, completing training across five specified core competency areas. Applies to all nursing homes regardless of bed count.',
      statute: 'OAC 3701-17-08, 3701-17-11',
      confidence: 'high',
      note: 'No formal certification credential or a quantified minimum weekly-hours figure is specified.',
      source: 'https://codes.ohio.gov/ohio-administrative-code/rule-3701-17-11',
    },
    sanitation: {
      summary: 'Hot water in resident-use areas must be maintained between 105–120°F; buildings/grounds "maintained in a clean and orderly manner"; plumbing free of leaks and odors; garbage disposed of immediately or stored in leak-proof, tight-covered containers.',
      statute: 'OAC 3701-17-22',
      confidence: 'high',
      note: 'The 105–120°F figure is a resident-area scald-prevention/sanitation range, not laundry-processing-specific. No cleaning-frequency schedule found.',
      source: 'https://codes.ohio.gov/ohio-administrative-code/rule-3701-17-22',
    },
    pestControl: {
      summary: '"Adequate measures" required to prevent entrance/infestation of insects, rodents, and pests; extermination "should be considered urgent," with remediation to commence as soon as possible.',
      statute: 'OAC 3701-17-22',
      confidence: 'high',
      note: 'No mandatory licensed pest-control-operator contract or specific inspection-frequency requirement found.',
      source: 'https://codes.ohio.gov/ohio-administrative-code/rule-3701-17-22',
    },
  },

  FL: {
    label: 'Florida',
    infectionControl: {
      summary: 'Lists "infection control" as a required written facility policy area and requires annual staff education on infection prevention/control. No dedicated Florida rule mandating a specific Infection Preventionist credential, certification, or hours-per-week beyond the federal designated-IP requirement was found.',
      statute: 'Fla. Admin. Code R. 59A-4.106(4)(l), (5)(c)(1)',
      confidence: 'medium',
      note: 'Florida likely does not exceed the federal baseline here.',
      source: 'https://www.law.cornell.edu/regulations/florida/Fla-Admin-Code-Ann-R-59A-4-106',
    },
    sanitation: {
      summary: 'Requires housekeeping/maintenance services "necessary to maintain a sanitary, orderly, and comfortable interior" and clean bed/bath linens in good condition. Florida previously had a dedicated, more specific "Housekeeping; Linen and Laundry" rule, but it has been repealed.',
      statute: 'Fla. Admin. Code R. 59A-4.122 (formerly also 59A-4.124, repealed)',
      confidence: 'medium',
      note: 'Florida now relies on general language plus the federal baseline rather than prescriptive housekeeping/laundry standards. No water-temperature or cleaning-frequency figures found.',
      source: 'https://flrules.org/gateway/ChapterHome.asp?Chapter=59A-4',
    },
    pestControl: {
      summary: 'Florida previously had a dedicated "Vermin Control" rule, but it has been repealed; a full-text search of the current chapter found zero mentions of "pest," "vermin," or "extermination."',
      statute: 'NOT FOUND (formerly 59A-4.125, repealed)',
      confidence: 'medium',
      note: 'Florida nursing homes appear to rely solely on the federal 42 CFR 483.90(i) baseline for pest control, with no additional state-specific requirement.',
      source: 'https://flrules.org/gateway/ChapterHome.asp?Chapter=59A-4',
    },
  },

  // Federal baseline — used for any state without a dedicated entry above.
  OTHER: {
    label: 'Other / Federal Only',
    infectionControl: {
      summary: 'Facility must establish and maintain an Infection Prevention and Control Program, designate at least one qualified Infection Preventionist with specialized training who works at least part-time at the facility, maintain an antibiotic stewardship program, and conduct facility-wide infection surveillance.',
      statute: '42 CFR 483.80',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.80',
    },
    sanitation: {
      summary: 'No single federal "housekeeping" citation beyond the Physical Environment requirement that the facility provide a safe, clean, comfortable, homelike environment, and general administration provisions on maintaining a sanitary environment.',
      statute: '42 CFR 483.90; 42 CFR 483.70',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.90',
    },
    pestControl: {
      summary: 'Facility must be free of pests and rodents.',
      statute: '42 CFR 483.90(i)',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.90',
    },
  },
}
