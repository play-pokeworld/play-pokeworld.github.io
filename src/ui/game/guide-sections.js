/**
 * PokéWorld UI — Guide : rubriques + indice d'appareil (classic adapter)
 *
 * V7-R1 · retours joueurs #7 — sorti de ui/game/tutorial.js (DBT-09 : le
 * fichier repassait sous les 1 000 lignes) et enrichi de la rubrique
 * « Capture & IV ». Les libellés viennent de t()/tr() ; les CHIFFRES cités par
 * le guide sont lus dans le code qui les applique (BALL_DEFS, GAME.CAPTURE) —
 * jamais recopiés en dur dans un texte.
 *
 * Surface : `guideSections()` (objet { id: { icon, title, pages: [[titre,
 * texte]…] } }) et `tutorialDeviceHint(kind)` ; tutorial.js les ré-exporte et
 * les publie sur window/globalThis comme avant.
 *
 * @module ui/game/guide-sections
 */

import {
  mergeGuideSections,
  automationBuyPage,
  statsGuideValues,
  shinyGuideValues,
  ballGuideValues,
  soundGuideValues,
} from './guide-sections-extra.js';

function tutorialDeviceHint(kind) {
  // Touch detection flows through the central event bus input helpers
  // (window.PokeWorldInput, src/core/event-bus.js) — no raw touch sniffing here.
  const w = typeof window !== 'undefined' ? window : globalThis; // harnais Node : pas de window
  const input = w.PokeWorldInput || (w.PokeWorldEventBus && w.PokeWorldEventBus.input) || null;
  const touch =
    input && typeof input.isTouchDevice === 'function'
      ? input.isTouchDevice()
      : typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  if (kind === 'sheet')
    return touch
      ? typeof t === 'function'
        ? t('tutorial_hint_sheet_mobile')
        : 'Mobile : appuie longtemps sur un Pokémon de ton équipe, ou touche sa carte si elle est visible.'
      : typeof t === 'function'
        ? t('tutorial_hint_sheet_pc')
        : 'PC : clique ou clic droit sur un Pokémon dans la fenêtre Équipe Active.';
  if (kind === 'map')
    return touch
      ? typeof t === 'function'
        ? t('tutorial_hint_map_mobile')
        : 'Mobile : utilise la barre du bas pour revenir à la Carte ou au Lieu.'
      : typeof t === 'function'
        ? t('tutorial_hint_map_pc')
        : 'PC : clique directement sur la Carte puis sur les boutons du panneau Lieu.';
  return touch
    ? 'Mobile : utilise la barre du bas et les gros boutons.'
    : 'PC : utilise les raccourcis et le clic droit pour les infos.';
}

/** Icône de rubrique (getIcon est une globale UI, absente des harnais VM). */
function _icon(name) {
  const fn = globalThis.getIcon;
  return typeof fn === 'function' ? fn(name, 14) : '';
}

/** Valeurs réelles citées par la rubrique « Capture & IV ». */
function captureGuideValues() {
  const defs = typeof BALL_DEFS !== 'undefined' && BALL_DEFS ? BALL_DEFS : {};
  const rate = (k, dflt) => (defs[k] && Number(defs[k].rate)) || dflt;
  const special = Object.keys(defs).find((k) => defs[k] && defs[k].scaling);
  const scale = typeof BALL_SCALE !== 'undefined' && BALL_SCALE ? BALL_SCALE : null;
  const cfg = typeof GAME !== 'undefined' && GAME && GAME.CAPTURE ? GAME.CAPTURE : null;
  return {
    pokeball: rate('pokeball', 10),
    greatball: rate('greatball', 20),
    ultraball: rate('ultraball', 30),
    bonus: (special && Number(defs[special].bonus)) || 25,
    scaleMax: scale && Number(scale.maxCopies) ? scale.maxCopies : 25,
    pct: cfg && typeof cfg.IV_CHANCE_PCT === 'number' ? cfg.IV_CHANCE_PCT : 10,
    cap: cfg && typeof cfg.IV_CAP === 'number' ? cfg.IV_CAP : 12,
  };
}

