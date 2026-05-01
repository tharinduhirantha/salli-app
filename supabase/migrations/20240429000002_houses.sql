-- ─── Houses ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS houses (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  join_code  TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── House Members ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS house_members (
  house_id  UUID REFERENCES houses(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (house_id, user_id)
);

-- ─── Add house_id to existing tables ─────────────────────────────────────────
ALTER TABLE transactions       ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id);
ALTER TABLE recurring_payments ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id);
ALTER TABLE categories         ADD COLUMN IF NOT EXISTS house_id UUID REFERENCES houses(id);

-- ─── Helper function (must be created before policies that use it) ────────────
CREATE OR REPLACE FUNCTION get_user_house_ids()
RETURNS SETOF UUID
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT house_id FROM house_members WHERE user_id = auth.uid();
$$;

-- ─── RLS: houses ─────────────────────────────────────────────────────────────
ALTER TABLE houses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "houses_select" ON houses FOR SELECT TO authenticated
  USING (id IN (SELECT get_user_house_ids()));
CREATE POLICY "houses_insert" ON houses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "houses_update" ON houses FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- ─── RLS: house_members ───────────────────────────────────────────────────────
CREATE POLICY "hm_select" ON house_members FOR SELECT TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "hm_insert_self" ON house_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "hm_delete" ON house_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid() OR
    house_id IN (
      SELECT house_id FROM house_members WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ─── Update RLS: house-scoped data tables ─────────────────────────────────────
DROP POLICY IF EXISTS "auth_all" ON transactions;
CREATE POLICY "tx_select" ON transactions FOR SELECT TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "tx_insert" ON transactions FOR INSERT TO authenticated
  WITH CHECK (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "tx_update" ON transactions FOR UPDATE TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "tx_delete" ON transactions FOR DELETE TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));

DROP POLICY IF EXISTS "auth_all" ON recurring_payments;
CREATE POLICY "rec_select" ON recurring_payments FOR SELECT TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "rec_insert" ON recurring_payments FOR INSERT TO authenticated
  WITH CHECK (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "rec_update" ON recurring_payments FOR UPDATE TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "rec_delete" ON recurring_payments FOR DELETE TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));

DROP POLICY IF EXISTS "auth_all" ON categories;
CREATE POLICY "cat_select" ON categories FOR SELECT TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()) OR house_id IS NULL);
CREATE POLICY "cat_insert" ON categories FOR INSERT TO authenticated
  WITH CHECK (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "cat_update" ON categories FOR UPDATE TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "cat_delete" ON categories FOR DELETE TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));

-- Remove unscoped global categories (re-seeded per-house on creation)
DELETE FROM categories WHERE house_id IS NULL;
