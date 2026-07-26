// offline-engine.js — Passe 28 : rattrapage hors-ligne par FAST-FORWARD du vrai moteur.
//
// Voie « Melvor » décidée avec l'utilisateur : une seule source de vérité.
// L'ancien estimateur de dégâts parallèle (estimateAfkMoveDamage…) est supprimé :
// le rattrapage rejoue la vraie boucle battleTick()/onEnemyFaint()/spawnNextWild()
// en accéléré, UI gelée. Chaque système temporel s'enregistre auprès de
// OfflineEngine.register(nom, handler(secondes, ctx)) et consomme un budget en
// SECONDES — plus aucun plafond caché par système (720 victoires / 120 ticks /
// 500 pas disparaissent). Futurs « objets saut de temps » : OfflineEngine.simulate(s)
// est l'API stable à appeler.
//
// Décisions d'équilibrage (utilisateur) : efficacité 100 %, plafond global 12 h.
// Détection par trou de heartbeat (>15 s quelle que soit la visibilité) :
// couvre veille OS, kill mobile, crash, onglet freezé. Verrou d'onglet anti
// double-rattrapage.

const OFFLINE_MIN_GAP_MS = 15000;               // trou de heartbeat minimal déclenchant un rattrapage
const OFFLINE_RECAP_MIN_MS = 60000;             // en dessous : notification discrète, pas de modale
const OFFLINE_MAX_MS = 12 * 60 * 60 * 1000;    // plafond global 12 h
const OFFLINE_FF_YIELD_TICKS = 400;             // rend la main (microtasks) tous les N ticks
const OFFLINE_FF_GUARD_TICKS = 600000;          // garde-fou anti boucle infinie (12 h @ vitesse x1 = 432 k ticks)
const OFFLINE_LOCK_STALE_MS = 10000;            // verrou d'onglet considéré expiré au-delà
const OFFLINE_PAINT_MS = 120;                   // passe 29 : cadence de rafraîchissement RÉELLE de la barre (sinon l'écran semble planté)

let offlineEngineApplying = false;
let offlineHandlersInstalled = false;
let offlineCatchupTimer = null;
let offlineLastHeartbeat = saveNow();
let offlineHiddenSince = null;
let offlineSuspendedByUs = false;
let _offlineLastSim = null;                     // promesse de la dernière simulation (tests/debug)
const OFFLINE_TAB_ID = 'tab-' + Math.random().toString(36).slice(2, 10) + '-' + saveNow().toString(36);

// ─── Persistance « dernier signe de vie » ────────────────────────────────────
function offlinePersistSeen(ts){
  try{
    if(typeof G !== 'undefined' && G){ if(!G.afk || typeof G.afk !== 'object') G.afk = {}; G.afk.lastSeenAt = ts; }
    storageSet(afkStorageKey(), JSON.stringify({ ts: ts }));
  }catch(_){ }
}
function offlineReadSeen(){
  let ts = 0;
  try{
    const raw = storageGet(afkStorageKey());
    if(raw){ const parsed = JSON.parse(raw); ts = Number(parsed && parsed.ts) || 0; }
  }catch(_){ }
  if(!ts && typeof G !== 'undefined' && G && G.afk) ts = Number(G.afk.lastSeenAt) || 0;
  return ts || null;
}

// ─── Verrou d'onglet (anti double-rattrapage) ────────────────────────────────
function offlineLockKey(){ return (typeof currentSaveId !== 'undefined' && currentSaveId) ? ('pokeworld_ff_lock_' + currentSaveId) : 'pokeworld_ff_lock'; }
function offlineAcquireLock(){
  try{
    const now = saveNow();
    const raw = storageGet(offlineLockKey());
    const lock = raw ? JSON.parse(raw) : null;
    if(lock && lock.tabId && lock.tabId !== OFFLINE_TAB_ID && (now - Number(lock.ts || 0)) < OFFLINE_LOCK_STALE_MS) return false;
    storageSet(offlineLockKey(), JSON.stringify({ tabId: OFFLINE_TAB_ID, ts: now }));
    return true;
  }catch(_){ return true; }
}

// ─── Suspension / reprise du combat pendant l'absence ───────────────────────
// Passe 32 : la suspension vaut pour TOUT combat actif (sauvage comme borné :
// dresseur/arène/ligue/atoll) — c'est le fast-forward qui le résout au retour.
function offlineSuspendBattle(){
  const b = (typeof battle !== 'undefined') ? battle : null;
  if(b && b.active && !b.paused && !b.isTraining){ b.paused = true; offlineSuspendedByUs = true; }
}
function offlineResumeBattle(){
  if(!offlineSuspendedByUs) return;
  offlineSuspendedByUs = false;
  const b = (typeof battle !== 'undefined') ? battle : null;
  if(b && b.active && !b.isTraining){
    b.paused = false;
    try{ updateBattleUI(); }catch(_){ }
    try{ renderMoveButtons(); renderEnemyMoveBars(); renderBattleTeamRow(); }catch(_){ }
  }
}