function captureGuidePages() {
  return [
    [
      typeof t === 'function' ? t('guide_capture_how') : 'Capture',
      typeof t === 'function'
        ? t('guide_capture_how_desc')
        : 'Lancez des Poké Balls sur les Pokémon sauvages pour enrichir votre collection et renforcer votre équipe.',
    ],
  ];
}

/**
 * V7-R1c · retour joueur « Diamants : comment en obtenir ? » — valeurs réelles
 * citées par la page « Monnaies » : trésors convertibles et leur valeur en 💎
 * (diamondTreasureList, currency.js) et nom du lieu qui ouvre la Mine.
 */
export function currencyGuideValues() {
  const listFn = globalThis.diamondTreasureList;
  const nameFn = globalThis.getItemName;
  const fmtFn = globalThis.formatNumber;
  const locFn = globalThis.getLocName;
  const list = typeof listFn === 'function' ? listFn() : [];
  const treasures = list
    .map((e) => {
      let name = e.key;
      try {
        if (typeof nameFn === 'function') name = nameFn(e.key) || e.key;
      } catch (_) {}
      const val = typeof fmtFn === 'function' ? fmtFn(e.value) : String(e.value);
      // V7-R3c — plus d'emoji : l'unité est le nom de la monnaie
      return `${name} ${val} ${globalThis.t ? globalThis.t('currency_diamonds') : 'currency_diamonds'}`;
    })
    .join(', ');
  let mine = 'Diglett\u2019s Cave';
  try {
    if (typeof locFn === 'function') mine = locFn('diglettscave') || mine;
  } catch (_) {}
  return { treasures, mine };
}

/**
 * V7-R3 · R3-05 — « Chiffres clés » : toutes les valeurs citées par le guide
 * (taux, coûts, déblocages, plafonds) sont LUES dans le code qui les applique
 * (encounter-rules, currency, dungeon-run, mine, hatchery, training,
 * automation, offline-engine…) — jamais recopiées en dur dans un texte.
 */
