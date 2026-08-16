/**
 * Copies lib/demoData.json → public/demo-data.json so the static demo's
 * service worker (public/sw.js) can fetch the demo catalog at runtime.
 * Runs automatically before `npm run build` (prebuild hook).
 */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'lib', 'demoData.json');
const dest = path.join(__dirname, '..', 'public', 'demo-data.json');

if (!fs.existsSync(src)) {
  console.warn('[demo] lib/demoData.json not found — skipping copy');
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log(`[demo] copied lib/demoData.json → public/demo-data.json (${fs.statSync(dest).size} bytes)`);
