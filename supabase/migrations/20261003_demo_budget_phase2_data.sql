-- Demo community (Sunrise Gardens Senior Living) data for the budget layer, Phase 2:
-- two manager logins, census history, Dietary purchases / waste / an off-system
-- purchase, Central Supply orders, resident charges (some billed), chargeable items
-- issued to Nursing, and sale prices on chargeable items that had none.
-- Runs once: skipped if PO-1007 already exists.
--
-- Hand-checked September 2026 (what the screens should show):
--   census 13 (1st–15th) + 14 (16th–30th) = 405 resident days
--   Dietary: food 966 + 1004 + 86.40 = 2,056.40; other 96 + 35 + 96 = 227.00; waste 52.75
--            food / day 5.08; all Dietary / day 5.64; waste 2.6%; budget / day 9000 / 405 = 22.22
--            August: food 2,042.00 / 403 resident days = 5.07 / day
--   Central Supply spend: 620 (Medline) + 469 (McKesson) = 1,089.00 → 2.69 / resident day
--   Resident charges 532.50 (6 billed = 409.50, 3 not billed = 123.00);
--   chargeable items issued to Nursing 258.00 → leakage 381.00 of 790.50 = 48.2%
--   Housekeeping: 85.50 of central stock issued
do $seed$
declare
  v_org  uuid := 'a5555c06-f99d-4ec0-ad2f-e3c818466bb2';
  u_diet uuid := 'aaaaaaaa-0015-0015-0015-000000000015';
  u_cs   uuid := 'aaaaaaaa-0016-0016-0016-000000000016';
  v_sysco uuid := '9c18688c-a2a7-4b0f-9628-7d22915e58c2';
  v_medline uuid := 'ca84824e-0e89-4eaa-b37e-29718a917a63';
  v_mck uuid := 'ff75ff9f-6ee5-4543-a031-5f376d473656';
  i_chicken uuid; i_beef uuid; i_produce uuid; i_milk uuid; i_bread uuid; i_coffee uuid; i_napkins uuid; i_detergent uuid;
  po uuid;
  -- residents
  r_simmons uuid := '102690d2-d1a9-4909-ab4d-64298c46a244';
  r_monroe  uuid := 'a55f39c1-bf80-4ea4-b429-08e5b5d3a834';
  r_foster  uuid := '6e229d2b-1486-4149-8b17-f24c454d3817';
  r_hudson  uuid := '7e7e893b-a431-47b8-aaad-44f39a87b777';
  r_thornton uuid := '78775ef9-5f23-4c78-8a7c-7dac65e4a6b2';
  r_delgado uuid := 'aebddbd8-6913-4cea-9697-88e2cc379eed';
  r_patterson uuid := '2f2fb52d-dd09-41ac-8de4-6cb9f311f565';