function guideKeyValues() {
  const g = globalThis;
  const fmt = (n) => (typeof g.formatNumber === 'function' ? g.formatNumber(n) : String(n));
  const pct = (x) => String(Math.round(Number(x) * 1000) / 10).replace('.', ',');
  const T = (k) => (typeof t === 'function' ? t(k) : k);
  const list = (arr) => (arr || []).map((n) => fmt(n)).join(' / ');
  const odds = g.BUCKET_ODDS || { rare: 0.04, uncommon: 0.2 };
  const shinyBase = g.SHINY_BASE_RATE ? Math.round(1 / g.SHINY_BASE_RATE) : 4096;
  const costs = g.AUTOMATION_UPGRADE_COSTS || {};
  const rules = g.DUNGEON_RULES || {};
  const tools = g.MINE_TOOL_DEFS || {};
  const toolCost = (k) =>
    typeof g.mineToolEnergyCost === 'function' ? g.mineToolEnergyCost(k) : 5;
  const toolLine = Object.keys(tools)
    .map((k) => {
      const d = tools[k] || {};
      const price = d.diamondCost ? ` — ${fmt(d.diamondCost)} ${T('currency_diamonds')}` : '';
      return `${T('mine_tool_' + k)} ${toolCost(k)} ${T('mine_energy_unit')} (${T('mine_tool_area_' + (d.shape || 'single'))}${price})`;
    })
    .join(' · ');
  const curKey = { questPoints: 'currency_quest_points', battlePoints: 'currency_battle_points' };
  const ladders = g.STAFF_LADDERS || {};
  const staffLine = Object.keys(ladders)
    .map((cur) => `${T(curKey[cur] || 'currency_' + cur)} ${list(ladders[cur])}`)
    .join(' · ');
  const mb = typeof g.masterBallPrices === 'function' ? g.masterBallPrices() : {};
  let moneyMin = 10;
  let moneyMax = 10;
  try {
    const locs = g.LOCATIONS ? Object.keys(g.LOCATIONS) : [];
    const f = g.moneyPerKillForLocation;
    if (typeof f === 'function' && locs.length) {
      const vals = locs.map((l) => Number(f(l)) || 0).filter((v) => v > 0);
      moneyMin = Math.min.apply(null, vals);
      moneyMax = Math.max.apply(null, vals);
    }
  } catch (_) {}
  const locName = (id, dflt) => {
    try {
      if (typeof g.getLocName === 'function') return g.getLocName(id) || dflt;
    } catch (_) {}
    return dflt;
  };
  const afkMs =
    g.OfflineEngine && Number(g.OfflineEngine.MAX_MS) ? g.OfflineEngine.MAX_MS : 12 * 3600 * 1000;
  return {
    rare: pct(odds.rare),
    uncommon: pct(odds.uncommon),
    common: pct(1 - odds.rare - odds.uncommon),
    roam: pct(g.ROAMING_CHANCE || 0.01),
    roamLvl: fmt(g.ROAMING_LEVEL || 75),
    shiny: fmt(shinyBase),
    shinyCharm: fmt(Math.round(shinyBase / 2)),
    moneyMin: fmt(moneyMin),
    moneyMax: fmt(moneyMax),
    relaunch: fmt(costs.autoRelaunch || 0),
    dgRelaunch: fmt(costs.autoDungeonRelaunch || 0),
    autoHatch: fmt(costs.autoHatch || 0),
    autoSeed: fmt(costs.autoSeedHatchery || 0),
    dgDelay: fmt(Math.round((g.AUTO_DG_DELAY_MS || 5000) / 1000)),
    dgMode: T('dungeon_auto_mode_farm'),
    tools: toolLine,
    energyUpgrades: list(g.MINE_ENERGY_UPGRADE_COSTS),
    mineAuto: fmt(g.MINE_AUTO_COST || 0),
    mineLoc: locName('diglettscave', 'Diglett’s Cave'),
    hatcherySlots: list(g.HATCHERY_SLOT_UPGRADE_COSTS),
    hatcheryLoc: locName('route5', 'Route 5'),
    trainingBadge: (() => {
      try {
        if (typeof g.getChampName === 'function') return g.getChampName('surge') || 'surge';
      } catch (_) {}
      return 'surge';
    })(),
    trainingSlot: fmt(g.TRAINING_MULTI_SLOT_COST || 0),
    trainingAuto: fmt(g.TRAINING_AUTOMATION_SLOT_COST || 0),
    staff: staffLine,
    mbMoney: fmt(mb.money || 0),
    mbTokens: fmt(mb.dungeonTokens || 0),
    mbPq: fmt(mb.questPoints || 0),
    mbDiamonds: fmt(mb.diamonds || 0),
    afkHours: fmt(Math.round(afkMs / 3600000)),
    tolls: list(g.DUNGEON_TOLLS),
    depthMax: fmt(rules.depthMax || 3),
    multStep: pct(rules.multStep || 0.5),
    wipeKeep: pct(rules.wipeKeepRatio || 0.5),
    completion: String(rules.completionBonus || 2.5).replace('.', ','),
    exhausted: pct(rules.exhaustedRate || 0.4),
    autoClears: fmt(g.DUNGEON_AUTO_UNLOCK_CLEARS || 3),
    dgRare: pct(g.DUNGEON_RARE_ON_COMMON_TILE || 0.05),
  };
}
/** Page « Chiffres clés » d'une rubrique (titre commun, texte par rubrique). */
function keyNumbersPage(descKey) {
  return [t('guide_key_numbers'), tr(descKey, guideKeyValues())];
}

