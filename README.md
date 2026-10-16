# Project Rex Center

Project Rex Center is a local-only Discord webhook dashboard with a holiday center, developer clock, Rex Studio project workspace, restore points, and an update log. All data stays in your browser (`localStorage`); there is no server and no account.

**Current version: V12.5.0**

## Files
- `index.html` — page structure and embedded CSS
- `js/01-main.js` — main application logic (webhooks, scheduling, testing events, profile, weather, appearance)
- `js/02-clock-and-changelog.js` — developer clock and the Update Log (release history lives here)
- `js/03-holidays.js` — holiday center, themes, effects, and the Holiday Bot
- `js/04-studio-and-restore.js` — Rex Studio, Project Notebook, Knowledge Base, Automation Lab, Task Center, System Monitor, and Restore Points
- `js/05-v11-features.js` — Rex Backup, Achievements, Pomodoro, and the install-app card
- `js/06-v11-1-mobile-update.js`, `css/v11-1.css` — phone menu + bottom bar, Settings section tabs, and the full-screen progress screen
- `js/08-rex-day.js` — the Home "Rex's day" card
- `js/07-update-center.js`, `css/v11-5.css` — the safe update engine (check / detect / install) and its card in Settings → App & Updates, Settings search, safer reset and webhook-free export
- `tools/make-version.js`, `tools/check-release.js` — build `version.json` (with file list, fingerprint and full history) and sanity-check a release
- `version.json` — what the website has published (the deploy workflow rewrites it from `APP_VERSION` and the Update Log)
- `manifest.webmanifest`, `sw.js`, `icons/` — make Rex installable, and keep a saved copy of the installed version (see below)
- `.github/workflows/pages.yml` — checks the JavaScript and publishes the site to GitHub Pages

The scripts load in numeric order and share globals (for example `esc()` and `APP_VERSION` from `01-main.js`), so keep the order in `index.html`.

## Run locally (VS Code)
1. Open this folder in VS Code and install the recommended **Live Server** extension.
2. Right-click `index.html` → **Open with Live Server**.

## Put it on GitHub
```bash
git init
git add .
git commit -m "Project Rex Center V11.1.0"
git branch -M main
git remote add origin https://github.com/RunnerOz/Project-Rex.git
git push -u origin main
```
Then on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Every push to `main` re-checks the scripts and redeploys. Your site will be at `https://runneroz.github.io/Project-Rex/`.

Notes:
- Free GitHub accounts need a **public** repo for Pages. That is fine because Rex keeps webhook URLs in each visitor's own browser, not in the repo. **Never paste a real Discord webhook URL into the code or commit an exported backup**; `.gitignore` blocks the usual backup file names. If a webhook leaks, delete it in Discord and create a new one.
- When you release a new version, update `APP_VERSION` in `js/01-main.js`, add an entry at the top of `CHANGELOG` in `js/02-clock-and-changelog.js`, and the title/sidebar labels in `index.html`.

## Known limits
- Scheduled messages and the Holiday Bot only run while the page is open in a browser.
- Browser storage can be cleared or full; use **Restore Points → Export** for a backup before major changes.
- Restore Points restore saved browser data, not the app code; to roll back code use `git checkout` on an older commit.

## V12.5.0 — Funny Live Events + Insider button fix
- `js/11-live-events.js`: sixteen funny bonus events appended to `EV` (41 total); effects in `js/03-holidays.js` `FX_PRESETS` and the Effect Lab list. Movable dates are computed (Napping Day, Donut Day, Ice Cream Day).
- `js/12-rex-insider.js`: announcement links accept `tab` (`featured`, `soon`, `dev`, `history`, `holiday`) so "See what is coming" opens Coming Soon. Example in `js/insider-data.js`.

