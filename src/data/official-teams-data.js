// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
// ─── Official teams (grand "Story & Canonical Trainers" project) ──
// Step 1 (phase 17): data foundation + automatic validator.
// Step 2 (phase 18): rival arc & Team Rocket Kanto (+ legitimate rewrite
//                      from existing Johto quest trainer battles).
// Step 3 (phase 19): gyms & leagues of BOTH regions wired to this
//                      foundation — 8 Kanto gyms (FRLG), 8 Johto gyms (GSC),
//                      Elite 4 + Champion of each league; Champion Blue
//                      varies with the player starter (variantsByStarter).
//                      champions-data.js is now only a
//                      metadata file (LEAGUE_META + getChampDef).
//
// FORMAT v2 of an OFFICIAL_TEAMS entry:
// {
//   id:      clé unique (ex. 'brock'),
//   kind:    'gym' | 'rival' | 'team_enemy' | 'league' | 'atoll' | 'quest' | 'boss',
//   region:  'kanto' | 'johto',
//   name / title: display labels,
//   role:    'rival' | 'rocket' | 'boss' | 'trainer' | 'sage' — battle visual,
//   style:   archetype labels shown in battle,
//   rewardMoney: money earned on victory (quest battles),
//   source:  canonical reference (game used for levels),
//   team:    list of Pokemon {
//     id:     dex number (PD),
//     level:  level of the official game at this adventure stage,
//     moves:  ≤ 4 moves; each id must belong to the legal pool
//             (natural learning ∪ TM/HM — the player can rebuild the
//             team, even using HMs); < 4 moves is accepted early in
//             the adventure (as in the official games),
//     talent: id ∈ getSpeciesTalents(id) (pool actually obtainable by the
//             player via training — cf. phase 17 audit). Preference for
//             abilities actually ACTIVE in the engine (levitate,
//             intimidate…) when the pool allows; otherwise cosmetic
//             custom ability (no hidden advantage, per the rule),
//     item:   null or ITEMS key of type 'held'/buff (obtainable in game)
//             whose effect is active in the engine (type_boost / choice / buff),
//     ivs/evs: totals ≤ 18 EACH (half of the 36 max, user rule);
//             concentration allowed on one stat if the Pokemon does not
//             become invincible (manually validated at balance review).
//   },
//   variantsByStarter (optionnel, rivaux) : { '<idStarterJoueur>': team }
//             — the rival team depends on the starter chosen by the player
//             (canon: the rival owns the starter strong against yours).
// }
//
// Next steps (not done here): full Johto story incl. movie 3
// (validated), atoll (6 rotating teams/mode, dated deterministic seed,
// rotation 12 h).
const OFFICIAL_TEAMS = {

  // ── Gym leaders (step 1 pilots — step 3 will wire them everywhere) ──
  brock: {
    id: 'brock', kind: 'gym', region: 'kanto',
    name: 'Pierre (Arène d\'Argenta)', title: 'Champion d\'Arène Roche',
    badge: 'boulder', badgeEmoji: '', badgeReq: 0,
    style: ['rock', 'defense'],
    rewardMoney: 1500,
    source: 'RFVF — niveaux officiels Arène 1',
    team: [
      { id: 74, level: 12, moves: ['tackle', 'rock_throw', 'mud_slap'], talent: 'rockguard', item: null, ivs: { hp: 6, def: 12 }, evs: { def: 18 } },
      { id: 95, level: 14, moves: ['tackle', 'rock_throw', 'rock_tomb', 'dig'], talent: 'rockguard', item: 'hard_stone', ivs: { hp: 6, def: 12 }, evs: { def: 18 } },
    ],
  },
  misty: {
    id: 'misty', kind: 'gym', region: 'kanto',
    name: 'Ondine (Arène d\'Azuria)', title: 'Championne d\'Arène Eau',
    badge: 'cascade', badgeEmoji: '', badgeReq: 1,
    style: ['water', 'speed', 'special'],
    rewardMoney: 2000,
    source: 'RFVF — niveaux officiels Arène 2',
    team: [
      { id: 120, level: 18, moves: ['tackle', 'water_gun', 'swift'], talent: 'swiftswim', item: null, ivs: { hp: 6, spa: 6, spe: 6 }, evs: { spe: 12, spa: 6 } },
      { id: 121, level: 21, moves: ['swift', 'water_pulse', 'psybeam'], talent: 'naturalcure', item: 'mystic_water', ivs: { spa: 9, spe: 9 }, evs: { spa: 9, spe: 9 } },
    ],
  },
  // ── Kanto gyms 3 to 8 (step 3, phase 19) — FRLG species and levels ──
  surge: {
    id: 'surge', kind: 'gym', region: 'kanto',
    name: 'Major Bob (Arène de Carmin sur Mer)', title: 'Champion d\'Arène Électrik',
    badge: 'thunder', badgeEmoji: '', badgeReq: 2,
    style: ['electric', 'speed', 'paralysis'],
    rewardMoney: 2500,
    source: 'RFVF — niveaux officiels Arène 3',
    team: [
      { id: 100, level: 21, moves: ['thunder_shock', 'thunder_wave', 'electro_web', 'swift'], talent: 'levitate', item: null, ivs: { spe: 12 }, evs: { spe: 18 } },
      { id: 25, level: 18, moves: ['thunder_shock', 'quick_attack', 'thunder_wave'], talent: 'levitate', item: null },
      { id: 26, level: 24, moves: ['thunderbolt', 'quick_attack', 'thunder_wave', 'bodyslam'], talent: 'static', item: 'magnet', ivs: { spa: 9, spe: 9 }, evs: { spa: 9, spe: 9 } },
    ],
  },
  erika: {
    id: 'erika', kind: 'gym', region: 'kanto',
    name: 'Erika (Arène de Céladopole)', title: 'Championne d\'Arène Plante',
    badge: 'rainbow', badgeEmoji: '🌈', badgeReq: 3,
    style: ['grass', 'poison', 'drain'],
    rewardMoney: 3000,
    source: 'RFVF — niveaux officiels Arène 4',
    team: [
      { id: 71, level: 29, moves: ['razor_leaf', 'acid', 'stun_spore', 'knock_off'], talent: 'overgrow', item: null, ivs: { atk: 12 }, evs: { atk: 18 } },
      { id: 114, level: 24, moves: ['vine_whip', 'stun_spore', 'poison_powder'], talent: 'leafguard', item: null },
      { id: 45, level: 29, moves: ['razor_leaf', 'acid', 'stun_spore', 'spore'], talent: 'noxious', item: 'miracle_seed', ivs: { spa: 12 }, evs: { spa: 18 } },
    ],
  },
  koga: {
    id: 'koga', kind: 'gym', region: 'kanto',
    name: 'Koga (Arène de Parmanie)', title: 'Champion d\'Arène Poison',
    badge: 'soul', badgeEmoji: '💜', badgeReq: 4,
    style: ['poison', 'status', 'tank'],
    rewardMoney: 3500,
    source: 'RFVF — niveaux officiels Arène 5',
    team: [
      { id: 109, level: 37, moves: ['sludge', 'smog', 'toxic', 'feint_attack'], talent: 'poisonpoint', item: null },
      { id: 89, level: 39, moves: ['sludge_bomb', 'acid_armor', 'toxic', 'bodyslam'], talent: 'noxious', item: null, ivs: { hp: 9, def: 9 }, evs: { hp: 9, def: 9 } },
      { id: 109, level: 37, moves: ['sludge', 'toxic', 'will_owisp', 'smog'], talent: 'poisonguard', item: null },
      { id: 110, level: 43, moves: ['sludge_bomb', 'toxic', 'flamethrower'], talent: 'poisonpoint', item: 'poison_barb', ivs: { spa: 9, def: 9 }, evs: { spa: 9, def: 9 } },
    ],
  },
  sabrina: {
    id: 'sabrina', kind: 'gym', region: 'kanto',
    name: 'Morgane (Arène de Safrania)', title: 'Championne d\'Arène Psy',
    badge: 'marsh', badgeEmoji: '', badgeReq: 5,
    style: ['psychic', 'speed', 'special'],
    rewardMoney: 3800,
    source: 'RFVF — niveaux officiels Arène 6',
    team: [
      { id: 64, level: 38, moves: ['psybeam', 'calm_mind', 'future_sight', 'barrier'], talent: 'synchronize', item: null },
      { id: 122, level: 37, moves: ['psybeam', 'barrier', 'calm_mind', 'confuse_ray'], talent: 'mistify', item: null, ivs: { def: 9, spd: 9 }, evs: { def: 9, spd: 9 } },
      { id: 49, level: 38, moves: ['silver_wind', 'psychic', 'screech', 'toxic'], talent: 'filter', item: null },
      { id: 65, level: 43, moves: ['psychic', 'calm_mind', 'future_sight', 'reflect'], talent: 'synchronize', item: 'twisted_spoon', ivs: { spa: 9, spe: 9 }, evs: { spa: 12, spe: 6 } },
    ],
  },
  blaine: {
    id: 'blaine', kind: 'gym', region: 'kanto',
    name: 'Auguste (Arène de Cramois\'île)', title: 'Champion d\'Arène Feu',
    badge: 'volcano', badgeEmoji: '🌋', badgeReq: 6,
    style: ['fire', 'burn', 'offense'],
    rewardMoney: 4000,
    source: 'RFVF — niveaux officiels Arène 7',
    team: [
      { id: 58, level: 42, moves: ['fire_fang', 'bite', 'swift', 'flame_charge'], talent: 'flamebody', item: null },
      { id: 77, level: 40, moves: ['fire_spin', 'bodyslam', 'flame_charge'], talent: 'flamebody', item: null, ivs: { spe: 12 }, evs: { spe: 18 } },
      { id: 78, level: 42, moves: ['flamethrower', 'bodyslam', 'swift'], talent: 'flamebody', item: null },
      { id: 59, level: 47, moves: ['fire_blast', 'bite', 'extreme_speed'], talent: 'flamebody', item: 'charcoal', ivs: { atk: 9, spe: 9 }, evs: { atk: 12, spe: 6 } },
    ],
  },
  giovanni: {
    id: 'giovanni', kind: 'gym', region: 'kanto',
    name: 'Giovanni (Arène de Jadielle)', title: 'Champion d\'Arène Sol',
    badge: 'earth', badgeEmoji: '🌍', badgeReq: 7,
    style: ['ground', 'bulk', 'coverage'],
    rewardMoney: 5000,
    source: 'RFVF — niveaux officiels Arène 8',
    team: [
      { id: 111, level: 45, moves: ['earthquake', 'rock_blast', 'doubleedge'], talent: 'filter', item: null, ivs: { hp: 9, atk: 9 }, evs: { atk: 12, hp: 6 } },
      { id: 51, level: 42, moves: ['earthquake', 'feint_attack', 'mud_slap'], talent: 'sandveil', item: null, ivs: { spe: 12 }, evs: { spe: 18 } },
      { id: 31, level: 44, moves: ['earthquake', 'bodyslam', 'poison_sting'], talent: 'poisonpoint', item: null },
      { id: 34, level: 45, moves: ['earthquake', 'poison_sting', 'bite'], talent: 'poisonpoint', item: null, ivs: { atk: 12 }, evs: { atk: 18 } },
      { id: 112, level: 50, moves: ['earthquake', 'rock_blast', 'doubleedge', 'stone_edge'], talent: 'filter', item: 'soft_sand', ivs: { hp: 9, atk: 9 }, evs: { atk: 12, hp: 6 } },
    ],
  },

  // ═══════════ ARC RIVAL — BLUE (Kanto) ═══════════
  // FRLG canon: the rival owns the starter strong against the player's.
  // The teams below reuse species and levels from the battles
  // officials (optional route 22, Nugget Bridge, S.S. Anne, Silph Co.,
  // route 22 pre-League). Raticate 20 on the S.S. Anne (canon 16): the
  // game evolves Rattata at level 20 — legitimacy adjustment.
  kanto_rival_route22: {
    id: 'kanto_rival_route22', kind: 'rival', region: 'kanto', role: 'rival',
    name: 'Blue (Route 22)', title: 'Rival',
    style: ['balanced'],
    rewardMoney: 1000,
    source: 'RFVF — combat optionnel route 22, avant le badge d\'Argenta',
    variantsByStarter: {
      '1': [
        { id: 16, level: 9, moves: ['tackle', 'gust'], talent: 'bigpecks', item: null },
        { id: 4, level: 9, moves: ['tackle', 'ember'], talent: 'blaze', item: null },
      ],
      '4': [
        { id: 16, level: 9, moves: ['tackle', 'gust'], talent: 'bigpecks', item: null },
        { id: 7, level: 9, moves: ['tackle', 'water_gun'], talent: 'torrent', item: null },
      ],
      '7': [
        { id: 16, level: 9, moves: ['tackle', 'gust'], talent: 'bigpecks', item: null },
        { id: 1, level: 9, moves: ['tackle', 'vine_whip'], talent: 'overgrow', item: null },
      ],
    },
  },
  kanto_rival_cerulean: {
    id: 'kanto_rival_cerulean', kind: 'rival', region: 'kanto', role: 'rival',
    name: 'Blue (Pont Pépite)', title: 'Rival',
    style: ['balanced'],
    rewardMoney: 2500,
    source: 'RFVF — combat du Pont Pépite (route 24), avant l\'arène d\'Azuria',
    variantsByStarter: {
      '1': [
        { id: 17, level: 18, moves: ['gust', 'quick_attack', 'tackle'], talent: 'bigpecks', item: null },
        { id: 63, level: 16, moves: ['confusion', 'psybeam'], talent: 'synchronize', item: null },
        { id: 19, level: 15, moves: ['tackle', 'quick_attack'], talent: 'guts', item: null },
        { id: 4, level: 18, moves: ['ember', 'fire_spin', 'tackle'], talent: 'blaze', item: null, ivs: { spe: 6 }, evs: { spe: 10 } },
      ],
      '4': [
        { id: 17, level: 18, moves: ['gust', 'quick_attack', 'tackle'], talent: 'bigpecks', item: null },
        { id: 63, level: 16, moves: ['confusion', 'psybeam'], talent: 'synchronize', item: null },
        { id: 19, level: 15, moves: ['tackle', 'quick_attack'], talent: 'guts', item: null },
        { id: 7, level: 18, moves: ['water_gun', 'water_pulse', 'tackle'], talent: 'torrent', item: null, ivs: { spe: 6 }, evs: { spe: 10 } },
      ],
      '7': [
        { id: 17, level: 18, moves: ['gust', 'quick_attack', 'tackle'], talent: 'bigpecks', item: null },
        { id: 63, level: 16, moves: ['confusion', 'psybeam'], talent: 'synchronize', item: null },
        { id: 19, level: 15, moves: ['tackle', 'quick_attack'], talent: 'guts', item: null },
        { id: 1, level: 18, moves: ['vine_whip', 'razor_leaf', 'tackle'], talent: 'overgrow', item: null, ivs: { spe: 6 }, evs: { spe: 10 } },
      ],
    },
  },
  kanto_rival_ssanne: {
    id: 'kanto_rival_ssanne', kind: 'rival', region: 'kanto', role: 'rival',
    name: 'Blue (S.S. Anne)', title: 'Rival',
    style: ['balanced'],
    rewardMoney: 3500,
    source: 'RFVF — combat du S.S. Anne (Carmin-sur-Mer)',
    variantsByStarter: {
      '1': [
        { id: 17, level: 19, moves: ['gust', 'quick_attack', 'swift'], talent: 'bigpecks', item: null },
        { id: 20, level: 20, moves: ['tackle', 'quick_attack', 'crunch'], talent: 'guts', item: null },
        { id: 64, level: 18, moves: ['confusion', 'psybeam', 'thunder_wave'], talent: 'synchronize', item: null },
        { id: 5, level: 20, moves: ['ember', 'flame_charge', 'fire_fang'], talent: 'blaze', item: null, ivs: { atk: 4, spe: 6 }, evs: { spe: 12 } },
      ],
      '4': [
        { id: 17, level: 19, moves: ['gust', 'quick_attack', 'swift'], talent: 'bigpecks', item: null },
        { id: 20, level: 20, moves: ['tackle', 'quick_attack', 'crunch'], talent: 'guts', item: null },
        { id: 64, level: 18, moves: ['confusion', 'psybeam', 'thunder_wave'], talent: 'synchronize', item: null },
        { id: 8, level: 20, moves: ['water_gun', 'water_pulse', 'aqua_jet'], talent: 'torrent', item: null, ivs: { atk: 4, spe: 6 }, evs: { spe: 12 } },
      ],
      '7': [
        { id: 17, level: 19, moves: ['gust', 'quick_attack', 'swift'], talent: 'bigpecks', item: null },
        { id: 20, level: 20, moves: ['tackle', 'quick_attack', 'crunch'], talent: 'guts', item: null },
        { id: 64, level: 18, moves: ['confusion', 'psybeam', 'thunder_wave'], talent: 'synchronize', item: null },
        { id: 2, level: 20, moves: ['vine_whip', 'razor_leaf', 'poison_powder'], talent: 'overgrow', item: null, ivs: { atk: 4, spe: 6 }, evs: { spe: 12 } },
      ],
    },
  },
  kanto_rival_silph: {
    id: 'kanto_rival_silph', kind: 'rival', region: 'kanto', role: 'rival',
    name: 'Blue (Sylphe S.A.)', title: 'Rival',
    style: ['balanced', 'fast'],
    rewardMoney: 8000,
    source: 'RFVF — combat de la Sylphe S.A. (Safrania)',
    variantsByStarter: {
      // Player Bulbasaur -> Blue has Charmander: Fire + Grass coverage.
      '1': [
      { id: 18, level: 37, moves: ['strength', 'body_press', 'hurricane', 'fly'], talent: 'bigpecks', item: null },
      { id: 58, level: 38, moves: ['fire_punch', 'fire_fang', 'flamethrower', 'strength'], talent: 'flamebody', item: null },
      { id: 102, level: 38, moves: ['extrasensory', 'energy_ball', 'psychic', 'seed_bomb'], talent: 'insomnia', item: null },
      { id: 65, level: 33, moves: ['extrasensory', 'psychic', 'zen_headbut', 'psychic_fangs'], talent: 'synchronize', item: null },
      { id: 6, level: 38, moves: ['hurricane', 'flamethrower', 'fly', 'drill_peck'], talent: 'blaze', item: 'charcoal', ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      ],
      // Player Charmander -> Blue has Squirtle: Grass + Water coverage.
      '4': [
      { id: 18, level: 37, moves: ['strength', 'body_press', 'hurricane', 'fly'], talent: 'bigpecks', item: null },
      { id: 102, level: 38, moves: ['extrasensory', 'energy_ball', 'psychic', 'seed_bomb'], talent: 'insomnia', item: null },
      { id: 130, level: 38, moves: ['aqua_tail', 'fly', 'hurricane', 'muddy_water'], talent: 'multiscale', item: null },
      { id: 65, level: 33, moves: ['extrasensory', 'psychic', 'zen_headbut', 'psychic_fangs'], talent: 'synchronize', item: null },
      { id: 9, level: 38, moves: ['muddy_water', 'surf', 'aqua_tail', 'liquidation'], talent: 'torrent', item: 'mystic_water', ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      ],
      // Player has Carapuce → Blue has Bulbizarre: Eau + Plante coverage.
      '7': [
      { id: 18, level: 37, moves: ['strength', 'body_press', 'hurricane', 'fly'], talent: 'bigpecks', item: null },
      { id: 130, level: 38, moves: ['aqua_tail', 'fly', 'hurricane', 'muddy_water'], talent: 'multiscale', item: null },
      { id: 102, level: 38, moves: ['extrasensory', 'energy_ball', 'psychic', 'seed_bomb'], talent: 'insomnia', item: null },
      { id: 65, level: 33, moves: ['extrasensory', 'psychic', 'zen_headbut', 'psychic_fangs'], talent: 'synchronize', item: null },
      { id: 3, level: 38, moves: ['sludge_wave', 'energy_ball', 'seed_bomb', 'leaf_blade'], talent: 'chlorophyll', item: 'miracle_seed', ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      ],
    },
  },
  kanto_rival_victory: {
    id: 'kanto_rival_victory', kind: 'rival', region: 'kanto', role: 'rival',
    name: 'Blue (Route 22 — avant la Ligue)', title: 'Rival',
    style: ['balanced', 'champion-prep'],
    rewardMoney: 15000,
    source: 'RFVF — combat de la route 22 avant la Ligue Pokémon',
    variantsByStarter: {
      '1': [
      { id: 18, level: 47, moves: ['doubleedge', 'strength', 'hurricane', 'body_press'], talent: 'bigpecks', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 111, level: 45, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'earth_power'], talent: 'filter', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 58, level: 45, moves: ['flare_blitz', 'fire_punch', 'fire_blast', 'flamethrower'], talent: 'insomnia', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 130, level: 47, moves: ['aqua_tail', 'fly', 'hydro_pump', 'hurricane'], talent: 'multiscale', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 65, level: 47, moves: ['future_sight', 'extrasensory', 'psychic', 'zen_headbut'], talent: 'insomnia', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 6, level: 53, moves: ['fire_blast', 'hurricane', 'flare_blitz', 'flamethrower'], talent: 'blaze', item: 'charcoal', ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      ],
      '4': [
      { id: 18, level: 47, moves: ['doubleedge', 'strength', 'hurricane', 'body_press'], talent: 'bigpecks', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 111, level: 45, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'earth_power'], talent: 'filter', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 102, level: 45, moves: ['future_sight', 'solar_beam', 'extrasensory', 'energy_ball'], talent: 'insomnia', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 130, level: 47, moves: ['aqua_tail', 'fly', 'hydro_pump', 'hurricane'], talent: 'multiscale', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 65, level: 47, moves: ['future_sight', 'extrasensory', 'psychic', 'zen_headbut'], talent: 'insomnia', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 9, level: 53, moves: ['hydro_pump', 'muddy_water', 'aqua_tail', 'surf'], talent: 'multiscale', item: 'mystic_water', ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      ],
      '7': [
      { id: 18, level: 47, moves: ['doubleedge', 'strength', 'hurricane', 'body_press'], talent: 'bigpecks', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 111, level: 45, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'earth_power'], talent: 'filter', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 58, level: 45, moves: ['flare_blitz', 'fire_punch', 'fire_blast', 'flamethrower'], talent: 'insomnia', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 102, level: 47, moves: ['future_sight', 'solar_beam', 'extrasensory', 'energy_ball'], talent: 'insomnia', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 65, level: 47, moves: ['future_sight', 'extrasensory', 'psychic', 'zen_headbut'], talent: 'insomnia', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 3, level: 53, moves: ['solar_beam', 'sludge_wave', 'energy_ball', 'seed_bomb'], talent: 'insomnia', item: 'miracle_seed', ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      ],
    },
  },

  // ═══════════ TEAM ROCKET — KANTO ═══════════
  kanto_rocket_mtmoon: {
    id: 'kanto_rocket_mtmoon', kind: 'team_enemy', region: 'kanto', role: 'rocket',
    name: 'Sbire Rocket (Mont Sélénite)', title: 'Team Rocket',
    style: ['poison', 'early'],
    rewardMoney: 1500,
    source: 'RFVF — sbires du Mont Sélénite (pillages de fossiles)',
    team: [
      { id: 19, level: 14, moves: ['tackle', 'quick_attack'], talent: 'guts', item: null },
      { id: 41, level: 14, moves: ['gust', 'poison_sting'], talent: 'poisonpoint', item: null },
      { id: 23, level: 15, moves: ['tackle', 'poison_sting', 'acid'], talent: 'poisonpoint', item: null },
    ],
  },
  kanto_super_nerd_fossil: {
    id: 'kanto_super_nerd_fossil', kind: 'quest', region: 'kanto', role: 'trainer',
    name: 'Intello Miguel (Mont Sélénite)', title: 'Super Nerd',
    style: ['science', 'electric'],
    rewardMoney: 2000,
    source: 'RFVF — Super Nerd des fossiles, Mont Sélénite',
    team: [
      { id: 81, level: 16, moves: ['tackle', 'thunder_shock', 'nuzzle'], talent: 'levitate', item: null },
      { id: 100, level: 16, moves: ['tackle', 'thunder_shock', 'swift'], talent: 'static', item: null },
      { id: 109, level: 17, moves: ['tackle', 'smog', 'acid'], talent: 'poisonpoint', item: null },
    ],
  },
  kanto_rocket_tower: {
    id: 'kanto_rocket_tower', kind: 'team_enemy', region: 'kanto', role: 'rocket',
    name: 'Sbire Rocket (Tour Pokémon)', title: 'Team Rocket',
    style: ['poison'],
    rewardMoney: 3000,
    source: 'RFVF — sbires occupant la Tour Pokémon de Lavanville',
    team: [
      { id: 41, level: 25, moves: ['air_shlash', 'poison_fang', 'gust'], talent: 'poisonpoint', item: null },
      { id: 109, level: 26, moves: ['smog', 'sludge', 'acid', 'toxic'], talent: 'poisonpoint', item: null },
      { id: 20, level: 27, moves: ['quick_attack', 'crunch', 'slash'], talent: 'guts', item: null },
    ],
  },
  kanto_rocket_hideout: {
    id: 'kanto_rocket_hideout', kind: 'team_enemy', region: 'kanto', role: 'rocket',
    name: 'Admin Rocket (Repaire du Casino)', title: 'Team Rocket',
    style: ['poison', 'dark'],
    rewardMoney: 4500,
    source: 'RFVF — repaire Rocket sous le casino de Céladopole',
    team: [
      { id: 20, level: 28, moves: ['quick_attack', 'crunch', 'strength', 'slash'], talent: 'guts', item: null },
      { id: 42, level: 29, moves: ['air_shlash', 'poison_fang', 'crunch', 'gust'], talent: 'poisonpoint', item: null },
      { id: 24, level: 30, moves: ['acid', 'poison_fang', 'crunch', 'sludge_bomb'], talent: 'poisonpoint', item: null },
      { id: 110, level: 31, moves: ['sludge_bomb', 'smog', 'acid', 'toxic'], talent: 'poisonpoint', item: 'poison_barb', ivs: { def: 9 }, evs: { def: 12 } },
    ],
  },
  kanto_giovanni_hideout: {
    id: 'kanto_giovanni_hideout', kind: 'boss', region: 'kanto', role: 'boss',
    name: 'Giovanni (Repaire du Casino)', title: 'Boss Rocket',
    style: ['ground', 'boss'],
    rewardMoney: 6000,
    source: 'RFVF — Giovanni, repaire du casino (Onix/Rhinocorne/Kangourex)',
    team: [
      { id: 95, level: 30, moves: ['rock_throw', 'rock_tomb', 'dig', 'bulldoze'], talent: 'solid', item: null },
      { id: 111, level: 31, moves: ['rock_throw', 'dig', 'bulldoze', 'tackle'], talent: 'solid', item: null },
      { id: 115, level: 33, moves: ['dizzy_punch', 'quick_attack', 'crunch', 'strength'], talent: 'guts', item: 'silk_scarf', ivs: { atk: 9, def: 9 }, evs: { atk: 18 } },
    ],
  },
  kanto_giovanni_silph: {
    id: 'kanto_giovanni_silph', kind: 'boss', region: 'kanto', role: 'boss',
    name: 'Giovanni (Sylphe S.A.)', title: 'Boss Rocket',
    style: ['ground', 'rocket'],
    rewardMoney: 10000,
    source: 'RFVF — Giovanni au siège de la Sylphe (Rhinoféros 42 : le jeu fait évoluer Rhinocorne au niveau 42)',
    team: [
      { id: 31, level: 37, moves: ['poison_fang', 'dig', 'earth_power', 'bodyslam'], talent: 'poisonpoint', item: null },
      { id: 34, level: 38, moves: ['poison_jab', 'dig', 'earth_power', 'strength'], talent: 'poisonpoint', item: null },
      { id: 115, level: 39, moves: ['dizzy_punch', 'crunch', 'quick_attack', 'bodyslam'], talent: 'guts', item: null },
      { id: 112, level: 42, moves: ['earthquake', 'rock_tomb', 'smack_down', 'strength'], talent: 'solid', item: 'soft_sand', ivs: { atk: 9, def: 9 }, evs: { atk: 12, def: 6 } },
    ],
  },

  // ═══════════ DOJO DE SAFRANIA (passe 21 — RFVF : Koichi, 888₽ canon) ═══════════
  // FRLG canon: Kicklee ♂37 (Limber) + Tygnon ♂37 (Keen Eye), both @
  // Black Belt; the gift (player's choice, Lv.25) becomes a Tyrogue Lv.25 here,
  // evolving along the kick OR punch path depending on its stats.
  kanto_dojo_master: {
    id: 'kanto_dojo_master', kind: 'quest', region: 'kanto', role: 'trainer',
    name: 'Karatéka Karuo (Dojo de Safrania)', title: 'Roi du Karaté',
    style: ['fighting', 'dojo'],
    rewardMoney: 4000,
    source: 'RFVF — Koichi, Dojo de Safrania (Hitmonlee/Hitmonchan 37 @ Black Belt ; cadeau Nv.25)',
    team: [
      { id: 106, level: 37, moves: ['brick_break', 'quick_attack', 'bulk_up', 'low_sweep'], talent: 'limber', item: 'black_belt', ivs: { atk: 9 }, evs: { atk: 9 } },
      { id: 107, level: 37, moves: ['sky_uppercut', 'fire_punch', 'ice_punch', 'thunder_punch'], talent: 'ironfist', item: 'black_belt', ivs: { atk: 9 }, evs: { atk: 9 } },
    ],
  },

  // ═══════════ ARC RIVAL — SILVER (Johto) ═══════════
  johto_rival_cherrygrove: {
    id: 'johto_rival_cherrygrove', kind: 'rival', region: 'johto', role: 'rival',
    name: 'Silver (Ville Griotte)', title: 'Rival',
    style: ['starter', 'aggressive'],
    rewardMoney: 800,
    source: 'OAC — premier combat contre Silver, starter volé',
    variantsByStarter: {
      '152': [{ id: 155, level: 8, moves: ['tackle', 'ember'], talent: 'blaze', item: null }],
      '155': [{ id: 158, level: 8, moves: ['tackle', 'water_gun'], talent: 'torrent', item: null }],
      '158': [{ id: 152, level: 8, moves: ['tackle', 'vine_whip'], talent: 'overgrow', item: null }],
    },
  },
  johto_rival_ilex: {
    id: 'johto_rival_ilex', kind: 'rival', region: 'johto', role: 'rival',
    name: 'Silver (Bois aux Chênes)', title: 'Rival',
    style: ['aggressive'],
    rewardMoney: 3000,
    source: 'OAC — combat d\'Azaléa / Bois aux Chênes',
    variantsByStarter: {
      '152': [
        { id: 92, level: 18, moves: ['lick', 'ominous_wind', 'acid'], talent: 'poisonpoint', item: null },
        { id: 41, level: 18, moves: ['gust', 'air_shlash', 'acid'], talent: 'poisonpoint', item: null },
        { id: 156, level: 20, moves: ['ember', 'flame_charge', 'quick_attack'], talent: 'blaze', item: null, ivs: { spe: 6 }, evs: { spe: 10 } },
      ],
      '155': [
        { id: 92, level: 18, moves: ['lick', 'ominous_wind', 'acid'], talent: 'poisonpoint', item: null },
        { id: 41, level: 18, moves: ['gust', 'air_shlash', 'acid'], talent: 'poisonpoint', item: null },
        { id: 159, level: 20, moves: ['water_gun', 'shark_jaws', 'aqua_jet'], talent: 'torrent', item: null, ivs: { spe: 6 }, evs: { spe: 10 } },
      ],
      '158': [
        { id: 92, level: 18, moves: ['lick', 'ominous_wind', 'acid'], talent: 'poisonpoint', item: null },
        { id: 41, level: 18, moves: ['gust', 'air_shlash', 'acid'], talent: 'poisonpoint', item: null },
        { id: 153, level: 20, moves: ['vine_whip', 'razor_leaf', 'magical_leaf'], talent: 'overgrow', item: null, ivs: { spe: 6 }, evs: { spe: 10 } },
      ],
    },
  },
  johto_rival_burned: {
    id: 'johto_rival_burned', kind: 'rival', region: 'johto', role: 'rival',
    name: 'Silver (Tour Cendrée)', title: 'Rival',
    style: ['ghost', 'aggressive'],
    rewardMoney: 4500,
    source: 'OAC — combat de la Tour Cendrée (Rosalia)',
    variantsByStarter: {
      '152': [
        { id: 92, level: 22, moves: ['lick', 'hex', 'ominous_wind'], talent: 'poisonpoint', item: null },
        { id: 41, level: 22, moves: ['air_shlash', 'poison_fang', 'gust'], talent: 'poisonpoint', item: null },
        { id: 198, level: 23, moves: ['feint_attack', 'air_shlash', 'pursuit'], talent: 'pickpocket', item: null },
        { id: 156, level: 24, moves: ['ember', 'flame_charge', 'quick_attack', 'fire_fang'], talent: 'blaze', item: null, ivs: { atk: 4, spe: 6 }, evs: { spe: 12 } },
      ],
      '155': [
        { id: 92, level: 22, moves: ['lick', 'hex', 'ominous_wind'], talent: 'poisonpoint', item: null },
        { id: 41, level: 22, moves: ['air_shlash', 'poison_fang', 'gust'], talent: 'poisonpoint', item: null },
        { id: 198, level: 23, moves: ['feint_attack', 'air_shlash', 'pursuit'], talent: 'pickpocket', item: null },
        { id: 159, level: 24, moves: ['water_gun', 'shark_jaws', 'aqua_jet', 'mud_slap'], talent: 'torrent', item: null, ivs: { atk: 4, spe: 6 }, evs: { spe: 12 } },
      ],
      '158': [
        { id: 92, level: 22, moves: ['lick', 'hex', 'ominous_wind'], talent: 'poisonpoint', item: null },
        { id: 41, level: 22, moves: ['air_shlash', 'poison_fang', 'gust'], talent: 'poisonpoint', item: null },
        { id: 198, level: 23, moves: ['feint_attack', 'air_shlash', 'pursuit'], talent: 'pickpocket', item: null },
        { id: 153, level: 24, moves: ['vine_whip', 'razor_leaf', 'magical_leaf', 'stun_spore'], talent: 'overgrow', item: null, ivs: { atk: 4, spe: 6 }, evs: { spe: 12 } },
      ],
    },
  },
  johto_rival_victory: {
    id: 'johto_rival_victory', kind: 'rival', region: 'johto', role: 'rival',
    name: 'Silver (Route Victoire)', title: 'Rival',
    style: ['balanced', 'champion-prep'],
    rewardMoney: 13000,
    source: 'OAC — combat de la Route Victoire avant la Ligue',
    variantsByStarter: {
      '152': [
      { id: 215, level: 38, moves: ['icicle_crash', 'night_slash', 'blizzard', 'ice_beam'], talent: 'insomnia', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 42, level: 39, moves: ['fly', 'drill_peck', 'hurricane', 'sludge_wave'], talent: 'bigpecks', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 82, level: 39, moves: ['thunder', 'thunderbolt', 'wild_charge', 'iron_tail'], talent: 'levitate', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 94, level: 40, moves: ['sludge_wave', 'shadow_ball', 'phantom_force', 'doubleedge'], talent: 'insomnia', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 157, level: 42, moves: ['fire_blast', 'flamethrower', 'flare_blitz', 'doubleedge'], talent: 'blaze', item: 'charcoal', ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      ],
      '155': [
      { id: 215, level: 38, moves: ['icicle_crash', 'night_slash', 'blizzard', 'ice_beam'], talent: 'insomnia', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 42, level: 39, moves: ['fly', 'drill_peck', 'hurricane', 'sludge_wave'], talent: 'bigpecks', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 82, level: 39, moves: ['thunder', 'thunderbolt', 'wild_charge', 'iron_tail'], talent: 'levitate', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 94, level: 40, moves: ['sludge_wave', 'shadow_ball', 'phantom_force', 'doubleedge'], talent: 'insomnia', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 160, level: 42, moves: ['aqua_tail', 'liquidation', 'hydro_pump', 'muddy_water'], talent: 'multiscale', item: 'mystic_water', ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      ],
      '158': [
      { id: 215, level: 38, moves: ['icicle_crash', 'night_slash', 'blizzard', 'ice_beam'], talent: 'insomnia', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 42, level: 39, moves: ['fly', 'drill_peck', 'hurricane', 'sludge_wave'], talent: 'bigpecks', item: null, ivs: { atk: 4, spe: 6 }, evs: { atk: 8, spe: 4 } },
      { id: 82, level: 39, moves: ['thunder', 'thunderbolt', 'wild_charge', 'iron_tail'], talent: 'levitate', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 94, level: 40, moves: ['sludge_wave', 'shadow_ball', 'phantom_force', 'doubleedge'], talent: 'insomnia', item: null, ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      { id: 154, level: 42, moves: ['solar_beam', 'energy_ball', 'seed_bomb', 'doubleedge'], talent: 'insomnia', item: 'miracle_seed', ivs: { spa: 4, spe: 6 }, evs: { spa: 8, spe: 4 } },
      ],
    },
  },

  // ═══════════ TEAM ROCKET — JOHTO ═══════════
  johto_sprout_elder: {
    id: 'johto_sprout_elder', kind: 'quest', region: 'johto', role: 'sage',
    name: 'Sage Li (Tour Chétiflor)', title: 'Aîné de la Tour',
    style: ['grass', 'tower'],
    rewardMoney: 2000,
    source: 'OAC — Sage Li au sommet de la Tour Chétiflor',
    team: [
      { id: 69, level: 12, moves: ['vine_whip', 'acid'], talent: 'chlorophyll', item: null },
      { id: 163, level: 12, moves: ['tackle', 'gust'], talent: 'insomnia', item: null },
      { id: 69, level: 14, moves: ['vine_whip', 'acid', 'poison_powder'], talent: 'chlorophyll', item: null },
    ],
  },
  johto_rocket_slowpoke: {
    id: 'johto_rocket_slowpoke', kind: 'team_enemy', region: 'johto', role: 'rocket',
    name: 'Sbire Rocket (Puits Ramoloss)', title: 'Team Rocket',
    style: ['poison'],
    rewardMoney: 2000,
    source: 'OAC — trafic de queues de Ramoloss, Écorcia',
    team: [
      { id: 19, level: 15, moves: ['tackle', 'quick_attack'], talent: 'guts', item: null },
      { id: 41, level: 15, moves: ['gust', 'poison_sting'], talent: 'poisonpoint', item: null },
      { id: 109, level: 16, moves: ['smog', 'acid', 'tackle'], talent: 'poisonpoint', item: null },
    ],
  },
  johto_rocket_lake: {
    id: 'johto_rocket_lake', kind: 'team_enemy', region: 'johto', role: 'rocket',
    name: 'Exécutif Rocket (Repaire d\'Acajou)', title: 'Team Rocket',
    style: ['poison', 'rage'],
    rewardMoney: 7000,
    source: 'OAC — repaire Rocket d\'Acajou, signal du Lac Colère',
    team: [
      { id: 42, level: 30, moves: ['air_shlash', 'poison_fang', 'crunch', 'gust'], talent: 'poisonpoint', item: null },
      { id: 109, level: 30, moves: ['sludge_bomb', 'smog', 'acid', 'toxic'], talent: 'poisonpoint', item: null },
      { id: 198, level: 31, moves: ['feint_attack', 'air_shlash', 'pursuit', 'snarl'], talent: 'pickpocket', item: null },
      { id: 110, level: 32, moves: ['sludge_bomb', 'smog', 'toxic', 'acid'], talent: 'poisonpoint', item: 'poison_barb', ivs: { def: 9 }, evs: { def: 12 } },
    ],
  },
  johto_rocket_radio: {
    id: 'johto_rocket_radio', kind: 'boss', region: 'johto', role: 'rocket',
    name: 'Exécutif Rocket (Tour Radio)', title: 'Team Rocket',
    style: ['rocket', 'boss'],
    rewardMoney: 10000,
    source: 'OAC — prise de la Tour Radio de Doublonville',
    team: [
      { id: 24, level: 34, moves: ['poison_fang', 'crunch', 'acid', 'sludge_bomb'], talent: 'poisonpoint', item: null },
      { id: 42, level: 35, moves: ['air_shlash', 'poison_fang', 'crunch', 'fly'], talent: 'poisonpoint', item: null },
      { id: 110, level: 36, moves: ['sludge_bomb', 'toxic', 'smog', 'acid'], talent: 'poisonpoint', item: null },
      { id: 229, level: 38, moves: ['flamethrower', 'crunch', 'fire_fang', 'bite'], talent: 'moxie', item: 'charcoal', ivs: { spa: 9, spe: 9 }, evs: { spa: 12, spe: 6 } },
    ],
  },
  // ── MOVIE 3 boss (Spell of the Unown), step 4 (phase 20) ──
  // Professor Hale, petrified inside the Unown illusion, projects a
  // crystalline Entei. Mid-adventure encounter (after Whitney):
  // the Entei is only Lv.30 (weakened illusion), Unown as escort.
  johto_film3_entei: {
    id: 'johto_film3_entei', kind: 'boss', region: 'johto', role: 'boss',
    name: 'Professeur Hale (possédé)', title: 'L\'illusion des Zarbi',
    style: ['boss', 'fire'],
    rewardMoney: 6000,
    source: 'Film 3 — Le Sort des Zarbi (Ruines d\'Alpha)',
    team: [
      { id: 201, level: 24, moves: ['confusion', 'psybeam', 'shadow_ball'], talent: 'mistify', item: null },
      { id: 244, level: 30, moves: ['fire_fang', 'bite', 'swift', 'will_owisp'], talent: 'dauntinglook', item: 'charcoal', ivs: { atk: 9, spe: 9 }, evs: { atk: 12, spe: 6 } },
      { id: 201, level: 24, moves: ['confusion', 'psybeam', 'swift'], talent: 'mistify', item: null },
    ],
  },

  // ═══════════ KANTO LEAGUE (step 3, pass 19) — FRLG first run ═══════════
  // The 5 gauntlet steps, in order (see OFFICIAL_LEAGUE_ORDER).
  lorelei: {
    id: 'lorelei', kind: 'league', region: 'kanto', role: 'league',
    name: 'Olga (Conseil 4)', title: 'Conseil 4 — Glace & Eau',
    style: ['ice', 'water'],
    source: 'RFVF — Conseil 4, 1er membre',
    team: [
      { id: 87, level: 52, moves: ['aqua_tail', 'icicle_crash', 'hydro_pump', 'blizzard'], talent: 'multiscale', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 91, level: 51, moves: ['aqua_tail', 'icicle_crash', 'hydro_pump', 'blizzard'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 80, level: 52, moves: ['future_sight', 'hydro_pump', 'extrasensory', 'giga_impact'], talent: 'multiscale', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 124, level: 54, moves: ['future_sight', 'blizzard', 'extrasensory', 'giga_impact'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 131, level: 54, moves: ['aqua_tail', 'icicle_crash', 'hydro_pump', 'blizzard'], talent: 'multiscale', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
    ],
  },
  bruno: {
    id: 'bruno', kind: 'league', region: 'kanto', role: 'league',
    name: 'Aldo (Conseil 4)', title: 'Conseil 4 — Combat & Roche',
    style: ['fighting', 'rock'],
    source: 'RFVF — Conseil 4, 2e membre',
    team: [
      { id: 95, level: 51, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'giga_impact'], talent: 'filter', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 107, level: 53, moves: ['hammer_arm', 'superpower', 'close_combat', 'focus_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 106, level: 53, moves: ['hammer_arm', 'superpower', 'close_combat', 'focus_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 95, level: 54, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'giga_impact'], talent: 'filter', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 68, level: 56, moves: ['hammer_arm', 'superpower', 'close_combat', 'focus_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
    ],
  },
  agatha: {
    id: 'agatha', kind: 'league', region: 'kanto', role: 'league',
    name: 'Agatha (Conseil 4)', title: 'Conseil 4 — Spectre & Poison',
    style: ['ghost', 'poison', 'status'],
    source: 'RFVF — Conseil 4, 3e membre',
    team: [
      { id: 94, level: 54, moves: ['sludge_wave', 'shadow_ball', 'phantom_force', 'giga_impact'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 42, level: 54, moves: ['fly', 'drill_peck', 'giga_impact', 'hurricane'], talent: 'bigpecks', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 93, level: 53, moves: ['sludge_wave', 'shadow_ball', 'phantom_force', 'giga_impact'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 24, level: 56, moves: ['poison_jab', 'poison_claw', 'toxic', 'hyper_beam'], talent: 'insomnia', item: 'choice_band', ivs: { hp: 9, def: 9 }, evs: { hp: 9, spa: 9 } },
      { id: 94, level: 58, moves: ['sludge_wave', 'shadow_ball', 'phantom_force', 'giga_impact'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
    ],
  },
  lance: {
    id: 'lance', kind: 'league', region: 'kanto', role: 'league',
    name: 'Peter (Conseil 4)', title: 'Conseil 4 — Dragon',
    style: ['dragon', 'boss'],
    source: 'RFVF — Conseil 4, 4e membre',
    team: [
      { id: 130, level: 56, moves: ['aqua_tail', 'fly', 'hydro_pump', 'giga_impact'], talent: 'multiscale', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 148, level: 54, moves: ['outrage', 'dragon_rush', 'draco_meteor', 'giga_impact'], talent: 'intimidate', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 148, level: 54, moves: ['outrage', 'dragon_rush', 'draco_meteor', 'giga_impact'], talent: 'intimidate', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 142, level: 58, moves: ['stone_edge', 'fly', 'meteor_beam', 'giga_impact'], talent: 'bigpecks', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 149, level: 60, moves: ['outrage', 'dragon_rush', 'draco_meteor', 'giga_impact'], talent: 'intimidate', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
    ],
  },
  // Champion Blue: FRLG canon — the variable duo depends on the PLAYER's starter
  // (player Bulbasaur -> Blue has Charizard + Exeggutor 59/Gyarados 61,
  //  player Charmander -> Blastoise + Arcanine 59/Exeggutor 61,
  //  player Squirtle -> Venusaur + Gyarados 59/Arcanine 61).
  blue: {
    id: 'blue', kind: 'league', region: 'kanto', role: 'league',
    name: 'Bleu (Maître de la Ligue)', title: 'Maître de la Ligue Kanto',
    style: ['balanced', 'boss'],
    source: 'RFVF — Maître de la Ligue, 1er combat',
    variantsByStarter: {
      '1': [
      { id: 18, level: 59, moves: ['giga_impact', 'doubleedge', 'hyper_beam', 'hurricane'], talent: 'bigpecks', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 65, level: 57, moves: ['future_sight', 'extrasensory', 'giga_impact', 'hyper_beam'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 112, level: 59, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'giga_impact'], talent: 'filter', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 103, level: 59, moves: ['leaf_storm', 'future_sight', 'solar_blade', 'solar_beam'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 130, level: 61, moves: ['aqua_tail', 'fly', 'hydro_pump', 'giga_impact'], talent: 'multiscale', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 6, level: 63, moves: ['overheat', 'fire_blast', 'flare_blitz', 'giga_impact'], talent: 'bigpecks', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      ],
      '4': [
      { id: 18, level: 59, moves: ['giga_impact', 'doubleedge', 'hyper_beam', 'hurricane'], talent: 'bigpecks', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 65, level: 57, moves: ['future_sight', 'extrasensory', 'giga_impact', 'hyper_beam'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 112, level: 59, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'giga_impact'], talent: 'filter', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 59, level: 59, moves: ['flare_blitz', 'fire_punch', 'overheat', 'fire_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 103, level: 61, moves: ['leaf_storm', 'future_sight', 'solar_blade', 'solar_beam'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 9, level: 63, moves: ['hydro_pump', 'muddy_water', 'giga_impact', 'hyper_beam'], talent: 'multiscale', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      ],
      '7': [
      { id: 18, level: 59, moves: ['giga_impact', 'doubleedge', 'hyper_beam', 'hurricane'], talent: 'bigpecks', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 65, level: 57, moves: ['future_sight', 'extrasensory', 'giga_impact', 'hyper_beam'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 112, level: 59, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'giga_impact'], talent: 'filter', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 130, level: 59, moves: ['aqua_tail', 'fly', 'hydro_pump', 'giga_impact'], talent: 'multiscale', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 59, level: 61, moves: ['flare_blitz', 'fire_punch', 'overheat', 'fire_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 3, level: 63, moves: ['leaf_storm', 'solar_beam', 'solar_blade', 'giga_impact'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      ],
    },
  },

  // ═══════════ JOHTO GYMS (step 3, pass 19) — GSC species/levels ═════
  falkner: {
    id: 'falkner', kind: 'gym', region: 'johto',
    name: 'Albert (Arène de Mauville)', title: 'Champion d\'Arène Vol',
    badge: 'zephyr', badgeEmoji: '🪽', badgeReq: 0,
    style: ['flying', 'speed'],
    rewardMoney: 1600,
    source: 'OAC — niveaux officiels Arène 1',
    team: [
      { id: 16, level: 9, moves: ['tackle', 'gust', 'mud_slap'], talent: 'bigpecks', item: null },
      { id: 17, level: 13, moves: ['tackle', 'gust', 'quick_attack'], talent: 'bigpecks', item: null, ivs: { spe: 12 }, evs: { spe: 18 } },
    ],
  },
  bugsy: {
    id: 'bugsy', kind: 'gym', region: 'johto',
    name: 'Hector (Arène d\'Écorcia)', title: 'Champion d\'Arène Insecte',
    badge: 'hive', badgeEmoji: '🐞', badgeReq: 1,
    style: ['bug', 'tempo'],
    rewardMoney: 2000,
    source: 'OAC — niveaux officiels Arène 2',
    team: [
      { id: 11, level: 14, moves: ['tackle', 'string_shot'], talent: 'swarm', item: null },
      { id: 14, level: 14, moves: ['poison_sting', 'string_shot'], talent: 'poisonpoint', item: null },
      { id: 123, level: 16, moves: ['quick_attack', 'fury_cutter', 'leer'], talent: 'technician', item: null, ivs: { atk: 9, spe: 9 }, evs: { atk: 9, spe: 9 } },
    ],
  },
  whitney: {
    id: 'whitney', kind: 'gym', region: 'johto',
    name: 'Blanche (Arène de Doublonville)', title: 'Championne d\'Arène Normal',
    badge: 'plain', badgeEmoji: '🐮', badgeReq: 2,
    style: ['normal', 'bulk'],
    rewardMoney: 2400,
    source: 'OAC — niveaux officiels Arène 3',
    team: [
      { id: 35, level: 18, moves: ['bodyslam', 'charm', 'sweet_kiss', 'draining_kiss'], talent: 'strangecharm', item: null },
      { id: 241, level: 20, moves: ['stomp', 'bodyslam', 'rock_slide', 'screech'], talent: 'naturalcure', item: 'silk_scarf', ivs: { hp: 9, atk: 9 }, evs: { hp: 9, atk: 9 } },
    ],
  },
  morty: {
    id: 'morty', kind: 'gym', region: 'johto',
    name: 'Mortimer (Arène de Rosalia)', title: 'Champion d\'Arène Spectre',
    badge: 'fog', badgeEmoji: '', badgeReq: 3,
    style: ['ghost', 'status'],
    rewardMoney: 3000,
    source: 'OAC — niveaux officiels Arène 4',
    team: [
      { id: 92, level: 21, moves: ['lick', 'confuse_ray', 'smog'], talent: 'intimidate', item: null },
      { id: 93, level: 21, moves: ['lick', 'confuse_ray', 'smog', 'shadow_sneak'], talent: 'intimidate', item: null },
      { id: 93, level: 23, moves: ['shadow_ball', 'lick', 'confuse_ray', 'will_owisp'], talent: 'hexerei', item: null },
      { id: 94, level: 25, moves: ['shadow_ball', 'lick', 'will_owisp', 'confuse_ray'], talent: 'intimidate', item: 'spell_tag', ivs: { spa: 9, spe: 9 }, evs: { spa: 9, spe: 9 } },
    ],
  },
  chuck: {
    id: 'chuck', kind: 'gym', region: 'johto',
    name: 'Chuck (Arène d\'Irisia)', title: 'Champion d\'Arène Combat',
    badge: 'storm', badgeEmoji: '🥊', badgeReq: 4,
    style: ['fighting', 'physical'],
    rewardMoney: 3400,
    source: 'OAC — niveaux officiels Arène 5',
    team: [
      { id: 57, level: 27, moves: ['leer', 'rock_smash', 'double_slap'], talent: 'scrappy', item: null, ivs: { atk: 12 }, evs: { atk: 18 } },
      { id: 62, level: 30, moves: ['surf', 'cross_chop', 'bodyslam', 'bulk_up'], talent: 'waterveil', item: 'black_belt', ivs: { hp: 9, atk: 9 }, evs: { atk: 12, hp: 6 } },
    ],
  },
  jasmine: {
    id: 'jasmine', kind: 'gym', region: 'johto',
    name: 'Jasmine (Arène d\'Oliville)', title: 'Championne d\'Arène Acier',
    badge: 'mineral', badgeEmoji: '', badgeReq: 5,
    style: ['steel', 'defense'],
    rewardMoney: 3800,
    source: 'OAC — niveaux officiels Arène 6',
    team: [
      { id: 81, level: 30, moves: ['thunderbolt', 'magnet_bomb', 'thunder_wave'], talent: 'levitate', item: null },
      { id: 81, level: 30, moves: ['thunderbolt', 'magnet_bomb', 'thunder_wave'], talent: 'levitate', item: null },
      { id: 208, level: 35, moves: ['iron_tail', 'earthquake', 'rock_slide', 'doubleedge'], talent: 'bastion', item: 'metal_coat', ivs: { hp: 9, def: 9 }, evs: { def: 12, hp: 6 } },
    ],
  },
  pryce: {
    id: 'pryce', kind: 'gym', region: 'johto',
    name: 'Frédo (Arène d\'Acajou)', title: 'Champion d\'Arène Glace',
    badge: 'glacier', badgeEmoji: '❄', badgeReq: 6,
    style: ['ice', 'water'],
    rewardMoney: 4300,
    source: 'OAC — niveaux officiels Arène 7',
    team: [
      { id: 86, level: 27, moves: ['aurora_beam', 'ice_shard', 'aqua_jet'], talent: 'waterveil', item: null },
      { id: 87, level: 29, moves: ['aurora_beam', 'icy_wind', 'aqua_tail'], talent: 'rime', item: null, ivs: { spa: 12 }, evs: { spa: 18 } },
      { id: 221, level: 31, moves: ['avalanche', 'magnitude', 'mud_slap', 'ice_shard'], talent: 'filter', item: 'never_melt_ice', ivs: { hp: 9, atk: 9 }, evs: { atk: 12, hp: 6 } },
    ],
  },
  clair: {
    id: 'clair', kind: 'gym', region: 'johto',
    name: 'Sandra (Arène d\'Ébénelle)', title: 'Championne d\'Arène Dragon',
    badge: 'rising', badgeEmoji: '', badgeReq: 7,
    style: ['dragon', 'boss'],
    rewardMoney: 5000,
    source: 'OAC — niveaux officiels Arène 8',
    team: [
      { id: 148, level: 37, moves: ['dragon_breath', 'thunder_wave', 'aqua_tail', 'swift'], talent: 'marvelscale', item: null },
      { id: 148, level: 37, moves: ['dragon_breath', 'thunder_wave', 'twister', 'safeguard'], talent: 'draconic', item: null },
      { id: 148, level: 37, moves: ['dragon_breath', 'surf', 'thunder_wave'], talent: 'adaptability', item: null },
      { id: 230, level: 40, moves: ['dragon_breath', 'surf', 'whirlpool', 'twister'], talent: 'intimidate', item: 'dragon_fang', ivs: { spa: 9, spe: 9 }, evs: { spa: 12, spe: 6 } },
    ],
  },

  // ═══════════ JOHTO LEAGUE (step 3, pass 19) — GSC first run ═══════════
  will: {
    id: 'will', kind: 'league', region: 'johto', role: 'league',
    name: 'Clément (Conseil 4)', title: 'Conseil 4 — Psy',
    style: ['psychic'],
    source: 'OAC — Conseil 4, 1er membre',
    team: [
      { id: 178, level: 40, moves: ['future_sight', 'extrasensory', 'giga_impact', 'hurricane'], talent: 'bigpecks', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 124, level: 41, moves: ['future_sight', 'blizzard', 'extrasensory', 'giga_impact'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 103, level: 41, moves: ['leaf_storm', 'future_sight', 'solar_blade', 'solar_beam'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 80, level: 41, moves: ['future_sight', 'hydro_pump', 'extrasensory', 'giga_impact'], talent: 'multiscale', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 178, level: 42, moves: ['future_sight', 'extrasensory', 'giga_impact', 'hurricane'], talent: 'bigpecks', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
    ],
  },
  koga_e4: {
    id: 'koga_e4', kind: 'league', region: 'johto', role: 'league',
    name: 'Koga (Conseil 4)', title: 'Conseil 4 — Poison',
    style: ['poison', 'ninja'],
    source: 'OAC — Conseil 4, 2e membre',
    team: [
      { id: 168, level: 40, moves: ['first_impression', 'poison_jab', 'giga_impact', 'hyper_beam'], talent: 'filter', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 49, level: 41, moves: ['sludge_wave', 'bug_buzz', 'first_impression', 'giga_impact'], talent: 'filter', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 205, level: 43, moves: ['first_impression', 'iron_tail', 'giga_impact', 'hyper_beam'], talent: 'levitate', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 89, level: 42, moves: ['poison_jab', 'poison_claw', 'giga_impact', 'hyper_beam'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 169, level: 44, moves: ['fly', 'drill_peck', 'giga_impact', 'hurricane'], talent: 'bigpecks', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
    ],
  },
  bruno_johto: {
    id: 'bruno_johto', kind: 'league', region: 'johto', role: 'league',
    name: 'Aldo (Conseil 4)', title: 'Conseil 4 — Combat',
    style: ['fighting'],
    source: 'OAC — Conseil 4, 3e membre',
    team: [
      { id: 237, level: 42, moves: ['hammer_arm', 'superpower', 'close_combat', 'focus_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 106, level: 42, moves: ['hammer_arm', 'superpower', 'close_combat', 'focus_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 107, level: 42, moves: ['hammer_arm', 'superpower', 'close_combat', 'focus_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 95, level: 43, moves: ['earthquake', 'stone_edge', 'meteor_beam', 'giga_impact'], talent: 'filter', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 68, level: 46, moves: ['hammer_arm', 'superpower', 'close_combat', 'focus_blast'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
    ],
  },
  karen: {
    id: 'karen', kind: 'league', region: 'johto', role: 'league',
    name: 'Marion (Conseil 4)', title: 'Conseil 4 — Ténèbres',
    style: ['dark', 'night'],
    source: 'OAC — Conseil 4, 4e membre',
    team: [
      { id: 197, level: 42, moves: ['night_slash', 'crunch', 'giga_impact', 'hyper_beam'], talent: 'insomnia', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 45, level: 42, moves: ['leaf_storm', 'solar_beam', 'solar_blade', 'giga_impact'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 198, level: 44, moves: ['fly', 'night_slash', 'giga_impact', 'hurricane'], talent: 'bigpecks', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 94, level: 45, moves: ['sludge_wave', 'shadow_ball', 'phantom_force', 'giga_impact'], talent: 'insomnia', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 229, level: 47, moves: ['overheat', 'fire_blast', 'flare_blitz', 'giga_impact'], talent: 'blaze', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
    ],
  },
  lance_johto: {
    id: 'lance_johto', kind: 'league', region: 'johto', role: 'league',
    name: 'Peter (Maître de la Ligue)', title: 'Maître de la Ligue Johto',
    style: ['dragon', 'boss'],
    source: 'OAC — Maître de la Ligue Johto',
    team: [
      { id: 130, level: 44, moves: ['aqua_tail', 'fly', 'hydro_pump', 'giga_impact'], talent: 'multiscale', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 149, level: 47, moves: ['outrage', 'dragon_rush', 'draco_meteor', 'giga_impact'], talent: 'intimidate', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 149, level: 47, moves: ['outrage', 'dragon_rush', 'draco_meteor', 'giga_impact'], talent: 'intimidate', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 142, level: 46, moves: ['stone_edge', 'fly', 'meteor_beam', 'giga_impact'], talent: 'bigpecks', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
      { id: 6, level: 46, moves: ['overheat', 'fire_blast', 'flare_blitz', 'giga_impact'], talent: 'bigpecks', item: 'choice_specs', ivs: { spa: 6, spe: 12 }, evs: { spa: 16, spe: 2 } },
      { id: 149, level: 50, moves: ['outrage', 'dragon_rush', 'draco_meteor', 'giga_impact'], talent: 'intimidate', item: 'choice_band', ivs: { atk: 6, spe: 12 }, evs: { atk: 16, spe: 2 } },
    ],
  },
};

// Gauntlet step order of each league (OFFICIAL_TEAMS keys).
// The last member is the Champion (in Kanto, team varies with the
// player starter — see variantsByStarter of 'blue').
const OFFICIAL_LEAGUE_ORDER = {
  kanto: ['lorelei', 'bruno', 'agatha', 'lance', 'blue'],
  johto: ['will', 'koga_e4', 'bruno_johto', 'karen', 'lance_johto'],
  hoenn: ['sidney', 'phoebe', 'glacia', 'drake', 'steven'],
};

function getOfficialLeagueKeys(region) {
  return (OFFICIAL_LEAGUE_ORDER[region] || OFFICIAL_LEAGUE_ORDER.kanto).slice();
}

// Instantiated team of gauntlet stage `stageIdx` — resolves the
// Champion Blue variant via the player starter (null -> 1st-variant fallback).
function getOfficialLeagueTeam(region, stageIdx, starterId) {
  const keys = getOfficialLeagueKeys(region);
  const key = keys[Math.max(0, Math.min(stageIdx || 0, keys.length - 1))];
  return getOfficialTeam(key, starterId) || [];
}

if (typeof OFFICIAL_LEAGUE_ORDER !== 'undefined') { if (typeof window !== 'undefined') window.OFFICIAL_LEAGUE_ORDER = OFFICIAL_LEAGUE_ORDER; if (typeof globalThis !== 'undefined') globalThis.OFFICIAL_LEAGUE_ORDER = OFFICIAL_LEAGUE_ORDER; }
if (typeof getOfficialLeagueKeys !== 'undefined') { if (typeof window !== 'undefined') window.getOfficialLeagueKeys = getOfficialLeagueKeys; if (typeof globalThis !== 'undefined') globalThis.getOfficialLeagueKeys = getOfficialLeagueKeys; }
if (typeof getOfficialLeagueTeam !== 'undefined') { if (typeof window !== 'undefined') window.getOfficialLeagueTeam = getOfficialLeagueTeam; if (typeof globalThis !== 'undefined') globalThis.getOfficialLeagueTeam = getOfficialLeagueTeam; }

// Builds a playable instance of an official-team Pokemon (mirror of
// legacy trainerPoke, without depending on its scope). Moves missing
// from MOVES are filtered (like trainerPoke) — the test validator
// reports them, so they must never appear.
function buildOfficialTeamPoke(spec) {
  const p = createPoke(spec.id, spec.level, !!spec.shiny);
  if (!p) return p;
  if (spec.moves) p.moves = spec.moves.filter((m) => MOVES && MOVES[m]).slice(0, 4).map((m) => ({ id: m }));
  if (spec.talent) p.talent = spec.talent;
  if (spec.item) p.heldItem = spec.item;
  if (spec.evs) p.evs = Object.assign({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, spec.evs);
  if (spec.ivs) p.ivs = Object.assign({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, spec.ivs);
  try { recalcPokeStats(p); p.currentHP = p.maxHP; } catch (_) {}
  return p;
}

// Returns the SPEC LIST of an official entry, resolving the
// rival variant via the player starter if needed.
function getOfficialTeamSpecs(key, starterId) {
  const entry = OFFICIAL_TEAMS[key] || ((typeof OFFICIAL_TEAMS_HOENN !== 'undefined') ? OFFICIAL_TEAMS_HOENN[key] : null);
  if (!entry) return null;
  if (entry.variantsByStarter) {
    const byStarter = entry.variantsByStarter[String(starterId)];
    if (byStarter) return byStarter;
    // Fallback: first variant (player with no known starter — e.g. box team).
    const first = Object.keys(entry.variantsByStarter)[0];
    return entry.variantsByStarter[first];
  }
  return entry.team || null;
}

// Returns the instantiated team of an official entry (or null if unknown).
// starterId: the PLAYER's starter for variantsByStarter entries.
function getOfficialTeam(key, starterId) {
  const specs = getOfficialTeamSpecs(key, starterId);
  if (!specs) return null;
  return specs.map((spec) => buildOfficialTeamPoke(spec));
}

// --- Migrated to ES module, globals exposed ---
if (typeof OFFICIAL_TEAMS !== 'undefined') { if (typeof window !== 'undefined') window.OFFICIAL_TEAMS = OFFICIAL_TEAMS; if (typeof globalThis !== 'undefined') globalThis.OFFICIAL_TEAMS = OFFICIAL_TEAMS; }
if (typeof buildOfficialTeamPoke !== 'undefined') { if (typeof window !== 'undefined') window.buildOfficialTeamPoke = buildOfficialTeamPoke; if (typeof globalThis !== 'undefined') globalThis.buildOfficialTeamPoke = buildOfficialTeamPoke; }
if (typeof getOfficialTeamSpecs !== 'undefined') { if (typeof window !== 'undefined') window.getOfficialTeamSpecs = getOfficialTeamSpecs; if (typeof globalThis !== 'undefined') globalThis.getOfficialTeamSpecs = getOfficialTeamSpecs; }
if (typeof getOfficialTeam !== 'undefined') { if (typeof window !== 'undefined') window.getOfficialTeam = getOfficialTeam; if (typeof globalThis !== 'undefined') globalThis.getOfficialTeam = getOfficialTeam; }


// Wave 40 — native ESM module: grouped export of the same names as the
// classic surface kept above/here (bodies unchanged).
export {
  OFFICIAL_LEAGUE_ORDER,
  getOfficialLeagueKeys,
  getOfficialLeagueTeam,
  OFFICIAL_TEAMS,
  buildOfficialTeamPoke,
  getOfficialTeamSpecs,
  getOfficialTeam,
};

