/* Builds version.json from the app itself, so you never edit it by hand.
   Reads APP_VERSION (js/01-main.js) and the CHANGELOG list (js/02-clock-and-changelog.js).
   Run by the deploy workflow; you can also run it locally:  node tools/make-version.js */
const fs = require('fs');
const main = fs.readFileSync('js/01-main.js', 'utf8');
const version = (/APP_VERSION\s*=\s*"([^"]+)"/.exec(main) || [])[1];
if (!version) { console.error('APP_VERSION not found'); process.exit(1); }
const cl = fs.readFileSync('js/02-clock-and-changelog.js', 'utf8');
const start = cl.indexOf('const CHANGELOG = [');
const end = cl.indexOf('\n    ];', start);
if (start < 0 || end < 0) { console.error('CHANGELOG not found'); process.exit(1); }
const list = new Function('return ' + cl.slice(start + 'const CHANGELOG = '.length, end + 6))();
const latest = list.find(e => e.version === version) || list[0];
const out = {
  version,
  date: latest.date || '',
  notes: (latest.items[0] || {}).text || '',
  changes: latest.items.map(i => i.text),
  history: list.slice(0, 25).map(e => ({ version: e.version, date: e.date || '', items: e.items.map(i => ({ type: i.type, text: i.text })) }))
};
fs.writeFileSync('version.json', JSON.stringify(out, null, 2) + '\n');
console.log('version.json written for v' + version + ' with ' + out.history.length + ' history entries');
