#!/usr/bin/env node
/**
 * Reads screenshots from assets/screenshots/ and embeds them as base64
 * into salli-guide.html, replacing the SVG slide panels with real app screens.
 *
 * Usage: node scripts/update-guide-screenshots.js
 */

const fs   = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'assets', 'screenshots');
const GUIDE_PATH      = path.join(__dirname, '..', 'salli-guide.html');

const SCREEN_MAP = {
  '1-dashboard':    's1',
  '2-add-expense':  's2',
  '3-expenses-list':'s3',
  '4-recurring':    's4',
  '5-status':       's5',
  '6-insights':     's6',
  '7-settings':     null, // settings used as bonus, skip if not present
};

// Check screenshots exist
const files = fs.existsSync(SCREENSHOTS_DIR)
  ? fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'))
  : [];

if (files.length === 0) {
  console.error('❌ No screenshots found in assets/screenshots/');
  console.error('   Run: node scripts/take-screenshots.js first');
  process.exit(1);
}

let html = fs.readFileSync(GUIDE_PATH, 'utf8');

let replaced = 0;

for (const [filename, slideId] of Object.entries(SCREEN_MAP)) {
  if (!slideId) continue;
  const pngPath = path.join(SCREENSHOTS_DIR, `${filename}.png`);
  if (!fs.existsSync(pngPath)) {
    console.warn(`  ⚠️  Missing ${filename}.png — keeping SVG for ${slideId}`);
    continue;
  }

  const b64 = fs.readFileSync(pngPath).toString('base64');
  const dataUri = `data:image/png;base64,${b64}`;

  // Replace the SVG inside the slide panel with an <img>
  const panelRegex = new RegExp(
    `(<div class="slide-panel[^"]*" id="${slideId}">)([\\s\\S]*?)(<\\/div>\\s*<!-- SLIDE)`,
    'g'
  );

  html = html.replace(panelRegex, (match, open, _svg, closeComment) => {
    replaced++;
    return `${open}\n            <img src="${dataUri}" style="width:100%;display:block;" />\n          ${closeComment}`;
  });
}

// If regex didn't match (simpler fallback per slide)
if (replaced === 0) {
  for (const [filename, slideId] of Object.entries(SCREEN_MAP)) {
    if (!slideId) continue;
    const pngPath = path.join(SCREENSHOTS_DIR, `${filename}.png`);
    if (!fs.existsSync(pngPath)) continue;

    const b64 = fs.readFileSync(pngPath).toString('base64');
    const dataUri = `data:image/png;base64,${b64}`;

    // Simpler: find the slide div and replace its inner SVG
    const startTag = `id="${slideId}">`;
    const startIdx = html.indexOf(startTag);
    if (startIdx === -1) continue;

    const svgStart = html.indexOf('<svg', startIdx);
    const svgEnd   = html.indexOf('</svg>', svgStart) + 6;
    if (svgStart === -1 || svgEnd < 6) continue;

    const imgTag = `<img src="${dataUri}" style="width:100%;display:block;" />`;
    html = html.slice(0, svgStart) + imgTag + html.slice(svgEnd);
    replaced++;
    console.log(`  ✅ Embedded ${filename}.png into #${slideId}`);
  }
}

fs.writeFileSync(GUIDE_PATH, html);
console.log(`\n✅ Updated salli-guide.html with ${replaced} real screenshots`);
