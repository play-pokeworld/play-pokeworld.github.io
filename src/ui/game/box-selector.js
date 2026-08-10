function isPokemonTakenByHatcheryOrTraining(p) {
  if (!p) return false;
  if (typeof isPokemonQueuedHatchery === 'function' && isPokemonQueuedHatchery(p)) return true;
  if (typeof isPokemonQueuedTraining === 'function' && isPokemonQueuedTraining(p)) return true;
  if (G && Array.isArray(G.hatchery)) {
    for (const s of G.hatchery) {
      if (s && s.poke && (s.poke === p || (p.uid && s.poke.uid === p.uid))) return true;
    }
  }
  if (G && Array.isArray(G.trainingSlots)) {
    for (const s of G.trainingSlots) {
      if (s && s.active) {
        const tr = (typeof findPokemonByTrainingSlot === 'function') ? findPokemonByTrainingSlot(s) : null;
        if (tr && (tr === p || (p.uid && tr.uid === p.uid))) return true;
      }
    }
  }
  return false;
}
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Selector state lives on the shared global object: the unified-selector
// VM harnesses drive it directly (env._usmAction = …) and the classic app
// mutates it through the setters below. A lexical binding would shadow those
// external writes.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseNpcEditorAcceptPick(...args) { const f = __pwV43Link('baseNpcEditorAcceptPick'); return f ? f(...args) : undefined; }
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

if (typeof globalThis._usmAction === 'undefined') globalThis._usmAction = null;
if (typeof globalThis._usmSort === 'undefined') globalThis._usmSort = 'id';
// Sort direction: 1 = ascending, -1 = descending. Re-clicking the active
// criterion flips it (user request: every sort offers both orders). The
// natural direction differs per criterion (level/IV/EV/rank/shiny read
// "best first" by default; number/name/type read A→Z / 1→9).
if (typeof globalThis._usmSortDir === 'undefined') globalThis._usmSortDir = 1;
const USM_SORT_DEFAULT_DIR = { id: 1, name: 1, type: 1, level: -1, iv: -1, ev: -1, rank: -1, shiny: -1 };
if (typeof globalThis._usmSubTab === 'undefined') globalThis._usmSubTab = 'box';
if (typeof globalThis._usmFilter === 'undefined') globalThis._usmFilter = { type: null, shiny: false, inTeam: null };
if (typeof globalThis._usmLastScrollKey === 'undefined') globalThis._usmLastScrollKey = null; // context of the last render (scroll preservation)
// Phase 15 — scroll preservation:
// keep the scroll position if the context (action + sub-tab) has not changed
// since the last render; otherwise naturally restart from the top.
// Canonical sprite src resolution for the unified selector cards (same
// source as the classic spriteImg helper; guarded for vm-based tests where
// SPRITE_DATA/DEX_MAP are not loaded — the card then shows the emoji orb).
function _usmPokeSpriteSrc(id, shiny){
  try{
    const num = (typeof DEX_MAP !== 'undefined' && DEX_MAP && DEX_MAP[String(id)] != null) ? DEX_MAP[String(id)] : Number(id);
    const bucket = shiny ? 'frontShiny' : 'front';
    if (typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA && SPRITE_DATA[bucket]) return SPRITE_DATA[bucket][String(num)] || null;
  }catch(_){}
  return null;
}
function _usmSetGridHtml(grid, html, prevScroll){
  _pwSetHtmlSafe(grid, html);
  if (prevScroll === null || prevScroll === undefined) {
    // New context (sub-tab, sort…): deliberate, deterministic scroll back
    // to top — innerHTML alone keeps scrollTop, so we force the reset
    // (pwResetScrollNow also cancels any deferred scroll restorations).
    if (typeof pwResetScrollNow === 'function') pwResetScrollNow(grid);
    else { try { grid.scrollTop = 0; } catch (_) {} }
  } else if (typeof pwRestoreScroll === 'function') pwRestoreScroll(grid, prevScroll);
}

function openUnifiedSelectorModal(actionType){
  closeFullscreenPanel();
  if(typeof closeBattleSummary === 'function') closeBattleSummary();
  const qm = document.getElementById('quest-modal');
  if(qm) qm.classList.remove('open');
  const sm = document.getElementById('settings-modal');
  if(sm && actionType !== 'save_icon') sm.classList.remove('open');

  _usmAction = actionType;
  _usmSubTab = 'box';
  // Hatchery slot in incubation with "Fossil" priority: open the fossils
  // tab directly (switching back to Pokemon stays possible).
  if(String(actionType).startsWith('hatchery_queue_') && typeof hatcherySlotIsIncubation === 'function' && typeof hatcherySlotPriority === 'function'){
    const _slotN = Number(String(actionType).split('_').pop()) || 0;
    if(hatcherySlotIsIncubation(_slotN) && hatcherySlotPriority(_slotN) === 'fossil') _usmSubTab = 'fossil';
  }
  const modal = document.getElementById('unified-selector-modal');
  const titleEl = document.getElementById('usm-title');
  if(!modal || !titleEl) return;
  if(actionType === 'hatchery') titleEl.textContent = t('selector_title_hatchery');
  else if(actionType === 'hatchery_queue') titleEl.textContent = t('selector_title_hatchery_queue');
  else if(String(actionType).startsWith('training_queue_')) titleEl.textContent = tr('selector_title_training_queue', {slot:Number(String(actionType).split('_').pop())+1});
  else if(actionType === 'item_rarecandy') titleEl.textContent = t('selector_title_item_use');
  else if(actionType === 'training') titleEl.textContent = t('selector_title_training');
  else if(actionType === 'team') titleEl.textContent = t('selector_title_team');
  // Phase 48 (user feedback): presets and base NPCs use the same selector
  // as the active team — the complete "PC box" interface.
  else if(String(actionType).startsWith('preset_slot_')) titleEl.textContent = t('selector_title_team');
  else if(String(actionType).startsWith('basenpc_slot_')) titleEl.textContent = t('selector_title_team');
  else if(actionType === 'save_icon') titleEl.textContent = t('save_profile_icon');
  else titleEl.textContent = t('selector_title_box');
  
  modal.style.display = 'flex';
  renderUnifiedGrid();
}

