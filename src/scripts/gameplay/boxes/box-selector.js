
// ===== extracted from src/scripts/gameplay/breeding/hatchery.js =====
var _usmAction = null;
var _usmSort = 'id';
var _usmSubTab = 'box';

function openUnifiedSelectorModal(actionType){
  // Close other modals first (no overlap)
  closeFullscreenPanel();
  if(typeof closeBattleSummary === 'function') closeBattleSummary();
  const qm = document.getElementById('quest-modal');
  if(qm) qm.classList.remove('open');
  const sm = document.getElementById('settings-modal');
  if(sm) sm.classList.remove('open');

  if(typeof battle !== 'undefined' && battle && battle.active && actionType === 'training'){
    notify(t("n2.combat_en_cours_terminez_dabord_votre_af"), "var(--red)");
    return;
  }
  _usmAction = actionType;
  _usmSubTab = 'box'; // default to box view
  const modal = document.getElementById('unified-selector-modal');
  const titleEl = document.getElementById('usm-title');
  if(!modal || !titleEl) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(actionType === 'hatchery') titleEl.textContent = t("m.box_selector.4");
  else if(actionType === 'training') titleEl.textContent = t("m.box_selector.3");
  else if(actionType === 'team') titleEl.textContent = t("m.box_selector.2");
  else titleEl.textContent = t("m.box_selector.1");
  
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

function renderUnifiedGrid(){
  const grid = document.getElementById('usm-grid');
  const searchInput = document.getElementById('usm-search');
  const subtabBar = document.getElementById('usm-subtab-bar');
  if(!grid) return;
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';

  // Build navigation tabs — render in the STICKY subtab bar (above scroll area)
  const showFossilTab = (_usmAction === 'box_view' || _usmAction === 'hatchery');
  if(subtabBar){
    if(showFossilTab){
      subtabBar.style.display = 'flex';
      subtabBar.innerHTML = `<button class="hbtn usm-subtab-btn" style="flex:1;padding:8px;font-size:13px;font-weight:bold;${_usmSubTab==='box'?'background:var(--blue);color:#fff;':''}" onclick="_usmSubTab='box';renderUnifiedGrid()">${isEn?'📦 Box':'📦 Boîte'}</button>
        <button class="hbtn usm-subtab-btn" style="flex:1;padding:8px;font-size:13px;font-weight:bold;${_usmSubTab==='fossil'?'background:var(--gold);color:#000;':''}" onclick="_usmSubTab='fossil';renderUnifiedGrid()">🦴 ${isEn?'Fossils':'Fossiles'}</button>`;
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

  if(q) list = list.filter(({p}) => p.name.toLowerCase().includes(q));

  list.sort((a, b) => {
    if(_usmSort === 'level') return b.p.level - a.p.level;
    if(_usmSort === 'name') return a.p.name.localeCompare(b.p.name);
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
    grid.innerHTML =  `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--dim)">${isEn?'No Pokémon found.':'Aucun Pokémon trouvé.'}</div>`;
    return;
  }

  grid.innerHTML =  list.map(({p, loc, idStr, teamIdx}) => {
    const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
    const totalIv = Object.values(p.ivs||{}).reduce((x,y)=>x+y,0);
    const totalEv = Object.values(p.evs||{}).reduce((x,y)=>x+y,0);
    const itm = p.heldItem ? ITEMS[p.heldItem] : null;
    const clickFn = `selectUnifiedCard('${loc}', '${idStr}')`;
    const rightClickFn = loc === 'team' ? `openPokeModal(${teamIdx})` : `openBoxPokeModal('${idStr}')`;

    return `<div class="box-card" style="background:rgba(30,24,20,0.95);border:1px solid ${isShiny?'var(--yellow)':'#4a3c2e'};border-radius:8px;padding:8px;cursor:pointer;display:flex;flex-direction:column;gap:6px;transition:0.2s;" onclick="${clickFn}" oncontextmenu="event.preventDefault(); ${rightClickFn}; return false;" title="${isEn?'Click: Select | Right-Click: Details':'Clic: Sélectionner | Clic Droit: Fiche détaillée'}">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:6px;flex-shrink:0;">
          ${spriteImg(p.id, p.emoji, {size:42, shiny:isShiny})}
        </div>
        <div style="min-width:0;flex:1;">
          <div style="font-weight:bold;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${isShiny?'✨ ':''}${p.name}</div>
          <div style="font-size:11px;color:var(--gold);">Nv.${p.level} <span style="color:var(--dim);font-size:10px;">(${loc==='team'?'⚡ '+t('win_team'):'📦 '+t('tab_box')})</span></div>
          <div style="font-size:10px;color:${itm?'var(--gold)':'var(--dim)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">🎒 ${itm?itm.icon+' '+getItemName(p.heldItem):t('no_item')}</div>
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.4);border-radius:4px;padding:4px 6px;font-size:10px;display:flex;justify-content:space-between;border:1px solid #2a221a;">
        <span style="color:#ffd700;"><b>IVs:</b> ${totalIv}/36 ⭐</span>
        <span style="color:#55a646;"><b>EVs:</b> ${totalEv}/36 🟢</span>
      </div>
    </div>`;
  }).join('');
}

// ---- FOSSIL TAB (inside the unified selector modal) ----
function renderFossilTabContent(isEn){
  const fossils = (typeof getFossilInventory === 'function') ? getFossilInventory() : [];
  if(!fossils.length){
    return `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--dim)">
      <div style="font-size:32px;margin-bottom:8px">⛏️</div>
      <b>${isEn?'No fossils yet':'Aucun fossile'}</b><br>
      <span style="font-size:12px">${isEn?'Dig in the Underground Mine to find fossils!':'Creusez dans la Mine Souterraine pour trouver des fossiles !'}</span>
      <div style="margin-top:12px"><button class="hbtn" style="background:var(--blue);color:#fff" onclick="closeUnifiedSelectorModal();showTab('mine');">⛏️ ${isEn?'Go to Mine':'Aller à la Mine'}</button></div>
    </div>`;
  }
  let html = `<div style="grid-column:1/-1;font-size:12px;color:var(--dim);margin-bottom:10px;">
    ${isEn?'Select a fossil to send it to the Hatchery. It will incubate (requiring wild battle victories) and revive into its prehistoric Pokémon!':'Sélectionnez un fossile pour l\u2019envoyer à la Pension. Il incubéra (requiert des victoires en combat sauvage) et ranimera son Pokémon préhistorique !'}
  </div>`;
  html += fossils.map(f => {
    const item = ITEMS[f.key] || {};
    const pokeId = f.reviveId;
    const pokeName = getPokeName(pokeId);
    const seen = G.pokedex[pokeId]?.seen;
    const owned = speciesOwned(pokeId);
    const stepsReq = 15; // fossils need 15 KO to revive
    return `<div style="background:rgba(30,24,20,0.95);border:1px solid #4a3c2e;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px;">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:32px">${itemIcon(f.key,36)}</div>
        <div style="flex:1">
          <div style="font-weight:bold;font-size:13px;color:#fff">${getItemName(f.key)}</div>
          <div style="font-size:11px;color:var(--gold)">${isEn?'Qty':'Qté'}: <b style="color:var(--gold)">×${f.qty}</b></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.2);padding:6px;border-radius:6px">
        <div>${spriteImg(pokeId,'🦖',{size:40})}</div>
        <div>
          <div style="font-weight:bold;font-size:12px">${seen?pokeName:'???'} <span style="color:var(--dim);font-size:10px">#${pokeId}</span></div>
          <div style="font-size:10px;color:var(--dim)">${isEn?'Revives into':'Ranime en'} · ${owned?'✅':''}</div>
        </div>
      </div>
      <button class="hbtn" style="background:var(--green);color:#fff;font-weight:bold;font-size:11px;" onclick="sendFossilToHatchery('${f.key}')">🧬 ${isEn?'Incubate':'Incuber'} (${stepsReq} ${isEn?'KOs':'KO'})</button>
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
    notify(isEn?'Hatchery full! Hatch or expand first.':'Couveuse pleine ! Éclosez ou agrandissez d\u2019abord.','var(--red)');
    return;
  }
  // consume 1 fossil
  G.inventory[fossilKey]--;
  if(G.inventory[fossilKey] <= 0) delete G.inventory[fossilKey];
  // place fossil egg in hatchery (15 KOs to revive)
  G.hatchery[emptyIdx] = { poke: null, isFossil: true, fossilKey: fossilKey, reviveId: pokeId, steps: 0, stepsReq: 15 };
  saveGame();
  renderHatcheryWindow();
  notify(isEn?`🦴 ${getItemName(fossilKey)} sent to the Hatchery! Win 15 battles to revive it.`:`🦴 ${getItemName(fossilKey)} envoyé à la Pension ! Gagnez 15 combats pour le ranimer.`,'var(--gold)');
  // refresh fossil tab
  renderUnifiedGrid();
}
function selectUnifiedCard(loc, idStr){
  // ---- TEAM SWAP MODE (from clicking a team card) ----
  if(typeof _swapFromTeamIdx !== 'undefined' && _swapFromTeamIdx !== null){
    let p = null;
    if(loc === 'team'){
      p = G.team[Number(idStr)];
    } else {
      p = G.collection[idStr];
    }
    if(!p) return;
    if(typeof battle !== 'undefined' && battle && battle.active){
      notify("🔒 Impossible d'échanger pendant un combat !", "var(--red)");
      return;
    }
    const fromIdx = _swapFromTeamIdx;
    _swapFromTeamIdx = null;
    if(loc === 'team'){
      // Swap two team members
      const toIdx = Number(idStr);
      if(fromIdx === toIdx) return;
      const tmp = G.team[fromIdx];
      G.team[fromIdx] = G.team[toIdx];
      G.team[toIdx] = tmp;
    } else {
      // Replace team member with box pokemon
      const oldPoke = G.team[fromIdx];
      G.team[fromIdx] = p;
      G.collection[idStr] = oldPoke;
    }
    closeUnifiedSelectorModal();
    saveGame();
    renderTeamWindow();
    notify(`⚡ Équipe mise à jour !`, 'var(--green)');
    return;
  }

  if(_usmAction === 'box_view'){ return; }
  let p = null;
  if(loc === 'team'){
    p = G.team[Number(idStr)];
  } else {
    p = G.collection[idStr];
  }
  if(!p) return;

  if(_usmAction === 'training'){
    if(!p.uid) p.uid = 'p_' + Math.random().toString(36).substr(2, 9);
    G.selectedTraineeUid = p.uid;
    G.selectedTraineeLoc = loc;
    G.selectedTraineeId = idStr;
    closeUnifiedSelectorModal();
    renderTrainingWindow();
    notify(`🏋️ ${p.name} sélectionné pour l'entraînement !`, 'var(--purple)');
  } else if(_usmAction === 'hatchery'){
    if(loc === 'team' && G.team.length <= 1){
      notify(t("n.impossible_de_déposer_votre_seul_pokémon"), "var(--red)");
      return;
    }
    if(!G.hatchery) G.hatchery = [null];
    const emptyIdx = G.hatchery.findIndex(s => s === null);
    if(emptyIdx === -1){
      notify(t("n2.couveuse_pleine_éclosez_ou_agrandissez_d"), "var(--red)");
      return;
    }
    if(loc === 'team') G.team.splice(Number(idStr), 1);
    else delete G.collection[idStr];
    G.hatchery[emptyIdx] = { poke: p, steps: 0, stepsReq: 10 };
    closeUnifiedSelectorModal();
    updateHeader(); renderTeamWindow();
    notify(`🥚 ${p.name} déposé à la pension ! Combattez pour faire éclore.`, 'var(--blue)');
  }
}