## V12.4.0 — Global search, Update Log on phones, nine more Live Events
- `js/17-global-search.js`: overrides `filterPalette` / `renderPaletteList` so the Ctrl/Cmd+K palette also searches pages, projects, project tasks, notebook entries, KB notes, tasks, workflows, templates, drafts, webhook names (never URLs) and Live Events. Read-only. Result groups are built in `collect()`; to add a source, push another group there.
- Update Log (`js/02-clock-and-changelog.js`): draws 8 releases at a time (`BATCH`), no start-up draw unless the page is showing, debounced search, try/catch with a Try again button; `css/v12.css` removes blur layers, shadows and entry animations on phones.
- `js/11-live-events.js`: nine new entries at the end of the `EV` table (25 events now). Dates are computed (Lunar New Year uses the `LNY` table for 2025–2035, then falls back to Feb 1). New effects (`lanterns, pi, rocket, dogs, bugs, pirate, coffee, code`) are in `js/03-holidays.js` `FX_PRESETS` and the Effect Lab list. To add an event, copy an entry in `EV`.

## V12.3.1 — Fixed Live Events dates
- Removed the Schedule card (date editor) and its handlers from `js/11-live-events.js`. `inst()` no longer reads `rexev1_config.over`; old saved overrides stay in storage but are ignored. Dates come only from each event's `win()` in the `EV` table.

## V12.3.0 — Achievements 2.0
- `js/16-achievements-plus.js` + styles at the end of `css/v12.css`. Replaces `RexV110.renderAchievements` (05-v11-features.js now also exports `ACH`, `metrics`, `evaluateAchievements`). Adds a Platinum tier (`PLAT` table), 4 new achievements (`NEW`), 6 secret ones (`SECRET`), categories, points (10/25/50/100 per tier; 20 single; 100 secret) and levels (`level = floor(sqrt(xp/40)) + 1`). To add one, edit those arrays. Storage: reads `rex110_achievements` (unchanged) and writes only `rex163_ach`. First run seeds silently (no toast flood).

## V12.2.0 — Profile upgrade
- `js/15-profile-plus.js` + styles at the end of `css/v12.css`. Wraps `renderProfile()` (read-only): builds a two-column layout once by moving the existing cards (all ids/handlers kept), adds hero chips, Profile strength (10 real fields), Rewards shelf (reads `rexev1_*` via `RexEvents`) and Workspace at a glance (reads `rex101_*`, `rex121_favs`). It never writes to any storage key.

## V12.1.0 — Favorites
- `js/14-favorites.js`: star buttons beside sidebar items (wrapped in `.nav-row`), a Favorites group at the top, Alt+1…8, palette command. Storage: `rex121_favs` (array of page names, validated against the real sidebar on load, max 8). Dashboard Quick links list favorites first.

