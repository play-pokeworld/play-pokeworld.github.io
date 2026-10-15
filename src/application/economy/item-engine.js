/**
 * ItemEngine — Data-driven item system
 *
 * Powers: calculated dynamically from quantity owned
 * Descriptions: generated from templates with injected values
 * Locations: retrieved from item-database
 *
 * Architecture: Pure engine — no DOM, no globals (except final exposure)
 */
// Wave 41 — native ESM module: IIFE removed (module-private), content unchanged.
'use strict';

// ───── Power levels by quantity owned (PokeChill system) ─────
// PokeChill scale 1→20 (5 paliers) ; PokéWorld sac = 25 → 6 paliers
// (le palier 6 est atteint à 25 exemplaires).
function getPowerLevel(qty) {
  if (qty >= 25) return 6;
  if (qty >= 20) return 5;
  if (qty >= 15) return 4;
  if (qty >= 10) return 3;
  if (qty >= 5) return 2;
  return 1;
}

// ───── Evaluate has power formula string ─────
function evalFormula(formula, level) {
  try {
    return Function('level', '"use strict"; return (' + formula + ')')(level);
  } catch (_e) {
    return 1;
  }
}

// ───── Get effective power of an item ─────
function getItemPower(itemKey, qtyOverride) {
  const item = window.ITEMS && window.ITEMS[itemKey];
  if (!item || !item.powerFormula) return 1;
  const qty =
    qtyOverride !== undefined
      ? qtyOverride
      : window.G && window.G.inventory
        ? window.G.inventory[itemKey] || 0
        : 0;
  const level = getPowerLevel(qty);
  return evalFormula(item.powerFormula, level);
}

// ───── Get power display string (e.g. "x1.10" at 1 copy, "x1.50" at 25) ─────
function getPowerDisplay(itemKey) {
  const item = window.ITEMS && window.ITEMS[itemKey];
  if (!item || !item.powerFormula) return '';
  const qty = window.G && window.G.inventory ? window.G.inventory[itemKey] || 0 : 0;
  const level = getPowerLevel(qty);
  const power = evalFormula(item.powerFormula, level);
  const levelMax = evalFormula(item.powerFormula, 6);
  return 'x' + power.toFixed(2) + ' (max x' + levelMax.toFixed(2) + ')';
}

// ───── Status/type badge HTML generator ─────
const TYPE_COLORS = {
  normal: '#A0A29F',
  fire: '#FBA64C',
  water: '#539DDF',
  grass: '#60BE58',
  electric: '#F2D94E',
  ice: '#76D1C1',
  fighting: '#CE3E5A',
  poison: '#BA68D2',
  ground: '#DA7C4D',
  flying: '#A1BBEC',
  psychic: '#FA8582',
  bug: '#92BD2D',
  rock: '#C9BC8A',
  ghost: '#5F6DBC',
  dragon: '#0C6AC8',
  dark: '#595761',
  steel: '#5795A3',
  fairy: '#EF90E6',
};

function typeBadge(typeName) {
  const key = typeName.toLowerCase();
  const color = TYPE_COLORS[key] || '#888';
  const label = typeof getTypeName === 'function' ? getTypeName(typeName) : typeName;
  return (
    '<span class="type-badge type-' +
    key +
    '" data-type-color="' +
    color +
    '" data-style="color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;">' +
    label +
    '</span>'
  );
}

function statusTag(statusName, colorType) {
  const key = (colorType || statusName).toLowerCase();
  const color = TYPE_COLORS[key] || '#888';
  return (
    '<span data-buff="' +
    key +
    '"><span data-type-color="' +
    color +
    '" data-style="color:white;cursor:help;padding:0.1rem 0.7rem;border-radius:0.2rem;font-size:1.1rem;width:auto;background:var(--type-color,#888);">' +
    statusName +
    '</span></span>'
  );
}

const STATUS_TAGS = {
  burn: statusTag(typeof t === 'function' ? t('status_burn_label') : 'Burn', 'fire'),
  freeze: statusTag(typeof t === 'function' ? t('status_freeze_label') : 'Freeze', 'ice'),
  para: statusTag(typeof t === 'function' ? t('status_para_label') : 'Paralysis', 'electric'),
  poison: statusTag(typeof t === 'function' ? t('status_poisoned') : 'Poisoned', 'poison'),
  sleep: statusTag(typeof t === 'function' ? t('status_sleep_label') : 'Sleep', 'normal'),
  confuse: statusTag(typeof t === 'function' ? t('status_confuse_label') : 'Confusion', 'psychic'),
  sunny: statusTag(typeof t === 'function' ? t('weather_sunny') : 'Sunny', 'fire'),
  rainy: statusTag(typeof t === 'function' ? t('weather_rainy') : 'Rainy', 'water'),
  sand: statusTag(typeof t === 'function' ? t('weather_sandstorm') : 'Sandstorm', 'ground'),
  hail: statusTag(typeof t === 'function' ? t('weather_hail') : 'Hail', 'ice'),
  eterrain: statusTag(
    typeof t === 'function' ? t('terrain_electric') : 'Electric Terrain',
    'electric'
  ),
  gterrain: statusTag(typeof t === 'function' ? t('terrain_grassy') : 'Grassy Terrain', 'grass'),
  mterrain: statusTag(typeof t === 'function' ? t('terrain_misty') : 'Misty Terrain', 'fairy'),
};

