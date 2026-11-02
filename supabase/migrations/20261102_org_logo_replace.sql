-- Organization Settings uploads the logo to announcement-images/logos/<org id>/logo.<ext>
-- with upsert, so a second upload replaces the file. The bucket had insert, select, and
-- delete policies but no update policy, so every replacement failed. Let the people who
-- can save Organization Settings replace their own community's logo.
create policy org_admins_replace_own_logo on storage.objects
  for update to authenticated
  using (
    bucket_id = 'announcement-images'
    and (storage.foldername(name))[1] = 'logos'
    and (
      ((storage.foldername(name))[2] = get_my_org_id()::text
        and get_my_role() = any (array['org_admin', 'ceo', 'manager']))
      or get_my_role() = 'super_admin'
    )
  )
  with check (
    bucket_id = 'announcement-images'
    and (storage.foldername(name))[1] = 'logos'
    and (
      ((storage.foldername(name))[2] = get_my_org_id()::text
        and get_my_role() = any (array['org_admin', 'ceo', 'manager']))
      or get_my_role() = 'super_admin'
    )
  );
