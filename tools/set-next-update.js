/* Announce the NEXT release so Rex shows a countdown to it.   node tools/set-next-update.js 12.10.0 "2026-10-24 12:00" --computer Max --phone Rex --title "Nice name" --teaser "One line"
   Writes next-update.json (publish it ahead of the release). Time is read as this computer's local time. Remove the countdown with:  node tools/set-next-update.js --clear */
const fs = require('fs'), a = process.argv.slice(2);
if (a[0] === '--clear') { try { fs.unlinkSync('next-update.json'); console.log('next-update.json removed.'); } catch (e) { console.log('Nothing to remove.'); } process.exit(0); }
const opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : ''; };
const [version, when] = a, rel = /^\+(\d+)m$/.exec(when || ''), at = rel ? new Date(Date.now() + rel[1] * 60000) : new Date(String(when || '').replace(' ', 'T'));
if (!/^\d+\.\d+\.\d+$/.test(version || '') || isNaN(at)) { console.error('Usage: node tools/set-next-update.js <version> "<YYYY-MM-DD HH:MM | +10m>" [--computer Name] [--phone Name] [--title T] [--teaser T]  |  --clear'); process.exit(1); }
const o = { version, at: at.toISOString(), name: { computer: opt('computer'), phone: opt('phone') }, title: opt('title'), teaser: opt('teaser') };
fs.writeFileSync('next-update.json', JSON.stringify(o, null, 2) + '\n'); console.log('next-update.json written:', o);
