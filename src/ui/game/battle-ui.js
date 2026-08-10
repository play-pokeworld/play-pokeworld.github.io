// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// battle-ui.js — Legacy battle UI (updateBattleUI, renderMoveButtons, setBattleSpeed, etc.)
// Battle UI - battle interface display functions

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

let _battleViewSnapshot = '';

function getActivePlayerPoke() {
  const g = (typeof G !== 'undefined') ? G : null;
  const b = (typeof battle !== 'undefined') ? battle : null;
  if (b && b.isTraining && b.trainee) return b.trainee;
  return g && g.team && b ? g.team[b.playerPokeIdx || 0] || null : null;
}

function getBattleViewSnapshot() {
  const g = (typeof G !== 'undefined') ? G : null;
  const b = (typeof battle !== 'undefined') ? battle : null;
  const enemy = b && b.enemyPoke ? b.enemyPoke : null;
  const team = b && b.isTraining && b.trainee ? [b.trainee] : g ? g.team || [] : [];
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
  const pct = pokemon.maxHP ? Math.max(0, Math.min(1, pokemon.currentHP / pokemon.maxHP)) : 0;
  const hpClass = pct > 0.5 ? 'high' : pct > 0.2 ? 'medium' : 'low';
  const hpFill = card.querySelector('.hp-fill');
  if (hpFill) {
    hpFill.style.width = (pct * 100) + '%';
    hpFill.classList.toggle('high', hpClass === 'high');
    hpFill.classList.toggle('medium', hpClass === 'medium');
    hpFill.classList.toggle('low', hpClass === 'low');
  }
  const hpText = card.querySelector('.hp-text');
  if (hpText) hpText.textContent = pokemon.currentHP + '/' + pokemon.maxHP + ' ' + (typeof t === 'function' ? t('stat_hp_short') || (typeof t==='function'?t('stat_hp_short')||'PV':'PV') : (typeof t==='function'?t('stat_hp_short')||'PV':'PV'));
  const levelText = card.querySelector('.poke-level');
  if (levelText) levelText.textContent = (typeof t === 'function' ? t('level_abbrev') || (typeof t==='function'?t('level_abbrev')||'Nv.':'Nv.') : (typeof t==='function'?t('level_abbrev')||'Nv.':'Nv.')) + pokemon.level;
  card.classList.toggle('fainted', pokemon.currentHP <= 0);
  const xpFill = card.querySelector('.xp-fill');
  if (xpFill && typeof xpForLevel === 'function') {
    const curBase = xpForLevel(pokemon.level);
    const xpInLevel = Math.max(0, (pokemon.xp || 0) - curBase);
    const xpReqLevel = Math.max(1, (pokemon.xpNext || 1) - curBase);
    xpFill.style.width = Math.min(100, (xpInLevel / xpReqLevel) * 100) + '%';
  }
}

function updateBattleDynamicState() {
  const b = (typeof battle !== 'undefined') ? battle : null;
  const g = (typeof G !== 'undefined') ? G : null;
  const row = document.getElementById('battle-team-row');
  if (!row) return false;
  const cards = Array.from(row.querySelectorAll('.poke-card'));
  if (!cards.length) return false;
  let index = 0;
  if (b && b.enemyPoke) updatePokemonCardDynamicState(cards[index++], b.enemyPoke);
  if (b && b.isTraining && b.trainee) { updatePokemonCardDynamicState(cards[index], b.trainee); return true; }
  for (let i = 0; i < (g.team || []).length; i++) { updatePokemonCardDynamicState(cards[index++], g.team[i]); }
  return true;
}

function updateBattleUI() {
  const b = (typeof battle !== 'undefined') ? battle : null;
  const p = getActivePlayerPoke();
  const e = b ? b.enemyPoke : null;
  if (!p || !e) return;
  const nextSnapshot = getBattleViewSnapshot();
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
    const modal = document.getElementById('battle-summary-modal');
    if (modal && modal.classList.contains('open') && typeof renderBattleSummary === 'function') renderBattleSummary();
  } catch(_) {}
}

