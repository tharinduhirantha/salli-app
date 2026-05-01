-- Per-month salary override per member per house.
-- Falls back to profiles.salary when no row exists for a given month.
CREATE TABLE IF NOT EXISTS member_salaries (
  house_id  UUID REFERENCES houses(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month     TEXT NOT NULL,
  salary    REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (house_id, user_id, month)
);

ALTER TABLE member_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_select" ON member_salaries FOR SELECT TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "ms_insert" ON member_salaries FOR INSERT TO authenticated
  WITH CHECK (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "ms_update" ON member_salaries FOR UPDATE TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
CREATE POLICY "ms_delete" ON member_salaries FOR DELETE TO authenticated
  USING (house_id IN (SELECT get_user_house_ids()));
