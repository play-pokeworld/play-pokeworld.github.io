// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
function renderTeamWindow(){
  try { if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.count('render', 'ui:team-window'); } catch (_) {}
  const el = document.getElementById('team-window-body');
  
  if(el) el.classList.add('team-view');
  if(!el) return;
  if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();

  if(G.team.length === 0){
    _pwSetHtmlSafe(el, `<div class="pw-empty-state">
      ${t('team_empty')}<br><br>
      ${!G.starter ? `<button class="hbtn" data-action="legacy-call" data-call="chooseStarter" data-call-args="">${t('choose_starter')}</button>` : t('explore_routes')}
    </div>`);
    return;
  }

  const battleLockBanner = battle.active
    ? `<div class="pw-alert battle-lock-banner"><span>${t('battle_lock_team')}</span></div>`
    : '';

  const teamCardsHtml = G.team.map((p, i) => {
    if((p.xp || 0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
    if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);

    const itemClickHandler = `openItemSelector(${i})`;

    return generatePokeCardHTML(p, i, {
      isActive: false,
      isFainted: false,
      showMoves: true,
      showXP: true,
      showStatus: false,
      movesAsBars: false,
      movesDraggable: !(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()),
      onRightClickSprite: `openPokeModal(${i})`,
      onLeftClickSprite: `onTeamCardClick(event, ${i})`,
      onLeftClickItem: itemClickHandler,
    });
  }).join('');

  const addCardHtml = G.team.length < 6 ? `
    <div class="pw-drop-zone"
         data-action="legacy-call" data-call="openAddToTeamSelector" data-call-args="">
      <div class="pw-text-lg">+</div>
      <div class="pw-text-sm pw-light2 pw-bold">${t('add_pokemon')}</div>
      <div class="pw-text-sm pw-light1">${tr('team_count', {count:G.team.length})}</div>
    </div>
  ` : '';
  _pwSetHtmlSafe(el, renderTeamPresetsToolbar() + battleLockBanner + teamCardsHtml + addCardHtml);
  
  
  addTeamDragAndDrop();
  addLongPressToItemBadges();
  installMoveDragDrop();
}


function resolvePresetPoke(uid){
 // Phase 26: resout has uid of preset → Pokemon (team then box PC).
 const inTeam=(G.team||[]).find(p=>p&&p.uid===uid); if(inTeam) return {p:inTeam, here:'team'};
 for(const k in (G.collection||{})){ const c=G.collection[k]; if(c&&c.uid===uid) return {p:c, here:'box'}; }
 return null;
}
function renderTeamPresetsToolbar(){
  if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
   // Active team window and preset selector toolbar
  // of equipes (20 slots, renaming, preview, editeur complete).
  {
  const _ap = (G.teamPresets && G.activePresetId && G.teamPresets[G.activePresetId]) || null;
  const _sub = _ap ? ` ${_ap.name} (${(_ap.uids||[]).length}/6)` : '';
    return `<div class="ui-control-toolbar team-toolbar"><div class="ui-toolbar-label">${t('presets_label')}</div>
      <div class="pw-btn-group">
        <button class="pw-ui-btn hbtn team-presets-open-btn" data-action="legacy-call" data-call="openPresetManager" data-call-args="">🗂 ${t('teams_manager_open')}<span class="team-preset-active">${_sub}</span></button>
      </div>
    </div>`;
  }

  if(false){

  return `<div class="ui-control-toolbar team-toolbar"><div class="ui-toolbar-label">${t('presets_label')}</div>
    ${['preset1', 'preset2', 'preset3'].map((pk, idx) => {
      const active = G.activePresetId === pk;
      const uids = (G.teamPresets[pk]?.uids || []);
      const count = uids.length;
      // Phase 26: preset PREVIEW — sprite chip per member
      // (greyed if the Pokemon is in the box, "?" if not found).
      const chips = count ? uids.slice(0, 6).map(uid => {
        const found = (typeof resolvePresetPoke === 'function') ? resolvePresetPoke(uid) : null;
        if(!found) return `<span class="preset-chip missing" title="${t('preset_missing_hint')||'Pokémon introuvable'}">?</span>`;
        const nm = (typeof getPokeName==='function'?getPokeName(found.p.id):(found.p.name||''));
        const ttl = `${nm} Nv.${found.p.level||1}${found.here==='box' ? ' · ' + (t('box_pc_location')||'Boîte') : ''}`;
        return `<span class="preset-chip ${found.here==='box'?'in-box':''}" title="${ttl}">${spriteImg(found.p.id, found.p.emoji, {size:20, shiny:!!found.p.shinyActive})}</span>`;
      }).join('') : `<span class="preset-chip-empty">${t('preset_empty')||'Vide'}</span>`;
      return `<div class="team-toolbar-group team-preset-group">
        <div class="team-preset-btns">
        ${typeof uiButtonHtml==='function' ? uiButtonHtml({label:'#' + (idx + 1) + ' (' + count + ')', call:'loadTeamFromPreset', args:`'${pk}'`, variant:'tool', active:active}) : `<button class="hbtn" data-action="legacy-call" data-call="loadTeamFromPreset" data-call-args="'${pk}'">#${idx + 1} (${count})</button>`}
        ${typeof uiButtonHtml==='function' ? uiButtonHtml({label:t('save_short') || 'Save', icon:(typeof getIcon==='function'?getIcon('save',14):''), call:'saveCurrentTeamToPreset', args:`'${pk}'`, variant:'icon', extraClass:'team-preset-save-btn'}) : `<button class="hbtn team-preset-save-btn" data-action="legacy-call" data-call="saveCurrentTeamToPreset" data-call-args="'${pk}'">${typeof getIcon==='function'?getIcon('save',14):'S'}</button>`}
        </div>
        <div class="team-preset-chips">${chips}</div>
      </div>`;
    }).join('')}
  </div>`;
  }
}


function renderPokeCard(p, i){
  if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
  if((p.xp || 0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
  if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);

  return generatePokeCardHTML(p, i, {
    isActive: false,
    isFainted: p.currentHP <= 0,
    showMoves: true,
    showXP: true,
    movesAsBars: false,
    movesDraggable: !(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()),
    onRightClickSprite: `openPokeModal(${i})`,
    onLeftClickSprite: `onTeamCardClick(event, ${i})`,
  });
}


function openItemSelector(teamIdx){
  // Phase 17: no item swap during a battle
  if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
  // Set equip callback so clicking an item auto-equips
  window._equipCallback = function(key) {
    equipItemDirect(teamIdx, key);
  };
  window._isEquipOpen = true;
  // Phase 18: the selector is rendered IMMEDIATELY after the panel
  // opens (the bag render is synchronous) — no more 200 ms window
  // during which a click landed on the raw bag list.
  openFullscreenPanel('inventory');
  showItemSelectorForPokemon(teamIdx);
}


// Phase 25: open the info sheet of an item from the equipment
// selector — the stored "back" source is this selector, so the
// back button (and the cross) reopen the item choice rather than the bag.
// The _pwEquipInfoFrom marker is set before opening: pwInfoCaptureSource
// reads it while building the panel → correct label and behavior.
function openItemInfoFromEquip(key, teamIdx){
  window._pwEquipInfoFrom = Number(teamIdx);
  try { if(typeof openItemInfo === 'function') openItemInfo(key); }
  finally { window._pwEquipInfoFrom = null; }
  // safety net: the source must stay the selector even if the
  // capture did not run (panel already built, partial DOM…).
  if(!window._pwInfoSource || window._pwInfoSource.kind !== 'equip-select'){
    window._pwInfoSource = { kind: 'equip-select', teamIdx: Number(teamIdx) };
  }
}

function showItemSelectorForPokemon(teamIdx){
    const p = G.team[teamIdx];
  if(!p) return;
  const fsContent = document.getElementById('fs-panel-content');
  if(!fsContent) return;
  
  const currentKey = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(teamIdx) : p.heldItem;
  // Phase 18: single filter via isHeldEquippableItem (type 'held' or legacy
  // buff). Previously, the filter included non-held items (stones…)
  // and the `Object.entries(itm.buff)` line CRASHED on any item without
  // a buff property — the selector never appeared and subsequent clicks
  // hit the raw bag list.
  const isEquippable = (typeof isHeldEquippableItem === 'function')
    ? isHeldEquippableItem
    : (k) => { const it = ITEMS[k]; return !!(it && (it.type === 'held' || it.buff)); };
  const entries = (G && G.inventory) ? Object.entries(G.inventory).filter(([k,v]) => v > 0 && ITEMS[k] && isEquippable(k)) : [];
  
  let html = `<div class="pw-row-between">
    <div>
      <div class="pw-text-md pw-bold pw-light1">${typeof getPokeName==='function'?getPokeName(p.id):p.name} Nv.${p.level}</div>
      <div class="pw-text-sm pw-light1">${t('equipped_item_label')}: ${currentKey ? getItemName(currentKey) : t('none')}</div>
    </div>
  </div>`;
  
  if(entries.length === 0){
    html += `<div class="pw-empty-state">${t('no_equippable_item')}</div>`;
  } else {
    html += entries.map(([key, qty]) => {
      const itm = ITEMS[key];
      // Phase 18: legacy buff lines only when the item has some
      // (no modern item uses that system anymore) — otherwise a description.
      let buffLines = '';
      if(itm.buff){
        const capped = Math.min(25, qty);
        const ratio = capped / 25;
        buffLines = Object.entries(itm.buff).map(([s, mx]) => {
          const label = {atk:t('stat_atk'),def:t('stat_def'),spe:t('stat_spe'),hpMax:t('stat_hp'),spa:t('stat_spa'),spd:t('stat_spd')}[s] || s;
          return `${label} +${Math.round(mx*ratio*100)}%`;
        }).join(' · ');
      }
      const equipped = itemEquippedOnTeam(key);
      const lockedByOther = equipped && equipped !== p;
      const descText = buffLines.length ? buffLines : (typeof getItemDesc === 'function' ? getItemDesc(key) : '');
      // Phase 25: right-click reopens the item info sheet via the
      // openItemInfoFromEquip wrapper, which remembers this selector as the source
      // — the sheet's back button returns here (not to the global bag).
      return `<div class="inv-item ${lockedByOther?'is-disabled':''}" ${lockedByOther?'':`data-action="legacy-call" data-call="equipItemDirect" data-call-args="${teamIdx}, '${key}'"`} data-context-call="openItemInfoFromEquip" data-context-args="'${key}', ${teamIdx}" title="${lockedByOther?`${typeof t==='function'?t('already_equipped_by'):'Déjà équipé par'} ${equipped.name}`:''}">
        <div class="inv-icon">${itemSpriteHtml(key, 40)}</div>
        <div class="pw-flex-1">
          <div class="inv-name">${getItemName(key)}</div>
          <div class="inv-desc">${descText}</div>
          ${lockedByOther ? `<div class="pw-text-sm pw-light1">${typeof t==='function'?t('already_equipped_by'):'Already equipped by'} ${equipped.name}</div>` : ''}
        </div>
        <div class="inv-qty">&times;${qty}</div>
      </div>`;
    }).join('');
  }
  
  html += `<div class="pw-btn-group">
    <button class="hbtn pw-btn-cancel" data-action="legacy-call" data-call="closeFullscreenPanel" data-call-args="">${t('cancel')}</button>
    ${currentKey ? `<button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="removeItemFromPokemon" data-call-args="${teamIdx}">${t('remove')}</button>` : ''}
  </div>`;
  
  _pwSetHtmlSafe(fsContent, html);
  // Fresh view: restart from the top of the panel (and cancel any delayed
  // restoration inherited from the bag render just before).
  if(typeof pwResetScrollNow === 'function') pwResetScrollNow(fsContent);
  else fsContent.scrollTop = 0;
}

function equipItemDirect(teamIdx, key){
  if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
  const p = G.team[teamIdx];
  if(!p) return;
  // Phase 18: check the item is HELD-EQUIPPABLE (type 'held' or legacy
  // buff) instead of requiring a `.buff` — the buff system no longer exists,
  // so every equip failed silently before this phase.
  const equippable = (typeof isHeldEquippableItem === 'function') ? isHeldEquippableItem(key) : !!(ITEMS[key] && (ITEMS[key].type === 'held' || ITEMS[key].buff));
  if(!ITEMS[key] || !equippable){
    if(typeof notify === 'function' && typeof tr === 'function') notify(tr('item_not_holdable', {item:(typeof getItemName==='function'?getItemName(key):key)}), 'var(--red)');
    return;
  }
  if(!(G.inventory[key] > 0)) return;
  const alreadyEquipped = itemEquippedOnTeam(key);
  if(alreadyEquipped && alreadyEquipped !== p){
    notify(tr('already_equipped_by_name', {item:getItemName(key), name:alreadyEquipped.name}), 'var(--red)');
    showItemSelectorForPokemon(teamIdx);
    return;
  }
  if(typeof setTeamSlotItem === 'function') setTeamSlotItem(teamIdx, key);
  else p.heldItem = key;
  saveGame();
  renderTeamWindow();
  closeFullscreenPanel();
  notify(tr('holding_item', {name:p.name, item:getItemName(key)}), 'var(--green)');
}

function removeItemFromPokemon(teamIdx){
  if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
  const p = G.team[teamIdx];
  const currentKey = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(teamIdx) : (p && p.heldItem);
  if(!p || !currentKey) return;
  if(typeof clearTeamSlotItem === 'function') clearTeamSlotItem(teamIdx);
  else p.heldItem = null;
  saveGame();
  renderTeamWindow();
  closeFullscreenPanel();
  notify(tr('holding_nothing', {name:p.name}), 'var(--light1)');
}


function unequipItemFromPokemon(idx){
  if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){ notifyTeamStructureLocked(); return; }
  const p = G.team[idx];
  const currentKey = (typeof getTeamSlotItem === 'function') ? getTeamSlotItem(idx) : (p && p.heldItem);
  if(!p || !currentKey) return;
  const itemName = getItemName(currentKey);
  if(typeof clearTeamSlotItem === 'function') clearTeamSlotItem(idx);
  else p.heldItem = null;
  saveGame();
  renderTeamWindow();
  document.getElementById('poke-modal').classList.remove('open');
  notify(tr('item_removed_from', {item:itemName, name:p.name}), 'var(--light1)');
}


function unequipItemFromBox(boxId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p || !p.heldItem) return;
  const itemName = getItemName(p.heldItem);
  p.heldItem = null;
  saveGame();
  document.getElementById('poke-modal').classList.remove('open');
  notify(tr('item_removed_from', {item:itemName, name:p.name}), 'var(--light1)');
}