function renderMoveButtons() {
  const b = (typeof battle !== 'undefined') ? battle : null;
  const container = document.getElementById('move-buttons');
  if (!container) return;
  const p = getActivePlayerPoke();
  if (!p) { container.replaceChildren(); return; }
  // THE single DS MoveButtonsBar (zero legacy markup below); the 60fps
  // ticker contract (.auto-move order, .am-bar-fill, --charge-color) is
  // fully preserved by the component.
  const comps = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) ? window.PokeUI.components : null;
  if (!comps || typeof comps.moveButtonsBarHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (moveButtonsBarHTML)');
  const nextIdx = (b.pMoveIdx || 0) % p.moves.length;
  const getMoveNameFn = typeof getMoveName === 'function' ? getMoveName : function(id){ return id; };
  const typeEffFn = typeof typeEff === 'function' ? typeEff : function(){ return 1; };
  const model = { moves: [] };
  p.moves.forEach(function(m, i) {
    const mv = (typeof MOVES !== 'undefined') ? MOVES[m.id] : null;
    if (!mv) return;
    const eff = b.enemyPoke ? typeEffFn(mv.type, b.enemyPoke.type1, b.enemyPoke.type2) : 1;
    const effHint = eff === 0 ? ' '+(typeof t==='function'?t('eff_immune'):'×0') : eff >= 4 ? ' '+(typeof t==='function'?t('eff_4x'):'×4') : eff >= 2 ? ' '+(typeof t==='function'?t('eff_2x'):'×2') : eff <= 0.25 ? ' '+(typeof t==='function'?t('eff_quarter'):'×¼') : eff <= 0.5 ? ' '+(typeof t==='function'?t('eff_half'):'×½') : ' '+(typeof t==='function'?t('eff_1x'):'×1');
    model.moves.push({
      moveId: m.id,
      idx: i,
      name: getMoveNameFn(m.id),
      effHint: effHint,
      typeLabel: (typeof getTypeName === 'function' ? getTypeName(mv.type) : mv.type),
      typeCls: (mv.type || '').toLowerCase(),
      next: i === nextIdx,
      contextArgs: "'" + m.id + "',-1",
      title: (typeof t === 'function' ? t('context_info_touch') || '' : ''),
    });
  });
  _pwSetHtmlSafe(container, comps.moveButtonsBarHTML(model));
  updateMoveBars();
}

function updateMoveBars() {
  const b = (typeof battle !== 'undefined') ? battle : null;
  const p = getActivePlayerPoke();
  const e = b ? b.enemyPoke : null;
  const clampFn = typeof clamp === 'function' ? clamp : function(v, min, max){ return Math.min(max, Math.max(min, v)); };

  if (p && p.moves && p.moves.length) {
    const nextIdx = (b.pMoveIdx || 0) % p.moves.length;
    const pct = b.pCdMax ? clampFn(100 - (b.pCd / b.pCdMax) * 100, 0, 100) : 0;

    document.querySelectorAll('#battle-team-row .poke-card .poke-move').forEach(function(el) {
      const card = el.closest('.poke-card');
      if (!card || !card.classList.contains('active')) return;
      const moveIdx = Array.from(el.parentElement.children).indexOf(el);
      const isNext = moveIdx === nextIdx;
      el.classList.toggle('ready', isNext && pct >= 99);
      el.style.setProperty('--charge-pct', (isNext ? pct : 0) + '%');
    });

    document.querySelectorAll('#move-buttons .auto-move').forEach(function(el, idx) {
      const isNext = idx === nextIdx;
      const barFill = el.querySelector('.am-bar-fill');
      if (barFill) { barFill.style.width = (isNext ? pct : 0) + '%'; }
      // Wave 15 (user feedback): the charge colour is EXACTLY the move-type
      // colour — no alpha washout, no JS override; the .type-X class carries
      // --type-color and CSS does the rest (fill + card glow).
    });
  }

  if (e && e.moves && e.moves.length) {
    const nextIdx = (b.eMoveIdx || 0) % e.moves.length;
    const pct = b.eCdMax ? clampFn(100 - (b.eCd / b.eCdMax) * 100, 0, 100) : 0;

    const enemyCard = document.querySelector('#battle-team-row .poke-card:not(.active)');
    if (enemyCard) {
      enemyCard.querySelectorAll('.poke-move').forEach(function(el, idx) {
        const isNext = idx === nextIdx;
        el.classList.toggle('ready', isNext && pct >= 99);
        el.style.setProperty('--charge-pct', (isNext ? pct : 0) + '%');
        });
    }
  }
}

