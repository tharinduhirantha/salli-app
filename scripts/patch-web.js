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

// Flatten all node_modules assets to /assets/flat/ — Cloudflare Pages can't serve paths
// containing @ (e.g. @expo/vector-icons fonts, @react-navigation back-button PNGs)
const flatOutDir = path.join(assetsDir, 'flat');
if (!fs.existsSync(flatOutDir)) fs.mkdirSync(flatOutDir, { recursive: true });

const flatExts = new Set(['.ttf', '.otf', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
const flatPathMap = {};

function collectNodeModuleAssets(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectNodeModuleAssets(full);
    } else if (flatExts.has(path.extname(entry.name).toLowerCase())) {
      const oldRelative = '/' + path.relative(distDir, full).replace(/\\/g, '/');
      if (oldRelative.includes('/node_modules/')) {
        const newRelative = `/assets/flat/${entry.name}`;
        fs.copyFileSync(full, path.join(flatOutDir, entry.name));
        flatPathMap[oldRelative] = newRelative;
      }
    }
  }
}
collectNodeModuleAssets(assetsDir);

// Patch JS bundle to reference new flat asset paths
const jsBundleDir = path.join(distDir, '_expo', 'static', 'js', 'web');
if (fs.existsSync(jsBundleDir)) {
  for (const file of fs.readdirSync(jsBundleDir)) {
    if (file.endsWith('.js')) {
      const jsPath = path.join(jsBundleDir, file);
      let js = fs.readFileSync(jsPath, 'utf8');
      for (const [oldPath, newPath] of Object.entries(flatPathMap)) {
        js = js.split(oldPath).join(newPath);
      }
      fs.writeFileSync(jsPath, js);
    }
  }
}
console.log(`✅ Flattened ${Object.keys(flatPathMap).length} node_modules assets to /assets/flat/`);

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

// Write _redirects for Cloudflare Pages SPA routing
fs.writeFileSync(path.join(distDir, '_redirects'), '/* /index.html 200\n');

// Write _headers for Cloudflare Pages — MIME types + cache control
fs.writeFileSync(path.join(distDir, '_headers'), `/index.html
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache

/
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache

/_expo/static/*
  Cache-Control: public, max-age=31536000, immutable

/assets/flat/*
  Cache-Control: public, max-age=31536000, immutable

/*.ttf
  Content-Type: font/ttf
  Access-Control-Allow-Origin: *

/*.otf
  Content-Type: font/otf
  Access-Control-Allow-Origin: *

/*.woff
  Content-Type: font/woff
  Access-Control-Allow-Origin: *

/*.woff2
  Content-Type: font/woff2
  Access-Control-Allow-Origin: *
`);

console.log('✅ Patched dist/index.html with PWA meta tags + scroll fix');
console.log('✅ Created dist/manifest.json');
console.log('✅ Copied icon to dist/assets/icon.png');
console.log('✅ Created dist/_redirects for Cloudflare Pages');
console.log('✅ Created dist/_headers with font MIME types');
