-- Help & Feedback attachments: screenshots, PDFs and documents sent with a help
-- request or suggestion (Maranatha emailed checklist PDFs because the form had no
-- way to attach them).
--
-- Private bucket. The sender uploads into a folder named after their user id and
-- can read their own files back; super admins read everything (signed URLs in
-- Super Admin -> Help & Feedback) and delete files with the message. The files
-- never go out by email: send-feedback-email only says how many came with it.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback-attachments', 'feedback-attachments', false, 10485760, array[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
])
on conflict (id) do nothing;

alter table public.platform_feedback
  add column if not exists attachments jsonb not null default '[]'::jsonb;

comment on column public.platform_feedback.attachments is
  'Files sent with the message: [{path, name, size, type}] in the feedback-attachments bucket, under <user_id>/';

drop policy if exists feedback_attachments_insert_own on storage.objects;
create policy feedback_attachments_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'feedback-attachments'
              and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists feedback_attachments_read on storage.objects;
create policy feedback_attachments_read on storage.objects
  for select to authenticated
  using (bucket_id = 'feedback-attachments'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or (select get_my_role()) = 'super_admin'));

drop policy if exists feedback_attachments_delete_admin on storage.objects;
create policy feedback_attachments_delete_admin on storage.objects
  for delete to authenticated
  using (bucket_id = 'feedback-attachments' and (select get_my_role()) = 'super_admin');

-- The stamp trigger already sets the sender, community and role. It now also
-- keeps only attachments in the sender's own folder (at most 5), so a message
-- can't point the super admin at someone else's file.
create or replace function public.platform_feedback_stamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    select p.organization_id, p.role::text into new.organization_id, new.role
      from profiles p where p.id = auth.uid();
    new.status := 'new';
    new.admin_note := null;
    new.attachments := coalesce((
      select jsonb_agg(jsonb_build_object(
               'path', a->>'path',
               'name', left(coalesce(nullif(a->>'name', ''), 'file'), 200),
               'size', case when (a->>'size') ~ '^\d+$' then (a->>'size')::bigint end,
               'type', left(a->>'type', 100)) order by ord)
        from jsonb_array_elements(
               case when jsonb_typeof(new.attachments) = 'array' then new.attachments else '[]'::jsonb end
             ) with ordinality as t(a, ord)
       where ord <= 5
         and jsonb_typeof(a) = 'object'
         and (a->>'path') like auth.uid()::text || '/%'
         and (a->>'path') not like '%..%'
    ), '[]'::jsonb);
  end if;
  new.updated_at := now();
  return new;
end;
$$;
