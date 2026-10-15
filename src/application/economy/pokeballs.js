// PokeWorld — P0 · Système de Poké Balls (modèle PokéClicker)
//
// Les balls ne sont PAS des items d'inventaire : système dédié (G.pokeballs).
// Filtres à la PokéClicker : une LISTE de filtres prioritaire ; chaque filtre
// (une condition de capture) est affecté à une ball. La 1ʳᵉ correspondance
// décide de la ball lancée (ou "aucune ball").
// Prix fixes. Honor Ball (Premier Ball) offerte par tranche de 10 Poké Balls.

// V7-R1 · #7 — échelle de possession des balls spéciales (UNE source : lue
// par ballEffectiveRate() et citée par le guide « Capture & IV »).
const BALL_SCALE = { step: 5, maxCopies: 25, bonusPerTier: 2 };

const BALL_DEFS = {
  pokeball: { price: 100, bonus: 0, rate: 10, labelKey: 'ball_pokeball' },
  greatball: { price: 500, bonus: 5, rate: 20, labelKey: 'ball_greatball' },
  ultraball: { price: 2000, bonus: 10, rate: 30, labelKey: 'ball_ultraball' },
  masterball: { price: 10000000, bonus: 100, rate: 100, labelKey: 'ball_masterball' },
  honorball: { price: 0, bonus: 0, rate: 10, labelKey: 'ball_honorball', notForSale: true },
  // DORM-06 — balls spéciales : bonus +25 % si la condition est remplie.
  // Déblocables uniquement via la ferme + Apricorns (notForSale : non vendues).
  // V7 · BALL-01 — `hidden` : absentes du dex d'objets, du sélecteur de balls
  // et des boutiques tant qu'on n'en possède aucune (jusqu'à CRF-01, P6).
  // `scaling` : l'échelle de possession (+2 %/palier, 1→25 ex.) ne s'applique
  // QU'AUX balls spéciales — les balls de base ont un taux fixe (10/20/30/100).
  lureball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_lureball',
    notForSale: true,
    hidden: true,
    condition: 'water',
    scaling: true,
  },
  moonball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_moonball',
    notForSale: true,
    hidden: true,
    condition: 'moonstone',
    scaling: true,
  },
  fastball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_fastball',
    notForSale: true,
    hidden: true,
    condition: 'fast',
    scaling: true,
  },
  diveball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_diveball',
    notForSale: true,
    hidden: true,
    condition: 'rain',
    scaling: true,
  },
  repeatball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_repeatball',
    notForSale: true,
    hidden: true,
    condition: 'owned',
    scaling: true,
  },
  nestball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_nestball',
    notForSale: true,
    hidden: true,
    condition: 'lowlevel',
    scaling: true,
  },
  duskball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_duskball',
    notForSale: true,
    hidden: true,
    condition: 'dungeon',
    scaling: true,
  },
  timerball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_timerball',
    notForSale: true,
    hidden: true,
    condition: 'timer',
    scaling: true,
  },
  quickball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_quickball',
    notForSale: true,
    hidden: true,
    condition: 'quick',
    scaling: true,
  },
  luxuryball: {
    price: 0,
    bonus: 0,
    rate: 10,
    labelKey: 'ball_luxuryball',
    notForSale: true,
    hidden: true,
    condition: null,
    scaling: true,
  },
  beastball: {
    price: 0,
    bonus: 25,
    rate: 10,
    labelKey: 'ball_beastball',
    notForSale: true,
    hidden: true,
    condition: 'ultra',
    scaling: true,
  },
};
// Ordre de cycle quand on clique sur la ball d'un filtre (Honor Ball incluse).
const BALL_CYCLE = [
  'none',
  'pokeball',
  'greatball',
  'ultraball',
  'masterball',
  'honorball',
  'lureball',
  'moonball',
  'fastball',
  'diveball',
  'repeatball',
  'nestball',
  'duskball',
  'timerball',
  'quickball',
  'luxuryball',
  'beastball',
];
const HONOR_EVERY = 10;

