    // ===== full script (all existing logic kept + improved weather UI + testing mentions) =====
    const APP_VERSION = "12.6.0"
    const STORAGE = "projectRexV42";
    const $ = id => document.getElementById(id);
    const BUILTIN = {
        update: { name: "🚀 Update", cat: "Announcement", message: "🚀 **Project Rex Update!**\n\nWe just released a new update.", title: "🚀 Project Rex Update",
            description: "A new update is available!", color: "#43a9ff" },
        announcement: { name: "📢 Announcement", cat: "Announcement", message: "@everyone 📢 **Important Announcement**\n\nWe have news for the community!",
            title: "📢 Announcement", description: "Thanks for being here!", color: "#43a9ff" },
        event: { name: "🎮 Event", cat: "Event", message: "@everyone 🎮 **Community Event!**\n\nJoin us soon!", title: "🎮 Event",
            description: "Get ready!", color: "#8d7cff" },
        maintenance: { name: "🔧 Maintenance", cat: "Status", message: "🔧 **Maintenance**\n\nServices may be temporarily unavailable.",
            title: "🔧 Maintenance", description: "We'll be back soon!", color: "#ffbd45" },
        welcome: { name: "👋 Welcome", cat: "Community", message: "👋 **Welcome to Project Rex!**", title: "🐶 Welcome",
            description: "Glad you're here!", color: "#32c98a" },
        poll: { name: "📊 Poll", cat: "Community", message: "📊 **Community Poll**\n\nWhat should we work on next?", title: "📊 Poll",
            description: "Vote below!", color: "#8d7cff" },
        serversOnline: { name: "🟢 Servers Online", cat: "Status", message: "@everyone\n\n🟢 **ALL SYSTEMS OPERATIONAL**\n\nServers are back online.",
            title: "🟢 Servers Online", description: "All systems green.", color: "#32c98a" },
        downtime: { name: "🔴 Downtime", cat: "Status", message: "@everyone 🔴 **Service Disruption**\n\nWe're investigating.",
            title: "🔴 Disruption", description: "Working on a fix.", color: "#ff5d6c" },
        patch: { name: "🩹 Patch Notes", cat: "Announcement", message: "🩹 **Patch Notes**\n\nLatest changes:", title: "🩹 Patch Notes",
            description: "• Fixes\n• Performance", color: "#43a9ff" },
        giveaway: { name: "🎁 Giveaway", cat: "Event", message: "@everyone 🎁 **Giveaway!**", title: "🎁 Giveaway",
            description: "Enter now!", color: "#8d7cff" },
        rules: { name: "📜 Rules", cat: "Community", message: "📜 **Server Rules**\n\nPlease follow guidelines.", title: "📜 Rules",
            description: "Be respectful.", color: "#ffbd45" },
        status: { name: "📡 Status", cat: "Status", message: "📡 **System Status**\n\nAll services normal.", title: "📡 Status",
            description: "All green.", color: "#32c98a" }
    };

    function emptyWS(name) { return { id: String(Date.now()) + Math.random().toString(36).slice(2, 6), name: name || "Main",
            webhooks: [], templates: [], drafts: [], presets: [], history: [], scheduled: [], favorites: [],
            testingEvents: [], sent: 0, failed: 0 } }
    let state = {
        theme: "light",
        currentWorkspaceId: null,
        profile: { username: "Rex Operator", avatar: "" },
        workspaces: [],
        notifications: [],
        timeline: [],
        settings: { confirmBeforeSend: false, schedulingPaused: false, tempUnit: "c", bgPreset: "plain",
        bgIntensity: 70 },
        weather: { place: null, data: null, alerts: [], alertUpdated: null, updated: null, error: null, loading: false },
        analyticsGlobal: { byDay: {}, templateUsage: {} },
        notifPrefs: { weatherAlerts: true, serverAlerts: true, testingEvents: true, updates: true, sound: true, preview: true },
        wxPrefs: { enabled: true, severity: { watch: true, advisory: true, warning: true }, refreshMin: 5, showExpired: false, defaultLocation: "" }
    };
    let dragSrc = null;

    function ws() { return state.workspaces.find(w => w.id === state.currentWorkspaceId) || state.workspaces[0] }

    function load() {
        try { const raw = localStorage.getItem(STORAGE); if (raw) { const p = JSON.parse(raw);
                Object.assign(state, p) } } catch (e) { console.error(e) }
        if (!Array.isArray(state.workspaces) || !state.workspaces.length) { const w = emptyWS("Main");
            state.workspaces = [w];
            state.currentWorkspaceId = w.id }
        if (!state.currentWorkspaceId || !state.workspaces.find(w => w.id === state.currentWorkspaceId)) state
            .currentWorkspaceId = state.workspaces[0].id;
        ["notifications", "timeline"].forEach(k => { if (!Array.isArray(state[k])) state[k] = [] });
        if (!state.profile) state.profile = { username: "Rex Operator", avatar: "" };
        if (!state.settings) state.settings = { confirmBeforeSend: false, schedulingPaused: false, tempUnit: "c",
            bgPreset: "plain", bgIntensity: 70 };
        if (!state.settings.tempUnit || (state.settings.tempUnit !== "c" && state.settings.tempUnit !== "f")) state.settings
            .tempUnit = "c";
        if (!state.settings.bgPreset) state.settings.bgPreset = "plain";
        if (!state.analyticsGlobal) state.analyticsGlobal = { byDay: {}, templateUsage: {} };
        if (!state.analyticsGlobal.templateUsage) state.analyticsGlobal.templateUsage = {};
        if (!state.weather) state.weather = { place: null, data: null, alerts: [], alertUpdated: null, updated: null, error: null, loading: false };
        if (!Array.isArray(state.weather.alerts)) state.weather.alerts = [];
        if (!state.notifPrefs) state.notifPrefs = {};
        state.notifPrefs = { weatherAlerts: true, serverAlerts: true, testingEvents: true, updates: true, sound: true, preview: true, ...state.notifPrefs };
        if (!state.wxPrefs) state.wxPrefs = {};
        state.wxPrefs = { enabled: true, refreshMin: 5, showExpired: false, defaultLocation: "", ...state.wxPrefs,
            severity: { watch: true, advisory: true, warning: true, ...(state.wxPrefs.severity || {}) } };
        state.workspaces.forEach(w => {
            ["webhooks", "templates", "drafts", "presets", "history", "scheduled", "favorites", "testingEvents"]
            .forEach(k => { if (!Array.isArray(w[k])) w[k] = [] });
            w.testingEvents.forEach(e => { if (!Array.isArray(e.testers)) e.testers = []; if (typeof e
                    .maxTesters !== "number") e.maxTesters = parseInt(e.maxTesters) || 0;
                if (!e.mentionPref) e.mentionPref = "" });
            if (typeof w.sent !== "number") w.sent = 0;
            if (typeof w.failed !== "number") w.failed = 0;
        });
        applyTheme();
        applyBgPreset();
        updateAll();
        startScheduler();
        startHomeClock();
        showView("home");
    }

    // Central save routine: every feature should use this so save failures are visible.
    function save(options = {}) {
        try {
            const serialized = JSON.stringify(state);
            localStorage.setItem(STORAGE, serialized);
            window.__rexLastSuccessfulSave = Date.now();
            window.__rexLastSaveError = null;
            updateSaveIndicator("saved");
            return true;
        } catch (e) {
            window.__rexLastSaveError = e;
            updateSaveIndicator("error");
            console.error("Project Rex could not save its data:", e);
            if (!options.silent) toast("Couldn't save data. Browser storage may be full or blocked; use Export to make a backup before closing.", "error");
            return false;
        }
    }


    function updateSaveIndicator(status) {
        const el = $("saveStatus");
        if (!el) return;
        const labels = { saved: ["✓", "All changes saved", "saved"], saving: ["↻", "Saving…", "saving"], error: ["!", "Save failed", "error"] };
        const item = labels[status] || labels.saved;
        el.dataset.status = item[2];
        const icon = el.querySelector(".save-status-icon");
        const label = el.querySelector(".save-status-label");
        if (icon) icon.textContent = item[0];
        if (label) label.textContent = item[1];
        el.title = status === "error" ? "Saving failed. Export a backup and check browser storage permissions." : item[1];
    }

    function applyTheme() { document.body.classList.toggle("dark", state.theme === "dark");
        $("themeBtn").textContent = state.theme === "dark" ? "☀️" : "🌙" }

    function applyBgPreset() {
        const p = state.settings.bgPreset || "plain";
        document.body.className = document.body.className.split(" ").filter(c => !c.startsWith("bg-")).join(" ");
        if (p && p !== "plain") document.body.classList.add("bg-" + p);
        const sel = $("bgPresetSelect");
        if (sel) sel.value = p;
        const intensity = state.settings.bgIntensity ?? 70;
        const slider = $("bgIntensity");
        if (slider) slider.value = intensity;
        document.documentElement.style.setProperty("--bg-intensity", (intensity / 100).toFixed(2));
    }

    function setBgPreset(val) { state.settings.bgPreset = val || "plain";
        save();
        applyBgPreset();
        toast("Background: " + (val || "plain"), "success") }

    function setBgIntensity(val) { state.settings.bgIntensity = Math.max(0, Math.min(100, Number(val) || 0));
        save();
        document.documentElement.style.setProperty("--bg-intensity", (state.settings.bgIntensity / 100).toFixed(2)) }

    const views = {
        home: ["Home", "Project Rex command center"],
        dashboard: ["Dashboard", "Overview & quick actions"],
        builder: ["Webhook Builder", "Compose and send"],
        templates: ["Templates", "Library, favorites & custom"],
        testing: ["Testing Events", "Manage beta tests & tester capacity"],
        drafts: ["Drafts", "Saved work in progress"],
        presets: ["Presets", "Full message setups"],
        schedule: ["Schedule", "Upcoming & emergency stop"],
        history: ["History", "Sent messages"],
        timeline: ["Timeline", "Activity log"],
        analytics: ["Analytics", "Local stats"],
        weather: ["Weather", "Local forecast · Open-Meteo"],
        notifications: ["Notifications", "Alerts"],
        clock: ["Clock", "Track your dev time"],
        holidays: ["Holidays", "Seasons, countdowns & greetings"],
        changelog: ["Update Log", "What's new in Project Rex"],
        profile: ["Profile", "Local team profile"], studio:["Rex Studio","Projects, ideas & progress"], knowledge:["Knowledge Base","Searchable notes & references"], automation:["Automation Lab","Plan workflows and recurring tasks"], tasks:["Task Center","Priorities, due dates & progress"], monitor:["System Monitor","Local diagnostics"], rollback:["Rex Backup","Back up and restore saved data"],
        achievements: ["Achievements", "Badges you earn by using Rex"],
        settings: ["Settings", "Workspaces & data"]
    };
    document.querySelectorAll(".nav-item").forEach(b => b.addEventListener("click", () => { if (b.dataset.view) showView(b.dataset.view); }));

    function showView(name) {
        document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
        const el = $("view-" + name);
        if (el) el.classList.add("active");
        document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === name));
        if (views[name]) { $("pageTitle").textContent = views[name][0];
            $("pageSubtitle").textContent = views[name][1] }
        const map = { home: renderHome, dashboard: renderDashboard, templates: renderTemplates, testing: renderTestingEvents,
            drafts: renderDrafts, presets: renderPresets, schedule: renderSchedule, history: renderHistory,
            timeline: renderTimeline, analytics: renderAnalytics, weather: renderWeatherPage,
            notifications: renderNotifs, clock: () => { renderClock(); if (window.RexV110) RexV110.renderPomodoro(); }, achievements: () => window.RexV110 && RexV110.renderAchievements(), holidays: () => renderHolidays(), changelog: () => renderChangelog(), profile: () => renderProfile(),
            studio: () => window.RexV101 && RexV101.renderProjects(), "project-notebook": () => window.RexV101 && RexV101.renderNotebookPage(), knowledge: () => window.RexV101 && RexV101.renderNotes(), automation: () => window.RexV101 && RexV101.renderWorkflows(), tasks: () => window.RexV101 && RexV101.renderTasks(), monitor: () => window.RexV101 && RexV101.runDiagnostics(), rollback: () => { if (window.RexV101) RexV101.renderRestorePoints(); if (window.RexV110) RexV110.renderBackup(); },
            settings: () => { $("confirmSend").checked = !!state.settings.confirmBeforeSend; if ($("tempUnitSelect"))
                    $("tempUnitSelect").value = state.settings.tempUnit || "c"; if ($("bgPresetSelect")) $(
                        "bgPresetSelect").value = state.settings.bgPreset || "plain"; if ($("bgIntensity")) $(
                        "bgIntensity").value = state.settings.bgIntensity ?? 70;
                syncNotifPrefsUI();
                syncWxPrefsUI() },
            builder: () => { renderBuilderTpls();
                renderWebhookSelect();
                updatePreview() } };
        if (map[name]) map[name]();
        updateRexIntelligence();
    }

    function toggleTheme() { state.theme = state.theme === "dark" ? "light" : "dark";
        applyTheme();
        try { rexAp.theme = state.theme; saveAppearance(); syncAppearanceUI(); } catch (e) {} /* V12: the sun/moon button now sticks after a reload */
        save();
        notify("Theme: " + state.theme, "info") }

    /* ===== workspaces etc (all original) ===== */
    function renderWSSelect() {
        const s = $("workspaceSelect");
        const cur = state.currentWorkspaceId;
        s.innerHTML = "";
        state.workspaces.forEach(w => { const o = document.createElement("option");
            o.value = w.id;
            o.textContent = w.name;
            s.appendChild(o) });
        s.value = cur;
    }

    function switchWorkspace(id) { if (!state.workspaces.find(w => w.id === id)) return;
        state.currentWorkspaceId = id;
        save();
        updateAll();
        toast("Workspace switched", "info") }

    function createWorkspace() { const n = prompt("Workspace name:", "Workspace " + (state.workspaces.length + 1)); if (!
            n) return; const w = emptyWS(n.trim());
        state.workspaces.push(w);
        state.currentWorkspaceId = w.id;
        save();
        updateAll();
        addTL("workspace", "Created workspace " + w.name);
        toast("Workspace created", "success") }

    function renameWorkspace() { const w = ws();
        const n = prompt("Rename workspace:", w.name); if (!n) return;
        w.name = n.trim();
        save();
        renderWSSelect();
        toast("Renamed", "success") }

    function deleteWorkspace() { if (state.workspaces.length <= 1) { toast("Keep at least one workspace.", "error");
            return } const w = ws(); if (!confirm('Delete workspace "' + w.name + '"?')) return;
        state.workspaces = state.workspaces.filter(x => x.id !== w.id);
        state.currentWorkspaceId = state.workspaces[0].id;
        save();
        updateAll();
        toast("Workspace deleted", "success") }

    /* ===== webhooks (all original) ===== */
    function openWebhookModal(id) {
        $("whEditId").value = id || "";
        $("whModalTitle").textContent = id ? "Edit Webhook" : "Add Webhook";
        if (id) { const wh = ws().webhooks.find(x => x.id === id); if (!wh) return; if (wh.locked && !confirm(
                    "Webhook is locked. Unlock to edit?")) return;
            $("whName").value = wh.name;
            $("whUrl").value = wh.url;
            $("whLock").checked = !!wh.locked } else { $("whName").value = "";
            $("whUrl").value = "";
            $("whLock").checked = false }
        $("whModal").classList.add("show");
    }

    function editSelectedWebhook() { const wh = getWH(); if (!wh) { toast("Select a webhook", "error"); return }
        openWebhookModal(wh.id) }

    function saveWebhook() {
        const name = $("whName").value.trim(),
            url = $("whUrl").value.trim(),
            id = $("whEditId").value,
            locked = $("whLock").checked;
        if (!name) { toast("Name required", "error"); return }
        if (!url.startsWith("https://discord.com/api/webhooks/") && !url.startsWith(
                "https://discordapp.com/api/webhooks/")) { toast("Invalid Discord webhook URL", "error");
            return }
        const W = ws();
        if (id) { const i = W.webhooks.findIndex(x => x.id === id); if (i < 0) return; if (W.webhooks[i].locked && !
                locked && !confirm("Unlock this webhook?")) return;
            W.webhooks[i] = { ...W.webhooks[i], name, url, locked };
            addTL("webhook", "Updated webhook " + name);
            toast("Webhook updated", "success") } else { W.webhooks.push({ id: String(Date.now()), name, url, locked,
                created: new Date().toISOString() });
            addTL("webhook", "Added webhook " + name);
            toast("Webhook saved", "success");
            notify("Webhook added: " + name, "success") }
        save();
        closeModal("whModal");
        updateAll();
    }

    function deleteWebhook(id) {
        const W = ws();
        const wh = W.webhooks.find(x => x.id === id);
        if (!wh) return;
        if (wh.locked) { toast("Webhook is locked. Unlock first.", "error"); return }
        if (!confirm('Delete "' + wh.name + '"?')) return;
        W.webhooks = W.webhooks.filter(x => x.id !== id);
        save();
        updateAll();
        addTL("webhook", "Deleted webhook " + wh.name);
        toast("Deleted", "success");
    }

    function toggleLock(id) { const wh = ws().webhooks.find(x => x.id === id); if (!wh) return;
        wh.locked = !wh.locked;
        save();
        updateAll();
        toast(wh.locked ? "Locked" : "Unlocked", "info") }

    function getWH() { return ws().webhooks.find(x => x.id === $("webhookSelect").value) }

    function renderWebhookSelect() {
        const s = $("webhookSelect"),
            prev = s.value;
        s.innerHTML = "";
        const list = ws().webhooks;
        if (!list.length) { const o = document.createElement("option");
            o.value = "";
            o.textContent = "No webhooks";
            s.appendChild(o); return }
        list.forEach(wh => { const o = document.createElement("option");
            o.value = wh.id;
            o.textContent = (wh.locked ? "🔒 " : "") + wh.name;
            s.appendChild(o) });
        if (list.some(x => x.id === prev)) s.value = prev;
    }

    function mask(url) { if (!url) return "";
        const p = url.split("/"); return p.length < 6 ? "••••" : p.slice(0, 5).join("/") + "/••••••••" }

    /* ===== builder helpers (all original) ===== */
    function insMention(m) { const t = $("message");
        t.value = (t.value.trim() ? m + " " + t.value.trim() : m + " ");
        updatePreview();
        t.focus() }

    /* ===== custom pings ===== */
    const CUSTOM_PINGS_KEY = "rex_custom_pings";
    function getCustomPings() {
        try { return JSON.parse(localStorage.getItem(CUSTOM_PINGS_KEY) || "[]") }
        catch(e) { return [] }
    }
    function saveCustomPings(list) { localStorage.setItem(CUSTOM_PINGS_KEY, JSON.stringify(list)) }

    window._pingType = "role";
    function setPingType(type) {
        window._pingType = type;
        $("pingTypeBtnRole").classList.toggle("active", type === "role");
        $("pingTypeBtnUser").classList.toggle("active", type === "user");
        if (type === "user") {
            $("pingIdLabel").textContent = "USER ID";
            $("pingRoleIdInput").placeholder = "e.g. 123456789012345678";
            $("pingFormatHint").innerHTML = 'This will insert <code>&lt;@USER_ID&gt;</code> — Discord\'s standard person mention format.';
        } else {
            $("pingIdLabel").textContent = "ROLE ID";
            $("pingRoleIdInput").placeholder = "e.g. 123456789012345678";
            $("pingFormatHint").innerHTML = 'This will insert <code>&lt;@&amp;ROLE_ID&gt;</code> — Discord\'s standard role mention format.';
        }
    }

    function openAddPingModal() {
        $("pingNameInput").value = "";
        $("pingRoleIdInput").value = "";
        setPingType("role");
        renderCustomPingList();
        $("addPingModal").classList.add("show");
    }

    function saveCustomPing() {
        const name = $("pingNameInput").value.trim();
        const targetId = $("pingRoleIdInput").value.trim();
        const type = window._pingType || "role";
        if (!name) { toast("Give your ping a name", "error"); return }
        if (!targetId) { toast(type === "user" ? "Enter a user ID" : "Enter a role ID", "error"); return }
        if (!/^\d+$/.test(targetId)) { toast("ID should be numbers only", "error"); return }
        const list = getCustomPings();
        const value = type === "user" ? `<@${targetId}>` : `<@&${targetId}>`;
        list.push({ id: String(Date.now()), name, value, type });
        saveCustomPings(list);
        $("pingNameInput").value = "";
        $("pingRoleIdInput").value = "";
        renderCustomPingList();
        renderCustomPingButtons();
        toast(`Added ping "${name}"`, "success");
    }

    function deleteCustomPing(id) {
        const ping = getCustomPings().find(p => p.id === id);
        if (ping && !confirm(`Remove ping "${ping.name}"?`)) return;
        saveCustomPings(getCustomPings().filter(p => p.id !== id));
        renderCustomPingList();
        renderCustomPingButtons();
        toast(ping ? `Removed ping "${ping.name}"` : "Ping removed", "info");
    }

    function renderCustomPingList() {
        const wrap = $("customPingListWrap");
        if (!wrap) return;
        const list = getCustomPings();
        if (!list.length) {
            wrap.innerHTML = '<p style="color:var(--muted);font-size:12px;text-align:center;padding:10px 0;">No custom pings yet</p>';
            return;
        }
        wrap.innerHTML = '<label style="display:block;margin-bottom:8px;">YOUR PINGS</label>' +
            list.map(p => `
                <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:9px 12px;margin-bottom:6px;font-size:13px;">
                    <span><b>${esc(p.name)}</b> <span style="color:var(--muted);font-size:11px;">${p.type === "user" ? "👤" : "🏷️"} ${esc(p.value)}</span></span>
                    <button onclick="deleteCustomPing('${p.id}')" title="Delete" style="background:none;border:0;color:var(--muted);cursor:pointer;font-size:14px;">🗑️</button>
                </div>`).join("");
    }

    function renderCustomPingButtons() {
        const wrap = $("customPingButtons");
        if (!wrap) return;
        wrap.innerHTML = getCustomPings().map(p =>
            `<button class="mention-btn" style="display:inline-flex;align-items:center;gap:6px;padding-right:8px;">
                <span onclick="insMention('${esc(String(p.value).replace(/[^\w@&!<>:-]/g, ""))}')" style="cursor:pointer;">${p.type === "user" ? "👤" : "🏷️"} ${esc(p.name)}</span>
                <span onclick="event.stopPropagation();deleteCustomPing('${p.id}')" title="Remove ping" style="cursor:pointer;color:var(--muted);font-weight:800;line-height:1;">×</span>
            </button>`).join("");
    }

    function toggleEmbed() { $("embedEd").classList.toggle("show", $("embedOn").checked);
        updatePreview() }

    function syncColor() { $("eColorT").value = $("eColor").value;
        updatePreview() }

    function syncColorT() { const v = $("eColorT").value; if (/^#[0-9a-fA-F]{6}$/.test(v)) { $("eColor").value = v;
            updatePreview() } }

    function validUrl(u) { try { const p = new URL(u); return p.protocol === "http:" || p.protocol === "https:" } catch {
            return false } }

    function addEmbedField(name = "", value = "", inline = false) {
        const wrap = $("embedFields");
        const div = document.createElement("div");
        div.className = "field-entry";
        div.draggable = true;
        div.innerHTML = '<span class="drag-handle">⠿</span><input class="ef-name" placeholder="Name" value="' + esc(name) +
            '"><input class="ef-val" placeholder="Value" value="' + esc(value) +
            '"><label style="font-size:10px;display:flex;align-items:center;gap:4px"><input type="checkbox" class="ef-inline" ' +
            (inline ? "checked" : "") + '> inline</label><button class="sbtn danger" onclick="this.parentElement.remove();updatePreview()">×</button>';
        bindDrag(div, wrap);
        wrap.appendChild(div);
        updatePreview();
    }

    function addButton(label = "", url = "") {
        if ($("buttonList").children.length >= 5) { toast("Max 5 buttons", "error"); return }
        const div = document.createElement("div");
        div.className = "btn-entry";
        div.draggable = true;
        div.innerHTML = '<span class="drag-handle">⠿</span><input class="b-label" maxlength="80" placeholder="Label" value="' +
            esc(label) + '" oninput="updatePreview()"><input class="b-url" placeholder="https://…" value="' + esc(url) +
            '" oninput="updatePreview()"><button class="sbtn danger" onclick="this.parentElement.remove();updatePreview()">×</button>';
        bindDrag(div, $("buttonList"));
        $("buttonList").appendChild(div);
        updatePreview();
    }

    function bindDrag(el, container) {
        el.addEventListener("dragstart", e => { dragSrc = el;
            el.classList.add("dragging");
            e.dataTransfer.effectAllowed = "move" });
        el.addEventListener("dragend", () => { el.classList.remove("dragging");
            dragSrc = null;
            updatePreview() });
        el.addEventListener("dragover", e => { e.preventDefault();
            const after = getDragAfter(container, e.clientY); if (after == null) container.appendChild(el);
            else container.insertBefore(el, after) });
    }

    function getDragAfter(container, y) {
        const els = [...container.querySelectorAll(".field-entry:not(.dragging), .btn-entry:not(.dragging)")];
        return els.reduce((closest, child) => { const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2; if (offset < 0 && offset > closest.offset) return { offset,
                    element: child }; return closest }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    function collectBuilder() {
        const data = { content: $("message").value.trim(), username: $("username").value.trim(), avatar: $("avatar")
                .value.trim(), embedOn: $("embedOn").checked,
            embed: { title: $("eTitle").value.trim(), description: $("eDesc").value.trim(), url: $("eUrl").value
                    .trim(), color: $("eColor").value, author: $("eAuthor").value.trim(), authorUrl: $(
                    "eAuthorUrl").value.trim(), footer: $("eFooter").value.trim(), footerIcon: $(
                    "eFooterIcon").value.trim(), image: $("eImage").value.trim(), thumbnail: $("eThumb")
                    .value.trim(), timestamp: $("eTs").checked, fields: [] }, buttons: [] };
        document.querySelectorAll("#embedFields .field-entry").forEach(e => {
            const n = e.querySelector(".ef-name").value.trim(),
                v = e.querySelector(".ef-val").value.trim();
            if (n || v) data.embed.fields.push({ name: n || "\u200b", value: v || "\u200b", inline: e
                    .querySelector(".ef-inline").checked }) });
        document.querySelectorAll("#buttonList .btn-entry").forEach(e => {
            const l = e.querySelector(".b-label").value.trim().slice(0, 80),
                u = e.querySelector(".b-url").value.trim();
            if (l || u) data.buttons.push({ label: l, url: u }) });
        return data;
    }

    function loadBuilder(d) {
        if (!d) return;
        $("message").value = d.content || "";
        $("username").value = d.username || "";
        $("avatar").value = d.avatar || "";
        $("embedOn").checked = !!d.embedOn;
        $("embedEd").classList.toggle("show", !!d.embedOn);
        const e = d.embed || {};
        $("eTitle").value = e.title || "";
        $("eDesc").value = e.description || "";
        $("eUrl").value = e.url || "";
        $("eColor").value = e.color || "#43a9ff";
        $("eColorT").value = e.color || "#43a9ff";
        $("eAuthor").value = e.author || "";
        $("eAuthorUrl").value = e.authorUrl || "";
        $("eFooter").value = e.footer || "";
        $("eFooterIcon").value = e.footerIcon || "";
        $("eImage").value = e.image || "";
        $("eThumb").value = e.thumbnail || "";
        $("eTs").checked = !!e.timestamp;
        $("embedFields").innerHTML = "";
        (e.fields || []).forEach(f => addEmbedField(f.name, f.value, f.inline));
        $("buttonList").innerHTML = "";
        (d.buttons || []).forEach(b => addButton(b.label, b.url));
        updatePreview();
    }

    function clearBuilder() {
        $("message").value = "";
        $("username").value = "";
        $("avatar").value = "";
        $("embedOn").checked = false;
        $("embedEd").classList.remove("show");
        ["eTitle", "eDesc", "eUrl", "eAuthor", "eAuthorUrl", "eFooter", "eFooterIcon", "eImage", "eThumb"].forEach(
        id => $(id).value = "");
        $("eColor").value = "#43a9ff";
        $("eColorT").value = "#43a9ff";
        $("eTs").checked = false;
        $("embedFields").innerHTML = "";
        $("buttonList").innerHTML = "";
        updatePreview();
        toast("Cleared", "success");
    }

    function buildPayload() {
        const d = collectBuilder();
        const payload = {};
        if (d.content) payload.content = d.content;
        if (d.username) payload.username = d.username;
        if (d.avatar) payload.avatar_url = d.avatar;
        if (d.embedOn) {
            const emb = {};
            if (d.embed.title) emb.title = d.embed.title;
            if (d.embed.description) emb.description = d.embed.description;
            if (d.embed.url) emb.url = d.embed.url;
            if (/^#[0-9a-fA-F]{6}$/.test(d.embed.color)) emb.color = parseInt(d.embed.color.slice(1), 16);
            if (d.embed.author) { emb.author = { name: d.embed.author }; if (d.embed.authorUrl) emb.author.url = d
                    .embed.authorUrl }
            if (d.embed.footer) { emb.footer = { text: d.embed.footer }; if (d.embed.footerIcon) emb.footer
                    .icon_url = d.embed.footerIcon }
            if (d.embed.image) emb.image = { url: d.embed.image };
            if (d.embed.thumbnail) emb.thumbnail = { url: d.embed.thumbnail };
            if (d.embed.timestamp) emb.timestamp = new Date().toISOString();
            if (d.embed.fields.length) emb.fields = d.embed.fields;
            if (emb.title || emb.description || emb.url || emb.image || emb.thumbnail || emb.fields || emb
                .author || emb.footer) payload.embeds = [emb];
        }
        const comps = [];
        for (const b of d.buttons) {
            if (!b.label) return { error: "Button missing label" };
            if (!b.url || !validUrl(b.url)) return { error: "Button needs valid http(s) URL: " + (b.label || "") };
            comps.push({ type: 2, style: 5, label: b.label, url: b.url });
        }
        if (comps.length) payload.components = [{ type: 1, components: comps.slice(0, 5) }];
        if (!payload.content && !payload.embeds && !payload.components) return { error: "Add a message, embed, or button" };
        return { payload };
    }

    const REX_ANSI_COLORS = { 30: "#6d6f78", 31: "#ed4245", 32: "#57f287", 33: "#faa81a", 34: "#5865f2", 35: "#eb459e", 36: "#3aa3e3", 37: "#ffffff" };
    function insMsgStyle(markStart, markEnd) {
        const ta = $("message");
        const start = ta.selectionStart, end = ta.selectionEnd;
        const val = ta.value;
        const selected = val.slice(start, end) || "text";
        ta.value = val.slice(0, start) + markStart + selected + markEnd + val.slice(end);
        const caret = start + markStart.length + selected.length + markEnd.length;
        ta.setSelectionRange(caret, caret);
        updatePreview();
        ta.focus();
    }
    function hexToRgb(hex) { const n = parseInt(hex.replace("#", ""), 16); return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }; }
    function nearestAnsiCode(hex) {
        const target = hexToRgb(hex);
        let best = 34, bestDist = Infinity;
        Object.entries(REX_ANSI_COLORS).forEach(([code, val]) => {
            const c = hexToRgb(val);
            const dist = (target.r - c.r) ** 2 + (target.g - c.g) ** 2 + (target.b - c.b) ** 2;
            if (dist < bestDist) { bestDist = dist; best = parseInt(code); }
        });
        return best;
    }
    function insMsgCustomColor(hex) { insMsgColor(nearestAnsiCode(hex)); }
    function insMsgColor(code) {
        const ta = $("message");
        const fenceOpen = "```ansi\n", fenceClose = "\n```";
        let val = ta.value, start = ta.selectionStart, end = ta.selectionEnd, body, offset;
        if (val.startsWith(fenceOpen) && val.endsWith(fenceClose)) { body = val.slice(fenceOpen.length, val.length - fenceClose.length); offset = fenceOpen.length; }
        else { body = val; offset = 0; }
        const relStart = Math.max(0, Math.min(start, end) - offset), relEnd = Math.max(0, Math.max(start, end) - offset);
        const selected = body.slice(relStart, relEnd) || "colored text";
        body = body.slice(0, relStart) + "\u001b[" + code + "m" + selected + "\u001b[0m" + body.slice(relEnd);
        ta.value = fenceOpen + body + fenceClose;
        updatePreview();
        ta.focus();
    }
    function clearMsgColor() {
        const ta = $("message");
        const fenceOpen = "```ansi\n", fenceClose = "\n```";
        let val = ta.value;
        if (val.startsWith(fenceOpen) && val.endsWith(fenceClose)) val = val.slice(fenceOpen.length, val.length - fenceClose.length);
        val = val.replace(/\u001b\[\d+m/g, "");
        ta.value = val;
        updatePreview();
    }
    function mdToHtml(s) {
        return s
            .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
            .replace(/__([\s\S]+?)__/g, "<u>$1</u>")
            .replace(/~~([\s\S]+?)~~/g, "<s>$1</s>")
            .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>");
    }
    function renderMsgPreview(text) {
        const fenceMatch = /^```ansi\n([\s\S]*)\n```$/.exec(text.trim());
        if (!fenceMatch) return mdToHtml(esc(text).replace(/\n/g, "<br>"));
        const parts = fenceMatch[1].split(/(\u001b\[\d+m)/g);
        let out = "", color = null;
        parts.forEach(p => {
            const codeMatch = /^\u001b\[(\d+)m$/.exec(p);
            if (codeMatch) { const c = parseInt(codeMatch[1]); color = c === 0 ? null : (REX_ANSI_COLORS[c] || null); }
            else if (p) { const safe = esc(p).replace(/\n/g, "<br>"); out += color ? "<span style='color:" + color + "'>" + safe + "</span>" : safe; }
        });
        return "<code style='background:#2b2d31;padding:6px 8px;border-radius:6px;display:block;white-space:pre-wrap;font-family:\"Fira Code\",monospace;font-size:12.5px'>" + out + "</code>";
    }
    function updatePreview() {
        const d = collectBuilder();
        $("charCount").textContent = (d.content.length) + " / 2000";
        $("pMsg").innerHTML = d.content ? renderMsgPreview(d.content) : "Your message…";
        $("pName").textContent = d.username || "Project Rex";
        $("pAv").src = d.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
        $("pEmbed").style.display = d.embedOn ? "block" : "none";
        if (d.embedOn) {
            $("pETitle").textContent = d.embed.title || "Embed Title";
            $("pEDesc").textContent = d.embed.description || "";
            $("pEUrl").textContent = d.embed.url || "";
            $("pEmbed").style.borderLeftColor = d.embed.color || "#43a9ff";
            $("pEFoot").textContent = [d.embed.author, d.embed.footer].filter(Boolean).join(" · ");
            $("pImg").style.display = d.embed.image ? "block" : "none";
            if (d.embed.image) $("pImg").src = d.embed.image;
            $("pThumb").style.display = d.embed.thumbnail ? "block" : "none";
            if (d.embed.thumbnail) $("pThumb").src = d.embed.thumbnail;
            const pf = $("pFields");
            pf.innerHTML = "";
            d.embed.fields.forEach(f => { const x = document.createElement("div");
                x.className = "pfield";
                x.innerHTML = "<strong>" + esc(f.name) + "</strong><span>" + esc(f.value) + "</span>";
                pf.appendChild(x) });
        }
        const pb = $("pBtns");
        pb.innerHTML = "";
        d.buttons.forEach(b => {
            if (!b.label) return;
            const a = document.createElement("a");
            a.className = "pbtn";
            a.textContent = b.label;
            a.target = "_blank";
            a.rel = "noopener";
            if (b.url && validUrl(b.url)) a.href = b.url;
            else { a.href = "#";
                a.onclick = e => { e.preventDefault();
                    toast("Invalid button URL", "error") } }
            pb.appendChild(a);
        });
    }

    async function sendWebhook() {
        const wh = getWH();
        if (!wh) { toast("Select a webhook", "error"); return }
        if (state.settings.confirmBeforeSend && !confirm("Send webhook to \"" + wh.name + "\"?")) return;
        const built = buildPayload();
        if (built.error) { toast(built.error, "error"); return }
        try {
            setSending(true);
            const res = rexAttachments.length
                ? await sendWebhookWithFiles(wh, built.payload)
                : await fetch(wh.url, { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(built.payload) });
            if (!res.ok) {
                let msg = "Discord rejected the request.";
                try { const t = await res.text();
                    const j = JSON.parse(t); if (j.message) msg = j.message; if (/component|button/i.test(t))
                        msg = "Button/component error — check labels & https URLs." } catch {}
                throw new Error(msg);
            }
            const W = ws();
            W.sent++;
            trackDay();
            W.history.unshift({ id: String(Date.now()), message: (built.payload.content || built.payload.embeds?.[0]
                    ?.title || "Sent").slice(0, 120), webhookName: wh.name, time: new Date().toLocaleString(),
                ok: true });
            W.history = W.history.slice(0, 200);
            save();
            updateAll();
            toast("Webhook sent! 🚀", "success");
            notify("Sent to " + wh.name, "success");
            addTL("sent", "Sent to " + wh.name);
            clearAttachments();
        } catch (e) { ws().failed++;
            save();
            toast(e.message || "Send failed", "error");
            notify("Send failed: " + (e.message || ""), "error");
            addTL("fail", "Failed: " + (e.message || "")) } finally { setSending(false) }
    }

    function setSending(on) { const b = document.querySelector("#view-builder .btn-primary"); if (b) { b.disabled = on;
            b.textContent = on ? "⏳ Sending…" : "🚀 Send" } }

    async function testWebhook() {
        const wh = getWH();
        if (!wh) { toast("Select a webhook", "error"); return }
        try {
            setSending(true);
            const res = await fetch(wh.url, { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: "🧪 **Project Rex Test** v" + APP_VERSION,
                        username: "Project Rex" }) });
            if (!res.ok) throw new Error("Test rejected by Discord");
            ws().sent++;
            trackDay();
            save();
            updateAll();
            toast("Test sent", "success");
            addTL("sent", "Test to " + wh.name);
        } catch (e) { ws().failed++;
            save();
            toast(e.message, "error") } finally { setSending(false) }
    }

    function openPayloadInspector() {
        const built = buildPayload();
        $("payloadJson").textContent = built.error ? ("// Error: " + built.error) : JSON.stringify(built.payload,
        null, 2);
        $("payloadModal").classList.add("show");
    }

    function copyPayload() { navigator.clipboard?.writeText($("payloadJson").textContent).then(() => toast("Copied",
            "success")).catch(() => toast("Copy failed", "error")) }

    /* "Today" in YOUR timezone (the old code used the UTC date, so counters rolled over in the evening for US time zones). */
    function dayKey(ts) { const d = new Date(ts == null ? Date.now() : ts); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") }
    function trackDay() { const d = dayKey();
        state.analyticsGlobal.byDay[d] = (state.analyticsGlobal.byDay[d] || 0) + 1 }

    /* ===== templates (all original) ===== */
    function renderBuilderTpls() {
        const g = $("builderTpls");
        if (!g) return;
        g.innerHTML = "";
        Object.entries(BUILTIN).forEach(([k, t]) => { const b = document.createElement("button");
            b.className = "tpl";
            b.textContent = t.name;
            b.onclick = () => useBuiltin(k);
            g.appendChild(b) });
    }

    function useBuiltin(key) { const t = BUILTIN[key]; if (!t) return;
        loadBuilder({ content: t.message, username: "Project Rex", embedOn: true, embed: { title: t.title,
                description: t.description, color: t.color, fields: [] }, buttons: [] });
        state.analyticsGlobal.templateUsage[key] = (state.analyticsGlobal.templateUsage[key] || 0) + 1;
        save();
        showView("builder");
        toast(t.name + " loaded", "success") }

    function qa(key) { useBuiltin(key) }

    function renderTemplates() {
        const q = ($("tplSearch")?.value || "").toLowerCase(),
            cat = $("tplCat")?.value || "";
        const lib = $("tplLib");
        lib.innerHTML = "";
        Object.entries(BUILTIN).forEach(([k, t]) => {
            if (q && !t.name.toLowerCase().includes(q) && !(t.message || "").toLowerCase().includes(q)) return;
            if (cat && t.cat !== cat) return;
            const fav = ws().favorites.includes(k);
            const b = document.createElement("button");
            b.className = "tpl";
            b.innerHTML = t.name + (fav ? '<span class="fav">⭐</span>' : "");
            b.onclick = () => useBuiltin(k);
            b.oncontextmenu = e => { e.preventDefault();
                toggleFav(k) };
            lib.appendChild(b);
        });
        const fl = $("favList");
        fl.innerHTML = "";
        ws().favorites.forEach(k => { const t = BUILTIN[k]; if (!t) return; const d = document.createElement("div");
            d.className = "row-item";
            d.innerHTML =
                '<div class="icon-box">⭐</div><div class="info"><strong>' + esc(t.name) +
                '</strong><small>' + esc(t.cat) +
                '</small></div><div class="acts"><button class="sbtn" onclick="useBuiltin(\'' + k +
                '\')">Use</button><button class="sbtn" onclick="toggleFav(\'' + k + '\')">★</button></div>';
            fl.appendChild(d) });
        if (!ws().favorites.length) fl.innerHTML = '<div class="empty">Right-click a template to favorite</div>';
        const cl = $("customTpls");
        cl.innerHTML = "";
        const customs = ws().templates;
        if (!customs.length) cl.innerHTML = '<div class="empty">No custom templates</div>';
        else customs.forEach(t => { const d = document.createElement("div");
            d.className = "row-item";
            d.innerHTML =
                '<div class="icon-box">📚</div><div class="info"><strong>' + esc(t.name) +
                '</strong><small>' + esc((t.data?.content || "").slice(0, 60)) +
                '</small></div><div class="acts"><button class="sbtn" onclick="loadCustomTpl(\'' + t.id +
                '\')">Use</button><button class="sbtn danger" onclick="delTpl(\'' + t.id +
                '\')">×</button></div>';
            cl.appendChild(d) });
    }

    function toggleFav(k) { const W = ws();
        const i = W.favorites.indexOf(k); if (i >= 0) W.favorites.splice(i, 1);
        else W.favorites.push(k);
        save();
        renderTemplates();
        renderDashboard() }

    function saveCurrentAsTemplate() { const name = prompt("Template name:"); if (!name) return;
        ws().templates.push({ id: String(Date.now()), name: name.trim(), cat: "Custom", data: collectBuilder() });
        save();
        renderTemplates();
        addTL("template", "Template created: " + name);
        toast("Template saved", "success");
        notify("Template saved", "success") }

    function loadCustomTpl(id) { const t = ws().templates.find(x => x.id === id); if (!t) return;
        loadBuilder(t.data);
        state.analyticsGlobal.templateUsage["custom:" + t.name] = (state.analyticsGlobal.templateUsage["custom:" + t.name] || 0) + 1;
        save();
        showView("builder");
        toast("Loaded", "success") }

    function delTpl(id) { ws().templates = ws().templates.filter(x => x.id !== id);
        save();
        renderTemplates();
        toast("Deleted", "success") }

    function exportTemplates() { const data = JSON.stringify({ templates: ws().templates, favorites: ws().favorites },
            null, 2);
        navigator.clipboard?.writeText(data).then(() => toast("Templates copied", "success")).catch(() => toast(
            "Copy failed", "error")) }

    function importTemplatesPrompt() { const raw = prompt("Paste templates JSON:"); if (!raw) return; try { const p =
            JSON.parse(raw); if (Array.isArray(p.templates)) ws().templates = ws().templates.concat(p.templates);
            if (Array.isArray(p.favorites)) ws().favorites = [...new Set(ws().favorites.concat(p.favorites))];
            save();
            renderTemplates();
            toast("Imported", "success") } catch { toast("Invalid JSON", "error") } }

    /* ===== drafts (all original) ===== */
    function newDraft() { const name = prompt("Draft name:", "Draft " + new Date().toLocaleString()); if (!name) return;
        ws().drafts.unshift({ id: String(Date.now()), name: name.trim(), data: collectBuilder(), updated: new Date()
                .toISOString() });
        save();
        addTL("draft", "Draft saved: " + name);
        toast("Draft saved", "success");
        showView("drafts");
        renderDrafts() }

    function saveDraft() { newDraft() }

    function renderDrafts() {
        const q = ($("draftSearch")?.value || "").toLowerCase();
        const list = $("draftList");
        list.innerHTML = "";
        let items = ws().drafts;
        if (q) items = items.filter(d => d.name.toLowerCase().includes(q));
        if (!items.length) { list.innerHTML = '<div class="empty">No drafts</div>'; return }
        items.forEach(d => {
            const el = document.createElement("div");
            el.className = "row-item";
            el.innerHTML = '<div class="icon-box">📝</div><div class="info"><strong>' + esc(d.name) +
                '</strong><small>' + esc(new Date(d.updated).toLocaleString()) +
                '</small></div><div class="acts"><button class="sbtn" onclick="loadDraft(\'' + d.id +
                '\')">Load</button><button class="sbtn" onclick="dupDraft(\'' + d.id +
                '\')">Dup</button><button class="sbtn danger" onclick="delDraft(\'' + d.id +
                '\')">×</button></div>';
            list.appendChild(el);
        });
    }

    function loadDraft(id) { const d = ws().drafts.find(x => x.id === id); if (!d) return;
        loadBuilder(d.data);
        showView("builder");
        toast("Draft loaded", "success") }

    function dupDraft(id) { const d = ws().drafts.find(x => x.id === id); if (!d) return;
        ws().drafts.unshift({ ...d, id: String(Date.now()), name: d.name + " copy", updated: new Date().toISOString() });
        save();
        renderDrafts();
        toast("Duplicated", "success") }

    function delDraft(id) { ws().drafts = ws().drafts.filter(x => x.id !== id);
        save();
        renderDrafts();
        toast("Deleted", "success") }

    /* ===== presets (all original) ===== */
    function savePreset() { const name = prompt("Preset name:"); if (!name) return;
        ws().presets.unshift({ id: String(Date.now()), name: name.trim(), data: collectBuilder() });
        save();
        addTL("preset", "Preset saved: " + name);
        toast("Preset saved", "success");
        renderPresets() }

    function renderPresets() {
        const list = $("presetList");
        list.innerHTML = "";
        if (!ws().presets.length) { list.innerHTML = '<div class="empty">No presets</div>'; return }
        ws().presets.forEach(p => {
            const el = document.createElement("div");
            el.className = "row-item";
            el.innerHTML = '<div class="icon-box">📦</div><div class="info"><strong>' + esc(p.name) +
                '</strong></div><div class="acts"><button class="sbtn" onclick="loadPreset(\'' + p.id +
                '\')">Load</button><button class="sbtn" onclick="dupPreset(\'' + p.id +
                '\')">Dup</button><button class="sbtn danger" onclick="delPreset(\'' + p.id +
                '\')">×</button></div>';
            list.appendChild(el);
        });
    }

    function loadPreset(id) { const p = ws().presets.find(x => x.id === id); if (!p) return;
        loadBuilder(p.data);
        showView("builder");
        toast("Preset loaded", "success") }

    function dupPreset(id) { const p = ws().presets.find(x => x.id === id); if (!p) return;
        ws().presets.unshift({ ...p, id: String(Date.now()), name: p.name + " copy" });
        save();
        renderPresets() }

    function delPreset(id) { ws().presets = ws().presets.filter(x => x.id !== id);
        save();
        renderPresets() }

    /* ===== schedule (all original) ===== */
    function openScheduleModal() { const built = buildPayload(); if (built.error) { toast(built.error, "error");
            return } const n = new Date(Date.now() + 3600000);
        $("schedWhen").value = n.toISOString().slice(0, 16);
        $("schedNote").value = "";
        $("schedModal").classList.add("show") }

    function confirmSchedule() {
        const when = $("schedWhen").value;
        if (!when) { toast("Pick a date/time", "error"); return }
        const ts = new Date(when).getTime();
        if (ts <= Date.now()) { toast("Time must be in the future", "error"); return }
        const built = buildPayload();
        if (built.error) { toast(built.error, "error"); return }
        const wh = getWH();
        if (!wh) { toast("Select a webhook", "error"); return }
        ws().scheduled.push({ id: String(Date.now()), when: ts, note: $("schedNote").value.trim(), webhookId: wh.id,
            webhookName: wh.name, payload: built.payload, status: "pending" });
        save();
        closeModal("schedModal");
        addTL("schedule", "Scheduled for " + new Date(ts).toLocaleString());
        notify("Message scheduled", "info");
        toast("Scheduled", "success");
        renderSchedule();
        renderDashboard();
        updateSchedUI();
    }

    function renderSchedule() {
        const list = $("schedList");
        list.innerHTML = "";
        const items = ws().scheduled.filter(s => s.status === "pending").sort((a, b) => a.when - b.when);
        if (!items.length) { list.innerHTML = '<div class="empty">No upcoming messages</div>'; return }
        items.forEach(s => {
            const el = document.createElement("div");
            el.className = "row-item";
            el.innerHTML = '<div class="icon-box">⏰</div><div class="info"><strong>' + esc(s.note || s
                    .webhookName) + '</strong><small>' + esc(new Date(s.when).toLocaleString()) +
                ' · ' + esc(s.webhookName) +
                '</small></div><div class="acts"><button class="sbtn danger" onclick="cancelSched(\'' + s
                .id + '\')">Cancel</button></div>';
            list.appendChild(el);
        });
        updateSchedUI();
    }

    function cancelSched(id) { const s = ws().scheduled.find(x => x.id === id); if (!s) return;
        s.status = "cancelled";
        save();
        addTL("cancel", "Cancelled scheduled message");
        renderSchedule();
        renderDashboard();
        toast("Cancelled", "success") }

    function stopAllScheduled() { if (!confirm("STOP ALL pending scheduled messages?")) return;
        ws().scheduled.forEach(s => { if (s.status === "pending") s.status = "cancelled" });
        state.settings.schedulingPaused = true;
        save();
        updateSchedUI();
        renderSchedule();
        notify("All scheduled messages stopped", "warn");
        toast("All stopped", "warn");
        addTL("cancel", "STOP ALL scheduled") }

    function toggleScheduling() { state.settings.schedulingPaused = !state.settings.schedulingPaused;
        save();
        updateSchedUI();
        toast(state.settings.schedulingPaused ? "Scheduling paused" : "Scheduling resumed", "info") }

    function updateSchedUI() {
        const paused = state.settings.schedulingPaused;
        $("schedBanner").textContent = paused ? "Scheduling is PAUSED. Pending messages will not send." :
            "Scheduling is active.";
        $("pauseBtn").textContent = paused ? "Resume" : "Pause";
        $("schedDot").className = "dot" + (paused ? " warn" : "");
        $("schedStatusLabel").textContent = (paused ? "Paused" : "Ready") + " · v" + APP_VERSION;
    }

    async function tickSchedule() {
        if (state.settings.schedulingPaused) return;
        const now = Date.now();
        for (const W of state.workspaces) {
            for (const s of W.scheduled) {
                if (s.status !== "pending" || s.when > now) continue;
                const wh = W.webhooks.find(x => x.id === s.webhookId);
                if (!wh) { s.status = "failed"; continue }
                try {
                    const res = await fetch(wh.url, { method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(s.payload) });
                    if (!res.ok) throw new Error("HTTP " + res.status);
                    s.status = "sent";
                    W.sent++;
                    W.history.unshift({ id: String(Date.now()), message: "(scheduled) " + (s.note || "message"),
                        webhookName: wh.name, time: new Date().toLocaleString(), ok: true });
                    addTL("sent", "Scheduled message sent to " + wh.name);
                    notify("Scheduled message sent", "success");
                } catch (e) { s.status = "failed";
                    W.failed++;
                    addTL("fail", "Scheduled send failed");
                    notify("Scheduled send failed", "error") }
            }
        }
        save();
    }

    function startScheduler() { setInterval(tickSchedule, 15000);
        setTimeout(tickSchedule, 2000) }

    /* ===== history / timeline / analytics (all original) ===== */
    function renderHistory() {
        const q = ($("histSearch")?.value || "").toLowerCase();
        const fw = $("histWh")?.value || "";
        const sel = $("histWh");
        if (sel) { const cur = sel.value;
            const names = [...new Set(ws().history.map(h => h.webhookName))];
            sel.innerHTML = '<option value="">All webhooks</option>';
            names.forEach(n => { const o = document.createElement("option");
                o.value = n;
                o.textContent = n;
                sel.appendChild(o) });
            if ([...sel.options].some(o => o.value === cur)) sel.value = cur }
        let items = ws().history;
        if (q) items = items.filter(h => (h.message || "").toLowerCase().includes(q) || (h.webhookName || "")
            .toLowerCase().includes(q));
        if (fw) items = items.filter(h => h.webhookName === fw);
        const list = $("histList");
        list.innerHTML = "";
        if (!items.length) { list.innerHTML = '<div class="empty">No history</div>'; return }
        items.forEach(h => { const d = document.createElement("div");
            d.className = "row-item";
            d.innerHTML = '<div class="icon-box">' + (h.ok === false ? "⚠️" : "🚀") +
            '</div><div class="info"><strong>' + esc(h.message) + '</strong><small>' + esc(h.webhookName) +
                ' · ' + esc(h.time) + '</small></div>';
            list.appendChild(d) });
    }

    function clearHistory() { if (!confirm("Clear history?")) return;
        ws().history = [];
        save();
        renderHistory();
        toast("Cleared", "success") }

    function addTL(type, text) { state.timeline.unshift({ id: String(Date.now()), type, text, time: new Date()
                .toLocaleString(), ws: ws().name });
        state.timeline = state.timeline.slice(0, 150);
        save() }

    const TL_META = {
        webhook: { icon: "📡", color: "var(--blue)", label: "Webhook" },
        sent: { icon: "🚀", color: "var(--green)", label: "Sent" },
        fail: { icon: "❌", color: "var(--red)", label: "Failed" },
        cancel: { icon: "🛑", color: "var(--red)", label: "Cancelled" },
        testing: { icon: "🧪", color: "var(--purple)", label: "Testing" },
        template: { icon: "📚", color: "var(--orange)", label: "Template" },
        preset: { icon: "📦", color: "var(--orange)", label: "Preset" },
        draft: { icon: "📝", color: "var(--muted)", label: "Draft" },
        schedule: { icon: "⏰", color: "var(--yellow)", label: "Schedule" },
        update: { icon: "⬆️", color: "var(--blue)", label: "Update" },
        workspace: { icon: "🗂️", color: "var(--muted)", label: "Workspace" }
    };
    function clearTimeline() {
        if (!state.timeline.length) return;
        if (!confirm("Clear the entire activity timeline? This can't be undone.")) return;
        state.timeline = [];
        save();
        renderTimeline();
        toast("Timeline cleared", "success");
    }
    function renderTimeline() {
        const sel = $("tlTypeFilter");
        if (sel && sel.options.length <= 1) {
            const present = new Set(state.timeline.map(t => t.type));
            Object.keys(TL_META).filter(t => present.has(t)).forEach(t => { const o = document.createElement("option");
                o.value = t; o.textContent = TL_META[t].icon + " " + TL_META[t].label; sel.appendChild(o); });
        }
        const q = ($("tlSearch")?.value || "").toLowerCase();
        const tf = sel?.value || "";
        let items = state.timeline;
        if (q) items = items.filter(t => t.text.toLowerCase().includes(q) || (t.ws || "").toLowerCase().includes(q));
        if (tf) items = items.filter(t => t.type === tf);
        const list = $("timelineList");
        list.innerHTML = "";
        if (!items.length) { list.innerHTML = '<div class="empty">' + (state.timeline.length ? "No activity matches your filters" : "No activity yet") + '</div>'; return }
        items.forEach(t => { const meta = TL_META[t.type] || { icon: "•", color: "var(--muted)", label: t.type || "Activity" };
            const d = document.createElement("div");
            d.className = "tl-item";
            d.style.borderLeft = "3px solid " + meta.color;
            d.style.paddingLeft = "10px";
            d.innerHTML = "<strong>" + meta.icon + " " + esc(t.text) + "</strong><br><small>" + esc(t.time) + (t.ws ? " · " + esc(t.ws) : "") + "</small>";
            list.appendChild(d) });
    }

    function renderAnalytics() {
        const W = ws();
        const total = W.sent + W.failed;
        const rate = total ? Math.round(W.sent / total * 100) : 100;
        const today = dayKey();
        const weekAgo = Date.now() - 7 * 864e5,
            monthAgo = Date.now() - 30 * 864e5;
        let todayC = state.analyticsGlobal.byDay[today] || 0,
            weekC = 0,
            monthC = 0;
        Object.entries(state.analyticsGlobal.byDay).forEach(([d, c]) => { const t = new Date(d).getTime(); if (t >=
                weekAgo) weekC += c; if (t >= monthAgo) monthC += c });
        const whCounts = {};
        W.history.forEach(h => { whCounts[h.webhookName] = (whCounts[h.webhookName] || 0) + 1 });
        const topWhSorted = Object.entries(whCounts).sort((a, b) => b[1] - a[1]);
        const topWh = topWhSorted[0];
        const totalEvents = (W.testingEvents || []).length;
        const activeEvents = (W.testingEvents || []).filter(e => evtStatus(e) === "Active").length;
        const totalTesters = (W.testingEvents || []).reduce((s, e) => s + (e.testers ? e.testers.length : 0), 0);
        $("analyticsGrid").innerHTML =
            `
            <div class="stat"><div class="stat-value">${W.sent}</div><div class="stat-label">Successful</div></div>
            <div class="stat"><div class="stat-value">${W.failed}</div><div class="stat-label">Failed</div></div>
            <div class="stat"><div class="stat-value">${rate}%</div><div class="stat-label">Success rate</div><div class="bar"><div style="width:${rate}%"></div></div></div>
            <div class="stat"><div class="stat-value">${todayC}</div><div class="stat-label">Today</div></div>
            <div class="stat"><div class="stat-value">${weekC}</div><div class="stat-label">This week</div></div>
            <div class="stat"><div class="stat-value">${monthC}</div><div class="stat-label">This month</div></div>
            <div class="stat"><div class="stat-value">${totalEvents}</div><div class="stat-label">Testing events</div></div>
            <div class="stat"><div class="stat-value">${activeEvents}</div><div class="stat-label">Active events</div></div>
            <div class="stat"><div class="stat-value">${totalTesters}</div><div class="stat-label">Total testers</div></div>`;
        const whBreakdown = topWhSorted.slice(0, 5).map(([name, c]) =>
            "<div style=\"display:flex;justify-content:space-between;font-size:12px;color:var(--muted);padding:4px 0;border-bottom:1px solid var(--border)\"><span>" +
            esc(name) + "</span><strong style=\"color:var(--text)\">" + c + "</strong></div>").join("");
        $("analyticsDetail").innerHTML = "<p style=\"font-size:12px;color:var(--muted)\">Most-used webhook: <strong>" +
            esc(topWh ? topWh[0] : "—") + "</strong>" + (topWh ? " (" + topWh[1] + ")" : "") +
            "</p><p style=\"font-size:12px;color:var(--muted);margin-top:6px\">Templates: " + Object.keys(BUILTIN)
            .length + " built-in · " + W.templates.length + " custom · " + W.favorites.length + " favorites</p>" +
            (whBreakdown ? "<div style=\"margin-top:10px\">" + whBreakdown + "</div>" : "");

        // Chart: last 7 days
        const chart = $("analyticsChart");
        chart.innerHTML = "";
        const days = [];
        for (let i = 6; i >= 0; i--) { const d = dayKey(Date.now() - i * 864e5);
            days.push({ label: new Date(d).toLocaleDateString(undefined, { weekday: 'short' }), count: state
                    .analyticsGlobal.byDay[d] || 0 }) }
        const max = Math.max(1, ...days.map(d => d.count));
        days.forEach(d => {
            const bar = document.createElement("div");
            bar.className = "bar";
            bar.style.height = (d.count / max * 70 + 4) + "px";
            bar.style.background = "var(--blue)";
            bar.title = d.label + ": " + d.count;
            const label = document.createElement("div");
            label.className = "bar-label";
            label.textContent = d.label;
            const wrap = document.createElement("div");
            wrap.style.display = "flex";
            wrap.style.flexDirection = "column";
            wrap.style.alignItems = "center";
            wrap.style.flex = "1";
            wrap.appendChild(bar);
            wrap.appendChild(label);
            chart.appendChild(wrap);
        });

        // Template usage — based on actual template loads (tracked in useBuiltin/loadCustomTpl),
        // not guessed by scanning sent message text for a name/title substring match.
        const usage = $("templateUsageStats");
        const tplUsage = state.analyticsGlobal.templateUsage || {};
        const sorted = Object.entries(tplUsage).sort((a, b) => b[1] - a[1]).slice(0, 5);
        usage.innerHTML = sorted.length ? sorted.map(([k, c]) => {
            const label = k.startsWith("custom:") ? k.slice(7) : (BUILTIN[k]?.name || k);
            return `<span class="chip">${esc(label)}: ${c}</span>`;
        }).join(" ") : "<span>No templates loaded into the builder yet.</span>";
    }

    /* ===== notifications (all original) ===== */
    function notify(msg, type, cat) {
        type = type || "info";
        cat = cat || "info";
        state.notifications.unshift({ id: String(Date.now()), msg, type, cat, time: new Date().toLocaleString(),
            read: false });
        state.notifications = state.notifications.slice(0, 80);
        save();
        updateBadge();
    }

    function updateBadge() { const u = state.notifications.filter(n => !n.read).length;
        const b = $("notifBadge"); if (u) { b.textContent = u > 9 ? "9+" : u;
            b.classList.remove("hidden") } else b.classList.add("hidden") }

    function renderNotifs() {
        const list = $("notifList");
        list.innerHTML = "";
        if (!state.notifications.length) { list.innerHTML = '<div class="empty">No notifications</div>'; return }
        state.notifications.forEach(n => {
            const icon = { success: "✅", error: "❌", warn: "⚠️", info: "ℹ️" } [n.type] || "ℹ️";
            const catClass = { critical: "critical", warning: "warning", info: "info", testing: "testing",
                webhook: "webhook", weather: "weather" } [n.cat] || "info";
            const d = document.createElement("div");
            d.className = "row-item";
            d.innerHTML = '<div class="icon-box">' + icon + '</div><div class="info"><strong>' + esc(n
                .msg) + '</strong><small>' + esc(n.time) + (n.read ? "" : " · unread") +
                '</small></div><span class="notif-cat ' + catClass + '">' + (n.cat || "info") +
                '</span>';
            list.appendChild(d);
        });
        state.notifications.forEach(n => n.read = true);
        save();
        updateBadge();
    }

    function markAllRead() { state.notifications.forEach(n => n.read = true);
        save();
        updateBadge();
        renderNotifs();
        toast("All read", "success") }

    function clearNotifs() { state.notifications = [];
        save();
        updateBadge();
        renderNotifs();
        toast("Cleared", "success") }

    /* ===== updates ===== */
    function saveConfirmSend() { state.settings.confirmBeforeSend = $("confirmSend").checked;
        save() }

    /* ===== notification preferences ===== */
    function setNotifPref(key, val) { state.notifPrefs[key] = !!val;
        save();
        syncNotifPrefsUI();
        toast("Notification preference updated", "success") }

    function syncNotifPrefsUI() {
        const p = state.notifPrefs || {};
        const map = { npWeatherAlerts: "weatherAlerts", npServerAlerts: "serverAlerts", npTestingEvents: "testingEvents",
            npUpdates: "updates", npSound: "sound", npPreview: "preview" };
        Object.entries(map).forEach(([id, key]) => { const el = $(id); if (el) el.checked = !!p[key] });
    }

    /* ===== weather preferences / alert config ===== */
    function setWxPref(key, val) { state.wxPrefs[key] = val;
        save();
        syncWxPrefsUI();
        if (key === "refreshMin") { stopWxAutoRefresh(); startWxAutoRefresh() }
        toast("Weather preference updated", "success") }

    function toggleWxSeverity(level) { state.wxPrefs.severity[level] = !state.wxPrefs.severity[level];
        save();
        syncWxPrefsUI();
        renderWeatherUI();
        renderHome() }

    function setWxDefaultLocation(val) { state.wxPrefs.defaultLocation = (val || "").trim();
        save();
        toast("Default weather location saved", "success") }

    function syncWxPrefsUI() {
        const p = state.wxPrefs || {};
        if ($("wxEnabled")) $("wxEnabled").checked = !!p.enabled;
        if ($("wxShowExpired")) $("wxShowExpired").checked = !!p.showExpired;
        if ($("wxDefaultLocation")) $("wxDefaultLocation").value = p.defaultLocation || "";
        if ($("wxRefreshInterval")) $("wxRefreshInterval").value = String(p.refreshMin ?? 5);
        const sev = p.severity || {};
        [["wxSevWatch", "watch"], ["wxSevAdvisory", "advisory"], ["wxSevWarning", "warning"]].forEach(([id, key]) => {
            const el = $(id); if (el) el.classList.toggle("active", !!sev[key]);
        });
    }

    function alertSeverityLevel(a) {
        const s = (a && (a.severity || a.event || a.headline || "")).toString().toLowerCase();
        if (/warning/.test(s)) return "warning";
        if (/advisory/.test(s)) return "advisory";
        if (/watch/.test(s)) return "watch";
        return "advisory";
    }

    function filterAlertsByPrefs(alerts) {
        const p = state.wxPrefs || {};
        if (!p.enabled) return [];
        const sev = p.severity || { watch: true, advisory: true, warning: true };
        return (alerts || []).filter(a => {
            if (sev[alertSeverityLevel(a)] === false) return false;
            if (!p.showExpired && a.expires && new Date(a.expires).getTime() <= Date.now()) return false;
            return true;
        });
    }

    function stopWxAutoRefresh() { if (window._wxAutoTimer) { clearInterval(window._wxAutoTimer);
            window._wxAutoTimer = null } }

    function startWxAutoRefresh() {
        const mins = state.wxPrefs?.refreshMin ?? 5;
        if (!mins || !state.wxPrefs?.enabled) return;
        window._wxAutoTimer = setInterval(() => { if (state.weather && state.weather.place && !state.weather
                    .loading) refreshWeather(true) }, mins * 60000);
    }

    async function checkUpdates() {
        if (!$("updStatus") || !$("updChange")) { if (window.RexUpd) { RexUpd.open(); RexUpd.check(true) } return }
        const url = (state.settings.updateCheckUrl || "").trim();
        $("updChange").classList.add("hidden");
        if (!url) { $("updStatus").textContent = "Update checking is not configured yet.";
            toast("Update checking is not configured yet.", "info"); return }
        $("updStatus").textContent = "Checking…";
        try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            const latest = String(data.version || data.latest || "").trim();
            const log = String(data.changelog || data.notes || "").trim();
            if (!latest) { $("updStatus").textContent = "Response missing version field."; return }
            const cmp = cmpVer(latest, APP_VERSION);
            if (cmp > 0) { $("updStatus").textContent = "Update available: v" + latest + " (you have v" +
                    APP_VERSION + ")."; if (log) { $("updChange").textContent = log;
                    $("updChange").classList.remove("hidden") }
                notify("Update available: v" + latest, "warn");
                addTL("update", "Update available v" + latest) } else if (cmp === 0) $("updStatus").textContent =
                "You're up to date (v" + APP_VERSION + ").";
            else $("updStatus").textContent = "Remote v" + latest + " — local v" + APP_VERSION +
                " (different/newer).";
        } catch (e) { $("updStatus").textContent = "Update check failed: " + (e.message || "network/CORS error");
            toast("Update check failed", "error") }
    }

    function cmpVer(a, b) { const pa = String(a).replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
        const pb = String(b).replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0); for (let i = 0; i < Math
                .max(pa.length, pb.length); i++) { const x = pa[i] || 0,
                y = pb[i] || 0; if (x > y) return 1; if (x < y) return -1 } return 0 }

    /* ===== profile (v8.0.0 redesign) ===== */
    function ensureProfileDefaults() {
        if (!state.profile) state.profile = {};
        const p = state.profile;
        if (!p.username) p.username = "Rex Operator";
        if (p.avatar == null) p.avatar = "";
        if (p.bio == null) p.bio = "Building games, Project Rex, and random stuff.";
        if (p.role == null) p.role = "Indie Developer";
        if (p.currentProject == null) p.currentProject = "Project Rex";
        if (p.favoriteTools == null) p.favoriteTools = "";
        if (p.region == null) p.region = "";
        if (p.goal == null) p.goal = "";
        if (p.skills == null) p.skills = "";
        if (p.interests == null) p.interests = "";
        if (!p.statusPreset) p.statusPreset = "online";
        if (!p.statusEmoji) p.statusEmoji = "🟢";
        if (p.statusText == null) p.statusText = "Building Project Rex";
        if (!p.bannerStyle) p.bannerStyle = "gradient";
        if (p.bannerImage == null) p.bannerImage = "";
        if (!p.memberSince) p.memberSince = new Date().toISOString();
        if (!Array.isArray(p.links)) p.links = [];
        if (!p.badges) p.badges = { earlyUser: false };
        // Merge defaults instead of replacing only missing objects. Older or partial
        // backups may contain an empty privacy/preferences object.
        p.privacy = { showStats: true, showBadges: true, showLinks: true, showMemberSince: true, ...(p.privacy && typeof p.privacy === "object" && !Array.isArray(p.privacy) ? p.privacy : {}) };
        p.preferences = { accent: "default", compact: false, ...(p.preferences && typeof p.preferences === "object" && !Array.isArray(p.preferences) ? p.preferences : {}) };
        if (!Array.isArray(p.links)) p.links = [];
        if (!p.badges || typeof p.badges !== "object" || Array.isArray(p.badges)) p.badges = { earlyUser: false };
        if (!Number.isFinite(Date.parse(p.memberSince))) p.memberSince = new Date().toISOString();
        return p;
    }

    function profileStats() {
        const W = ws();
        const webhooksSent = (W.history || []).length;
        const testsParticipated = (W.testingEvents || []).reduce((sum, e) => sum + ((e.testers || []).length > 0 ? 1 : 0), 0);
        const templatesCreated = (W.templates || []).length;
        let devTimeMs = 0;
        try {
            const clockData = JSON.parse(localStorage.getItem("rex_dev_clock_data") || "{}");
            (clockData.sessions || []).forEach(s => devTimeMs += s.duration || 0);
            if (clockData.activeStart) devTimeMs += Date.now() - clockData.activeStart;
        } catch (e) {}
        return { webhooksSent, testsParticipated, templatesCreated, devTimeMs };
    }

    function fmtDevTime(ms) {
        const m = Math.round(ms / 60000);
        return Math.floor(m / 60) + "h " + (m % 60) + "m";
    }

    function computeBadges(p, stats) {
        const badges = [];
        badges.push({ icon: "🛠️", label: "Developer" });
        badges.push({ icon: "🦖", label: "Rex Member" });
        if (stats.testsParticipated > 0) badges.push({ icon: "🧪", label: "Beta Tester" });
        if ((ws().testingEvents || []).length > 0) badges.push({ icon: "🏆", label: "Event Tester" });
        if (p.badges && p.badges.earlyUser) badges.push({ icon: "⚡", label: "Early User" });
        return badges;
    }

    function bannerCSS(p) {
        if (p.bannerStyle === "solid") return "background:var(--blue);";
        if (p.bannerStyle === "aurora") return "background:linear-gradient(120deg, #4da3ff, #9c6bff 45%, #22c096 80%); background-size:200% 200%; animation:rexAurora 8s ease infinite;";
        if (p.bannerStyle === "image" && p.bannerImage) return "background:url('" + p.bannerImage.replace(/'/g,"") + "') center/cover;";
        return "background:var(--accent-grad);";
    }

    function isEmojiAvatar(val) {
        if (!val) return false;
        return !/^https?:\/\//i.test(val.trim());
    }

    function avatarHTML(p) {
        if (!p.avatar) return "🐶";
        if (isEmojiAvatar(p.avatar)) return esc(p.avatar);
        if (!/^(https?:\/\/|data:image\/)/i.test(String(p.avatar).trim())) return "🐶";
        return '<img src="' + esc(String(p.avatar).trim()) + '" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\';this.parentElement.textContent=\'🐶\';">';
    }

    function statusDotColor(preset) {
        return { online: "var(--green)", busy: "var(--yellow)", dnd: "var(--red)", invisible: "var(--muted)" }[preset] || "var(--green)";
    }

    function renderProfile() {
        const p = ensureProfileDefaults();
        const stats = profileStats();
        renderFriendsList();

        $("profileBanner").style.cssText = "height:130px;position:relative;" + bannerCSS(p);
        $("profileAvatarWrap").innerHTML = avatarHTML(p);
        $("profileStatusDot").style.background = statusDotColor(p.statusPreset);
        $("profileDisplayName").textContent = p.username;
        $("profileStatusText").textContent = (p.statusEmoji || "🟢") + " " + (p.statusText || "");
        const memberDate = new Date(p.memberSince);
        $("profileMemberSince").textContent = "Member since " + memberDate.toLocaleDateString(undefined, { year: "numeric", month: "long" });
        $("profileMemberSince").style.display = p.privacy.showMemberSince ? "block" : "none";

        $("profileBioText").textContent = p.bio || "No bio yet.";
        $("profileRoleText").textContent = p.role || "Indie Developer";
        $("profileProjectText").textContent = p.currentProject || "Not added yet";
        $("profileToolsText").textContent = p.favoriteTools || "Not added yet";
        $("profileRegionText").textContent = p.region || "Not added yet";
        $("profileGoalText").textContent = p.goal || "Add a goal in Edit Profile.";
        $("profileSkillsText").textContent = p.skills || "Add your skills in Edit Profile.";
        $("profileInterestsText").textContent = p.interests || "Add your interests in Edit Profile.";

        // Keep the colorful Creator Spotlight synced with the profile fields.
        const spotlightProject = $("profileSpotlightProject");
        const spotlightGoal = $("profileSpotlightGoal");
        const spotlightRole = $("profileSpotlightRole");
        const spotlightBadges = $("profileSpotlightBadgeCount");
        if (spotlightProject) spotlightProject.textContent = p.currentProject || "Your next project";
        if (spotlightGoal) spotlightGoal.textContent = p.goal || "Add a goal in Edit Profile to show what you're working toward.";
        if (spotlightRole) spotlightRole.textContent = p.role || "Indie Developer";

        $("profileBadgesCard").style.display = p.privacy.showBadges ? "block" : "none";
        if (!p.privacy.showBadges && spotlightBadges) spotlightBadges.textContent = "Badges hidden";
        if (p.privacy.showBadges) {
            const badges = computeBadges(p, stats);
            if (spotlightBadges) spotlightBadges.textContent = badges.length + (badges.length === 1 ? " badge earned" : " badges earned");
            $("profileBadgeList").innerHTML = badges.map(b =>
                '<span style="display:inline-flex;align-items:center;gap:6px;background:var(--blue-soft);color:var(--blue2);border:1px solid var(--border);padding:6px 12px;border-radius:100px;font-size:12px;font-weight:700;">' + b.icon + ' ' + b.label + '</span>'
            ).join("");
        }

        $("profileStatsCard").style.display = p.privacy.showStats ? "block" : "none";
        if (p.privacy.showStats) {
            $("statWebhooksSent").textContent = stats.webhooksSent;
            $("statTestsParticipated").textContent = stats.testsParticipated;
            $("statTemplatesCreated").textContent = stats.templatesCreated;
            $("statDevTime").textContent = fmtDevTime(stats.devTimeMs);
        }

        $("profileLinksCard").style.display = p.privacy.showLinks ? "block" : "none";
        if (p.privacy.showLinks) {
            const enabledLinks = (p.links || []).filter(l => l.enabled !== false && l.url);
            $("profileLinksList").innerHTML = enabledLinks.length ? enabledLinks.map(l =>
                '<a href="' + l.url + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:10px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-md);padding:10px 14px;font-size:13px;font-weight:600;color:var(--text);text-decoration:none;transition:border-color .15s;" onmouseover="this.style.borderColor=\'var(--blue)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' + (l.icon || "🔗") + ' ' + (l.name || "Link") + '</a>'
            ).join("") : '<p style="color:var(--muted);font-size:12.5px;">No links added yet.</p>';
        }
    }

    const AVATAR_EMOJI_OPTIONS = ["🐶","🐺","🦖","🐉","🚀","⚡","🔥","🎮","🛠️","🧪","🌟","👾","🤖","🎯","🐾","🌈","☄️","🧠"];

    function renderAvatarEmojiPicker() {
        const wrap = $("avatarEmojiPicker");
        if (!wrap) return;
        wrap.innerHTML = AVATAR_EMOJI_OPTIONS.map(e =>
            `<button type="button" onclick="pickAvatarEmoji('${e}')" style="width:34px;height:34px;border-radius:9px;border:1px solid var(--border);background:var(--bg2);font-size:16px;cursor:pointer;">${e}</button>`
        ).join("");
    }
    function pickAvatarEmoji(emoji) {
        $("profAv").value = emoji;
        updateProfilePreview();
    }

    function openEditProfileModal() {
        const p = ensureProfileDefaults();
        $("profName").value = p.username;
        $("profAv").value = p.avatar;
        $("profBio").value = p.bio;
        $("profRole").value = p.role || "Indie Developer";
        $("profProject").value = p.currentProject || "";
        $("profTools").value = p.favoriteTools || "";
        $("profRegion").value = p.region || "";
        $("profGoal").value = p.goal || "";
        $("profSkills").value = p.skills || "";
        $("profInterests").value = p.interests || "";
        $("profBioCount").textContent = (p.bio || "").length + "/160";
        $("profStatusText").value = p.statusText;
        $("profBannerImage").value = p.bannerImage;
        $("bannerImageField").style.display = p.bannerStyle === "image" ? "block" : "none";
        $("privShowStats").checked = !!p.privacy.showStats;
        $("privShowBadges").checked = !!p.privacy.showBadges;
        $("privShowLinks").checked = !!p.privacy.showLinks;
        $("privShowMemberSince").checked = !!p.privacy.showMemberSince;

        window._editingStatusPreset = p.statusPreset;
        window._editingStatusEmoji = p.statusEmoji;
        window._editingBannerStyle = p.bannerStyle;
        highlightStatusBtn();
        highlightBannerBtn();

        window._editingLinks = JSON.parse(JSON.stringify(p.links || []));
        renderLinksEditor();

        updateProfilePreview();
        renderAvatarEmojiPicker();
        $("editProfileModal").classList.add("show");
    }

    function highlightStatusBtn() {
        ["online", "busy", "dnd", "invisible"].forEach(k => {
            const el = $("statusBtn" + k.charAt(0).toUpperCase() + k.slice(1));
            if (el) el.classList.toggle("active", window._editingStatusPreset === k);
        });
    }
    function highlightBannerBtn() {
        ["solid", "gradient", "aurora", "image"].forEach(k => {
            const el = $("bannerBtn" + k.charAt(0).toUpperCase() + k.slice(1));
            if (el) el.classList.toggle("active", window._editingBannerStyle === k);
        });
    }

    function setProfileStatusPreset(preset, emoji) {
        window._editingStatusPreset = preset;
        window._editingStatusEmoji = emoji;
        highlightStatusBtn();
        updateProfilePreview();
    }
    function setBannerStyle(styleName) {
        window._editingBannerStyle = styleName;
        $("bannerImageField").style.display = styleName === "image" ? "block" : "none";
        highlightBannerBtn();
        updateProfilePreview();
    }

    function renderLinksEditor() {
        const wrap = $("profileLinksEditor");
        const links = window._editingLinks || [];
        wrap.innerHTML = links.map((l, i) =>
            '<div style="display:flex;gap:6px;align-items:center;">' +
                '<input placeholder="Name" value="' + (l.name || "").replace(/"/g,"&quot;") + '" oninput="updateLinkField(' + i + ',\'name\',this.value)" style="flex:1;">' +
                '<input placeholder="https://…" value="' + (l.url || "").replace(/"/g,"&quot;") + '" oninput="updateLinkField(' + i + ',\'url\',this.value)" style="flex:2;">' +
                '<input type="checkbox" ' + (l.enabled !== false ? "checked" : "") + ' onchange="updateLinkField(' + i + ',\'enabled\',this.checked)" title="Enabled">' +
                '<button type="button" onclick="removeProfileLinkRow(' + i + ')" style="background:none;border:0;color:var(--muted);cursor:pointer;font-size:14px;">🗑️</button>' +
            '</div>'
        ).join("");
    }
    function addProfileLinkRow() {
        window._editingLinks = window._editingLinks || [];
        if (window._editingLinks.length >= 8) { toast("You can add up to 8 profile links", "info"); return; }
        window._editingLinks.push({ name: "", url: "", icon: "🔗", enabled: true });
        renderLinksEditor();
    }
    function removeProfileLinkRow(i) {
        window._editingLinks.splice(i, 1);
        renderLinksEditor();
    }
    function updateLinkField(i, field, value) {
        window._editingLinks[i][field] = value;
        updateProfilePreview();
    }

    function updateProfilePreview() {
        const name = $("profName").value.trim() || "Rex Operator";
        const avatar = $("profAv").value.trim();
        const bio = $("profBio").value;
        $("profBioCount").textContent = bio.length + "/160";
        const statusText = $("profStatusText").value.trim();
        const emoji = window._editingStatusEmoji || "🟢";

        $("previewName").textContent = name;
        $("previewStatus").textContent = emoji + " " + (statusText || { online:"Online",busy:"Busy",dnd:"Do Not Disturb",invisible:"Invisible" }[window._editingStatusPreset] || "Online");
        $("previewBio").textContent = bio || "No bio yet.";
        $("previewAvatarWrap").innerHTML = avatarHTML({ avatar: avatar });

        const fakeP = { bannerStyle: window._editingBannerStyle, bannerImage: $("profBannerImage").value.trim() };
        $("previewBanner").style.cssText = "height:70px;" + bannerCSS(fakeP);
        updateProfileCompletion();
    }

    function updateProfileCompletion() {
        const ids = ["profName", "profBio", "profRole", "profProject", "profTools", "profGoal", "profSkills", "profInterests"];
        const filled = ids.filter(id => ($(id)?.value || "").trim().length > 0).length;
        const pct = Math.round(filled / ids.length * 100);
        const label = $("profileCompletionPercent"), bar = $("profileCompletionBar");
        if (label) label.textContent = pct + "%";
        if (bar) bar.style.width = pct + "%";
    }
    function clearProfileAvatar() { $("profAv").value = ""; updateProfilePreview(); }
    function randomProfileAvatar() {
        const current = $("profAv").value.trim();
        const options = AVATAR_EMOJI_OPTIONS.filter(e => e !== current);
        $("profAv").value = options[Math.floor(Math.random() * options.length)] || "🐶";
        updateProfilePreview();
    }
    function copyProfileSummary() {
        const summary = [$("profName").value.trim() || "Rex Operator", $("profRole").value.trim(), $("profBio").value.trim(), $("profProject").value.trim() ? "Current project: " + $("profProject").value.trim() : "", $("profGoal").value.trim() ? "Goal: " + $("profGoal").value.trim() : ""].filter(Boolean).join("\n\n");
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(summary).then(() => toast("Profile summary copied", "success")).catch(() => prompt("Copy your profile summary:", summary));
        else prompt("Copy your profile summary:", summary);
    }

    function saveProfile() {
        const p = ensureProfileDefaults();
        p.username = $("profName").value.trim() || "Rex Operator";
        p.avatar = $("profAv").value.trim();
        p.bio = $("profBio").value.trim().slice(0, 160);
        p.role = $("profRole").value.trim().slice(0, 50) || "Indie Developer";
        p.currentProject = $("profProject").value.trim().slice(0, 80);
        p.favoriteTools = $("profTools").value.trim().slice(0, 100);
        p.region = $("profRegion").value.trim().slice(0, 60);
        p.goal = $("profGoal").value.trim().slice(0, 120);
        p.skills = $("profSkills").value.trim().slice(0, 120);
        p.interests = $("profInterests").value.trim().slice(0, 120);
        p.statusPreset = window._editingStatusPreset || "online";
        p.statusEmoji = window._editingStatusEmoji || "🟢";
        p.statusText = $("profStatusText").value.trim() || { online:"Online",busy:"Busy",dnd:"Do Not Disturb",invisible:"Invisible" }[p.statusPreset];
        p.bannerStyle = window._editingBannerStyle || "gradient";
        p.bannerImage = $("profBannerImage").value.trim();
        const rawLinks = (window._editingLinks || []).filter(l => l.name || l.url).slice(0, 8);
        const invalidLink = rawLinks.find(l => l.url && !/^https?:\/\//i.test(l.url.trim()));
        if (invalidLink) { toast("Links must start with https:// or http://", "error"); return; }
        p.links = rawLinks.map(l => ({ name: String(l.name || "").trim().slice(0, 40), url: String(l.url || "").trim().slice(0, 500), icon: l.icon || "🔗", enabled: l.enabled !== false }));
        p.privacy = {
            showStats: $("privShowStats").checked,
            showBadges: $("privShowBadges").checked,
            showLinks: $("privShowLinks").checked,
            showMemberSince: $("privShowMemberSince").checked
        };
        save();
        closeModal("editProfileModal");
        renderProfile();
        toast("Profile saved", "success");
    }

    /* ===== V10.3.0 profile preferences and portable profile backup ===== */
    function loadProfilePreferences() {
        const p = ensureProfileDefaults();
        const accent = document.getElementById("profileAccentChoice");
        const compact = document.getElementById("profileCompactChoice");
        if (accent) accent.value = p.preferences.accent || "default";
        if (compact) compact.checked = !!p.preferences.compact;
        applyProfilePreferences();
    }
    function saveProfilePreferences() {
        const p = ensureProfileDefaults();
        p.preferences = p.preferences || {};
        p.preferences.accent = document.getElementById("profileAccentChoice")?.value || "default";
        p.preferences.compact = !!document.getElementById("profileCompactChoice")?.checked;
        save({silent:true}); applyProfilePreferences();
        const note = document.getElementById("profilePreferencesSaved");
        if (note) note.textContent = "✓ Preferences saved locally.";
    }
    function applyProfilePreferences() {
        const p = ensureProfileDefaults();
        const colors = { default:"", blue:"#3998ff", purple:"#9b72ff", green:"#22b88a", orange:"#f59e0b" };
        const color = colors[p.preferences?.accent || "default"];
        const header = document.getElementById("profileHeaderCard");
        const banner = document.getElementById("profileBanner");
        if (banner && color) banner.style.background = "linear-gradient(120deg," + color + ",color-mix(in srgb," + color + " 55%,#151b2a))";
        else if (banner) banner.style.cssText = "height:130px;position:relative;" + bannerCSS(p);
        const profileView = document.getElementById("view-profile");
        if (profileView) profileView.classList.toggle("profile-compact", !!p.preferences?.compact);
        const spotlight = document.getElementById("profileSpotlightCard");
        if (spotlight && p.preferences?.accent && p.preferences.accent !== "default") {
            const spotlightColors = { blue: "#1d4ed8", purple: "#6d28d9", green: "#047857", orange: "#b45309" };
            const chosen = spotlightColors[p.preferences.accent];
            if (chosen) spotlight.style.background = "linear-gradient(120deg," + chosen + ",#172033 115%)";
        } else if (spotlight) {
            spotlight.style.background = "linear-gradient(120deg,#253a94 0%,#6b39bb 52%,#e34b92 120%)";
        }
    }
    function exportProfileBackup() {
        const p = ensureProfileDefaults();
        // Export a plain snapshot, not the live state object.
        const payload = { app:"Project Rex Center", type:"profile-backup", version:"10.3.1", exportedAt:new Date().toISOString(), profile:JSON.parse(JSON.stringify(p)) };
        const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
        const url = URL.createObjectURL(blob); const a=document.createElement("a");
        a.href=url; a.download="Project-Rex-Center-Profile-Backup-"+new Date().toISOString().slice(0,10)+".json";
        document.body.appendChild(a); a.click(); a.remove();
        // Safari can cancel a download if the object URL is revoked immediately.
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast("Profile backup exported", "success");
    }
    function importProfileBackup(event) {
        const file = event?.target?.files?.[0]; if(!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data=JSON.parse(String(reader.result||""));
                if(data.type!=="profile-backup" || !data.profile || typeof data.profile!=="object" || Array.isArray(data.profile)) throw new Error("This is not a Project Rex Center profile backup.");
                if(!confirm("Import profile backup from " + (data.exportedAt || "an unknown date") + "? Your current profile will be replaced. Projects, notebooks, and other app data will not be changed.")) return;
                const allowed=["username","avatar","bio","role","currentProject","favoriteTools","region","goal","skills","interests","statusPreset","statusEmoji","statusText","bannerStyle","bannerImage","memberSince","links","badges","privacy","preferences"];
                const current=ensureProfileDefaults(); const clean={};
                const stringLimits = { username:60, avatar:2000000, bio:160, role:50, currentProject:80, favoriteTools:100, region:60, goal:120, skills:120, interests:120, statusText:80, statusEmoji:12, bannerImage:2000000 };
                allowed.forEach(k=>{if(Object.prototype.hasOwnProperty.call(data.profile,k)) clean[k]=data.profile[k];});
                Object.entries(stringLimits).forEach(([k,max])=>{
                    if (clean[k] !== undefined && (typeof clean[k] !== "string" || clean[k].length > max)) throw new Error("The backup contains an invalid " + k + " field.");
                });
                if(clean.links!==undefined && (!Array.isArray(clean.links) || clean.links.length > 30 || clean.links.some(l=>!l || typeof l!=="object" || typeof l.name!=="string" || typeof l.url!=="string" || l.name.length>80 || l.url.length>2048))) throw new Error("The backup has an invalid links list.");
                if(clean.privacy!==undefined && (!clean.privacy || typeof clean.privacy!=="object" || Array.isArray(clean.privacy))) throw new Error("The backup has invalid privacy settings.");
                if(clean.preferences!==undefined && (!clean.preferences || typeof clean.preferences!=="object" || Array.isArray(clean.preferences))) throw new Error("The backup has invalid preferences.");
                if(clean.bannerStyle!==undefined && !["solid","gradient","aurora","image"].includes(clean.bannerStyle)) throw new Error("The backup has an unsupported banner style.");
                if(clean.statusPreset!==undefined && !["online","busy","dnd","invisible"].includes(clean.statusPreset)) throw new Error("The backup has an unsupported status.");
                if(clean.preferences?.accent!==undefined && !["default","blue","purple","green","orange"].includes(clean.preferences.accent)) throw new Error("The backup has an unsupported accent color.");
                if(clean.preferences?.compact!==undefined && typeof clean.preferences.compact!=="boolean") throw new Error("The backup has invalid compact layout settings.");
                if(!confirm("Import profile backup from " + (data.exportedAt || "an unknown date") + "? Your current profile will be replaced. Projects, notebooks, and other app data will not be changed.")) return;
                state.profile=Object.assign({},current,clean, {
                    privacy: { ...current.privacy, ...(clean.privacy || {}) },
                    preferences: { ...current.preferences, ...(clean.preferences || {}) }
                });
                ensureProfileDefaults(); save(); renderProfile(); loadProfilePreferences();
                toast("Profile backup imported", "success");
            } catch(err) { alert("Could not import profile backup: " + err.message); }
            finally { if(event?.target) event.target.value=""; }
        };
        reader.readAsText(file);
    }

    /* ===== share profile / friends (local-only, no server) ===== */
    function buildShareProfileCode() {
        const p = ensureProfileDefaults();
        const stats = profileStats();
        const payload = {
            rexFriendCode: true,
            username: p.username,
            avatar: p.avatar,
            bio: p.bio,
            role: p.role,
            currentProject: p.currentProject,
            favoriteTools: p.favoriteTools,
            region: p.region,
            goal: p.goal,
            skills: p.skills,
            interests: p.interests,
            statusPreset: p.statusPreset,
            statusEmoji: p.statusEmoji,
            statusText: p.statusText,
            bannerStyle: p.bannerStyle,
            bannerImage: p.bannerImage,
            links: p.privacy.showLinks ? p.links : [],
            badges: p.privacy.showBadges ? computeBadges(p, stats) : [],
            stats: p.privacy.showStats ? stats : null,
            memberSince: p.privacy.showMemberSince ? p.memberSince : null
        };
        try {
            return "REX1:" + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
        } catch (e) {
            return "REX1:" + btoa(JSON.stringify(payload));
        }
    }

    function openShareProfileModal() {
        $("shareProfileCode").value = buildShareProfileCode();
        $("shareProfileModal").classList.add("show");
    }

    function copyShareProfileCode() {
        const ta = $("shareProfileCode");
        ta.select();
        try {
            navigator.clipboard.writeText(ta.value);
            toast("Share code copied!", "success");
        } catch (e) {
            document.execCommand("copy");
            toast("Share code copied!", "success");
        }
    }

    function openAddFriendModal() {
        $("addFriendCodeInput").value = "";
        $("addFriendModal").classList.add("show");
    }

    function getFriends() {
        try { return JSON.parse(localStorage.getItem("rex_friends") || "[]") }
        catch (e) { return [] }
    }
    function saveFriends(list) { localStorage.setItem("rex_friends", JSON.stringify(list)) }

    function addFriendFromCode() {
        const raw = $("addFriendCodeInput").value.trim();
        if (!raw.startsWith("REX1:")) { toast("That doesn't look like a valid Rex share code", "error"); return }
        let data;
        try {
            const b64 = raw.slice(5);
            data = JSON.parse(decodeURIComponent(escape(atob(b64))));
        } catch (e) {
            try { data = JSON.parse(atob(raw.slice(5))) }
            catch (e2) { toast("Couldn't read that code — check it was copied fully", "error"); return }
        }
        if (!data || !data.rexFriendCode) { toast("Invalid share code", "error"); return }
        const friends = getFriends();
        data.addedAt = Date.now();
        data.id = String(Date.now());
        friends.unshift(data);
        saveFriends(friends);
        closeModal("addFriendModal");
        renderFriendsList();
        toast(`Added ${data.username || "friend"} to your Friends list`, "success");
    }

    function removeFriend(id) {
        if (!confirm("Remove this friend?")) return;
        saveFriends(getFriends().filter(f => f.id !== id));
        renderFriendsList();
    }

    function renderFriendsList() {
        const listEl = $("friendsList");
        const countEl = $("friendsCount");
        if (!listEl) return;
        const friends = getFriends();
        countEl.textContent = friends.length ? friends.length + (friends.length === 1 ? " friend" : " friends") : "";
        if (!friends.length) {
            listEl.innerHTML = '<p style="color:var(--muted);font-size:12.5px;">No friends added yet. Share your code, or add one!</p>';
            return;
        }
        listEl.innerHTML = friends.map(f => `
            <div style="display:flex;align-items:center;gap:12px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r-md);padding:10px 14px;">
                <div style="width:38px;height:38px;border-radius:50%;background:var(--card);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;flex-shrink:0;">${avatarHTML({ avatar: f.avatar })}</div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:13.5px;">${esc(f.username || "Rex Operator")}</div>
                    <div style="color:var(--muted);font-size:11.5px;">${esc(f.statusEmoji || "🟢")} ${esc(f.statusText || "")}</div>
                </div>
                <button onclick="removeFriend('${esc(String(f.id).replace(/[^\w-]/g, ""))}')" title="Remove" style="background:none;border:0;color:var(--muted);cursor:pointer;font-size:14px;">🗑️</button>
            </div>`).join("");
    }


    /* ===== weather (all original + improved UI) ===== */
    const WX_CODE = { 0: ["☀️", "Clear sky"], 1: ["🌤️", "Mainly clear"], 2: ["⛅", "Partly cloudy"], 3: ["☁️",
                "Overcast"
            ], 45: ["🌫️", "Fog"], 48: ["🌫️", "Depositing rime fog"], 51: ["🌦️", "Light drizzle"], 53: ["🌦️",
                "Drizzle"
            ], 55: ["🌧️", "Dense drizzle"], 56: ["🌧️", "Freezing drizzle"], 57: ["🌧️", "Dense freezing drizzle"],
        61: ["🌧️", "Slight rain"], 63: ["🌧️", "Rain"], 65: ["🌧️", "Heavy rain"], 66: ["🌧️", "Freezing rain"],
        67: ["🌧️", "Heavy freezing rain"], 71: ["🌨️", "Slight snow"], 73: ["🌨️", "Snow"], 75: ["❄️", "Heavy snow"],
        77: ["🌨️", "Snow grains"], 80: ["🌦️", "Slight showers"], 81: ["🌧️", "Showers"], 82: ["⛈️",
                "Violent showers"
            ], 85: ["🌨️", "Snow showers"], 86: ["❄️", "Heavy snow showers"], 95: ["⛈️", "Thunderstorm"],
        96: ["⛈️", "Thunderstorm · hail"], 99: ["⛈️", "Thunderstorm · heavy hail"] };

    function wxInfo(code) { return WX_CODE[code] || ["🌡️", "Unknown"] }

    function wxDayName(iso) { try { return new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" }) }
        catch { return iso } }

    function isFahrenheit() { return (state.settings.tempUnit || "c") === "f" }

    function tempUnitLabel() { return isFahrenheit() ? "°F" : "°C" }

    function fmtTemp(c) { if (c == null || c === "" || isNaN(Number(c))) return "—";
        const n = Number(c); return Math.round(isFahrenheit() ? n * 9 / 5 + 32 : n) + tempUnitLabel() }

    function syncTempUnitUI() {
        const u = state.settings.tempUnit || "c";
        if ($("tempUnitSelect")) $("tempUnitSelect").value = u;
        [
            ["dashUnitC", "c"],
            ["dashUnitF", "f"],
            ["wxUnitC", "c"],
            ["wxUnitF", "f"],
            ["wxUnitC2", "c"],
            ["wxUnitF2", "f"]
        ].forEach(([id, val]) => { const el = $(id); if (el) el.classList.toggle("active", u === val) });
    }

    function setTempUnit(u) {
        const next = (u === "f") ? "f" : "c";
        if (state.settings.tempUnit === next) { syncTempUnitUI(); return }
        state.settings.tempUnit = next;
        save();
        syncTempUnitUI();
        renderWeatherUI();
        toast("Temperature unit: " + tempUnitLabel(), "success");
    }

    async function searchWeather(query) {
        query = (query || "").trim();
        if (!query) { toast("Enter a city name", "error"); return }
        state.weather.loading = true;
        state.weather.error = null;
        renderWeatherUI();
        try {
            const geoRes = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(
                query) + "&count=1&language=en&format=json");
            if (!geoRes.ok) throw new Error("Geocoding failed (HTTP " + geoRes.status + ")");
            const geo = await geoRes.json();
            if (!geo.results || !geo.results.length) throw new Error("No location found for \"" + query + "\"");
            const r = geo.results[0];
            const place = { name: r.name, country: r.country || "", admin: r.admin1 || "", lat: r.latitude,
                lon: r.longitude, label: [r.name, r.admin1, r.country].filter(Boolean).join(", ") };
            await fetchWeatherForPlace(place);
        } catch (e) { state.weather.loading = false;
            state.weather.error = e.message || "Weather search failed";
            save();
            renderWeatherUI();
            toast(state.weather.error, "error") }
    }

    async function fetchWeatherForPlace(place, silent) {
        state.weather.loading = true;
        state.weather.error = null;
        if (!silent) renderWeatherUI();
        try {
            const url = "https://api.open-meteo.com/v1/forecast?latitude=" + place.lat + "&longitude=" + place.lon +
                "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation" +
                "&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum&timezone=auto&forecast_days=7";
            const res = await fetch(url);
            if (!res.ok) throw new Error("Forecast failed (HTTP " + res.status + ")");
            const data = await res.json();
            let alerts = [];
            if (String(place.country || "").toLowerCase() === "united states") {
                try {
                    const alertUrl = "https://api.weather.gov/alerts/active?point=" + place.lat + "," + place.lon;
                    const alertRes = await fetch(alertUrl, { headers: { "Accept": "application/geo+json" } });
                    if (alertRes.ok) {
                        const alertJson = await alertRes.json();
                        alerts = Array.isArray(alertJson.features) ? alertJson.features.map(f => {
                            const p = f.properties || {};
                            return {
                                id: f.id || p.id || (p.event + "-" + p.effective),
                                event: p.event || "Weather Alert",
                                headline: p.headline || p.event || "Weather Alert",
                                description: p.description || "",
                                instruction: p.instruction || "",
                                severity: p.severity || "Unknown",
                                urgency: p.urgency || "Unknown",
                                certainty: p.certainty || "Unknown",
                                effective: p.effective || null,
                                expires: p.expires || null,
                                areaDesc: p.areaDesc || place.label,
                                sender: p.senderName || "National Weather Service"
                            };
                        }) : [];
                    }
                } catch (alertErr) { console.warn("NWS alert lookup failed:", alertErr) }
            }
            state.weather.place = place;
            state.weather.data = data;
            state.weather.alerts = alerts;
            state.weather.alertUpdated = new Date().toISOString();
            state.weather.updated = new Date().toISOString();
            state.weather.loading = false;
            state.weather.error = null;
            save();
            renderWeatherUI();
            renderHome();
            if ($("dashWxSearch")) $("dashWxSearch").value = place.label;
            if ($("wxSearch")) $("wxSearch").value = place.label;
            if (!silent) toast("Weather updated for " + place.name, "success");
        } catch (e) {
            state.weather.loading = false;
            state.weather.error = e.message || "Could not load forecast";
            save();
            renderWeatherUI();
            renderHome();
            if (!silent) toast(state.weather.error, "error");
        }
    }

    function refreshWeather(silent) { if (state.weather.place) fetchWeatherForPlace(state.weather.place, !!silent);
        else if (!silent) { const q = ($("wxSearch")?.value || $("dashWxSearch")?.value || "").trim(); if (q)
                searchWeather(q);
            else toast("Search a city first", "info") } }

    function startWeatherAutoRefresh() { stopWxAutoRefresh();
        startWxAutoRefresh() }

    function renderWeatherUI() { syncTempUnitUI();
        renderDashWeather();
        renderWeatherPage() }

    function getSevereWeatherAlerts(data, place) {
        const official = filterAlertsByPrefs(Array.isArray(state.weather.alerts) ? state.weather.alerts : []);
        return official.map(a => {
            const event = String(a.event || "Weather Alert");
            const lower = event.toLowerCase();
            let icon = "⚠️";
            if (lower.includes("tornado")) icon = "🌪️";
            else if (lower.includes("thunderstorm")) icon = "⛈️";
            else if (lower.includes("flood")) icon = "🌊";
            else if (lower.includes("flash")) icon = "🌊";
            else if (lower.includes("winter") || lower.includes("snow") || lower.includes("blizzard")) icon = "❄️";
            else if (lower.includes("heat")) icon = "🔥";
            else if (lower.includes("wind")) icon = "💨";
            const sev = String(a.severity || "").toLowerCase();
            const severity = (sev === "extreme" || sev === "severe" || lower.includes("warning")) ? "severe" : "warn";
            const expires = a.expires ? new Date(a.expires).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Unknown";
            let alertType = "";
            if (lower.includes("warning")) alertType = "⚠️ WARNING";
            else if (lower.includes("watch")) alertType = "👀 WATCH";
            else if (sev === "extreme" || sev === "severe") alertType = "⚠️ SEVERE";
            else alertType = "ℹ️ ADVISORY";
            return {
                type: "official",
                icon,
                title: icon + " " + event.toUpperCase(),
                description: a.headline || (a.areaDesc ? "Active for " + a.areaDesc : "Official weather alert"),
                eta: "Expires: " + expires,
                alert: a,
                severity,
                alertType
            };
        });
    }

    function formatAlertDetails(a) {
        if (!a) return "";
        const bits = [];
        if (a.areaDesc) bits.push("📍 " + a.areaDesc);
        if (a.sender) bits.push("🏛️ " + a.sender);
        if (a.severity) bits.push("Severity: " + a.severity);
        if (a.urgency) bits.push("Urgency: " + a.urgency);
        if (a.certainty) bits.push("Certainty: " + a.certainty);
        return bits.join(" · ");
    }

    function renderOfficialAlertsHtml() {
        const alerts = Array.isArray(state.weather.alerts) ? state.weather.alerts : [];
        if (!alerts.length) return '<div class="wx-official-ok">✅ No active official weather alerts for this location.</div>';
        return '<div class="wx-official-alerts"><div class="wx-official-title">🚨 Official NWS Alerts</div>' + alerts.map(a => {
            const event = esc(a.event || "Weather Alert");
            const exp = a.expires ? new Date(a.expires).toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "Unknown";
            const desc = esc(a.headline || a.description || "Active weather alert");
            const details = esc(formatAlertDetails(a));
            let typeBadge = "ℹ️ ADVISORY";
            const lower = (a.event || "").toLowerCase();
            if (lower.includes("warning")) typeBadge = "⚠️ WARNING";
            else if (lower.includes("watch")) typeBadge = "👀 WATCH";
            else if (String(a.severity || "").toLowerCase() === "extreme" || String(a.severity || "").toLowerCase() === "severe") typeBadge = "⚠️ SEVERE";
            const typeClass = (lower.includes("warning") || lower.includes("severe") || lower.includes("extreme")) ? "warning" : (lower.includes("watch") ? "watch" : "");
            return '<div class="wx-official-alert"><div class="wx-official-alert-head"><strong>⚠️ ' + event + '</strong><span>Expires ' + esc(exp) + '</span></div><div class="wx-official-headline">' + desc + '</div><div class="wx-official-meta">' + details + ' <span class="alert-type ' + typeClass + '">' + typeBadge + '</span></div>' + (a.instruction ? '<details><summary>Safety instructions</summary><div class="wx-alert-instruction">' + esc(a.instruction) + '</div></details>' : '') + '</div>';
        }).join('') + '</div>';
    }

    function renderDashWeather() {
        const body = $("dashWxBody");
        if (!body) return;
        const w = state.weather;
        if (w.loading && !w.data) { body.innerHTML = '<div class="empty" style="padding:30px 8px">Loading weather…</div>';
            return }
        if (w.error && !w.data) { body.innerHTML = '<div class="empty" style="padding:30px 8px;color:var(--red)">' +
                esc(w.error) + '</div>'; return }
        if (!w.data || !w.place) { body.innerHTML =
                '<div class="empty" style="padding:30px 8px">Search a city to load weather (Open-Meteo · display only)</div>';
            return }
        const cur = w.data.current || {};
        const [ico, label] = wxInfo(cur.weather_code);
        const unit = w.data.current_units || {};
        const alerts = getSevereWeatherAlerts(w.data, w.place);
        let alertHtml = '';
        if (alerts.length > 0) {
            alertHtml = alerts.map(a =>
                `
              <div class="wx-alert-banner ${a.severity}">
                <span class="alert-icon">${a.icon}</span>
                <div class="alert-content">
                  <div class="alert-title">${a.title}</div>
                  <div class="alert-desc">${a.description}</div>
                  <div class="alert-eta">⏰ ${a.eta}</div>
                  <div class="alert-type ${a.severity === 'severe' ? 'warning' : 'watch'}">${a.alertType}</div>
                </div>
              </div>`
            ).join('');
            const dot = $("schedDot");
            if (dot) { dot.className = "dot severe";
                $("schedStatusLabel").textContent = "⚠️ Severe Weather Alert · v" + APP_VERSION }
        } else {
            const dot = $("schedDot");
            if (dot) { dot.className = "dot";
                $("schedStatusLabel").textContent = "Ready · v" + APP_VERSION }
        }
        const metaItems = [
            { label: 'Humidity', value: cur.relative_humidity_2m != null ? cur.relative_humidity_2m + "%" :
                '—' },
            { label: 'Wind', value: cur.wind_speed_10m != null ? cur.wind_speed_10m + " " + (unit
                    .wind_speed_10m || "km/h") : '—' },
            { label: 'Precipitation', value: cur.precipitation != null ? cur.precipitation + (unit
                    .precipitation || "mm") : '—' },
            { label: 'Feels Like', value: cur.apparent_temperature != null ? fmtTemp(cur
                    .apparent_temperature) : '—' }
        ];
        body.innerHTML =
            alertHtml +
            renderOfficialAlertsHtml() +
            '<div class="wx-main">' +
            '<div class="wx-icon-big">' + ico + '</div>' +
            '<div class="wx-details">' +
            '<div class="wx-location">📍 ' + esc(w.place.label) + '</div>' +
            '<div class="wx-temp-big">' + fmtTemp(cur.temperature_2m) + '</div>' +
            '<div class="wx-condition">' + esc(label) + '</div>' +
            '<div class="wx-feels-like">Feels like ' + fmtTemp(cur.apparent_temperature) + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="wx-meta-grid">' +
            metaItems.map(m => '<div class="wx-meta-item"><span class="label">' + m.label +
                '</span><span class="value">' + m.value + '</span></div>').join('') +
            '</div>' +
            renderWxFunHtml(w.data) +
            '<div class="wx-forecast-section">' +
            '<div class="section-title"><span>📅 7-Day Forecast</span><span style="color:var(--muted);font-weight:600;font-size:11px">' +
            tempUnitLabel() + '</span></div>' +
            renderForecastHtml(w.data) +
            '</div>';
    }

    function renderForecastHtml(data) {
        if (!data || !data.daily || !data.daily.time) return "";
        const d = data.daily;
        let html = '<div class="wx-forecast-grid">';
        for (let i = 0; i < Math.min(7, d.time.length); i++) {
            const [ico] = wxInfo(d.weather_code[i]);
            html += '<div class="wx-forecast-day">' +
                '<div class="day-name">' + esc(wxDayName(d.time[i])) + '</div>' +
                '<div class="day-icon">' + ico + '</div>' +
                '<div class="day-high">' + fmtTemp(d.temperature_2m_max[i]) + '</div>' +
                '<div class="day-low">' + fmtTemp(d.temperature_2m_min[i]) + '</div>' +
                '</div>';
        }
        return html + "</div>";
    }

    function moonPhaseInfo(date) {
        const d = date ? new Date(date) : new Date();
        const lp = 2551443;
        const newMoon = new Date(Date.UTC(2001, 0, 9, 5, 37, 0)).getTime();
        const phase = ((d.getTime() - newMoon) / 1000) % lp;
        const p = ((phase < 0 ? phase + lp : phase) / lp);
        if (p < 0.03 || p > 0.97) return { icon: "🌑", name: "New moon" };
        if (p < 0.22) return { icon: "🌒", name: "Waxing crescent" };
        if (p < 0.28) return { icon: "🌓", name: "First quarter" };
        if (p < 0.47) return { icon: "🌔", name: "Waxing gibbous" };
        if (p < 0.53) return { icon: "🌕", name: "Full moon" };
        if (p < 0.72) return { icon: "🌖", name: "Waning gibbous" };
        if (p < 0.78) return { icon: "🌗", name: "Last quarter" };
        return { icon: "🌘", name: "Waning crescent" };
    }

    function uvLabel(uv) {
        if (uv == null || isNaN(uv)) return { text: "—", cls: "" };
        const n = Number(uv);
        if (n < 3) return { text: n.toFixed(1) + " · Low", cls: "ok" };
        if (n < 6) return { text: n.toFixed(1) + " · Moderate", cls: "" };
        if (n < 8) return { text: n.toFixed(1) + " · High", cls: "warn" };
        if (n < 11) return { text: n.toFixed(1) + " · Very high", cls: "danger" };
        return { text: n.toFixed(1) + " · Extreme", cls: "danger" };
    }

    function buildWxFun(data) {
        const cur = data.current || {};
        const daily = data.daily || {};
        const code = cur.weather_code;
        const t = cur.temperature_2m,
            feels = cur.apparent_temperature != null ? cur.apparent_temperature : t;
        const wind = cur.wind_speed_10m || 0,
            precip = cur.precipitation || 0;
        const uvMax = (daily.uv_index_max && daily.uv_index_max[0] != null) ? daily.uv_index_max[0] : null;
        const tMin = (daily.temperature_2m_min && daily.temperature_2m_min[0] != null) ? daily.temperature_2m_min[0] :
        t;
        const wet = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code) || precip > 0.2;
        const snow = [71, 73, 75, 77, 85, 86].includes(code);
        const storm = [95, 96, 99].includes(code);
        let wear = { icon: "🧥", text: "Light jacket recommended", cls: "" };
        if (feels == null) wear = { icon: "🧥", text: "—", cls: "" };
        else if (feels >= 28) wear = { icon: "🩳", text: "Light clothes · stay cool", cls: "warn" };
        else if (feels >= 22) wear = { icon: "👕", text: "T-shirt weather", cls: "ok" };
        else if (feels >= 16) wear = { icon: "🧥", text: "Light jacket recommended", cls: "" };
        else if (feels >= 10) wear = { icon: "🧥", text: "Jacket or sweater", cls: "" };
        else if (feels >= 3) wear = { icon: "🧣", text: "Warm coat recommended", cls: "warn" };
        else wear = { icon: "🧤", text: "Heavy winter gear", cls: "danger" };
        if (wet) wear.text += (wet ? " · waterproof layer" : "");
        let umbrella = { icon: "☂️", text: "No umbrella needed", cls: "ok" };
        if (storm) umbrella = { icon: "☂️", text: "Yes — storms likely", cls: "danger" };
        else if (wet || (daily.precipitation_sum && daily.precipitation_sum[0] > 1)) umbrella = { icon: "☂️",
                text: "Bring an umbrella", cls: "warn" };
        else if (code >= 2 && code <= 3) umbrella = { icon: "☂️", text: "Optional — clouds around", cls: "" };
        let run = { icon: "🏃", text: "Okay", cls: "" };
        if (storm || code === 99 || code === 96) run = { icon: "🏃", text: "Not recommended — severe weather",
                cls: "danger" };
        else if (wet || snow || wind > 40) run = { icon: "🏃", text: "Not recommended", cls: "danger" };
        else if (feels != null && (feels > 32 || feels < -5) || wind > 28) run = { icon: "🏃",
                text: "Okay — take it easy", cls: "warn" };
        else if (feels != null && feels >= 8 && feels <= 24 && !wet && wind < 20) run = { icon: "🏃",
                text: "Great conditions", cls: "ok" };
        else run = { icon: "🏃", text: "Okay", cls: "" };
        const feelsCard = { icon: "🌡️", text: feels != null ? fmtTemp(feels) + (t != null && Math.round(t) !== Math
                    .round(feels) ? " (air " + fmtTemp(t) + ")" : "") : "—", cls: "" };
        const uv = uvLabel(uvMax);
        const uvCard = { icon: "☀️", text: uv.text + (uvMax != null ? " max today" : ""), cls: uv.cls };
        const moon = moonPhaseInfo(new Date());
        const moonCard = { icon: moon.icon, text: moon.name, cls: "" };
        let frost = { icon: "❄️", text: "No frost expected", cls: "ok" };
        if (tMin != null && tMin <= 0) frost = { icon: "❄️", text: "Frost warning — near or below freezing overnight",
                cls: "danger" };
        else if (tMin != null && tMin <= 2) frost = { icon: "❄️", text: "Possible light frost overnight",
                cls: "warn" };
        return [
            { title: "Wear", ...wear },
            { title: "Umbrella", ...umbrella },
            { title: "Running", ...run },
            { title: "Feels", ...feelsCard },
            { title: "UV Index", ...uvCard },
            { title: "Moon", ...moonCard },
            { title: "Frost", ...frost }
        ];
    }

    function renderWxFunHtml(data) {
        const items = buildWxFun(data);
        let html = '<div class="wx-section-title"><span>✨ Weather Insights</span></div><div class="wx-fun-grid">';
        items.forEach(it => {
            const cls = it.cls || '';
            html += '<div class="wx-fun-card ' + (cls || '') + '">' +
                '<span class="fi">' + it.icon + '</span>' +
                '<div><div class="ft">' + esc(it.title) + '</div><div class="fv">' + esc(it.text) +
                '</div></div>' +
                '</div>';
        });
        return html + "</div>";
    }

    function renderWeatherPage() {
        const status = $("wxStatus"),
            detail = $("wxDetail");
        if (!status || !detail) return;
        syncTempUnitUI();
        const w = state.weather;
        if (w.place && $("wxSearch") && !$("wxSearch").value) $("wxSearch").value = w.place.label || "";
        if (w.loading && !w.data) { status.className = "wx-status";
            status.textContent = "⏳ Loading weather…";
            detail.innerHTML = ""; return }
        if (w.error && !w.data) { status.className = "wx-status err";
            status.textContent = "❌ " + w.error;
            detail.innerHTML = ""; return }
        if (w.loading) { status.className = "wx-status";
            status.textContent = "🔄 Refreshing… · " + tempUnitLabel() } else if (w.updated) { status.className =
                "wx-status ok";
            status.textContent = "✅ Updated " + new Date(w.updated).toLocaleString() + " · " + tempUnitLabel() } else
        { status.className = "wx-status";
            status.textContent = "🔍 Search a location to see the forecast" }
        if (!w.data || !w.place) { detail.innerHTML = '<div class="empty" style="padding:40px 8px">No weather loaded yet</div>';
            return }
        const cur = w.data.current || {};
        const [ico, label] = wxInfo(cur.weather_code);
        const unit = w.data.current_units || {};
        const alerts = getSevereWeatherAlerts(w.data, w.place);
        let alertHtml = '';
        if (alerts.length > 0) {
            alertHtml = alerts.map(a =>
                `
              <div class="wx-alert-banner ${a.severity}">
                <span class="alert-icon">${a.icon}</span>
                <div class="alert-content">
                  <div class="alert-title">${a.title}</div>
                  <div class="alert-desc">${a.description}</div>
                  <div class="alert-eta">⏰ ${a.eta}</div>
                  <div class="alert-type ${a.severity === 'severe' ? 'warning' : 'watch'}">${a.alertType}</div>
                </div>
              </div>`
            ).join('');
        }
        const metaItems = [
            { label: 'Humidity', value: cur.relative_humidity_2m != null ? cur.relative_humidity_2m + "%" :
                '—' },
            { label: 'Wind', value: cur.wind_speed_10m != null ? cur.wind_speed_10m + " " + (unit
                    .wind_speed_10m || "km/h") : '—' },
            { label: 'Precipitation', value: cur.precipitation != null ? cur.precipitation + (unit
                    .precipitation || "mm") : '—' },
            { label: 'Feels Like', value: cur.apparent_temperature != null ? fmtTemp(cur
                    .apparent_temperature) : '—' }
        ];
        detail.innerHTML =
            alertHtml +
            renderOfficialAlertsHtml() +
            '<div class="wx-main">' +
            '<div class="wx-icon-big">' + ico + '</div>' +
            '<div class="wx-details">' +
            '<div class="wx-location">📍 ' + esc(w.place.label) + '</div>' +
            '<div class="wx-temp-big">' + fmtTemp(cur.temperature_2m) + '</div>' +
            '<div class="wx-condition">' + esc(label) + '</div>' +
            '<div class="wx-feels-like">Feels like ' + fmtTemp(cur.apparent_temperature) + '</div>' +
            '</div>' +
            '</div>' +
            '<div class="wx-meta-grid">' +
            metaItems.map(m => '<div class="wx-meta-item"><span class="label">' + m.label +
                '</span><span class="value">' + m.value + '</span></div>').join('') +
            '</div>' +
            renderWxFunHtml(w.data) +
            '<div class="wx-forecast-section">' +
            '<div class="section-title"><span>📅 7-Day Forecast</span><span style="color:var(--muted);font-weight:600;font-size:11px">' +
            tempUnitLabel() + '</span></div>' +
            renderForecastHtml(w.data) +
            '</div>' +
            '<div class="wx-note">ⓘ Forecast data comes from Open-Meteo. U.S. weather alerts come from the official National Weather Service when available. Alerts are refreshed with the weather data and are never posted to Discord automatically.</div>';
    }

    /* ===== dashboard ===== */
    function formatHomeTime() { return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) }

    function homeEventDate(e) { const raw = e?.start || e?.date || ""; if (!raw) return null;
        const d = new Date(raw); return Number.isNaN(d.getTime()) ? null : d }

    function getNextHomeEvent() {
        const items = (ws().testingEvents || []).map(e => ({ e, d: homeEventDate(e) })).filter(x => x.d);
        const now = Date.now();
        const future = items.filter(x => x.d.getTime() >= now).sort((a, b) => a.d - b.d);
        return future[0] || null;
    }

    function renderHome() {
        const W = ws();
        const weather = state.weather;
        const cur = weather?.data?.current;
        const unit = (state.settings?.tempUnit || "c").toUpperCase();
        const hwValue = $("homeWeatherValue"),
            hwSub = $("homeWeatherSub");
        if (cur && typeof cur.temperature_2m === "number") {
            const wx = wxInfo(cur.weather_code);
            hwValue.textContent = Math.round(cur.temperature_2m) + "°" + unit;
            hwSub.textContent = (wx?.[0] || "🌤️") + " " + (wx?.[1] || "Current weather") + " · " + (weather.place
                ?.name || "Weather");
        } else if (weather?.loading) { hwValue.textContent = "Loading…";
            hwSub.textContent = "Getting current weather" } else if (weather?.error) { hwValue.textContent =
            "Unavailable";
            hwSub.textContent = "Tap to open Weather" } else { hwValue.textContent = "—";
            hwSub.textContent = "Set a location in Weather" }

        const alertMini = $("homeWeatherAlertMini");
        if (alertMini) {
            const alerts = getSevereWeatherAlerts(weather?.data, weather?.place);
            if (alerts.length > 0) {
                const severe = alerts.some(a => a.severity === "severe");
                alertMini.innerHTML =
                    `<div class="home-weather-alert-mini ${severe ? 'severe' : ''}" onclick="showView('weather')">⚠️ ${alerts.length} weather alert${alerts.length>1?'s':''} · ${severe ? '⚠️ SEVERE' : '⚠️ WARNING/WATCH'}</div>`;
            } else {
                alertMini.innerHTML = "";
            }
        }

        const next = getNextHomeEvent();
        if (next) {
            $("homeNextEventValue").textContent = next.e.name || "Testing Event";
            $("homeNextEventSub").textContent = next.d.toLocaleString([], { month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit" });
            $("homeNextEventPanel").innerHTML =
                '<button class="home-next-event" onclick="showView(\'testing\')">' +
                '<div class="home-next-icon">🧪</div><div class="home-next-info"><strong>' + esc(next.e.name ||
                    "Testing Event") + '</strong>' +
                '<small>' + esc(next.d.toLocaleString([], { weekday: "short", month: "short", day: "numeric",
                    hour: "numeric", minute: "2-digit" })) + '</small></div><span class="chip">Open</span></button>';
        } else {
            $("homeNextEventValue").textContent = "No events";
            $("homeNextEventSub").textContent = "Create a Testing Event";
            $("homeNextEventPanel").innerHTML =
                '<button class="home-next-event" onclick="showView(\'testing\');openEventModal()"><div class="home-next-icon">🧪</div><div class="home-next-info"><strong>No upcoming testing events</strong><small>Create your next event here</small></div><span class="chip">Create</span></button>';
        }
        const today = dayKey();
        const sentToday = state.analyticsGlobal?.byDay?.[today] || 0;
        $("homeSentTodayValue").textContent = sentToday;
        $("homeWebhookStatus").innerHTML = W.webhooks.length ?
            '<div class="row-item"><div class="icon-box">📡</div><div class="info"><strong>' + W.webhooks.length +
            ' webhook' + (W.webhooks.length === 1 ? "" : "s") +
            ' configured</strong><small>' + W.sent + ' total sent · ' + W.failed +
            ' failed</small></div><span class="chip green">Ready</span></div>' :
            '<button class="home-next-event" onclick="showView(\'builder\');openWebhookModal()"><div class="home-next-icon">📡</div><div class="home-next-info"><strong>No webhooks configured</strong><small>Add a Discord webhook to get started</small></div><span class="chip">Add</span></button>';
        $("homeTimeValue").textContent = formatHomeTime();
        $("homeDateValue").textContent = new Date().toLocaleDateString([], { weekday: "short", month: "short",
            day: "numeric" });
        updateRexIntelligence();
    }

    function focusHomeTime() { $("homeTimeValue")?.scrollIntoView({ behavior: "smooth", block: "center" }) }
    const REX_QUOTES = [
        "🐶 Rex says: You’ve got this!",
        "🐶 Rex says: Time to ship something awesome!",
        "🐶 Rex says: Webhooks ready. Let’s work!",
        "🐶 Rex says: One task at a time. 🚀",
        "🐶 Rex says: Project Rex is looking good!"
    ];

    function randomRex() { toast(REX_QUOTES[Math.floor(Math.random() * REX_QUOTES.length)], "info") }

    function startHomeClock() { if (window.__rexHomeClock) clearInterval(window.__rexHomeClock);
        window.__rexHomeClock = setInterval(() => { if ($("homeTimeValue")) $("homeTimeValue").textContent =
                formatHomeTime() }, 1000) }

    function renderDashboard() {
        const W = ws();
        $("stWh").textContent = W.webhooks.length;
        $("stSent").textContent = W.sent;
        $("stSched").textContent = W.scheduled.filter(s => s.status === "pending").length;
        $("stDrafts").textContent = W.drafts.length;
        renderDashWeather();
        const dw = $("dashWebhooks");
        dw.innerHTML = "";
        if (!W.webhooks.length) dw.innerHTML = '<div class="empty">No webhooks</div>';
        else W.webhooks.forEach(wh => {
            const d = document.createElement("div");
            d.className = "row-item";
            d.innerHTML =
                '<div class="icon-box">📡</div><div class="info"><strong>' + esc((wh.locked ? "🔒 " : "") +
                wh.name) + '</strong><small>' + mask(wh.url) +
                '</small></div><div class="acts"><button class="sbtn" onclick="useWH(\'' + wh.id +
                '\')">Use</button><button class="sbtn" onclick="toggleLock(\'' + wh.id +
                '\')">' + (wh.locked ? "🔓" : "🔒") +
                '</button><button class="sbtn" onclick="openWebhookModal(\'' + wh.id +
                '\')">Edit</button><button class="sbtn danger" onclick="deleteWebhook(\'' + wh.id +
                '\')">×</button></div>';
            dw.appendChild(d);
        });
        const dt = $("dashTimeline");
        dt.innerHTML = "";
        state.timeline.slice(0, 6).forEach(t => { const d = document.createElement("div");
            d.className = "row-item";
            d.innerHTML = '<div class="icon-box">📈</div><div class="info"><strong>' + esc(t.text) +
                '</strong><small>' + esc(t.time) + '</small></div>';
            dt.appendChild(d) });
        if (!state.timeline.length) dt.innerHTML = '<div class="empty">No activity</div>';
        const ds = $("dashSched");
        ds.innerHTML = "";
        const up = W.scheduled.filter(s => s.status === "pending").sort((a, b) => a.when - b.when).slice(0, 5);
        if (!up.length) ds.innerHTML = '<div class="empty">None upcoming</div>';
        else up.forEach(s => { const d = document.createElement("div");
            d.className = "row-item";
            d.innerHTML = '<div class="icon-box">⏰</div><div class="info"><strong>' + esc(s.note || s
                    .webhookName) + '</strong><small>' + esc(new Date(s.when).toLocaleString()) +
                '</small></div>';
            ds.appendChild(d) });
        const dd = $("dashDrafts");
        dd.innerHTML = "";
        if (!W.drafts.length) dd.innerHTML = '<div class="empty">No drafts</div>';
        else W.drafts.slice(0, 5).forEach(d => { const el = document.createElement("div");
            el.className = "row-item";
            el.innerHTML = '<div class="icon-box">📝</div><div class="info"><strong>' + esc(d.name) +
                '</strong></div><div class="acts"><button class="sbtn" onclick="loadDraft(\'' + d.id +
                '\')">Load</button></div>';
            dd.appendChild(el) });
        const df = $("dashFavs");
        df.innerHTML = "";
        if (!W.favorites.length) df.innerHTML = '<div class="empty">No favorites</div>';
        else W.favorites.forEach(k => { const t = BUILTIN[k]; if (!t) return; const el = document.createElement(
                "div");
            el.className = "row-item";
            el.innerHTML = '<div class="icon-box">⭐</div><div class="info"><strong>' + esc(t.name) +
                '</strong></div><div class="acts"><button class="sbtn" onclick="useBuiltin(\'' + k +
                '\')">Use</button></div>';
            df.appendChild(el) });
        updateRexIntelligence();
    }

    function useWH(id) { showView("builder");
        const s = $("webhookSelect"); if ([...s.options].some(o => o.value === id)) s.value = id;
        toast("Selected", "info") }

    /* ===== command palette ===== */
    const COMMANDS = [
        { name: "Send Webhook", run: () => { showView("builder");
                sendWebhook() } },
        { name: "New Template", run: () => { showView("builder");
                saveCurrentAsTemplate() } },
        { name: "Schedule Message", run: () => { showView("builder");
                openScheduleModal() } },
        { name: "Open History", run: () => showView("history") },
        { name: "Open Settings", run: () => showView("settings") },
        { name: "New Draft", run: () => newDraft() },
        { name: "Toggle Dark Mode", run: () => toggleTheme() },
        { name: "Check for Updates", run: () => { if (window.RexUpd) { RexUpd.open(); RexUpd.check(true) } } },
        { name: "Pin or unpin this page (Favorites)", run: () => { if (window.RexFav) RexFav.toggleCurrent() } },
        { name: "Open Rex Insider", run: () => showView("insider") },
        { name: "Open Live Events", run: () => showView("events") },
        { name: "Quick note (Alt+N)", run: () => { if (window.RexQuick) RexQuick.open() } },
        { name: "Toggle focus sound", run: () => { if (window.RexSound) RexSound.toggle() } },
        { name: "Add Webhook", run: () => openWebhookModal() },
        { name: "Open Builder", run: () => showView("builder") },
        { name: "Open Templates", run: () => showView("templates") },
        { name: "Open Schedule", run: () => showView("schedule") },
        { name: "Open Analytics", run: () => showView("analytics") },
        { name: "Open Timeline", run: () => showView("timeline") },
        { name: "Open Testing Events", run: () => showView("testing") },
        { name: "Create Testing Event", run: () => { showView("testing");
                openEventModal() } },
        { name: "Payload Inspector", run: () => { showView("builder");
                openPayloadInspector() } },
        { name: "STOP ALL Scheduled", run: () => stopAllScheduled() },
        { name: "Export Data", run: () => exportData() },
        { name: "Import Data", run: () => openImport() }
    ];
    let paletteIdx = 0,
        paletteFiltered = COMMANDS;

    function openPalette() { $("palette").classList.add("show");
        $("paletteInput").value = "";
        filterPalette();
        $("paletteInput").focus() }

    function closePalette() { $("palette").classList.remove("show") }

    function filterPalette() {
        const q = $("paletteInput").value.toLowerCase();
        paletteFiltered = COMMANDS.filter(c => c.name.toLowerCase().includes(q));
        paletteIdx = 0;
        renderPaletteList();
    }

    function renderPaletteList() {
        const list = $("paletteList");
        list.innerHTML = "";
        paletteFiltered.forEach((c, i) => { const d = document.createElement("div");
            d.className = "palette-item" + (i === paletteIdx ? " active" : "");
            d.innerHTML = "<span>" + esc(c.name) + "</span>";
            d.onclick = () => { c.run();
                closePalette() };
            list.appendChild(d) });
        if (!paletteFiltered.length) list.innerHTML = '<div class="palette-item">No matches</div>';
    }

    function paletteKey(e) {
        if (e.key === "ArrowDown") { e.preventDefault();
            paletteIdx = Math.min(paletteIdx + 1, paletteFiltered.length - 1);
            renderPaletteList() } else if (e.key === "ArrowUp") { e.preventDefault();
            paletteIdx = Math.max(paletteIdx - 1, 0);
            renderPaletteList() } else if (e.key === "Enter") { e.preventDefault();
            const c = paletteFiltered[paletteIdx]; if (c) { c.run();
                closePalette() } } else if (e.key === "Escape") closePalette();
    }
    document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e
                .preventDefault();
            openPalette() } });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            document.querySelectorAll(".modal-bg.show").forEach(m => m.classList.remove("show"));
        }
    });

    function openShortcutsModal() { $("shortcutsModal").classList.add("show") }
    document.addEventListener("keydown", e => {
        const ae = document.activeElement, typing = ae && (["INPUT", "TEXTAREA", "SELECT"].includes(ae.tagName) || ae.isContentEditable);
        if (e.key === "?" && !typing && !document.querySelector(".uc-modal-bg")) {
            e.preventDefault();
            openShortcutsModal();
        }
    });

    /* ===== testing events (all original + mention support) ===== */
    function evtStatus(e) {
        const testers = e.testers || [];
        const full = e.maxTesters > 0 && testers.length >= e.maxTesters;
        const today = dayKey();
        if (e.manualStatus === "Ended") return "Completed";
        if (e.manualStatus === "Paused") return "Paused";
        if (e.end && today > e.end) return "Completed";
        if (full) return "Full";
        if (e.manualStatus === "Active") return "Active";
        if (e.start && today < e.start) return "Upcoming";
        return "Active";
    }

    function statusChipClass(s) { return { Upcoming: "chip yellow", Active: "chip green", Full: "chip red",
            Completed: "chip gray", Paused: "chip purple" } [s] || "chip" }

    function startEvent(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        e.manualStatus = "Active";
        addTL("testing", "Started testing event \"" + e.name + "\"");
        save();
        renderTestingEvents();
        renderDashboard();
        toast("Testing event started", "success");
    }

    function pauseEvent(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        e.manualStatus = "Paused";
        addTL("testing", "Paused testing event \"" + e.name + "\"");
        save();
        renderTestingEvents();
        renderDashboard();
        toast("Testing event paused", "info");
    }

    function endEvent(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        if (!confirm('End testing event "' + e.name + '" now? It will be marked Completed.')) return;
        e.manualStatus = "Ended";
        addTL("testing", "Ended testing event \"" + e.name + "\"");
        addHistEvt(ws(), "Ended testing event: " + e.name);
        save();
        renderTestingEvents();
        renderDashboard();
        toast("Testing event ended", "success");
    }

    function resetEventStatus(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        delete e.manualStatus;
        addTL("testing", "Reset status for testing event \"" + e.name + "\" to automatic");
        save();
        renderTestingEvents();
        renderDashboard();
        toast("Status reset to automatic", "info");
    }

    function reopenEvent(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        e.manualStatus = "Active";
        addTL("testing", "Reopened testing event \"" + e.name + "\"");
        addHistEvt(ws(), "Reopened testing event: " + e.name);
        save();
        renderTestingEvents();
        renderDashboard();
        toast("Testing event reopened", "success");
    }

    function setTesterLimit(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        const cur = (e.testers || []).length;
        const input = prompt("Set max testers for \"" + e.name + "\" (currently " + cur + " joined):", e.maxTesters ||
            "");
        if (input === null) return;
        const n = parseInt(input);
        if (!n || n < 1) { toast("Enter a valid number ≥ 1", "error"); return }
        if (n < cur) { toast("Can't be less than current tester count (" + cur + ")", "error"); return }
        e.maxTesters = n;
        addTL("testing", "Set tester limit for \"" + e.name + "\" to " + n);
        save();
        renderTestingEvents();
        renderDashboard();
        toast("Tester limit set to " + n, "success");
    }

    function viewCapacity(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        const count = (e.testers || []).length;
        const pct = e.maxTesters ? Math.min(100, Math.round(count / e.maxTesters * 100)) : 0;
        toast("👥 " + e.name + ": " + count + " / " + e.maxTesters + " testers (" + pct + "%)", "info");
    }

    function toggleSignups(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        e.signupsClosed = !e.signupsClosed;
        addTL("testing", (e.signupsClosed ? "Closed" : "Reopened") + " signups for \"" + e.name + "\"");
        save();
        renderTestingEvents();
        renderDashboard();
        toast(e.signupsClosed ? "Signups closed" : "Signups reopened", "info");
    }

    /* ===== MENTION SUPPORT FOR TESTING EVENTS ===== */
    function setEventMention(id, pref) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        e.mentionPref = pref || "";
        save();
        renderTestingEvents();
        toast(pref ? "Mention: " + pref : "Mention: None", "info");
    }

    function eventWebhookPayload(e, type) {
        const count = (e.testers || []).length;
        const range = (e.start || "—") + " → " + (e.end || "—");
        const templates = {
            announce: { title: "📢 New Testing Event", description: e.description ||
                    "A new testing event has been created.", color: 0x8d7cff, extra: e.instructions },
            started: { title: "🚀 Testing Started: " + e.name, description: "The test is now live! " + (e
                    .instructions ? "See instructions below." : "Jump in and start testing."),
                color: 0x32c98a, extra: e.instructions },
            ended: { title: "🏁 Testing Ended: " + e.name,
                description: "This testing event has concluded. Thanks to everyone who took part!",
                color: 0xff5d6c },
            updated: { title: "⚠️ Testing Event Updated: " + e.name,
                description: "Details for this testing event have changed — please check the latest info.",
                color: 0xffbd45, extra: e.instructions },
            reminder: { title: "🔔 Reminder: " + e.name,
                description: "Don't forget — this testing event is still open for participation.",
                color: 0x43a9ff, extra: e.instructions },
            full: { title: "👥 Testing Event Full: " + e.name,
                description: "This event has reached its tester capacity (" + count + "/" + e.maxTesters +
                    "). Signups are now closed.", color: 0xff5d6c },
            winner: { title: "🏆 Winner Announced: " + e.name,
                description: (e._winnerName ? ("Congratulations to **" + e._winnerName + "**!") : "A winner has been selected!") +
                    "\n\n🎁 **Prize:** Full **Project Rex Webhook Center** HTML file.\nThe winner will receive the file so they can open and test Project Rex themselves.",
                color: 0xffbd45, extra: e.instructions }
        };
        const t = templates[type];
        if (!t) return null;
        const fields = [
            { name: "📅 Dates", value: range, inline: true },
            { name: "👥 Testers", value: count + " / " + (e.maxTesters || "—"), inline: true }
        ];
        if (t.extra && t.extra.trim()) {
            fields.push({ name: "📋 Instructions", value: t.extra.slice(0, 1000) });
        }
        const emb = { title: t.title, description: t.description, color: t.color, fields, timestamp: new Date()
                .toISOString() };
        const payload = { embeds: [emb] };
        if (e.mentionPref) {
            payload.content = e.mentionPref + " ";
        }
        return payload;
    }

    async function sendEventWebhook(id, type) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        const wh = (ws().webhooks || [])[0];
        if (!wh) { toast("Add a webhook first (Builder tab) to send this", "error"); return }
        const payload = eventWebhookPayload(e, type);
        if (!payload) return;
        const labels = { announce: "Announcement", started: "Test Started", ended: "Test Ended",
            updated: "Test Updated", reminder: "Reminder", full: "Test Full", winner: "Winner Announcement" };
        const mentionLabel = e.mentionPref ? " (" + e.mentionPref + ")" : "";
        if (state.settings.confirmBeforeSend && !confirm("Send \"" + labels[type] + "\"" + mentionLabel +
                " for \"" + e.name + "\" to \"" + wh.name + "\"?")) return;
        try {
            const res = await fetch(wh.url, { method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload) });
            if (!res.ok) { let msg = "Discord rejected the request.";
                try { const t = await res.text();
                    const j = JSON.parse(t); if (j.message) msg = j.message } catch {}; throw new Error(msg) }
            const W = ws();
            W.sent++;
            trackDay();
            W.history.unshift({ id: String(Date.now()), message: labels[type] + mentionLabel + ": " + e.name,
                webhookName: wh.name, time: new Date().toLocaleString(), ok: true });
            W.history = W.history.slice(0, 200);
            addTL("testing", labels[type] + mentionLabel + " webhook sent for \"" + e.name + "\"");
            save();
            updateAll();
            toast(labels[type] + " sent! 🚀" + mentionLabel, "success");
            notify(labels[type] + mentionLabel + " sent for " + e.name, "success");
        } catch (err) {
            const W = ws();
            W.failed++;
            save();
            toast(err.message || "Send failed", "error");
            notify("Send failed: " + (err.message || ""), "error");
            addTL("fail", "Failed to send " + labels[type] + " for \"" + e.name + "\"");
        }
    }

    /* ===== Announce Winner + downloadable HTML certificate ===== */
    function buildWinnerCertificateHtml(eventName, winnerName, instructions) {
        const dateStr = new Date().toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" });
        const safeEvent = String(eventName || "Testing Event").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeWinner = String(winnerName || "Winner").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const safeInstr = String(instructions || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🏆 Winner Certificate · ${safeEvent}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: linear-gradient(145deg, #0d141f 0%, #1a2a40 50%, #0d141f 100%);
    color: #edf5ff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .cert {
    width: min(560px, 100%);
    background: rgba(22, 32, 46, .96);
    border: 1px solid #293a4f;
    border-radius: 20px;
    padding: 36px 28px;
    box-shadow: 0 24px 60px rgba(0,0,0,.4);
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .cert::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 5px;
    background: linear-gradient(90deg, #5b6ef5, #9c6bff, #ffb020);
  }
  .badge {
    font-size: 64px;
    line-height: 1;
    margin-bottom: 12px;
    filter: drop-shadow(0 6px 16px rgba(91,110,245,.35));
  }
  h1 {
    font-size: 22px;
    letter-spacing: -.3px;
    margin-bottom: 6px;
  }
  .sub {
    color: #8fa2b8;
    font-size: 13px;
    margin-bottom: 22px;
  }
  .winner-name {
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(135deg, #7c8bff, #ffb020);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 18px 0 8px;
  }
  .event-name {
    font-size: 15px;
    font-weight: 700;
    color: #5b6ef5;
    margin-bottom: 18px;
  }
  .meta {
    font-size: 12px;
    color: #8fa2b8;
    margin-bottom: 20px;
  }
  .instr {
    text-align: left;
    background: rgba(15,24,36,.8);
    border: 1px solid #293a4f;
    border-radius: 12px;
    padding: 14px 16px;
    font-size: 12.5px;
    line-height: 1.55;
    color: #dbdee1;
    margin-top: 8px;
  }
  .instr::before {
    content: "📋 Instructions / Prize Notes";
    display: block;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: .4px;
    color: #8fa2b8;
    margin-bottom: 8px;
    text-transform: uppercase;
  }
  .footer {
    margin-top: 24px;
    font-size: 11px;
    color: #718096;
  }
  .rex {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    font-weight: 700;
    color: #7c8bff;
  }
</style>
</head>
<body>
  <div class="cert">
    <div class="badge">🏆</div>
    <h1>Winner Certificate</h1>
    <p class="sub">Project Rex · Testing Event</p>
    <div class="winner-name">${safeWinner}</div>
    <div class="event-name">${safeEvent}</div>
    <div class="meta">Awarded on ${dateStr}</div>
    ${safeInstr ? `<div class="instr">${safeInstr}</div>` : ""}
    <div class="footer">
      <div>Prize: Full Project Rex Webhook Center HTML — open the other file you received to test it.</div>
      <div>This certificate was generated by Project Rex Webhook Center.</div>
      <div class="rex">🐶 Project Rex</div>
    </div>
  </div>
</body>
</html>`;
    }

    function downloadWinnerHtml(filename, html) {
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || "winner-certificate.html";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return url;
    }

    function getProjectRexAppHtml() {
        try {
            return "<!DOCTYPE html>\n" + document.documentElement.outerHTML;
        } catch (err) {
            return null;
        }
    }

    async function announceWinner(id) {
        const e = ws().testingEvents.find(x => x.id === id);
        if (!e) return;
        const testers = e.testers || [];
        let winnerName = "";
        if (testers.length) {
            const list = testers.map((t, i) => (i + 1) + ". " + t.name).join("\n");
            const pick = prompt(
                "🏆 Announce Winner for \"" + e.name + "\"\n\nTesters:\n" + list +
                "\n\nEnter the winner's name (or number), or type a custom name:",
                testers[0].name
            );
            if (pick === null) return;
            const num = parseInt(pick, 10);
            if (!isNaN(num) && num >= 1 && num <= testers.length) {
                winnerName = testers[num - 1].name;
            } else {
                winnerName = pick.trim();
            }
        } else {
            winnerName = prompt("🏆 No testers listed. Enter the winner's name for \"" + e.name + "\":", "");
            if (winnerName === null) return;
            winnerName = winnerName.trim();
        }
        if (!winnerName) {
            toast("Winner name required", "error");
            return;
        }

        const safeEvent = (e.name || "event").replace(/[^\w\-]+/g, "_").slice(0, 40);
        const safeWinner = winnerName.replace(/[^\w\-]+/g, "_").slice(0, 30);

        const appHtml = getProjectRexAppHtml();
        let appFilename = "Project_Rex_Webhook_Center_for_" + safeWinner + ".html";
        if (appHtml) {
            downloadWinnerHtml(appFilename, appHtml);
        } else {
            toast("Could not snapshot the app HTML — download the original Project Rex file manually and send it to the winner.", "warn");
            appFilename = "(use your original Project Rex HTML file)";
        }

        const certHtml = buildWinnerCertificateHtml(e.name, winnerName, e.instructions || "");
        const certFilename = "Winner_Certificate_" + safeEvent + "_" + safeWinner + ".html";
        downloadWinnerHtml(certFilename, certHtml);

        e._winnerName = winnerName;
        e.winner = winnerName;
        e.winnerAnnouncedAt = new Date().toISOString();
        save();
        addTL("testing", "Winner announced for \"" + e.name + "\": " + winnerName);
        addHistEvt(ws(), "Winner of \"" + e.name + "\": " + winnerName + " — Project Rex Center file prepared");
        toast("🏆 Project Rex Center + certificate downloaded — send the files to the winner!", "success");
        notify("Winner files ready for " + winnerName + " (Project Rex Center + certificate)", "success");

        const sendWh = confirm(
            "Files ready for the winner!\n\n" +
            "1. " + appFilename + "  ← full Project Rex Center (they can open & test it)\n" +
            "2. " + certFilename + "  ← winner certificate\n\n" +
            "Attach these in a Discord DM (or email) to the winner.\n\n" +
            "Also post a public Winner Announcement to your webhook?"
        );
        if (sendWh) {
            await sendEventWebhook(id, "winner");
        }
        delete e._winnerName;
        renderTestingEvents();
        renderDashboard();
    }

    function openEventModal(id) {
        $("evtEditId").value = id || "";
        $("evtModalTitle").textContent = id ? "Edit Testing Event" : "Create Testing Event";
        if (id) {
            const e = ws().testingEvents.find(x => x.id === id);
            if (!e) return;
            $("evtName").value = e.name;
            $("evtDesc").value = e.description || "";
            $("evtStart").value = e.start || "";
            $("evtEnd").value = e.end || "";
            $("evtMax").value = e.maxTesters || "";
            $("evtInstr").value = e.instructions || "";
        } else {
            $("evtName").value = "";
            $("evtDesc").value = "";
            $("evtStart").value = "";
            $("evtEnd").value = "";
            $("evtMax").value = "";
            $("evtInstr").value = "";
        }
        $("evtModal").classList.add("show");
    }

    function saveEvent() {
        const id = $("evtEditId").value;
        const name = $("evtName").value.trim();
        const description = $("evtDesc").value.trim();
        const start = $("evtStart").value;
        const end = $("evtEnd").value;
        const maxTesters = parseInt($("evtMax").value) || 0;
        const instructions = $("evtInstr").value.trim();
        if (!name) { toast("Event name required", "error"); return }
        if (!maxTesters || maxTesters < 1) { toast("Max testers must be at least 1", "error"); return }
        if (start && end && end < start) { toast("End date must be after start date", "error"); return }
        const W = ws();
        if (id) {
            const ev = W.testingEvents.find(x => x.id === id);
            if (!ev) return;
            if (maxTesters < (ev.testers || []).length) { toast(
                    "Max testers can't be less than current tester count (" + ev.testers.length + ")",
                    "error"); return }
            Object.assign(ev, { name, description, start, end, maxTesters, instructions });
            addTL("testing", "Updated testing event \"" + name + "\"");
            addHistEvt(W, "Updated testing event: " + name);
            toast("Testing event updated", "success");
        } else {
            const ev = { id: String(Date.now()) + Math.random().toString(36).slice(2, 5), name, description,
                start, end, maxTesters, instructions, testers: [], mentionPref: "", created: new Date()
                    .toISOString() };
            W.testingEvents.unshift(ev);
            addTL("testing", "Created testing event \"" + name + "\"");
            addHistEvt(W, "Created testing event: " + name);
            notify("New testing event: " + name, "success");
            toast("Testing event created", "success");
        }
        save();
        closeModal("evtModal");
        renderTestingEvents();
        renderDashboard();
    }

    function deleteEvent(id) {
        const W = ws();
        const e = W.testingEvents.find(x => x.id === id);
        if (!e) return;
        if (!confirm('Delete testing event "' + e.name + '"? This removes all tester data.')) return;
        W.testingEvents = W.testingEvents.filter(x => x.id !== id);
        addTL("testing", "Deleted testing event \"" + e.name + "\"");
        addHistEvt(W, "Deleted testing event: " + e.name);
        save();
        renderTestingEvents();
        renderDashboard();
        toast("Testing event deleted", "success");
    }

    function addHistEvt(W, message) { W.history.unshift({ id: String(Date.now()) + Math.random().toString(36).slice(2,
                4), message, webhookName: "Testing Events", time: new Date().toLocaleString(), ok: true }) }

    function openTesterModal(id) {
        $("testerEventId").value = id;
        $("testerNameInput").value = "";
        renderTesterModal();
        $("testerModal").classList.add("show");
    }

    function renderTesterModal() {
        const id = $("testerEventId").value;
        const W = ws();
        const e = W.testingEvents.find(x => x.id === id);
        if (!e) return;
        $("testerModalTitle").textContent = "Manage Testers · " + e.name;
        const status = evtStatus(e);
        const full = status === "Full" || (e.testers || []).length >= e.maxTesters;
        $("testerLimitNote").textContent = full ? "⚠️ This event is FULL (" + e.testers.length + "/" + e
            .maxTesters + "). Remove a tester to add more." : e.testers.length + " / " + e.maxTesters +
            " testers joined.";
        $("testerNameInput").disabled = full;
        const list = $("testerModalList");
        list.innerHTML = "";
        if (!e.testers.length) { list.innerHTML = '<div class="empty">No testers yet</div>'; return }
        e.testers.forEach(t => {
            const d = document.createElement("div");
            d.className = "evt-tester";
            const initials = esc(t.name).trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ||
                "").join("") || "?";
            d.innerHTML =
                '<span class="t-avatar">' + initials + '</span><span class="tname">' + esc(t.name) +
                '<span class="tmeta">Joined ' + esc(t.joined || "") +
                '</span></span><span class="evt-tester-status' + (t.status === "Completed" ? " done" :
                    "") + '" onclick="cycleTesterStatus(\'' + e.id + '\',\'' + t.id +
                '\')" title="Click to cycle status" style="cursor:pointer">' + esc(t.status ||
                    "Joined") +
                '</span><button class="sbtn danger" onclick="removeTester(\'' + e.id + '\',\'' + t.id +
                '\')">Remove</button>';
            list.appendChild(d);
        });
    }

    function cycleTesterStatus(eid, tid) {
        const e = ws().testingEvents.find(x => x.id === eid);
        if (!e) return;
        const t = e.testers.find(x => x.id === tid);
        if (!t) return;
        const order = ["Joined", "Testing", "Completed"];
        t.status = order[(order.indexOf(t.status || "Joined") + 1) % order.length];
        save();
        renderTesterModal();
        renderTestingEvents();
    }

    function addTester() {
        const id = $("testerEventId").value;
        const W = ws();
        const e = W.testingEvents.find(x => x.id === id);
        if (!e) return;
        const name = $("testerNameInput").value.trim();
        if (!name) { toast("Enter a tester name", "error"); return }
        if (e.signupsClosed) { toast("Signups are closed for this event", "error"); return }
        if (e.testers.length >= e.maxTesters) { toast("Event is FULL — can't add more testers", "error");
            return }
        if (e.testers.some(t => t.name.toLowerCase() === name.toLowerCase())) { toast("Tester already added",
                "error"); return }
        e.testers.push({ id: String(Date.now()) + Math.random().toString(36).slice(2, 4), name, status: "Joined",
            joined: new Date().toLocaleString() });
        addTL("testing", name + " joined \"" + e.name + "\" (" + e.testers.length + "/" + e.maxTesters + ")");
        addHistEvt(W, "Tester added to \"" + e.name + "\": " + name);
        save();
        $("testerNameInput").value = "";
        renderTesterModal();
        renderTestingEvents();
        renderDashboard();
        toast(e.testers.length >= e.maxTesters ? "Tester added — event now FULL" : "Tester added", "success");
    }

    function removeTester(eid, tid) {
        const W = ws();
        const e = W.testingEvents.find(x => x.id === eid);
        if (!e) return;
        const t = e.testers.find(x => x.id === tid);
        if (!t) return;
        if (!confirm('Remove tester "' + t.name + '"?')) return;
        e.testers = e.testers.filter(x => x.id !== tid);
        addTL("testing", t.name + " removed from \"" + e.name + "\"");
        addHistEvt(W, "Tester removed from \"" + e.name + "\": " + t.name);
        save();
        renderTesterModal();
        renderTestingEvents();
        renderDashboard();
        toast("Tester removed", "success");
    }

    function renderTestingEvents() {
        const W = ws();
        const q = ($("evtSearch")?.value || "").toLowerCase();
        const sf = $("evtStatusFilter")?.value || "";
        let items = W.testingEvents || [];
        const total = items.length;
        const active = items.filter(e => evtStatus(e) === "Active").length;
        const upcoming = items.filter(e => evtStatus(e) === "Upcoming").length;
        const totalTesters = items.reduce((s, e) => s + (e.testers ? e.testers.length : 0), 0);
        if ($("stEvtTotal")) { $("stEvtTotal").textContent = total;
            $("stEvtActive").textContent = active;
            $("stEvtUpcoming").textContent = upcoming;
            $("stEvtTesters").textContent = totalTesters }
        if (q) items = items.filter(e => e.name.toLowerCase().includes(q) || (e.description || "").toLowerCase()
            .includes(q));
        if (sf) items = items.filter(e => evtStatus(e) === sf);
        const grid = $("evtGrid");
        if (!grid) return;
        grid.innerHTML = "";
        if (!items.length) { grid.innerHTML =
                '<div class="empty">No testing events yet — create one to get started.</div>'; return }
        items.forEach(e => {
            const status = evtStatus(e);
            const count = (e.testers || []).length;
            const pct = e.maxTesters ? Math.min(100, Math.round(count / e.maxTesters * 100)) : 0;
            const card = document.createElement("div");
            card.className = "evt-card" + (status === "Full" ? " full" : "") + (status === "Active" ?
                " active" : "");
            const mentionActive = e.mentionPref || "";
            const customPingBtns = getCustomPings().map(p =>
                `<button class="sbtn ${mentionActive === p.value ? 'mention-active' : ''}" onclick="setEventMention('${e.id}','${p.value.replace(/'/g, "\\'")}')" style="font-size:11px">${p.type === "user" ? "👤" : "🏷️"} ${p.name}</button>`
            ).join("");
            const mentionButtons =
                `
                <button class="sbtn ${mentionActive === '@everyone' ? 'mention-active' : ''}" onclick="setEventMention('${e.id}','@everyone')" style="font-size:11px">@everyone</button>
                <button class="sbtn ${mentionActive === '@here' ? 'mention-active' : ''}" onclick="setEventMention('${e.id}','@here')" style="font-size:11px">@here</button>
                ${customPingBtns}
                <button class="sbtn ${!mentionActive ? 'mention-active' : ''}" onclick="setEventMention('${e.id}','')" style="font-size:11px">None</button>
                ${mentionActive ? `<span class="mention-active-indicator">✓ ${mentionActive}</span>` : ''}
                <button class="sbtn" onclick="openAddPingModal()" style="font-size:11px;border-style:dashed;">+ Add</button>
              `;
            card.innerHTML = `
                <div class="evt-top">
                  <h4>${esc(e.name)}</h4>
                  <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                    <span class="${statusChipClass(status)}">${status}</span>
                    <button class="evt-more" onclick="toggleEvtMenu(event,'${e.id}')" title="More actions">⋯</button>
                  </div>
                </div>
                <div class="evt-menu" id="evtMenu-${e.id}">
                  <div class="evt-menu-label">Test Controls</div>
                  <button class="evt-menu-item" onclick="openEventModal('${e.id}');closeEvtMenus()">✏️ Edit Event</button>
                  ${status!=="Completed"?`<button class="evt-menu-item" onclick="endEvent('${e.id}');closeEvtMenus()">🏁 End Test</button>`:""}
                  ${status==="Completed"?`<button class="evt-menu-item" onclick="reopenEvent('${e.id}');closeEvtMenus()">🔄 Reopen Test</button>`:""}
                  <button class="evt-menu-item danger" onclick="deleteEvent('${e.id}');closeEvtMenus()">🗑️ Delete Event</button>
                  <div class="evt-menu-divider"></div>
                  <div class="evt-menu-label">Testers</div>
                  <button class="evt-menu-item" onclick="setTesterLimit('${e.id}');closeEvtMenus()">🔢 Set Tester Limit</button>
                  <button class="evt-menu-item" onclick="viewCapacity('${e.id}');closeEvtMenus()">📊 View Capacity</button>
                  <button class="evt-menu-item" onclick="toggleSignups('${e.id}');closeEvtMenus()">${e.signupsClosed?"🔓 Reopen Signups":"🔒 Close Signups"}</button>
                  <div class="evt-menu-divider"></div>
                  <div class="evt-menu-label">Webhook Actions</div>
                  <button class="evt-menu-item" onclick="sendEventWebhook('${e.id}','announce');closeEvtMenus()">📢 Send Announcement</button>
                  <button class="evt-menu-item" onclick="sendEventWebhook('${e.id}','started');closeEvtMenus()">🚀 Test Started</button>
                  <button class="evt-menu-item" onclick="sendEventWebhook('${e.id}','ended');closeEvtMenus()">🏁 Test Ended</button>
                  <button class="evt-menu-item" onclick="sendEventWebhook('${e.id}','updated');closeEvtMenus()">⚠️ Test Updated</button>
                  <button class="evt-menu-item" onclick="sendEventWebhook('${e.id}','reminder');closeEvtMenus()">🔔 Send Reminder</button>
                  <button class="evt-menu-item" onclick="sendEventWebhook('${e.id}','full');closeEvtMenus()">👥 Test Full</button>
                  <button class="evt-menu-item" onclick="announceWinner('${e.id}');closeEvtMenus()">🏆 Announce Winner</button>
                </div>
                <div class="evt-desc">${esc(e.description||"No description provided.")}</div>
                <div class="evt-meta">
                  <span>📅 ${esc(e.start||"—")} → ${esc(e.end||"—")}</span>
                  ${e.signupsClosed?`<span>🔒 Signups closed</span>`:""}
                </div>
                <div class="evt-cap-row">
                  <div class="evt-cap"><span class="evt-cap-count">👥 ${count} / ${e.maxTesters} testers</span><span>${status==="Full"?"FULL":pct+"%"}</span></div>
                  <div class="progress-wrap"><div class="bar"><div style="width:${pct}%;background:${status==="Full"?"var(--red)":"var(--blue)"}"></div></div></div>
                </div>
                ${e.instructions?`<div class="evt-instr">${esc(e.instructions)}</div>`:""}
                <div class="evt-mention-row">
                  <span class="mention-label">📢 Mention:</span>
                  ${mentionButtons}
                </div>
                <div class="evt-primary-row">
                  ${status!=="Active"&&status!=="Full"&&status!=="Completed"?`<button class="btn btn-success" style="flex:1" onclick="startEvent('${e.id}')">▶️ Start Test</button>`:""}
                  ${(status==="Active"||status==="Full")?`<button class="btn btn-neutral" style="flex:1" onclick="pauseEvent('${e.id}')">⏸️ Pause Test</button>`:""}
                  ${status==="Paused"?`<button class="btn btn-success" style="flex:1" onclick="startEvent('${e.id}')">▶️ Resume Test</button>`:""}
                  ${status==="Completed"?`<button class="btn btn-neutral" style="flex:1" onclick="reopenEvent('${e.id}')">🔄 Reopen Test</button>`:""}
                  <button class="btn btn-secondary" style="flex:1" onclick="openTesterModal('${e.id}')">👥 Testers</button>
                </div>
              `;
            grid.appendChild(card);
        });
        updateRexIntelligence();
    }

    let openEvtMenuId = null;

    function toggleEvtMenu(ev, id) {
        ev.stopPropagation();
        const el = $("evtMenu-" + id);
        if (!el) return;
        const isOpen = el.classList.contains("show");
        closeEvtMenus();
        if (!isOpen) { el.classList.add("show");
            openEvtMenuId = id }
    }

    function closeEvtMenus() { document.querySelectorAll(".evt-menu.show").forEach(m => m.classList.remove("show"));
        openEvtMenuId = null }
    document.addEventListener("click", e => { if (openEvtMenuId && !e.target.closest(".evt-menu") && !e.target
            .closest(".evt-more")) closeEvtMenus() });

    /* ===== Rex Intelligence ===== */
    function updateRexIntelligence() {
        const container = $("rexStatusContainer");
        if (!container) return;
        const W = ws();
        const badges = [];

        // Webhooks
        const whCount = W.webhooks.length;
        if (whCount > 0) badges.push({ text: `📡 ${whCount} webhook${whCount>1?'s':''} configured`, cls: "green" });
        else badges.push({ text: "📡 No webhooks", cls: "yellow" });

        // Scheduled
        const pending = W.scheduled.filter(s => s.status === "pending");
        if (pending.length > 0) badges.push({ text: `⏰ ${pending.length} scheduled`, cls: "yellow" });

        // Testing events
        const activeEvents = (W.testingEvents || []).filter(e => evtStatus(e) === "Active");
        if (activeEvents.length > 0) badges.push({ text: `🧪 ${activeEvents.length} active test${activeEvents.length>1?'s':''}`, cls: "purple" });

        const upcomingEvents = (W.testingEvents || []).filter(e => evtStatus(e) === "Upcoming");
        if (upcomingEvents.length > 0) {
            const soon = upcomingEvents.filter(e => {
                const d = e.start ? new Date(e.start).getTime() : null;
                return d && d - Date.now() < 2 * 3600000;
            });
            if (soon.length > 0) badges.push({ text: `⏳ Testing starts in <2h (${soon.length})`, cls: "yellow" });
        }

        // Weather alerts
        const alerts = getSevereWeatherAlerts(state.weather?.data, state.weather?.place);
        const severe = alerts.filter(a => a.severity === "severe");
        if (severe.length > 0) badges.push({ text: `🌦️ ${severe.length} severe weather alert${severe.length>1?'s':''}`, cls: "red" });
        else if (alerts.length > 0) badges.push({ text: `🌦️ ${alerts.length} weather alert${alerts.length>1?'s':''}`, cls: "yellow" });

        // Failed webhooks
        if (W.failed > 0) badges.push({ text: `❌ ${W.failed} failed sends`, cls: "red" });

        // Overall status
        let overall = "🟢 Everything looks good";
        let overallCls = "green";
        if (severe.length > 0) { overall = "⚠️ Severe weather alerts — be cautious";
            overallCls = "red"; } else if (W.failed > 0) { overall = "⚠️ Some webhook failures";
            overallCls = "yellow"; } else if (pending.length > 0 && pending.length > 3) { overall =
            `⏰ ${pending.length} scheduled messages coming up`;
            overallCls = "yellow"; } else if (activeEvents.length > 0) { overall = `🧪 ${activeEvents.length} active testing event${activeEvents.length>1?'s':''}`;
            overallCls = "purple"; } else if (upcomingEvents.length > 0) { overall =
            `📅 ${upcomingEvents.length} upcoming testing event${upcomingEvents.length>1?'s':''}`;
            overallCls = "yellow"; }

        container.innerHTML = badges.map(b =>
            `<span class="rex-badge ${b.cls}">${b.text}</span>`
        ).join("") + `<span class="rex-badge ${overallCls}" style="font-weight:800;">${overall}</span>`;
    }

    /* ===== import/export ===== */
    function exportData() { const data = JSON.stringify({ ...state, appVersion: APP_VERSION }, null, 2); if (
            navigator.clipboard?.writeText) navigator.clipboard.writeText(data).then(() => toast(
                "Exported to clipboard", "success")).catch(() => dl(data));
        else dl(data) }

    function dl(text) { const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
        a.download = "project-rex-backup-v" + APP_VERSION + ".json";
        a.click() }

    function openImport() { $("importText").value = "";
        $("importModal").classList.add("show") }

    function importData() {
        try {
            const p = JSON.parse($("importText").value);
            if (!p || typeof p !== "object") throw new Error();
            if (Array.isArray(p.workspaces)) state.workspaces = p.workspaces;
            if (p.profile) state.profile = p.profile;
            if (p.settings) state.settings = { ...state.settings, ...p.settings };
            if (Array.isArray(p.notifications)) state.notifications = p.notifications;
            if (Array.isArray(p.timeline)) state.timeline = p.timeline;
            if (p.theme) state.theme = p.theme;
            if (p.currentWorkspaceId) state.currentWorkspaceId = p.currentWorkspaceId;
            save();
            closeModal("importModal");
            updateAll();
            toast("Imported", "success");
        } catch { toast("Invalid JSON", "error") }
    }

    function resetAll() { if (window.RexUpd && RexUpd.confirmReset) { RexUpd.confirmReset(); return }
        if (!confirm("Reset ALL Project Rex data?")) return;
        localStorage.removeItem(STORAGE);
        location.reload() }

    /* ===== utils ===== */
    function closeModal(id) { $(id).classList.remove("show") }
    document.querySelectorAll(".modal-bg").forEach(m => m.addEventListener("click", e => { if (e.target === m) m
                .classList.remove("show") }));

    function esc(v) { return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">",
            "&gt;").replaceAll('"', "&quot;") }

    function toast(msg, type) { type = type || "info";
        const t = $("toast");
        t.textContent = msg;
        t.className = "toast show " + type;
        clearTimeout(toast._t);
        toast._t = setTimeout(() => t.className = "toast", 3200) }

    function runGlobalSearch() { const q = $("globalSearch").value.trim(); if (!q) return;
        showView("history");
        $("histSearch").value = q;
        renderHistory() }

    function updateAll() {
        applyTheme();
        applyBgPreset();
        renderWSSelect();
        renderWebhookSelect();
        renderHome();
        renderDashboard();
        renderBuilderTpls();
        updatePreview();
        updateBadge();
        updateSchedUI();
        if (state.weather && state.weather.place && !state.weather.data) fetchWeatherForPlace(state.weather
            .place);
        else if (!state.weather.place && state.wxPrefs?.defaultLocation) searchWeather(state.wxPrefs.defaultLocation, true);
        else renderWeatherUI();
        startWeatherAutoRefresh();
        syncWxPrefsUI();
        syncNotifPrefsUI();
        updateRexIntelligence();
    }

    /* =====================================================================
       PROJECT REX CENTER V6.0.0 — APPEARANCE CUSTOMIZATION SYSTEM
       Stored entirely separately from the app's `state` object/localStorage
       key, so it can never touch webhooks, events, history, presets, etc.
       Purely visual: sets CSS variables + toggles body classes.
    ===================================================================== */
    const REX_AP_KEY = "projectRexAppearanceV6";
    const REX_AP_DEFAULT = {
        theme: "light", accent: "#5b9fff", accent2: "#7c8bff", glass: false, radius: 16,
        density: 1, bg: "plain", bgIntensity: 100, customBg: "", sidebarW: 264, sidebarFloat: false,
        labels: true, contentW: 1480, animOff: false, hoverOff: false, shadow: 100, scale: 100, compact: false,
        cardStyle: "solid", sidebarMode: "flush", bgAnimated: false, font: "default", textColor: ""
    };
    const REX_FONTS = [
        { id: "default", label: "Default (Inter / Lexend)", body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: '"Lexend", "Inter", -apple-system, sans-serif' },
        { id: "inter", label: "Inter", body: '"Inter", -apple-system, sans-serif', display: '"Inter", -apple-system, sans-serif' },
        { id: "poppins", label: "Poppins", body: '"Poppins", -apple-system, sans-serif', display: '"Poppins", -apple-system, sans-serif' },
        { id: "roboto", label: "Roboto", body: '"Roboto", -apple-system, sans-serif', display: '"Roboto", -apple-system, sans-serif' },
        { id: "lexend", label: "Lexend", body: '"Lexend", -apple-system, sans-serif', display: '"Lexend", -apple-system, sans-serif' },
        { id: "merriweather", label: "Merriweather (Serif)", body: '"Merriweather", Georgia, serif', display: '"Merriweather", Georgia, serif' },
        { id: "fira", label: "Fira Code (Monospace)", body: '"Fira Code", "Courier New", monospace', display: '"Fira Code", "Courier New", monospace' },
        { id: "system", label: "System UI", body: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }
    ];
    const REX_TEXT_COLORS = ["", "#1b1533", "#0f172a", "#ffffff", "#f1edff", "#2b2140", "#1a3b34"];
    const REX_THEME_PRESETS_KEY = "rex_theme_studio_presets";
    const REX_BUILTIN_PRESETS = [
        { name: "Default", builtin: true, accent: "#5b9fff", accent2: "#7c8bff", theme: "light", cardStyle: "solid", sidebarMode: "flush", radius: 16, shadow: 100, bg: "plain", bgAnimated: false },
        { name: "Midnight Aurora", builtin: true, accent: "#9c6bff", accent2: "#43e6c8", theme: "dark", cardStyle: "glass", sidebarMode: "float", radius: 20, shadow: 130, bg: "aurora", bgAnimated: true },
        { name: "Sunset Glass", builtin: true, accent: "#ff8a3d", accent2: "#f6465f", theme: "light", cardStyle: "glass", sidebarMode: "float", radius: 22, shadow: 90, bg: "gradient", bgAnimated: true },
        { name: "Minimal Mono", builtin: true, accent: "#5b6ef5", accent2: "#7c8bff", theme: "light", cardStyle: "outlined", sidebarMode: "minimal", radius: 8, shadow: 20, bg: "solid", bgAnimated: false },
        { name: "Neon Mesh", builtin: true, accent: "#00c2ff", accent2: "#9c6bff", theme: "dark", cardStyle: "elevated", sidebarMode: "flush", radius: 18, shadow: 150, bg: "mesh", bgAnimated: true }
    ];
    const REX_ACCENTS = ["#5b9fff", "#5b6ef5", "#7c8bff", "#43e6c8", "#22c096", "#ffb020", "#ff8a3d", "#f6465f", "#9c6bff", "#00c2ff"];
    const REX_BG_PRESETS = [
        { id: "solid", label: "Solid" }, { id: "plain", label: "Soft Glow" }, { id: "gradient", label: "Gradient" },
        { id: "mesh", label: "Mesh" }, { id: "aurora", label: "Aurora" }, { id: "dots", label: "Dotted" }
    ];
    let rexAp = { ...REX_AP_DEFAULT };

    function loadAppearance() {
        try { const raw = localStorage.getItem(REX_AP_KEY); if (raw) rexAp = { ...REX_AP_DEFAULT, ...JSON.parse(raw) }; else rexAp = { ...REX_AP_DEFAULT, theme: "dark" }; /* V12: new installs start dark; a saved choice is never changed */ }
        catch (e) { rexAp = { ...REX_AP_DEFAULT }; }
    }
    function saveAppearance() {
        try { localStorage.setItem(REX_AP_KEY, JSON.stringify(rexAp)); } catch (e) {}
    }
    function shadeColor(hex, pct) {
        try { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) + pct, g = (n >> 8 & 0xff) + pct, b = (n & 0xff) + pct;
            r = Math.min(255, Math.max(0, r)); g = Math.min(255, Math.max(0, g)); b = Math.min(255, Math.max(0, b));
            return "#" + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1); } catch (e) { return hex; }
    }
    function applyAppearance() {
        const html = document.documentElement, body = document.body;
        html.style.setProperty("--user-accent", rexAp.accent);
        html.style.setProperty("--user-accent-2", rexAp.accent2 || shadeColor(rexAp.accent, 25));
        html.style.setProperty("--user-radius", rexAp.radius + "px");
        html.style.setProperty("--user-density", rexAp.density);
        html.style.setProperty("--user-sidebar-w", rexAp.sidebarW + "px");
        html.style.setProperty("--user-scale", rexAp.scale / 100);
        html.style.setProperty("--user-shadow", rexAp.shadow / 100);
        html.style.setProperty("--rex-content-w", rexAp.contentW + "px");
        body.classList.toggle("glass-on", !!rexAp.glass);
        body.classList.toggle("anim-off", !!rexAp.animOff);
        body.classList.toggle("hover-off", !!rexAp.hoverOff);
        body.classList.toggle("sidebar-float", !!rexAp.sidebarFloat);
        body.classList.toggle("labels-hidden", !rexAp.labels);
        body.classList.toggle("compact-mode", !!rexAp.compact);
        ["solid", "glass", "outlined", "elevated"].forEach(c => body.classList.remove("card-style-" + c));
        body.classList.add("card-style-" + (rexAp.cardStyle || "solid"));
        const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        body.classList.toggle("bg-animated", !!rexAp.bgAnimated && !reducedMotion);
        const sidebarMode = rexAp.sidebarMode || (rexAp.sidebarFloat ? "float" : "flush");
        rexAp.sidebarFloat = sidebarMode === "float";
        body.classList.toggle("sidebar-minimal", sidebarMode === "minimal");
        REX_BG_PRESETS.forEach(p => body.classList.remove("rex-bg-" + p.id));
        body.classList.remove("rex-bg-custom");
        if (rexAp.customBg) { body.classList.add("rex-bg-custom"); body.style.backgroundImage = "url('" + rexAp.customBg.replace(/'/g, "") + "')"; }
        else { body.style.backgroundImage = ""; body.classList.add("rex-bg-" + (rexAp.bg || "plain")); }
        const overlay = $("rexBgOverlay");
        if (overlay) { const i = rexAp.bgIntensity; overlay.style.opacity = i < 100 ? String((100 - i) / 100 * 0.85) : "0";
            body.style.filter = i > 100 ? "saturate(" + Math.min(1.6, i / 100) + ")" : ""; }
        // theme: 'system' follows OS preference, otherwise mirror into existing state.theme so
        // the app's own theme engine (applyTheme/toggleTheme) stays the single source of truth.
        if (rexAp.theme === "system") {
            const wantDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
            state.theme = wantDark ? "dark" : "light"; applyTheme();
        } else if (rexAp.theme === "dark" || rexAp.theme === "light") { state.theme = rexAp.theme; applyTheme(); }
        const fontDef = REX_FONTS.find(f => f.id === (rexAp.font || "default")) || REX_FONTS[0];
        html.style.setProperty("--font-body", fontDef.body);
        html.style.setProperty("--font-display", fontDef.display);
        if (rexAp.textColor) { body.style.setProperty("--text", rexAp.textColor); }
        else { body.style.removeProperty("--text"); }
    }
    function syncAppearanceUI() {
        document.querySelectorAll("#segTheme button").forEach(b => b.classList.toggle("active", b.dataset.v === rexAp.theme));
        document.querySelectorAll("#segGlass button").forEach(b => b.classList.toggle("active", (b.dataset.v === "glass") === !!rexAp.glass));
        document.querySelectorAll("#segDensity button").forEach(b => b.classList.toggle("active", parseFloat(b.dataset.v) === rexAp.density));
        document.querySelectorAll("#segSidebarStyle button").forEach(b => b.classList.toggle("active", (b.dataset.v === "float") === !!rexAp.sidebarFloat));
        const rr = $("radiusRange"); if (rr) rr.value = rexAp.radius; const rv = $("radiusVal"); if (rv) rv.textContent = rexAp.radius + "px";
        const sw = $("sbWidthRange"); if (sw) sw.value = rexAp.sidebarW; const swv = $("sbWidthVal"); if (swv) swv.textContent = rexAp.sidebarW + "px";
        const cw = $("contentWRange"); if (cw) cw.value = rexAp.contentW; const cwv = $("contentWVal"); if (cwv) cwv.textContent = rexAp.contentW + "px";
        const sh = $("shadowRange"); if (sh) sh.value = rexAp.shadow; const shv = $("shadowVal"); if (shv) shv.textContent = rexAp.shadow + "%";
        const sc = $("scaleRange"); if (sc) sc.value = rexAp.scale; const scv = $("scaleVal"); if (scv) scv.textContent = rexAp.scale + "%";
        const bi = $("apBgIntensity"); if (bi) bi.value = rexAp.bgIntensity; const biv = $("apBgIntensityVal"); if (biv) biv.textContent = rexAp.bgIntensity + "%";
        const cb = $("apCustomBg"); if (cb) cb.value = rexAp.customBg || "";
        const al = $("apAnim"); if (al) al.checked = !rexAp.animOff;
        const ho = $("apHover"); if (ho) ho.checked = !rexAp.hoverOff;
        const gt = $("apGlassToggle"); if (gt) gt.checked = !!rexAp.glass;
        const cm = $("apCompact"); if (cm) cm.checked = !!rexAp.compact;
        const lb = $("apShowLabels"); if (lb) lb.checked = !!rexAp.labels;
        const swatches = $("accentSwatches");
        if (swatches) { swatches.innerHTML = ""; REX_ACCENTS.forEach(c => { const s = document.createElement("div");
                s.className = "swatch" + (c.toLowerCase() === rexAp.accent.toLowerCase() ? " active" : "");
                s.style.background = c; s.title = c; s.onclick = () => setApAccent(c); swatches.appendChild(s); }); }
        const bgpicks = $("apBgPicks");
        if (bgpicks) { bgpicks.innerHTML = ""; REX_BG_PRESETS.forEach(p => { const d = document.createElement("div");
                d.className = "bgpick" + (p.id === rexAp.bg && !rexAp.customBg ? " active" : "");
                d.innerHTML = "<div class='bp-swatch rex-bg-" + p.id + "' style='background:var(--bg)'></div>" + p.label;
                d.onclick = () => setApBg(p.id); bgpicks.appendChild(d); }); }

        // Theme Studio tab mirrors
        const studioSwatches = $("studioAccentSwatches");
        if (studioSwatches) { studioSwatches.innerHTML = ""; REX_ACCENTS.forEach(c => { const s = document.createElement("div");
                s.className = "swatch" + (c.toLowerCase() === rexAp.accent.toLowerCase() ? " active" : "");
                s.style.background = c; s.title = c; s.onclick = () => setApAccent(c); studioSwatches.appendChild(s); }); }
        document.querySelectorAll("#segCardStyle button").forEach(b => b.classList.toggle("active", b.dataset.v === (rexAp.cardStyle || "solid")));
        const sidebarMode = rexAp.sidebarMode || (rexAp.sidebarFloat ? "float" : "flush");
        document.querySelectorAll("#segSidebarStyle2 button").forEach(b => b.classList.toggle("active", b.dataset.v === sidebarMode));
        const sr = $("studioRadiusRange"); if (sr) sr.value = rexAp.radius; const srv = $("studioRadiusVal"); if (srv) srv.textContent = rexAp.radius + "px";
        const ssh = $("studioShadowRange"); if (ssh) ssh.value = rexAp.shadow; const sshv = $("studioShadowVal"); if (sshv) sshv.textContent = rexAp.shadow + "%";
        const sba = $("apBgAnimated"); if (sba) sba.checked = !!rexAp.bgAnimated;
        const studioBgPicks = $("studioBgPicks");
        if (studioBgPicks) { studioBgPicks.innerHTML = ""; REX_BG_PRESETS.forEach(p => { const d = document.createElement("div");
                d.className = "bgpick" + (p.id === rexAp.bg && !rexAp.customBg ? " active" : "");
                d.innerHTML = "<div class='bp-swatch rex-bg-" + p.id + "' style='background:var(--bg)'></div>" + p.label;
                d.onclick = () => setApBg(p.id); studioBgPicks.appendChild(d); }); }
        renderThemeStudioPresets();

        const fontSel = $("apFontSelect");
        if (fontSel) {
            if (!fontSel.options.length) { REX_FONTS.forEach(f => { const o = document.createElement("option");
                    o.value = f.id; o.textContent = f.label; fontSel.appendChild(o); }); }
            fontSel.value = rexAp.font || "default";
        }
        const tcSwatches = $("apTextColorSwatches");
        if (tcSwatches) { tcSwatches.innerHTML = "";
            REX_TEXT_COLORS.forEach(c => { const s = document.createElement("div");
                const isAuto = c === "";
                s.className = "swatch" + ((rexAp.textColor || "") === c ? " active" : "");
                s.style.background = isAuto ? "var(--bg2)" : c;
                s.style.border = isAuto ? "1.5px dashed var(--border)" : "1px solid var(--border)";
                s.title = isAuto ? "Auto (theme default)" : c;
                s.onclick = () => setApTextColor(c);
                tcSwatches.appendChild(s); }); }
        const tcCustom = $("apTextColorCustom");
        if (tcCustom && rexAp.textColor) tcCustom.value = rexAp.textColor;
    }
    function setApCardStyle(v) { rexAp.cardStyle = v; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApSidebarMode(v) { rexAp.sidebarMode = v; rexAp.sidebarFloat = (v === "float"); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApBgAnimated(v) { rexAp.bgAnimated = !!v; saveAppearance(); applyAppearance(); syncAppearanceUI(); }

    function loadThemePresets() {
        try { const raw = localStorage.getItem(REX_THEME_PRESETS_KEY); return raw ? JSON.parse(raw) : []; }
        catch (e) { return []; }
    }
    function saveThemePresets(list) {
        try { localStorage.setItem(REX_THEME_PRESETS_KEY, JSON.stringify(list)); } catch (e) {}
    }
    function saveCurrentThemePreset() {
        const nameEl = $("studioPresetName");
        const name = (nameEl && nameEl.value.trim()) || "Custom preset";
        const list = loadThemePresets();
        list.push({
            name, builtin: false, accent: rexAp.accent, accent2: rexAp.accent2, theme: rexAp.theme,
            cardStyle: rexAp.cardStyle, sidebarMode: rexAp.sidebarMode || (rexAp.sidebarFloat ? "float" : "flush"),
            radius: rexAp.radius, shadow: rexAp.shadow, bg: rexAp.bg, bgAnimated: rexAp.bgAnimated, glass: rexAp.glass
        });
        saveThemePresets(list);
        if (nameEl) nameEl.value = "";
        renderThemeStudioPresets();
        toast("Preset saved: " + name, "success");
    }
    function applyThemePreset(preset) {
        rexAp = { ...rexAp, ...preset, customBg: "" };
        rexAp.sidebarFloat = rexAp.sidebarMode === "float";
        saveAppearance(); applyAppearance(); syncAppearanceUI();
        toast("Applied preset: " + preset.name, "success");
    }
    function deleteThemePreset(idx, ev) {
        if (ev) ev.stopPropagation();
        const list = loadThemePresets();
        list.splice(idx, 1);
        saveThemePresets(list);
        renderThemeStudioPresets();
    }
    function renderThemeStudioPresets() {
        const row = $("studioPresetRow"); if (!row) return;
        const custom = loadThemePresets();
        row.innerHTML = "";
        REX_BUILTIN_PRESETS.concat(custom).forEach((p, i) => {
            const isCustom = i >= REX_BUILTIN_PRESETS.length;
            const d = document.createElement("div"); d.className = "studio-preset";
            const grad = "linear-gradient(135deg," + p.accent + "," + (p.accent2 || p.accent) + ")";
            d.innerHTML = "<div class='sp-swatch' style='background:" + grad + "'></div><div class='sp-name'>" + esc(p.name) + "</div>" +
                (isCustom ? "<button class='sp-del' title='Delete preset'>×</button>" : "");
            d.onclick = () => applyThemePreset(p);
            if (isCustom) { const delBtn = d.querySelector(".sp-del"); delBtn.onclick = (ev) => deleteThemePreset(i - REX_BUILTIN_PRESETS.length, ev); }
            row.appendChild(d);
        });
    }
    function switchApPane(id, btn) {
        document.querySelectorAll(".appearance-pane").forEach(p => p.classList.toggle("active", p.id === id));
        document.querySelectorAll(".appearance-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    }
    function setApTheme(v) { rexAp.theme = v; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApAccent(c) { rexAp.accent = c; rexAp.accent2 = shadeColor(c, 30); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApGlass(v) { rexAp.glass = !!v; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApRadius(v) { rexAp.radius = parseInt(v); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApDensity(v) { rexAp.density = parseFloat(v); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApBg(id) { rexAp.bg = id; rexAp.customBg = ""; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApBgIntensity(v) { rexAp.bgIntensity = parseInt(v); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApCustomBg(v) { rexAp.customBg = v.trim(); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApSidebarW(v) { rexAp.sidebarW = parseInt(v); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApSidebarStyle(isFloat) { rexAp.sidebarFloat = !!isFloat; rexAp.sidebarMode = isFloat ? "float" : "flush"; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApLabels(v) { rexAp.labels = !!v; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApContentW(v) { rexAp.contentW = parseInt(v); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApToggle(cls, on) { if (cls === "anim-off") rexAp.animOff = on; if (cls === "hover-off") rexAp.hoverOff = on;
        saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApShadow(v) { rexAp.shadow = parseInt(v); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApScale(v) { rexAp.scale = parseInt(v); saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApCompactMode(v) { rexAp.compact = !!v; if (v) rexAp.density = 0.8; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApFont(v) { rexAp.font = v; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function setApTextColor(v) { rexAp.textColor = v || ""; saveAppearance(); applyAppearance(); syncAppearanceUI(); }
    function resetAppearance() {
        rexAp = { ...REX_AP_DEFAULT }; saveAppearance(); applyAppearance(); syncAppearanceUI();
        toast("Appearance reset to Project Rex V" + APP_VERSION + " defaults", "success");
    }

    /* =====================================================================
       PROJECT REX CENTER V6.0.0 — FILE ATTACHMENTS
       Lets you attach screenshots/files to a webhook send. Uses Discord's
       multipart upload endpoint (payload_json + files[n]) instead of the
       plain JSON POST when attachments are present. Nothing about the
       existing JSON-only path is changed when there are no attachments.
    ===================================================================== */
    let rexAttachments = [];
    const REX_MAX_FILES = 8, REX_MAX_SIZE = 25 * 1024 * 1024;

    function handleAttachSelect(e) { addAttachFiles(e.target.files); e.target.value = ""; }
    function handleAttachDrop(e) { e.preventDefault(); e.currentTarget.classList.remove("dragover"); addAttachFiles(e.dataTransfer.files); }
    function addAttachFiles(fileList) {
        for (const f of Array.from(fileList || [])) {
            if (rexAttachments.length >= REX_MAX_FILES) { toast("Max " + REX_MAX_FILES + " files", "error"); break; }
            if (f.size > REX_MAX_SIZE) { toast(f.name + " is over 25MB", "error"); continue; }
            rexAttachments.push(f);
        }
        renderAttachList();
    }
    function removeAttachment(i) { rexAttachments.splice(i, 1); renderAttachList(); }
    function clearAttachments() { rexAttachments = []; renderAttachList(); }
    function fmtBytes(n) { if (n < 1024) return n + " B"; if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"; return (n / (1024 * 1024)).toFixed(1) + " MB"; }
    function renderAttachList() {
        const el = $("attachList"); if (!el) return;
        el.innerHTML = "";
        rexAttachments.forEach((f, i) => {
            const row = document.createElement("div"); row.className = "attach-item";
            const isImg = f.type && f.type.startsWith("image/");
            let thumbHtml = isImg ? "<img class='attach-thumb' src='" + URL.createObjectURL(f) + "'>" : "<div class='attach-thumb'>📄</div>";
            row.innerHTML = thumbHtml + "<div class='attach-info'><strong>" + esc(f.name) + "</strong><small>" + fmtBytes(f.size) + "</small></div><button class='attach-remove' onclick='removeAttachment(" + i + ")'>×</button>";
            el.appendChild(row);
        });
    }
    async function sendWebhookWithFiles(wh, payload) {
        const form = new FormData();
        form.append("payload_json", JSON.stringify(payload));
        rexAttachments.forEach((f, i) => form.append("files[" + i + "]", f, f.name));
        return fetch(wh.url, { method: "POST", body: form });
    }

    loadAppearance();
    applyAppearance();
    const bvl = $("builderVerLabel"); if (bvl) bvl.textContent = "V" + APP_VERSION;
    const avl = $("apVerLabel"); if (avl) avl.textContent = "V" + APP_VERSION;
    const aboutVer = $("aboutVerText");
    const hvv = $("homeVersionValue"); if (hvv) hvv.textContent = "V" + APP_VERSION;
    if (aboutVer) aboutVer.textContent = "Project Rex Center V" + APP_VERSION + " — Local-only Discord webhook dashboard. Data stays in your browser.";
    load();
    // Safety net for state changes whose UI handler may have missed an explicit save().
    // Normal feature saves still happen immediately; this periodically captures the current state too.
    window.setInterval(() => { if (window.__rexResetting) return; updateSaveIndicator("saving"); save({ silent: true }); }, 15000);
    window.addEventListener("pagehide", () => { if (!window.__rexResetting) save({ silent: true }) });
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && !window.__rexResetting) save({ silent: true });
    });
    ensureProfileDefaults();
    loadProfilePreferences();
    renderCustomPingButtons();
    syncAppearanceUI();