function removeItemFromTeamByName(key){
  let removed = false;
  if(typeof ensureTeamSlotItems === 'function') ensureTeamSlotItems();
  if(Array.isArray(G.teamSlotItems)){
    for(let i=0;i<G.teamSlotItems.length;i++){
      if(G.teamSlotItems[i] === key){ G.teamSlotItems[i] = null; removed = true; }
    }
    if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
  }
  G.team.forEach(p => {
    if(p && p.heldItem === key){
      p.heldItem = null;
      removed = true;
    }
  });
  if(removed){
    saveGame();
    renderTeamWindow();
    closeFullscreenPanel();
    notify(tr('item_removed_team', {item:getItemName(key)}), 'var(--light1)');
  }
}


function addLongPressToItemBadges(){
  setTimeout(() => {
    // Touch gestures flow through the central event bus (src/core/event-bus.js
    // input helpers, mirrored on window.PokeWorldInput by the boot wiring).
    const input = window.PokeWorldInput || (window.PokeWorldEventBus && window.PokeWorldEventBus.input) || null;
    if(!input || typeof input.attachLongPress !== 'function') return;
    document.querySelectorAll('.poke-item-badge').forEach(badge => {
      if(badge.dataset.longPressAdded) return;
      badge.dataset.longPressAdded = 'true';
      input.attachLongPress(badge, () => {
        const key = badge.dataset.itemKey;
        if(key) openItemInfo(key);
      }, 500, { source: 'team-item-badge' });
    });
  }, 100);
}

