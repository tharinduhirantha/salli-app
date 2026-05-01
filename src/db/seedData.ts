import { getDb } from './database';

const MONTH = '2026-04';

// Excel date serials → ISO dates (base: 1899-12-30)
function excelDate(serial: number): string {
  const base = new Date(1899, 11, 30);
  const d = new Date(base.getTime() + serial * 86400000);
  return d.toISOString().split('T')[0];
}

export async function seedAprilData(): Promise<void> {
  const db = await getDb();

  // Clear existing April data so seeding is idempotent
  await db.runAsync("DELETE FROM transactions WHERE month=?", [MONTH]);
  await db.runAsync("DELETE FROM recurring_payments WHERE month=?", [MONTH]);
  await db.runAsync("DELETE FROM personal_expenses WHERE month=?", [MONTH]);

  // ── Settings ──────────────────────────────────────────────────────────────
  await db.runAsync("INSERT OR REPLACE INTO settings (key,value) VALUES ('th_name','Tharindu')");
  await db.runAsync("INSERT OR REPLACE INTO settings (key,value) VALUES ('ma_name','Maldini')");
  await db.runAsync("INSERT OR REPLACE INTO settings (key,value) VALUES ('th_salary','7266')");
  await db.runAsync("INSERT OR REPLACE INTO settings (key,value) VALUES ('ma_salary','7072')");

  // ── Transactions ──────────────────────────────────────────────────────────
  // "Maintanance" in Excel → "Maintenance" in app
  const transactions: [string, string, string, string, number, string][] = [
    [excelDate(46113), 'TH', 'Food',        'Tacos',                54.13, 'P'],
    [excelDate(46113), 'TH', 'Household',   'Sams',                411.16, 'P'],
    [excelDate(46113), 'TH', 'Food',        'Pizza-baby',           11.90, 'P'],
    [excelDate(46113), 'TH', 'Car',         'Gas-M',                32.47, 'P'],
    [excelDate(46113), 'TH', 'Household',   'Vishala',              49.87, 'P'],
    [excelDate(46113), 'TH', 'Household',   'Vishala',               4.29, 'P'],
    [excelDate(46113), 'TH', 'Food',        'Quicktrip',             8.10, 'P'],
    [excelDate(46113), 'TH', 'Car',         'Gas-T',                38.41, 'P'],
    [excelDate(46117), 'TH', 'Food',        'Biriyani tea',         16.16, 'P'],
    [excelDate(46117), 'TH', 'Household',   'HEB',                  20.33, 'P'],
    [excelDate(46117), 'TH', 'Other',       'HR block',            143.20, 'P'],
    [excelDate(46117), 'TH', 'Food',        'Italian',              90.47, 'P'],
    [excelDate(46118), 'TH', 'Baby',        'Macy gift',            45.18, 'P'],
    [excelDate(46119), 'TH', 'Maintenance', 'Lowes',                50.00, 'P'],
    [excelDate(46120), 'TH', 'Baby',        'Pizza',                11.90, 'P'],
    [excelDate(46119), 'TH', 'Household',   'Triveni',             134.24, 'P'],
    [excelDate(46120), 'TH', 'Baby',        'Marshall Toy',         10.00, 'P'],
    [excelDate(46120), 'TH', 'Shopping',    'Marshall',             17.04, 'P'],
    [excelDate(46120), 'TH', 'Shopping',    'Burlington',           38.68, 'P'],
    [excelDate(46119), 'TH', 'Other',       'Cake',                 55.21, 'P'],
    [excelDate(46118), 'TH', 'Other',       'Heb Birthday',         16.22, 'P'],
    [excelDate(46122), 'TH', 'Baby',        'Macy toy',             14.06, 'P'],
    [excelDate(46122), 'TH', 'Food',        'Lassi',                 4.59, 'P'],
    [excelDate(46122), 'TH', 'Food',        'Taco Bell',            30.98, 'P'],
    [excelDate(46122), 'TH', 'Food',        'Macdonald',            10.25, 'P'],
    [excelDate(46122), 'TH', 'Food',        'Starbucks Kroger',      6.10, 'P'],
    [excelDate(46122), 'TH', 'Shopping',    "Macy's",               14.98, 'P'],
    [excelDate(46122), 'TH', 'Car',         'Gas-T',                46.31, 'P'],
    [excelDate(46123), 'TH', 'Other',       'Insurance',           188.35, 'P'],
    [excelDate(46123), 'TH', 'Household',   'Tunapaha Grocery',     92.45, 'P'],
    [excelDate(46123), 'TH', 'Other',       'Tunapaha Kawili',      90.00, 'P'],
    [excelDate(46123), 'TH', 'Food',        'Tunapaha Food',        30.00, 'P'],
    [excelDate(46123), 'TH', 'Household',   'HEB',                 153.33, 'P'],
    [excelDate(46127), 'TH', 'Household',   'Triveni',             102.30, 'P'],
    [excelDate(46127), 'TH', 'Household',   'HEB',                  20.76, 'P'],
    [excelDate(46125), 'TH', 'Car',         'Gas-M',                29.37, 'P'],
    [excelDate(46130), 'TH', 'Fun',         'Sysco',                70.00, 'P'],
    [excelDate(46130), 'TH', 'Fun',         'Sysco',                50.00, 'P'],
    [excelDate(46130), 'TH', 'Maintenance', 'Enchanted Garden',     20.22, 'P'],
    [excelDate(46130), 'TH', 'Car',         'Gas-T',                37.69, 'P'],
    [excelDate(46130), 'TH', 'Household',   'Walmart',               6.47,'NP'],
    [excelDate(46130), 'TH', 'Car',         'Gas-M',                29.50, 'P'],
    [excelDate(46130), 'TH', 'Maintenance', 'Heb water purification',30.66,'P'],
    [excelDate(46130), 'TH', 'Maintenance', 'Heb plant',            32.48, 'P'],
    [excelDate(46130), 'TH', 'Household',   'Hmart',               166.65, 'P'],
    [excelDate(46130), 'TH', 'Food',        'Hmart food',           18.45, 'P'],
    [excelDate(46130), 'TH', 'Maintenance', 'Homedepot',            21.65, 'P'],
    [excelDate(46130), 'TH', 'Maintenance', 'Homedepot',            21.65, 'P'],
    [excelDate(46130), 'TH', 'Food',        'Mexican Cantina',      80.35, 'P'],
  ];

  for (const [date, owner, category, description, amount, status] of transactions) {
    await db.runAsync(
      'INSERT INTO transactions (date,owner,category,description,amount,status,month) VALUES (?,?,?,?,?,?,?)',
      [date, owner, category, description, amount, status, MONTH]
    );
  }

  // ── Recurring Payments ────────────────────────────────────────────────────
  // [name, dueDate, type, amount, thPay, maPay, thPaid, maPaid]
  const recurring: [string, string, string, number, number, number, number, number][] = [
    ['House Mortgage',    '2nd',     'House Payments', 3148.00, 1605.48, 1542.52, 3148.00,    0],
    ['Auto Loan - TH',   '7th',     'Car Payments',   1000.00, 1000.00,    0.00, 1000.00,    0],
    ['Auto Insurance',   'MONTHLY', 'Car Payments',    278.00,  141.78,  136.22,  278.00,    0],
    ['Xfinity',          '28th',    'Bill',            130.00,   65.00,   65.00,  130.00,    0],
    ['Si Energy (Gas)',  '10th',    'Bill',             36.10,   18.41,   17.69,   36.10,    0],
    ['Si Envo (Water)',  '25th',    'Bill',            116.00,   59.16,   56.84,  116.00,    0],
    ['Electricity',      '20th',    'Bill',            155.21,   79.16,   76.05,  155.21,    0],
    ['HOA / Flood / Tax','YEARLY',  'House Payments',  150.00,   76.50,   73.50,  150.00,    0],
    ['EZ Tag',           'MONTHLY', 'Bill',             50.00,   25.50,   24.50,   50.00,    0],
    ['Lawn',             '2 WEEKS', 'Bill',             70.00,   35.70,   34.30,   70.00,    0],
    ['Aakain Investment','MONTHLY', 'Baby',            300.00,  150.00,  150.00,  300.00,    0],
    ['Auto Loan - MA',   'MONTHLY', 'Car Payments',    845.00,    0.00,  845.00,    0.00,  845],
    // Subscriptions
    ['Netflix',          '1st',     'Subscription',    10.00,    5.10,    4.90,   10.00,    0],
    ['Amazon Prime',     '11th',    'Subscription',    15.00,    7.65,    7.35,   15.00,    0],
    ['Ring',             '10th',    'Subscription',    11.00,    5.61,    5.39,   11.00,    0],
    ['Mazda',            '24th',    'Subscription',    10.00,    5.10,    4.90,   10.00,    0],
    // Bills in subscription table
    ['Aakain Insurance', 'MONTHLY', 'Bill',           144.00,   72.00,   72.00,    0.00,  144],
    ['Thari Insurance',  'MONTHLY', 'Bill',           144.00,  144.00,    0.00,    0.00,  144],
  ];

  for (const [name, dueDate, type, amount, thPay, maPay, thPaid, maPaid] of recurring) {
    await db.runAsync(
      'INSERT INTO recurring_payments (name,due_date,type,amount,th_pay,ma_pay,th_paid,ma_paid,month) VALUES (?,?,?,?,?,?,?,?,?)',
      [name, dueDate, type, amount, thPay, maPay, thPaid, maPaid, MONTH]
    );
  }

  // ── Personal Expenses ─────────────────────────────────────────────────────
  const personal: [string, string, string, number, string][] = [
    ['TH', excelDate(46115), 'Specs',          74.93, 'Paid'],
    ['TH', excelDate(46118), 'Amma gift',     125.00, 'Paid'],
    ['MA', excelDate(46120), 'Burlington sun', 10.00, 'Not Paid'],
    ['TH', excelDate(46122), 'American',       91.93, 'Paid'],
    ['MA', excelDate(46122), "Macy's",         18.00, 'Not Paid'],
    ['TH', excelDate(46122), "Macy's shoes",   27.05, 'Paid'],
    ['MA', excelDate(46127), 'Sephora',        23.38, 'Not Paid'],
  ];

  for (const [owner, date, description, amount, paidStatus] of personal) {
    await db.runAsync(
      'INSERT INTO personal_expenses (owner,date,description,amount,paid_status,month) VALUES (?,?,?,?,?,?)',
      [owner, date, description, amount, paidStatus, MONTH]
    );
  }
}

export async function clearAprilData(): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM transactions WHERE month=?", [MONTH]);
  await db.runAsync("DELETE FROM recurring_payments WHERE month=?", [MONTH]);
  await db.runAsync("DELETE FROM personal_expenses WHERE month=?", [MONTH]);
}
