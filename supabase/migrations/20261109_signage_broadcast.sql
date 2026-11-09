-- Real-time signage. Screens sign in as nobody (anon), so postgres_changes
-- only reached them for rows anon can read: hiding/expiring an announcement,
-- unchecking "show on signage", deletes and menu edits never arrived and the
-- screen waited for its 1-minute refresh. Instead, any change that affects a
-- screen sends a public "refresh" broadcast on topic signage-<org id>, and the
-- screen reloads its data. One message per community per transaction, so a
-- bulk menu copy doesn't flood the screens.
create or replace function public.signage_ping()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record := coalesce(new, old);
  v_org uuid;
  v_key text;
begin
  if tg_table_name in ('announcements', 'activities', 'chapel_services', 'cycle_menus', 'menu_items', 'signage_screens') then
    v_org := r.organization_id;
  elsif tg_table_name = 'cycle_menu_days' then
    select organization_id into v_org from cycle_menus where id = r.cycle_menu_id;
  elsif tg_table_name = 'cycle_menu_meals' then
    select m.organization_id into v_org
      from cycle_menu_days d join cycle_menus m on m.id = d.cycle_menu_id
     where d.id = r.cycle_menu_day_id;
  elsif tg_table_name = 'meal_courses' then
    select m.organization_id into v_org
      from cycle_menu_meals ml
      join cycle_menu_days d on d.id = ml.cycle_menu_day_id
      join cycle_menus m on m.id = d.cycle_menu_id
     where ml.id = r.meal_id;
  end if;
  if v_org is null then return null; end if;

  v_key := 'signage.sent_' || replace(v_org::text, '-', '_');
  if coalesce(current_setting(v_key, true), '') = '1' then return null; end if;
  perform set_config(v_key, '1', true);

  begin
    perform realtime.send(jsonb_build_object('table', tg_table_name), 'refresh', 'signage-' || v_org, false);
  exception when others then
    null; -- a screen refresh must never block a save
  end;
  return null;
end;
$function$;

do $$
declare t text;
begin
  foreach t in array array['announcements', 'activities', 'chapel_services', 'cycle_menus',
    'cycle_menu_days', 'cycle_menu_meals', 'meal_courses', 'menu_items', 'signage_screens']
  loop
    execute format('drop trigger if exists signage_ping on public.%I', t);
    execute format('create trigger signage_ping after insert or update or delete on public.%I
                    for each row execute function public.signage_ping()', t);
  end loop;
end $$;
