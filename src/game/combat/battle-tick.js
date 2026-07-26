// battle-tick.js - Legacy battle tick, talent triggers, and battle loop
// Full rebuild from domain/battle/tick.js for script-loaded compatibility
// Contains: battleTick, doPlayerMove, doEnemyMove, triggerEntryTalents, etc.

function getActivePlayerPoke() {
  var g = (typeof G !== 'undefined') ? G : null;
  var b = (typeof battle !== 'undefined') ? battle : null;
  if (b && b.isTraining && b.trainee) return b.trainee;
  if (g && g.team && b) return g.team[b.playerPokeIdx || 0] || null;
  return null;
}

function resolveBattleStateAnomalies() {
  var g = (typeof G !== 'undefined') ? G : null;
  var b = (typeof battle !== 'undefined') ? battle : null;
  if (!b || !b.active || b.resolvingKO) return false;
  if (!Number.isFinite(b.pCd) && typeof resetPlayerCd === 'function') resetPlayerCd();
  if (!Number.isFinite(b.eCd) && typeof resetEnemyCd === 'function') resetEnemyCd();
  var p = getActivePlayerPoke();
  var e = b.enemyPoke;
  var nextAlive = g && g.team ? g.team.findIndex(function(pk){ return pk && pk.currentHP > 0; }) : -1;

  if (!p) {
    if (nextAlive >= 0) {
      b.playerPokeIdx = nextAlive;
      if (typeof resetPlayerCd === 'function') resetPlayerCd();
      if (typeof updateBattleUI === 'function') updateBattleUI();
      if (typeof renderMoveButtons === 'function') renderMoveButtons();
      if (typeof renderBattleTeamRow === 'function') renderBattleTeamRow();
      return true;
    }
    if (typeof endBattle === 'function') endBattle();
    return true;
  }

  if (!e) {
    if (b.isChamp && Array.isArray(b.champTeam) && b.champPokeIdx < b.champTeam.length) {
      b.enemyPoke = b.champTeam[b.champPokeIdx];
      if (typeof resetEnemyCd === 'function') resetEnemyCd();
      if (typeof updateBattleUI === 'function') updateBattleUI();
      if (typeof renderEnemyMoveBars === 'function') renderEnemyMoveBars();
      if (typeof renderBattleTeamRow === 'function') renderBattleTeamRow();
      return true;
    }
    if (typeof endBattle === 'function') endBattle();
    return true;
  }

  if (e.currentHP <= 0) {
    b.resolvingKO = true;
    b.paused = true;
    if (typeof onEnemyFaint === 'function') {
      Promise.resolve(onEnemyFaint()).finally(function(){
        if (typeof battle !== 'undefined' && battle) battle.resolvingKO = false;
      });
    } else { b.resolvingKO = false; }
    return true;
  }
  if (p.currentHP <= 0) {
    b.resolvingKO = true;
    b.paused = true;
    if (typeof onPlayerPokeFaint === 'function') {
      Promise.resolve(onPlayerPokeFaint()).finally(function(){
        if (typeof battle !== 'undefined' && battle) battle.resolvingKO = false;
      });
    } else { b.resolvingKO = false; }
    return true;
  }
  return false;
}

function battleTick() {
  var b = (typeof battle !== 'undefined') ? battle : null;
  if (!b || !b.active || b.paused || b.resolvingKO) return;
  if (resolveBattleStateAnomalies()) return;
  var dt = 100 * (b.speed || 1);
  b.pCd -= dt;
  b.eCd -= dt;

  if (typeof updateMoveBars === 'function') updateMoveBars();

  if (b.pCd <= 0) doPlayerMove();
  if (!b || !b.active || b.paused || b.resolvingKO) return;
  if (resolveBattleStateAnomalies()) return;
  if (b.eCd <= 0) doEnemyMove();
}

