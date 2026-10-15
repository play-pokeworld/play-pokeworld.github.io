// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// V7-R1 · retours joueurs #7 — les rubriques du guide (dont « Capture & IV »)
// et l'indice d'appareil vivent dans ui/game/guide-sections.js (DBT-09 : ce
// fichier repasse sous les 1 000 lignes). La surface classique est conservée
// plus bas (window.guideSections / window.tutorialDeviceHint).
import { guideSections, tutorialDeviceHint } from './guide-sections.js';
// V7-R1 · retours joueurs #10 — surbrillance de l'élément à ouvrir.
import { applyTutorialHighlight, installTutorialHighlight } from './tutorial-highlight.js';

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) {
    if (typeof pwSetHtml === 'function') pwSetHtml(el, html);
    else el.innerHTML = html;
  };
}

let _guideSection = null;

function ensureTutorialState() {
  if (!G.tutorial || typeof G.tutorial !== 'object') G.tutorial = {};
  if (G.tutorial.enabled === undefined) G.tutorial.enabled = true;
  if (!G.tutorial.completed) G.tutorial.completed = {};
  if (!G.tutorial.dismissedTips) G.tutorial.dismissedTips = {};
  if (!G.tutorial.rewards) G.tutorial.rewards = {};
  return G.tutorial;
}
function tutorialIsEnabled() {
  return !!ensureTutorialState().enabled;
}
function tutorialDisable() {
  const st = ensureTutorialState();
  st.enabled = false;
  closeTutorialTip();
  try {
    applyTutorialHighlight(); // V7-R1 #10 — plus d'étape → plus de halo
  } catch (_) {}
  saveGame();
  try {
    renderStoryWindow();
  } catch (_) {}
  notify(t('tutorial_disabled'), 'var(--light1)');
}
function tutorialEnable() {
  const st = ensureTutorialState();
  st.enabled = true;
  saveGame();
  try {
    renderStoryWindow();
  } catch (_) {}
  notify(t('tutorial_enabled'), 'var(--green)');
}
function tutorialDismissTip(id) {
  const st = ensureTutorialState();
  if (id) st.dismissedTips[id] = true;
  closeTutorialTip();
  saveGame();
}
function closeTutorialTip() {
  const el = document.getElementById('tutorial-tip');
  if (el) el.remove();
}
function tutorialMark(id) {
  const st = ensureTutorialState();
  if (!id) return;
  if (!st.completed[id]) {
    st.completed[id] = true;
    updateTutorialProgress();
    saveGame();
    try {
      renderStoryWindow();
    } catch (_) {}
  }
}
// Phase 54 (user feedback: "the tutorial quests give way too
// many berries, they gave me the max directly instead of just one").
//
// Root cause — DOUBLE BOOK-KEEPING of the rewards:
// the anti-duplication lock only lived in `G.tutorial.rewards`, an item
// rebuilt from zero by `ensureTutorialState()` whenever `G.tutorial` is
// absent (new game, pre-tutorial save, import, or any loading where the
// `tutorial` branch had not been persisted). The
// INVENTORY, though, IS saved. On every session where the tutorial
// state restarted from scratch, already-done steps (Shuca Berry…) were
// re-detected as "freshly completed" and paid one more time.
// Reproduced: 30 sessions → 25 berries, exactly the stack cap
// (`addToInventory` caps held items at 25) — hence the "max directly".
//
// Fix: the lock is BACKED BY the INVENTORY, not by the flag alone. A
// reward is only paid if the player does not already own the item, and
// the payout is capped at the quantity planned by the step. A lost flag
// can therefore no longer replay a payment.
function _isBallItem(k) {
  return typeof BALL_DEFS !== 'undefined' && BALL_DEFS && BALL_DEFS[k];
}
function tutorialRewardAlreadyPaid(step) {
  if (!step || !step.items) return false;
  for (const k in step.items) {
    if (_isBallItem(k)) {
      const have = (G.pokeballs && G.pokeballs[k]) || 0;
      if (have >= Number(step.items[k] || 1)) return true;
    } else {
      const have = Number((G.inventory && G.inventory[k]) || 0);
      if (have >= Number(step.items[k] || 1)) return true;
    }
  }
  return false;
}
function tutorialGiveReward(step) {
  const st = ensureTutorialState();
  if (!step || st.rewards[step.id]) return;
  // Anti-replay guard: set the flag before any grant, so a second pass
  // in the same session cannot pay again.
  const alreadyPaid = tutorialRewardAlreadyPaid(step);
  st.rewards[step.id] = true;
  if (alreadyPaid) return;
  if (step.money) {
    G.money = (G.money || 0) + step.money;
    try {
      updateHeader();
    } catch (_) {}
  }
  if (step.items) {
    for (const k in step.items) {
      const want = Math.max(1, Number(step.items[k] || 1));
      if (_isBallItem(k)) {
        // Les Poké Balls ne sont pas des items d'inventaire : G.pokeballs.
        if (typeof ensurePokeballs === 'function') ensurePokeballs();
        if (!G.pokeballs) G.pokeballs = {};
        const have = Number(G.pokeballs[k] || 0);
        const give = Math.max(0, want - have);
        if (give > 0) G.pokeballs[k] = have + give;
      } else {
        const have = Number((G.inventory && G.inventory[k]) || 0);
        const give = Math.max(0, want - have); // never more that prevu
        if (give > 0) addToInventory(k, give);
      }
    }
  }
  if (step.jd) {
    if (typeof gainDungeonTokens === 'function') gainDungeonTokens(step.jd);
  }
  if (step.rewardText) notify(step.rewardText, 'var(--green)');
}
function tutorialSteps() {
  // Helper : une ball est posée sur au moins un filtre actif.
  const _ballSet = () => {
    try {
      if (G && G.pokeballs && Array.isArray(G.pokeballs.filters)) {
        return G.pokeballs.filters.some((f) => f.enabled !== false && f.ball && f.ball !== 'none');
      }
    } catch (_) {}
    return false;
  };
  return [
    // ── Phase 1 · Combats et argent ──────────────────────────────────────────
    {
      id: 'route1_battles',
      title: t('tutorial_step_route1_title') || 'Premiers combats',
      desc: t('tutorial_step_route1_desc') || 'Gagne 5 combats sauvages sur la Route 1.',
      how: () => `${t('tutorial_step_route1_how')} ${tutorialDeviceHint('map')}`,
      actionLabel: t('tutorial_step_route1_action'),
      actionCall: 'clickLocation',
      actionArgs: "'route1'",
      targets: ['#win-tabs [data-call="exploreArea"]'], // V7-R1 #10
      done: () => ((G.wildWinsByLoc || {}).route1 || 0) >= 5,
      progress: () => ({ cur: Math.min(5, (G.wildWinsByLoc || {}).route1 || 0), max: 5 }),
      money: 300,
      items: { occa_berry: 1 },
      rewardText: t('tutorial_step_route1_reward'),
    },
    // ── Phase 2 · Capture ────────────────────────────────────────────────────
    {
      id: 'set_pokeball_filter',
      title: t('tutorial_step_setball_title') || 'Configure tes Poké Balls',
      desc:
        t('tutorial_step_setball_desc') ||
        "Ouvre la fenêtre Poké Balls et pose la Poké Ball sur le filtre « Nouveau » : c'est lui qui décide quelle ball lancer en combat.",
      how: () =>
        t('tutorial_step_setball_how') ||
        'Dans la fenêtre Poké Balls, clique sur la Poké Ball vide du filtre « Nouveau » puis choisis « Poké Ball ».',
      actionLabel: t('tutorial_step_setball_action'),
      actionCall: 'scrollToWin',
      actionArgs: "'win-pokeballs'",
      done: () => _ballSet(),
      progress: () => ({ cur: _ballSet() ? 1 : 0, max: 1 }),
      rewardText: t('tutorial_step_setball_reward'),
    },
    {
      id: 'catch_first',
      title: t('tutorial_step_catch_title') || 'Capturer ton premier Pokémon',
      desc:
        tr('tutorial_step_catch_desc', {
          pct: typeof ballDef === 'function' && ballDef('pokeball') ? ballDef('pokeball').rate : 10,
        }) || 'Combats sur une route : ta première capture est garantie !',
      how: () =>
        t('tutorial_step_catch_how') ||
        'Reste sur la Route 1 et enchaîne les combats : la Poké Ball lancée sur un Pokémon capturera à coup sûr la première fois.',
      actionLabel: t('tutorial_step_catch_action'),
      actionCall: 'clickLocation',
      actionArgs: "'route1'",
      targets: ['#win-tabs [data-call="exploreArea"]'], // V7-R1 #10
      done: () => (G.team || []).length >= 2 || Object.keys(G.collection || {}).length >= 1,
      progress: () => ({
        cur: (G.team || []).length >= 2 || Object.keys(G.collection || {}).length >= 1 ? 1 : 0,
        max: 1,
      }),
      rewardText: t('tutorial_step_catch_reward'),
    },
    {
      id: 'buy_pokeballs',
      title: t('tutorial_step_buyballs_title') || 'Acheter des Poké Balls',
      desc:
        t('tutorial_step_buyballs_desc') ||
        'Tes Poké Balls sont consommées à chaque tentative : va à la boutique de Bourg Palette pour en racheter.',
      how: () =>
        t('tutorial_step_buyballs_how') ||
        'Ouvre la boutique de Bourg Palette, choisis une quantité et clique « Acheter ».',
      actionLabel: t('tutorial_step_buyballs_action'),
      actionCall: 'openFullscreenPanel',
      actionArgs: "'shop'",
      done: () => (G.totalBallsBought || 0) >= 1,
      progress: () => ({ cur: (G.totalBallsBought || 0) >= 1 ? 1 : 0, max: 1 }),
      money: 200,
      rewardText: t('tutorial_step_buyballs_reward'),
    },
    {
      id: 'honor_ball_intro',
      title: t('tutorial_step_honor_title') || "L'Honor Ball",
      desc:
        t('tutorial_step_honor_desc') ||
        "Toutes les 10 Poké Balls achetées, le magasin t'offre une Honor Ball (blanche et rouge).",
      how: () =>
        t('tutorial_step_honor_how') || "Continue d'acheter des Poké Balls pour en gagner.",
      actionLabel: t('tutorial_step_honor_action'),
      actionCall: 'scrollToWin',
      actionArgs: "'win-pokeballs'",
      done: () => !!(G.pokeballs && G.pokeballs.honorball > 0),
      progress: () => ({ cur: G.pokeballs && G.pokeballs.honorball > 0 ? 1 : 0, max: 1 }),
      rewardText: t('tutorial_step_honor_reward'),
    },
    // ── Phase 3 · Interfaces ─────────────────────────────────────────────────
    {
      id: 'open_poke_sheet',
      title: t('tutorial_step_sheet_title') || 'Lire une fiche Pokémon',
      desc:
        t('tutorial_step_sheet_desc') ||
        'Ouvre une fiche Pokémon pour lire ses stats, IV, EV, talents et attaques.',
      how: () => `${tutorialDeviceHint('sheet')} ${t('tutorial_step_sheet_how')}`,
      actionLabel: t('tutorial_step_sheet_action'),
      actionCall: 'showTab',
      actionArgs: "'team'",
      done: () => !!ensureTutorialState().completed.open_poke_sheet,
      money: 200,
      rewardText: t('tutorial_step_sheet_reward'),
    },
    {
      id: 'open_bag',
      title: t('tutorial_step_bag_title') || 'Ouvrir le sac',
      desc:
        t('tutorial_step_bag_desc') || 'Ouvre le Sac depuis les Raccourcis pour voir tes objets.',
      how: () => t('tutorial_step_bag_how'),
      actionLabel: t('tutorial_step_bag_action'),
      actionCall: 'openFullscreenPanel',
      actionArgs: "'inventory'",
      items: { pokeball: 5 },
      done: () => !!ensureTutorialState().completed.open_bag,
      rewardText: t('tutorial_step_bag_reward'),
    },
    {
      id: 'open_pokedex',
      title: t('tutorial_step_dex_title') || 'Consulter le Pokédex',
      desc: t('tutorial_step_dex_desc') || 'Ouvre le Pokédex et clique sur un Pokémon déjà vu.',
      how: () => t('tutorial_step_dex_how'),
      actionLabel: t('tutorial_step_dex_action'),
      actionCall: 'openFullscreenPanel',
      actionArgs: "'pokedex'",
      done: () => !!ensureTutorialState().completed.open_pokedex,
      money: 500,
      rewardText: t('tutorial_step_dex_reward'),
    },
    // ── Phase 4 · Donjons ────────────────────────────────────────────────────
    {
      id: 'dungeon_intro',
      title: t('tutorial_step_dungeon_title') || 'Les Jetons de donjon',
      desc:
        t('tutorial_step_dungeon_desc') ||
        'Chaque capture rapporte des Jetons de donjon : ils servent à explorer les donjons (⛰).',
      how: () =>
        t('tutorial_step_dungeon_how') ||
        "Capture un Pokémon pour gagner tes premiers jetons : la quête t'en offre 100 pour entrer dans la Forêt de Jade.",
      actionLabel: t('tutorial_step_dungeon_action'),
      actionCall: 'scrollToWin',
      actionArgs: "'win-currency'",
      done: () => !!(G.wallet && G.wallet.dungeonTokens >= 1),
      progress: () => ({ cur: G.wallet && G.wallet.dungeonTokens >= 1 ? 1 : 0, max: 1 }),
      jd: 100,
      rewardText: t('tutorial_step_dungeon_reward'),
    },
    {
      id: 'dungeon_clear',
      title: t('tutorial_step_dungeon2_title') || 'Explorer un donjon',
      desc:
        t('tutorial_step_dungeon2_desc') ||
        'Les donjons (⛰ sur la carte) se paient en Jetons de donjon. Explore la Forêt de Jade !',
      how: () =>
        t('tutorial_step_dungeon2_how') ||
        'Clique sur la Forêt de Jade puis sur « Explorer — [jetons] ».',
      actionLabel: t('tutorial_step_dungeon2_action'),
      actionCall: 'clickLocation',
      actionArgs: "'viridianforest'",
      targets: ['#win-tabs .pw-loc-dungeon-btn'], // V7-R1 #10
      done: () => (G.dungeonsExplored || 0) >= 1,
      progress: () => ({ cur: (G.dungeonsExplored || 0) >= 1 ? 1 : 0, max: 1 }),
      money: 300,
      rewardText: t('tutorial_step_dungeon2_reward'),
    },
    // ── Phase 5 · Progression ────────────────────────────────────────────────
  ];
}
let _tutorialUpdating = false;
function updateTutorialProgress() {
  if (_tutorialUpdating) return;
  _tutorialUpdating = true;
  let changed = false;
  try {
    const st = ensureTutorialState();
    for (const step of tutorialSteps()) {
      if (!st.completed[step.id] && step.done()) {
        st.completed[step.id] = true;
        changed = true;
      }
      if (st.completed[step.id]) tutorialGiveReward(step);
    }
    const allDone = tutorialSteps().every((step) => st.completed[step.id]);
    if (allDone && st.enabled) {
      st.enabled = false;
      changed = true;
    }
  } finally {
    _tutorialUpdating = false;
  }
  if (changed) {
    try {
      saveGame();
    } catch (_) {}
    // Re-render immédiat de la fenêtre Quêtes pour que la carte avance
    // (sans ça, la quête semble « ne pas se valider »).
    try {
      renderStoryWindow();
    } catch (_) {}
  }
}
function currentTutorialStep() {
  updateTutorialProgress();
  const st = ensureTutorialState();
  return tutorialSteps().find((step) => !st.completed[step.id]) || null;
}
/**
 * Tutorial quest card — classic adapter (model builders ONLY, rebuilt
 * from zero). The card shape belongs to the ECS design system
 * (ui/components/guide.js rendered by ui/views/GuidePanelView.js);
 * localization (t/tr) stays HERE.
 *
 * Returns null when the card must NOT render (tutorials disabled, or all
 * steps done — the auto-disable side effect is preserved).
 */