## V12.0.0 — UI revamp
- `css/v12.css`: design tokens (dark deep-navy palette, refined light palette), buttons, cards, forms, modals, toasts, focus rings; loaded last and driven by the existing CSS variables, so Appearance settings, holiday colours and light/dark keep working.
- Sidebar rebuilt in `index.html` (`.sb12`): grouped, collapsible, SVG icons, compact mode, Rex footer. Every `data-view` button is unchanged, so navigation code is untouched. "Update Center" opens Settings → App & Updates (`RexUpd.open()`); there is still no separate Update Center page.
- `js/13-v12-shell.js`: group collapse (`rex12_nav`), compact sidebar (`rex12_compact`) and the Dashboard overview, which reads only real saved data (`rex101_projects`, `rex101_notes`, `rex101_restore_points`, `rex101_tasks`, `rex101_activity`, the workspace's webhooks, `RexEvents`, `RexInsider`).
- New icon set in `icons/` (SVG + PNG, maskable and Apple touch versions) and `icons/rex-mascot.svg` used in the sidebar and dashboard.
- Theme: new installs start dark. `toggleTheme()` now also saves to the Appearance key (previously the sun/moon button did not survive a reload).

## V11.7.0 — Rex Insider
- `js/12-rex-insider.js` + `css/v11-7.css` + `js/insider-data.js`. Five tabs (Featured, Coming Soon, Development, Release History, Event Previews). Release History reads `RexReleases` (the existing Update Log); Event Previews reads `RexEvents` (read-only) and links into Holiday Live Events, so nothing from Live Events is duplicated. Only storage written: `rexins1_seen` (ids of read announcements).

### Adding Rex Insider announcements
1. Open `js/insider-data.js`. It has four lists: `featured` (news), `coming` (roadmap), `dev` (progress notes) and `holiday` (preview settings and a note per event key).
2. Copy an existing item, give it a **new unique `id`**, a `date` (YYYY-MM-DD), `title` and `body` (plain text). Optional: `pinned: true`, `link: { label, view: 'events' }` or `{ label, url: 'https://…' }`, `hideAfter: 'YYYY-MM-DD'`, `draft: true`.
3. Release History fills itself from the Update Log (`CHANGELOG` in `js/02-clock-and-changelog.js`), so just keep adding release entries as usual.
4. Commit and push. Users get the new announcements when they press **Update Now** (updates stay manual). Check the syntax with `node --check js/insider-data.js`.

## V11.6.0 — Holiday Live Events
- `js/11-live-events.js` + `css/v11-6.css`: one data-driven event engine (16 events). Status is computed from the device clock in LOCAL time (upcoming / active / archived; instances for last year, this year and next year), so movable dates (Easter, Thanksgiving, Memorial Day) are right for any year and a deployed event starts without an app update. Schedules can be overridden per event instance in Live Events → Settings (`rexev1_config`).
- Storage is separate and namespaced: `rexev1_progress` (items, claimed rewards, flags, Advent doors, gratitude notes), `rexev1_config`, `rexev1_prefs`. Nothing else is read or written, no migration, no deletion. "Reset all data" removes them with the other `rex*` keys; the regular data export does not include them (Settings → Live Events has a download button).
- Collectibles are appended as the last element of 20 approved pages (never over controls; Webhook Builder, Settings, Testing, Restore and System Monitor are excluded). Positions are deterministic per event instance (seeded shuffle), so every device agrees where they are.
- Effects: `03-holidays.js` gained `RexFxPresets` (15 new Effect Lab styles reused by events) and a non-persistent `__rexEventFx` hook. Priority: Effect Lab (if on) → event layers (if the user ticked them) → holiday glyph → theme. Reduced motion / animations-off disable all animated effects.
- Honest limits: device clock and time zone decide everything (no server, no cross-device sync); First Day of Summer/Fall use fixed date windows around the solstice/equinox rather than astronomical times; the Project Rex anniversary bonus event is not included; artwork is emoji + CSS; archived hunts cannot be played again (finds, stories and rewards are kept).

## V11.5.5 — Small tidy-up
- Shortcuts list updated (Alt+N, focus sound); `?` no longer fires while a dropdown or Rex dialog is focused; late-night greeting.

## V11.5.4 — Focus sounds
- `js/10-focus-sounds.js`: Rain / Brown / White / Wind noise generated with Web Audio on the Dev Clock page, with volume and a stop timer. Never autoplays. Preferences in `rex1154_sound`.

## V11.5.3 — Quick Capture
- `js/09-quick-capture.js`: Alt+N / palette / Home button opens a quick note that saves into the Knowledge Base list (`rex101_notes`). Rex's day gained a 7-day focus chart and a streak.

## V11.5.2 — Rex's day
- New Home card (`js/08-rex-day.js`): Rex's mood follows today's Dev Clock focus time and messages sent, with a goal bar, open-task count and a Pet Rex button (stores only the count in `rex1152_pets`).

## V11.5.1 — Update Center removed, bug fixes
- The Update Center page is removed. Everything lives in **Settings → App & Updates**: status, Check for Updates, Update Now (asks first), release notes, update preferences, and Go back / Repair / diagnostics. Safe-update behaviour below is unchanged.
- Fixed: the "Update notifications" switch now works (one notification per new version); exports use the real version in the file name.

## V11.5.0 — Safe updates, Update Center, better Settings
**Refreshing or reopening Rex never installs an update or touches your data.**

How it works now
- Rex runs from a *saved copy* of the version you installed (service worker caches `rex-release-<version>`, plus a small `rex-control` entry that says which one is active). Reload, refresh, reopen and relaunch all show that saved copy.
- **Check** (`Check for Updates` or `Auto Check`) only reads `version.json` from the website. **Detected** = the published version is newer than the saved one. **Install** happens only when you press **Update Now** and confirm. Auto Check never installs; it can be switched off in Update Settings.
- Install = download every file of the new release into a new cache, check each file, check the fingerprint (`build` in `version.json`) and that `APP_VERSION` matches, re-read `version.json` to make sure nothing changed mid-download, then switch the active pointer and restart. If any step fails, the partial download is deleted, the old version keeps running, and an error says why.
- **Go back** switches to the previous saved copy (Update Settings). **Repair** deletes saved copies and reloads from the website (data untouched).
- Saved data (`localStorage`) keeps the same keys and formats as 11.4.0. New keys: `rex115_prefs`, `rex115_latest`, `rex115_last_ok`, `rex115_installs`.
- Where the Update Log gets its data: the `CHANGELOG` list in `js/02-clock-and-changelog.js` is the single source. `tools/make-version.js` publishes it (all releases) into `version.json`; the Update Center merges that with the local list, so releases newer than your running copy appear there before you install them.

Honest limits of a static site on GitHub Pages
- A **hard refresh** (Ctrl/Cmd+Shift+R) bypasses every service worker, so the browser loads whatever is hosted right now. Rex shows a note in the Update Center when the running tab and the saved copy differ; a normal reload returns to the saved copy.
- The **first visit** (nothing saved yet), browsers without service workers, some private windows, and `file://` copies load whatever the website serves. Moving from 11.4.0 to 11.5.0 is the one-time exception: 11.4.0 always loaded the newest site, so your first load of 11.5.0 happens by itself, then it is saved.
- Browsers can clear cached copies when storage is low. Rex notices and saves the running version again (if it is still the published one).
- GitHub Pages caches files for a few minutes after a deploy; Rex's installer fetches with cache-busting and verifies the fingerprint, so a half-published deploy is rejected rather than installed.

Releasing
1. Bump `APP_VERSION` in `js/01-main.js`; add the entry at the top of `CHANGELOG` (newest first, `summary` optional; `size: 'big'|'small'` optional).
2. Update the version labels in `index.html`.
3. `node tools/make-version.js && node tools/check-release.js` (the workflow also does this).
4. Commit and push to `main`. Do not edit `sw.js` for a normal release; it is version-independent.

Deploy to GitHub Pages: unzip over your local clone of the repo (keep `.git`), `git add -A && git commit -m "Project Rex Center V11.5.0" && git push`. The existing Pages workflow publishes it.

Webhook safety: **Settings → Data → Export without webhook URLs** and **Copy diagnostics** strip Discord webhook links. The normal export and Rex Backup files contain your webhook URLs, so never commit or share them.

## V11.1.0 — Phone layout, Settings, Update button, new icon
- **Phones**: slim top bar, slide-out menu (☰) with full names, and a bottom tab bar (Home, Webhooks, Holidays, Clock, More).
- **Settings** is split into sections: Appearance, General, Alerts, Weather, Data, App & Updates.
- **Counts and history** (V11.4.0): the red dot shows how many updates are waiting, and Settings keeps an Update history of what you installed and when.
- **Skip ahead**: if you missed several updates, Settings shows every one you are behind, with what each added, and one **Install all** button jumps straight to the newest (it includes the older ones). `version.json` is now generated by `tools/make-version.js` from `APP_VERSION` and the `CHANGELOG`, so you only write the Update Log entry; do not edit `version.json` by hand.
- **Big vs small updates**: a release that changes the major or minor number (11.1.x to 11.2.0, 12.0.0) shows the Apple-style screen for about 3 minutes; a patch (11.2.0 to 11.2.1) shows it for about 1 minute. Add `"size": "big"` or `"small"` to `version.json` to force one.
- **Red dots**: a red dot appears on the ☰ button, the bottom More tab, Settings in the menu, and the App & Updates chip while an update is waiting.
- **Go back**: Rex saves a copy of each version it runs (the newest two) in browser storage. Settings → App & Updates → **Go back to vX** switches to the previous one without touching your data; **Update now** returns to the newest. It works on the hosted site only, and first becomes available after the update following V11.2.0.
- **Update screen**: shows the time now, elapsed time, when it should finish, and a What's new list (from `changes` in `version.json`). After the reload a short "Rex is now vX" card shows what changed. Edit the `changes` list in `version.json` each release.
- **Update button** (Settings → App & Updates): reads `version.json` from the website, shows what is new, and **Update now** reloads with the newest files. Rex also checks quietly on open. (Superseded in V11.5.0: see the Update Center above.) Your data stays in the browser. It only works on the hosted site, not from a local file.
- **New icon**: `icons/rex-icon.svg` is the source; PNG sizes are in `icons/`. On an installed phone app you may need to remove and re-add it to see the new icon.
- Releasing: bump `APP_VERSION` in `js/01-main.js`, add a `CHANGELOG` entry, update the labels in `index.html`, (no `sw.js` change is needed since V11.5.0). The workflow generates `version.json`.

## V11.0.0 — Rex Backup, Achievements, Pomodoro, installable app
- **Rex Backup** (sidebar → Rex Backup): automatic daily backups stored in this browser (newest 5), **Download backup file**, **Restore from a file**, and a reminder to download a file. Automatic backups live in browser storage, so a downloaded file is the real safety copy.
- **Achievements** (sidebar → Achievements): 16 achievements with Bronze/Silver/Gold tiers computed from your real data. Nothing leaves your browser.
- **Pomodoro** (Dev Clock page): focus and break timer with notifications, sound, and a weekly summary. It is separate from the Dev Clock stopwatch.
- **Install as an app** (Settings): works on the hosted https site (GitHub Pages), not when `index.html` is opened as a file. `sw.js` keeps a copy for offline use. (From V11.5.0 it serves the saved installed version instead of fetching fresh files.)
- Fixed restore points that saved copies of each other and grew huge; old ones are cleaned automatically.
- Releasing: bump `APP_VERSION` in `js/01-main.js`, add a `CHANGELOG` entry in `js/02-clock-and-changelog.js`, update the version labels in `index.html`, and change `CACHE` in `sw.js`.

## V10.4.1 — Compact Holiday calendar
- Fixed the oversized Holiday Calendar (day cells were 62px tall); the calendar is now compact. The spotlight card is no longer oversized: on wide screens the Upcoming list sits under it with the calendar on the right, and on smaller screens everything stacks.

## V10.4.0 — Holiday Center upgrades
- ⭐ Favorites: tap ☆ on a holiday, then use the Favorites filter.
- 📅 Add to calendar: per-holiday `.ics` download, plus **Export .ics** for the next 12 months (works with Apple, Google, and Outlook calendars).
- ✏️ Edit custom holidays in place (name, date, emoji, description, theme, falling symbol, yearly repeat).
- The Upcoming list now covers the next 12 months with a **Show more** button instead of stopping at 14 rows.

## V10.3.4 fixes
- Page title, sidebar, status line, About card, Home card, and `APP_VERSION` now all report the same version; Restore Points record the real version.
- Fixed the holiday ⓘ button failing on descriptions with apostrophes.
- Friend names, status text, avatars, and custom ping labels are escaped before display (a shared profile code can no longer inject HTML).
- Added the missing V10.3.1 release and made the LATEST tag automatic.

# Release notes

## V10.0.0 major visual refresh
- Refreshed sidebar, navigation states, workspace switcher, top bar, cards, statistics, form controls, and modal styling.
- Improved responsive navigation and added reduced-motion accessibility support.
- Existing app features and JavaScript file order are preserved.


## Profile additions
- Add your role, current project, favorite tools, optional region/timezone, a goal, skills you are learning, and interests from **Profile → Edit Profile**.
- Profile details are stored in the app’s existing local save data. Share codes can carry these profile fields to friends when you choose to share a code.
- Region/timezone is optional; avoid putting sensitive personal information in a shareable profile.


### Holiday Center UI refresh (V10.0.0)
- Restyled holiday cards, filters, upcoming-holiday rows, countdown badges, calendar days, seasonal theme previews, bot settings, and custom holiday form.
- Kept existing Holiday Center controls and behavior; this is a presentation-focused update.


## Holiday Center Festive Edition
- Added an overview row showing the next upcoming holiday, the number of visible holidays still to come this month, and the number of saved custom holidays.
- Added search for holiday names, categories, and descriptions; category filters and hidden-holiday controls remain available.
- Added colorful responsive overview cards and a clearer search field.
- Existing holiday theme controls, calendar, descriptions, custom holiday storage, reminders, and bot settings remain in the existing module.
- JavaScript syntax and archive integrity should be checked after packaging; the app still requires hands-on browser testing for full interaction verification.


## Holiday Studio
- Create custom holidays with a name, emoji, date, description, and yearly-repeat option.
- Preview the holiday card live while editing and select a seasonal theme.
- Custom holiday data continues to use the existing local holiday storage.
- Existing built-in holidays, calendar, reminders, theme effects, and Holiday Bot controls are retained.


## Update Log gallery additions (V10.0.0)
- Added a featured latest-release panel above the version history.
- Added per-release collapse/expand controls and direct-link copy buttons.
- Added a local NEW marker that disappears after opening a release's details; the marker is stored in this browser only.
- Kept the existing release history, keyword search, and type filters.
- Release notes describe the changes recorded in the app; the gallery does not invent a separate roadmap.


### V10.0.0 release history
- Update cards open a dedicated in-app release details page.
- Details pages include the full recorded changelog, categorized feature highlights, improvements, fixes, and removals.
- Optional screenshots are supported through each release entry’s `screenshots` array; no screenshot assets are bundled by default.
- The release page includes a return-to-log action and a copy-release-link action.

## V10.1.0 additions
- Rex Studio: local project organizer with status tracking.
- Knowledge Base: searchable local notes, tutorials, snippets, and references.
- Automation Lab: workflow planning cards only; these do not run in the background.
- Task Center: local tasks with priority, due dates, and completion state.
- System Monitor: lightweight local checks for key page elements and browser storage.
- Restore Points: manual browser-data snapshots, restore with a safety snapshot, and JSON backup import/export.

Restore Points restore saved browser data/settings, not the app's HTML/JavaScript version. To roll back app code, reopen the ZIP for the older release.


### Rex Studio project workspace (V10.1.0)
- Project cards support emoji icons, optional cover-image URLs, pinning, status, and per-project task lists.
- Project progress bars are calculated from completed project tasks; a project marked Complete displays 100%.
- Recent activity records project creation, edits, status changes, pins, and task changes in local browser storage.
- Cover images use image URLs; they are not uploaded to a server.

## V10.1.0 update
- Updated the Update Log to record the V10.1.0 Studio suite and its features.
- Added a Project Notebook inside each Rex Studio project. Notebook entries can be categorized as Note, Useful link, Reference image, Code snippet, or Decision, with an optional title, URL, and text content.
- Notebook entries are saved with their project in browser local storage. Reference images are linked by URL rather than uploaded as files.


## V10.2.0 — Bug fixes only
- Fixed Project Notebook discoverability with a dedicated sidebar page.
- Added a project selector to access each project's notebook from one place.
- Improved notebook form layout and navigation labels.
- Updated version labels and release notes to V10.2.0.
- This version is limited to bug fixes and usability corrections, not new feature areas.


## V10.3.0 — Profile Dashboard
- Added profile accent and compact-card preferences stored locally.
- Added profile-only JSON export/import with validation and confirmation.
- Import affects profile fields only; it does not replace projects, notebooks, or the rest of app state.


## V10.3.1 — Profile Center Fixes
- Fixed resilience for older/partial profile data and nested preferences.
- Improved profile-only backup validation and safer settings import.
- Improved profile export download timing for Safari.
- Refined profile cards, responsive spacing, compact mode, focus states, and accent styling.
- Kept project data and Project Notebook content outside profile-only imports.


### V10.3.2 — Edit Profile Refresh
- Rebuilt the Edit Profile layout for desktop and mobile, with a clearer live preview and sticky save actions.
- Added a live profile-completion meter, avatar clear/random actions, banner reset, and copyable profile summary.
- Limited profiles to 8 links and validate URL schemes before saving.
- Fixed the editor pre-filling an empty current-project field with a placeholder value.


## V10.3.3 Update Log fixes
- Fixed hard-coded V10.2.0 labels in the Update Log header/current-release badge.
- Synced visible release labels with the newest entry in the bundled changelog.
- Added a Refresh Log control and a startup render fallback.


## V10.3.4 — Home page current update
- Added a Current Update card to the Home page showing the installed version.
- Clicking the card opens the Update Log.
- Synchronized the app version constant and release history to V10.3.4.