function guideSections() {
  // V7-R3c — rubriques « Stats, IV & EV », « Poké Balls & filtres »,
  // « Chromatiques », « Son & musique » (guide-sections-extra.js).
  return mergeGuideSections(_baseGuideSections());
}
function _baseGuideSections() {
  return {
    map: {
      icon: _icon('map'),
      title: t('guide_map_title') || 'Carte & progression',
      pages: [
        [
          typeof t === 'function' ? t('guide_map_read') : 'Lire la carte',
          typeof t === 'function'
            ? t('guide_map_simple_desc')
            : 'Explore les routes, villes et donjons de chaque région. Les couleurs indiquent les zones disponibles, verrouillées ou avec des Pokémon à capturer.',
        ],
        [
          typeof t === 'function' ? t('guide_progress_locks') : 'Verrous de progression',
          typeof t === 'function'
            ? t('guide_progress_locks_desc')
            : 'La progression dépend des combats sauvages gagnés, des badges d’arène et des quêtes principales.',
        ],
        keyNumbersPage('guide_key_map_desc'),
      ],
    },
    combat: {
      icon: _icon('battle'),
      title: t('guide_combat_title') || 'Combat',
      pages: [
        [
          typeof t === 'function' ? t('guide_combat_basics') : 'Combat automatique',
          typeof t === 'function'
            ? t('guide_combat_basics_desc')
            : 'Les combats sauvages sont <b>automatiques</b> et en temps réel. La stratégie se prépare en amont avec les types et capacités.',
        ],
        [
          typeof t === 'function' ? t('guide_combat_eff') : 'Déroulement & Capture',
          typeof t === 'function'
            ? t('guide_combat_eff_desc')
            : 'Battez les Pokémon pour gagner de l’<b>XP</b> et des <b>₽</b>, ou lancez une <b>Poké Ball</b> pour les capturer.',
        ],
      ],
    },
    capture: {
      icon: _icon('pokeball'),
      title: t('guide_capture_title'),
      pages: captureGuidePages(),
    },
    pokemon: {
      icon: _icon('team'),
      title: t('guide_pokemon_title') || 'Pokémon',
      pages: [
        [
          t('guide_pokemon_sheet'),
          `${tutorialDeviceHint('sheet')} ${t('guide_pokemon_sheet_desc')}`,
        ],
        [
          typeof t === 'function' ? t('guide_sheet_base') : 'IV & EV',
          typeof t === 'function'
            ? t('guide_sheet_base_desc')
            : 'Les <b>IV</b> augmentent le potentiel inné grâce aux doublons capturés, tandis que les <b>EV</b> récompensent l’entraînement et les vitamines.',
        ],
        [
          typeof t === 'function' ? t('guide_sheet_moves') : 'Évolutions & Capacités',
          typeof t === 'function'
            ? t('guide_sheet_moves_desc')
            : 'Les évolutions par niveau sont <b>automatiques</b> ; les évolutions par pierre s’activent dans le <b>Sac</b>.',
        ],
      ],
    },
    bag: {
      icon: _icon('bag'),
      title: t('guide_bag_title') || 'Sac',
      pages: [
        [
          typeof t === 'function' ? t('guide_bag_org') : 'Organisation & Consommables',
          typeof t === 'function'
            ? t('guide_bag_org_desc')
            : 'Le Sac classe vos Poké Balls, potions, pierres et objets tenus. Le surplus au-delà de la limite est automatiquement revendu.',
        ],
        [
          typeof t === 'function' ? t('guide_evo_stones') : 'Pierres & Objets tenus',
          typeof t === 'function'
            ? t('guide_evo_stones_desc')
            : 'Les pierres font évoluer les Pokémon compatibles et les objets tenus procurent des bonus durables en duel.',
        ],
      ],
    },
    mine: {
      icon: _icon('mine'),
      title: t('guide_mine_title') || 'Mine',
      pages: [
        [
          typeof t === 'function' ? t('guide_mine_goal') : 'Objectif & Outils',
          typeof t === 'function'
            ? t('guide_mine_goal_desc')
            : 'Révèle complètement les objets cachés sous la roche à l’aide du burin et de la pioche avant épuisement de ton énergie.',
        ],
        [
          typeof t === 'function' ? t('guide_mine_refresh') : 'Diamants & Renouvellement',
          typeof t === 'function'
            ? t('guide_mine_refresh_desc')
            : 'Une fois tous les objets d’une couche déterrés, la mine se régénère. Les trésors s’échangent contre des diamants.',
        ],
        keyNumbersPage('guide_key_mine_desc'),
      ],
    },
    hatchery: {
      icon: _icon('hatchery'),
      title: t('guide_hatchery_title') || 'Pension',
      pages: [
        [
          typeof t === 'function' ? t('guide_hatchery_deposit') : 'Pension & Niveaux',
          typeof t === 'function'
            ? t('guide_hatchery_deposit_desc')
            : 'Dépose un Pokémon pour qu’il monte de niveau et produise des œufs au fur et à mesure de tes victoires en combat.',
        ],
        [
          typeof t === 'function' ? t('guide_hatchery_fossils') : 'Fossiles & Éclosion',
          typeof t === 'function'
            ? t('guide_hatchery_fossils_desc')
            : 'Les œufs et fossiles découverts dans la Mine éclosent avec tes K.O. pour vous offrir de nouvelles espèces et bébés Pokémon.',
        ],
        keyNumbersPage('guide_key_hatchery_desc'),
      ],
    },
    training: {
      icon: _icon('training'),
      title: t('guide_training_title') || 'Entraînement',
      pages: [
        [
          typeof t === 'function' ? t('guide_training_modes') : 'Modes d’entraînement',
          typeof t === 'function'
            ? t('guide_training_modes_desc')
            : 'Envoie tes Pokémon s’entraîner en duel pour gagner des niveaux, des EV spécifiques, ou éveiller un nouveau talent.',
        ],
        [
          typeof t === 'function' ? t('guide_ev_training') : 'EV & Talents',
          typeof t === 'function'
            ? t('guide_ev_training_desc')
            : 'Chaque séance d’EV ou de talent perfectionne les caractéristiques de vos Pokémon pour les rendre redoutables en arène.',
        ],
        keyNumbersPage('guide_key_training_desc'),
      ],
    },
    quests: {
      icon: _icon('quests'),
      title: typeof t === 'function' ? t('guide_quests_title') : 'Quests',
      pages: [
        [
          typeof t === 'function' ? t('guide_main_quests') : 'Quêtes principales & secondaires',
          typeof t === 'function'
            ? t('guide_main_quests_desc')
            : 'Elles débloquent l’histoire, des villes, des objets-clés et récompensent avec de l’argent et des combats uniques.',
        ],
        [
          typeof t === 'function' ? t('guide_repeatable_quests') : 'Quêtes répétables',
          typeof t === 'function'
            ? t('guide_repeatable_quests_desc')
            : 'Les quêtes répétables permettent d’amasser continuellement des Pokédollars et des Points de quête au gré de vos activités.',
        ],
        [
          t('guide_legendary_quests'),
          tr('guide_legendary_quests_desc', {
            pct: Math.round(
              ((typeof LEGENDARY_QUEST_CATCH_MULT === 'number' ? LEGENDARY_QUEST_CATCH_MULT : 2) -
                1) *
                100
            ),
          }),
        ],
      ],
    },
    economy: {
      icon: _icon('shop'),
      title: typeof t === 'function' ? t('guide_economy') : 'Economy & Market',
      pages: [
        [t('guide_currencies'), tr('guide_currencies_desc', currencyGuideValues())],
        [
          typeof t === 'function' ? t('guide_shops') : 'Boutiques & Revente',
          typeof t === 'function'
            ? t('guide_shops_desc')
            : 'Les boutiques vendent soins, pierres et vitamines. Les trésors de la Mine s’échangent contre des diamants.',
        ],
        keyNumbersPage('guide_key_economy_desc'),
      ],
    },
    automation: {
      icon: _icon('settings'),
      title: t('guide_automation_title') || 'Automatisation & personnel',
      pages: [
        automationBuyPage(),
        [
          t('guide_auto_relaunch'),
          typeof t === 'function'
            ? t('guide_auto_relaunch_desc')
            : 'Les modules de relance automatique permettent de relancer les combats sauvages et donjons dès la fin d’une session.',
        ],
        keyNumbersPage('guide_key_automation_desc'),
      ],
    },
    save: {
      icon: _icon('save'),
      title: t('guide_save_title') || 'Sauvegardes & AFK',
      pages: [
        [
          typeof t === 'function' ? t('guide_multi_saves') : 'Sauvegardes & Export',
          typeof t === 'function'
            ? t('guide_multi_saves_desc')
            : 'Le jeu gère plusieurs sauvegardes automatiques dans votre navigateur. Pensez à exporter régulièrement votre partie.',
        ],
        [
          typeof t === 'function' ? t('guide_afk') : 'Progression AFK',
          typeof t === 'function'
            ? t('guide_afk_desc')
            : 'Une partie de la progression peut être simulée hors-ligne avec le véritable moteur de combat.',
        ],
        keyNumbersPage('guide_key_afk_desc'),
      ],
    },
    atoll: {
      icon: _icon('atoll'),
      title: t('battle_atoll_title') || 'Atoll de Combat',
      pages: [
        [
          typeof t === 'function' ? t('guide_battle_atoll') : 'Battle Atoll',
          typeof t === 'function'
            ? t('guide_battle_atoll_desc')
            : 'L’Atoll propose des défis de haut niveau avec des règles spéciales et des restrictions d’équipes.',
        ],
        [
          typeof t === 'function'
            ? t('guide_atoll_rotation')
            : typeof G !== 'undefined' && G?.lang === 'en'
              ? '12-hour rotation'
              : 'Rotation de 12 h',
          typeof t === 'function'
            ? t('guide_atoll_rotation_desc')
            : typeof G !== 'undefined' && G?.lang === 'en'
              ? 'Opposing teams, banned legendaries and the shop rotate every 12 hours.'
              : 'Les équipes adverses, légendaires bannis et la boutique tournent toutes les 12 heures.',
        ],
      ],
    },
    dungeon: {
      icon: _icon('dungeon'),
      title: t('guide_dungeon_title') || 'Donjons',
      pages: [
        [
          typeof t === 'function' ? t('guide_dungeon_goal') : 'Exploration de donjons',
          typeof t === 'function'
            ? t('guide_dungeon_goal_desc')
            : 'Explorez chaque niveau en dévoilant les cases : combats, coffres au trésor, échelle de sortie et gardien de fin.',
        ],
        [
          typeof t === 'function' ? t('guide_dungeon_auto') : 'Pilote automatique',
          typeof t === 'function'
            ? t('guide_dungeon_auto_desc')
            : 'Le pilote automatique peut cibler les coffres, nettoyer tout le plateau ou foncer vers le boss selon vos réglages.',
        ],
        keyNumbersPage('guide_key_dungeon_desc'),
      ],
    },
    base: {
      icon: typeof getIcon === 'function' ? getIcon('base', 14) : '🏠',
      title:
        t('guide_base_title') ||
        (typeof G !== 'undefined' && G?.lang === 'en' ? 'Secret Bases' : 'Bases Secrètes'),
      pages:
        typeof G !== 'undefined' && G?.lang === 'en'
          ? [
              ['Unlocking', 'Secret Bases unlock in Hoenn after the Route 111 desert quest.'],
              [
                'Decorating & Perks',
                'Furnish your base with furniture, mats and dolls to gain passive adventuring bonuses.',
              ],
            ]
          : [
              [
                'Déblocage',
                'Les Bases Secrètes se débloquent à Hoenn après la quête du désert de la Route 111.',
              ],
              [
                'Décoration & Bonus',
                'Aménagez votre base avec du mobilier et des poupées pour bénéficier de bonus passifs permanents.',
              ],
            ],
    },
    dictionary: {
      icon: _icon('dictionary'),
      title: t('guide_dictionary_title') || 'Dictionnaire',
      pages: [
        [
          typeof t === 'function' ? t('guide_dict_overview') : 'Encyclopédie',
          typeof t === 'function'
            ? t('guide_dict_overview_desc')
            : 'Consultez les fiches détaillées de toutes les attaques, talents et objets du jeu.',
        ],
        [
          typeof t === 'function' ? t('guide_dict_search') : 'Recherche',
          typeof t === 'function'
            ? t('guide_dict_search_desc')
            : 'Recherchez facilement une capacité ou un talent pour voir ses effets précis et les Pokémon concernés.',
        ],
      ],
    },
  };
}

export {
  guideSections,
  statsGuideValues,
  shinyGuideValues,
  ballGuideValues,
  soundGuideValues,
  tutorialDeviceHint,
  captureGuidePages,
  captureGuideValues,
  guideKeyValues,
  keyNumbersPage,
};
