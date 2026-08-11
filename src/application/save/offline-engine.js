// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Phase 28 — OFFLINE ENGINE (offline fast-forward)
//
// The "Melvor" path decided with the user: ONE single source of truth.
// The old parallel damage estimator (estimateAfkMoveDamage…) is deleted:
// the catch-up replays the true battle loop — the ECS-driven
// runBattleTick() (world.run('combat:tick') → domain tick) plus the
// onEnemyFaint()/spawnNextWild() chain — at high speed, with a
// frozen UI. Each time-based system registers itself via
// OfflineEngine.register(name, handler(seconds, ctx)) and consumes a
// budget in SECONDS — the hidden per-system caps (720 victories / 120
// ticks / 500 steps) are gone. Future "time-skips": OfflineEngine.simulate(s)
// is the stable API to call.
//
// Balancing decisions (user): 100% efficiency, global 12h cap.
// Detection via heartbeat gap (>15 s whatever the visibility): covers OS
// sleep, mobile kill, crash, frozen tab. Tab lock against double catch-up.

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

const OFFLINE_MIN_GAP_MS = 15000;               // minimal heartbeat gap triggering a catch-up
const OFFLINE_RECAP_MIN_MS = 60000;             // below: discreet notification, no modal
const OFFLINE_MAX_MS = 12 * 60 * 60 * 1000;    // global 12 h cap
const OFFLINE_FF_YIELD_TICKS = 400;             // yield to microtasks every N ticks
const OFFLINE_FF_GUARD_TICKS = 600000;          // infinite-loop guard (12 h @ x1 speed = 432 k ticks)
const OFFLINE_LOCK_STALE_MS = 10000;            // tab lock considered expired beyond this
const OFFLINE_PAINT_MS = 120;                   // phase 29: REAL refresh rate of the bar (else the screen looks frozen)

let offlineEngineApplying = false;
let offlineHandlersInstalled = false;
let offlineCatchupTimer = null;
let offlineLastHeartbeat = saveNow();
let offlineHiddenSince = null;
let offlineSuspendedByUs = false;
let _offlineLastSim = null;                     // promise of the last simulation (tests/debug)
const OFFLINE_TAB_ID = 'tab-' + Math.random().toString(36).slice(2, 10) + '-' + saveNow().toString(36);

// ─── "Last sign of life" persistence ────────────────────────────────────
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

// ─── Tab lock (anti double catch-up) ────────────────────────────────
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

 // Offline fast-forward and idle simulation rules
 // Offline fast-forward and idle simulation rules
// trainer/arene/ligue/atoll) — it is the fast-forward which the resout to the return.
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

