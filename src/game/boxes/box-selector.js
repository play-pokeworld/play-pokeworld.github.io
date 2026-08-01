var _usmAction = null;
var _usmSort = 'id';
var _usmSubTab = 'box';
var _usmFilter = { type: null, shiny: false, inTeam: null };
var _usmLastScrollKey = null; // contexte du dernier rendu (conservation du scroll)
// Anti « retour en haut » (passe 15) : réécrit la grille en conservant le
// scroll si le contexte (action + sous-onglet) n'a pas changé depuis le
// dernier rendu ; sinon on repart naturellement en haut.
function _usmSetGridHtml(grid, html, prevScroll){
  grid.innerHTML = html;
  if (prevScroll === null || prevScroll === undefined) {
    // Nouveau contexte (sous-onglet, tri…) : retour en haut VOLONTAIRE et
    // déterministe — innerHTML seul conserve scrollTop, on force donc le
    // reset (pwResetScrollNow invalide aussi les restaurations différées).
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
  // Slot de pension en incubation avec priorité « Fossile » : ouvrir
  // directement l'onglet fossiles (le basculement Pokémon reste possible).
  if(String(actionType).startsWith('hatchery_queue_') && typeof hatcherySlotIsIncubation === 'function' && typeof hatcherySlotPriority === 'function'){
    const _slotN = Number(String(actionType).split('_').pop()) || 0;
    if(hatcherySlotIsIncubation(_slotN) && hatcherySlotPriority(_slotN) === 'fossil') _usmSubTab = 'fossil';
  }
  const modal = document.getElementById('unified-selector-modal');
  const titleEl = document.getElementById('usm-title');
  if(!modal || !titleEl) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(actionType === 'hatchery') titleEl.textContent = t('selector_title_hatchery');
  else if(actionType === 'hatchery_queue') titleEl.textContent = t('selector_title_hatchery_queue');
  else if(String(actionType).startsWith('training_queue_')) titleEl.textContent = tr('selector_title_training_queue', {slot:Number(String(actionType).split('_').pop())+1});
  else if(actionType === 'item_rarecandy') titleEl.textContent = t('selector_title_item_use');
  else if(actionType === 'training') titleEl.textContent = t('selector_title_training');
  else if(actionType === 'team') titleEl.textContent = t('selector_title_team');
  // Passe 48 (retour utilisateur) : presets ET PNJ de base utilisent le MÊME
  // sélecteur que l'équipe active — l'interface « boîte PC » complète.
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
  _usmSort = crit;
  document.querySelectorAll('.usm-sort-btn').forEach(b => b.classList.toggle('active', b.dataset.sort === crit));
  renderUnifiedGrid();
}

function filterUnifiedGrid(){ renderUnifiedGrid(); }

function setFilterType(type){
  _usmFilter.type = _usmFilter.type === type ? null : type;
  renderUnifiedGrid();
}

function setFilterShiny(){
  _usmFilter.shiny = !_usmFilter.shiny;
  renderUnifiedGrid();
}

function setFilterTeam(filter){
  _usmFilter.inTeam = _usmFilter.inTeam === filter ? null : filter;
  renderUnifiedGrid();
}


function renderUnifiedSwapFooter(){
  const footer = document.getElementById('usm-footer');
  if(!footer) return;
  footer.innerHTML = '';
  footer.style.display = 'none';
  if(_usmAction === 'team' && _swapFromTeamIdx != null){
    const teamPoke = G.team[_swapFromTeamIdx];
    if(teamPoke){
      footer.innerHTML = `<div class="usm-swap-footer">
        <div class="usm-swap-footer-label">${tr('selected_pokemon', {name:teamPoke.name, level:teamPoke.level})}</div>
        <div class="usm-swap-footer-actions">
          <button class="hbtn usm-cancel-btn" data-action="legacy-call" data-call="cancelTeamSwap" data-call-args="">${typeof getIcon==='function'?getIcon('close',14):''} ${t('cancel')}</button>
          <button class="hbtn usm-remove-btn" data-action="call-close-selector" data-call="removeFromTeam" data-call-args="${_swapFromTeamIdx}">${typeof getIcon==='function'?getIcon('close',14):''} ${t('remove')}</button>
        </div>
      </div>`;
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
  const _usmScrollKey = String(_usmAction) + '|' + String(_usmSubTab);
  const _usmPrevScroll = (_usmLastScrollKey === _usmScrollKey && typeof pwSaveScroll === 'function') ? pwSaveScroll(grid) : null;
  _usmLastScrollKey = _usmScrollKey;
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
   const showBoxFilters = (_usmAction === 'box_view' || _usmAction === 'team' || _usmAction === 'save_icon' || _usmAction === 'hatchery_queue' || String(_usmAction).startsWith('hatchery_queue_') || _usmAction === 'item_rarecandy' || String(_usmAction).startsWith('training_queue_')) && _usmSubTab === 'box';
  const filtersHtml = showBoxFilters && typeof renderBoxFiltersHtml === 'function' ? renderBoxFiltersHtml() : '';
  if(filterPanel){ filterPanel.innerHTML = filtersHtml; filterPanel.style.display = filtersHtml ? 'block' : 'none'; }
  renderUnifiedSwapFooter();
  grid.classList.remove('usm-modern-grid');
  grid.classList.remove('usm-fossil-view');

  
  // L'onglet fossiles est aussi proposé pour un slot de pension en mode
  // incubation : c'est le canal officiel pour ranimer un fossile (passe 12).
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
      subtabBar.innerHTML = `
        <button class="hbtn usm-subtab-btn" class="hbtn usm-subtab-btn" data-action="set-usm-subtab" data-subtab="box">${typeof getIcon==='function'?getIcon('box',14):''} ${t('box_label')}</button>
        <button class="hbtn usm-subtab-btn" class="hbtn usm-subtab-btn" data-action="set-usm-subtab" data-subtab="fossil"> ${t('fossils')}</button>`;
    } else {
      subtabBar.style.display = 'none';
      subtabBar.innerHTML = '';
    }
  }

  
  if(showFossilTab && _usmSubTab === 'fossil'){
    grid.classList.remove('usm-modern-grid');
    grid.classList.add('usm-fossil-view');
    if(filterPanel){ filterPanel.innerHTML = ''; filterPanel.style.display = 'none'; }
    if(footer){ footer.innerHTML = ''; footer.style.display = 'none'; }
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
  // Icône de sauvegarde : TOUS les Pokémon possédés sont proposés — équipe,
  // boîte, pension et entraînement (on choisit un favori sans devoir le
  // retirer de l'équipe).
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

  
  if(q) list = list.filter(({p}) => p.name.toLowerCase().includes(q));
  if(_usmFilter.type) list = list.filter(({p}) => p.type1 === _usmFilter.type || p.type2 === _usmFilter.type);
  if(_usmFilter.shiny) list = list.filter(({p}) => p.shinyUnlocked || p.shinyActive || p.shiny);
  if(_usmFilter.inTeam === 'yes') list = list.filter(({loc}) => loc === 'team');
  if(_usmFilter.inTeam === 'no') list = list.filter(({loc}) => loc === 'box');
  if(showBoxFilters && typeof applyPokemonBoxFilters === 'function') list = applyPokemonBoxFilters(list);
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
       // Id canonique de l'attaque (alias legacy : icebeam → ice_beam…)
       const moveId = (typeof resolveCtCsMoveId === 'function') ? (resolveCtCsMoveId(key) || itm.moveId) : itm.moveId;
       // Compatibilité type PokeChill + exclusions : on n'affiche que les
       // Pokémon qui n'ont PAS encore la capacité (current moves) et qui ne
       // peuvent PAS déjà l'équiper (débloquée par CT ou apprise au niveau).
       list = list.filter(function(entry) {
         var p = entry.p;
         if (!p || !moveId) return false;
         var mv = (typeof MOVES !== 'undefined') ? MOVES[moveId] : null;
         if (!mv) return false;
         if ((p.moves || []).some(function(m) { return m && m.id === moveId; })) return false;
         if ((p.trainingUnlockedMoves || []).indexOf(moveId) !== -1) return false;
         if (typeof getMoveLearnLevel === 'function' && getMoveLearnLevel(p.id, moveId) <= (p.level || 1)) return false;
         var mvTypes = mv.moveset || [mv.type] || [];
         if (mvTypes.includes('all')) return true;
         // movesets en minuscules vs types du Pokémon capitalisés → on compare
         // en minuscules (sinon aucun Pokémon n'était jamais éligible).
         var types = [p.type1, p.type2].filter(Boolean).map(function(t) { return String(t).toLowerCase(); });
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

  
  list.sort((a, b) => {
    if(_usmSort === 'level') return b.p.level - a.p.level;
    if(_usmSort === 'name') return a.p.name.localeCompare(b.p.name);
    if(_usmSort === 'shiny'){
      const aS = a.p.shinyUnlocked||a.p.shinyActive||a.p.shiny ? 1 : 0;
      const bS = b.p.shinyUnlocked||b.p.shinyActive||b.p.shiny ? 1 : 0;
      return bS - aS;
    }
    if(_usmSort === 'type'){
      const aT = a.p.type1||'';
      const bT = b.p.type1||'';
      if(aT !== bT) return aT.localeCompare(bT);
      return a.p.id - b.p.id;
    }
    if(_usmSort === 'iv'){
      const ivA = Object.values(a.p.ivs||{}).reduce((x,y)=>x+y,0);
      const ivB = Object.values(b.p.ivs||{}).reduce((x,y)=>x+y,0);
      return ivB - ivA;
    }
    if(_usmSort === 'ev'){
      const evA = Object.values(a.p.evs||{}).reduce((x,y)=>x+y,0);
      const evB = Object.values(b.p.evs||{}).reduce((x,y)=>x+y,0);
      return evB - evA;
    }
    if(_usmSort === 'rank'){
      const ra = typeof rankValue==='function' ? rankValue(getPokemonRank(a.p.id)) : 0;
      const rb = typeof rankValue==='function' ? rankValue(getPokemonRank(b.p.id)) : 0;
      return rb - ra || (a.p.id||0) - (b.p.id||0);
    }
    return (a.p.id || 0) - (b.p.id || 0);
  });

  if(!list.length){
    renderUnifiedSwapFooter();
    _renderUsmItemBackFooter();
    _usmSetGridHtml(grid, `<div class="pw-empty-state box-filter-empty">${t('no_pokemon_found')}</div>`, _usmPrevScroll);
    return;
  }

  grid.classList.remove('usm-modern-grid');
  let html = list.map(({p, loc, idStr, teamIdx}) => {
    const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
    const queuedH = typeof isPokemonQueuedHatchery === 'function' && isPokemonQueuedHatchery(p);
    const queuedT = typeof isPokemonQueuedTraining === 'function' && isPokemonQueuedTraining(p);
    const badges = '';
    return `
      <div class="box-card ${_usmAction === 'save_icon' && G.saveMeta && Number(G.saveMeta.iconPokeId) === Number(p.id) ? 'save-icon-selector-card active' : (_usmAction === 'save_icon' ? 'save-icon-selector-card' : '')}" data-action="legacy-call" data-call="selectUnifiedCard" data-call-args="'${loc}','${idStr}'" data-context-call="${loc === 'team' ? 'openPokeModal' : 'openBoxPokeModal'}" data-context-args="${loc === 'team' ? teamIdx : `'${idStr}'`}" title="${t('select_or_details_hint')}">
        <div class="box-level">Lv.${p.level}</div>
        <div class="box-status-badges">${badges}</div>
        <div class="box-shiny ${isShiny?'is-visible':'is-hidden'}">★</div>
        <div class="poke-sprite">${spriteImg(p.id, p.emoji, {size: 72, shiny: isShiny})}</div>
      </div>`;
  }).join('');
  
  
  renderUnifiedSwapFooter();
  _renderUsmItemBackFooter();
  
  _usmSetGridHtml(grid, html, _usmPrevScroll);
}

// Bouton « Retour au sac » dans le sélecteur ouvert depuis le sac
// (CT/CS, Super Bonbon…) : avant, il fallait fermer puis rouvrir le sac.
function _renderUsmItemBackFooter(){
  const footer = document.getElementById('usm-footer');
  if(!footer) return;
  if(!String(_usmAction || '').startsWith('item_')) return;
  footer.innerHTML = `<div class="usm-swap-footer"><button class="hbtn" data-action="close-selector-show-tab" data-tab="inventory">${typeof getIcon==='function'?getIcon('bag',14):''} ${t('back_bag')}</button></div>`;
  footer.style.display = 'block';
}


function cancelTeamSwap() {
  _swapFromTeamIdx = null;
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
  // Onglet ouvert pour un slot précis (slot d'incubation) : le fossile le vise.
  const _fossilSlotIdx = String(_usmAction).startsWith('hatchery_queue_')
    ? Number(String(_usmAction).split('_').pop()) : null;
  const _fossilSlotArg = (_fossilSlotIdx !== null && !Number.isNaN(_fossilSlotIdx)) ? `, ${_fossilSlotIdx}` : '';
  // Quantités affichées = exemplaires LIBRES (stock − réservations dans les
  // files) : un fossile déjà réservé ne doit pas sembler disponible (passe 14).
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
        <div class="fossil-target-name">${seen?pokeName:'???'} <span>#${pokeId}</span></div>
        <div class="fossil-target-sub">${t('revives_into')}</div>
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
  // Ne prend qu'un exemplaire LIBRE : les unités réservées dans une file
  // d'attente ne peuvent pas être envoyées une 2ᵉ fois (anti-doublon).
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
    // Slot explicitement choisi (onglet fossiles d'un slot d'incubation)
    if(G.hatchery[slotIdx]){ notify(t('hatchery_full'),'var(--red)'); return; }
    target = slotIdx;
  } else {
    // Sans contexte : préfère un slot vide en mode incubation,
    // sinon le premier slot vide disponible (comportement historique).
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

  // Passe 48 — choix d'un Pokémon pour un PRESET d'équipe : on enregistre son
  // uid dans le preset (même geste que pour l'équipe active, même écran).
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
  // Passe 48 — choix d'un Pokémon pour l'équipe d'un PNJ de base secrète.
  if(String(_usmAction).startsWith('basenpc_slot_')){
    const slot = Number(String(_usmAction).split('_').pop());
    closeUnifiedSelectorModal();
    if(typeof baseNpcEditorAcceptPick === 'function') baseNpcEditorAcceptPick(slot, p);
    return;
  }

  if(_usmAction === 'team'){
    
    if(loc === 'box' && _swapFromTeamIdx != null){
      const teamPoke = G.team[_swapFromTeamIdx];
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
      const _swapSlotIdx = _swapFromTeamIdx;
      G.team[_swapSlotIdx] = p;
      // Passe 16 : le Pokémon sortant emporte son objet (slot libéré).
      if(typeof setTeamSlotItem === 'function') setTeamSlotItem(_swapSlotIdx, null);
      else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
      _swapFromTeamIdx = null;
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
    // Id canonique de l'attaque (alias legacy résolu)
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
if (typeof openUnifiedSelectorModal !== 'undefined' && typeof window !== 'undefined') window.openUnifiedSelectorModal = openUnifiedSelectorModal;
if (typeof closeUnifiedSelectorModal !== 'undefined' && typeof window !== 'undefined') window.closeUnifiedSelectorModal = closeUnifiedSelectorModal;
if (typeof sortUnifiedGrid !== 'undefined' && typeof window !== 'undefined') window.sortUnifiedGrid = sortUnifiedGrid;
if (typeof filterUnifiedGrid !== 'undefined' && typeof window !== 'undefined') window.filterUnifiedGrid = filterUnifiedGrid;
if (typeof setFilterType !== 'undefined' && typeof window !== 'undefined') window.setFilterType = setFilterType;
if (typeof setFilterShiny !== 'undefined' && typeof window !== 'undefined') window.setFilterShiny = setFilterShiny;
if (typeof setFilterTeam !== 'undefined' && typeof window !== 'undefined') window.setFilterTeam = setFilterTeam;
if (typeof renderUnifiedGrid !== 'undefined' && typeof window !== 'undefined') window.renderUnifiedGrid = renderUnifiedGrid;
if (typeof renderUnifiedSwapFooter !== 'undefined' && typeof window !== 'undefined') window.renderUnifiedSwapFooter = renderUnifiedSwapFooter;
if (typeof cancelTeamSwap !== 'undefined' && typeof window !== 'undefined') window.cancelTeamSwap = cancelTeamSwap;
if (typeof renderFossilTabContent !== 'undefined' && typeof window !== 'undefined') window.renderFossilTabContent = renderFossilTabContent;
if (typeof _renderUsmItemBackFooter !== 'undefined' && typeof window !== 'undefined') window._renderUsmItemBackFooter = _renderUsmItemBackFooter;
if (typeof sendFossilToHatchery !== 'undefined' && typeof window !== 'undefined') window.sendFossilToHatchery = sendFossilToHatchery;
if (typeof selectUnifiedCard !== 'undefined' && typeof window !== 'undefined') window.selectUnifiedCard = selectUnifiedCard;


