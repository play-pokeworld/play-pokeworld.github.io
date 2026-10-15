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

import { mergeGuideSections, automationBuyPage } from './guide-sections-extra.js';

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
  const v = captureGuideValues();
  return [
    [t('guide_capture_how'), t('guide_capture_how_desc')],
    [t('guide_capture_rates'), tr('guide_capture_rates_desc', v)],
    [t('guide_capture_iv'), tr('guide_capture_iv_desc', v)],
    [t('guide_capture_dupes'), t('guide_capture_dupes_desc')],
  ];
}

/**
 * V7-R1c · retour joueur « Diamants : comment en obtenir ? » — valeurs réelles
 * citées par la page « Monnaies » : trésors convertibles et leur valeur en 💎
 * (diamondTreasureList, currency.js) et nom du lieu qui ouvre la Mine.
 */
function currencyGuideValues() {
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
            ? t('guide_map_read_desc')
            : 'Les couleurs montrent l’état des lieux : disponibles, verrouillés, zones avec captures manquantes, quêtes actives ou shiny encore absents. Le bouton d’aide de la carte résume ce code couleur.',
        ],
        [
          typeof t === 'function'
            ? t('guide_movement')
            : typeof t === 'function'
              ? t('guide_movement')
              : 'Movement',
          typeof t === 'function'
            ? t('guide_movement_desc')
            : 'Clique sur un lieu débloqué pour t’y rendre. Une fois sur place, la fenêtre Lieu affiche les actions disponibles : explorer, défier, boutique, PNJ, bateau, labo fossile ou accès spéciaux.',
        ],
        [
          typeof t === 'function' ? t('guide_progress_locks') : 'Verrous de progression',
          typeof t === 'function'
            ? t('guide_progress_locks_desc')
            : 'La progression peut dépendre d’un nombre de combats sauvages gagnés, d’un badge, d’une quête principale ou d’un objet spécial. Les messages de blocage indiquent toujours la condition manquante.',
        ],
        [
          typeof t === 'function'
            ? t('guide_regions')
            : typeof t === 'function'
              ? t('guide_regions')
              : 'Regions',
          typeof t === 'function'
            ? t('guide_regions_desc')
            : 'Kanto puis Johto se débloquent avec la progression. Certaines règles d’accès imposent aussi de terminer une Ligue ou un Pokédex régional avant d’aller plus loin.',
        ],
        [
          typeof t === 'function' ? t('guide_npc_quests') : 'PNJ et quêtes',
          typeof t === 'function'
            ? t('guide_npc_quests_desc')
            : 'Les PNJ servent à faire avancer l’histoire, lancer des quêtes secondaires ou déclencher des combats scénarisés. Pense à revisiter les villes après les gros objectifs.',
        ],
        keyNumbersPage('guide_key_map_desc'),
      ],
    },
    combat: {
      icon: _icon('battle'),
      title: t('guide_combat_title') || 'Combat',
      pages: [
        [
          typeof t === 'function' ? t('guide_combat_basics') : 'Principe général',
          typeof t === 'function'
            ? t('guide_combat_basics_desc')
            : 'Les combats sont automatiques et en temps réel. Tu ne choisis pas l’attaque pendant le combat : la stratégie se prépare avant, via l’équipe, les objets, les talents et l’ordre de tes Pokémon.',
        ],
        [
          t('guide_attack_bars'),
          typeof t === 'function'
            ? t('guide_attack_bars_desc')
            : 'Each Pokémon automatically charges its next attack. Speed, status effects, and certain abilities modify the attack rhythm.',
        ],
        [
          typeof t === 'function'
            ? t('guide_combat_eff')
            : typeof t === 'function'
              ? t('guide_combat_eff')
              : 'Effectiveness',
          typeof t === 'function'
            ? t('guide_combat_eff_desc')
            : 'Les indicateurs ×2, ×4, ×½, ×¼ et ×0 montrent l’efficacité d’un type contre la cible actuelle. Ils sont visibles directement sur les attaques pour lire rapidement un matchup.',
        ],
        [
          typeof t === 'function' ? t('guide_combat_switch') : 'Changement de Pokémon',
          typeof t === 'function'
            ? t('guide_combat_switch_desc')
            : 'Tu peux changer de Pokémon actif pendant un combat normal si un autre membre vivant est disponible. Les combats d’entraînement solo n’autorisent pas ce changement.',
        ],
        [
          typeof t === 'function'
            ? t('guide_combat_status')
            : typeof t === 'function'
              ? t('guide_combat_status')
              : 'Status Effects',
          typeof t === 'function'
            ? t('guide_combat_status_desc')
            : 'Brûlure, poison, poison grave, sommeil, gel et paralysie ont des effets récurrents ou des pertes de tour. Ils sont affichés en badges courts sur les cartes.',
        ],
        [
          typeof t === 'function' ? t('guide_combat_items') : 'Talents et objets',
          typeof t === 'function'
            ? t('guide_combat_items_desc')
            : 'Les talents et objets tenus peuvent réduire des dégâts, soigner, booster des stats ou modifier des types d’attaque. Observe les petites capsules visuelles quand ils s’activent.',
        ],
        [
          typeof t === 'function'
            ? t('guide_combat_loot')
            : typeof t === 'function'
              ? t('guide_combat_loot')
              : 'Loot & Captures',
          typeof t === 'function'
            ? t('guide_combat_loot_desc')
            : 'Après les combats sauvages, le jeu gère automatiquement les captures et le butin. Le résumé de session regroupe captures, objets, victoires, K.O. et dégâts de l’équipe.',
        ],
        [
          typeof t === 'function'
            ? t('guide_combat_special')
            : typeof t === 'function'
              ? t('guide_combat_special')
              : 'Special Battles',
          typeof t === 'function'
            ? t('guide_combat_special_desc')
            : 'Arènes, Ligue, rival, Team Rocket, boss de quête et Atoll demandent surtout de la préparation : bonne équipe, bons talents, EV et objets tenus.',
        ],
        keyNumbersPage('guide_key_combat_desc'),
      ],
    },
    // V7-R1 · retours joueurs #7 — capture & gain d'IV (valeurs lues dans le
    // code : BALL_DEFS / ballEffectiveRate et GAME.CAPTURE, jamais recopiées).
    capture: {
      icon: _icon('pokeball'),
      title: t('guide_capture_title'),
      pages: captureGuidePages(),
    },
    pokemon: {
      icon: _icon('team'), // V7-R1 — la Poké Ball illustre désormais « Capture & IV »
      title: t('guide_pokemon_title') || 'Pokémon',
      pages: [
        [
          t('guide_pokemon_sheet'),
          `${tutorialDeviceHint('sheet')} ${t('guide_pokemon_sheet_desc')}`,
        ],
        [
          typeof t === 'function' ? t('guide_sheet_base') : 'Base Stats',
          typeof t === 'function'
            ? t('guide_sheet_base_desc')
            : 'Les Base Stats représentent le potentiel naturel de l’espèce. Deux Pokémon d’une même espèce partagent cette base, puis les IV/EV/personnalisation font la différence.',
        ],
        [
          typeof t === 'function' ? t('guide_sheet_iv') : 'IV',
          typeof t === 'function'
            ? t('guide_sheet_iv_desc')
            : 'Les IV sont des bonus durables sur chaque statistique. Plus ils sont hauts, meilleur est le Pokémon sur le long terme.',
        ],
        [
          typeof t === 'function'
            ? t('guide_sheet_ev')
            : typeof t === 'function'
              ? t('guide_ev_training')
              : 'EV',
          typeof t === 'function'
            ? t('guide_sheet_ev_desc')
            : 'Les EV représentent l’entraînement spécialisé. Ils montent surtout via l’entraînement EV et améliorent progressivement une statistique précise.',
        ],
        [
          typeof t === 'function'
            ? t('guide_sheet_abilities')
            : typeof t === 'function'
              ? t('guide_dict_abilities')
              : 'Abilities',
          typeof t === 'function'
            ? t('guide_sheet_abilities_desc')
            : 'Chaque espèce peut disposer de plusieurs talents. La capture, l’entraînement Talent et certains progrès débloquent ces options au fil du temps.',
        ],
        [
          typeof t === 'function'
            ? t('guide_sheet_moves')
            : typeof t === 'function'
              ? t('guide_dict_moves')
              : 'Moves',
          typeof t === 'function'
            ? t('guide_sheet_moves_desc')
            : 'Clique une attaque connue pour sélectionner un slot à remplacer, puis une attaque apprenable. Les descriptions de capacités indiquent type, puissance, précision et effets.',
        ],
        [
          typeof t === 'function' ? t('guide_sheet_item') : 'Objet tenu',
          typeof t === 'function'
            ? t('guide_sheet_item_desc')
            : 'Un objet tenu peut transformer un Pokémon médiocre en bon support, ou renforcer un sweeper déjà fort. Un même objet ne peut être équipé que sur un seul Pokémon à la fois.',
        ],
        [
          typeof t === 'function' ? t('guide_sheet_fav') : 'Favori / verrouillage',
          typeof t === 'function'
            ? t('guide_sheet_fav_desc')
            : 'Favori sert à repérer un Pokémon important. Verrouillé empêche plusieurs automatismes de le recycler par erreur.',
        ],
      ],
    },
    bag: {
      icon: _icon('bag'),
      title: t('guide_bag_title') || 'Sac',
      pages: [
        [
          typeof t === 'function' ? t('guide_bag_org') : 'Organisation',
          typeof t === 'function'
            ? t('guide_bag_org_desc')
            : 'Le sac est trié par catégories : consommables, objets tenus, pierres, trésors, fossiles et objets spéciaux. Utilise les filtres et le tri pour gagner du temps.',
        ],
        [
          typeof t === 'function' ? t('guide_bag_consumables') : 'Consommables',
          typeof t === 'function'
            ? t('guide_bag_consumables_desc')
            : 'Les soins, bonbons et objets d’usage immédiat s’emploient depuis le sac ou via certaines interfaces dédiées.',
        ],
        [
          typeof t === 'function' ? t('guide_bag_held') : 'Objets tenus',
          typeof t === 'function'
            ? t('guide_bag_held_desc')
            : 'Les objets tenus sont pensés pour la préparation d’équipe. Le bonus réel dépend parfois du stock possédé dans le sac.',
        ],
        [
          typeof t === 'function' ? t('guide_evo_stones') : 'Evolution Stones',
          typeof t === 'function'
            ? t('guide_evo_stones_desc')
            : 'Stones show compatible Pokémon. The game also tells you if the target evolution is already obtained.',
        ],
        [
          typeof t === 'function'
            ? t('guide_bag_treasure')
            : typeof t === 'function'
              ? t('guide_bag_treasure')
              : 'Treasures & Fossils',
          typeof t === 'function'
            ? t('guide_bag_treasure_desc')
            : 'Les trésors servent surtout à l’économie. Les fossiles servent à la pension / résurrection plutôt qu’à la vente.',
        ],
        [
          typeof t === 'function' ? t('guide_bag_surplus') : 'Surplus & Revente',
          typeof t === 'function'
            ? t('guide_bag_surplus_desc')
            : 'Chaque pile d’objets a une capacité maximale dans le sac. Lorsque vous récoltez un objet au-delà de cette limite de stock, le surplus est automatiquement revendu et converti en Pokédollars (₽) !',
        ],
      ],
    },
    mine: {
      icon: _icon('mine'),
      title: t('guide_mine_title') || 'Mine',
      pages: [
        [
          typeof t === 'function' ? t('guide_mine_goal') : 'Objectif',
          typeof t === 'function'
            ? t('guide_mine_goal_desc')
            : 'La mine cache pierres, trésors et fossiles. Il faut révéler complètement les objets pour les récupérer.',
        ],
        [
          typeof t === 'function' ? t('guide_mine_tools') : 'Outils',
          typeof t === 'function'
            ? t('guide_mine_tools_desc')
            : 'Le burin est précis. Le marteau couvre une petite zone. Les améliorations débloquent des outils plus efficaces comme la pioche renforcée, la foreuse et la dynamite.',
        ],
        [
          typeof t === 'function'
            ? t('guide_mine_energy')
            : typeof t === 'function'
              ? t('guide_mine_energy')
              : 'Energy',
          typeof t === 'function'
            ? t('guide_mine_energy_desc')
            : 'Chaque coup consomme de l’énergie. L’énergie se régénère avec le temps et certains systèmes de progression.',
        ],
        [
          typeof t === 'function' ? t('guide_mine_refresh') : 'Renouvellement',
          typeof t === 'function'
            ? t('guide_mine_refresh_desc')
            : 'Une fois tous les objets d’une couche récupérés, la mine se renouvelle. Les futurs mineurs améliorent l’efficacité et l’endurance des sessions.',
        ],
        keyNumbersPage('guide_key_mine_desc'),
      ],
    },
    hatchery: {
      icon: _icon('hatchery'),
      title: t('guide_hatchery_title') || 'Pension',
      pages: [
        [
          typeof t === 'function'
            ? t('guide_hatchery_deposit')
            : typeof t === 'function'
              ? t('guide_hatchery_deposit')
              : 'Deposit a Pokémon',
          typeof t === 'function'
            ? t('guide_hatchery_deposit_desc')
            : 'Dépose un Pokémon depuis l’équipe ou depuis la boîte si un slot est libre. Plusieurs slots se débloquent via les améliorations.',
        ],
        [
          typeof t === 'function' ? t('guide_hatchery_eggs') : 'Progression des œufs',
          typeof t === 'function'
            ? t('guide_hatchery_eggs_desc')
            : 'Les œufs et fossiles avancent avec les K.O. de combat. Quand le compteur requis est atteint, ils sont prêts à éclore.',
        ],
        [
          typeof t === 'function' ? t('guide_hatchery_fossils') : 'Fossiles',
          typeof t === 'function'
            ? t('guide_hatchery_fossils_desc')
            : 'Les fossiles trouvés à la mine peuvent être envoyés en pension pour être ranimés sous forme de Pokémon.',
        ],
        [
          typeof t === 'function' ? t('guide_hatchery_auto') : 'Automatisation',
          typeof t === 'function'
            ? t('guide_hatchery_auto_desc')
            : 'La pension possède une file d’attente manuelle, un remplissage automatique, une éclosion automatique, des filtres de tri et du personnel.',
        ],
        [
          typeof t === 'function'
            ? t('guide_hatchery_staff')
            : typeof t === 'function'
              ? t('guide_hatchery_staff')
              : 'Staff',
          typeof t === 'function'
            ? t('guide_hatchery_staff_desc')
            : 'Les gérants améliorent progressivement l’efficacité de la pension. Ils se recrutent par lieu et gagnent de l’XP en travaillant.',
        ],
        keyNumbersPage('guide_key_hatchery_desc'),
      ],
    },
    training: {
      icon: _icon('training'),
      title: t('guide_training_title') || 'Entraînement',
      pages: [
        [
          typeof t === 'function' ? t('guide_training_modes') : 'Modes',
          typeof t === 'function'
            ? t('guide_training_modes_desc')
            : 'Les modes principaux sont Niveau, EV, Talent et Capacité. Chaque mode vise une amélioration précise.',
        ],
        [
          t('guide_training_level'),
          typeof t === 'function'
            ? t('guide_training_level_desc')
            : 'Le stage Niveau donne plusieurs niveaux d’un coup, dans la limite du niveau 100.',
        ],
        [
          typeof t === 'function' ? t('guide_ev_training') : 'EV',
          typeof t === 'function'
            ? t('guide_ev_training_desc')
            : 'The EV stage gives exactly +1 random EV as long as the Pokémon is not already at maximum.',
        ],
        [
          typeof t === 'function' ? t('guide_talent_training') : 'Talent',
          typeof t === 'function'
            ? t('guide_talent_training_desc')
            : 'The Talent stage attempts to unlock or reconfirm a possible ability of the species. Rare abilities naturally take longer.',
        ],
        [
          typeof t === 'function' ? t('guide_ability') : 'Ability',
          typeof t === 'function'
            ? t('guide_ability_desc')
            : 'Le stage Capacité débloque des attaques avancées réservées à l’entraînement. Elles deviennent ensuite apprenables dans la fiche du Pokémon.',
        ],
        [
          typeof t === 'function' ? t('guide_slots_auto') : 'Slots & Automation',
          typeof t === 'function'
            ? t('guide_slots_auto_desc')
            : 'Each slot can have its own queue and its own auto mode. Training staff also improves system consistency.',
        ],
        keyNumbersPage('guide_key_training_desc'),
      ],
    },
    quests: {
      icon: _icon('quests'),
      title: typeof t === 'function' ? t('guide_quests_title') : 'Quests',
      pages: [
        [
          typeof t === 'function' ? t('guide_main_quests') : 'Main Quests',
          typeof t === 'function'
            ? t('guide_main_quests_desc')
            : 'Elles débloquent l’histoire, des villes, des objets-clés et les passages majeurs comme la Poké Flûte ou l’accès à d’autres régions.',
        ],
        [
          typeof t === 'function' ? t('guide_side_quests') : 'Side Quests',
          typeof t === 'function'
            ? t('guide_side_quests_desc')
            : 'They mainly give money, items or special battles. They often appear through town NPCs.',
        ],
        [
          typeof t === 'function' ? t('guide_repeatable_quests') : 'Repeatable Quests',
          typeof t === 'function'
            ? t('guide_repeatable_quests_desc')
            : 'Repeatables serve as long-term economy. They require defeating, capturing or selling depending on the objective.',
        ],
        [
          typeof t === 'function' ? t('guide_quest_battles') : 'Quest Battles',
          typeof t === 'function'
            ? t('guide_quest_battles_desc')
            : 'Certaines quêtes lancent un combat unique. Le défi est souvent plus important qu’un simple combat sauvage et peut donner un Pokémon ou un gros reward.',
        ][
          // V7 · LEG-01/LEG-02 — quêtes légendaires (pilier ouvert en P1 : page de guide, DoD §0.4).
          (t('guide_legendary_quests'),
          tr('guide_legendary_quests_desc', {
            pct: Math.round(
              ((typeof LEGENDARY_QUEST_CATCH_MULT === 'number' ? LEGENDARY_QUEST_CATCH_MULT : 2) -
                1) *
                100
            ),
          }))
        ],
      ],
    },
    economy: {
      icon: _icon('shop'),
      title: typeof t === 'function' ? t('guide_economy') : 'Economy & Market',
      pages: [
        // V7-R1c — les 5 monnaies et leur source (les 💎 n'en ont qu'une : la Mine).
        [t('guide_currencies'), tr('guide_currencies_desc', currencyGuideValues())],
        [
          typeof t === 'function' ? t('guide_shops') : 'Shops',
          typeof t === 'function'
            ? t('guide_shops_desc')
            : 'Les boutiques vendent soins, objets spéciaux, pierres, objets tenus et autres ressources selon ta progression.',
        ],
        [
          typeof t === 'function' ? t('guide_pokemarket') : 'PokéMarket',
          typeof t === 'function'
            ? t('guide_pokemarket_desc')
            : 'The Market is used to buy certain species not easily found in the wild. It completes the collection more than it replaces exploration.',
        ],
        [
          typeof t === 'function' ? t('guide_treasures') : 'Treasures & Sales',
          typeof t === 'function'
            ? t('guide_treasures_desc')
            : 'The mine fuels a large part of the economy through treasures. Duplicate special items can also be converted into money.',
        ],
        [
          typeof t === 'function' ? t('guide_rewards') : 'Rewards',
          typeof t === 'function'
            ? t('guide_economy_rewards_desc')
            : 'Argent et objets viennent des quêtes, combats, mine, captures, répétables et modes spéciaux comme l’Atoll.',
        ],
        keyNumbersPage('guide_key_economy_desc'),
      ],
    },
    automation: {
      icon: _icon('settings'),
      title: t('guide_automation_title') || 'Automatisation & personnel',
      pages: [
        [
          typeof t === 'function' ? t('guide_automation') : 'How it works',
          typeof t === 'function'
            ? t('guide_automation_desc')
            : 'L’automatisation n’agit pas seule au début : il faut acheter les modules, configurer les règles et parfois remplir la file d’attente manuellement.',
        ],
        [
          typeof t === 'function' ? t('guide_queues') : 'Queues',
          typeof t === 'function'
            ? t('guide_queues_desc')
            : 'La pension et l’entraînement possèdent leurs propres files, avec capacité maximale, filtres et tri.',
        ],
        [
          typeof t === 'function' ? t('guide_staff') : 'Staff',
          typeof t === 'function'
            ? t('guide_staff_desc')
            : 'Le personnel se recrute selon la progression. Chaque employé donne un bonus spécialisé et gagne des niveaux avec l’usage.',
        ],
        // V7-R2 · AUTO-01
        [t('guide_auto_relaunch'), t('guide_auto_relaunch_desc')],
        // V7-R3 · R3-07 — relance auto des expéditions (prix / délai / mode lus dans le code)
        [
          t('guide_auto_dg_relaunch'),
          tr('guide_auto_dg_relaunch_desc', {
            price: guideKeyValues().dgRelaunch,
            delay: guideKeyValues().dgDelay,
            mode: guideKeyValues().dgMode,
          }),
        ],
        [
          typeof t === 'function' ? t('guide_protections') : 'Protections',
          typeof t === 'function'
            ? t('guide_protections_desc')
            : 'Les Pokémon verrouillés et certaines situations évitent que l’automatisation touche à des Pokémon que tu veux garder manuellement.',
        ],
        automationBuyPage(), // V7-R3c — prix sur chaque bouton de mode auto
        keyNumbersPage('guide_key_automation_desc'),
      ],
    },
    save: {
      icon: _icon('save'),
      title: t('guide_save_title') || 'Sauvegardes & AFK',
      pages: [
        [
          typeof t === 'function' ? t('guide_multi_saves') : 'Multi-saves',
          typeof t === 'function'
            ? t('guide_multi_saves_desc')
            : 'The game manages multiple saves with customizable name, background and icon.',
        ],
        [
          typeof t === 'function' ? t('guide_import_export') : 'Import / Export',
          typeof t === 'function'
            ? t('guide_import_export_desc')
            : 'Exporte régulièrement tes saves pour éviter toute perte pendant les phases alpha. L’import permet aussi d’écraser proprement une partie existante.',
        ],
        [
          typeof t === 'function' ? t('guide_afk') : 'AFK',
          typeof t === 'function'
            ? t('guide_afk_desc')
            : 'Une partie de la progression peut être simulée hors ligne. Le résumé AFK indique combats gagnés, captures, énergie, argent et K.O. éventuels.',
        ],
        [
          typeof t === 'function' ? t('guide_alpha_safety') : 'Alpha Safety',
          typeof t === 'function'
            ? t('guide_alpha_safety_desc')
            : 'Comme le projet est encore en alpha, garde toujours une exportation récente avant de tester un nouveau zip.',
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
            : 'L’Atoll de Combat est le contenu de fin d’alpha. Il sert à tester des équipes optimisées dans plusieurs formats.',
        ],
        [
          typeof t === 'function' ? t('guide_formats') : 'Formats',
          typeof t === 'function'
            ? t('guide_formats_desc')
            : 'Tour, Usine, Arène et Dôme appliquent chacun des contraintes différentes : rang maximum, location, objets interdits ou équipe prêtée.',
        ],
        [
          typeof t === 'function'
            ? t('guide_atoll_rotation')
            : G && G.lang === 'en'
              ? '12-hour rotation'
              : 'Rotation de 12 h',
          typeof t === 'function'
            ? t('guide_atoll_rotation_desc')
            : G && G.lang === 'en'
              ? 'Opposing teams, banned legendaries and the shop rotate every 12 hours (shared UTC window). The timer is shown in the Atoll menu.'
              : 'Les équipes adverses, les légendaires bannis et la boutique tournent toutes les 12 heures (fenêtre UTC partagée). Le minuteur est affiché dans le menu de l’Atoll.',
        ],
        [
          typeof t === 'function'
            ? t('guide_training_prep')
            : typeof t === 'function'
              ? t('guide_training_prep')
              : 'Preparation',
          typeof t === 'function'
            ? t('guide_training_prep_desc')
            : 'Les objets tenus, les talents, les EV et l’ordre d’équipe comptent beaucoup plus ici que dans les combats sauvages classiques.',
        ],
        [
          typeof t === 'function' ? t('guide_rewards') : 'Rewards',
          typeof t === 'function'
            ? t('guide_atoll_rewards_desc')
            : 'Les victoires donnent des jetons Atoll utilisables dans la boutique dédiée. Les séries augmentent l’intérêt du farm.',
        ][
          // V7 · ATL-03 — Fragments de Légende.
          (t('guide_legend_fragments'),
          tr('guide_legend_fragments_desc', {
            cost: typeof LEGEND_FRAGMENT_COST === 'number' ? LEGEND_FRAGMENT_COST : 50,
            boss: typeof ATOLL_FRAGMENTS_PER_BOSS === 'number' ? ATOLL_FRAGMENTS_PER_BOSS : 3,
          }))
        ],
      ],
    },
    dungeon: {
      icon: _icon('dungeon'),
      title: t('guide_dungeon_title') || 'Donjons',
      pages: [
        [
          typeof t === 'function' ? t('guide_dungeon_goal') : 'Objectif',
          typeof t === 'function'
            ? t('guide_dungeon_goal_desc')
            : 'Les donjons sont des expéditions payées en jetons. Une forêt n’a qu’un niveau ; une grotte en compte plusieurs. Sur chaque niveau, une carte à explorer : combats, coffres, boss, échelle pour descendre.',
        ],
        [
          typeof t === 'function' ? t('guide_dungeon_map') : 'Lire la carte',
          typeof t === 'function'
            ? t('guide_dungeon_map_desc')
            : 'La carte se lit comme une légende : la pokéball violette est un combat, la pokéball étoilée orange un combat corsé, le coffre doré un trésor, le boss rouge le gardien, l’échelle bleue la sortie. Le brouillard cache ce qui reste à découvrir.',
        ],
        [
          typeof t === 'function' ? t('guide_dungeon_move') : 'Se déplacer',
          typeof t === 'function'
            ? t('guide_dungeon_move_desc')
            : 'Clique une case visible pour t’y téléporter, le boss compris. Les flèches font avancer d’une case. Le boss est protégé par des combats : bats-les pour l’atteindre.',
        ],
        [
          typeof t === 'function' ? t('guide_dungeon_floor') : 'Butin',
          typeof t === 'function'
            ? t('guide_dungeon_floor_desc')
            : 'Chaque victoire remplit le sac et le butin s’affiche sous la carte. Quand tu veux repartir, « Remonter et encaisser » rassemble tout ce que tu as récolté.',
        ],
        [
          typeof t === 'function' ? t('guide_dungeon_auto') : 'Pilote automatique',
          typeof t === 'function'
            ? t('guide_dungeon_auto_desc')
            : 'Une fois le donjon complété plusieurs fois, le mode auto se débloque avec trois options : foncer vers le boss, explorer tout le plateau, ou ne ramasser que les coffres.',
        ],
        keyNumbersPage('guide_key_dungeon_desc'),
      ],
    },
    base: {
      icon: typeof getIcon === 'function' ? getIcon('base', 14) : '🏠',
      title: t('guide_base_title') || (G && G.lang === 'en' ? 'Secret Bases' : 'Bases Secrètes'),
      pages:
        G && G.lang === 'en'
          ? [
              [
                'Unlocking',
                'Secret Bases unlock in Hoenn after the Route 111 desert quest. The Secret Base window then appears in the middle column of the dashboard.',
              ],
              [
                'Establishing your base',
                'On many Hoenn routes, the Location window offers to examine the alcove and establish your base there. Each route has its own canonical room (cave, tree or shrub).',
              ],
              [
                'Decorating',
                'Collect furniture, mats, posters and dolls, then place them in edit mode. Placement follows the Emerald rules: floor, wall or surface items, and the entrance must stay clear.',
              ],
              [
                'Visiting',
                'You can visit your own base or import a friend\u2019s base from a file. Some visits include NPC buddies you can battle for daily records.',
              ],
              [
                'Perks',
                'An established base grants small comfort bonuses (route loot, money). Flags collected from visits improve your base rank.',
              ],
            ]
          : [
              [
                'Déblocage',
                'Les Bases Secrètes se débloquent à Hoenn après la quête du désert de la Route 111. La fenêtre Base Secrète apparaît alors dans la colonne centrale du tableau de bord.',
              ],
              [
                'Établir sa base',
                'Sur de nombreuses routes de Hoenn, la fenêtre Lieu propose d’examiner l’alcôve et d’y établir votre base. Chaque route possède sa salle canonique (grotte, arbre ou buisson).',
              ],
              [
                'Décorer',
                'Collectionnez meubles, tapis, posters et poupées, puis placez-les en mode édition. La pose suit les règles d’Émeraude : objets au sol, au mur ou sur surface, et l’entrée doit rester dégagée.',
              ],
              [
                'Visiter',
                'Vous pouvez visiter votre propre base ou importer celle d’un ami depuis un fichier. Certaines visites incluent des copains PNJ à affronter pour des records quotidiens.',
              ],
              [
                'Avantages',
                'Une base établie donne de petits bonus de confort (butin de route, argent). Les drapeaux récoltés en visite améliorent le rang de votre base.',
              ],
            ],
    },
    dictionary: {
      icon: _icon('dictionary'),
      title: t('guide_dictionary_title') || 'Dictionnaire',
      pages: [
        [
          typeof t === 'function' ? t('guide_dict_items') : 'Items',
          typeof t === 'function'
            ? t('guide_dict_items_desc')
            : 'Search for an item to see if you own it, where to find it and what it does.',
        ],
        [
          typeof t === 'function' ? t('guide_dict_moves') : 'Moves',
          typeof t === 'function'
            ? t('guide_dict_moves_desc')
            : 'Cherche une attaque pour voir son type, sa puissance, ses effets et quels Pokémon la connaissent déjà.',
        ],
        [
          typeof t === 'function' ? t('guide_dict_abilities') : 'Abilities',
          typeof t === 'function'
            ? t('guide_dict_abilities_desc')
            : 'Search for an ability to see its effect, rarity and concerned Pokémon.',
        ],
        [
          typeof t === 'function' ? t('guide_dict_usage') : 'Usage',
          typeof t === 'function'
            ? t('guide_dict_usage_desc')
            : 'Le dictionnaire devient très utile quand le nombre d’objets, de talents et d’attaques commence à devenir difficile à suivre de tête.',
        ],
      ],
    },
  };
}

export {
  guideSections,
  tutorialDeviceHint,
  captureGuidePages,
  captureGuideValues,
  guideKeyValues,
  keyNumbersPage,
};
