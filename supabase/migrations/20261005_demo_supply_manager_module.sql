-- Demo: the Central Supply Manager login (demo.supplymanager, added in
-- 20261003_demo_budget_phase2_data.sql) had the department role but no Central Supply
-- module access. The demo's 'manager' role template doesn't include central_supply,
-- and other demo logins get their modules through explicit grants, like this one.
insert into user_module_permissions (organization_id, user_id, module_key, access_level, granted_by, granted_at)
select 'a5555c06-f99d-4ec0-ad2f-e3c818466bb2', 'aaaaaaaa-0016-0016-0016-000000000016', 'central_supply', 'edit',
       'aaaaaaaa-0001-0001-0001-000000000001', now()
 where not exists (select 1 from user_module_permissions
                    where user_id = 'aaaaaaaa-0016-0016-0016-000000000016' and module_key = 'central_supply');
