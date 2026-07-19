function sameBoxBattlePoke(a, b){
 if(!a || !b) return false;
 if(a.uid && b.uid) return a.uid === b.uid;
 return a === b;
}

function isBoxPokeBattleEditLocked(p, boxId){
 if(globalThis.isPokemonLockedForBattleEdits) return !!globalThis.isPokemonLockedForBattleEdits(p, null, boxId);
 const b = (typeof battle !== 'undefined') ? battle : globalThis.battle;
 if(!p || !b || !b.active) return false;
 if(b.isTraining) return !!(b.trainee && sameBoxBattlePoke(p, b.trainee));
 const team = (typeof G !== 'undefined' && Array.isArray(G.team)) ? G.team : [];
 return team.some(tp => sameBoxBattlePoke(p, tp));
}

function isBoxPokeMoveEditLocked(boxId, existingPoke){
 const p = existingPoke || (G.collection ? (G.collection[boxId] || G.collection[String(boxId)]) : null);
 return isBoxPokeBattleEditLocked(p, boxId);
}

function boxBattleEditLockMessage(){
 return (typeof t === 'function') ? t('action_blocked_in_battle') : "Action impossible en combat : quittez le combat d'abord !";
}

function notifyBoxMoveEditLocked(){
 if(globalThis.notifyBattleEditLocked) globalThis.notifyBattleEditLocked();
 else if(typeof notify === 'function') notify(boxBattleEditLockMessage(), 'var(--red)');
}