// ─── Détection : heartbeat + trou de temps ───────────────────────────────────
function offlineScheduleCatchup(reason){
  clearTimeout(offlineCatchupTimer);
  offlineCatchupTimer = setTimeout(() => { try{ offlinePollHeartbeat(); }catch(e){ console.error('[OfflineEngine]', e); } }, 120);
}
function offlinePollHeartbeat(){
  const now = saveNow();
  if(typeof window === 'undefined' || !window.PokeWorldGameStarted || offlineEngineApplying || typeof G === 'undefined' || !G || !hasStarterInState(G)){
    offlineLastHeartbeat = now;
    return;
  }
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if(hidden){
    if(!offlineHiddenSince){ offlineHiddenSince = now; offlineSuspendBattle(); offlinePersistSeen(now); }
    return; // pendant l'absence, le rattrapage se fera au retour (ou au boot si l'onglet meurt)
  }
  const memGap = Math.max(0, now - offlineLastHeartbeat);
  offlineLastHeartbeat = now;
  const storedTs = offlineReadSeen();
  const storedGap = storedTs ? Math.max(0, now - storedTs) : 0;
  const hiddenGap = offlineHiddenSince ? Math.max(0, now - offlineHiddenSince) : 0;
  offlineHiddenSince = null;
  if(!offlineAcquireLock()){ offlinePersistSeen(now); offlineResumeBattle(); return; } // un autre onglet pilote
  const gap = Math.min(Math.max(memGap, storedGap, hiddenGap), OFFLINE_MAX_MS);
  if(gap >= OFFLINE_MIN_GAP_MS){
    offlineSuspendedByUs = false; // le fast-forward gère lui-même la reprise de la chaîne
    _offlineLastSim = offlineSimulate(gap, 'return');
    return;
  }
  offlineResumeBattle();
  offlinePersistSeen(now);
}
function installOfflineHandlers(){
  if(offlineHandlersInstalled || typeof window === 'undefined' || typeof document === 'undefined') return;
  offlineHandlersInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if(document.visibilityState === 'hidden'){
      offlineHiddenSince = saveNow();
      offlineSuspendBattle();
      offlinePersistSeen(offlineHiddenSince);
    } else {
      offlineScheduleCatchup('visible');
    }
  });
  window.addEventListener('focus', () => offlineScheduleCatchup('focus'));
  window.addEventListener('pageshow', () => offlineScheduleCatchup('pageshow'));
  window.addEventListener('pagehide', () => { try{ offlinePersistSeen(saveNow()); }catch(_){ } });
  appTimer('offline-heartbeat', offlinePollHeartbeat, 2000);
}

// ─── Muting UI pendant le fast-forward ───────────────────────────────────────
// Les scripts sont chargés en mode classique : leurs fonctions top-level sont
// des propriétés de window → on les neutralise puis on restaure.
const OFFLINE_MUTED_FNS = [
  'updateMoveBars', 'updateBattleUI', 'renderMoveButtons', 'renderEnemyMoveBars',
  'renderBattleTeamRow', 'renderTeamWindow', 'updateHeader', 'renderMap',
  'refreshMapAndLoc', 'notify', 'setMsg', 'openBattleSummary', 'renderBattleLoot',
  'renderBattleSummary', 'renderHatcheryWindow', 'renderTrainingWindow',
  'renderTrainingBattlePanel', 'updateTrainingLiveProgress', 'renderMineWindow',
  'showTab', 'renderInventoryWindow', 'renderBoxWindow',
];
function offlineMuteUi(){
  const saved = {};
  for(const n of OFFLINE_MUTED_FNS){
    try{ if(typeof window[n] === 'function'){ saved[n] = window[n]; window[n] = function(){}; } }catch(_){ }
  }
  let savedWait = null;
  try{ if(typeof window.wait === 'function'){ savedWait = window.wait; window.wait = function(){ return Promise.resolve(); }; } }catch(_){ }
  try{ window.PW_FF = true; }catch(_){ }
  return function restore(){
    for(const n of Object.keys(saved)){ try{ window[n] = saved[n]; }catch(_){ } }
    if(savedWait){ try{ window.wait = savedWait; }catch(_){ } }
    try{ window.PW_FF = false; }catch(_){ }
  };
}