function tutorialQuestModel() {
  const st = ensureTutorialState();
  if (!st.enabled) return null;
  const steps = tutorialSteps();
  const doneCount = steps.filter((s) => st.completed[s.id]).length;
  const step = currentTutorialStep();
  if (!step) {
    st.enabled = false;
    try {
      saveGame();
    } catch (_) {}
    return null;
  }
  const idx = steps.findIndex((s) => s.id === step.id) + 1;
  // Progression de L'ÉTAPE COURANTE (comme les autres quêtes : 3/5…).
  let prog = null;
  if (typeof step.progress === 'function') {
    try {
      const p = step.progress();
      if (p && typeof p.max === 'number' && p.max > 0) {
        prog = { cur: Math.max(0, Math.min(p.max, Number(p.cur) || 0)), max: p.max };
      }
    } catch (_) {}
  }
  return {
    badge: tr('tutorial_step_lbl', { idx: idx, total: steps.length }),
    title: step.title,
    desc: step.desc,
    howLabel: t('tutorial_howto'),
    how: step.how(),
    progressText: prog ? tr('tutorial_step_progress_lbl', { cur: prog.cur, max: prog.max }) : '',
    pct: prog
      ? Math.round((prog.cur / prog.max) * 100)
      : Math.round((doneCount / steps.length) * 100),
    actions: [
      ...(step.actionCall
        ? [
            {
              label: step.actionLabel || t('tutorial_do_btn'),
              call: step.actionCall,
              callArgs: step.actionArgs || '',
              primary: true,
            },
          ]
        : []),
      { label: t('guide_title') || 'Guide', call: 'openFullscreenPanel', callArgs: "'guide'" },
      { label: t('tutorial_disable_all') || 'Désactiver', call: 'tutorialDisable', callArgs: '' },
    ],
  };
}
function renderTutorialQuestBlock() {
  const model = tutorialQuestModel();
  // V7-R1 #10 — la cible de l'étape courante clignote dès le prochain tick
  // (la carte Quêtes vient d'être (re)construite : l'étape a pu changer).
  try {
    setTimeout(applyTutorialHighlight, 0);
  } catch (_) {}
  if (!model) return '';
  // Rebuilt display: the ECS design system owns the card tree.
  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (!views || !views.TutorialCardView)
    throw new Error('[ui] PokeUI views not loaded (TutorialCardView)');
  return views.TutorialCardView.cardHTML(model);
}
function showTutorialTip(_id, _title, _body) {
  return;
}