function doPlayerMove() {
  var b = (typeof battle !== 'undefined') ? battle : null;
  var p = getActivePlayerPoke();
  var e = b ? b.enemyPoke : null;
  if (!p || !e || p.currentHP <= 0 || e.currentHP <= 0) {
    resolveBattleStateAnomalies();
    if (typeof resetPlayerCd === 'function') resetPlayerCd();
    return;
  }
  if (!Array.isArray(p.moves) || !p.moves.length) {
    if (typeof resetPlayerCd === 'function') resetPlayerCd();
    return;
  }

  if (typeof applyEndOfTurnStatus === 'function') applyEndOfTurnStatus(p);

  // Tick down weather and terrain turns
  if (b) {
    if (b.weather && b.weather !== 'none') {
      b.weatherTurns = (b.weatherTurns || 1) - 1;
      if (b.weatherTurns <= 0) {
        b.weather = 'none';
        if (typeof addBattleLog === 'function') addBattleLog((typeof t === 'function' ? t('weather_back_to_normal') : 'Le climat revient à la normale.'));
      }
    }
    if (b.terrain && b.terrain !== 'none') {
      b.terrainTurns = (b.terrainTurns || 1) - 1;
      if (b.terrainTurns <= 0) {
        b.terrain = 'none';
        if (typeof addBattleLog === 'function') addBattleLog((typeof t === 'function' ? t('terrain_back_to_normal') : 'Le terrain redevient neutre.'));
      }
    }
  }
  if (p.currentHP <= 0) {
    if (typeof updateBattleUI === 'function') updateBattleUI();
    resolveBattleStateAnomalies();
    return;
  }

  var canAct = typeof handleStatusBeforeMove === 'function' ? handleStatusBeforeMove(p, 'player') : true;
  if (canAct) {
    var mv = p.moves[b.pMoveIdx % p.moves.length];
    if (mv && mv.id) {
      b.pMoveIdx = (b.pMoveIdx + 1) % p.moves.length;
      if (typeof flashMoveFiring === 'function') flashMoveFiring(mv.id, 'player');
      if (typeof executeAttack === 'function') executeAttack(p, e, mv.id, 'player');
    }
  }
  if (typeof resetPlayerCd === 'function') resetPlayerCd();
  if (typeof updateBattleUI === 'function') updateBattleUI();
  resolveBattleStateAnomalies();
}

function doEnemyMove() {
  var b = (typeof battle !== 'undefined') ? battle : null;
  var p = getActivePlayerPoke();
  var e = b ? b.enemyPoke : null;
  if (!p || !e || p.currentHP <= 0 || e.currentHP <= 0) {
    resolveBattleStateAnomalies();
    if (typeof resetEnemyCd === 'function') resetEnemyCd();
    return;
  }
  if (!Array.isArray(e.moves) || !e.moves.length) {
    if (typeof resetEnemyCd === 'function') resetEnemyCd();
    return;
  }

  if (typeof applyEndOfTurnStatus === 'function') applyEndOfTurnStatus(e);
  if (e.currentHP <= 0) {
    if (typeof updateBattleUI === 'function') updateBattleUI();
    resolveBattleStateAnomalies();
    return;
  }

  var canAct = typeof handleStatusBeforeMove === 'function' ? handleStatusBeforeMove(e, 'enemy') : true;
  if (canAct) {
    var mv = e.moves[b.eMoveIdx % e.moves.length];
    if (mv && mv.id) {
      b.eMoveIdx = (b.eMoveIdx + 1) % e.moves.length;
      if (typeof flashMoveFiring === 'function') flashMoveFiring(mv.id, 'enemy');
      if (typeof executeAttack === 'function') executeAttack(e, p, mv.id, 'enemy');
    }
  }
  if (typeof resetEnemyCd === 'function') resetEnemyCd();
  if (typeof updateBattleUI === 'function') updateBattleUI();
  resolveBattleStateAnomalies();
}