// ─── Fast-forward des combats sauvages (le cœur) ─────────────────────────────
function offlineCanWildBattle(loc){
  if(!loc || !loc.wild || !loc.wild.length) return false;
  if(!G.team || !G.team.length) return false;
  if(!G.team.some(p => p && p.currentHP > 0)) return false;
  if(typeof canUseCurrentTeamForRegion === 'function' && !canUseCurrentTeamForRegion(G.region || 'kanto')) return false;
  const b = (typeof battle !== 'undefined') ? battle : null;
  if(b && b.active){
    if(b.isChamp || b.isTraining || b.isAtollBattle || b.isQuestDefeatBattle || !b.chill) return false;
  }
  return true;
}
// Ouvre une session d'exploration SANS soigner l'équipe (contrairement à
// startBattle) : l'état au moment du départ est l'état de départ du rattrapage.
function offlineStartWildSession(loc){
  if((typeof aliveCount === 'function' ? aliveCount() : 0) <= 0) return false;
  const b = battle;
  b.active = true;
  b.isChamp = false; b.champId = null; b.lastIsChamp = false; b.lastChampId = null;
  b.isLeague = false; b.leagueRegion = null; b.leagueStage = null;
  b.champPokeIdx = 0;
  b.escaped = false; b.paused = false; b.chill = true;
  b.weather = 'none'; b.weatherTurns = 0; b.terrain = 'none'; b.terrainTurns = 0;
  b.speed = b.speed || 1;
  b.playerMods = { atk:1, def:1, spe:1 }; b.enemyMods = { atk:1, def:1, spe:1 };
  b.pMoveIdx = 0; b.eMoveIdx = 0;
  b.pendingLeave = false; b.pendingSwitchIdx = null; b.resolvingKO = false;
  b.trainerVisual = null;
  b.sessionWins = 0; b.sessionPlayerKOs = 0; b.sessionStartedAt = Date.now();
  b.sessionDamageByPokemon = {}; b.sessionCatches = []; b.sessionItems = {};
  b.playerPokeIdx = (typeof firstAlive === 'function') ? firstAlive() : 0;
  b.enemyPoke = null;
  try{ spawnNextWild(); }catch(e){ console.error('[OfflineEngine] spawnNextWild', e); }
  return !!(b.active && b.enemyPoke);
}
// ─── Passe 32 : fast-forward partagé par TOUS les combats ───────────────────
// Un combat « borné » = le combat en cours, sans enchaînement : dresseur de
// quête, boss de quête, arène, ligue, atoll, rencontre légendaire… (chill
// false). Le rattrapage le TERMINE honnêtement (même boucle battleTick), sans
// rien enchaîner après : un seul combat, arrêt au premier endBattle.
function offlineIsBoundedBattle(b){
  return !!(b && b.active && !b.isTraining && b.enemyPoke &&
    (b.isChamp || b.isQuestTrainerBattle || b.isQuestDefeatBattle ||
     b.questRewardQuestId != null || b.isAtollBattle || !b.chill));
}
// Résolution de K.O. FIGÉE EN LIVE (bug bêta n°1 du rapport) : si l'onglet a
// été gelé pile pendant le wait(500/700) d'onEnemyFaint/onPlayerPokeFaint, la
// chaîne de promesses n'avance plus (timers réels suspendus). Le FF tournait
// alors à vide : 0 victoire + « aucune zone sauvage active à simuler ». Ici on
// laisse les VRAIS timers rattraper la chaîne (ses waits suivants sont
// neutralisés → instantanés) jusqu'à la fin de la résolution.
async function offlineDrainStuckLiveKOs(maxMs = 4000){
  const b = (typeof battle !== 'undefined') ? battle : null;
  if(!b || !b.active || !b.resolvingKO) return;
  const t0 = Date.now();
  while(b.active && b.resolvingKO && (Date.now() - t0) < maxMs){
    await new Promise(r => setTimeout(r, 0));
  }
}
// Boucle battleTick accélérée, partagée par la chaîne sauvage (sans stopFn)
// et les combats bornés (stopFn = premier endBattle atteint).
async function offlineRunBattleFfLoop(budgetMs, stopFn, labelFn){
  const b = battle;
  let simMs = 0;
  let ticks = 0;
  let koDrain = 0;
  let koWaitStart = 0;
  while(simMs < budgetMs){
    if(!b.active) break;                       // K.O. d'équipe → endBattle a tourné
    if(stopFn && stopFn()) break;
    if(b.resolvingKO){                          // résolution async d'un K.O.
      koDrain++;
      const now = Date.now();
      if(!koWaitStart) koWaitStart = now;
      if(now - koWaitStart > 5000) break;       // résolution irrécupérable : abandon propre
      // Tous les 64 drains MICROTÂCHES on cède une vraie MACROTÂCHE : ainsi un
      // K.O. resté figé en live (timers réels) peut conclure pendant le FF.
      if(koDrain % 64 === 0) await new Promise(r => setTimeout(r, 0));
      else await Promise.resolve();
      ticks++;
      if(ticks > OFFLINE_FF_GUARD_TICKS) break;
      continue;
    }
    koDrain = 0;
    koWaitStart = 0;
    b.paused = false;
    const dt = 100 * (b.speed || 1);
    // Saut analytique EXACT : entre deux actions, un tick n'est qu'une
    // décrémentation des cooldowns (statuts/météo/talents ne se traitent qu'aux
    // actions) → on avance d'un coup jusqu'au prochain tick « utile ».
    // Le saut est borné par le budget restant (jamais de dépassement : l'état
    // à la coupure est strictement identique à une avancée tick-par-tick).
    if(Number.isFinite(b.pCd) && Number.isFinite(b.eCd) && b.pCd > dt && b.eCd > dt){
      let k = Math.floor((Math.min(b.pCd, b.eCd) - 1) / dt);
      const remaining = Math.floor((budgetMs - simMs) / dt);
      if(k > remaining) k = Math.max(0, remaining);
      if(k > 0){ b.pCd -= k * dt; b.eCd -= k * dt; simMs += k * dt; ticks += k; }
    }
    if(simMs >= budgetMs) break;
    try{ battleTick(); }catch(e){ console.error('[OfflineEngine] battleTick', e); break; }
    simMs += dt;
    ticks++;
    if(ticks > OFFLINE_FF_GUARD_TICKS) break;
    if(ticks % OFFLINE_FF_YIELD_TICKS === 0){
      if(labelFn) labelFn();
      await offlineFfYield(simMs / budgetMs);
    }
  }
  return { simMs: simMs, ticks: ticks };
}
// Résout le combat borné en cours (arène/ligue/dresseur/atoll/légendaire).
async function offlineRunBoundedBattle(res, budgetMs){
  const b = battle;
  await offlineDrainStuckLiveKOs();
  // Issue au premier endBattle : équipe encore debout → victoire, sinon défaite.
  const endInfo = { calls: 0, outcome: null };
  const savedEnd = (typeof window !== 'undefined' && typeof window.endBattle === 'function') ? window.endBattle : null;
  if(savedEnd){
    window.endBattle = function(){
      if(endInfo.calls === 0){
        endInfo.outcome = (typeof aliveCount === 'function' ? aliveCount() : 0) > 0 ? 'won' : 'lost';
      }
      endInfo.calls++;
      return savedEnd.apply(this, arguments);
    };
  }
  try{
    const loop = await offlineRunBattleFfLoop(budgetMs, function(){ return endInfo.calls >= 1; },
      function(){ _offlineStageLabel = tr('offline_stage_boss'); });
    res.secondsUsed = Math.round(loop.simMs / 1000);
  }finally{
    if(savedEnd){ try{ window.endBattle = savedEnd; }catch(_){ } }
  }
  if(endInfo.calls >= 1) res.bounded = endInfo.outcome || (((typeof aliveCount === 'function' ? aliveCount() : 0) > 0) ? 'won' : 'lost');
  // S'il n'est pas terminé dans le budget (combat très long) : repris à l'écran.
}

