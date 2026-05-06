#!/usr/bin/env node
/**
 * Imports transactions from "Copy of House-2026.xlsx" into Supabase.
 * Usage: node scripts/import-excel.js
 */

const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const path = require('path');
const crypto = require('crypto');

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://kpriuxasejnlbdhpxwsu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwcml1eGFzZWpubGJkaHB4d3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzA1MDEsImV4cCI6MjA5MzAwNjUwMX0.9wvX6it71-5vEo_hAaZFg2DCC51j-cYvoiS5SmfLfOk';

const HOUSE_ID = '413a0e07-241f-44d2-a5ba-7a44c3a984d0';
const OWNER_MAP = {
  TH: '46b47f30-32c6-4180-a32a-a8897f2112cc',
  MA: '0afff25d-7bc1-4797-bdcd-40ea0dfdfa71',
};

// Map Excel category names → app category names
const CAT_MAP = {
  'Food':         'Food',
  'Household':    'Household',
  'Car':          'Car',
  'Baby':         'Baby',
  'Maintanance':  'Maintenance',
  'Maintenance':  'Maintenance',
  'Other':        'Other',
  'Shopping':     'Shopping',
  'Fun':          'Fun',
  'Subscription': 'Subscription',
  'Online':       'Online',
  'Taxi':         'Taxi',
  'Medicine':     'Medicine',
  'Installement': 'Installment',
  'Installment':  'Installment',
  'Bill':         'Bill',
  'Bills':        'Bill',
  'Personal':     'Personal',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function excelDateToISO(serial) {
  // Excel serial → JS Date (UTC), format as YYYY-MM-DD
  const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return d.getUTCFullYear() + '-' +
    String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(d.getUTCDate()).padStart(2, '0');
}

function toMonth(dateStr) {
  return dateStr.slice(0, 7); // "2026-04"
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  // Read Excel
  const wb = xlsx.readFile(path.join(__dirname, '..', '..', 'Copy of House-2026.xlsx'));
  const ws = wb.Sheets['April'];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

  // Parse transactions
  const transactions = [];
  const unknown = new Set();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    // Valid transaction: col 0 = Excel date number, col 4 = numeric amount
    if (typeof r[0] !== 'number' || r[0] < 40000) continue;
    if (typeof r[4] !== 'number' || r[4] <= 0)    continue;

    const ownerKey  = String(r[1] ?? '').trim().toUpperCase();
    const catRaw    = String(r[2] ?? '').trim();
    const desc      = String(r[3] ?? '').trim();
    const amount    = Math.round(r[4] * 100) / 100;
    const statusRaw = String(r[5] ?? '').trim().toUpperCase();
    const dateStr   = excelDateToISO(r[0]);

    if (!OWNER_MAP[ownerKey]) {
      console.warn(`  ⚠️  Unknown owner "${r[1]}" on row ${i + 1} — skipping`);
      continue;
    }

    const category = CAT_MAP[catRaw];
    if (!category) {
      unknown.add(catRaw);
      console.warn(`  ⚠️  Unknown category "${catRaw}" on row ${i + 1} — skipping`);
      continue;
    }

    transactions.push({
      id:             crypto.randomUUID(),
      date:           dateStr,
      owner:          ownerKey,        // "TH" or "MA"
      category,
      description:    desc || category,
      amount,
      status:         statusRaw === 'P' ? 'P' : 'NP',
      month:          toMonth(dateStr),
      house_id:       HOUSE_ID,
      payment_method: 'Card',          // default — not tracked in Excel
    });
  }

  if (unknown.size > 0) {
    console.log('\nUnmapped categories:', [...unknown]);
  }

  console.log(`\nParsed ${transactions.length} transactions`);
  if (transactions.length === 0) { console.log('Nothing to insert.'); return; }

  // Preview
  const byMonth = {};
  transactions.forEach(t => {
    byMonth[t.month] = (byMonth[t.month] || 0) + 1;
  });
  console.log('By month:', byMonth);

  // Check for duplicates — load existing transactions for these months
  const months = [...new Set(transactions.map(t => t.month))];
  const { data: existing, error: fetchErr } = await supabase
    .from('transactions')
    .select('date, owner, category, description, amount')
    .eq('house_id', HOUSE_ID)
    .in('month', months);

  if (fetchErr) { console.error('Fetch error:', fetchErr.message); process.exit(1); }

  const existingKeys = new Set(
    (existing || []).map(e =>
      `${e.date}|${e.owner}|${e.category}|${e.description}|${e.amount}`
    )
  );

  const toInsert = transactions.filter(t => {
    const key = `${t.date}|${t.owner}|${t.category}|${t.description}|${t.amount}`;
    return !existingKeys.has(key);
  });

  const dupes = transactions.length - toInsert.length;
  if (dupes > 0) console.log(`Skipping ${dupes} duplicates already in DB`);
  console.log(`Inserting ${toInsert.length} new transactions…\n`);

  if (toInsert.length === 0) { console.log('All already imported.'); return; }

  // Insert in batches of 50
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const batch = toInsert.slice(i, i + BATCH);
    const { error } = await supabase.from('transactions').insert(batch);
    if (error) { console.error('Insert error:', error.message); process.exit(1); }
    inserted += batch.length;
    console.log(`  ✅ Inserted ${inserted}/${toInsert.length}`);
  }

  console.log(`\n✅ Done — ${inserted} transactions imported into house ${HOUSE_ID}`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