function aliveCount(){ return G.team.filter(p => p.currentHP > 0).length; }
function firstAlive(){ return G.team.findIndex(p => p.currentHP > 0); }


function addTeamDragAndDrop() {
  installCardDragAndDrop(document.getElementById('team-window-body'));
}

// Phase 51: card drag & drop is extracted here to be reused AS-IS by the
// presets, the Atoll and the NPCs (user feedback: "Pokemon drag & drop in
// presets and NPCs should be exactly the same as in the team and the
// Atoll"). Same listeners, same long press,
// Phase b — legacy feature update
function installCardDragAndDrop(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  const cards = root.querySelectorAll('.poke-card');
  cards.forEach((card, idx) => {
    card.setAttribute('data-team-idx', idx);
    card.addEventListener('mousedown', (ev) => teamMouseDown(ev, idx));
    card.addEventListener('mouseup', (ev) => teamMouseUp(ev));
    card.addEventListener('dragstart', (ev) => teamDragStart(ev, idx));
    card.addEventListener('dragover', (ev) => teamDragOver(ev));
    card.addEventListener('dragleave', (ev) => teamDragLeave(ev));
    card.addEventListener('drop', (ev) => teamDrop(ev, idx));
  });
}


// Phase 17 — legacy feature update
// Party (and team tab) — position swap via swapTeamMoves. ──────────────
if (typeof globalThis._pwMoveDrag === 'undefined') globalThis._pwMoveDrag = null; // {teamIdx, moveIdx}
// Phase 27: shared ghost cards (drag thumbnail and drop preview).
function _pwPokeGhostData(p){
  if(!p) return {icon:'', title:'?'};
  return { icon:(typeof spriteImg==='function'?spriteImg(p.id,p.emoji,{size:26,shiny:!!p.shinyActive}):''), title:(typeof getPokeName==='function'?getPokeName(p.id):(p.name||'')), sub:'Nv.'+(p.level||1) };
}
function _pwMoveGhostData(teamIdx, moveIdx){
  const _dt=(typeof _pwDragTeam==='function')?_pwDragTeam():((typeof G!=='undefined'&&G&&G.team)?G.team:[]);
  const _dm=(_dt[teamIdx]&&_dt[teamIdx].moves)?_dt[teamIdx].moves[moveIdx]:null;
  const _dmv=_dm&&typeof MOVES!=='undefined'?MOVES[_dm.id]:null;
  if(!_dm) return {icon:'', title:'?'};
  return { icon:_dmv?'<span class="type-badge type-'+String(_dmv.type||'').toLowerCase()+'">'+(typeof getTypeName==='function'?getTypeName(_dmv.type):(_dmv.type||''))+'</span>':'', title:(typeof getMoveName==='function'?getMoveName(_dm.id):_dm.id) };
}
// Phase 50 — unified drag & drop.
// User feedback: "the drag & drop of moves and Pokemon is not the same in
// the NPCs, the presets and the team: keep only the team's one to unify
// everything".
//
// this delegated handler (installed once on document) is now the SINGLE
// mechanism of the game. Screens that do not edit G.team (presets, NPCs,
// Atoll) simply declare a CONTEXT: where to read the Pokemon and what to
// call to swap. Same gesture, same thumbnails, same previews everywhere.
//   pwSetMoveDragContext({ getTeam, swapMoves, swapPokes })
if (typeof globalThis._pwMoveDragCtx === 'undefined') globalThis._pwMoveDragCtx = null;
function pwSetMoveDragContext(ctx) { _pwMoveDragCtx = ctx || null; }
function pwClearMoveDragContext() { _pwMoveDragCtx = null; }
function _pwDragTeam() {
  if (_pwMoveDragCtx && typeof _pwMoveDragCtx.getTeam === 'function') return _pwMoveDragCtx.getTeam() || [];
  return (typeof G !== 'undefined' && G && G.team) ? G.team : [];
}
function _pwDragSwapMoves(pi, a, b) {
  if (_pwMoveDragCtx && typeof _pwMoveDragCtx.swapMoves === 'function') return _pwMoveDragCtx.swapMoves(pi, a, b);
  if (typeof swapTeamMoves === 'function') return swapTeamMoves(pi, a, b);
  return undefined;
}
function _pwDragSwapPokes(a, b) {
  if (_pwMoveDragCtx && typeof _pwMoveDragCtx.swapPokes === 'function') return _pwMoveDragCtx.swapPokes(a, b);
  if (typeof swapTeamMembers === 'function') return swapTeamMembers(a, b);
  return undefined;
}

