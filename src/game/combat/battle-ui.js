// battle-ui.js — Legacy battle UI (updateBattleUI, renderMoveButtons, setBattleSpeed, etc.)
// Battle UI - combat interface display functions

var _battleViewSnapshot = '';

function getActivePlayerPoke() {
  var g = (typeof G !== 'undefined') ? G : null;
  var b = (typeof battle !== 'undefined') ? battle : null;
  if (b && b.isTraining && b.trainee) return b.trainee;
  return g && g.team && b ? g.team[b.playerPokeIdx || 0] || null : null;
}

function getBattleViewSnapshot() {
  var g = (typeof G !== 'undefined') ? G : null;
  var b = (typeof battle !== 'undefined') ? battle : null;
  var enemy = b && b.enemyPoke ? b.enemyPoke : null;
  var team = b && b.isTraining && b.trainee ? [b.trainee] : g ? g.team || [] : [];
  try {
    return JSON.stringify({
      enemy: enemy ? [enemy.uid || enemy.id, enemy.id, enemy.level, enemy.shinyActive, enemy.status, enemy.talent, (enemy.moves || []).map(function(m){ return m.id; }).join(',')] : null,
      active: b ? b.playerPokeIdx : 0,
      training: !!(b && b.isTraining),
      trainer: b ? [b.champId || '', b.isQuestTrainerBattle || false, b.questTrainerBattleId || '', b.isAtollBattle || false, b.atollMode || '', b.trainerVisual ? (b.trainerVisual.name || '') + ':' + (b.trainerVisual.role || '') + ':' + (b.trainerVisual.style || []).join(',') : ''] : null,
      weather: b ? ((b.weather || 'none') + ':' + (b.weatherTurns || 0)) : 'none:0',
      terrain: b ? ((b.terrain || 'none') + ':' + (b.terrainTurns || 0)) : 'none:0',
      team: team.map(function(p){ return p ? [p.uid || p.id, p.id, p.level, p.shinyActive, p.status, p.heldItem || '', (p.moves || []).map(function(mv){ return mv.id; }).join(','), p.currentHP <= 0] : null; })
    });
  } catch(_) {
    return String(Date.now());
  }
}

function updatePokemonCardDynamicState(card, pokemon) {
  if (!card || !pokemon) return;
  var pct = pokemon.maxHP ? Math.max(0, Math.min(1, pokemon.currentHP / pokemon.maxHP)) : 0;
  var hpClass = pct > 0.5 ? 'high' : pct > 0.2 ? 'medium' : 'low';
  var hpFill = card.querySelector('.hp-fill');
  if (hpFill) {
    hpFill.style.width = (pct * 100) + '%';
    hpFill.classList.toggle('high', hpClass === 'high');
    hpFill.classList.toggle('medium', hpClass === 'medium');
    hpFill.classList.toggle('low', hpClass === 'low');
  }
  var hpText = card.querySelector('.hp-text');
  if (hpText) hpText.textContent = pokemon.currentHP + '/' + pokemon.maxHP + ' ' + (typeof t === 'function' ? t('stat_hp_short') || (typeof t==='function'?t('stat_hp_short')||'PV':'PV') : (typeof t==='function'?t('stat_hp_short')||'PV':'PV'));
  var levelText = card.querySelector('.poke-level');
  if (levelText) levelText.textContent = (typeof t === 'function' ? t('level_abbrev') || (typeof t==='function'?t('level_abbrev')||'Nv.':'Nv.') : (typeof t==='function'?t('level_abbrev')||'Nv.':'Nv.')) + pokemon.level;
  card.classList.toggle('fainted', pokemon.currentHP <= 0);
  var xpFill = card.querySelector('.xp-fill');
  if (xpFill && typeof xpForLevel === 'function') {
    var curBase = xpForLevel(pokemon.level);
    var xpInLevel = Math.max(0, (pokemon.xp || 0) - curBase);
    var xpReqLevel = Math.max(1, (pokemon.xpNext || 1) - curBase);
    xpFill.style.width = Math.min(100, (xpInLevel / xpReqLevel) * 100) + '%';
  }
}