function closeUnifiedSelectorModal(){
  const modal = document.getElementById('unified-selector-modal');
  if(modal) modal.style.display = 'none';
}

function sortUnifiedGrid(crit){
  if(_usmSort === crit){ _usmSortDir = -_usmSortDir; }
  else { _usmSort = crit; _usmSortDir = USM_SORT_DEFAULT_DIR[crit] || 1; }
  // Wave 15: sort chips are REBUILT inside the FilterBar on each render —
  // no separate sync pass (the static top TRI row is gone).
  renderUnifiedGrid();
}
// Wave 15 (user feedback): sort chips of the unified selector, rendered
// inside the DS FilterBar (the ONLY toolbar). Active chip carries the
// direction marker via data-dir (CSS content:attr(data-dir)).
const USM_SORT_DEFS = [
 ['id', 'sort_dex_number'], ['level', 'sort_level'], ['iv', 'sort_iv'],
 ['ev', 'sort_ev'], ['rank', 'sort_rank'], ['name', 'sort_name'],
];
function usmSortChips(){
 return USM_SORT_DEFS.map(([crit, key]) => ({
  label: (typeof t === 'function' ? t(key) : crit),
  sort: crit,
  active: _usmSort === crit,
  dir: _usmSort === crit ? (_usmSortDir < 0 ? '▼' : '▲') : null,
  call: 'sortUnifiedGrid',
  callArgs: `'${crit}'`,
 }));
}
// Wave 15 (user feedback — Fossils tab unclickable): the bridge must go
// through THIS setter — writing window._usmSubTab never reached the
// module-scoped variable, so the tab silently stayed on "box".
function setUsmSubTab(v){
 _usmSubTab = (v === 'fossil') ? 'fossil' : 'box';
 renderUnifiedGrid();
}

function filterUnifiedGrid(){ renderUnifiedGrid(); }

function setFilterType(type){
  globalThis._usmFilter.type = globalThis._usmFilter.type === type ? null : type;
  renderUnifiedGrid();
}

function setFilterShiny(){
  globalThis._usmFilter.shiny = !globalThis._usmFilter.shiny;
  renderUnifiedGrid();
}

function setFilterTeam(filter){
  globalThis._usmFilter.inTeam = globalThis._usmFilter.inTeam === filter ? null : filter;
  renderUnifiedGrid();
}


// The swap footer is rendered by the DS component (ui/components/
// swap-footer.js) — this adapter only shapes the model and toggles the host.
function renderUnifiedSwapFooter(){
  const footer = document.getElementById('usm-footer');
  if(!footer) return;
  footer.replaceChildren();
  footer.style.display = 'none';
  if(_usmAction === 'team' && ((typeof getSwapFromTeamIdx==='function')?getSwapFromTeamIdx():((typeof window!=='undefined')?window._swapFromTeamIdx:null)) != null){
    const _swapIdx = ((typeof getSwapFromTeamIdx==='function')?getSwapFromTeamIdx():((typeof window!=='undefined')?window._swapFromTeamIdx:null));
    const teamPoke = G.team[_swapIdx];
    if(teamPoke){
      const comp = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) || null;
      if(!comp || typeof comp.swapFooterHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (swapFooter)');
      _pwSetHtmlSafe(footer, comp.swapFooterHTML({
        label: tr('selected_pokemon', {name:teamPoke.name, level:teamPoke.level}),
        iconHtml: (typeof getIcon==='function'?getIcon('close',14):''),
        cancelLabel: t('cancel'),
        removeLabel: t('remove'),
        removeArgs: String(_swapIdx),
      }));
      footer.style.display = 'block';
    }
  }
}

