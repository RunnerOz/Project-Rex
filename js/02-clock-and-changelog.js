(function(){
    const CLOCK_KEY = 'rex_dev_clock_data';
    let clockData;
    try { clockData = JSON.parse(localStorage.getItem(CLOCK_KEY) || '{"sessions":[],"activeStart":null,"goalHours":4}'); }
    catch (e) { console.error('Could not load Dev Clock data:', e); clockData = {sessions:[], activeStart:null, goalHours:4}; }
    if(clockData.goalHours == null) clockData.goalHours = 4;
    let clockTick = null;
    const RING_CIRC = 2 * Math.PI * 82;

    function saveClock(){
        try { localStorage.setItem(CLOCK_KEY, JSON.stringify(clockData)); return true; }
        catch (e) { console.error('Could not save Dev Clock data:', e); if (typeof window.toast === 'function') window.toast('Could not save Dev Clock data. Browser storage may be full or blocked.', 'error'); return false; }
    }
    function fmtClock(ms){
        const s = Math.floor(ms/1000);
        return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60].map(n=>String(n).padStart(2,'0')).join(':');
    }
    function fmtHM(ms){
        const m = Math.round(ms/60000);
        return Math.floor(m/60) + 'h ' + (m%60) + 'm';
    }
    function sameDay(a,b){
        return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
    }
    function startOfWeek(d){
        const dt = new Date(d);
        const day = (dt.getDay()+6)%7;
        dt.setDate(dt.getDate()-day);
        dt.setHours(0,0,0,0);
        return dt;
    }
    function allSessionsWithLive(){
        const list = clockData.sessions.slice();
        if(clockData.activeStart) list.push({start: clockData.activeStart, duration: Date.now()-clockData.activeStart, live:true});
        return list;
    }
    function clockStats(){
        let all=0, today=0, week=0;
        const now = new Date();
        const weekStart = startOfWeek(now);
        const dayTotals = {};
        for(let i=0;i<7;i++){
            const d = new Date(weekStart); d.setDate(d.getDate()+i);
            dayTotals[d.toDateString()] = 0;
        }
        allSessionsWithLive().forEach(s=>{
            all += s.duration;
            const d = new Date(s.start);
            if(sameDay(d, now)) today += s.duration;
            if(d >= weekStart) week += s.duration;
            const key = d.toDateString();
            if(key in dayTotals) dayTotals[key] += s.duration;
        });
        return {all, today, week, dayTotals, weekStart};
    }
    function computeStreak(dayTotalsAll){
        // walk backwards from today counting consecutive days with any logged time
        let streak = 0;
        let d = new Date();
        d.setHours(0,0,0,0);
        while(true){
            const dayMs = (dayTotalsAll[d.toDateString()] || 0);
            if(dayMs > 0){ streak++; d.setDate(d.getDate()-1); }
            else break;
        }
        return streak;
    }
    function allDayTotals(){
        const totals = {};
        allSessionsWithLive().forEach(s=>{
            const key = new Date(s.start).toDateString();
            totals[key] = (totals[key]||0) + s.duration;
        });
        return totals;
    }

    window.setClockGoal = function(v){
        const hrs = parseFloat(v);
        clockData.goalHours = isNaN(hrs) || hrs <= 0 ? 4 : hrs;
        saveClock();
        renderClock();
    };

    window.deleteSession = function(idx){
        clockData.sessions.splice(idx, 1);
        saveClock();
        renderClock();
    };

    window.renderClock = function(){
        const timerEl = document.getElementById('clockTimer');
        if(!timerEl) return;
        const {all, today, week, dayTotals} = clockStats();
        const dayTotalsAll = allDayTotals();

        document.getElementById('clockToday').textContent = fmtHM(today);
        document.getElementById('clockWeek').textContent = fmtHM(week);
        document.getElementById('clockAllTime').textContent = fmtHM(all);
        document.getElementById('clockStreak').textContent = computeStreak(dayTotalsAll) + ' days';

        const sessCount = clockData.sessions.length + (clockData.activeStart ? 1 : 0);
        document.getElementById('clockAvg').textContent = sessCount ? fmtHM(all / sessCount) : '0h 0m';

        const bestVal = Math.max(0, ...Object.values(dayTotalsAll));
        document.getElementById('clockBest').textContent = fmtHM(bestVal);

        const weekTotalEl = document.getElementById('clockWeekTotal');
        if(weekTotalEl) weekTotalEl.textContent = fmtHM(week) + ' this week';

        const goalInput = document.getElementById('clockGoalInput');
        if(goalInput && document.activeElement !== goalInput) goalInput.value = clockData.goalHours;
        const goalMs = clockData.goalHours * 3600000;
        const goalLabel = document.getElementById('clockGoalLabel');
        goalLabel.textContent = 'of ' + clockData.goalHours + 'h goal';

        const ring = document.getElementById('clockRing');
        const pct = Math.min(1, goalMs > 0 ? today / goalMs : 0);
        ring.setAttribute('stroke-dasharray', RING_CIRC);
        ring.style.strokeDashoffset = RING_CIRC * (1 - pct);
        ring.style.stroke = pct >= 1 ? 'var(--green)' : (clockData.activeStart ? 'var(--blue)' : 'var(--muted)');

        const dot = document.getElementById('clockDot');
        const statusText = document.getElementById('clockStatusText');
        const toggleBtn = document.getElementById('clockToggleBtn');

        if(clockData.activeStart){
            timerEl.textContent = fmtClock(Date.now()-clockData.activeStart);
            statusText.textContent = 'Clocked in';
            dot.style.background = 'var(--green)';
            toggleBtn.textContent = 'Clock out';
            toggleBtn.style.background = 'var(--red)';
            toggleBtn.style.color = '#350909';
        } else {
            timerEl.textContent = '00:00:00';
            statusText.textContent = 'Not clocked in';
            dot.style.background = 'var(--muted)';
            toggleBtn.textContent = 'Clock in';
            toggleBtn.style.background = 'var(--green)';
            toggleBtn.style.color = '#06210f';
        }

        const {weekStart} = clockStats();
        const barsEl = document.getElementById('clockBars');
        barsEl.innerHTML = '';
        const maxVal = Math.max(60000, ...Object.values(dayTotals));
        const labels = ['M','T','W','T','F','S','S'];
        const now = new Date();
        for(let i=0;i<7;i++){
            const d = new Date(weekStart); d.setDate(d.getDate()+i);
            const val = dayTotals[d.toDateString()] || 0;
            const pctBar = Math.max(3, (val/maxVal)*100);
            const isToday = sameDay(d, now);
            const col = document.createElement('div');
            col.style.cssText = 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:8px;';
            col.title = d.toLocaleDateString(undefined,{weekday:'long', month:'short', day:'numeric'}) + ': ' + fmtHM(val);
            col.innerHTML = '<div style="width:100%;max-width:28px;background:' + (isToday ? 'var(--green)' : 'var(--blue)') + ';border-radius:6px 6px 3px 3px;min-height:3px;height:' + pctBar + '%;' + (isToday ? 'box-shadow:0 0 0 2px color-mix(in srgb, var(--green) 35%, transparent);' : 'opacity:.75;') + '"></div><div style="font-size:11px;color:' + (isToday ? 'var(--text)' : 'var(--muted)') + ';font-weight:700;">' + labels[i] + '</div>';
            barsEl.appendChild(col);
        }

        const list = document.getElementById('clockSessionList');
        list.innerHTML = '';
        const recentAll = clockData.sessions.map((s, idx) => ({...s, idx})).reverse().slice(0,10);
        if(recentAll.length===0){
            list.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:12px;padding:14px 0;">No sessions logged yet</div>';
        }
        recentAll.forEach(s=>{
            const d = new Date(s.start);
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-size:13px;';
            row.innerHTML = '<span style="color:var(--muted);">' + d.toLocaleDateString(undefined,{month:'short',day:'numeric'}) + ' · started ' + d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}) + '</span>' +
                '<span style="display:flex;align-items:center;gap:10px;"><span style="font-weight:700;">' + fmtHM(s.duration) + '</span>' +
                '<button onclick="deleteSession(' + s.idx + ')" title="Delete" style="background:none;border:0;color:var(--muted);cursor:pointer;font-size:14px;line-height:1;">🗑️</button></span>';
            list.appendChild(row);
        });
    };

    function startTick(){ if(!clockTick) clockTick = setInterval(renderClock, 1000); }
    function stopTick(){ clearInterval(clockTick); clockTick = null; }

    window.toggleClock = function(){
        if(clockData.activeStart){
            clockData.sessions.push({start: clockData.activeStart, duration: Date.now()-clockData.activeStart});
            clockData.activeStart = null;
            stopTick();
        } else {
            clockData.activeStart = Date.now();
            startTick();
        }
        saveClock();
        renderClock();
    };
    window.resetClockData = function(){
        if(confirm('Reset all tracked time? This cannot be undone.')){
            clockData = {sessions:[], activeStart:null, goalHours: clockData.goalHours};
            saveClock();
            stopTick();
            renderClock();
        }
    };

    if(clockData.activeStart) startTick();
})();