function updateBattleDynamicState() {
  var b = (typeof battle !== 'undefined') ? battle : null;
  var g = (typeof G !== 'undefined') ? G : null;
  var row = document.getElementById('battle-team-row');
  if (!row) return false;
  var cards = Array.from(row.querySelectorAll('.poke-card'));
  if (!cards.length) return false;
  var index = 0;
  if (b && b.enemyPoke) updatePokemonCardDynamicState(cards[index++], b.enemyPoke);
  if (b && b.isTraining && b.trainee) { updatePokemonCardDynamicState(cards[index], b.trainee); return true; }
  for (var i = 0; i < (g.team || []).length; i++) { updatePokemonCardDynamicState(cards[index++], g.team[i]); }
  return true;
}

function updateBattleUI() {
  var b = (typeof battle !== 'undefined') ? battle : null;
  var p = getActivePlayerPoke();
  var e = b ? b.enemyPoke : null;
  if (!p || !e) return;
  var nextSnapshot = getBattleViewSnapshot();
  if (nextSnapshot !== _battleViewSnapshot || !updateBattleDynamicState()) {
    _battleViewSnapshot = nextSnapshot;
    if (typeof renderBattleTeamRow === 'function') renderBattleTeamRow();
    updateBattleDynamicState();
    updateMoveBars();
  } else {
    updateBattleDynamicState();
    updateMoveBars();
  }
  try {
    var modal = document.getElementById('battle-summary-modal');
    if (modal && modal.classList.contains('open') && typeof renderBattleSummary === 'function') renderBattleSummary();
  } catch(_) {}
}

function renderMoveButtons() {
  var b = (typeof battle !== 'undefined') ? battle : null;
  var container = document.getElementById('move-buttons');
  if (!container) return;
  var p = getActivePlayerPoke();
  if (!p) { container.innerHTML = ''; return; }
  var nextIdx = (b.pMoveIdx || 0) % p.moves.length;
  var getMoveNameFn = typeof getMoveName === 'function' ? getMoveName : function(id){ return id; };
  var typeEffFn = typeof typeEff === 'function' ? typeEff : function(){ return 1; };

  container.innerHTML = p.moves.map(function(m, i) {
    var mv = (typeof MOVES !== 'undefined') ? MOVES[m.id] : null;
    if (!mv) return '';
    var eff = b.enemyPoke ? typeEffFn(mv.type, b.enemyPoke.type1, b.enemyPoke.type2) : 1;
    var effHint = eff === 0 ? ' '+(typeof t==='function'?t('eff_immune'):'×0') : eff >= 4 ? ' '+(typeof t==='function'?t('eff_4x'):'×4') : eff >= 2 ? ' '+(typeof t==='function'?t('eff_2x'):'×2') : eff <= 0.25 ? ' '+(typeof t==='function'?t('eff_quarter'):'×¼') : eff <= 0.5 ? ' '+(typeof t==='function'?t('eff_half'):'×½') : ' '+(typeof t==='function'?t('eff_1x'):'×1');
    var isNext = i === nextIdx;
    return '<div class="auto-move' + (isNext ? ' next-up' : '') + ' type-' + (mv.type || '').toLowerCase() + '" data-move-id="' + m.id + '" data-idx="' + i + '" data-context-call="openMoveInfo" data-context-args="\'' + m.id + '\',-1" title="' + (typeof t === 'function' ? t('context_info_touch') || '' : '') + '">' +
      '<div class="am-top"><span>' + (i+1) + '. ' + getMoveNameFn(m.id) + ' ' + effHint + '</span><span class="am-type type-' + (mv.type || '').toLowerCase() + '">' + (typeof getTypeName==='function'?getTypeName(mv.type):mv.type) + '</span></div>' +
      '<div class="am-bar-bg"><div class="am-bar-fill"></div></div></div>';
  }).join('');
  updateMoveBars();
}