function installMoveDragDrop() {
  // (guard: environments without a full DOM — headless tests)
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  if (document._pwMoveDragInstalled) return;
  document._pwMoveDragInstalled = true;
  document.addEventListener('dragstart', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-move-drag]') : null;
    if (!el) return;
    const parts = String(el.dataset.moveDrag).split('|');
    _pwMoveDrag = { teamIdx: Number(parts[0]), moveIdx: Number(parts[1]) };
    // Phase 26: vignette of drag unifiee for the move deplacee.
    try {
      const _dt = _pwDragTeam();
      const _dm = (_dt[_pwMoveDrag.teamIdx] && _dt[_pwMoveDrag.teamIdx].moves) ? _dt[_pwMoveDrag.teamIdx].moves[_pwMoveDrag.moveIdx] : null;
      const _dmv = _dm && typeof MOVES !== 'undefined' ? MOVES[_dm.id] : null;
      if(_dm && typeof pwApplyDragGhost === 'function'){
        pwApplyDragGhost(ev, {
          icon: _dmv ? '<span class="type-badge type-' + String(_dmv.type || '').toLowerCase() + '">' + (typeof getTypeName === 'function' ? getTypeName(_dmv.type) : (_dmv.type || '')) + '</span>' : '',
          title: (typeof getMoveName === 'function' ? getMoveName(_dm.id) : _dm.id),
        });
      }
    } catch(_){}
    try { ev.stopPropagation(); } catch (_) {}
    ev.dataTransfer.effectAllowed = 'move';
    try { ev.dataTransfer.setData('text/plain', el.dataset.moveDrag); } catch (_) {}
    el.classList.add('pw-move-drag-src');
  });
  document.addEventListener('dragover', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-move-drag]') : null;
    if (!el || !_pwMoveDrag) return;
    const parts = String(el.dataset.moveDrag).split('|');
    if (Number(parts[0]) !== _pwMoveDrag.teamIdx) return; // same Pokemon only
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';
    el.classList.add('pw-move-drop-hover');
    // Phase 27: preview of the resultat (move source ⇄ move cible).
    try {
      if(typeof pwDropPreviewShow==='function' && typeof pwSwapPreviewHtml==='function'){
        pwDropPreviewShow(pwSwapPreviewHtml(_pwMoveGhostData(_pwMoveDrag.teamIdx,_pwMoveDrag.moveIdx), _pwMoveGhostData(_pwMoveDrag.teamIdx,Number(parts[1]))), ev.clientX||0, ev.clientY||0);
      }
    } catch(_){}
  });
  document.addEventListener('dragleave', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-move-drag]') : null;
    if (el) el.classList.remove('pw-move-drop-hover');
    if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
  });
  document.addEventListener('drop', (ev) => {
    const el = ev.target && ev.target.closest ? ev.target.closest('[data-move-drag]') : null;
    if (!el || !_pwMoveDrag) return;
    const parts = String(el.dataset.moveDrag).split('|');
    const targetTeam = Number(parts[0]);
    if (targetTeam !== _pwMoveDrag.teamIdx) return;
    ev.preventDefault();
    ev.stopPropagation();
    _pwDragSwapMoves(_pwMoveDrag.teamIdx, _pwMoveDrag.moveIdx, Number(parts[1]));
    _pwMoveDrag = null;
    if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
  });
  document.addEventListener('dragend', () => {
    _pwMoveDrag = null;
    try { document.querySelectorAll('.pw-move-drag-src, .pw-move-drop-hover').forEach((n) => n.classList.remove('pw-move-drag-src', 'pw-move-drop-hover')); } catch (_) {}
    if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
  });
}


