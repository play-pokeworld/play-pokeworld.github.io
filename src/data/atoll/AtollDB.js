/**
 * @file AtollDB.js
 * @brief Battle Atoll canonical datasets, deterministic rotation math, team generation, and curated sets.
 */

import { DataRepository } from '../core/DataRepository.js';
import { PokemonDB } from '../pokemon/PokemonDB.js';
import { TalentDB } from '../pokemon/TalentDB.js';
import { MoveDB } from '../battle/MoveDB.js';
import { ItemDB } from '../items/ItemDB.js';
import { PokemonData } from '../pokemon/PokemonData.js';
import { MoveLearnset } from '../pokemon/MoveLearnset.js';
import { ExperienceCurve } from '../pokemon/ExperienceCurve.js';

export const ATOLL_ROTATION_MS = 12 * 3600 * 1000;
export const ATOLL_TEAMS_PER_CYCLE = 6; // 6 * 12h = 3 days cycle
export const ATOLL_RANK_SEQUENCE = Object.freeze(['E', 'D', 'C', 'B', 'A', 'S']);
export const ATOLL_FACTORY_STREAK_BONUS = 0.25;

export const ATOLL_STAT_PROFILES = Object.freeze({
  phys:  { evs: { atk: 18, spe: 18 },        ivs: { atk: 12, spe: 12, hp: 12 } },
  spec:  { evs: { spa: 18, spe: 18 },        ivs: { spa: 12, spe: 12, hp: 12 } },
  tank:  { evs: { hp: 18, def: 9, spd: 9 },  ivs: { hp: 12, def: 12, spd: 12 } },
  tanks: { evs: { hp: 18, def: 9, spd: 9 },  ivs: { hp: 12, def: 12, spd: 12 } },
  bulka: { evs: { hp: 12, atk: 18, def: 6 }, ivs: { hp: 12, atk: 12, def: 6, spd: 6 } },
  bulks: { evs: { hp: 12, spa: 18, spd: 6 }, ivs: { hp: 12, spa: 12, def: 6, spd: 6 } }
});