function openBoxPokeModal(boxId){
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p){ moveEditorFor=null; return; }
 const modal=document.getElementById('poke-modal');
 const inner=document.getElementById('poke-modal-inner');
 const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);

 if(isShiny){
 p.shinyUnlocked = true;
 if(p.shinyActive === undefined) p.shinyActive = true;
 p.shiny = p.shinyActive;
 }

 if(typeof renderPokemonDetailModal === 'function'){
 renderPokemonDetailModal(p, {boxId:boxId, locationLabel:t('pc_box')});
 return;
 }

 
 const buff={atk:0,def:0,spe:0,spa:0,spd:0,hpMax:0};
 const buffedAtk=Math.floor(p.atk*(1+(buff.atk||0)));
 const buffedDef=Math.floor(p.def*(1+(buff.def||0)));
 const buffedSpe=Math.floor(p.spe*(1+(buff.spe||0)));
 const buffedHP =Math.floor(p.maxHP*(1+(buff.hpMax||0)));
 const showDelta=(base,cur)=> cur>base ? `<span class="extracted-template-style-017"> +${cur-base}</span>` : '';
 const buffedSpa=Math.floor((p.spa||p.atk)*(1+(buff.spa||0)));
 const buffedSpd=Math.floor((p.spd||p.def)*(1+(buff.spd||0)));
 
 const stLabels = [t('stat_hp'), t('stat_atk'), t('stat_def'), t('stat_spa'), t('stat_spd'), t('stat_spe')];
 const stats=[
 [stLabels[0], buffedHP, 500, '#4caf50', p.maxHP],
 [stLabels[1], buffedAtk,200, '#f44336', p.atk],
 [stLabels[2], buffedDef,200, '#2196f3', p.def],
 [stLabels[3], buffedSpa,200, '#e91e63', p.spa||p.atk],
 [stLabels[4], buffedSpd,200, '#9c27b0', p.spd||p.def],
 [stLabels[5], buffedSpe,200, '#ff9800', p.spe],
 ];

 const battleEditLocked = isBoxPokeBattleEditLocked(p, boxId);
 if(battleEditLocked && boxMoveReplaceSlot !== null) boxMoveReplaceSlot = null;
 const currentBoxMoveReplaceSlot = battleEditLocked ? null : boxMoveReplaceSlot;
 
 const moves = (p.moves||[]).map((m,mi)=>{
 const mv=MOVES[m.id];
 const mvName = getMoveName(m.id);
 const selected = !battleEditLocked && currentBoxMoveReplaceSlot === mi;
 const selStyle = selected ? 'opacity:0.4;border:1px solid var(--red);' : '';
 const moveActionAttrs = battleEditLocked ? '' : ` data-action="legacy-call" data-call="toggleBoxMoveSelect" data-call-args="'${boxId}',${mi}"`;
 return `<div class="box-move-card ${selected?'is-selected':''} ${battleEditLocked?'is-locked':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}"${moveActionAttrs} data-context-call="openMoveInfo" data-context-args="'${m.id}'" title="${battleEditLocked?boxBattleEditLockMessage():t('click_replace_context_info')}">
 <span class="type-badge ${typeClass(mv?.type||'?')}">${mv?.type||'?'}</span>
 <span>${mvName}</span>
 ${selected?'<span class="extracted-template-style-018">'+t('replacement_badge')+'</span>':''}
 <span class="extracted-template-style-019">${t('power_abbrev')} ${mv?.pow||'-'}</span>
 </div>`;
 }).join('');

 
 const pool=learnableMoves(p);
 const canReplace = !battleEditLocked && currentBoxMoveReplaceSlot !== null;
 const fullB=(p.moves||[]).length>=4 && !canReplace;
 let learnHtml=`<div class="extracted-template-style-020">
 ${t('learnable_moves_title')}
 ${battleEditLocked?'<span class="extracted-template-style-021">'+boxBattleEditLockMessage()+'</span>':''}
 ${!battleEditLocked&&canReplace?'<span class="extracted-template-style-021">'+t('click_to_replace_selected')+'</span>':''}
 ${!battleEditLocked&&fullB?'<span class="extracted-template-style-021">'+t('select_move_first')+'</span>':''}
 </div>
 <div class="extracted-template-style-022">
 ${pool.length?pool.map(id=>{
 const mv=MOVES[id];
 const clickAction = !battleEditLocked && (canReplace || !fullB) ? `learnBoxMove('${boxId}','${id}')` : '';
 return `<div class="box-move-card box-move-card--learnable ${clickAction?'is-clickable':''} ${canReplace?'is-selectable':''}" data-type-color="${TYPE_COLORS[mv.type]||'#555'}"${clickAction?` data-action="legacy-call" data-call="learnBoxMove" data-call-args="\'${boxId}\',\'${id}\'"`:''} data-context-call="openMoveInfo" data-context-args="'${id}'" title="${battleEditLocked?boxBattleEditLockMessage():t('context_info_touch')}">
 <span class="type-badge ${typeClass(mv.type)}">${mv.type}</span>
 <span>${getMoveName(id)}</span>
 <span class="extracted-template-style-019">${t('power_abbrev')} ${mv.pow||'-'}</span>
 ${!battleEditLocked&&canReplace?'<span class="extracted-template-style-017"></span>':(!battleEditLocked&&!fullB?`<span class="extracted-template-style-017">+</span>`:'')}
 </div>`;
 }).join(''):`<div class="extracted-template-style-023">${t('no_other_moves')}</div>`}
 </div>`;

 const swap = (_swapFromTeamIdx!=null && G.team[_swapFromTeamIdx]);

 inner.innerHTML=`<div class="modal-title">
 <div class="extracted-template-style-006">
 <div class="extracted-template-style-024" class="${p.shinyActive?'shiny-spark is-shiny':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:72})}</div>
 <div>
 <div>${p.shinyActive?'<span class="shiny-tag"></span>':''}${p.name} <span class="extracted-template-style-025">#${p.id}</span></div>
 <div class="extracted-template-style-007">${t('level_word')} ${p.level} (${t('pc_box')})</div>
 <div class="extracted-template-style-026">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
 </div>
 </div>
 <span class="modal-close" data-action="close-poke-modal" data-reset-box-move="true"></span>
 </div>
 ${isShiny?`<button class="hbtn poke-detail-shiny-toggle ${p.shinyActive?'is-on':'is-off'}" data-action="legacy-call" data-call="toggleBoxShinySkin" data-call-args="'${boxId}'"><span class="poke-detail-shiny-star">★</span><span>${p.shinyActive?t('shiny_skin_on'):t('shiny_skin_off')}</span></button>`:''}
 ${buildTalentSelectorHtml(p, null, boxId)}
 ${getEvolutionMethodsHtml(p.id)}
 <div class="extracted-template-style-028">
 ${stats.map(([l,v,m,c,base], sIdx)=>{
 const keys = ['hp','atk','def','spa','spd','spe'];
 const k = keys[sIdx] || 'hp';
 const ivVal = (p.ivs||{})[k] || 0;
 const evVal = (p.evs||{})[k] || 0;
 return `<div class="stat-row extracted-bridge-style-001">
 <div class="extracted-template-style-029">
 <span class="stat-label extracted-bridge-style-002">${l}</span>
 <span class="stat-val extracted-bridge-style-003">${v}${showDelta(base,v)}</span>
 </div>
 <div class="stat-bar extracted-bridge-style-004"><div class="stat-fill" data-pct="${Math.min(100,v/m*100)}" data-bg="${c}"></div></div>
 <div class="extracted-template-style-030">
 <span><b>IV:</b> ${renderStars(ivVal, false)} (${ivVal}/6)</span>
 <span><b>EV:</b> ${renderStars(evVal, true)} (${evVal}/6)</span>
 </div>
 </div>`;
 }).join('')}
 </div>
 <div class="extracted-template-style-031">
 <span class="extracted-template-style-007">${t('moves_title')}</span>
 ${!battleEditLocked&&boxMoveReplaceSlot!==null?`<button class="hbtn extracted-bridge-style-005" data-action="cancel-box-move-replace" data-box-id="${boxId}">${t('cancel')}</button>`:''}
 </div>
 ${moves}
 ${learnHtml}
 ${(() => {
 const curLevelBase = xpForLevel(p.level);
 const xpInLevel = Math.max(0, (p.xp||0) - curLevelBase);
 const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
 return `<div class="extracted-template-style-032">XP : ${xpInLevel} / ${xpReqLevel} <span class="extracted-template-style-033">(${p.xp||0} total)</span></div>`;
 })()}
 ${(() => {
 const evos = STONE_EVO[p.id];
 if(!evos) return '';
 let html = `<div class="extracted-template-style-034"><div class="extracted-template-style-035"> ${t('stone_evolution')}</div><div class="extracted-template-style-036">`;
 for(const [stoneKey, targetId] of Object.entries(evos)){
 const stone = ITEMS[stoneKey];
 const owned = G.inventory[stoneKey]||0;
 const target = PD[targetId];
 const already = speciesOwned(targetId);
 html += `<button class="hbtn" data-action="legacy-call" data-call="tryBoxStoneEvo" data-call-args="'${boxId}','${stoneKey}'"${owned<1||already?'disabled':''} title="${stone?.desc||''}">${stone?.icon||''} ${target?target[0]:'#'+targetId} ${owned>0?`(${owned})`:''}${already?' ':''}</button>`;
 }
 html += '</div></div>';
 return html;
 })()}
 <div class="extracted-template-style-037">
 ${swap
 ? `<button class="hbtn extracted-bridge-style-006" data-action="call-close-poke" data-call="swapBoxWithTeam" data-call-args="'${boxId}'">${tr('swap_with', {name:G.team[_swapFromTeamIdx]?.name||t('the_team')})}</button>
    <button class="hbtn extracted-bridge-style-007" data-action="call-close-poke" data-call="removeFromTeam" data-call-args="${_swapFromTeamIdx}">${t('remove_from_team')}</button>
    <button class="hbtn extracted-bridge-style-008" data-action="call-close-poke" data-call="cancelSwap">${typeof getIcon==='function'?getIcon('close',14):''} ${t('cancel')}</button>`
 : `<button class="hbtn extracted-bridge-style-009" data-action="call-close-poke" data-call="addBoxedToTeam" data-call-args="'${boxId}'"${G.team.length>=6 ? 'disabled title="'+t('team_full_title')+'"' : ''}>${t('add_to_team')}</button>`}
 </div>`;

 modal.classList.add('open');
}