if (typeof globalThis._teamDragIdx === 'undefined') globalThis._teamDragIdx = null;
if (typeof globalThis._teamLongPressTimer === 'undefined') globalThis._teamLongPressTimer = null;
if (typeof globalThis._teamLongPressReady === 'undefined') globalThis._teamLongPressReady = false;
const TEAM_DRAG_DELAY = 400; 

function teamMouseDown(ev, idx) {
  
  if (ev.button !== 0) return;
  // Do not arm the drag of a card when the target is a move
  // (phase 17: move drag takes precedence).
  if (ev.target && ev.target.closest && ev.target.closest('.poke-move')) return;
  // Phase 51 — legacy feature update
  // presets / PNJ / Atoll restent reordonnables during has battle)
  if (!_pwMoveDragCtx && typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()) return;
  _teamLongPressReady = false;
  _teamDragIdx = idx;
  _teamLongPressTimer = setTimeout(() => {
    _teamLongPressReady = true;
    
    if (ev.currentTarget) {
      ev.currentTarget.setAttribute('draggable', 'true');
      ev.currentTarget.style.opacity = '0.6';
      ev.currentTarget.style.cursor = 'grabbing';
    }
  }, TEAM_DRAG_DELAY);
}

function teamMouseUp(ev) {
  clearTimeout(_teamLongPressTimer);
  _teamLongPressTimer = null;
  if (ev.currentTarget) {
    
    if (!_teamLongPressReady) {
      ev.currentTarget.removeAttribute('draggable');
    }
    ev.currentTarget.style.opacity = '';
    ev.currentTarget.style.cursor = '';
  }
}