begin
  if exists (select 1 from supply_purchase_orders where organization_id = v_org and po_number = 'PO-1007') then
    raise notice 'Demo budget data already present; skipping';
    return;
  end if;

  -- ── Manager logins (shared demo password, copied from the Social Worker login) ──
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  select x.id, u.instance_id, u.aud, u.role, x.email, u.encrypted_password, now(),
         u.raw_app_meta_data, x.meta, now(), now(),
         coalesce(u.confirmation_token, ''), coalesce(u.recovery_token, ''), coalesce(u.email_change_token_new, ''), coalesce(u.email_change, '')
    from auth.users u,
         (values (u_diet, 'demo.dietarymanager@elderloop.xyz', '{"first_name":"Maria","last_name":"Alvarez"}'::jsonb),
                 (u_cs,   'demo.supplymanager@elderloop.xyz',  '{"first_name":"Kevin","last_name":"Walsh"}'::jsonb)) x(id, email, meta)
   where u.email = 'demo.socialworker@elderloop.xyz'
  on conflict (id) do nothing;

  update profiles set organization_id = v_org, role = 'manager', status = 'active', is_active = true,
         email = 'demo.dietarymanager@elderloop.xyz', first_name = 'Maria', last_name = 'Alvarez',
         job_title = 'Dietary Manager (CDM)', department = 'dietary'
   where id = u_diet;
  update profiles set organization_id = v_org, role = 'manager', status = 'active', is_active = true,
         email = 'demo.supplymanager@elderloop.xyz', first_name = 'Kevin', last_name = 'Walsh',
         job_title = 'Central Supply Manager', department = 'central_supply'
   where id = u_cs;
  insert into staff_department_roles (profile_id, organization_id, department, level) values
    (u_diet, v_org, 'dietary', 'manager'), (u_cs, v_org, 'central_supply', 'manager')
  on conflict (profile_id, department) do update set level = excluded.level;

  -- ── Census history (Aug 1 – Oct 1) ──
  insert into census_daily (organization_id, census_date, resident_count, occupied_rooms, note)
  select v_org, d::date,
         case when d::date between '2026-09-16' and '2026-09-30' then 14 else 13 end,
         case when d::date between '2026-09-16' and '2026-09-30' then 13 else 12 end,
         'Demo history'
    from generate_series('2026-08-01'::date, '2026-10-01', '1 day') d
  on conflict (organization_id, census_date) do nothing;

  -- ── Sale prices on chargeable items that had none (about cost + 40%) ──
  update supply_items s set sale_price = p.price, updated_at = now()
    from (values ('Adult Brief - Large', 59.00), ('Adult Brief - Medium', 54.00), ('Adult Brief - Small', 54.00),
                 ('Adult Brief - XL', 62.00), ('Pull-Up Underwear - Med', 57.00), ('Underpads 23x36 (100ct)', 40.00),
                 ('Barrier Cream 4oz', 11.50), ('Disposable Washcloths (48ct)', 17.50), ('Perineal Wash Spray 8oz', 10.75),
                 ('Foam Dressing 4x4 (10ct)', 44.00), ('Gauze Pads 4x4 (200ct)', 20.00), ('Gauze Roll 4" (12ct)', 16.00),
                 ('Skin Barrier Wipes (50ct)', 26.00)) p(name, price)
   where s.organization_id = v_org and s.name = p.name and s.is_resident_chargeable and coalesce(s.sale_price, 0) = 0;

  -- ── Dietary items ──
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, preferred_vendor_id, budget_department, spend_category, is_active)
  values (v_org, 'Chicken Breast, Boneless (40 lb)', 'Food', 'case', 68.00, 2, v_sysco, 'dietary', 'food', true) returning id into i_chicken;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, preferred_vendor_id, budget_department, spend_category, is_active)
  values (v_org, 'Ground Beef 80/20 (20 lb)', 'Food', 'case', 72.00, 1, v_sysco, 'dietary', 'food', true) returning id into i_beef;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, preferred_vendor_id, budget_department, spend_category, is_active)
  values (v_org, 'Fresh Produce Assortment', 'Food', 'box', 45.00, 3, v_sysco, 'dietary', 'food', true) returning id into i_produce;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, preferred_vendor_id, budget_department, spend_category, is_active)
  values (v_org, 'Milk 2% (4 gal)', 'Food', 'case', 28.00, 2, v_sysco, 'dietary', 'food', true) returning id into i_milk;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, preferred_vendor_id, budget_department, spend_category, is_active)
  values (v_org, 'Sandwich Bread (12 loaves)', 'Food', 'case', 24.00, 2, v_sysco, 'dietary', 'food', true) returning id into i_bread;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, preferred_vendor_id, budget_department, spend_category, is_active)
  values (v_org, 'Coffee, Ground (24 ct)', 'Food', 'case', 55.00, 1, v_sysco, 'dietary', 'food', true) returning id into i_coffee;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, preferred_vendor_id, budget_department, spend_category, is_active)
  values (v_org, 'Dinner Napkins (3000 ct)', 'Dietary Supplies', 'case', 32.00, 2, v_sysco, 'dietary', 'paper', true) returning id into i_napkins;
  insert into supply_items (organization_id, name, category, unit, cost_per_unit, quantity_on_hand, preferred_vendor_id, budget_department, spend_category, is_active)
  values (v_org, 'Dish Machine Detergent (4 gal)', 'Dietary Supplies', 'case', 48.00, 1, v_sysco, 'dietary', 'chemicals', true) returning id into i_detergent;

  -- ── Purchase orders ──
  -- August, Dietary: 966 + 1,076 = 2,042 food
  insert into supply_purchase_orders (organization_id, po_number, vendor_id, status, ordered_date, department, shipping_cost, ordered_by)
  values (v_org, 'PO-1007', v_sysco, 'received', '2026-08-05', 'dietary', 0, u_diet) returning id into po;
  insert into supply_po_line_items (po_id, organization_id, supply_item_id, description, unit, quantity_ordered, quantity_received, unit_cost, is_received, received_at, sort_order) values
    (po, v_org, i_chicken, 'Chicken Breast, Boneless (40 lb)', 'case', 4, 4, 68.00, true, '2026-08-07 15:00+00', 1),
    (po, v_org, i_beef,    'Ground Beef 80/20 (20 lb)',        'case', 3, 3, 72.00, true, '2026-08-07 15:00+00', 2),
    (po, v_org, i_produce, 'Fresh Produce Assortment',         'box',  6, 6, 45.00, true, '2026-08-07 15:00+00', 3),
    (po, v_org, i_milk,    'Milk 2% (4 gal)',                  'case', 4, 4, 28.00, true, '2026-08-07 15:00+00', 4),
    (po, v_org, i_bread,   'Sandwich Bread (12 loaves)',       'case', 4, 4, 24.00, true, '2026-08-07 15:00+00', 5);
  insert into supply_purchase_orders (organization_id, po_number, vendor_id, status, ordered_date, department, shipping_cost, ordered_by)
  values (v_org, 'PO-1008', v_sysco, 'received', '2026-08-19', 'dietary', 0, u_diet) returning id into po;
  insert into supply_po_line_items (po_id, organization_id, supply_item_id, description, unit, quantity_ordered, quantity_received, unit_cost, is_received, received_at, sort_order) values
    (po, v_org, i_chicken, 'Chicken Breast, Boneless (40 lb)', 'case', 4, 4, 68.00, true, '2026-08-21 15:00+00', 1),
    (po, v_org, i_beef,    'Ground Beef 80/20 (20 lb)',        'case', 3, 3, 72.00, true, '2026-08-21 15:00+00', 2),
    (po, v_org, i_produce, 'Fresh Produce Assortment',         'box',  6, 6, 45.00, true, '2026-08-21 15:00+00', 3),
    (po, v_org, i_milk,    'Milk 2% (4 gal)',                  'case', 4, 4, 28.00, true, '2026-08-21 15:00+00', 4),
    (po, v_org, i_bread,   'Sandwich Bread (12 loaves)',       'case', 4, 4, 24.00, true, '2026-08-21 15:00+00', 5),
    (po, v_org, i_coffee,  'Coffee, Ground (24 ct)',           'case', 2, 2, 55.00, true, '2026-08-21 15:00+00', 6);

  -- September, Dietary: food 966, napkins 96, shipping 35
  insert into supply_purchase_orders (organization_id, po_number, vendor_id, status, ordered_date, department, shipping_cost, ordered_by)
  values (v_org, 'PO-1009', v_sysco, 'received', '2026-09-03', 'dietary', 35.00, u_diet) returning id into po;
  insert into supply_po_line_items (po_id, organization_id, supply_item_id, description, unit, quantity_ordered, quantity_received, unit_cost, is_received, received_at, sort_order) values
    (po, v_org, i_chicken, 'Chicken Breast, Boneless (40 lb)', 'case', 4, 4, 68.00, true, '2026-09-05 15:00+00', 1),
    (po, v_org, i_beef,    'Ground Beef 80/20 (20 lb)',        'case', 3, 3, 72.00, true, '2026-09-05 15:00+00', 2),
    (po, v_org, i_produce, 'Fresh Produce Assortment',         'box',  6, 6, 45.00, true, '2026-09-05 15:00+00', 3),
    (po, v_org, i_milk,    'Milk 2% (4 gal)',                  'case', 4, 4, 28.00, true, '2026-09-05 15:00+00', 4),
    (po, v_org, i_bread,   'Sandwich Bread (12 loaves)',       'case', 4, 4, 24.00, true, '2026-09-05 15:00+00', 5),
    (po, v_org, i_napkins, 'Dinner Napkins (3000 ct)',         'case', 3, 3, 32.00, true, '2026-09-05 15:00+00', 6);
  -- September, Central Supply (Medline): 252 + 154 + 115 + 99 = 620
  insert into supply_purchase_orders (organization_id, po_number, vendor_id, status, ordered_date, shipping_cost, ordered_by)
  values (v_org, 'PO-1010', v_medline, 'received', '2026-09-04', 0, u_cs) returning id into po;
  insert into supply_po_line_items (po_id, organization_id, supply_item_id, description, unit, quantity_ordered, quantity_received, unit_cost, is_received, received_at, sort_order)
  select po, v_org, s.id, s.name, s.unit, q.n, q.n, s.cost_per_unit, true, '2026-09-08 15:00+00', q.o
    from (values ('Adult Brief - Large', 6, 1), ('Adult Brief - Medium', 4, 2), ('Underpads 23x36 (100ct)', 4, 3), ('Barrier Cream 4oz', 12, 4)) q(name, n, o)
    join supply_items s on s.organization_id = v_org and s.name = q.name;
  -- September, Dietary: food 1,004, detergent 96
  insert into supply_purchase_orders (organization_id, po_number, vendor_id, status, ordered_date, department, shipping_cost, ordered_by)
  values (v_org, 'PO-1011', v_sysco, 'received', '2026-09-17', 'dietary', 0, u_diet) returning id into po;
  insert into supply_po_line_items (po_id, organization_id, supply_item_id, description, unit, quantity_ordered, quantity_received, unit_cost, is_received, received_at, sort_order) values
    (po, v_org, i_chicken,   'Chicken Breast, Boneless (40 lb)', 'case', 4, 4, 68.00, true, '2026-09-19 15:00+00', 1),
    (po, v_org, i_beef,      'Ground Beef 80/20 (20 lb)',        'case', 2, 2, 72.00, true, '2026-09-19 15:00+00', 2),
    (po, v_org, i_produce,   'Fresh Produce Assortment',         'box',  6, 6, 45.00, true, '2026-09-19 15:00+00', 3),
    (po, v_org, i_milk,      'Milk 2% (4 gal)',                  'case', 4, 4, 28.00, true, '2026-09-19 15:00+00', 4),
    (po, v_org, i_bread,     'Sandwich Bread (12 loaves)',       'case', 4, 4, 24.00, true, '2026-09-19 15:00+00', 5),
    (po, v_org, i_coffee,    'Coffee, Ground (24 ct)',           'case', 2, 2, 55.00, true, '2026-09-19 15:00+00', 6),
    (po, v_org, i_detergent, 'Dish Machine Detergent (4 gal)',   'case', 2, 2, 48.00, true, '2026-09-19 15:00+00', 7);
  -- September, Central Supply (McKesson): 192 + 85.50 + 117.50 + 74 = 469
  insert into supply_purchase_orders (organization_id, po_number, vendor_id, status, ordered_date, shipping_cost, ordered_by)
  values (v_org, 'PO-1012', v_mck, 'received', '2026-09-18', 0, u_cs) returning id into po;
  insert into supply_po_line_items (po_id, organization_id, supply_item_id, description, unit, quantity_ordered, quantity_received, unit_cost, is_received, received_at, sort_order)
  select po, v_org, s.id, s.name, s.unit, q.n, q.n, s.cost_per_unit, true, '2026-09-22 15:00+00', q.o
    from (values ('Foam Dressing 4x4 (10ct)', 6, 1), ('Gauze Pads 4x4 (200ct)', 6, 2), ('Nitrile Gloves M (100ct)', 10, 3), ('Skin Barrier Wipes (50ct)', 4, 4)) q(name, n, o)
    join supply_items s on s.organization_id = v_org and s.name = q.name;
  -- October (current month), Dietary, submitted: 225 + 112 = 337
  insert into supply_purchase_orders (organization_id, po_number, vendor_id, status, ordered_date, department, shipping_cost, ordered_by)
  values (v_org, 'PO-1013', v_sysco, 'submitted', '2026-10-01', 'dietary', 0, u_diet) returning id into po;
  insert into supply_po_line_items (po_id, organization_id, supply_item_id, description, unit, quantity_ordered, unit_cost, sort_order) values
    (po, v_org, i_produce, 'Fresh Produce Assortment', 'box',  5, 45.00, 1),
    (po, v_org, i_milk,    'Milk 2% (4 gal)',          'case', 4, 28.00, 2);

  -- ── Food waste (August 15.00; September 52.75) ──
  insert into food_waste_logs (organization_id, logged_by, waste_date, category, description, quantity, unit, estimated_cost) values
    (v_org, u_diet, '2026-08-20', 'over_production', 'Leftover mashed potatoes, lunch', 4, 'lb', 15.00),
    (v_org, u_diet, '2026-09-08', 'over_production', 'Extra baked chicken, dinner', 5, 'lb', 18.50),
    (v_org, u_diet, '2026-09-15', 'plate_waste', 'Vegetable medley returned on trays', 7, 'lb', 12.25),
    (v_org, u_diet, '2026-09-22', 'spoilage', 'Produce past date (lettuce, berries)', 1, 'box', 22.00);

  -- ── Off-system purchase (September, food 86.40) ──
  insert into budget_manual_spend (organization_id, department, category, spend_date, amount, vendor, description, entered_by)
  values (v_org, 'dietary', 'food', '2026-09-24', 86.40, 'Kroger', 'Birthday cake and fresh fruit for the September birthday party', u_diet);

  -- ── Central Supply issues (September) ──
  -- Resident charges: 532.50 total; first six billed (409.50), last three not (123.00)
  insert into supply_transactions (organization_id, supply_item_id, transaction_type, quantity, quantity_before, quantity_after,
                                   unit_cost, sale_price, resident_id, performed_by, created_at, billed_at, billed_by, billing_reference)
  select v_org, s.id, 'issue_resident', -q.n, s.quantity_on_hand + q.n, s.quantity_on_hand, s.cost_per_unit, s.sale_price,
         q.res, u_cs, q.at::timestamptz,
         case when q.billed then '2026-09-30 21:00+00'::timestamptz end, case when q.billed then u_cs end,
         case when q.billed then 'Sept resident statements' end
    from (values ('Adult Brief - Large',          2, r_simmons,   '2026-09-02 15:00+00', true),
                 ('Barrier Cream 4oz',            2, r_monroe,    '2026-09-05 15:00+00', true),
                 ('Foam Dressing 4x4 (10ct)',     1, r_foster,    '2026-09-09 15:00+00', true),
                 ('Adult Brief - Medium',         1, r_hudson,    '2026-09-12 15:00+00', true),
                 ('Disposable Washcloths (48ct)', 3, r_thornton,  '2026-09-16 15:00+00', true),
                 ('Adult Brief - Large',          2, r_simmons,   '2026-09-19 15:00+00', true),
                 ('Skin Barrier Wipes (50ct)',    1, r_delgado,   '2026-09-23 15:00+00', false),
                 ('Pull-Up Underwear - Med',      1, r_patterson, '2026-09-26 15:00+00', false),
                 ('Underpads 23x36 (100ct)',      1, r_monroe,    '2026-09-29 15:00+00', false)) q(name, n, res, at, billed)
    join supply_items s on s.organization_id = v_org and s.name = q.name;
  -- Chargeable items issued to Nursing (never charged): 177 + 46 + 35 = 258
  -- and non-chargeable stock to Housekeeping (40.50 + 45.00 = 85.50 of Housekeeping spend)
  insert into supply_transactions (organization_id, supply_item_id, transaction_type, quantity, quantity_before, quantity_after,
                                   unit_cost, sale_price, department, performed_by, created_at)
  select v_org, s.id, 'issue_dept', -q.n, s.quantity_on_hand + q.n, s.quantity_on_hand, s.cost_per_unit, s.sale_price,
         q.dept, u_cs, q.at::timestamptz
    from (values ('Adult Brief - Large',          3, 'Nursing',      '2026-09-08 15:00+00'),
                 ('Barrier Cream 4oz',            4, 'Nursing',      '2026-09-15 15:00+00'),
                 ('Disposable Washcloths (48ct)', 2, 'Nursing',      '2026-09-22 15:00+00'),
                 ('Disinfectant Spray 32oz',      6, 'Housekeeping', '2026-09-10 15:00+00'),
                 ('Trash Bags 33gal (100ct)',     2, 'Housekeeping', '2026-09-10 15:00+00')) q(name, n, dept, at)
    join supply_items s on s.organization_id = v_org and s.name = q.name;
end
$seed$;
