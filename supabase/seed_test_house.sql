-- ============================================================
-- Spendy — Seed April 2026 data into test house
-- House:  7d8b1974-8fe3-40d1-bb27-fadf02fdebd8
-- TH:     7d8b1974-8fe3-40d1-bb27-fadf02fdebd8  (51%)
-- MA:     1cdb6fec-42c1-4efa-8bd0-7be7486d4ff1  (49%)
-- Run in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  hid   UUID := '7d8b1974-8fe3-40d1-bb27-fadf02fdebd8';
  th_id UUID := '7d8b1974-8fe3-40d1-bb27-fadf02fdebd8';
  ma_id UUID := '1cdb6fec-42c1-4efa-8bd0-7be7486d4ff1';
BEGIN

  -- ── Wipe existing data for this house ──────────────────────
  DELETE FROM transactions       WHERE house_id = hid;
  DELETE FROM recurring_payments WHERE house_id = hid;
  DELETE FROM member_salaries    WHERE house_id = hid;
  DELETE FROM categories         WHERE house_id = hid;

  -- ── Salary split (TH 51% / MA 49%) ─────────────────────────
  INSERT INTO member_salaries (house_id, user_id, month, salary, split_pct) VALUES
    (hid, th_id, 'default', 0, 51),
    (hid, ma_id, 'default', 0, 49)
  ON CONFLICT (house_id, user_id, month) DO UPDATE SET split_pct = EXCLUDED.split_pct;

  -- ── Categories ──────────────────────────────────────────────
  INSERT INTO categories (name, split, sort_order, icon, house_id) VALUES
    ('Food',          'Half',     1,  'restaurant-outline',                 hid),
    ('Household',     'Salary',   2,  'home-outline',                       hid),
    ('Car',           'Salary',   3,  'car-outline',                        hid),
    ('Bill',          'Salary',   4,  'receipt-outline',                    hid),
    ('Subscription',  'Salary',   5,  'wifi-outline',                       hid),
    ('Fun',           'Half',     6,  'game-controller-outline',            hid),
    ('Online',        'Half',     7,  'globe-outline',                      hid),
    ('Taxi',          'Half',     8,  'car-outline',                        hid),
    ('Medicine',      'Half',     9,  'medkit-outline',                     hid),
    ('Other',         'Half',     10, 'ellipsis-horizontal-circle-outline', hid),
    ('Installment',   'Salary',   11, 'card-outline',                       hid),
    ('Maintenance',   'Half',     12, 'construct-outline',                  hid),
    ('Baby',          'Half',     13, 'heart-outline',                      hid),
    ('Shopping',      'Half',     14, 'bag-handle-outline',                 hid),
    ('Deposit',       'Salary',   15, 'wallet-outline',                     hid),
    ('Personal',      'Personal', 16, 'person-outline',                     hid);

  -- ── Transactions ────────────────────────────────────────────
  INSERT INTO transactions (date,owner,category,description,amount,status,month,house_id,payment_method) VALUES
    ('2026-04-01','TH','Food',        'Tacos',                   54.13, 'P',  '2026-04',hid,'Card'),
    ('2026-04-01','TH','Household',   'Sams',                   411.16, 'P',  '2026-04',hid,'Card'),
    ('2026-04-01','TH','Food',        'Pizza-baby',              11.90, 'P',  '2026-04',hid,'Card'),
    ('2026-04-01','TH','Car',         'Gas-M',                   32.47, 'P',  '2026-04',hid,'Card'),
    ('2026-04-01','TH','Household',   'Vishala',                 49.87, 'P',  '2026-04',hid,'Card'),
    ('2026-04-01','TH','Household',   'Vishala',                  4.29, 'P',  '2026-04',hid,'Card'),
    ('2026-04-01','TH','Food',        'Quicktrip',                8.10, 'P',  '2026-04',hid,'Card'),
    ('2026-04-01','TH','Car',         'Gas-T',                   38.41, 'P',  '2026-04',hid,'Card'),
    ('2026-04-05','TH','Food',        'Biriyani tea',            16.16, 'P',  '2026-04',hid,'Card'),
    ('2026-04-05','TH','Household',   'HEB',                     20.33, 'P',  '2026-04',hid,'Card'),
    ('2026-04-05','TH','Other',       'HR block',               143.20, 'P',  '2026-04',hid,'Card'),
    ('2026-04-05','TH','Food',        'Italian',                 90.47, 'P',  '2026-04',hid,'Card'),
    ('2026-04-06','TH','Baby',        'Macy gift',               45.18, 'P',  '2026-04',hid,'Card'),
    ('2026-04-07','TH','Maintenance', 'Lowes',                   50.00, 'P',  '2026-04',hid,'Card'),
    ('2026-04-08','TH','Baby',        'Pizza',                   11.90, 'P',  '2026-04',hid,'Card'),
    ('2026-04-07','TH','Household',   'Triveni',                134.24, 'P',  '2026-04',hid,'Card'),
    ('2026-04-08','TH','Baby',        'Marshall Toy',            10.00, 'P',  '2026-04',hid,'Card'),
    ('2026-04-08','TH','Shopping',    'Marshall',                17.04, 'P',  '2026-04',hid,'Card'),
    ('2026-04-08','TH','Shopping',    'Burlington',              38.68, 'P',  '2026-04',hid,'Card'),
    ('2026-04-07','TH','Other',       'Cake',                    55.21, 'P',  '2026-04',hid,'Card'),
    ('2026-04-06','TH','Other',       'Heb Birthday',            16.22, 'P',  '2026-04',hid,'Card'),
    ('2026-04-10','TH','Baby',        'Macy toy',                14.06, 'P',  '2026-04',hid,'Card'),
    ('2026-04-10','TH','Food',        'Lassi',                    4.59, 'P',  '2026-04',hid,'Card'),
    ('2026-04-10','TH','Food',        'Taco Bell',               30.98, 'P',  '2026-04',hid,'Card'),
    ('2026-04-10','TH','Food',        'Macdonald',               10.25, 'P',  '2026-04',hid,'Card'),
    ('2026-04-10','TH','Food',        'Starbucks Kroger',         6.10, 'P',  '2026-04',hid,'Card'),
    ('2026-04-10','TH','Shopping',    'Macy''s',                 14.98, 'P',  '2026-04',hid,'Card'),
    ('2026-04-10','TH','Car',         'Gas-T',                   46.31, 'P',  '2026-04',hid,'Card'),
    ('2026-04-11','TH','Other',       'Insurance',              188.35, 'P',  '2026-04',hid,'Card'),
    ('2026-04-11','TH','Household',   'Tunapaha Grocery',        92.45, 'P',  '2026-04',hid,'Card'),
    ('2026-04-11','TH','Other',       'Tunapaha Kawili',         90.00, 'P',  '2026-04',hid,'Card'),
    ('2026-04-11','TH','Food',        'Tunapaha Food',           30.00, 'P',  '2026-04',hid,'Card'),
    ('2026-04-11','TH','Household',   'HEB',                    153.33, 'P',  '2026-04',hid,'Card'),
    ('2026-04-15','TH','Household',   'Triveni',                102.30, 'P',  '2026-04',hid,'Card'),
    ('2026-04-15','TH','Household',   'HEB',                     20.76, 'P',  '2026-04',hid,'Card'),
    ('2026-04-13','TH','Car',         'Gas-M',                   29.37, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Fun',         'Sysco',                   70.00, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Fun',         'Sysco',                   50.00, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Maintenance', 'Enchanted Garden',        20.22, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Car',         'Gas-T',                   37.69, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Household',   'Walmart',                  6.47, 'NP', '2026-04',hid,'Card'),
    ('2026-04-18','TH','Car',         'Gas-M',                   29.50, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Maintenance', 'Heb water purification',  30.66, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Maintenance', 'Heb plant',               32.48, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Household',   'Hmart',                  166.65, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Food',        'Hmart food',              18.45, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Maintenance', 'Homedepot',               21.65, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Maintenance', 'Homedepot',               21.65, 'P',  '2026-04',hid,'Card'),
    ('2026-04-18','TH','Food',        'Mexican Cantina',         80.35, 'P',  '2026-04',hid,'Card'),
    -- Personal expenses
    ('2026-04-03','TH','Personal',    'Specs',                   74.93, 'P',  '2026-04',hid,'Card'),
    ('2026-04-06','TH','Personal',    'Amma gift',              125.00, 'P',  '2026-04',hid,'Card'),
    ('2026-04-08','MA','Personal',    'Burlington sun',          10.00, 'NP', '2026-04',hid,'Card'),
    ('2026-04-10','TH','Personal',    'American',                91.93, 'P',  '2026-04',hid,'Card'),
    ('2026-04-10','MA','Personal',    'Macy''s',                 18.00, 'NP', '2026-04',hid,'Card'),
    ('2026-04-10','TH','Personal',    'Macy''s shoes',           27.05, 'P',  '2026-04',hid,'Card'),
    ('2026-04-15','MA','Personal',    'Sephora',                 23.38, 'NP', '2026-04',hid,'Card');

  -- ── Recurring payments ───────────────────────────────────────
  INSERT INTO recurring_payments (name,due_date,type,amount,th_pay,ma_pay,th_paid,ma_paid,month,house_id,payment_method) VALUES
    ('House Mortgage',   '2nd',     'House Payments', 3148.00, 1605.48, 1542.52, 3148.00,    0.00, '2026-04',hid,'Account'),
    ('Auto Loan - TH',   '7th',     'Car Payments',   1000.00, 1000.00,    0.00, 1000.00,    0.00, '2026-04',hid,'Account'),
    ('Auto Insurance',   'MONTHLY', 'Car Payments',    278.00,  141.78,  136.22,  278.00,    0.00, '2026-04',hid,'Account'),
    ('Xfinity',          '28th',    'Bill',            130.00,   66.30,   63.70,  130.00,    0.00, '2026-04',hid,'Account'),
    ('Si Energy (Gas)',  '10th',    'Bill',             36.10,   18.41,   17.69,   36.10,    0.00, '2026-04',hid,'Account'),
    ('Si Envo (Water)',  '25th',    'Bill',            116.00,   59.16,   56.84,  116.00,    0.00, '2026-04',hid,'Account'),
    ('Electricity',      '20th',    'Bill',            155.21,   79.16,   76.05,  155.21,    0.00, '2026-04',hid,'Account'),
    ('HOA / Flood / Tax','YEARLY',  'House Payments',  150.00,   76.50,   73.50,  150.00,    0.00, '2026-04',hid,'Account'),
    ('EZ Tag',           'MONTHLY', 'Bill',             50.00,   25.50,   24.50,   50.00,    0.00, '2026-04',hid,'Account'),
    ('Lawn',             '2 WEEKS', 'Bill',             70.00,   35.70,   34.30,   70.00,    0.00, '2026-04',hid,'Cash'),
    ('Aakain Investment','MONTHLY', 'Baby',            300.00,  153.00,  147.00,  300.00,    0.00, '2026-04',hid,'Account'),
    ('Auto Loan - MA',   'MONTHLY', 'Car Payments',    845.00,    0.00,  845.00,    0.00,  845.00, '2026-04',hid,'Account'),
    ('Netflix',          '1st',     'Subscription',     10.00,    5.10,    4.90,   10.00,    0.00, '2026-04',hid,'Card'),
    ('Amazon Prime',     '11th',    'Subscription',     15.00,    7.65,    7.35,   15.00,    0.00, '2026-04',hid,'Card'),
    ('Ring',             '10th',    'Subscription',     11.00,    5.61,    5.39,   11.00,    0.00, '2026-04',hid,'Card'),
    ('Mazda',            '24th',    'Subscription',     10.00,    5.10,    4.90,   10.00,    0.00, '2026-04',hid,'Card'),
    ('Aakain Insurance', 'MONTHLY', 'Bill',            144.00,   73.44,   70.56,    0.00,  144.00, '2026-04',hid,'Account'),
    ('Thari Insurance',  'MONTHLY', 'Bill',            144.00,  144.00,    0.00,    0.00,  144.00, '2026-04',hid,'Account');

END $$;