async function offlineFastForwardWildBattles(secondsBudget){
  const res = { won: 0, fights: 0, lost: false, secondsUsed: 0, bounded: null };
  const budgetMs = Math.max(0, secondsBudget * 1000);
  const b = battle;
  // Passe 32 : un combat borné est déjà en cours → on le termine (prioritaire,
  // jamais d'enchaînement sauvage en parallèle).
  if(offlineIsBoundedBattle(b)){
    await offlineRunBoundedBattle(res, budgetMs);
    return res;
  }
  const loc = (typeof getLocObj === 'function') ? getLocObj(G.location) : null;
  if(!offlineCanWildBattle(loc)) return res;
  // Passe 32 : dégeler une résolution de K.O. restée bloquée en live (onglet gelé).
  await offlineDrainStuckLiveKOs();
  const hadActiveChain = !!(b.active && !b.isChamp && !b.isTraining && b.chill);
  // Passe 30 (correctif bêta) : ne JAMAIS démarrer une exploration ex nihilo —
  // le rattrapage ne rejoue QUE ce que le joueur faisait réellement en partant.
  //  - Onglet resté ouvert : la chaîne est encore active (b.active) → on la
  //    poursuit (c'est le seul cas où démarrer est légitime).
  //  - Jeu relancé (état combat réinitialisé au boot) : drapeau persisté
  //    G.wildSessionActive, mis à jour à chaque saveGame et effacé à chaque
  //    fin de combat. Inactif sur une route ou à l'entraînement = 0 combat.
  if(!hadActiveChain){
    if(!(G && G.wildSessionActive)) return res;
    if(!offlineStartWildSession(loc)) return res;
  }
  b.paused = false;
  const winsBefore = b.sessionWins || 0;
  const loop = await offlineRunBattleFfLoop(budgetMs, null, function(){
    const wonSoFar = (b.sessionWins || 0) - winsBefore;
    _offlineStageLabel = tr('offline_stage_battles_wins', { wins: wonSoFar });
  });
  res.secondsUsed = Math.round(loop.simMs / 1000);
  res.won = (b.sessionWins || 0) - winsBefore;
  res.fights = res.won;
  res.lost = !b.active;
  return res;
}
// ─── Passe 29 : fast-forward de l'entraînement (rejoue la VRAIE boucle) ─────
// updateTrainingSlots() est appelée toutes les 100 ms en live (dt = 100 ×
// vitesse), avec la chaîne complète completeTrainingSlot → récompenses → file
// d'automatisation. On la rejoue telle quelle, UI gelée, avec le même saut
// analytique exact entre actions que pour les combats sauvages.
async function offlineFastForwardTraining(secondsBudget){
  const res = { sessions: 0, failures: 0, secondsUsed: 0 };
  if(typeof updateTrainingSlots !== 'function') return res;
  if(!Array.isArray(G.trainingSlots)) return res;
  const budgetMs = Math.max(0, secondsBudget * 1000);
  if(!budgetMs) return res;
  const hasActive = () => (G.trainingSlots || []).some(s => s && s.active && s.battle);
  // Comptage par rebind temporaire (même technique que le muting UI).
  const savedComplete = (typeof window !== 'undefined' && typeof window.completeTrainingSlot === 'function') ? window.completeTrainingSlot : null;
  if(savedComplete){
    window.completeTrainingSlot = function(i, success){
      if(success === false) res.failures++; else res.sessions++;
      return savedComplete(i, success);
    };
  }
  let simMs = 0;
  let ticks = 0;
  try{
    while(simMs < budgetMs){
      if(!hasActive()){
        try{ if(typeof processTrainingAutomationQueues === 'function') processTrainingAutomationQueues(); }catch(_){ }
        if(!hasActive()) break; // file vide : plus rien à entraîner
      }
      const dt = 100 * ((typeof battle !== 'undefined' && battle && battle.speed) ? battle.speed : 1);
      // Saut analytique borné : entre deux attaques d'aucun slot actif, un tick
      // ne fait que décrémenter pCd/eCd → avance directe (bornée au budget).
      let k = 0;
      let allSkippable = true;
      for(const slot of G.trainingSlots){
        if(!slot || !slot.active || !slot.battle) continue;
        const tb = slot.battle;
        if(!Number.isFinite(tb.pCd) || !Number.isFinite(tb.eCd) || tb.pCd <= dt || tb.eCd <= dt){ allSkippable = false; break; }
        const ki = Math.floor((Math.min(tb.pCd, tb.eCd) - 1) / dt);
        if(k === 0 || ki < k) k = ki;
      }
      if(allSkippable && k > 0){
        const remaining = Math.floor((budgetMs - simMs) / dt);
        if(k > remaining) k = Math.max(0, remaining);
        if(k > 0){
          for(const slot of G.trainingSlots){
            if(!slot || !slot.active || !slot.battle) continue;
            slot.battle.pCd -= k * dt;
            slot.battle.eCd -= k * dt;
          }
          simMs += k * dt;
          ticks += k;
        }
      }
      if(simMs >= budgetMs) break;
      try{ updateTrainingSlots(); }catch(e){ console.error('[OfflineEngine] updateTrainingSlots', e); break; }
      simMs += dt;
      ticks++;
      if(ticks > OFFLINE_FF_GUARD_TICKS) break;
      if(ticks % OFFLINE_FF_YIELD_TICKS === 0){
        _offlineStageLabel = tr('offline_stage_training_sessions', { n: res.sessions + res.failures });
        await offlineFfYield(simMs / budgetMs);
      }
    }
  } finally {
    if(savedComplete){ try{ window.completeTrainingSlot = savedComplete; }catch(_){ } }
  }
  res.secondsUsed = Math.round(simMs / 1000);
  return res;
}

