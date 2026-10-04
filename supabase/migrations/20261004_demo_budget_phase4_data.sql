-- Demo community (Sunrise Gardens Senior Living) data for the budget layer, Phase 4:
-- asset costs, costed closed work orders (June, August, September), September PM
-- jobs, linen items issued to Housekeeping, linen discards, linen in circulation.
-- Runs once: skipped if the 'Bath Towel' linen item already exists.
--
-- Hand-checked September 2026:
--   Maintenance jobs closed: parts 185 + 74 + 58 + 96 = 413; vendor 640 + 450 + 1,280 = 2,370
--     emergency vendor 640 + 1,280 = 1,920; planned 96 + 450 = 546; routine 74 + 58 = 132;
--     emergency 825 + 1,280 = 2,105; reactive share (132 + 2,105) / 2,783 = 80.4%
--     Maintenance spend 2,783 of the 4,000 budget (69.6%); labor 11 hours
--   Assets: Patient Lift Wing B repairs 2,430 of 4,800 replacement = 50.6% → flagged
--   Housekeeping: linen issued 262.80 + 96.00 = 358.80 over 375 occupied room days = 0.96 / room day
--     chemical units 6 + 2 (existing) + 4 = 12 → 0.032 / room day; Housekeeping spend 471.30
--     linen discarded 4 + 2 + 6 + 3 = 15 (value 44.00) of 600 in circulation = 2.5%
-- Note: the weekly reset_demo_dates() shifts work_orders dates forward, so these jobs
-- drift a week each Friday like the rest of the demo's work orders.
do $seed$
declare
  v_org   uuid := 'a5555c06-f99d-4ec0-ad2f-e3c818466bb2';
  u_mgr   uuid := 'aaaaaaaa-0014-0014-0014-000000000014';
  u_tech  uuid := 'aaaaaaaa-0003-0003-0003-000000000003';
  u_hk    uuid := 'aaaaaaaa-0010-0010-0010-000000000010';
  u_admin uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  a_dryer uuid := '9d5a9b8a-f966-4527-a2d8-ad8f35b2330e';
  a_washer uuid := '0655cfb0-184a-4376-93f9-af6679386b93';
  a_east  uuid := '99cff6cf-1964-4d7d-b406-bdf590cdf284';
  a_gen   uuid := '08fe0dea-614d-4e45-955d-656cb5826a2e';
  a_roof  uuid := '69098734-e6ad-46df-a30d-07ee76ca97cb';
  a_elev  uuid := 'a017e06f-1d8a-4a97-a469-15ee43b4bab2';
  a_liftA uuid := '137d88d8-30de-41b3-af30-528f413bb6f7';
  a_liftB uuid := '6c3fd46d-0797-4da3-887f-150406a33a61';
  a_cooler uuid := '40ab3450-c1e4-4bba-b1cb-c7b02d63bcdc';
  a_west  uuid := '497ce6fe-6ed5-4178-840c-083d037be8a7';
  i_towel uuid; i_wash uuid; i_sheet uuid; i_pillow uuid; i_blanket uuid;
