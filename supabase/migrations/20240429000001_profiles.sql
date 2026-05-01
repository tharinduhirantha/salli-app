-- ─── Profiles ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname   TEXT NOT NULL CHECK (char_length(nickname) = 2),
  full_name  TEXT NOT NULL,
  salary     REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_all"  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_write_own" ON profiles FOR ALL    TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