// Filtres par défaut (presets PokéClicker, adaptés à nos 5 balls).
// Ordre = PRIORITÉ : la 1ʳᵉ correspondance décide de la ball lancée.
// De base TOUTES les balls sont sur « none » (ne rien lancer) : une quête
// tuto demande au joueur de poser la Poké Ball sur le filtre « Nouveau ».
// `locked: true` = filtre de base, non supprimable, non renommable, options
// verrouillées (mais la ball et l'ordre restent modifiables).
const PRESET_FILTERS = [
  {
    id: 'new',
    labelKey: 'ball_filter_new',
    options: { caught: false },
    ball: 'none',
    locked: true,
  },
  {
    id: 'new_shiny',
    labelKey: 'ball_filter_new_shiny',
    options: { caught: false, shiny: true },
    ball: 'none',
    locked: true,
  },
  {
    id: 'caught_shiny',
    labelKey: 'ball_filter_caught_shiny',
    options: { caughtShiny: true },
    ball: 'none',
    locked: true,
  },
  {
    id: 'caught',
    labelKey: 'ball_filter_caught',
    options: { caught: true },
    ball: 'none',
    locked: true,
  },
  {
    id: 'roaming',
    labelKey: 'ball_filter_roaming',
    options: { encounter: 'roaming' },
    ball: 'none',
    locked: true,
  },
];

const ROAMING_IDS = [144, 145, 146, 151, 243, 244, 245, 251, 380, 381, 385, 386];
// Types rencontrés sur les routes : le filtre « type de rencontre » peut
// cibler route / donjon / boss de donjon (à venir) / errant.
const ENCOUNTER_TYPES = ['route', 'dungeon', 'dungeon_boss', 'roaming'];
// Les 18 types (mêmes clés que MOVES/PD, libellés via getTypeName).
const FILTER_TYPES = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dark',
  'dragon',
  'steel',
  'fairy',
];

function ensurePokeballs() {
  if (typeof G === 'undefined' || !G) return null;
  if (!G.pokeballs || typeof G.pokeballs !== 'object') G.pokeballs = {};
  const b = G.pokeballs;
  if (typeof b.pokeball !== 'number') b.pokeball = 10; // starter : 10 Poké Balls (avant le remplissage)
  for (const k in BALL_DEFS) if (typeof b[k] !== 'number') b[k] = 0;
  if (typeof b.honorProgress !== 'number') b.honorProgress = 0;
  if (!b.filters || typeof b.filters !== 'object') {
    b.filters = PRESET_FILTERS.map((f) => ({ ...f, options: { ...f.options }, enabled: true }));
  }
  // Repère les ids connus (pour les anciennes sauvegardes au format "par ball").
  if (!Array.isArray(b.filters) || !b.filters.length || !b.filters[0].options) {
    b.filters = PRESET_FILTERS.map((f) => ({ ...f, options: { ...f.options }, enabled: true }));
  }
  // Migration : marquer les presets verrouillés + ré-insérer TOUT preset
  // manquant (anciennes sauvegardes sans « Nouveau », sans « Errant », etc.).
  // Les filtres de base sont la fondation du jeu : ils doivent TOUJOURS exister.
  const presetIds = PRESET_FILTERS.map((f) => f.id);
  for (const f of b.filters) {
    if (presetIds.includes(f.id)) f.locked = true;
    // Normalisation : ancien format booléen « roaming: true » → type de
    // rencontre « encounter: 'roaming' » (sinon le filtre Errant ne
    // correspond à rien et « n'est pas configuré »).
    if (f.id === 'roaming' && f.options && f.options.roaming === true) {
      delete f.options.roaming;
      f.options.encounter = 'roaming';
    }
  }
  for (const preset of PRESET_FILTERS) {
    if (!b.filters.some((f) => f.id === preset.id)) {
      const at = PRESET_FILTERS.indexOf(preset);
      const copy = { ...preset, options: { ...preset.options }, enabled: true };
      if (at >= b.filters.length) b.filters.push(copy);
      else b.filters.splice(at, 0, copy);
    }
  }
  return b;
}

function ballDef(type) {
  return BALL_DEFS[type] || null;
}
function ballCount(type) {
  const b = ensurePokeballs();
  return b ? b[type] || 0 : 0;
}