// ─── Detection: heartbeat + time gap ───────────────────────────────────
function offlineScheduleCatchup(_reason){
  try { if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.hit('offline', 'catchup', { via: _reason || 'unknown' }); } catch (_) {}
  clearTimeout(offlineCatchupTimer);
  offlineCatchupTimer = setTimeout(() => { try{ offlinePollHeartbeat(); }catch(e){ console.error('[OfflineEngine]', e); } }, 120);
}
function offlinePollHeartbeat(){
  const now = saveNow();
  const afkModal = typeof document !== 'undefined' ? document.getElementById('afk-result-modal') : null;
  if(afkModal && afkModal.classList.contains('open')){
    offlineLastHeartbeat = now;
    offlinePersistSeen(now);
    return;
  }
  if(typeof window === 'undefined' || !window.PokeWorldGameStarted || offlineEngineApplying || typeof G === 'undefined' || !G || !hasStarterInState(G)){
    offlineLastHeartbeat = now;
    return;
  }
  const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  if(hidden){
    if(!offlineHiddenSince){ offlineHiddenSince = now; offlineSuspendBattle(); offlinePersistSeen(now); }
    return; // during the absence, catch-up happens on return (or at boot if the tab dies)
  }
  const memGap = Math.max(0, now - offlineLastHeartbeat);
  offlineLastHeartbeat = now;
  const storedTs = offlineReadSeen();
  const storedGap = storedTs ? Math.max(0, now - storedTs) : 0;
  const hiddenGap = offlineHiddenSince ? Math.max(0, now - offlineHiddenSince) : 0;
  offlineHiddenSince = null;
  if(!offlineAcquireLock()){ offlinePersistSeen(now); offlineResumeBattle(); return; } // a other onglet pilote
  const gap = Math.min(Math.max(memGap, storedGap, hiddenGap), OFFLINE_MAX_MS);
  if(gap >= OFFLINE_MIN_GAP_MS){
    offlineSuspendedByUs = false; // the fast-forward gere lui-same the reprise of the chaine
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

// ─── Muting UI during the fast-forward ───────────────────────────────────────
// scripts are loaded in classic mode: their top-level functions are
// window properties -> we neutralize them, then restore.
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

 // Offline fast-forward and idle simulation rules
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
// Opens an exploration session WITHOUT healing the team (unlike
// startBattle): the state at departure time is the catch-up's starting
// state.
function offlineStartWildSession(_loc){
  const b = battle;
  if((typeof aliveCount === 'function' ? aliveCount() : 0) <= 0) return false;
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
// Phase 32 — bounded-battle drain:
// a "bounded battle" = the current battle, with no chaining: quest
// trainer, quest boss, gym, league, atoll, legendary encounter… (non-chill).
// The catch-up finishes it honestly (same ECS-driven battleTick loop), without
// chaining anything after: a single battle, stop at the first endBattle.
function offlineIsBoundedBattle(b){
  return !!(b && b.active && !b.isTraining && b.enemyPoke &&
    (b.isChamp || b.isQuestTrainerBattle || b.isQuestDefeatBattle ||
     b.questRewardQuestId != null || b.isAtollBattle || !b.chill));
}
// Resolution of live FROZEN K.O.s (beta bug #1 from the report): if the tab
// froze right in the middle of the wait(500/700) in
// onEnemyFaint/onPlayerPokeFaint, the promise chain no longer advances
// (real timers suspended). The FF then spun empty: 0 victories + "no
// active wild zone to simulate". Here we let the TRUE timers catch up
// with the chain (their further waits are neutralized → instant) until the
// resolution completes.
async function offlineDrainStuckLiveKOs(maxMs = 4000){
  const b = (typeof battle !== 'undefined') ? battle : null;
  if(!b || !b.active || !b.resolvingKO) return;
  const t0 = Date.now();
  while(b.active && b.resolvingKO && (Date.now() - t0) < maxMs){
    await new Promise(r => setTimeout(r, 0));
  }
}
// Accelerated battleTick loop, shared by the wild chain (without stopFn)
 // Offline fast-forward and idle simulation rules
async function offlineRunBattleFfLoop(budgetMs, stopFn, labelFn){
  const b = battle;
  let simMs = 0;
  let ticks = 0;
  let koDrain = 0;
  let koWaitStart = 0;
  while(simMs < budgetMs){
    if(!b.active) break;                       // team K.O. → endBattle has run
    if(stopFn && stopFn()) break;
    if(b.resolvingKO){                          // async K.O. resolution
      koDrain++;
      const now = Date.now();
      if(!koWaitStart) koWaitStart = now;
      if(now - koWaitStart > 5000) break;       // resolution irrecuperable : abandon own
      // every 64 MICROTASK drains, yield to a real MACROTASK: this way a
      // K.O. stuck in live state (real timers) can resolve during the FF.
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
    // EXACT analytic jump: between two actions, a tick is only a
    // cooldown decrement (statuses/weather/abilities only resolve at
    // actions) -> jump straight to the next "useful" tick.
    // The jump is bounded by the remaining budget (never overshoot: the
    // state at the cut point is strictly identical to a tick-by-tick advance).
    if(Number.isFinite(b.pCd) && Number.isFinite(b.eCd) && b.pCd > dt && b.eCd > dt){
      let k = Math.floor((Math.min(b.pCd, b.eCd) - 1) / dt);
      const remaining = Math.floor((budgetMs - simMs) / dt);
      if(k > remaining) k = Math.max(0, remaining);
      if(k > 0){ b.pCd -= k * dt; b.eCd -= k * dt; simMs += k * dt; ticks += k; }
    }
    if(simMs >= budgetMs) break;
    try{ runBattleTick(); }catch(e){ console.error('[OfflineEngine] runBattleTick', e); break; }
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
// Resolves the bounded battle currently running (gym/league/trainer/atoll/legendary).
async function offlineRunBoundedBattle(res, budgetMs){
  await offlineDrainStuckLiveKOs();
  // Outcome at the first endBattle: team still standing -> win, else loss.
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
  // If it did not finish within the budget (very long battle): resumed
  // on screen.
}

async function offlineFastForwardWildBattles(secondsBudget){
  const b = battle;
  const res = { won: 0, fights: 0, lost: false, secondsUsed: 0, bounded: null };
  const budgetMs = Math.max(0, secondsBudget * 1000);
  // Phase 32: a bounded battle is already running -> finish it (priority,
  // never chain wilds in parallel).
  if(offlineIsBoundedBattle(b)){
    await offlineRunBoundedBattle(res, budgetMs);
    return res;
  }
  const loc = (typeof getLocObj === 'function') ? getLocObj(G.location) : null;
  if(!offlineCanWildBattle(loc)) return res;
  // Phase 32: unfreeze a K.O. resolution stuck in live mode (frozen tab).
  await offlineDrainStuckLiveKOs();
  const hadActiveChain = !!(b.active && !b.isChamp && !b.isTraining && b.chill);
  // Phase 30 (beta fix): never start an exploration out of thin air —
  // catch-up only replays what the player was actually doing on exit.
  //  - Tab left open: the chain is still active (b.active) -> continue it
  //    (the only case where starting is legitimate).
  //  - Game relaunched (battle state reset at boot): persistent flag
  //    G.wildSessionActive, updated on each saveGame and cleared on each
  //    battle end. Inactive on a route or in training = 0 battles.
  if(!hadActiveChain){
    if(!(G && G.wildSessionActive)) return res;
    if(!offlineStartWildSession(loc)) return res;
  }
  if(!b.enemyPoke) { try{ spawnNextWild(); }catch(_){} }
  if(b.playerPokeIdx == null || !G.team[b.playerPokeIdx] || G.team[b.playerPokeIdx].currentHP <= 0) {
    b.playerPokeIdx = (typeof firstAlive === 'function') ? firstAlive() : 0;
  }
  b.paused = false;
  const winsBefore = b.sessionWins || 0;
  const loop = await offlineRunBattleFfLoop(budgetMs, null, function(){
    const wonSoFar = (b.sessionWins || 0) - winsBefore;
    _offlineStageLabel = tr('offline_stage_battles_wins', { wins: wonSoFar });
  });
  res.secondsUsed = Math.round(loop.simMs / 1000);
  res.won = (b.sessionWins || 0) - winsBefore;
  if(res.won > 0 && G.mine && typeof G.mine.energy === 'number'){
    const maxE = G.mine.maxEnergy || 100;
    G.mine.energy = Math.min(maxE, G.mine.energy + 15 * res.won);
  }
  res.fights = res.won;
  res.lost = !b.active;
  return res;
}
// Phase 29 — legacy feature update
// updateTrainingSlots() is called every 100 ms live (dt = 100 x
// speed), with the full chain completeTrainingSlot -> rewards ->
// automation queue. We replay it as-is, UI frozen, with the same jump
 // Offline fast-forward and idle simulation rules
async function offlineFastForwardTraining(secondsBudget){
  const res = { sessions: 0, failures: 0, secondsUsed: 0 };
  if(typeof updateTrainingSlots !== 'function') return res;
  if(!Array.isArray(G.trainingSlots)) return res;
  const budgetMs = Math.max(0, secondsBudget * 1000);
  if(!budgetMs) return res;
  const hasActive = () => (G.trainingSlots || []).some(s => s && s.active && s.battle);
  // Comptage by rebind temporaire (same technique that the muting UI).
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
        if(!hasActive()) break; // empty queue: nothing left to train
      }
      const dt = 100 * ((typeof battle !== 'undefined' && battle && battle.speed) ? battle.speed : 1);
      // Saut analytique borne : between deux moves of no slot actif, has tick
      // not done that decrementer pCd/eCd → avance directe (bornee to the budget).
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
  // Phase 32: cut the ticker of any active battle (otherwise it double-ticks
  // during the fast-forward, including real waits).
  if(b && b.active && !b.isTraining){
    try{ stopBattleTimer('battle', b.timerId); }catch(_){ }
    b.timerId = null;
  }
}
// After the catch-up: restart the true ticker and resync the battle
// screen.
function offlineResumeChainAfterFastForward(){
  const b = (typeof battle !== 'undefined') ? battle : null;
  if(!b || !b.active || b.isTraining) return;
  b.paused = false;
  if(!b.timerId){ try{ b.timerId = appBattleTimer('battle', runBattleTick, 100); }catch(_){ } }
  try{
    const idleScreen = document.getElementById('battle-idle-screen');
    const activeScene = document.getElementById('battle-active-scene');
    if(idleScreen) idleScreen.style.display = 'none';
    if(activeScene){ activeScene.style.display = 'flex'; activeScene.classList.add('is-live'); } // wave 17 (DS2817)
  }catch(_){ }
  try{ updateBattleUI(); }catch(_){ }
  try{ renderMoveButtons(); renderEnemyMoveBars(); renderBattleTeamRow(); }catch(_){ }
}

// ─── progress panel + recap ─────────────────────────────────────────────
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
function closeAfkResultPanel(){ if(typeof offlineEngineApplying !== 'undefined' && offlineEngineApplying) return; const modal = document.getElementById('afk-result-modal'); if(modal) modal.classList.remove('open'); }
function offlineAfkViews(){
  // Wave 20 (ECS DS): the panel content is rendered from zero by
  // AfkRecapView — this adapter only shapes (localized) models.
  const views = (typeof PokeUI !== 'undefined' && PokeUI && PokeUI.views) ? PokeUI.views
    : ((typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null);
  if(!views || typeof views.AfkRecapView !== 'function') throw new Error('[ui] PokeUI views not loaded (AfkRecapView)');
  return views;
}
function offlineShowProgress(pct, infoText){
  // Phase 29: refresh driven by the REAL clock (OFFLINE_PAINT_MS cadence)
  // — before, the bar only repainted once every 40,000 ticks and the game
  // looked frozen for the whole computation.
  const now = Date.now();
  const p = Math.max(0, Math.min(100, Math.round((pct || 0) * 100)));
  const info = String(infoText || '');
  if(p === _offlineLastPaintPct && info === _offlineLastPaintInfo && (now - _offlineLastPaintAt) < OFFLINE_PAINT_MS) return;
  _offlineLastPaintPct = p; _offlineLastPaintInfo = info; _offlineLastPaintAt = now;
  const modal = ensureAfkResultPanel();
  _pwSetHtmlSafe(modal, offlineAfkViews().AfkRecapView.toHTML({
    mode: 'progress',
    title: t('offline_ff_title'),
    statusText: tr('afk_ff_progress', { pct: p }),
    pct: p,
    stageText: info,
  }));
  modal.classList.add('open');
}
// Etape courante of the calcul (segment of barre) — renseignee by offlineSimulate
// has each handler ; the boucles FF appellent offlineFfYield(fracLocale).
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
    await new Promise(r => setTimeout(r, 0)); // a real breath → the browser PAINTS the bar
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
 // Offline fast-forward and idle simulation rules
 // Offline fast-forward and idle simulation rules
 // Offline fast-forward and idle simulation rules
function offlineDaycareLevelSum(){
  let s = 0;
  const list = (G && G.hatchery) || [];
  for(let i = 0; i < list.length; i++){
    const slot = list[i];
    if(!slot || !slot.poke || slot.isFossil) continue;
    const mode = (G.hatcheryModes && G.hatcheryModes[i]) || slot.mode || 'exp';
    if(mode !== 'exp') continue; // incubation resets to level 1: excluded from the sum
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
// Wave 20: the recap rows reuse the session-summary components (same rows
// as the battle summary — no more afk-loot-card tiles). This adapter only
// maps the aggregated data to the view model (sprites/items fragments +
// localized labels).
function afkCaptureModels(captures){
  return groupAfkCaptures(captures || []).map((c) => ({
    spriteHtml: spriteImg(c.id, c.emoji, { shiny: c.shiny, size: 'standard' }),
    name: c.name,
    subLabel: c.dupes ? `${c.dupes} ${t('duplicate_short')}` : '',
    count: c.count,
    shiny: c.shiny,
  }));
}
function afkItemModels(items){
  return (items || []).map((it) => ({
    iconHtml: itemSpriteHtml(it.key, 48),
    name: getItemName(it.key),
    qty: it.qty,
  }));
}
function showAfkResultPanel(result){
  const modal = ensureAfkResultPanel();
  const titleKey = result.debug ? 'afk_panel_title_debug' : 'afk_panel_title_return';
  const statusKey = result.error ? 'afk_panel_status_error' : result.lost ? 'afk_panel_status_lost' : result.wins > 0 ? 'afk_panel_status_ok' : 'afk_panel_status_empty';
  const stat = (value, labelKey) => ({ value: value, label: t(labelKey) });
  const stats = [
    stat(formatPlayTime(result.timeMs || 0), 'afk_panel_duration'),
    stat(result.wins || 0, 'afk_panel_battles'),
    stat('+' + Number(result.money || 0).toLocaleString() + '₽', 'afk_panel_money'),
    stat(result.fainted || 0, 'afk_panel_team_ko'),
    stat(result.captures || 0, 'afk_panel_captures'),
    stat('+' + (result.energy || 0), 'afk_panel_energy'),
    stat(result.training || 0, 'afk_panel_training'),
    stat(result.mineDigs || 0, 'afk_panel_mine_digs'),
  ];
  if((result.daycareLevels || 0) > 0) stats.push(stat('+' + result.daycareLevels, 'afk_panel_daycare_levels'));
  if(result.boundedBattle) stats.push(stat(result.boundedBattle === 'won' ? '✔' : '✖', 'afk_panel_boss_battle'));
  _pwSetHtmlSafe(modal, offlineAfkViews().AfkRecapView.toHTML({
    mode: 'result',
    title: '⏱ ' + t(titleKey),
    statusText: t(statusKey),
    statusKind: (result.error || result.lost) ? 'danger' : (result.wins > 0 ? 'success' : 'info'),
    stats: stats,
    capturesTitle: t('captured_pokemon_title'),
    captures: afkCaptureModels(result.captureList || []),
    itemsTitle: t('found_items_title'),
    items: afkItemModels(result.items || []),
    emptyLabel: t('afk_none'),
    noteText: result.message || '',
    closeLabel: t('close'),
  }));
  modal.classList.add('open');
}

// ─── Orchestrateur ───────────────────────────────────────────────────────────
const OFFLINE_HANDLERS = {};
export const OfflineEngine = {
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
    await new Promise(r => setTimeout(r, 0)); // phase 29: let the browser PAINT the bar before grinding
  }
  offlineStopWildBattleTimer();
  const restoreUi = offlineMuteUi();
  const agg = {};
  try{
     // Offline fast-forward and idle simulation rules
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
      offlineStageProgress(1); // end of segment
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
      boundedBattle: battlesRes.bounded || null, // phase 32 : 'won' | 'lost' | null
    };
    const hasActivity = !!(result.wins > 0 || result.lost || result.captures > 0 || result.items.length > 0 || result.energy > 0 || result.training > 0 || result.mineDigs > 0 || result.money > 0 || result.daycareLevels > 0 || result.boundedBattle);
    offlineEngineApplying = false;
    if(agg._error){
      try{ showAfkResultPanel({ error: true, timeMs: capped, wins: 0, money: 0, fainted: 0, captures: 0, energy: 0, training: 0, mineDigs: 0, items: [], message: t('afk_error_resume') }); notify(t('afk_error_resume'), 'var(--red)'); }catch(_){ }
    } else if(wantRecap){
      try{ showAfkResultPanel(result); }catch(_){ }
    } else {
      const modal = typeof document !== 'undefined' ? document.getElementById('afk-result-modal') : null;
      if(modal && !modal.classList.contains('open')){
        try{ closeAfkResultPanel(); }catch(_){ }
      }
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
    try{ offlineLastHeartbeat = saveNow(); offlinePersistSeen(offlineLastHeartbeat); }catch(_){ }
    OfflineEngine._lastResult = result;
    return result;
  }
}

// ─── Handlers by defaut ─────────────────────────────────────────────────────
 // Offline fast-forward and idle simulation rules
OfflineEngine.register('wild-battles', async function(seconds){ return offlineFastForwardWildBattles(seconds); });
// Phase 29 — legacy feature update
// no per-tick overkill anymore: rounds are now played honestly,
// engine failures included, with an exact analytic jump between moves).
OfflineEngine.register('training', async function(seconds){ return offlineFastForwardTraining(seconds); });
// Mine: energy regeneration + auto extraction. When automation is
// active, regeneration is INTERLEAVED in the simulation (live fidelity:
// the +2/s ticker runs while the shovel consumes) — otherwise a closed
// formula.
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

// ─── Timeskip debug (30 min — passera by the futurs items of saut of temps) ─
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
if (typeof OfflineEngine !== 'undefined') { if (typeof window !== 'undefined') window.OfflineEngine = OfflineEngine; if (typeof globalThis !== 'undefined') globalThis.OfflineEngine = OfflineEngine; }
if (typeof offlineSimulate !== 'undefined') { if (typeof window !== 'undefined') window.offlineSimulate = offlineSimulate; if (typeof globalThis !== 'undefined') globalThis.offlineSimulate = offlineSimulate; }
if (typeof offlineScheduleCatchup !== 'undefined') { if (typeof window !== 'undefined') window.offlineScheduleCatchup = offlineScheduleCatchup; if (typeof globalThis !== 'undefined') globalThis.offlineScheduleCatchup = offlineScheduleCatchup; }
if (typeof offlinePollHeartbeat !== 'undefined') { if (typeof window !== 'undefined') window.offlinePollHeartbeat = offlinePollHeartbeat; if (typeof globalThis !== 'undefined') globalThis.offlinePollHeartbeat = offlinePollHeartbeat; }
if (typeof offlinePersistSeen !== 'undefined') { if (typeof window !== 'undefined') window.offlinePersistSeen = offlinePersistSeen; if (typeof globalThis !== 'undefined') globalThis.offlinePersistSeen = offlinePersistSeen; }
if (typeof offlineAcquireLock !== 'undefined') { if (typeof window !== 'undefined') window.offlineAcquireLock = offlineAcquireLock; if (typeof globalThis !== 'undefined') globalThis.offlineAcquireLock = offlineAcquireLock; }
if (typeof offlineFastForwardWildBattles !== 'undefined') { if (typeof window !== 'undefined') window.offlineFastForwardWildBattles = offlineFastForwardWildBattles; if (typeof globalThis !== 'undefined') globalThis.offlineFastForwardWildBattles = offlineFastForwardWildBattles; }
if (typeof offlineFastForwardTraining !== 'undefined') { if (typeof window !== 'undefined') window.offlineFastForwardTraining = offlineFastForwardTraining; if (typeof globalThis !== 'undefined') globalThis.offlineFastForwardTraining = offlineFastForwardTraining; }
if (typeof showAfkResultPanel !== 'undefined') { if (typeof window !== 'undefined') window.showAfkResultPanel = showAfkResultPanel; if (typeof globalThis !== 'undefined') globalThis.showAfkResultPanel = showAfkResultPanel; }
if (typeof closeAfkResultPanel !== 'undefined') { if (typeof window !== 'undefined') window.closeAfkResultPanel = closeAfkResultPanel; if (typeof globalThis !== 'undefined') globalThis.closeAfkResultPanel = closeAfkResultPanel; }
if (typeof debugTimeSkip30Minutes !== 'undefined') { if (typeof window !== 'undefined') window.debugTimeSkip30Minutes = debugTimeSkip30Minutes; if (typeof globalThis !== 'undefined') globalThis.debugTimeSkip30Minutes = debugTimeSkip30Minutes; }
if (typeof window !== 'undefined') window._offlineGetLastSim = () => _offlineLastSim;


// --- Exported globals ---
if (typeof countAfkTeamKo !== 'undefined') { if (typeof window !== 'undefined') window.countAfkTeamKo = countAfkTeamKo; if (typeof globalThis !== 'undefined') globalThis.countAfkTeamKo = countAfkTeamKo; }
if (typeof diffInventory !== 'undefined') { if (typeof window !== 'undefined') window.diffInventory = diffInventory; if (typeof globalThis !== 'undefined') globalThis.diffInventory = diffInventory; }
if (typeof diffSessionItems !== 'undefined') { if (typeof window !== 'undefined') window.diffSessionItems = diffSessionItems; if (typeof globalThis !== 'undefined') globalThis.diffSessionItems = diffSessionItems; }
if (typeof ensureAfkResultPanel !== 'undefined') { if (typeof window !== 'undefined') window.ensureAfkResultPanel = ensureAfkResultPanel; if (typeof globalThis !== 'undefined') globalThis.ensureAfkResultPanel = ensureAfkResultPanel; }
if (typeof groupAfkCaptures !== 'undefined') { if (typeof window !== 'undefined') window.groupAfkCaptures = groupAfkCaptures; if (typeof globalThis !== 'undefined') globalThis.groupAfkCaptures = groupAfkCaptures; }
if (typeof installOfflineHandlers !== 'undefined') { if (typeof window !== 'undefined') window.installOfflineHandlers = installOfflineHandlers; if (typeof globalThis !== 'undefined') globalThis.installOfflineHandlers = installOfflineHandlers; }
if (typeof offlineCanWildBattle !== 'undefined') { if (typeof window !== 'undefined') window.offlineCanWildBattle = offlineCanWildBattle; if (typeof globalThis !== 'undefined') globalThis.offlineCanWildBattle = offlineCanWildBattle; }
if (typeof offlineDaycareLevelSum !== 'undefined') { if (typeof window !== 'undefined') window.offlineDaycareLevelSum = offlineDaycareLevelSum; if (typeof globalThis !== 'undefined') globalThis.offlineDaycareLevelSum = offlineDaycareLevelSum; }
if (typeof offlineIsBoundedBattle !== 'undefined') { if (typeof window !== 'undefined') window.offlineIsBoundedBattle = offlineIsBoundedBattle; if (typeof globalThis !== 'undefined') globalThis.offlineIsBoundedBattle = offlineIsBoundedBattle; }
if (typeof offlineLockKey !== 'undefined') { if (typeof window !== 'undefined') window.offlineLockKey = offlineLockKey; if (typeof globalThis !== 'undefined') globalThis.offlineLockKey = offlineLockKey; }
if (typeof offlineMuteUi !== 'undefined') { if (typeof window !== 'undefined') window.offlineMuteUi = offlineMuteUi; if (typeof globalThis !== 'undefined') globalThis.offlineMuteUi = offlineMuteUi; }
if (typeof offlineReadSeen !== 'undefined') { if (typeof window !== 'undefined') window.offlineReadSeen = offlineReadSeen; if (typeof globalThis !== 'undefined') globalThis.offlineReadSeen = offlineReadSeen; }
if (typeof offlineResumeBattle !== 'undefined') { if (typeof window !== 'undefined') window.offlineResumeBattle = offlineResumeBattle; if (typeof globalThis !== 'undefined') globalThis.offlineResumeBattle = offlineResumeBattle; }
if (typeof offlineResumeChainAfterFastForward !== 'undefined') { if (typeof window !== 'undefined') window.offlineResumeChainAfterFastForward = offlineResumeChainAfterFastForward; if (typeof globalThis !== 'undefined') globalThis.offlineResumeChainAfterFastForward = offlineResumeChainAfterFastForward; }
if (typeof offlineShowProgress !== 'undefined') { if (typeof window !== 'undefined') window.offlineShowProgress = offlineShowProgress; if (typeof globalThis !== 'undefined') globalThis.offlineShowProgress = offlineShowProgress; }
if (typeof offlineStageProgress !== 'undefined') { if (typeof window !== 'undefined') window.offlineStageProgress = offlineStageProgress; if (typeof globalThis !== 'undefined') globalThis.offlineStageProgress = offlineStageProgress; }
if (typeof offlineStartWildSession !== 'undefined') { if (typeof window !== 'undefined') window.offlineStartWildSession = offlineStartWildSession; if (typeof globalThis !== 'undefined') globalThis.offlineStartWildSession = offlineStartWildSession; }
if (typeof offlineStopWildBattleTimer !== 'undefined') { if (typeof window !== 'undefined') window.offlineStopWildBattleTimer = offlineStopWildBattleTimer; if (typeof globalThis !== 'undefined') globalThis.offlineStopWildBattleTimer = offlineStopWildBattleTimer; }
if (typeof offlineSuspendBattle !== 'undefined') { if (typeof window !== 'undefined') window.offlineSuspendBattle = offlineSuspendBattle; if (typeof globalThis !== 'undefined') globalThis.offlineSuspendBattle = offlineSuspendBattle; }
if (typeof afkCaptureModels !== 'undefined') { if (typeof window !== 'undefined') window.afkCaptureModels = afkCaptureModels; if (typeof globalThis !== 'undefined') globalThis.afkCaptureModels = afkCaptureModels; }
if (typeof afkItemModels !== 'undefined') { if (typeof window !== 'undefined') window.afkItemModels = afkItemModels; if (typeof globalThis !== 'undefined') globalThis.afkItemModels = afkItemModels; }
if (typeof snapshotInventory !== 'undefined') { if (typeof window !== 'undefined') window.snapshotInventory = snapshotInventory; if (typeof globalThis !== 'undefined') globalThis.snapshotInventory = snapshotInventory; }
if (typeof snapshotSessionItems !== 'undefined') { if (typeof window !== 'undefined') window.snapshotSessionItems = snapshotSessionItems; if (typeof globalThis !== 'undefined') globalThis.snapshotSessionItems = snapshotSessionItems; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  offlineSimulate,
  offlineScheduleCatchup,
  offlinePollHeartbeat,
  offlinePersistSeen,
  offlineAcquireLock,
  offlineFastForwardWildBattles,
  offlineFastForwardTraining,
  showAfkResultPanel,
  closeAfkResultPanel,
  debugTimeSkip30Minutes,
  countAfkTeamKo,
  diffInventory,
  diffSessionItems,
  ensureAfkResultPanel,
  groupAfkCaptures,
  installOfflineHandlers,
  offlineCanWildBattle,
  offlineDaycareLevelSum,
  offlineIsBoundedBattle,
  offlineLockKey,
  offlineMuteUi,
  offlineReadSeen,
  offlineResumeBattle,
  offlineResumeChainAfterFastForward,
  offlineShowProgress,
  offlineStageProgress,
  offlineStartWildSession,
  offlineStopWildBattleTimer,
  offlineSuspendBattle,
  afkCaptureModels,
  afkItemModels,
  snapshotInventory,
  snapshotSessionItems,
};