function renderUnifiedGrid(){
  const grid = document.getElementById('usm-grid');
  const searchInput = document.getElementById('usm-search');
  const subtabBar = document.getElementById('usm-subtab-bar');
  const filterPanel = document.getElementById('usm-filter-panel');
  const footer = document.getElementById('usm-footer');
  if(!grid) return;
  // Wave 15: the static TRI row is gone — sort state lives in the FilterBar
  // chips, REBUILT a few lines below (nothing else to sync here).
  const _usmScrollKey = String(_usmAction) + '|' + String(_usmSubTab);
  const _usmPrevScroll = (_usmLastScrollKey === _usmScrollKey && typeof pwSaveScroll === 'function') ? pwSaveScroll(grid) : null;
  _usmLastScrollKey = _usmScrollKey;
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
   // UI overhaul: EVERY Pokémon selection mode gets the same fixed
   // filters/sorts (training slot + queue, hatchery parent + queue,
   // presets, base NPC) — no more filter-less pickers.
   const showBoxFilters = (_usmAction === 'box_view' || _usmAction === 'team' || _usmAction === 'save_icon' || _usmAction === 'hatchery' || String(_usmAction).startsWith('hatchery_queue_') || _usmAction === 'item_rarecandy' || _usmAction === 'training' || String(_usmAction).startsWith('training_queue_') || String(_usmAction).startsWith('preset_slot_') || String(_usmAction).startsWith('basenpc_slot_')) && _usmSubTab === 'box';
  // The selector has its own top search input (#usm-search): the shared box
  // filter bar renders WITHOUT a second search field here.
  const filtersHtml = showBoxFilters && typeof renderBoxFiltersHtml === 'function' ? renderBoxFiltersHtml({ search: false, sorts: usmSortChips() }) : '';
  if(filterPanel){ _pwSetHtmlSafe(filterPanel, filtersHtml); filterPanel.style.display = filtersHtml ? 'block' : 'none'; }
  renderUnifiedSwapFooter();
  grid.classList.remove('usm-modern-grid');
  grid.classList.remove('usm-fossil-view');

  
  // The fossils tab is also offered for a hatchery slot in breeding
  // mode (phase 12: fossil revival from the hatchery).
  let showFossilTab = (_usmAction === 'box_view' || _usmAction === 'hatchery');
  if(!showFossilTab && String(_usmAction).startsWith('hatchery_queue_')){
    const _slotN = Number(String(_usmAction).split('_').pop()) || 0;
    showFossilTab = (typeof hatcherySlotIsIncubation === 'function')
      ? hatcherySlotIsIncubation(_slotN)
      : (((G.hatcheryModes && G.hatcheryModes[_slotN]) || 'exp') === 'breed');
  }
  if(subtabBar){
    if(showFossilTab){
      subtabBar.style.display = 'flex';
      _pwSetHtmlSafe(subtabBar, `
        <button class="hbtn usm-subtab-btn${_usmSubTab === 'fossil' ? '' : ' active'}" data-action="set-usm-subtab" data-subtab="box">${typeof getIcon==='function'?getIcon('box',14):''} ${t('box_label')}</button>
        <button class="hbtn usm-subtab-btn${_usmSubTab === 'fossil' ? ' active' : ''}" data-action="set-usm-subtab" data-subtab="fossil">${typeof getIcon==='function'?getIcon('fossil',14):''} ${t('fossils')}</button>`);
    } else {
      subtabBar.style.display = 'none';
      subtabBar.replaceChildren();
    }
  }

  
  if(showFossilTab && _usmSubTab === 'fossil'){
    grid.classList.remove('usm-modern-grid');
    grid.classList.add('usm-fossil-view');
    if(filterPanel){ filterPanel.replaceChildren(); filterPanel.style.display = 'none'; }
    if(footer){ footer.replaceChildren(); footer.style.display = 'none'; }
    _usmSetGridHtml(grid, renderFossilTabContent(), _usmPrevScroll);
    return;
  }

  
  let list = [];
  if(_usmAction !== 'hatchery'){
    G.team.forEach((p, idx) => {
      if(p) list.push({ p, loc: 'team', idStr: String(idx), teamIdx: idx });
    });
  }
  Object.entries(G.collection || {}).forEach(([idStr, p]) => {
    if(p) list.push({ p, loc: 'box', idStr });
  });
  // Save icon: all OWNED Pokemon are offered — team, box, hatchery and
  // training (pick a favorite without removing it from the team).
  if(_usmAction === 'save_icon'){
    (G.hatchery || []).forEach((s, i) => {
      if(s && s.poke) list.push({ p: s.poke, loc: 'hatchery', idStr: 'h' + i });
    });
    (G.trainingSlots || []).forEach((s, i) => {
      if(s && s.uid){
        const found = (typeof findPokemonByTrainingSlot === 'function') ? findPokemonByTrainingSlot(s) : null;
        if(found && !list.some(e => e.p === found)) list.push({ p: found, loc: 'training', idStr: 't' + i });
      }
    });
  }

  
  if(_usmAction === 'team' || _usmAction === 'hatchery_queue' || String(_usmAction).startsWith('hatchery_queue_') || String(_usmAction).startsWith('training_queue_')){
    list = list.filter(({loc}) => loc === 'box');
  }
  if(_usmAction === 'item_rarecandy') list = list.filter(({p}) => (p.level||1) < 100);
  if(_usmAction === 'hatchery' || _usmAction === 'hatchery_queue' || String(_usmAction).startsWith('hatchery_queue_') || _usmAction === 'training' || String(_usmAction).startsWith('training_queue_')){
    list = list.filter(({p}) => !isPokemonTakenByHatcheryOrTraining(p));
  }

  
  if(q) list = list.filter(({p}) => p.name.toLowerCase().includes(q));
  if(globalThis._usmFilter.type) list = list.filter(({p}) => p.type1 === globalThis._usmFilter.type || p.type2 === globalThis._usmFilter.type);
  if(globalThis._usmFilter.shiny) list = list.filter(({p}) => p.shinyUnlocked || p.shinyActive || p.shiny);
  if(globalThis._usmFilter.inTeam === 'yes') list = list.filter(({loc}) => loc === 'team');
  if(globalThis._usmFilter.inTeam === 'no') list = list.filter(({loc}) => loc === 'box');
  if(showBoxFilters && typeof applyPokemonBoxFilters === 'function') list = applyPokemonBoxFilters(list, { ignoreSearch: true });
   if(String(_usmAction).startsWith('hatchery_queue_')){
     const slotIndex = Number(String(_usmAction).split('_').pop()) || 0;
     const mode = (G.hatcheryModes && G.hatcheryModes[slotIndex]) || 'exp';
     if(mode === 'exp') list = list.filter(({p}) => (p.level||1) < 100);
     if(mode === 'breed') list = list.filter(({p}) => (p.level||1) >= 100);
   }
   if(String(_usmAction).startsWith('item_ct_cs_')){
     const key = G.pendingItemUseKey;
     const itm = ITEMS[key];
     if(itm) {
       // Canonical move id (legacy aliases: icebeam → ice_beam…)
       const moveId = (typeof resolveCtCsMoveId === 'function') ? (resolveCtCsMoveId(key) || itm.moveId) : itm.moveId;
       // PokeChill type compatibility + exclusions: only show the
       // Pokemon that do not know the move yet (current moves) and that cannot
       // already equip it (unlocked by TM or learned by level).
       list = list.filter(function(entry) {
         const p = entry.p;
         if (!p || !moveId) return false;
         const mv = (typeof MOVES !== 'undefined') ? MOVES[moveId] : null;
         if (!mv) return false;
         if ((p.moves || []).some(function(m) { return m && m.id === moveId; })) return false;
         if ((p.trainingUnlockedMoves || []).indexOf(moveId) !== -1) return false;
         if (typeof getMoveLearnLevel === 'function' && getMoveLearnLevel(p.id, moveId) <= (p.level || 1)) return false;
         const mvTypes = mv.moveset || [mv.type] || [];
         if (mvTypes.includes('all')) return true;
         // Lowercase move names vs capitalized Pokemon types → compare in
         // lowercase (otherwise no Pokemon would ever be eligible).
         const types = [p.type1, p.type2].filter(Boolean).map(function(t) { return String(t).toLowerCase(); });
         if (typeof PD !== 'undefined' && PD && PD[p.id]) {
           types.push(String(PD[p.id][1] || '').toLowerCase());
           types.push(String(PD[p.id][2] || '').toLowerCase());
         }
         return mvTypes.some(function(t) { return types.indexOf(String(t).toLowerCase()) !== -1; });
       });
     }
   }
   if(String(_usmAction).startsWith('training_queue_') && typeof globalThis.trainingAutomationEligible === 'function'){
    const slotIndex = Number(String(_usmAction).split('_').pop()) || 0;
    const cfg = (G.trainingAutomation && G.trainingAutomation.slots && G.trainingAutomation.slots[slotIndex]) || {mode:'ev'};
    list = list.filter(({p}) => globalThis.trainingAutomationEligible(p, cfg.mode || 'ev'));
  }

  
  // _usmSortDir multiplies the PRIMARY key only: tiebreaks always read
  // ascending (Pokédex number) so a reversed sort stays deterministic.
  const _sd = _usmSortDir;
  list.sort((a, b) => {
    if(_usmSort === 'level') return _sd * (b.p.level - a.p.level) || (a.p.id||0) - (b.p.id||0);
    if(_usmSort === 'name') return _sd * a.p.name.localeCompare(b.p.name) || (a.p.id||0) - (b.p.id||0);
    if(_usmSort === 'shiny'){
      const aS = a.p.shinyUnlocked||a.p.shinyActive||a.p.shiny ? 1 : 0;
      const bS = b.p.shinyUnlocked||b.p.shinyActive||b.p.shiny ? 1 : 0;
      return _sd * (bS - aS) || (a.p.id||0) - (b.p.id||0);
    }
    if(_usmSort === 'type'){
      const aT = a.p.type1||'';
      const bT = b.p.type1||'';
      if(aT !== bT) return _sd * aT.localeCompare(bT);
      return a.p.id - b.p.id;
    }
    if(_usmSort === 'iv'){
      const ivA = Object.values(a.p.ivs||{}).reduce((x,y)=>x+y,0);
      const ivB = Object.values(b.p.ivs||{}).reduce((x,y)=>x+y,0);
      return _sd * (ivB - ivA) || (a.p.id||0) - (b.p.id||0);
    }
    if(_usmSort === 'ev'){
      const evA = Object.values(a.p.evs||{}).reduce((x,y)=>x+y,0);
      const evB = Object.values(b.p.evs||{}).reduce((x,y)=>x+y,0);
      return _sd * (evB - evA) || (a.p.id||0) - (b.p.id||0);
    }
    if(_usmSort === 'rank'){
      const ra = typeof rankValue==='function' ? rankValue(getPokemonRank(a.p.id)) : 0;
      const rb = typeof rankValue==='function' ? rankValue(getPokemonRank(b.p.id)) : 0;
      return _sd * (rb - ra) || (a.p.id||0) - (b.p.id||0);
    }
    return _sd * ((a.p.id || 0) - (b.p.id || 0));
  });

  // Wave 15 (user feedback — grid bug): the modern class was REMOVED but
  // never re-added, so the cards fell back to the 90px legacy template. It
  // must be set BEFORE the empty-state return too (empty grid = same grid).
  grid.classList.add('usm-modern-grid');
  if(!list.length){
    renderUnifiedSwapFooter();
    _renderUsmItemBackFooter();
    _usmSetGridHtml(grid, `<div class="pw-empty-state box-filter-empty">${t('no_pokemon_found')}</div>`, _usmPrevScroll);
    return;
  }

  // THE single standardized Pokémon card — the fullscreen selector renders
  // EXACTLY the same card as the PC box tab (same DP component, same sprite
  // circle, name + level + actions contract).
  const _usmComps = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) ? window.PokeUI.components : null;
  if (!_usmComps || typeof _usmComps.pokeCardHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (pokeCardHTML)');
  const html = list.map(({p, loc, idStr, teamIdx}) => {
    const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
    const _queuedH = typeof isPokemonQueuedHatchery === 'function' && isPokemonQueuedHatchery(p);
    const _queuedT = typeof isPokemonQueuedTraining === 'function' && isPokemonQueuedTraining(p);
    const badges = '';
    const saveIconCls = _usmAction === 'save_icon' && G.saveMeta && Number(G.saveMeta.iconPokeId) === Number(p.id) ? 'save-icon-selector-card active' : (_usmAction === 'save_icon' ? 'save-icon-selector-card' : '');
    return _usmComps.pokeCardHTML({
      title: t('select_or_details_hint'),
      extraClass: saveIconCls,
      shiny: !!isShiny,
      imgSrc: _usmPokeSpriteSrc(p.id, isShiny),
      emoji: p.emoji || (typeof getPokeEmoji === 'function' ? getPokeEmoji(p.id) : ''),
      size: 'standard',
      name: (typeof getPokeName === 'function' ? getPokeName(p.id) : (p.name || ('#' + p.id))),
      levelLabel: `Lv.${p.level}`,
      badgesHtml: badges,
      select: {
        call: 'selectUnifiedCard',
        callArgs: `'${loc}','${idStr}'`,
        contextCall: loc === 'team' ? 'openPokeModal' : 'openBoxPokeModal',
        contextArgs: loc === 'team' ? String(teamIdx) : `'${idStr}'`,
      },
    });
  }).join('');
  
  
  renderUnifiedSwapFooter();
  _renderUsmItemBackFooter();
  
  _usmSetGridHtml(grid, html, _usmPrevScroll);
}

