// State-specific Dietary Services regulatory reference data — food safety/
// sanitation code, menu & therapeutic diet requirements, and dietitian
// oversight requirements.
//
// Keyed off the same organizations.compliance_state value as
// complianceStates.js / socialStateRefs.js (one state per org).
//
// SOURCING: see the header comment in socialStateRefs.js for the sourcing
// methodology — the same rules apply here. `confidence` below 'high' means
// verify against the primary source (`source`) before relying on it for an
// actual survey/inspection. Only Missouri has a live customer today; the
// other 9 states mirror the Compliance module's existing state list.

export const DIETARY_STATE_REFS = {
  MO: {
    label: 'Missouri',
    foodCode: {
      summary: 'Adapted from a 1976 FDA model food ordinance, not the modern FDA Food Code. If dietary is contracted to an outside vendor, must also comply with the general Missouri Food Code (13 CSR 15-17).',
      statute: '19 CSR 30-87.030',
      confidence: 'medium',
      note: 'DHSS inspects roughly twice per state fiscal year per a secondary DHSS page — that cadence isn\'t stated in the rule itself.',
      source: 'https://www.sos.mo.gov/cmsimages/adrules/csr/current/19csr/19c30-87.pdf',
    },
    menuRequirements: {
      summary: 'Menus planned ≥2 weeks ahead, minimum 3-week cycle, current week posted, each day dated and kept on file 30 days. Special/prescribed diet menus need written dietitian, RN, or physician approval. A Division-approved diet manual must be available to physicians, nursing, and dietary staff.',
      statute: '19 CSR 30-85.052(16), (21), (23)',
      confidence: 'high',
      source: 'https://www.sos.mo.gov/cmsimages/adrules/csr/current/19csr/19c30-85.pdf',
    },
    dietitianOversight: {
      summary: 'Facility must employ a full-time food service supervisor (no CDM certification required). A consultant dietitian is required only if the Division determines diet complexity or the supervisor\'s competency warrants it — no fixed hours/month are set.',
      statute: '19 CSR 30-85.052(15), (18)',
      confidence: 'high',
      source: 'https://www.sos.mo.gov/cmsimages/adrules/csr/current/19csr/19c30-85.pdf',
    },
  },

  KS: {
    label: 'Kansas',
    foodCode: {
      summary: 'Contains its own self-contained sanitation requirements (e.g. dish-machine rinse temperature ≥160°F) rather than adopting the statewide Kansas Food Code by reference.',
      statute: 'K.A.R. 28-39-158',
      confidence: 'medium',
      note: 'Retrieved via a secondary mirror — the state\'s own regulations portal could not be loaded directly during research.',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-39-158',
    },
    menuRequirements: {
      summary: 'Menus for all diets and therapeutic modifications written ≥2 weeks in advance and approved by a licensed dietitian. Records of foods purchased and meals/snacks actually served kept on file 3 months.',
      statute: 'K.A.R. 28-39-158',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-39-158',
    },
    dietitianOversight: {
      summary: 'A full-time employee (licensed dietitian, or a dietetic services supervisor receiving "regularly scheduled onsite supervision" from a licensed dietitian) must hold overall supervisory responsibility. No fixed hours/month figure or CDM requirement found.',
      statute: 'K.A.R. 28-39-158',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-39-158',
    },
  },

  IL: {
    label: 'Illinois',
    foodCode: {
      summary: 'Facilities must comply with IDPH\'s "Food Code" (77 Ill. Adm. Code 750). IDPH conducts annual unannounced inspections/surveys of all facilities.',
      statute: '77 Ill. Adm. Code 300.2100; Nursing Home Care Act § 3-212(a)',
      confidence: 'high',
      source: 'https://www.ilga.gov/agencies/JCAR/EntirePart?titlepart=07700300',
    },
    menuRequirements: {
      summary: 'Menus planned ≥1 week ahead, current week dated and available, records of menus as served kept ≥30 days. Diet orders must come from a physician/APRN/PA (delegable to a dietitian), signed, with defined review cadence: oral liquid diets every 48 hrs, soft/transitional every 3 weeks, other therapeutic diets at least every 3 months.',
      statute: '77 Ill. Adm. Code 300.2040, 300.2080',
      confidence: 'high',
      source: 'https://www.ilga.gov/agencies/JCAR/EntirePart?titlepart=07700300',
    },
    dietitianOversight: {
      summary: 'Full-time Director of Food Services required, on duty ≥40 hrs/week. If not a dietitian, needs "frequent and regularly scheduled" RD consultation with a numeric floor: 8 hrs/month for ≤50 residents, plus ~4 (ICF) or ~5 (SNF) additional minutes/month per resident over 50. No CDM certification is mandated.',
      statute: '77 Ill. Adm. Code 300.2010',
      confidence: 'high',
      note: 'The most precisely quantified dietary staffing formula found across the 10 states researched.',
      source: 'https://www.ilga.gov/agencies/JCAR/EntirePart?titlepart=07700300',
    },
  },

  AR: {
    label: 'Arkansas',
    foodCode: {
      summary: 'Own detailed sanitation rules embedded directly in the nursing home regulations (e.g. refrigeration ≤45°F, freezer 0°F, 3-compartment manual dishwashing at 100–120°F) rather than adopting the statewide retail food code. Facility is subject to inspection "for reasonable cause at any time" — no fixed periodic schedule stated.',
      statute: 'Rules and Regulations for Nursing Homes §§ 209, 568–569',
      confidence: 'high',
      source: 'https://humanservices.arkansas.gov/wp-content/uploads/nfregs.pdf',
    },
    menuRequirements: {
      summary: 'Menus planned/written 2 weeks in advance, posted ≥1 week in advance, repeat cycle no more often than every 3 weeks, records kept 30 days. Therapeutic diets require a physician\'s/dentist\'s written order, reviewed every 120 days (intermediate/minimum care) or 60 days (skilled care); a current ADA-affiliate-approved diet manual is required.',
      statute: 'Rules and Regulations for Nursing Homes §§ 566–567',
      confidence: 'high',
      source: 'https://humanservices.arkansas.gov/wp-content/uploads/nfregs.pdf',
    },
    dietitianOversight: {
      summary: 'Full-time qualified dietetic services supervisor or Certified Dietary Manager (CDM) required, completing 15 hrs/year continuing education. A "Consultant Dietitian" role is defined (RD-eligible, bachelor\'s degree, 1 yr supervisory experience) but no fixed hours/month is specified for that consultant.',
      statute: 'Rules and Regulations for Nursing Homes § 561',
      confidence: 'high',
      source: 'https://humanservices.arkansas.gov/wp-content/uploads/nfregs.pdf',
    },
  },

  OK: {
    label: 'Oklahoma',
    foodCode: {
      summary: 'Facilities must comply with Oklahoma\'s Food Establishments code (OAC 310:257), which was aligned with the 2017 FDA Model Food Code in a 2021 revision. OSDH is the inspecting agency.',
      statute: 'OAC 310:675-9-13.1',
      confidence: 'medium',
      note: 'The Ch. 257/FDA Food Code alignment was confirmed via an official OSDH document; the 310:675-9-13.1 text itself came from a secondary mirror.',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/OAC-310-675-9-13.1',
    },
    menuRequirements: {
      summary: 'Menus must be posted, planned to meet Food and Nutrition Board RDAs, and followed. Menus covering prescribed diets must be approved, dated, and periodically reviewed. A 30-day record of past menus must be maintained.',
      statute: 'OAC 310:675-9-12.1',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/OAC-310-675-9-12.1',
    },
    dietitianOversight: {
      summary: 'Clinical nutritional services must be under supervision of a licensed/registered dietitian (full-time, part-time, or consultant); if part-time, the dietitian must be available for daily phone consultation and able to approve menus/modified diets electronically. No fixed hours/month figure and no mandatory CDM certification found.',
      statute: 'OAC 310:675-9-12.1',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/OAC-310-675-9-12.1',
    },
  },

  TX: {
    label: 'Texas',
    foodCode: {
      summary: 'Food must be stored/prepared/served under DSHS food service sanitation requirements — the applicable standard is the Texas Food Establishment Rules (25 TAC Ch. 228), which adopt the FDA Food Code (2017 ed. + supplement). DSHS handles sanitation; HHSC conducts the annual ~4-day licensure survey.',
      statute: '26 TAC § 554.1111',
      confidence: 'medium',
      note: 'The Ch. 228/FDA Food Code link is inferred from DSHS\'s general framework, not an explicit in-rule cross-citation.',
      source: 'https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-554-1111',
    },
    menuRequirements: {
      summary: 'Menus per diet type from the diet manual, written ≥1 week ahead, dietitian-written/evaluated, posted in the dietary department AND a resident-accessible area, records kept 30 days. Diet manual must be current (≤5 years old) and dietitian-approved. Resident\'s right to personal dietary choice is explicitly preserved.',
      statute: '26 TAC § 554.1107',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-554-1107',
    },
    dietitianOversight: {
      summary: 'Numeric formula: 8 hrs/month of dietitian consultant time for facilities ≤60 residents, plus 4 additional hours for each additional 30 residents or fraction thereof; written contract required unless the dietitian is staff. If no full-time dietitian, must designate a Director of Food & Nutrition Services (CDM/CFSM or equivalent) receiving "frequent scheduled consultations" from an RD.',
      statute: '26 TAC § 554.1104, § 554.1102',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/texas/26-Tex-Admin-Code-SS-554-1104',
    },
  },

  TN: {
    label: 'Tennessee',
    foodCode: {
      summary: 'Food service policies must follow the current U.S. Public Health Service Recommended Ordinance/Code and Sanitation Manual, with specific temperatures codified: hot food ≥140°F, cold food/refrigerators ≤45°F, freezers ≤0°F, NSF-approved dishwashers, 3-compartment sink washing.',
      statute: 'Rule 1200-08-06-.06(9)(p)',
      confidence: 'high',
      source: 'https://publications.tnsosfiles.com/rules/1200/1200-08/1200-08-06.20210818.pdf',
    },
    menuRequirements: {
      summary: 'Therapeutic diets require a practitioner\'s prescription and a current, dietitian/medical-staff-approved diet manual. Menus planned ≥1 week ahead with dietitian consultation, kept on file 30 days. A dietitian or designee must hold a documented conference with the resident/family within 2 weeks of admission to discuss the diet plan. No menu-posting requirement found (unlike Texas).',
      statute: 'Rule 1200-08-06-.06(9)(d), (g), (h)',
      confidence: 'high',
      source: 'https://publications.tnsosfiles.com/rules/1200/1200-08/1200-08-06.20210818.pdf',
    },
    dietitianOversight: {
      summary: 'A qualified dietitian (full-time, part-time, or consultant) is required, but with no numeric hours/month formula — notably different from Texas/Indiana. A designated food & dietetic services director is required: dietitian, ADA-approved dietetic technician program graduate, 90+ hrs of food-service-supervision coursework, CDM/CFPP, or approved military program graduate.',
      statute: 'Rule 1200-08-06-.06(9)(b), (c)',
      confidence: 'high',
      source: 'https://publications.tnsosfiles.com/rules/1200/1200-08/1200-08-06.20210818.pdf',
    },
  },

  IN: {
    label: 'Indiana',
    foodCode: {
      summary: 'Must comply with Indiana\'s Retail Food Establishment Sanitation Requirements. ISDH is the inspecting agency.',
      statute: '410 IAC 16.2-3.1-21 (cross-referencing 410 IAC 7-24)',
      confidence: 'medium',
      note: '410 IAC 7-24 was repealed and replaced by 410 IAC 7-26 (2022 FDA Food Code) effective 4/16/2025 — the dietary rule\'s cross-reference may lag the current numbering. Confirm before publishing.',
      source: 'https://www.law.cornell.edu/regulations/indiana/410-IAC-16.2-3.1-21',
    },
    menuRequirements: {
      summary: 'Menus/substitutions must be RD-approved; therapeutic diets require physician prescription; minimum 3 meals/day at standard times, no more than 14 hrs between dinner and breakfast (16 hrs if a resident-agreed bedtime snack is offered); nutritional substitutes must be offered for refused meals.',
      statute: '410 IAC 16.2-3.1-21',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/indiana/410-IAC-16.2-3.1-21',
    },
    dietitianOversight: {
      summary: 'Numeric biweekly (per 2 weeks) consultant dietitian formula by facility size: 4 hrs (≤60 residents), 5 hrs (61–90), 6 hrs (91–120), 7 hrs (121–150), 8 hrs (151+). Food service director must be a certified dietitian, ADA-approved dietetic technician graduate, complete a 90+ hr food-service-supervision course + 1 yr experience, or hold an equivalent degree/military training.',
      statute: '410 IAC 16.2-3.1-20',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/indiana/410-IAC-16.2-3.1-20',
    },
  },

  OH: {
    label: 'Ohio',
    foodCode: {
      summary: 'Facilities must store/prepare/distribute/serve food under sanitary conditions per Ohio\'s Uniform Food Safety Code. ODH is the licensing/inspecting authority.',
      statute: 'OAC 3701-17-18 (cross-referencing Ch. 3717-1)',
      confidence: 'high',
      note: 'Commonly understood to be modeled on the FDA Food Code, but that specific lineage wasn\'t confirmed in the rule text reviewed.',
      source: 'https://codes.ohio.gov/ohio-administrative-code/rule-3701-17-18',
    },
    menuRequirements: {
      summary: 'Menus dietitian-approved ≥1 week ahead; meal records (including substitutions) kept on file ≥3 months; diets must be ordered by a physician or other licensed professional within scope; similar-nutritive-value substitutes must be offered if a resident declines the served food.',
      statute: 'OAC 3701-17-18',
      confidence: 'high',
      source: 'https://codes.ohio.gov/ohio-administrative-code/rule-3701-17-18',
    },
    dietitianOversight: {
      summary: 'A dietitian (full-time/part-time/consultant) is required; if not full-time, facility must designate a qualified food service manager. Rather than a numeric hours formula, the part-time/consultant dietitian must "consult monthly, or sooner, if needed." A food service manager with supervisory authority must hold Level Two food protection certification.',
      statute: 'OAC 3701-17-18, OAC 3701-17-07(H), OAC 3701-21-25',
      confidence: 'high',
      source: 'https://codes.ohio.gov/ohio-administrative-code/rule-3701-17-18',
    },
  },

  FL: {
    label: 'Florida',
    foodCode: {
      summary: 'No explicit adopted sanitation/food-code citation (e.g. FDA Food Code, DOH food hygiene rule, DBPR restaurant rule) could be located in the accessible rule text.',
      statute: 'NOT FOUND',
      confidence: 'low',
      note: 'Genuinely not located, not just unconfirmed — recommend a manual pull of the complete current AHCA rule text before publishing anything specific here.',
      source: 'https://www.law.cornell.edu/regulations/florida/Fla-Admin-Code-Ann-R-59A-4-110',
    },
    menuRequirements: {
      summary: 'No dating/posting/retention-period, therapeutic-diet-order-signature, or resident-substitution-right provisions were located in the accessible rule text — Florida may rely primarily on the federal baseline here, but that could not be confirmed with full confidence.',
      statute: 'NOT FOUND',
      confidence: 'low',
      note: 'Recommend direct manual review of the complete current Rule 59A-4.110 before publishing.',
      source: 'https://www.law.cornell.edu/regulations/florida/Fla-Admin-Code-Ann-R-59A-4-110',
    },
    dietitianOversight: {
      summary: 'Facility must designate a full-time Director of Food & Nutrition Services (a Florida-licensed RD/RDN, or someone meeting the federal 42 CFR 483.60(a)(1)/(2) standard); at census ≥61 residents, this person\'s duties can\'t regularly include food prep/service. If not a dietitian, facility must "obtain consultation from a qualified dietitian" — no specific hours/month figure found, unlike Texas/Indiana\'s numeric formulas or Ohio\'s monthly cadence.',
      statute: 'Fla. Admin. Code R. 59A-4.110',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/florida/Fla-Admin-Code-Ann-R-59A-4-110',
    },
  },

  // Federal baseline — used for any state without a dedicated entry above.
  OTHER: {
    label: 'Other / Federal Only',
    foodCode: {
      summary: 'No single federal "food code" applies uniformly — facilities must comply with applicable state/local food safety codes. The federal floor requires food to be procured, stored, prepared, and served under sanitary conditions.',
      statute: '42 CFR 483.60(i)',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.60',
    },
    menuRequirements: {
      summary: 'Menus must meet residents\' nutritional needs (per RDAs), be followed, reflect the resident group\'s cultural/religious/ethnic needs, and be reviewed by a qualified dietitian. Therapeutic diets must be prescribed by the attending physician (or delegated per state law to an RD/NP).',
      statute: '42 CFR 483.60(c), (d)',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.60',
    },
    dietitianOversight: {
      summary: 'Facility must employ a qualified dietitian, full-time, part-time, or on a consultant basis with sufficient time to meet resident needs; if not full-time, must designate a director of food service meeting specified qualifications. No numeric hours are set federally.',
      statute: '42 CFR 483.60(a)(1)–(2)',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-G/part-483/subpart-B/section-483.60',
    },
  },
}
