// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function renderBox(el){
 const allEntries=boxedEntries();
 const entries=(typeof applyPokemonBoxFilters === 'function') ? applyPokemonBoxFilters(allEntries) : allEntries;
 const filtersHtml = (typeof renderBoxFiltersHtml === 'function') ? renderBoxFiltersHtml() : '';
 const _swapIdx=(typeof getSwapFromTeamIdx==='function')?getSwapFromTeamIdx():((typeof window!=='undefined')?window._swapFromTeamIdx:null);
 const swap=(_swapIdx!=null && G.team[_swapIdx]);
 // View-model for the rebuilt PC box (ECS design-system BoxView).
 const model = {
  locked: !!battle.active,
  lockLabel: t('battle_lock_box'),
  filtersHtml: filtersHtml,
  emptyAll: !allEntries.length,
  emptyLabel: t('box_empty'),
  emptyFiltered: allEntries.length>0 && !entries.length,
  noFoundLabel: t('no_pokemon_found'),
  resetLabel: t('box_filter_reset'),
  hiddenCountLabel: `${allEntries.length} Pokémon masqués par filtres`,
  swapMode: !!swap,
  swapName: swap ? (G.team[_swapIdx]?.name || '') : '',
  swapHeaderLabel: t('box_swap_header'),
  finishLabel: t('finish_btn'),
  countLabel: ` ${entries.length} / ${allEntries.length} ${t('box_header')}`,
  fullscreenLabel: `\u{1F50D} ${t('fullscreen_pc_box')}`,
  cards: entries.map(({id, _cleanId, poke})=>{
   const isShiny = !!(poke.shinyUnlocked || poke.shinyActive || poke.shiny || isSpeciesShiny(poke.id));
   const num = (typeof DEX_MAP !== 'undefined' && DEX_MAP && DEX_MAP[String(poke.id)] != null) ? DEX_MAP[String(poke.id)] : Number(poke.id);
   const bucket = isShiny ? 'frontShiny' : 'front';
   const src = (typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA && SPRITE_DATA[bucket]) ? (SPRITE_DATA[bucket][String(num)] || null) : null;
   return {
    id: id,
    name: (typeof getPokeName==='function'?getPokeName(poke.id):poke.name),
    level: poke.level,
    shiny: isShiny,
    imgSrc: src,
    emoji: poke.emoji,
    // NO per-card buttons (user rule): the card itself opens the sheet via
    // left/right click; team moves happen there, never as repeated buttons.
    cardTitle: 'Clic ou Clic Droit pour voir la fiche',
    ficheLabel: null,
    ficheTitle: null,
    action: null
   };
  })
 };
 // Rebuilt display: the PC box is rendered by the ECS design-system
 // BoxView (zero legacy markup below this line).
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.BoxView) throw new Error('[ui] PokeUI views not loaded (BoxView)');
 _pwSetHtmlSafe(el, views.BoxView.toHTML(model).full);
 // Name search: re-rendering per keystroke must not drop the input focus
 // (same contract as the bag search).
 try{
  if(G.boxFilters && G.boxFilters.search && el && typeof el.querySelector === 'function'){
   const si = el.querySelector('.pw-filter-input[data-action="filter-box"]');
   if(si){ si.focus({preventScroll:true}); si.setSelectionRange(si.value.length, si.value.length); }
  }
 }catch(_){}
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
 // Empeche of have deux fois the same espece (regle of the game : 1 exemplaire max)
 if(G.team.some(p=>p && Number(p.id)===Number(poke.id))){
 setMsg(t('species_already_in_team'));
 return;
 }
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(poke); else poke.heldItem = null;
 // Cleanly delete the key (whatever its name)
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
 const idx=(typeof getSwapFromTeamIdx==='function')?getSwapFromTeamIdx():((typeof window!=='undefined')?window._swapFromTeamIdx:null);
 if(idx==null||!G.team[idx]) return cancelBoxSwap();
 const boxed=G.collection[id] || G.collection[String(id)];
 if(!boxed) return;
 const teamP=G.team[idx];

 const boxedSpecies = Number(boxed.id);
 const teamSpecies = Number(teamP.id);

 // if the incoming species already exists elsewhere in the team, block (anti-duplicate)
 const duplicateInTeam = G.team.some((tp,ti)=>ti!==idx && Number(tp.id)===boxedSpecies);
 if(duplicateInTeam){
 setMsg(t('species_already_in_team_present'));
 return;
 }
 // If the outgoing species already exists in the box (other than the
 // swap case), we block
 let duplicateInBox = false;
 for(const k in G.collection){
   if(k===id || String(k)===String(id)) continue;
   const p = G.collection[k];
   if(p && Number(p.id)===teamSpecies){ duplicateInBox = true; break; }
 }
 if(duplicateInBox){
 setMsg(t('species_already_in_box'));
 return;
 }

 delete G.collection[id];
 delete G.collection[String(id)];
 for(const k of Object.keys(G.collection)){
 if(G.collection[k] === boxed) delete G.collection[k];
 }
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(teamP); else teamP.heldItem = null;
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(boxed); else boxed.heldItem = null;
 // Use a UNIQUE ID to store the outgoing Pokemon, so we never overwrite
 const outKey = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(teamP.id) : ('box_' + teamP.id + '_' + Date.now());
 G.collection[outKey] = teamP;
 G.team[idx] = boxed;
 if(typeof setTeamSlotItem === 'function') setTeamSlotItem(idx, null);
 else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 if(typeof setSwapFromTeamIdx==='function') setSwapFromTeamIdx(null); else try{ window._swapFromTeamIdx=null; }catch(_){}
 notify(`🔁 ${teamP.name} ↔ ${boxed.name}`);
 showTab('box');
 renderTeamWindow();
 saveGame();
}


