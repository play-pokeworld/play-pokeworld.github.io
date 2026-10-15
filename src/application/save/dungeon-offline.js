// V7-R2 — LE DONJON COMPTE DANS LE RATTRAPAGE HORS-LIGNE (AFK).
//
// Retour joueur : « Donjon pas compris dans le AFK ». Jusqu'ici le moteur
// hors-ligne (src/application/save/offline-engine.js) ne connaissait que
// trois étapes — chaîne sauvage, entraînement, mine. Une expédition de donjon
// en cours était simplement IGNORÉE : la carte étant verrouillée pendant
// l'expédition, l'étape « combats sauvages » ne trouvait « aucune zone à
// simuler » et le joueur retrouvait son plateau exactement comme il l'avait
// laissé, même après des heures d'absence.
//
// Ce module enregistre une étape « dungeon » qui REJOUE l'expédition avec le
// vrai moteur (aucun estimateur parallèle, règle Melvor de la phase 28) :
//   · un combat en cours est joué jusqu'à son terme par la boucle accélérée
//     partagée (offlineRunBattleFfLoop : mêmes ticks, mêmes K.O., mêmes
//     captures, mêmes errants — D24) ;
//   · hors combat, c'est le PILOTE du plateau qui joue (_dgAutoStep : la
//     mission du mode choisi, puis le gardien, puis l'échelle) ; sans pilote
//     réglé, l'expédition avance en mode « plateau » (farm) — l'AFK fait ce que
//     le joueur ferait, le déverrouillage du pilote en direct reste inchangé ;
//   · chaque pas du pilote coûte un temps simulé fixe (les relances différées
//     du jeu en direct), le budget d'absence est donc consommé honnêtement ;
//   · l'étape s'arrête quand l'expédition se termine (gardien vaincu → sac
//     encaissé ; équipe K.O. → dungeonOnWipe), quand le budget est épuisé
//     (le combat en cours reprend alors à l'écran) ou si le pilote cale.
//
// Fichier séparé de dungeon-run.js et offline-engine.js (tous deux au plafond
// du budget de taille), rangé à côté du moteur hors-ligne (même chunk, importé
// juste après lui dans main.js) ; tout passe par la surface globale (règle
// DBT-04 : aucun import statique vers le monde, l'i18n ou l'UI).

const DUNGEON_OFFLINE_STEP_MS = 600; // coût simulé d'un pas du pilote (relances live 350–650 ms)
const DUNGEON_OFFLINE_MAX_STEPS = 6000; // garde-fou anti-boucle (12 h ≈ 72 000 pas théoriques)
// V7-R3 · D30 — relance auto des donjons : expéditions enchaînées pendant
// l'absence (péage prélevé à chaque départ) ; coût simulé du compte à rebours
// de relance (AUTO_DG_DELAY_MS en direct) et plafond d'expéditions par rattrapage.
const DUNGEON_OFFLINE_RELAUNCH_MS = 5000;
const DUNGEON_OFFLINE_MAX_RUNS = 400;

function _dgoCall(name, ...args) {
  try {
    const fn = typeof globalThis !== 'undefined' ? globalThis[name] : null;
    if (typeof fn === 'function') return fn(...args);
  } catch (e) {
    console.error('[dungeon-offline] ' + name, e);
  }
  return undefined;
}
function _dgoT(key, params) {
  const r = _dgoCall('tr', key, params || {});
  return typeof r === 'string' ? r : key;
}
function _dgoRun() {
  return _dgoCall('currentDungeonRun') || null;
}
function _dgoAlive() {
  const n = _dgoCall('aliveCount');
  return typeof n === 'number' ? n : 1;
}
function _dgoWalletTokens() {
  const w = _dgoCall('ensureWallet');
  return w ? Number(w.dungeonTokens || 0) : 0;
}
/** V7-R3 · D30 — la relance auto des donjons est achetée, activée et possible ici. */
function _dgoRelaunchAllowed() {
  if (!_dgoCall('isAutoDungeonRelaunchEnabled')) return false;
  const G = typeof globalThis !== 'undefined' ? globalThis.G : null;
  const chk = _dgoCall('autoDungeonRelaunchCheck', G && G.location, { offline: true });
  return !!(chk && chk.ok);
}
function _dgoMapUsable(run) {
  return !!(run && run.map && run.map.grid && run.map.tiles && run.map.tiles[run.pos]);
}
/** Signature d'état minimale : si un pas du pilote ne change rien, il cale. */
function _dgoSignature(run, b) {
  const tiles = Object.values((run.map && run.map.tiles) || {});
  let done = 0;
  let revealed = 0;
  for (const t of tiles) {
    if (t.done) done++;
    if (t.revealed) revealed++;
  }
  return [run.floor, run.pos, run.pendingNode || '', done, revealed, b && b.active ? 1 : 0].join(
    '|'
  );
}
/** Compteurs exacts : on enveloppe les crochets globaux appelés par le moteur
 *  de combat (battle-status / battle-encounter les résolvent via la surface
 *  globale à chaque appel). Restaurés quoi qu'il arrive. */
