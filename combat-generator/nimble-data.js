// Rules data transcribed from the Nimble 5e v2 GM Guide (v2.0.1).
// Every table here cites its page in the guide. Do not invent numbers:
// if something is not in the guide, it does not belong in this file.
// Page numbers are the printed page numbers, not the PDF page index.

const NIMBLE = {
  source: 'Nimble 5e v2 GM Guide v2.0.1',

  // p.30 "Monster Builder" table.
  // hp: [no armor, Medium armor, Heavy armor]; dpr = damage per round;
  // sample = the guide's own sample dice (kept for reference only).
  monsterBuilder: [
    { level: 1 / 4, label: '1/4', hp: [12, 9, 7],     dpr: 3,  sample: '1d4+1',                    dc: 9,  cr: '1/8' },
    { level: 1 / 3, label: '1/3', hp: [15, 11, 8],    dpr: 5,  sample: '1d6+2',                    dc: 9,  cr: '1/4' },
    { level: 1 / 2, label: '1/2', hp: [18, 15, 11],   dpr: 7,  sample: '1d6+3',                    dc: 10, cr: '1/4' },
    { level: 1,  label: '1',  hp: [26, 20, 16],    dpr: 11, sample: '2d8+2 or (2×) 1d8+1',  dc: 10, cr: '1/2' },
    { level: 2,  label: '2',  hp: [34, 27, 20],    dpr: 13, sample: '2d8+4 or (2×) 1d8+3',  dc: 11, cr: '1' },
    { level: 3,  label: '3',  hp: [41, 33, 25],    dpr: 15, sample: '2d8+6 or (2×) 1d8+4',  dc: 11, cr: '1' },
    { level: 4,  label: '4',  hp: [49, 39, 29],    dpr: 18, sample: '2d8+9 or (2×) 1d8+5',  dc: 12, cr: '2' },
    { level: 5,  label: '5',  hp: [58, 46, 35],    dpr: 19, sample: '2d8+10 or (2×) 1d8+6', dc: 12, cr: '2' },
    { level: 6,  label: '6',  hp: [68, 54, 41],    dpr: 21, sample: '2d8+12 or (2×) 1d8+7', dc: 13, cr: '3' },
    { level: 7,  label: '7',  hp: [79, 63, 47],    dpr: 24, sample: '3d8+10 or (2×) 2d8+4', dc: 13, cr: '3' },
    { level: 8,  label: '8',  hp: [91, 73, 55],    dpr: 26, sample: '3d8+12 or (2×) 2d8+5', dc: 14, cr: '4' },
    { level: 9,  label: '9',  hp: [104, 83, 62],   dpr: 28, sample: '4d8+10 or (2×) 2d8+6', dc: 14, cr: '4' },
    { level: 10, label: '10', hp: [118, 94, 71],   dpr: 30, sample: '4d8+12 or (2×) 2d8+7', dc: 15, cr: '5' },
    { level: 11, label: '11', hp: [133, 106, 80],  dpr: 33, sample: '5d8+11 or (2×) 3d8+3', dc: 15, cr: '6' },
    { level: 12, label: '12', hp: [149, 119, 89],  dpr: 35, sample: '5d8+13 or (2×) 3d8+4', dc: 16, cr: '7' },
    { level: 13, label: '13', hp: [166, 132, 100], dpr: 38, sample: '6d8+11 or (2×) 3d8+6', dc: 16, cr: '8' },
    { level: 14, label: '14', hp: [184, 147, 110], dpr: 40, sample: '6d8+13 or (2×) 3d8+7', dc: 17, cr: '9' },
    { level: 15, label: '15', hp: [203, 162, 122], dpr: 43, sample: '7d8+11 or (2×) 3d8+8', dc: 17, cr: '9' },
    { level: 16, label: '16', hp: [223, 178, 134], dpr: 45, sample: '7d8+13 or (2×) 4d8+5', dc: 18, cr: '10' },
    { level: 17, label: '17', hp: [244, 195, 146], dpr: 48, sample: '8d8+12 or (2×) 4d8+6', dc: 18, cr: '11' },
    { level: 18, label: '18', hp: [266, 213, 160], dpr: 50, sample: '8d8+14 or (2×) 4d8+7', dc: 19, cr: '12' },
    { level: 19, label: '19', hp: [289, 231, 173], dpr: 52, sample: '9d8+12 or (2×) 4d8+8', dc: 19, cr: '13' },
    { level: 20, label: '20', hp: [313, 250, 189], dpr: 54, sample: '9d8+13 or (2×) 4d8+9', dc: 20, cr: '14' },
  ],

  // p.26 "Combat Encounter Guidelines": monster levels as a share of total hero levels.
  // `target` is the share this tool aims for; `min`/`max` bound the accepted result.
  // Easy = "less than half"; Medium = "around 75%"; Hard = "equal";
  // Deadly = "100–125%"; Very Deadly = "150%+".
  difficulties: {
    easy:       { name: 'Easy',        target: 0.45, min: 0.30, max: 0.499, legendaryOffset: -2, blurb: 'Heroes lose minimal HP and resources. Use 1–2 per session.' },
    medium:     { name: 'Medium',      target: 0.75, min: 0.65, max: 0.85,  legendaryOffset: -1, blurb: 'Some HP loss; heroes get hurt but shouldn’t drop to 0. Use 1–2 per session.' },
    hard:       { name: 'Hard',        target: 1.00, min: 0.95, max: 1.05,  legendaryOffset: 0,  blurb: 'Challenging but fair; some may drop to 0 HP, none should die. Use 1 per session.' },
    deadly:     { name: 'Deadly',      target: 1.20, min: 1.10, max: 1.25,  legendaryOffset: 1,  blurb: 'Requires strategy and teamwork. Tough battles or bosses. Use sparingly!' },
    veryDeadly: { name: 'Very Deadly', target: 1.55, min: 1.50, max: 1.70,  legendaryOffset: 2,  blurb: 'Heroes will almost certainly need to retreat—or die. Only when they ignored telegraphed danger.' },
  },

  // p.26 "Typical encounters should have 1–4 monsters per hero (excluding minions)."
  monstersPerHero: { min: 1, max: 4 },

  // p.26 sidebar "Armor Variety": ~60% unarmored, 30% Medium, 10% Heavy.
  armorMix: [
    { key: 'none',   name: 'Unarmored',    weight: 60, hpIndex: 0 },
    { key: 'medium', name: 'Medium Armor', weight: 30, hpIndex: 1, note: 'Just the dice: ignores damage modifiers.' },
    { key: 'heavy',  name: 'Heavy Armor',  weight: 10, hpIndex: 2, note: 'Half the dice (round up): ignores modifiers.' },
  ],

  // p.25 "Default Monster Stats".
  defaults: 'Medium-sized, speed 6, Reach 1, roll 1d20 for saves.',

  // p.30 "What die size to use?" — any die works as long as damage per round stays consistent.
  dieThemes: [
    { die: 4,  theme: 'Undead (slow, with BIG bonus damage)' },
    { die: 6,  theme: 'Goblins (small, chaotic, likely to miss or crit)' },
    { die: 8,  theme: 'Humans (balanced and reliable attackers)' },
    { die: 10, theme: 'Beasts (stronger than humans)' },
    { die: 12, theme: 'Giants (superhumanly strong/accurate)' },
    { die: 20, theme: 'The mightiest creatures (massive damage)' },
  ],

  // p.25 Minions: any damage kills, single damage die, can't crit, miss on a 1.
  // p.27 minion waves & suggested die size by party level (ranges overlap in the guide).
  minionDie: [
    { from: 1, to: 3, die: 4 },
    { from: 3, to: 5, die: 6 },
    { from: 5, to: 10, die: 8 },
    { from: 10, to: 13, die: 10 },
    { from: 13, to: 17, die: 12 },
    { from: 17, to: 20, die: 20 },
  ],
  minionWaves: [
    { perHero: 0, effect: 'No minions.' },
    { perHero: 1, effect: 'Slightly more difficult, but greatly increases tactical options.' },
    { perHero: 2, effect: 'Noticeably more difficult.' },
    { perHero: 3, effect: 'Noticeably more difficult.' },
    { perHero: 4, effect: 'Much more challenging.' },
  ],

  // p.44 "Legendary Monster Stats by Level" — based on PARTY level, independent of party size.
  // hp: [Medium armor, Heavy armor]; lastStand = extra damage to finish it; small/big = attack damage.
  legendary: [
    { level: 1,  hp: [50, 35],   lastStand: 10,  dc: 10, small: 8,  big: 16 },
    { level: 2,  hp: [75, 55],   lastStand: 20,  dc: 11, small: 9,  big: 18 },
    { level: 3,  hp: [100, 75],  lastStand: 30,  dc: 11, small: 10, big: 20 },
    { level: 4,  hp: [125, 95],  lastStand: 40,  dc: 12, small: 11, big: 22 },
    { level: 5,  hp: [150, 115], lastStand: 50,  dc: 12, small: 12, big: 24 },
    { level: 6,  hp: [175, 135], lastStand: 60,  dc: 13, small: 13, big: 26 },
    { level: 7,  hp: [200, 155], lastStand: 70,  dc: 13, small: 14, big: 28 },
    { level: 8,  hp: [225, 175], lastStand: 80,  dc: 14, small: 15, big: 30 },
    { level: 9,  hp: [250, 195], lastStand: 90,  dc: 14, small: 16, big: 32 },
    { level: 10, hp: [275, 215], lastStand: 100, dc: 15, small: 17, big: 34 },
    { level: 11, hp: [300, 235], lastStand: 110, dc: 15, small: 18, big: 36 },
    { level: 12, hp: [325, 255], lastStand: 120, dc: 16, small: 19, big: 38 },
    { level: 13, hp: [350, 275], lastStand: 130, dc: 16, small: 20, big: 40 },
    { level: 14, hp: [375, 295], lastStand: 140, dc: 17, small: 21, big: 42 },
    { level: 15, hp: [400, 315], lastStand: 150, dc: 17, small: 22, big: 44 },
    { level: 16, hp: [425, 335], lastStand: 160, dc: 18, small: 23, big: 46 },
    { level: 17, hp: [450, 355], lastStand: 170, dc: 18, small: 24, big: 48 },
    { level: 18, hp: [475, 375], lastStand: 180, dc: 19, small: 25, big: 50 },
    { level: 19, hp: [500, 395], lastStand: 190, dc: 19, small: 26, big: 52 },
    { level: 20, hp: [525, 415], lastStand: 200, dc: 20, small: 27, big: 54 },
  ],

  // p.22 "Gold": average gold EACH hero gains per level.
  goldPerHeroPerLevel: {
    1: 25, 2: 40, 3: 80, 4: 150, 5: 280, 6: 450, 7: 750, 8: 1200, 9: 2000, 10: 3000,
    11: 5000, 12: 7000, 13: 10000, 14: 17000, 15: 25000, 16: 40000, 17: 60000, 18: 90000, 19: 130000, 20: 200000,
  },

  // p.22 "A quest for a noble cause or from a poor villager might pay modestly (one or two levels
  // below average), while one from a wealthy noble ... (one or two levels above average)."
  patrons: [
    { key: 'poor',     name: 'Poor villager / noble cause', offset: -2 },
    { key: 'modest',   name: 'Modest',                      offset: -1 },
    { key: 'standard', name: 'Standard',                    offset: 0 },
    { key: 'wealthy',  name: 'Wealthy patron',              offset: 1 },
    { key: 'lavish',   name: 'Extravagant (shady noble)',   offset: 2 },
  ],

  // p.75 "Leveling Up": sessions per level. Levels 1–3 come from the included adventure,
  // which levels the party after each adventure (roughly one session each).
  sessionsPerLevel(level) {
    if (level <= 3) return 1;
    if (level <= 5) return 2.5;   // "2–3 sessions"
    if (level <= 12) return 3;    // "2–4 sessions"
    return 4;                     // "3–5+ sessions"
  },

  // p.26 typical session: 1–2 easy, 1–2 medium, 1 hard (midpoints used).
  typicalSession: { easy: 1.5, medium: 1.5, hard: 1 },

  // p.31 "Flavorful Monster Abilities" (subset of short, self-contained ones).
  // p.30: "For each special ability added, lower the HP or damage 1 step or treat the monster as 1 step stronger."
  abilities: [
    'Acid Blood. Melee attackers take half the HP lost in return as acid damage.',
    'Aggressive. +X speed if moving toward enemies.',
    'Bloodthirsty. Has advantage on attacks against Bloodied targets.',
    'Brute. Attacks also knockback a number of spaces equal to the primary die rolled.',
    'Burning Aura. Creatures that start their turn adjacent to this monster take 1d6 fire damage.',
    'Climbing. Can traverse walls or ceilings normally.',
    'Heavy Blows. Attacks also Daze the target.',
    'Explosive Death. Explode on death, dealing 2d6 damage to creatures within reach.',
    'FAST. Reaction, 1/round: force a reroll with disadvantage on an attack.',
    'Flying. Flying speed and immune to Opportunity Attacks. May FALL when crit.',
    'Formation. Armor increases 1 step for each adjacent ally (None, Med, Heavy).',
    'Grappler. On hit: Grapples.',
    'Pack Tactics. Advantage on attacks when an ally is adjacent to the target.',
    'Parry. Attacks against them miss on a 1 and 2.',
    'Retaliate. Attacks the first creature who attacks them in melee each round.',
    'Shifty. Can move after being attacked.',
    'Spiked. When hit by a melee attack, the attacker takes 1d4 piercing damage in return.',
    'Sturdy. The first time the monster would die, they have 1 HP instead.',
    'Tricky. Can swap places with allies or enemies.',
    'Vicious. Crits are Vicious (roll 1 additional die).',
  ],

  // p.33–41 Bestiary. Transcribed from the stat blocks and checked against the rendered pages
  // (PDF text extraction detaches the HP numbers from their monsters).
  // hp: the heart number. armor: the shield letter (none / M / H; the Briarbanes' "H*" = Heavy,
  // with Peeling Bark). speed: the arrow/Fly/Burrow box when printed. attacks: the damage lines.
  // abilities: everything else in the block, plus any group trait from its bar (Stirges, Mimics,
  // Oozes, Gnolls, Briarbanes, Cultists). family `traits` apply to every monster in the family.
  // Save DC is NOT printed for bestiary monsters: generator.js derives it from the p.30 row for the
  // monster's level. Minions (Lvl 1/4) are listed separately and never count toward the budget (p.26).
  bestiary: [
    {
      key: 'kobolds', name: 'Kobolds', page: 33,
      traits: ['Nooooo! When an ally within 2 spaces dies, attack once for free.'],
      minion: { name: 'Kobold Minion', attack: 'Stab. 1d4' },
      monsters: [
        { name: 'Kobold', level: 1 / 3, hp: 12, armor: 'none', attacks: ['Stab. 1d4+2 (or Sling, Range 8).'] },
        { name: 'Kobold Sneak', level: 1 / 2, hp: 15, armor: 'none', attacks: ['Stab. 1d4+2 (or Sling, Range 8).'],
          abilities: ['Revenge! When an ally dies, you may move up to 6 spaces before using your Nooooo! ability.'] },
        { name: 'Kobold Clanger', level: 1, hp: 16, armor: 'heavy', attacks: [],
          abilities: ['CLANG! Allies who hear your clanging, roll 1 additional die whenever they attack.'] },
        { name: 'Kobold Trapper', level: 1, hp: 26, armor: 'none', attacks: ['Throw Scorpion (2×). (Range 8) 1d4+2.'],
          abilities: [
            'Trap! When an enemy moves adjacent to you or an ally, they trigger one of your traps! (1/encounter each).',
            '• BEEES! Deal 5d4 damage (doesn’t miss). Half as much to ALL adjacent creatures.',
            '• HIDDEN NET! Restrained (escape DC 10).',
          ] },
        { name: 'Kobold Denwarden', level: 1, hp: 20, armor: 'medium', attacks: ['Stab (2×). 1d4+2 (or Sling, Range 8).'],
          abilities: ['Hold! Adjacent allies gain Medium Armor.'] },
      ],
      loot: { name: 'Kobold Loot', text: 'Honey, LOTS of twine, sandwiches (stolen), shiny objects, dragon painting (poorly—yet lovingly—made), rotting meats, a variety of traps (small cages, spikes, snapping).' },
    },
    {
      key: 'goblins', name: 'Goblins', page: 34,
      traits: ['Haha, Missed Me! Whenever an attack misses you, deal 1 psychic damage in return.'],
      minion: { name: 'Goblin Minion', attack: 'Stab. 1d6' },
      monsters: [
        { name: 'Goblin', level: 1 / 3, hp: 15, armor: 'none', attacks: ['Stab. 1d6+2 (or Shoot, Range 8).'] },
        { name: 'Bugbear', level: 2, hp: 30, armor: 'medium', attacks: ['Cleave. 2d6+4. OR:', 'Javelin. 1d6+2 (Range 8).'] },
        { name: 'Goblin Taskmaster', level: 2, hp: 30, armor: 'medium',
          attacks: ['Stab. 1d6+2 (or Shoot, Range 8). Then:', 'Get in here! Call a goblin minion to the fight.'],
          abilities: ['Meat Shield. Can force other goblins to Interpose for him.'] },
        { name: 'Goblin Ratrider', level: 2, hp: 30, armor: 'none', speed: 'Speed 10', attacks: ['Bite & Stab (2×). 1d6+2. On crit: Prone.'],
          abilities: ['CHAAARGE! If you move at least 4 spaces in a straight line, attack with advantage once.'] },
      ],
      loot: { name: 'Goblin Loot', text: 'Live mouse (a snack for later), moldy bread, smooth stones, sharp sticks, teeth (forcibly removed), arrows (surprisingly well-made), lots of blades (jagged, but effective), dead captive (forgot to feed him), shiny junk (random shiny bits of metal, broken glass, and buttons), slug farm (a jar of slimy, wriggling slugs), "Potion" (suspiciously colored liquid in a dirty bottle), unidentifiable jerky. A filthy notebook tracking bizarre trades and bets, boots (too big).' },
    },
    {
      key: 'bandits', name: 'Bandits', page: 35,
      traits: ['Parry. Treat attacks against you that roll 2 as a miss.'],
      minion: { name: 'Bandit Minion', attack: 'Stab. 1d8' },
      monsters: [
        { name: 'Bandit', level: 1 / 3, hp: 12, armor: 'none', attacks: ['Stab. 1d8+1 (or Shoot, Range 8).'] },
        { name: 'Bandit Hunter', level: 1, hp: 22, armor: 'none', attacks: ['Battlebow. 2d8+2 (Range 12).'] },
        { name: 'Bandit Bruiser', level: 2, hp: 24, armor: 'medium', attacks: ['Bash. 2d8+4.'] },
        { name: 'Bandit Assassin', level: 2, hp: 24, armor: 'none', attacks: ['Poison Blade (2×). 1d8+4. On damage: Dazed.'],
          abilities: ['Sneak. You are invisible until you attack.'] },
        { name: 'Bandit Captain', level: 4, hp: 36, armor: 'medium', attacks: ['Slice (3×). 1d8+1 (or Shoot, Range 8).'] },
        { name: 'Bandit Mage', level: 4, hp: 41, armor: 'none',
          attacks: ['Arc Lightning. 3d8 (Range 12). Also strikes the next closest creature. On miss: damage self instead.'],
          abilities: ['Spark Step. When damaged, teleport up to 4 spaces.'] },
      ],
      loot: { name: 'Bandit Loot', text: 'VERY valuable item (stolen; its owner may come looking for it, or reward you for its return), kidnapped person, leather armor, chipped blades, old food, fine art or clothes, wagon load of some commodity (salt, nails, wool, etc.), coded letter from a secretive client.' },
    },
    {
      key: 'snakemen', name: 'Snakemen', page: 35,
      traits: ['Coiling Strike. On melee crit: Grapple (escape DC 10).'],
      minion: { name: 'Snakeman Minion', attack: 'Strike. 1d6 melee/ranged' },
      monsters: [
        { name: 'Snakeman', level: 1, hp: 26, armor: 'none', attacks: ['Slash. 1d6+6 (or Spit, Range 8).'] },
        { name: 'Cobra Captain', level: 4, hp: 36, armor: 'medium', attacks: ['Slash (2×). 1d6+6 (or Spit, Range 8).'] },
        { name: 'Giant Cobra', level: 8, hp: 80, armor: 'medium', attacks: ['Crush. 2d6+20. Advantage vs. smaller creatures.'] },
      ],
      loot: null, // no Snakemen loot table in the guide
    },
    {
      key: 'dungeon', name: 'Dungeon Denizens', page: 36,
      traits: [],
      minion: null,
      monsters: [
        // Stirges
        { name: 'Stirge', level: 1 / 2, hp: 10, armor: 'none', attacks: ['Latch On. 1d4+2. On hit: Latched On.'],
          abilities: ['Evasive Flier. Attacks against stirges are made with disadvantage.',
            'Latched On. You move where your target moves until either dies. Your attacks can’t miss or be Defended/Interposed against. Attacks that miss you damage your target instead.'] },
        { name: 'Greater Stirge', level: 6, hp: 60, armor: 'none', attacks: ['Latch On. 1d12+10. On hit: Latched On.'],
          abilities: ['Evasive Flier. Attacks against stirges are made with disadvantage.',
            'Latched On. You move where your target moves until either dies. Your attacks can’t miss or be Defended/Interposed against. Attacks that miss you damage your target instead.'] },
        // Mimics
        { name: 'Tiny Mimic', level: 1, hp: 28, armor: 'none', attacks: ['Pseudopod. 1d4 (escape DC 9) OR: Bite. (a Grappled creature) 1d12.'],
          abilities: ['Disguise: Cup, Shoe, Apple, Candlestick, Potion, Pebble.',
            'Ambusher. Mimics always start first and heroes roll Initiative with disadvantage.',
            'Sticky. Mimic hits also Grapple and can Grapple any number of creatures. When crit: release 1 creature (attacker’s choice).'] },
        { name: 'Small Mimic', level: 2, hp: 41, armor: 'none', attacks: ['Pseudopod. 1d6 (escape DC 11) OR: Bite. (a Grappled creature) 1d20.'],
          abilities: ['Disguise: Backpack, Shield/Weapon, Chair, Crate, Tree Stump.',
            'Ambusher. Mimics always start first and heroes roll Initiative with disadvantage.',
            'Sticky. Mimic hits also Grapple and can Grapple any number of creatures. When crit: release 1 creature (attacker’s choice).'] },
        { name: 'Medium Mimic', level: 6, hp: 79, armor: 'none', attacks: ['Pseudopod. 1d8 (escape DC 13) OR: Bite. (a Grappled creature) 2d20.'],
          abilities: ['Disguise: Table, Treasure Chest, Barrel, Bookshelf, Door, Bed.',
            'Ambusher. Mimics always start first and heroes roll Initiative with disadvantage.',
            'Sticky. Mimic hits also Grapple and can Grapple any number of creatures. When crit: release 1 creature (attacker’s choice).'] },
        // Oozes. The guide prints X in red inside each ooze's damage (1d6+X); it is filled in here.
        ...[['Gray Ooze', 1, 28, 'Acidic Touch (2×). 1d6+2.', 2],
          ['Ochre Jelly', 4, 52, 'Acidic Touch (2×). 1d6+3.', 3],
          ['Black Pudding', 8, 90, 'Acidic Touch (2×). (Reach 2) 1d6+5.', 5],
          ['Elder Ooze', 12, 150, 'Acidic Touch (3×). (Reach 3) 1d6+6.', 6]].map(([name, level, hp, attack, x]) => ({
          name, level, hp, armor: 'none', attacks: [attack],
          abilities: [`Digestive Touch. Contact with an ooze inflicts the Digested condition: they deal an additional ${x} damage for each time the target has been Digested this encounter.`,
            `Goopy. When crit or dealt any slashing damage: summon ${x} ooze minions (size: d6); their attacks inflict Digested.`],
        })),
      ],
      loot: { name: 'Dungeon Denizen Loot', text: 'Tarnished coins (partially dissolved by acid), ancient bones with traces of gnaw marks, indigestible items (bones, gems, magical trinkets), a leather-bound journal (water-damaged pages), lockpicks, a treasure map (only half), boots (suspiciously untouched by corrosion).' },
    },
    {
      key: 'hillfield', name: 'Hill & Field', page: 37,
      traits: [],
      minion: null,
      monsters: [
        { name: 'Gnoll', level: 1, hp: 28, armor: 'none', attacks: ['Ravage (2×). 1d10. OR:', 'Shoot. (Range 12) 1d10.'],
          abilities: ['Frenzy. Advantage against Bloodied creatures.'] },
        { name: 'Gnoll Packleader', level: 4, hp: 39, armor: 'medium', attacks: ['Bark Orders. 2 allies can move. Then:', 'Ravage (3×). 1d10.'],
          abilities: ['Frenzy. Advantage against Bloodied creatures.'] },
        { name: 'Worg', level: 1, hp: 28, armor: 'none', speed: 'Speed 10', attacks: ['Rip Apart (2×). 1d6+2. On hit: Grappled (escape DC 10).'],
          abilities: ['Savage. Always crits when attacking a Grappled creature.'] },
        { name: 'Blue Drake', level: 2, hp: 34, armor: 'none', speed: 'Fly 12', attacks: ['Shocking Bite. 1d12+5 (ignores metal armor).'],
          abilities: ['On Death. Deal 1d12 damage back (ignores metal armor).'] },
        { name: 'Griffon', level: 4, hp: 50, armor: 'none', speed: 'Fly 12',
          attacks: ['Talons. 2d6+10, on hit: Grappled (escape DC 14) OR:', 'Fly & Drop. (if grappling) Fly upward 12 and release (6d6 fall damage).'] },
        { name: 'Bulette', level: 10, hp: 74, armor: 'heavy', speed: 'Burrow',
          attacks: ['Drag Below. (A Grappled creature) 2d12 then drag below and burrow away. OR:', 'Leap & Bite. (If not grappling) leap 6, and attack for 1d12+20. On hit: Grappled.'],
          abilities: ['Burst Forth! Combat with a Bulette starts with the heaviest character making a DC 14 DEX save or they are Grappled (escape DC 14) and take 1d12+20 damage (half on save).'] },
        { name: 'Troll', level: 10, hp: 100, armor: 'medium', speed: 'Speed 8',
          attacks: ['Choose twice:', 'Claws. (Reach 2) 1d4+10. On crit: Prone.', 'Bite. (A Prone creature) 1d4+20.'],
          abilities: ['Regenerate. Does not die at 0 HP. Only fire, radiant, or a crit while at 0 HP can kill it.'] },
        { name: 'Hill Giant', level: 12, hp: 140, armor: 'none', speed: 'Speed 8',
          attacks: ['Smash (2×). (Reach 2) 1d6+15. OR:', 'Boulder! (Range 12) 1d6+20.'],
          abilities: ['Brute. On hit: Knockback Primary Die spaces.'] },
        { name: 'Roc', level: 17, hp: 195, armor: 'medium', speed: 'Fly 20',
          attacks: ['Pluck Up. (Reach 4, target up to 2 creatures) 3d12+20. On hit: Grappled (escape DC 18). OR:', 'Crush & Drop. Fly upward 20 spaces, deal 20 damage to Grappled creatures, then release (10d6 fall damage).'] },
      ],
      loot: null, // no Hill & Field loot table in the guide
    },
    {
      key: 'undead', name: 'Undead', page: 38,
      traits: ['Unliving, Undying. The first time this dies, reset to 1 HP instead (excluding minions).'],
      minion: null,
      monsters: [
        { name: 'Skeleton', level: 1 / 3, hp: 10, armor: 'none', attacks: ['Grave Arrow. 1d4+3 (Range 8)'] },
        { name: 'Zombie', level: 1 / 2, hp: 15, armor: 'none', attacks: ['Crunch. 1d4+4. On damage: Grappled.'] },
        { name: 'Ghoul', level: 1, hp: 20, armor: 'none', attacks: ['Sickening Claw. 1d4+8. On damage: Dazed.'] },
        { name: 'Specter', level: 3, hp: 30, armor: 'none', speed: 'Fly', attacks: ['Deathly Touch. 1d4. On damage: set HP to 0.'] },
        { name: 'Ogre Zombie', level: 5, hp: 46, armor: 'none', attacks: ['Greatclub (2×). 1d4+8. On crit: Prone.'] },
        { name: 'Mummy', level: 6, hp: 54, armor: 'none', attacks: ['Slam (2×). 1d4+8. On damage: Dazed.'] },
        { name: 'Giant Zombie', level: 8, hp: 73, armor: 'none', attacks: ['Decaying Swipe (2×). 1d4+10. On damage: knockback Primary Die spaces.'] },
        { name: 'Wraith', level: 10, hp: 94, armor: 'none', speed: 'Fly', attacks: ['Soul Rend (2×). (Range 8) 1d4+10. On damage: deal 1 Wound.'] },
        { name: 'Mummy Lord', level: 21, hp: 280, armor: 'none',
          attacks: ['Scarab Swarm. Summon 10 scarab minions (d6) within 6 spaces. Then:', 'Slam (2×). 1d4+20. On damage: Dazed.'],
          abilities: ['Cursed Gaze. When crit: DC 20 INT save, or suffer 1 Wound.'] },
      ],
      loot: { name: 'Undead Loot', text: 'Tarnished silver locket containing a faded portrait (who is it?), bone fragments engraved with arcane symbols, a dark gemstone (emits a faint chill), vials of blood (long-dried), a diary written in an ancient hand, a macabre necklace (skeletal finger bones), a broken holy symbol smeared with ash, a signet ring from a lost noble house, moldy grave dirt (whispers when touched), shovel.' },
    },
    {
      key: 'forest', name: 'Forest Denizens', page: 39,
      traits: [],
      minion: null,
      monsters: [
        { name: 'Duskprowler', level: 6, hp: 70, armor: 'none', attacks: ['Ravage (2×). 2d8+2.'],
          abilities: ['Illusory Aura. Attacks against the Duskprowler have Disadvantage 2. Damage suppresses this effect until the end of the next hero’s turn.'] },
        { name: 'Basilisk', level: 7, hp: 48, armor: 'heavy', attacks: ['Stone Gaze. Daze 1 creature within sight, then:', 'Envenom. 1d8+10, advantage vs Dazed targets.'],
          abilities: ['Flesh to Stone. Creatures Dazed by the Basilisk remain so for 10 minutes. Dazed 3 times = Petrified.'] },
        { name: 'Druid', level: 8, hp: 90, armor: 'none',
          attacks: ['Beastshift. +4 speed, gain Medium armor this round. 4d4+10. OR:', 'Hurricane. (Reach 3) 4d4+10 to all enemies within reach. On damage: move targets anywhere else in Reach.'] },
        // Briarbanes (armor printed "H*": Heavy, worn down by Peeling Bark)
        ...[
          { name: 'Seedling', level: 1 / 2, hp: 8, attacks: ['Thorn Seed. (Range 6) 2d6+2'] },
          { name: 'Acidpod', level: 1, hp: 8, attacks: ['Grab. DC 12 DEX save or Grappled.'],
            abilities: ['Caustic Eruption. On death: 4d6 acid damage to ALL adjacent creatures.'] },
          { name: 'Tangler', level: 2, hp: 20, attacks: ['Tangle (2×). (Reach 6) 1d6+2. On hit: Grappled (escape DC 12, or any fire or slashing damage).'] },
          { name: 'Rootbreaker', level: 5, hp: 50, attacks: ['Slam. 3d6+6. On crit: knockback 2.'] },
          { name: 'Treant', level: 14, hp: 170, attacks: ['Choose twice:', 'Slam. (Reach 3) 2d6+10. On damage: Prone.', 'Stomp. (Hampered target) 2d6+20.'],
            abilities: ['Enrage. Attack with advantage when unarmored.'] },
        ].map((m) => ({ ...m, armor: 'heavy', abilities: ['Peeling Bark. Damage degrades Armor 1 step: Heavy » Medium » None.', ...(m.abilities || [])] })),
      ],
      loot: { name: 'Briarbane Loot', text: '25 ft. of vines (usable as rope), glowing sap (minor healing properties), moss-covered coins from an ancient era, a brittle leaf with veins that spell out words in Druidic, a pouch of dried herbs, a cluster of rare mushrooms, a handful of acorns (they grow INSTANTLY when placed in water), a small flower that never wilts, flute overgrown with moss, a tattered map to a hidden grove, a dried flower crown.' },
    },
    {
      key: 'cultists', name: 'Cultists/Horrors', page: 40,
      traits: [],
      minion: null,
      monsters: [
        // Cultists
        ...[
          { name: 'Cultist', level: 1, hp: 28,
            attacks: ['Oblation of Blood! If undamaged, attack self for 2 damage. Adjacent enemies are inflicted with Despair. OR:', 'Dreadful Blade. 1d6+6. OR:', 'Blood Boil. (Range 12, Bloodied creature) 3d6+6.'] },
          { name: 'Fanatic', level: 3, hp: 41,
            attacks: ['Oblation of Blood! If undamaged, attack self for 2 damage. Adjacent enemies are inflicted with Despair. OR:', 'Whispers of Madness. Contested STR check or Grappled (reroll to escape, or any radiant damage); if successful, deal 3d6+6 psychic damage (cannot be Defended or Interposed against).'] },
          { name: 'Doomsayer', level: 5, hp: 58,
            attacks: ['Feverish Chant. (Concentration) Reduce all damage done to allies who can hear you to 1. OR:', 'Ecstatic Ravings. 2d6 psychic damage to all enemies who can hear you.'] },
        ].map((m) => ({ ...m, armor: 'none', abilities: [
          'Fanatical Zeal. While not at max HP, make all rolls with advantage. Your crits also inflict Despair.',
          'Despair. Disadvantage on the next attack you make this encounter.'] })),
        // Horrors
        { name: 'Stenchling', level: 1 / 2, hp: 18, armor: 'none', attacks: ['Bite. 2d6.'],
          abilities: ['Putrid Cloud. On Death: 2d6 poison damage to enemies within Reach 2.'] },
        { name: 'Spiny Fiend', level: 4, hp: 49, armor: 'none', attacks: ['Claws (2×). 1d6+6. OR:', 'Shoot Spine. (Range 12) 1d6+6.'],
          abilities: ['Spines. Melee attackers take 3 damage.'] },
        { name: 'Glabrezu', level: 14, hp: 110, armor: 'heavy',
          attacks: ['Doomclaw (2×). (Reach 2) 3d6+10. On damage: Grappled (escape DC 17). If the same creature is Grappled by both of the glabrezu’s claws, it must escape from each of them separately. OR:',
            'Tear Asunder. (A creature Grappled by both of the glabrezu’s claws) 50 unpreventable damage. If the target is at 0 HP: DC 17 STR save or be torn in two, dying instantly.'] },
      ],
      loot: { name: 'Horrible Loot', text: 'Bloodstained dagger (engraved with dark symbols), a twisted idol (whispers terrible thoughts), vial of black ichor, a mask (carved, likeness of a fiend), a tattered robe (lined with hidden pockets), a scroll with summoning rituals (half-finished), shackles inscribed with infernal runes, fragment of a fiendish contract, black candles (cannot be extinguished).' },
    },
    {
      key: 'underground', name: 'Underground', page: 41,
      traits: [],
      minion: null,
      monsters: [
        { name: 'Giant Spider', level: 2, hp: 27, armor: 'medium',
          attacks: ['Shoot Web. (Range 6) 1d8+2. On hit: Restrained (escape DC 12, or any slashing/fire damage). OR:', 'Bite. (Hampered target) 2d8+4, Poisoned (magical healing ends).'] },
        { name: 'Ettercap', level: 4, hp: 49, armor: 'none', attacks: ['Web Garrote. 1d8+2. On hit: Grappled (escape DC 13), Silenced until target escapes.'],
          abilities: ['Silenced. Cannot cast spells or use other abilities that require speaking (e.g. Commander’s Orders).'] },
        { name: 'Nestweaver', level: 6, hp: 54, armor: 'medium',
          attacks: ['Summon 2 spider minions (d8). Then choose 1:', 'Shoot Web. (Range 6) 1d8+2. On hit: Restrained (escape DC 12, or any slashing/fire damage). OR:', 'Bite. (Hampered target) 3d8+6 and Poisoned (magical healing ends).'] },
        { name: 'Umber Hulk', level: 10, hp: 70, armor: 'heavy', attacks: ['Mandible & Claws (2×). 1d10+10 damage.'],
          abilities: ['Confounding Pheromones. Enemies make a DC 15 WIL save at the start of their turns or Confused this turn. Gain advantage 1 on the save for each failure this encounter.',
            'Confused. The GM spends your next action.'] },
        { name: 'Cloaker', level: 13, hp: 110, armor: 'none', speed: 'Fly 10',
          attacks: ['Wrap. 2d10+20. On Hit: Grappled (escape DC 16). OR:', 'Horrifying Wail. DC 16 WIL save, or creatures within 6 spaces are Frightened and must spend 1 Action moving as far away as possible.'],
          abilities: ['Ambusher. Cloakers always start first and heroes roll Initiative with disadvantage.',
            'Mutual Harm. You take half damage from attacks while grappling a creature (they take the other half).'] },
        { name: 'Great Worm', level: 16, hp: 140, armor: 'heavy', speed: 'Burrow 8',
          attacks: ['Crush. Creatures in a 2×6 area take 50 damage on a failed DC 18 DEX save. (Creatures who fail can spend 1 Action to dive out of the way instead of taking this damage. They move half their speed and land Prone.) OR:', 'Bite/Swallow. 1d4+40. On crit: Swallowed.'],
          abilities: ['Tremor Sight. Advantage against creatures that moved since the worm’s last turn.',
            'Swallowed. You take 20 damage at the start of your turn. Your attacks cannot miss and ignore armor.'] },
      ],
      loot: { name: 'Underground Loot', text: 'Chitinous plating, tunnel map (hastily scrawled), serrated teeth (as much as you can carry), spider silk, venom sac, partially digested meats, gemstones (uncut), pheromone gland, luminescent fungus, molted carapace, rusted tools, ancient coins, echo stones (faintly hum when tapped).' },
    },
  ],
};

if (typeof module !== 'undefined') module.exports = NIMBLE;
else window.NIMBLE = NIMBLE;
