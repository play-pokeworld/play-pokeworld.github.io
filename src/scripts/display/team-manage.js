// ============================================================
// TEAM MANAGE — (split from map.js)
// ============================================================
let _teamDragIdx=null;
let _swapFromTeamIdx=null;

function saveCurrentTeamToPreset(key){
 if(!G.teamPresets) G.teamPresets = { preset1:{name:"Équipe Aventure",uids:[]}, preset2:{name:"Équipe Boss",uids:[]}, preset3:{name:"Équipe Entraînement",uids:[]} };
 if(!G.teamPresets[key]) G.teamPresets[key] = { name:"Preset"+ key, uids: [] };
 G.teamPresets[key].uids = G.team.map(p => p && p.uid).filter(Boolean);
 notify(` ${G.teamPresets[key].name} sauvegardée (${G.team.length} Pokémon) !`, 'var(--blue)');
 renderTeamWindow();
 saveGame();
}

function loadTeamFromPreset(key){
 if(typeof battle !== 'undefined' && battle && battle.active){
 notify("Impossible de changer d'équipe de combat pendant un affrontement !","var(--red)");
 return;
 }
 const preset = G.teamPresets && G.teamPresets[key];
 if(!preset || !preset.uids || !preset.uids.length){
 notify("Ce preset d'équipe est vide ! Mettez des Pokémon en équipe et cliquez sur Sauvegarder.","var(--red)");
 return;
 }
 const newTeam = [];
 for(const uid of preset.uids){
 let found = G.team.find(p => p && p.uid === uid);
 if(!found){
 for(const k in (G.collection || {})){
 if(G.collection[k] && G.collection[k].uid === uid){
 found = G.collection[k];
 delete G.collection[k];
 break;
 }
 }
 }
 if(found) newTeam.push(found);
 }
 if(!newTeam.length){
 notify("Aucun Pokémon du preset n'a été trouvé !","var(--red)");
 return;
 }
 for(const oldP of G.team){
 if(!newTeam.includes(oldP)){
 G.collection[String(oldP.id)] = oldP;
 }
 }
 G.team = newTeam;
 G.activePresetId = key;
 notify(` ${preset.name} chargée avec succès (${newTeam.length} Pokémon) !`, 'var(--green)');
 renderTeamWindow();
 const tabEl = document.getElementById('tab-content');
 if(tabEl && document.querySelector('.tab[onclick*="team"]')?.classList.contains('active')) renderTeam(tabEl);
 saveGame();
}

function renderTeam(el){
 if(G.team.length===0){
 el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--light1)">
 Vous n'avez pas encore de Pokémon !<br><br>
 ${!G.starter?`<button class="hbtn"onclick="chooseStarter()">Choisir votre Starter !</button>`:'Explorez les routes pour en capturer.'}
 </div>`;
 return;
 }
 const battleLockBanner = battle.active ? `<div style="background:rgba(244,67,54,0.15);border:1px solid var(--red);padding:8px 12px;border-radius:6px;margin-bottom:10px;color:#ff8a80;font-size:13px;display:flex;align-items:center;gap:8px;">
 <span style="font-size: 15px;"></span>
 <span><b>Combat en direct en cours :</b> L'équipe active est verrouillée. Vous ne pouvez ni échanger, ni réordonner, ni modifier le stuff pendant le combat.</span>
 </div>` : '';
 el.innerHTML= renderTeamPresetsToolbar() + battleLockBanner + G.team.map((p,i)=>renderPokeCard(p,i)).join('');
}

function onTeamDragStart(ev, i){
 if(battle.active){
 notify("Action impossible : l'équipe est bloquée pendant un combat actif.","var(--red)");
 ev.preventDefault(); return;
 }
 _teamDragIdx=i;
 ev.dataTransfer.effectAllowed='move';
 try{ ev.dataTransfer.setData('text/plain', String(i)); }catch(e){}
}

function onTeamDragOver(ev){
 ev.preventDefault();
 ev.dataTransfer.dropEffect='move';
 ev.currentTarget.style.borderColor='var(--light1)';
}

function onTeamDragLeave(ev){ ev.currentTarget.style.borderColor=''; }

function onTeamDrop(ev, j){
 ev.preventDefault();
 ev.currentTarget.style.borderColor='';
 if(battle.active) return;
 const i=_teamDragIdx; _teamDragIdx=null;
 if(i==null||i===j||!G.team[i]||!G.team[j]) return;
 const tmp=G.team[i]; G.team[i]=G.team[j]; G.team[j]=tmp;
 saveGame();
 renderTeamWindow();
}

function onTeamCardClick(ev, i){
 if(ev.defaultPrevented) return;
 if(battle.active){
 notify("Action impossible : impossible d'échanger l'équipe en plein combat.","var(--red)");
 return;
 }
 _swapFromTeamIdx=i;
 // Open box selector directly with 'team' action (bypass showTab which uses 'box_view')
 if(typeof openUnifiedSelectorModal === 'function'){
 openUnifiedSelectorModal('team');
 }
}

function removeFromTeam(idx){
 if(battle.active){
 notify("Impossible pendant un combat !", "var(--red)");
 return;
 }
 if(G.team.length <= 1){
 notify("Impossible de retirer votre seul Pokémon !", "var(--red)");
 return;
 }
 const p = G.team[idx];
 if(!p) return;
 // Find an empty slot in collection
 let boxId = String(p.id);
 while(G.collection[boxId]) {
 boxId = boxId + '_dup' + Math.floor(Math.random()*1000);
 }
 G.collection[boxId] = p;
 G.team.splice(idx, 1);
 _swapFromTeamIdx = null;
 saveGame();
 updateHeader();
 renderTeamWindow();
 notify(`${p.name} retiré de l'équipe et placé dans la boîte PC.`, 'var(--light2)');
}

function cancelSwap(){
 _swapFromTeamIdx = null;
 notify("Échange annulé.", 'var(--light1)');
}

function swapBoxWithTeam(boxId){
 if(_swapFromTeamIdx == null) return;
 const boxPoke = G.collection[boxId] || G.collection[String(boxId)];
 if(!boxPoke){ notify("Pokémon introuvable dans la boîte !", "var(--red)"); return; }
 const teamIdx = _swapFromTeamIdx;
 const teamPoke = G.team[teamIdx];
 if(!teamPoke){ notify("Pokémon d'équipe introuvable !", "var(--red)"); return; }
 // Find a new box slot for the team Pokémon
 let newBoxId = String(teamPoke.id);
 while(G.collection[newBoxId]) {
 newBoxId = newBoxId + '_dup' + Math.floor(Math.random()*1000);
 }
 // Perform swap
 G.collection[newBoxId] = teamPoke;
 delete G.collection[boxId];
 delete G.collection[String(boxId)];
 G.team[teamIdx] = boxPoke;
 _swapFromTeamIdx = null;
 saveGame();
 updateHeader();
 renderTeamWindow();
 notify(`${boxPoke.name} et ${teamPoke.name} ont été échangés !`, 'var(--green)');
}

function addBoxedToTeam(boxId){
 if(G.team.length >= 6){
 notify("Équipe pleine ! (6/6)", "var(--red)");
 return;
 }
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p){ notify("Pokémon introuvable !", "var(--red)"); return; }
 G.team.push(p);
 delete G.collection[boxId];
 delete G.collection[String(boxId)];
 saveGame();
 updateHeader();
 renderTeamWindow();
 notify(`${p.name} ajouté à l'équipe !`, 'var(--green)');
}

// ============================================================
// BOX TAB (Pokémon hors équipe)
// ============================================================


