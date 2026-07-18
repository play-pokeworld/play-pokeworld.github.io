function renderBox(el){
 const allEntries=boxedEntries();
 const entries=(typeof applyPokemonBoxFilters === 'function') ? applyPokemonBoxFilters(allEntries) : allEntries;
 const filtersHtml = (typeof renderBoxFiltersHtml === 'function') ? renderBoxFiltersHtml() : '';
 const swap=(_swapFromTeamIdx!=null && G.team[_swapFromTeamIdx]);
 const battleLockBanner = battle.active ? `<div class="extracted-template-style-038">
 <span class="extracted-template-style-024"></span>
 <span>${t('battle_lock_box')}</span>
 </div>` : '';
 if(!allEntries.length){
 el.innerHTML= battleLockBanner + filtersHtml + `<div class="extracted-template-style-039">
 ${t('box_empty')}
 </div>${swap?`<div class="extracted-template-style-040"><button class="hbtn" data-action="legacy-call" data-call="cancelBoxSwap" data-call-args="">${t('finish_btn')}</button></div>`:''}`;
 return;
 }
 if(!entries.length){
 el.innerHTML= battleLockBanner + filtersHtml + `<div class="extracted-template-style-039">${t('no_pokemon_found')}</div>`;
 return;
 }
 const header=swap
 ? `<div class="loc-sub extracted-bridge-style-010">${t('box_swap_header')} <b>${G.team[_swapFromTeamIdx]?.name}</b>. <button class="hbtn extracted-bridge-style-011" data-action="legacy-call" data-call="cancelBoxSwap" data-call-args=""></button></div>`
 : `<div class="extracted-template-style-041">
 <span class="loc-sub"> ${entries.length} / ${allEntries.length} ${t('box_header')}</span>
 <button class="hbtn extracted-bridge-style-012" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'box_view'">🔍 ${t('fullscreen_pc_box')}</button>
 </div>`;
 el.innerHTML= battleLockBanner + filtersHtml + `${header}
 <div class="box-grid">
 ${entries.map(({id, cleanId, poke})=>{
 const isShiny = poke.shinyUnlocked || poke.shinyActive || poke.shiny || isSpeciesShiny(poke.id);
 return `
 <div class="box-card" data-style="cursor:pointer;${isShiny?'border:1px solid var(--light2);background:rgba(148,136,107,0.06);box-shadow:0 0 8px rgba(148,136,107,0.3);':''}" data-action="legacy-call" data-call="openBoxPokeModal" data-call-args="'${id}'" data-context-call="openBoxPokeModal" data-context-args="'${id}'" title="${t('select_or_details_hint')}">
 <div class="ab-icon${isShiny?' shiny-spark is-shiny':''}">${spriteImg(poke.id,poke.emoji,{shiny:isShiny,size:40})}</div>
 <div class="extracted-template-style-042">${isShiny?'<span class="shiny-tag" title="Forme Shiny"></span>':''}${poke.name}</div>
 <div class="extracted-template-style-007">Nv.${poke.level}</div>
 <div class="box-actions" data-action="stop-propagation">
 <button class="hbtn extracted-bridge-style-013" data-action="legacy-call" data-call="openBoxPokeModal" data-call-args="'${id}'" title="Sheet">${t("fiche_btn")}</button>
 ${swap
 ? `<button class="hbtn extracted-bridge-style-013" data-action="legacy-call" data-call="swapBoxWithTeam" data-call-args="'${id}'"${battle.active?'disabled title="Combat en cours"':''}>${t("swap_btn")}</button>`
 : `<button class="hbtn extracted-bridge-style-013" data-action="legacy-call" data-call="addBoxedToTeam" data-call-args="'${id}'"${G.team.length>=6||battle.active?'disabled':''}>${t("team_btn")}</button>`}
 </div>
 </div>`;
 }).join('')}
 </div>`;
}


function addBoxedToTeam(id){
 if(battle.active){
 notify(t("action_blocked_in_battle"),"var(--red)");
 return;
 }
 const poke=G.collection[id] || G.collection[String(id)];
 if(!poke) return;
 if(G.team.length>=6){
 setMsg(t('team_already_full'));
 return;
 }
 if(G.team.some(p=>Number(p.id)===Number(poke.id))){
 setMsg(t('species_already_in_team'));
 return;
 }
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(poke); else poke.heldItem = null;
 delete G.collection[id];
 delete G.collection[String(id)];
 for(const k of Object.keys(G.collection)){ if(G.collection[k]===poke) delete G.collection[k]; }
 G.team.push(poke);
 if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 notify(tr('joined_team', {name:poke.name}));
 showTab('box');
 renderTeamWindow();
 saveGame();
}


function swapBoxWithTeam(id){
 if(battle.active){
 notify(t("action_blocked_in_battle"),"var(--red)");
 return;
 }
 const idx=_swapFromTeamIdx;
 if(idx==null||!G.team[idx]) return cancelBoxSwap();
 const boxed=G.collection[id] || G.collection[String(id)];
 if(!boxed) return;
 const teamP=G.team[idx];
 const incomingSpecies = Number(boxed.id);
 const duplicateInTeam = G.team.some((tp,ti)=>ti!==idx && Number(tp.id)===incomingSpecies);
 if(duplicateInTeam){
 setMsg(t('species_already_in_team_present'));
 return;
 }
 const outId = Number(teamP.id);
 if(G.collection[outId] || G.collection[String(outId)]){
 setMsg(t('box_conflict'));
 return;
 }
 delete G.collection[id];
 delete G.collection[String(id)];
 for(const k of Object.keys(G.collection)){
 if(G.collection[k] === boxed) delete G.collection[k];
 }
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(teamP); else teamP.heldItem = null;
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(boxed); else boxed.heldItem = null;
 G.collection[outId] = teamP;
 G.team[idx] = boxed;
 if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 _swapFromTeamIdx=null;
 notify(`🔁 ${teamP.name} ↔ ${boxed.name}`);
 showTab('box');
 renderTeamWindow();
 saveGame();
}


function sendTeamToBox(idx){
 if(G.team.length<=1){ setMsg(t('must_keep_one_pokemon')); return; }
 const p=G.team[idx];
 if(!p) return;
 const pid = Number(p.id);
 if(G.collection[pid] || G.collection[String(pid)]){
 setMsg(t('species_already_in_box'));
 return;
 }
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null;
 G.collection[pid]=p;
 G.team.splice(idx,1);
 if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 document.getElementById('poke-modal').classList.remove('open');
 notify(tr('sent_to_box', {name:p.name}));
 showTab('box');
 saveGame();
}


function toggleShinySkin(idx){
 const p=G.team[idx];
 if(!p||!p.shinyUnlocked) return;
 p.shinyActive=!p.shinyActive;
 p.shiny=p.shinyActive;
 saveGame();
 openPokeModal(idx);
}


function statusColor(s){
 return {burn:'#c06030',poison:'#a040a0',badpoison:'#800080',para:'#c0a000',sleep:'#6070c0',freeze:'#4090d0',confuse:'#d060d0'}[s]||'#555';
}

function statusLabel(s){
 return {burn:'BRN',poison:'☠POI',badpoison:'☠TXQ',para:'PAR',sleep:'SOM',freeze:'🧊GEL',confuse:'💫CON'}[s]||s.toUpperCase();
}
