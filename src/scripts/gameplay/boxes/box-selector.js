
// ===== extracted from src/scripts/gameplay/breeding/hatchery.js =====
function openUnifiedSelectorModal(actionType){
  if(typeof battle !== 'undefined' && battle && battle.active && actionType === 'training'){
    notify("🔒 Combat en cours ! Terminez d'abord votre affrontement actuel.", "var(--red)");
    return;
  }
  _usmAction = actionType;
  const modal = document.getElementById('unified-selector-modal');
  const titleEl = document.getElementById('usm-title');
  if(!modal || !titleEl) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(actionType === 'hatchery') titleEl.textContent = lang==='en' ? "🥚 Place Pokémon in Daycare Hatchery" : "🥚 Placer un Pokémon à la Pension / Couveuse";
  else if(actionType === 'training') titleEl.textContent = lang==='en' ? "⚡ Select Pokémon for Dojo Training" : "⚡ Choisir un Pokémon pour l'Entraînement";
  else if(actionType === 'team') titleEl.textContent = lang==='en' ? "⚡ Select Pokémon for Active Party" : "⚡ Choisir un Pokémon pour l'Équipe";
  else titleEl.textContent = lang==='en' ? "📦 Full-Screen PC Box & Party (Right-click for Sheet)" : "📦 Boîte PC & Équipe plein écran (Clic-droit Fiche)";
  
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
  if(!grid) return;
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

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
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--dim)">Aucun Pokémon trouvé.</div>`;
    return;
  }

  grid.innerHTML = list.map(({p, loc, idStr, teamIdx}) => {
    const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
    const totalIv = Object.values(p.ivs||{}).reduce((x,y)=>x+y,0);
    const totalEv = Object.values(p.evs||{}).reduce((x,y)=>x+y,0);
    const itm = p.heldItem ? ITEMS[p.heldItem] : null;
    const clickFn = `selectUnifiedCard('${loc}', '${idStr}')`;
    const rightClickFn = loc === 'team' ? `openPokeModal(${teamIdx})` : `openBoxPokeModal('${idStr}')`;

    return `<div class="box-card" style="background:rgba(30,24,20,0.95);border:1px solid ${isShiny?'var(--yellow)':'#4a3c2e'};border-radius:8px;padding:8px;cursor:pointer;display:flex;flex-direction:column;gap:6px;transition:0.2s;" onclick="${clickFn}" oncontextmenu="event.preventDefault(); ${rightClickFn}; return false;" title="Clic: Sélectionner | Clic Droit: Fiche détaillée">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:6px;flex-shrink:0;">
          ${spriteImg(p.id, p.emoji, {size:42, shiny:isShiny})}
        </div>
        <div style="min-width:0;flex:1;">
          <div style="font-weight:bold;font-size:13px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${isShiny?'✨ ':''}${p.name}</div>
          <div style="font-size:11px;color:var(--gold);">Nv.${p.level} <span style="color:var(--dim);font-size:10px;">(${loc==='team'?'⚡ Équipe':'📦 Boîte'})</span></div>
          <div style="font-size:10px;color:${itm?'var(--gold)':'var(--dim)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;">🎒 ${itm?itm.icon+' '+getItemName(p.heldItem):'Aucun objet'}</div>
        </div>
      </div>
      <div style="background:rgba(0,0,0,0.4);border-radius:4px;padding:4px 6px;font-size:10px;display:flex;justify-content:space-between;border:1px solid #2a221a;">
        <span style="color:#ffd700;"><b>IVs:</b> ${totalIv}/36 ⭐</span>
        <span style="color:#55a646;"><b>EVs:</b> ${totalEv}/36 🟢</span>
      </div>
    </div>`;
  }).join('');
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
      notify("❌ Impossible de déposer votre seul Pokémon de combat !", "var(--red)");
      return;
    }
    if(!G.hatchery) G.hatchery = [null];
    const emptyIdx = G.hatchery.findIndex(s => s === null);
    if(emptyIdx === -1){
      notify("❌ Couveuse pleine ! Éclosez ou agrandissez d'abord.", "var(--red)");
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
let _usmAction = null;
let _usmSort = 'id';

