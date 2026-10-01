-- New purchase-order status for orders over organizations.approval_po_threshold
-- that are waiting for the Administrator. Its own migration: Postgres can't use a
-- new enum value in the same transaction that adds it (see
-- 20260930_access_tiers_central_supply.sql, applied right after this).
alter type supply_po_status add value if not exists 'awaiting_approval' after 'draft';
