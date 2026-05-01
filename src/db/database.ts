import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('housebudget.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDb();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      split TEXT NOT NULL DEFAULT 'Half',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      owner TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'P',
      month TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recurring_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      th_pay REAL NOT NULL DEFAULT 0,
      ma_pay REAL NOT NULL DEFAULT 0,
      th_paid REAL NOT NULL DEFAULT 0,
      ma_paid REAL NOT NULL DEFAULT 0,
      month TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS personal_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      paid_status TEXT NOT NULL DEFAULT 'Not Paid',
      month TEXT NOT NULL
    );
  `);

  // Migrate personal_expenses → transactions (category='Personal'), one-time
  const migrated = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key='personal_migrated'"
  );
  if (!migrated) {
    const rows = await database.getAllAsync<{
      owner: string; date: string; description: string;
      amount: number; paid_status: string; month: string;
    }>('SELECT owner, date, description, amount, paid_status, month FROM personal_expenses');
    for (const r of rows) {
      const status = r.paid_status === 'Paid' ? 'P' : 'NP';
      await database.runAsync(
        'INSERT INTO transactions (date, owner, category, description, amount, status, month) VALUES (?,?,?,?,?,?,?)',
        [r.date, r.owner, 'Personal', r.description, r.amount, status, r.month]
      );
    }
    await database.runAsync(
      "INSERT INTO settings (key, value) VALUES ('personal_migrated', '1')"
    );
  }

  // Seed default categories if not already done
  const catSeeded = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key='categories_seeded'"
  );
  if (!catSeeded) {
    const defaultCategories: { name: string; split: string; sort_order: number }[] = [
      { name: 'Food',         split: 'Half',     sort_order: 1 },
      { name: 'Household',    split: 'Salary',   sort_order: 2 },
      { name: 'Car',          split: 'Salary',   sort_order: 3 },
      { name: 'Bill',         split: 'Salary',   sort_order: 4 },
      { name: 'Baby',         split: 'Half',     sort_order: 5 },
      { name: 'Maintenance',  split: 'Half',     sort_order: 6 },
      { name: 'Other',        split: 'Half',     sort_order: 7 },
      { name: 'Fun',          split: 'Half',     sort_order: 8 },
      { name: 'Subscription', split: 'Salary',   sort_order: 9 },
      { name: 'Shopping',     split: 'Half',     sort_order: 10 },
      { name: 'Online',       split: 'Half',     sort_order: 11 },
      { name: 'Taxi',         split: 'Half',     sort_order: 12 },
      { name: 'Medicine',     split: 'Half',     sort_order: 13 },
      { name: 'Installment',  split: 'Salary',   sort_order: 14 },
      { name: 'Deposit',      split: 'Salary',   sort_order: 15 },
      { name: 'Personal',     split: 'Personal', sort_order: 16 },
    ];
    for (const c of defaultCategories) {
      await database.runAsync(
        'INSERT OR IGNORE INTO categories (name, split, sort_order) VALUES (?,?,?)',
        [c.name, c.split, c.sort_order]
      );
    }
    await database.runAsync(
      "INSERT INTO settings (key, value) VALUES ('categories_seeded', '1')"
    );
  }

  // Seed default settings if not present
  const existing = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'th_salary'"
  );
  if (!existing) {
    await database.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('th_salary', '7506')"
    );
    await database.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('ma_salary', '7072')"
    );
    await database.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('th_name', 'Tharindu')"
    );
    await database.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('ma_name', 'Maldini')"
    );
  }
}
