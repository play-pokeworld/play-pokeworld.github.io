import { pwLateLink } from '../../core/late-link.js';
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Shared async wait service (engine timer abstraction). globalThis-backed so
// concatenated VM harnesses, the offline engine's instant-wait patch and the
// classic boot all see ONE binding.
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
if (typeof globalThis !== 'undefined' && typeof globalThis.wait !== 'function') {
  globalThis.wait = (ms) => new Promise((r) => setTimeout(r, ms));
}
// startWildBattle / spawnNextWild are NOT defined here anymore: the wild
// spawn rule moved to the `world:encounter` ECS system
// (src/application/encounter-system.js, wave 33 §1.1). Both names keep their
// exact public surface, re-exposed from the application layer.

function startLegendaryEncounter(pokeId, level = 65, opts) {
  if (pwLateLink('hasActiveTrainingBattle') && hasActiveTrainingBattle()) {
    notify(t('training_in_progress_no_battle'), 'var(--red)');
    return false;
  }
  if (!G.team.length) {
    setMsg(t('no_pokemon_in_team'));
    return false;
  }
  if (typeof battle !== 'undefined' && battle && battle.active) {
    notify(t('battle_in_progress'), 'var(--red)');
    return false;
  }
  // Phase 20: fixed shiny encounters (Red Gyarados at the Lake of Rage,
  // GSC canon) force the sparkle — otherwise the usual rule applies (drugged
  // species / random).
  // BUG-01 (V7 P0a, 2026-10-14): the previous body referenced `enemy`, a
  // variable that exists nowhere → ReferenceError on EVERY legendary
  // encounter (main quest #31, all `rewardPoke` quests, Lugia/Ho-Oh…).
  // The shiny roll targets the species, the flags go on the created Pokémon.
  const isShiny = !!(opts && opts.shiny) || !!rollShiny(pokeId);
  const legPoke = createPoke(pokeId, level || 65, isShiny);
  if (!legPoke) return false;
  if (isShiny) {
    legPoke.shiny = true;
    legPoke.shinyActive = true;
    legPoke.shinyUnlocked = true;
  }
  legPoke.maxHP = Math.floor(legPoke.maxHP * 2.2);
  legPoke.currentHP = legPoke.maxHP;
  startBattle(legPoke, false);
  if (battle && battle.active) {
    // V7 · LEG-01 (D13) — plus de capture forcée (`legendaryCatch` supprimé) :
    //  • legendaryQuest : rencontre de fin de quête légendaire → taux de la Ball × 2
    //    (plafond 100 %), relançable tant que la quête n'est pas terminée ;
    //  • questGift      : Pokémon OFFERT par une quête (Évoli, Lokhlass, Porygon…,
    //    cadeaux dans les jeux officiels) → capture garantie, Ball consommée.
    battle.legendaryQuest = !!(opts && opts.legendaryQuest);
    battle.questGift = !!(opts && opts.questGift);
    battle.chill = false;
    battle.noAutoCatch = false;
    addBattleLog(
      tr('wild_legendary_appeared', { name: legPoke.name, level: legPoke.level || level || 65 })
    );
    return true;
  }
  return false;
}