// "Back to the bag" button in the selector opened from the bag
 // Box selector modal and item target selection
function _renderUsmItemBackFooter(){
  const footer = document.getElementById('usm-footer');
  if(!footer) return;
  if(!String(_usmAction || '').startsWith('item_')) return;
  _pwSetHtmlSafe(footer, `<div class="usm-swap-footer"><button class="hbtn" data-action="close-selector-show-tab" data-tab="inventory">${typeof getIcon==='function'?getIcon('bag',14):''} ${t('back_bag')}</button></div>`);
  footer.style.display = 'block';
}


function cancelTeamSwap() {
  if(typeof setSwapFromTeamIdx==='function') setSwapFromTeamIdx(null); else try{ window._swapFromTeamIdx=null; }catch(_){}
  closeUnifiedSelectorModal();
}


function renderFossilTabContent(){
  const fossils = (typeof getFossilInventory === 'function') ? getFossilInventory() : [];
  if(!fossils.length){
    return `<div class="fossil-empty-state">
      <div class="fossil-empty-icon">&nbsp;</div>
      <b>${t('no_fossils_yet')}</b><br>
      <span>${t('dig_mine_fossils')}</span>
      <div><button class="hbtn" data-action="close-selector-show-tab" data-tab="mine">${typeof getIcon==='function'?getIcon('mine',14):''} ${t('go_to_mine')}</button></div>
    </div>`;
  }
  // Tab opened for a specific slot (incubation slot): the fossil targets it.
  const _fossilSlotIdx = String(_usmAction).startsWith('hatchery_queue_')
    ? Number(String(_usmAction).split('_').pop()) : null;
  const _fossilSlotArg = (_fossilSlotIdx !== null && !Number.isNaN(_fossilSlotIdx)) ? `, ${_fossilSlotIdx}` : '';
  // Displayed quantities = FREE copies (stock − reservations in the
  // hatchery queues, phase 14).
  const _fossilReserved = (typeof getHatcheryFossilReservations === 'function') ? getHatcheryFossilReservations() : {};
  let html = `<div class="fossil-selector-intro">${t('fossil_selector_hint')}</div><div class="fossil-selector-grid">`;
  html += fossils.map(f => {
    const displayKey = f.displayKey || (typeof getFossilDisplayKey === 'function' ? getFossilDisplayKey(f.key) : f.key);
    const pokeId = f.reviveId;
    const pokeName = getPokeName(pokeId);
    const seen = G.pokedex[pokeId]?.seen;
    const owned = speciesOwned(pokeId);
    const stepsReq = (typeof hatcheryStepsForPokemon === 'function') ? hatcheryStepsForPokemon(pokeId) : 15;
    const reserved = _fossilReserved[f.key] || 0;
    const avail = Math.max(0, f.qty - reserved);
    const qtyLabel = reserved > 0
      ? `${t('quantity_abbrev')} &times;${avail} <small>(${tr('fossil_queued_count', {count: reserved})})</small>`
      : `${t('quantity_abbrev')} &times;${avail}`;
    return `<div class="fossil-card ${owned?'is-owned':'is-missing'}">
      <div class="fossil-card-head">
        <div class="fossil-item-icon">${itemIcon(displayKey,40)}</div>
        <div class="fossil-card-title">
          <div class="fossil-name">${getItemName(displayKey)}</div>
          <div class="fossil-qty">${qtyLabel}</div>
        </div>
        <div class="fossil-owned-badge ${owned?'':'is-missing'}" title="${owned?t('owned'):(t('dict_not_owned')||'Not owned')}">${owned?'✓':'!'}</div>
      </div>
      <div class="fossil-card-body">
        <div class="fossil-arrow">↓</div>
        <div class="fossil-target-orb">${spriteImg(pokeId,'',{size:68})}</div>
        <div class="fossil-target-sub">${t('revives_into')}</div>
        <div class="fossil-target-name">${seen?pokeName:'???'} <span>#${pokeId}</span></div>
      </div>
      ${avail > 0
        ? `<button class="hbtn fossil-incubate-btn" data-action="legacy-call" data-call="sendFossilToHatchery" data-call-args="'${f.key}'${_fossilSlotArg}">${t('incubate')} · ${stepsReq} ${t('ko_unit')}</button>`
        : `<button class="hbtn fossil-incubate-btn is-disabled" disabled>${t('fossil_all_queued')}</button>`}
    </div>`;
  }).join('');
  html += `</div>`;
  return html;
}