function toggleBoxShinySkin(boxId){
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p || !(p.shinyUnlocked || p.shiny || isSpeciesShiny(p.id))) return;
 if(p.shinyActive === undefined) p.shinyActive = true;
 p.shinyActive = !p.shinyActive;
 p.shiny = !!p.shinyActive;
 saveGame();
 if(typeof refreshAfterShinyToggle === 'function') refreshAfterShinyToggle();
 openBoxPokeModal(boxId);
}

var boxMoveReplaceSlot = null;

function toggleBoxMoveSelect(boxId, moveIdx){
 if(isBoxPokeMoveEditLocked(boxId)){ notifyBoxMoveEditLocked(); return; }
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
 if(isBoxPokeMoveEditLocked(boxId)){ notifyBoxMoveEditLocked(); return; }
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p||(p.moves||[]).length<=1){ notify(t("legacy_message_n_un_pok_mon_doit_conserver_au_moins_une_c")); return; }
 const removed=p.moves.splice(moveIdx,1)[0];
 notify(tr("m.move_learning.1", {p0:p.name, p1:getMoveName(removed.id)||removed.id}));
 boxMoveReplaceSlot = null;
 saveGame();
 openBoxPokeModal(boxId);
}

function learnBoxMove(boxId, moveId){
 if(isBoxPokeMoveEditLocked(boxId)){ notifyBoxMoveEditLocked(); return; }
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p) return;
 if(!p.moves) p.moves=[];
 
 if(boxMoveReplaceSlot !== null && p.moves[boxMoveReplaceSlot]){
 const oldId = p.moves[boxMoveReplaceSlot].id;
 p.moves[boxMoveReplaceSlot] = {id:moveId};
 notify(tr("m.move_learning.2", {p0:p.name, p1:getMoveName(moveId)||moveId, p2:getMoveName(oldId)||oldId}));
 boxMoveReplaceSlot = null;
 saveGame();
 openBoxPokeModal(boxId);
 return;
 }
 
 if(p.moves.length>=4){ notify(t("legacy_message_n_capacit_s_pleines_4_oubliezen_une_dabord")); return; }
 if(p.moves.find(m=>m.id===moveId)) return;
 p.moves.push({id:moveId});
 notify(tr("m.move_learning.3", {p0:p.name, p1:getMoveName(moveId)||moveId}));
 saveGame();
 openBoxPokeModal(boxId);
}

