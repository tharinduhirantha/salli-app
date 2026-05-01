-- ============================================================
-- Fresh seed — wipe all data for the house and reload April 2026
-- Run in Supabase SQL Editor
--
-- House : 7d8b1974-8fe3-40d1-bb27-fadf02fdebd8
-- TH    : 074f93e7-e694-4b08-a65a-62a46f89077d
-- MA    : 46e762db-2a30-4f53-b153-cc7d91dff3ae
-- ============================================================

DO $$
DECLARE
  hid UUID := '7d8b1974-8fe3-40d1-bb27-fadf02fdebd8';
  th  UUID := '074f93e7-e694-4b08-a65a-62a46f89077d';
  ma  UUID := '46e762db-2a30-4f53-b153-cc7d91dff3ae';
  pid UUID;
BEGIN

  -- ── WIPE ─────────────────────────────────────────────────────
  DELETE FROM recurring_payment_shares
    WHERE payment_id IN (SELECT id FROM recurring_payments WHERE house_id = hid);
  DELETE FROM recurring_payments WHERE house_id = hid;
  DELETE FROM transactions       WHERE house_id = hid;
  DELETE FROM member_salaries    WHERE house_id = hid;
  DELETE FROM categories         WHERE house_id = hid;

  -- ── Categories ───────────────────────────────────────────────
  INSERT INTO categories (name, split, sort_order, icon, is_recurring, house_id) VALUES
    ('Food',          'Half',     1,  'restaurant-outline',                 false, hid),
    ('Household',     'Salary',   2,  'home-outline',                       false, hid),
    ('Car',           'Salary',   3,  'car-outline',                        false, hid),
    ('House Payments','Salary',   4,  'home-outline',                       true,  hid),
    ('Car Payments',  'Salary',   5,  'car-sport-outline',                  true,  hid),
    ('Bill',          'Salary',   6,  'receipt-outline',                    true,  hid),
    ('Subscription',  'Salary',   7,  'wifi-outline',                       true,  hid),
    ('Fun',           'Half',     8,  'game-controller-outline',            false, hid),
    ('Online',        'Half',     9,  'globe-outline',                      false, hid),
    ('Taxi',          'Half',     10, 'car-outline',                        false, hid),
    ('Medicine',      'Half',     11, 'medkit-outline',                     false, hid),
    ('Other',         'Half',     12, 'ellipsis-horizontal-circle-outline', false, hid),
    ('Installment',   'Salary',   13, 'card-outline',                       true,  hid),
    ('Maintenance',   'Half',     14, 'construct-outline',                  false, hid),
    ('Baby',          'Half',     15, 'heart-outline',                      false, hid),
    ('Shopping',      'Half',     16, 'bag-handle-outline',                 false, hid),
    ('Deposit',       'Salary',   17, 'wallet-outline',                     false, hid),
    ('Personal',      'Personal', 18, 'person-outline',                     false, hid);

  -- ── Salary splits (TH 51% / MA 49%) ─────────────────────────
  INSERT INTO member_salaries (house_id, user_id, month, salary, split_pct) VALUES
    (hid, th, 'default', 7266, 51),
    (hid, ma, 'default', 7072, 49);

  -- ── Transactions ─────────────────────────────────────────────
  INSERT INTO transactions (date, owner, category, description, amount, status, month, house_id, payment_method) VALUES
    -- April 1
    ('2026-04-01','TH','Food',        'Tacos',                    54.13, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-01','TH','Household',   'Sams',                    411.16, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-01','TH','Food',        'Pizza-baby',               11.90, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-01','TH','Car',         'Gas-M',                    32.47, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-01','TH','Household',   'Vishala',                  49.87, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-01','TH','Household',   'Vishala',                   4.29, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-01','TH','Food',        'Quicktrip',                 8.10, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-01','TH','Car',         'Gas-T',                    38.41, 'P',  '2026-04', hid, 'Card'),
    -- April 5
    ('2026-04-05','TH','Food',        'Biriyani tea',             16.16, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-05','TH','Household',   'HEB',                      20.33, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-05','TH','Other',       'HR block',                143.20, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-05','TH','Food',        'Italian',                  90.47, 'P',  '2026-04', hid, 'Card'),
    -- April 6
    ('2026-04-06','TH','Baby',        'Macy gift',                45.18, 'P',  '2026-04', hid, 'Card'),
    -- April 7
    ('2026-04-07','TH','Maintenance', 'Lowes',                    50.00, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-07','TH','Household',   'Triveni',                 134.24, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-07','TH','Other',       'Cake',                     55.21, 'P',  '2026-04', hid, 'Card'),
    -- April 8
    ('2026-04-08','TH','Baby',        'Pizza',                    11.90, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-08','TH','Baby',        'Marshall Toy',             10.00, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-08','TH','Shopping',    'Marshall',                 17.04, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-08','TH','Shopping',    'Burlington',               38.68, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-06','TH','Other',       'Heb Birthday',             16.22, 'P',  '2026-04', hid, 'Card'),
    -- April 10
    ('2026-04-10','TH','Baby',        'Macy toy',                 14.06, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-10','TH','Food',        'Lassi',                     4.59, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-10','TH','Food',        'Taco Bell',                30.98, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-10','TH','Food',        'Macdonald',                10.25, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-10','TH','Food',        'Starbucks Kroger',          6.10, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-10','TH','Shopping',    'Macy''s',                  14.98, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-10','TH','Car',         'Gas-T',                    46.31, 'P',  '2026-04', hid, 'Card'),
    -- April 11
    ('2026-04-11','TH','Other',       'Insurance',               188.35, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-11','TH','Household',   'Tunapaha Grocery',         92.45, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-11','TH','Other',       'Tunapaha Kawili',          90.00, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-11','TH','Food',        'Tunapaha Food',            30.00, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-11','TH','Household',   'HEB',                     153.33, 'P',  '2026-04', hid, 'Card'),
    -- April 13
    ('2026-04-13','TH','Car',         'Gas-M',                    29.37, 'P',  '2026-04', hid, 'Card'),
    -- April 15
    ('2026-04-15','TH','Household',   'Triveni',                 102.30, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-15','TH','Household',   'HEB',                      20.76, 'P',  '2026-04', hid, 'Card'),
    -- April 18
    ('2026-04-18','TH','Fun',         'Sysco',                    70.00, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Fun',         'Sysco',                    50.00, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Maintenance', 'Enchanted Garden',         20.22, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Car',         'Gas-T',                    37.69, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Household',   'Walmart',                   6.47, 'NP', '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Car',         'Gas-M',                    29.50, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Maintenance', 'Heb water purification',   30.66, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Maintenance', 'Heb plant',                32.48, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Household',   'Hmart',                   166.65, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Food',        'Hmart food',               18.45, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Maintenance', 'Homedepot',                21.65, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Maintenance', 'Homedepot',                21.65, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-18','TH','Food',        'Mexican Cantina',          80.35, 'P',  '2026-04', hid, 'Card'),
    -- Personal
    ('2026-04-03','TH','Personal',    'Specs',                    74.93, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-06','TH','Personal',    'Amma gift',               125.00, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-08','MA','Personal',    'Burlington sun',           10.00, 'NP', '2026-04', hid, 'Card'),
    ('2026-04-10','TH','Personal',    'American',                 91.93, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-10','MA','Personal',    'Macy''s',                  18.00, 'NP', '2026-04', hid, 'Card'),
    ('2026-04-10','TH','Personal',    'Macy''s shoes',            27.05, 'P',  '2026-04', hid, 'Card'),
    ('2026-04-15','MA','Personal',    'Sephora',                  23.38, 'NP', '2026-04', hid, 'Card');

  -- ── Recurring Payments ────────────────────────────────────────
  -- TH paid full amount for most; MA paid their own loan; some exceptions noted.
  -- is_paid = true when the person's paid amount > 0.

  -- House Mortgage: TH paid full $3148
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('House Mortgage', '2nd', 'House Payments', 3148.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 1605.48, 3148.00, true),
    (pid, ma, 1542.52,    0.00, false);

  -- Auto Loan - TH: TH paid $1000
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Auto Loan - TH', '7th', 'Car Payments', 1000.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 1000.00, 1000.00, true),
    (pid, ma,    0.00,    0.00, false);

  -- Auto Insurance: TH paid full $278
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Auto Insurance', 'MONTHLY', 'Car Payments', 278.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 141.78, 278.00, true),
    (pid, ma, 136.22,   0.00, false);

  -- Xfinity: TH paid full $130
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Xfinity', '28th', 'Bill', 130.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 65.00, 130.00, true),
    (pid, ma, 65.00,   0.00, false);

  -- Si Energy (Gas): TH paid full $36.10
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Si Energy (Gas)', '10th', 'Bill', 36.10, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 18.41, 36.10, true),
    (pid, ma, 17.69,  0.00, false);

  -- Si Envo (Water): TH paid full $116
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Si Envo (Water)', '25th', 'Bill', 116.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 59.16, 116.00, true),
    (pid, ma, 56.84,   0.00, false);

  -- Electricity: TH paid full $155.21
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Electricity', '20th', 'Bill', 155.21, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 79.16, 155.21, true),
    (pid, ma, 76.05,   0.00, false);

  -- HOA / Flood / Tax: TH paid full $150
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('HOA / Flood / Tax', 'YEARLY', 'House Payments', 150.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 76.50, 150.00, true),
    (pid, ma, 73.50,   0.00, false);

  -- EZ Tag: TH paid full $50
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('EZ Tag', 'MONTHLY', 'Bill', 50.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 25.50, 50.00, true),
    (pid, ma, 24.50,  0.00, false);

  -- Lawn: TH paid full $70 (cash)
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Lawn', '2 WEEKS', 'Bill', 70.00, '2026-04', hid, 'Cash') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 35.70, 70.00, true),
    (pid, ma, 34.30,  0.00, false);

  -- Aakain Investment: TH paid full $300
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Aakain Investment', 'MONTHLY', 'Baby', 300.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 150.00, 300.00, true),
    (pid, ma, 150.00,   0.00, false);

  -- Auto Loan - MA: MA paid $845
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Auto Loan - MA', 'MONTHLY', 'Car Payments', 845.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th,   0.00,   0.00, false),
    (pid, ma, 845.00, 845.00, true);

  -- Netflix: TH paid full $10
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Netflix', '1st', 'Subscription', 10.00, '2026-04', hid, 'Card') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 5.10, 10.00, true),
    (pid, ma, 4.90,  0.00, false);

  -- Amazon Prime: TH paid full $15
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Amazon Prime', '11th', 'Subscription', 15.00, '2026-04', hid, 'Card') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 7.65, 15.00, true),
    (pid, ma, 7.35,  0.00, false);

  -- Ring: TH paid full $11
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Ring', '10th', 'Subscription', 11.00, '2026-04', hid, 'Card') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 5.61, 11.00, true),
    (pid, ma, 5.39,  0.00, false);

  -- Mazda: TH paid full $10
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Mazda', '24th', 'Subscription', 10.00, '2026-04', hid, 'Card') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 5.10, 10.00, true),
    (pid, ma, 4.90,  0.00, false);

  -- Aakain Insurance: MA paid full $144 (MA paid both shares)
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Aakain Insurance', 'MONTHLY', 'Bill', 144.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 72.00,   0.00, false),
    (pid, ma, 72.00, 144.00, true);

  -- Thari Insurance: MA paid $144 (Tharindu's insurance, paid by MA)
  INSERT INTO recurring_payments (name, due_date, type, amount, month, house_id, payment_method)
    VALUES ('Thari Insurance', 'MONTHLY', 'Bill', 144.00, '2026-04', hid, 'Account') RETURNING id INTO pid;
  INSERT INTO recurring_payment_shares (payment_id, user_id, pay, paid, is_paid) VALUES
    (pid, th, 144.00,   0.00, false),
    (pid, ma,   0.00, 144.00, true);

END $$;
