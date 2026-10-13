/* Release sanity check (run in the deploy workflow and locally:  node tools/check-release.js).
   Fails loudly if the version labels disagree, the Update Log is malformed, or a release file is missing. */
const fs = require('fs');
let bad = 0; const fail = m => { console.error('✗ ' + m); bad++; }; const ok = m => console.log('✓ ' + m);
const main = fs.readFileSync('js/01-main.js', 'utf8');
const V = (/APP_VERSION\s*=\s*"([^"]+)"/.exec(main) || [])[1];
const cl = fs.readFileSync('js/02-clock-and-changelog.js', 'utf8');
const s = cl.indexOf('const CHANGELOG = ['), e = cl.indexOf('\n    ];', s);
const list = new Function('return ' + cl.slice(s + 'const CHANGELOG = '.length, e + 6))();
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
V ? ok('APP_VERSION = ' + V) : fail('APP_VERSION missing');
const seen = new Set(); list.forEach(r => { if (!/^\d+\.\d+\.\d+$/.test(r.version)) fail('bad version label ' + r.version); if (seen.has(r.version)) fail('duplicate release ' + r.version); seen.add(r.version); if (!Array.isArray(r.items) || !r.items.length) fail('release ' + r.version + ' has no items'); });
for (let i = 1; i < list.length; i++) if (cmp(list[i - 1].version, list[i].version) <= 0) fail('Update Log not newest-first at ' + list[i].version);
list[0].version === V ? ok('newest Update Log entry is v' + V) : fail('newest Update Log entry (' + list[0].version + ') is not APP_VERSION (' + V + ')');
const vj = JSON.parse(fs.readFileSync('version.json', 'utf8'));
vj.version === V ? ok('version.json version matches') : fail('version.json says ' + vj.version + ' (run node tools/make-version.js)');
(vj.files || []).forEach(f => { if (!fs.existsSync(f)) fail('release file missing: ' + f); });
const html = fs.readFileSync('index.html', 'utf8');
(html.match(/(?:src|href)="((?:js|css|icons)\/[^"?]+)"/g) || []).forEach(m => { const f = /"([^"]+)"/.exec(m)[1]; if (!fs.existsSync(f)) fail('index.html references missing file ' + f); else if (!(vj.files || []).includes(f)) fail('index.html uses ' + f + ' but version.json files[] does not list it'); });
new RegExp('V' + V.replace(/\./g, '\\.')).test(html) ? ok('index.html labels mention V' + V) : fail('index.html still shows an old version label');
fs.existsSync('sw.js') ? ok('sw.js present') : fail('sw.js missing');
if (bad) { console.error(bad + ' problem(s)'); process.exit(1); } console.log('Release check passed.');
