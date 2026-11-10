/* ============================================================================
   REX INSIDER — announcements file.  THIS IS THE FILE YOU EDIT to add news.
   (See "Adding Rex Insider announcements" in README.md.)

   Rules
   - Plain text only (no HTML). Dates are YYYY-MM-DD.
   - Newest first is not required: items are sorted by pinned, then date.
   - Remove an item, or add  hideAfter: '2026-11-01'  to hide it automatically after that day.
   - Add  draft: true  to keep an item in the file without showing it.
   - Optional button:  link: { label: 'Open Live Events', view: 'events' }   (an app page)
                       link: { label: 'See what is coming', view: 'insider', tab: 'soon' }   (a tab inside Rex Insider: featured, soon, dev, history, holiday)
                  or   link: { label: 'Read more', url: 'https://…' }        (https only)
   - These sample entries are placeholders written by Claude: edit or delete them freely.
   - Like all app files, new announcements arrive with an app update (you press Update Now).
   ============================================================================ */
window.REX_INSIDER = {
  featured: [
    { id: 'f-looks', date: '2026-11-10', tag: 'New feature', title: 'Six new looks, including 1900',
      body: 'Pick a parchment 1900 theme, Midnight Neon, Ocean, Forest, Sakura or Terminal from a new card grid with live previews.',
      link: { label: 'Open Look settings', view: 'settings' } },
    { id: 'f-season3', date: '2026-11-08', tag: 'New feature', title: 'Story Mode Season Three: The Starfall Isles',
      body: 'A sky voyage with 12 places, 12 scenes with choices and 12 keepsakes. Seasons now unlock in order: finish one to open the next.',
      link: { label: 'Open Story Mode', view: 'story' } },
    { id: 'f-season2', date: '2026-11-07', tag: 'New feature', title: 'Story Mode Season Two: The Frostline',
      body: 'A brand new winter trail with 12 places, 12 scenes with choices and 12 keepsakes. It unlocks when Rex reaches Mossy Creek, and you can play it alongside Season One.',
      link: { label: 'Open Story Mode', view: 'story' } },
    { id: 'f-story-2', date: '2026-11-07', tag: 'New feature', pinned: true, title: 'Story Mode is a real story now',
      body: 'Three chapters, a scene with a choice at every place, a backpack of keepsakes, a journal, and a Daily Trail with small bonus miles. Dev Clock time is still what moves Rex.',
      link: { label: 'Open Story Mode', view: 'story' } },
    { id: 'f-preview', date: '2026-11-06', tag: 'New feature', title: 'Preview your message like Discord shows it',
      body: 'The builder preview now looks like a real Discord message, with dark and light themes, a phone width, embeds with the colored bar, and your variables filled in.',
      link: { label: 'Open the builder', view: 'builder' } },
    { id: 'f-buttons', date: '2026-11-06', tag: 'Fix', title: 'Buttons now reach Discord',
      body: 'Buttons were being ignored by Discord. Rex now asks the right way, and if your webhook cannot show buttons it adds them as links instead. There is also a free guide to get real buttons.',
      link: { label: 'Open the builder', view: 'builder' } },
    { id: 'f-history-plus', date: '2026-11-03', tag: 'New feature', title: 'Resend and retry from History',
      body: 'Failed sends are kept with the reason. Resend one, or retry all the failed ones at once, from the new History tabs.',
      link: { label: 'Open History', view: 'history' } },
    { id: 'f-data-health', date: '2026-10-31', tag: 'New feature', title: 'Data Health keeps your data safe',
      body: 'A check-up page that finds and repairs problems, plus automatic backups with a cleanup you control.',
      link: { label: 'Open Data Health', view: 'datahealth' } },
    { id: 'f-funny-events', date: '2026-10-16', tag: 'New feature', title: 'Sixteen funny Live Events',
      body: 'Squirrels, groundhogs, pizza, naps, lost socks, tacos, sloths and more. There is now something silly in almost every month, each with hidden collectibles and a Rex skin.',
      link: { label: 'Open Holiday Live Events', view: 'events' } },
    { id: 'f-more-events', date: '2026-10-16', tag: 'New feature', pinned: false, title: 'Nine more Live Events',
      body: 'Lunar New Year, Pi Day, First Day of Spring, Moon Landing Day, National Dog Day, Programmers\u2019 Day, Talk Like a Pirate Day, International Coffee Day and Ada Lovelace Day join the calendar. Each has hidden collectibles, rewards and a Rex skin.',
      link: { label: 'Open Holiday Live Events', view: 'events' } },
    { id: 'f-insider-launch', date: '2026-10-14', tag: 'Announcement', pinned: true, title: 'Welcome to Rex Insider',
      body: 'Rex Insider is the news room for Project Rex Center: announcements, what is coming next, development notes, the full release history and previews of seasonal events. It lives in the app, works offline and never sends anything anywhere.',
      link: { label: 'See what is coming', view: 'insider', tab: 'soon' } },
    { id: 'f-live-events', date: '2026-10-14', tag: 'New feature', title: 'Holiday Live Events is here',
      body: 'Seasonal events with hidden collectibles, achievements and permanent Rex skins. The Halloween Haunt starts October 24. Events follow your own device clock and your progress stays in your browser.',
      link: { label: 'Open Holiday Live Events', view: 'events' } },
    { id: 'f-safe-updates', date: '2026-10-13', tag: 'Good to know', title: 'Updates only happen when you press the button',
      body: 'Refreshing or reopening Project Rex never installs a new version. Use Settings, App & Updates to check for updates and install them when you are ready. You can also go back to the previous version.',
      link: { label: 'Open Settings', view: 'settings' } }
  ],
  coming: [
    { id: 'c-buttons-real', emoji: '🔘', title: 'Real Discord buttons, confirmed', status: 'Testing', eta: 'Needs your check',
      body: 'The link-button fix and the free guide to get real buttons are built and tested here. They still need a try on a real Discord server.',
      link: { label: 'Open the builder', view: 'builder' } },
    { id: 'c-thanks', emoji: '🦃', title: 'Thanksgiving gratitude table', status: 'Scheduled', eta: 'Late Nov 2026', hideAfter: '2026-11-30',
      body: 'A cozy, low-pressure event. Your gratitude notes never leave this device.',
      link: { label: 'Open Live Events', view: 'events' } },
    { id: 'c-advent', emoji: '🎄', title: 'Christmas Advent calendar', status: 'Scheduled', eta: 'Dec 1 – 25, 2026', hideAfter: '2026-12-31',
      body: 'Twenty-five doors, one a day. Door 25 unlocks the Santa Rex skin.',
      link: { label: 'Open Live Events', view: 'events' } },
    { id: 'c-haunt', emoji: '🎃', title: 'Halloween Haunt goes live', status: 'Scheduled', eta: 'Oct 24, 2026', hideAfter: '2026-10-31',
      body: 'Thirteen pumpkins, a Golden Pumpkin, a secret story and a Haunted Portal. Nothing to install: it starts by itself.' },
    { id: 'c-more-events', emoji: '🦃', title: 'More seasonal events as they arrive', status: 'Scheduled', eta: 'Nov – Dec 2026', hideAfter: '2026-12-31',
      body: 'Thanksgiving gratitude table and the 25-day Christmas Advent calendar are already built into the app.' },
    { id: 'c-idea-1', emoji: '💡', title: 'Your ideas', status: 'Idea', eta: 'No date yet',
      body: 'Edit js/insider-data.js to add what you are planning. This card is a placeholder.' }
  ],
  dev: [
    { id: 'd-story2', date: '2026-11-07', title: 'Story Mode scenes, backpack and Daily Trail (13.7.0)', progress: 100,
      body: 'Chapters, 12 scenes with choices, keepsakes, a journal and small daily bonus miles. Tested in a headless browser; not yet tested on real phones.' },
    { id: 'd-preview', date: '2026-11-06', title: 'Discord-style preview and Home redesign (13.6.0)', progress: 100,
      body: 'Dark and light preview, phone width, a two-column Home, a sectioned Dashboard and a grouped Launchpad.' },
    { id: 'd-buttons', date: '2026-11-06', title: 'Buttons on a real Discord server (13.6.1 – 13.6.2)', progress: 70,
      body: 'Built and tested against a simulated Discord. The last 30% is a real-server check, which only you can do.' },
    { id: 'd-1', date: '2026-10-14', title: 'Rex Insider added', progress: 100,
      body: 'New section with five tabs. Reads release history from the existing Update Log, and event previews from Holiday Live Events, so nothing is duplicated.' },
    { id: 'd-2', date: '2026-10-14', title: 'Holiday Live Events shipped (11.6.0)', progress: 100,
      body: 'Shared event engine, Halloween Haunt, achievements and rewards. Tested in a headless browser; not yet tested on real phones.' },
    { id: 'd-3', date: '2026-10-13', title: 'Safe, manual updates (11.5.0 – 11.5.5)', progress: 100,
      body: 'Version-pinned updates, a Settings update card, Go back, Repair, Quick note, Focus sounds and Rex’s day.' }
  ],
  holiday: {
    show: 4,                       // how many upcoming events to preview
    notes: {                       // optional extra line per event key (see js/11-live-events.js for keys)
      halloween: 'Tip: pumpkins hide at the bottom of pages. Use the clues on the event page if you get stuck.',
      thanksgiving: 'A cozy, low-pressure event. Your gratitude notes never leave this device.',
      christmas: 'Door 25 opened on December 25 unlocks the Santa Rex skin.'
    }
  }
};
