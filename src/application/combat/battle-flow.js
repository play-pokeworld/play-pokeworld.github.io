// V7 · DBT-04 — dépendances explicites (ex-gardes typeof).
import { restoreAllTransformedPokemon } from './battle-attack.js';
import { pwLateLink } from '../../core/late-link.js';
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Phase 30: "is the player in the middle of a wild exploration chain?"
// EXACT condition under which the offline catch-up (OfflineEngine) replays
// the true battle loop on return (bounded, capped in time and steps).
// of explorer a route (chaine chill active), never if il was inactif or has
// the training. Persiste in G.wildSessionActive to the moment of the save.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
// V7 · DBT-05 — résolveur unique (core/late-link.js) ; alias résolus à l'appel.
function baseDialogNpcResult(...args) {
  const f = pwLateLink('baseDialogNpcResult');
  return f ? f(...args) : undefined;
}
function baseEditorCreditBattle(...args) {
  const f = pwLateLink('baseEditorCreditBattle');
  return f ? f(...args) : undefined;
}
function isWildChillChainActive() {
  if (typeof battle === 'undefined' || !battle || !battle.active || !battle.chill) return false;
  if (battle.isChamp || battle.isTraining || battle.isAtollBattle || battle.isQuestDefeatBattle)
    return false;
  if (battle.questRewardQuestId != null || battle.legendaryQuest || battle.questGift) return false; // V7 · LEG-01
  return true;
}

/**
 * V7-R1 · retours joueurs #5/#6 — soin COMPLET de l'équipe à la fin d'un
 * combat (hors expédition de donjon, où les PV persistent volontairement).
 *
 * Avant, l'équipe n'était soignée qu'au DÉBUT du combat suivant : après une
 * défaite, la fenêtre Équipe affichait des Pokémon K.O. et les joueurs
 * pensaient ne pas pouvoir relancer (« problème de visibilité »). Le soin est
 * gratuit dans les deux cas : seul le moment change, pas l'économie.
 *
 * @param {{silent?: boolean, unlessDungeon?: boolean}} [opts]
 *   `unlessDungeon` : ne rien faire si une expédition de donjon est active
 *   (rattrapage hors-ligne : le moteur en direct fait ce test dans endBattle()).
 * @returns {boolean} au moins un Pokémon a été soigné
 */
function restoreTeamAfterBattle(opts = {}) {
  let healed = false;
  try {
    if (typeof G === 'undefined' || !G || !Array.isArray(G.team)) return false;
    if (
      opts.unlessBattle &&
      typeof globalThis.battle !== 'undefined' &&
      globalThis.battle &&
      globalThis.battle.active
    ) {
      return false;
    }
    if (opts.unlessDungeon && typeof globalThis.currentDungeonRun === 'function') {
      const run = globalThis.currentDungeonRun();
      if (run && run.active) return false;
    }
    for (const p of G.team) {
      if (!p) continue;
      if (Number(p.currentHP) < Number(p.maxHP) || p.status || p.statusTurns) {
        p.currentHP = p.maxHP;
        p.status = null;
        p.statusTurns = 0;
        healed = true;
      }
    }
  } catch (_) {
    return false;
  }
  if (healed && !opts.silent) {
    try {
      addBattleLog(t('team_healed_after_battle'));
    } catch (_) {}
  }
  return healed;
}