begin
  if exists (select 1 from supply_items where organization_id = v_org and name = 'Bath Towel') then
    raise notice 'Demo phase 4 data already present; skipping';
    return;
  end if;

  -- ── Asset cost and life ──
  update maintenance_assets a set purchase_cost = v.pc, replacement_cost = v.rc, expected_life_years = v.life, salvage_value = v.salv, updated_at = now()
    from (values (a_dryer, 6500, 7200, 12, 300), (a_washer, 8200, 9000, 12, 400), (a_east, 14000, 16500, 15, 500),
                 (a_gen, 48000, 55000, 25, 2000), (a_roof, 22000, 26000, 15, 800), (a_elev, 85000, 110000, 25, 0),
                 (a_liftA, 4200, 4800, 10, 0), (a_liftB, 4200, 4800, 10, 0), (a_cooler, 18000, 21000, 15, 500),
                 (a_west, 14000, 16500, 15, 500)) v(id, pc, rc, life, salv)
   where a.id = v.id and a.organization_id = v_org;

  -- ── Closed, costed work orders ──
  insert into work_orders (organization_id, title, description, category, priority, status, asset_id, submitted_by, assigned_to,
                           vendor_name, created_at, completed_at, due_date, actual_hours, parts_cost, vendor_cost, work_type)
  values
    -- June: Patient Lift B actuator (puts the lift past 50% of replacement cost)
    (v_org, 'Patient lift actuator replacement — Wing B', 'Lift arm drifting under load; actuator and control box replaced.', 'other', 'high', 'closed', a_liftB, u_mgr, u_tech,
     'Arjo Service', '2026-06-15 14:00+00', '2026-06-18 20:00+00', null, 2.0, 1450.00, 980.00, 'routine'),
    -- August
    (v_org, 'Generator starting battery replacement', 'Batteries failed load test during weekly PM.', 'electrical', 'normal', 'closed', a_gen, u_mgr, u_tech,
     null, '2026-08-10 14:00+00', '2026-08-12 19:00+00', null, 1.5, 210.00, null, 'routine'),
    (v_org, 'Ice machine not making ice — Kitchen', 'Water inlet valve failed; vendor same-day call.', 'appliance', 'urgent', 'closed', null, u_mgr, u_tech,
     'Midwest Refrigeration', '2026-08-22 13:00+00', '2026-08-22 21:00+00', null, 1.0, null, 395.00, 'emergency'),
    -- September (hand-checked)
    (v_org, 'Walk-in cooler compressor relay failed', 'Cooler at 48°F; product moved to reach-ins. Relay and start capacitor replaced.', 'appliance', 'urgent', 'closed', a_cooler, u_mgr, u_tech,
     'Midwest Refrigeration', '2026-09-06 11:00+00', '2026-09-06 18:00+00', null, 3.0, 185.00, 640.00, 'emergency'),
    (v_org, 'Replace bathroom exhaust fan — Room 208', 'Fan motor seized.', 'electrical', 'normal', 'closed', null, u_mgr, u_tech,
     null, '2026-09-09 14:00+00', '2026-09-10 19:00+00', null, 1.5, 74.00, null, 'routine'),
    (v_org, 'Dryer drum belt replacement', 'Drum not turning; belt replaced.', 'appliance', 'normal', 'closed', a_dryer, u_mgr, u_tech,
     null, '2026-09-13 14:00+00', '2026-09-14 19:00+00', null, 2.0, 58.00, null, 'routine'),
    (v_org, '[PM] HVAC Filter Replacement — Main', 'Quarterly filter change, rooftop unit.', 'filter_change', 'normal', 'closed', a_roof, u_mgr, u_tech,
     null, '2026-09-08 14:00+00', '2026-09-15 19:00+00', '2026-09-15', 2.0, 96.00, null, 'planned'),
    (v_org, '[PM] Elevator Monthly Maintenance Check', 'Contract service visit.', 'inspection', 'normal', 'closed', a_elev, u_mgr, u_tech,
     'Otis Elevator', '2026-09-12 14:00+00', '2026-09-19 19:00+00', '2026-09-20', 0.5, null, 450.00, 'planned'),
    (v_org, 'Elevator door operator repair', 'Door reopening repeatedly; entrapment risk. Operator board replaced.', 'other', 'urgent', 'closed', a_elev, u_mgr, u_tech,
     'Otis Elevator', '2026-09-23 13:00+00', '2026-09-23 22:00+00', null, 1.0, null, 1280.00, 'emergency'),
    (v_org, '[PM] Patient Lift Safety Check — Wing A', 'Monthly sling, battery, and brake check.', 'inspection', 'normal', 'closed', a_liftA, u_mgr, u_tech,
     null, '2026-09-18 14:00+00', '2026-09-25 19:00+00', '2026-09-25', 1.0, null, null, 'planned');
  -- September PM left open (PM completion)
  insert into work_orders (organization_id, title, description, category, priority, status, asset_id, submitted_by, assigned_to,
                           created_at, due_date, work_type)
  values (v_org, '[PM] Walk-in Cooler Coil Cleaning', 'Clean condenser and evaporator coils.', 'appliance', 'normal', 'open', a_cooler, u_mgr, u_tech,
          '2026-09-21 14:00+00', '2026-09-28', 'planned');

  -- ── Linen items (Central Supply stock issued to Housekeeping) ──
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, par_level, spend_category, is_active)
  values (v_org, 'Bath Towel', 'Linen', 'each', 4.25, 60, 80, 'linen', true) returning id into i_towel;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, par_level, spend_category, is_active)
  values (v_org, 'Washcloth', 'Linen', 'each', 0.95, 120, 150, 'linen', true) returning id into i_wash;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, par_level, spend_category, is_active)
  values (v_org, 'Flat Sheet, Twin', 'Linen', 'each', 7.50, 40, 60, 'linen', true) returning id into i_sheet;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, par_level, spend_category, is_active)
  values (v_org, 'Pillowcase', 'Linen', 'each', 2.10, 50, 60, 'linen', true) returning id into i_pillow;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, par_level, spend_category, is_active)
  values (v_org, 'Thermal Blanket', 'Linen', 'each', 14.00, 20, 25, 'linen', true) returning id into i_blanket;

  -- September issues to Housekeeping: linen 262.80 + 96.00 = 358.80; disinfectant 4 units (27.00)
  insert into supply_transactions (organization_id, supply_item_id, transaction_type, quantity, quantity_before, quantity_after,
                                   unit_cost, department, performed_by, created_at)
  select v_org, s.id, 'issue_dept', -q.n, s.quantity_on_hand + q.n, s.quantity_on_hand, s.cost_per_unit, 'Housekeeping',
         'aaaaaaaa-0016-0016-0016-000000000016', q.at::timestamptz
    from (values ('Bath Towel', 24, '2026-09-03 15:00+00'), ('Washcloth', 48, '2026-09-03 15:00+00'),
                 ('Flat Sheet, Twin', 12, '2026-09-03 15:00+00'), ('Pillowcase', 12, '2026-09-03 15:00+00'),
                 ('Bath Towel', 12, '2026-09-17 15:00+00'), ('Flat Sheet, Twin', 6, '2026-09-17 15:00+00'),
                 ('Disinfectant Spray 32oz', 4, '2026-09-17 15:00+00')) q(name, n, at)
    join supply_items s on s.organization_id = v_org and s.name = q.name;

  -- ── Linen discards (September: 15 pieces, value 44.00) ──
  insert into linen_discards (organization_id, discard_date, supply_item_id, item_name, quantity, reason, notes, logged_by) values
    (v_org, '2026-09-05', i_towel,  'Bath Towel',       4, 'torn',    null, u_hk),
    (v_org, '2026-09-12', i_sheet,  'Flat Sheet, Twin', 2, 'stained', 'Rust stains from washer drum', u_hk),
    (v_org, '2026-09-19', i_wash,   'Washcloth',        6, 'worn',    null, u_hk),
    (v_org, '2026-09-26', i_pillow, 'Pillowcase',       3, 'lost',    'Not returned from Building C', u_hk);

  insert into housekeeping_settings (organization_id, linen_in_circulation, updated_by, updated_at)
  values (v_org, 600, u_admin, now())
  on conflict (organization_id) do update set linen_in_circulation = excluded.linen_in_circulation,
    updated_by = excluded.updated_by, updated_at = excluded.updated_at;
end
$seed$;