function _dgoWrapHooks(counter) {
  const g = globalThis;
  const saved = {};
  const wrap = (name, onCall) => {
    const fn = g[name];
    if (typeof fn !== 'function') return;
    saved[name] = fn;
    g[name] = function () {
      const out = fn.apply(this, arguments);
      try {
        onCall(out);
      } catch (_) {}
      return out;
    };
  };
  wrap('dungeonOnWin', (out) => {
    if (out) counter.wins++;
  });
  wrap('dungeonOnBossDefeated', (out) => {
    if (out) {
      counter.cleared = true;
      counter.clears++;
    }
  });
  wrap('dungeonOnWipe', (out) => {
    if (out) {
      counter.wiped = true;
      counter.wipes++;
    }
  });
  return function restore() {
    for (const name of Object.keys(saved)) {
      try {
        g[name] = saved[name];
      } catch (_) {}
    }
  };
}
/** Après le rattrapage (PW_FF levé) : redessiner le plateau et rendre la main
 *  au pilote du joueur s'il était réglé et qu'aucun combat n'a repris. */
function _dgoAfterFastForward() {
  if (typeof globalThis.setTimeout !== 'function') return;
  let tries = 0;
  const kick = () => {
    if (globalThis.PW_FF === true && tries++ < 200) return void setTimeout(kick, 100);
    try {
      _dgoCall('refreshDungeonPanel');
      const run = _dgoRun();
      const b = globalThis.battle;
      if (run && run.auto && !(b && b.active) && _dgoAlive() > 0) _dgoCall('_dgAutoStep');
    } catch (_) {}
  };
  setTimeout(kick, 50);
}

/**
 * Étape « dungeon » du moteur hors-ligne. Reçoit le budget en SECONDES et rend
 * le bilan lu par offlineSimulate / showAfkResultPanel :
 * { fights, floors, floor, depth, cleared, wiped, pilot, mode, tokens, secondsUsed, steps }.
 */