// Sprite officiel PokéClicker (SVG) d'une ball.
function ballSpriteUrl(type) {
  const map = {
    pokeball: 'src/assets/images/pokeball/Pokeball.svg',
    greatball: 'src/assets/images/pokeball/Greatball.svg',
    ultraball: 'src/assets/images/pokeball/Ultraball.svg',
    masterball: 'src/assets/images/pokeball/Masterball.svg',
    honorball: 'src/assets/images/pokeball/Premierball.svg',
    lureball: 'src/assets/images/pokeball/Lureball.svg',
    moonball: 'src/assets/images/pokeball/Moonball.svg',
    fastball: 'src/assets/images/pokeball/Fastball.svg',
    diveball: 'src/assets/images/pokeball/Diveball.svg',
    repeatball: 'src/assets/images/pokeball/Repeatball.svg',
    nestball: 'src/assets/images/pokeball/Nestball.svg',
    duskball: 'src/assets/images/pokeball/Duskball.svg',
    timerball: 'src/assets/images/pokeball/Timerball.svg',
    quickball: 'src/assets/images/pokeball/Quickball.svg',
    luxuryball: 'src/assets/images/pokeball/Luxuryball.svg',
    beastball: 'src/assets/images/pokeball/Beastball.svg',
  };
  return map[type] || null;
}

