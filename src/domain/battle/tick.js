/**
 * Domain — real-time battle tick (the ONE battle loop of the game).
 *
 * This module is the canonical, domain-level implementation of the live
 * battle loop: cooldown ticking, player/enemy actions, anomaly resolution
 * and entry talents. It is driven by the ECS world via the `combat:tick`
 * system (see src/application/ecs-gameplay-systems.js) through the real
 * gameplay world owned by src/application/battle-loop.js — the retired
 * classic copy src/game/combat/battle-tick.js was deleted once this module
 * reached strict behavioral parity (same damage, XP, capture and K.O.
 * outcomes, verified by the offline fast-forward VM suites: passe28,
 * passe30, passe32).
 *
 * All game hooks (G, battle, executeAttack, updateBattleUI…) are resolved
 * dynamically through globalThis, exactly like the legacy loop did, so the
 * module works unchanged in the browser, in node tests and inside the VM
 * sandboxes used by the integration suites.
 *
 * @module domain/battle/tick
 */

export function getActivePlayerPoke() {
  const battle = globalThis.battle || null;
  const G = globalThis.G || null;
  if (battle && battle.isTraining && battle.trainee) return battle.trainee;
  const team = G && Array.isArray(G.team) ? G.team : [];
  if (!battle) return null;
  return team[battle.playerPokeIdx || 0] || null;
}

function nextAliveIndex(team) {
  return team.findIndex((poke) => poke && Number(poke.currentHP ?? poke.hp ?? 1) > 0);
}

/**
 * Detect and repair inconsistent battle states before letting the loop
 * continue (missing/G.O. active fighter, missing enemy, champion chain…).
 * Returns true when an anomaly was handled (the caller then yields the
 * tick to the resolution flow).
 *
 * Parity notes (legacy loop, src/game/combat/battle-tick.js):
 *   - non-finite cooldowns are reset;
 *   - with no usable active Pokémon the battle switches to the next alive
 *     team member, or ends outright when nobody is left standing;
 *   - a missing enemy in a champion flow pulls the next ace, elsewhere the
 *     battle ends;
 *   - a fainted ENEMY is resolved before a fainted player fighter.
 */