function sendFossilToHatchery(fossilKey, slotIdx){
  const invQty = (G.inventory && G.inventory[fossilKey]) || 0;
  if(invQty < 1){ notify(t('no_fossil_left'),'var(--red)'); return; }
  // only take a FREE copy: units reserved in a waiting
  // queue cannot be sent a 2nd time (anti-duplicate).
  if(typeof getHatcheryFossilReservations === 'function'){
    const reserved = getHatcheryFossilReservations()[fossilKey] || 0;
    if(invQty - reserved < 1){ notify(t('fossil_all_queued') || t('no_fossil_left'),'var(--red)'); return; }
  }
  const pokeId = (typeof getFossilReviveId === 'function') ? getFossilReviveId(fossilKey) : FOSSIL_REVIVE_MAP[fossilKey];
  if(!pokeId){ notify(t('unknown_fossil'),'var(--red)'); return; }
  if(!G.hatchery) G.hatchery = [null];
  if(!G.hatcheryModes) G.hatcheryModes = ['exp','exp','exp','exp'];
  const maxSlots = (typeof clamp === 'function') ? clamp(G.hatcheryMaxSlots || 1, 1, 4) : Math.max(1, Math.min(4, G.hatcheryMaxSlots || 1));
  while(G.hatchery.length < maxSlots) G.hatchery.push(null);
  let target = -1;
  if(typeof slotIdx === 'number' && !Number.isNaN(slotIdx) && slotIdx >= 0 && slotIdx < maxSlots){
    // Slot explicitly chosen (fossils tab of an incubation slot)
    if(G.hatchery[slotIdx]){ notify(t('hatchery_full'),'var(--red)'); return; }
    target = slotIdx;
  } else {
    // no context: prefer an empty slot in incubation mode,
    // otherwise the first available empty slot (historical behavior).
    target = G.hatchery.findIndex((s, i) => !s && (G.hatcheryModes[i] || 'exp') === 'breed');
    if(target === -1) target = G.hatchery.findIndex(s => s === null);
  }
  if(target === -1){
    notify(t('hatchery_full'),'var(--red)');
    return;
  }
  G.inventory[fossilKey]--;
  if(G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];
  G.hatchery[target] = { poke: null, isFossil: true, fossilKey: fossilKey, reviveId: pokeId, steps: 0, stepsReq: (typeof hatcheryStepsForPokemon === 'function' ? hatcheryStepsForPokemon(pokeId) : 50), mode: ((G.hatcheryModes[target] || 'exp') === 'breed' ? 'breed' : 'exp') };
  saveGame();
  renderHatcheryWindow();
  notify(tr('fossil_sent_hatchery', {item:getItemName(typeof getFossilDisplayKey === 'function' ? getFossilDisplayKey(fossilKey) : fossilKey)}),'var(--green)');
  renderUnifiedGrid();
}