function buyPokeballs(type, qty) {
  const b = ensurePokeballs();
  if (!b) return;
  qty = Math.max(1, Math.floor(Number(qty) || 1));
  const def = ballDef(type);
  if (!def || def.notForSale) {
    try {
      notify(t('ball_not_for_sale'), 'var(--red)');
    } catch (_) {}
    return;
  }
  const cost = def.price * qty;
  if ((G.money || 0) < cost) {
    try {
      notify(tr('ball_not_enough_money', { need: formatNumber(cost) }), 'var(--red)');
    } catch (_) {}
    return;
  }
  G.money -= cost;
  b[type] = (b[type] || 0) + qty;
  G.totalBallsBought = (G.totalBallsBought || 0) + qty; // tuto : compteur d'achat
  if (type === 'pokeball') {
    b.honorProgress = (b.honorProgress || 0) + qty;
    while (b.honorProgress >= HONOR_EVERY) {
      b.honorProgress -= HONOR_EVERY;
      b.honorball = (b.honorball || 0) + 1;
    }
  }
  try {
    updateHeader();
  } catch (_) {}
  try {
    saveGame();
  } catch (_) {}
  try {
    notify(tr('ball_bought', { n: qty, name: t(def.labelKey) }), 'var(--green)');
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
}

// Master Ball : vendue à la Ligue contre PLUSIEURS monnaies (comme PokéClicker).
// Prix croissant à chaque achat (chaque monnaie a son propre compteur).
const MASTER_BALL_BASES = {
  money: 10000000,
  dungeonTokens: 25000,
  questPoints: 5000,
  diamonds: 500,
};
const MASTER_BALL_STEPS = {
  money: 5000000,
  dungeonTokens: 12500,
  questPoints: 2500,
  diamonds: 250,
};
function masterBallPrices() {
  const n = Number((typeof G !== 'undefined' && G && G.masterBallsBought) || 0);
  const out = {};
  for (const k in MASTER_BALL_BASES) out[k] = MASTER_BALL_BASES[k] + MASTER_BALL_STEPS[k] * n;
  return out;
}
function masterBallTotalPrice(currency, qty) {
  const base = MASTER_BALL_BASES[currency];
  const step = MASTER_BALL_STEPS[currency];
  if (!base) return 0;
  const n0 = Number((typeof G !== 'undefined' && G && G.masterBallsBought) || 0);
  qty = Math.max(1, Math.floor(Number(qty) || 1));
  let total = 0;
  for (let k = 0; k < qty; k++) total += base + step * (n0 + k);
  return total;
}
function buyMasterBall(currency, qty) {
  const b = ensurePokeballs();
  if (!b) return;
  qty = Math.max(1, Math.floor(Number(qty) || 1));
  const total = masterBallTotalPrice(currency, qty);
  if (!total) {
    try {
      notify(t('ball_not_for_sale'), 'var(--red)');
    } catch (_) {}
    return;
  }
  if (currency === 'money') {
    if ((G.money || 0) < total) {
      try {
        notify(tr('ball_not_enough_money', { need: formatNumber(total) }), 'var(--red)');
      } catch (_) {}
      return;
    }
    G.money -= total;
  } else if (currency === 'dungeonTokens') {
    if (typeof spendDungeonTokens !== 'function' || !spendDungeonTokens(total)) {
      try {
        notify(t('ball_not_enough_currency'), 'var(--red)');
      } catch (_) {}
      return;
    }
  } else if (currency === 'questPoints') {
    if (typeof spendQuestPoints !== 'function' || !spendQuestPoints(total)) {
      try {
        notify(t('ball_not_enough_currency'), 'var(--red)');
      } catch (_) {}
      return;
    }
  } else if (currency === 'diamonds') {
    if (typeof spendDiamonds !== 'function' || !spendDiamonds(total)) {
      try {
        notify(t('ball_not_enough_currency'), 'var(--red)');
      } catch (_) {}
      return;
    }
  } else {
    return;
  }
  b.masterball = (b.masterball || 0) + qty;
  G.masterBallsBought = (G.masterBallsBought || 0) + qty;
  G.totalBallsBought = (G.totalBallsBought || 0) + qty;
  try {
    updateHeader();
  } catch (_) {}
  try {
    saveGame();
  } catch (_) {}
  try {
    notify(tr('ball_bought', { n: qty, name: t('ball_masterball') }), 'var(--green)');
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
}

// Fait cycler la ball d'un filtre (BALL_CYCLE).
function cycleFilterBall(filterId) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  const f = b.filters.find((x) => x.id === filterId);
  if (!f) return;
  const i = BALL_CYCLE.indexOf(f.ball || 'none');
  f.ball = BALL_CYCLE[(i + 1) % BALL_CYCLE.length];
  try {
    saveGame();
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
}

// Active/désactive un filtre.
function toggleFilterEnabled(filterId) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  const f = b.filters.find((x) => x.id === filterId);
  if (!f) return;
  f.enabled = !f.enabled;
  try {
    saveGame();
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
  // Ne jamais OUVRIR l'éditeur ici : on ne le rafraîchit que s'il est déjà
  // affiché (sinon, toggler un filtre ouvrait la fenêtre des paramètres).
  try {
    if (typeof document !== 'undefined' && document.getElementById('pw-ball-overlay-root'))
      renderBallFilterEditor();
  } catch (_) {}
}

// Réinitialise les filtres aux presets.
function resetBallFilters() {
  const b = ensurePokeballs();
  if (!b) return;
  b.filters = PRESET_FILTERS.map((f) => ({ ...f, options: { ...f.options }, enabled: true }));
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
}

// Crée un nouveau filtre (ajouté en tête de priorité).
function createBallFilter() {
  const b = ensurePokeballs();
  if (!b) return;
  if (!Array.isArray(b.filters)) b.filters = [];
  const n = b.filters.length + 1;
  const f = {
    id: 'custom_' + Date.now(),
    labelKey: null,
    label: null,
    customName: 'Filtre ' + n,
    options: { caught: false },
    ball: 'pokeball',
    enabled: true,
  };
  b.filters.unshift(f);
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
}

// Supprime un filtre.
function deleteBallFilter(filterId) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  const f = b.filters.find((x) => x.id === filterId);
  if (f && f.locked) return; // filtres de base non supprimables
  b.filters = b.filters.filter((x) => x.id !== filterId);
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
}

// Réordonne un filtre (dir = -1 monter / +1 descendre).
function moveBallFilter(filterId, dir) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  const i = b.filters.findIndex((x) => x.id === filterId);
  if (i < 0) return;
  const j = i + dir;
  if (j < 0 || j >= b.filters.length) return;
  const tmp = b.filters[i];
  b.filters[i] = b.filters[j];
  b.filters[j] = tmp;
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
}

// Déplace un filtre avant un autre (drag & drop).
function reorderBallFilter(fromId, toId) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  if (fromId === toId) return;
  const from = b.filters.findIndex((x) => x.id === fromId);
  const to = b.filters.findIndex((x) => x.id === toId);
  if (from < 0 || to < 0) return;
  const [moved] = b.filters.splice(from, 1);
  b.filters.splice(to, 0, moved);
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
}