function endBattle() {
  // V7-R2 · AUTO-01 — fin SUBIE d'une chaîne sauvage (équipe K.O.) : mémorisée
  // AVANT le soin R1-06 ; la relance automatique est armée tout en bas.
  let _arDefeat = false;
  try {
    _arDefeat =
      isWildChillChainActive() &&
      typeof G !== 'undefined' &&
      !!G &&
      Array.isArray(G.team) &&
      !G.team.some((p) => p && Number(p.currentHP) > 0);
  } catch (_) {}
  restoreAllTransformedPokemon();
  // PASSE 38e — DONJON : pas de soin automatique (naturalcure / régénérateur)
  // entre deux combats : les PV persistent pendant toute l'expédition. Ce
  // drapeau sert aussi plus bas (écran de repos, résumé, relance).
  let _dgRunActive = false;
  try {
    const _run =
      typeof globalThis.currentDungeonRun === 'function' ? globalThis.currentDungeonRun() : null;
    _dgRunActive = !!(_run && _run.active);
  } catch (_) {}
  try {
    if (typeof G !== 'undefined' && G && Array.isArray(G.team)) {
      G.team.forEach((p) => {
        if (!p || p.currentHP <= 0) return;
        if (_dgRunActive) return;
        const hasTal = (t) =>
          typeof globalThis.hasTalent === 'function' ? globalThis.hasTalent(p, t) : p.talent === t;
        if (hasTal('naturalcure') && p.status) {
          p.status = null;
          p.statusTurns = 0;
        }
        if (hasTal('regenerator') && p.currentHP < p.maxHP) {
          const heal = Math.max(1, Math.floor(p.maxHP * 0.25));
          p.currentHP = Math.min(p.maxHP, p.currentHP + heal);
        }
      });
    }
  } catch (_) {}
  // V7-R1 · #6 — hors donjon, l'équipe sort TOUJOURS soignée d'un combat.
  // Pas pendant le rattrapage hors-ligne (PW_FF) : le moteur AFK lit l'état
  // K.O. pour son récapitulatif et soigne lui-même après le bilan.
  try {
    const _ff = typeof window !== 'undefined' && window.PW_FF === true;
    if (!_dgRunActive && !_ff) restoreTeamAfterBattle();
  } catch (_) {}
  clearInterval(battle.timerId);
  // PASSE 39 — l'argent gagné en combat compte comme du butin (le résumé
  // s'ouvre même pour un combat qui n'a rapporté que des pièces) et le
  // drapeau « gardien » ne survit jamais à la fin d'un combat (une victoire
  // de case ne peut pas transformer le combat suivant en boss).
  const hadLoot =
    !battle.isChamp &&
    !battle.isQuestTrainerBattle &&
    !battle.isBaseNpcBattle &&
    !battle.isQuestDefeatBattle &&
    ((battle.sessionCatches || []).length ||
      Object.keys(battle.sessionItems || {}).length ||
      Number(battle.sessionMoney || 0) > 0 ||
      battle.sessionWins ||
      0 ||
      battle.sessionPlayerKOs ||
      0);
  battle.pendingDungeonBoss = false;
  const wasAtollLoss = !!battle.isAtollBattle;
  const wasAtollBorrowedLoss = wasAtollLoss && !!battle.atollBorrowed;
  battle.active = false;
  // PASSE 33 — le bandeau se met à jour (bouton « reprendre » / disparition).
  try {
    if (pwLateLink('renderBattleDungeonBar')) renderBattleDungeonBar();
  } catch (_) {}
  try {
    if (typeof G !== 'undefined' && G) G.wildSessionActive = false;
  } catch (_) {} // phase 30 : chaine sauvage terminee → more of rattrapage offline
  battle.paused = false;
  battle.resolvingKO = false;
  battle.legendaryQuest = false; // V7 · LEG-01 (ex-legendaryCatch)
  battle.questGift = false;
  battle.isTraining = false;
  battle.trainee = null;
  battle.noAutoCatch = false;
  battle.questDefeatLoc = null;
  battle.isQuestDefeatBattle = false;
  if (wasAtollLoss && G && G.atoll) {
    G.atoll.streak = 0;
    try {
      if (pwLateLink('restoreAtollTeam')) restoreAtollTeam();
      notify(t('atoll_streak_lost'), 'var(--red)');
    } catch (_) {}
  }
  if (wasAtollLoss) battle.atollBorrowed = false;
  if (wasAtollBorrowedLoss && pwLateLink('abandonAtollFactoryRun')) {
    try {
      abandonAtollFactoryRun(battle.atollMode || null);
      notify(t('atoll_factory_run_ended'), 'var(--red)');
    } catch (_) {}
  } // defaite Usine : serie pretee terminee (phase 22)
  battle.isAtollBattle = false;
  battle.atollReward = 0;
  battle.atollRank = null;
  battle.atollMode = null;
  battle.isBaseNpcBattle = false;
  battle.baseNpcName = null;
  battle.baseNpcMsgs = null;
  battle.baseNpcRef = null;
  battle.baseNpcSprite = null;
  battle.questRewardQuestId = null;
  battle.questRewardCat = null;
  battle.questRewardRegion = null;
  battle.questRewardDefId = null;
  battle.trainerVisual = null;
  battle.enemyPoke = null;
  battle.champTeam = null;
  const idleScreen = document.getElementById('battle-idle-screen');
  const activeScene = document.getElementById('battle-active-scene');
  // PASSE 34 — tant qu'une expédition est EN COURS, la fin d'un combat ne
  // ramène pas « Exploration au repos » : le joueur est entre deux paliers, le
  // bandeau d'expédition doit rester à l'écran avec le bouton « Combattre ».
  // L'écran de repos revient quand le run se termine (remontée, abandon, wipe).
  // (_dgRunActive est déjà calculé en tête de fonction pour le garde-fou
  // « pas de soin en donjon ».)
  if (idleScreen) idleScreen.style.display = _dgRunActive ? 'none' : 'flex';
  // V7-R3 — bandeaux de relance auto (combat / donjon) à jour sur l'écran de repos.
  if (!_dgRunActive && globalThis.renderAutoRelaunchBar) globalThis.renderAutoRelaunchBar();
  if (activeScene) {
    activeScene.style.display = 'none';
    activeScene.classList.remove('is-live');
  } // wave 17 (DS2817)
  try {
    if (_dgRunActive && typeof globalThis.refreshDungeonPanel === 'function')
      globalThis.refreshDungeonPanel();
  } catch (_) {}
  renderTeamWindow();
  try {
    renderMap();
  } catch (_) {}
  // PASSE 34 — en pleine expédition, le combat est arrêté volontairement à
  // chaque palier : ouvrir le résumé de session à ce moment-là faisait surgir
  // une fenêtre modale entre deux paliers (« la fenêtre de fin de combat
  // s'ouvre »). Le butin d'expédition est déjà suivi par le bandeau dédié ;
  // le résumé reste disponible manuellement et à la fin réelle du run.
  if (hadLoot && !_dgRunActive) openBattleSummary(true);
  try {
    if (pwLateLink('renderTrainingBattlePanel')) renderTrainingBattlePanel();
  } catch (_) {}
  // PASSE 35 — « si le quota n'est pas atteint, le combat se relance
  // automatiquement ; sinon, rien. » La relance est portée par le moteur
  // d'expédition, qui sait distinguer une fin de combat subie (on enchaîne)
  // d'une sortie volontaire (on ne relance surtout pas).
  try {
    if (_dgRunActive && typeof globalThis._dgAutoResume === 'function') globalThis._dgAutoResume();
  } catch (_) {}
  // V7-R2 · AUTO-01 — défaite d'une chaîne sauvage hors donjon : compte à
  // rebours de relance (ne fait rien si l'amélioration n'est pas achetée /
  // désactivée, pendant le rattrapage hors-ligne ou sans table sauvage).
  try {
    if (_arDefeat && !_dgRunActive && typeof globalThis.scheduleAutoRelaunch === 'function')
      globalThis.scheduleAutoRelaunch();
  } catch (_) {}
  if (globalThis.pwEmit) globalThis.pwEmit('battle:end', { defeat: _arDefeat }); // V7-R2 · SND-02/03
}

