// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
let _swapFromTeamIdx=null;
// FIX (2026-08, broken PC box): _swapFromTeamIdx used to live in module scope HERE
// while being read/written as a free identifier by box-ui.js, box-selector.js and
// runtime-legacy-bridge.js (window._swapFromTeamIdx). Fatal inconsistency: a plain
// renderBox() at first load threw a ReferenceError. Single source of truth =
// window._swapFromTeamIdx, with the canonical accessors below.
function getSwapFromTeamIdx(){
 const w = (typeof window !== 'undefined') ? window._swapFromTeamIdx : null;
 if(w != null && w !== '') return Number(w);
 return _swapFromTeamIdx;
}
function setSwapFromTeamIdx(i){
 _swapFromTeamIdx = (i == null ? null : Number(i));
 try{ if(typeof window !== 'undefined') window._swapFromTeamIdx = _swapFromTeamIdx; if(typeof globalThis !== 'undefined') globalThis._swapFromTeamIdx = _swapFromTeamIdx; }catch(_){}
}
setSwapFromTeamIdx(null);
// Phase 27: 20 presets (by rang, by region…). Garantit the structure
// G.teamPresets.preset1…preset20 with noms by defaut localises.
export const PRESET_MAX = 20;
if (typeof globalThis !== 'undefined') globalThis.PRESET_MAX = PRESET_MAX;
function ensureTeamPresets(){
 if(!G.teamPresets || typeof G.teamPresets !== 'object') G.teamPresets = {};
 const legacyNames = { preset1:'preset_adventure', preset2:'preset_boss', preset3:'preset_training' };
 for(let i=1;i<=PRESET_MAX;i++){
  const pk = 'preset' + i;
  if(!G.teamPresets[pk] || typeof G.teamPresets[pk] !== 'object') G.teamPresets[pk] = {name:'', uids:[]};
  if(!Array.isArray(G.teamPresets[pk].uids)) G.teamPresets[pk].uids = [];
  if(!G.teamPresets[pk].name) G.teamPresets[pk].name = legacyNames[pk] ? (t(legacyNames[pk])||'') : tr('preset_default_name', {n:i});
 }
 return G.teamPresets;
}

function saveCurrentTeamToPreset(key){
 if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
 if(!G.teamPresets[key]) G.teamPresets[key] = { name:"Preset"+ key, uids: [] };
 G.teamPresets[key].uids = G.team.map(p => p && p.uid).filter(Boolean);
 notify(tr('preset_saved', {name:G.teamPresets[key].name, count:G.team.length}), 'var(--blue)');
 renderTeamWindow();
 saveGame();
}