// Renomme un filtre personnalisé (les filtres de base sont verrouillés).
function renameBallFilter(filterId, name) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  const f = b.filters.find((x) => x.id === filterId);
  if (!f || f.locked) return;
  f.customName = String(name || '').trim() || null;
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
  try {
    renderPokeballWindow();
  } catch (_) {}
}

// Bascule une option de filtre (shiny / caught / caughtShiny).
function toggleBallFilterOption(filterId, option) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  const f = b.filters.find((x) => x.id === filterId);
  if (!f || f.locked) return; // filtres de base non modifiables
  if (f.options[option]) delete f.options[option];
  else f.options[option] = true;
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
}

// PokeClicker : règle une option (case à cocher) à une valeur explicite.
// Clés d'option : new (caught:false) / caught (caught:true) / shiny /
// caughtShiny (implique caught:true).
function setBallFilterOption(filterId, option, value) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  const f = b.filters.find((x) => x.id === filterId);
  if (!f || f.locked) return; // filtres de base non modifiables
  const o = f.options || (f.options = {});
  switch (option) {
    case 'new':
      if (value) {
        o.caught = false;
      } else {
        delete o.caught;
      }
      break;
    case 'caught':
      if (value) {
        o.caught = true;
      } else {
        delete o.caught;
      }
      break;
    case 'shiny':
      if (value) {
        o.shiny = true;
      } else {
        delete o.shiny;
      }
      break;
    case 'caughtShiny':
      if (value) {
        o.caughtShiny = true;
        o.caught = true;
      } else {
        delete o.caughtShiny;
      }
      break;
    default:
      return;
  }
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
}

// Option à valeur (type de Pokémon / type de rencontre) : value = chaîne ou null.
function setBallFilterValueOption(filterId, option, value) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return;
  const f = b.filters.find((x) => x.id === filterId);
  if (!f || f.locked) return; // filtres de base non modifiables
  const o = f.options || (f.options = {});
  if (value) o[option] = String(value);
  else delete o[option];
  try {
    saveGame();
  } catch (_) {}
  try {
    renderBallFilterEditor();
  } catch (_) {}
}

// Ajoute / retire une option booléenne (pour les boutons + / − de l'éditeur).
function addBallFilterOption(filterId, option) {
  return setBallFilterOption(filterId, option, true);
}
function removeBallFilterOption(filterId, option) {
  return setBallFilterOption(filterId, option, false);
}
// Ajoute une option à valeur avec sa valeur par défaut (type normal / route).
function addBallFilterValueOption(filterId, option) {
  const def = option === 'type' ? 'normal' : 'route';
  return setBallFilterValueOption(filterId, option, def);
}
function removeBallFilterValueOption(filterId, option) {
  return setBallFilterValueOption(filterId, option, null);
}

// Nom d'affichage d'un filtre (libellé i18n ou nom personnalisé).
function ballFilterLabel(f) {
  if (f.customName) return f.customName;
  if (f.labelKey && typeof t === 'function') {
    const v = t(f.labelKey);
    if (v && v !== f.labelKey) return v;
  }
  return f.id;
}

// Résumé des options d'un filtre (pour l'éditeur / la fenêtre).
function ballFilterOptionsSummary(f) {
  const opts = f.options || {};
  const parts = [];
  if (opts.caught === false)
    parts.push(typeof t === 'function' ? t('ball_opt_not_caught') : 'non capturé');
  if (opts.caught === true) parts.push(typeof t === 'function' ? t('ball_opt_caught') : 'capturé');
  if (opts.shiny) parts.push(typeof t === 'function' ? t('ball_opt_shiny') : 'chromatique');
  if (opts.caughtShiny)
    parts.push(typeof t === 'function' ? t('ball_opt_caught_shiny') : 'chromatique déjà capturé');
  if (opts.type) parts.push(typeof getTypeName === 'function' ? getTypeName(opts.type) : opts.type);
  if (opts.encounter)
    parts.push(typeof t === 'function' ? t('ball_enc_' + opts.encounter) : opts.encounter);
  return parts.join(' · ');
}

