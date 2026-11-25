-- Department documents: blank forms and handouts a department keeps on file to print as
-- needed (Social Services first; any department module can use the same table and screen).
--
--   department_documents.module = the permission module that owns it (e.g. 'social_services').
--   Read (list, open, print, download): can(module, 'view').
--   Manage (upload, rename, replace, remove): can(module, 'edit') or can(module, 'settings'),
--     i.e. the department's Supervisor and Manager job roles, plus Org Admins (can() is always
--     true for them) and ElderLoop support.
--   Files: private bucket department-documents at <organization_id>/<module>/<uuid>.<ext>,
--     opened with short-lived signed URLs.
--
-- Blank forms only: a form filled in with a resident's information belongs in that resident's
-- record, not here (the screen says so). That's why this table carries no phi_write_guard or
-- audit_ephi_changes and the tab isn't in the health-information view log.
-- role_view_only_guard isn't attached: it checks one fixed module per table, and the policies
-- here already require edit/settings on the row's own module.

create table public.department_documents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module          text not null check (module ~ '^[a-z_]{2,40}$'),
  title           text not null check (char_length(trim(title)) between 1 and 150),
  description     text check (char_length(description) <= 1000),
  category        text check (char_length(category) <= 80),     -- free-text folder, e.g. "Admission"
  file_path       text not null,
  file_name       text not null check (char_length(file_name) <= 255),
  mime_type       text check (char_length(mime_type) <= 120),
  file_size       integer check (file_size is null or file_size >= 0),
  created_by      uuid references public.profiles(id) on delete set null,
  updated_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index department_documents_org_module on public.department_documents (organization_id, module, category, title);

create or replace function public.department_documents_stamp()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    if pg_trigger_depth() > 1 then return new; end if;   -- foreign-key clean-up
    new.organization_id := old.organization_id;
    new.module := old.module;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  -- The file must sit in this community's folder for this module
  if new.file_path not like new.organization_id::text || '/' || new.module || '/%' or new.file_path like '%..%' then
    raise exception 'That file belongs somewhere else.' using errcode = '42501';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;
create trigger trg_department_documents_stamp before insert or update on public.department_documents
  for each row execute function public.department_documents_stamp();

create or replace function public.department_document_can_manage(p_module text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select coalesce(can(p_module, 'edit'), false) or coalesce(can(p_module, 'settings'), false)
$$;

alter table public.department_documents enable row level security;
create policy department_documents_read on public.department_documents for select to authenticated
  using ((organization_id = get_my_org_id() and coalesce(can(module, 'view'), false)) or get_my_role() = 'super_admin');
create policy department_documents_manage on public.department_documents for all to authenticated
  using ((organization_id = get_my_org_id() and department_document_can_manage(module)) or get_my_role() = 'super_admin')
  with check ((organization_id = get_my_org_id() and department_document_can_manage(module)) or get_my_role() = 'super_admin');
create policy staff_only_no_portal on public.department_documents as restrictive for all to authenticated
  using (not (select is_portal_user())) with check (not (select is_portal_user()));
create policy mfa_gate on public.department_documents as restrictive for all to authenticated
  using ((select mfa_ok())) with check ((select mfa_ok()));
create trigger trg_nha_write_guard before insert or update or delete on public.department_documents
  for each row execute function nha_write_guard('records');
revoke all on public.department_documents from anon;
grant select, insert, update, delete on public.department_documents to authenticated;

-- ── Files ────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('department-documents', 'department-documents', false, 26214400,
        array['application/pdf',
              'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/rtf', 'text/plain', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create or replace function public.department_document_storage_ok(p_name text, p_action text)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare v_org text := split_part(p_name, '/', 1);
        v_mod text := split_part(p_name, '/', 2);
begin
  if v_org !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or v_mod !~ '^[a-z_]{2,40}$' or split_part(p_name, '/', 3) = '' or split_part(p_name, '/', 4) <> ''
     or p_name like '%..%' then
    return false;
  end if;
  if not coalesce(mfa_ok(), false) or coalesce(is_portal_user(), false) then return false; end if;
  if get_my_role() = 'super_admin' then return true; end if;
  if v_org::uuid is distinct from get_my_org_id() then return false; end if;
  if p_action = 'read' then return coalesce(can(v_mod, 'view'), false); end if;
  return department_document_can_manage(v_mod);
end $$;

create policy "department-documents: read" on storage.objects for select to authenticated
  using (bucket_id = 'department-documents' and department_document_storage_ok(name, 'read'));
create policy "department-documents: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'department-documents' and department_document_storage_ok(name, 'manage'));
create policy "department-documents: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'department-documents' and department_document_storage_ok(name, 'manage'));

revoke execute on function public.department_document_can_manage(text), public.department_document_storage_ok(text, text) from anon, public;
grant execute on function public.department_document_can_manage(text), public.department_document_storage_ok(text, text) to authenticated;
