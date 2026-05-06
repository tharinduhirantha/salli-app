#!/usr/bin/env node
/**
 * Takes real screenshots of the Salli app for use in salli-guide.html
 *
 * Usage: node scripts/take-screenshots.js
 *
 * 1. A browser window opens at the app login page
 * 2. Log in manually
 * 3. Press Enter in this terminal — the script then captures all screens
 * 4. Screenshots are saved to assets/screenshots/
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const APP_URL = 'https://salli-app.pages.dev';
const OUT_DIR = path.join(__dirname, '..', 'assets', 'screenshots');

// Phone viewport
const VIEWPORT = { width: 390, height: 844 };

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function pause(msg) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(r => rl.question(msg, () => { rl.close(); r(); }));
}

async function shot(page, name) {
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
  });
  console.log(`  ✅ ${name}.png`);
}

async function tapTab(page, index) {
  // Bottom tab bar — 5 tabs across 390px width
  const tabX = [39, 117, 195, 273, 351];
  await page.mouse.click(tabX[index], VIEWPORT.height - 40);
  await page.waitForTimeout(600);
}

async function main() {
  console.log('\n📱 Salli Screenshot Tool\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=390,844'],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();
  await page.goto(APP_URL);

  console.log('👉 A browser window has opened.');
  console.log('   Log in to Salli, navigate to the Dashboard, then come back here.\n');
  await pause('   Press Enter when you are on the Dashboard ▶ ');

  console.log('\n📸 Capturing screens…\n');

  // 1. Dashboard
  await tapTab(page, 0);
  await shot(page, '1-dashboard');

  // 2. Expenses list
  await tapTab(page, 1);
  await shot(page, '3-expenses-list');

  // 3. Add expense — tap the FAB (+)
  await page.mouse.click(340, 740);
  await page.waitForTimeout(800);
  await shot(page, '2-add-expense');

  // close add expense (tap back / outside)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 4. Recurring
  await tapTab(page, 2);
  await shot(page, '4-recurring');

  // 5. Status / yearly
  await tapTab(page, 3);
  await shot(page, '5-status');

  // 6. Insights
  await tapTab(page, 4);
  await shot(page, '6-insights');

  // 7. Settings — navigate via hamburger or settings tab
  await page.mouse.click(28, 60); // hamburger menu in AppHeader
  await page.waitForTimeout(800);
  await shot(page, '7-settings');

  console.log(`\n✅ All screenshots saved to assets/screenshots/`);
  console.log('   Run: node scripts/update-guide-screenshots.js to embed them in salli-guide.html\n');

  await browser.close();
}

main().catch(err => { console.error(err); process.exit(1); });
