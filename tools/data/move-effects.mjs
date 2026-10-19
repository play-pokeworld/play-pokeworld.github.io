/**
 * @file move-effects.mjs
 * @brief Port of the move behaviour of the original combat code into declarative data.
 * The original engine parsed the English description at every attack (`_pwSecondaryFromDesc`,
 * `_parseStatPcts`, `getMoveCooldownMultiplier`) and kept id lists in the code (screens, weather
 * moves, recoil/drain maps, punch/sharp/sound… families). This module runs the same rules ONCE,
 * at generation time, and returns explicit fields for src/data/raw/moves-data.js.
 *
 * Vocabulary: docs/BATTLE_EFFECTS.md.
 */

const STAT_WORDS = { 'special attack': 'spa', 'special defense': 'spd', attack: 'atk', defense: 'def', speed: 'spe' };
const ALL_STATS = ['atk', 'def', 'spa', 'spd', 'spe'];
const STATUS_WORDS = { burn: 'burn', freeze: 'freeze', paralysis: 'para', poisoned: 'poison', poison: 'poison', confusion: 'confuse', sleep: 'sleep' };
const STATUS_EFF = ['para', 'poison', 'badpoison', 'sleep', 'freeze', 'burn', 'confuse'];

/** Same clamp as the original `_statMult`. */
const statMult = (percent, isDrop) => (isDrop ? Math.max(0.25, 1 - percent / 100) : Math.min(3, 1 + percent / 100));
const round = (value) => Math.round(value * 1000) / 1000;

/** Move families of the original (isPunchMove, SHARP_MOVES, …). */
const TAG_LISTS = {
  sharp: ['bitter_blade', 'cut', 'fury_cutter', 'leaf_blade', 'night_slash', 'psycho_cut', 'razor_leaf', 'razor_shell', 'razor_talons', 'slash', 'solar_blade', 'x_scissor'],
  head: ['head_charge', 'headlong_rush', 'iron_head', 'zen_headbut'],
  sound: ['alluring_voice', 'bug_buzz', 'chatter', 'disarming_voice', 'echoed_voice', 'growl', 'hyper_voice', 'metal_sound', 'noble_roar', 'relic_song', 'roar_of_time', 'screech', 'snarl', 'sparkling_aria'],
  dance: ['dragon_dance', 'feather_dance', 'fiery_dance', 'quiver_dance', 'revelation_dance', 'swords_dance'],
  wind: ['fairy_wind', 'gust', 'hurricane', 'icy_wind', 'ominous_wind', 'silver_wind', 'tailwind']
};
const TAG_SUFFIXES = { punch: /_punch$/, fang: /_fang$/, claw: /_claw$/, pulse: /_pulse$/ };

/** Weather / field moves handled before the damage step (original executeAttack / executeStatMove). */
const FIELD_MOVES = {
  rain_dance: [{ kind: 'weather', weather: 'rain', turns: 5, extendedBy: 'damp_rock' }],
  sunny_day: [{ kind: 'weather', weather: 'sun', turns: 5, extendedBy: 'heat_rock' }],
  sandstorm: [{ kind: 'weather', weather: 'sand', turns: 5, extendedBy: 'smooth_rock' }],
  hail: [{ kind: 'weather', weather: 'hail', turns: 5, extendedBy: 'icy_rock' }],
  electric_terrain: [{ kind: 'terrain', terrain: 'electric', turns: 5, extendedBy: 'terrain_extender' }],
  grassy_terrain: [{ kind: 'terrain', terrain: 'grassy', turns: 5, extendedBy: 'terrain_extender' }],
  misty_terrain: [{ kind: 'terrain', terrain: 'misty', turns: 5, extendedBy: 'terrain_extender' }],
  psychic_terrain: [{ kind: 'terrain', terrain: 'psychic', turns: 5, extendedBy: 'terrain_extender' }],
  light_screen: [{ kind: 'weather', weather: 'lightscreen', turns: 5, extendedBy: 'light_clay' }],
  reflect: [{ kind: 'weather', weather: 'reflect', turns: 5, extendedBy: 'light_clay' }],
  safeguard: [{ kind: 'weather', weather: 'safeguard', turns: 5, extendedBy: 'light_clay' }],
  cross_room: [{ kind: 'weather', weather: 'crossroom', turns: 5 }],
  weird_room: [{ kind: 'weather', weather: 'weirdroom', turns: 5 }],
  trick_room: [{ kind: 'weather', weather: 'trickroom', turns: 5 }],
  fog: [{ kind: 'weather', weather: 'fog', turns: 5 }],
  snowscape: [{ kind: 'weather', weather: 'hail', turns: 5 }, { kind: 'stat', target: 'self', stat: 'spa', mult: 1.5 }],
  morning_sun: [{ kind: 'weather', weather: 'sun', turns: 5 }, { kind: 'stat', target: 'self', stat: 'spa', mult: 1.5 }],
  chilly_reception: [{ kind: 'weather', weather: 'hail', turns: 5 }, { kind: 'switch_out' }],
  transform: [{ kind: 'transform' }]
};