function offlineStopWildBattleTimer(){
  const b = (typeof battle !== 'undefined') ? battle : null;
  // Passe 32 : on coupe le ticker de TOUT combat actif (sinon il double-ticke
  // pendant le fast-forward, attentes réelles comprises).
  if(b && b.active && !b.isTraining){
    try{ stopBattleTimer('battle', b.timerId); }catch(_){ }
    b.timerId = null;
  }
}
// Après le rattrapage : relancer le vrai ticker et resynchroniser l'écran combat.
function offlineResumeChainAfterFastForward(){
  const b = (typeof battle !== 'undefined') ? battle : null;
  if(!b || !b.active || b.isTraining) return;
  b.paused = false;
  if(!b.timerId){ try{ b.timerId = appBattleTimer('battle', battleTick, 100); }catch(_){ } }
  try{
    const idleScreen = document.getElementById('battle-idle-screen');
    const activeScene = document.getElementById('battle-active-scene');
    if(idleScreen) idleScreen.style.display = 'none';
    if(activeScene) activeScene.style.display = 'flex';
  }catch(_){ }
  try{ updateBattleUI(); }catch(_){ }
  try{ renderMoveButtons(); renderEnemyMoveBars(); renderBattleTeamRow(); }catch(_){ }
}

// ─── Panneau de progression + récapitulatif ──────────────────────────────────
function ensureAfkResultPanel(){
  let modal = document.getElementById('afk-result-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'afk-result-modal';
    modal.className = 'afk-result-modal';
    document.body.appendChild(modal);
  }
  return modal;
}
function closeAfkResultPanel(){ const modal = document.getElementById('afk-result-modal'); if(modal) modal.classList.remove('open'); }
function offlineShowProgress(pct, infoText){
  // Passe 29 : rafraîchissement piloté par l'horloge RÉELLE (cadence
  // OFFLINE_PAINT_MS) — avant, la barre ne se peignait que tous les 40 000
  // ticks et le jeu semblait planté pendant tout le calcul.
  const now = Date.now();
  const p = Math.max(0, Math.min(100, Math.round((pct || 0) * 100)));
  const info = String(infoText || '');
  if(p === _offlineLastPaintPct && info === _offlineLastPaintInfo && (now - _offlineLastPaintAt) < OFFLINE_PAINT_MS) return;
  _offlineLastPaintPct = p; _offlineLastPaintInfo = info; _offlineLastPaintAt = now;
  const modal = ensureAfkResultPanel();
  const stageHtml = info ? `<div class="afk-ff-stage">${escHtml(info)}</div>` : '';
  modal.innerHTML = `<div class="afk-result-card"><div class="modal-title"><div>${escHtml(t('offline_ff_title'))}</div></div><div class="afk-result-status">${escHtml(tr('afk_ff_progress', { pct: p }))}</div><div class="afk-ff-bar"><i style="width:${p}%"></i></div>${stageHtml}</div>`;
  modal.classList.add('open');
}
// Étape courante du calcul (segment de barre) — renseignée par offlineSimulate
// à chaque handler ; les boucles FF appellent offlineFfYield(fracLocale).
let _offlineLastPaintPct = -1;
let _offlineLastPaintInfo = '';
let _offlineLastPaintAt = 0;
let _offlineLastYieldAt = 0;
let _offlineStageBase = 0;
let _offlineStageSpan = 1;
let _offlineStageLabel = '';
function offlineStageProgress(localFrac){
  offlineShowProgress(_offlineStageBase + Math.max(0, Math.min(1, localFrac || 0)) * _offlineStageSpan, _offlineStageLabel);
}
async function offlineFfYield(localFrac){
  offlineStageProgress(localFrac);
  const now = Date.now();
  if(now - _offlineLastYieldAt >= OFFLINE_PAINT_MS){
    _offlineLastYieldAt = now;
    await new Promise(r => setTimeout(r, 0)); // vraie respiration → le navigateur PEINT la barre
  } else {
    await Promise.resolve();
  }
}
function snapshotInventory(){ return { ...(G.inventory || {}) }; }
function snapshotSessionItems(){ return { ...((battle && battle.sessionItems) || {}) }; }
function diffInventory(before, after){
  const keys = new Set([ ...Object.keys(before || {}), ...Object.keys(after || {}) ]);
  const out = [];
  for(const key of keys){
    const delta = Number((after && after[key]) || 0) - Number((before && before[key]) || 0);
    if(delta > 0) out.push({ key, qty: delta });
  }
  return out;
}
function diffSessionItems(before, after){
  const keys = new Set([ ...Object.keys(before || {}), ...Object.keys(after || {}) ]);
  const out = [];
  for(const key of keys){
    const delta = Number((after && after[key]) || 0) - Number((before && before[key]) || 0);
    if(delta > 0) out.push({ key, qty: delta });
  }
  return out;
}
function countAfkTeamKo(){ return (G && Array.isArray(G.team)) ? G.team.filter(p => p && p.currentHP <= 0).length : 0; }
// Passe 30 : somme des niveaux des Pokémon en Garderie (sert à mesurer les
// niveaux gagnés pendant le rattrapage — la garderie progresse désormais sur
// un compteur de KO, alimenté par les combats FF rejoués honnêtement).
function offlineDaycareLevelSum(){
  let s = 0;
  const list = (G && G.hatchery) || [];
  for(let i = 0; i < list.length; i++){
    const slot = list[i];
    if(!slot || !slot.poke || slot.isFossil) continue;
    const mode = (G.hatcheryModes && G.hatcheryModes[i]) || slot.mode || 'exp';
    if(mode !== 'exp') continue; // l'incubation remet à niveau 1 : exclue de la somme
    s += Number(slot.poke.level || 0);
  }
  return s;
}
function groupAfkCaptures(captures){
  const grouped = {};
  for(const c of captures || []){
    const id = Number(c.id || 0);
    if(!id) continue;
    const key = id + ':' + (!!c.shiny);
    if(!grouped[key]) grouped[key] = { id, name: c.name || getPokeName(id), emoji: c.emoji || '', shiny: !!c.shiny, count: 0, dupes: 0 };
    grouped[key].count++;
    if(c.dupe) grouped[key].dupes++;
  }
  return Object.values(grouped).sort((a, b) => (b.shiny - a.shiny) || a.id - b.id);
}
function renderAfkCaptureCards(list){
  if(!list || !list.length) return `<span class="afk-muted">${escHtml(t('afk_none'))}</span>`;
  return list.map(c => `<div class="afk-loot-card ${c.shiny ? 'is-shiny' : ''}" title="${escHtml(c.name)}${c.dupes ? ` · ${c.dupes} ${escHtml(t('duplicate_short'))}` : ''}">${spriteImg(c.id, c.emoji, { shiny: c.shiny, size: 44 })}<span>${escHtml(c.name)}</span>${c.count > 1 ? `<b>×${c.count}</b>` : ''}${c.shiny ? '<em>★</em>' : ''}</div>`).join('');
}
function renderAfkCaptureList(captures){
  const grouped = groupAfkCaptures(captures || []);
  if(!grouped.length) return `<span class="afk-muted">${escHtml(t('afk_none'))}</span>`;
  return `<div class="afk-loot-row">${renderAfkCaptureCards(grouped)}</div>`;
}
function renderAfkItemList(items){
  if(!items || !items.length) return `<span class="afk-muted">${escHtml(t('afk_none'))}</span>`;
  return items.map(it => `<div class="afk-loot-card item" title="${escHtml(getItemName(it.key))}">${itemSpriteHtml(it.key, 34)}<span>${escHtml(getItemName(it.key))}</span><b>×${it.qty}</b></div>`).join('');
}
function showAfkResultPanel(result){
  const modal = ensureAfkResultPanel();
  const capturesHtml = renderAfkCaptureList(result.captureList || []);
  const itemsHtml = renderAfkItemList(result.items || []);
  const titleKey = result.debug ? 'afk_panel_title_debug' : 'afk_panel_title_return';
  const statusKey = result.error ? 'afk_panel_status_error' : result.lost ? 'afk_panel_status_lost' : result.wins > 0 ? 'afk_panel_status_ok' : 'afk_panel_status_empty';
  const statCell = (value, labelKey) => `<div><b>${value}</b><span>${escHtml(t(labelKey))}</span></div>`;
  modal.innerHTML = `<div class="afk-result-card"><div class="modal-title"><div>⏱ ${escHtml(t(titleKey))}</div><span class="afk-modal-close" data-action="legacy-call" data-call="closeAfkResultPanel" data-call-args="">✕</span></div><div class="afk-result-status ${result.error ? 'danger' : result.lost ? 'danger' : result.wins > 0 ? 'success' : ''}">${escHtml(t(statusKey))}</div><div class="afk-result-grid">${statCell(escHtml(formatPlayTime(result.timeMs || 0)), 'afk_panel_duration')}${statCell(result.wins || 0, 'afk_panel_battles')}${statCell('+' + Number(result.money || 0).toLocaleString() + '₽', 'afk_panel_money')}${statCell(result.fainted || 0, 'afk_panel_team_ko')}${statCell(result.captures || 0, 'afk_panel_captures')}${statCell('+' + (result.energy || 0), 'afk_panel_energy')}${statCell(result.training || 0, 'afk_panel_training')}${statCell(result.mineDigs || 0, 'afk_panel_mine_digs')}${(result.daycareLevels || 0) > 0 ? statCell('+' + result.daycareLevels, 'afk_panel_daycare_levels') : ''}${result.boundedBattle ? statCell(result.boundedBattle === 'won' ? '✔' : '✖', 'afk_panel_boss_battle') : ''}</div><div class="afk-result-section"><b>${escHtml(t('captured_pokemon_title'))}</b>${capturesHtml}</div><div class="afk-result-section"><b>${escHtml(t('found_items_title'))}</b><div class="afk-loot-row">${itemsHtml}</div></div>${result.message ? `<div class="afk-result-note">${escHtml(result.message)}</div>` : ''}<div class="afk-result-actions"><button class="hbtn" data-action="legacy-call" data-call="closeAfkResultPanel" data-call-args="">${escHtml(t('close'))}</button></div></div>`;
  modal.classList.add('open');
}