function teamDragStart(ev, idx) {
  clearTimeout(_teamLongPressTimer);
  ev.dataTransfer.effectAllowed = 'move';
  ev.dataTransfer.setData('text/plain', String(idx));
  // Phase 26: unified drag thumbnail (sprite + name + level), compact and
  // identical everywhere, instead of the card's giant "photo".
  const _dp = _pwDragTeam()[idx] || null;   // phase 51 : team contextuelle
  if(_dp && typeof pwApplyDragGhost === 'function'){
    pwApplyDragGhost(ev, {
      icon: (typeof spriteImg === 'function') ? spriteImg(_dp.id, _dp.emoji, { size: 26, shiny: !!_dp.shinyActive }) : '',
      title: (typeof getPokeName === 'function' ? getPokeName(_dp.id) : (_dp.name || '')),
      sub: 'Nv.' + (_dp.level || 1),
    });
  }
}

function teamDragOver(ev) {
  if (_teamDragIdx === null) return;
  ev.preventDefault();
  ev.dataTransfer.dropEffect = 'move';
  ev.currentTarget.style.borderColor = 'var(--light2)';
  ev.currentTarget.style.boxShadow = '0 0 15px rgba(236,222,183,0.6)';
  // Phase 27: preview of the resultat — the Pokemon deplace and the cible if echangent.
  try {
    const _toIdx = Number(ev.currentTarget && ev.currentTarget.dataset ? ev.currentTarget.dataset.teamIdx : -1);
    if(_toIdx >= 0 && _toIdx !== _teamDragIdx && typeof pwDropPreviewShow==='function' && typeof pwSwapPreviewHtml==='function'){
      pwDropPreviewShow(pwSwapPreviewHtml(_pwPokeGhostData(G.team[_teamDragIdx]), _pwPokeGhostData(G.team[_toIdx])), ev.clientX||0, ev.clientY||0);
    }
  } catch(_){}
}

function teamDragLeave(ev) {
  if (ev.relatedTarget && ev.currentTarget && ev.currentTarget.contains && ev.currentTarget.contains(ev.relatedTarget)) return; // survol interne : garder highlight + preview
  ev.currentTarget.style.borderColor = '';
  ev.currentTarget.style.boxShadow = '';
  if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
}

