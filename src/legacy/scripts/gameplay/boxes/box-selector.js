var _usmAction = null;
var _usmSort = 'id';
var _usmSubTab = 'box';
var _usmFilter = { type: null, shiny: false, inTeam: null };

function openUnifiedSelectorModal(actionType){
  closeFullscreenPanel();
  if(typeof closeBattleSummary === 'function') closeBattleSummary();
  const qm = document.getElementById('quest-modal');
  if(qm) qm.classList.remove('open');
  const sm = document.getElementById('settings-modal');
  if(sm && actionType !== 'save_icon') sm.classList.remove('open');

  if(typeof battle !== 'undefined' && battle && battle.active && actionType === 'training'){
    notify("Combat en cours !", "var(--red)");
    return;
  }
  _usmAction = actionType;
  _usmSubTab = 'box';
  const modal = document.getElementById('unified-selector-modal');
  const titleEl = document.getElementById('usm-title');
  if(!modal || !titleEl) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(actionType === 'hatchery') titleEl.textContent = t('selector_title_hatchery');
  else if(actionType === 'training') titleEl.textContent = t('selector_title_training');
  else if(actionType === 'team') titleEl.textContent = t('selector_title_team');
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
          <button class="hbtn usm-cancel-btn" data-action="legacy-call" data-call="cancelTeamSwap" data-call-args="">✖ ${t('cancel')}</button>
          <button class="hbtn usm-remove-btn" data-action="call-close-selector" data-call="removeFromTeam" data-call-args="${_swapFromTeamIdx}">❌ ${t('remove')}</button>
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
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const showBoxFilters = (_usmAction === 'box_view' || _usmAction === 'team' || _usmAction === 'save_icon') && _usmSubTab === 'box';
  const filtersHtml = showBoxFilters && typeof renderBoxFiltersHtml === 'function' ? renderBoxFiltersHtml() : '';
  if(filterPanel){ filterPanel.innerHTML = filtersHtml; filterPanel.style.display = filtersHtml ? 'block' : 'none'; }
  renderUnifiedSwapFooter();
  grid.classList.remove('usm-modern-grid');
  grid.classList.remove('usm-fossil-view');

  
  const showFossilTab = (_usmAction === 'box_view' || _usmAction === 'hatchery');
  if(subtabBar){
    if(showFossilTab){
      subtabBar.style.display = 'flex';
      subtabBar.innerHTML = `
        <button class="hbtn usm-subtab-btn" class="hbtn usm-subtab-btn" data-style="flex:1;padding:8px;font-size:13px;font-weight:bold;${_usmSubTab==='box'?'background:var(--light2);color:var(--dark1);':''}" data-action="set-usm-subtab" data-subtab="box">📦 ${t('box_label')}</button>
        <button class="hbtn usm-subtab-btn" class="hbtn usm-subtab-btn" data-style="flex:1;padding:8px;font-size:13px;font-weight:bold;${_usmSubTab==='fossil'?'background:var(--light2);color:var(--dark1);':''}" data-action="set-usm-subtab" data-subtab="fossil"> ${t('fossils')}</button>`;
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
    grid.innerHTML = renderFossilTabContent();
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

  
  if(_usmAction === 'team' || _usmAction === 'save_icon'){
    list = list.filter(({loc}) => loc === 'box');
  }

  
  if(q) list = list.filter(({p}) => p.name.toLowerCase().includes(q));
  if(_usmFilter.type) list = list.filter(({p}) => p.type1 === _usmFilter.type || p.type2 === _usmFilter.type);
  if(_usmFilter.shiny) list = list.filter(({p}) => p.shinyUnlocked || p.shinyActive || p.shiny);
  if(_usmFilter.inTeam === 'yes') list = list.filter(({loc}) => loc === 'team');
  if(_usmFilter.inTeam === 'no') list = list.filter(({loc}) => loc === 'box');
  if(showBoxFilters && typeof applyPokemonBoxFilters === 'function') list = applyPokemonBoxFilters(list);

  
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
    return (a.p.id || 0) - (b.p.id || 0);
  });

  if(!list.length){
    renderUnifiedSwapFooter();
    grid.innerHTML = `<div class="extracted-template-style-128 box-filter-empty">${t('no_pokemon_found')}</div>`;
    return;
  }

  grid.classList.remove('usm-modern-grid');
  let html = list.map(({p, loc, idStr, teamIdx}) => {
    const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
    return `
      <div class="box-card ${_usmAction === 'save_icon' && G.saveMeta && Number(G.saveMeta.iconPokeId) === Number(p.id) ? 'save-icon-selector-card active' : (_usmAction === 'save_icon' ? 'save-icon-selector-card' : '')}" data-action="legacy-call" data-call="selectUnifiedCard" data-call-args="'${loc}','${idStr}'" data-context-call="${loc === 'team' ? 'openPokeModal' : 'openBoxPokeModal'}" data-context-args="${loc === 'team' ? teamIdx : `'${idStr}'`}" title="${t('select_or_details_hint')}">
        <div class="box-level">Lv.${p.level}</div>
        <div class="box-shiny ${isShiny?'is-visible':'is-hidden'}">★</div>
        <div class="poke-sprite">${spriteImg(p.id, p.emoji, {size: 72, shiny: isShiny})}</div>
      </div>`;
  }).join('');
  
  
  renderUnifiedSwapFooter();
  
  grid.innerHTML = html;
}