const EN_STATUS = {
  burn: 'Burn',
  freeze: 'Freeze',
  para: 'Paralysis',
  poison: 'Poisoned',
  sleep: 'Sleep',
  confuse: 'Confused',
  sunny: 'Sunny',
  rainy: 'Rainy',
  sand: 'Sandstorm',
  hail: 'Hail',
  eterrain: 'Electric Terrain',
  gterrain: 'Grassy Terrain',
  mterrain: 'Misty Terrain',
};

function getStatusTag(key, lang) {
  if (lang === 'en') {
    const enName = EN_STATUS[key] || key;
    const colorKey = key
      .replace('eterrain', 'electric')
      .replace('gterrain', 'grass')
      .replace('mterrain', 'fairy');
    return statusTag(enName, colorKey);
  }
  return STATUS_TAGS[key] || key;
}

// ───── DORM-06b — tables de description des objets futurs ─────
// Gemmes Méga : clé → [nom FR, nom EN, forme ' X'/' Y'/'']
const MEGA_SPECIES = {
  abomasite: ['Blizzaroi', 'Abomasnow', ''],
  absolite: ['Absol', 'Absol', ''],
  aerodactylite: ['Ptéra', 'Aerodactyl', ''],
  aggronite: ['Galeking', 'Aggron', ''],
  alakazite: ['Alakazam', 'Alakazam', ''],
  altarianite: ['Altaria', 'Altaria', ''],
  ampharosite: ['Pharamp', 'Ampharos', ''],
  audinite: ['Nanméouïe', 'Audino', ''],
  banettite: ['Branette', 'Banette', ''],
  barbaracite: ['Golgopathe', 'Barbaracle', ''],
  baxcaliburite: ['Glaivodo', 'Baxcalibur', ''],
  beedrillite: ['Dardargnan', 'Beedrill', ''],
  blastoisinite: ['Tortank', 'Blastoise', ''],
  blazikenite: ['Braségali', 'Blaziken', ''],
  cameruptite: ['Camérupt', 'Camerupt', ''],
  diancite: ['Diancie', 'Diancie', ''],
  dragonitite: ['Dracolosse', 'Dragonite', ''],
  falinksite: ['Salarsen', 'Falinks', ''],
  galladite: ['Gallame', 'Gallade', ''],
  garchompite: ['Carchacrok', 'Garchomp', ''],
  gardevoirite: ['Gardevoir', 'Gardevoir', ''],
  gengarite: ['Ectoplasma', 'Gengar', ''],
  glalitite: ['Oniglali', 'Glalie', ''],
  gyaradosite: ['Léviator', 'Gyarados', ''],
  hawluchanite: ['Brutalibré', 'Hawlucha', ''],
  heracronite: ['Scarhino', 'Heracross', ''],
  houndoominite: ['Démolosse', 'Houndoom', ''],
  kangaskhanite: ['Kangourex', 'Kangaskhan', ''],
  latiasite: ['Latias', 'Latias', ''],
  latiosite: ['Latios', 'Latios', ''],
  lopunnite: ['Lockpin', 'Lopunny', ''],
  lucarionite: ['Lucario', 'Lucario', ''],
  manectite: ['Élecsprint', 'Manectric', ''],
  mawilite: ['Mysdibule', 'Mawile', ''],
  medichamite: ['Charmina', 'Medicham', ''],
  metagrossite: ['Métalosse', 'Metagross', ''],
  pidgeotite: ['Roucarnage', 'Pidgeot', ''],
  pinsirite: ['Scarabrute', 'Pinsir', ''],
  pyroarite: ['Némélios', 'Pyroar', ''],
  sablenite: ['Ténéfix', 'Sableye', ''],
  salamencite: ['Drattak', 'Salamence', ''],
  sceptilite: ['Jungko', 'Sceptile', ''],
  scizorite: ['Cizayox', 'Scizor', ''],
  sharpedonite: ['Sharpedo', 'Sharpedo', ''],
  slowbronite: ['Flagadoss', 'Slowbro', ''],
  steelixite: ['Steelix', 'Steelix', ''],
  swampertite: ['Laggron', 'Swampert', ''],
  tyranitarite: ['Tyranocif', 'Tyranitar', ''],
  venusaurite: ['Florizarre', 'Venusaur', ''],
  charizardite_x: ['Dracaufeu', 'Charizard', ' X'],
  charizardite_y: ['Dracaufeu', 'Charizard', ' Y'],
  mewtwonite_x: ['Mewtwo', 'Mewtwo', ' X'],
  mewtwonite_y: ['Mewtwo', 'Mewtwo', ' Y'],
  raichutite_x: ['Raichu', 'Raichu', ' X'],
  raichutite_y: ['Raichu', 'Raichu', ' Y'],
  apricorn: {
    red_apricorn: { fr: 'Rouge', en: 'Red' },
    blue_apricorn: { fr: 'Bleu', en: 'Blue' },
    yellow_apricorn: { fr: 'Jaune', en: 'Yellow' },
    green_apricorn: { fr: 'Vert', en: 'Green' },
    pink_apricorn: { fr: 'Rose', en: 'Pink' },
    white_apricorn: { fr: 'Blanc', en: 'White' },
    black_apricorn: { fr: 'Noir', en: 'Black' },
  },
};
const LEGEND_KEY_DESC = {
  red_orb: [
    'The Red Orb: a relic tied to Groudon. A legendary quest trophy.',
    'Orbe Rouge : relique liée à Groudon. Trophée de quête légendaire.',
  ],
  blue_orb: [
    'The Blue Orb: a relic tied to Kyogre. A legendary quest trophy.',
    'Orbe Bleu : relique liée à Kyogre. Trophée de quête légendaire.',
  ],
  gs_ball_celebi: [
    'The GS Ball: a relic tied to Celebi. A legendary quest trophy.',
    'GS Ball : relique liée à Celebi. Trophée de quête légendaire.',
  ],
  clear_bell_hooh: [
    'The Clear Bell: a relic tied to Ho-Oh. A legendary quest trophy.',
    'Cloche Claire : relique liée à Ho-Oh. Trophée de quête légendaire.',
  ],
  tidal_bell_lugia: [
    'The Tidal Bell: a relic tied to Lugia. A legendary quest trophy.',
    'Cloche Marée : relique liée à Lugia. Trophée de quête légendaire.',
  ],
  eon_ticket_latis: [
    'The Eon Ticket: allows you to encounter Latias and Latios.',
    'Ticket Éon : permet de rencontrer Latias et Latios.',
  ],
  meteorite_shard_delta: [
    'A Meteorite Shard: a fragment tied to Deoxys.',
    'Éclat de Météorite : fragment lié à Deoxys.',
  ],
  meteorite_bills_errand: [
    "A meteorite sought during Bill's errand.",
    'Météorite recherchée durant la quête de Léo.',
  ],
};
const TRAINING_STAT = {
  power_bracer: { fr: 'Attaque', en: 'Attack' },
  power_belt: { fr: 'Défense', en: 'Defense' },
  power_lens: { fr: 'Att. Spé', en: 'Sp. Atk' },
  power_band: { fr: 'Déf. Spé', en: 'Sp. Def' },
  power_anklet: { fr: 'Vitesse', en: 'Speed' },
  power_weight: { fr: 'PV', en: 'HP' },
};
const PLATE_TYPE = {
  blank_plate: 'Normal',
  draco_plate: 'Dragon',
  dread_plate: 'Dark',
  earth_plate: 'Ground',
  fist_plate: 'Fighting',
  flame_plate: 'Fire',
  icicle_plate: 'Ice',
  insect_plate: 'Bug',
  iron_plate: 'Steel',
  meadow_plate: 'Grass',
  mind_plate: 'Psychic',
  pixie_plate: 'Fairy',
  sky_plate: 'Flying',
  splash_plate: 'Water',
  spooky_plate: 'Ghost',
  stone_plate: 'Rock',
  toxic_plate: 'Poison',
  zap_plate: 'Electric',
};
const FARM_DESC = {
  amaze_mulch: [
    'Amaze Mulch: greatly speeds up berry growth.',
    'Terreau Prodige : accélère fortement la pousse des baies.',
  ],
  boost_mulch: [
    'Boost Mulch: increases the berry harvest.',
    'Terreau Boost : augmente la récolte de baies.',
  ],
  freeze_mulch: [
    'Freeze Mulch: keeps planted berries fresh longer.',
    'Terreau Gel : conserve les baies plantées plus longtemps.',
  ],
  gooey_mulch: ['Gooey Mulch: favors rarer berries.', 'Terreau Glueux : favorise les baies rares.'],
  rich_mulch: [
    'Rich Mulch: improves the harvest quality.',
    'Terreau Riche : améliore la qualité de la récolte.',
  ],
  surprise_mulch: [
    'Surprise Mulch: produces a random harvest.',
    'Terreau Surprise : produit une récolte aléatoire.',
  ],
  berry_shovel: [
    'Berry Shovel: used to plant berries on the farm.',
    'Pelle à Baies : sert à planter des baies à la ferme.',
  ],
  mulch_shovel: [
    'Mulch Shovel: used to spread mulch on the farm.',
    'Pelle à Terreau : sert à appliquer du terreau à la ferme.',
  ],
  cerulean_berry_shop_permit: [
    'Berry Shop Permit: allows berry purchases in Celadon.',
    "Permis Baies : autorise l'achat de baies à Céladon.",
  ],
};
const FLUTE_DESC = {
  red_flute: ['Red Flute: cures infatuation.', "Flûte Rouge : guérit l'attirance."],
  blue_flute: [
    'Blue Flute: wakes the Pokémon (cures Sleep).',
    'Flûte Bleue : réveille le Pokémon (retire le Sommeil).',
  ],
  yellow_flute: [
    'Yellow Flute: snaps the Pokémon out of Confusion.',
    'Flûte Jaune : dissipe la Confusion.',
  ],
  white_flute: [
    'White Flute: attracts wild Pokémon.',
    'Flûte Blanche : attire les Pokémon sauvages.',
  ],
  black_flute: ['Black Flute: repels wild Pokémon.', 'Flûte Noire : éloigne les Pokémon sauvages.'],
  time_flute: [
    'Time Flute: speeds up time-based effects.',
    'Flûte Tempo : accélère les effets temporels.',
  ],
};
const TOOL_DESC = {
  treasure_scanner: [
    'Treasure Scanner: reveals hidden underground treasures.',
    'Scanner de Trésors : révèle les trésors cachés au Souterrain.',
  ],
  dowsing_machine: [
    'Dowsing Machine: detects hidden items nearby.',
    'Détecteur : détecte les objets cachés à proximité.',
  ],
  token_collector: [
    'Token Collector: automatically gathers tokens.',
    'Collecteur de Jetons : récolte automatiquement les jetons.',
  ],
};