function sendTeamToBox(idx){
 if(G.team.length<=1){ setMsg(t('must_keep_one_pokemon')); return; }
 const p=G.team[idx];
 if(!p) return;
 // Anti-duplicate: checks the real instance, not just the numeric key
 let alreadyInBox = false;
 if(G.collection){
   for(const k in G.collection){
     const b = G.collection[k];
     if(b && Number(b.id)===Number(p.id)){ alreadyInBox=true; break; }
   }
 }
 if(alreadyInBox){
 setMsg(t('species_already_in_box'));
 return;
 }
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(p); else p.heldItem = null;
 const _boxId = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(p.id) : ('box_' + p.id + '_' + Date.now());
 G.collection[_boxId]=p;
 G.team.splice(idx,1);
 if(typeof removeTeamSlotItemAt === 'function') removeTeamSlotItemAt(idx);
 else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 const modal = document.getElementById('poke-modal');
 if(modal) modal.classList.remove('open');
 notify(tr('sent_to_box', {name:p.name}));
 showTab('box');
 saveGame();
}

function refreshAfterShinyToggle(){
 try{ if(typeof updateHeader === 'function') updateHeader(); }catch(_){}
 try{ if(typeof renderTeamWindow === 'function') renderTeamWindow(); }catch(_){}
 try{ if(typeof renderBattleTeamRow === 'function') renderBattleTeamRow(); }catch(_){}
 try{ if(typeof updateBattleUI === 'function' && battle && battle.active) updateBattleUI(); }catch(_){}
 try{ if(typeof renderUnifiedGrid === 'function') renderUnifiedGrid(); }catch(_){}
 try{
  const tabEl = document.getElementById('tab-content');
  if(tabEl && typeof _activeTab !== 'undefined'){
    if(_activeTab === 'box' && typeof renderBox === 'function') renderBox(tabEl);
    if(_activeTab === 'pokedex' && typeof renderPokedex === 'function') renderPokedex(tabEl);
  }
 }catch(_){}
 try{ if(typeof refreshMapAndLoc === 'function') refreshMapAndLoc(); }catch(_){}
}