function loadTeamFromPreset(key){
 if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
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
 // Phase 16: memorise the item porte by each Pokemon before the
 // reagencement, for that chacun retrouve its item has its new place.
 const _itemByPoke = new Map();
 (G.team || []).forEach((p, i) => { if(p) _itemByPoke.set(p, ((G.teamSlotItems || [])[i]) || p.heldItem || null); });
 for(const oldP of G.team){
 if(!newTeam.includes(oldP)){
 if(typeof clearPokemonHeldItem === 'function') clearPokemonHeldItem(oldP); else oldP.heldItem = null;
 const _depKey = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(oldP.id) : (!G.collection[String(oldP.id)] ? String(oldP.id) : ('box_' + oldP.id + '_' + Date.now()));
      G.collection[_depKey] = oldP;
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

// Phase 24: opening the selector in "add" mode ("+" card). An earlier
// click on a team Pokemon card would sometimes leave a stale
// _swapFromTeamIdx (modal closed by any path other than the cancel button) —
// the next pick would then SWAP into the old position instead of appending
// at the END of the team. Explicitly purge the residual index.
function openAddToTeamSelector(){
 setSwapFromTeamIdx(null);
 if(typeof openUnifiedSelectorModal === 'function') openUnifiedSelectorModal('team');
}

function onTeamCardClick(ev, i){
 if(ev.defaultPrevented) return;
 if(battle.active){
 notify(t('cannot_swap_team_battle'),'var(--red)');
 return;
 }
 setSwapFromTeamIdx(i);
 
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
 // Phase 16: the removed Pokemon's item leaves with it; the following
 // Pokemon's items shift by one position instead of changing carriers.
 if(typeof removeTeamSlotItemAt === 'function') removeTeamSlotItemAt(idx);
 else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 setSwapFromTeamIdx(null);
 saveGame();
 updateHeader();
 renderTeamWindow();
 notify(tr('removed_to_pc', {name:p.name}), 'var(--light2)');
}

function cancelSwap(){
 setSwapFromTeamIdx(null);
 notify(t('swap_cancelled'), 'var(--light1)');
}

// FIX (2026-08): swap two members of the active team (drag & drop).
// The function was referenced by team-ui.js (_pwDragSwapPokes) but no longer
// existed anywhere — drag & drop reordering was therefore inert.
// Honors the invariants: battle lock, bounds, held items following their
// Pokemon (swapTeamSlotItems), persistence and re-renders.
function swapTeamMembers(a, b){
 a = Number(a); b = Number(b);
 if(Number.isNaN(a) || Number.isNaN(b) || a === b) return false;
 if(a < 0 || b < 0 || a >= G.team.length || b >= G.team.length) return false;
 if(typeof isTeamStructureLocked === 'function' && isTeamStructureLocked()){
 if(typeof notifyTeamStructureLocked === 'function') notifyTeamStructureLocked();
 else notify(t('action_blocked_in_battle'), 'var(--red)');
 return false;
 }
 const tmp = G.team[a];
 G.team[a] = G.team[b];
 G.team[b] = tmp;
 if(typeof swapTeamSlotItems === 'function') swapTeamSlotItems(a, b);
 else if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems();
 saveGame();
 updateHeader();
 renderTeamWindow();
 return true;
}
if (typeof globalThis !== 'undefined') globalThis.swapTeamMembers = swapTeamMembers;
if (typeof globalThis !== 'undefined') globalThis.swapTeamMembers = swapTeamMembers;

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
 // Phase 16: the Pokemon sortant emporte its item (slot libere for the
 // remplacant, which arrive of the PC without item).
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


function openActiveTeamEditorECS() {
  if (typeof window !== 'undefined' && window.UnifiedTeamEditorModal && G) {
    window.UnifiedTeamEditorModal.open({
      source: 'team',
      title: 'Équipe Active (ECS)',
      teamData: G.team || [],
      availablePokemon: (G.box || []).concat(G.team || []),
      onSave: (newTeam) => {
        G.team = newTeam;
        if (typeof saveGame === 'function') saveGame();
        if (typeof renderTeamWindow === 'function') renderTeamWindow();
      }
    });
    return true;
  }
  return false;
}
if (typeof globalThis !== 'undefined') globalThis.openActiveTeamEditorECS = openActiveTeamEditorECS;

// --- Migrated to ES module, globals exposed ---
if (typeof saveCurrentTeamToPreset !== 'undefined') { if (typeof window !== 'undefined') window.saveCurrentTeamToPreset = saveCurrentTeamToPreset; if (typeof globalThis !== 'undefined') globalThis.saveCurrentTeamToPreset = saveCurrentTeamToPreset; }
if (typeof loadTeamFromPreset !== 'undefined') { if (typeof window !== 'undefined') window.loadTeamFromPreset = loadTeamFromPreset; if (typeof globalThis !== 'undefined') globalThis.loadTeamFromPreset = loadTeamFromPreset; }
if (typeof renderTeam !== 'undefined') { if (typeof window !== 'undefined') window.renderTeam = renderTeam; if (typeof globalThis !== 'undefined') globalThis.renderTeam = renderTeam; }
if (typeof onTeamCardClick !== 'undefined') { if (typeof window !== 'undefined') window.onTeamCardClick = onTeamCardClick; if (typeof globalThis !== 'undefined') globalThis.onTeamCardClick = onTeamCardClick; }
if (typeof openAddToTeamSelector !== 'undefined') { if (typeof window !== 'undefined') window.openAddToTeamSelector = openAddToTeamSelector; if (typeof globalThis !== 'undefined') globalThis.openAddToTeamSelector = openAddToTeamSelector; }
if (typeof removeFromTeam !== 'undefined') { if (typeof window !== 'undefined') window.removeFromTeam = removeFromTeam; if (typeof globalThis !== 'undefined') globalThis.removeFromTeam = removeFromTeam; }
if (typeof cancelSwap !== 'undefined') { if (typeof window !== 'undefined') window.cancelSwap = cancelSwap; if (typeof globalThis !== 'undefined') globalThis.cancelSwap = cancelSwap; }
if (typeof swapBoxWithTeam !== 'undefined') { if (typeof window !== 'undefined') window.swapBoxWithTeam = swapBoxWithTeam; if (typeof globalThis !== 'undefined') globalThis.swapBoxWithTeam = swapBoxWithTeam; }
if (typeof addBoxedToTeam !== 'undefined') { if (typeof window !== 'undefined') window.addBoxedToTeam = addBoxedToTeam; if (typeof globalThis !== 'undefined') globalThis.addBoxedToTeam = addBoxedToTeam; }



// --- Exported globals ---
if (typeof ensureTeamPresets !== 'undefined') { if (typeof window !== 'undefined') window.ensureTeamPresets = ensureTeamPresets; if (typeof globalThis !== 'undefined') globalThis.ensureTeamPresets = ensureTeamPresets; }

if (typeof getSwapFromTeamIdx !== 'undefined') { if (typeof window !== 'undefined') window.getSwapFromTeamIdx = getSwapFromTeamIdx; if (typeof globalThis !== 'undefined') globalThis.getSwapFromTeamIdx = getSwapFromTeamIdx; }
if (typeof setSwapFromTeamIdx !== 'undefined') { if (typeof window !== 'undefined') window.setSwapFromTeamIdx = setSwapFromTeamIdx; if (typeof globalThis !== 'undefined') globalThis.setSwapFromTeamIdx = setSwapFromTeamIdx; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  swapTeamMembers,
  openActiveTeamEditorECS,
  saveCurrentTeamToPreset,
  loadTeamFromPreset,
  renderTeam,
  onTeamCardClick,
  openAddToTeamSelector,
  removeFromTeam,
  cancelSwap,
  swapBoxWithTeam,
  addBoxedToTeam,
  ensureTeamPresets,
  getSwapFromTeamIdx,
  setSwapFromTeamIdx,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('onTeamCardClick', onTeamCardClick); } catch (_) {} }

