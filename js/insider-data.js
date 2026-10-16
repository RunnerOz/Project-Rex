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
    { id: 'c-haunt', emoji: '🎃', title: 'Halloween Haunt goes live', status: 'Scheduled', eta: 'Oct 24, 2026',
      body: 'Thirteen pumpkins, a Golden Pumpkin, a secret story and a Haunted Portal. Nothing to install: it starts by itself.' },
    { id: 'c-more-events', emoji: '🦃', title: 'More seasonal events as they arrive', status: 'Scheduled', eta: 'Nov – Dec 2026',
      body: 'Thanksgiving gratitude table and the 25-day Christmas Advent calendar are already built into the app.' },
    { id: 'c-idea-1', emoji: '💡', title: 'Your ideas', status: 'Idea', eta: 'No date yet',
      body: 'Edit js/insider-data.js to add what you are planning. This card is a placeholder.' }
  ],
  dev: [
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