function cancelTeamSwap() {
  _swapFromTeamIdx = null;
  closeUnifiedSelectorModal();
}


function renderFossilTabContent(){
  const fossils = (typeof getFossilInventory === 'function') ? getFossilInventory() : [];
  if(!fossils.length){
    return `<div class="fossil-empty-state">
      <div class="fossil-empty-icon">⛏️</div>
      <b>${t('no_fossils_yet')}</b><br>
      <span>${t('dig_mine_fossils')}</span>
      <div><button class="hbtn" data-action="close-selector-show-tab" data-tab="mine">⛏ ${t('go_to_mine')}</button></div>
    </div>`;
  }
  let html = `<div class="fossil-selector-intro">${t('fossil_selector_hint')}</div><div class="fossil-selector-grid">`;
  html += fossils.map(f => {
    const displayKey = f.displayKey || (typeof getFossilDisplayKey === 'function' ? getFossilDisplayKey(f.key) : f.key);
    const pokeId = f.reviveId;
    const pokeName = getPokeName(pokeId);
    const seen = G.pokedex[pokeId]?.seen;
    const owned = speciesOwned(pokeId);
    const stepsReq = 15;
    return `<div class="fossil-card ${owned?'is-owned':'is-missing'}">
      <div class="fossil-card-head">
        <div class="fossil-item-icon">${itemIcon(displayKey,40)}</div>
        <div class="fossil-card-title">
          <div class="fossil-name">${getItemName(displayKey)}</div>
          <div class="fossil-qty">${t('quantity_abbrev')} &times;${f.qty}</div>
        </div>
        <div class="fossil-owned-badge ${owned?'':'is-missing'}" title="${owned?t('owned'):'Non possédé'}">${owned?'✓':'!'}</div>
      </div>
      <div class="fossil-card-body">
        <div class="fossil-arrow">↓</div>
        <div class="fossil-target-orb">${spriteImg(pokeId,'🦖',{size:68})}</div>
        <div class="fossil-target-name">${seen?pokeName:'???'} <span>#${pokeId}</span></div>
        <div class="fossil-target-sub">${t('revives_into')}</div>
      </div>
      <button class="hbtn fossil-incubate-btn" data-action="legacy-call" data-call="sendFossilToHatchery" data-call-args="'${f.key}'">${t('incubate')} · ${stepsReq} ${t('ko_unit')}</button>
    </div>`;
  }).join('');
  html += `</div>`;
  return html;
}

function sendFossilToHatchery(fossilKey){
  const invQty = (G.inventory && G.inventory[fossilKey]) || 0;
  if(invQty < 1){ notify(t('no_fossil_left'),'var(--red)'); return; }
  const pokeId = (typeof getFossilReviveId === 'function') ? getFossilReviveId(fossilKey) : FOSSIL_REVIVE_MAP[fossilKey];
  if(!pokeId){ notify(t('unknown_fossil'),'var(--red)'); return; }
  if(!G.hatchery) G.hatchery = [null];
  const emptyIdx = G.hatchery.findIndex(s => s === null);
  if(emptyIdx === -1){
    notify(t('hatchery_full'),'var(--red)');
    return;
  }
  G.inventory[fossilKey]--;
  if(G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];
  G.hatchery[emptyIdx] = { poke: null, isFossil: true, fossilKey: fossilKey, reviveId: pokeId, steps: 0, stepsReq: 15 };
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
  } else {
    p = G.collection[idStr];
  }
  if(!p) return;

  if(_usmAction === 'save_icon'){
    if(typeof window.selectSaveProfileIcon === 'function') window.selectSaveProfileIcon(idStr, p.id);
    closeUnifiedSelectorModal();
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
      G.team[_swapFromTeamIdx] = p;
      if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
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
  } else if(_usmAction === 'training'){
    if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9);
    G.selectedTraineeUid = p.uid;
    G.selectedTraineeLoc = loc;
    G.selectedTraineeId = idStr;
    closeUnifiedSelectorModal();
    renderTrainingWindow();
    notify(tr('selected_for_training', {name:p.name}), 'var(--green)');
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
    if(loc === 'team') { if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null; G.team.splice(Number(idStr), 1); if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems(); }
    else { if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null; delete G.collection[idStr]; }
    G.hatchery[emptyIdx] = { poke: p, steps: 0, stepsReq: 10 };
    closeUnifiedSelectorModal();
    updateHeader();
    renderTeamWindow();
    saveGame();
    notify(tr('deposited_hatchery', {name:p.name}), 'var(--green)');
  }
}