const ADD_TYPE_MOVES = { soak: 'water', forest_curse: 'grass', magic_powder: 'psychic', electrify: 'electric', fairy_lock: 'fairy', mud_sport: 'ground', trick_or_treat: 'ghost' };

/** Status moves with a bespoke behaviour (original executeStatMove). */
const SPECIAL_STATUS_MOVES = {
  memento: [{ kind: 'stat', target: 'foe', stat: 'atk', mult: 0.25 }, { kind: 'stat', target: 'foe', stat: 'spa', mult: 0.25 }, { kind: 'self_faint' }],
  splash: [],
  embargo: [{ kind: 'flinch', chance: 100 }],
  acupressure: [{ kind: 'random_stats', target: 'self', count: 2, mult: 2 }],
  belly_drum: [{ kind: 'stat', target: 'self', stat: 'atk', mult: 2.5 }, { kind: 'stat', target: 'self', stat: 'def', mult: 0.5 }, { kind: 'stat', target: 'self', stat: 'spd', mult: 0.5 }],
  baton_pass: [{ kind: 'cure', target: 'self' }, { kind: 'switch_out' }],
  floral_healing: [{ kind: 'cure', target: 'team' }],
  camouflage: [{ kind: 'weather_type' }],
  conversion: [{ kind: 'copy_first_move_type' }],
  metronome: [{ kind: 'call_random_move' }],
  mimic: [{ kind: 'use_foe_first_move', damageMult: 2 }],
  me_first: [{ kind: 'use_foe_first_move', damageMult: 1 }],
  sketch: [{ kind: 'use_own_first_move' }],
  pay_day: [{ kind: 'battle_bonus', bonus: 'money' }],
  teatime: [{ kind: 'battle_bonus', bonus: 'teatime' }],
  venoshock: [{ kind: 'fixed_power_hit', type: 'poison', power: 65, powerIfTargetStatus: { statuses: ['poison', 'badpoison'], power: 130 } }]
};

/** Original side-effects added to some status-inflicting moves. */
const STATUS_MOVE_EXTRAS = {
  toxic_thread: [{ kind: 'stat', target: 'foe', stat: 'spe', mult: 0.5 }],
  swagger: [{ kind: 'stat', target: 'foe', stat: 'atk', mult: 2 }],
  rage_powder: [{ kind: 'stat', target: 'foe', stat: 'spa', mult: 2 }]
};

/** Original RECOIL_MAP / DRAIN_MAP (keys that never matched a move id, like "doubleedge", are dropped). */
const RECOIL = { doubleedge: 0.25, head_charge: 0.25, chloroblast: 0.25 };

/** Bespoke damaging moves (conditional power, stacking, switching…) described in prose. */
const SPECIAL_DAMAGING_MOVES = {
  acrobatics: [{ kind: 'conditional_power', mult: 2, when: { noHeldItem: true } }],
  facade: [{ kind: 'conditional_power', mult: 2, when: { selfStatus: ['para', 'burn', 'poison', 'badpoison'] } }],
  hex: [{ kind: 'conditional_power', mult: 2, when: { targetStatus: true } }],
  smelling_salts: [{ kind: 'conditional_power', mult: 2, when: { targetStatus: ['para'] } }],
  sky_uppercut: [{ kind: 'conditional_power', mult: 2, when: { targetTypes: ['flying'] } }],
  smack_down: [{ kind: 'conditional_power', mult: 2, when: { targetTypes: ['flying'] } }],
  freeze_dry: [{ kind: 'effectiveness_against', targetType: 'water', mult: 2 }],
  echoed_voice: [{ kind: 'consecutive_power', mult: 1.2, maxStacks: 5 }],
  ice_ball: [{ kind: 'consecutive_power', mult: 1.2, maxStacks: 5 }],
  rollout: [{ kind: 'consecutive_power', mult: 1.2, maxStacks: 5 }],
  rage_fist: [{ kind: 'consecutive_power', mult: 1.2, maxStacks: 5 }],
  population_bomb: [{ kind: 'consecutive_power', mult: 1.15, maxStacks: 10 }],
  triple_axel: [{ kind: 'consecutive_power', mult: 1.3, maxStacks: 3 }],
  fury_cutter: [{ kind: 'consecutive_power', mult: 1.2, maxStacks: 5 }],
  attack_order: [{ kind: 'consecutive_power', mult: 1.15, maxStacks: 10 }],
  magnitude: [{ kind: 'random_power', minMult: 1, maxMult: 8 }],
  u_turn: [{ kind: 'switch_out' }],
  volt_switch: [{ kind: 'switch_out' }],
  magma_storm: [{ kind: 'weather', weather: 'sun', turns: 5 }],
  shadow_force: [{ kind: 'ignore_type_immunity' }],
  darkest_lariat: [{ kind: 'ignore_stat_mods' }]
};
const DRAIN = { bitter_blade: 0.5 };

