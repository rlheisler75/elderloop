-- Vendor ordering, option 1: send a submitted purchase order to the vendor as a
-- download (CSV / printable PDF) or an email with the CSV attached
-- (send-purchase-order Edge Function).
--
-- Built so system-to-system ordering (EDI, cXML punchout, a vendor API) can be added
-- later without reshaping these tables:
--   * po_messages: one log of every order document sent and, later, every vendor
--     message received (acknowledgment / ship notice / invoice), with direction,
--     channel, status, the vendor's reference number, and a frozen payload of exactly
--     what was sent. Today's downloads and emails are its first rows.
--   * supply_vendor_items: the vendor's own item code (e.g. Sysco SUPC), pack size,
--     order unit, and last price per item, kept in sync from supply_items.sku +
--     preferred_vendor_id. EDI and punchout both need this mapping.
--   * supply_po_line_items: a stable line_number (EDI line references) and a
--     vendor_item_code snapshot, plus empty columns for what an acknowledgment will
--     confirm (quantity, price, line status).
--   * supply_purchase_orders: vendor_order_ref (the vendor's confirmation number),
--     transmitted_at / transmit_channel, vendor_status.
--   * supply_vendors: order_email, order_channel (manual | email | edi | punchout | api),
--     order_file_format (generic now; a vendor-specific layout later).
--   * vendor_integrations: per-vendor EDI / punchout / API settings (non-secret
--     config only; credentials go in Supabase Vault), set up by ElderLoop.
-- Server-side processes (service role) can write confirmations onto submitted orders:
-- supply_po_line_guard only restricts signed-in users.

-- ── Vendors ──────────────────────────────────────────────────────────────────
alter table supply_vendors add column if not exists order_email text;
alter table supply_vendors add column if not exists order_channel text not null default 'manual';
alter table supply_vendors add column if not exists order_file_format text not null default 'generic';
alter table supply_vendors drop constraint if exists supply_vendors_order_channel_check;
alter table supply_vendors add constraint supply_vendors_order_channel_check
  check (order_channel in ('manual', 'email', 'edi', 'punchout', 'api'));

-- ── Who may send orders to vendors ───────────────────────────────────────────
-- Central Supply / Dietary Managers and Org Admins (and the Administrator in legacy
-- communities; in tiered ones the NHA approves orders but doesn't place them).
create or replace function public.supply_can_order()
returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce(
    get_my_role() in ('org_admin', 'super_admin')
    or (get_my_role() = 'ceo' and not my_org_tiered())
    or (get_my_role() <> 'ceo' and (supply_is_manager() or not my_org_tiered() and supply_is_staff())),
    false)
$function$;

-- ── Vendor item catalog ──────────────────────────────────────────────────────
create table if not exists supply_vendor_items (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations(id) on delete cascade,
  vendor_id          uuid not null references supply_vendors(id) on delete cascade,
  supply_item_id     uuid not null references supply_items(id) on delete cascade,
  vendor_item_code   text not null,
  vendor_description text,
  pack_size          text,
  order_unit         text,
  last_price         numeric(12, 4),
  last_price_at      timestamptz,
  is_preferred       boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (vendor_id, supply_item_id)
);
create index if not exists supply_vendor_items_code on supply_vendor_items (vendor_id, vendor_item_code);
alter table supply_vendor_items enable row level security;
drop policy if exists vendor_items_read on supply_vendor_items;
create policy vendor_items_read on supply_vendor_items for select to authenticated
  using (organization_id = (select get_my_org_id()) and (select get_my_role()) not in ('family', 'resident'));
drop policy if exists vendor_items_write on supply_vendor_items;
create policy vendor_items_write on supply_vendor_items for all to authenticated
  using (organization_id = (select get_my_org_id()) and (select supply_can_order()))
  with check (organization_id = (select get_my_org_id()) and (select supply_can_order()));

-- Keep the catalog in step with the item's own code and preferred vendor
create or replace function public.sync_supply_vendor_item()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if nullif(trim(new.sku), '') is not null and new.preferred_vendor_id is not null then
    insert into supply_vendor_items (organization_id, vendor_id, supply_item_id, vendor_item_code, order_unit, last_price, last_price_at)
    values (new.organization_id, new.preferred_vendor_id, new.id, trim(new.sku), new.unit::text, new.cost_per_unit, now())
    on conflict (vendor_id, supply_item_id) do update
      set vendor_item_code = excluded.vendor_item_code, order_unit = excluded.order_unit, updated_at = now();
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_sync_supply_vendor_item on supply_items;
create trigger trg_sync_supply_vendor_item after insert or update of sku, preferred_vendor_id, unit on supply_items
  for each row execute function sync_supply_vendor_item();

insert into supply_vendor_items (organization_id, vendor_id, supply_item_id, vendor_item_code, order_unit, last_price, last_price_at)
select si.organization_id, si.preferred_vendor_id, si.id, trim(si.sku), si.unit::text, si.cost_per_unit, now()
  from supply_items si
 where nullif(trim(si.sku), '') is not null and si.preferred_vendor_id is not null
on conflict (vendor_id, supply_item_id) do nothing;

-- ── Integration settings (EDI / punchout / API), set up by ElderLoop ──────────
create table if not exists vendor_integrations (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  vendor_id        uuid not null references supply_vendors(id) on delete cascade,
  channel          text not null check (channel in ('edi', 'punchout', 'api')),
  status           text not null default 'draft' check (status in ('draft', 'testing', 'live', 'disabled')),
  config           jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (vendor_id, channel)
);
alter table vendor_integrations enable row level security;
drop policy if exists vendor_integrations_read on vendor_integrations;
create policy vendor_integrations_read on vendor_integrations for select to authenticated
  using ((organization_id = (select get_my_org_id()) and (select supply_can_order())) or (select get_my_role()) = 'super_admin');
drop policy if exists vendor_integrations_super_admin on vendor_integrations;
create policy vendor_integrations_super_admin on vendor_integrations for all to authenticated
  using ((select get_my_role()) = 'super_admin') with check ((select get_my_role()) = 'super_admin');

-- ── Purchase orders ──────────────────────────────────────────────────────────
alter table supply_purchase_orders add column if not exists vendor_order_ref text;
alter table supply_purchase_orders add column if not exists transmitted_at timestamptz;
alter table supply_purchase_orders add column if not exists transmit_channel text;
alter table supply_purchase_orders add column if not exists vendor_status text;
alter table supply_purchase_orders drop constraint if exists supply_purchase_orders_vendor_status_check;
alter table supply_purchase_orders add constraint supply_purchase_orders_vendor_status_check
  check (vendor_status is null or vendor_status in ('acknowledged', 'partially_accepted', 'rejected', 'shipped', 'invoiced'));

alter table supply_po_line_items add column if not exists line_number int;
alter table supply_po_line_items add column if not exists vendor_item_code text;
alter table supply_po_line_items add column if not exists quantity_confirmed numeric;
alter table supply_po_line_items add column if not exists unit_cost_confirmed numeric;
alter table supply_po_line_items add column if not exists vendor_line_status text;
alter table supply_po_line_items drop constraint if exists supply_po_line_items_vendor_line_status_check;
alter table supply_po_line_items add constraint supply_po_line_items_vendor_line_status_check
  check (vendor_line_status is null or vendor_line_status in ('accepted', 'changed', 'backordered', 'substituted', 'rejected'));

-- Line numbers: assigned once, never reused (EDI acknowledgments refer to them)
update supply_po_line_items li set line_number = x.n
  from (select id, row_number() over (partition by po_id order by sort_order nulls last, created_at, id) n
          from supply_po_line_items) x
 where li.id = x.id and li.line_number is null;
create unique index if not exists supply_po_line_items_line_number on supply_po_line_items (po_id, line_number);

create or replace function public.supply_po_line_defaults()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  if new.line_number is null then
    perform pg_advisory_xact_lock(hashtext(new.po_id::text));
    select coalesce(max(line_number), 0) + 1 into new.line_number from supply_po_line_items where po_id = new.po_id;
  end if;
  if new.vendor_item_code is null and new.supply_item_id is not null then
    select coalesce(vi.vendor_item_code, nullif(trim(si.sku), '')) into new.vendor_item_code
      from supply_items si
      left join supply_purchase_orders po on po.id = new.po_id
      left join supply_vendor_items vi on vi.supply_item_id = si.id and vi.vendor_id = po.vendor_id
     where si.id = new.supply_item_id;
  end if;
  return new;
end;
$function$;
drop trigger if exists trg_supply_po_line_defaults on supply_po_line_items;
create trigger trg_supply_po_line_defaults before insert on supply_po_line_items
  for each row execute function supply_po_line_defaults();

-- ── Message log ──────────────────────────────────────────────────────────────
create table if not exists po_messages (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations(id) on delete cascade,
  po_id            uuid not null references supply_purchase_orders(id) on delete cascade,
  vendor_id        uuid references supply_vendors(id) on delete set null,
  direction        text not null check (direction in ('outbound', 'inbound')),
  channel          text not null check (channel in ('download', 'print', 'email', 'edi', 'punchout', 'api')),
  message_type     text not null default 'order'
                   check (message_type in ('order', 'order_change', 'order_cancel', 'acknowledgment', 'ship_notice', 'invoice')),
  status           text not null default 'generated'
                   check (status in ('generated', 'sent', 'delivered', 'accepted', 'rejected', 'failed')),
  external_ref     text,
  recipient        text,
  payload          jsonb not null default '{}',
  raw              text,
  error            text,
  created_by       uuid references profiles(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  processed_at     timestamptz
);
create index if not exists po_messages_po on po_messages (po_id, created_at);
alter table po_messages enable row level security;
-- Seen by whoever may place orders, plus the Administrator; written only by the
-- functions below and server-side processes
drop policy if exists po_messages_read on po_messages;
create policy po_messages_read on po_messages for select to authenticated using (
  (organization_id = (select get_my_org_id()) and ((select supply_can_order()) or (select get_my_role()) = 'ceo'))
  or (select get_my_role()) = 'super_admin');

-- The order as the vendor sees it: header + lines with the vendor's item codes
create or replace function public.po_vendor_document(p_po uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $function$
  select jsonb_build_object(
    'po_number', po.po_number,
    'po_id', po.id,
    'ordered_date', coalesce(po.ordered_date, po.created_at::date),
    'expected_date', po.expected_date,
    'vendor', jsonb_build_object('id', v.id, 'name', coalesce(v.name, po.vendor_name_free),
                                 'account_number', v.account_number, 'order_email', coalesce(nullif(trim(v.order_email), ''), v.email)),
    'ship_to', jsonb_build_object('name', o.name, 'address', o.address, 'city', o.city, 'state', o.state, 'zip', o.zip, 'phone', o.phone),
    'ordered_by', nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
    'ordered_by_email', p.email,
    'notes', po.notes,
    'shipping_cost', po.shipping_cost,
    'lines', coalesce((
      select jsonb_agg(jsonb_build_object(
               'line', li.line_number,
               'item_code', coalesce(vi.vendor_item_code, li.vendor_item_code, nullif(trim(si.sku), '')),
               'description', coalesce(nullif(trim(li.description), ''), si.name),
               'quantity', li.quantity_ordered,
               'unit', coalesce(vi.order_unit, li.unit::text, si.unit::text),
               'unit_price', li.unit_cost,
               'extended', round(coalesce(li.quantity_ordered, 0) * coalesce(li.unit_cost, 0), 2))
             order by li.line_number)
        from supply_po_line_items li
        left join supply_items si on si.id = li.supply_item_id
        left join supply_vendor_items vi on vi.supply_item_id = li.supply_item_id and vi.vendor_id = po.vendor_id
       where li.po_id = po.id), '[]'::jsonb))
  from supply_purchase_orders po
  join organizations o on o.id = po.organization_id
  left join supply_vendors v on v.id = po.vendor_id
  left join profiles p on p.id = po.ordered_by
  where po.id = p_po
$function$;
revoke all on function public.po_vendor_document(uuid) from public, anon, authenticated;

-- Record that an order was sent (download, print, or email) and return what was sent.
-- The first send stamps transmitted_at / transmit_channel on the order.
create or replace function public.record_po_message(p_po uuid, p_channel text, p_recipient text default null)
returns table (message_id uuid, payload jsonb)
language plpgsql security definer set search_path to 'public' as $function$
declare po supply_purchase_orders; v_doc jsonb; v_id uuid;
begin
  select * into po from supply_purchase_orders where id = p_po;
  if po.id is null or not coalesce(get_my_role() = 'super_admin'
       or (get_my_org_id() is not null and po.organization_id = get_my_org_id()), false) then
    raise exception 'Purchase order not found' using errcode = '22023';
  end if;
  if not supply_can_order() then
    raise exception 'Only a Central Supply or Dietary Manager, or an Org Admin, sends orders to vendors' using errcode = '42501';
  end if;
  if po.status not in ('submitted', 'partially_received', 'received') then
    raise exception 'Submit the order (and get it approved, if needed) before sending it to the vendor' using errcode = '22023';
  end if;
  if p_channel not in ('download', 'print', 'email') then
    raise exception 'Unknown channel %', p_channel using errcode = '22023';
  end if;
  if p_channel = 'email' and nullif(trim(p_recipient), '') is null then
    raise exception 'An email address is needed' using errcode = '22023';
  end if;
  v_doc := po_vendor_document(p_po);
  insert into po_messages (organization_id, po_id, vendor_id, direction, channel, message_type, status, recipient, payload)
  values (po.organization_id, po.id, po.vendor_id, 'outbound', p_channel, 'order',
          case when p_channel = 'email' then 'generated' else 'sent' end, nullif(trim(p_recipient), ''), v_doc)
  returning id into v_id;
  -- Stamp the first send on the order (callers are Managers / Org Admins, whom
  -- supply_po_guard already lets update a submitted order)
  update supply_purchase_orders set transmitted_at = coalesce(transmitted_at, now()),
         transmit_channel = coalesce(transmit_channel, p_channel)
   where id = po.id and transmitted_at is null;
  return query select v_id, v_doc;
end;
$function$;

revoke all on function public.supply_can_order(), public.record_po_message(uuid, text, text) from public, anon;
grant execute on function public.supply_can_order(), public.record_po_message(uuid, text, text) to authenticated;
revoke all on function public.sync_supply_vendor_item(), public.supply_po_line_defaults() from public, anon, authenticated;