function updateMoveBars() {
  var b = (typeof battle !== 'undefined') ? battle : null;
  var p = getActivePlayerPoke();
  var e = b ? b.enemyPoke : null;
  var TYPE_COLORS = (typeof window !== 'undefined' && window.TYPE_COLORS) || {};
  var MOVES = (typeof window !== 'undefined' && window.MOVES) || {};
  var clampFn = typeof clamp === 'function' ? clamp : function(v, min, max){ return Math.min(max, Math.max(min, v)); };

  if (p && p.moves && p.moves.length) {
    var nextIdx = (b.pMoveIdx || 0) % p.moves.length;
    var pct = b.pCdMax ? clampFn(100 - (b.pCd / b.pCdMax) * 100, 0, 100) : 0;
    var activeMove = p.moves[nextIdx];
    var mvTypeColor = TYPE_COLORS[MOVES[activeMove?.id]?.type] || '#3db5c8';

    document.querySelectorAll('#battle-team-row .poke-card .poke-move').forEach(function(el) {
      var card = el.closest('.poke-card');
      if (!card || !card.classList.contains('active')) return;
      var moveIdx = Array.from(el.parentElement.children).indexOf(el);
      var isNext = moveIdx === nextIdx;
      el.classList.toggle('ready', isNext && pct >= 99);
      el.style.setProperty('--charge-pct', (isNext ? pct : 0) + '%');
      if (isNext) el.style.setProperty('--charge-color', mvTypeColor + '66');
    });

    document.querySelectorAll('#move-buttons .auto-move').forEach(function(el, idx) {
      var isNext = idx === nextIdx;
      var barFill = el.querySelector('.am-bar-fill');
      if (barFill) { barFill.style.width = (isNext ? pct : 0) + '%'; barFill.style.background = isNext ? mvTypeColor : 'var(--dark1)'; }
      el.style.setProperty('--charge-color', isNext ? mvTypeColor + '66' : 'rgba(148,136,107,0.4)');
    });
  }

  if (e && e.moves && e.moves.length) {
    var nextIdx = (b.eMoveIdx || 0) % e.moves.length;
    var pct = b.eCdMax ? clampFn(100 - (b.eCd / b.eCdMax) * 100, 0, 100) : 0;
    var activeMove = e.moves[nextIdx];
    var mvTypeColor = TYPE_COLORS[MOVES[activeMove?.id]?.type] || '#d3524b';

    var enemyCard = document.querySelector('#battle-team-row .poke-card:not(.active)');
    if (enemyCard) {
      enemyCard.querySelectorAll('.poke-move').forEach(function(el, idx) {
        var isNext = idx === nextIdx;
        el.classList.toggle('ready', isNext && pct >= 99);
        el.style.setProperty('--charge-pct', (isNext ? pct : 0) + '%');
        if (isNext) el.style.setProperty('--charge-color', mvTypeColor + '66');
      });
    }
  }
}

function flashMoveFiring(moveId, side) {
  var sel = side === 'enemy' ? '#battle-team-row .poke-card:first-child .poke-move' : '#battle-team-row .poke-card.active .poke-move';
  var getMoveNameFn = typeof getMoveName === 'function' ? getMoveName : function(id){ return id; };
  document.querySelectorAll(sel).forEach(function(el) {
    if (el.dataset.moveId == moveId || (el.textContent || '').includes(getMoveNameFn(moveId))) {
      el.classList.add('firing');
      setTimeout(function(){ el.classList.remove('firing'); }, 300);
    }
  });
}

function setBattleSpeed(n) {
  var b = (typeof battle !== 'undefined') ? battle : null;
  if (!b) return;
  b.speed = n;
  document.querySelectorAll('#speed-toggle button').forEach(function(btn) {
    btn.classList.toggle('active', +btn.dataset.spd === n);
  });
}

function toggleDebugX10(show) {
  var x10btn = document.querySelector('.speed-x10');
  if (x10btn) x10btn.style.display = show ? 'inline-block' : 'none';
  var x1btn = document.querySelector('.speed-x1');
  if (x1btn) x1btn.style.display = show ? 'inline-block' : 'none';
  var toggle = document.getElementById('speed-toggle');
  if (toggle) toggle.style.display = show ? 'flex' : 'none';
  var body = document.body;
  if (show) body.classList.add('debug-active');
  else body.classList.remove('debug-active');
}

// Expose globally
if (typeof window !== 'undefined') {
  window.getActivePlayerPoke = getActivePlayerPoke;
  window.getBattleViewSnapshot = getBattleViewSnapshot;
  window.updatePokemonCardDynamicState = updatePokemonCardDynamicState;
  window.updateBattleDynamicState = updateBattleDynamicState;
  window.updateBattleUI = updateBattleUI;
  window.renderMoveButtons = renderMoveButtons;
  window.updateMoveBars = updateMoveBars;
  window.flashMoveFiring = flashMoveFiring;
  window.setBattleSpeed = setBattleSpeed;
  window.toggleDebugX10 = toggleDebugX10;
}