export function resolveBattleStateAnomalies() {
  const b = globalThis.battle || null;
  const g = globalThis.G || null;
  if (!b || !b.active || b.resolvingKO) return false;
  if (!Number.isFinite(b.pCd) && typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
  if (!Number.isFinite(b.eCd) && typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
  const p = getActivePlayerPoke();
  const e = b.enemyPoke;
  const team = g && Array.isArray(g.team) ? g.team : [];
  const nextAlive = nextAliveIndex(team);

  if (!p) {
    if (nextAlive >= 0) {
      b.playerPokeIdx = nextAlive;
      if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
      if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
      if (typeof globalThis.renderMoveButtons === 'function') globalThis.renderMoveButtons();
      if (typeof globalThis.renderBattleTeamRow === 'function') globalThis.renderBattleTeamRow();
      return true;
    }
    if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    return true;
  }

  if (!e) {
    if (b.isChamp && Array.isArray(b.champTeam) && b.champPokeIdx < b.champTeam.length) {
      b.enemyPoke = b.champTeam[b.champPokeIdx];
      if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
      if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
      if (typeof globalThis.renderEnemyMoveBars === 'function') globalThis.renderEnemyMoveBars();
      if (typeof globalThis.renderBattleTeamRow === 'function') globalThis.renderBattleTeamRow();
      return true;
    }
    if (typeof globalThis.endBattle === 'function') globalThis.endBattle();
    return true;
  }

  // PASSE 35 — le gardien de donjon entre en furie sous 50 % de PV.
  // Sans effet hors combat de boss ; ne se déclenche qu'une fois.
  if (e.isDungeonBoss && typeof globalThis.dungeonBossTick === 'function') {
    try { globalThis.dungeonBossTick(); } catch (_) {}
  }

  if (Number(e.currentHP ?? e.hp ?? 1) <= 0) {
    b.resolvingKO = true;
    b.paused = true;
    if (typeof globalThis.onEnemyFaint === 'function') {
      Promise.resolve(globalThis.onEnemyFaint()).finally(() => {
        if (globalThis.battle) globalThis.battle.resolvingKO = false;
      });
    } else {
      b.resolvingKO = false;
    }
    return true;
  }
  if (Number(p.currentHP ?? p.hp ?? 1) <= 0) {
    b.resolvingKO = true;
    b.paused = true;
    if (typeof globalThis.onPlayerPokeFaint === 'function') {
      Promise.resolve(globalThis.onPlayerPokeFaint()).finally(() => {
        if (globalThis.battle) globalThis.battle.resolvingKO = false;
      });
    } else {
      b.resolvingKO = false;
    }
    return true;
  }
  return false;
}

/**
 * One battle tick: decay both cooldowns by the loop quantum (100 ms scaled
 * by the battle speed), refresh the move bars, then fire the player and
 * enemy actions whose cooldown elapsed. K.O. anomalies found along the way
 * take over and pause the loop until their async resolution completes.
 */
export function battleTick() {
  const b = globalThis.battle || null;
  if (!b || !b.active || b.paused || b.resolvingKO) return;
  if (resolveBattleStateAnomalies()) return;
  const dt = 100 * (b.speed || 1);
  b.pCd -= dt;
  b.eCd -= dt;

  if (typeof globalThis.updateMoveBars === 'function') globalThis.updateMoveBars();

  if (b.pCd <= 0) doPlayerMove();
  if (!b || !b.active || b.paused || b.resolvingKO) return;
  if (resolveBattleStateAnomalies()) return;
  if (b.eCd <= 0) doEnemyMove();
}

export function doPlayerMove() {
  const b = globalThis.battle || null;
  const p = getActivePlayerPoke();
  const e = b ? b.enemyPoke : null;
  if (!p || !e || p.currentHP <= 0 || e.currentHP <= 0) {
    resolveBattleStateAnomalies();
    if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
    return;
  }
  if (!Array.isArray(p.moves) || !p.moves.length) {
    if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
    return;
  }

  if (typeof globalThis.applyEndOfTurnStatus === 'function') globalThis.applyEndOfTurnStatus(p);

  // Tick down weather and terrain turns
  if (b) {
    if (b.weather && b.weather !== 'none' && b.weatherTurns !== Infinity) {
      b.weatherTurns = (b.weatherTurns || 1) - 1;
      if (b.weatherTurns <= 0) {
        const defW = b.defaultWeather || 'none';
        b.weather = defW;
        b.weatherTurns = defW === 'none' ? 0 : Infinity;
        if (typeof globalThis.addBattleLog === 'function') {
          const tr = typeof globalThis.t === 'function' ? globalThis.t : null;
          globalThis.addBattleLog(tr
            ? (defW !== 'none' ? tr('weather_restore_default') : tr('weather_back_to_normal'))
            : (defW !== 'none' ? 'Le climat d\'origine revient sur la zone.' : 'Le climat revient à la normale.'));
        }
      }
    }
    if (b.terrain && b.terrain !== 'none') {
      b.terrainTurns = (b.terrainTurns || 1) - 1;
      if (b.terrainTurns <= 0) {
        b.terrain = 'none';
        if (typeof globalThis.addBattleLog === 'function') {
          const tr = typeof globalThis.t === 'function' ? globalThis.t : null;
          globalThis.addBattleLog(tr ? tr('terrain_back_to_normal') : 'Le terrain redevient neutre.');
        }
      }
    }
  }
  if (p.currentHP <= 0) {
    if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
    resolveBattleStateAnomalies();
    return;
  }

  const canAct = typeof globalThis.handleStatusBeforeMove === 'function' ? globalThis.handleStatusBeforeMove(p, 'player') : true;
  if (canAct) {
    const mv = p.moves[b.pMoveIdx % p.moves.length];
    if (mv && mv.id) {
      b.pMoveIdx = (b.pMoveIdx + 1) % p.moves.length;
      b.lastPlayerMoveId = mv.id; // DORM-04 : cooldown = capacité UTILISÉE
      if (typeof globalThis.flashMoveFiring === 'function') globalThis.flashMoveFiring(mv.id, 'player');
      if (typeof globalThis.executeAttack === 'function') globalThis.executeAttack(p, e, mv.id, 'player');
    }
  }
  // DORM-06b — Cristal Z : attaque coordonnée tous les N tours (PokeChill).
  const _zHeld = (typeof globalThis.getHeldItemForPokemon === 'function') ? globalThis.getHeldItemForPokemon(p) : (p && p.heldItem);
  if (_zHeld && typeof globalThis.ITEMS !== 'undefined' && globalThis.ITEMS[_zHeld] && globalThis.ITEMS[_zHeld].category === 'z_crystal') {
    b.zTurns = (b.zTurns || 0) + 1;
    const _zQty = (typeof globalThis.G !== 'undefined' && globalThis.G.inventory) ? (globalThis.G.inventory[_zHeld] || 0) : 0;
    const _zLevel = (typeof globalThis.ItemEngine !== 'undefined' && globalThis.ItemEngine.getPowerLevel) ? globalThis.ItemEngine.getPowerLevel(_zQty) : 1;
    const _zPeriod = Math.max(8, 20 - 2 * _zLevel);
    if (b.zTurns >= _zPeriod) {
      b.zTurns = 0;
      if (typeof globalThis.executeZCrystalAttack === 'function') globalThis.executeZCrystalAttack(p, e, globalThis.ITEMS[_zHeld].zType);
    }
  }
  if (typeof globalThis.resetPlayerCd === 'function') globalThis.resetPlayerCd();
  if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
  resolveBattleStateAnomalies();
}

export function doEnemyMove() {
  const b = globalThis.battle || null;
  const p = getActivePlayerPoke();
  const e = b ? b.enemyPoke : null;
  if (!p || !e || p.currentHP <= 0 || e.currentHP <= 0) {
    resolveBattleStateAnomalies();
    if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
    return;
  }
  if (!Array.isArray(e.moves) || !e.moves.length) {
    if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
    return;
  }

  if (typeof globalThis.applyEndOfTurnStatus === 'function') globalThis.applyEndOfTurnStatus(e);
  if (e.currentHP <= 0) {
    if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
    resolveBattleStateAnomalies();
    return;
  }

  const canAct = typeof globalThis.handleStatusBeforeMove === 'function' ? globalThis.handleStatusBeforeMove(e, 'enemy') : true;
  if (canAct) {
    const mv = e.moves[b.eMoveIdx % e.moves.length];
    if (mv && mv.id) {
      b.eMoveIdx = (b.eMoveIdx + 1) % e.moves.length;
      b.lastEnemyMoveId = mv.id; // DORM-04 : cooldown = capacité UTILISÉE
      b.enemyTurnsOnField = (b.enemyTurnsOnField || 0) + 1; // DORM-06 — Chrono Ball
      if (typeof globalThis.flashMoveFiring === 'function') globalThis.flashMoveFiring(mv.id, 'enemy');
      if (typeof globalThis.executeAttack === 'function') globalThis.executeAttack(e, p, mv.id, 'enemy');
    }
  }
  if (typeof globalThis.resetEnemyCd === 'function') globalThis.resetEnemyCd();
  if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
  resolveBattleStateAnomalies();
}

export function triggerEntryTalents(side) {
  const b = globalThis.battle || null;
  if (!b || !b.active) return;
  const p = getActivePlayerPoke();
  const e = b.enemyPoke;
  if (!p || !e) return;

  function applyTalent(poke, isPlayer) {
    if (!poke) return;
    const hasTal = (t) => (typeof globalThis.hasTalent === 'function') ? globalThis.hasTalent(poke, t) : poke.talent === t;
    const log = typeof globalThis.addBattleLog === 'function' ? globalThis.addBattleLog : () => {};
    const tr = typeof globalThis.t === 'function' ? globalThis.t : null;
    // DORM-04 — Médic Nature : le statut est effacé à l'entrée/au switch.
    if (hasTal('naturalcure') && poke.status) { poke.status = null; poke.statusTurns = 0; log('[Talent] Médic Nature : ' + poke.name + ' est guéri !'); }
    // DORM-04 — Climatact : la météo invoquée dure 15 tours.
    const clim = (turns) => hasTal('climatact') ? 15 : turns;

    if (hasTal('intimidate')) {
      const target = isPlayer ? b.enemyPoke : getActivePlayerPoke();
      const targetHeld = target ? (typeof globalThis.getHeldItemForPokemon === 'function' ? globalThis.getHeldItemForPokemon(target) : target.heldItem) : null;
      const targetImmune = target && ((typeof globalThis.hasTalent === 'function' && (globalThis.hasTalent(target, 'fullmetalbody') || globalThis.hasTalent(target, 'hypercutter'))) || target.talent === 'fullmetalbody' || target.talent === 'hypercutter' || targetHeld === 'clear_amulet');
      if (!targetImmune) {
        if (isPlayer) { b.enemyMods.atk = Math.max(0.25, b.enemyMods.atk * 0.75); log('[Talent] Intimidation : baisse l\'Attaque adverse !'); }
        else { b.playerMods.atk = Math.max(0.25, b.playerMods.atk * 0.75); log('[Talent] Intimidation : baisse votre Attaque !'); }
      }
    }
    if (hasTal('regenerator')) {
      poke.currentHP = Math.min(poke.maxHP, poke.currentHP + Math.floor(poke.maxHP * 0.25));
      log(tr ? tr('regenerator_proc') : '[Talent] Régé-Force : ' + poke.name + ' récupère des PV !');
    }
    // DORM-06 — baies d'EV : à l'entrée, réduisent la stat correspondante de l'ennemi.
    try {
      if (typeof globalThis.berryHeld === 'function') {
        const bv = globalThis.berryHeld(poke);
        if (bv && bv.itm.category === 'entry_debuff') {
          if (typeof globalThis.pwStatChange === 'function') {
            if (bv.itm.stat === 'hp') {
              const tgt = isPlayer ? b.enemyPoke : getActivePlayerPoke();
              if (tgt) { tgt.maxHP = Math.max(1, Math.floor(tgt.maxHP * 0.85)); tgt.currentHP = Math.min(tgt.currentHP, tgt.maxHP); }
            } else {
              globalThis.pwStatChange(isPlayer ? 'enemy' : 'player', bv.itm.stat, 0.85, { poke: isPlayer ? b.enemyPoke : getActivePlayerPoke() });
            }
            log('[Baie] ' + poke.name + ' affaiblit l\'adversaire (' + bv.key + ') !');
          }
        }
      }
    } catch (_) {}
    // DORM-04 — Regard Intimidant : −50 % d'Attaque Spéciale adverse à l'entrée.
    if (hasTal('dauntinglook')) {
      if (typeof globalThis.pwStatChange === 'function') {
        globalThis.pwStatChange(isPlayer ? 'enemy' : 'player', 'spa', 0.5, { poke: isPlayer ? b.enemyPoke : getActivePlayerPoke() });
      } else {
        if (isPlayer) b.enemyMods.spa = Math.max(0.25, (b.enemyMods.spa || 1) * 0.5);
        else b.playerMods.spa = Math.max(0.25, (b.playerMods.spa || 1) * 0.5);
      }
      log('[Talent] Regard Intimidant : l\'Attaque Spéciale adverse chute !');
    }
    if (hasTal('drizzle')) { b.weather = 'rainy'; b.weatherTurns = clim(poke.heldItem === 'damp_rock' ? 8 : 5); log(tr ? tr('drizzle_proc') : '[Talent] Crachin : ' + poke.name + ' invoque la pluie !'); }
    if (hasTal('drought')) { b.weather = 'sunny'; b.weatherTurns = clim(poke.heldItem === 'heat_rock' ? 8 : 5); log(tr ? tr('drought_proc') : '[Talent] Sécheresse : ' + poke.name + ' invoque le soleil !'); }
    if (hasTal('sandstream')) { b.weather = 'sand'; b.weatherTurns = clim(poke.heldItem === 'smooth_rock' ? 8 : 5); log(tr ? tr('sandstream_proc') : '[Talent] Sable Volant : ' + poke.name + ' invoque une tempête de sable !'); }
    if (hasTal('snowwarning')) { b.weather = 'hail'; b.weatherTurns = clim(poke.heldItem === 'icy_rock' ? 8 : 5); log(tr ? tr('snowwarning_proc') : '[Talent] Alerte Neige : ' + poke.name + ' invoque la grêle !'); }
    if (hasTal('somberfield')) { b.weather = 'somber'; b.weatherTurns = clim(5); log('[Talent] Champ Sombre : ' + poke.name + ' étend un champ sombre !'); }
    if (hasTal('electricsurge')) { b.terrain = 'electric'; b.terrainTurns = poke.heldItem === 'terrain_extender' ? 8 : 5; log(tr ? tr('electricsurge_proc') : '[Talent] Créa-Élec : ' + poke.name + ' active un Champ Électrique !'); }
    if (hasTal('grassysurge')) { b.terrain = 'grassy'; b.terrainTurns = poke.heldItem === 'terrain_extender' ? 8 : 5; log(tr ? tr('grassysurge_proc') : '[Talent] Créa-Herbe : ' + poke.name + ' active un Champ Herbeux !'); }
    if (hasTal('mistysurge')) { b.terrain = 'misty'; b.terrainTurns = poke.heldItem === 'terrain_extender' ? 8 : 5; log(tr ? tr('mistysurge_proc') : '[Talent] Créa-Brum : ' + poke.name + ' active un Champ Brumeux !'); }
    if (hasTal('psychicsurge')) { b.terrain = 'psychic'; b.terrainTurns = poke.heldItem === 'terrain_extender' ? 8 : 5; log(tr ? tr('psychicsurge_proc') : '[Talent] Créa-Psy : ' + poke.name + ' active un Champ Psychique !'); }
    if (hasTal('chlorophyll') && (b.weather === 'sunny' || b.weather === 'sun')) { log('[Talent] Chlorophylle : Vitesse de ' + poke.name + ' augmentée sous le soleil !'); }
    if (hasTal('swiftswim') && (b.weather === 'rainy' || b.weather === 'rain')) { log('[Talent] Glissade : Vitesse de ' + poke.name + ' augmentée sous la pluie !'); }
    if (hasTal('sandrush') && (b.weather === 'sand' || b.weather === 'sandstorm')) { log('[Talent] Rush Sable : Vitesse de ' + poke.name + ' augmentée dans la tempête !'); }
    if (hasTal('slushrush') && (b.weather === 'hail' || b.weather === 'snow')) { log('[Talent] Chasse-Neige : Vitesse de ' + poke.name + ' augmentée sous la grêle !'); }
    if (hasTal('speedboost')) { log('[Talent] Turbo : La Vitesse de ' + poke.name + ' augmente à chaque tour !'); }
  }

  if (side === 'player' || side === 'both') applyTalent(p, true);
  if (side === 'enemy' || side === 'both') applyTalent(e, false);
  if (typeof globalThis.updateBattleUI === 'function') globalThis.updateBattleUI();
}