function toggleBoxMoveEditor(boxId){
 if(isBoxPokeMoveEditLocked(boxId)){ notifyBoxMoveEditLocked(); return; }
 const key = 'box_'+boxId;
 moveEditorFor = (moveEditorFor===key) ? null : key;
 openBoxPokeModal(boxId);
}

function tryBoxStoneEvo(boxId, stoneKey){

 // --- Fix: cannot change moves if pokemon is currently in battle ---
 try {
   if (typeof battle !== 'undefined' && battle && battle.active) {
     var activePoke = (typeof getActivePlayerPoke === 'function') ? getActivePlayerPoke() : null;
     var thisPoke = null;
     // Determine thisPoke based on function
     if (typeof p !== 'undefined' && p) thisPoke = p;
     else if (typeof G !== 'undefined' && G) {
       // For box functions, p is from collection
       if (typeof boxId !== 'undefined' && G.collection) {
         thisPoke = G.collection[boxId] || G.collection[String(boxId)];
       } else if (typeof idx !== 'undefined' && G.team) {
         thisPoke = G.team[idx];
       }
     }
     if (activePoke && thisPoke && activePoke.uid && thisPoke.uid && activePoke.uid === thisPoke.uid) {
       if (typeof notify === 'function') notify((typeof t === 'function' ? t('action_blocked_in_battle') : 'Action impossible en combat'), 'var(--red)');
       return;
     }
   }
 } catch(_){}
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p) return;
 const evo = STONE_EVO[p.id]?.[stoneKey];
 if(!evo){ notify(t("legacy_message_n2_cet_objet_na_aucun_effet_sur_ce_pok_mon")); return; }
 if((G.inventory[stoneKey]||0)<1){ notify(t("n.pierre_manquante")); return; }
 G.inventory[stoneKey]--;
 if(G.inventory[stoneKey]<=0) delete G.inventory[stoneKey];
 const shinyUnlock = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(evo) || rollShiny());
 const evoMon = createPoke(evo, 1, shinyUnlock);
 if(evoMon){
 evoMon.shinyActive = shinyUnlock; evoMon.shiny = shinyUnlock;
 delete G.collection[boxId];
 delete G.collection[String(boxId)];
 G.collection[evo] = evoMon;
 G.pokedex[evo] = {...(G.pokedex[evo]||{}), seen:true, caught:true};
 if(shinyUnlock) unlockShinyForSpecies(evo);
 notify(tr('evolution_stone_notify', {from:p.name, to:evoMon.name, item:getItemName(stoneKey)}),"var(--accent)");
 saveGame();
 if(document.querySelector('.tab.active')?.textContent.includes('Sac') || (document.getElementById('fullscreen-panel-modal')?.style.display==='flex')){
 onInventoryClick(stoneKey);
 } else {
 const m=document.getElementById('poke-modal'); if(m) m.classList.remove('open');
 renderTeamWindow();
 }
 }
}