// Types de l'espèce adverse (depuis PD) — pour le filtre « type ».
function enemyTypes(enemy) {
  if (!enemy || enemy.id == null) return [];
  const d = typeof PD !== 'undefined' && PD ? PD[Number(enemy.id)] : null;
  if (!d) return [];
  const t1 = String(d[1] || '').toLowerCase();
  const t2 = String(d[2] || '').toLowerCase();
  const out = [t1];
  if (t2 && t2 !== '') out.push(t2);
  return out;
}

// Type de rencontre courant (route / donjon / boss de donjon / errant).
function enemyEncounterType(enemy) {
  if (enemy && (enemy._isRoaming || (enemy.id != null && ROAMING_IDS.includes(Number(enemy.id)))))
    return 'roaming';
  if (enemy && (enemy._isBoss || enemy._isDungeonBoss)) return 'dungeon_boss'; // réservé (futur)
  const loc = typeof getLocObj === 'function' && G && G.location ? getLocObj(G.location) : null;
  const t = loc ? loc.type || 'route' : 'route';
  if (t === 'dungeon') return 'dungeon';
  return 'route';
}

// Un Pokémon correspond-il à un filtre ?
function filterMatches(filter, enemy) {
  const owned = typeof isSpeciesOwnedReal === 'function' ? isSpeciesOwnedReal(enemy) : false;
  const shinyOwned =
    owned && typeof isSpeciesShiny === 'function' ? isSpeciesShiny(enemy.id) : false;
  const isShiny =
    !!(enemy && (enemy.shinyActive || enemy.shiny || enemy._forceShiny)) || shinyOwned;
  const opts = filter.options || {};
  if ('caught' in opts && !!opts.caught !== !!owned) return false;
  if ('shiny' in opts && !!opts.shiny !== !!isShiny) return false;
  if ('caughtShiny' in opts && !!opts.caughtShiny !== !!shinyOwned) return false;
  if (opts.type) {
    if (!enemyTypes(enemy).includes(String(opts.type).toLowerCase())) return false;
  }
  if (opts.encounter) {
    if (enemyEncounterType(enemy) !== opts.encounter) return false;
  }
  return true;
}

// DORM-06 — taux effectif d'une ball (bonus conditionnel + échelle 1→25).
function ballConditionMet(ballKey, enemy) {
  const def = ballDef(ballKey);
  if (!def || !def.condition) return false;
  try {
    if (def.condition === 'water')
      return enemy && (enemy.type1 === 'Water' || enemy.type2 === 'Water');
    if (def.condition === 'moonstone') {
      const map = typeof STONE_EVO !== 'undefined' && STONE_EVO ? STONE_EVO : {};
      const e = map[Number(enemy.id)] || {} || {};
      return !!e.moonstone;
    }
    if (def.condition === 'fast') return enemy && Number(enemy.spe || 0) >= 100;
    if (def.condition === 'rain')
      return !!(battle && (battle.weather === 'rain' || battle.weather === 'rainy'));
    if (def.condition === 'owned')
      return !!(typeof isSpeciesOwnedReal === 'function' && isSpeciesOwnedReal(enemy));
    if (def.condition === 'lowlevel') return enemy && Number(enemy.level || 0) <= 25;
    if (def.condition === 'dungeon') {
      const loc = typeof getLocObj === 'function' && G && G.location ? getLocObj(G.location) : null;
      return !!(loc && loc.type === 'dungeon');
    }
    if (def.condition === 'timer')
      return Math.min(25, 2 * (battle ? battle.enemyTurnsOnField || 0 : 0));
    if (def.condition === 'quick') {
      const atk = battle ? battle.attacksOnCurrentEnemy || 0 : 0;
      if (atk <= 1) return 30;
      if (atk === 2) return 25;
      if (atk === 3) return 20;
      if (atk <= 5) return 15;
      if (atk <= 8) return 10;
      return 5;
    }
    if (def.condition === 'ultra') return !!(enemy && enemy._isUltraBeast);
  } catch (_) {}
  return false;
}
// V7 · BALL-01 — une ball `hidden` n'apparaît nulle part tant qu'on n'en possède aucune.
function isBallHidden(ballKey) {
  const def = ballDef(ballKey);
  if (!def || !def.hidden) return false;
  const b = typeof G !== 'undefined' && G && G.pokeballs ? G.pokeballs : null;
  return !(b && (Number(b[ballKey]) || 0) > 0);
}
function ballEffectiveRate(ballKey, enemy) {
  const def = ballDef(ballKey);
  if (!def) return 10;
  if (ballKey === 'masterball') return 100;
  let rate = Number(def.rate) || 10;
  // Échelle 1→25 copies possédées : +2 %/palier sur le taux de base,
  // UNIQUEMENT pour les balls spéciales (les balls de base restent fixes).
  if (def.scaling) {
    const qty = ballCount(ballKey);
    // Paliers 5/10/15/20/25 exemplaires → niveau 2…6 (identique à l'ancien barème).
    const maxTier = Math.floor(BALL_SCALE.maxCopies / BALL_SCALE.step);
    const level = 1 + Math.min(maxTier, Math.floor(qty / BALL_SCALE.step));
    rate += BALL_SCALE.bonusPerTier * (level - 1);
  }
  if (def.condition) {
    const bonus =
      def.condition === 'timer' || def.condition === 'quick'
        ? ballConditionMet(ballKey, enemy)
        : ballConditionMet(ballKey, enemy)
          ? def.bonus
          : 0;
    rate += Number(bonus) || 0;
  }
  return Math.min(100, rate);
}