function restartLastBattle() {
  closeBattleSummary();
  if (battle.lastIsChamp && battle.lastChampId) {
    startChampBattle(battle.lastChampId);
  } else {
    exploreArea();
  }
}

async function doLeaveBattle() {
  if (!battle.active) return;
  battle.paused = true;
  // PASSE 35 — EN EXPÉDITION, « QUITTER » ABANDONNE LE DONJON.
  // Retour joueur : « on ne doit pas pouvoir quitter le combat puis le
  // reprendre » et « le quitter en bas du combat fait comme le remonter et
  // encaisser, ce n'est pas ce qu'il doit faire ».
  // Quitter n'est donc ni une fuite (qui laissait l'expédition en suspens avec
  // un bouton de reprise), ni un encaissement : c'est une sortie sèche, le sac
  // reste dans le donjon. Pour repartir avec le butin, il y a « Remonter et
  // encaisser » dans le bandeau.
  try {
    const _dgFn = globalThis.currentDungeonRun;
    const _run = typeof _dgFn === 'function' ? _dgFn() : null;
    if (_run && _run.active && typeof globalThis.dungeonQuitFromBattle === 'function') {
      await wait(200);
      globalThis.dungeonQuitFromBattle();
      return;
    }
  } catch (_) {}
  if (battle.isBaseNpcBattle) {
    // Phase 38 — legacy feature update
    const npcName = battle.baseNpcName || '';
    const winQuote = (battle.baseNpcMsgs && battle.baseNpcMsgs.win) || '';
    if (typeof pwLateLink('baseEditorCreditBattle') === 'function') baseEditorCreditBattle(false);
    // Phase 52: battle-end panel (a flee/forfeit = visitor defeat).
    const npcRef = battle.baseNpcRef || null;
    const npcSprite = battle.baseNpcSprite || null;
    battle.isBaseNpcBattle = false;
    battle.baseNpcName = null;
    battle.baseNpcMsgs = null;
    battle.baseNpcRef = null;
    battle.baseNpcSprite = null;
    if (winQuote && pwLateLink('addBattleLog')) addBattleLog('« ' + winQuote + ' » — ' + npcName);
    notify(tr('base.edit.battle_lost', { name: npcName }), 'var(--red)');
    if (typeof pwLateLink('baseDialogNpcResult') === 'function') {
      setTimeout(() => {
        try {
          baseDialogNpcResult({
            npc: npcRef,
            won: false,
            name: npcName,
            sprite: npcSprite,
            quote: winQuote,
          });
        } catch (_) {}
      }, 900);
    }
    await wait(300);
    endBattle();
    return;
  }
  if (battle.isChamp) {
    const cName = getChampName(battle.champId);
    notify(tr('forfeit_champion', { champion: cName }), 'var(--blue)');
  } else {
    notify(t('leave_battle_notify'), 'var(--blue)');
  }
  await wait(300);
  endBattle();
}

