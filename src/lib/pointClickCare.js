// PointClickCare Marketplace agreement, Appendix A: "Resident and family portals
// do not show clinical data from PointClickCare." Once a community can receive
// PointClickCare data (a Facility ID is set and it is cleared for health data),
// diet orders and allergies on the dietary profile may come from PointClickCare,
// so the portals stop showing diet type, texture and allergies. Menus still show.
export function portalHidesClinical(organization) {
  return Boolean(organization?.phi_allowed && String(organization?.pcc_facility_id ?? '').trim())
}