// Ball à lancer pour ce Pokémon (1ʳᵉ filtre actif correspondant), ou null.
function ballForEnemy(enemy) {
  const b = ensurePokeballs();
  if (!b || !Array.isArray(b.filters)) return null;
  for (const f of b.filters) {
    if (!f.enabled) continue;
    if (!filterMatches(f, enemy)) continue;
    if (!f.ball || f.ball === 'none') return null; // filtre "ne pas capturer"
    return ballCount(f.ball) > 0 ? f.ball : null;
  }
  return null;
}

// --- Surface classique -----------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.BALL_DEFS = BALL_DEFS;
  window.BALL_SCALE = BALL_SCALE;
  window.BALL_CYCLE = BALL_CYCLE;
  window.PRESET_FILTERS = PRESET_FILTERS;
  window.HONOR_EVERY = HONOR_EVERY;
  window.ensurePokeballs = ensurePokeballs;
  window.ballDef = ballDef;
  window.ballCount = ballCount;
  window.ballSpriteUrl = ballSpriteUrl;
  window.buyPokeballs = buyPokeballs;
  window.cycleFilterBall = cycleFilterBall;
  window.toggleFilterEnabled = toggleFilterEnabled;
  window.filterMatches = filterMatches;
  window.ballForEnemy = ballForEnemy;
  window.ballEffectiveRate = ballEffectiveRate;
  window.isBallHidden = isBallHidden;
  window.ballConditionMet = ballConditionMet;
  window.createBallFilter = createBallFilter;
  window.resetBallFilters = resetBallFilters;
  window.deleteBallFilter = deleteBallFilter;
  window.moveBallFilter = moveBallFilter;
  window.reorderBallFilter = reorderBallFilter;
  window.renameBallFilter = renameBallFilter;
  window.toggleBallFilterOption = toggleBallFilterOption;
  window.setBallFilterOption = setBallFilterOption;
  window.setBallFilterValueOption = setBallFilterValueOption;
  window.addBallFilterOption = addBallFilterOption;
  window.removeBallFilterOption = removeBallFilterOption;
  window.addBallFilterValueOption = addBallFilterValueOption;
  window.removeBallFilterValueOption = removeBallFilterValueOption;
  window.masterBallPrices = masterBallPrices;
  window.buyMasterBall = buyMasterBall;
  window.masterBallTotalPrice = masterBallTotalPrice;
  window.ballFilterLabel = ballFilterLabel;
  window.ballFilterOptionsSummary = ballFilterOptionsSummary;
  window.FILTER_TYPES = FILTER_TYPES;
  window.ENCOUNTER_TYPES = ENCOUNTER_TYPES;
  window.enemyTypes = enemyTypes;
  window.enemyEncounterType = enemyEncounterType;
}
if (typeof globalThis !== 'undefined') {
  globalThis.BALL_DEFS = BALL_DEFS;
  globalThis.BALL_SCALE = BALL_SCALE;
  globalThis.BALL_CYCLE = BALL_CYCLE;
  globalThis.PRESET_FILTERS = PRESET_FILTERS;
  globalThis.HONOR_EVERY = HONOR_EVERY;
  globalThis.ensurePokeballs = ensurePokeballs;
  globalThis.ballDef = ballDef;
  globalThis.ballCount = ballCount;
  globalThis.ballSpriteUrl = ballSpriteUrl;
  globalThis.buyPokeballs = buyPokeballs;
  globalThis.cycleFilterBall = cycleFilterBall;
  globalThis.toggleFilterEnabled = toggleFilterEnabled;
  globalThis.filterMatches = filterMatches;
  globalThis.ballForEnemy = ballForEnemy;
  globalThis.ballEffectiveRate = ballEffectiveRate;
  globalThis.isBallHidden = isBallHidden;
  globalThis.ballConditionMet = ballConditionMet;
  globalThis.createBallFilter = createBallFilter;
  globalThis.resetBallFilters = resetBallFilters;
  globalThis.deleteBallFilter = deleteBallFilter;
  globalThis.moveBallFilter = moveBallFilter;
  globalThis.reorderBallFilter = reorderBallFilter;
  globalThis.renameBallFilter = renameBallFilter;
  globalThis.toggleBallFilterOption = toggleBallFilterOption;
  globalThis.setBallFilterOption = setBallFilterOption;
  globalThis.setBallFilterValueOption = setBallFilterValueOption;
  globalThis.addBallFilterOption = addBallFilterOption;
  globalThis.removeBallFilterOption = removeBallFilterOption;
  globalThis.addBallFilterValueOption = addBallFilterValueOption;
  globalThis.removeBallFilterValueOption = removeBallFilterValueOption;
  globalThis.masterBallPrices = masterBallPrices;
  globalThis.buyMasterBall = buyMasterBall;
  globalThis.masterBallTotalPrice = masterBallTotalPrice;
  globalThis.ballFilterLabel = ballFilterLabel;
  globalThis.ballFilterOptionsSummary = ballFilterOptionsSummary;
  globalThis.FILTER_TYPES = FILTER_TYPES;
  globalThis.ENCOUNTER_TYPES = ENCOUNTER_TYPES;
  globalThis.enemyTypes = enemyTypes;
  globalThis.enemyEncounterType = enemyEncounterType;
}

