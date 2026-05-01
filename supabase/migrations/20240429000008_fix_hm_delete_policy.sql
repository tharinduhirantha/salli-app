-- Fix: hm_delete policy referenced house_members in its own USING subquery,
-- causing "infinite recursion detected in policy for relation house_members"
-- in PostgreSQL 14+. Move the owner check into a SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION is_house_owner(p_house_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM house_members
    WHERE house_id = p_house_id
      AND user_id   = auth.uid()
      AND role      = 'owner'
  );
$$;

DROP POLICY IF EXISTS "hm_delete" ON house_members;
CREATE POLICY "hm_delete" ON house_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR is_house_owner(house_id)
  );
