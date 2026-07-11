// ===== Box Selector - Style PokéChill =====
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
  if(sm) sm.classList.remove('open');

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
  if(actionType === 'hatchery') titleEl.textContent = 'Pension & Couveuse';
  else if(actionType === 'training') titleEl.textContent = 'Salle d\'Entraînement';
  else if(actionType === 'team') titleEl.textContent = 'Sélection Équipe';
  else titleEl.textContent = 'Boîte PC';
  
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

function renderUnifiedGrid(){
  const grid = document.getElementById('usm-grid');
  const searchInput = document.getElementById('usm-search');
  const subtabBar = document.getElementById('usm-subtab-bar');
  if(!grid) return;
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';

  // Subtabs
  const showFossilTab = (_usmAction === 'box_view' || _usmAction === 'hatchery');
  if(subtabBar){
    if(showFossilTab){
      subtabBar.style.display = 'flex';
      subtabBar.innerHTML = `
        <button class="hbtn usm-subtab-btn" class="hbtn usm-subtab-btn" style="flex:1;padding:8px;font-size:13px;font-weight:bold;${_usmSubTab==='box'?'background:var(--light2);color:var(--dark1);':''}" onclick="_usmSubTab='box';renderUnifiedGrid()">📦 ${isEn?'Box':'Boîte'}</button>
        <button class="hbtn usm-subtab-btn" class="hbtn usm-subtab-btn" style="flex:1;padding:8px;font-size:13px;font-weight:bold;${_usmSubTab==='fossil'?'background:var(--light2);color:var(--dark1);':''}" onclick="_usmSubTab='fossil';renderUnifiedGrid()"> ${isEn?'Fossils':'Fossiles'}</button>`;
    } else {
      subtabBar.style.display = 'none';
      subtabBar.innerHTML = '';
    }
  }

  // FOSSIL TAB
  if(showFossilTab && _usmSubTab === 'fossil'){
    grid.innerHTML = renderFossilTabContent(isEn);
    return;
  }

  // BOX TAB
  let list = [];
  if(_usmAction !== 'hatchery'){
    G.team.forEach((p, idx) => {
      if(p) list.push({ p, loc: 'team', idStr: String(idx), teamIdx: idx });
    });
  }
  Object.entries(G.collection || {}).forEach(([idStr, p]) => {
    if(p) list.push({ p, loc: 'box', idStr });
  });

  // Filter: hide team Pokémon when opening from team action
  if(_usmAction === 'team'){
    list = list.filter(({loc}) => loc === 'box');
  }

  // Filters
  if(q) list = list.filter(({p}) => p.name.toLowerCase().includes(q));
  if(_usmFilter.type) list = list.filter(({p}) => p.type1 === _usmFilter.type || p.type2 === _usmFilter.type);
  if(_usmFilter.shiny) list = list.filter(({p}) => p.shinyUnlocked || p.shinyActive || p.shiny);
  if(_usmFilter.inTeam === 'yes') list = list.filter(({loc}) => loc === 'team');
  if(_usmFilter.inTeam === 'no') list = list.filter(({loc}) => loc === 'box');

  // Sort
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
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--panel-text)">${isEn?'No Pokémon found.':'Aucun Pokémon trouvé.'}</div>`;
    return;
  }

  // Render - PokéChill style: round card, level on top, shiny star
  let html = list.map(({p, loc, idStr, teamIdx}) => {
    const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
    const clickFn = `selectUnifiedCard('${loc}', '${idStr}')`;
    const rightClickFn = loc === 'team' ? `openPokeModal(${teamIdx})` : `openBoxPokeModal('${idStr}')`;

    return `
      <div class="box-card" onclick="${clickFn}" oncontextmenu="event.preventDefault(); ${rightClickFn}; return false;" title="${isEn?'Click: Select | Right-Click: Details':'Clic: Sélectionner | Clic Droit: Fiche'}">
        <div class="box-level">Lv.${p.level}</div>
        <div class="box-shiny" style="display:${isShiny?'block':'none'}">★</div>
        <div class="poke-sprite">${spriteImg(p.id, p.emoji, {size: 72, shiny: isShiny})}</div>
      </div>`;
  }).join('');
  
  // Add action buttons at bottom when exchanging team Pokémon (like item selector in bag)
  if (_usmAction === 'team' && _swapFromTeamIdx != null) {
    const teamPoke = G.team[_swapFromTeamIdx];
    if (teamPoke) {
      html += `<div style="grid-column: 1 / -1; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--light1);">
        <div style="font-size: 13px; color: var(--light2); margin-bottom: 8px;">Sélectionné: ${teamPoke.name} (Nv.${teamPoke.level})</div>
        <div style="display:flex;gap:8px;">
          <button class="hbtn" style="flex:1;padding:10px;background:var(--dark3);color:var(--light2);" onclick="cancelTeamSwap()">✖ Annuler</button>
          <button class="hbtn" style="flex:1;padding:10px;background:var(--red);color:#fff;" onclick="removeFromTeam(${_swapFromTeamIdx}); closeUnifiedSelectorModal();">❌ Retirer</button>
        </div>
      </div>`;
    }
  }
  
  grid.innerHTML = html;
}