function toggleShinySkin(idx){
 const p = (typeof G !== 'undefined' && G && Array.isArray(G.team)) ? G.team[Number(idx)] : null;
 if(!p || !(p.shinyUnlocked || p.shiny || (typeof isSpeciesShiny === 'function' && isSpeciesShiny(p.id)))) return;
 if(p.shinyActive === undefined) p.shinyActive = true;
 p.shinyActive = !p.shinyActive;
 p.shiny = !!p.shinyActive;
 if(typeof saveGame === 'function') saveGame();
 if(typeof refreshAfterShinyToggle === 'function') refreshAfterShinyToggle();
 if(typeof openPokeModal === 'function') openPokeModal(Number(idx));
}

function toggleBoxShinySkin(boxId){
 const p = (typeof G !== 'undefined' && G && G.collection) ? (G.collection[boxId] || G.collection[String(boxId)]) : null;
 if(!p || !(p.shinyUnlocked || p.shiny || (typeof isSpeciesShiny === 'function' && isSpeciesShiny(p.id)))) return;
 if(p.shinyActive === undefined) p.shinyActive = true;
 p.shinyActive = !p.shinyActive;
 p.shiny = !!p.shinyActive;
 if(typeof saveGame === 'function') saveGame();
 if(typeof refreshAfterShinyToggle === 'function') refreshAfterShinyToggle();
 if(typeof openBoxPokeModal === 'function') openBoxPokeModal(boxId);
}


function statusColor(s){
 return {burn:'#c06030',poison:'#a040a0',badpoison:'#800080',para:'#c0a000',sleep:'#6070c0',freeze:'#4090d0',confuse:'#d060d0'}[s]||'#555';
}

function statusLabel(s){
 return {burn:'bru',poison:'poi',badpoison:'tox',para:'par',sleep:'som',freeze:'gel',confuse:'con'}[s]||String(s||'').slice(0,3).toLowerCase();
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderBox !== 'undefined') { if (typeof window !== 'undefined') window.renderBox = renderBox; if (typeof globalThis !== 'undefined') globalThis.renderBox = renderBox; }
if (typeof addBoxedToTeam !== 'undefined') { if (typeof window !== 'undefined') window.addBoxedToTeam = addBoxedToTeam; if (typeof globalThis !== 'undefined') globalThis.addBoxedToTeam = addBoxedToTeam; }
if (typeof swapBoxWithTeam !== 'undefined') { if (typeof window !== 'undefined') window.swapBoxWithTeam = swapBoxWithTeam; if (typeof globalThis !== 'undefined') globalThis.swapBoxWithTeam = swapBoxWithTeam; }
if (typeof sendTeamToBox !== 'undefined') { if (typeof window !== 'undefined') window.sendTeamToBox = sendTeamToBox; if (typeof globalThis !== 'undefined') globalThis.sendTeamToBox = sendTeamToBox; }
if (typeof refreshAfterShinyToggle !== 'undefined') { if (typeof window !== 'undefined') window.refreshAfterShinyToggle = refreshAfterShinyToggle; if (typeof globalThis !== 'undefined') globalThis.refreshAfterShinyToggle = refreshAfterShinyToggle; }
if (typeof toggleShinySkin !== 'undefined') { if (typeof window !== 'undefined') window.toggleShinySkin = toggleShinySkin; if (typeof globalThis !== 'undefined') globalThis.toggleShinySkin = toggleShinySkin; }
if (typeof toggleBoxShinySkin !== 'undefined') { if (typeof window !== 'undefined') window.toggleBoxShinySkin = toggleBoxShinySkin; if (typeof globalThis !== 'undefined') globalThis.toggleBoxShinySkin = toggleBoxShinySkin; }
if (typeof statusColor !== 'undefined') { if (typeof window !== 'undefined') window.statusColor = statusColor; if (typeof globalThis !== 'undefined') globalThis.statusColor = statusColor; }
if (typeof statusLabel !== 'undefined') { if (typeof window !== 'undefined') window.statusLabel = statusLabel; if (typeof globalThis !== 'undefined') globalThis.statusLabel = statusLabel; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderBox,
  addBoxedToTeam,
  swapBoxWithTeam,
  sendTeamToBox,
  refreshAfterShinyToggle,
  toggleShinySkin,
  toggleBoxShinySkin,
  statusColor,
  statusLabel,
};

