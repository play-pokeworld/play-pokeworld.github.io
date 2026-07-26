// Repli si util.js (pwSetHtml) n'est pas chargé — tests unitaires ciblés.
var _pwSetHtmlSafe = _pwSetHtmlSafe || function(el, html){ if(typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
let _swapFromTeamIdx=null;

function saveCurrentTeamToPreset(key){
 if(!G.teamPresets) G.teamPresets = { preset1:{name:t('preset_adventure'),uids:[]}, preset2:{name:t('preset_boss'),uids:[]}, preset3:{name:t('preset_training'),uids:[]} };
 if(!G.teamPresets[key]) G.teamPresets[key] = { name:"Preset"+ key, uids: [] };
 G.teamPresets[key].uids = G.team.map(p => p && p.uid).filter(Boolean);
 notify(tr('preset_saved', {name:G.teamPresets[key].name, count:G.team.length}), 'var(--blue)');
 renderTeamWindow();
 saveGame();
}

function loadTeamFromPreset(key){
 if(typeof battle !== 'undefined' && battle && battle.active){
 notify(t('cannot_change_team_battle'),'var(--red)');
 return;
 }
 const preset = G.teamPresets && G.teamPresets[key];
 if(!preset || !preset.uids || !preset.uids.length){
 notify(t('preset_empty'),'var(--red)');
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
 notify(t('preset_pokemon_not_found'),'var(--red)');
 return;
 }
 // Passe 16 : mémorise l'objet porté par chaque Pokémon AVANT le
 // réagencement, pour que chacun retrouve SON objet à sa nouvelle place.
 const _itemByPoke = new Map();
 (G.team || []).forEach((p, i) => { if(p) _itemByPoke.set(p, ((G.teamSlotItems || [])[i]) || p.heldItem || null); });
 for(const oldP of G.team){
 if(!newTeam.includes(oldP)){
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(oldP); else oldP.heldItem = null;
 G.collection[String(oldP.id)] = oldP;
 }
 }
 G.team = newTeam;
 G.teamSlotItems = [0,1,2,3,4,5].map(i => (newTeam[i] && _itemByPoke.get(newTeam[i])) || null);
 if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 G.activePresetId = key;
 notify(tr('preset_loaded', {name:preset.name, count:newTeam.length}), 'var(--green)');
 renderTeamWindow();
 const tabEl = document.getElementById('tab-content');
 if(tabEl && document.querySelector('.tab[onclick*="team"]')?.classList.contains('active')) renderTeam(tabEl);
 saveGame();
}

function renderTeam(el){
 if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 if(G.team.length===0){
 _pwSetHtmlSafe(el, `<div class="pw-empty-state">
 ${t('no_pokemon_yet')}<br><br>
 ${!G.starter?`<button class="hbtn" data-action="legacy-call" data-call="chooseStarter" data-call-args="">${t('choose_starter_bang')}</button>`:t('explore_to_catch')}
 </div>`);
 return;
 }
 const battleLockBanner = battle.active ? `<div class="pw-alert">
 <span class="pw-text-md"></span>
 <span><b>${t('live_battle_lock_team')}</b> ${t('team_locked_battle_long')}</span>
 </div>` : '';
 const addCardHtml = G.team.length < 6 ? `<div class="pw-drop-zone" data-action="legacy-call" data-call="openAddToTeamSelector" data-call-args=""><div class="pw-text-lg">+</div><div class="pw-text-sm pw-light2 pw-bold">${t('add_pokemon')}</div><div class="pw-text-sm pw-light1">${tr('team_count', {count:G.team.length})}</div></div>` : '';
 _pwSetHtmlSafe(el, renderTeamPresetsToolbar() + battleLockBanner + G.team.map((p,i)=>renderPokeCard(p,i)).join('') + addCardHtml);
 try{ if(typeof installMoveDragDrop === 'function') installMoveDragDrop(); }catch(_){}
}

// Passe 24 : ouverture du sélecteur en mode « AJOUT » (carte « + »). Un clic
// antérieur sur une carte Pokémon de l'équipe laissait parfois traîner
// _swapFromTeamIdx (modale fermée autrement que par le bouton annuler) — le
// choix suivant partait alors en SWAP à l'ancienne position au lieu de
// s'ajouter EN FIN d'équipe. On purge explicitement l'index résiduel.
function openAddToTeamSelector(){
 _swapFromTeamIdx = null;
 if(typeof window !== 'undefined') window._swapFromTeamIdx = null;
 if(typeof openUnifiedSelectorModal === 'function') openUnifiedSelectorModal('team');
}

function onTeamCardClick(ev, i){
 if(ev.defaultPrevented) return;
 if(battle.active){
 notify(t('cannot_swap_team_battle'),'var(--red)');
 return;
 }
 _swapFromTeamIdx=i;
 
 if(typeof openUnifiedSelectorModal === 'function'){
 openUnifiedSelectorModal('team');
 }
}

function removeFromTeam(idx){
 if(battle.active){
 notify(t('cannot_during_battle'), 'var(--red)');
 return;
 }
 if(G.team.length <= 1){
 notify(t('cannot_remove_only_pokemon'), 'var(--red)');
 return;
 }
 const p = G.team[idx];
 if(!p) return;
 
 let boxId = String(p.id);
 while(G.collection[boxId]) {
 boxId = boxId + '_dup' + Math.floor(Math.random()*1000);
 }
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null;
 G.collection[boxId] = p;
 G.team.splice(idx, 1);
 // Passe 16 : l'objet du Pokémon retiré part avec lui ; ceux des Pokémon
 // suivants glissent d'une position au lieu de changer de porteur.
 if(typeof removeTeamSlotItemAt === 'function') removeTeamSlotItemAt(idx);
 else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 _swapFromTeamIdx = null;
 saveGame();
 updateHeader();
 renderTeamWindow();
 notify(tr('removed_to_pc', {name:p.name}), 'var(--light2)');
}

function cancelSwap(){
 _swapFromTeamIdx = null;
 notify(t('swap_cancelled'), 'var(--light1)');
}

function swapBoxWithTeam(boxId){
 if(_swapFromTeamIdx == null) return;
 const boxPoke = G.collection[boxId] || G.collection[String(boxId)];
 if(!boxPoke){ notify(t('box_pokemon_not_found'), 'var(--red)'); return; }
 const teamIdx = _swapFromTeamIdx;
 const teamPoke = G.team[teamIdx];
 if(!teamPoke){ notify(t('team_pokemon_not_found'), 'var(--red)'); return; }
 
 let newBoxId = String(teamPoke.id);
 while(G.collection[newBoxId]) {
 newBoxId = newBoxId + '_dup' + Math.floor(Math.random()*1000);
 }
 
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(teamPoke); else teamPoke.heldItem = null;
 G.collection[newBoxId] = teamPoke;
 delete G.collection[boxId];
 delete G.collection[String(boxId)];
 G.team[teamIdx] = boxPoke;
 // Passe 16 : le Pokémon sortant emporte son objet (slot libéré pour le
 // remplaçant, qui arrive du PC sans objet).
 if(typeof setTeamSlotItem === 'function') setTeamSlotItem(teamIdx, null);
 else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 _swapFromTeamIdx = null;
 saveGame();
 updateHeader();
 renderTeamWindow();
 notify(tr('pokemon_swapped', {a:boxPoke.name, b:teamPoke.name}), 'var(--green)');
}

function addBoxedToTeam(boxId){
 if(G.team.length >= 6){
 notify(t('team_full_short'), 'var(--red)');
 return;
 }
 const p = G.collection[boxId] || G.collection[String(boxId)];
 if(!p){ notify(t('pokemon_not_found'), 'var(--red)'); return; }
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null;
 G.team.push(p);
 if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 delete G.collection[boxId];
 delete G.collection[String(boxId)];
 saveGame();
 updateHeader();
 renderTeamWindow();
 notify(tr('added_to_team', {name:p.name}), 'var(--green)');
}


// --- Migrated to ES module, globals exposed ---
if (typeof saveCurrentTeamToPreset !== 'undefined' && typeof window !== 'undefined') window.saveCurrentTeamToPreset = saveCurrentTeamToPreset;
if (typeof loadTeamFromPreset !== 'undefined' && typeof window !== 'undefined') window.loadTeamFromPreset = loadTeamFromPreset;
if (typeof renderTeam !== 'undefined' && typeof window !== 'undefined') window.renderTeam = renderTeam;
if (typeof onTeamCardClick !== 'undefined' && typeof window !== 'undefined') window.onTeamCardClick = onTeamCardClick;
if (typeof openAddToTeamSelector !== 'undefined' && typeof window !== 'undefined') window.openAddToTeamSelector = openAddToTeamSelector;
if (typeof removeFromTeam !== 'undefined' && typeof window !== 'undefined') window.removeFromTeam = removeFromTeam;
if (typeof cancelSwap !== 'undefined' && typeof window !== 'undefined') window.cancelSwap = cancelSwap;
if (typeof swapBoxWithTeam !== 'undefined' && typeof window !== 'undefined') window.swapBoxWithTeam = swapBoxWithTeam;
if (typeof addBoxedToTeam !== 'undefined' && typeof window !== 'undefined') window.addBoxedToTeam = addBoxedToTeam;

