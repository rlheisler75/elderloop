-- Corporate Executive role (access tiers, tier 5). Its own migration: a new enum
-- value can't be used in the transaction that adds it (see 20260930_corporate_layer.sql).
alter type user_role add value if not exists 'corporate';
