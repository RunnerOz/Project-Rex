/* Project Rex Center V14.1.0 · Story Mode Season Four (The Emberwild) and Season Five (The Moonwood).
   Data only. The shared season engine in 51-story-season2.js reads window.REX_EXTRA_SEASONS and does the rest:
   same rules as Seasons Two and Three (each unlocks when you finish the one before it, counts only time earned after you press Begin, free and local). */
(function () {
  'use strict';
  /* row: [id, emoji, place name, short blurb, scene story, question, A label, A result, A item emoji, A item name, B label, B result, B item emoji, B item name] */
  const build = rows => {
    const scenes = {}, places = [];
    rows.forEach(r => { places.push([r[0], r[1], r[2], r[3]]); scenes[r[0]] = { s: r[4], q: r[5], a: { l: r[6], o: r[7], i: [r[8], r[9]] }, b: { l: r[10], o: r[11], i: [r[12], r[13]] } }; });
    return { places, scenes };
  };

  /* ================= Season Four ================= */
  const S4 = build([
    ['camp', '🏕️', 'Caravan Camp', 'Striped tents, a crackling fire and a camel named Biscuit. Every Season Four journey starts here.', 'Striped tents circle a crackling fire. A camel named Biscuit looks Rex up and down, as if checking its packing list.', 'What does Rex pack?', 'A big water flask', 'Biscuit nods slowly. That is the correct answer.', '🧴', 'Brass Flask', 'A wide hat', 'The sun already looks a little less angry.', '👒', 'Sun Hat'],
    ['dunes', '🏜️', 'Singing Dunes', 'Sand that hums when the wind crosses it. One hour in, the whole desert starts to sing.', 'The dunes hum low notes as the wind crosses them, and every step changes the tune.', 'What does Rex do?', 'Hum along', 'The dunes answer back in harmony. A tiny shell falls out of the sand.', '🐚', 'Dune Shell', 'Slide down the slope', 'Whoosh! Rex lands in a pile of warm, singing sand.', '🏖️', 'Singing Sand Jar'],
    ['oasis', '🌴', 'Mirror Oasis', 'A pool so still it shows two skies. Palm trees nod like old friends.', 'A pool as still as glass sits in the sand, and palm trees lean in to look at themselves.', 'How does Rex rest?', 'Dip paws in the water', 'The water is cool and tastes faintly of mint.', '🌿', 'Oasis Mint', 'Nap under a palm', 'A coconut thumps down right next to Rex. Very polite.', '🥥', 'Lucky Coconut'],
    ['spice', '🌶️', 'Spice Road', 'A road lined with sacks of color and smell. A cook is happy to share a secret.', 'Sacks of red, gold and green spice line the road, and the whole air smells like a warm kitchen.', 'What does Rex buy?', 'A pinch of everything', 'The cook mixes a blend and names it after Rex.', '🧂', 'Rex Blend', 'A sweet red pepper', 'It is mild, bright and a little bit lucky.', '🫑', 'Lucky Pepper'],
    ['canyon', '🪨', 'Redrock Canyon', 'Ten hours in, the canyon walls glow like embers and every shout comes back twice.', 'The canyon walls glow orange. A shout returns three times, each a little kinder than the last.', 'What does Rex call out?', '"Hello!"', 'The canyon says hello back, and a pebble rolls over like a handshake.', '🪨', 'Echo Pebble', '"Thank you!"', 'The echo returns with a tiny ribbon of red stone.', '🎗️', 'Red Ribbon Stone'],
    ['temple', '🏛️', 'Sunken Sun Temple', 'A temple half buried in sand, with a doorway that only opens for patient visitors.', 'A temple climbs out of the sand with its doorway shut. A carved sun above it waits for someone patient.', 'How does Rex enter?', 'Wait for sunrise', 'The sun reaches the doorway and it swings open slowly.', '☀️', 'Sun Medallion', 'Read the carvings', 'The carvings say: "Keep walking." The door opens at once.', '📜', 'Temple Scroll'],
    ['glass', '🪞', 'Glass Sea', 'A dry sea of smooth, shining glass that throws light into every direction.', 'A flat sea of polished glass stretches to the horizon and sends sunlight into Rex\'s eyes.', 'How does Rex cross?', 'Wear the sun hat low', 'Rex strolls across and spots a tiny shard shaped like a star.', '💎', 'Star Shard', 'Slide in socks', 'Rex slides all the way across, then does it again.', '🧦', 'Slider Socks'],
    ['mesa', '🪁', 'Kite Mesa', 'A tall flat hill where the wind never stops and the kites never come down.', 'Hundreds of kites fly on the mesa, each tied to a rock with a name painted on it.', 'What does Rex fly?', 'A red kite', 'It leaps into the sky and tugs like it has somewhere to be.', '🪁', 'Red Kite', 'A tiny paper boat on a string', 'It sails the wind like a ship, and Rex is delighted.', '⛵', 'Wind Boat'],
    ['springs', '♨️', 'Lava Springs', 'Hot pools in warm colors. Stay calm, and everything stays cozy.', 'Steam rises from pools of orange and gold. A sign reads: "Warm, not hot. Mostly."', 'What does Rex do?', 'Soak and relax', 'Every tired muscle sighs. Rex floats out smiling.', '🧖', 'Spring Towel', 'Roast a marshmallow', 'It puffs up perfectly. Rex shares it with a salamander.', '🍡', 'Ember Treat'],
    ['crater', '🌋', 'Emberfall Crater', 'A crater where glowing sparks drift up like fireflies and then fall like slow rain.', 'Sparks float up from the crater and drift down like warm snow. None of them burn.', 'How does Rex look?', 'Catch a spark in a jar', 'It glows steadily, like a very small sunrise.', '🫙', 'Spark Jar', 'Watch from the rim', 'The whole crater twinkles, and Rex stays until the last spark settles.', '🌠', 'Falling Spark Charm'],
    ['nest', '🔥', 'Phoenix Nest', 'A nest of glowing feathers on a mountain top. Seventy-five hours of calm brought Rex here.', 'A nest of glowing feathers sits on a ridge. A young phoenix watches Rex with bright, curious eyes.', 'What does Rex offer?', 'Share some cocoa', 'The phoenix sips and glows a little warmer.', '🪶', 'Phoenix Feather', 'Sit quietly nearby', 'The phoenix tucks in beside Rex, and both of them just breathe.', '🧡', 'Warm Ember'],
    ['heart', '🔥', 'The Heart of Ember', 'One hundred hours of Season Four. A steady fire burns at the center of the world, and it knows your name.', 'At the center of the Emberwild burns a steady, friendly fire. It has been waiting for someone who kept going.', 'What does Rex do with the fire?', 'Carry a little home', 'A single flame fits in a lantern and stays lit for good.', '🏮', 'Ember Lantern', 'Light every camp on the way back', 'One by one, the whole desert glows with Rex\'s kindness.', '🎇', 'Camp Light']
  ]);
  const SEASON4 = {
    n: 4, key: 's4', prev: 3, ico: '🔥', name: 'The Emberwild', tag: 'Rex\'s desert caravan', band: 'st-by',
    deco: [['☀️', 245, 48], ['🐪', 495, 48], ['🌵', 745, 48], ['🏜️', 245, 238], ['🪁', 495, 238], ['🌅', 745, 238], ['🔥', 245, 430], ['🌋', 495, 430], ['✨', 745, 430]],
    prevName: 'Season Three', prevGoal: 'reach The Starforge in Season Three', kick: 'SEASON FOUR',
    intro: 'Warm wind, long shadows and a camel named Biscuit. The Emberwild stretches out in every direction, with singing dunes, glass seas and a fire at its heart. Rex packed a wide hat and set out again. Twelve more places, twelve more scenes, twelve more keepsakes.',
    finale: 'You reached the Heart of Ember', finaleLine: 'We made it to the Heart of Ember. It is so warm!', beginToast: 'Season Four has begun. Biscuit is ready.', pack: 'Desert keepsakes', journal: 'The Emberwild so far', done: 'Season Four complete', doneSub: 'You lit the heart of the desert',
    say: ['The sand is warm and the sky is huge.', 'Biscuit says we are doing great. I think.', 'Water first, adventure second.', 'Every hour is another dune behind us.', 'Whenever you are ready, so am I.'],
    places: S4.places.map((r, i) => ({ id: r[0], h: [0, 1, 3, 6, 10, 15, 22, 30, 40, 55, 75, 100][i], e: r[1], n: r[2], t: r[3] })),
    chapters: [
      { n: 'The Dune Road', e: '🏕️', from: 0, to: 3, t: 'Camp, singing sand, mint water and spice.' },
      { n: 'The Red Reaches', e: '🪨', from: 4, to: 7, t: 'Canyons, temples, glass and kites.' },
      { n: 'The Ember Peaks', e: '🔥', from: 8, to: 11, t: 'Hot springs, sparks and a heart of fire.' }
    ],
    scenes: S4.scenes
  };

  /* ================= Season Five ================= */
  const S5 = build([
    ['gate', '🌙', 'Moonwood Gate', 'A wooden gate under a very large moon. Every Season Five dream starts here.', 'A crooked wooden gate stands under a very large moon. It creaks open as if it recognizes Rex.', 'What does Rex bring?', 'A little lantern', 'It glows soft and silver, just enough for the path.', '🏮', 'Moon Lantern', 'A cozy blanket', 'Rex wraps it on and feels instantly sleepy and brave.', '🛌', 'Dream Blanket'],
    ['moss', '🍄', 'Mossy Lane', 'Soft green steps and mushrooms that glow when you whisper.', 'The lane is soft with moss, and tiny mushrooms light up wherever Rex whispers.', 'What does Rex do?', 'Whisper hello', 'The whole lane glows, and one little cap pops off like a hat.', '🍄', 'Glow Cap', 'Tiptoe through', 'Not one mushroom wakes. A single one blushes pink.', '🌸', 'Pink Mushroom'],
    ['firefly', '✨', 'Firefly Hollow', 'Thousands of lights drift in slow loops. One hour in, they spell a word.', 'Fireflies drift in lazy circles and for a second spell out the word "welcome."', 'How does Rex reply?', 'Wave back', 'The lights swirl into a happy spiral around Rex.', '🪔', 'Firefly Lamp', 'Spell "thanks" with a stick', 'The fireflies copy it perfectly, then add a tiny heart.', '💛', 'Firefly Heart'],
    ['brook', '💧', 'Whisper Brook', 'A little stream that tells secrets, if you are quiet enough.', 'A brook murmurs over smooth stones, and Rex swears it just said something kind.', 'What does Rex do?', 'Listen closely', 'It whispers a small, true secret. Rex keeps it.', '🔔', 'Brook Bell', 'Skip a stone', 'The stone skips seven times and the brook giggles.', '🪨', 'Lucky Skipper'],
    ['owls', '🦉', 'Owl Parliament', 'Ten hours in, a hundred owls are voting on the best sleep of the week.', 'A hundred owls sit on a branch, voting seriously. Rex is asked to cast the deciding vote.', 'What does Rex vote for?', 'The longest nap', 'The owls cheer quietly and hand Rex a tiny gavel.', '🔨', 'Owl Gavel', 'The coziest blanket', 'A motion passes. Everyone gets a blanket.', '🧶', 'Parliament Yarn'],
    ['pillow', '☁️', 'Cloud Pillow Hill', 'A hill so soft that walking on it feels like floating.', 'The hill is stuffed with cloud, and every step bounces back up like a little hug.', 'What does Rex do?', 'Bounce to the top', 'Bounce, bounce, bounce. At the top, a cloud puffs into a small pillow.', '🛏️', 'Cloud Pillow', 'Lie down and watch the sky', 'The clouds make shapes just for Rex.', '🐑', 'Sky Sheep'],
    ['pond', '🪞', 'Mirror Pond', 'A pond that shows how the night looks from the other side.', 'The pond shows the sky, the moon and a second Rex who waves first.', 'What does Rex do?', 'Wave back', 'The other Rex bows and a silver ripple lifts a charm.', '🪙', 'Mirror Coin', 'Toss in a wish', 'The ripples spread and the stars rearrange for a second.', '⭐', 'Wish Star'],
    ['bridge', '🌉', 'Lullaby Bridge', 'A bridge that hums a quiet song. Every plank is a different note.', 'Each plank of the bridge plays a soft note, and walking across makes a lullaby.', 'How does Rex cross?', 'Walk slowly', 'The song comes out slow and sweet, and an echo follows Rex home.', '🎼', 'Lullaby Note', 'Hop plank to plank', 'A silly tune, and a very happy bridge.', '🎹', 'Plank Chime'],
    ['glade', '📖', 'Storybook Glade', 'A glade where open books grow like flowers and every page is a little different.', 'Books grow out of the grass like flowers. Their pages turn in the breeze, telling a different story each time.', 'What does Rex read?', 'A story about a brave pup', 'Rex reads all the way to the end and finds a bookmark waiting.', '🔖', 'Story Bookmark', 'A story that has not been written', 'The pages fill in as Rex watches, and it ends happily.', '✒️', 'Dream Quill'],
    ['cottage', '🧶', 'Dreamweaver Cottage', 'A cottage where a very old weaver turns tired days into soft blankets.', 'A weaver sits at a loom spinning something silver. "Bring me a tired day," she says, "and I will make it kind."', 'What does Rex give?', 'A long, tough day', 'The weaver hums, and it comes back as a soft scarf.', '🧣', 'Dream Scarf', 'A happy memory', 'It goes into the loom and comes out glowing.', '🧵', 'Memory Thread'],
    ['meadow', '🌠', 'Starlit Meadow', 'Seventy-five hours in, the meadow lights up with stars that are close enough to touch.', 'The meadow is covered in low stars, each one humming. A path of them leads to a distant tree.', 'What does Rex do?', 'Collect a handful', 'They glow in Rex\'s paws, warm and a little sleepy.', '🌟', 'Star Handful', 'Leave them be and follow the path', 'The stars brighten, one by one, to light the way.', '🛤️', 'Star Trail'],
    ['tree', '🌳', 'The Dream Tree', 'One hundred hours of Season Five. A huge tree grows lanterns instead of leaves, and every one of them is a dream.', 'At the end of the Moonwood grows an enormous tree. Instead of leaves it has lanterns, and each lantern holds a dream.', 'What does Rex do?', 'Hang a lantern of its own', 'Rex\'s lantern joins the rest and glows the brightest of all.', '🏮', 'Rex\'s Dream Lantern', 'Rest under the branches', 'Rex sleeps beneath the glow and wakes up ready for anything.', '😴', 'Dream Pillow']
  ]);
  const SEASON5 = {
    n: 5, key: 's5', prev: 4, ico: '🌙', name: 'The Moonwood', tag: 'Rex\'s dream forest', band: 'st-bz',
    deco: [['🌙', 245, 48], ['🦉', 495, 48], ['🍄', 745, 48], ['🌌', 245, 238], ['🦋', 495, 238], ['✨', 745, 238], ['📖', 245, 430], ['🌠', 495, 430], ['🌳', 745, 430]],
    prevName: 'Season Four', prevGoal: 'reach The Heart of Ember in Season Four', kick: 'SEASON FIVE',
    intro: 'The gate creaks open under a very large moon. Beyond it, a forest of fireflies, sleepy owls and a tree that grows dreams. Rex tucked in a lantern and stepped through. Twelve more places, twelve more scenes, twelve more keepsakes.',
    finale: 'You reached the Dream Tree', finaleLine: 'We reached the Dream Tree. Every lantern is glowing!', beginToast: 'Season Five has begun. The Moonwood gate is open.', pack: 'Dream keepsakes', journal: 'The Moonwood so far', done: 'Season Five complete', doneSub: 'You lit a lantern on the Dream Tree',
    say: ['Shh. The forest is listening.', 'The owls say hello. Quietly.', 'Every hour is a firefly.', 'I could nap here forever. But I will not.', 'Whenever you are ready, so am I.'],
    places: S5.places.map((r, i) => ({ id: r[0], h: [0, 1, 3, 6, 10, 15, 22, 30, 40, 55, 75, 100][i], e: r[1], n: r[2], t: r[3] })),
    chapters: [
      { n: 'The Whispering Path', e: '🌙', from: 0, to: 3, t: 'Moonlight, mushrooms, fireflies and a brook.' },
      { n: 'The Sleepy Heights', e: '🦉', from: 4, to: 7, t: 'Owls, clouds, mirrors and a lullaby.' },
      { n: 'The Dream Tree', e: '🌳', from: 8, to: 11, t: 'Stories, weaving, stars and one great tree.' }
    ],
    scenes: S5.scenes
  };
  window.REX_EXTRA_SEASONS = { 4: SEASON4, 5: SEASON5 };
})();
