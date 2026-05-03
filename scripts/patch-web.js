#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

// Write manifest.json
const manifest = {
  name: 'Salli',
  short_name: 'Salli',
  description: 'Your household budget companion',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#0D1B3E',
  theme_color: '#0D1B3E',
  orientation: 'portrait',
  icons: [
    { src: '/assets/icon.png', sizes: '192x192', type: 'image/png' },
    { src: '/assets/icon.png', sizes: '512x512', type: 'image/png' },
  ],
};
fs.writeFileSync(
  path.join(distDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// Copy icon to dist/assets/icon.png for manifest reference
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
const srcIcon = path.join(__dirname, '..', 'assets', 'icon.png');
fs.copyFileSync(srcIcon, path.join(assetsDir, 'icon.png'));

// Patch index.html
let html = fs.readFileSync(indexPath, 'utf8');

// Fix viewport to include viewport-fit=cover (needed for iPhone notch/safe area)
html = html.replace(
  'width=device-width, initial-scale=1, shrink-to-fit=no',
  'width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover'
);

const pwaTags = [
  '  <meta name="apple-mobile-web-app-capable" content="yes" />',
  '  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '  <meta name="apple-mobile-web-app-title" content="Salli" />',
  '  <meta name="mobile-web-app-capable" content="yes" />',
  '  <link rel="manifest" href="/manifest.json" />',
  '  <link rel="apple-touch-icon" href="/assets/icon.png" />',
  // Fix iOS Safari + Android Chrome: body overflow:hidden blocks child scroll.
  // position:fixed on body tells the browser the viewport is fixed, so touch
  // events are correctly routed to inner scroll containers.
  '  <style id="scroll-fix">',
  '    body { position: fixed; width: 100%; height: 100%; top: 0; left: 0; }',
  '    * { -webkit-overflow-scrolling: touch; }',
  '  </style>',
].join('\n');

html = html.replace('</head>', pwaTags + '\n</head>');

fs.writeFileSync(indexPath, html);
console.log('✅ Patched dist/index.html with PWA meta tags + scroll fix');
console.log('✅ Created dist/manifest.json');
console.log('✅ Copied icon to dist/assets/icon.png');
