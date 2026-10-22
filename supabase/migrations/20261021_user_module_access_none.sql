-- Per-user "No Access" that overrides Role Templates.
-- Before this, "No Access" in Admin Panel → Module Access by User just deleted the
-- user's row, so a module granted by role_module_visibility stayed visible. A row
-- with access_level = 'none' is now an explicit deny (AuthContext.hasModule checks
-- the user's own row first). No row = follow the role template / role defaults.
-- The RLS policies that read this table (broadcast_messages, push_notifications)
-- already require access_level 'edit' or 'view', so a 'none' row grants nothing.
alter table public.user_module_permissions
  add constraint user_module_permissions_access_level_check
  check (access_level in ('edit', 'view', 'none'));