// Cancel team swap
function cancelTeamSwap() {
  _swapFromTeamIdx = null;
  closeUnifiedSelectorModal();
}

// Fossil tab
function renderFossilTabContent(isEn){
  const fossils = (typeof getFossilInventory === 'function') ? getFossilInventory() : [];
  if(!fossils.length){
    return `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--panel-text)">
      <div style="font-size: 15px;margin-bottom:8px">⛏️</div>
      <b>${isEn?'No fossils yet':'Aucun fossile'}</b><br>
      <span style="font-size: 13px">${isEn?'Dig in the Underground Mine to find fossils!':'Creusez dans la Mine Souterraine pour trouver des fossiles !'}</span>
      <div style="margin-top:12px"><button class="hbtn" style="background:var(--accent);color:var(--dark1)" onclick="closeUnifiedSelectorModal();showTab('mine');">️ ${isEn?'Go to Mine':'Aller à la Mine'}</button></div>
    </div>`;
  }
  let html = `<div style="grid-column:1/-1;font-size: 13px;color:var(--panel-text);margin-bottom:10px">
    ${isEn?'Select a fossil to send it to the Hatchery.':'Sélectionnez un fossile pour l\'envoyer à la Pension.'}
  </div>`;
  html += fossils.map(f => {
    const item = ITEMS[f.key] || {};
    const pokeId = f.reviveId;
    const pokeName = getPokeName(pokeId);
    const seen = G.pokedex[pokeId]?.seen;
    const owned = speciesOwned(pokeId);
    const stepsReq = 15;
    return `<div style="background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;color:var(--panel-text)">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size: 15px">${itemIcon(f.key,36)}</div>
        <div style="flex:1">
          <div style="font-weight:bold;font-size: 13px">${getItemName(f.key)}</div>
          <div style="font-size: 13px;color:var(--light1)">${isEn?'Qty':'Qté'}: <b>×${f.qty}</b></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:var(--dark3);padding:8px;border-radius:8px;color:var(--light2)">
        <div>${spriteImg(pokeId,'🦖',{size:40})}</div>
        <div>
          <div style="font-weight:bold;font-size:13px">${seen?pokeName:'???'} <span style="color:var(--light1);font-size:13px">#${pokeId}</span></div>
          <div style="font-size:13px;color:var(--light1)">${isEn?'Revives into':'Ranime en'} · ${owned?'✅':''}</div>
        </div>
      </div>
      <button class="hbtn" style="background:var(--accent);color:var(--dark1);font-weight:bold;font-size: 13px" onclick="sendFossilToHatchery('${f.key}')"> ${isEn?'Incubate':'Incuber'} (${stepsReq} ${isEn?'KOs':'KO'})</button>
    </div>`;
  }).join('');
  return html;
}