function leaveBattle() {
  if (!battle.active) return;
  if (battle.paused) {
    battle.pendingLeave = true;
    const btn = document.getElementById('leave-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('leaving_button');
    }
    return;
  }
  doLeaveBattle();
}

function resumeBattleActions() {
  if (battle.pendingLeave) {
    battle.pendingLeave = false;
    doLeaveBattle();
    return;
  }
  if (battle.pendingSwitchIdx != null) {
    const idx = battle.pendingSwitchIdx;
    battle.pendingSwitchIdx = null;
    const p = G.team[idx];
    battle.paused = false;
    if (p && p.currentHP > 0 && idx !== battle.playerPokeIdx) doSwitchBattlePoke(idx);
    return;
  }
  battle.paused = false;
}

// Shared async wait service (engine timer abstraction). globalThis-backed so
// concatenated VM harnesses, the offline engine's instant-wait patch and the
// classic boot all see ONE binding.
if (typeof globalThis !== 'undefined' && typeof globalThis.wait !== 'function') {
  globalThis.wait = (ms) => new Promise((r) => setTimeout(r, ms));
}

// --- Migrated to ES module, globals exposed ---
if (typeof restoreTeamAfterBattle !== 'undefined') {
  if (typeof window !== 'undefined') window.restoreTeamAfterBattle = restoreTeamAfterBattle;
  if (typeof globalThis !== 'undefined') globalThis.restoreTeamAfterBattle = restoreTeamAfterBattle;
}
if (typeof endBattle !== 'undefined') {
  if (typeof window !== 'undefined') window.endBattle = endBattle;
  if (typeof globalThis !== 'undefined') globalThis.endBattle = endBattle;
}
if (typeof isWildChillChainActive !== 'undefined') {
  if (typeof window !== 'undefined') window.isWildChillChainActive = isWildChillChainActive;
  if (typeof globalThis !== 'undefined') globalThis.isWildChillChainActive = isWildChillChainActive;
}
if (typeof restartLastBattle !== 'undefined') {
  if (typeof window !== 'undefined') window.restartLastBattle = restartLastBattle;
  if (typeof globalThis !== 'undefined') globalThis.restartLastBattle = restartLastBattle;
}
if (typeof leaveBattle !== 'undefined') {
  if (typeof window !== 'undefined') window.leaveBattle = leaveBattle;
  if (typeof globalThis !== 'undefined') globalThis.leaveBattle = leaveBattle;
}
// FIX (2026-08): doLeaveBattle is guard-called from map-render.js — exposure required.
if (typeof doLeaveBattle !== 'undefined') {
  if (typeof window !== 'undefined') window.doLeaveBattle = doLeaveBattle;
  if (typeof globalThis !== 'undefined') globalThis.doLeaveBattle = doLeaveBattle;
}
if (typeof resumeBattleActions !== 'undefined') {
  if (typeof window !== 'undefined') window.resumeBattleActions = resumeBattleActions;
  if (typeof globalThis !== 'undefined') globalThis.resumeBattleActions = resumeBattleActions;
}
if (typeof wait !== 'undefined') {
  if (typeof window !== 'undefined') window.wait = wait;
  if (typeof globalThis !== 'undefined') globalThis.wait = wait;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  endBattle,
  restoreTeamAfterBattle,
  isWildChillChainActive,
  restartLastBattle,
  leaveBattle,
  doLeaveBattle,
  resumeBattleActions,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('doLeaveBattle', doLeaveBattle);
  } catch (_) {}
}
if (typeof PokeActions !== 'undefined' && PokeActions) {
  try {
    PokeActions.register('restartLastBattle', restartLastBattle);
  } catch (_) {}
}
