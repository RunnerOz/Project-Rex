/* Builds version.json from the app itself, so you never edit it by hand.
   Reads APP_VERSION (js/01-main.js) and the CHANGELOG list (js/02-clock-and-changelog.js).
   Writes: version, date, summary, notes, changes, files (what an install downloads), build (a fingerprint of those
   files, so the installer can prove it downloaded one consistent release), and the FULL release history.
   Run by the deploy workflow; you can also run it locally:  node tools/make-version.js */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const main = fs.readFileSync('js/01-main.js', 'utf8');
const version = (/APP_VERSION\s*=\s*"([^"]+)"/.exec(main) || [])[1];
if (!version) { console.error('APP_VERSION not found'); process.exit(1); }
const cl = fs.readFileSync('js/02-clock-and-changelog.js', 'utf8');
const start = cl.indexOf('const CHANGELOG = [');
const end = cl.indexOf('\n    ];', start);
if (start < 0 || end < 0) { console.error('CHANGELOG not found'); process.exit(1); }
const list = new Function('return ' + cl.slice(start + 'const CHANGELOG = '.length, end + 6))();
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
const latest = list.find(e => e.version === version);
if (!latest) { console.error('APP_VERSION ' + version + ' has no entry in the Update Log (CHANGELOG). Add one before releasing.'); process.exit(1); }

// The files an install downloads. Order matters (it is part of the fingerprint). index.html first.
const files = ['index.html', 'manifest.webmanifest', 'css/v11-1.css', 'css/v11-5.css']
  .concat(fs.readdirSync('js').filter(f => f.endsWith('.js')).sort().map(f => 'js/' + f))
  .concat(['icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/rex-icon.svg']);
const hash = crypto.createHash('sha256');
for (const f of files) { if (!fs.existsSync(f)) { console.error('Missing release file: ' + f); process.exit(1); } hash.update(fs.readFileSync(f)); }
const build = hash.digest('hex').slice(0, 16);

const hist = list.slice().sort((a, b) => cmp(b.version, a.version));
const out = {
  version,
  date: latest.date || '',
  summary: latest.summary || (latest.items[0] || {}).text || '',
  notes: (latest.items[0] || {}).text || '',
  changes: latest.items.map(i => i.text),
  size: latest.size || undefined,
  build,
  files,
  history: hist.map(e => ({ version: e.version, date: e.date || '', summary: e.summary || '', items: e.items.map(i => ({ type: i.type, text: i.text })) }))
};
fs.writeFileSync('version.json', JSON.stringify(out, null, 2) + '\n');
console.log('version.json written for v' + version + ' · build ' + build + ' · ' + files.length + ' files · ' + out.history.length + ' history entries');