async function offlineFastForwardDungeon(secondsBudget) {
  const res = {
    fights: 0,
    floors: 0,
    floor: 0,
    depth: 0,
    cleared: false,
    wiped: false,
    pilot: false,
    mode: null,
    tokens: 0,
    secondsUsed: 0,
    steps: 0,
    runs: 0, // V7-R3 · D30 — expéditions démarrées par la relance auto pendant l'absence
    clears: 0,
    wipes: 0,
  };
  const G = typeof globalThis !== 'undefined' ? globalThis.G : null;
  const b = typeof globalThis !== 'undefined' ? globalThis.battle : null;
  let run0 = _dgoRun();
  // V7-R3 · D30 — pas d'expédition en cours mais la relance auto est réglée et
  // le joueur est resté dans le donjon : la première expédition de l'absence
  // démarre ici (péage prélevé), comme le compte à rebours l'aurait fait.
  if (G && b && !run0 && _dgoRelaunchAllowed() && !b.active) {
    if (_dgoCall('startAutoDungeonRun', G.location, { offline: true })) {
      run0 = _dgoRun();
      res.runs++;
    }
  }
  if (!G || !b || !run0 || !_dgoMapUsable(run0) || run0.loc !== G.location) return res;
  // Un combat « borné » (arène, dresseur de quête…) n'est jamais un combat de
  // donjon : l'étape des combats sauvages le termine, on ne touche à rien.
  if (b.active && (b.isChamp || b.isTraining || b.isQuestTrainerBattle)) return res;
  if (typeof globalThis.offlineRunBattleFfLoop !== 'function') return res;

  const budgetMs = Math.max(0, (Number(secondsBudget) || 0) * 1000);
  const startFloor = Number(run0.floor) || 1;
  res.depth = Number(run0.depth) || 1;
  res.floor = startFloor;
  res.pilot = !!run0.auto;
  res.mode = run0.auto || 'farm';
  const tokensBefore = _dgoWalletTokens() + Number((run0.bag && run0.bag.tokens) || 0);
  const forcedAuto = !run0.auto;
  if (forcedAuto) run0.auto = res.mode; // pilote d'absence, retiré à la fin
  const counter = { wins: 0, cleared: false, wiped: false, clears: 0, wipes: 0 };
  const restoreHooks = _dgoWrapHooks(counter);
  let simMs = 0;
  let steps = 0;
  let lastFloor = startFloor;
  const label = () =>
    _dgoCall(
      'offlineSetStageLabel',
      _dgoT('offline_stage_dungeon_progress', {
        floor: String(lastFloor),
        fights: String(counter.wins + (counter.cleared ? 1 : 0)),
      })
    );
  try {
    await _dgoCall('offlineDrainStuckLiveKOs');
    while (simMs < budgetMs && steps < DUNGEON_OFFLINE_MAX_STEPS) {
      let run = _dgoRun();
      if (!run && !b.active && _dgoRelaunchAllowed() && res.runs < DUNGEON_OFFLINE_MAX_RUNS) {
        // V7-R3 · D30 — expédition soldée : la relance auto en démarre une
        // autre (coût simulé du compte à rebours, péage prélevé, même mode).
        simMs += DUNGEON_OFFLINE_RELAUNCH_MS;
        if (simMs >= budgetMs) break;
        if (!_dgoCall('startAutoDungeonRun', G.location, { offline: true })) break;
        res.runs++;
        run = _dgoRun();
        if (run && !run.auto) run.auto = res.mode; // pilote d'absence (D26)
      }
      if (!run || !_dgoMapUsable(run)) break; // expédition soldée (gardien / K.O.)
      lastFloor = Number(run.floor) || lastFloor;
      if (b.active) {
        // Combat de donjon en cours : joué jusqu'à endBattle (victoire → case
        // soldée / gardien → clôture ; défaite → dungeonOnWipe).
        _dgoCall('offlineStopWildBattleTimer');
        b._offlineSim = true;
        b.paused = false;
        if (
          b.playerPokeIdx == null ||
          !G.team[b.playerPokeIdx] ||
          G.team[b.playerPokeIdx].currentHP <= 0
        ) {
          const fa = _dgoCall('firstAlive');
          b.playerPokeIdx = typeof fa === 'number' ? fa : 0;
        }
        const loop = await globalThis.offlineRunBattleFfLoop(
          budgetMs - simMs,
          () => !b.active,
          label
        );
        simMs += loop && Number.isFinite(loop.simMs) ? loop.simMs : budgetMs;
        if (b.active) break; // budget épuisé en plein combat : il reprend à l'écran
        continue;
      }
      if (_dgoAlive() <= 0) break; // équipe à terre hors combat : la reprise live tranche
      // Hors combat : UN pas du pilote (ou la case engagée avant un rechargement).
      const before = _dgoSignature(run, b);
      steps++;
      simMs += DUNGEON_OFFLINE_STEP_MS;
      if (run.pendingNode) _dgoCall('dungeonMoveTo', run.pendingNode);
      else _dgoCall('_dgAutoStep', { offline: true });
      label();
      const after = _dgoRun();
      if (!after) continue; // la boucle constate la fin au tour suivant
      if (!b.active && _dgoSignature(after, b) === before) break; // le pilote cale
      if (steps % 50 === 0) await new Promise((r) => setTimeout(r, 0)); // laisser peindre la barre
    }
  } catch (e) {
    console.error('[dungeon-offline] fast-forward', e);
  } finally {
    restoreHooks();
    const runEnd = _dgoRun();
    if (forcedAuto && runEnd) runEnd.auto = null;
  }
  const runEnd = _dgoRun();
  res.cleared = counter.cleared;
  res.wiped = counter.wiped;
  res.clears = counter.clears;
  res.wipes = counter.wipes;
  res.fights = counter.wins + counter.clears;
  res.floor = runEnd ? Number(runEnd.floor) || lastFloor : res.cleared ? res.depth : lastFloor;
  res.floors = Math.max(0, res.floor - startFloor);
  res.tokens = Math.max(
    0,
    _dgoWalletTokens() +
      (runEnd ? Number((runEnd.bag && runEnd.bag.tokens) || 0) : 0) -
      tokensBefore
  );
  res.secondsUsed = Math.round(simMs / 1000);
  res.steps = steps;
  _dgoAfterFastForward();
  return res;
}

function installDungeonOfflineStage() {
  const eng = typeof globalThis !== 'undefined' ? globalThis.OfflineEngine : null;
  if (!eng || typeof eng.register !== 'function') return false;
  if (typeof eng.handler === 'function' && eng.handler('dungeon')) return true;
  eng.register('dungeon', async function (seconds) {
    return offlineFastForwardDungeon(seconds);
  });
  return true;
}
installDungeonOfflineStage();

const _dgoApi = {
  offlineFastForwardDungeon,
  installDungeonOfflineStage,
  DUNGEON_OFFLINE_STEP_MS,
  DUNGEON_OFFLINE_RELAUNCH_MS,
  DUNGEON_OFFLINE_MAX_RUNS,
};
if (typeof globalThis !== 'undefined') Object.assign(globalThis, _dgoApi);
if (typeof window !== 'undefined') Object.assign(window, _dgoApi);

export { offlineFastForwardDungeon, installDungeonOfflineStage, DUNGEON_OFFLINE_STEP_MS };