function teamDrop(ev, targetIdx) {
  ev.preventDefault();
  // Phase 17: team order frozen during a battle
  if(!_pwMoveDragCtx && typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){
    notifyTeamStructureLocked();
    ev.currentTarget.style.borderColor = '';
    ev.currentTarget.style.boxShadow = '';
    ev.currentTarget.style.opacity = '';
    ev.currentTarget.style.cursor = '';
    _teamDragIdx = null;
    if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
    return;
  }
  ev.currentTarget.style.borderColor = '';
  ev.currentTarget.style.boxShadow = '';
  ev.currentTarget.style.opacity = '';
  ev.currentTarget.style.cursor = '';
  // Phase 27: the drop preview bubble disappears on release.
  if (typeof pwDropPreviewHide === 'function') pwDropPreviewHide();
  
  if (_teamDragIdx === null || _teamDragIdx === targetIdx) return;
  
  
  const sourceIdx = _teamDragIdx;
  _teamDragIdx = null;
  _teamLongPressReady = false;
  // Phase 51: outside the active team (presets, NPCs, Atoll), the swap is
  // delegated to the CONTEXT — the gesture and visuals stay identical.
  if (_pwMoveDragCtx && typeof _pwMoveDragCtx.swapPokes === 'function') {
    _pwMoveDragCtx.swapPokes(sourceIdx, targetIdx);
    return;
  }
  const temp = G.team[sourceIdx];
  G.team[sourceIdx] = G.team[targetIdx];
  G.team[targetIdx] = temp;
  // Phase 16: the held item follows the Pokemon (swaps with it),
  // instead of staying glued to the slot number.
  if(typeof swapTeamSlotItems === 'function') swapTeamSlotItems(sourceIdx, targetIdx);
  else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();

  saveGame();
  renderTeamWindow();
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderTeamWindow !== 'undefined') { if (typeof window !== 'undefined') window.renderTeamWindow = renderTeamWindow; if (typeof globalThis !== 'undefined') globalThis.renderTeamWindow = renderTeamWindow; }
if (typeof renderTeamPresetsToolbar !== 'undefined') { if (typeof window !== 'undefined') window.renderTeamPresetsToolbar = renderTeamPresetsToolbar; if (typeof globalThis !== 'undefined') globalThis.renderTeamPresetsToolbar = renderTeamPresetsToolbar; }
if (typeof resolvePresetPoke !== 'undefined') { if (typeof window !== 'undefined') window.resolvePresetPoke = resolvePresetPoke; if (typeof globalThis !== 'undefined') globalThis.resolvePresetPoke = resolvePresetPoke; }
if (typeof renderPokeCard !== 'undefined') { if (typeof window !== 'undefined') window.renderPokeCard = renderPokeCard; if (typeof globalThis !== 'undefined') globalThis.renderPokeCard = renderPokeCard; }
if (typeof openItemSelector !== 'undefined') { if (typeof window !== 'undefined') window.openItemSelector = openItemSelector; if (typeof globalThis !== 'undefined') globalThis.openItemSelector = openItemSelector; }
if (typeof showItemSelectorForPokemon !== 'undefined') { if (typeof window !== 'undefined') window.showItemSelectorForPokemon = showItemSelectorForPokemon; if (typeof globalThis !== 'undefined') globalThis.showItemSelectorForPokemon = showItemSelectorForPokemon; }
if (typeof openItemInfoFromEquip !== 'undefined') { if (typeof window !== 'undefined') window.openItemInfoFromEquip = openItemInfoFromEquip; if (typeof globalThis !== 'undefined') globalThis.openItemInfoFromEquip = openItemInfoFromEquip; }
if (typeof equipItemDirect !== 'undefined') { if (typeof window !== 'undefined') window.equipItemDirect = equipItemDirect; if (typeof globalThis !== 'undefined') globalThis.equipItemDirect = equipItemDirect; }
if (typeof removeItemFromPokemon !== 'undefined') { if (typeof window !== 'undefined') window.removeItemFromPokemon = removeItemFromPokemon; if (typeof globalThis !== 'undefined') globalThis.removeItemFromPokemon = removeItemFromPokemon; }
if (typeof unequipItemFromPokemon !== 'undefined') { if (typeof window !== 'undefined') window.unequipItemFromPokemon = unequipItemFromPokemon; if (typeof globalThis !== 'undefined') globalThis.unequipItemFromPokemon = unequipItemFromPokemon; }
if (typeof unequipItemFromBox !== 'undefined') { if (typeof window !== 'undefined') window.unequipItemFromBox = unequipItemFromBox; if (typeof globalThis !== 'undefined') globalThis.unequipItemFromBox = unequipItemFromBox; }
if (typeof removeItemFromTeamByName !== 'undefined') { if (typeof window !== 'undefined') window.removeItemFromTeamByName = removeItemFromTeamByName; if (typeof globalThis !== 'undefined') globalThis.removeItemFromTeamByName = removeItemFromTeamByName; }
if (typeof addLongPressToItemBadges !== 'undefined') { if (typeof window !== 'undefined') window.addLongPressToItemBadges = addLongPressToItemBadges; if (typeof globalThis !== 'undefined') globalThis.addLongPressToItemBadges = addLongPressToItemBadges; }
if (typeof aliveCount !== 'undefined') { if (typeof window !== 'undefined') window.aliveCount = aliveCount; if (typeof globalThis !== 'undefined') globalThis.aliveCount = aliveCount; }
if (typeof firstAlive !== 'undefined') { if (typeof window !== 'undefined') window.firstAlive = firstAlive; if (typeof globalThis !== 'undefined') globalThis.firstAlive = firstAlive; }
if (typeof addTeamDragAndDrop !== 'undefined') { if (typeof window !== 'undefined') window.addTeamDragAndDrop = addTeamDragAndDrop; if (typeof globalThis !== 'undefined') globalThis.addTeamDragAndDrop = addTeamDragAndDrop; }
if (typeof installMoveDragDrop !== 'undefined') { if (typeof window !== 'undefined') window.installMoveDragDrop = installMoveDragDrop; if (typeof globalThis !== 'undefined') globalThis.installMoveDragDrop = installMoveDragDrop; }
if (typeof teamMouseDown !== 'undefined') { if (typeof window !== 'undefined') window.teamMouseDown = teamMouseDown; if (typeof globalThis !== 'undefined') globalThis.teamMouseDown = teamMouseDown; }
if (typeof teamMouseUp !== 'undefined') { if (typeof window !== 'undefined') window.teamMouseUp = teamMouseUp; if (typeof globalThis !== 'undefined') globalThis.teamMouseUp = teamMouseUp; }
if (typeof teamDragStart !== 'undefined') { if (typeof window !== 'undefined') window.teamDragStart = teamDragStart; if (typeof globalThis !== 'undefined') globalThis.teamDragStart = teamDragStart; }
if (typeof installCardDragAndDrop !== 'undefined') { if (typeof window !== 'undefined') window.installCardDragAndDrop = installCardDragAndDrop; if (typeof globalThis !== 'undefined') globalThis.installCardDragAndDrop = installCardDragAndDrop; }
if (typeof teamDragOver !== 'undefined') { if (typeof window !== 'undefined') window.teamDragOver = teamDragOver; if (typeof globalThis !== 'undefined') globalThis.teamDragOver = teamDragOver; }
if (typeof teamDragLeave !== 'undefined') { if (typeof window !== 'undefined') window.teamDragLeave = teamDragLeave; if (typeof globalThis !== 'undefined') globalThis.teamDragLeave = teamDragLeave; }
if (typeof teamDrop !== 'undefined') { if (typeof window !== 'undefined') window.teamDrop = teamDrop; if (typeof globalThis !== 'undefined') globalThis.teamDrop = teamDrop; }



