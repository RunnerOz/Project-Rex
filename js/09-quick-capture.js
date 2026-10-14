/* Project Rex Center V11.5.3 — Quick Capture: jot a note from anywhere (Alt+N, the palette, or the Home card).
   Saves into the Knowledge Base list (rex101_notes) in the same format as the Knowledge Base page, so it shows up there. */
(function () {
'use strict';
const KEY = 'rex101_notes';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const read = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
let open = null;

function categories() {
    const sel = document.getElementById('kbCategory');
    const c = sel ? Array.from(sel.options).map(o => o.value).filter(Boolean) : [];
    return c.length ? c : ['General'];
}
function close() { if (open) { open.remove(); open = null; document.removeEventListener('keydown', onKey, true); } }
function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); save(); } }
function save() {
    if (!open) return;
    const body = open.querySelector('#qcBody').value.trim(), title0 = open.querySelector('#qcTitle').value.trim();
    if (!body) { const b = open.querySelector('#qcBody'); b.focus(); b.classList.add('qc-bad'); return; }
    const title = title0 || body.split('\n')[0].slice(0, 60);
    const list = read();
    list.unshift({ id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8), title, body, cat: open.querySelector('#qcCat').value, tags: open.querySelector('#qcTags').value.trim(), created: Date.now() });
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { try { toast('Could not save the note (browser storage is full or blocked).', 'error'); } catch (x) { /* ignore */ } return; }
    close();
    try { toast('📝 Saved to Knowledge Base', 'success'); } catch (e) { /* ignore */ }
    try { if (window.RexV101 && RexV101.renderNotes) RexV101.renderNotes(); } catch (e) { /* ignore */ }
    try { if (window.RexDay) RexDay.render(); } catch (e) { /* ignore */ }
}
function show() {
    if (open) { open.querySelector('#qcBody').focus(); return; }
    const bg = document.createElement('div'); bg.className = 'uc-modal-bg';
    bg.innerHTML = '<div class="uc-modal" role="dialog" aria-modal="true" aria-label="Quick note"><div class="uc-mh"><h3>✍️ Quick note</h3><span>' + read().length + ' saved</span></div>' +
        '<div class="uc-body"><input id="qcTitle" class="uc-input" placeholder="Title (optional)" maxlength="120" autocomplete="off">' +
        '<textarea id="qcBody" class="uc-input qc-body" placeholder="What do you want to remember?" rows="6" data-autofocus></textarea>' +
        '<div class="qc-row"><select id="qcCat" class="uc-input" aria-label="Category">' + categories().map(c => '<option>' + esc(c) + '</option>').join('') + '</select><input id="qcTags" class="uc-input" placeholder="tags, comma separated" maxlength="80" autocomplete="off"></div></div>' +
        '<div class="uc-mf"><span class="qc-hint">Ctrl/⌘ + Enter to save</span><button class="btn btn-neutral" data-no type="button">Cancel</button><button class="btn btn-primary" data-yes type="button">Save note</button></div></div>';
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    document.body.appendChild(bg); open = bg;
    bg.querySelector('[data-no]').onclick = close; bg.querySelector('[data-yes]').onclick = save;
    bg.querySelector('#qcBody').addEventListener('input', e => e.target.classList.remove('qc-bad'));
    document.addEventListener('keydown', onKey, true);
    setTimeout(() => bg.querySelector('#qcBody').focus(), 0);
}
document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyN') { e.preventDefault(); show(); }
});
window.RexQuick = { open: show, close };
})();