// ─── Orchestrateur ───────────────────────────────────────────────────────────
const OFFLINE_HANDLERS = {};
const OfflineEngine = {
  register(name, fn){ if(name && typeof fn === 'function') OFFLINE_HANDLERS[name] = fn; return OfflineEngine; },
  handler(name){ return OFFLINE_HANDLERS[name] || null; },
  simulate(ms, reason){ return offlineSimulate(ms, reason); },
  get applying(){ return offlineEngineApplying; },
  MAX_MS: OFFLINE_MAX_MS,
};

async function offlineSimulate(ms, reason){
  if(offlineEngineApplying) return null;
  if(typeof G === 'undefined' || !G || !hasStarterInState(G)) return null;
  offlineEngineApplying = true;
  try{ afkApplying = true; }catch(_){ }
  const capped = Math.min(Math.max(0, Number(ms) || 0), OFFLINE_MAX_MS);
  const seconds = Math.floor(capped / 1000);
  const wantRecap = reason === 'debug' || capped >= OFFLINE_RECAP_MIN_MS;
  const startMoney = Number(G.money || 0);
  const startEnergy = G.mine ? Number(G.mine.energy || 0) : 0;
  const invBefore = snapshotInventory();
  const sessionItemsBefore = snapshotSessionItems();
  const catchBefore = (typeof battle !== 'undefined' && battle && battle.sessionCatches) ? battle.sessionCatches.length : 0;
  const teamKoBefore = countAfkTeamKo();
  const daycareLevelsBefore = offlineDaycareLevelSum();
  if(wantRecap){
    try{ offlineShowProgress(0, ''); }catch(_){ }
    await new Promise(r => setTimeout(r, 0)); // passe 29 : laisser le navigateur PEINDRE la barre avant de mouliner
  }
  offlineStopWildBattleTimer();
  const restoreUi = offlineMuteUi();
  const agg = {};
  try{
    // Segments de la barre : les combats dominent le coût, puis entraînement, puis mine.
    const STAGE_WEIGHTS = { 'wild-battles': 0.72, 'training': 0.23, 'mine': 0.05 };
    const STAGE_LABELS = { 'wild-battles': 'offline_stage_battles', 'training': 'offline_stage_training', 'mine': 'offline_stage_mine' };
    const names = Object.keys(OFFLINE_HANDLERS);
    const unknownWeight = 0.02;
    let weightTotal = 0;
    for(const n of names) weightTotal += Number(STAGE_WEIGHTS[n] || unknownWeight);
    let cursor = 0;
    for(const name of names){
      const w = weightTotal > 0 ? (Number(STAGE_WEIGHTS[name] || unknownWeight) / weightTotal) : (1 / names.length);
      _offlineStageBase = cursor;
      _offlineStageSpan = w;
      _offlineStageLabel = t(STAGE_LABELS[name] || 'offline_stage_generic');
      offlineStageProgress(0);
      try{ agg[name] = (await OFFLINE_HANDLERS[name](seconds, { reason: reason || 'return', timeMs: capped })) || {}; }
      catch(e){ console.error('[OfflineEngine:' + name + ']', e); agg[name] = {}; }
      cursor += w;
      _offlineStageLabel = t(STAGE_LABELS[name] || 'offline_stage_generic');
      offlineStageProgress(1); // fin de segment
    }
    _offlineStageBase = 0; _offlineStageSpan = 1; _offlineStageLabel = '';
  }catch(e){
    console.error('[OfflineEngine]', e);
    agg._error = e;
  }finally{
    restoreUi();
    offlineResumeChainAfterFastForward();
    offlineSuspendedByUs = false;
    try{ afkApplying = false; }catch(_){ }
    markAfkSeen(true);
    const battlesRes = agg['wild-battles'] || {};
    const mineRes = agg['mine'] || {};
    const trainingRes = agg['training'] || {};
    const teamKoAfter = countAfkTeamKo();
    const captureList = (typeof battle !== 'undefined' && battle && battle.sessionCatches) ? battle.sessionCatches.slice(catchBefore) : [];
    let itemList = diffSessionItems(sessionItemsBefore, (typeof battle !== 'undefined' && battle && battle.sessionItems) || {});
    if(!itemList.length) itemList = diffInventory(invBefore, G.inventory || {});
    const result = {
      debug: reason === 'debug',
      timeMs: capped,
      wins: Number(battlesRes.won || 0),
      money: Math.max(0, Number(G.money || 0) - startMoney),
      fainted: Math.max(0, teamKoAfter - teamKoBefore),
      lost: !!battlesRes.lost,
      energy: G.mine ? Math.max(0, Number(G.mine.energy || 0) - startEnergy) : 0,
      training: Number(trainingRes.sessions || 0),
      mineDigs: Number(mineRes.digs || 0),
      captures: captureList.length,
      captureList: captureList,
      items: itemList,
      daycareLevels: Math.max(0, offlineDaycareLevelSum() - daycareLevelsBefore),
      boundedBattle: battlesRes.bounded || null, // passe 32 : 'won' | 'lost' | null
    };
    const hasActivity = !!(result.wins > 0 || result.lost || result.captures > 0 || result.items.length > 0 || result.energy > 0 || result.training > 0 || result.mineDigs > 0 || result.money > 0 || result.daycareLevels > 0 || result.boundedBattle);
    if(agg._error){
      try{ showAfkResultPanel({ error: true, timeMs: capped, wins: 0, money: 0, fainted: 0, captures: 0, energy: 0, training: 0, mineDigs: 0, items: [], message: t('afk_error_resume') }); notify(t('afk_error_resume'), 'var(--red)'); }catch(_){ }
    } else if(wantRecap && hasActivity){
      try{ showAfkResultPanel(result); }catch(_){ }
    } else {
      try{ closeAfkResultPanel(); }catch(_){ }
    }
    try{
      if(result.boundedBattle){
        notify(t(result.boundedBattle === 'won' ? 'afk_boss_won' : 'afk_boss_lost'), result.boundedBattle === 'won' ? 'var(--green)' : 'var(--red)');
      } else if(result.wins > 0 || result.lost){
        const params = { time: formatPlayTime(capped), wins: result.wins, money: Number(result.money || 0).toLocaleString(), fainted: result.fainted };
        notify(tr(result.lost ? 'afk_progress_lost_summary' : 'afk_progress_summary', params), result.lost ? 'var(--red)' : 'var(--green)');
        try{ addBattleLog(tr(result.lost ? 'afk_battle_log_lost_summary' : 'afk_battle_log_summary', params)); }catch(_){ }
      } else if(seconds >= 30 && G.mine && result.energy > 0){
        notify(tr('afk_energy_summary', { time: formatPlayTime(capped) }), 'var(--blue)');
      } else if(seconds >= 5){
        notify(tr('afk_no_progress_summary', { time: formatPlayTime(capped) }), 'var(--light1)');
      }
    }catch(_){ }
    try{ updateHeader(); }catch(_){ }
    try{ renderBattleLoot(); renderBattleSummary(); }catch(_){ }
    try{ renderTeamWindow(); }catch(_){ }
    try{ if(document.getElementById('map-svg')) renderMap(); }catch(_){ }
    try{ saveGame(false); }catch(_){ }
    offlineEngineApplying = false;
    OfflineEngine._lastResult = result;
    return result;
  }
}

