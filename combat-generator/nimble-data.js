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
};

if (typeof module !== 'undefined') module.exports = NIMBLE;
else window.NIMBLE = NIMBLE;
