/* ===== v9.5.1 — Holidays module (self-contained; hooks into the main app) ===== */
(function () {
    'use strict';
    const DAY = 86400000;
    const $h = id => document.getElementById(id);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[Math.floor(Math.random() * a.length)];

    /* ---------- date helpers ---------- */
    const D = (y, m, d) => new Date(y, m, d);
    const nth = (y, m, wd, n) => { const f = new Date(y, m, 1).getDay(); return new Date(y, m, 1 + ((wd - f + 7) % 7) + (n - 1) * 7); };
    const lastWd = (y, m, wd) => { const l = new Date(y, m + 1, 0); return new Date(y, m, l.getDate() - ((l.getDay() - wd + 7) % 7)); };
    function easter(y) {
        const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25),
            g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
            l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
            mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
        return new Date(y, mo - 1, da);
    }
    // Lunar / religious holidays can't be computed with a simple rule, so they use a built-in table (2025–2030).
    const T_LUNAR = { 2025: [0, 29], 2026: [1, 17], 2027: [1, 6], 2028: [0, 26], 2029: [1, 13], 2030: [1, 3] };
    const T_DIWALI = { 2025: [9, 20], 2026: [10, 8], 2027: [9, 29], 2028: [9, 17], 2029: [10, 5], 2030: [9, 26] };
    const T_HANUK = { 2025: [11, 14], 2026: [11, 4], 2027: [11, 24], 2028: [11, 12], 2029: [11, 1], 2030: [11, 20] };
    const tbl = t => y => t[y] ? D(y, t[y][0], t[y][1]) : null;
    const today0 = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
    const daysBetween = (a, b) => Math.round((b - a) / DAY);
    const fmtDate = (d, short) => d.toLocaleDateString([], { weekday: short ? undefined : 'short', month: 'short', day: 'numeric', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
    const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const reduced = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.body.classList.contains('anim-off');

    /* ---------- themes ---------- */
    const fall = (e, n) => ({ k: 'fall', e, n: n || 26 });
    const rise = (e, n) => ({ k: 'rise', e, n: n || 20 });
    const conf = (colors, n) => ({ k: 'conf', colors, n: n || 50 });
    const snow = n => ({ k: 'snow', n: n || 70 });
    const fire = colors => ({ k: 'fire', colors });
    const THEMES = {
        newyear:   { name: 'New Year',        e: '🎆', c: ['#1f2a5c', '#c9a227', '#f7d774'], fx: [fire(['#ffd54a', '#ffffff', '#6fb5ff', '#ff7ab6']), conf(['#ffd54a', '#e8e8f0', '#6fb5ff'], 35)] },
        calm:      { name: 'Reflection',      e: '🕊️', c: ['#2f4a73', '#4f78b0', '#9bb8dc'], fx: [] },
        lny:       { name: 'Lunar New Year',  e: '🧧', c: ['#a30019', '#e8331f', '#ffc83d'], fx: [fall(['🧧', '🏮', '✨'], 22)] },
        love:      { name: 'Valentine',       e: '💘', c: ['#c81d56', '#ff5c8a', '#ffb3c8'], fx: [rise(['💖', '💗', '💕', '💘'], 22)] },
        party:     { name: 'Party',           e: '🎉', c: ['#6c5ce7', '#a05cff', '#ff6fb0'], fx: [conf(['#ff6fb0', '#a05cff', '#ffd23f', '#17d3a4', '#43a9ff'], 60)] },
        clover:    { name: 'Lucky',           e: '☘️', c: ['#0b6e36', '#17b25a', '#9be564'], fx: [fall(['☘️', '🍀', '✨'], 24)] },
        spring:    { name: 'Spring',          e: '🐣', c: ['#7a67e0', '#e865b9', '#ffd84d'], fx: [fall(['🐣', '🌷', '🥚', '🌸'], 24)] },
        earth:     { name: 'Earth',           e: '🌍', c: ['#0b7a5e', '#14a39a', '#7bd88f'], fx: [fall(['🌱', '🍃', '🌍'], 22)] },
        fiesta:    { name: 'Fiesta',          e: '🌮', c: ['#0b7a3c', '#e63946', '#ffb703'], fx: [conf(['#0b8a42', '#e63946', '#ffd166', '#ffffff'], 60)] },
        bloom:     { name: 'Bloom',           e: '🌷', c: ['#c2255c', '#f06595', '#ffd0e0'], fx: [fall(['🌸', '🌷', '💐'], 24)] },
        patriot:   { name: 'Fireworks',       e: '🎆', c: ['#183577', '#c8102e', '#5b8def'], fx: [fire(['#ff4d5e', '#ffffff', '#5b8def']), fall(['⭐'], 14)] },
        stars:     { name: 'Stars & Stripes', e: '⭐', c: ['#183577', '#c8102e', '#5b8def'], fx: [fall(['⭐'], 18)] },
        juneteenth:{ name: 'Juneteenth',      e: '✨', c: ['#a30d16', '#1f7a3d', '#f2b705'], fx: [conf(['#d62828', '#2a9d4b', '#f2b705'], 50)] },
        dad:       { name: 'Dad',             e: '🏆', c: ['#1b4fa8', '#3a86ff', '#8ecae6'], fx: [fall(['🏆', '⭐', '🎣'], 20)] },
        rex:       { name: 'Dog Day',         e: '🐾', c: ['#b45a12', '#f0a04b', '#ffd9a0'], fx: [fall(['🐾', '🦴', '🐶'], 22)] },
        dev:       { name: 'Dev Day',         e: '💻', c: ['#0b8043', '#1e88e5', '#7c4dff'], fx: [fall(['💻', '🐛', '⌨️', '☕'], 22)] },
        galaxy:    { name: 'Galaxy',          e: '🚀', c: ['#1b1464', '#5f2c82', '#49a09d'], fx: [fall(['✨', '⭐', '🚀'], 24)] },
        spooky:    { name: 'Spooky',          e: '🎃', c: ['#e65c00', '#7b2cbf', '#ff9e40'], fx: [fall(['🎃', '🦇', '👻', '🕸️'], 26)] },
        diwali:    { name: 'Diwali',          e: '🪔', c: ['#a1127f', '#f77f00', '#ffd60a'], fx: [rise(['✨', '🪔'], 20), fire(['#ffd60a', '#ff9e00', '#ff4fa3'])] },
        harvest:   { name: 'Harvest',         e: '🍂', c: ['#9c4210', '#e07a1f', '#f2c14e'], fx: [fall(['🍂', '🍁', '🌰', '🦃'], 24)] },
        hanukkah:  { name: 'Hanukkah',        e: '🕎', c: ['#16399e', '#3b82f6', '#9fb3d1'], fx: [snow(50), fall(['🕎', '✡️'], 10)] },
        winter:    { name: 'Winter Holidays', e: '🎄', c: ['#a30f27', '#1f8a4c', '#e8d9a8'], fx: [snow(80), fall(['🎄', '🎁'], 8)] }
    };

    /* ---------- holiday definitions (with short descriptions for tooltips/popups) ---------- */
    // cat: US (federal-style), Fun, Cultural. pre/post = days the seasonal theme runs before/after. solemn = colors only, no confetti.
    const DEFS = [
        { id: 'newyear', name: "New Year's Day", e: '🎆', cat: 'US', th: 'newyear', pre: 3, post: 1, d: y => D(y, 0, 1), greet: 'Happy New Year!', line: 'New year, new builds. Thank you for being part of Project Rex — here’s to an amazing year ahead!', desc: 'Celebrates the start of a new calendar year—a time for fresh starts, hopes, and plans for the months ahead.' },
        { id: 'mlk', name: 'Martin Luther King Jr. Day', e: '🕊️', cat: 'US', th: 'calm', pre: 0, solemn: true, d: y => nth(y, 0, 1, 3), greet: 'Remembering Dr. Martin Luther King Jr. today.', line: 'Today we honor his legacy of service, equality, and hope.', desc: 'Honors Dr. Martin Luther King Jr. and his work for civil rights, equality, and nonviolent change.' },
        { id: 'lny', name: 'Lunar New Year', e: '🧧', cat: 'Cultural', th: 'lny', pre: 4, d: tbl(T_LUNAR), greet: 'Happy Lunar New Year! 🏮', line: 'Wishing everyone health, luck, and prosperity in the year ahead.', desc: 'Welcomes the new year in lunisolar calendars and is celebrated in many communities with family gatherings, special meals, and traditions.' },
        { id: 'valentine', name: "Valentine's Day", e: '💘', cat: 'Fun', th: 'love', pre: 5, d: y => D(y, 1, 14), greet: "Happy Valentine's Day! 💖", line: 'Sending some love to the whole community today.', desc: 'A day to show care and appreciation for partners, friends, family, and other important people in your life.' },
        { id: 'presidents', name: "Presidents' Day", e: '⭐', cat: 'US', th: 'stars', pre: 1, d: y => nth(y, 1, 1, 3), greet: "Happy Presidents' Day!", line: 'Enjoy the long weekend, everyone.', desc: 'A US holiday that recognizes the country\'s presidents and reflects on the history of the presidency.' },
        { id: 'pi', name: 'Pi Day', e: '🥧', cat: 'Fun', th: 'party', pre: 1, d: y => D(y, 2, 14), greet: 'Happy Pi Day! 🥧', line: '3.14159… and still going. Enjoy a slice today!', desc: 'Celebrates the mathematical constant pi (approximately 3.14), often with math activities, puzzles, and a slice of pie.' },
        { id: 'stpat', name: "St. Patrick's Day", e: '☘️', cat: 'Fun', th: 'clover', pre: 3, d: y => D(y, 2, 17), greet: "Happy St. Patrick's Day! ☘️", line: 'May your builds be green and your pings be lucky.', desc: 'Celebrates Irish heritage and culture, often with music, parades, shamrocks, and the color green.' },
        { id: 'aprilfools', name: "April Fools' Day", e: '🃏', cat: 'Fun', th: 'party', pre: 0, d: y => D(y, 3, 1), greet: "Happy April Fools' Day! 🃏", line: 'Nothing on the server is broken. Probably. Stay suspicious today!', desc: 'A day for harmless jokes and playful pranks. Keep it kind, and make sure everyone can enjoy the joke.' },
        { id: 'easter', name: 'Easter', e: '🐣', cat: 'Cultural', th: 'spring', pre: 5, d: easter, greet: 'Happy Easter! 🐣', line: 'Wishing everyone a bright and happy spring weekend.', desc: 'A Christian holiday celebrating the resurrection of Jesus; many communities also mark the season with spring traditions and egg hunts.' },
        { id: 'earth', name: 'Earth Day', e: '🌍', cat: 'Fun', th: 'earth', pre: 2, d: y => D(y, 3, 22), greet: 'Happy Earth Day! 🌍', line: 'Take a moment to enjoy the outdoors today.', desc: 'Encourages people to care for the environment through conservation, cleanup activities, and everyday choices that reduce waste.' },
        { id: 'starwars', name: 'Star Wars Day', e: '🚀', cat: 'Fun', th: 'galaxy', pre: 1, d: y => D(y, 4, 4), greet: 'May the Fourth be with you! 🚀', line: 'Hope the force is strong with your servers today.', desc: 'A fan-created celebration of Star Wars, chosen for the pun “May the Fourth be with you.”' },
        { id: 'cinco', name: 'Cinco de Mayo', e: '🌮', cat: 'Cultural', th: 'fiesta', pre: 2, d: y => D(y, 4, 5), greet: '¡Feliz Cinco de Mayo! 🌮', line: 'Celebrate with some good food and good company.', desc: 'Marks Mexico’s victory over French forces at the Battle of Puebla on May 5, 1862; it is not Mexico’s Independence Day.' },
        { id: 'mothers', name: "Mother's Day", e: '🌷', cat: 'US', th: 'bloom', pre: 4, d: y => nth(y, 4, 0, 2), greet: "Happy Mother's Day! 🌷", line: 'Thank you to all the moms and mother figures in our community.', desc: 'Recognizes mothers and the people who provide motherly care, support, and guidance.' },
        { id: 'memorial', name: 'Memorial Day', e: '⭐', cat: 'US', th: 'stars', pre: 1, solemn: true, d: y => lastWd(y, 4, 1), greet: 'Remembering and honoring those who gave everything.', line: 'Today is a day of remembrance. Thank you to the families who carry their memory.', desc: 'A day of remembrance for US military personnel who died while serving their country.' },
        { id: 'juneteenth', name: 'Juneteenth', e: '✨', cat: 'US', th: 'juneteenth', pre: 2, d: y => D(y, 5, 19), greet: 'Happy Juneteenth! ✨', line: 'Celebrating freedom and reflecting on history today.', desc: 'Commemorates June 19, 1865, when news of emancipation reached enslaved people in Galveston, Texas, more than two years after the Emancipation Proclamation.' },
        { id: 'fathers', name: "Father's Day", e: '🏆', cat: 'US', th: 'dad', pre: 4, d: y => nth(y, 5, 0, 3), greet: "Happy Father's Day! 🏆", line: 'Thank you to all the dads and father figures out there.', desc: 'Recognizes fathers and the people who offer fatherly care, encouragement, and guidance.' },
        { id: 'july4', name: 'Independence Day', e: '🎇', cat: 'US', th: 'patriot', pre: 5, post: 1, d: y => D(y, 6, 4), greet: 'Happy 4th of July! 🎇', line: 'Have a safe and fun holiday, and enjoy the fireworks!', desc: 'Celebrates the adoption of the Declaration of Independence on July 4, 1776, with gatherings, parades, and fireworks across the United States.' },
        { id: 'dogday', name: 'National Dog Day', e: '🐶', cat: 'Fun', th: 'rex', pre: 2, d: y => D(y, 7, 26), greet: "Happy National Dog Day! 🐶", line: 'Rex is demanding extra treats today. Give your good boys and girls a pat from us!', desc: 'A day for celebrating dogs, appreciating the companionship they bring, and supporting animal welfare and adoption.' },
        { id: 'labor', name: 'Labor Day', e: '🛠️', cat: 'US', th: 'stars', pre: 1, d: y => nth(y, 8, 1, 1), greet: 'Happy Labor Day!', line: 'Thanks to everyone who works hard — enjoy your day off.', desc: 'Recognizes the contributions of workers and the labor movement in the United States; it is also often seen as the end of summer.' },
        { id: 'progday', name: "Programmers' Day", e: '💻', cat: 'Fun', th: 'dev', pre: 1, d: y => D(y, 0, 256), greet: "Happy Programmers' Day! 💻", line: 'The 256th day of the year. Go commit something and take a break!', desc: 'Celebrates programmers on the 256th day of the year, a number chosen because 256 is 2 to the eighth power and fits in one byte.' },
        { id: 'halloween', name: 'Halloween', e: '🎃', cat: 'Fun', th: 'spooky', pre: 14, d: y => D(y, 9, 31), greet: 'Happy Halloween! 🎃', line: 'Have a spooky night, and don’t forget the candy. 👻', desc: 'A celebration of costumes, trick-or-treating, carved pumpkins, and spooky stories on October 31.' },
        { id: 'diwali', name: 'Diwali', e: '🪔', cat: 'Cultural', th: 'diwali', pre: 5, d: tbl(T_DIWALI), greet: 'Happy Diwali! 🪔', line: 'Wishing everyone a festival of lights full of joy and happiness.', desc: 'Known as the Festival of Lights, Diwali is celebrated by many Hindus, Jains, Sikhs, and some Buddhists, with traditions that symbolize light, hope, and renewal.' },
        { id: 'veterans', name: 'Veterans Day', e: '⭐', cat: 'US', th: 'stars', pre: 1, solemn: true, d: y => D(y, 10, 11), greet: 'Thank you to all who have served.', line: 'Today we honor our veterans and their service.', desc: 'Recognizes everyone who has served in the US armed forces, in wartime or peacetime.' },
        { id: 'thanksgiving', name: 'Thanksgiving', e: '🦃', cat: 'US', th: 'harvest', pre: 5, d: y => nth(y, 10, 4, 4), greet: 'Happy Thanksgiving! 🦃', line: 'Grateful for this community. Enjoy the food and the company!', desc: 'A US holiday centered on giving thanks, often marked by shared meals, family gatherings, and community traditions.' },
        { id: 'hanukkah', name: 'Hanukkah (begins at sundown)', e: '🕎', cat: 'Cultural', th: 'hanukkah', pre: 3, post: 7, d: tbl(T_HANUK), greet: 'Happy Hanukkah! 🕎', line: 'Wishing everyone eight nights of light and joy.', desc: 'A Jewish holiday commemorating the rededication of the Second Temple in Jerusalem and celebrated over eight nights with the lighting of the menorah.' },
        { id: 'xmaseve', name: 'Christmas Eve', e: '🎁', cat: 'US', th: 'winter', pre: 0, d: y => D(y, 11, 24), greet: 'Merry Christmas Eve! 🎁', line: 'Almost there — wishing everyone a cozy night.', desc: 'The evening before Christmas Day, often marked by family traditions, festive meals, and anticipation of the holiday.' },
        { id: 'xmas', name: 'Christmas Day', e: '🎄', cat: 'US', th: 'winter', pre: 24, post: 1, d: y => D(y, 11, 25), greet: 'Merry Christmas! 🎄', line: 'Wishing everyone a warm and wonderful holiday from all of us at Project Rex.', desc: 'A Christian holiday celebrating the birth of Jesus, also observed by many people through gift-giving, decorations, and time with loved ones.' },
        { id: 'nye', name: "New Year's Eve", e: '🥂', cat: 'US', th: 'newyear', pre: 1, d: y => D(y, 11, 31), greet: "Happy New Year's Eve! 🥂", line: 'Thanks for an amazing year. See you on the other side!', desc: 'The final day of the calendar year, often celebrated with reflection, gatherings, and a countdown to midnight.' }
    ];

    /* ---------- fun facts (v9.5.7) ---------- */
    const FACTS = {
        newyear: ["New Year’s resolutions date back about 4,000 years to the ancient Babylonians.", "January is named after Janus, the Roman god of doors and new beginnings.", "The Times Square ball drop has been a New Year’s tradition since 1907."],
        mlk: ["Martin Luther King Jr. Day became a US federal holiday in 1983 and was first observed in 1986.", "It’s held on the third Monday of January, close to Dr. King’s birthday on January 15.", "In 1964, Dr. King became the youngest person to receive the Nobel Peace Prize up to that time."],
        lny: ["Each Lunar New Year is linked to one of 12 zodiac animals.", "Red envelopes are given during Lunar New Year to share good luck.", "Lunar New Year is celebrated in many countries, including China, Vietnam, and South Korea."],
        valentine: ["Valentine’s Day is linked to Saint Valentine, a name shared by several early Christian martyrs.", "One of the oldest surviving valentines is a poem written in 1415 by Charles, Duke of Orléans, while he was held in the Tower of London.", "Cupid comes from Roman mythology, where he was the god of desire."],
        presidents: ["Presidents’ Day began as a holiday honoring George Washington’s birthday.", "Federal law still officially calls the holiday Washington’s Birthday.", "Since 1971, the holiday has been observed on the third Monday of February."],
        pi: ["Pi Day is March 14 because pi starts with 3.14.", "Pi is irrational, so its digits never end and never repeat.", "Pi Day was started by physicist Larry Shaw at the San Francisco Exploratorium in 1988."],
        stpat: ["St. Patrick’s Day began as a feast day for Saint Patrick, the patron saint of Ireland.", "Chicago has dyed its river green for St. Patrick’s Day since 1962.", "New York City held St. Patrick’s Day parades as early as 1762, among the oldest in the US."],
        aprilfools: ["Nobody knows for sure how April Fools’ Day started, but it has been celebrated for centuries.", "In 1957, the BBC ran a famous April Fools’ hoax about spaghetti growing on trees.", "In France, April Fools’ Day pranks are called “poisson d’avril,” which means April fish."],
        easter: ["Easter’s date is based on the moon, so it moves every year, always between March 22 and April 25.", "The White House Easter Egg Roll has been held since 1878.", "The Easter bunny tradition came to America with German immigrants."],
        earth: ["The first Earth Day was held on April 22, 1970.", "About 20 million Americans took part in the first Earth Day.", "Earth Day is now celebrated in more than 190 countries."],
        starwars: ["Star Wars Day is May 4 because of the pun “May the Fourth be with you.”", "The first Star Wars movie came out in 1977.", "Star Wars Day is celebrated by fans all over the world every May 4."],
        cinco: ["Cinco de Mayo marks Mexico’s 1862 victory over French forces at the Battle of Puebla.", "Cinco de Mayo is not Mexico’s Independence Day. That’s September 16.", "In Mexico, the biggest Cinco de Mayo celebrations are in the state of Puebla."],
        mothers: ["Anna Jarvis campaigned for Mother’s Day, and it became a US national holiday in 1914.", "Carnations are traditionally linked to Mother’s Day.", "In the US, Mother’s Day is always on the second Sunday of May."],
        memorial: ["Memorial Day was first called Decoration Day, when people decorated the graves of Civil War soldiers.", "Memorial Day became an official federal holiday in 1971 and moved to the last Monday in May.", "The National Moment of Remembrance asks Americans to pause at 3 p.m. local time on Memorial Day."],
        juneteenth: ["Juneteenth marks June 19, 1865, when enslaved people in Galveston, Texas learned they were free.", "Juneteenth became a US federal holiday in 2021.", "The name Juneteenth combines “June” and “nineteenth.”"],
        fathers: ["The first Father’s Day celebration in the US is often credited to Spokane, Washington, in 1910.", "Father’s Day became an official US holiday in 1972.", "In the US, Father’s Day is the third Sunday of June."],
        july4: ["The Declaration of Independence was adopted on July 4, 1776.", "John Adams and Thomas Jefferson both died on July 4, 1826, exactly 50 years after the Declaration.", "Fireworks have been part of Independence Day celebrations since 1777."],
        dogday: ["National Dog Day was founded in 2004 by Colleen Paige to encourage dog adoption.", "Dogs were probably the first animals humans domesticated.", "A dog’s nose print is unique, much like a human fingerprint."],
        labor: ["Labor Day became a US federal holiday in 1894.", "The first Labor Day parade was held in New York City on September 5, 1882.", "Many people see Labor Day as the unofficial end of summer."],
        progday: ["Programmers’ Day is the 256th day of the year, because 256 is 2 to the 8th power, the number of values a byte can hold.", "The word “bug” for a computer error is popularly linked to a moth found in a Harvard computer in 1947.", "Ada Lovelace is often called the first programmer for the algorithm she wrote in the 1840s."],
        halloween: ["Halloween started as the Celtic festival Samhain.", "The first jack-o’-lanterns were carved from turnips in Ireland and Scotland. Pumpkins came later in America.", "Trick-or-treating has roots in old traditions called souling and guising."],
        diwali: ["Diwali is known as the Festival of Lights and celebrates the victory of light over darkness.", "Diwali is celebrated by Hindus, Sikhs, Jains, and some Buddhists.", "People light small clay lamps called diyas during Diwali."],
        veterans: ["Veterans Day is November 11 because fighting in World War I ended on that date in 1918.", "Veterans Day was originally called Armistice Day and was renamed in 1954.", "Memorial Day honors those who died in service, while Veterans Day honors everyone who served."],
        thanksgiving: ["Abraham Lincoln proclaimed a national Thanksgiving holiday in 1863.", "In 1941, Congress made Thanksgiving the fourth Thursday of November.", "The first Macy’s Thanksgiving Day Parade was held in 1924."],
        hanukkah: ["Hanukkah lasts eight nights, and one more candle is lit each night.", "The word Hanukkah means “dedication” in Hebrew.", "Spinning a dreidel is a traditional Hanukkah game."],
        xmaseve: ["In many countries, families celebrate with the main meal and gifts on December 24.", "NORAD has tracked Santa every Christmas Eve since 1955.", "“Silent Night” was first performed on Christmas Eve in 1818."],
        xmas: ["Christmas has been celebrated on December 25 since at least the 4th century.", "The Christmas tree tradition is generally traced back to 16th-century Germany.", "Christmas became a US federal holiday in 1870."],
        nye: ["“Auld Lang Syne,” sung at midnight, is based on a poem by Robert Burns.", "In Spain, people eat 12 grapes at midnight, one for each chime, for good luck.", "The Times Square ball first dropped on December 31, 1907."]
    };

    /* ---------- state ---------- */
    const HOL = { preview: null, filter: 'all', search: '', showHidden: false, cal: null, idx: {} };
    function initState() {
        const d = { fx: true, colors: true, banner: true, intensity: 60, hidden: [], custom: [], notified: {}, lastBurst: '' };
        state.holidays = Object.assign(d, state.holidays || {});
        if (!Array.isArray(state.holidays.hidden)) state.holidays.hidden = [];
        if (!Array.isArray(state.holidays.custom)) state.holidays.custom = [];
        if (!state.holidays.notified || typeof state.holidays.notified !== 'object') state.holidays.notified = {};
        const n = new Date(); HOL.cal = { y: n.getFullYear(), m: n.getMonth() };
        initBot();
    }
    const HS = () => state.holidays;

    /* ---------- holiday math ---------- */
    function forYear(y) {
        const out = [];
        DEFS.forEach(df => {
            const date = df.d(y); if (!date) return;
            out.push({ key: df.id + '_' + ymd(date), id: df.id, name: df.name, e: df.e, cat: df.cat, th: df.th, pre: df.pre || 0, post: df.post || 0,
                solemn: !!df.solemn, date, greet: df.greet, line: df.line, desc: df.desc, custom: false });
        });
        HS().custom.forEach(c => {
            if (!c.yearly && c.y !== y) return;
            const date = D(y, c.m - 1, c.d);
            out.push({ key: c.id + '_' + ymd(date), id: c.id, name: c.name, e: c.e || '🎉', cat: 'Custom', th: (THEMES[c.th] ? c.th : 'party'), pre: 1, post: 0, solemn: false,
                date, greet: (c.e || '🎉') + ' ' + c.name + '!', line: 'A special day for our community.', desc: c.desc || ('Custom holiday: ' + c.name), custom: true, fxChar: c.fxChar || '', fxOn: !!c.fxOn });
        });
        return out;
    }
    const isHidden = h => !h.custom && HS().hidden.includes(h.id);
    function upcoming(n, includeHidden) {
        const t = today0(), y = t.getFullYear(); let all = [];
        [y, y + 1, y + 2].forEach(yy => { all = all.concat(forYear(yy)); });
        all = all.filter(h => h.date >= t && (includeHidden || !isHidden(h))).sort((a, b) => a.date - b.date);
        return all.slice(0, n);
    }
    function activeHoliday() {
        const t = today0(), y = t.getFullYear(); let best = null;
        [y - 1, y, y + 1].forEach(yy => forYear(yy).forEach(h => {
            if (isHidden(h)) return;
            const diff = daysBetween(t, h.date);
            if (diff <= h.pre && diff >= -h.post) {
                const score = diff === 0 ? -1 : Math.abs(diff);
                if (!best || score < best.score) best = { h, diff, score };
            }
        }));
        return best;
    }
    const whenText = diff => diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff < 60 ? 'in ' + diff + ' days' : 'in ~' + Math.round(diff / 30) + ' mo';

    /* ---------- particle engine ---------- */
    const FX = { cv: null, ctx: null, w: 0, h: 0, dpr: 1, parts: [], spec: null, raf: 0, last: 0, fireT: 1, sig: '' };
    const FX_LAB_KEY = 'projectRexEffectLab_v1';
    const FX_LAB_DEFAULT = { enabled: false, style: 'snow', glyph: '✨', color: '#8b5cf6', amount: 45, speed: 3 };
    let fxLab = (() => { try { return Object.assign({}, FX_LAB_DEFAULT, JSON.parse(localStorage.getItem(FX_LAB_KEY) || '{}')); } catch (_) { return { ...FX_LAB_DEFAULT }; } })();
    function fxLabSave() { try { localStorage.setItem(FX_LAB_KEY, JSON.stringify(fxLab)); } catch (_) {} }
    function fxLabSpec() {
        const amount = Math.max(10, Math.min(100, Number(fxLab.amount) || 45));
        const n = Math.max(8, Math.round(amount * 0.65));
        const color = /^#[0-9a-f]{6}$/i.test(fxLab.color) ? fxLab.color : '#8b5cf6';
        const speed = Math.max(1, Math.min(5, Number(fxLab.speed) || 3));
        const factor = speed / 3;
        if (fxLab.style === 'confetti') return [{ k: 'conf', colors: [color, '#ffd166', '#43a9ff', '#ff6fb0'], n: Math.round(n * 1.15), speed: factor }];
        if (fxLab.style === 'hearts') return [{ k: 'rise', e: ['💖', '💗', '💕', '💘'], n, speed: factor }];
        if (fxLab.style === 'leaves') return [{ k: 'fall', e: ['🍂', '🍁', '🌿', '🍃'], n, speed: factor }];
        if (fxLab.style === 'stars') return [{ k: 'rise', e: ['⭐', '✨', '🌟', '✦'], n, speed: factor }];
        if (fxLab.style === 'bubbles') return [{ k: 'rise', e: ['🫧', '○', '◦'], n, speed: factor }];
        if (fxLab.style === 'glyph') return [{ k: 'glyph', e: [String(fxLab.glyph || '✨').slice(0, 8)], n, speed: factor }];
        return [{ k: 'snow', n: Math.round(n * 1.35), color, speed: factor }];
    }
    function fxLabSyncUI() {
        const set = (id, value) => { const el = document.getElementById(id); if (el) el.value = value; };
        const enabled = document.getElementById('rexFxEnabled'); if (enabled) enabled.checked = !!fxLab.enabled;
        set('rexFxStyle', fxLab.style); set('rexFxGlyph', fxLab.glyph || '✨'); set('rexFxColor', fxLab.color); set('rexFxAmount', fxLab.amount); set('rexFxSpeed', fxLab.speed);
        const amountLabel = document.getElementById('rexFxAmountLabel'); if (amountLabel) amountLabel.textContent = fxLab.amount + '%';
        const speedLabel = document.getElementById('rexFxSpeedLabel'); if (speedLabel) speedLabel.textContent = ({1:'Very slow',2:'Slow',3:'Normal',4:'Fast',5:'Very fast'})[fxLab.speed] || 'Normal';
    }
    window.rexFxUpdate = (key, value) => {
        if (!(key in fxLab)) return;
        if (key === 'enabled') fxLab[key] = !!value;
        else if (key === 'amount' || key === 'speed') fxLab[key] = Number(value);
        else fxLab[key] = value;
        fxLabSave(); fxLabSyncUI(); applySeason();
    };
    window.rexFxPreview = () => { fxLab.enabled = true; fxLabSave(); fxLabSyncUI(); applySeason(); toast('Your screen effect is previewing. Turn it off any time in Effect Lab.', 'success'); };
    window.rexFxReset = () => { fxLab = { ...FX_LAB_DEFAULT }; fxLabSave(); fxLabSyncUI(); applySeason(); toast('Effect Lab settings reset.', 'info'); };
    function fxEnsure() {
        if (FX.cv) return;
        const c = document.createElement('canvas'); c.id = 'holidayFx'; c.setAttribute('aria-hidden', 'true');
        document.body.appendChild(c); FX.cv = c; FX.ctx = c.getContext('2d'); fxResize();
        window.addEventListener('resize', fxResize);
        document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(FX.raf); FX.raf = 0; } else fxKick(); });
    }
    function fxResize() {
        FX.dpr = Math.min(window.devicePixelRatio || 1, 2); FX.w = window.innerWidth; FX.h = window.innerHeight;
        FX.cv.width = FX.w * FX.dpr; FX.cv.height = FX.h * FX.dpr; FX.ctx.setTransform(FX.dpr, 0, 0, FX.dpr, 0, 0);
    }
    function mkAmbient(s, spread) {
        const p = { amb: true, k: s.k, x: rnd(0, FX.w), y: spread ? rnd(-20, FX.h) : rnd(-50, -10), rot: rnd(0, 6.28), vr: rnd(-1.5, 1.5), ph: rnd(0, 6.28), t: 0, layer: s };
        if (s.k === 'snow') { p.r = rnd(1.6, 4.2); p.vy = rnd(25, 60) * (s.speed || 1); p.vx = rnd(-8, 8) * (s.speed || 1); p.customColor = s.color || null; }
        else if (s.k === 'fall' || s.k === 'glyph') { p.e = pick(s.e); p.sz = rnd(16, 28); p.vy = rnd(28, 65) * (s.speed || 1); p.vx = rnd(-10, 10) * (s.speed || 1); }
        else if (s.k === 'rise') { p.e = pick(s.e); p.sz = rnd(14, 26); p.y = spread ? rnd(0, FX.h) : FX.h + 30; p.vy = -rnd(25, 60) * (s.speed || 1); p.vx = rnd(-10, 10) * (s.speed || 1); }
        else if (s.k === 'conf') { p.c = pick(s.colors); p.cw = rnd(6, 10); p.ch = rnd(3, 6); p.vy = rnd(40, 90) * (s.speed || 1); p.vx = rnd(-20, 20) * (s.speed || 1); p.vy = rnd(40, 90); p.vx = rnd(-20, 20); }
        return p;
    }
    const scale = () => (HS().intensity || 60) / 100 * (window.innerWidth < 700 ? 0.6 : 1);
    function fxSeed() {
        FX.parts = FX.parts.filter(p => !p.amb);
        if (!FX.spec) return;
        FX.spec.forEach(s => { if (s.k === 'fire') return; const n = Math.max(3, Math.round((s.n || 20) * scale())); for (let i = 0; i < n; i++) FX.parts.push(mkAmbient(s, true)); });
    }
    function spawnFirework(x, y, colors) {
        const col = pick(colors), n = 34;
        for (let i = 0; i < n; i++) { const a = (i / n) * 6.283 + rnd(-.1, .1), sp = rnd(70, 190);
            FX.parts.push({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1.25, max: 1.25, c: col }); }
    }
    function spawnConfetti(x, y) {
        const cols = ['#ff6fb0', '#a05cff', '#ffd23f', '#17d3a4', '#43a9ff', '#ff8a3d'];
        for (let i = 0; i < 120; i++) FX.parts.push({ k: 'conf', burst: true, x, y, vx: rnd(-280, 280), vy: rnd(-460, -120), rot: rnd(0, 6.28), vr: rnd(-8, 8),
            c: pick(cols), cw: rnd(6, 10), ch: rnd(3, 6), life: rnd(1.8, 3), ph: rnd(0, 6.28), t: 0 });
    }
    function fxKick() { if (!FX.raf && !document.hidden && (FX.spec || FX.parts.length)) { FX.last = performance.now(); FX.raf = requestAnimationFrame(fxLoop); } }
    function fxLoop(now) {
        const dt = Math.min(.05, (now - FX.last) / 1000 || .016); FX.last = now;
        const ctx = FX.ctx, w = FX.w, h = FX.h;
        ctx.clearRect(0, 0, w, h);
        if (FX.spec) { const fl = FX.spec.find(s => s.k === 'fire');
            if (fl) { FX.fireT -= dt; if (FX.fireT <= 0) { FX.fireT = rnd(.9, 2.2) / Math.max(.4, scale()); spawnFirework(rnd(w * .1, w * .9), rnd(h * .1, h * .5), fl.colors); } } }
        const keep = [];
        for (const p of FX.parts) {
            if (p.k === 'spark') {
                p.life -= dt; if (p.life <= 0) continue;
                p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.vx *= .99;
                ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 6.283); ctx.fill();
                keep.push(p); continue;
            }
            p.t += dt; p.rot += (p.vr || 0) * dt;
            if (p.burst) {
                p.life -= dt; if (p.life <= 0 || p.y > h + 20) continue;
                p.vy += 520 * dt; p.vx *= .992; p.x += p.vx * dt; p.y += p.vy * dt; ctx.globalAlpha = Math.min(1, p.life);
            } else {
                p.x += (p.vx + Math.sin(p.t * 1.4 + p.ph) * 14) * dt; p.y += p.vy * dt; ctx.globalAlpha = .9;
                if (p.k === 'rise' ? p.y < -40 : p.y > h + 40) { const n = mkAmbient(p.layer, false); Object.assign(p, n); }
            }
            if (p.k === 'snow') { ctx.fillStyle = p.customColor || 'rgba(255,255,255,.95)'; ctx.strokeStyle = p.customColor || 'rgba(120,150,200,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); ctx.stroke(); }
            else if (p.k === 'conf') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.t * 4 + p.ph)); ctx.fillStyle = p.c; ctx.fillRect(-p.cw / 2, -p.ch / 2, p.cw, p.ch); ctx.restore(); }
            else { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot * .3); ctx.font = p.sz + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.e, 0, 0); ctx.restore(); }
            keep.push(p);
        }
        ctx.globalAlpha = 1; FX.parts = keep;
        if (!FX.spec && !FX.parts.length) { FX.raf = 0; ctx.clearRect(0, 0, w, h); return; }
        FX.raf = requestAnimationFrame(fxLoop);
    }
    function burst(x, y) {
        if (reduced()) return;
        fxEnsure(); spawnConfetti(x == null ? FX.w / 2 : x, y == null ? FX.h * .35 : y); fxKick();
    }

    /* ---------- apply seasonal theme ---------- */
    function currentTheme() {
        const act = activeHoliday();
        if (HOL.preview) return { key: HOL.preview, act, solemn: false, preview: true };
        if (act) return { key: act.h.th, act, solemn: act.h.solemn, preview: false };
        return { key: null, act: null, solemn: false, preview: false };
    }
    function applySeason() {
        const hs = HS(), cur = currentTheme(), th = cur.key ? THEMES[cur.key] : null, body = document.body, st = body.style;
        [...body.classList].forEach(c => { if (c.indexOf('holiday-') === 0) body.classList.remove(c); });
        ['--rex-accent', '--rex-accent-2', '--accent-grad', '--blue', '--blue-soft', '--hol-a', '--hol-b'].forEach(p => st.removeProperty(p));
        const meta = document.querySelector('meta[name="theme-color"]');
        if (th && (hs.colors || cur.preview)) {
            body.classList.add('holiday-' + cur.key);
            st.setProperty('--rex-accent', th.c[1]); st.setProperty('--rex-accent-2', th.c[0]);
            st.setProperty('--accent-grad', 'linear-gradient(135deg, ' + th.c[0] + ' 0%, ' + th.c[1] + ' 70%, ' + th.c[2] + ' 170%)');
            st.setProperty('--blue', th.c[1]); st.setProperty('--blue-soft', 'color-mix(in srgb, ' + th.c[1] + ' 15%, transparent)');
            st.setProperty('--hol-a', th.c[0]); st.setProperty('--hol-b', th.c[2]);
            if (meta) meta.setAttribute('content', th.c[1]);
        } else if (meta) meta.setAttribute('content', '#5b6ef5');
        // effects
        const fxOn = !!th && th.fx.length && (hs.fx || cur.preview) && !reduced() && !cur.solemn;
        const labOn = !!fxLab.enabled && !reduced();
        const holidayGlyphOn = !!(cur.act && cur.act.custom && cur.act.fxOn && cur.act.fxChar) && !reduced() && !cur.solemn;
        const chosenSpec = labOn ? fxLabSpec() : (holidayGlyphOn ? [{ k: 'glyph', e: [String(cur.act.fxChar).slice(0, 8)], n: 35, speed: 1 }] : (fxOn ? th.fx : null));
        const sig = (labOn ? 'lab:' + JSON.stringify(fxLab) : (holidayGlyphOn ? 'holiday-glyph:' + cur.act.key + ':' + cur.act.fxChar : (fxOn ? cur.key : 'off'))) + '|' + hs.intensity;
        if (sig !== FX.sig) {
            FX.sig = sig; fxEnsure(); FX.spec = chosenSpec; FX.parts = FX.parts.filter(p => !p.amb); fxSeed(); fxKick();
        }
    }

    /* ---------- compose ---------- */
    function compose(h, mode) {
        const th = THEMES[h.th] || THEMES.party, diff = daysBetween(today0(), h.date);
        let content, title, desc;
        if (mode === 'count' && diff > 0) {
            content = h.e + ' **' + h.name + (diff === 1 ? ' is tomorrow!**' : ' is in ' + diff + ' days!**');
            title = h.e + ' ' + diff + ' day' + (diff === 1 ? '' : 's') + ' until ' + h.name;
            desc = 'Mark your calendar — ' + fmtDate(h.date) + '.';
        } else { content = h.e + ' **' + h.greet + '**'; title = h.e + ' ' + h.name; desc = h.line; }
        loadBuilder({ content, username: 'Project Rex', embedOn: true, embed: { title, description: desc, color: th.c[1], fields: [] }, buttons: [] });
        addTL('template', 'Holiday message: ' + h.name); save(); showView('builder'); toast(h.e + ' ' + h.name + ' message loaded', 'success');
    }
    window.holCompose = (key, mode) => { const h = HOL.idx[key]; if (h) compose(h, mode); };

    /* ---------- Home banner + greeting ---------- */
    function homeRefresh() {
        const hs = HS(), b = $h('holidayBanner'), g = $h('homeGreeting');
        const hr = new Date().getHours(), tod = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
        const act = activeHoliday(), nxt = upcoming(1, false)[0];
        if (g) g.textContent = (act && act.diff === 0) ? '“' + act.h.greet + ' Ready to work?”' : '“' + tod + '! Ready to work?”';
        if (!b) return;
        if (!hs.banner || !nxt) { b.classList.add('hidden'); return; }
        const diff = daysBetween(today0(), nxt.date); HOL.idx[nxt.key] = nxt;
        b.classList.remove('hidden');
        b.innerHTML = '<div class="hol-b-emoji">' + esc(nxt.e) + '</div><div class="hol-b-main"><strong>' +
            (diff === 0 ? esc(nxt.greet) : esc(nxt.name) + ' is ' + whenText(diff)) + '</strong><small>' +
            esc(fmtDate(nxt.date)) + (diff === 0 ? ' · ' + esc(nxt.line) : ' · ' + esc(nxt.cat) + ' holiday') + '</small></div>' +
            '<div class="hol-b-actions"><button class="sbtn" onclick="holCompose(\'' + nxt.key + '\',\'' + (diff === 0 ? 'greet' : 'count') + '\')">' +
            (diff === 0 ? '✉️ Send greeting' : '⏳ Countdown post') + '</button><button class="sbtn" onclick="showView(\'holidays\')">All holidays</button></div>';
    }

    /* ---------- Holidays page ---------- */
    function renderHolidays() { renderHero(); renderDashboard(); holStudioUpdatePreview(); renderList(); renderCal(); renderBot(); renderPrefs(); renderCustom(); }
    window.renderHolidays = renderHolidays;

    function renderHero() {
        const el = $h('holHero'); if (!el) return;
        const n = upcoming(1, false)[0];
        if (!n) { el.innerHTML = '<h2>No upcoming holidays</h2><p>Unhide some holidays or add a custom one below.</p>'; return; }
        HOL.idx[n.key] = n; const th = THEMES[n.th] || THEMES.party;
        el.style.setProperty('--hh-grad', 'linear-gradient(135deg,' + th.c[0] + ' 0%,' + th.c[1] + ' 70%,' + th.c[2] + ' 170%)');
        HOL.heroTarget = n.date;
        el.innerHTML = '<div class="ghost">' + esc(n.e) + '</div><h2>' + esc(n.e) + ' ' + esc(n.name) + '</h2><p>' + esc(fmtDate(n.date)) + ' — ' + esc(n.desc || n.line) +
            '</p><div class="hol-count" id="holCount"></div><div class="hol-hero-actions">' +
            '<button class="btn" onclick="holCompose(\'' + n.key + '\',\'greet\')">✉️ Compose greeting</button>' +
            '<button class="btn" onclick="holCompose(\'' + n.key + '\',\'count\')">⏳ Countdown post</button></div>';
        tickCount();
    }
    function renderDashboard() {
        const el = $h('holDashboard'); if (!el) return;
        const t = today0(), next = upcoming(1, false)[0];
        const thisMonth = forYear(t.getFullYear()).filter(h => h.date >= t && h.date.getMonth() === t.getMonth() && !isHidden(h)).length;
        const customCount = HS().custom.length;
        const nextName = next ? next.name : 'No upcoming holidays';
        const nextNote = next ? (daysBetween(t, next.date) === 0 ? 'Celebrate today!' : fmtDate(next.date) + ' · ' + whenText(daysBetween(t, next.date))) : 'Add a custom holiday to get started';
        el.innerHTML = '<div class="hol-stat" data-emoji="🎉"><span class="hol-stat-label">🎯 Next up</span><strong class="hol-stat-value">' + esc(nextName) + '</strong><span class="hol-stat-note">' + esc(nextNote) + '</span></div>' +
            '<div class="hol-stat" data-emoji="🗓️"><span class="hol-stat-label">📅 This month</span><strong class="hol-stat-value">' + thisMonth + ' holiday' + (thisMonth === 1 ? '' : 's') + '</strong><span class="hol-stat-note">Upcoming dates this month</span></div>' +
            '<div class="hol-stat" data-emoji="✨"><span class="hol-stat-label">💖 Your holidays</span><strong class="hol-stat-value">' + customCount + ' custom</strong><span class="hol-stat-note">Personal dates saved in Rex</span></div>';
    }

    function tickCount() {
        const box = $h('holCount'); const v = $h('view-holidays');
        if (!box || !v || !v.classList.contains('active') || !HOL.heroTarget) return;
        const ms = HOL.heroTarget - new Date();
        if (ms <= 0) { box.innerHTML = '<div class="hol-cbox"><b>🎉</b><small>It’s today!</small></div>'; return; }
        const d = Math.floor(ms / DAY), hh = Math.floor(ms % DAY / 3600000), mm = Math.floor(ms % 3600000 / 60000), ss = Math.floor(ms % 60000 / 1000);
        box.innerHTML = [[d, 'Days'], [hh, 'Hours'], [mm, 'Min'], [ss, 'Sec']].map(x => '<div class="hol-cbox"><b>' + String(x[0]).padStart(2, '0') + '</b><small>' + x[1] + '</small></div>').join('');
    }

    function renderList() {
        const hs = HS(); const fl = $h('holFilters'), list = $h('holList'), hb = $h('holHiddenBtn'); if (!list) return;
        fl.innerHTML = ['all', 'US', 'Fun', 'Cultural', 'Custom'].map(f => '<button class="appearance-tab' + (HOL.filter === f ? ' active' : '') + '" onclick="holFilter(\'' + f + '\')">' + (f === 'all' ? 'All' : f) + '</button>').join('');
        const hiddenN = hs.hidden.length; hb.textContent = HOL.showHidden ? '🙈 Hide hidden' : '👁 Show hidden (' + hiddenN + ')'; hb.style.display = hiddenN ? '' : 'none';
        const t = today0();
        const rows = upcoming(120, true).filter(h => (HOL.filter === 'all' || h.cat === HOL.filter) && (HOL.showHidden || !isHidden(h)) && (!HOL.search || (h.name + ' ' + h.cat + ' ' + (h.desc || '')).toLocaleLowerCase().includes(HOL.search))).slice(0, 14);
        if (!rows.length) { list.innerHTML = '<div class="empty" style="padding:24px 8px">' + (HOL.search ? 'No holidays match “' + esc(HOL.search) + '”. Try another search.' : 'Nothing here yet. Try another category or add a custom holiday.') + '</div>'; return; }
        list.innerHTML = rows.map(h => {
            HOL.idx[h.key] = h; const diff = daysBetween(t, h.date), hid = isHidden(h);
            const tipText = esc(h.desc || h.line || 'Holiday');
            return '<div class="hol-row' + (hid ? ' dim' : '') + '"><div class="hol-e">' + esc(h.e) + '</div><div class="hol-info"><strong>' + esc(h.name) + '</strong><small>' +
                esc(fmtDate(h.date)) + ' · ' + esc(h.cat) + (h.solemn ? ' · respectful mode' : '') + '</small></div><span class="hol-when' + (diff === 0 ? ' today' : '') + '">' + whenText(diff) + '</span>' +
                '<div class="hol-acts"><button class="sbtn" title="Compose greeting" onclick="holCompose(\'' + h.key + '\',\'greet\')">✉️</button>' +
                (diff > 0 ? '<button class="sbtn" title="Countdown post" onclick="holCompose(\'' + h.key + '\',\'count\')">⏳</button>' : '') +
                (h.custom ? '' : '<button class="sbtn" title="' + (hid ? 'Show' : 'Hide') + ' this holiday" onclick="holHide(\'' + h.id + '\')">' + (hid ? '👁' : '🙈') + '</button>') +
                '<button class="sbtn" title="' + tipText + '" onclick="holShowTip(\'' + esc(h.key) + '\')">ⓘ</button></div></div>';
        }).join('');
    }
    window.holFilter = f => { HOL.filter = f; renderList(); };
    window.holSetSearch = value => { HOL.search = String(value || '').trim().toLocaleLowerCase(); renderList(); };
    window.holToggleHidden = () => { HOL.showHidden = !HOL.showHidden; renderList(); };
    window.holHide = id => { const hs = HS(), i = hs.hidden.indexOf(id); if (i >= 0) hs.hidden.splice(i, 1); else hs.hidden.push(id); save(); applySeason(); homeRefresh(); renderHolidays(); };
    window.holShowTip = (keyOrText) => {
        const modal = document.getElementById('holidayInfoModal');
        const title = document.getElementById('holidayInfoTitle');
        const body = document.getElementById('holidayInfoText');
        const emoji = document.getElementById('holidayInfoEmoji');
        if (!modal || !title || !body) return;
        // Find the holiday whose description was clicked, without injecting HTML.
        const holiday = (HOL.idx || {})[keyOrText] || Object.values(HOL.idx || {}).find(h => (h.desc || h.line || 'Holiday') === keyOrText);
        const text = holiday ? (holiday.desc || holiday.line || 'Holiday') : keyOrText;
        title.textContent = holiday ? holiday.name : 'About this holiday';
        if (emoji) emoji.textContent = holiday?.e || '🎉';
        body.textContent = text || 'No description is available for this holiday yet.';
        modal.classList.add('show');
        const close = modal.querySelector('button[aria-label="Close holiday information"]');
        if (close) close.focus();
    };
    window.closeHolidayInfo = () => {
        const modal = document.getElementById('holidayInfoModal');
        if (modal) modal.classList.remove('show');
    };
    if (!window.__holidayInfoEscapeBound) {
        window.__holidayInfoEscapeBound = true;
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') window.closeHolidayInfo?.();
        });
    }

    function renderCal() {
        const grid = $h('holCal'); if (!grid || !HOL.cal) return;
        const { y, m } = HOL.cal, t = today0();
        const title = $h('holCalTitle');
        if (title) title.textContent = new Date(y, m, 1).toLocaleDateString([], { month: 'long', year: 'numeric' });
        const map = {};
        forYear(y).filter(h => !isHidden(h) && h.date.getMonth() === m).forEach(h => {
            (map[h.date.getDate()] = map[h.date.getDate()] || []).push(h);
            HOL.idx[h.key] = h;
        });
        const first = new Date(y, m, 1).getDay(), dim = new Date(y, m + 1, 0).getDate();
        let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => '<div class="hol-dow">' + d + '</div>').join('');
        for (let i = 0; i < first; i++) html += '<div class="hol-day out" aria-hidden="true"></div>';
        for (let d = 1; d <= dim; d++) {
            const hs = map[d] || [], isT = t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
            const dateKey = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
            const label = hs.length ? hs.map(h => h.name).join(', ') : 'No holidays';
            html += '<button type="button" class="hol-day' + (hs.length ? ' has' : '') + (isT ? ' today' : '') + '" data-date="' + dateKey + '" aria-label="' + esc(new Date(y, m, d).toLocaleDateString([], {month:'long',day:'numeric',year:'numeric'})) + (hs.length ? ': ' + esc(label) : '') + '" aria-pressed="false" onclick="holCalendarDay(\'' + dateKey + '\')"><span class="hol-day-num">' + d + '</span><span class="em">' + hs.slice(0, 3).map(h => esc(h.e)).join('') + (hs.length > 3 ? '<small>+' + (hs.length - 3) + '</small>' : '') + '</span></button>';
        }
        grid.innerHTML = html;
        const all = Object.keys(map).map(Number).sort((a, b) => a - b).flatMap(d => map[d]);
        const legend = $h('holLegend');
        if (legend) legend.innerHTML = all.length ? '<strong>This month</strong>' + all.map(h => '<button type="button" class="hol-legend-item" onclick="holCalendarDay(\'' + ymd(h.date) + '\')"><span>' + esc(h.e) + '</span><span><b>' + esc(h.name) + '</b><small>' + esc(fmtDate(h.date, true)) + (h.custom ? ' · Custom' : '') + '</small></span><span aria-hidden="true">›</span></button>').join('') : '<div class="hol-legend-empty">No visible holidays this month. Try another month or unhide a holiday.</div>';
        const selected = $h('holCalSelected');
        if (selected && selected.dataset.date) {
            const selectedDate = selected.dataset.date;
            const stillValid = all.some(h => ymd(h.date) === selectedDate);
            if (stillValid) window.holCalendarDay(selectedDate, true);
            else { selected.dataset.date = ''; selected.innerHTML = '<div class="hol-selected-empty">Select a day to see its holiday details.</div>'; }
        }
    }
    window.holCalendarDay = (dateKey, quiet) => {
        const selected = $h('holCalSelected'); if (!selected) return;
        const parts = String(dateKey || '').split('-').map(Number);
        if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return;
        const [y, m, d] = parts;
        const date = new Date(y, m - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return;
        const hs = forYear(y).filter(h => ymd(h.date) === dateKey && !isHidden(h));
        HOL.cal = { y, m: m - 1 };
        $h('holCal')?.querySelectorAll('.hol-day[data-date]').forEach(btn => {
            const active = btn.dataset.date === dateKey;
            btn.classList.toggle('selected', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        selected.dataset.date = dateKey;
        selected.innerHTML = '<div class="hol-selected-heading"><span>📅</span><div><strong>' + esc(date.toLocaleDateString([], {weekday:'long',month:'long',day:'numeric',year:'numeric'})) + '</strong><small>' + (hs.length ? hs.length + ' holiday' + (hs.length === 1 ? '' : 's') : 'No visible holidays on this day') + '</small></div></div>' +
            (hs.length ? hs.map(h => {
                HOL.idx[h.key] = h;
                return '<article class="hol-selected-item"><span class="hol-selected-emoji">' + esc(h.e) + '</span><div class="hol-selected-copy"><strong>' + esc(h.name) + '</strong><small>' + esc(h.cat) + (h.solemn ? ' · Respectful mode' : '') + '</small><p>' + esc(h.desc || h.line || 'A special day to remember.') + '</p><div class="hol-selected-actions"><button type="button" class="sbtn" onclick="holCompose(\'' + h.key + '\',\'greet\')">✉️ Greeting</button>' + (daysBetween(today0(), h.date) > 0 ? '<button type="button" class="sbtn" onclick="holCompose(\'' + h.key + '\',\'count\')">⏳ Countdown</button>' : '') + '</div></div></article>';
            }).join('') : '<p class="hol-selected-empty">There are no visible holidays on this date. Choose another day or add a custom holiday below.</p>');
        if (!quiet) {
            const btn = $h('holCal')?.querySelector('[data-date="' + dateKey + '"]');
            btn?.scrollIntoView?.({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
        }
    };
    window.holCalNav = dir => {
        if (dir === 0) { const n = new Date(); HOL.cal = { y: n.getFullYear(), m: n.getMonth() }; }
        else { let { y, m } = HOL.cal; m += dir; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } HOL.cal = { y, m }; }
        renderCal();
    };

    function renderPrefs() {
        const hs = HS(); if (!$h('holFx')) return;
        $h('holFx').checked = !!hs.fx; $h('holColors').checked = !!hs.colors; $h('holBanner').checked = !!hs.banner; $h('holIntensity').value = hs.intensity;
        const cur = currentTheme(), nxt = upcoming(1, false)[0]; let s;
        if (HOL.preview) s = '✨ Previewing the ' + THEMES[HOL.preview].name + ' theme.';
        else if (cur.act) s = cur.act.h.e + ' ' + cur.act.h.name + ' season is on' + (cur.solemn ? ' — respectful mode (colors only, no confetti).' : '.');
        else s = 'No holiday season right now' + (nxt ? ' — next up: ' + nxt.e + ' ' + nxt.name + ' ' + whenText(daysBetween(today0(), nxt.date)) + '.' : '.');
        if (reduced()) s += ' (Animations are off in your system or Appearance settings, so effects are paused.)';
        $h('holStatus').textContent = s;
        $h('holStop').style.display = HOL.preview ? '' : 'none';
        $h('holThemes').innerHTML = Object.keys(THEMES).map(k => { const t = THEMES[k];
            return '<button class="hol-theme' + (HOL.preview === k ? ' on' : '') + '" onclick="holPreview(\'' + k + '\')"><span>' + t.e + ' ' + t.name + '</span><i style="background:linear-gradient(90deg,' + t.c[0] + ',' + t.c[1] + ',' + t.c[2] + ')"></i></button>'; }).join('');
    }
    fxLabSyncUI();
    window.holSet = (k, v) => { HS()[k] = !!v; save(); applySeason(); homeRefresh(); renderPrefs(); };
    window.holIntensity = v => { HS().intensity = Math.max(10, Math.min(100, Number(v) || 60)); save(); applySeason(); };
    window.holPreview = k => {
        if (HOL.preview === k) { window.holStopPreview(); return; }
        HOL.preview = k; applySeason(); renderPrefs(); toast('Previewing ' + THEMES[k].name + ' — tap Stop preview to go back', 'info');
        if (reduced()) toast('Animations are off, so only colors are previewed', 'info');
    };
    window.holStopPreview = () => { HOL.preview = null; applySeason(); renderPrefs(); };
    window.holBurst = () => burst();

    window.holStudioUpdatePreview = function () {
        const name = ($h('holCName')?.value || '').trim() || 'Your holiday name';
        const emoji = ($h('holCEmoji')?.value || '🎉').trim() || '🎉';
        const desc = ($h('holCDesc')?.value || '').trim() || 'Your description will appear here as you type.';
        const val = $h('holCDate')?.value, key = $h('holCTheme')?.value || 'party', th = THEMES[key] || THEMES.party;
        if ($h('holStudioPreviewEmoji')) $h('holStudioPreviewEmoji').textContent = emoji;
        if ($h('holStudioPreviewName')) $h('holStudioPreviewName').textContent = name;
        if ($h('holStudioPreviewDesc')) $h('holStudioPreviewDesc').textContent = desc;
        if ($h('holStudioPreviewDate')) $h('holStudioPreviewDate').textContent = val ? new Date(val + 'T12:00:00').toLocaleDateString([], {weekday:'long',month:'long',day:'numeric',year:'numeric'}) + (($h('holCYearly')?.checked) ? ' · Every year' : ' · One-time') : 'Choose a date to preview it';
        const glyph = ($h('holCFxChar')?.value || '').trim(); const fxBadge = $h('holStudioPreviewFx'); if (fxBadge) { fxBadge.textContent = glyph || '✨'; fxBadge.hidden = !glyph || !$h('holCFxOn')?.checked; }
        const box = $h('holStudioPreview'); if (box) { box.style.setProperty('--studio-a', th.c[0]); box.style.setProperty('--studio-b', th.c[1]); box.style.setProperty('--studio-c', th.c[2]); }
    };

    function renderCustom() {
        const el = $h('holCustomList'); if (!el) return; const list = HS().custom;
        el.innerHTML = list.length ? list.map(c => '<div class="hol-row"><div class="hol-e">' + esc(c.e || '🎉') + '</div><div class="hol-info"><strong>' + esc(c.name) + '</strong><small>' +
            esc(String(c.m).padStart(2, '0') + '/' + String(c.d).padStart(2, '0') + (c.yearly ? ' · every year' : ' · ' + c.y) + ' · ' + ((THEMES[c.th] || THEMES.party).name)) + '</small>' + (c.desc ? '<small>' + esc(c.desc) + '</small>' : '') + '</div><button class="sbtn danger" onclick="holDelCustom(\'' + c.id + '\')">Delete</button></div>').join('')
            : '<div class="empty" style="padding:18px 8px">No custom holidays yet — add a birthday, launch day, or anything worth celebrating.</div>';
    }
    window.holAddCustom = () => {
        const name = $h('holCName').value.trim(), val = $h('holCDate').value, e = ($h('holCEmoji').value || '🎉').trim();
        if (!name) { toast('Give your holiday a name', 'error'); return; } if (!val) { toast('Pick a date', 'error'); return; }
        const p = val.split('-').map(Number);
        HS().custom.push({ id: 'c' + Date.now().toString(36), name, e, y: p[0], m: p[1], d: p[2], yearly: $h('holCYearly').checked, desc: ($h('holCDesc')?.value || '').trim() || 'A custom holiday you added.', th: $h('holCTheme')?.value || 'party', fxChar: ($h('holCFxChar')?.value || '').trim().slice(0, 8), fxOn: !!$h('holCFxOn')?.checked });
        save(); $h('holCName').value = ''; if ($h('holCDesc')) $h('holCDesc').value = ''; if ($h('holCFxChar')) $h('holCFxChar').value = ''; if ($h('holCFxOn')) $h('holCFxOn').checked = false; applySeason(); homeRefresh(); renderHolidays(); toast('Added ' + name, 'success');
    };
    window.holDelCustom = id => { const hs = HS(); hs.custom = hs.custom.filter(c => c.id !== id); save(); applySeason(); homeRefresh(); renderHolidays(); };

    /* ---------- notifications & first-load celebration ---------- */
    function checkNotify() {
        const hs = HS(); let changed = false;
        upcoming(40, false).forEach(h => {
            const diff = daysBetween(today0(), h.date);
            if (diff !== 0 && diff !== 7) return;
            const k = h.key + ':' + diff; if (hs.notified[k]) return; hs.notified[k] = 1; changed = true;
            notify(diff === 0 ? h.e + ' ' + h.greet + ' Want to send a greeting?' : h.e + ' ' + h.name + ' is one week away.', 'info', 'info');
        });
        if (Object.keys(hs.notified).length > 150) { hs.notified = {}; changed = true; }
        const act = activeHoliday(), td = ymd(today0());
        if (act && act.diff === 0 && !act.h.solemn && hs.fx && hs.lastBurst !== td) { hs.lastBurst = td; changed = true; setTimeout(() => burst(), 700); }
        if (changed) save();
    }

    /* ---------- hooks into the existing app ---------- */
    const _renderHome = window.renderHome;
    window.renderHome = function () { _renderHome.apply(this, arguments); homeRefresh(); botAlertRefresh(); };
    const _randomRex = window.randomRex;
    window.randomRex = function () {
        const act = activeHoliday();
        if (act && Math.random() < .5) { toast('🐶 Rex says: ' + act.h.greet, 'info'); burst(); return; }
        _randomRex.apply(this, arguments);
    };
    BUILTIN.holiday = { name: '🎉 Holiday Greeting', cat: 'Event', message: '🎉 **Happy Holidays from Project Rex!**', title: '🎉 Happy Holidays',
        description: 'Wishing everyone a safe, warm, and happy holiday!', color: '#ff6fb0' };
    COMMANDS.push(
        { name: 'Open Holidays', run: () => showView('holidays') },
        { name: 'Compose Next Holiday Greeting', run: () => { const n = upcoming(1, false)[0]; if (n) compose(n, 'greet'); } },
        { name: 'Toggle Holiday Effects', run: () => { window.holSet('fx', !HS().fx); toast('Holiday effects ' + (HS().fx ? 'on' : 'off'), 'info'); } },
        { name: 'Confetti 🎉', run: () => burst() }
    );
    const rexAv = document.querySelector('.home-rex');
    if (rexAv) { rexAv.style.cursor = 'pointer'; rexAv.title = 'Tap Rex!'; rexAv.addEventListener('click', e => { const r = e.target.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); }); }

    /* ---------- Holiday Bot (v9.5.2): auto-posts "X is in N days" to a Discord webhook ---------- */
    function initBot() {
        const d = { enabled: false, whId: '', autoDone: false, mode: 'daily', window: 30, days: [30, 14, 7, 3, 1, 0], cats: ['US', 'Fun', 'Cultural', 'Custom'],
            style: 'plain', mention: '@here', mentionSet: true, bar: true, streak: true, trivia: true, digest: true, digestDay: 1, digestCount: 4, time: '09:00', sent: {}, retryAt: {}, log: [] };
        const b = Object.assign(d, HS().bot || {});
        if (!b.mentionSet) { b.mention = '@here'; b.mentionSet = true; } // v9.5.3: one-time switch to @here by default
        ['days', 'cats', 'log'].forEach(k => { if (!Array.isArray(b[k])) b[k] = d[k]; });
        ['sent', 'retryAt'].forEach(k => { if (!b[k] || typeof b[k] !== 'object') b[k] = {}; });
        HS().bot = b;
    }
    const BOT = () => HS().bot;
    const allWebhooks = () => { const out = []; state.workspaces.forEach(W => W.webhooks.forEach(wh => out.push({ W, wh }))); return out; };
    const findWH = () => allWebhooks().find(x => x.wh.id === BOT().whId) || null;
    function botAutoLink() {
        const b = BOT(); if (b.whId || b.autoDone) return;
        const m = allWebhooks().find(x => /holiday/i.test(x.wh.name));
        if (m) { b.whId = m.wh.id; b.enabled = true; b.autoDone = true; save(); notify('🤖 Holiday Bot linked to “' + m.wh.name + '” and turned on.', 'info', 'info'); }
    }
    const shortName = h => h.name.replace(/\s*\(.*?\)/g, '');
    function botMessage(h, diff) {
        const b = BOT(), sn = shortName(h), th = THEMES[h.th] || THEMES.party;
        const line = diff === 0 ? h.e + ' **' + h.greet + '**' : diff === 1 ? h.e + ' **' + sn + ' is tomorrow!**' : h.e + ' **' + sn + ' is in ' + diff + ' days!**';
        // progress bar + streak (v9.5.4)
        const daily = b.mode === 'daily', total = daily ? Math.max(1, b.window) : Math.max(1, ...(b.days.length ? b.days : [30]));
        const filled = Math.max(0, Math.min(10, Math.round((total - Math.max(0, diff)) / total * 10)));
        const bar = '▓'.repeat(filled) + '░'.repeat(10 - filled);
        const day = total - diff + 1, extras = [];
        if (b.bar) extras.push(bar);
        if (b.streak && daily) {
            if (diff === 0) extras.push('Countdown complete! 🎉');
            else if (day >= 1) extras.push('Day ' + day + ' of the ' + sn + ' countdown!' + (day % 7 === 0 ? ' 🔥' : ''));
        }
        let fact = '';
        if (b.trivia) { const fs = FACTS[h.id]; if (fs && fs.length) { const n = fs.length, i0 = daily ? total - diff : diff; fact = fs[((i0 % n) + n) % n]; } }
        const payload = { username: 'Holiday Bot', content: (b.mention ? b.mention + ' ' : '') + line + (extras.length ? '\n' + extras.join(' · ') : '') + (fact ? '\n💡 ' + fact : '') };
        if (b.style === 'embed') payload.embeds = [{ title: h.e + ' ' + sn,
            description: diff === 0 ? h.line : '**' + diff + ' day' + (diff === 1 ? '' : 's') + '** to go — ' + fmtDate(h.date) + '.',
            color: parseInt(th.c[1].slice(1), 16) }];
        return payload;
    }
    async function botDeliver(payload, tlText, manual, logText) {
        const f = findWH();
        if (!f) { if (manual) toast('Pick a webhook for Holiday Bot first', 'error'); return false; }
        const plain = logText || payload.content.replace(/\*\*/g, '').replace(/\n/g, ' ');
        try {
            const res = await fetch(f.wh.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('Discord replied HTTP ' + res.status);
            f.W.sent++; trackDay();
            f.W.history.unshift({ id: String(Date.now()), message: '(holiday bot) ' + plain.slice(0, 100), webhookName: f.wh.name, time: new Date().toLocaleString(), ok: true });
            f.W.history = f.W.history.slice(0, 200);
            addTL('sent', 'Holiday Bot → ' + f.wh.name + ': ' + tlText);
            BOT().log.unshift({ t: Date.now(), text: plain, ok: true }); BOT().log = BOT().log.slice(0, 8);
            if (manual) toast('Holiday Bot message sent! 🚀', 'success');
            return true;
        } catch (e) {
            f.W.failed++; addTL('fail', 'Holiday Bot send failed');
            BOT().log.unshift({ t: Date.now(), text: 'Failed: ' + (e.message || 'network error'), ok: false }); BOT().log = BOT().log.slice(0, 8);
            notify('Holiday Bot couldn’t send: ' + (e.message || 'network error'), 'error');
            if (manual) toast('Holiday Bot failed: ' + (e.message || 'network error'), 'error');
            return false;
        } finally { save(); }
    }
    const botPost = (h, diff, manual) => botDeliver(botMessage(h, diff), shortName(h) + (diff === 0 ? ' (today)' : ' in ' + diff + 'd'), manual);
    function botDigestPayload() {
        const b = BOT(), t = today0(), list = botMatching(80).slice(0, Math.max(1, Math.min(6, b.digestCount || 4)));
        if (!list.length) return null;
        const lines = list.map(h => { const d = daysBetween(t, h.date); return h.e + ' **' + shortName(h) + '** — ' + fmtDate(h.date) + ' · ' + (d === 0 ? 'today!' : d === 1 ? 'tomorrow' : 'in ' + d + ' days'); });
        const header = '📅 **Holiday digest — coming up next**', ping = b.mention ? b.mention + ' ' : '';
        if (b.style === 'embed') return { username: 'Holiday Bot', content: ping + header, embeds: [{ title: '📅 Next ' + list.length + ' holidays', description: lines.join('\n'), color: parseInt((THEMES[list[0].th] || THEMES.party).c[1].slice(1), 16) }] };
        return { username: 'Holiday Bot', content: ping + header + '\n' + lines.join('\n') };
    }
    async function botPostDigest(manual) {
        const p = botDigestPayload(); if (!p) { if (manual) toast('No upcoming holidays for the digest', 'error'); return false; }
        const n = (p.embeds ? p.embeds[0].description : p.content).split('\n').filter(l => l.includes('**')).length;
        return botDeliver(p, 'weekly digest', manual, '📅 Weekly digest (' + n + ' holidays)');
    }
    function botMatching(n) { return upcoming(n || 80, false).filter(h => BOT().cats.includes(h.cat)); }
    function botExpected() {
        const b = BOT(), t = today0(), list = botMatching(80), out = [];
        if (b.mode === 'daily') { const h = list[0]; if (h) { const diff = daysBetween(t, h.date); if (diff <= b.window) out.push({ h, diff }); } }
        else list.forEach(h => { const diff = daysBetween(t, h.date); if (b.days.includes(diff)) out.push({ h, diff }); });
        return out.map(x => { const k = x.h.key + ':' + x.diff; x.k = k; x.state = b.sent[k] ? 'sent' : (b.retryAt[k] > Date.now() ? 'failed' : 'pending'); return x; });
    }
    const botDue = () => botExpected().filter(x => x.state === 'pending');
    function botPostMins() { const tp = (BOT().time || '09:00').split(':').map(Number); return tp[0] * 60 + tp[1]; }
    const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    function botDigestInfo() {
        const b = BOT(); if (!b.digest) return null;
        const t = today0(), k = 'digest:' + ymd(t);
        return { k, isDay: t.getDay() === b.digestDay, state: b.sent[k] ? 'sent' : (b.retryAt[k] > Date.now() ? 'failed' : 'pending') };
    }
    function botAttention() {
        const b = BOT(); if (!b || !b.enabled || !findWH()) return null;
        const items = botExpected().filter(x => x.state !== 'sent'), di = botDigestInfo();
        if (di && di.isDay && di.state !== 'sent') items.push({ digest: true, state: di.state, k: di.k });
        if (!items.length) return null;
        const failed = items.some(x => x.state === 'failed'), n = new Date(), late = n.getHours() * 60 + n.getMinutes() >= botPostMins() + 2;
        if (!failed && !late) return null;
        return { items, reason: failed ? 'failed' : state.settings.schedulingPaused ? 'paused' : 'late' };
    }
    function botAlertRefresh() {
        const el = $h('botAlert'); if (!el || !HS() || !HS().bot) return;
        const a = botAttention(); if (!a) { el.classList.add('hidden'); return; }
        const sn = a.items.map(x => x.digest ? 'Weekly digest' : shortName(x.h)).join(', ');
        const why = a.reason === 'failed' ? 'Holiday Bot tried to post but Discord didn’t accept it' : a.reason === 'paused' ? 'Scheduling is paused, so Holiday Bot hasn’t posted' : 'Holiday Bot hasn’t posted today’s message yet';
        el.classList.remove('hidden');
        el.innerHTML = '<div class="hol-b-emoji">⚠️</div><div class="hol-b-main"><strong>' + esc(why) + '</strong><small>' + esc(sn) + ' · you can send it yourself right now.</small></div>' +
            '<div class="hol-b-actions"><button class="sbtn" onclick="botSendToday()">📤 Send it now</button><button class="sbtn" onclick="showView(\'holidays\')">Open Holiday Bot</button></div>';
    }
    async function botTick() {
        const b = BOT(); if (!b.enabled || HOL.botBusy || state.settings.schedulingPaused || !findWH()) return;
        const now = new Date(); if (now.getHours() * 60 + now.getMinutes() < botPostMins()) return;
        const due = botDue(), di = botDigestInfo(), digestDue = !!(di && di.isDay && di.state === 'pending');
        if (!due.length && !digestDue) return;
        HOL.botBusy = true;
        try {
            for (const x of due) {
                if (await botPost(x.h, x.diff, false)) b.sent[x.k] = Date.now(); else b.retryAt[x.k] = Date.now() + 30 * 60000;
            }
            if (digestDue) { if (await botPostDigest(false)) b.sent[di.k] = Date.now(); else b.retryAt[di.k] = Date.now() + 30 * 60000; }
            if (Object.keys(b.sent).length > 300) b.sent = {};
        } finally { HOL.botBusy = false; save(); renderBot(); botAlertRefresh(); }
    }
    function renderBot() {
        const b = BOT(); if (!$h('botEnabled')) return;
        botAutoLink();
        const sel = $h('botWh'), list = allWebhooks(), multi = state.workspaces.length > 1;
        sel.innerHTML = '<option value="">— choose a webhook —</option>' + list.map(x => '<option value="' + esc(x.wh.id) + '">' + esc(x.wh.name) + (multi ? ' · ' + esc(x.W.name) : '') + '</option>').join('');
        sel.value = b.whId || '';
        $h('botEnabled').checked = !!b.enabled; $h('botMode').value = b.mode; $h('botWindow').value = b.window; $h('botStyle').value = b.style; $h('botMention').value = b.mention; $h('botTime').value = b.time; $h('botBar').checked = !!b.bar; $h('botTrivia').checked = !!b.trivia; $h('botDigest').checked = !!b.digest; $h('botDigestDay').value = String(b.digestDay); $h('botDigestCount').value = String(b.digestCount); $h('botStreak').checked = !!b.streak; $h('botStreakRow').style.display = b.mode === 'daily' ? '' : 'none';
        $h('botWindowRow').style.display = b.mode === 'daily' ? '' : 'none'; $h('botDaysRow').style.display = b.mode === 'milestones' ? '' : 'none';
        $h('botDays').innerHTML = [30, 14, 7, 3, 1, 0].map(n => '<button class="appearance-tab' + (b.days.includes(n) ? ' active' : '') + '" onclick="botToggleDay(' + n + ')">' + (n === 0 ? 'Day of' : n + 'd before') + '</button>').join('');
        $h('botCats').innerHTML = ['US', 'Fun', 'Cultural', 'Custom'].map(c => '<button class="appearance-tab' + (b.cats.includes(c) ? ' active' : '') + '" onclick="botToggleCat(\'' + c + '\')">' + c + '</button>').join('');
        const f = findWH(), nxt = botMatching(1)[0];
        let st;
        if (!f) st = 'No webhook chosen yet. Pick your “Holiday Bot” webhook below' + (list.length ? '.' : ' (add it in Webhooks first).');
        else if (!b.enabled) st = 'Holiday Bot is OFF. It will post to “' + f.wh.name + '” when you turn it on.';
        else st = '🟢 On — posts to “' + f.wh.name + '” around ' + b.time + ' while Project Rex is open.';
        $h('botStatus').textContent = st;
        $h('botPreview').textContent = nxt ? 'Next message: ' + botMessage(nxt, daysBetween(today0(), nxt.date)).content.replace(/\*\*/g, '') : 'No upcoming holidays match your filters.';
        const ex = botExpected(), late = new Date().getHours() * 60 + new Date().getMinutes() >= botPostMins();
        $h('botToday').innerHTML = ex.length ? ex.map(x => {
            const sn = esc(shortName(x.h)), sentAt = b.sent[x.k] ? new Date(b.sent[x.k]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
            const txt = x.state === 'sent' ? '✅ ' + sn + ' — sent at ' + sentAt : x.state === 'failed' ? '⚠️ ' + sn + ' — didn’t send (will retry)' : late ? '⚠️ ' + sn + ' — not sent yet' : '⏳ ' + sn + ' — scheduled for ' + esc(b.time);
            return '<div>' + txt + '</div>'; }).join('') : '<div>No post is scheduled for today.</div>';
        const di = botDigestInfo(); let ds;
        if (!di) ds = 'Weekly digest is off.';
        else if (di.isDay) { const sentAt = b.sent[di.k] ? new Date(b.sent[di.k]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
            ds = di.state === 'sent' ? '✅ Today’s digest was sent at ' + sentAt : di.state === 'failed' ? '⚠️ Today’s digest didn’t send (will retry)' : late ? '⚠️ Today’s digest hasn’t been sent yet' : '⏳ Today’s digest is scheduled for ' + b.time; }
        else ds = 'Next digest: ' + DOW[b.digestDay] + ' at ' + b.time + '.';
        $h('botDigestStatus').textContent = ds;
        const dp = botDigestPayload(); $h('botDigestPreview').textContent = dp ? (dp.content + (dp.embeds ? '\n' + dp.embeds[0].description : '')).replace(/\*\*/g, '') : 'No upcoming holidays match your filters.';
        botAlertRefresh();
        $h('botLog').innerHTML = b.log.length ? b.log.map(l => '<div class="hol-row"><div class="hol-e">' + (l.ok ? '✅' : '⚠️') + '</div><div class="hol-info"><strong>' + esc(l.text) + '</strong><small>' + esc(new Date(l.t).toLocaleString()) + '</small></div></div>').join('') : '<div class="empty" style="padding:14px 8px">Nothing sent yet.</div>';
    }
    window.botSet = (k, v) => { const b = BOT(); b[k] = k === 'window' ? Math.max(1, Math.min(365, parseInt(v) || 30)) : (k === 'digestDay' || k === 'digestCount') ? parseInt(v) : v; if (k === 'enabled' && v && !findWH()) { b.enabled = false; toast('Choose a webhook first', 'error'); } save(); renderBot(); if (b.enabled) botTick(); };
    window.botToggleDay = n => { const b = BOT(), i = b.days.indexOf(n); if (i >= 0) b.days.splice(i, 1); else b.days.push(n); save(); renderBot(); botTick(); };
    window.botToggleCat = c => { const b = BOT(), i = b.cats.indexOf(c); if (i >= 0) b.cats.splice(i, 1); else b.cats.push(c); save(); renderBot(); };
    window.botSendToday = async () => {
        const f = findWH(); if (!f) { toast('Pick a webhook for Holiday Bot first', 'error'); return; }
        let items = botExpected(); const di = botDigestInfo(), digestPending = !!(di && di.isDay && di.state !== 'sent');
        if (!items.length && !digestPending) { const n = botMatching(1)[0]; if (!n) { toast('No upcoming holiday to send', 'error'); return; } const diff = daysBetween(today0(), n.date); items = [{ h: n, diff, k: n.key + ':' + diff }]; }
        if (state.settings.confirmBeforeSend && !confirm('Send holiday message to "' + f.wh.name + '"?')) return;
        const b = BOT();
        for (const x of items) { if (await botPost(x.h, x.diff, true)) { b.sent[x.k] = Date.now(); delete b.retryAt[x.k]; } }
        if (digestPending) { if (await botPostDigest(true)) { b.sent[di.k] = Date.now(); delete b.retryAt[di.k]; } }
        save(); renderBot(); botAlertRefresh();
    };
    window.botSend = window.botSendToday;
    window.botSendDigest = async () => {
        const f = findWH(); if (!f) { toast('Pick a webhook for Holiday Bot first', 'error'); return; }
        if (state.settings.confirmBeforeSend && !confirm('Send the holiday digest to "' + f.wh.name + '"?')) return;
        const b = BOT(), k = 'digest:' + ymd(today0());
        if (await botPostDigest(true)) { b.sent[k] = Date.now(); delete b.retryAt[k]; }
        save(); renderBot(); botAlertRefresh();
    };

    /* ---------- boot ---------- */
    initState(); botAutoLink(); applySeason(); homeRefresh(); checkNotify();
    setTimeout(botTick, 4000); setTimeout(botAlertRefresh, 500); setInterval(botTick, 60000);
    setInterval(tickCount, 1000);
    setInterval(() => { applySeason(); homeRefresh(); botAlertRefresh(); }, 60000);
})();
