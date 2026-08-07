// State-specific Transportation regulatory reference data — vehicle
// accessibility requirements, driver requirements, and how each state's
// Medicaid non-emergency medical transportation (NEMT) program is
// structured.
//
// Keyed off the same organizations.compliance_state value as
// complianceStates.js / socialStateRefs.js (one state per org).
//
// SCOPE NOTE: unlike Social Services / Dietary / Housekeeping, transportation
// regulation is genuinely fragmented — NEMT is usually run through a
// Medicaid MCO/broker contract rather than a clean per-state statute, and
// most states have no facility-specific vehicle-equipment rule at all
// (default is the federal ADA/FTA baseline). Several fields below are
// legitimately "NOT FOUND" rather than a research gap — don't read a
// missing citation as an error.
//
// SOURCING: see the header comment in socialStateRefs.js for the sourcing
// methodology — the same rules apply here. `confidence` below 'high' means
// verify against the primary source (`source`) before relying on it. Only
// Missouri has a live customer today; the other 9 states mirror the
// Compliance module's existing state list.

export const TRANSPORTATION_STATE_REFS = {
  MO: {
    label: 'Missouri',
    vehicleAccessibility: {
      summary: 'No Missouri-specific statute found requiring wheelchair lift/tie-down standards for facility transport vehicles beyond the federal baseline. A general "Transportation Service Standards" rule governs state-funded transportation programs, but its applicability to nursing homes/ALFs specifically is unconfirmed.',
      statute: 'NOT FOUND (facility-specific)',
      confidence: 'medium',
      source: 'https://www.law.cornell.edu/regulations/missouri/19-CSR-15-7-040',
    },
    driverRequirements: {
      summary: 'A Class E ("chauffeur") license is required for anyone paid to drive a vehicle carrying 14 or fewer passengers "for hire." This is a general-purpose statute, not nursing-home-specific — whether it applies to salaried facility drivers is ambiguous.',
      statute: 'RSMo § 302.015; 12 CSR 10-24.200',
      confidence: 'medium',
      note: 'No Missouri statute found requiring background checks or passenger-assistance training specific to resident transport.',
      source: 'https://revisor.mo.gov/main/OneSection.aspx?section=302.015',
    },
    nemtProgram: {
      summary: 'MO HealthNet Medicaid NEMT is broker-administered statewide by MTM (Medical Transportation Management). No Missouri statute found requiring facilities to coordinate with the broker in any specific way — governed by contract, not statute.',
      statute: 'N/A — broker/contract-driven',
      confidence: 'high',
      source: 'https://mydss.mo.gov/mhd/nemt',
    },
  },

  KS: {
    label: 'Kansas',
    vehicleAccessibility: {
      summary: 'Adult care home vehicles must have pre-service and annual safety checks (documented on file), accident/liability insurance, individual seat belts for driver and every passenger while moving, locked doors while moving, and a specified first-aid kit. Does not contain wheelchair lift/tie-down-specific standards — those default to the federal baseline.',
      statute: 'K.A.R. 28-4-1268',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-4-1268',
    },
    driverRequirements: {
      summary: 'Only a valid standard Kansas driver\'s license is required — no special chauffeur/passenger endorsement for facility resident transport specifically.',
      statute: 'K.A.R. 28-4-1268; K.S.A. § 8-234a',
      confidence: 'high',
      note: 'A separate KDADS/KDHE background-check policy applies to HCBS direct-service workers generally (with a waiver option if transportation isn\'t part of the job function).',
      source: 'https://www.law.cornell.edu/regulations/kansas/K-A-R-28-4-1268',
    },
    nemtProgram: {
      summary: 'KanCare (Kansas Medicaid) NEMT is MCO-driven — each managed care plan contracts with its own regional broker (e.g. Modivcare, SafeRide Health). No single statewide state-run broker, and no Kansas statute found governing facility coordination.',
      statute: 'N/A — MCO/contract-driven',
      confidence: 'medium',
      note: 'Broker assignments are subject to change and were confirmed via secondary/vendor sources rather than a state announcement.',
      source: 'https://portal.kmap-state-ks.us/Documents/Provider/Bulletins/NEMT%20Fact%20Sheet%20_final.pdf',
    },
  },

  IL: {
    label: 'Illinois',
    vehicleAccessibility: {
      summary: 'Illinois has a distinct state vehicle-licensing category — "Medi-car" — for transporting a wheelchair-confined patient, requiring a hydraulic/electric lift or ramp and a wheelchair lockdown. Medi-car/Service Car vehicles must be licensed by the Illinois Secretary of State (or hold equivalent out-of-state licensure).',
      statute: '89 Ill. Admin. Code § 140.490',
      confidence: 'high',
      note: 'The strongest state-specific facility-transport vehicle rule found among the 10 states researched.',
      source: 'https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-89-SS-140.490',
    },
    driverRequirements: {
      summary: 'Medi-car/Service Car/taxi drivers and attendants must complete a Department-approved safety training program (passenger assistance, vehicle operation/safety, emergency procedures), recertified every 3 years and documented by the provider — EMT-licensed drivers/attendants are exempt.',
      statute: '89 Ill. Admin. Code § 140.490',
      confidence: 'high',
      source: 'https://www.law.cornell.edu/regulations/illinois/Ill-Admin-Code-tit-89-SS-140.490',
    },
    nemtProgram: {
      summary: 'Illinois Medicaid NEMT runs two tracks: fee-for-service (Transdev manages prior authorization, providers arrange rides) and managed care (members access rides through brokers like MTM and ModivCare). No single statewide broker.',
      statute: 'N/A — dual FFS/MCO structure, program-administered',
      confidence: 'high',
      source: 'https://hfs.illinois.gov/medicalclients/medicaltransportationnonemergency.html',
    },
  },

  AR: {
    label: 'Arkansas',
    vehicleAccessibility: {
      summary: 'The nursing home rules only require a written transportation policy for medical/dental appointments — no specific wheelchair lift, tie-down, or vehicle-inspection standard was locatable in the accessible text.',
      statute: 'NOT FOUND (facility-specific)',
      confidence: 'low',
      note: 'The primary PDF could not be fully text-parsed by the research tooling — this is "not found in what could be retrieved," not a confirmed absence. Recommend a manual read.',
      source: 'https://www.humanservices.arkansas.gov/wp-content/uploads/Rules-for-Nursing-Homes-11.01.2024.pdf',
    },
    driverRequirements: {
      summary: 'A "P" (passenger-for-hire) endorsement is required on a Class D license for anyone driving passengers for hire — a general-purpose rule, not resident-transport-specific. Arkansas Medicaid\'s own NEMT provider manual separately requires enrolled NEMT drivers/attendants to hold national certifications in Defensive Driving, First Aid, CPR, and Passenger Assistance Sensitivity.',
      statute: '006.05.93 Ark. Code R. 014',
      confidence: 'medium',
      note: 'The NEMT certification requirement applies to enrolled Medicaid NEMT providers, not facility-employed drivers generally.',
      source: 'https://www.law.cornell.edu/regulations/arkansas/006-05-93-Ark-Code-R-014',
    },
    nemtProgram: {
      summary: 'Arkansas Medicaid NET (Non-Emergency Transportation) is a regional broker model under a CMS capitated selective-contracting waiver — Verida (formerly Southeastrans) serves most regions.',
      statute: 'N/A — broker/waiver-driven',
      confidence: 'medium',
      note: 'No Arkansas statute found governing facility coordination with NET specifically; current regional broker assignments are subject to change.',
      source: 'https://humanservices.arkansas.gov/divisions-shared-services/medical-services/healthcare-programs/net-non-emergency-transportation/',
    },
  },

  OK: {
    label: 'Oklahoma',
    vehicleAccessibility: {
      summary: 'Any nursing facility acting as a SoonerRide network provider must "meet the same standards as any other SoonerRide contracted provider for vehicle and driver licensing, safety, training, liability, and ADA regulations" — explicitly incorporating the federal ADA baseline by reference. Facilities must supply the resident\'s own wheelchair.',
      statute: 'OAC 317:30-5-327.7; OAC 317:30-5-327.3',
      confidence: 'high',
      note: 'Oklahoma is the only one of the 10 states researched with codified, facility-specific NEMT vehicle rules rather than pure contract terms.',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/OAC-317-30-5-327.7',
    },
    driverRequirements: {
      summary: 'SoonerRide network drivers must meet the same licensing/safety/training standards as any contracted provider. Oklahoma\'s "P" (passenger) endorsement only kicks in at the 16-passenger CDL threshold — no special sub-16-passenger chauffeur endorsement exists, so a standard Class D license suffices for smaller facility vehicles.',
      statute: 'OAC 317:30-5-327.7; 47 O.S. § 6-110.1',
      confidence: 'high',
      note: 'Facilities must provide a trained attendant (minimum nurse\'s-aide level) for SoonerRide trips, not a special driver credential.',
      source: 'https://www.law.cornell.edu/regulations/oklahoma/OAC-317-30-5-327.7',
    },
    nemtProgram: {
      summary: 'SoonerRide is a single statewide broker model administered by the Oklahoma Health Care Authority (OHCA); Modivcare is the current statewide broker.',
      statute: 'OAC 317:30-5-327.3, 317:30-5-327.7',
      confidence: 'high',
      note: 'Oklahoma has real, codified facility-specific NEMT rules directly in its administrative code — a genuine regulatory framework, not purely contractual.',
      source: 'https://oklahoma.gov/ohca/individuals/soonerride.html',
    },
  },

  TX: {
    label: 'Texas',
    vehicleAccessibility: {
      summary: 'No facility-specific vehicle/wheelchair-lift standard found. The nursing facility rule only establishes the facility\'s financial/coordination responsibility for "normal transportation" to medical appointments — no lift, ramp, or tie-down specs. Falls back to the federal ADA/FTA baseline.',
      statute: 'NOT FOUND (facility-specific); 26 TAC § 554.2320 covers coordination responsibility only',
      confidence: 'medium',
      source: 'https://regulations.justia.com/states/texas/title-26/part-1/chapter-554/subchapter-x/section-554-2320',
    },
    driverRequirements: {
      summary: 'Texas has no separate state chauffeur\'s license; for-hire passenger transport is regulated via CDL endorsements and local city permits (Dallas, Houston, Austin, San Antonio each have their own for-hire permit rules), not a nursing-facility-specific statute.',
      statute: 'NOT FOUND (facility-specific)',
      confidence: 'low',
      source: null,
    },
    nemtProgram: {
      summary: 'Broker/MCO model. Texas\'s Medical Transportation Program (MTP) is administered by HHSC under a Managed Transportation Organization delivery model; Medicaid managed-care members get NEMT through their MCO, routed through national brokers.',
      statute: 'N/A — broker/MCO-driven',
      confidence: 'high',
      source: 'https://pfd.hhs.texas.gov/managed-care-services/medical-transportation-program-mtp',
    },
  },

  TN: {
    label: 'Tennessee',
    vehicleAccessibility: {
      summary: 'The full nursing home and assisted-care living facility rule chapters were reviewed directly — neither contains any provision on resident transportation, transportation vehicles, wheelchair lifts, or vehicle inspection. Federal ADA/FTA baseline applies with no Tennessee-specific addition found.',
      statute: 'NOT FOUND',
      confidence: 'high',
      note: 'Full chapters reviewed, not just a search snippet — this is a confirmed absence.',
      source: 'https://publications.tnsosfiles.com/rules/1200/1200-08/1200-08-06.20210818.pdf',
    },
    driverRequirements: {
      summary: 'No driver/transport-specific statute found. A general pre-hire criminal background check (TBI/FBI, fingerprint-based) applies to any position providing "direct care" to a resident — it\'s ambiguous whether a driver role independently qualifies.',
      statute: 'Tenn. Code Ann. § 68-11-256',
      confidence: 'medium',
      source: 'https://codes.findlaw.com/tn/title-68-health-safety-and-environmental-protection/tn-code-sect-68-11-256/',
    },
    nemtProgram: {
      summary: 'MCO/broker model, not state-administered. TennCare\'s NEMT benefit runs through each enrollee\'s managed care plan, each paired with one of two brokers (Verida or Tennessee Carriers).',
      statute: 'N/A — MCO/broker-driven',
      confidence: 'high',
      note: 'The state\'s own page explicitly confirms no statute/rule is cited for this structure.',
      source: 'https://www.tn.gov/tenncare/providers/tenncare-provider-news-notices-forms/tenncare-s-non-emergency-medical-transportation-benefit--nemt-.html',
    },
  },

  IN: {
    label: 'Indiana',
    vehicleAccessibility: {
      summary: 'No transportation, vehicle, wheelchair-lift, tie-down, or inspection section was located in the comprehensive care / residential care facility standards. Federal ADA/FTA baseline applies by default.',
      statute: 'NOT FOUND',
      confidence: 'medium',
      note: 'The full ~200+ page administrative article could not be confirmed as searched end-to-end, so a section elsewhere can\'t be fully ruled out.',
      source: 'https://www.in.gov/health/files/A00162.pdf',
    },
    driverRequirements: {
      summary: 'No facility-specific statute found. For Medicaid NEMT, drivers need a valid Indiana license; vehicle/driver credentialing (background screening, drug testing, defensive-driving/wheelchair-securement training) is imposed by the state\'s NEMT broker as a contractual condition, not codified law.',
      statute: 'NOT FOUND (facility-specific); IC § 12-15-11-2.5 sets a $50,000 surety bond for Medicaid transportation provider companies (anti-fraud, not a driver-safety standard)',
      confidence: 'low',
      note: 'Broker driver-training requirements are secondary/unverified — sourced from NEMT-industry summaries, not a state document.',
      source: 'https://law.justia.com/codes/indiana/2023/title-12/article-15/chapter-11/section-12-15-11-2-5/',
    },
    nemtProgram: {
      summary: 'State-administered fee-for-service Medicaid NEMT is brokered through Verida (formerly Southeastrans) statewide.',
      statute: 'N/A — broker-driven',
      confidence: 'high',
      source: 'https://www.in.gov/medicaid/providers/clinical-services/nonemergency-medical-transportation/',
    },
  },

  OH: {
    label: 'Ohio',
    vehicleAccessibility: {
      summary: 'Ohio has a real, specific vehicle standard for wheelchair-accessible medical transport ("ambulette") vehicles — stable access ramp or hydraulic lift, four-point permanent fasteners to secure the wheelchair, mandatory roadworthiness inspection. IMPORTANT: a health care facility that provides ambulette transport only to its own residents is explicitly EXEMPT from this rule. A facility using its own vehicle for its own residents is NOT covered; a third-party ambulette company the facility contracts with WOULD be.',
      statute: 'ORC § 4766.01(R)(2) (exemption); OAC 4766-3-08 (vehicle standard, for licensed/non-exempt operators)',
      confidence: 'high',
      note: 'This exemption is the single most important nuance found across all transportation research — surface it prominently rather than flattening it into "Ohio requires X." Whether the standard applies at all depends on whether the community owns its van or contracts a company.',
      source: 'https://codes.ohio.gov/ohio-revised-code/chapter-4766',
    },
    driverRequirements: {
      summary: 'For licensed (third-party, non-exempt) ambulette drivers only: age 18+, 2 years driving experience, valid license, BCI/FBI background check, ≤6 points on driving record, medical/DOT clearance, current CPR + first aid/EMS credential, passenger-assistance training renewed every 3 years, negative drug/alcohol screen.',
      statute: 'OAC 4766-3-13',
      confidence: 'high',
      note: 'Per the ORC § 4766.01(R)(2) exemption above, this most likely does NOT apply to facility employees driving only that facility\'s own residents in the facility\'s own vehicle — though that inference isn\'t separately restated inside 4766-3-13 itself.',
      source: 'https://codes.ohio.gov/ohio-administrative-code/rule-4766-3-13',
    },
    nemtProgram: {
      summary: 'Fragmented broker/MCO model, no single statewide broker — each Ohio Medicaid managed care plan selects its own NEMT arrangement (varies by plan). Fee-for-service/non-managed-care members get transportation through their County Department of Job and Family Services.',
      statute: 'OAC Ch. 5160-15 (definitions/eligibility only, no single administering entity specified)',
      confidence: 'medium',
      source: 'https://codes.ohio.gov/ohio-administrative-code/rule-5160-15-01',
    },
  },

  FL: {
    label: 'Florida',
    vehicleAccessibility: {
      summary: 'No Florida-specific vehicle-accessibility standard was found for nursing homes. Assisted living rules only require the facility to "provide or arrange for" transportation — a service obligation, not a vehicle equipment standard. A separate Motor Vehicle statute caps vehicle size relative to passenger count but sets no wheelchair-lift/tie-down specs.',
      statute: 'NOT FOUND (nursing home); Fla. Stat. § 316.87 (vehicle size only, not lift/tie-down)',
      confidence: 'high',
      note: 'All sources read in full — this is a confirmed absence, not a research gap.',
      source: 'https://www.flsenate.gov/Laws/Statutes/2025/316.87',
    },
    driverRequirements: {
      summary: 'Medicaid NEMT providers (including transportation network companies) must screen all drivers per Florida\'s Level 2 background screening statute or a functionally equivalent procedure.',
      statute: 'Fla. Stat. § 316.87(3)',
      confidence: 'medium',
      note: 'This governs NEMT transportation providers/network companies specifically — direct applicability to in-house, facility-operated (non-commercial) transport is uncertain.',
      source: 'https://www.flsenate.gov/Laws/Statutes/2025/316.87',
    },
    nemtProgram: {
      summary: 'Managed care plan model — non-emergency transportation is a minimum covered service for all Statewide Medicaid Managed Care (SMMC) plans, each responsible for arranging/paying for it directly. No single statewide broker named.',
      statute: 'N/A — SMMC plan-administered',
      confidence: 'high',
      note: 'The official state page describing this structure doesn\'t itself cite a specific rule/statute number.',
      source: 'https://ahca.myflorida.com/medicaid/medicaid-policy-quality-and-operations/medicaid-policy-and-quality/medicaid-policy/medical-and-behavioral-health-coverage-policy/specialized-health-services/non-emergency-transportation-services.html',
    },
  },

  // Federal baseline — used for any state without a dedicated entry above.
  OTHER: {
    label: 'Other / Federal Only',
    vehicleAccessibility: {
      summary: 'No single federal statute mandates specific wheelchair-lift/tie-down equipment for a facility\'s own resident-transport vehicles the way it does for public transit. The applicable framework is the ADA (Title II for public entities, Title III for private facilities open to the public) plus, for vehicles offered as part of a "specialized transportation service," DOT ADA regulations incorporating accessibility/securement specifications. SAE J2249 is the industry-standard (not federal law) design spec for wheelchair tie-down/occupant restraint systems that most compliant equipment is built to.',
      statute: 'ADA Title II/III; 49 CFR Parts 37–38',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-49/subtitle-A/part-37',
    },
    driverRequirements: {
      summary: 'No general federal statute mandates specific driver credentials, beyond a valid license, for facility staff transporting residents in a facility-owned, non-commercial vehicle. Requirements more commonly attach to licensed commercial NEMT/ambulette providers (state-level licensing) rather than facility employees.',
      statute: 'N/A',
      confidence: 'high',
      source: null,
    },
    nemtProgram: {
      summary: 'Medicaid non-emergency transportation is a federally-required benefit — states must ensure necessary transportation for Medicaid beneficiaries to and from providers — but how each state delivers it (broker model, MCO-embedded, state-administered) is left to state design. Across the 10 states researched, this consistently resolves to a broker/MCO contract rather than a facility-specific statute, with Oklahoma as the one exception that has codified facility-specific rules.',
      statute: '42 CFR 431.53',
      confidence: 'high',
      source: 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-C/part-431/subpart-B/section-431.53',
    },
  },
}