/** Original `_parseStatPcts`. */
function parseStatPercents(text) {
  const out = [];
  const re = /(special attack|special defense|attack|defense|speed|all stats)(?:\s+and\s+(special attack|special defense|attack|defense|speed|all stats))?\s+by\s+(\d+)%/g;
  let match;
  while ((match = re.exec(text))) {
    const percent = parseInt(match[3], 10);
    for (const word of [match[1], match[2]].filter(Boolean)) {
      if (word === 'all stats') ALL_STATS.forEach((stat) => out.push({ stat, percent }));
      else out.push({ stat: STAT_WORDS[word], percent });
    }
  }
  return out;
}

/** Original `_pwSecondaryFromDesc` (damaging moves). */
function secondaryEffects(desc) {
  const effects = [];
  let match = desc.match(/(\d+)%\s+chance to inflict\s+([A-Za-z]+)/);
  if (match && STATUS_WORDS[match[2].toLowerCase()]) {
    effects.push({ kind: 'status', status: STATUS_WORDS[match[2].toLowerCase()], chance: parseInt(match[1], 10), secondary: true });
  } else if ((match = desc.match(/has a chance to (freeze|burn|paralyze) the target/i))) {
    const status = { freeze: 'freeze', burn: 'burn', paralyze: 'para' }[match[1].toLowerCase()];
    effects.push({ kind: 'status', status, chance: 30, secondary: true });
  } else if (/chance to inflict (Burn,Paralysis or Freeze)/.test(desc)) {
    effects.push({ kind: 'status', statuses: ['burn', 'para', 'freeze'], chance: 10, secondary: true });
  }
  const dropRe = /(\d+)%\s+chance to decrease enemy\s+([A-Za-z ]+?)\s+by\s+(\d+)%/g;
  while ((match = dropRe.exec(desc))) {
    const stat = STAT_WORDS[match[2].toLowerCase().trim()];
    if (stat) effects.push({ kind: 'stat', target: 'foe', stat, mult: round(statMult(parseInt(match[3], 10), true)), chance: parseInt(match[1], 10), secondary: true });
  }
  const upRe = /(\d+)%\s+chance to increase\s+([A-Za-z ]+?)\s+by\s+(\d+)%/g;
  while ((match = upRe.exec(desc))) {
    const what = match[2].toLowerCase().trim();
    const stats = what === 'all stats' ? ALL_STATS : (STAT_WORDS[what] ? [STAT_WORDS[what]] : []);
    for (const stat of stats) effects.push({ kind: 'stat', target: 'self', stat, mult: round(statMult(parseInt(match[3], 10), false)), chance: parseInt(match[1], 10), secondary: true });
  }
  if ((match = desc.match(/chance to lower the target(?:'s|\u2019s)\s+(\w+)/i))) {
    const stat = { defense: 'def', attack: 'atk', accuracy: 'acc' }[match[1].toLowerCase()];
    if (stat === 'def' || stat === 'atk') effects.push({ kind: 'stat', target: 'foe', stat, mult: 0.5, chance: 30, secondary: true });
    else if (stat === 'acc') effects.push({ kind: 'accuracy_down', chance: 30, secondary: true });
  }
  if (/make the target flinch/i.test(desc)) effects.push({ kind: 'flinch', chance: 20, secondary: true });
  // Guaranteed effects written without a chance ("Decreases enemy Speed by 50%", "Inflicts Burn",
  // "Increases Speed by 50%"): ignored by the original damage path, applied here (100%).
  if (!effects.length) {
    if ((match = desc.match(/^Inflicts (Burn|Paralysis|Freeze|Poison|Sleep|Confusion)$/i))) {
      effects.push({ kind: 'status', status: STATUS_WORDS[match[1].toLowerCase()], chance: 100, secondary: true });
    }
    if (/^decreases enemy/i.test(desc)) {
      for (const { stat, percent } of parseStatPercents(desc.toLowerCase())) effects.push({ kind: 'stat', target: 'foe', stat, mult: round(statMult(percent, true)), chance: 100, secondary: true });
    } else if (/^increases /i.test(desc)) {
      for (const { stat, percent } of parseStatPercents(desc.toLowerCase())) effects.push({ kind: 'stat', target: 'self', stat, mult: round(statMult(percent, false)), chance: 100, secondary: true });
    }
  }
  // Self drops ("Decreases Defense, Special Defense and Speed by 50%"). The original regex was
  // case-sensitive and never matched the capitalised descriptions: applied here.
  if ((match = desc.match(/^decreases (?!enemy)([a-z ,]+?) by (\d+)%/i))) {
    const percent = parseInt(match[2], 10);
    for (const word of match[1].toLowerCase().split(/\s*,\s*|\s+and\s+/)) {
      if (STAT_WORDS[word.trim()]) effects.push({ kind: 'stat', target: 'self', stat: STAT_WORDS[word.trim()], mult: round(statMult(percent, true)) });
    }
  }
  if ((match = desc.match(/\bmay (paralyze|burn|freeze|poison)\b/i))) {
    effects.push({ kind: 'status', status: { paralyze: 'para', burn: 'burn', freeze: 'freeze', poison: 'poison' }[match[1].toLowerCase()], chance: 30, secondary: true });
  }
  if (/^inflicts confusion on the user/i.test(desc)) effects.push({ kind: 'status', status: 'confuse', chance: 100, target: 'self' });
  return effects;
}

/** Original executeStatMove (status moves). */
function statusMoveEffects(id, move) {
  const desc = String(move.desc || '').toLowerCase();
  if (ADD_TYPE_MOVES[id]) return [{ kind: 'add_type', type: ADD_TYPE_MOVES[id] }];
  if (move.eff && STATUS_EFF.includes(move.eff)) {
    return [{ kind: 'status', status: move.eff, chance: Number(move.effC) || 100 }, ...(STATUS_MOVE_EXTRAS[id] || [])];
  }
  if (SPECIAL_STATUS_MOVES[id]) return SPECIAL_STATUS_MOVES[id];
  if (/decreases enemy/.test(desc)) {
    return parseStatPercents(desc).map(({ stat, percent }) => ({ kind: 'stat', target: 'foe', stat, mult: round(statMult(percent, true)) }));
  }
  return parseStatPercents(desc).map(({ stat, percent }) => ({ kind: 'stat', target: 'self', stat, mult: round(statMult(percent, false)) }));
}

/**
 * @param {string} id
 * @param {Object} move - Original MOVES entry
 * @returns {{effects: Object[], tags: string[], cooldown: number, bypassDefenseBoosts: boolean, ported: boolean}}
 */
export function moveBehaviour(id, move) {
  const desc = String(move.desc || '');
  const isStatus = move.cat === 'stat';
  let effects;
  if (FIELD_MOVES[id]) effects = FIELD_MOVES[id];
  else if (isStatus) effects = statusMoveEffects(id, move);
  else {
    effects = [];
    // Structured secondary status of the original (eff + effC; "Inflicts X" without effC = 100%),
    // else the description rules.
    const effChance = Number(move.effC) || (/^inflicts /i.test(desc) && !/on the user/i.test(desc) ? 100 : 0);
    if (move.eff && effChance) effects.push({ kind: 'status', status: move.eff, chance: effChance, secondary: true });
    for (const effect of secondaryEffects(desc)) {
      if (effect.kind === 'status' && move.eff && effect.target !== 'self') continue;
      effects.push(effect);
    }
    if (RECOIL[id]) effects.push({ kind: 'recoil', fraction: RECOIL[id] });
    if (id === 'mind_blown') effects.push({ kind: 'recoil_max_hp', fraction: 0.5 });
    if (DRAIN[id]) effects.push({ kind: 'drain', fraction: DRAIN[id] });
    if (SPECIAL_DAMAGING_MOVES[id]) effects.push(...SPECIAL_DAMAGING_MOVES[id]);
  }

  const tags = [];
  for (const [tag, re] of Object.entries(TAG_SUFFIXES)) if (re.test(id)) tags.push(tag);
  for (const [tag, list] of Object.entries(TAG_LISTS)) if (list.includes(id)) tags.push(tag);

  const speed = desc.toLowerCase().match(/x([\d.]+)\s+(slower|faster)/);
  const cooldown = speed ? round(speed[2] === 'faster' ? 1 / parseFloat(speed[1]) : parseFloat(speed[1])) : 1;

  const neverMiss = /never misses/i.test(desc);
  // A description that is neither plain damage nor understood by the rules = not ported.
  const plain = /^(inflicts regular damage|a powerful attacking move|hits \d+(-\d+)? times?\.?$)/i.test(desc.trim()) || !desc.trim();
  const explained = plain || id in SPECIAL_STATUS_MOVES || effects.length > 0 || cooldown !== 1 || neverMiss || /bypasses all defense buffs/i.test(desc);
  return { effects, tags, cooldown, neverMiss, bypassDefenseBoosts: /bypasses all defense buffs/i.test(desc), ported: explained };
}