function selectUnifiedCard(loc, idStr){
  if(_usmAction === 'box_view'){ return; }
  let p = null;
  if(loc === 'team'){
    p = G.team[Number(idStr)];
  } else if(loc === 'hatchery'){
    const s = (G.hatchery || [])[Number(String(idStr).slice(1))];
    p = s && s.poke ? s.poke : null;
  } else if(loc === 'training'){
    const s = (G.trainingSlots || [])[Number(String(idStr).slice(1))];
    p = (s && typeof findPokemonByTrainingSlot === 'function') ? findPokemonByTrainingSlot(s) : null;
  } else {
    p = G.collection[idStr];
  }
  if(!p) return;

  if(_usmAction === 'save_icon'){
    if(typeof window.selectSaveProfileIcon === 'function') window.selectSaveProfileIcon(idStr, p.id);
    closeUnifiedSelectorModal();
    return;
  }

  // Phase 48 — picking a Pokemon for a team PRESET: record its uid in the
  // preset (same gesture as for the active team, same screen).
  if(String(_usmAction).startsWith('preset_slot_')){
    const slot = Number(String(_usmAction).split('_').pop());
    if(typeof presetEditorPickChoose === 'function' && p.uid){
      presetEditorPickChoose(slot, p.uid);
    }
    closeUnifiedSelectorModal();
    if(typeof openPresetEditor === 'function' && window._presetEditorOpen){
      openPresetEditor(window._presetEditorOpen);
    }
    return;
  }
  // Phase 48 — choix of a Pokemon for the team of has PNJ of base secrete.
  if(String(_usmAction).startsWith('basenpc_slot_')){
    const slot = Number(String(_usmAction).split('_').pop());
    closeUnifiedSelectorModal();
    if(typeof __pwV43Link('baseNpcEditorAcceptPick') === 'function') baseNpcEditorAcceptPick(slot, p);
    return;
  }

  if(_usmAction === 'team'){
    
    if(loc === 'box' && ((typeof getSwapFromTeamIdx==='function')?getSwapFromTeamIdx():((typeof window!=='undefined')?window._swapFromTeamIdx:null)) != null){
      const teamPoke = G.team[((typeof getSwapFromTeamIdx==='function')?getSwapFromTeamIdx():((typeof window!=='undefined')?window._swapFromTeamIdx:null))];
      if(!teamPoke){
        notify(t('team_pokemon_not_found'), 'var(--red)');
        return;
      }
      
      let newBoxId = 'box_' + teamPoke.id + '_' + Date.now();
      while(G.collection[newBoxId]) {
        newBoxId = 'box_' + teamPoke.id + '_' + Date.now() + Math.floor(Math.random()*1000);
      }
      
      if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(teamPoke); else teamPoke.heldItem = null;
      if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null;
      G.collection[newBoxId] = teamPoke;
      delete G.collection[idStr];
      const _swapSlotIdx = ((typeof getSwapFromTeamIdx==='function')?getSwapFromTeamIdx():((typeof window!=='undefined')?window._swapFromTeamIdx:null));
      G.team[_swapSlotIdx] = p;
      // Phase 16: the Pokemon sortant emporte its item (slot libere).
      if(typeof setTeamSlotItem === 'function') setTeamSlotItem(_swapSlotIdx, null);
      else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
      if(typeof setSwapFromTeamIdx==='function') setSwapFromTeamIdx(null); else try{ window._swapFromTeamIdx=null; }catch(_){}
      closeUnifiedSelectorModal();
      updateHeader();
      renderTeamWindow();
      saveGame();
      notify(tr('pokemon_swapped', {a:p.name, b:teamPoke.name}), 'var(--green)');
    } else if(loc === 'box'){
      
      if(G.team.length >= 6){
        notify(t('team_full_select_replace'), 'var(--red)');
        return;
      }
      if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null;
      G.team.push(p);
      if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
      delete G.collection[idStr];
      closeUnifiedSelectorModal();
      updateHeader();
      renderTeamWindow();
      saveGame();
      notify(tr('added_to_team', {name:p.name}), 'var(--green)');
    } else {
      notify(t('already_in_team'), 'var(--light1)');
    }
  } else if(_usmAction === 'item_rarecandy'){
    if((G.inventory && (G.inventory.rarecandy||0) > 0) && (p.level||1) < 100){
      if(loc === 'team') useRareCandy(Number(idStr));
      else useBoxRareCandy(idStr);
      try{ renderUnifiedGrid(); }catch(_){}
    } else {
      notify(t('legacy_message_n_ce_pok_mon_est_d_j_au_niveau_100_maximu'), 'var(--red)');
    }
  } else if(_usmAction === 'training'){
    if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9);
    const slotIndex = (typeof G.pendingTrainingSlotIndex === 'number') ? G.pendingTrainingSlotIndex : 0;
    if(typeof setTrainingSlotPokemon === 'function'){
      setTrainingSlotPokemon(slotIndex, loc, idStr, p);
    } else {
      G.selectedTraineeUid = p.uid;
      G.selectedTraineeLoc = loc;
      G.selectedTraineeId = idStr;
    }
    G.pendingTrainingSlotIndex = null;
    closeUnifiedSelectorModal();
    renderTrainingWindow();
    notify(tr('selected_for_training_slot', {name:p.name, slot:slotIndex+1}), 'var(--green)');
  } else if(_usmAction === 'hatchery_queue' || String(_usmAction).startsWith('hatchery_queue_')){
    if(loc !== 'box') return;
    const slotIdx = String(_usmAction).startsWith('hatchery_queue_') ? Number(String(_usmAction).split('_').pop()) : null;
    const ok = (typeof addPokemonToHatcheryQueue === 'function') ? addPokemonToHatcheryQueue(idStr, slotIdx, true) : false;
    renderUnifiedGrid();
    if(ok === 'slot') notify(tr('deposited_hatchery', {name:p.name}), 'var(--green)'); else if(ok) notify(tr('queue_added_hatchery', {name:p.name}), 'var(--green)');
    closeUnifiedSelectorModal();
    try{ if(typeof renderHatcheryWindow === 'function') renderHatcheryWindow(); }catch(_){}
  } else if(String(_usmAction).startsWith('training_queue_')){
    if(loc !== 'box') return;
    const slotIndex = Number(String(_usmAction).split('_').pop()) || 0;
    const ok = (typeof addPokemonToTrainingQueue === 'function') ? addPokemonToTrainingQueue(slotIndex, idStr, true) : false;
    renderUnifiedGrid();
    if(ok === 'slot') notify(tr('selected_for_training_slot', {name:p.name, slot:slotIndex+1}), 'var(--green)'); else if(ok) notify(tr('queue_added_training', {name:p.name, slot:slotIndex+1}), 'var(--green)');
    try{ if(typeof openTrainingManagementMenu === 'function') openTrainingManagementMenu('automation'); }catch(_){}
    try{ if(typeof renderTrainingWindow === 'function') renderTrainingWindow(); }catch(_){}
  } else if(String(_usmAction).startsWith('item_ct_cs_')){
    if(loc !== 'box' && loc !== 'team') return;
    const key = G.pendingItemUseKey;
    const itm = ITEMS[key];
    if(!itm) return;
    // Id canonique of the move (alias legacy resolu)
    const moveId = (typeof resolveCtCsMoveId === 'function') ? (resolveCtCsMoveId(key) || itm.moveId) : itm.moveId;
    
    const knows = (p.moves || []).some(m => m.id === moveId);
    if(knows) {
      notify(`${p.name} connaît déjà cette capacité !`, "var(--red)");
      return;
    }
    
    if(!p.trainingUnlockedMoves) p.trainingUnlockedMoves = [];
    if(p.trainingUnlockedMoves.includes(moveId)) {
      notify(`${p.name} a déjà débloqué cette capacité ! Elle est disponible dans ses capacités apprenables.`, "var(--light1)");
      closeUnifiedSelectorModal();
      return;
    }
    
    p.trainingUnlockedMoves.push(moveId);
     if (typeof window !== 'undefined' && typeof window.refreshLearnableMovesPanelIfOpen === 'function') window.refreshLearnableMovesPanelIfOpen();
    notify(`${p.name} peut désormais apprendre ${getMoveName(moveId)} depuis sa fiche !`, "var(--green)");
    
    consumeItem(key);
    closeUnifiedSelectorModal();
    saveGame();
    onInventoryClick(key);
  } else if(_usmAction === 'hatchery'){
    if(loc === 'team' && G.team.length <= 1){
      notify(t('cannot_deposit_only_pokemon'), 'var(--red)');
      return;
    }
    if(!G.hatchery) G.hatchery = [null];
    const emptyIdx = G.hatchery.findIndex(s => s === null);
    if(emptyIdx === -1){
      notify(t('hatchery_full'), 'var(--red)');
      return;
    }
    if(loc === 'team') { if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null; const _depIdx = Number(idStr); G.team.splice(_depIdx, 1); if(typeof removeTeamSlotItemAt === 'function') removeTeamSlotItemAt(_depIdx); else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems(); }
    else { if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null; delete G.collection[idStr]; }
    G.hatchery[emptyIdx] = { poke: p, steps: 0, stepsReq: (typeof hatcheryStepsForPokemon === 'function' ? hatcheryStepsForPokemon(p) : 25) };
    closeUnifiedSelectorModal();
    updateHeader();
    renderTeamWindow();
    saveGame();
    notify(tr('deposited_hatchery', {name:p.name}), 'var(--green)');
  }
}