// ───── Generate description for an item ─────
function generateItemDesc(itemKey, lang, opts) {
  lang = lang || 'fr';
  const item = window.ITEMS && window.ITEMS[itemKey];
  if (!item) return '';

  // Règle joueur (Passe 26e) : afficher UNIQUEMENT la valeur au stock actuel
  // (sac) ou la valeur de base à 1 exemplaire (dictionnaire) — jamais « X → Y ».
  const baseOnly = !!(opts && opts.baseOnly);
  const qty = !baseOnly && window.G && window.G.inventory ? window.G.inventory[itemKey] || 0 : 0;
  const level = baseOnly ? 1 : getPowerLevel(qty);
  const power = evalFormula(item.powerFormula || '1', level);
  const powStr = 'x' + power.toFixed(2);
  function _statusLabel(key, langKey) {
    const frKeys = {
      burn: 'status_burn_label',
      freeze: 'status_freeze_label',
      para: 'status_para_label',
      poison: 'status_poison',
      sleep: 'status_sleep_label',
      confuse: 'status_confuse_label',
      sunny: 'weather_sunny',
      rainy: 'weather_rainy',
      sand: 'weather_sandstorm',
      hail: 'weather_hail',
      eterrain: 'terrain_electric',
      gterrain: 'terrain_grassy',
      mterrain: 'terrain_misty',
    }; // phase 27b: 'status_poison' (badgable noun) instead of status_poisoned
    // (the past participle was not caught by the status badger)
    if (langKey === 'en') {
      const enMap = {
        sand: 'Sandstorm',
        eterrain: 'Electric Terrain',
        gterrain: 'Grassy Terrain',
        mterrain: 'Misty Terrain',
      };
      return enMap[key] || EN_STATUS[key] || key;
    }
    const k = frKeys[key];
    const v = k && typeof t === 'function' ? t(k) : '';
    return v && v !== k ? v : EN_STATUS[key] || key;
  }
  function _powerSentence(langKey) {
    if (langKey === 'en') return 'Boosts power by ';
    const v = typeof t === 'function' ? t('held_power_sentence') : '';
    return v && v !== 'held_power_sentence' ? v : 'Augmente la puissance de ';
  }

  // Poké Balls — le taux vient de BALL_DEFS (source unique), jamais en dur.
  if (item.type === 'ball') {
    const _defs = typeof window !== 'undefined' && window.BALL_DEFS ? window.BALL_DEFS : null;
    const _def = _defs ? _defs[itemKey] : null;
    const _rate = _def ? Number(_def.rate) : Number(item.rate) || 10;
    const _scaling = !!(_def && _def.scaling);
    const _flavor = lang === 'en' ? item.desc_en || '' : item.desc_fr || '';
    // retire la phrase de taux en dur (elle est recalculée ci-dessous)
    const _clean = String(_flavor)
      .replace(/\s*(?:Taux de capture|Catch rate)\s*:\s*\d+\s*%\.?/i, '')
      .trim();
    const _rateLine =
      typeof tr === 'function'
        ? tr('ball_catch_rate', { rate: _rate })
        : lang === 'en'
          ? 'Catch rate: ' + _rate + '%'
          : 'Taux de capture : ' + _rate + ' %';
    if (_scaling) {
      const _scaleLine =
        lang === 'en'
          ? '+2% per owned tier (up to +10% at 25 copies).'
          : "+2 % par palier possédé (jusqu'à +10 % à 25 ex.).";
      return [_rateLine, _scaleLine, _clean].filter((x) => x && String(x).trim()).join(' · ');
    }
    return [_rateLine, _clean].filter((x) => x && String(x).trim()).join(' · ');
  }

  // Type boosters
  if (item.category === 'type_boost' && item.typeBoost) {
    const badge = typeBadge(item.typeBoost);
    if (lang === 'en') {
      return 'When held: Increase the damage of ' + badge + '-Type moves by ' + powStr;
    }
    return (
      (typeof t === 'function' ? t('held_boost_type') : 'Held: boosts ') + badge + ' de ' + powStr
    );
  }

  // Resistance berries
  if (item.category === 'resistance_berry' && item.resistType) {
    const badge = typeBadge(item.resistType);
    const pct = item.resistPercent || 30;
    if (lang === 'en') {
      return (
        'When held: Decreases the super-effective damage taken from ' +
        badge +
        '-Type moves by ' +
        pct +
        '%.'
      );
    }
    return (
      (typeof t === 'function' ? t('held_resist_prefix') : 'Held: reduces ') +
      pct +
      '% ' +
      (typeof t === 'function' ? t('held_resist_suffix') : 'super effective damage of ') +
      badge
    );
  }

  // Choice items
  if (item.category === 'choice') {
    const statEn =
      {
        atk: typeof t === 'function' ? t('stat_atk') : 'Attack',
        spa: typeof t === 'function' ? t('stat_spa') : 'Sp. Atk',
        spe: typeof t === 'function' ? t('stat_spe') : 'Speed',
      }[item.stat] || (typeof t === 'function' ? t('stat_atk') : 'Attack');
    const _statFr =
      {
        atk: typeof t === 'function' ? t('stat_atk') : 'Attack',
        spa: typeof t === 'function' ? t('stat_spa') : 'Sp. Atk',
        spe: typeof t === 'function' ? t('stat_spe') : 'Speed',
      }[item.stat] || (typeof t === 'function' ? t('stat_atk') : 'Attack');
    if (lang === 'en') {
      return (
        'When held: Increases the ' +
        statEn +
        ' of the user by ' +
        powStr +
        ', but prevents them from switching'
      );
    }
    return (
      (typeof t === 'function' ? t('held_choice_item') : 'Held: raises ') +
      statEn +
      ' de ' +
      powStr +
      (typeof t === 'function' ? t('held_choice_lock') : ', but prevents switching')
    );
  }

  // Gems
  if (item.category === 'gem' && item.gemType) {
    const badge = typeBadge(item.gemType);
    if (lang === 'en') {
      return 'When held: Boosts ' + badge + ' damage by 30% once';
    }
    return (
      (typeof t === 'function' ? t('held_boost_prefix') : 'Held: boosts ') +
      badge +
      ' de 30% une fois'
    );
  }

  // Seeds
  if (item.category === 'seed') {
    const s = item.seedType || '';
    if (lang === 'en') return 'When held: Raises Defense in ' + s + ' Terrain';
    return (typeof t === 'function' ? t('held_terrain_def') : 'Held: raises Defense in ') + s;
  }

  // Weather rocks
  if (item.category === 'weather' && item.weather) {
    const wTag = _statusLabel(item.weather, lang);
    if (lang === 'en') return 'When held: Increases the duration of ' + wTag + ' weather';
    return (typeof t === 'function' ? t('held_weather_duration') : 'Held: extends weather ') + wTag;
  }

  // Status orbs
  if (item.category === 'status' && item.statusEffect) {
    const sTag = _statusLabel(item.statusEffect, lang);
    if (lang === 'en') {
      return 'When held: Increases the Damage of the user by ' + powStr + ', but inflicts ' + sTag;
    }
    return (
      (typeof t === 'function' ? t('held_damage_boost') : 'Held: boost user damage by ') +
      powStr +
      (typeof t === 'function' ? t('held_inflicts') : ', mais inflige ') +
      sTag
    );
  }

  // DORM-00 — descriptions réelles des objets tenus (source PokeChill).
  if (item.category === 'eviolite') {
    return lang === 'en'
      ? 'When held: +50% Defense and Sp. Def if the Pokémon can still evolve.'
      : 'Held: +50 % Défense et Défense Spéciale si le Pokémon peut encore évoluer.';
  }
  if (item.category === 'exp') {
    return lang === 'en' ? 'When held: +50% experience gained.' : "Held: +50 % d'EXP gagnée.";
  }
  if (item.category === 'loot') {
    return lang === 'en'
      ? 'When held: increases the drop rate of wild Pokémon for the whole team.'
      : "Held: augmente le taux de butin des Pokémon sauvages (pour toute l'équipe).";
  }
  if (item.category === 'encounter') {
    return lang === 'en'
      ? 'When held: increases the weight of rare wild Pokémon for the whole team.'
      : "Held: augmente le poids des Pokémon sauvages rares (pour toute l'équipe).";
  }
  if (item.category === 'boost') {
    return lang === 'en'
      ? 'When held: +2 Attack and Sp. Atk stages after taking a super-effective hit.'
      : "Held: +2 crans d'Attaque et d'Attaque Spéciale après un coup super efficace subi.";
  }
  if (item.category === 'defense') {
    return lang === 'en'
      ? 'When held: -10% special damage taken.'
      : 'Held: -10 % de dégâts spéciaux subis.';
  }
  if (item.category === 'terrain') {
    return lang === 'en'
      ? 'When held: extends the active terrain to 8 turns instead of 5.'
      : 'Held: prolonge le terrain actif (8 tours au lieu de 5).';
  }
  if (item.category === 'leftovers') {
    return lang === 'en'
      ? 'When held: restores HP every turn.'
      : 'Held: récupère des PV à chaque tour.';
  }
  if (item.category === 'speed') {
    // Vive Griffe
    return lang === 'en'
      ? 'When held: the holder attacks a little faster than usual.'
      : "Held: le porteur attaque un peu plus vite que d'habitude.";
  }
  if (item.category === 'multi_hit') {
    // Dé à Jouer
    return lang === 'en'
      ? 'When held: multi-hit moves always strike the maximum number of times.'
      : 'Held: les capacités multi-coups frappent toujours le nombre maximal de fois.';
  }
  if (item.category === 'extend') {
    // Lumargile
    return lang === 'en'
      ? 'When held: positive effects last 1 extra turn.'
      : 'Held: les effets positifs durent 1 tour de plus.';
  }
  if (item.category === 'charge') {
    // Herbe Pouvoir
    return lang === 'en'
      ? 'When held: moves that need charging are executed immediately.'
      : "Held: les capacités à charger s'exécutent immédiatement.";
  }
  if (item.category === 'cure') {
    // Herbe Mentale
    return lang === 'en'
      ? 'When held: negative effects last 1 turn less.'
      : 'Held: les effets négatifs durent 1 tour de moins.';
  }
  if (item.category === 'slow') {
    // Queue Lente
    return lang === 'en'
      ? 'When held: the holder attacks a little slower but deals more damage.'
      : 'Held: le porteur attaque un peu moins vite mais inflige plus de dégâts.';
  }
  if (item.category === 'hazards') {
    // Bottes Lourdes
    return lang === 'en'
      ? 'When held: immune to entry hazards on the field.'
      : 'Held: immunisé contre les pièges posés sur le terrain.';
  }
  if (item.category === 'protect') {
    // Amulette Pure
    return lang === 'en'
      ? "When held: prevents the holder's stats from being lowered."
      : 'Held: empêche la baisse des statistiques du porteur.';
  }
  if (item.category === 'punch') {
    // Poing Chance
    return lang === 'en'
      ? 'When held: punch moves deal more damage.'
      : 'Held: les capacités de poing infligent plus de dégâts.';
  }
  if (item.category === 'consecutive') {
    // Métronome
    return lang === 'en'
      ? 'When held: repeating the same move keeps increasing its power.'
      : 'Held: répéter la même capacité augmente progressivement sa puissance.';
  }
  if (item.category === 'eject') {
    // Bouton de Fuite / Sac de Fuite
    return lang === 'en'
      ? 'When held: forces the holder to switch out after attacking.'
      : 'Held: force le porteur à être remplacé après avoir attaqué.';
  }

  // DORM-06 — baies tenues (aucune consommée) & consommables : descriptions
  // générées par catégorie, avec la valeur 1→25 exemplaires si powerFormula.
  const _statFr = {
    hp: 'PV',
    atk: 'Attaque',
    def: 'Défense',
    spa: 'Att. Spé',
    spd: 'Déf. Spé',
    spe: 'Vitesse',
  };
  const _statEn = {
    hp: 'HP',
    atk: 'Attack',
    def: 'Defense',
    spa: 'Sp. Atk',
    spd: 'Sp. Def',
    spe: 'Speed',
  };
  if (item.category === 'immunity_berry' && item.immunity) {
    const stFr =
      {
        para: 'Paralysie',
        sleep: 'Sommeil',
        poison: 'Poison',
        burn: 'Brûlure',
        freeze: 'Gel',
        confuse: 'Confusion',
      }[item.immunity] || item.immunity;
    const stEn =
      {
        para: 'Paralysis',
        sleep: 'Sleep',
        poison: 'Poison',
        burn: 'Burn',
        freeze: 'Freeze',
        confuse: 'Confusion',
      }[item.immunity] || item.immunity;
    return lang === 'en'
      ? `When held: immune to ${stEn} for the whole battle.`
      : `Tenue : immunise contre ${stFr} pendant tout le combat.`;
  }
  if (item.category === 'cure_all') {
    return lang === 'en'
      ? 'When held: cures all status conditions once per battle.'
      : 'Tenue : soigne tous les statuts une fois par combat.';
  }
  if (item.category === 'skip_cd') {
    if (lang === 'en')
      return `When held: ${Math.round(evalFormula(item.powerFormula, level) * 100)}% chance to skip the attack cooldown.`;
    return `Tenue : ${Math.round(evalFormula(item.powerFormula, level) * 100)} % de chance de sauter le cooldown d'attaque.`;
  }
  if (item.category === 'pinch_heal') {
    if (lang === 'en')
      return `When held: restores ${Math.round(evalFormula(item.powerFormula, level) * 100)}% of max HP when HP is below 25% (once per battle).`;
    return `Tenue : restaure ${Math.round(evalFormula(item.powerFormula, level) * 100)} % des PV max quand les PV passent sous 25 % (une fois par combat).`;
  }
  if (item.category === 'pinch_stat' && item.stat) {
    if (lang === 'en')
      return `When held: +${Math.round(evalFormula(item.powerFormula, level) * 100)}% ${_statEn[item.stat]} when HP is below 25%.`;
    return `Tenue : +${Math.round(evalFormula(item.powerFormula, level) * 100)} % ${_statFr[item.stat]} quand les PV passent sous 25 %.`;
  }
  if (item.category === 'pinch_dmg') {
    if (lang === 'en')
      return `When held: +${Math.round(evalFormula(item.powerFormula, level) * 100)}% damage when HP is below 25%.`;
    return `Tenue : +${Math.round(evalFormula(item.powerFormula, level) * 100)} % de dégâts quand les PV passent sous 25 %.`;
  }
  if (item.category === 'pinch_random') {
    if (lang === 'en')
      return `When held: +${Math.round(evalFormula(item.powerFormula, level) * 100)}% to a random stat when HP is below 25%.`;
    return `Tenue : +${Math.round(evalFormula(item.powerFormula, level) * 100)} % à une stat au hasard quand les PV passent sous 25 %.`;
  }
  if (item.category === 'entry_debuff' && item.stat) {
    if (lang === 'en')
      return `When held: lowers the enemy's ${_statEn[item.stat]} by ${Math.round(evalFormula(item.powerFormula, level) * 100)}% on entry.`;
    return `Tenue : réduit ${_statFr[item.stat]} de l'ennemi de ${Math.round(evalFormula(item.powerFormula, level) * 100)} % à l'entrée en combat.`;
  }
  if (item.category === 'pinch_fast') {
    return lang === 'en'
      ? 'When held: the next move is executed 2× faster when HP is below 25% (once per battle).'
      : 'Tenue : la prochaine attaque est 2× plus rapide quand les PV passent sous 25 % (une fois par combat).';
  }
  if (item.category === 'pinch_first') {
    return lang === 'en'
      ? 'When held: moves first when HP is below 25% (once per battle).'
      : 'Tenue : agit en premier quand les PV passent sous 25 % (une fois par combat).';
  }
  if (item.category === 'counter_phys' || item.category === 'counter_spec') {
    const kind =
      item.category === 'counter_phys'
        ? lang === 'en'
          ? 'physical'
          : 'physique'
        : lang === 'en'
          ? 'special'
          : 'spéciale';
    return lang === 'en'
      ? `When held: reflects 12% of the holder's max HP back to ${kind} attackers.`
      : `Tenue : renvoie 12 % des PV max du porteur aux attaquants ${kind}s.`;
  }
  if (item.category === 'hit_buff' && item.stat) {
    if (lang === 'en')
      return `When held: +${Math.round(evalFormula(item.powerFormula, level) * 100)}% ${_statEn[item.stat]} after taking a hit.`;
    return `Tenue : +${Math.round(evalFormula(item.powerFormula, level) * 100)} % ${_statFr[item.stat]} après avoir subi une attaque.`;
  }
  if (item.category === 'super_heal') {
    if (lang === 'en')
      return `When held: restores ${Math.round(evalFormula(item.powerFormula, level) * 100)}% of max HP after taking a super-effective hit.`;
    return `Tenue : restaure ${Math.round(evalFormula(item.powerFormula, level) * 100)} % des PV max après un coup super efficace subi.`;
  }
  if (item.category === 'ice_boost') {
    if (lang === 'en')
      return `When held: +${Math.round(evalFormula(item.powerFormula, level) * 100)}% Ice-type damage.`;
    return `Tenue : +${Math.round(evalFormula(item.powerFormula, level) * 100)} % de dégâts Glace.`;
  }
  if (item.category === 'loot_boost') {
    return lang === 'en'
      ? 'When held: +1 item drop rate for the whole team.'
      : "Tenue : +1 au taux de butin pour toute l'équipe.";
  }
  if (item.category === 'flavor') {
    return lang === 'en'
      ? 'A berry used as a Pokéblock ingredient (no battle effect).'
      : 'Baie utilisée comme ingrédient de Pokéblocks (aucun effet en combat).';
  }
  if (item.category === 'vitamin') {
    return lang === 'en'
      ? 'Use from the bag on a Pokémon: +1 random EV.'
      : 'À utiliser depuis le sac sur un Pokémon : +1 EV aléatoire.';
  }
  if (item.category === 'iv_boost') {
    return lang === 'en'
      ? 'Use from the bag on a Pokémon: +1 random IV.'
      : 'À utiliser depuis le sac sur un Pokémon : +1 IV aléatoire.';
  }
  if (item.category === 'iv_boost_all') {
    return lang === 'en'
      ? 'Use from the bag on a Pokémon: +1 IV on every stat.'
      : 'À utiliser depuis le sac sur un Pokémon : +1 IV sur toutes les stats.';
  }
  if (item.category === 'ability_reroll') {
    return lang === 'en'
      ? 'Use from the bag on a Pokémon: rerolls its ability.'
      : 'À utiliser depuis le sac sur un Pokémon : re-tire son talent.';
  }
  if (item.category === 'ability_hidden') {
    return lang === 'en'
      ? 'Use from the bag on a Pokémon: unlocks its hidden ability.'
      : 'À utiliser depuis le sac sur un Pokémon : débloque son talent caché.';
  }
  // DORM-06b — objets futurs / non distribués : descriptions RÉELLES.
  // Règle joueur : jamais de « à venir » — l'objet est décrit pour ce
  // qu'il fait, même si la mécanique n'est pas encore branchée.
  if (item.category === 'z_crystal' && item.zType) {
    const badge = typeBadge(item.zType);
    const zPeriod = Math.max(8, 20 - 2 * level); // 18 → 8 tours (1 → 25 ex.)
    if (lang === 'en')
      return `When held: every ${zPeriod} turns, launches a coordinated ${badge}-type attack if the holder isn't KO. Physical or special based on the holder's best stat (×1.25 if equal). One Z-Crystal per team.`;
    return `Tenue : tous les ${zPeriod} tours, lance une attaque coordonnée de type ${badge} si le porteur n'est pas K.O. Physique ou spéciale selon la meilleure stat du porteur (×1,25 si égales). Un seul Cristal Z par équipe.`;
  }
  if (item.category === 'mega_stone') {
    // Format PokeChill (source itemDictionary) : un objet d'évolution qui,
    // TENU par la forme méga, augmente SES dégâts de x1.15 → x1.65.
    const s = MEGA_SPECIES[itemKey] || null; // [nom FR, nom EN, forme]
    const megaName =
      s && s[0]
        ? lang === 'en'
          ? 'Mega ' + s[1] + s[2]
          : 'Méga-' + s[0] + s[2]
        : lang === 'en'
          ? 'the Mega-Evolved Pokémon'
          : 'le Pokémon méga-évolué';
    const useLine =
      lang === 'en'
        ? 'Use: Evolve a certain Pokemon.'
        : 'Utilisation : fait évoluer un Pokémon précis.';
    const heldLine =
      lang === 'en'
        ? `When held: Increases the damage dealt by ${megaName} by x${power.toFixed(2)}.`
        : `Tenue : augmente les dégâts infligés par ${megaName} de x${power.toFixed(2)}.`;
    return useLine + ' ' + heldLine;
  }
  if (item.category === 'mega_shard') {
    return lang === 'en'
      ? 'A Mega Evolution crafting material used to forge Mega Stones.'
      : 'Matériau de Méga-Évolution : sert à forger des Gemmes Méga.';
  }
  if (item.category === 'mystery_egg') {
    return lang === 'en'
      ? 'A mysterious egg received from a quest: hatches into a random Pokémon at the day care.'
      : 'Œuf mystérieux reçu en quête : éclot en un Pokémon aléatoire à la pension.';
  }
  if (item.category === 'time_candy') {
    const minutes = itemKey === 'time_candy_xl' ? 30 : 10;
    return lang === 'en'
      ? `Use during battle: fast-forwards battle time by ${minutes} minutes.`
      : `Utilisable en combat : accélère le temps de combat de ${minutes} minutes.`;
  }
  if (item.category === 'apricorn') {
    const c = (MEGA_SPECIES.apricorn || {})[itemKey];
    if (c)
      return lang === 'en'
        ? `${c.en} Apricorn: used to craft special Poké Balls (farm).`
        : `Noigrume ${c.fr} : sert à fabriquer des Poké Balls spéciales (ferme).`;
  }
  if (item.category === 'legend_key' && LEGEND_KEY_DESC[itemKey]) {
    return lang === 'en' ? LEGEND_KEY_DESC[itemKey][0] : LEGEND_KEY_DESC[itemKey][1];
  }
  if (item.category === 'breeding') {
    return lang === 'en'
      ? "Destiny Knot: at the day care, passes 5 of the parents' IVs to the egg."
      : 'Nœud Destin : à la pension, transmet 5 IV des parents au petit.';
  }
  if (item.category === 'training') {
    const st = TRAINING_STAT[itemKey] || null;
    if (st)
      return lang === 'en'
        ? `Power item: boosts ${st.en} EV gain from training.`
        : `Objet Pouvoir : favorise le gain d'EV ${st.fr} à l'entraînement.`;
    return lang === 'en'
      ? 'Macho Brace: doubles EVs gained from training.'
      : "Bracelet Macho : double les EV gagnées à l'entraînement.";
  }
  if (item.category === 'mint') {
    return lang === 'en'
      ? "Neutral Mint: changes a Pokémon's nature to a neutral one."
      : 'Aromate Neutre : change la nature du Pokémon en nature neutre.';
  }
  if (item.category === 'underground_shard') {
    return lang === 'en'
      ? 'A colored shard: an underground exchange material.'
      : "Éclat coloré : matériau d'échange au Souterrain.";
  }
  if (item.category === 'plate') {
    const t = PLATE_TYPE[itemKey] || null;
    if (t)
      return lang === 'en'
        ? `${t} Plate: an underground treasure tied to Arceus.`
        : `Plaque ${t} : trésor du Souterrain, liée à Arceus.`;
  }
  if (item.category === 'farm' && FARM_DESC[itemKey]) {
    return lang === 'en' ? FARM_DESC[itemKey][0] : FARM_DESC[itemKey][1];
  }
  if (item.category === 'flute' && FLUTE_DESC[itemKey]) {
    return lang === 'en' ? FLUTE_DESC[itemKey][0] : FLUTE_DESC[itemKey][1];
  }
  if (item.category === 'tool' && TOOL_DESC[itemKey]) {
    return lang === 'en' ? TOOL_DESC[itemKey][0] : TOOL_DESC[itemKey][1];
  }

  // CT/TM items: use localization
  if (itemKey.startsWith('ct') || itemKey.startsWith('cs')) {
    const locKey = 'items.' + itemKey + '.desc';
    if (typeof t === 'function') {
      const loc = t(locKey);
      if (loc && loc !== locKey) return loc;
    }
    // Fallback to desc_en/desc_fr or effect
    if (item.desc_en && item.desc_fr) {
      return lang === 'en' ? item.desc_en : item.desc_fr;
    }
    const moveName = item.moveId || itemKey;
    if (lang === 'en')
      return 'Teaches ' + moveName.replace(/_/g, ' ') + ' to a compatible Pokemon.';
    return (
      (typeof t === 'function' ? t('teaches_move') : 'Teaches ') +
      moveName.replace(/_/g, ' ') +
      ' ' +
      (typeof t === 'function' ? t('to_compatible_pokemon') : 'to a compatible Pokemon.')
    );
  }

  // Special items with explicit desc_en/desc_fr
  if (item.desc_en && item.desc_fr) {
    let dTxt = lang === 'en' ? item.desc_en : item.desc_fr;
    // Item effect calculation and battle modifiers
    // (Orbe Vie, Amulette Claire, Restes…) — more of cadre separe.
    if (item.powerFormula) dTxt += ' ' + _powerSentence(lang) + powStr + '.';
    return dTxt;
  }

  // Fallback: raw effect
  if (item.effect) {
    let eTxt = item.effect;
    if (item.powerFormula) eTxt += ' ' + _powerSentence(lang) + powStr + '.';
    return eTxt;
  }
  // Phase 27: item with a formula but no description — the power sentence
  // IS the full description (e.g. "Boosts power by x1.20 (max x2.00).").
  if (item.powerFormula) return _powerSentence(lang) + powStr + '.';

  return '';
}