export const ATOLL_SETS = Object.freeze({
  18:  ['thickfat',     'choice_specs', ['hyper_beam', 'hurricane', 'earthquake', 'giga_impact'], 'spec'],
  26:  ['levitate',     'choice_specs', ['thunderbolt', 'volt_switch', 'nasty_plot', 'surf'], 'spec'],
  45:  ['solarpower',   'choice_specs', ['energy_ball', 'sludge_bomb', 'moonblast', 'toxic'], 'bulks'],
  57:  ['noguard',      'choice_band',  ['close_combat', 'ice_punch', 'knock_off', 'bulk_up'], 'phys'],
  59:  ['solarpower',   'choice_band',  ['flare_blitz', 'fire_punch', 'draco_meteor', 'overheat'], 'phys'],
  62:  ['waterabsorb',  'choice_band',  ['waterfall', 'close_combat', 'ice_punch', 'bulk_up'], 'bulka'],
  65:  ['adaptability', 'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'psychic'], 'spec'],
  71:  ['solarpower',   'choice_band',  ['leaf_blade', 'poison_jab', 'knock_off', 'swords_dance'], 'phys'],
  73:  ['multiscale',   'choice_specs', ['scald', 'sludge_bomb', 'ice_beam', 'toxic'], 'bulks'],
  83:  ['thickfat',     'choice_band',  ['hurricane', 'knock_off', 'quick_attack', 'swords_dance'], 'phys'],
  85:  ['thickfat',     'choice_band',  ['hurricane', 'drill_peck', 'knock_off', 'quick_attack'], 'phys'],
  89:  ['poisonpoint',  'choice_band',  ['poison_jab', 'knock_off', 'thunder_punch', 'earthquake'], 'bulka'],
  94:  ['adaptability', 'choice_specs', ['sludge_wave', 'shadow_ball', 'giga_impact', 'phantom_force'], 'spec'],
  95:  ['filter',       'choice_band',  ['earthquake', 'rock_slide', 'stone_edge', 'rock_polish'], 'bulka'],
  97:  ['adaptability', 'choice_specs', ['psychic', 'shadow_ball', 'future_sight', 'calm_mind'], 'spec'],
  99:  ['multiscale',   'choice_band',  ['waterfall', 'x_scissor', 'knock_off', 'swords_dance'], 'phys'],
  103: ['solarpower',   'choice_specs', ['leaf_storm', 'future_sight', 'giga_impact', 'solar_blade'], 'bulks'],
  105: ['filter',       'choice_band',  ['earthquake', 'rock_slide', 'knock_off', 'doubleedge'], 'bulka'],
  112: ['filter',       'choice_band',  ['earthquake', 'stone_edge', 'draco_meteor', 'meteor_beam'], 'bulka'],
  115: ['thickfat',     'choice_band',  ['giga_impact', 'doubleedge', 'draco_meteor', 'hyper_beam'], 'bulka'],
  117: ['multiscale',   'choice_specs', ['scald', 'ice_beam', 'dragon_pulse', 'nasty_plot'], 'spec'],
  119: ['waterabsorb',  'choice_band',  ['waterfall', 'ice_beam', 'knock_off', 'aqua_jet'], 'phys'],
  121: ['multiscale',   'choice_specs', ['future_sight', 'hydro_pump', 'giga_impact', 'extrasensory'], 'spec'],
  122: ['noguard',      'choice_specs', ['psychic', 'dazzling_gleam', 'shadow_ball', 'calm_mind'], 'spec'],
  123: ['filter',       'choice_band',  ['first_impression', 'fly', 'draco_meteor', 'hurricane'], 'phys'],
  124: ['thickfat',     'choice_specs', ['ice_beam', 'psychic', 'shadow_ball', 'nasty_plot'], 'spec'],
  127: ['filter',       'choice_band',  ['first_impression', 'x_scissor', 'draco_meteor', 'bug_buzz'], 'bulka'],
  130: ['multiscale',   'choice_band',  ['aqua_tail', 'fly', 'draco_meteor', 'hydro_pump'], 'phys'],
  131: ['waterabsorb',  'choice_specs', ['hydro_pump', 'blizzard', 'giga_impact', 'muddy_water'], 'spec'],
  132: ['thickfat',     'choice_band',  ['doubleedge', 'facade', 'hyper_beam', 'toxic'], 'phys'],
  137: ['technician',   'choice_specs', ['hyper_beam', 'thunderbolt', 'ice_beam', 'nasty_plot'], 'spec'],
  143: ['thickfat',     'choice_band',  ['giga_impact', 'doubleedge', 'draco_meteor', 'hyper_beam'], 'bulka'],
  149: ['intimidate',   'choice_band',  ['outrage', 'dragon_rush', 'hurricane', 'draco_meteor'], 'phys'],
  150: ['noguard',      'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'psychic'], 'spec'],
  151: ['noguard',      'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'psychic'], 'spec'],
  162: ['thickfat',     'choice_band',  ['doubleedge', 'knock_off', 'u_turn', 'quick_attack'], 'phys'],
  164: ['thickfat',     'choice_specs', ['hurricane', 'air_shlash', 'psychic', 'nasty_plot'], 'spec'],
  168: ['swarm',        'choice_band',  ['x_scissor', 'poison_jab', 'knock_off', 'swords_dance'], 'phys'],
  171: ['levitate',     'choice_specs', ['scald', 'thunderbolt', 'ice_beam', 'volt_switch'], 'spec'],
  181: ['static',       'choice_specs', ['thunder', 'thunderbolt', 'giga_impact', 'wild_charge'], 'spec'],
  184: ['multiscale',   'choice_band',  ['aqua_tail', 'play_rough', 'draco_meteor', 'hydro_pump'], 'bulka'],
  185: ['noguard',      'choice_band',  ['stone_edge', 'earthquake', 'body_press', 'knock_off'], 'bulka'],
  195: ['waterabsorb',  'soft_sand',    ['earthquake', 'waterfall', 'rock_slide', 'toxic'], 'tank'],
  196: ['adaptability', 'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'psychic'], 'spec'],
  197: ['adaptability', 'choice_band',  ['night_slash', 'crunch', 'draco_meteor', 'night_daze'], 'bulka'],
  199: ['multiscale',   'choice_specs', ['future_sight', 'hydro_pump', 'giga_impact', 'extrasensory'], 'bulks'],
  205: ['levitate',     'choice_band',  ['first_impression', 'iron_tail', 'draco_meteor', 'bug_buzz'], 'bulka'],
  208: ['sandveil',     'choice_band',  ['earthquake', 'iron_tail', 'draco_meteor', 'earth_power'], 'bulka'],
  210: ['noguard',      'choice_band',  ['play_rough', 'earthquake', 'thunder_punch', 'knock_off'], 'bulka'],
  212: ['technician',   'choice_band',  ['first_impression', 'iron_tail', 'draco_meteor', 'bug_buzz'], 'phys'],
  214: ['filter',       'choice_band',  ['hammer_arm', 'superpower', 'draco_meteor', 'close_combat'], 'phys'],
  217: ['thickfat',     'choice_band',  ['giga_impact', 'doubleedge', 'draco_meteor', 'hyper_beam'], 'bulka'],
  224: ['multiscale',   'choice_specs', ['hydro_pump', 'ice_beam', 'energy_ball', 'psychic'], 'spec'],
  229: ['solarpower',   'choice_specs', ['overheat', 'fire_blast', 'giga_impact', 'flare_blitz'], 'spec'],
  230: ['multiscale',   'choice_band',  ['outrage', 'aqua_tail', 'hyper_beam', 'draco_meteor'], 'phys'],
  237: ['noguard',      'choice_band',  ['mach_punk', 'close_combat', 'knock_off', 'bulk_up'], 'phys'],
  242: ['thickfat',     'choice_specs', ['hyper_beam', 'hyper_voice', 'earthquake', 'giga_impact'], 'bulks'],
  243: ['voltabsorb',   'choice_specs', ['thunder', 'thunderbolt', 'giga_impact', 'wild_charge'], 'spec'],
  244: ['solarpower',   'choice_band',  ['flare_blitz', 'fire_punch', 'draco_meteor', 'overheat'], 'phys'],
  245: ['multiscale',   'choice_specs', ['hydro_pump', 'muddy_water', 'giga_impact', 'aqua_tail'], 'bulks'],
  248: ['adaptability', 'choice_band',  ['stone_edge', 'night_slash', 'draco_meteor', 'meteor_beam'], 'bulka'],
  249: ['adaptability', 'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'hurricane'], 'spec'],
  250: ['solarpower',   'choice_band',  ['flare_blitz', 'fly', 'draco_meteor', 'overheat'], 'phys'],
  251: ['adaptability', 'choice_specs', ['leaf_storm', 'future_sight', 'giga_impact', 'solar_blade'], 'spec']
});

export const ATOLL_LEGENDARIES = Object.freeze([144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251]);
export const ATOLL_BAN_RULES = Object.freeze({ tower_s: 4, dome_final: 3 });

export const ATOLL_MODES = Object.freeze({
  tower_e: {
    key: 'tower_e',
    group: 'tower',
    maxRank: 'E',
    reward: 8,
    level: 100,
    size: 4,
    label: 'atoll_tower_e',
    pool: [10, 11, 13, 14, 129, 191]
  },
  tower_d: {
    key: 'tower_d',
    group: 'tower',
    maxRank: 'D',
    reward: 12,
    level: 100,
    size: 4,
    label: 'atoll_tower_d',
    pool: [
      10, 11, 13, 14, 16, 19, 21, 23, 41, 43, 50, 54, 60, 72, 74, 81, 86, 90, 96, 100, 102, 104,
      109, 116, 118, 129, 161, 163, 165, 167, 172, 173, 174, 175, 187, 191, 194, 220, 236, 238, 239,
      240, 246
    ]
  },
  tower_c: {
    key: 'tower_c',
    group: 'tower',
    maxRank: 'C',
    reward: 18,
    level: 100,
    size: 5,
    label: 'atoll_tower_c',
    pool: [
      18, 26, 45, 57, 62, 71, 73, 85, 89, 97, 99, 105, 117, 119, 162, 164, 168, 171, 195, 210, 224, 237
    ]
  },
  tower_b: {
    key: 'tower_b',
    group: 'tower',
    maxRank: 'B',
    reward: 26,
    level: 100,
    size: 6,
    label: 'atoll_tower_b',
    pool: [
      18, 26, 45, 57, 62, 65, 73, 85, 89, 94, 97, 99, 105, 112, 117, 119, 121, 123, 130, 137, 162,
      164, 168, 171, 195, 196, 197, 199, 205, 208, 210, 224, 237
    ]
  },
  tower_a: {
    key: 'tower_a',
    group: 'tower',
    maxRank: 'A',
    reward: 38,
    level: 100,
    size: 6,
    label: 'atoll_tower_a',
    pool: [
      65, 94, 112, 115, 121, 123, 127, 130, 131, 143, 181, 184, 196, 197, 199, 205, 208, 212, 214,
      217, 229, 230, 242
    ]
  },
  tower_s: {
    key: 'tower_s',
    group: 'tower',
    maxRank: 'S',
    reward: 55,
    level: 100,
    size: 6,
    label: 'atoll_tower_s',
    pool: [
      59, 65, 94, 103, 112, 130, 131, 143, 149, 150, 151, 181, 197, 208, 212, 229, 230, 242, 243,
      244, 245, 248, 249, 250, 251
    ]
  },
  tower_free: {
    key: 'tower_free',
    group: 'tower',
    reward: 70,
    level: 100,
    size: 6,
    label: 'atoll_tower_free',
    pool: [
      59, 65, 94, 103, 112, 130, 131, 143, 149, 150, 151, 181, 197, 208, 212, 229, 230, 242, 243,
      244, 245, 248, 249, 250, 251
    ]
  },
  factory_c: {
    key: 'factory_c',
    group: 'factory',
    maxRank: 'C',
    reward: 22,
    level: 100,
    size: 4,
    borrowed: true,
    label: 'atoll_factory_c',
    pool: [83, 97, 122, 124, 127, 132, 137, 143, 185, 196, 197, 199, 214, 217]
  },
  factory_a: {
    key: 'factory_a',
    group: 'factory',
    maxRank: 'A',
    reward: 42,
    level: 100,
    size: 5,
    borrowed: true,
    label: 'atoll_factory_a',
    pool: [
      65, 94, 115, 121, 123, 127, 130, 131, 143, 181, 184, 197, 199, 205, 208, 212, 214, 217, 229
    ]
  },
  arena_three: {
    key: 'arena_three',
    group: 'arena',
    maxRank: 'B',
    reward: 24,
    statScale: 0.5,
    level: 100,
    size: 3,
    playerCap: 3,
    label: 'atoll_arena_three',
    pool: [26, 45, 62, 65, 73, 94, 121, 123, 130, 181, 184, 197, 205]
  },
  arena_no_item: {
    key: 'arena_no_item',
    group: 'arena',
    maxRank: 'A',
    reward: 30,
    statScale: 0.5,
    level: 100,
    size: 3,
    playerCap: 3,
    noItems: true,
    label: 'atoll_arena_no_item',
    pool: [59, 65, 89, 94, 112, 121, 130, 181, 197, 208, 229]
  },
  arena_type: {
    key: 'arena_type',
    group: 'arena',
    maxRank: 'A',
    reward: 34,
    statScale: 0.5,
    level: 100,
    size: 3,
    playerCap: 3,
    label: 'atoll_arena_type',
    pool: [71, 73, 94, 95, 121, 123, 130, 181, 197, 205, 208, 212, 229]
  },
  dome_quarter: {
    key: 'dome_quarter',
    group: 'dome',
    maxRank: 'A',
    reward: 42,
    level: 100,
    size: 6,
    label: 'atoll_dome_quarter',
    pool: [18, 59, 65, 94, 112, 121, 130, 131, 181, 197, 205, 208, 212, 229]
  },
  dome_final: {
    key: 'dome_final',
    group: 'dome',
    maxRank: 'S',
    reward: 85,
    level: 100,
    size: 6,
    label: 'atoll_dome_final',
    pool: [
      59, 65, 94, 103, 112, 130, 131, 143, 149, 150, 181, 197, 208, 212, 229, 230, 242, 243, 244,
      245, 248, 249, 250
    ]
  }
});

export const ATOLL_SHOP = Object.freeze([
  ['rarecandy', 25],
  ['leftovers', 120],
  ['choice_band', 260],
  ['choice_specs', 260]
]);

export const LEGEND_FRAGMENT_COST = 50;
export const ATOLL_FRAGMENTS_PER_BOSS = 3;
export const ATOLL_BOSS_MODES = Object.freeze(['dome_final']);
export const FRAGMENT_LEGENDARY_LEVEL = 70;
export const FRAGMENT_LEGENDARIES_BY_REGION = Object.freeze({
  kanto: [144, 145, 146, 150, 151],
  johto: [243, 244, 245, 249, 250, 251],
  hoenn: [377, 378, 379, 380, 381, 382, 383, 384, 385, 386]
});

// Deterministic seed math
export function atollHashSeed(...args) {
  let h = 0x811c9dc5;
  const s = args.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function atollRng(seed) {
  let a = seed >>> 0 || 0x9e3779b9;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function atollShuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export function getRotationWindow(nowOpt) {
  const now = typeof nowOpt === 'number' && Number.isFinite(nowOpt) ? nowOpt : Date.now();
  return Math.floor(now / ATOLL_ROTATION_MS);
}

export function getRotationTimeLeftMs(nowOpt) {
  const now = typeof nowOpt === 'number' && Number.isFinite(nowOpt) ? nowOpt : Date.now();
  return (getRotationWindow(now) + 1) * ATOLL_ROTATION_MS - now;
}

export function formatRotationCountdown(ms) {
  const totalMs = Math.max(0, Number(ms) || 0);
  const s = Math.floor(totalMs / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}

export function getAtollCycleInfo(windowOpt) {
  const w = typeof windowOpt === 'number' && Number.isFinite(windowOpt) ? windowOpt | 0 : getRotationWindow();
  const idx = ((w % ATOLL_TEAMS_PER_CYCLE) + ATOLL_TEAMS_PER_CYCLE) % ATOLL_TEAMS_PER_CYCLE;
  return {
    window: w,
    team: idx + 1,
    teamCount: ATOLL_TEAMS_PER_CYCLE,
    day: Math.floor(idx / 2) + 1,
    dayCount: 3
  };
}

export function getAtollBannedLegendaries(modeKey, windowOpt) {
  const count = ATOLL_BAN_RULES[modeKey] || 0;
  if (!count) return [];
  const w = typeof windowOpt === 'number' && Number.isFinite(windowOpt) ? windowOpt | 0 : getRotationWindow();
  const rng = atollRng(atollHashSeed('atoll-ban', modeKey, w));
  return atollShuffle(ATOLL_LEGENDARIES.slice(), rng).slice(0, count).sort((a, b) => a - b);
}

export function getAtollSpeciesList(modeKey, windowOpt, kind = 'enemy') {
  const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c;
  const w = typeof windowOpt === 'number' && Number.isFinite(windowOpt) ? windowOpt | 0 : getRotationWindow();
  const kindKey = kind === 'rental' ? 'rental' : 'enemy';
  const banned = kindKey === 'enemy' ? getAtollBannedLegendaries(modeKey, w) : [];
  const src = (mode.pool || []).filter((id) => !banned.includes(id));
  const rng = atollRng(atollHashSeed('atoll-team', kindKey, modeKey, w));
  return atollShuffle(src.slice(), rng).slice(0, Math.min(mode.size, src.length));
}

export function getAtollRotationTeams(modeKey, windowOpt, kind = 'enemy') {
  const w = typeof windowOpt === 'number' && Number.isFinite(windowOpt) ? windowOpt | 0 : getRotationWindow();
  const base = w - (((w % ATOLL_TEAMS_PER_CYCLE) + ATOLL_TEAMS_PER_CYCLE) % ATOLL_TEAMS_PER_CYCLE);
  const out = [];
  for (let i = 0; i < ATOLL_TEAMS_PER_CYCLE; i++) {
    out.push(getAtollSpeciesList(modeKey, base + i, kind));
  }
  return out;
}

export function buildFallbackSetSpec(dexId, rng) {
  const species = PokemonDB.getInstance().getByDex(dexId);
  const types = species ? species.types : ['normal'];
  const legal = MoveLearnset.poolFor(types);
  const moveDb = MoveDB.getInstance();
  const damage = legal.filter((m) => (moveDb.getById(m)?.power || 0) >= 60);
  const backup = legal.filter((m) => (moveDb.getById(m)?.power || 0) > 0);
  const status = legal.filter((m) => (moveDb.getById(m)?.power || 0) === 0);
  const useDmg = atollShuffle((damage.length >= 3 ? damage : backup).slice(), rng);
  const moves = useDmg.slice(0, 3);
  if (status.length && rng() < 0.5) moves.push(atollShuffle(status.slice(), rng)[0]);
  else if (useDmg.length > 3) moves.push(useDmg[3]);
  while (moves.length < 4 && moves.length < legal.length) {
    const extra = legal[Math.floor(rng() * legal.length)];
    if (!moves.includes(extra)) moves.push(extra);
  }
  const talents = species?.talents || [];
  const talent = talents.length ? talents[Math.floor(rng() * talents.length)] : null;
  const baseStats = species?.baseStats || {};
  const prof = (baseStats.atk || 0) >= (baseStats.spa || 0) ? 'phys' : 'spec';
  return { t: talent, i: null, m: moves.slice(0, 4), prof };
}

export function getAtollSetSpec(dexId, rng) {
  const cur = ATOLL_SETS[dexId];
  if (cur) return { t: cur[0], i: cur[1] || null, m: (cur[2] || []).slice(0, 4), prof: cur[3] || 'phys' };
  return buildFallbackSetSpec(dexId, rng || atollRng(atollHashSeed('atoll-set', dexId)));
}

export function buildAtollPoke(dexId, level = 100, seedParts = [], statScale = 1) {
  const species = PokemonDB.getInstance().getByDex(dexId);
  if (!species) return null;
  const rng = atollRng(atollHashSeed('atoll-poke', dexId, ...seedParts));
  const spec = getAtollSetSpec(dexId, rng);
  const moveDb = MoveDB.getInstance();
  const legalMoves = (spec.m || []).filter((m) => moveDb.has(m)).slice(0, 4);
  const itemDb = ItemDB.getInstance();
  const heldItem = spec.i && itemDb.has(spec.i) ? spec.i : null;
  const talentDb = TalentDB.getInstance();
  const talent = spec.t && talentDb.has(spec.t) ? spec.t : (species.talents[0] || null);

  const prof = ATOLL_STAT_PROFILES[spec.prof] || {
    evs: { atk: 10, spe: 8 },
    ivs: { hp: 4, def: 4, spd: 4, spe: 6 }
  };
  const sc = typeof statScale === 'number' && statScale > 0 && statScale !== 1 ? statScale : 1;
  const scaleMap = (m) => {
    const o = {};
    for (const [k, v] of Object.entries(m || {})) o[k] = Math.round((Number(v) || 0) * sc);
    return o;
  };
  const evs = Object.assign({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, sc !== 1 ? scaleMap(prof.evs) : prof.evs);
  const ivs = Object.assign({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, sc !== 1 ? scaleMap(prof.ivs) : prof.ivs);

  const pokemon = new PokemonData({
    uid: `atoll-${dexId}-${seedParts.join('-')}`,
    species: species.id,
    form: '',
    nickname: '',
    level: Math.max(1, Math.min(100, Math.floor(level))),
    exp: ExperienceCurve.levelStart(level),
    talent,
    heldItem,
    moves: legalMoves,
    ivs,
    evs
  });
  pokemon.hp = pokemon.getMaxHp();
  return pokemon;
}

export function buildAtollTeam(modeKey, windowOpt, kind = 'enemy') {
  const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c;
  const w = typeof windowOpt === 'number' && Number.isFinite(windowOpt) ? windowOpt | 0 : getRotationWindow();
  const kindKey = kind === 'rental' ? 'rental' : 'enemy';
  const ids = getAtollSpeciesList(modeKey, w, kindKey);
  return ids
    .map((id, i) => buildAtollPoke(id, mode.level, [kindKey, modeKey, w, i], mode.statScale || 1))
    .filter(Boolean);
}

export function reorganizeAtollFactoryTeam(team, seedWindow, streak) {
  const out = (team || []).filter(Boolean).map((p) => {
    if (typeof p.healFull === 'function') p.healFull();
    else {
      p.hp = typeof p.getMaxHp === 'function' ? p.getMaxHp() : (p.maxHp || 100);
    }
    return p;
  });
  if (out.length < 2 && !(out[0] && Array.isArray(out[0].moves) && out[0].moves.length > 1)) return out;

  const rng = atollRng(atollHashSeed('atoll-reorg', seedWindow, streak));
  const beforeTeamSig = out.map((p) => p.species || p.id).join(',');
  atollShuffle(out, rng);
  if (out.length > 1 && out.map((p) => p.species || p.id).join(',') === beforeTeamSig) {
    out.push(out.shift()); // anti-identity guarantee
  }

  out.forEach((p) => {
    if (!p || !Array.isArray(p.moves) || p.moves.length < 2) return;
    const beforeMoves = p.moves.map((m) => (typeof m === 'string' ? m : m.id)).join(',');
    atollShuffle(p.moves, rng);
    if (p.moves.map((m) => (typeof m === 'string' ? m : m.id)).join(',') === beforeMoves) {
      p.moves.push(p.moves.shift()); // anti-identity guarantee
    }
  });

  return out;
}

export function computeAtollFactoryReward(base, streakBefore) {
  return Math.max(1, Math.round((Number(base) || 0) * (1 + ATOLL_FACTORY_STREAK_BONUS * Math.max(0, streakBefore || 0))));
}

export class AtollDB extends DataRepository {
  /** @private @type {AtollDB|null} */
  static _instance = null;

  /** @returns {AtollDB} */
  static getInstance() {
    if (!AtollDB._instance) AtollDB._instance = new AtollDB();
    return AtollDB._instance;
  }

  constructor() {
    super('AtollDB');
  }

  /** @protected @override */
  _build() {
    for (const [key, mode] of Object.entries(ATOLL_MODES)) {
      this._entries.set(key, mode);
    }
  }

  getMode(key) {
    return this.getById(key) || null;
  }

  getAllModes() {
    return this.getAll();
  }
}