// --- Migrated to ES module, globals exposed ---
if (typeof openUnifiedSelectorModal !== 'undefined') { if (typeof window !== 'undefined') window.openUnifiedSelectorModal = openUnifiedSelectorModal; if (typeof globalThis !== 'undefined') globalThis.openUnifiedSelectorModal = openUnifiedSelectorModal; }
if (typeof closeUnifiedSelectorModal !== 'undefined') { if (typeof window !== 'undefined') window.closeUnifiedSelectorModal = closeUnifiedSelectorModal; if (typeof globalThis !== 'undefined') globalThis.closeUnifiedSelectorModal = closeUnifiedSelectorModal; }
if (typeof sortUnifiedGrid !== 'undefined') { if (typeof window !== 'undefined') window.sortUnifiedGrid = sortUnifiedGrid; if (typeof globalThis !== 'undefined') globalThis.sortUnifiedGrid = sortUnifiedGrid; }
if (typeof filterUnifiedGrid !== 'undefined') { if (typeof window !== 'undefined') window.filterUnifiedGrid = filterUnifiedGrid; if (typeof globalThis !== 'undefined') globalThis.filterUnifiedGrid = filterUnifiedGrid; }
if (typeof setFilterType !== 'undefined') { if (typeof window !== 'undefined') window.setFilterType = setFilterType; if (typeof globalThis !== 'undefined') globalThis.setFilterType = setFilterType; }
if (typeof setFilterShiny !== 'undefined') { if (typeof window !== 'undefined') window.setFilterShiny = setFilterShiny; if (typeof globalThis !== 'undefined') globalThis.setFilterShiny = setFilterShiny; }
if (typeof setFilterTeam !== 'undefined') { if (typeof window !== 'undefined') window.setFilterTeam = setFilterTeam; if (typeof globalThis !== 'undefined') globalThis.setFilterTeam = setFilterTeam; }
if (typeof setUsmSubTab !== 'undefined') { if (typeof window !== 'undefined') window.setUsmSubTab = setUsmSubTab; if (typeof globalThis !== 'undefined') globalThis.setUsmSubTab = setUsmSubTab; }
if (typeof renderUnifiedGrid !== 'undefined') { if (typeof window !== 'undefined') window.renderUnifiedGrid = renderUnifiedGrid; if (typeof globalThis !== 'undefined') globalThis.renderUnifiedGrid = renderUnifiedGrid; }
if (typeof renderUnifiedSwapFooter !== 'undefined') { if (typeof window !== 'undefined') window.renderUnifiedSwapFooter = renderUnifiedSwapFooter; if (typeof globalThis !== 'undefined') globalThis.renderUnifiedSwapFooter = renderUnifiedSwapFooter; }
if (typeof cancelTeamSwap !== 'undefined') { if (typeof window !== 'undefined') window.cancelTeamSwap = cancelTeamSwap; if (typeof globalThis !== 'undefined') globalThis.cancelTeamSwap = cancelTeamSwap; }
if (typeof renderFossilTabContent !== 'undefined') { if (typeof window !== 'undefined') window.renderFossilTabContent = renderFossilTabContent; if (typeof globalThis !== 'undefined') globalThis.renderFossilTabContent = renderFossilTabContent; }
if (typeof _renderUsmItemBackFooter !== 'undefined') { if (typeof window !== 'undefined') window._renderUsmItemBackFooter = _renderUsmItemBackFooter; if (typeof globalThis !== 'undefined') globalThis._renderUsmItemBackFooter = _renderUsmItemBackFooter; }
if (typeof sendFossilToHatchery !== 'undefined') { if (typeof window !== 'undefined') window.sendFossilToHatchery = sendFossilToHatchery; if (typeof globalThis !== 'undefined') globalThis.sendFossilToHatchery = sendFossilToHatchery; }
if (typeof selectUnifiedCard !== 'undefined') { if (typeof window !== 'undefined') window.selectUnifiedCard = selectUnifiedCard; if (typeof globalThis !== 'undefined') globalThis.selectUnifiedCard = selectUnifiedCard; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  openUnifiedSelectorModal,
  closeUnifiedSelectorModal,
  sortUnifiedGrid,
  filterUnifiedGrid,
  setFilterType,
  setFilterShiny,
  setFilterTeam,
  setUsmSubTab,
  renderUnifiedGrid,
  renderUnifiedSwapFooter,
  cancelTeamSwap,
  renderFossilTabContent,
  _renderUsmItemBackFooter,
  sendFossilToHatchery,
  selectUnifiedCard,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('closeUnifiedSelectorModal', closeUnifiedSelectorModal); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('filterUnifiedGrid', filterUnifiedGrid); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('openUnifiedSelectorModal', openUnifiedSelectorModal); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('setUsmSubTab', setUsmSubTab); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('sortUnifiedGrid', sortUnifiedGrid); } catch (_) {} }
