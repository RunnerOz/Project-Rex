# Project Rex Center

Project Rex Center is a local-only Discord webhook dashboard with a holiday center, developer clock, Rex Studio project workspace, restore points, and an update log. All data stays in your browser (`localStorage`); there is no server and no account.

**Current version: V10.4.1**

## Files
- `index.html` — page structure and embedded CSS
- `js/01-main.js` — main application logic (webhooks, scheduling, testing events, profile, weather, appearance)
- `js/02-clock-and-changelog.js` — developer clock and the Update Log (release history lives here)
- `js/03-holidays.js` — holiday center, themes, effects, and the Holiday Bot
- `js/04-studio-and-restore.js` — Rex Studio, Project Notebook, Knowledge Base, Automation Lab, Task Center, System Monitor, and Restore Points
- `.github/workflows/pages.yml` — checks the JavaScript and publishes the site to GitHub Pages

The scripts load in numeric order and share globals (for example `esc()` and `APP_VERSION` from `01-main.js`), so keep the order in `index.html`.

## Run locally (VS Code)
1. Open this folder in VS Code and install the recommended **Live Server** extension.
2. Right-click `index.html` → **Open with Live Server**.

## Put it on GitHub
```bash
git init
git add .
git commit -m "Project Rex Center V10.4.1"
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

## V10.4.1 — Compact Holiday calendar
- Fixed the oversized Holiday Calendar (day cells were 62px tall); the calendar is now compact and the spotlight card matches its height.

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

## V10.4.1 - Bug fixes and improvements

- Holiday Center: the calendar was far too tall because its day cells were forced to 62px. Day cells are now compact, which shortens the calendar by about 125px.

- The next-holiday spotlight card now matches the calendar height and centers its content instead of leaving a large empty area.