// ─── Handlers par défaut ─────────────────────────────────────────────────────
// Combats sauvages : fast-forward du VRAI moteur (plus d'estimateur parallèle).
OfflineEngine.register('wild-battles', async function(seconds){ return offlineFastForwardWildBattles(seconds); });
// Entraînement (passe 29 : fast-forward de la VRAIE boucle updateTrainingSlots —
// plus d'instant-kill par tick : les rounds sont désormais joués honnêtement,
// échecs possibles inclus, avec saut analytique exact entre attaques).
OfflineEngine.register('training', async function(seconds){ return offlineFastForwardTraining(seconds); });
// Mine : régénération d'énergie + extraction auto. Quand l'automatisation est
// active, la régénération est INTERCALÉE dans la simulation (fidélité live : le
// ticker +2/s tourne pendant que la pelle consomme) — sinon formule fermée.
OfflineEngine.register('mine', async function(seconds){
  if(!G.mine) return {};
  const startEnergy = Number(G.mine.energy || 0);
  let digs = 0;
  const autoOn = !!(G.mine.automation && G.mine.automation.enabled && G.mine.automation.purchased);
  if(autoOn && typeof simulateAfkMineAutomation === 'function'){
    digs = simulateAfkMineAutomation(seconds) || 0;
  } else {
    G.mine.energy = Math.min(G.mine.maxEnergy || 100, (G.mine.energy || 0) + Math.max(0, seconds) * 2);
  }
  return { energy: Math.max(0, Number(G.mine.energy || 0) - startEnergy), digs: digs };
});