// ========== UPDATE LOG ==========
(function(){
    const TYPE_META = {
        feature:  { label: 'New',       color: 'var(--green)' },
        improve:  { label: 'Improved',  color: 'var(--blue)'  },
        removed:  { label: 'Removed',   color: 'var(--red)'   },
        fix:      { label: 'Fixed',     color: '#f5a623'      }
    };

    const CHANGELOG = [
        {
            version: '13.1.0', date: 'Oct 29, 2026', time: '', icon: '🧭', size: 'big',
            summary: 'A smaller sidebar: Seasons & Quests, Play and Daily now group their pages with tabs.',
            items: [
                { type: 'feature', text: 'Seasons & Quests is one place now. Quests, Live Events, Holidays and Rex Insider sit together under one sidebar entry, with tabs across the top to switch between them.' },
                { type: 'feature', text: 'Play groups Arcade, Rex\'s Room, Rex Pals and Story Mode. Daily groups Focus Rooms, Reminders, Journal and Habit Garden.' },
                { type: 'improve', text: 'The sidebar went from 39 entries to 30. Every page is still there and opens the same way: from the tabs, the Launchpad, the command palette (Ctrl/Cmd+K), search, and your favorites. Nothing was removed and no data changed.' }
            ]
        },
        {
            version: '13.0.0', date: 'Oct 29, 2026', time: '', icon: '🌱', size: 'big',
            summary: 'RexOS 28: Rex Journal, Habit Garden and a Top 3 plan for every day.',
            items: [
                { type: 'feature', text: 'RexOS 28 is here. The app now shows itself as RexOS 28 in the title, menu, Home and About. Everything you had before is still here.' },
                { type: 'feature', text: 'New Rex Journal: a 30-second daily check-in with a mood, one win and a note to remember. It has a streak, a month calendar, and a look back at the same day last week.' },
                { type: 'feature', text: 'New Habit Garden: plant up to 5 small daily habits. Water one each day and its plant grows from a seed to a tree to a bloom. Missing a day only makes it thirsty, nothing is ever reset.' },
                { type: 'feature', text: 'New Top 3 for today on the Home Today card: add up to three things that matter, tick them off, and bring unfinished ones over from yesterday with one tap. The Today card also shows your journal and garden.' },
                { type: 'feature', text: 'New Rex Quests: write in your journal, water a plant, and weekly versions of both.' },
                { type: 'improve', text: 'Everything is stored only on this device. Nothing is sent anywhere.' }
            ]
        },
        {
            version: '12.18.0', date: 'Oct 26, 2026', time: '', icon: '🔔', size: 'big',
            summary: 'Daily Reminders, quick-open links and icon shortcuts, plus an install nudge on Home.',
            items: [
                { type: 'feature', text: 'New Daily Reminders page: up to 6 reminders with your own name, time, days and the page they open. Three ready-made ones (Morning check-in, Focus time, Evening wrap-up) are included and start switched off.' },
                { type: 'feature', text: 'A reminder shows a small banner with Open, Snooze 10 min and Dismiss, plus an optional system notification. It waits until a Focus Room session ends rather than interrupting it.' },
                { type: 'feature', text: 'Quick-open links: add ?go=focus25, ?go=quests, ?go=builder or ?go=home to the address to jump straight there. When Rex is installed, holding its icon shows shortcuts for Focus, Webhooks, Quests and Home.' },
                { type: 'feature', text: 'A gentle install card on Home explains how to install Rex on your device. Not now hides it for 14 days; it never shows once Rex is installed.' },
                { type: 'improve', text: 'Honest limit: Rex cannot wake itself when fully closed, so reminders show while it is open in a tab or installed window, or for 45 minutes after you open it.' }
            ]
        },
        {
            version: '12.17.0', date: 'Oct 26, 2026', time: '', icon: '✨', size: 'big',
            summary: 'A new Today card on Home and a polish pass: easier taps on phones, tidier spacing, smoother page changes.',
            items: [
                { type: 'feature', text: 'New Today card at the top of Home: your next scheduled message, focus time today, quest progress, coins, and quick buttons for a new message, a 25-minute focus, a quick note and the Launchpad. It only reads numbers Rex already keeps.' },
                { type: 'improve', text: 'Phones: small buttons and links (unit toggles, Timeline, Rex\'s Room links, card buttons) are now bigger and easier to tap.' },
                { type: 'improve', text: 'Home cards no longer leave a lone card on its own row on phones. Pages fade in gently when you open them (not at all if your device asks for reduced motion).' },
                { type: 'improve', text: 'Clearer keyboard focus outlines on menu items, buttons and cards.' }
            ]
        },
        {
            version: '12.16.0', date: 'Oct 26, 2026', time: '', icon: '🌧️', size: 'big',
            summary: 'Focus Rooms: calm full-screen rooms with a timer. Rain, fireplace, night sky or aurora.',
            items: [
                { type: 'feature', text: 'New Focus Rooms page in the Rex Studio group. Pick a room (rain window, fireplace, night sky, aurora) and a length (15, 25, 45 or 60 minutes) and press Start. The room fills the screen with a big countdown, Pause and End.' },
                { type: 'feature', text: 'A finished session earns coins for Rex\'s Room: 1 coin per 5 minutes, up to 12 per session and 40 per day. Ending early counts if you were in for at least 5 minutes. Stats show today, this week, all time, best day and a 7-day chart.' },
                { type: 'feature', text: 'Optional soft sound (rain, fire, wind) made in your browser. It is off by default and uses no audio files.' },
                { type: 'feature', text: 'Two new Rex Quests: finish a Focus Room session (daily) and spend 2 hours in Focus Rooms (weekly).' },
                { type: 'improve', text: 'The app now shows itself as RexOS 27 in the title, menu, Home and About. The real version number (12.16.0) is still used behind the scenes so updates keep working.' },
                { type: 'improve', text: 'A running session survives a page reload and keeps its time. Rooms show as still pictures if your device asks for reduced motion. Everything stays on this device.' }
            ]
        },
        {
            version: '12.15.0', date: 'Oct 25, 2026', time: '', icon: '🪟', size: 'big',
            summary: 'RexOS 27: a new look for the whole app, with a floating dock, a capsule tab bar and a Launchpad.',
            items: [
                { type: 'feature', text: 'RexOS 27 is a new look for every page. Calm glass surfaces, bigger page titles, rounded pill buttons and an amber accent, in both dark and light mode. All your pages, settings, webhooks and saved data are exactly where they were.' },
                { type: 'feature', text: 'On computers the sidebar is now a floating glass dock. On phones the bottom bar is a floating capsule with new icons and an amber pill on the page you are on.' },
                { type: 'feature', text: 'New Launchpad: press the grid button in the top bar (or Ctrl/Cmd+K and "Open Launchpad") to see every page as an app on one screen. Type to search, press Enter to open the first match, Esc to close.' },
                { type: 'feature', text: 'Settings → Appearance → Look lets you switch between RexOS 27 and Classic at any time. Nothing is lost either way.' },
                { type: 'improve', text: 'Pages that repeated their own title under the big header (Arcade, Room, Pals, Quests, World Clock) now show it once.' },
                { type: 'improve', text: 'In RexOS 27 the default accent is amber and holiday colors tint the seasonal banners instead of the whole app. A custom accent from Theme Studio still wins.' }
            ]
        },
        {
            version: '12.14.0', date: 'Oct 24, 2026', time: '', icon: '🎯', size: 'medium',
            summary: 'Rex Quests: three small goals a day and two a week, worth coins.',
            items: [
                { type: 'feature', text: 'New Rex Quests page (Rex Studio group, or Ctrl/Cmd+K and "Open Rex Quests"). Each day Rex picks 3 small goals, such as send a message, play an arcade game, hatch the daily egg, log 30 minutes on the Dev Clock, visit 4 pages or open the World Clock. Each week it picks 2 bigger ones.' },
                { type: 'feature', text: 'Press Claim on a finished goal to earn coins for Rex\'s Room (10 to 100 coins). Finish all three daily goals for a daily bonus and a streak. There is no penalty if you skip a day: the streak just starts again.' },
                { type: 'improve', text: 'Progress only counts from when each day or week started on this device, using numbers Rex already keeps. Nothing is sent anywhere, and goals that need a locked feature (like the arcade) are never chosen.' },
                { type: 'improve', text: 'Quest rewards are separate from the arcade\'s 100 coins a day limit.' }
            ]
        },
        {
            version: '12.13.1', date: 'Oct 24, 2026', time: '', icon: '🛠️', size: 'small',
            summary: 'A Preparing step before every update, like a phone update, plus a few bug fixes.',
            items: [
                { type: 'feature', text: 'After you confirm Update Now, Rex now shows a Preparing screen first: a real progress bar for the download, the release notes, a checklist (restore point, download, file check, ready) and a "make sure Rex is open, online" note. It stays up for at least 6 seconds, then moves on to the install screen by itself.' },
                { type: 'feature', text: 'You can cancel while Rex is preparing (the Cancel button or Esc). Rex deletes the half-saved copy and nothing changes. Updates still only start when you press Update Now.' },
                { type: 'improve', text: 'The download now happens once, in the Preparing step. The install screen reuses the saved, checked files instead of downloading them again, but only when they match the published build exactly.' },
                { type: 'improve', text: 'The Preparing screen warns you when your battery is under 20% and you are not charging (only on browsers that report battery).' },
                { type: 'fix', text: 'Updates could hang forever at the very first step on a browser where the service worker is not running (for example some private windows). Rex now waits at most 4 seconds for it and carries on.' },
                { type: 'fix', text: 'World Clock: pinning the same person twice is now blocked with a message instead of adding a duplicate card.' },
                { type: 'fix', text: 'World Clock: the Look ahead slider now announces the time it is on to screen readers.' },
                { type: 'fix', text: 'The Preparing screen puts keyboard focus on Cancel when it opens, so Tab and Esc work without clicking first.' }
            ]
        },
        {
            version: '12.13.0', date: 'Oct 23, 2026', time: '', icon: '🌍', size: 'medium',
            summary: 'World Clock: pin up to 4 teammates and see who is awake before you send.',
            items: [
                { type: 'feature', text: 'New World Clock page (Create group, or Ctrl/Cmd+K and "Open World Clock"). Pin up to 4 teammates by name and city. Each card shows their local time, how far ahead or behind you they are, and whether they are in working hours, awake, or probably asleep.' },
                { type: 'feature', text: 'A 24-hour strip lines everyone up on your own timeline. Slide "Look ahead" to see who will be awake later, and Rex tells you the next stretch when everyone you pinned is in working hours.' },
                { type: 'feature', text: 'Set your working hours and choose a 12 or 24-hour clock. Daylight saving is handled for you.' },
                { type: 'feature', text: 'It uses your browser\'s built-in time zone data, so it is free and works offline. Nothing is sent anywhere. Your pins are saved on this device only.' }
            ]
        },
        {
            version: '12.12.4', date: 'Oct 23, 2026', time: '', icon: '📲', size: 'small',
            summary: 'A nicer finish screen after an update, and a clearer Install Rex as an app card.',
            items: [
                { type: 'improve', text: 'The screen you see after an update finishes is redesigned: a celebration, a "before to now" version path with the release names, what changed grouped by version with New, Improved and Fixed badges, and buttons for Got it, Watch trailer and Update Log. Esc or a click outside closes it.' },
                { type: 'improve', text: 'The update trailer now waits until you close the finish screen, so the two no longer land on top of each other.' },
                { type: 'improve', text: 'Settings → App & Updates → Install Rex as an app now shows your device\'s own steps (iPhone, Android or computer) as a numbered list, says clearly when Rex is already installed, and explains when your browser cannot install it.' },
                { type: 'improve', text: 'Nothing about how updates install changed. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.12.3', date: 'Oct 23, 2026', time: '', icon: '🕘', size: 'small',
            summary: 'An Update timeline in Settings that lists every update you installed, with dates, names and what changed.',
            items: [
                { type: 'feature', text: 'Update timeline: in Settings → App & Updates, a visual list of the updates you installed on this device, newest first, grouped by month. Each one shows its version and name, the date and time, how long ago, what it came from, and badges for big updates, several updates at once, or going back.' },
                { type: 'feature', text: 'Tap "What changed" on any update to read its notes, or "Trailer" to watch that version\'s trailer again.' },
                { type: 'improve', text: 'The top of the timeline shows how many updates you installed here and how long you have been with Rex. It only lists installs Rex really recorded, so nothing is made up, and it keeps the 30 most recent.' },
                { type: 'improve', text: 'Nothing about updating changed: checking never installs anything, and Update Now is still the only way to install.' }
            ]
        },
        {
            version: '12.12.2', date: 'Oct 22, 2026', time: '', icon: '🎬', size: 'big',
            summary: 'A better update trailer: story-style parts, highlight cards, a coming-next teaser, and controls.',
            items: [
                { type: 'improve', text: 'The update trailer is now a story in parts: an intro, the big version name, up to four highlight cards for the best changes, a summary, and a finale with confetti. Each card has a type badge (new, improved, fixed) and a short headline.' },
                { type: 'feature', text: 'Trailer controls: pause, go back or forward, jump to any part with the progress bar at the top, or tap the sides of the screen. On a keyboard, use the arrow keys, Space to pause, and Esc to skip.' },
                { type: 'feature', text: 'If the next update has been announced, the trailer ends with a "Coming next" teaser showing its name, title and release time.' },
                { type: 'feature', text: 'Optional soft sounds made right in your browser. They are off by default: tap the speaker button in the trailer to turn them on.' },
                { type: 'improve', text: 'Cinematic touches: moving space background, black cinema bars, and a glow behind the version. If you prefer reduced motion, you still get a calm still card. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.12.1', date: 'Oct 22, 2026', time: '', icon: '✨', size: 'small',
            summary: 'A fresh look for the Update Center in Settings.',
            items: [
                { type: 'improve', text: 'The Update Center in Settings → App & Updates has a new look: a big status banner (up to date, update available, not checked or failed) with colors to match, the version you are running next to the one that is available, and Update Now and Check for Updates right beside it.' },
                { type: 'improve', text: 'Running version, latest published and last check are now easy-to-read tiles, with a calmer layout on phones.' },
                { type: 'improve', text: 'Nothing about how updates work changed: checking never installs anything, and Update Now is still the only way to install.' }
            ]
        },
        {
            version: '12.12.0', date: 'Oct 21, 2026', time: '', icon: '🥚', size: 'big',
            summary: 'Rex Pals: collect little creature friends, and hatch a free Mystery Egg every day.',
            items: [
                { type: 'feature', text: 'Rex Pals: a collection of 16 creature friends. Six arrive as gifts for real progress (Dev Clock hours, finished sessions and achievements), and ten hatch from the daily egg. Name your pals in the Pal book.' },
                { type: 'feature', text: 'Daily Mystery Egg: one free egg each day. It can hold coins, a room item or a new pal. There is no penalty for skipping a day, and the draw is a plain random roll on your device.' },
                { type: 'feature', text: 'Up to 3 pals can visit Rex\'s Room, where they hang out on the floor (and nap when Rex sleeps).' },
                { type: 'improve', text: 'The Rex\'s Room card on Home now tells you when your daily egg is ready, and has a Pals button.' },
                { type: 'improve', text: 'Everything is free, saved only on this device, and updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.11.0', date: 'Oct 20, 2026', time: '', icon: '🎮', size: 'major',
            summary: 'Rex Arcade with three games, and Rex\'s Room to decorate with what you earn.',
            items: [
                { type: 'feature', text: 'Rex Arcade: three small games, Memory Match, Reaction Test and Rex Runner. Each unlocks with your real Dev Clock time (15 minutes, 1 hour and 3 hours). Your best scores are saved on this device.' },
                { type: 'feature', text: 'Wins earn coins, up to 100 a day so the games stay a treat. Coins are spent in Rex\'s Room.' },
                { type: 'feature', text: 'Rex\'s Room: a room for your mascot with walls, floors, rugs, pictures, plants, lights, beds, trophies, desk items and toys. Buy items with coins, or earn them from Story Mode places, achievements and finished Dev Clock sessions.' },
                { type: 'feature', text: 'Rex reacts: asleep at night (the room goes dim), cheering after a real focus session of 25 minutes or more, and happy to see you after a day away. Tap Rex for a surprise. A small Rex\'s Room card appears on Home.' },
                { type: 'improve', text: 'Nothing here is paid and nothing leaves your device. Rex only reads your Dev Clock, Story Mode and achievements, and updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.10.1', date: 'Oct 20, 2026', time: '', icon: '🧩', size: 'small',
            summary: 'A plugin gallery with one-click plugins, three new plugin blocks, and copy-and-paste sharing.',
            items: [
                { type: 'feature', text: 'Plugin gallery: on the Plugins page, add ready-made plugins with one click: Pomodoro timer, Habit tracker, Goal progress, Study session, Community links, plus the starter set. All built in and free.' },
                { type: 'feature', text: 'Three new plugin blocks for your own files: timer (focus and break minutes), habits (7-day ticks with streaks) and progress (a goal bar).' },
                { type: 'feature', text: 'Share a plugin: press "Copy to share" on any plugin and send the text to a friend. They press Paste JSON, check the preview and add it.' },
                { type: 'improve', text: 'Plugins are still only data: no code, nothing loaded from the internet, and a Discord button always asks first. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.10.0', date: 'Oct 20, 2026', time: '', icon: '🌐', size: 'big',
            summary: 'Spanish, French and Portuguese, plugins you can add from a JSON file, and a much better notification center.',
            items: [
                { type: 'feature', text: 'Language support: pick English, Español, Français or Português in Settings → General. The translations are built in, work offline and cost nothing. They are machine-made and cover the main screens only; anything not translated stays in English, and your own text is never changed.' },
                { type: 'feature', text: 'Plugins & mini-apps: add small cards from a JSON file (text, links, checklists, countdowns, counters, quotes, stats and a webhook button). Plugins are only data, they cannot run code or load anything from the internet, and a Discord button always asks you first. There are sample plugins to try.' },
                { type: 'improve', text: 'Notification center: group by day or topic, filter by topic and type, search, mark all read, delete single notifications, and snooze a topic for an hour, eight hours, until tomorrow or until you turn it back on.' },
                { type: 'improve', text: 'Opening Notifications no longer has to mark everything read: tick "Keep unread until I mark them" to choose yourself.' },
                { type: 'improve', text: 'Updates still only install when you press Update Now. Your data, settings and webhooks are untouched.' }
            ]
        },
        {
            version: '12.9.9', date: 'Oct 20, 2026', time: '', icon: '⏰', size: 'small',
            summary: 'Scheduled messages that were due while Rex was closed now wait for you, with a report on Home and Schedule.',
            items: [
                { type: 'feature', text: 'Missed-message report: if a scheduled message was due while Rex was closed or your device slept, Rex shows it on Home and on the Schedule page with what it says, which webhook it was for and how late it is.' },
                { type: 'feature', text: 'For each missed message you choose Send now or Skip, or handle them all at once. Nothing is sent unless you choose.' },
                { type: 'improve', text: 'Before, a message that was hours late went out the moment you opened Rex. Now only messages up to 10 minutes late send by themselves. Settings → Alerts lets you change that delay, send late messages automatically as before, or skip them automatically.' },
                { type: 'fix', text: 'Two scheduled checks can no longer overlap, so a message cannot be sent twice by accident.' },
                { type: 'improve', text: 'Updates still only install when you press Install.' }
            ]
        },
        {
            version: '12.9.8', date: 'Oct 19, 2026', time: '', icon: '🗺️', size: 'big',
            summary: 'Story Mode turns your Dev Clock time into an adventure map, and every new version now opens with a short animated trailer.',
            items: [
                { type: 'feature', text: 'Story Mode: Rex walks a trail of 12 places. Every Dev Clock session moves Rex further and unlocks new places, from Hatchling Hollow to The Summit of Rex at 100 hours.' },
                { type: 'feature', text: 'Update trailer: the first time you open a newer version, Rex waves, the version name flies in and the changes roll by like movie credits. Skip it any time.' },
                { type: 'improve', text: 'Places you reach stay reached, and Rex tells you when you arrive somewhere new. Progress is only your real Dev Clock time.' },
                { type: 'improve', text: 'The trailer respects reduce motion, never plays on a brand-new install, and can be turned off or replayed in Settings → App & Updates.' },
                { type: 'improve', text: 'Updates still only install when you press Install.' }
            ]
        },
        {
            version: '12.9.7', date: 'Oct 19, 2026', time: '12:00 PM', icon: '👋', size: 'small',
            summary: 'A friendly first visit: Rex asks what to call you, then walks you through your first Discord webhook.',
            items: [
                { type: 'feature', text: 'A new install opens a welcome window that asks what Rex should call you and saves it to your profile.' },
                { type: 'feature', text: 'Guided first webhook: where to find the link in Discord, a plain-words check of what you paste, then save and send a test message with a clear result.' },
                { type: 'feature', text: 'Both steps can be skipped. If you skip, or you already use Rex, a small card on Home offers them with a Not now button. You can also run them from the command palette.' },
                { type: 'fix', text: 'The Update Log no longer shows up underneath every other page after you have opened it once.' },
                { type: 'improve', text: 'The tour is now offered at the end of the welcome instead of starting on top of it.' },
                { type: 'improve', text: 'Updates still only install when you press Install.' }
            ]
        },
        {
            version: '12.9.6', date: 'Oct 18, 2026', time: '10:00 PM', icon: '📣', size: 'small',
            summary: 'The Home update card shows what is new before you install, you can ask Rex to remind you later, and the Update Log is steadier on phones.',
            items: [
                { type: 'feature', text: 'Home shows the new version with its name, a short summary and the first few changes. Install and Read all notes are right there.' },
                { type: 'feature', text: 'Remind me later: hide the update card and the red dot for 1 hour, 4 hours or until tomorrow morning. Show it now brings it back.' },
                { type: 'feature', text: 'The install window has a Remind me later button too. It hides the update card for an hour and installs nothing.' },
                { type: 'fix', text: 'The Update Log is lighter on phones: release details are built only when you open a card, a search opens at most three cards, and one failed draw can no longer take the page down.' },
                { type: 'fix', text: 'If the phone closed the page while the Update Log was drawing, the next visit opens a light view with fewer releases and a button to switch back.' },
                { type: 'improve', text: 'Opening the Update Log checks for an announcement at most once a minute instead of every time.' },
                { type: 'improve', text: 'A reminder only hides the card on this device. Nothing is installed until you press Install, and a newer version brings the card back.' }
            ]
        },
        {
            version: '12.9.5', date: 'Oct 18, 2026', time: '', icon: '🚪', size: 'small',
            summary: 'A clearer, nicer install window with both version names, what is new and what will happen.',
            items: [
                { type: 'feature', text: 'The install window shows the version you have and the one you are getting, with their names, a short list of what is new and three plain steps.' },
                { type: 'improve', text: 'The restore point option is now a proper switch with a short explanation instead of a loose checkbox.' },
                { type: 'improve', text: 'Updates still only install when you press Install.' }
            ]
        },
        {
            version: '12.9.4', date: 'Oct 18, 2026', time: '', icon: '🚦', size: 'small',
            summary: 'A tiny release made to try a scheduled release: it was uploaded early and held back until the countdown reached zero.',
            items: [
                { type: 'improve', text: 'No new features. This release exists to test scheduled releases from start to finish: upload early, countdown, then the update appears at zero.' },
                { type: 'improve', text: 'Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.9.3', date: 'Oct 17, 2026', time: '', icon: '⏳', size: 'small',
            summary: 'Scheduled releases: an update can be uploaded early and held back until a set time, with a countdown.',
            items: [
                { type: 'feature', text: 'Scheduled releases. A release can now carry a release time. Rex shows a live countdown, does not offer the update until the time arrives, and then finds it by itself so you can press Update Now. The new tools/release-at.sh sets the time and the countdown in one step.' },
                { type: 'improve', text: 'When the countdown reaches zero, Rex keeps checking about once a minute (up to 8 times) until the update shows up, and the countdown card says when the update is ready.' },
                { type: 'improve', text: 'It uses each device\u2019s own clock, so a device with a wrong clock may see the update early or late. Older versions of Rex do not hold updates back. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.9.2', date: 'Oct 17, 2026', time: '', icon: '⏲️', size: 'small',
            summary: 'Countdown fixes: it now notices a new announcement while Rex is open, and the Update Log says why when there is no countdown.',
            items: [
                { type: 'fix', text: 'The next-update countdown only looked for an announcement when Rex opened, so an announcement made while Rex was already open (or just after you opened it) did not show up. Rex now looks again about every 3 minutes while it is open, when you come back to the tab, and whenever you press Check for Updates.' },
                { type: 'fix', text: 'Announcement times written like \u201c2026-10-18 12:00\u201d are now understood on every browser (Safari used to reject that format, so no countdown appeared). Times with a zone, such as ...Z or -04:00, still work.' },
                { type: 'improve', text: 'The Update Log now has a small status line that says what Rex knows about the next update: nothing announced, could not reach the website, the file is not valid, you already have that version, or the time has passed. It has a Check now button.' },
                { type: 'improve', text: 'Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.9.1', date: 'Oct 17, 2026', time: '', icon: '⏱️', size: 'small',
            summary: 'A small test release for the next-update countdown.',
            items: [
                { type: 'feature', text: 'The Update Center now shows when the version you are running was released, next to its number.' },
                { type: 'improve', text: 'When the next-update countdown reaches zero, Rex now does one ordinary update check by itself (only if automatic update checks are on), so the new version shows up in the Update Center without you pressing Check. It still never installs anything.' },
                { type: 'improve', text: 'This release was announced ahead of time, so Home and the Update Log counted down to it. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.9.0', date: 'Oct 17, 2026', time: '12:00 PM ET', icon: '📜', size: 'big',
            summary: 'A much nicer Update Log: a featured latest release, real totals, filters with counts, months, and collapsible release cards.',
            items: [
                { type: 'feature', text: 'The Update Log has a new look. The newest release sits at the top in a featured card with its highlights, the totals (releases, new features, improvements, fixes) are counted from the real release history, and releases are grouped by month.' },
                { type: 'feature', text: 'Each release is a compact card with its icon, version and name, date, a small count of what changed, and a one-line summary. Tap a card to open the full list, grouped as New, Improved, Fixed and Removed. Expand all / Collapse all opens or closes every card.' },
                { type: 'feature', text: 'Search now finds words in the summary, the version number and the release name, highlights what it found, and opens the matching cards for you. The type filters show how many changes match, and a friendly empty state appears when nothing does.' },
                { type: 'improve', text: '\u201cSince my last visit\u201d shows how many releases you have not opened yet. A brand-new visitor is no longer shown every old release as NEW.' },
                { type: 'improve', text: 'Lighter on phones: no banner picture on every card, no blur layers, and releases still load 8 at a time with Show older / Show all. Release links (#update-\u2026), the full release page and Update Achievements (now in a collapsible section) all still work.' },
                { type: 'feature', text: 'Next update countdown: when a release time is announced, Home and the Update Log show a live countdown to it, and when the time arrives they say the update is out and point you to the Update Center. Nothing is ever installed for you.' },
                { type: 'improve', text: 'Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.8.1', date: 'Oct 17, 2026', time: '', icon: '🎟️', size: 'small',
            summary: 'Live Event reminders: a banner when an event starts and when one is about to end.',
            items: [
                { type: 'feature', text: 'Live Event reminders: a dismissible banner at the top of Rex when a Live Event has just started (first 24 hours) and when one is about to end (3 hours to 2 days before, your choice). It has an Open button and a Dismiss button, and shows your real collecting progress when the event has a hunt.' },
                { type: 'feature', text: 'Settings \u2192 Alerts has a new Live Event reminders card: turn reminders on or off, pick start and/or ending reminders, choose how early \u201cabout to end\u201d means, preview a reminder, or bring dismissed ones back.' },
                { type: 'improve', text: 'Reminders use only this device\u2019s clock and only appear while Rex is open. There are no push notifications, servers or tracking. Short events use half their length for \u201cending soon\u201d, and each reminder shows once until you reset them.' },
                { type: 'feature', text: 'Every update now has a name next to its number, with one name for computers and another for phones. This one is V12.8.1 Max on computers and V12.8.1 Rex on phones. The name shows in the sidebar, Home, Settings, the Update Log and the Update Center.' },
                { type: 'improve', text: 'The reminder settings are included in Full backup & restore. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.7.0', date: 'Oct 17, 2026', time: '', icon: '🧳', size: 'big',
            summary: 'Full backup and restore, a first-run tour, and a searchable shortcuts list. All free and all on your device.',
            items: [
                { type: 'feature', text: 'Full backup & restore (Settings \u2192 Data): download one file with everything Rex keeps in this browser, grouped into sections you can tick: webhooks, templates and profile; appearance and favorites; Rex Studio; Dev Clock; Live Events progress, rewards and skins; achievements; friends; and other settings. You can leave your webhook URLs out of the file.' },
                { type: 'feature', text: 'Restore checks the file first, shows a preview, and lets you pick which sections to restore. It only writes what is in the file and ticked, never deletes anything else, keeps a safety copy, and has an "Undo last restore" button. Old Rex backup files and restore-point exports can be restored too. Nothing is ever uploaded.' },
                { type: 'feature', text: 'First-run tour: a short spotlight walkthrough of the sidebar, Favorites, search, Live Events, manual updates and shortcuts. It starts by itself only on a brand-new install. Replay it any time from the shortcuts list or the command palette ("Take the tour").' },
                { type: 'improve', text: 'The shortcuts list (press ?) now has a search box, groups, and also lists every command in the Ctrl/\u2318+K palette.' },
                { type: 'fix', text: 'Restoring from Rex Backups (Restore Points) could be silently undone: the page\u2019s auto-save wrote the old data back over the restored data when Rex reloaded. It now stops auto-save during a restore, so the restored data stays.' },
                { type: 'improve', text: 'Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.6.0', date: 'Oct 16, 2026', time: '', icon: '📆', size: 'small',
            summary: 'Live Events now show up on the Holiday Center calendar.',
            items: [
                { type: 'feature', text: 'Every Live Event appears on the Holiday Calendar: a colored bar on each day it runs, the event\u2019s emoji on its first day, and a "Live Events this month" list under the calendar.' },
                { type: 'feature', text: 'Pick a day to see which events run then, their dates, whether they are live, upcoming or ended, how many items you have found, and a button that opens the event.' },
                { type: 'improve', text: 'A switch under the calendar hides or shows the events (remembered on this device). Event dates follow this device\u2019s clock, like Live Events itself. Holidays, hidden holidays and the calendar export are unchanged, and updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.5.0', date: 'Oct 16, 2026', time: '', icon: '🤪', size: 'small',
            summary: 'Sixteen funny Live Events, so there is something silly in almost every month, plus a fix for the Rex Insider "See what is coming" button.',
            items: [
                { type: 'feature', text: 'Sixteen funny bonus events: Squirrel Appreciation Day, Groundhog Day, National Pizza Day, National Napping Day, April Fools\u2019 Day, Lost Sock Memorial Day, National Donut Day, World Emoji Day, National Ice Cream Day, International Cat Day, Sneak Zucchini onto a Porch Day, Ask a Silly Question Day, National Taco Day, International Sloth Day, National Sandwich Day and Clean Out Your Refrigerator Day.' },
                { type: 'feature', text: 'Each has hidden collectibles, rewards, a Rex skin and its own effect (also available in the Effect Lab). April Fools\u2019 Day only hides harmless pranks: nothing in the app changes or breaks. Live Events now has 41 events.' },
                { type: 'fix', text: 'In Rex Insider, the "See what is coming" button did nothing because it linked to the page you were already on. It now opens the Coming Soon tab. Announcement links can point at any Insider tab (see the note at the top of js/insider-data.js).' }
            ]
        },
        {
            version: '12.4.0', date: 'Oct 16, 2026', time: '', icon: '🔎', size: 'big',
            summary: 'Search everything from the command palette, a lighter Update Log for phones, and nine more Live Events.',
            items: [
                { type: 'feature', text: 'Global search: press Ctrl/\u2318+K (or open the command palette) and type. Rex now also finds your pages, projects, project tasks, notebook entries, Knowledge Base notes, tasks, workflows, templates, drafts, webhook names and Live Events. Press Enter to open the page and highlight the match.' },
                { type: 'fix', text: 'The Update Log could crash on phones. It used to draw every release (more than 70, each with a gradient banner) in one go. It now shows the newest 8 and a "Show older releases" button, skips the heavy visual effects on small screens, no longer draws itself at start-up, and redraws search results after you pause typing. If drawing ever fails, it shows a "Try again" button instead of crashing.' },
                { type: 'feature', text: 'Nine new Live Events: Lunar New Year, Pi Day, First Day of Spring, Moon Landing Day, National Dog Day, Programmers\u2019 Day, Talk Like a Pirate Day, International Coffee Day and Ada Lovelace Day. Each has hidden collectibles, rewards, a Rex skin and its own effect (also available in the Effect Lab).' },
                { type: 'improve', text: 'Search only reads your saved data and never changes it. Webhook URLs are never searched or shown. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.3.1', date: 'Oct 15, 2026', time: '', icon: '🔒', size: 'small',
            summary: 'Live Events dates are now fixed: the Schedule section was removed from Live Events settings.',
            items: [
                { type: 'improve', text: 'Removed the Schedule card (the start and end date editor) from Live Events → Settings. Event dates always use the built-in calendar now.' },
                { type: 'fix', text: 'Any custom dates saved earlier are ignored so events follow the built-in dates. Your saved event progress and rewards are not touched.' }
            ]
        },
        {
            version: '12.3.0', date: 'Oct 15, 2026', time: '', icon: '🏆', size: 'big',
            summary: 'Achievements 2.0: a Platinum tier, secret achievements, categories, points and levels.',
            items: [
                { type: 'feature', text: 'Every multi-tier achievement now has a fourth Platinum tier, and four new achievements were added: Reward Collector, Wardrobe, Pin Master and Profile Pro.' },
                { type: 'feature', text: 'Six secret achievements stay hidden (with a vague hint) until you earn them, such as Night Owl, Early Bird and Marathon Session. They unlock from your real Dev Clock, Profile and Live Events data.' },
                { type: 'feature', text: 'Points and levels: every tier earns points, and your level and title rise as you collect them. A Next up box shows the goals you are closest to, and Recent unlocks lists your latest badges.' },
                { type: 'improve', text: 'Filter by category (Build, Time, Rex Studio, Safety, Social, Events, Customize, Secrets) and by status. Tier rarity shows difficulty only; Rex has no server, so it never compares you with other people.' },
                { type: 'improve', text: 'Your existing Bronze, Silver and Gold badges and their dates are kept exactly as they were. Nothing was reset, and updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.2.0', date: 'Oct 15, 2026', time: '', icon: '👤', size: 'small',
            summary: 'A better Profile: cleaner header, two-column layout, Profile strength, a Rewards shelf and a workspace summary.',
            items: [
                { type: 'improve', text: 'The header is bigger and cleaner: a taller banner, a larger avatar, your name and status sit clear of the banner, and quick chips show your role, project, region, member-since date and equipped skin.' },
                { type: 'feature', text: 'New Profile strength card shows how complete your profile is (real fields only) with one-tap Add buttons that open Edit Profile.' },
                { type: 'feature', text: 'New Rewards shelf lists the badges and Rex skins you have really earned in Live Events, with an empty state if you have none yet.' },
                { type: 'feature', text: 'New Workspace at a glance shows your real counts of projects, notes, finished tasks, restore points and pinned pages.' },
                { type: 'improve', text: 'Two columns on wide screens, one column on phones. Your saved profile, privacy switches, friends and backups are untouched. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.1.0', date: 'Oct 14, 2026', time: '', icon: '⭐', size: 'small',
            summary: 'Favorites: pin your most-used pages to the top of the sidebar and jump to them with Alt+1 to Alt+8.',
            items: [
                { type: 'feature', text: 'Hover any page in the sidebar and press the small star to pin it. Pinned pages appear in a Favorites group at the top (up to 8). Press the star again to unpin. On a phone the stars are always visible.' },
                { type: 'feature', text: 'Alt+1 to Alt+8 open your first eight favorites (they do nothing while you are typing in a box or a dialog is open). "Pin or unpin this page" is also in the command palette (Ctrl/\u2318+K), and the Dashboard Quick links show your favorites first.' },
                { type: 'improve', text: 'Favorites are saved only on this device and never change the pages themselves. Updates still only install when you press Update Now.' }
            ]
        },
        {
            version: '12.0.0', date: 'Oct 14, 2026', time: '', icon: '🎨', size: 'big',
            summary: 'A full visual refresh: new dark design system, redesigned sidebar and Dashboard, and a new Rex icon.',
            items: [
                { type: 'improve', text: 'New dark, deep-navy look with blue, violet and cyan accents, applied across every page: cards, buttons, forms, dialogs, focus outlines and notifications now share one style. Light mode still works, and your Appearance choices (accent colour, card style, fonts, sidebar mode) are kept.' },
                { type: 'improve', text: 'Redesigned sidebar: a new logo with the version shown, one icon style for every page, collapsible groups (Overview, Create, Rex Studio, News & Events, Monitor & Test, System), a collapse-to-icons button, and a Rex footer. On phones it is still a slide-in menu.' },
                { type: 'improve', text: 'New Dashboard overview with search, cards for your real projects, notes, backups, next event, webhooks and open tasks, quick actions, recent activity and a Rex Insider news preview. Anything with no data shows a friendly empty message instead of made-up numbers.' },
                { type: 'feature', text: 'A new Rex mascot icon for the app, the browser tab and the home-screen icon. An Update Center link in the sidebar opens Settings, App & Updates, and shows a dot when a newer version is published.' },
                { type: 'fix', text: 'The sun/moon button now remembers your choice after a reload. New installs start in dark mode; if you already saved an Appearance choice, it is unchanged.' },
                { type: 'improve', text: 'Updates still only install when you press Update Now. Refreshing, reopening or checking never installs anything, and your saved data was not changed by this release.' }
            ]
        },
        {
            version: '11.7.0', date: 'Oct 14, 2026', time: '', icon: '🛰️', size: 'small',
            summary: 'Rex Insider: a news room inside Project Rex with announcements, coming soon, development notes, release history and event previews.',
            items: [
                { type: 'feature', text: 'New Rex Insider page with five tabs: Featured, Coming Soon, Development, Release History and Event Previews. A small badge on the menu shows announcements you have not read yet.' },
                { type: 'improve', text: 'Release History reads the same Update Log as before (with search). Event Previews shows the next seasonal events with countdowns and a button that opens Holiday Live Events, where you actually take part.' },
                { type: 'improve', text: 'Announcements live in one easy file (js/insider-data.js) and arrive with an app update. Nothing is fetched from the internet and no data is sent anywhere. Rex Insider only saves which announcements you have read.' }
            ]
        },
        {
            version: '11.6.0', date: 'Oct 14, 2026', time: '', icon: '🎃', size: 'major',
            summary: 'Holiday Live Events: scheduled holiday events with hidden collectibles, achievements, rewards and effects, starting with the Halloween Haunt.',
            items: [
                { type: 'feature', text: 'New Live Events page with 16 events: New Year\'s Day, Winter Season, Valentine\'s Day, St. Patrick\'s Day, Easter, Earth Day, Memorial Day (kept quiet, no games), First Day of Summer, Independence Day, Back-to-School Season, First Day of Fall, Halloween, Thanksgiving and Christmas, plus two bonus days (National Pet Day, National Video Games Day).' },
                { type: 'feature', text: 'Events switch between Upcoming, Live and Archived by themselves using this device\'s clock, with countdowns and an Upcoming preview. Easter, Thanksgiving and Memorial Day are calculated for any year. No app update is needed for an event that is already in the app. This is not a worldwide live event: it follows your own time zone, and progress stays in this browser.' },
                { type: 'feature', text: 'Halloween Haunt (Oct 24-31 by default): 13 friendly pumpkins hidden at the bottom of pages, a rare Golden Pumpkin, clues, a 4-chapter secret story, a Haunted Portal, a mystery reward and optional ghosts, bats, fog, falling leaves and orange sparks.' },
                { type: 'feature', text: 'The same system powers the others: a 25-day Advent calendar with hidden presents, an Easter egg hunt with a Golden Egg, hearts, shamrocks and a pot of gold, a New Year countdown with fireworks and confetti, hidden stars, a Thanksgiving gratitude table, autumn leaves and an Earth Protector hunt.' },
                { type: 'feature', text: 'Rewards are permanent: badges and Rex skins you can equip (your Home page Rex only changes when you pick one). Rewards are only given when the requirements are met, never twice, and stay after an event ends. Archived events keep your progress.' },
                { type: 'improve', text: 'Effect Lab has 15 new seasonal styles (ghosts, bats, pumpkins, orange sparks, fireworks, eggs, shamrocks, flowers, summer sun, school, presents, nature, cozy autumn, paws, arcade). Live Events reuses the same effects, never changes your saved Effect Lab or theme settings, and respects reduced motion.' },
                { type: 'improve', text: 'You can change an event\'s start and end dates on this device in Live Events > Settings, hide the collectibles, or turn event effects off. Live Events saves only to its own rexev1_ keys. Updating still only happens when you press Update Now.' }
            ]
        },
        {
            version: '11.5.5', date: 'Oct 13, 2026', time: '', icon: '⌨️', size: 'small',
            summary: 'A small tidy-up: the shortcuts list now shows the newer shortcuts, and a few little fixes.',
            items: [
                { type: 'fix', text: 'The keyboard shortcuts list (press ?) did not mention Quick note (Alt+N) or Focus sounds. It does now.' },
                { type: 'fix', text: 'Pressing ? while a dropdown was focused, or while a Rex dialog (like Quick note) was open, could pop up the shortcuts list on top. It no longer does.' },
                { type: 'improve', text: 'Between midnight and 5 AM the Home greeting says "Burning the midnight oil" instead of "Good morning".' }
            ]
        },
        {
            version: '11.5.4', date: 'Oct 13, 2026', time: '', icon: '🎧', size: 'small',
            summary: 'Focus sounds: calm rain, brown noise, white noise and wind for working, with a volume slider and a sleep timer.',
            items: [
                { type: 'feature', text: 'Focus sounds on the Dev Clock page: Rain, Brown noise, White noise or Wind, with a volume slider and an optional stop timer (15 min, 30 min, 1 hour). The sound is generated in your browser, so there are no files to download and it works offline.' },
                { type: 'improve', text: 'Nothing ever plays by itself. Press a sound to start it, press it again (or Stop) to end it. "Toggle focus sound" is also in the command palette (Ctrl/\u2318+K). Your last sound, volume and timer are remembered.' }
            ]
        },
        {
            version: '11.5.3', date: 'Oct 13, 2026', time: '', icon: '✍️', size: 'small',
            summary: 'Quick notes from anywhere (Alt+N), and Rex\'s day now shows your week and your streak.',
            items: [
                { type: 'feature', text: 'Quick Capture: press Alt+N (Option+N on a Mac) anywhere, use "Quick note" in the command palette (Ctrl/⌘+K), or the Quick note button on Home. Type a note and press Ctrl/⌘+Enter. It is saved into the Knowledge Base list, so it appears on that page with its category and tags.' },
                { type: 'feature', text: 'Rex\'s day now shows a 7-day focus chart (hover a bar for that day) and a streak counter for consecutive days with Dev Clock time or sent messages. An unfinished today does not break your streak.' }
            ]
        },
        {
            version: '11.5.2', date: 'Oct 13, 2026', time: '', icon: '🐶', size: 'small',
            summary: 'New on Home: "Rex\'s day", a card where Rex\'s mood follows what you really did today.',
            items: [
                { type: 'feature', text: 'Home now shows Rex\'s day: Rex is sleepy, awake, happy or on fire depending on your Dev Clock focus time and the messages you sent today, with a progress bar toward your daily focus goal, your open tasks, and a Pet Rex button that counts your pets.' },
                { type: 'fix', text: 'Home "Webhooks sent today" and the daily counters used the UTC date, so in the evening (after about 8 PM in US Eastern time) they rolled over to "tomorrow" early. They now use your own local day. Older daily totals are kept.' },
                { type: 'improve', text: 'The card only reads data already stored in this browser (Dev Clock, sent history, tasks). It adds no new account, server or storage except a small pet counter.' }
            ]
        },
        {
            version: '11.5.1', date: 'Oct 14, 2026', time: '', icon: '🧹', size: 'small',
            summary: 'The Update Center page is gone. Everything it did now lives in Settings, App & Updates, plus a few bug fixes.',
            items: [
                { type: 'removed', text: 'Removed the Update Center page and its sidebar item. Check for Updates, Auto Check, Update Now, release notes, Go back and Repair are all in Settings, App & Updates. Updates are still never installed by a refresh or by checking.' },
                { type: 'fix', text: 'The "Update notifications" switch in Settings did nothing. When a check finds a new version, Rex now adds one notification (once per version) if that switch is on.' },
                { type: 'fix', text: 'Exported backups were always named "project-rex-v42-backup.json". The file name now includes the real version.' },
                { type: 'fix', text: 'The "Check for Updates" command and the red update dot now open Settings, App & Updates instead of a page that no longer exists.' }
            ]
        },
        {
            version: '11.5.0', date: 'Oct 12, 2026', time: '', icon: '🛡️', size: 'big',
            summary: 'Refreshing or reopening Rex no longer installs updates. Updates are now a button you press, from a brand-new Update Center, and Settings is reorganised.',
            items: [
                { type: 'fix', text: 'Refreshing, reopening or relaunching Rex no longer installs a new version by accident. Rex now runs from a saved copy of the version you installed, and only the Update now button (after a confirmation) can change it. Your settings, profile, projects, webhooks and backups are never touched by a refresh.' },
                { type: 'feature', text: 'New Update Center page: running version, latest published version, status, last successful check, Check for Updates, Auto Check, Update Settings, Update Now, the latest release card, and a Release History table (cards on phones).' },
                { type: 'improve', text: 'Checking, finding and installing are now three separate steps. Check for Updates and Auto Check only look; nothing is installed until you confirm Update Now. Auto Check can be turned off.' },
                { type: 'improve', text: 'Safer installs: Rex downloads the whole new version first, checks every file against a fingerprint, and only then switches. If anything fails the old version keeps running and an error explains what happened. Go back and Repair also live in Update Settings.' },
                { type: 'fix', text: 'Update Log: the "Current release" label used the first list entry instead of the version that is really running, and the published history was cut off at 25 releases. Labels now compare running, latest and installed correctly, the log is sorted and de-duplicated, and the full history is published.' },
                { type: 'improve', text: 'Settings rebuilt: a search box, clearer groups, a "Saved" confirmation on every change, update preferences, and confirmations on destructive actions. Resetting all data now asks you to type RESET.' },
                { type: 'fix', text: 'Reset all data could quietly bring your data back: Rex saved itself again while the page was closing. Reset now really erases, after saving a restore point (and it stops if that restore point cannot be saved).' },
                { type: 'fix', text: 'When Discord\'s image server could not be reached, the default avatar retried itself endlessly (hundreds of failed requests per second). It now falls back once to a local placeholder.' },
                { type: 'feature', text: 'Safer sharing: a new "Export without webhook URLs" button and a "Copy diagnostics" button that remove Discord webhook secrets before anything is shared.' }
            ]
        },
        {
            version: '11.4.0', date: 'Oct 11, 2026', time: '', icon: '🔢',
            items: [
                { type: 'feature', text: 'The red update dot now shows how many updates are waiting (for example 3) on the menu button, the More tab, Settings, the page title, and the installed app icon.' },
                { type: 'feature', text: 'Update history: Settings, App & Updates now keeps a list of every update you installed, with the date, how long it took, and how many updates were installed in one go.' }
            ]
        },
        {
            version: '11.3.2', date: 'Oct 11, 2026', time: '', icon: '⏱',
            items: [
                { type: 'fix', text: 'Dev Clock: on phones the Today, This week, Streak, All time and Average cards were wider than the screen, so the whole page could be dragged sideways. The timer and the stat cards now stack in one column on phones and small tablets.' }
            ]
        },
        {
            version: '11.3.1', date: 'Oct 11, 2026', time: '', icon: '🐛',
            items: [
                { type: 'fix', text: 'Command palette: "Check for Updates" crashed with an error because it opened a page that no longer exists. It now opens Settings, App & Updates, and checks right away.' },
                { type: 'fix', text: 'The old update-check function no longer errors if its page elements are missing; it hands over to the new Updates card instead.' }
            ]
        },
        {
            version: '11.3.0', date: 'Oct 11, 2026', time: '', icon: '📦',
            items: [
                { type: 'feature', text: 'Skip ahead: if you missed more than one update, Rex lists every update you are behind and what each one added. One Install all button jumps straight to the newest and installs all of them, so you never have to update one at a time.' },
                { type: 'improve', text: 'The update screen and the What\'s new card now show every version you caught up on, grouped by version number.' },
                { type: 'improve', text: 'The website\'s version.json is now built automatically from the Update Log, so release notes are written once.' }
            ]
        },
        {
            version: '11.2.2', date: 'Oct 11, 2026', time: '', icon: '🦴',
            items: [
                { type: 'feature', text: 'The update waiting screen is now something to look at: a drifting aurora background, a glowing progress ring around the Rex logo, a live checklist of each step, and rotating What\'s new and tip cards.' },
                { type: 'feature', text: 'Catch the bones: a tiny game on the update screen. Tap the falling bones (stars are worth 5) while you wait. Your best score is saved.' }
            ]
        },
        {
            version: '11.2.1', date: 'Oct 11, 2026', time: '', icon: '🔴',
            items: [
                { type: 'fix', text: 'The red update dot now stays on the menu button, More tab, and Settings after you leave the page, and is repainted on every page change.' },
                { type: 'improve', text: 'Rex now checks for updates by itself: when you open it, every 10 minutes, when you come back to the app, and when your phone gets back online, so the dot shows up without pressing anything.' },
                { type: 'improve', text: 'When an update is waiting, the browser tab title shows a dot and an installed app icon shows a badge where the device supports it.' }
            ]
        },
        {
            version: '11.2.0', date: 'Oct 11, 2026', time: '', icon: '🛡️',
            items: [
                { type: 'feature', text: 'Big and small updates: a big release (new features) shows the full-screen update for about 3 minutes, and a small fix shows it for about 1 minute.' },
                { type: 'feature', text: 'Go back: Rex keeps a copy of your previous version. If an update breaks something, Settings, App & Updates, Go back switches to it, and Update now returns to the newest. Your data is not touched.' },
                { type: 'feature', text: 'Update notification dots: a pulsing red dot shows on the menu button, the More tab, and Settings while an update is waiting.' },
                { type: 'improve', text: 'The update screen keeps your phone awake while it runs, and the stage messages and time remaining now cover the longer wait.' }
            ]
        },
        {
            version: '11.1.3', date: 'Oct 11, 2026', time: '', icon: '🌑',
            items: [
                { type: 'feature', text: 'New full-screen update experience: a black screen with the Rex logo, a thin progress bar, stage messages, time remaining, and the expected finish time. It lasts about 22 seconds, then restarts Rex and shows What\'s new.' }
            ]
        },
        {
            version: '11.1.2', date: 'Oct 11, 2026', time: '', icon: '🕐',
            items: [
                { type: 'feature', text: 'The update screen now shows the time now, how long it has taken, and when it should finish, plus a What\'s new list for the version you are installing.' },
                { type: 'feature', text: 'After an update finishes, Rex shows a "Rex is now vX" card with what changed and how long the update took.' }
            ]
        },
        {
            version: '11.1.1', date: 'Oct 11, 2026', time: '', icon: '👆',
            items: [
                { type: 'improve', text: 'Update button now shows a progress screen with a percentage, the file being downloaded, and about how many seconds are left, then confirms when the update is complete.' },
                { type: 'fix', text: 'Phone buttons felt finicky because touchscreens kept a sticky hover state and a tap delay. Hover effects are now off on touch devices, taps respond instantly, and buttons and tabs are larger.' }
            ]
        },
        {
            version: '11.1.0', date: 'Oct 11, 2026', time: '', icon: '📱',
            items: [
                { type: 'feature', text: 'Update button: Settings, App & Updates, now has Check for updates. When a newer version is on the website, Rex shows what is new and an Update now button that reloads with the newest files so you never need a hard refresh. Rex also checks quietly when it opens. Your data is not touched.' },
                { type: 'improve', text: 'Phone layout rebuilt: the squeezed icon rail is gone. On phones Rex now has a slim top bar, a slide-out menu with full names, and a bottom tab bar (Home, Webhooks, Holidays, Clock, More).' },
                { type: 'improve', text: 'Settings redesigned into sections (Appearance, General, Alerts, Weather, Data, App & Updates) with clean rows, bigger touch targets, and a stacked layout on phones.' },
                { type: 'improve', text: 'New app icon: a drawn Rex dog face replaces the emoji for the installed app, home screen, and browser tab, and the sidebar logo.' },
                { type: 'improve', text: 'The offline service worker now asks the server for the newest copy of each file, so updates show up faster after a release.' }
            ]
        },
        {
            version: '11.0.0', date: 'Oct 10, 2026', time: '', icon: '🚀',
            items: [
                { type: 'feature', text: 'Rex Backup: automatic daily backups kept in this browser (newest 5, skipped when nothing changed), a one-click Download backup file button, Restore from a file, a status badge that shows whether your data is really protected, and an optional reminder to download a file every 7, 14, or 30 days.' },
                { type: 'feature', text: 'Achievements: a new page with 16 achievements and Bronze, Silver, and Gold tiers that unlock from what you really do in Rex (messages sent, Dev Clock hours and streaks, favorited holidays, projects, tasks, notes, backups, friends, and more). Includes progress bars, unlock dates, a Rex rank, and a toast when you unlock something.' },
                { type: 'feature', text: 'Pomodoro mode on the Dev Clock page: focus, short break, and long break phases with a progress ring, Start/Pause/Skip/Reset, session dots, optional auto-start, sound and desktop notifications, the time in the browser tab title, and a weekly summary chart. Timer settings are adjustable and the timer keeps running when you change pages.' },
                { type: 'feature', text: 'Install Rex as an app: Rex now has an app icon, works offline, and shows an Install button in Settings (on the hosted website) so it can open in its own window from your desktop, dock, or home screen.' },
                { type: 'fix', text: 'Restore points used to save a copy of every earlier restore point inside each new one, which made backups grow very large. New snapshots no longer do this, and older ones are cleaned up automatically.' },
                { type: 'fix', text: 'Saving a restore point now shows a clear message when browser storage is full instead of failing silently.' },
                { type: 'improve', text: 'The Version Rollback page is now called Rex Backup and sits on the new backup dashboard.' }
            ]
        },
        {
            version: '10.4.1', date: 'Oct 9, 2026', time: '', icon: '📆',
            items: [
                { type: 'fix', text: 'Holiday Center: the calendar was far too tall because its day cells were forced to 62px. Day cells are now compact, which shortens the calendar by about 125px.' },
                { type: 'fix', text: 'The next-holiday spotlight card was too big because it stretched to the calendar height. It is now compact, and on wide screens the Upcoming Holidays list sits under it with the calendar on the right. On smaller screens everything stacks.' }
            ]
        },
        {
            version: '10.4.0', date: 'Oct 9, 2026', time: '', icon: '🎉',
            items: [
                { type: 'feature', text: 'Holiday Center: tap ☆ on any holiday to add it to your favorites, then use the new ⭐ Favorites filter to see only those.' },
                { type: 'feature', text: 'Holiday Center: add a holiday to your phone or computer calendar with the new 📅 button, or use Export .ics to download the next 12 months of holidays in one file.' },
                { type: 'feature', text: 'Custom holidays can now be edited in place (✏️ on the list or Edit in Saved Holidays) instead of deleted and re-added.' },
                { type: 'improve', text: 'The Upcoming Holidays list no longer stops at 14 rows; use Show more to keep going, and search now looks across the full upcoming list.' }
            ]
        },
        {
            version: '10.3.4', date: 'Oct 9, 2026', time: '', icon: '🚀',
            items: [
                { type: 'feature', text: 'Added a Current Update card to the Home page that shows the installed version and opens the Update Log when clicked.' },
                { type: 'fix', text: 'Aligned the page title, sidebar, status line, About card, Home card, and app version constant so they all report the same version.' },
                { type: 'fix', text: 'Fixed the holiday ⓘ button breaking on descriptions that contain apostrophes (for example Mother\'s Day or Veterans Day).' },
                { type: 'fix', text: 'Friend names, status text, avatars, and custom ping labels are now escaped before display, so a shared profile code can no longer inject HTML.' },
                { type: 'fix', text: 'Restore points now record the real app version, and the LATEST tag in the Update Log is applied automatically to the newest release.' },
                { type: 'improve', text: 'Added the missing V10.3.1 release to the history and prepared the project for GitHub and GitHub Pages.' }
            ]
        },
        {
            version: '10.3.3', date: 'Oct 9, 2026', time: '', icon: '🔄',
            items: [
                { type: 'fix', text: 'Fixed the Update Log header and current-release badge, which were stuck displaying V10.2.0 even when newer releases were included.' },
                { type: 'fix', text: 'The Update Log now synchronizes its visible version labels and latest-release panel from the release history each time it renders.' },
                { type: 'improve', text: 'Added a Refresh Log control and an initial render fallback so the release timeline can be rebuilt without leaving the page.' }
            ]
        },
        {
            version: '10.3.2', date: 'Oct 9, 2026', time: '', icon: '✨',
            items: [
                { type: 'improve', text: 'Rebuilt Edit Profile with a responsive layout, clearer live preview, and a sticky save bar on larger screens.' },
                { type: 'feature', text: 'Added a live profile-completion meter, random/clear avatar actions, banner reset, and copyable profile summary.' },
                { type: 'fix', text: 'Limited profile links to 8 and validates http/https URLs before saving to prevent broken links.' },
                { type: 'fix', text: 'Stopped the editor from inserting a fake current-project value when that field is blank.' },
                { type: 'fix', text: 'Retained the previous Profile Center fixes for import validation, preferences, responsive cards, and compact mode.' }
            ]
        },
        {
            version: '10.3.1', date: 'Oct 9, 2026', time: '', icon: '🧰',
            items: [
                { type: 'fix', text: 'Improved resilience for older or partial profile data and nested preferences.' },
                { type: 'fix', text: 'Stronger validation for profile-only backups and safer settings import.' },
                { type: 'fix', text: 'Profile export download timing now works more reliably in Safari.' },
                { type: 'improve', text: 'Refined profile cards, responsive spacing, compact mode, focus states, and accent styling.' }
            ]
        },
        {
            version: '10.3.0', date: 'Oct 9, 2026', time: '', icon: '👤',
            items: [
                { type: 'feature', text: 'Expanded the Profile page with local profile personalization controls for accent color and compact card layout.' },
                { type: 'feature', text: 'Added profile-only JSON export and import so profile details and preferences can be moved between browsers or computers.' },
                { type: 'improve', text: 'Profile dashboard keeps existing bio, avatar, status, banner, links, badges, creator spotlight, and statistics.' },
                { type: 'fix', text: 'Profile imports validate the backup format and confirm before replacing profile fields; project data and Project Notebook entries are not overwritten.' },
                { type: 'improve', text: 'All profile preferences remain local to the browser; no account or cloud service is required.' }
            ]
        },
        {
            version: '10.2.0', date: 'Oct 9, 2026', time: '', icon: '🛠️',
            items: [
                { type: 'fix', text: 'Fixed Project Notebook discoverability by adding a dedicated Project Notebook page to the main sidebar, rather than requiring users to find the notebook inside individual project cards.' },
                { type: 'fix', text: 'Added a project selector on the dedicated notebook page so users can choose a project and view or add its existing notebook entries.' },
                { type: 'fix', text: 'Improved notebook page layout and small-screen form spacing while keeping notebook entries stored with their existing project data.' },
                { type: 'fix', text: 'Updated app version labels and the Update Log to V10.2.0. This release is focused on bug fixes and usability corrections; no new feature areas are planned for this version.' }
            ]
        },
        {
            version: '10.1.0', date: 'Oct 9, 2026', time: '', icon: '🧩',
            items: [
                { type: 'feature', text: 'Introduced Rex Studio, a project workspace with project cards, custom icons and cover-image URLs, searchable projects, pinned favorites, and Planning, In Progress, On Hold, and Complete statuses.' },
                { type: 'feature', text: 'Added project task lists with completion checkboxes and automatic progress bars for each project.' },
                { type: 'feature', text: 'Added Recent Activity to Rex Studio to track project creation, status changes, edits, pins, and task updates.' },
                { type: 'feature', text: 'Added the Project Notebook so each project can keep its own notes, useful links, reference images, code snippets, and decisions together.' },
                { type: 'improve', text: 'Added project-level notebook entries with categories, titles, content, optional URLs, and local browser storage.' },
                { type: 'feature', text: 'Added Knowledge Base, Automation Lab, Task Center, System Monitor, and Restore Points as separate workspace areas.' },
                { type: 'feature', text: 'Added local restore points with labeled snapshots, restore safety backups, and JSON backup import/export for saved browser data.' },
                { type: 'improve', text: 'Clarified that restore points restore saved browser data and settings; reverting the actual app code requires opening an older app release.' }
            ]
        },
        {
            version: '10.0.0', date: 'Oct 9, 2026', time: '', icon: '🚀',
            items: [
                { type: 'improve', text: 'Project Rex Center V10.0.0 major visual refresh: redesigned the sidebar navigation, workspace switcher, top bar, cards, statistics, form controls, and modal surfaces for a more cohesive command-center look.' },
                { type: 'feature', text: 'Holiday Center Festive Edition: added a live overview with the next holiday, upcoming holidays this month, and your custom holiday count.' },
                { type: 'feature', text: 'Added holiday search across names, categories, and descriptions while retaining the existing category filters and hidden-holiday controls.' },
                { type: 'improve', text: 'Refined colorful Holiday Center cards, calendar highlights, theme previews, and mobile spacing while preserving existing holiday settings and bot controls.' },
                { type: 'feature', text: 'Added a persistent save-status indicator in the top bar so you can see when your data is saved, when a save is in progress, or when saving fails.' },
                { type: 'improve', text: 'Added clearer active navigation styling, a more structured content header, refined spacing, responsive navigation behavior, and reduced-motion accessibility support while preserving existing tools.' },
                { type: 'feature', text: 'Expanded Profile with a Developer Snapshot for role, current project, favorite tools, and optional region/timezone, plus editable goals, skills being learned, and interests. These details save locally and are included in profile share codes.' },
                { type: 'feature', text: 'Holiday Calendar now stays visible beside the upcoming-holiday spotlight, giving the main Holiday Center a compact, always-open calendar.' },
                { type: 'feature', text: 'Added Effect Lab controls for custom falling symbols: use your own emoji, letter, or number, then adjust the effect and preview it on screen.' },
                { type: 'feature', text: 'Custom holidays can use their own falling symbol as a seasonal screen effect, so a holiday can have a personal visual style.' },
                { type: 'improve', text: 'Cleaned up the main Holiday Center spotlight card with tighter spacing and clearer actions so the next upcoming holiday stays the focus.' },
                { type: 'improve', text: 'Expanded the Profile spotlight with a more prominent creator summary and a shortcut to update profile details.' },
                { type: 'improve', text: 'Refreshed the Update Log with a release header, feature summaries, clearer search and filter controls, and more polished version cards.' },
                { type: 'feature', text: 'Update Log cards now include a prominent illustrated-style release banner, a featured latest-release panel, and expandable details for each version.' },
                { type: 'feature', text: 'Added per-release copy-link controls and a local “seen” marker so you can identify releases you have opened and share a specific update.' },
                { type: 'fix', text: 'Fixed the featured latest-release banner so its colorful thumbnail background is visible instead of appearing as a blank white panel.' },
                { type: 'feature', text: 'Added Update Achievements with collectible milestone badges that unlock from the recorded release history: First Feature Added, Bug Squasher, and Major Release.' },
                { type: 'feature', text: 'Expanded release history with a “What’s New Since Last Visit” filter and dedicated release-detail views showing version, date, and categorized change notes.' },
                { type: 'fix', text: 'Repaired the Holiday Calendar interactions: dates are selectable, selected-day details and holiday descriptions appear below the calendar, and greeting/countdown actions are available from each holiday.' },
                { type: 'improve', text: 'Polished the Holiday Calendar with clearer month listings, selected-day highlighting, keyboard-accessible day buttons, and more readable responsive layouts.' },
                { type: 'improve', text: 'Added expand/collapse controls for release notes, clearer release summaries, and responsive card layouts for smaller screens.' },
                { type: 'fix', text: 'Aligned the app title, sidebar version, builder/about version labels, and Update Log with V10.0.0.' }
            ]
        },
        {
            version: '9.5.9', date: 'Oct 9, 2026', time: '', icon: '🛠️',
            items: [
                { type: 'fix', text: 'Added a periodic save safety net plus save attempts when the page is hidden or closed, helping capture changes even if a feature misses its normal save call.' },
                { type: 'improve', text: 'Save failures are now reported more clearly instead of being silently ignored. Dev Clock storage errors are also caught so they do not crash the page.' },
                { type: 'improve', text: 'Rewrote the built-in holiday descriptions in plain language for clearer, more useful explanations in the app.' }
            ]
        },
        {
            version: '9.5.8', date: 'Oct 7, 2026', time: '9:00 AM EDT', icon: '📖',
            items: [
                { type: 'feature', text: 'Holidays now show a short description or tip when you hover over them, and each holiday row in the Upcoming list has a small “ⓘ” button that opens the same description in a popup. This makes it easier to see what each holiday is about before you send a greeting or set up a bot post.' },
                { type: 'improve', text: 'Holiday descriptions are stored directly in the holiday definition, so they appear consistently on the Home banner, in the Holidays list, on the Calendar tooltips, and inside the Holiday Bot preview.' }
            ]
        },
        {
            version: '9.5.7', date: 'Oct 7, 2026', time: '8:44 AM EDT', icon: '💡',
            items: [
                { type: 'feature', text: 'Holiday Bot now adds a 💡 fun fact under each post, like \"Halloween started as the Celtic festival Samhain.\" There are 3 facts for each of 28 holidays, and they rotate by day so a long countdown doesn\'t repeat. Turn it off any time with the Fun fact line switch.' },
                { type: 'feature', text: 'New Weekly Digest: once a week (Monday by default) the bot posts the next 3, 4, or 5 holidays with their dates and days left. Pick the day and how many holidays, and see a live preview in Holidays → Holiday Bot.' },
                { type: 'feature', text: 'Added a \"Digest didn\'t send — send it now\" button, plus a digest status line (✅ sent at…, ⏳ scheduled for…, ⚠️ not sent yet). The Home warning and Send it now button also cover a missed digest.' },
                { type: 'improve', text: 'Digests respect your ping, embed style, holiday-type filters, post time, and the Scheduling pause, and only send once per day.' }
            ]
        },
        {
            version: '9.5.6', date: 'Oct 7, 2026', time: '8:38 AM EDT', icon: '🕒',
            items: [
                { type: 'improve', text: 'The Update Log now shows the date and time of each update next to its version number, and the newest one is marked with a LATEST tag.' },
                { type: 'improve', text: 'Updates from 9.5.1 through 9.5.5 now show their date. Older versions don\'t have a recorded date, so they still show only the version number.' }
            ]
        },
        {
            version: '9.5.5', date: 'Oct 7, 2026', icon: '🚨',
            items: [
                { type: 'feature', text: 'Added an \"It didn\'t send — send it now\" button to Holiday Bot. If you notice the post never showed up in Discord, one tap sends today\'s message right away, even if Rex thinks it was already sent.' },
                { type: 'feature', text: 'Holiday Bot now shows a Today\'s post status (✅ sent at…, ⏳ scheduled for…, or ⚠️ not sent yet), and Home shows a warning with a Send it now button when a post is late, paused, or was rejected by Discord.' },
                { type: 'fix', text: 'Sending a holiday message by hand from Holiday Bot now counts as that day\'s post, so the bot no longer posts a duplicate later.' }
            ]
        },
        {
            version: '9.5.4', date: 'Oct 7, 2026', icon: '🔥',
            items: [
                { type: 'feature', text: 'Holiday Bot posts now include a progress bar that fills up as the holiday gets closer, like ▓▓▓▓▓▓▓░░░ — easy to read at a glance in Discord.' },
                { type: 'feature', text: 'Holiday Bot now has a streak counter: \"Day 7 of the Halloween countdown!\", with a 🔥 every 7th day and \"Countdown complete! 🎉\" on the holiday itself. Works in daily countdown mode.' },
                { type: 'improve', text: 'Both extras have their own on/off switch in Holidays → Holiday Bot, and the live preview shows exactly what the next message will look like.' }
            ]
        },
        {
            version: '9.5.3', date: 'Oct 7, 2026', icon: '📣',
            items: [
                { type: 'improve', text: 'Holiday Bot messages now start with @here by default, like \"@here 🎃 Halloween is in 25 days!\". You can still switch the ping to @everyone or no ping in Holidays → Holiday Bot → Ping.' }
            ]
        },
        {
            version: '9.5.2', date: 'Oct 7, 2026', icon: '🤖',
            items: [
                { type: 'feature', text: 'New Holiday Bot (Holidays → Holiday Bot): automatically posts messages like \"Halloween is in 25 days!\" to a Discord webhook of your choice. It auto-picks a webhook with \"holiday\" in its name and turns itself on when it finds one.' },
                { type: 'feature', text: 'Two modes: a daily countdown that starts a set number of days before the next holiday (default 30), or milestone posts only on chosen days (30, 14, 7, 3, 1 days before, or the day of). On the day itself it posts the holiday greeting.' },
                { type: 'feature', text: 'Choose which holiday types it announces (US, Fun, Cultural, Custom), what time it posts, plain text or text with an embed card, and an optional @everyone / @here ping. Each message is only sent once, and if Rex opens after the post time it catches up.' },
                { type: 'improve', text: 'Holiday Bot posts show up in History, Timeline, and the sent counters like any other webhook message, and a Send next holiday now button lets you test it instantly. Pausing Scheduling also pauses the bot.' }
            ]
        },
        {
            version: '9.5.1', date: 'Oct 7, 2026', icon: '🎉',
            items: [
                { type: 'feature', text: 'New Holidays page (Tools → Holidays) with a live countdown to the next holiday, an upcoming list, and a month calendar. Covers US holidays, fun days (Pi Day, Star Wars Day, Programmers\' Day, National Dog Day…), and cultural holidays (Lunar New Year, Diwali, Hanukkah, Easter, Cinco de Mayo).' },
                { type: 'feature', text: 'Holiday Mode: during a holiday season Rex gets themed colors plus animated effects — falling snow at Christmas, bats and pumpkins at Halloween, fireworks on the 4th of July, rising hearts on Valentine\'s Day, falling leaves at Thanksgiving, and more. 22 themes total, and you can preview any of them from the Holidays page.' },
                { type: 'feature', text: 'Home now has a next-holiday banner and a smarter greeting — it changes with the time of day, and wishes you a happy holiday on the day itself.' },
                { type: 'feature', text: 'One-click holiday messages: ✉️ loads a themed greeting and ⏳ loads a "X days until…" countdown post straight into the Webhook Builder. Also added a 🎉 Holiday Greeting template to the Templates library.' },
                { type: 'feature', text: 'Custom Holidays — add your own days (birthdays, launch dates, anniversaries) with an emoji, once or repeating every year. They show up in the list, calendar, banner, and notifications.' },
                { type: 'feature', text: 'Notifications now remind you one week before and on the day of each holiday, once per holiday. On the day, Rex also throws a little confetti.' },
                { type: 'feature', text: 'Tap Rex on the Home page for a confetti burst. Random Rex also gets holiday-themed quotes during a holiday season. The Command Palette gained Open Holidays, Compose Next Holiday Greeting, Toggle Holiday Effects, and Confetti.' },
                { type: 'improve', text: 'Effects and colors can be switched off separately, with an amount slider. They pause automatically when your system or Appearance settings turn animations off, and individual holidays can be hidden.' },
                { type: 'improve', text: 'Solemn days (Memorial Day, Veterans Day, Martin Luther King Jr. Day) use a respectful mode — colors only, with no confetti or falling effects.' }
            ]
        },
        {
            version: '9.4.0', date: '', icon: '📈',
            items: [
                { type: 'feature', text: 'Timeline now has search and a type filter (Webhook, Testing, Template, Schedule, etc.), plus a Clear button — it was the only history-style page in Rex without them.' },
                { type: 'improve', text: 'Timeline entries now show a colored icon per activity type instead of plain text, so it’s easy to scan at a glance.' },
                { type: 'fix', text: 'Analytics’ "Template Usage" stat was guessing which templates you used by checking if the sent message text happened to contain the template’s name or title — a false-positive-prone hack. It now tracks real usage the moment you load a template into the builder.' },
                { type: 'feature', text: 'Analytics now shows Testing Events, Active Events, and Total Testers alongside the webhook stats, and a top-5 breakdown of your most-used webhooks.' }
            ]
        },
        {
            version: '9.3.1', date: '', icon: '✨',
            items: [
                { type: 'feature', text: 'Added a custom color picker to the message Text Color toolbar — pick any color and it snaps to the closest of Discord’s 8 supported message colors, shown live in the preview.' },
                { type: 'feature', text: 'Added real Discord text formatting — Bold, Italic, Underline, and Strikethrough buttons above the message box, using normal Discord markdown so it works on mobile too (unlike the color trick).' },
                { type: 'improve', text: 'Live Preview now renders Bold/Italic/Underline/Strikethrough, not just colors, so what you see is much closer to what actually gets sent.' },
                { type: 'improve', text: 'Cleaned up and shortened the helper text under the color and formatting tools so the Discord limitations are easier to understand at a glance.' },
                { type: 'fix', text: 'Text color buttons now correctly restore your cursor position after inserting a color tag instead of jumping to the end of the message.' }
            ]
        },
        {
            version: '9.3.0', date: '', icon: '🎨',
            items: [
                { type: 'feature', text: 'Added a Font Family picker in Settings → Appearance → Interface — choose Inter, Poppins, Roboto, Lexend, Merriweather, Fira Code, or your system font for the whole app.' },
                { type: 'feature', text: 'Added a custom Text Color option in the same Interface tab, with swatches, a full color picker, and a one-tap reset back to the theme default.' },
                { type: 'feature', text: 'Added a TEXT COLOR toolbar to the Message composer in Webhooks — select text and pick a color to send it in color on Discord desktop/web, using Discord’s ANSI code-block trick (Discord has no real custom-font support for messages, so font choice only applies to Rex’s own interface, not the sent message).' },
                { type: 'improve', text: 'The Live Preview now renders ANSI text colors so you can see exactly how a colored message will look before sending.' },
                { type: 'fix', text: 'Fixed several places (Webhook Builder, Appearance card, About page, Reset Appearance toast) that were still hard-coded to say "V6.0.0" instead of the actual running version.' }
            ]
        },
        {
            version: '9.2.0', date: '', icon: '🏠',
            items: [
                { type: 'improve', text: 'Redesigned the Home page hero into a large gradient banner instead of a plain card.' },
                { type: 'improve', text: 'Home\'s overview cards (Weather, Time, Next Event, Webhooks) now each have their own colorful gradient icon badge instead of a flat icon.' },
                { type: 'improve', text: 'Quick Actions and info cards now lift and glow more distinctly on hover for a livelier feel.' },
                { type: 'improve', text: 'Sidebar got a subtle shadow and slightly more breathing room to feel more like a distinct panel.' }
            ]
        },
        {
            version: '9.1.0', date: '', icon: '✨',
            items: [
                { type: 'improve', text: 'Full component refresh across the entire app: buttons, inputs, dropdowns, badges, and modals all redesigned with bolder rounded corners and the new purple/pink accent.' },
                { type: 'improve', text: 'Inputs and textareas now show a soft glow ring when focused instead of a plain border.' },
                { type: 'improve', text: 'Sidebar links glow with a colorful gradient when active, and gently highlight on hover.' },
                { type: 'improve', text: 'Modals got bigger rounded corners and a softer, colorful shadow instead of plain black.' },
                { type: 'improve', text: 'Notification tags, mention buttons, and small action buttons are now pill-shaped and bolder.' },
                { type: 'improve', text: 'Added a custom colorful scrollbar that matches the new theme.' }
            ]
        },
        {
            version: '9.0.0', date: '', icon: '🎨',
            items: [
                { type: 'removed', text: 'Removed Quiet Hours entirely — the settings card, notification tagging, and all related code are gone from Notifications.' },
                { type: 'improve', text: 'Overhauled the entire visual design system into a vibrant, Govee Home-inspired look: purple-to-pink gradient accents, bright white cards with bolder rounded corners, and punchier shadows.' },
                { type: 'improve', text: 'The active sidebar item and primary buttons now use a colorful gradient instead of flat blue, giving the app a livelier, more playful feel while keeping it clean and readable.' },
                { type: 'improve', text: 'Dark mode was re-tuned to match the new purple/pink palette instead of the old blue theme.' }
            ]
        },
        {
            version: '8.9.2', date: '', icon: '🗑️',
            items: [
                { type: 'removed', text: 'Removed System Health entirely — the page, sidebar entry, and Diagnose modal are gone.' }
            ]
        },
        {
            version: '8.9.1', date: '', icon: '🐞',
            items: [
                { type: 'fix', text: 'Fixed Escape not closing most modals — the Keyboard Shortcuts panel said Esc closes any open modal, but it only closed the command palette. It now closes any open modal.' },
                { type: 'feature', text: 'Added a "Copy diagnosis" button in System Health\'s Diagnose modal, so you can paste the cause and fix straight into a support channel.' }
            ]
        },
        {
            version: '8.9.0', date: '', icon: '🌙',
            items: [
                { type: 'feature', text: 'Added Quiet Hours to Notifications — set a time range where new notifications save silently in the background without bumping the badge or interrupting you.' },
                { type: 'improve', text: 'Notifications that arrived during quiet hours are now tagged "🌙 quiet hours" in the list so you know what you missed.' }
            ]
        },
        {
            version: '8.8.0', date: '', icon: '⌨️',
            items: [
                { type: 'feature', text: 'Added a Keyboard Shortcuts panel — press ? anywhere or click the new ⌨️ header button to see every shortcut Rex supports.' }
            ]
        },
        {
            version: '8.7.1', date: '', icon: '🛡️',
            items: [
                { type: 'removed', text: 'Removed the "Simulate an issue" dropdown from System Health — the page now only ever shows real, live status.' }
            ]
        },
        {
            version: '8.7.0', date: '', icon: '🧪',
            items: [
                { type: 'feature', text: 'Added a "Simulate an issue" dropdown on System Health so you can preview what a failure looks like — clearly labeled 🧪 SIMULATED so it\'s never mistaken for a real problem.' },
                { type: 'improve', text: 'The health disclaimer now updates to say when a simulation is active, with a one-click "Clear simulation" link.' }
            ]
        },
        {
            version: '8.6.1', date: '', icon: '🔍',
            items: [
                { type: 'feature', text: 'Added a "Diagnose" button to every System Health card and detail row — click it to see the likely cause and a suggested fix.' }
            ]
        },
        {
            version: '8.6.0', date: '', icon: '🛡️',
            items: [
                { type: 'feature', text: 'Added a System Health page — a live status board for Webhooks, Weather, Testing, Scheduler, Local Storage, and Dev Clock, all pulled from real app data.' },
                { type: 'feature', text: 'Added an overall status indicator that turns yellow or red if any system needs attention.' }
            ]
        },
        {
            version: '8.5.2', date: '', icon: '📣',
            items: [
                { type: 'feature', text: 'Custom pings can now target a specific person, not just a role — pick "Person" and paste their Discord user ID.' },
                { type: 'improve', text: 'Ping buttons now show a small icon (🏷️ role / 👤 person) so it\'s clear what each one pings.' }
            ]
        },
        {
            version: '8.5.1', date: '', icon: '🧑‍🤝‍🧑',
            items: [
                { type: 'feature', text: 'Added a Share Profile code you can send to friends — they paste it into Add Friend to save your profile card locally, no server or account required.' },
                { type: 'feature', text: 'Added a Friends list on the Profile page, with the ability to remove friends.' },
                { type: 'feature', text: 'Added an emoji/icon picker for your avatar, as an alternative to pasting an image URL.' },
                { type: 'improve', text: 'Profile name editing was already supported — Edit Profile now makes it clearer alongside the new icon picker.' }
            ]
        },
        {
            version: '8.0.0', date: '', icon: '👤',
            items: [
                { type: 'feature', text: 'Completely redesigned Profile page into a Discord-style developer profile with a banner, avatar, status, and bio.' },
                { type: 'feature', text: 'Added custom status presets (Online, Busy, Do Not Disturb, Invisible) with editable status text.' },
                { type: 'feature', text: 'Added banner styles: Solid, Gradient, Aurora, or a custom image URL.' },
                { type: 'feature', text: 'Added automatic badges (Developer, Rex Member, Beta Tester, Event Tester) based on real activity, plus a manual Early User badge.' },
                { type: 'feature', text: 'Added Rex Developer Stats — webhooks sent, tests participated, templates created, and Dev Clock time — pulled live from existing app data.' },
                { type: 'feature', text: 'Added a Links section for GitHub, Discord, Roblox, YouTube, website, or custom links.' },
                { type: 'feature', text: 'Added Privacy controls to show/hide stats, badges, links, and member-since date.' },
                { type: 'feature', text: 'Added a live-updating preview inside the new Edit Profile modal.' }
            ]
        },
        {
            version: '7.1.0', date: '', icon: '✨',
            items: [
                { type: 'improve', text: 'Smoother, cooler UI — pages now fade and slide in when you switch views instead of snapping instantly.' },
                { type: 'improve', text: 'Cards gently lift on hover with a soft glow border, making the app feel more interactive and alive.' },
                { type: 'improve', text: 'Buttons now give a quick press animation for tactile feedback on every click.' },
                { type: 'improve', text: 'Overall polish pass to make Project Rex feel less like a static dashboard and more like a real web app.' }
            ]
        },
        {
            version: '7.0.0', date: '', icon: '🖥️',
            items: [
                { type: 'feature', text: 'Rex Desktop: a full visual redesign of the app shell — grouped sidebar sections (Home, Workspace, Testing, Monitoring, Tools, System), glass/blur panels, and a refreshed light-blue accent system.' },
                { type: 'improve', text: 'Reorganized navigation to feel like a real desktop app instead of a flat page list.' },
                { type: 'improve', text: 'Added a profile shortcut to the top header alongside search, notifications, and theme toggle.' },
                { type: 'improve', text: 'Refined shadows, borders, and corner radii across every card and panel for a more polished, consistent look.' }
            ]
        },
        {
            version: '6.4.0', date: '', icon: '📝',
            items: [
                { type: 'improve', text: 'Redesigned the Update Log into a searchable, filterable timeline with tagged entries.' },
                { type: 'removed', text: 'Removed the Screen Recorder feature and its tab from the sidebar.' }
            ]
        },
        {
            version: '6.3.0', date: '', icon: '📝',
            items: [
                { type: 'feature', text: 'Added an Update Log page to track what\'s changed over time.' }
            ]
        },
        {
            version: '6.2.0', date: '', icon: '🎥',
            items: [
                { type: 'feature', text: 'Added a free, local Screen Recorder — no account, no upload, no cost.' },
                { type: 'feature', text: 'Added pause/resume, a live timer, and an optional microphone toggle to the recorder.' }
            ]
        },
        {
            version: '6.1.0', date: '', icon: '⏱️',
            items: [
                { type: 'improve', text: 'Turned the Clock feature into a full dedicated page instead of a popup.' },
                { type: 'feature', text: 'Added a daily goal ring, streak counter, average session length, and best day stat.' },
                { type: 'feature', text: 'Added a 7-day bar chart with hover tooltips and a deletable session log.' }
            ]
        },
        {
            version: '6.0.1', date: '', icon: '⏱️',
            items: [
                { type: 'feature', text: 'Introduced the first version of the Dev Clock: clock in/out, live timer, and session history.' }
            ]
        },
        {
            version: '6.0.0', date: '', icon: '🚀',
            items: [
                { type: 'feature', text: 'Project Rex command center baseline: webhook builder, templates, testing events, scheduling, history, timeline, analytics, weather, and appearance settings.' }
            ]
        }
    ];

    /* Tidy the release list once so the Update Log never shows duplicates, bad entries or the wrong "latest":
       drop malformed entries, keep the first copy of a version, sort newest first. */
    (function normaliseChangelog(){
        const cmpV = (a, b) => { const x = String(a).split('.').map(n => parseInt(n, 10) || 0), y = String(b).split('.').map(n => parseInt(n, 10) || 0); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
        const seen = new Set(); const clean = [];
        CHANGELOG.forEach(r => {
            if (!r || !/^\d+\.\d+\.\d+$/.test(String(r.version || '')) || !Array.isArray(r.items) || seen.has(r.version)) return;
            seen.add(r.version); r.items = r.items.filter(i => i && typeof i.text === 'string' && i.text.trim()); r.icon = r.icon || '📝'; clean.push(r);
        });
        clean.sort((a, b) => cmpV(b.version, a.version));
        CHANGELOG.length = 0; clean.forEach(r => CHANGELOG.push(r));
        window.RexReleases = { list: () => CHANGELOG.map(r => ({ version: r.version, date: r.date || '', summary: r.summary || '', size: r.size || '', items: r.items.map(i => ({ type: i.type, text: i.text })) })), newest: () => CHANGELOG[0] && CHANGELOG[0].version };
    })();


    function cmpVersions(a,b){ const x=String(a).split('.').map(n=>parseInt(n,10)||0), y=String(b).split('.').map(n=>parseInt(n,10)||0); for(let i=0;i<3;i++){ if((x[i]||0)!==(y[i]||0)) return (x[i]||0)-(y[i]||0); } return 0; }
    let activeFilter = 'all';
    let onlyUnseenReleases = false;
    // The log has 70+ releases. Drawing all of them at once (each has a gradient banner) can make phone browsers run out of memory, so show them in small batches.
    const BATCH = 8; let shownLimit = BATCH, lastSig = '';
    const seenReleaseKey = 'rexUpdateLogSeenReleasesV100';
    function getSeenReleases(){ try { return JSON.parse(localStorage.getItem(seenReleaseKey) || '[]'); } catch(e) { return []; } }
    function markReleaseSeen(version){ const seen = getSeenReleases(); if(!seen.includes(version)){ seen.push(version); try { localStorage.setItem(seenReleaseKey, JSON.stringify(seen)); } catch(e) {} } }
    async function copyReleaseLink(version){
        const url = new URL(window.location.href); url.hash = 'update-' + version.replace(/[^a-zA-Z0-9.-]/g,'');
        try { await navigator.clipboard.writeText(url.href); } catch(e) { const input=document.createElement('textarea'); input.value=url.href; document.body.appendChild(input); input.select(); try { document.execCommand('copy'); } catch(_) {} input.remove(); }
        const toast = document.createElement('div'); toast.textContent = '🔗 Update link copied'; toast.style.cssText='position:fixed;right:20px;bottom:20px;z-index:99999;padding:11px 15px;border-radius:12px;background:var(--text);color:var(--bg);font-size:12px;font-weight:800;box-shadow:0 8px 28px #0003'; document.body.appendChild(toast); setTimeout(()=>toast.remove(),1800);
    }

    function renderUpdateAchievements(){
        const grid = document.getElementById('rexAchievementsGrid');
        const progress = document.getElementById('rexAchievementProgress');
        if(!grid) return;
        const allItems = CHANGELOG.flatMap(release => release.items.map(item => ({...item, version: release.version})));
        const featureCount = allItems.filter(item => item.type === 'feature').length;
        const fixCount = allItems.filter(item => item.type === 'fix').length;
        const majorRelease = CHANGELOG.some(release => {
            const parts = String(release.version || '').split('.').map(Number);
            return parts[0] >= 10 && parts[0] > 0;
        });
        const achievements = [
            { id:'first-feature', title:'First Feature Added', description:'The release history contains a recorded feature addition.', icon:'💡', accent:'#f59e0b', unlocked:featureCount > 0, detail: featureCount + ' feature additions recorded' },
            { id:'bug-squasher', title:'Bug Squasher', description:'At least one bug fix is recorded in the changelog.', icon:'🛠️', accent:'#10b981', unlocked:fixCount > 0, detail: fixCount + ' fixes recorded' },
            { id:'major-release', title:'Major Release', description:'A major-version release (10.0.0 or later) is in the history.', icon:'🚀', accent:'#8b5cf6', unlocked:majorRelease, detail:majorRelease ? 'Major version milestone reached' : 'Waiting for a major release' }
        ];
        const unlocked = achievements.filter(item => item.unlocked).length;
        if(progress) progress.textContent = unlocked + ' / ' + achievements.length + ' unlocked';
        grid.innerHTML = achievements.map(item => '<article class="rex-achievement-card '+(item.unlocked?'is-unlocked':'')+'" style="--achievement-accent:'+item.accent+'"><div class="rex-achievement-icon" aria-hidden="true">'+item.icon+'</div><div class="rex-achievement-copy"><strong>'+item.title+'</strong><p>'+item.description+'</p><span class="rex-achievement-status">'+(item.unlocked?'✓ UNLOCKED':'🔒 LOCKED')+'</span><p style="margin:5px 0 0">'+item.detail+'</p></div></article>').join('');
    }

    function buildFilters(){
        const container = document.getElementById('changelogFilters');
        if(!container || container.dataset.built) return;
        container.dataset.built = '1';
        const types = ['all', ...Object.keys(TYPE_META)];
        types.forEach(t => {
            const btn = document.createElement('button');
            btn.textContent = t === 'all' ? 'All' : TYPE_META[t].label;
            btn.dataset.filter = t;
            btn.style.cssText = 'font-size:12px;font-weight:700;padding:6px 12px;border-radius:100px;border:1px solid var(--border);background:var(--bg2);color:var(--muted);cursor:pointer;transition:.15s;';
            btn.onclick = () => { activeFilter = t; renderChangelog(); };
            container.appendChild(btn);
        });
        const unseen = document.createElement('button');
        unseen.id = 'rexUnseenFilter'; unseen.type = 'button'; unseen.textContent = '✦ What’s New Since Last Visit';
        unseen.style.cssText = 'font-size:12px;font-weight:800;padding:6px 12px;border-radius:100px;border:1px solid var(--border);background:var(--bg2);color:var(--muted);cursor:pointer;';
        unseen.onclick = () => { onlyUnseenReleases = !onlyUnseenReleases; unseen.style.background = onlyUnseenReleases ? 'var(--text)' : 'var(--bg2)'; unseen.style.color = onlyUnseenReleases ? 'var(--bg)' : 'var(--muted)'; renderChangelog(); };
        container.appendChild(unseen);
    }

    function openReleaseDetails(entry, updateNumber, items){
        const safe = value => String(value ?? '').replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
        const page = document.getElementById('rexReleasePageContent');
        const view = document.getElementById('view-release-details');
        if(!page || !view) return;
        const releaseIndex = Math.max(0, CHANGELOG.indexOf(entry));
        const metaRows = items.map(item=>{
            const m=TYPE_META[item.type]||TYPE_META.improve;
            return '<article class="rex-release-page-item" data-kind="'+safe(item.type)+'" style="display:flex;align-items:flex-start;gap:12px;padding:14px 0;border-bottom:1px solid var(--border);line-height:1.65"><span style="flex-shrink:0;color:'+m.color+';font-size:10px;font-weight:900;letter-spacing:.06em;padding:4px 9px;border-radius:99px;background:color-mix(in srgb, '+m.color+' 14%, transparent)">'+safe(m.label.toUpperCase())+'</span><span>'+safe(item.text)+'</span></article>';
        }).join('');
        const highlights = items.filter(item=>item.type==='feature');
        const fixes = items.filter(item=>item.type==='fix');
        const improvements = items.filter(item=>item.type==='improve');
        const removed = items.filter(item=>item.type==='removed');
        const summaryCard = (label, arr, icon) => arr.length ? '<section class="card" style="padding:16px;margin-bottom:12px"><h3 style="margin:0 0 8px">'+icon+' '+label+' <span style="color:var(--muted);font-size:12px">('+arr.length+')</span></h3>'+arr.map(x=>'<p style="margin:7px 0;line-height:1.6">• '+safe(x.text)+'</p>').join('')+'</section>' : '';
        const screenshots = Array.isArray(entry.screenshots) && entry.screenshots.length
            ? '<section class="card" style="padding:18px;margin-bottom:16px"><h3 style="margin:0 0 12px">📸 Screenshots & media</h3><div class="rex-release-screenshot-grid">'+entry.screenshots.map((shot,i)=>{const src=typeof shot==='string'?shot:shot.src;const caption=typeof shot==='string'?'Screenshot '+(i+1):(shot.caption||'Screenshot '+(i+1));return '<figure style="margin:0"><img src="'+safe(src)+'" alt="'+safe(caption)+'" loading="lazy" style="display:block;width:100%;max-height:340px;object-fit:contain;border-radius:10px;background:var(--bg2);border:1px solid var(--border)"><figcaption style="font-size:12px;color:var(--muted);padding-top:7px">'+safe(caption)+'</figcaption></figure>';}).join('')+'</div></section>'
            : '<section class="card" style="padding:18px;margin-bottom:16px"><h3 style="margin:0 0 6px">📸 Screenshots & media</h3><p style="margin:0;color:var(--muted);line-height:1.6">No screenshots have been attached to this release yet. Add image paths to this release’s <code>screenshots</code> list to show them here.</p></section>';
        page.innerHTML = '<header class="rex-release-page-hero rex-update-art rex-update-art-'+(releaseIndex%6)+'" style="border-radius:16px;margin-bottom:18px;min-height:170px"><div class="rex-update-art-copy"><span class="rex-update-art-kicker">PROJECT REX CENTER · RELEASE '+updateNumber+'</span><strong style="font-size:clamp(30px,5vw,48px)">UPDATE '+updateNumber+'</strong><span class="rex-update-art-version">VERSION '+safe(entry.version)+'</span></div><div class="rex-update-art-symbol" aria-hidden="true">'+safe(entry.icon||'✨')+'</div><div class="rex-update-art-shine"></div></header>'+
        '<div class="card" style="padding:20px;margin-bottom:16px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div><div class="rex-update-kicker">FULL RELEASE DETAILS</div><h2 style="margin:5px 0 8px">Version '+safe(entry.version)+'</h2><p style="margin:0;color:var(--muted)">'+safe(entry.date||'Release date not recorded')+(entry.time?' · '+safe(entry.time):'')+' · '+items.length+' changelog entr'+(items.length===1?'y':'ies')+'</p></div><span class="rex-update-entry-count">'+items.length+' changes</span></div></div>'+
        summaryCard('Feature highlights',highlights,'✨')+summaryCard('Improvements',improvements,'🎨')+summaryCard('Fixes',fixes,'🛠️')+summaryCard('Removed / changed',removed,'↘️')+
        screenshots+
        '<section class="card" style="padding:20px;margin-bottom:16px"><div class="rex-update-kicker">COMPLETE CHANGELOG</div><h3 style="margin:5px 0 8px">All release notes</h3><p style="margin:0 0 6px;color:var(--muted);font-size:12px">Every recorded change for this version, including feature additions, improvements, fixes, and removals.</p>'+metaRows+'</section>'+
        '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 30px"><button type="button" class="btn" id="rexReleasePageBackBottom">← Back to Update Log</button><button type="button" class="btn" id="rexReleaseCopyPage">↗ Copy release link</button></div>';
        document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
        view.classList.add('active');
        document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view==='changelog'));
        const title=document.getElementById('pageTitle'); if(title) title.textContent='Release Details';
        const subtitle=document.getElementById('pageSubtitle'); if(subtitle) subtitle.textContent='Complete changelog, highlights, fixes, and media';
        const back=()=>{ document.querySelectorAll('.view').forEach(v=>v.classList.remove('active')); document.getElementById('view-changelog')?.classList.add('active'); const t=document.getElementById('pageTitle');if(t)t.textContent='Update Log';const sub=document.getElementById('pageSubtitle');if(sub)sub.textContent="What's new in Project Rex";window.renderChangelog?.(); };
        document.getElementById('rexReleaseBack').onclick=back;
        document.getElementById('rexReleasePageBackBottom').onclick=back;
        document.getElementById('rexReleaseCopyPage').onclick=()=>copyReleaseLink(entry.version);
        markReleaseSeen(entry.version);
        document.querySelectorAll('#changelogTimeline [data-release-version="'+entry.version+'"] .rex-release-new').forEach(el=>el.remove());
        window.scrollTo({top:0,behavior:'smooth'});
    }

    function renderChangelogInner(){
        buildFilters();
        const timeline = document.getElementById('changelogTimeline');
        if(!timeline) return;

        document.querySelectorAll('#changelogFilters button').forEach(btn => {
            const isActive = btn.dataset.filter === activeFilter;
            btn.style.background = isActive ? 'var(--text)' : 'var(--bg2)';
            btn.style.color = isActive ? 'var(--bg)' : 'var(--muted)';
            btn.style.borderColor = isActive ? 'var(--text)' : 'var(--border)';
        });

        const query = (document.getElementById('changelogSearch')?.value || '').toLowerCase().trim();
        const seenAtRender = getSeenReleases();
        const unseenButton = document.getElementById('rexUnseenFilter');
        if(unseenButton){ unseenButton.style.background = onlyUnseenReleases ? 'var(--text)' : 'var(--bg2)'; unseenButton.style.color = onlyUnseenReleases ? 'var(--bg)' : 'var(--muted)'; }
        renderUpdateAchievements();

        // Version labels: say exactly which version is RUNNING, which is the newest NOTED here, and which is published (from the last check).
        const latestRelease = CHANGELOG[0];
        const versionLabel = document.getElementById('rexUpdateLogVersion');
        const currentLabel = document.getElementById('rexUpdateLogCurrent');
        const statusLabel = document.getElementById('rexUpdateLogStatus');
        const running = (typeof APP_VERSION !== 'undefined') ? APP_VERSION : (latestRelease && latestRelease.version);
        const runningRelease = CHANGELOG.find(r => r.version === running) || latestRelease;
        if (runningRelease) {
            if (versionLabel) versionLabel.textContent = running;
            if (currentLabel) currentLabel.textContent = releaseLabel(running);
            let published = ''; try { const l = JSON.parse(localStorage.getItem('rex115_latest') || 'null'); if (l && l.version && cmpVersions(l.version, running) > 0) published = ' · v' + l.version + ' is published (see Update Center)'; } catch(e) {}
            if (statusLabel) statusLabel.textContent = 'Running release · ' + (runningRelease.items.some(item => item.type === 'fix') ? 'Bug fixes and improvements' : 'Latest improvements') + published;
        }
        const refreshButton = document.getElementById('rexRefreshUpdateLog');
        if (refreshButton && !refreshButton.dataset.bound) {
            refreshButton.dataset.bound = '1';
            refreshButton.addEventListener('click', () => {
                window.renderChangelog();
                refreshButton.textContent = '✓ Log refreshed';
                window.setTimeout(() => { if (refreshButton.isConnected) refreshButton.textContent = '↻ Refresh log'; }, 1300);
            });
        }

        // Keep the summary honest and automatically in sync with the complete release history.
        const totals = { feature: 0, improve: 0, fix: 0, removed: 0 };
        CHANGELOG.forEach(release => release.items.forEach(item => { if (Object.prototype.hasOwnProperty.call(totals, item.type)) totals[item.type]++; }));
        document.querySelectorAll('[data-update-count]').forEach(node => { node.textContent = String(totals[node.dataset.updateCount] || 0); });

        timeline.innerHTML = '';
        timeline.style.borderLeft = '2px solid var(--border)';
        const featuredHost = document.getElementById('rexFeaturedRelease');
        if(featuredHost){
            const latest = CHANGELOG[0];
            featuredHost.innerHTML = latest ? '<div class="rex-featured-release-art rex-update-art-' + (CHANGELOG.indexOf(latest)%6) + '"><div><span class="rex-update-art-kicker">LATEST RELEASE</span><strong>V' + latest.version + '</strong><p>' + latest.items.length + ' release notes · ' + (latest.date || 'Release notes') + '</p></div><span class="rex-featured-release-icon">' + latest.icon + '</span></div><div class="rex-featured-release-foot"><span>✨ Explore what’s new in Project Rex Center</span><button type="button" id="rexFeaturedOpen">View latest ↓</button></div>' : '';
            const fb=document.getElementById('rexFeaturedOpen'); if(fb) fb.onclick=()=>{ const latestCard=document.querySelector('#changelogTimeline [data-release-version="'+latest.version+'"]'); if(latestCard){latestCard.scrollIntoView({behavior:'smooth',block:'start'}); latestCard.querySelector('.rex-release-toggle')?.click();} };
        }

        let anyRendered = false, drawn = 0, hidden = 0;
        const sig = activeFilter + '|' + query + '|' + onlyUnseenReleases;
        if (sig !== lastSig) { lastSig = sig; shownLimit = BATCH; }
        try { const m = /^#update-(.+)$/.exec(location.hash || ''); if (m) { const di = CHANGELOG.findIndex(r => r.version.replace(/[^a-zA-Z0-9.-]/g,'') === m[1]); if (di >= shownLimit) shownLimit = di + 1; } } catch(e) {}

        CHANGELOG.forEach((entry, idx) => {
            if (onlyUnseenReleases && seenAtRender.includes(entry.version)) return;
            const filteredItems = entry.items.filter(item => {
                const matchesType = activeFilter === 'all' || item.type === activeFilter;
                const matchesQuery = !query || item.text.toLowerCase().includes(query) || entry.version.includes(query);
                return matchesType && matchesQuery;
            });
            if(filteredItems.length === 0) return;
            anyRendered = true;
            if (drawn >= shownLimit) { hidden++; return; }
            drawn++;

            const wrap = document.createElement('div');
            wrap.style.cssText = 'position:relative;margin-bottom:22px;';

            const dot = document.createElement('div');
            dot.style.cssText = 'position:absolute;left:-32px;top:4px;width:14px;height:14px;border-radius:50%;background:' + (idx === 0 ? 'var(--green)' : 'var(--card)') + ';border:2px solid ' + (idx === 0 ? 'var(--green)' : 'var(--border)') + ';' + (idx === 0 ? 'box-shadow:0 0 0 4px color-mix(in srgb, var(--green) 20%, transparent);' : '');
            wrap.appendChild(dot);

            const card = document.createElement('div');
            card.className = 'card rex-update-version-card';
            card.dataset.releaseVersion = entry.version;
            card.id = 'update-' + entry.version.replace(/[^a-zA-Z0-9.-]/g,'');
            card.style.marginBottom = '0';

            const art = document.createElement('div');
            art.className = 'rex-update-art rex-update-art-' + (idx % 6);
            art.innerHTML = '<div class="rex-update-art-copy"><span class="rex-update-art-kicker">PROJECT REX CENTER</span><strong>UPDATE ' + (CHANGELOG.length - idx) + '</strong><span class="rex-update-art-version">VERSION ' + entry.version + '</span></div><div class="rex-update-art-symbol" aria-hidden="true">' + entry.icon + '</div><div class="rex-update-art-shine"></div>';
            card.appendChild(art);

            const seen = getSeenReleases();
            const header = document.createElement('div');
            header.className = 'card-title rex-release-card-header';
            header.innerHTML = '<h3>v' + entry.version + (RELEASE_NAMES[entry.version] ? ' ' + (isPhoneView() ? RELEASE_NAMES[entry.version].phone : RELEASE_NAMES[entry.version].computer) : '') + (entry.date ? ' <span style="font-weight:500;color:var(--muted);font-size:11px;">— ' + entry.date + (entry.time ? ' · ' + entry.time : '') + '</span>' : '') + (idx === 0 ? ' <span class="rex-update-latest">LATEST</span>' : '') + (!seen.includes(entry.version) ? ' <span class="rex-release-new">NEW</span>' : '') + ' <span class="rex-update-entry-count">' + filteredItems.length + (filteredItems.length === 1 ? ' update' : ' updates') + '</span></h3><div class="rex-release-actions"><button type="button" class="rex-release-detail-open">View details ↗</button><button type="button" class="rex-release-copy" title="Copy link to this release" aria-label="Copy link to this release">↗ Copy link</button><button type="button" class="rex-release-toggle" aria-expanded="true">Collapse −</button></div>';
            card.appendChild(header);

            const list = document.createElement('div');
            list.className = 'rex-release-details';
            list.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-top:8px;';
            filteredItems.forEach(item => {
                const meta = TYPE_META[item.type] || TYPE_META.improve;
                const row = document.createElement('div');
                row.className = 'rex-update-entry-row';
                row.dataset.kind = item.type;
                row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;font-size:13.5px;color:var(--text);line-height:1.6;';
                row.innerHTML = '<span style="flex-shrink:0;margin-top:2px;font-size:10.5px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;padding:2px 8px;border-radius:100px;background:color-mix(in srgb, ' + meta.color + ' 18%, transparent);color:' + meta.color + ';">' + meta.label + '</span><span>' + item.text + '</span>';
                list.appendChild(row);
            });
            card.appendChild(list);
            const toggle = header.querySelector('.rex-release-toggle');
            toggle.onclick = () => { const collapsed=list.hidden; list.hidden=!collapsed; toggle.textContent=collapsed?'Collapse −':'Expand +'; toggle.setAttribute('aria-expanded',String(collapsed)); if(collapsed) markReleaseSeen(entry.version); header.querySelector('.rex-release-new')?.remove(); };
            header.querySelector('.rex-release-copy').onclick = () => copyReleaseLink(entry.version);
            header.querySelector('.rex-release-detail-open').onclick = () => openReleaseDetails(entry, CHANGELOG.length - idx, entry.items);
            if(seen.includes(entry.version)){ header.querySelector('.rex-release-new')?.remove(); }
            wrap.appendChild(card);
            timeline.appendChild(wrap);
        });

        if (hidden > 0) {
            const more = document.createElement('button');
            more.type = 'button'; more.className = 'btn'; more.id = 'rexLogMore'; more.style.cssText = 'margin:4px 0 24px;width:100%;';
            more.textContent = 'Show ' + Math.min(BATCH, hidden) + ' older releases (' + hidden + ' more)';
            more.onclick = () => { shownLimit += BATCH; renderChangelogInner(); };
            timeline.appendChild(more);
        }
        if(!anyRendered){
            timeline.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:30px 0;">No updates match your search or filters. Try clearing a filter.</div>';
        }
    }
    let logTimer = null;
    window.renderChangelog = function(){
        try { renderChangelogInner(); }
        catch (err) {
            console.error('Update Log failed to draw', err);
            const t = document.getElementById('changelogTimeline');
            if (t) t.innerHTML = '<div class="card" style="padding:18px;text-align:center"><p style="margin:0 0 10px">The Update Log could not be drawn on this device.</p><button type="button" class="btn" id="rexLogRetry">Try again</button></div>';
            const b = document.getElementById('rexLogRetry'); if (b) b.onclick = () => { shownLimit = BATCH; window.renderChangelog(); };
        }
    };
    // typing in the search box should not redraw the whole list on every key
    window.renderChangelogSoon = function(){ clearTimeout(logTimer); logTimer = setTimeout(() => window.renderChangelog(), 180); };
    // pieces the redesigned Update Log (js/22-update-log-plus.js) reuses so the release page, links, seen-list and achievements keep working
    window.RexLogParts = { CHANGELOG, TYPE_META, openReleaseDetails, copyReleaseLink, getSeen: getSeenReleases, markSeen: markReleaseSeen, cmp: cmpVersions, achievements: renderUpdateAchievements };
    // Build the log on startup too, so it is ready even before the user navigates to it.
    // Only draw at start-up if the Update Log is the page being shown; otherwise it is drawn when you open it.
    const startDraw = () => { const v = document.getElementById('view-changelog'); if (v && v.classList.contains('active')) window.renderChangelog(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startDraw, { once: true }); else startDraw();
})();