function flashMoveFiring(moveId, side) {
  const sel = side === 'enemy' ? '#battle-team-row .poke-card:first-child .poke-move' : '#battle-team-row .poke-card.active .poke-move';
  const getMoveNameFn = typeof getMoveName === 'function' ? getMoveName : function(id){ return id; };
  document.querySelectorAll(sel).forEach(function(el) {
    if (el.dataset.moveId == moveId || (el.textContent || '').includes(getMoveNameFn(moveId))) {
      el.classList.add('firing');
      setTimeout(function(){ el.classList.remove('firing'); }, 300);
    }
  });
}

function setBattleSpeed(n) {
  const b = (typeof battle !== 'undefined') ? battle : null;
  if (!b) return;
  b.speed = n;
  document.querySelectorAll('#speed-toggle button').forEach(function(btn) {
    btn.classList.toggle('active', +btn.dataset.spd === n);
  });
}

function toggleDebugX10(show) {
  const x10btn = document.querySelector('.speed-x10');
  if (x10btn) x10btn.style.display = show ? 'inline-block' : 'none';
  const x1btn = document.querySelector('.speed-x1');
  if (x1btn) x1btn.style.display = show ? 'inline-block' : 'none';
  const toggle = document.getElementById('speed-toggle');
  if (toggle) toggle.style.display = show ? 'flex' : 'none';
  const body = document.body;
  if (show) body.classList.add('debug-active');
  else body.classList.remove('debug-active');
}

// Expose globally
// Wave 41 — surface kept (window → globalThis block, same scope).
if (typeof globalThis !== 'undefined') globalThis.getActivePlayerPoke = getActivePlayerPoke;
if (typeof globalThis !== 'undefined') globalThis.getBattleViewSnapshot = getBattleViewSnapshot;
if (typeof globalThis !== 'undefined') globalThis.updatePokemonCardDynamicState = updatePokemonCardDynamicState;
if (typeof globalThis !== 'undefined') globalThis.updateBattleDynamicState = updateBattleDynamicState;
if (typeof globalThis !== 'undefined') globalThis.updateBattleUI = updateBattleUI;
if (typeof globalThis !== 'undefined') globalThis.renderMoveButtons = renderMoveButtons;
if (typeof globalThis !== 'undefined') globalThis.updateMoveBars = updateMoveBars;
if (typeof globalThis !== 'undefined') globalThis.flashMoveFiring = flashMoveFiring;
if (typeof globalThis !== 'undefined') globalThis.setBattleSpeed = setBattleSpeed;
if (typeof globalThis !== 'undefined') globalThis.toggleDebugX10 = toggleDebugX10;


// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  getActivePlayerPoke,
  getBattleViewSnapshot,
  updatePokemonCardDynamicState,
  updateBattleDynamicState,
  updateBattleUI,
  renderMoveButtons,
  updateMoveBars,
  flashMoveFiring,
  setBattleSpeed,
  toggleDebugX10,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('setBattleSpeed', setBattleSpeed); } catch (_) {} }