function setGuideSection(section) {
  _guideSection = section || null;
  const el = document.getElementById('fs-panel-content');
  if (el) renderGuidePanel(el);
}
/**
 * Guide panel model — localized HERE (classic adapter). Same unlock
 * filtering as before: locked features never leak a dead card.
 */
/** PASSE 38c — la rubrique Donjon du guide devient visible dès que le joueur
 *  a la quête du PREMIER donjon (Forêt de Jade, débloquée au tout début de
 *  l'aventure) : dès qu'un donjon est déverrouillé sur la carte, la page est
 *  là. */
function dungeonGuideUnlocked() {
  try {
    const G = globalThis.G;
    if (!G || !G.unlockedLocs) return false;
    for (const id in G.unlockedLocs) {
      if (!G.unlockedLocs[id]) continue;
      try {
        const loc = typeof getLocObj === 'function' ? getLocObj(id) : null;
        if (loc && loc.type === 'dungeon') return true;
      } catch (_e) {}
    }
    return false;
  } catch (_e) {
    return false;
  }
}

function guidePanelModel() {
  const sections = guideSections();
  const unlockedSections = {};
  for (const [id, sec] of Object.entries(sections)) {
    if (id === 'dungeon' && !dungeonGuideUnlocked()) continue;
    if (id === 'mine' && typeof mineUnlocked === 'function' && !mineUnlocked()) continue;
    if (id === 'hatchery' && typeof hatcheryUnlocked === 'function' && !hatcheryUnlocked())
      continue;
    if (id === 'training' && typeof trainingUnlocked === 'function' && !trainingUnlocked())
      continue;
    // Atoll: visible only when the Atoll is genuinely unlocked (League won)
    if (
      id === 'atoll' &&
      !(typeof isAtollUnlocked === 'function'
        ? isAtollUnlocked()
        : G.badges && (G.badges.includes('elite4') || G.badges.includes('johto_elite4')))
    )
      continue;
    // Secret Bases: visible only after the Hoenn unlock (quest 216)
    if (
      id === 'base' &&
      !(typeof secretBaseUnlocked === 'function'
        ? secretBaseUnlocked()
        : !!(G && G.unlockedSecretBaseHoenn))
    )
      continue;
    if (
      id === 'automation' &&
      typeof hatcheryUnlocked === 'function' &&
      typeof trainingUnlocked === 'function' &&
      typeof mineUnlocked === 'function' &&
      !hatcheryUnlocked() &&
      !trainingUnlocked() &&
      !mineUnlocked()
    )
      continue;
    unlockedSections[id] = sec;
  }
  if (_guideSection && unlockedSections[_guideSection]) {
    const sec = unlockedSections[_guideSection];
    return {
      mode: 'detail',
      iconHtml: sec.icon || '',
      title: sec.title,
      sub: typeof t === 'function' ? t('guide_detail') : 'Detailed guide',
      backLabel: typeof t === 'function' ? t('back') : '← Back',
      pages: (sec.pages || []).map(([title, text]) => ({ title, text })),
    };
  }
  return {
    mode: 'home',
    title: t('guide_title') || 'Guide',
    sub: t('guide_intro') || 'Choisis une rubrique pour tout savoir.',
    actions: [
      { label: t('tutorial_enable') || 'Activer tutos', call: 'tutorialEnable', callArgs: '' },
      {
        label: t('tutorial_disable_all') || 'Désactiver tutos',
        call: 'tutorialDisable',
        callArgs: '',
      },
    ],
    cards: Object.entries(unlockedSections).map(([id, sec]) => ({
      id,
      iconHtml: sec.icon || '',
      title: sec.title,
      meta: tr('guide_pages_info', { count: (sec.pages || []).length }),
    })),
  };
}
function renderGuidePanel(el) {
  // Rebuilt display: the ECS design system owns the panel tree.
  const views =
    typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views
      ? window.PokeUI.views
      : null;
  if (!views || !views.GuidePanelView)
    throw new Error('[ui] PokeUI views not loaded (GuidePanelView)');
  _pwSetHtmlSafe(el, views.GuidePanelView.panelHTML(guidePanelModel()));
}
function installTutorialHooks() {
  const wrap = (name, cb) => {
    const fn = window[name];
    if (typeof fn !== 'function' || fn.__tutorialWrapped) return false;
    const nw = function (...args) {
      const res = fn.apply(this, args);
      try {
        cb(args, res);
      } catch (_e) {}
      return res;
    };
    nw.__tutorialWrapped = true;
    window[name] = nw;
    return true;
  };
  wrap('pickStarter', () => {
    try {
      renderStoryWindow();
    } catch (_) {}
  });
  wrap('openFullscreenPanel', ([panel]) => {
    if (panel === 'inventory') tutorialMark('open_bag');
    if (panel === 'pokedex') tutorialMark('open_pokedex');
  });
  wrap('openPokeModal', () => {
    tutorialMark('open_poke_sheet');
  });
  wrap('openBoxPokeModal', () => {
    tutorialMark('open_poke_sheet');
  });
  wrap('exploreArea', () => {
    updateTutorialProgress();
  });
  wrap('renderMap', () => {
    updateTutorialProgress();
  });
  wrap('pickBallForFilter', () => {
    updateTutorialProgress();
  }); // tuto : poser la Poké Ball
  wrap('scrollToWin', ([winId]) => {
    if (winId === 'win-pokeballs') tutorialMark('honor_ball_intro');
  });
  // V7-R1 #10 — balayage périodique de la surbrillance (survit aux re-rendus).
  installTutorialHighlight();
}
setTimeout(installTutorialHooks, 500);