export {
  // V7 · DBT-08 — constantes lues par tools/economy-sim.mjs (pas de copie dans l'outil).
  MASTER_BALL_BASES,
  MASTER_BALL_STEPS,
  BALL_DEFS,
  BALL_SCALE,
  BALL_CYCLE,
  PRESET_FILTERS,
  HONOR_EVERY,
  ballEffectiveRate,
  ballConditionMet,
  isBallHidden,
  FILTER_TYPES,
  ENCOUNTER_TYPES,
  ensurePokeballs,
  ballDef,
  ballCount,
  ballSpriteUrl,
  buyPokeballs,
  cycleFilterBall,
  toggleFilterEnabled,
  filterMatches,
  ballForEnemy,
  createBallFilter,
  resetBallFilters,
  deleteBallFilter,
  moveBallFilter,
  reorderBallFilter,
  renameBallFilter,
  toggleBallFilterOption,
  setBallFilterOption,
  setBallFilterValueOption,
  ballFilterLabel,
  ballFilterOptionsSummary,
  enemyTypes,
  enemyEncounterType,
  addBallFilterOption,
  removeBallFilterOption,
  addBallFilterValueOption,
  removeBallFilterValueOption,
  masterBallPrices,
  buyMasterBall,
  masterBallTotalPrice,
};

// Wave 42 — registre moteur.
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('buyPokeballs', buyPokeballs);
  } catch (_) {}
  try {
    PokeActions.register('cycleFilterBall', cycleFilterBall);
  } catch (_) {}
  try {
    PokeActions.register('toggleFilterEnabled', toggleFilterEnabled);
  } catch (_) {}
}