function sendFossilToHatchery(fossilKey){
  const isEn = (G && G.lang) === 'en';
  const invQty = (G.inventory && G.inventory[fossilKey]) || 0;
  if(invQty < 1){ notify(isEn?'No fossil left!':'Plus de fossile !','var(--red)'); return; }
  const pokeId = FOSSIL_REVIVE_MAP[fossilKey];
  if(!pokeId){ notify(isEn?'Unknown fossil.':'Fossile inconnu.','var(--red)'); return; }
  if(!G.hatchery) G.hatchery = [null];
  const emptyIdx = G.hatchery.findIndex(s => s === null);
  if(emptyIdx === -1){
    notify(isEn?'Hatchery full!':'Couveuse pleine !','var(--red)');
    return;
  }
  G.inventory[fossilKey]--;
  if(G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];
  G.hatchery[emptyIdx] = { poke: null, isFossil: true, fossilKey: fossilKey, reviveId: pokeId, steps: 0, stepsReq: 15 };
  saveGame();
  renderHatcheryWindow();
  notify(isEn?` ${getItemName(fossilKey)} sent to the Hatchery!`:`🦴 ${getItemName(fossilKey)} envoyé à la Pension !`,'var(--green)');
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

  if(_usmAction === 'team'){
    // Exchange team Pokémon with box Pokémon
    if(loc === 'box' && _swapFromTeamIdx != null){
      const teamPoke = G.team[_swapFromTeamIdx];
      if(!teamPoke){
        notify("Pokémon d'équipe introuvable !", "var(--red)");
        return;
      }
      // Find new box slot for team Pokémon
      let newBoxId = 'box_' + teamPoke.id + '_' + Date.now();
      while(G.collection[newBoxId]) {
        newBoxId = 'box_' + teamPoke.id + '_' + Date.now() + Math.floor(Math.random()*1000);
      }
      // Perform exchange
      G.collection[newBoxId] = teamPoke;
      delete G.collection[idStr];
      G.team[_swapFromTeamIdx] = p;
      _swapFromTeamIdx = null;
      closeUnifiedSelectorModal();
      updateHeader();
      renderTeamWindow();
      saveGame();
      notify(`🔁 ${p.name} et ${teamPoke.name} ont été échangés !`, 'var(--green)');
    } else if(loc === 'box'){
      // No team Pokémon selected, just add
      if(G.team.length >= 6){
        notify("Équipe pleine ! (6/6) - Sélectionnez d'abord un Pokémon de l'équipe à remplacer.", "var(--red)");
        return;
      }
      G.team.push(p);
      delete G.collection[idStr];
      closeUnifiedSelectorModal();
      updateHeader();
      renderTeamWindow();
      saveGame();
      notify(`➕ ${p.name} ajouté à l'équipe !`, 'var(--green)');
    } else {
      notify("Ce Pokémon est déjà dans l'équipe !", "var(--light1)");
    }
  } else if(_usmAction === 'training'){
    if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9);
    G.selectedTraineeUid = p.uid;
    G.selectedTraineeLoc = loc;
    G.selectedTraineeId = idStr;
    closeUnifiedSelectorModal();
    renderTrainingWindow();
    notify(`🏋️ ${p.name} sélectionné pour l'entraînement !`, 'var(--green)');
  } else if(_usmAction === 'hatchery'){
    if(loc === 'team' && G.team.length <= 1){
      notify("Impossible de déposer votre seul Pokémon !", "var(--red)");
      return;
    }
    if(!G.hatchery) G.hatchery = [null];
    const emptyIdx = G.hatchery.findIndex(s => s === null);
    if(emptyIdx === -1){
      notify("Couveuse pleine !", "var(--red)");
      return;
    }
    if(loc === 'team') G.team.splice(Number(idStr), 1);
    else delete G.collection[idStr];
    G.hatchery[emptyIdx] = { poke: p, steps: 0, stepsReq: 10 };
    closeUnifiedSelectorModal();
    updateHeader();
    renderTeamWindow();
    saveGame();
    notify(`🥚 ${p.name} déposé à la pension !`, 'var(--green)');
  }
}