if (typeof window !== 'undefined') {
  window.ensureTutorialState = ensureTutorialState;
  window.tutorialDisable = tutorialDisable;
  window.tutorialEnable = tutorialEnable;
  window.tutorialDismissTip = tutorialDismissTip;
  window.closeTutorialTip = closeTutorialTip;
  window.tutorialMark = tutorialMark;
  if (typeof globalThis !== 'undefined') globalThis.tutorialMark = tutorialMark;
  window.renderTutorialQuestBlock = renderTutorialQuestBlock;
  window.renderGuidePanel = renderGuidePanel;
  window.setGuideSection = setGuideSection;
  window.showTutorialTip = showTutorialTip;
  window.installTutorialHooks = installTutorialHooks;
}

// --- Exported globals ---
if (typeof currentTutorialStep !== 'undefined') {
  if (typeof window !== 'undefined') window.currentTutorialStep = currentTutorialStep;
  if (typeof globalThis !== 'undefined') globalThis.currentTutorialStep = currentTutorialStep;
}
if (typeof guideSections !== 'undefined') {
  if (typeof window !== 'undefined') window.guideSections = guideSections;
  if (typeof globalThis !== 'undefined') globalThis.guideSections = guideSections;
}
if (typeof tutorialDeviceHint !== 'undefined') {
  if (typeof window !== 'undefined') window.tutorialDeviceHint = tutorialDeviceHint;
  if (typeof globalThis !== 'undefined') globalThis.tutorialDeviceHint = tutorialDeviceHint;
}
if (typeof tutorialGiveReward !== 'undefined') {
  if (typeof window !== 'undefined') window.tutorialGiveReward = tutorialGiveReward;
  if (typeof globalThis !== 'undefined') globalThis.tutorialGiveReward = tutorialGiveReward;
}
if (typeof tutorialIsEnabled !== 'undefined') {
  if (typeof window !== 'undefined') window.tutorialIsEnabled = tutorialIsEnabled;
  if (typeof globalThis !== 'undefined') globalThis.tutorialIsEnabled = tutorialIsEnabled;
}
if (typeof tutorialRewardAlreadyPaid !== 'undefined') {
  if (typeof window !== 'undefined') window.tutorialRewardAlreadyPaid = tutorialRewardAlreadyPaid;
  if (typeof globalThis !== 'undefined')
    globalThis.tutorialRewardAlreadyPaid = tutorialRewardAlreadyPaid;
}
if (typeof tutorialSteps !== 'undefined') {
  if (typeof window !== 'undefined') window.tutorialSteps = tutorialSteps;
  if (typeof globalThis !== 'undefined') globalThis.tutorialSteps = tutorialSteps;
}
if (typeof updateTutorialProgress !== 'undefined') {
  if (typeof window !== 'undefined') window.updateTutorialProgress = updateTutorialProgress;
  if (typeof globalThis !== 'undefined') globalThis.updateTutorialProgress = updateTutorialProgress;
}
if (typeof guidePanelModel !== 'undefined') {
  if (typeof window !== 'undefined') window.guidePanelModel = guidePanelModel;
  if (typeof globalThis !== 'undefined') globalThis.guidePanelModel = guidePanelModel;
}
if (typeof dungeonGuideUnlocked !== 'undefined') {
  if (typeof window !== 'undefined') window.dungeonGuideUnlocked = dungeonGuideUnlocked;
  if (typeof globalThis !== 'undefined') globalThis.dungeonGuideUnlocked = dungeonGuideUnlocked;
}
if (typeof tutorialQuestModel !== 'undefined') {
  if (typeof window !== 'undefined') window.tutorialQuestModel = tutorialQuestModel;
  if (typeof globalThis !== 'undefined') globalThis.tutorialQuestModel = tutorialQuestModel;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  currentTutorialStep,
  guideSections,
  tutorialDeviceHint,
  tutorialGiveReward,
  tutorialIsEnabled,
  tutorialRewardAlreadyPaid,
  tutorialSteps,
  updateTutorialProgress,
  guidePanelModel,
  dungeonGuideUnlocked,
  tutorialQuestModel,
};
