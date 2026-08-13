// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Shared async wait service (engine timer abstraction). globalThis-backed so
// concatenated VM harnesses, the offline engine's instant-wait patch and the
// classic boot all see ONE binding.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseDialogNpcResult(...args) { const f = __pwV43Link('baseDialogNpcResult'); return f ? f(...args) : undefined; }
function baseEditorCreditBattle(...args) { const f = __pwV43Link('baseEditorCreditBattle'); return f ? f(...args) : undefined; }
if (typeof globalThis !== 'undefined' && typeof globalThis.wait !== 'function') {
  globalThis.wait = (ms) => new Promise((r) => setTimeout(r, ms));
}
// startWildBattle / spawnNextWild are NOT defined here anymore: the wild
// spawn rule moved to the `world:encounter` ECS system
// (src/application/encounter-system.js, wave 33 §1.1). Both names keep their
// exact public surface, re-exposed from the application layer.

function startLegendaryEncounter(pokeId, level=65, opts){
 if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return false; }
 if(!G.team.length){ setMsg(t('no_pokemon_in_team')); return false; }
 if(typeof battle !== 'undefined' && battle && battle.active){ notify(t('battle_in_progress'), 'var(--red)'); return false; }
 // Phase 20: fixed shiny encounters (Red Gyarados at the Lake of Rage,
 // GSC canon) force the sparkle — otherwise the usual rule applies (drugged
 // species / random).
 const isShiny = !!(opts && opts.shiny) || ((typeof rollShiny === 'function') ? rollShiny(enemy.id) : false);
  if (isShiny) {
    enemy.shiny = true;
    enemy.shinyActive = true;
    enemy.shinyUnlocked = true;
  }
 const legPoke = createPoke(pokeId, level || 65, isShiny);
 if(!legPoke) return false;
 legPoke.maxHP = Math.floor(legPoke.maxHP * 2.2);
 legPoke.currentHP = legPoke.maxHP;
 startBattle(legPoke, false);
 if(battle && battle.active){
  battle.legendaryCatch = true;
  battle.chill = false;
  battle.noAutoCatch = false;
  addBattleLog(tr('wild_legendary_appeared', {name:legPoke.name}));
  return true;
 }
 return false;
}


async function onPlayerPokeFaint(){
 battle.paused=true;
 const p=getActivePlayerPoke();
 if(!battle.isChamp && !battle.isTraining) battle.sessionPlayerKOs = (battle.sessionPlayerKOs||0) + 1;
 addBattleLog(tr('player_pokemon_ko', {name:p.name}));
 updateBattleUI();
 await wait(500);

 if(battle.isTraining){
 addBattleLog(`<span class="pw-red">${t('training_failed_ko_log')}</span>`);
 notify(t('training_failed_ko_notify'),'var(--red)');
 if(battle.trainee) battle.trainee.currentHP = battle.trainee.maxHP;
 await wait(1200);
 endBattle();
 return;
 }

 const nextAlive=G.team.findIndex((pk,i)=>i!==battle.playerPokeIdx&&pk.currentHP>0);
 if(nextAlive===-1){
 addBattleLog(`<span class="pw-red">${t('all_pokemon_ko_lost')}</span>`);
 const penalty=Math.floor(G.money*0.1);
 G.money-=penalty;
 updateHeader();
 addBattleLog(tr('money_lost', {money:penalty}));
 if(battle.isBaseNpcBattle){
 // Phase 38: visitor blackout at a buddy's place -> owner record (w++).
 const npcName = battle.baseNpcName || '';
 const winQuote = (battle.baseNpcMsgs && battle.baseNpcMsgs.win) || '';
 if(typeof __pwV43Link('baseEditorCreditBattle') === 'function') baseEditorCreditBattle(false);
 // Phase 52: battle-end panel (NPC victory quote).
 const npcRef = battle.baseNpcRef || null;
 const npcSprite = battle.baseNpcSprite || null;
 battle.isBaseNpcBattle = false;
 battle.baseNpcName = null;
 battle.baseNpcMsgs = null;
 battle.baseNpcRef = null;
 battle.baseNpcSprite = null;
 if(winQuote && typeof addBattleLog === 'function') addBattleLog('« ' + winQuote + ' » — ' + npcName);
 notify(tr('base.edit.battle_lost', {name:npcName}), 'var(--red)');
 if(typeof __pwV43Link('baseDialogNpcResult') === 'function'){
  setTimeout(()=>{ try{ baseDialogNpcResult({npc:npcRef, won:false, name:npcName, sprite:npcSprite, quote:winQuote}); }catch(_){} }, 1400);
 }
 }
 await wait(1200);
 endBattle();
 setMsg(t('battle_lost_recover'));
 return;
 }

 battle.playerPokeIdx=nextAlive;
 battle.playerMods={atk:1,def:1,spe:1};
 battle.pMoveIdx=0;
 addBattleLog(tr('go_pokemon', {name:G.team[nextAlive].name}));
 resetPlayerCd();
 updateBattleUI();
 renderMoveButtons();
 renderBattleTeamRow();
 await wait(300);
 resumeBattleActions();
}


// --- Migrated to ES module, globals exposed ---
if (typeof startLegendaryEncounter !== 'undefined') { if (typeof window !== 'undefined') window.startLegendaryEncounter = startLegendaryEncounter; if (typeof globalThis !== 'undefined') globalThis.startLegendaryEncounter = startLegendaryEncounter; }
// spawnNextWild / startWildBattle: exposed by src/application/encounter-system.js (ECS).
// FIX (2026-08, crash on first K.O.): global exposure required by the
// ECS-driven battle loop (src/application/battle-loop.js, domain tick)
// (`typeof onPlayerPokeFaint === 'function'`) — otherwise a player K.O. froze the battle.
if (typeof onPlayerPokeFaint !== 'undefined') { if (typeof window !== 'undefined') window.onPlayerPokeFaint = onPlayerPokeFaint; if (typeof globalThis !== 'undefined') globalThis.onPlayerPokeFaint = onPlayerPokeFaint; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  startLegendaryEncounter,
  onPlayerPokeFaint,
};