async function onPlayerPokeFaint() {
  battle.paused = true;
  const p = getActivePlayerPoke();
  if (globalThis.pwEmit) globalThis.pwEmit('combat:player-fainted', { id: p && p.id }); // V7-R2 · SND-02
  // DORM-04 — Pouvoir d'Alchimie : un coéquipier hérite temporairement du
  // talent du Pokémon K.O. (le dernier tombé de l'équipe).
  try {
    if (p && p.talent) {
      for (const tp of G.team || []) {
        if (!tp || tp === p || Number(tp.currentHP ?? tp.hp ?? 1) <= 0) continue;
        const hasPoA = pwLateLink('hasTalent')
          ? hasTalent(tp, 'powerofalchemy')
          : tp.talent === 'powerofalchemy';
        if (hasPoA) {
          tp._tempTalent = p.talent;
          addBattleLog(`${tp.name} hérite du talent de ${p.name} (Pouvoir d'Alchimie) !`);
          break;
        }
      }
    }
  } catch (_) {}
  if (!battle.isChamp && !battle.isTraining)
    battle.sessionPlayerKOs = (battle.sessionPlayerKOs || 0) + 1;
  addBattleLog(tr('player_pokemon_ko', { name: p.name }));
  updateBattleUI();
  await wait(500);

  if (battle.isTraining) {
    addBattleLog(`<span class="pw-red">${t('training_failed_ko_log')}</span>`);
    notify(t('training_failed_ko_notify'), 'var(--red)');
    if (battle.trainee) battle.trainee.currentHP = battle.trainee.maxHP;
    await wait(1200);
    endBattle();
    return;
  }

  const nextAlive = G.team.findIndex((pk, i) => i !== battle.playerPokeIdx && pk.currentHP > 0);
  if (nextAlive === -1) {
    addBattleLog(`<span class="pw-red">${t('all_pokemon_ko_lost')}</span>`);
    // PASSE 32 — donjons : l'équipe entière est à terre, la descente s'arrête et
    // la MOITIÉ du sac d'expédition est perdue (péage remboursé au palier 1).
    try {
      if (pwLateLink('currentDungeonRun') && currentDungeonRun() && pwLateLink('dungeonOnWipe')) {
        const _w = dungeonOnWipe();
        if (_w) {
          addBattleLog(
            `<span class="pw-red">${tr('dungeon_log_wipe', { tokens: String(_w.kept.tokens), money: String(_w.kept.money), floor: String(_w.floor) })}</span>`
          );
          if (_w.refunded)
            addBattleLog(
              `<span class="pw-green">${tr('dungeon_log_refund', { toll: String(_w.refunded) })}</span>`
            );
        }
        if (pwLateLink('refreshDungeonPanel')) refreshDungeonPanel();
      }
    } catch (_) {}
    const penalty = Math.floor(G.money * 0.1);
    G.money -= penalty;
    updateHeader();
    addBattleLog(tr('money_lost', { money: penalty }));
    if (battle.isBaseNpcBattle) {
      // Phase 38: visitor blackout at a buddy's place -> owner record (w++).
      const npcName = battle.baseNpcName || '';
      const winQuote = (battle.baseNpcMsgs && battle.baseNpcMsgs.win) || '';
      if (typeof pwLateLink('baseEditorCreditBattle') === 'function') baseEditorCreditBattle(false);
      // Phase 52: battle-end panel (NPC victory quote).
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
        }, 1400);
      }
    }
    await wait(1200);
    endBattle();
    setMsg(t('battle_lost_recover'));
    return;
  }

  battle.playerPokeIdx = nextAlive;
  battle.playerMods = { atk: 1, def: 1, spe: 1 };
  battle.pMoveIdx = 0;
  addBattleLog(tr('go_pokemon', { name: G.team[nextAlive].name }));
  resetPlayerCd();
  updateBattleUI();
  renderMoveButtons();
  renderBattleTeamRow();
  await wait(300);
  resumeBattleActions();
}

// --- Migrated to ES module, globals exposed ---
if (typeof startLegendaryEncounter !== 'undefined') {
  if (typeof window !== 'undefined') window.startLegendaryEncounter = startLegendaryEncounter;
  if (typeof globalThis !== 'undefined')
    globalThis.startLegendaryEncounter = startLegendaryEncounter;
}
// spawnNextWild / startWildBattle: exposed by src/application/encounter-system.js (ECS).
// FIX (2026-08, crash on first K.O.): global exposure required by the
// ECS-driven battle loop (src/application/battle-loop.js, domain tick)
// (`typeof onPlayerPokeFaint === 'function'`) — otherwise a player K.O. froze the battle.
if (typeof onPlayerPokeFaint !== 'undefined') {
  if (typeof window !== 'undefined') window.onPlayerPokeFaint = onPlayerPokeFaint;
  if (typeof globalThis !== 'undefined') globalThis.onPlayerPokeFaint = onPlayerPokeFaint;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export { startLegendaryEncounter, onPlayerPokeFaint };
