// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
// ─── Hoenn Official Teams (RSE) — Gyms & League ───
// Strategic, same difficulty as Kanto (FRLG) and Johto (HGSS)

export var OFFICIAL_TEAMS_HOENN = {
  hoenn_poochyena_route101: {
    id: 'hoenn_poochyena_route101', kind: 'quest', region: 'hoenn',
    name: 'Medhyèna sauvage', title: 'Pokémon sauvage',
    badge: null, badgeReq: 0,
    style: ['dark'],
    rewardMoney: 500,
    source: 'RSE — combat quête Route 101',
    team: [
      { id: 261, level: 2, moves: ['tackle', 'howl'], talent: 'moxie', item: null }
    ]
  },
  roxanne: {
    id: 'roxanne', kind: 'gym', region: 'hoenn',
    name: 'Roxanne (Arène de Mérouville)', title: 'Championne d\'Arène Roche',
    badge: 'stone', badgeEmoji: '🪨', badgeReq: 0,
    style: ['rock', 'defense'],
    rewardMoney: 1500,
    source: 'RSE — niveaux officiels Arène 1',
    team: [
      { id: 74, level: 14, moves: ['rock_throw', 'tackle', 'rock_polish'], talent: 'rockguard', item: null },
      { id: 299, level: 15, moves: ['rock_tomb', 'tackle', 'rock_polish', 'rock_slide'], talent: 'rockguard', item: 'occa_berry', ivs: { def: 12 }, evs: { def: 18 } }
    ]
  },
  brawly: {
    id: 'brawly', kind: 'gym', region: 'hoenn',
    name: 'Bastien (Arène de Myokara)', title: 'Champion d\'Arène Combat',
    badge: 'knuckle', badgeEmoji: '🥊', badgeReq: 1,
    style: ['fighting', 'bulk_up'],
    rewardMoney: 2000,
    source: 'RSE — niveaux officiels Arène 2',
    team: [
      { id: 66, level: 17, moves: ['low_sweep', 'rock_smash', 'brick_break'], talent: 'guts', item: null },
      { id: 296, level: 18, moves: ['bulk_up', 'arm_thrust', 'storm_throw', 'rock_smash'], talent: 'thickfat', item: 'babiri_berry', ivs: { atk: 12 }, evs: { atk: 18 } }
    ]
  },
  wattson: {
    id: 'wattson', kind: 'gym', region: 'hoenn',
    name: 'Voltère (Arène de Lavandia)', title: 'Champion d\'Arène Électrik',
    badge: 'dynamo', badgeEmoji: '⚡', badgeReq: 2,
    style: ['electric', 'speed', 'paralysis'],
    rewardMoney: 2500,
    source: 'RSE — niveaux officiels Arène 3',
    team: [
      { id: 100, level: 20, moves: ['thunder_wave', 'thunder_shock', 'screech'], talent: 'static', item: null },
      { id: 309, level: 20, moves: ['thunder_shock', 'quick_attack', 'thunder_wave'], talent: 'static', item: null },
      { id: 82, level: 22, moves: ['thunderbolt', 'metal_sound', 'thunder_wave'], talent: 'static', item: null },
      { id: 310, level: 24, moves: ['thunderbolt', 'quick_attack', 'thunder_wave', 'howl'], talent: 'static', item: 'babiri_berry', ivs: { spa: 12, spe: 12 }, evs: { spa: 18, spe: 18 } }
    ]
  },
  flannery: {
    id: 'flannery', kind: 'gym', region: 'hoenn',
    name: 'Adrianna (Arène de Vermilava)', title: 'Championne d\'Arène Feu',
    badge: 'heat', badgeEmoji: '🔥', badgeReq: 3,
    style: ['fire', 'overheat'],
    rewardMoney: 3000,
    source: 'RSE — niveaux officiels Arène 4',
    team: [
      { id: 218, level: 26, moves: ['overheat', 'smog', 'light_screen'], talent: 'flamebody', item: null },
      { id: 323, level: 28, moves: ['overheat', 'bodyslam', 'sunny_day'], talent: 'magmaarmor', item: null },
      { id: 324, level: 29, moves: ['overheat', 'bodyslam', 'earthquake', 'flamethrower'], talent: 'flamebody', item: 'white_herb', ivs: { spa: 12, def: 12 }, evs: { spa: 18, def: 18 } }
    ]
  },
  norman: {
    id: 'norman', kind: 'gym', region: 'hoenn',
    name: 'Norman (Arène de Clémenti-Ville)', title: 'Champion d\'Arène Normal',
    badge: 'balance', badgeEmoji: '⚖️', badgeReq: 4,
    style: ['normal', 'power'],
    rewardMoney: 3500,
    source: 'RSE — niveaux officiels Arène 5',
    team: [
      { id: 327, level: 28, moves: ['dizzy_punch', 'psybeam', 'facade'], talent: 'owntempo', item: null },
      { id: 288, level: 30, moves: ['slash', 'facade', 'feint_attack'], talent: 'insomnia', item: null },
      { id: 264, level: 29, moves: ['slash', 'belly_drum', 'facade'], talent: 'scrappy', item: null },
      { id: 289, level: 31, moves: ['facade', 'strength', 'bodyslam', 'shadow_ball'], talent: 'thickfat', item: 'babiri_berry', ivs: { atk: 12, hp: 12 }, evs: { atk: 18, hp: 18 } }
    ]
  },
  winona: {
    id: 'winona', kind: 'gym', region: 'hoenn',
    name: 'Alizée (Arène de Cimmery)', title: 'Championne d\'Arène Vol',
    badge: 'feather', badgeEmoji: '🪶', badgeReq: 5,
    style: ['flying', 'dragon_dance'],
    rewardMoney: 4000,
    source: 'RSE — niveaux officiels Arène 6',
    team: [
      { id: 333, level: 31, moves: ['peck', 'feather_dance', 'safeguard'], talent: 'naturalcure', item: null },
      { id: 357, level: 32, moves: ['sunny_day', 'solar_beam', 'fly'], talent: 'chlorophyll', item: null },
      { id: 279, level: 32, moves: ['water_gun', 'growl', 'fly'], talent: 'bigpecks', item: null },
      { id: 227, level: 32, moves: ['steel_wing', 'drill_peck', 'metal_sound'], talent: 'rockguard', item: null },
      { id: 334, level: 33, moves: ['fly', 'dragon_breath', 'dragon_dance', 'earthquake'], talent: 'naturalcure', item: 'babiri_berry', ivs: { atk: 12, spe: 12 }, evs: { atk: 18, spe: 18 } }
    ]
  },
  tate_liza: {
    id: 'tate_liza', kind: 'gym', region: 'hoenn',
    name: 'Lévy & Tatia (Arène d\'Algatia)', title: 'Champions d\'Arène Psy (Duo)',
    badge: 'mind', badgeEmoji: '🧠', badgeReq: 6,
    style: ['psychic', 'sun_synergy'],
    rewardMoney: 4500,
    source: 'RSE — niveaux officiels Arène 7',
    team: [
      { id: 344, level: 41, moves: ['earthquake', 'psychic', 'ancient_power', 'light_screen'], talent: 'levitate', item: null },
      { id: 178, level: 41, moves: ['psychic', 'confuse_ray', 'sunny_day', 'calm_mind'], talent: 'synchronize', item: null },
      { id: 337, level: 42, moves: ['psychic', 'confusion', 'calm_mind', 'light_screen'], talent: 'levitate', item: null },
      { id: 338, level: 42, moves: ['solar_beam', 'psychic', 'flamethrower', 'sunny_day'], talent: 'levitate', item: 'babiri_berry', ivs: { spa: 12, def: 12 }, evs: { spa: 18, def: 18 } }
    ]
  },
  juan: {
    id: 'juan', kind: 'gym', region: 'hoenn',
    name: 'Juan (Arène d\'Atalanopolis)', title: 'Champion d\'Arène Eau',
    badge: 'rain', badgeEmoji: '💧', badgeReq: 7,
    style: ['water', 'rain_dance'],
    rewardMoney: 5000,
    source: 'RSE — niveaux officiels Arène 8',
    team: [
      { id: 370, level: 41, moves: ['water_pulse', 'aqua_jet', 'sweet_kiss', 'whirlpool'], talent: 'swiftswim', item: null },
      { id: 340, level: 41, moves: ['rain_dance', 'water_pulse', 'earthquake', 'amnesia'], talent: 'owntempo', item: null },
      { id: 364, level: 43, moves: ['aurora_beam', 'water_pulse', 'bodyslam', 'powder_snow'], talent: 'thickfat', item: null },
      { id: 342, level: 43, moves: ['water_pulse', 'crabhammer', 'crunch', 'leer'], talent: 'solid', item: null },
      { id: 230, level: 46, moves: ['water_pulse', 'ice_beam', 'dragon_breath', 'surf'], talent: 'swiftswim', item: 'chesto_berry', ivs: { spa: 12, spe: 12 }, evs: { spa: 18, spe: 18 } }
    ]
  },

  // Elite Four and Champion
  sidney: {
    id: 'sidney', kind: 'league', region: 'hoenn',
    name: 'Damien (Conseil 4 Hoenn)', title: 'Conseil 4 Ténèbres',
    style: ['dark', 'offense'], rewardMoney: 5500,
    source: 'RSE — Conseil 4',
    team: [
      { id: 262, level: 49, moves: ['growl', 'bodyslam', 'bite', 'crunch'], talent: 'intimidate', item: null },
      { id: 275, level: 49, moves: ['knock_off', 'razor_leaf', 'extrasensory', 'feint_attack'], talent: 'chlorophyll', item: null },
      { id: 332, level: 50, moves: ['cotton_spore', 'needle_arm', 'feint_attack', 'seed_bomb'], talent: 'sandveil', item: null },
      { id: 342, level: 50, moves: ['swords_dance', 'strength', 'facade', 'surf'], talent: 'solid', item: null },
      { id: 359, level: 51, moves: ['night_slash', 'rock_slide', 'swords_dance', 'slash'], talent: 'justified', item: 'babiri_berry', ivs: { atk: 12, spe: 12 }, evs: { atk: 18, spe: 18 } }
    ]
  },
  phoebe: {
    id: 'phoebe', kind: 'league', region: 'hoenn',
    name: 'Spectra (Conseil 4 Hoenn)', title: 'Conseil 4 Spectre',
    style: ['ghost', 'confuse'], rewardMoney: 6000,
    source: 'RSE — Conseil 4',
    team: [
      { id: 356, level: 51, moves: ['shadow_punch', 'confuse_ray', 'hex', 'earthquake'], talent: 'levitate', item: null },
      { id: 354, level: 51, moves: ['shadow_ball', 'shadow_sneak', 'feint_attack', 'ominous_wind'], talent: 'insomnia', item: null },
      { id: 302, level: 52, moves: ['shadow_ball', 'feint_attack', 'shadow_sneak', 'knock_off'], talent: 'intangible', item: null },
      { id: 354, level: 52, moves: ['shadow_ball', 'psychic', 'thunderbolt', 'facade'], talent: 'insomnia', item: null },
      { id: 356, level: 53, moves: ['shadow_ball', 'ice_beam', 'rock_slide', 'earthquake'], talent: 'levitate', item: 'babiri_berry', ivs: { atk: 12, def: 12 }, evs: { atk: 18, def: 18 } }
    ]
  },
  glacia: {
    id: 'glacia', kind: 'league', region: 'hoenn',
    name: 'Glacia (Conseil 4 Hoenn)', title: 'Conseil 4 Glace',
    style: ['ice', 'hail'], rewardMoney: 6500,
    source: 'RSE — Conseil 4',
    team: [
      { id: 362, level: 53, moves: ['light_screen', 'crunch', 'ice_beam', 'shadow_ball'], talent: 'insomnia', item: null },
      { id: 365, level: 53, moves: ['hail', 'ice_ball', 'bodyslam', 'blizzard'], talent: 'thickfat', item: null },
      { id: 365, level: 54, moves: ['hail', 'ice_ball', 'bodyslam', 'blizzard'], talent: 'thickfat', item: null },
      { id: 362, level: 54, moves: ['light_screen', 'crunch', 'ice_beam', 'shadow_ball'], talent: 'insomnia', item: null },
      { id: 365, level: 55, moves: ['surf', 'bodyslam', 'ice_beam', 'blizzard'], talent: 'thickfat', item: 'babiri_berry', ivs: { spa: 12, hp: 12 }, evs: { spa: 18, hp: 18 } }
    ]
  },
  drake: {
    id: 'drake', kind: 'league', region: 'hoenn',
    name: 'Aragon (Conseil 4 Hoenn)', title: 'Conseil 4 Dragon',
    style: ['dragon', 'power'], rewardMoney: 7000,
    source: 'RSE — Conseil 4',
    team: [
      { id: 371, level: 54, moves: ['dragon_claw', 'bite', 'dragon_breath', 'bodyslam'], talent: 'rockguard', item: null },
      { id: 334, level: 54, moves: ['bodyslam', 'dragon_breath', 'dragon_dance', 'fly'], talent: 'naturalcure', item: null },
      { id: 330, level: 55, moves: ['dragon_breath', 'earthquake', 'fly', 'rock_slide'], talent: 'levitate', item: null },
      { id: 330, level: 55, moves: ['dragon_claw', 'earthquake', 'crunch', 'flamethrower'], talent: 'levitate', item: null },
      { id: 373, level: 56, moves: ['dragon_claw', 'flamethrower', 'rock_slide', 'earthquake'], talent: 'intimidate', item: 'babiri_berry', ivs: { atk: 12, spe: 12 }, evs: { atk: 18, spe: 18 } }
    ]
  },
  steven: {
    id: 'steven', kind: 'league', region: 'hoenn',
    name: 'Pierre Rochard (Maître de Hoenn)', title: 'Maître de la Ligue de Hoenn',
    style: ['steel', 'champion'], rewardMoney: 10000,
    source: 'RSE — Maître',
    team: [
      { id: 227, level: 57, moves: ['toxic', 'drill_peck', 'metal_sound', 'steel_wing'], talent: 'rockguard', item: null },
      { id: 344, level: 57, moves: ['reflect', 'light_screen', 'earthquake', 'psychic'], talent: 'levitate', item: null },
      { id: 306, level: 57, moves: ['iron_tail', 'earthquake', 'rock_slide', 'stone_edge'], talent: 'rockguard', item: null },
      { id: 346, level: 57, moves: ['ancient_power', 'energy_ball', 'confuse_ray', 'sludge_bomb'], talent: 'solid', item: null },
      { id: 348, level: 57, moves: ['slash', 'ancient_power', 'earthquake', 'x_scissor'], talent: 'solid', item: null },
      { id: 376, level: 58, moves: ['iron_head', 'earthquake', 'psychic', 'shadow_ball'], talent: 'fullmetalbody', item: 'babiri_berry', ivs: { atk: 12, def: 12, hp: 12 }, evs: { atk: 18, def: 18 } }
    ]
  }
};

// Wave 40 — surface kept (window → globalThis block, same scope).
if (typeof globalThis !== 'undefined') globalThis.OFFICIAL_TEAMS_HOENN = OFFICIAL_TEAMS_HOENN;
if (typeof OFFICIAL_TEAMS !== 'undefined' && OFFICIAL_TEAMS && typeof OFFICIAL_TEAMS_HOENN !== 'undefined') {
  Object.assign(OFFICIAL_TEAMS, OFFICIAL_TEAMS_HOENN);
}
if (typeof window !== 'undefined' && window.OFFICIAL_TEAMS && OFFICIAL_TEAMS_HOENN) {
  Object.assign(window.OFFICIAL_TEAMS, OFFICIAL_TEAMS_HOENN);
}




