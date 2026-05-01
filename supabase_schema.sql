-- ─── Settings ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ─── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  split      TEXT NOT NULL DEFAULT 'Half',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- ─── Transactions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date        TEXT NOT NULL,
  owner       TEXT NOT NULL,
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      REAL NOT NULL,
  status      TEXT NOT NULL DEFAULT 'P',
  month       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Recurring Payments ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_payments (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  due_date   TEXT NOT NULL,
  type       TEXT NOT NULL,
  amount     REAL NOT NULL,
  th_pay     REAL NOT NULL DEFAULT 0,
  ma_pay     REAL NOT NULL DEFAULT 0,
  th_paid    REAL NOT NULL DEFAULT 0,
  ma_paid    REAL NOT NULL DEFAULT 0,
  month      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE settings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_payments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and write everything
CREATE POLICY "auth_all" ON settings           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON categories         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON transactions       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON recurring_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Seed default categories ───────────────────────────────────────────────────
INSERT INTO categories (name, split, sort_order) VALUES
  ('Food',         'Half',     1),
  ('Household',    'Salary',   2),
  ('Car',          'Salary',   3),
  ('Bill',         'Salary',   4),
  ('Baby',         'Half',     5),
  ('Maintenance',  'Half',     6),
  ('Other',        'Half',     7),
  ('Fun',          'Half',     8),
  ('Subscription', 'Salary',   9),
  ('Shopping',     'Half',     10),
  ('Online',       'Half',     11),
  ('Taxi',         'Half',     12),
  ('Medicine',     'Half',     13),
  ('Installment',  'Salary',   14),
  ('Deposit',      'Salary',   15),
  ('Personal',     'Personal', 16)
ON CONFLICT (name) DO NOTHING;

-- ─── Seed default settings ─────────────────────────────────────────────────────
INSERT INTO settings (key, value) VALUES
  ('th_name',   'Tharindu'),
  ('ma_name',   'Maldini'),
  ('th_salary', '7506'),
  ('ma_salary', '7072')
ON CONFLICT (key) DO NOTHING;
