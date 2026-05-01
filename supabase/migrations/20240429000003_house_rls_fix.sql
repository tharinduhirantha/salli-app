-- Allow house creator to SELECT their own house (before being added as member)
DROP POLICY IF EXISTS "houses_select" ON houses;
CREATE POLICY "houses_select" ON houses FOR SELECT TO authenticated
  USING (
    id IN (SELECT get_user_house_ids())
    OR created_by = auth.uid()
  );

-- SECURITY DEFINER function so any authenticated user can look up a house
-- by join code without needing to be a member (required for the join flow)
CREATE OR REPLACE FUNCTION find_house_by_code(p_join_code TEXT)
RETURNS TABLE(id UUID, name TEXT)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT h.id, h.name FROM houses h WHERE h.join_code = p_join_code;
$$;