// ─── Timeskip debug (30 min — passera par les futurs objets de saut de temps) ─
function debugTimeSkip30Minutes(){
  if(typeof window === 'undefined' || !window.PokeWorldGameStarted || typeof G === 'undefined' || !G || !hasStarterInState(G)){
    try{ notify(t('save_need_starter'), 'var(--red)'); }catch(_){ }
    try{ showAfkResultPanel({ debug: true, timeMs: 30 * 60 * 1000, wins: 0, money: 0, fainted: 0, captures: 0, energy: 0, training: 0, mineDigs: 0, items: [], message: t('save_need_starter') }); }catch(_){ }
    return;
  }
  if(typeof currentSaveId !== 'undefined' && !currentSaveId && G.saveMeta && G.saveMeta.id) currentSaveId = G.saveMeta.id;
  _offlineLastSim = offlineSimulate(30 * 60 * 1000, 'debug');
  return _offlineLastSim;
}

installOfflineHandlers();

// --- Migrated to ES module, globals exposed ---
if (typeof OfflineEngine !== 'undefined' && typeof window !== 'undefined') window.OfflineEngine = OfflineEngine;
if (typeof offlineSimulate !== 'undefined' && typeof window !== 'undefined') window.offlineSimulate = offlineSimulate;
if (typeof offlineScheduleCatchup !== 'undefined' && typeof window !== 'undefined') window.offlineScheduleCatchup = offlineScheduleCatchup;
if (typeof offlinePollHeartbeat !== 'undefined' && typeof window !== 'undefined') window.offlinePollHeartbeat = offlinePollHeartbeat;
if (typeof offlinePersistSeen !== 'undefined' && typeof window !== 'undefined') window.offlinePersistSeen = offlinePersistSeen;
if (typeof offlineAcquireLock !== 'undefined' && typeof window !== 'undefined') window.offlineAcquireLock = offlineAcquireLock;
if (typeof offlineFastForwardWildBattles !== 'undefined' && typeof window !== 'undefined') window.offlineFastForwardWildBattles = offlineFastForwardWildBattles;
if (typeof offlineFastForwardTraining !== 'undefined' && typeof window !== 'undefined') window.offlineFastForwardTraining = offlineFastForwardTraining;
if (typeof showAfkResultPanel !== 'undefined' && typeof window !== 'undefined') window.showAfkResultPanel = showAfkResultPanel;
if (typeof closeAfkResultPanel !== 'undefined' && typeof window !== 'undefined') window.closeAfkResultPanel = closeAfkResultPanel;
if (typeof debugTimeSkip30Minutes !== 'undefined' && typeof window !== 'undefined') window.debugTimeSkip30Minutes = debugTimeSkip30Minutes;
if (typeof window !== 'undefined') window._offlineGetLastSim = () => _offlineLastSim;
