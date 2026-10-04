-- Demo community: Dietary budget $9,000 → $2,500 a month for 2026, so it reads
-- realistically against the demo's spend (~$2,300 in September, about $5.64 per
-- resident day for 13–14 residents). September becomes 91% used, August 82%.
update budgets set amount = 2500, set_at = now()
 where organization_id = 'a5555c06-f99d-4ec0-ad2f-e3c818466bb2' and department = 'dietary'
   and category is null and month between '2026-01-01' and '2026-12-01';