// Phase 49 — legacy feature update
// user feedback: "choosing the item to put on a Pokemon in the presets,
// the Atoll and the NPCs should work like the active-team Pokemon, with
// the bag".
//
// openItemSelector() above is wired to a team index. Here we open
// the same screen (fullscreen "inventory" panel, filtered to held items
// by _equipCallback) but hand control back through a free callback:
// each caller decides what to do with the picked item key.
//   onPick(key)  : item kept
//   onClear()    : "remove" button (optional)
function openHeldItemPickerFor(label, currentKey, onPick, onClear) {
  if (typeof openFullscreenPanel !== 'function') return false;
  window._equipCallback = function (key) {
    try { if (typeof onPick === 'function') onPick(key); }
    finally { if (typeof closeFullscreenPanel === 'function') closeFullscreenPanel(); }
  };
  window._equipPickerMeta = { label: String(label || ''), currentKey: currentKey || null, onClear: onClear || null };
  window._isEquipOpen = true;
  openFullscreenPanel('inventory');
  return true;
}

// Removes the current item from the generic selector ("remove" button).
function heldItemPickerClear() {
  const meta = window._equipPickerMeta;
  window._equipCallback = null;
  window._equipPickerMeta = null;
  if (meta && typeof meta.onClear === 'function') meta.onClear();
  if (typeof closeFullscreenPanel === 'function') closeFullscreenPanel();
}

// Wave 41 — surface kept (window → globalThis block, same scope).
if (typeof globalThis !== 'undefined') globalThis.pwSetMoveDragContext = pwSetMoveDragContext;
if (typeof globalThis !== 'undefined') globalThis.pwClearMoveDragContext = pwClearMoveDragContext;
if (typeof globalThis !== 'undefined') globalThis.openHeldItemPickerFor = openHeldItemPickerFor;
if (typeof globalThis !== 'undefined') globalThis.heldItemPickerClear = heldItemPickerClear;

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderTeamWindow,
  renderTeamPresetsToolbar,
  resolvePresetPoke,
  renderPokeCard,
  openItemSelector,
  showItemSelectorForPokemon,
  openItemInfoFromEquip,
  equipItemDirect,
  removeItemFromPokemon,
  unequipItemFromPokemon,
  unequipItemFromBox,
  removeItemFromTeamByName,
  addLongPressToItemBadges,
  aliveCount,
  firstAlive,
  addTeamDragAndDrop,
  installMoveDragDrop,
  teamMouseDown,
  teamMouseUp,
  teamDragStart,
  installCardDragAndDrop,
  teamDragOver,
  teamDragLeave,
  teamDrop,
  pwSetMoveDragContext,
  pwClearMoveDragContext,
  openHeldItemPickerFor,
  heldItemPickerClear,
};
