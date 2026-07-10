// ============================================================
// BOX MODAL — (split from map.js)
// ============================================================
function openBoxPokeModal(boxId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p){ moveEditorFor=null; return; }
  const modal=document.getElementById('poke-modal');
  const inner=document.getElementById('poke-modal-inner');
  const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  if(isShiny){
    p.shinyUnlocked = true;
    if(p.shinyActive === undefined) p.shinyActive = true;
    p.shiny = p.shinyActive;
  }

  // Current moves — click to select for replacement
  const moves = (p.moves||[]).map((m,mi)=>{
    const mv=MOVES[m.id];
    const mvName = getMoveName(m.id);
    const selected = boxMoveReplaceSlot === mi;
    const selStyle = selected ? 'opacity:0.4;border:1px solid var(--red);' : '';
    return `<div style="background:var(--bg);border-radius:6px;padding:6px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center;cursor:pointer;${selStyle}" onclick="toggleBoxMoveSelect('${boxId}',${mi})" oncontextmenu="event.preventDefault();openMoveInfo('${m.id}');return false;" title="${lang==='en'?'Click to select for replacement | Right-click for info':'Clic pour sélectionner (remplacement) | Clic droit pour info'}">
      <span class="type-badge" style="background:${TYPE_COLORS[mv?.type]||'#888'}">${mv?.type||'?'}</span>
      <span>${mvName}</span>
      ${selected?'<span style="color:var(--red);font-size:10px;font-weight:bold">⬇ Remplacement</span>':''}
      <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv?.pow||'-'}</span>
    </div>`;
  }).join('');

  // Learnable moves — ALWAYS shown at bottom
  const pool=learnableMoves(p);
  const canReplace = boxMoveReplaceSlot !== null;
  const fullB=(p.moves||[]).length>=4 && !canReplace;
  let learnHtml=`<div style="font-size:12px;color:var(--gold);font-weight:bold;margin:12px 0 6px;padding-bottom:4px;border-bottom:1px solid #333;">
    📖 ${lang==='en'?'Learnable Moves':'Capacités Apprenables'}
    ${canReplace?'<span style="color:var(--red);font-size:11px;margin-left:6px">'+(lang==='en'?'← Click to replace selected':'← Clic pour remplacer')+'</span>':''}
    ${fullB?'<span style="color:var(--red);font-size:11px;margin-left:6px">'+(lang==='en'?'(4/4 — select a move above first)':'(4/4 — sélectionnez une attaque ci-dessus)')+'</span>':''}
  </div>
  <div style="max-height:200px;overflow-y:auto">
  ${pool.length?pool.map(id=>{
    const mv=MOVES[id];
    const clickAction = (canReplace || !fullB) ? `learnBoxMove('${boxId}','${id}')` : '';
    return `<div style="background:var(--card);border-radius:6px;padding:5px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center;cursor:${clickAction?'pointer':'default'};${canReplace?'border:1px solid var(--green);':''}" ${clickAction?`onclick="${clickAction}"`:''} oncontextmenu="event.preventDefault();openMoveInfo('${id}');return false;" title="${lang==='en'?'Right-click for info':'Clic droit pour info'}">
      <span class="type-badge" style="background:${TYPE_COLORS[mv.type]||'#888'}">${mv.type}</span>
      <span>${getMoveName(id)}</span>
      <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv.pow||'-'}</span>
      ${canReplace?'<span style="color:var(--green);font-size:10px">⬆</span>':(!fullB?`<span style="color:var(--green);font-size:10px">+</span>`:'')}
    </div>`;
  }).join(''):`<div style="color:var(--dim);font-size:11px;text-align:center;padding:10px">${lang==='en'?'No other moves available.':'Aucune autre capacité disponible.'}</div>`}
  </div>`;

  const stLabels = lang === 'en' ? ['Max HP','Attack','Defense','Sp. Atk','Sp. Def','Speed'] : ['PV Max','Attaque','Défense','Atk Spé','Déf Spé','Vitesse'];
  const stats=[
    [stLabels[0], p.maxHP, 500, '#4caf50'],
    [stLabels[1], p.atk,   200, '#f44336'],
    [stLabels[2], p.def,   200, '#2196f3'],
    [stLabels[3], p.spa||p.atk,200, '#e91e63'],
    [stLabels[4], p.spd||p.def,200, '#9c27b0'],
    [stLabels[5], p.spe,   200, '#ff9800'],
  ];

  const swap = (_swapFromTeamIdx!=null && G.team[_swapFromTeamIdx]);

  inner.innerHTML=`<div class="modal-title">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="font-size:32px" class="${p.shinyActive?'shiny-spark is-shiny':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:56})}</div>
      <div>
        <div>${p.shinyActive?'<span class="shiny-tag">✨</span>':''}${p.name} <span style="color:var(--dim);font-size:11px">#${p.id}</span></div>
        <div style="font-size:12px;color:var(--dim)">${lang==='en'?'Level':'Niveau'} ${p.level} (${lang==='en'?'PC Box':'Boîte PC'})</div>
        <div style="margin-top:3px">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
      </div>
    </div>
    <span class="modal-close" onclick="boxMoveReplaceSlot=null;document.getElementById('poke-modal').classList.remove('open')">✕</span>
  </div>
  ${isShiny?`<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;background:var(--bg);padding:6px 10px;border-radius:6px;cursor:pointer">
    <input type="checkbox" ${p.shinyActive?'checked':''} onchange="toggleBoxShinySkin('${boxId}')">
    <span>✨ ${lang==='en'?'Shiny Skin':'Skin Shiny'}</span>
    <span style="color:var(--dim);font-size:11px;margin-left:auto">${lang==='en'?'Cosmetic switch only':'Bascule d\u2019apparence'}</span>
  </label>`:''}
  ${buildTalentSelectorHtml(p, null, boxId)}
  ${getEvolutionMethodsHtml(p.id)}
  <div style="background:var(--bg);border-radius:6px;padding:8px;margin-bottom:10px;text-align:center;color:var(--dim);font-size:11px">
    ${lang==='en'?'📦 This Pokémon is in your PC box. Place it in your active party to train or equip items!':'📦 Ce Pokémon est dans votre boîte PC. Placez-le dans votre équipe pour l\'entraîner ou lui équiper des objets !'}
  </div>
  <div style="margin-bottom:10px">
    ${stats.map(([l,v,m,c])=>`<div class="stat-row">
      <div class="stat-label">${l}</div>
      <div class="stat-bar"><div class="stat-fill" style="width:${Math.min(100,v/m*100)}%;background:${c}"></div></div>
      <div class="stat-val">${v}</div>
    </div>`).join('')}
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span style="font-size:12px;color:var(--dim)">${lang==='en'?'Moves':'Capacités'}</span>
    ${boxMoveReplaceSlot!==null?`<button class="hbtn" style="padding:3px 10px;font-size:11px;border-color:var(--red)" onclick="boxMoveReplaceSlot=null;openBoxPokeModal('${boxId}')">${lang==='en'?'Cancel':'Annuler'}</button>`:''}
  </div>
  ${moves}
  ${learnHtml}
  ${(() => {
    const curLevelBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, (p.xp||0) - curLevelBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
    return `<div style="font-size:12px;color:var(--dim);margin:8px 0 4px">XP : ${xpInLevel} / ${xpReqLevel} <span style="font-size:10px;">(${p.xp||0} total)</span></div>`;
  })()}
  ${(() => {
    const evos = STONE_EVO[p.id];
    if(!evos) return '';
    let html = '<div style="background:var(--bg);border-radius:8px;padding:8px;margin:8px 0"><div style="font-size:12px;color:var(--gold);margin-bottom:6px">🪨 Évolution par pierre</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
    for(const [stoneKey, targetId] of Object.entries(evos)){
      const stone = ITEMS[stoneKey];
      const owned = G.inventory[stoneKey]||0;
      const target = PD[targetId];
      const already = speciesOwned(targetId);
      html += `<button class="hbtn" onclick="tryBoxStoneEvo('${boxId}','${stoneKey}')" ${owned<1||already?'disabled':''} title="${stone?.desc||''}">${stone?.icon||'🪨'} ${target?target[0]:'#'+targetId} ${owned>0?`(${owned})`:''}${already?' ✅':''}</button>`;
    }
    html += '</div></div>';
    return html;
  })()}
  <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
    ${swap
      ? `<button class="hbtn" style="background:var(--blue);color:#fff" onclick="swapBoxWithTeam('${boxId}'); document.getElementById('poke-modal').classList.remove('open');">🔁 Échanger avec ${G.team[_swapFromTeamIdx]?.name||"l'équipe"}</button>`
      : `<button class="hbtn" style="background:var(--green);color:#fff" onclick="addBoxedToTeam('${boxId}'); document.getElementById('poke-modal').classList.remove('open');" ${G.team.length>=6?'disabled title="Équipe pleine (6/6)"':''}>➕ Ajouter à l'équipe</button>`}
  </div>`;

  modal.classList.add('open');
}
// ============================================================

function toggleBoxShinySkin(boxId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  p.shinyActive = !p.shinyActive;
  p.shiny = p.shinyActive;
  saveGame();
  openBoxPokeModal(boxId);
}

var boxMoveReplaceSlot = null;

function toggleBoxMoveSelect(boxId, moveIdx){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  if(boxMoveReplaceSlot === moveIdx){
    boxMoveReplaceSlot = null;
  } else {
    boxMoveReplaceSlot = moveIdx;
  }
  openBoxPokeModal(boxId);
}

function forgetBoxMove(boxId, moveIdx){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p||(p.moves||[]).length<=1){ notify(t("n.un_pokémon_doit_conserver_au_moins_une_c")); return; }
  const removed=p.moves.splice(moveIdx,1)[0];
  notify(tr("m.move_learning.1", {p0:p.name, p1:getMoveName(removed.id)||removed.id}));
  boxMoveReplaceSlot = null;
  saveGame();
  openBoxPokeModal(boxId);
}

function learnBoxMove(boxId, moveId){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  if(!p.moves) p.moves=[];
  // Replace if slot selected
  if(boxMoveReplaceSlot !== null && p.moves[boxMoveReplaceSlot]){
    const oldId = p.moves[boxMoveReplaceSlot].id;
    p.moves[boxMoveReplaceSlot] = {id:moveId};
    notify(tr("m.move_learning.2", {p0:p.name, p1:getMoveName(moveId)||moveId, p2:getMoveName(oldId)||oldId}));
    boxMoveReplaceSlot = null;
    saveGame();
    openBoxPokeModal(boxId);
    return;
  }
  // Add if room
  if(p.moves.length>=4){ notify(t("n.capacités_pleines_4_oubliezen_une_dabord")); return; }
  if(p.moves.find(m=>m.id===moveId)) return;
  p.moves.push({id:moveId});
  notify(tr("m.move_learning.3", {p0:p.name, p1:getMoveName(moveId)||moveId}));
  saveGame();
  openBoxPokeModal(boxId);
}

function toggleBoxMoveEditor(boxId){
  const key = 'box_'+boxId;
  moveEditorFor = (moveEditorFor===key) ? null : key;
  openBoxPokeModal(boxId);
}

function tryBoxStoneEvo(boxId, stoneKey){
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  const evo = STONE_EVO[p.id]?.[stoneKey];
  if(!evo){ notify(t("n2.cet_objet_na_aucun_effet_sur_ce_pokémon")); return; }
  if((G.inventory[stoneKey]||0)<1){ notify(t("n.pierre_manquante")); return; }
  G.inventory[stoneKey]--;
  if(G.inventory[stoneKey]<=0) delete G.inventory[stoneKey];
  const shinyUnlock = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(evo));
  const evoMon = createPoke(evo, 1, shinyUnlock);
  if(evoMon){
    evoMon.shinyActive = shinyUnlock; evoMon.shiny = shinyUnlock;
    delete G.collection[boxId];
    delete G.collection[String(boxId)];
    G.collection[evo] = evoMon;
    G.pokedex[evo] = {...(G.pokedex[evo]||{}), seen:true, caught:true};
    if(shinyUnlock) unlockShinyForSpecies(evo);
    const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
    notify(lang==='en' ? `✨ ${p.name} evolved into ${evoMon.name} using ${getItemName(stoneKey)}!` : `✨ ${p.name} évolue en ${evoMon.name} grâce à ${getItemName(stoneKey)} !`,"var(--purple)");
    saveGame();
    if(document.querySelector('.tab.active')?.textContent.includes('Sac')){
      onInventoryClick(stoneKey);
    } else {
      openBoxPokeModal(evo);
    }
  }
}