// ───── French name lookup ─────
function getItemNameLocalized(key, lang) {
  lang = lang || 'fr';
  const displayKey = window.normalizeItemKey ? window.normalizeItemKey(key) : key;
  const item = window.ITEMS && window.ITEMS[displayKey];
  if (!item) return key.replace(/_/g, ' ');

  // CT/CS naming
  if (displayKey.startsWith('ct') || displayKey.startsWith('cs')) {
    const isCS = displayKey.startsWith('cs');
    const locName = typeof t === 'function' ? t('items.' + displayKey + '.name') : '';
    if (locName && locName !== 'items.' + displayKey + '.name') {
      if (isCS && lang === 'en') return locName + ' TM';
      if (isCS) return locName + ' CS';
      if (lang === 'en') return locName + ' TM';
      return locName + ' CT';
    }
  }

  if (lang === 'fr' && item.name_fr) return item.name_fr;
  if (lang === 'en' && item.name_en) return item.name_en;

  if (typeof t === 'function') {
    const v = t('items.' + displayKey + '.name');
    if (v && v !== 'items.' + displayKey + '.name') return v;
  }

  if (!item.name_en) return key.replace(/_/g, ' ');
  return lang === 'fr' ? item.name_fr || item.name_en : item.name_en;
}

// ───── Expose globally ─────
export const ItemEngine = {
  getPowerLevel: getPowerLevel,
  getItemPower: getItemPower,
  getPowerDisplay: getPowerDisplay,
  generateItemDesc: generateItemDesc,
  getItemNameLocalized: getItemNameLocalized,
  typeBadge: typeBadge,
  statusTag: statusTag,
  getStatusTag: getStatusTag,
  evalFormula: evalFormula,
};

// Wave 41 — surface kept (ex window.ItemEngine): classic
// consumers, VM harnesses and the engine registry.
if (typeof globalThis !== 'undefined') globalThis.ItemEngine = ItemEngine;
