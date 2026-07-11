// ============================================================
// BOX MODAL — Unifié avec openPokeModal (même design)
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

 // Same structure as openPokeModal
 const buff={atk:0,def:0,spe:0,spa:0,spd:0,hpMax:0};
 const buffedAtk=Math.floor(p.atk*(1+(buff.atk||0)));
 const buffedDef=Math.floor(p.def*(1+(buff.def||0)));
 const buffedSpe=Math.floor(p.spe*(1+(buff.spe||0)));
 const buffedHP =Math.floor(p.maxHP*(1+(buff.hpMax||0)));
 const showDelta=(base,cur)=> cur>base ? `<span style="color:var(--green);font-size: 13px"> +${cur-base}</span>` : '';
 const buffedSpa=Math.floor((p.spa||p.atk)*(1+(buff.spa||0)));
 const buffedSpd=Math.floor((p.spd||p.def)*(1+(buff.spd||0)));
 
 const stLabels = lang === 'en' ? ['Max HP','Attack','Defense','Sp. Atk','Sp. Def','Speed'] : ['PV Max','Attaque','Défense','Atk Spé','Déf Spé','Vitesse'];
 const stats=[
 [stLabels[0], buffedHP, 500, '#4caf50', p.maxHP],
 [stLabels[1], buffedAtk,200, '#f44336', p.atk],
 [stLabels[2], buffedDef,200, '#2196f3', p.def],
 [stLabels[3], buffedSpa,200, '#e91e63', p.spa||p.atk],
 [stLabels[4], buffedSpd,200, '#9c27b0', p.spd||p.def],
 [stLabels[5], buffedSpe,200, '#ff9800', p.spe],
 ];

 // Moves — same as openPokeModal
 const moves = (p.moves||[]).map((m,mi)=>{
 const mv=MOVES[m.id];
 const mvName = getMoveName(m.id);
 const selected = boxMoveReplaceSlot === mi;
 const selStyle = selected ? 'opacity:0.4;border:1px solid var(--red);' : '';
 return `<div style="background:var(--dark2);border-radius:6px;padding:6px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center;cursor:pointer;${selStyle}"onclick="toggleBoxMoveSelect('${boxId}',${mi})"oncontextmenu="event.preventDefault();openMoveInfo('${m.id}');return false;"title="${lang==='en'?'Click to select for replacement | Right-click for info':'Clic pour sélectionner (remplacement) | Clic droit pour info'}">
 <span class="type-badge"style="background:${TYPE_COLORS[mv?.type]||'#888'}">${mv?.type||'?'}</span>
 <span>${mvName}</span>
 ${selected?'<span style="color:var(--red);font-size: 13px;font-weight:bold">⬇ Remplacement</span>':''}
 <span style="color:var(--light1);font-size:13px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv?.pow||'-'}</span>
 </div>`;
 }).join('');

 // Learnable moves
 const pool=learnableMoves(p);
 const canReplace = boxMoveReplaceSlot !== null;
 const fullB=(p.moves||[]).length>=4 && !canReplace;
 let learnHtml=`<div style="font-size: 13px;color:var(--light2);font-weight:bold;margin:12px 0 6px;padding-bottom:4px;border-bottom:1px solid #333;">
 📖 ${lang==='en'?'Learnable Moves':'Capacités Apprenables'}
 ${canReplace?'<span style="color:var(--red);font-size:13px;margin-left:6px">'+(lang==='en'?'← Click to replace selected':'← Clic pour remplacer')+'</span>':''}
 ${fullB?'<span style="color:var(--red);font-size:13px;margin-left:6px">'+(lang==='en'?'(4/4 — select a move above first)':'(4/4 — sélectionnez une attaque ci-dessus)')+'</span>':''}
 </div>
 <div style="max-height:200px;overflow-y:auto">
 ${pool.length?pool.map(id=>{
 const mv=MOVES[id];
 const clickAction = (canReplace || !fullB) ? `learnBoxMove('${boxId}','${id}')` : '';
 return `<div style="background:var(--dark3);border-radius:6px;padding:5px 8px;margin-bottom:4px;display:flex;gap:8px;align-items:center;cursor:${clickAction?'pointer':'default'};${canReplace?'border:1px solid var(--green);':''}"${clickAction?`onclick="${clickAction}"`:''} oncontextmenu="event.preventDefault();openMoveInfo('${id}');return false;"title="${lang==='en'?'Right-click for info':'Clic droit pour info'}">
 <span class="type-badge"style="background:${TYPE_COLORS[mv.type]||'#888'}">${mv.type}</span>
 <span>${getMoveName(id)}</span>
 <span style="color:var(--light1);font-size:13px;margin-left:auto">${lang==='en'?'Pow:':'Puiss :'} ${mv.pow||'-'}</span>
 ${canReplace?'<span style="color:var(--green);font-size: 13px"></span>':(!fullB?`<span style="color:var(--green);font-size: 13px">+</span>`:'')}
 </div>`;
 }).join(''):`<div style="color:var(--light1);font-size:13px;text-align:center;padding:10px">${lang==='en'?'No other moves available.':'Aucune autre capacité disponible.'}</div>`}
 </div>`;

 const swap = (_swapFromTeamIdx!=null && G.team[_swapFromTeamIdx]);

 inner.innerHTML=`<div class="modal-title">
 <div style="display:flex;align-items:center;gap:10px">
 <div style="font-size: 15px"class="${p.shinyActive?'shiny-spark is-shiny':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:72})}</div>
 <div>
 <div>${p.shinyActive?'<span class="shiny-tag"></span>':''}${p.name} <span style="color:var(--light1);font-size:13px">#${p.id}</span></div>
 <div style="font-size: 13px;color:var(--light1)">${lang==='en'?'Level':'Niveau'} ${p.level} (${lang==='en'?'PC Box':'Boîte PC'})</div>
 <div style="margin-top:3px">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
 </div>
 </div>
 <span class="modal-close"onclick="boxMoveReplaceSlot=null;document.getElementById('poke-modal').classList.remove('open')"></span>
 </div>
 ${isShiny?`<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;background:var(--dark2);padding:6px 10px;border-radius:6px;cursor:pointer">
 <input type="checkbox"${p.shinyActive?'checked':''} onchange="toggleBoxShinySkin('${boxId}')">
 <span> ${lang==='en'?'Shiny Skin':'Skin Shiny'}</span>
 <span style="color:var(--light1);font-size:13px;margin-left:auto">${lang==='en'?'Cosmetic switch only':'Bascule d\'apparence'}</span>
 </label>`:''}
 ${buildTalentSelectorHtml(p, null, boxId)}
 ${getEvolutionMethodsHtml(p.id)}
 <div style="margin-bottom:10px">
 ${stats.map(([l,v,m,c,base], sIdx)=>{
 const keys = ['hp','atk','def','spa','spd','spe'];
 const k = keys[sIdx] || 'hp';
 const ivVal = (p.ivs||{})[k] || 0;
 const evVal = (p.evs||{})[k] || 0;
 return `<div class="stat-row"style="flex-direction:column;align-items:stretch;margin-bottom:8px;background:rgba(0,0,0,0.2);padding:6px;border-radius:6px;height:auto;">
 <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
 <span class="stat-label"style="font-weight:bold;width:auto;">${l}</span>
 <span class="stat-val"style="width:auto;">${v}${showDelta(base,v)}</span>
 </div>
 <div class="stat-bar"style="margin-bottom:4px;"><div class="stat-fill"style="width:${Math.min(100,v/m*100)}%;background:${c}"></div></div>
 <div style="display:flex;justify-content:space-between;font-size: 13px;color:#bbb;">
 <span><b>IV:</b> ${renderStars(ivVal, false)} (${ivVal}/6)</span>
 <span><b>EV:</b> ${renderStars(evVal, true)} (${evVal}/6)</span>
 </div>
 </div>`;
 }).join('')}
 </div>
 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
 <span style="font-size: 13px;color:var(--light1)">${lang==='en'?'Moves':'Capacités'}</span>
 ${boxMoveReplaceSlot!==null?`<button class="hbtn"style="padding:3px 10px;font-size:13px;border-color:var(--red)"onclick="boxMoveReplaceSlot=null;openBoxPokeModal('${boxId}')">${lang==='en'?'Cancel':'Annuler'}</button>`:''}
 </div>
 ${moves}
 ${learnHtml}
 ${(() => {
 const curLevelBase = xpForLevel(p.level);
 const xpInLevel = Math.max(0, (p.xp||0) - curLevelBase);
 const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
 return `<div style="font-size: 13px;color:var(--light1);margin:8px 0 4px">XP : ${xpInLevel} / ${xpReqLevel} <span style="font-size: 13px;">(${p.xp||0} total)</span></div>`;
 })()}
 ${(() => {
 const evos = STONE_EVO[p.id];
 if(!evos) return '';
 let html = '<div style="background:var(--dark2);border-radius:8px;padding:8px;margin:8px 0"><div style="font-size: 13px;color:var(--light2);margin-bottom:6px"> Évolution par pierre</div><div style="display:flex;flex-wrap:wrap;gap:6px">';
 for(const [stoneKey, targetId] of Object.entries(evos)){
 const stone = ITEMS[stoneKey];
 const owned = G.inventory[stoneKey]||0;
 const target = PD[targetId];
 const already = speciesOwned(targetId);
 html += `<button class="hbtn"onclick="tryBoxStoneEvo('${boxId}','${stoneKey}')"${owned<1||already?'disabled':''} title="${stone?.desc||''}">${stone?.icon||''} ${target?target[0]:'#'+targetId} ${owned>0?`(${owned})`:''}${already?' ':''}</button>`;
 }
 html += '</div></div>';
 return html;
 })()}
 <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
 ${swap
 ? `<button class="hbtn"style="background:var(--blue);color:#fff"onclick="swapBoxWithTeam('${boxId}'); document.getElementById('poke-modal').classList.remove('open');"> Échanger avec ${G.team[_swapFromTeamIdx]?.name||"l'équipe"}</button>
    <button class="hbtn"style="background:var(--red);color:#fff"onclick="removeFromTeam(${_swapFromTeamIdx}); document.getElementById('poke-modal').classList.remove('open');"> Retirer de l'équipe</button>
    <button class="hbtn"style="background:var(--dark3);color:var(--light2)"onclick="cancelSwap(); document.getElementById('poke-modal').classList.remove('open');">✖ Annuler</button>`
 : `<button class="hbtn"style="background:var(--green);color:#fff"onclick="addBoxedToTeam('${boxId}'); document.getElementById('poke-modal').classList.remove('open');"${G.team.length>=6?'disabled title="Équipe pleine (6/6)"':''}>➕ Ajouter à l'équipe</button>`}
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
 notify(lang==='en' ? ` ${p.name} evolved into ${evoMon.name} using ${getItemName(stoneKey)}!` : ` ${p.name} évolue en ${evoMon.name} grâce à ${getItemName(stoneKey)} !`,"var(--accent)");
 saveGame();
 if(document.querySelector('.tab.active')?.textContent.includes('Sac')){
 onInventoryClick(stoneKey);
 } else {
 openBoxPokeModal(evo);
 }
 }
}