function triggerEntryTalents(side) {
  var b = (typeof battle !== 'undefined') ? battle : null;
  if (!b || !b.active) return;
  var p = getActivePlayerPoke();
  var e = b.enemyPoke;
  if (!p || !e) return;

  function applyTalent(poke, isPlayer) {
    if (!poke) return;
    var t = poke.talent;
    var log = typeof addBattleLog === 'function' ? addBattleLog : function(){};

    if (t === 'intimidate') {
      if (isPlayer) { b.enemyMods.atk = Math.max(0.25, b.enemyMods.atk * 0.75); log('[Talent] Intimidation : baisse l\'Attaque adverse !'); }
      else { b.playerMods.atk = Math.max(0.25, b.playerMods.atk * 0.75); log('[Talent] Intimidation : baisse votre Attaque !'); }
    } else if (t === 'regenerator') {
      poke.currentHP = Math.min(poke.maxHP, poke.currentHP + Math.floor(poke.maxHP * 0.25));
      log((typeof t === 'function' ? t('regenerator_proc') : '[Talent] Régé-Force : ' + poke.name + ' récupère des PV !'));
    } else if (t === 'drizzle') { b.weather = 'rain'; b.weatherTurns = poke.heldItem === 'damp_rock' ? 8 : 5; log((typeof t === 'function' ? t('drizzle_proc') : '[Talent] Crachin : ' + poke.name + ' invoque la pluie !')); }
    else if (t === 'drought') { b.weather = 'sunny'; b.weatherTurns = poke.heldItem === 'heat_rock' ? 8 : 5; log((typeof t === 'function' ? t('drought_proc') : '[Talent] Sécheresse : ' + poke.name + ' invoque le soleil !')); }
    else if (t === 'sandstream') { b.weather = 'sandstorm'; b.weatherTurns = poke.heldItem === 'smooth_rock' ? 8 : 5; log((typeof t === 'function' ? t('sandstream_proc') : '[Talent] Sable Volant : ' + poke.name + ' invoque une tempête de sable !')); }
    else if (t === 'snowwarning') { b.weather = 'hail'; b.weatherTurns = poke.heldItem === 'icy_rock' ? 8 : 5; log((typeof t === 'function' ? t('snowwarning_proc') : '[Talent] Alerte Neige : ' + poke.name + ' invoque la grêle !')); }
    else if (t === 'electricsurge') { b.terrain = 'electric'; b.terrainTurns = poke.heldItem === 'terrain_extender' ? 8 : 5; log((typeof t === 'function' ? t('electricsurge_proc') : '[Talent] Créa-Élec : ' + poke.name + ' active un Champ Électrique !')); }
    else if (t === 'grassysurge') { b.terrain = 'grassy'; b.terrainTurns = poke.heldItem === 'terrain_extender' ? 8 : 5; log((typeof t === 'function' ? t('grassysurge_proc') : '[Talent] Créa-Herbe : ' + poke.name + ' active un Champ Herbeux !')); }
    else if (t === 'mistysurge') { b.terrain = 'misty'; b.terrainTurns = poke.heldItem === 'terrain_extender' ? 8 : 5; log((typeof t === 'function' ? t('mistysurge_proc') : '[Talent] Créa-Brum : ' + poke.name + ' active un Champ Brumeux !')); }
    else if (t === 'psychicsurge') { b.terrain = 'psychic'; b.terrainTurns = poke.heldItem === 'terrain_extender' ? 8 : 5; log((typeof t === 'function' ? t('psychicsurge_proc') : '[Talent] Créa-Psy : ' + poke.name + ' active un Champ Psychique !')); }
  }

  if (side === 'player' || side === 'both') applyTalent(p, true);
  if (side === 'enemy' || side === 'both') applyTalent(e, false);
  if (typeof updateBattleUI === 'function') updateBattleUI();
}

// Expose globally
if (typeof window !== 'undefined') {
  window.getActivePlayerPoke = getActivePlayerPoke;
  window.resolveBattleStateAnomalies = resolveBattleStateAnomalies;
  window.triggerEntryTalents = triggerEntryTalents;
  window.battleTick = battleTick;
  window.doPlayerMove = doPlayerMove;
  window.doEnemyMove = doEnemyMove;
}
