const SAVE_KEY = 'pokeworld_save';
const SAVE_LIBRARY_KEY = 'pokeworld_saves_v1';
const ACTIVE_SAVE_ID_KEY = 'pokeworld_active_save_id';
const SAVE_SLOT_PREFIX = 'pokeworld_save_slot_';
const SAVE_VERSION = 3;
const SAVE_CARD_BACKGROUNDS = ['classic', 'goldsilver', 'emerald', 'diamondpearl', 'blackwhite', 'xy', 'forest'];
const SAVE_BACKGROUND_ALIASES = { blue:'classic', red:'classic', green:'emerald', purple:'xy', gold:'goldsilver', silver:'goldsilver' };
let currentSaveId = null;
let saveSessionStartedAt = 0;
function appTimer(name, callback, delay) {
  if (typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers?.set) {
    return PokeWorldTimers.set(name, callback, delay);
  }
  return setInterval(callback, delay);
}
let pendingSaveProfileIconId = null;

function saveNow(){ return Date.now(); }
function storageGet(key){ try{ const store = (typeof safeStorage !== 'undefined') ? safeStorage : null; return store && store.get ? store.get(key) : localStorage.getItem(key); }catch(_){ return null; } }
function storageSet(key, value){ try{ const store = (typeof safeStorage !== 'undefined') ? safeStorage : null; if(store && store.set) return store.set(key, value); localStorage.setItem(key, value); return true; }catch(_){ return false; } }
function storageRemove(key){ try{ const store = (typeof safeStorage !== 'undefined') ? safeStorage : null; if(store && store.remove) return store.remove(key); localStorage.removeItem(key); return true; }catch(_){ return false; } }
function slotKey(id){ return SAVE_SLOT_PREFIX + String(id || ''); }
function escHtml(value){ return String(value == null ? '' : value).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function escArg(value){ return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }
function normalizeBackground(value){ const raw = String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, ''); const mapped = SAVE_BACKGROUND_ALIASES[raw] || raw; return SAVE_CARD_BACKGROUNDS.includes(mapped) ? mapped : 'classic'; }
function defaultSaveName(num){ return (typeof tr === 'function') ? tr('save_default_name', {num:num || 1}) : ('Save ' + (num || 1)); }
function importedSaveName(){ return (typeof t === 'function') ? t('save_imported_name') : 'Imported save'; }
function saveBackgroundLabel(bg){ return (typeof t === 'function') ? t('save_bg_' + bg) : bg; }
function makeSaveId(){ return 'PW-' + saveNow().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }
function readSaveIndex(){ try{ const raw = storageGet(SAVE_LIBRARY_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed.filter(x => x && typeof x.id === 'string') : []; }catch(_){ return []; } }
function writeSaveIndex(list){ storageSet(SAVE_LIBRARY_KEY, JSON.stringify(list || [])); }
function readSlot(id){ try{ const raw = storageGet(slotKey(id)); return raw ? JSON.parse(raw) : null; }catch(_){ return null; } }
function writeSlot(id, saveData, mirrorActive){ if(!id || !saveData) return false; saveData.saveId = id; const json = JSON.stringify(saveData); storageSet(slotKey(id), json); if(mirrorActive) storageSet(SAVE_KEY, json); return true; }
function saveIdExists(id){ return !!readSlot(id); }
function uniqueSaveId(preferred){ let id = preferred && !saveIdExists(preferred) ? preferred : makeSaveId(); for(let i=0; saveIdExists(id) && i<40; i++) id = makeSaveId(); return id; }
function hasStarterInState(state){ return !!(state && (state.starter || state.starterKanto || (state.regionStarter && state.regionStarter.kanto) || (Array.isArray(state.team) && state.team.length > 0))); }
function inferSaveIconId(state){
 const metaIcon = Number(state && state.saveMeta && state.saveMeta.iconPokeId);
 if(metaIcon > 0) return metaIcon;
 const firstTeam = state && Array.isArray(state.team) ? state.team.find(p => p && p.id) : null;
 if(firstTeam) return Number(firstTeam.id);
 const box = state && state.collection ? Object.values(state.collection).find(p => p && p.id) : null;
 if(box) return Number(box.id);
 return 0;
}
function ensureDefaultSaveIcon(){ if(G && G.saveMeta && !G.saveMeta.iconPokeId){ const id = inferSaveIconId(G); if(id) G.saveMeta.iconPokeId = id; } }
function stripMoveMetaFromPokemon(p){ if(!p || !Array.isArray(p.moves)) return; p.moves = p.moves.map(m => typeof m === 'string' ? {id:m} : (m && m.id ? {id:m.id} : null)).filter(Boolean); }
function stripMoveMetaFromState(state){
 if(!state) return;
 (state.team || []).forEach(stripMoveMetaFromPokemon);
 Object.values(state.collection || {}).forEach(stripMoveMetaFromPokemon);
 (state.hatchery || []).forEach(slot => { if(slot && slot.poke) stripMoveMetaFromPokemon(slot.poke); });
 (state.trainingSlots || []).forEach(slot => {
  if(!slot || !slot.battle) return;
  stripMoveMetaFromPokemon(slot.battle.enemy);
  (slot.battle.enemies || []).forEach(stripMoveMetaFromPokemon);
 });
}
function isCompatibleSaveData(saveData) { return !!saveData && saveData.version === SAVE_VERSION && !!saveData.G && typeof saveData.G === 'object' && Array.isArray(saveData.G.team) && !!saveData.G.collection && typeof saveData.G.collection === 'object' && !!saveData.G.inventory && typeof saveData.G.inventory === 'object'; }
function ensureSaveMeta(saveData, desiredId){
 if(!saveData.G) saveData.G = {};
 if(!saveData.G.saveMeta || typeof saveData.G.saveMeta !== 'object') saveData.G.saveMeta = {};
 const meta = saveData.G.saveMeta;
 const id = desiredId || saveData.saveId || meta.id || makeSaveId();
 meta.id = id; saveData.saveId = id;
 if(!meta.name) meta.name = defaultSaveName(readSaveIndex().length + 1);
 meta.background = normalizeBackground(meta.background);
 if(!meta.createdAt) meta.createdAt = saveData.timestamp || saveNow();
 meta.updatedAt = meta.updatedAt || saveData.timestamp || saveNow();
 if(saveData.G.playTimeMs == null) saveData.G.playTimeMs = Number(meta.playTimeMs || 0);
 meta.playTimeMs = Math.max(0, Number(saveData.G.playTimeMs || meta.playTimeMs || 0));
 const icon = inferSaveIconId(saveData.G);
 if(icon) meta.iconPokeId = icon;
 return meta;
}
function summarizeSaveData(saveData){ const meta = ensureSaveMeta(saveData, saveData.saveId || saveData.G?.saveMeta?.id); const dex = saveData.G.pokedex || {}; return { id: meta.id, name: meta.name, background: normalizeBackground(meta.background), iconPokeId: Number(meta.iconPokeId || inferSaveIconId(saveData.G) || 0), updatedAt: Number(meta.updatedAt || saveData.timestamp || saveNow()), createdAt: Number(meta.createdAt || saveData.timestamp || saveNow()), badges: Array.isArray(saveData.G.badges) ? saveData.G.badges.length : 0, caught: Object.values(dex).filter(entry => entry && entry.caught).length, playMs: Math.max(0, Number(saveData.G.playTimeMs || meta.playTimeMs || 0)) }; }
function upsertSaveIndex(saveData){ if(!hasStarterInState(saveData && saveData.G)) return; const summary = summarizeSaveData(saveData); const list = readSaveIndex().filter(entry => entry && entry.id !== summary.id && readSlot(entry.id)); list.push(summary); list.sort((a,b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)); writeSaveIndex(list); }
function removeSaveFromIndex(id){ writeSaveIndex(readSaveIndex().filter(entry => entry && entry.id !== id)); }
function normalizeLoadedState(){
 if(!G) G = {};
 if(!G.collection) G.collection = {};
 // Suppression du Proxy (lisibilité) – on nettoie juste les clés techniques accidentelles
 try {
   for(const k in G.collection){
     if(String(k).startsWith('__') || k==='__isProxy'){
       try { delete G.collection[k]; } catch(_){}
     }
   }
 } catch(_){}
 if(!G.team) G.team = [];
 if(!G.inventory) G.inventory = {};
 // One-time inventory migration: canonical item IDs and removal of retired items.
 const itemRenames = { berry_oran:'oran_berry', berry_sitrus:'sitrus_berry', berry_ceriz:'cheri_berry', berry_prine:'prine_berry', chroma_charm:'shiny_charm', up_grade:'upgrade', fire_stone:'firestone', water_stone:'waterstone', thunder_stone:'thunderstone', leaf_stone:'leafstone', moon_stone:'moonstone', sun_stone:'sunstone', duskstone:'dusk_stone', dawnstone:'dawn_stone', shinystone:'shiny_stone', icestone:'ice_stone' };
 for(const [oldKey, newKey] of Object.entries(itemRenames)){
  if(G.inventory[oldKey]) { G.inventory[newKey] = (G.inventory[newKey] || 0) + G.inventory[oldKey]; delete G.inventory[oldKey]; }
 }
 // NB : 'fossil' (fossile générique de la mine, objet jouable depuis la
 // passe 13) ne doit PAS être retiré du sac au chargement — seuls les
 // anciens doubletons legacy ('ancient_fossil','old_fossil') le sont.
 // Passe 27 : retrait des baies sans effet (Oran/Sitrus/Ceriz) du jeu entier.
 const RETIRED_ITEMS = ['choice_scarf','swift_charm','ancient_fossil','old_fossil','focus_lens','power_gem','thick_club','sitrus_berry','cheri_berry','oran_berry'];
 for(const retiredKey of RETIRED_ITEMS) delete G.inventory[retiredKey];
 // …et des porteurs (équipe ET boîte PC) — sinon ils garderaient un objet fantôme.
 if(Array.isArray(G.team)) for(const _tp of G.team){ if(_tp && RETIRED_ITEMS.includes(_tp.heldItem)) _tp.heldItem = null; }
 if(G.collection) for(const _ck in G.collection){ const _cp = G.collection[_ck]; if(_cp && RETIRED_ITEMS.includes(_cp.heldItem)) _cp.heldItem = null; }
 // Passe 14 : un fossile Johto déjà en incubation donne désormais sa cible
 // canonique (Racine → Lilia #345, Griffe → Anorith #347) au lieu de
 // l'ancien placeholder (Marcacrin #220 / Embrylex #246).
 const legacyFossilRevive = { root_fossil: [220, 345], claw_fossil: [246, 347] };
 if(Array.isArray(G.hatchery)) for(const slot of G.hatchery){
  if(slot && slot.isFossil && legacyFossilRevive[slot.fossilKey] && Number(slot.reviveId) === legacyFossilRevive[slot.fossilKey][0]){
   slot.reviveId = legacyFossilRevive[slot.fossilKey][1];
   if(typeof hatcheryStepsForPokemon === 'function') slot.stepsReq = hatcheryStepsForPokemon(slot.reviveId);
  }
 }
 if(Array.isArray(G.teamSlotItems)) G.teamSlotItems = G.teamSlotItems.map(key => { const k2 = itemRenames[key] || key; return (['choice_scarf','swift_charm','focus_lens','power_gem','thick_club','sitrus_berry','cheri_berry','oran_berry'].includes(k2) ? null : k2); });
 if(!G.pokedex) G.pokedex = {};
 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.mainStep) G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
 if(!G.regionLeagueWon || typeof G.regionLeagueWon !== 'object') G.regionLeagueWon = {};
 if(typeof window !== 'undefined' && window.PokeWorldDomain && window.PokeWorldDomain.routeEvents && typeof window.PokeWorldDomain.routeEvents.ensureRouteEventState === 'function') window.PokeWorldDomain.routeEvents.ensureRouteEventState(G);
 if(typeof ensureRegionProgress === 'function') ensureRegionProgress();
 if(!G.secretBaseFlags || typeof G.secretBaseFlags !== 'object') G.secretBaseFlags = { count: 0, collectedIds: {}, lastRankNotified: 'normal' };
 if(!G.shinyCharmRegions || typeof G.shinyCharmRegions !== 'object') G.shinyCharmRegions = {};
 if(!G.puzzleExplorations || typeof G.puzzleExplorations !== 'object') G.puzzleExplorations = { completed: {}, progress: {} };
 try{ if(typeof ensureSecretBaseFlags === 'function') ensureSecretBaseFlags(); }catch(_){}
 try{ if(typeof ensurePuzzleState === 'function') ensurePuzzleState(); }catch(_){}
 try{ if(typeof syncShinyCharmProgress === 'function') syncShinyCharmProgress(); }catch(_){}
 if(!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
 if(!Array.isArray(G.teamSlotItems)) G.teamSlotItems = [];
 if(!G.evolvedSpecies) G.evolvedSpecies = [];
  // ─── Pokémon data migration: fix moves & talents from PokeChill ───
  migratePokemonData();
  if(typeof setSaveVersion === 'function') setSaveVersion(SAVE_VERSION);

  // ─── Sync language with the localization engine ───
  if (typeof window !== 'undefined' && window.L && typeof window.L.set === 'function') {
    var savedLang = G.lang || 'en';
    try { var stored = storageGet('pokeworld_lang'); if (stored) savedLang = stored; } catch(_){}
    window.L.set(savedLang);
    G.lang = savedLang;
  }

 if(!G.dupeCatches) G.dupeCatches = {};
 // Passe 27 : 20 emplacements d'équipe (anciennes sauvegardes migrées).
 if(typeof ensureTeamPresets === 'function') ensureTeamPresets();
 else if(!G.teamPresets) G.teamPresets = { preset1:{name:t('preset_adventure'),uids:[]}, preset2:{name:t('preset_boss'),uids:[]}, preset3:{name:t('preset_training'),uids:[]} };
 if(!G.activePresetId) G.activePresetId = 'preset1';
 if(G.playTimeMs == null) G.playTimeMs = 0;
 if(!G.saveMeta || typeof G.saveMeta !== 'object') G.saveMeta = {};
 G.saveMeta.background = normalizeBackground(G.saveMeta.background);
 ensureDefaultSaveIcon();
 stripMoveMetaFromState(G);
 if (typeof applyOfficialPokemonDataToSave === 'function') applyOfficialPokemonDataToSave();
 stripMoveMetaFromState(G);
 if(typeof canAccessRegion === 'function' && G.region && !canAccessRegion(G.region)){ G.region = 'kanto'; G.location = 'vermilion'; }
 if(typeof ensureTeamSlotItems === 'function') ensureTeamSlotItems();
 
 // Retro-compatibility for legacy saves:
 if(!G.unlockedLocs || typeof G.unlockedLocs !== 'object') G.unlockedLocs = {};
 if(G.location) G.unlockedLocs[G.location] = true;
 if(G.visitedMaps) {
   for(const id in G.visitedMaps) { G.unlockedLocs[id] = true; }
 }
 if(G.badges) {
   if(G.badges.includes('brock') || G.badges.length >= 1) {
     G.unlockedLocs['pallet'] = true;
     G.unlockedLocs['route1'] = true;
     G.unlockedLocs['viridian'] = true;
     G.unlockedLocs['route2'] = true;
     G.unlockedLocs['viridianforest'] = true;
     G.unlockedLocs['pewter'] = true;
     G.unlockedLocs['route3'] = true;
     G.unlockedLocs['route22'] = true;
     G.repeatableQuestsUnlocked = true;
   }
   if(G.badges.includes('misty')) {
     G.unlockedLocs['mtmoon'] = true;
     G.unlockedLocs['route4'] = true;
     G.unlockedLocs['cerulean'] = true;
     G.unlockedLocs['route5'] = true;
     G.repeatableQuestsUnlocked = true;
   }
   if(G.badges.includes('surge')) {
     G.unlockedLocs['route6'] = true;
     G.unlockedLocs['vermilion'] = true;
     G.unlockedLocs['diglettscave'] = true;
     G.repeatableQuestsUnlocked = true;
   }
   if(G.badges.includes('koga')) {
     G.unlockedLocs['fuchsia'] = true;
     G.repeatableQuestsUnlocked = true;
   }
   if(G.badges.includes('elite4') || G.region === 'johto') {
     G.repeatableQuestsUnlocked = true;
   }
 }
 // Réparation des sauvegardes corrompues : déduplication puis restauration des manquants
 try {
   if(typeof deduplicateCollectionAndFixBox === 'function'){
     const removed = deduplicateCollectionAndFixBox();
     if(removed>0) console.log('[SAVE FIX] Dedup removed', removed);
   }
 } catch(_){}
 repairMissingBoxPokemon(G);
}
function repairMissingBoxPokemon(targetG) {
  const gState = targetG || (typeof G !== 'undefined' ? G : null);
  if (!gState || !gState.pokedex || !gState.collection || !Array.isArray(gState.team)) return false;
  let repaired = false;
  const hasInstance = (nid) => {
    if (gState.team.some(p => p && Number(p.id) === nid)) return true;
    if (gState.collection[nid] || gState.collection[String(nid)]) return true;
    for (const k in gState.collection) {
      const p = gState.collection[k];
      if (p && Number(p.id) === nid) return true;
    }
    for (const s of (gState.hatchery || [])) {
      if (s && s.poke && Number(s.poke.id) === nid) return true;
    }
    for (const s of (gState.training || [])) {
      if (s && s.poke && Number(s.poke.id) === nid) return true;
    }
    return false;
  };

  for (const idStr in gState.pokedex) {
    const entry = gState.pokedex[idStr];
    const nid = Number(idStr);
    if (nid > 0 && entry && entry.caught) {
      if (!hasInstance(nid)) {
        if (typeof createPoke === 'function') {
          const isShiny = !!entry.shiny;
          const restored = createPoke(nid, 5, isShiny);
          if (restored) {
            const boxKey = (typeof generateUniqueBoxId === 'function') ? generateUniqueBoxId(nid) : ('box_' + nid + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
            gState.collection[boxKey] = restored;
            repaired = true;
          }
        }
      }
    }
  }

  const allOwnedIds = new Set();
  gState.team.forEach(p => { if (p && Number(p.id) > 0) allOwnedIds.add(Number(p.id)); });
  for (const k in gState.collection) {
    const p = gState.collection[k];
    if (p && Number(p.id) > 0) allOwnedIds.add(Number(p.id));
  }
  (gState.hatchery || []).forEach(s => { if (s && s.poke && Number(s.poke.id) > 0) allOwnedIds.add(Number(s.poke.id)); });
  (gState.training || []).forEach(s => { if (s && s.poke && Number(s.poke.id) > 0) allOwnedIds.add(Number(s.poke.id)); });

  for (const nid of allOwnedIds) {
    if (!gState.pokedex[nid] || !gState.pokedex[nid].caught) {
      gState.pokedex[nid] = { ...(gState.pokedex[nid] || {}), seen: true, caught: true };
      repaired = true;
    }
  }

  return repaired;
}
function migrateLegacySingleSave(){
 let changed = false; const normalized = [];
 for(const item of readSaveIndex()){
  const data = readSlot(item.id);
  if(data && isCompatibleSaveData(data) && hasStarterInState(data.G)){ ensureSaveMeta(data, item.id); writeSlot(item.id, data, false); normalized.push(summarizeSaveData(data)); }
  else { if(item && item.id) storageRemove(slotKey(item.id)); changed = true; }
 }
 if(!normalized.length){ try{ const raw = storageGet(SAVE_KEY); if(raw){ const data = JSON.parse(raw); if(isCompatibleSaveData(data) && hasStarterInState(data.G)){ const id = uniqueSaveId(data.saveId || data.G?.saveMeta?.id); ensureSaveMeta(data, id); writeSlot(id, data, false); normalized.push(summarizeSaveData(data)); changed = true; } } }catch(_){ } }
 if(changed || normalized.length) writeSaveIndex(normalized.sort((a,b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0)));
 return normalized;
}
function getSaveSummaries(){ return migrateLegacySingleSave(); }
function formatPlayTime(ms){ const total = Math.max(0, Math.floor(Number(ms || 0) / 1000)); const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const s = total % 60; if(h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm'; if(m > 0) return m + 'm ' + String(s).padStart(2, '0') + 's'; return s + 's'; }
function renderSaveIcon(id, size){ const nid = Number(id || 0); if(nid > 0 && typeof spriteImg === 'function') return spriteImg(nid, '', {size:size || 68}); return '<span class="save-slot-icon-missing">?</span>'; }
function renderSaveCardMarkup(save, mode){
 const bg = normalizeBackground(save.background);
 const icon = Number(save.iconPokeId || 0);
 const name = escHtml(save.name || defaultSaveName(1));
 const id = escHtml(save.id || 'PW-NEW');
 const attrs = mode === 'menu' ? `button class="save-slot save-bg-${bg}" data-action="legacy-call" data-call="startSaveById" data-call-args="'${escArg(save.id)}'" data-context-call="openSaveCardContextMenu" data-context-args="'${escArg(save.id)}',event"` : `div class="save-slot save-slot-preview save-bg-${bg}"`;
 const closeTag = mode === 'menu' ? 'button' : 'div';
 return `<${attrs}><span class="save-slot-main"><span class="save-slot-icon">${renderSaveIcon(icon, 70)}</span><span class="save-slot-title"><span class="save-slot-name">${name}</span><span class="save-slot-id">${escHtml(t('save_menu_id'))} ${id}</span></span></span><span class="save-slot-stats"><span><b>${save.badges || 0}</b><small>${escHtml(t('save_menu_badges'))}</small></span><span><b>${save.caught || 0}</b><small>${escHtml(t('save_menu_pokedex'))}</small></span><span><b>${escHtml(formatPlayTime(save.playMs || 0))}</b><small>${escHtml(t('save_menu_playtime'))}</small></span></span>${mode === 'menu' ? `<span class="save-slot-bottom"><span>${escHtml(t('save_menu_click_hint'))}</span></span>` : ''}</${closeTag}>`;
}
function updateSaveMenuScrollButtons(){ const list = document.getElementById('save-menu-list'); const prev = document.getElementById('save-menu-prev'); const next = document.getElementById('save-menu-next'); if(!list || !prev || !next) return; const overflow = list.scrollWidth > list.clientWidth + 4; prev.classList.toggle('is-hidden', !overflow); next.classList.toggle('is-hidden', !overflow); }
function scrollSaveList(direction){ const list = document.getElementById('save-menu-list'); if(!list) return; list.scrollBy({left: Number(direction || 1) * 356, behavior:'smooth'}); setTimeout(updateSaveMenuScrollButtons, 260); }
function ensureSaveCardContextMenu(){
 let menu = document.getElementById('save-card-context-menu');
 if(!menu){
  menu = document.createElement('div');
  menu.id = 'save-card-context-menu';
  menu.className = 'save-card-context-menu';
  document.body.appendChild(menu);
  document.addEventListener('click', (event) => { if(!event.target.closest('#save-card-context-menu')) closeSaveCardContextMenu(); });
  document.addEventListener('keydown', (event) => { if(event.key === 'Escape') closeSaveCardContextMenu(); });
 }
 return menu;
}
function closeSaveCardContextMenu(){ const menu = document.getElementById('save-card-context-menu'); if(menu) menu.classList.remove('open'); }
function openSaveCardContextMenu(id, event){
 const data = readSlot(id);
 if(!data || !isCompatibleSaveData(data)) return;
 const menu = ensureSaveCardContextMenu();
 const safeId = escArg(id);
 menu.innerHTML = `<button class="save-context-item" data-action="legacy-call" data-call="downloadSaveById" data-call-args="'${safeId}'">⬇ ${escHtml(t('save_context_download'))}</button><button class="save-context-item" data-action="legacy-call" data-call="importOverwriteSaveById" data-call-args="'${safeId}'">⬆ ${escHtml(t('save_context_import_overwrite'))}</button><button class="save-context-item danger" data-action="legacy-call" data-call="deleteSaveById" data-call-args="'${safeId}'">🗑 ${escHtml(t('save_context_delete'))}</button>`;
 menu.classList.add('open');
 const x = event && Number.isFinite(event.clientX) ? event.clientX : Math.round(window.innerWidth / 2);
 const y = event && Number.isFinite(event.clientY) ? event.clientY : Math.round(window.innerHeight / 2);
 const width = 230;
 const height = 132;
 menu.style.left = Math.max(8, Math.min(x, window.innerWidth - width - 8)) + 'px';
 menu.style.top = Math.max(8, Math.min(y, window.innerHeight - height - 8)) + 'px';
}
function saveDownloadFilename(saveData){
 const meta = ensureSaveMeta(saveData, saveData.saveId || saveData.G?.saveMeta?.id);
 const d = new Date();
 const pad = (n) => String(n).padStart(2, '0');
 const dateStr = `${d.getFullYear()}_${pad(d.getMonth()+1)}_${pad(d.getDate())}`;
 return `pokeworld_${meta.id}_${dateStr}.json`;
}
function downloadSaveById(id){
 closeSaveCardContextMenu();
 const data = readSlot(id);
 if(!data || !isCompatibleSaveData(data)){ notify(t('no_save_found'), 'var(--red)'); return; }
 ensureSaveMeta(data, id);
 const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = saveDownloadFilename(data);
 document.body.appendChild(a);
 a.click();
 a.remove();
 URL.revokeObjectURL(url);
 notify(t('save_exported'), 'var(--green)');
}
function importOverwriteSaveById(id){
 closeSaveCardContextMenu();
 const input = document.createElement('input');
 input.type = 'file';
 input.accept = '.json,application/json';
 input.className = 'pw-static-010';
 document.body.appendChild(input);
 input.addEventListener('change', () => { const file = input.files && input.files[0]; if(file) overwriteSaveFromFile(id, file); input.remove(); });
 input.click();
}
function overwriteSaveFromFile(id, file){
 const reader = new FileReader();
 reader.onload = (e) => {
  try{
   const parsed = JSON.parse(e.target.result);
   if(!parsed || !parsed.G){ notify(t('save_incompatible_deleted'), 'var(--red)'); return; }
   const existing = readSlot(id);
   const hadName = !!(parsed.G.saveMeta && parsed.G.saveMeta.name);
   const saveData = {version: parsed.version || SAVE_VERSION, timestamp: saveNow(), saveId: id, G: parsed.G};
   if(!isCompatibleSaveData(saveData) || !hasStarterInState(saveData.G)){ notify(t('save_incompatible_deleted'), 'var(--red)'); return; }
   ensureSaveMeta(saveData, id);
   saveData.G.saveMeta.id = id;
   saveData.saveId = id;
   if(!hadName && existing && existing.G && existing.G.saveMeta && existing.G.saveMeta.name) saveData.G.saveMeta.name = existing.G.saveMeta.name;
   saveData.G.saveMeta.updatedAt = saveNow();
   writeSlot(id, saveData, currentSaveId === id);
   upsertSaveIndex(saveData);
   if(currentSaveId === id && window.PokeWorldGameStarted) loadGame(false);
   renderSaveMenu();
   notify(t('save_overwritten'), 'var(--green)');
  }catch(err){
   console.error('[SAVE OVERWRITE ERROR]', err);
   notify(tr('save_import_error', {message:err.message}), 'var(--red)');
  }
 };
 reader.readAsText(file);
}
function deleteSaveById(id){
 closeSaveCardContextMenu();
 // Panneau de confirmation unifié (pwConfirm) — repli window.confirm si absent.
 if(typeof pwConfirm === 'function'){
  pwConfirm(t('save_delete_confirm'), function(){ _deleteSaveByIdConfirmed(id); }, { danger: true, title: '🗑️ ' + (t('delete_save_title') !== 'delete_save_title' ? t('delete_save_title') : ((G && G.lang === 'en') ? 'Delete this save?' : 'Supprimer cette sauvegarde ?')) });
  return;
 }
 if(!window.confirm(t('save_delete_confirm'))) return;
 _deleteSaveByIdConfirmed(id);
}
function _deleteSaveByIdConfirmed(id){
 storageRemove(slotKey(id));
 removeSaveFromIndex(id);
 let rawActive = null;
 try{ rawActive = storageGet(SAVE_KEY); }catch(_){ }
 if(rawActive){
  try{
   const activeData = JSON.parse(rawActive);
   const activeId = activeData.saveId || (activeData.G && activeData.G.saveMeta && activeData.G.saveMeta.id);
   if(activeId === id) storageRemove(SAVE_KEY);
  }catch(_){ storageRemove(SAVE_KEY); }
 }
 const activeKey = storageGet(ACTIVE_SAVE_ID_KEY);
 if(currentSaveId === id || activeKey === id || readSaveIndex().length === 0){
  currentSaveId = null;
  window.currentSaveId = null;
  storageRemove(ACTIVE_SAVE_ID_KEY);
  storageRemove(SAVE_KEY);
  window.PokeWorldGameStarted = false;
 }
 writeSaveIndex(readSaveIndex().filter(entry => entry && readSlot(entry.id)));
 renderSaveMenu();
 notify(t('save_deleted'), 'var(--green)');
}

function renderSaveMenu(){
 const screen = document.getElementById('save-menu-screen'); const listEl = document.getElementById('save-menu-list'); if(!screen || !listEl) return;
 document.body.classList.add('save-menu-active'); document.body.classList.remove('game-started'); screen.classList.add('is-open');
 const title = document.getElementById('save-menu-title'); const subtitle = document.getElementById('save-menu-subtitle'); const newBtn = document.getElementById('save-menu-new-btn'); const importBtn = document.getElementById('save-menu-import-label');
 if(title) title.textContent = t('save_menu_title'); if(subtitle) subtitle.textContent = t('save_menu_subtitle'); if(newBtn) newBtn.textContent = t('save_menu_new'); if(importBtn) importBtn.textContent = t('save_menu_import');
 const saves = getSaveSummaries();
 if(!saves.length){ listEl.innerHTML = `<div class="save-menu-empty"><div class="save-menu-empty-icon">◇</div><h2>${escHtml(t('save_menu_empty_title'))}</h2><p>${escHtml(t('save_menu_empty_desc'))}</p></div>`; updateSaveMenuScrollButtons(); return; }
 listEl.innerHTML = saves.map(save => renderSaveCardMarkup(save, 'menu')).join('');
 setTimeout(updateSaveMenuScrollButtons, 0);
}
function hideSaveMenu(){ const screen = document.getElementById('save-menu-screen'); if(screen) screen.classList.remove('is-open'); document.body.classList.remove('save-menu-active'); document.body.classList.add('game-started'); }
function createFreshGameState(){ let state = null; try{ if(window.PokeWorldState && window.PokeWorldState.createInitialGameState) state = window.PokeWorldState.createInitialGameState(); }catch(_){ } if(!state) state = { location:'pallet', region:'kanto', team:[], inventory:{}, money:2000, badges:[], defeatedChamps:{}, pokedex:{}, stepsLeft:0, starter:false, starterKanto:false, starterJohto:false, regionStarter:{kanto:false,johto:false}, collection:{}, teamSlotItems:[], evolvedSpecies:[], dupeCatches:{}, lang:'en', storyIdx:0, storyProgress:0, unlockedTalents:{}, activeQuests:[], repeatables:[], visitedMaps:{}, completedQuests:{}, wildWinsByLoc:{}, regionLeagueWon:{}, playTimeMs:0, saveMeta:{}, tutorial:{ enabled:true, completed:{}, dismissedTips:{}, rewards:{} } }; const storedLang = storageGet('pokeworld_lang'); if(storedLang) state.lang = storedLang; if(state.playTimeMs == null) state.playTimeMs = 0; return state; }
function assignGlobalState(state){ const target = (typeof G !== 'undefined' && G && typeof G === 'object') ? G : {}; for(const key of Object.keys(target)) delete target[key]; Object.assign(target, state || {}); G = target; if(typeof window !== 'undefined'){ window.G = target; if(window.PokeWorldState) window.PokeWorldState.gameState = target; } if(typeof globalThis !== 'undefined') globalThis.G = target; }
function resetRuntimeBattleState(){ try{ const fresh = window.PokeWorldBattleState && window.PokeWorldBattleState.createInitialBattleState ? window.PokeWorldBattleState.createInitialBattleState() : null; if(fresh && typeof battle !== 'undefined' && battle){ for(const key of Object.keys(battle)) delete battle[key]; Object.assign(battle, fresh); window.battle = battle; } }catch(_){ } }
function createNewSaveFromMenu(){
 const index = readSaveIndex(); const id = uniqueSaveId(); const state = createFreshGameState();
 state.saveMeta = { id, name: defaultSaveName(index.length + 1), background: SAVE_CARD_BACKGROUNDS[index.length % SAVE_CARD_BACKGROUNDS.length], createdAt: saveNow(), updatedAt: saveNow(), playTimeMs: 0, iconPokeId: 0, pendingStarter: true };
 state.playTimeMs = 0; currentSaveId = id; assignGlobalState(state); normalizeLoadedState(); activateCurrentSave(false); notify(t('save_choose_starter_first'), 'var(--accent)');
}
function activateCurrentSave(manual){ if(!currentSaveId && G && G.saveMeta && G.saveMeta.id) currentSaveId = G.saveMeta.id; if(currentSaveId && hasStarterInState(G)) storageSet(ACTIVE_SAVE_ID_KEY, currentSaveId); window.currentSaveId = currentSaveId; resetRuntimeBattleState(); saveSessionStartedAt = saveNow(); hideSaveMenu(); if(typeof initializeGameInterface === 'function') initializeGameInterface(); else if(typeof renderMap === 'function') { renderMap(); updateHeader(); showTab('info'); } if(typeof scheduleAfkCatchup === 'function') scheduleAfkCatchup('load'); if(manual) notify(t('game_loaded'), 'var(--green)'); }
function startSaveById(id){ const data = readSlot(id); if(!data || !isCompatibleSaveData(data) || !hasStarterInState(data.G)){ notify(t('save_incompatible_deleted') || t('no_save_found'), 'var(--red)'); storageRemove(slotKey(id)); removeSaveFromIndex(id); renderSaveMenu(); return false; } currentSaveId = id; storageSet(ACTIVE_SAVE_ID_KEY, id); return loadGame(true); }
function updatePlayTimeBeforeSave(){ if(!G) return; if(!G.saveMeta || typeof G.saveMeta !== 'object') G.saveMeta = {}; const now = saveNow(); if(saveSessionStartedAt && window.PokeWorldGameStarted){ const delta = Math.max(0, now - saveSessionStartedAt); if(delta < 24 * 60 * 60 * 1000) G.playTimeMs = Math.max(0, Number(G.playTimeMs || 0)) + delta; saveSessionStartedAt = now; } if(G.playTimeMs == null) G.playTimeMs = 0; G.saveMeta.playTimeMs = Math.max(0, Number(G.playTimeMs || 0)); G.saveMeta.updatedAt = now; }
function saveGame(manual = false) { try { if(typeof afkApplying !== 'undefined' && afkApplying) return false; // passe 28 : pas d'écriture pendant un fast-forward
 if(!currentSaveId && G && G.saveMeta && G.saveMeta.id) currentSaveId = G.saveMeta.id; if(!currentSaveId){ if(manual) notify(t('no_save_found'), 'var(--light1)'); return false; } if(!hasStarterInState(G)){ if(manual) notify(t('save_need_starter'), 'var(--red)'); return false; } if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems(); ensureDefaultSaveIcon(); stripMoveMetaFromState(G); try{ G.wildSessionActive = (typeof isWildChillChainActive === 'function') ? !!isWildChillChainActive() : false; }catch(_){ } /* passe 30 : mémorise si le joueur était en pleine exploration sauvage — le rattrapage hors-ligne ne rejoue que ça */ if(!afkApplying && typeof markAfkSeen === 'function') markAfkSeen(false); updatePlayTimeBeforeSave(); G.saveMeta.pendingStarter = false; const saveData = { version:SAVE_VERSION, timestamp:saveNow(), saveId:currentSaveId, G:JSON.parse(JSON.stringify(G)) }; ensureSaveMeta(saveData, currentSaveId); const json = JSON.stringify(saveData); if (json.length > 5 * 1024 * 1024) { console.error('[SAVE] Save too large:', json.length, 'bytes'); if (manual) notify(t('save_error_too_large'), 'var(--red)'); return false; } writeSlot(currentSaveId, saveData, true); storageSet(ACTIVE_SAVE_ID_KEY, currentSaveId); upsertSaveIndex(saveData); if (manual) notify(t('legacy_message_n_partie_sauvegard_e')); const settingsModal = document.getElementById('settings-modal'); const editingProfile = document.activeElement && document.activeElement.closest ? document.activeElement.closest('#save-profile-section') : null; if(settingsModal && settingsModal.classList.contains('open') && !editingProfile) updateSaveProfileControls(); return true; } catch (e) { console.error('[SAVE ERROR]', e); if (manual) notify(tr('save_error_message', {message:e.message}), 'var(--red)'); return false; } }
function loadGame(manual = false) { try { const id = currentSaveId || storageGet(ACTIVE_SAVE_ID_KEY); let saveData = id ? readSlot(id) : null; if(!saveData){ const raw = storageGet(SAVE_KEY); saveData = raw ? JSON.parse(raw) : null; } if (!saveData) { if (manual) notify(t('no_save_found'), 'var(--light1)'); return false; } if (!isCompatibleSaveData(saveData) || !hasStarterInState(saveData.G)) { deleteIncompatibleSave('version=' + (saveData && saveData.version)); if (manual) notify(t('save_incompatible_deleted'), 'var(--red)'); return false; } const loadedId = id || saveData.saveId || saveData.G?.saveMeta?.id || uniqueSaveId(); currentSaveId = loadedId; ensureSaveMeta(saveData, loadedId); assignGlobalState(saveData.G); normalizeLoadedState(); const freshData = {version:SAVE_VERSION, timestamp:saveNow(), saveId:currentSaveId, G:JSON.parse(JSON.stringify(G))}; writeSlot(currentSaveId, freshData, true); upsertSaveIndex(freshData); activateCurrentSave(manual); return true; } catch (e) { console.error('[LOAD ERROR]', e); if (manual) notify(tr('load_error_message', {message:e.message}), 'var(--red)'); return false; } }
function deleteIncompatibleSave(reason) { try { if(currentSaveId){ storageRemove(slotKey(currentSaveId)); removeSaveFromIndex(currentSaveId); } storageRemove(SAVE_KEY); console.warn('[SAVE] Incompatible browser save removed automatically:', reason || 'unknown reason'); return true; } catch (e) { console.error('[SAVE] Unable to remove incompatible save:', e); return false; } }
function autoSave() { try { if(currentSaveId && window.PokeWorldGameStarted) saveGame(false); } catch (e) { console.error('[AUTOSAVE ERROR]', e); } }
function exportActiveMultiSave(){ try { if(currentSaveId) saveGame(false); const raw = currentSaveId ? storageGet(slotKey(currentSaveId)) : null; if (!raw) { notify(t('no_save_to_export'), 'var(--red)'); return; } const data = JSON.parse(raw); const meta = ensureSaveMeta(data, currentSaveId); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = saveDownloadFilename(data); document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); notify(t('save_exported'), 'var(--green)'); } catch (e) { console.error('[EXPORT ERROR]', e); notify(t('save_export_error'), 'var(--red)'); } }
function exportSave(){ exportActiveMultiSave(); }
function normalizeImportedSave(parsed){ if(!parsed || !parsed.G) return null; const saveData = {version: parsed.version || SAVE_VERSION, timestamp: saveNow(), saveId: parsed.saveId || parsed.G?.saveMeta?.id, G: parsed.G}; if(!isCompatibleSaveData(saveData) || !hasStarterInState(saveData.G)) return null; const id = uniqueSaveId(saveData.saveId || saveData.G?.saveMeta?.id); ensureSaveMeta(saveData, id); saveData.G.saveMeta.id = id; saveData.saveId = id; if(!saveData.G.saveMeta.name) saveData.G.saveMeta.name = importedSaveName(); saveData.G.saveMeta.updatedAt = saveNow(); saveData.G.saveMeta.createdAt = saveData.G.saveMeta.createdAt || saveNow(); return saveData; }
function importMultiSave(eventOrFile){ const file = eventOrFile && eventOrFile.target ? eventOrFile.target.files && eventOrFile.target.files[0] : eventOrFile; if(!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const imported = normalizeImportedSave(JSON.parse(e.target.result)); if(!imported){ notify(t('save_incompatible_deleted'), 'var(--red)'); return; } writeSlot(imported.saveId, imported, false); upsertSaveIndex(imported); const menuOpen = document.body.classList.contains('save-menu-active') || !window.PokeWorldGameStarted; if(menuOpen){ renderSaveMenu(); notify(t('save_imported_library'), 'var(--green)'); } else { currentSaveId = imported.saveId; storageSet(ACTIVE_SAVE_ID_KEY, currentSaveId); loadGame(true); if(typeof closeSettings === 'function') closeSettings(); notify(t('save_imported_library'), 'var(--green)'); } } catch (err) { console.error('[IMPORT ERROR]', err); notify(tr('save_import_error', {message:err.message}), 'var(--red)'); } finally { if(eventOrFile && eventOrFile.target) eventOrFile.target.value = ''; } }; reader.readAsText(file); }
function importSave(event){ importMultiSave(event); }

// ─── Passe 28 : l'AFK/timeskip est délégué à l'OfflineEngine (offline-engine.js).
// L'ancien estimateur parallèle et ses plafonds cachés (720 victoires / 120 ticks /
// 500 pas) ont été SUPPRIMÉS — le fast-forward rejoue le vrai moteur de combat.
// Ici ne restent que les points d'ancrage utilisés par ce fichier.
let afkApplying = false; // saveGame saute le marquage ET l'écriture pendant un fast-forward
function afkStorageKey(){ return currentSaveId ? ('pokeworld_afk_last_' + currentSaveId) : 'pokeworld_afk_last'; }
function countAfkTeamKo(){ return (G && Array.isArray(G.team)) ? G.team.filter(p => p && p.currentHP <= 0).length : 0; }
function markAfkSeen(force){
 const now = saveNow();
 if(typeof offlinePersistSeen === 'function'){ offlinePersistSeen(now); return; }
 if(!G.afk || typeof G.afk !== 'object') G.afk = {};
 G.afk.lastSeenAt = now;
 try{ storageSet(afkStorageKey(), JSON.stringify({ts: now})); }catch(_){ }
}
function scheduleAfkCatchup(reason){ if(typeof offlineScheduleCatchup === 'function') offlineScheduleCatchup(reason || 'load'); }

function deleteSave() { try { const id = currentSaveId; if(id){ storageRemove(slotKey(id)); removeSaveFromIndex(id); } storageRemove(SAVE_KEY); storageRemove(ACTIVE_SAVE_ID_KEY); currentSaveId = null; window.currentSaveId = null; window.PokeWorldGameStarted = false; notify(t('save_deleted'), 'var(--green)'); setTimeout(() => { if(typeof closeSettings === 'function') closeSettings(); renderSaveMenu(); }, 400); } catch (e) { console.error('[DELETE ERROR]', e); notify(t('save_delete_error'), 'var(--red)'); } }
appTimer('autosave', () => { autoSave(); }, 30000);
if(typeof window !== 'undefined' && !window._pokeWorldSaveBeforeUnload){ window._pokeWorldSaveBeforeUnload = true; window.addEventListener('beforeunload', () => { autoSave(); }); }
function confirmDelete() { const deleteRow = document.getElementById('delete-row'); const confirmRow = document.getElementById('delete-confirm-row'); if (deleteRow) deleteRow.style.display = 'none'; if (confirmRow) confirmRow.style.display = 'flex'; }
function cancelDelete() { const deleteRow = document.getElementById('delete-row'); const confirmRow = document.getElementById('delete-confirm-row'); if (deleteRow) deleteRow.style.display = 'flex'; if (confirmRow) confirmRow.style.display = 'none'; }
function doDelete() { deleteSave(); }
function resetGame() { confirmDelete(); }
function getBoxIconOptions(){
 // Icône de sauvegarde : tous les Pokémon POSSÉDÉS sont éligibles — équipe
 // active, boîte PC, pension et entraînement (pas besoin de retirer son
 // favori de l'équipe pour l'utiliser comme icône).
 const out = [];
 const push = (key, p) => {
  const id = Number(p && p.id);
  if(id > 0) out.push({key:String(key).replace(/\\/g,'\\\\').replace(/'/g,"\\'"), id, name:p.name || getPokeName(id), level:p.level || 1, shiny:!!p.shiny});
 };
 (G?.team || []).forEach((p, i) => { if(p) push('team' + i, p); });
 for(const key of Object.keys(G?.collection || {})) push(key, G.collection[key]);
 (G?.hatchery || []).forEach((s, i) => { if(s && s.poke) push('h' + i, s.poke); });
 (G?.trainingSlots || []).forEach((s, i) => {
  if(s && s.uid && typeof findPokemonByTrainingSlot === 'function'){
   const p = findPokemonByTrainingSlot(s);
   if(p && !out.some(o => o.id === Number(p.id) && o.level === (p.level || 1) && o.name === (p.name || getPokeName(p.id)))) push('t' + i, p);
  }
 });
 out.sort((a,b) => a.name.localeCompare(b.name) || a.level - b.level);
 return out;
}
function getSelectedSaveProfileIcon(meta){
 const pending = Number(pendingSaveProfileIconId || 0);
 if(pending > 0) return pending;
 return Number(meta && meta.iconPokeId ? meta.iconPokeId : inferSaveIconId(G));
}
function getPreviewStateFromControls(){
 const meta = G && G.saveMeta ? G.saveMeta : {};
 const nameEl = document.getElementById('save-profile-name');
 const bgEl = document.getElementById('save-profile-background');
 return { id: meta.id || 'PW-NEW', name: (nameEl && nameEl.value.trim()) || meta.name || defaultSaveName(1), background: normalizeBackground(bgEl ? bgEl.value : meta.background), iconPokeId: getSelectedSaveProfileIcon(meta), badges: Array.isArray(G?.badges) ? G.badges.length : 0, caught: Object.values(G?.pokedex || {}).filter(entry => entry && entry.caught).length, playMs: Number(G?.playTimeMs || meta.playTimeMs || 0) };
}
function renderSaveProfilePreviewFromControls(){ const target = document.getElementById('save-profile-preview'); if(target) target.innerHTML = renderSaveCardMarkup(getPreviewStateFromControls(), 'preview'); renderSaveProfileCurrentIcon(); }
function renderSaveProfileCurrentIcon(){ const target = document.getElementById('save-profile-icon-current'); if(!target) return; const id = getSelectedSaveProfileIcon(G && G.saveMeta ? G.saveMeta : {}); const opt = getBoxIconOptions().find(o => o.id === id); const name = id ? (opt ? opt.name : getPokeName(id)) : t('save_icon_no_box'); target.innerHTML = `<span class="save-slot-icon">${renderSaveIcon(id, 54)}</span><span class="save-profile-icon-current-label"><span>${escHtml(name)}</span><small>${id ? '#' + id : escHtml(t('save_icon_no_box'))}</small></span>`; }
function openSaveIconBoxSelector(){ if(typeof openUnifiedSelectorModal === 'function') openUnifiedSelectorModal('save_icon'); }
function renderSaveIconGrid(){
 const grid = document.getElementById('save-profile-icon-grid');
 if(!grid) return;
 const options = getBoxIconOptions();
 const selected = getSelectedSaveProfileIcon(G && G.saveMeta ? G.saveMeta : {});
 if(!options.length){ grid.innerHTML = `<div class="save-icon-empty">${escHtml(t('save_icon_no_box'))}</div>`; return; }
 grid.innerHTML = options.map(opt => `<button class="save-icon-choice ${selected===opt.id?'active':''}" data-action="legacy-call" data-call="selectSaveProfileIcon" data-call-args="'${opt.key}',${opt.id}"><span class="save-icon-sprite">${renderSaveIcon(opt.id, 54)}</span><span class="save-icon-name">${escHtml(opt.name)}</span><small>#${opt.id} · ${escHtml(t('lvl_lbl'))}${opt.level}${opt.shiny?' ★':''}</small></button>`).join('');
}
function selectSaveProfileIcon(boxKey, pokeId){
 // boxKey peut désigner la boîte, l'équipe (teamN), la pension (hN) ou
 // l'entraînement (tN) — l'id d'espèce transmis fait foi.
 const p = G && G.collection ? G.collection[boxKey] : null;
 const id = Number(p && p.id ? p.id : pokeId);
 if(id <= 0) return;
 pendingSaveProfileIconId = id;
 renderSaveProfileCurrentIcon();
 renderSaveProfilePreviewFromControls();
}
function updateSaveProfileControls(){
 const section = document.getElementById('save-profile-section'); if(!section) return;
 const meta = G && G.saveMeta ? G.saveMeta : null; section.classList.toggle('is-disabled', !meta);
 pendingSaveProfileIconId = meta ? Number(meta.iconPokeId || inferSaveIconId(G) || 0) : null;
 const labels = [['save-profile-heading','save_profile_title'],['save-profile-name-label','save_profile_name'],['save-profile-background-label','save_profile_background'],['save-profile-icon-label','save_profile_icon'],['save-profile-apply-btn','save_profile_apply']];
 for(const pair of labels){ const el = document.getElementById(pair[0]); if(el) el.textContent = t(pair[1]); }
 const nameInput = document.getElementById('save-profile-name'); if(nameInput){ nameInput.placeholder = t('save_profile_name_placeholder'); nameInput.value = meta ? (meta.name || '') : ''; nameInput.oninput = renderSaveProfilePreviewFromControls; }
 const bgSelect = document.getElementById('save-profile-background'); if(bgSelect){ bgSelect.innerHTML = SAVE_CARD_BACKGROUNDS.map(bg => `<option value="${bg}">${escHtml(saveBackgroundLabel(bg))}</option>`).join(''); bgSelect.value = meta ? normalizeBackground(meta.background) : 'classic'; bgSelect.onchange = renderSaveProfilePreviewFromControls; }
 const iconBtn = document.getElementById('save-profile-icon-btn'); if(iconBtn) iconBtn.textContent = t('save_profile_choose_icon');
 renderSaveProfileCurrentIcon();
 renderSaveProfilePreviewFromControls();
}
function applySaveProfileSettings(){
 if(!G || !G.saveMeta) return;
 const nameInput = document.getElementById('save-profile-name');
 const bgSelect = document.getElementById('save-profile-background');
 const name = nameInput ? nameInput.value.trim() : '';
 G.saveMeta.name = name || defaultSaveName(readSaveIndex().length || 1);
 if(bgSelect) G.saveMeta.background = normalizeBackground(bgSelect.value);
 if(Number(pendingSaveProfileIconId || 0) > 0) G.saveMeta.iconPokeId = Number(pendingSaveProfileIconId);
 saveGame(false);
 updateSaveProfileControls();
 notify(t('save_profile_updated'), 'var(--green)');
}
function getCurrentSaveId(){ return currentSaveId; }
function debugGiveCtCs() {
  if(!G) return;
  if(!G.inventory) G.inventory = {};
  // Liste calculée depuis les données réelles : plus de clés en dur
  // (certaines étaient périmées, ex. ct_toxic au lieu de ct06_toxic, et les
  // CS cs01_cut / cs02_fly manquaient). Robuste aux futurs ajouts/renommages.
  let list = [];
  if(typeof ITEMS !== 'undefined' && ITEMS){
    list = Object.keys(ITEMS).filter((k) =>
      (typeof isCtCsItem === 'function') ? isCtCsItem(k) : /^(ct|cs)/.test(k)
    );
  }
  for(const k of list) {
    G.inventory[k] = (G.inventory[k] || 0) + 1;
  }
  saveGame(false);
  updateHeader();
  notify(typeof t==='function'?t('debug_ct_added'):'Debug: +1 of each TM/CS added to Bag!', 'var(--green)');
  if(document.getElementById('fullscreen-panel-modal')?.style.display === 'flex' && typeof renderInventory === 'function') {
    renderInventory(document.getElementById('fs-panel-content'));
  }
}

if (typeof debugGiveCtCs !== 'undefined' && typeof window !== 'undefined') window.debugGiveCtCs = debugGiveCtCs;
if (typeof isCompatibleSaveData !== 'undefined' && typeof window !== 'undefined') window.isCompatibleSaveData = isCompatibleSaveData;
if (typeof deleteIncompatibleSave !== 'undefined' && typeof window !== 'undefined') window.deleteIncompatibleSave = deleteIncompatibleSave;
if (typeof saveGame !== 'undefined' && typeof window !== 'undefined') window.saveGame = saveGame;

function migratePokemonData() {
  if (!G) return;
  var moveData = (typeof MOVES !== 'undefined') ? MOVES : (globalThis.MOVES || {});
  var changed = false;
  
  // Migrate team Pokemon
  if (G.team && Array.isArray(G.team)) {
    for (var i = 0; i < G.team.length; i++) {
      var p = G.team[i];
      if (p) changed = migrateSinglePokemon(p, moveData) || changed;
    }
  }
  
  // Migrate collection (PC Box) Pokemon
  if (G.collection) {
    for (var key in G.collection) {
      var p = G.collection[key];
      if (p) changed = migrateSinglePokemon(p, moveData) || changed;
    }
  }
  
  // Migrate hatchery
  if (G.hatchery && Array.isArray(G.hatchery)) {
    for (var i = 0; i < G.hatchery.length; i++) {
      var slot = G.hatchery[i];
      if (slot && slot.poke) changed = migrateSinglePokemon(slot.poke, moveData) || changed;
    }
  }
  
  // Migrate training
  if (G.trainingSlots && Array.isArray(G.trainingSlots)) {
    for (var i = 0; i < G.trainingSlots.length; i++) {
      var slot = G.trainingSlots[i];
      if (slot && slot.poke) changed = migrateSinglePokemon(slot.poke, moveData) || changed;
    }
  }
  
  if (changed) {
    try { if (typeof saveGame === 'function') saveGame(false); } catch(_) {}
  }
 if (typeof window !== 'undefined' && typeof window.refreshLearnableMovesPanelIfOpen === 'function') window.refreshLearnableMovesPanelIfOpen();
}

function migrateSinglePokemon(p, moveData) {
  if (!p || !p.id) return false;
  var changed = false;
  var nid = Number(p.id);
  var level = p.level || 1;
  
  // 1. Ensure at least 1 valid move
  if (!p.moves || !p.moves.length || p.moves.length === 0) {
    if (typeof getMovesForLevel === 'function') {
      p.moves = getMovesForLevel(nid, level);
      changed = true;
    } else {
      p.moves = [{id:'tackle'}];
      changed = true;
    }
  }
  
  // 1b. Normalize move entries: convert legacy string format to {id} objects
  var hadLegacyString = false;
  var beforeNormCount = p.moves.length;
  p.moves = p.moves.map(function(mm){
    if (typeof mm === 'string') { hadLegacyString = true; return { id: mm }; }
    return mm;
  }).filter(function(mm){ return !!mm; });
  if (hadLegacyString || p.moves.length !== beforeNormCount) changed = true;

  // 2. NORMALIZE MOVE IDs: convert old camelCase to new snake_case
  for (var mi2 = 0; mi2 < p.moves.length; mi2++) {
    var mm = p.moves[mi2];
    if (!mm || !mm.id) continue;
    if (!(moveData[mm.id] && moveData[mm.id].power !== undefined)) {
      var snaked = mm.id.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
      if (moveData[snaked] && moveData[snaked].power !== undefined) {
        mm.id = snaked;
        changed = true;
      }
    }
  }

  // 3. FULL MOVE REFRESH: validate all moves, remove corrupted ones, refill from species pool
  var speciesPool = [];
  var speciesFullPool = [];
  if (typeof getSpeciesMovePool === 'function') speciesPool = getSpeciesMovePool(nid);
  if (typeof getSpeciesFullLearnablePool === 'function') speciesFullPool = getSpeciesFullLearnablePool(nid);
  var poolSet = {};
  for (var psi = 0; psi < speciesPool.length; psi++) poolSet[speciesPool[psi]] = true;

  // 3a. Keep only valid moves that exist in MOVES
  var validMoves = [];
  var removedCount = 0;
  for (var mi = 0; mi < p.moves.length; mi++) {
    var m = p.moves[mi];
    if (m && m.id && moveData[m.id] && moveData[m.id].power !== undefined) {
      validMoves.push(m);
    } else {
      removedCount++;
    }
  }
  if (removedCount > 0) { changed = true; }

  // 3b. CT/CS moveId set : une attaque associée à un disque du jeu est légitime
  //     (impossible de tracer les CT déjà apprises et consommées).
  var ctMoveSet = {};
  if (typeof window !== 'undefined' && window.ITEMS) {
    for (var ctKey in window.ITEMS) {
      var ctItm = window.ITEMS[ctKey];
      if (ctItm && (ctItm.type === 'ct' || ctItm.type === 'cs') && ctItm.moveId) {
        ctMoveSet[ctItm.moveId] = true;
      }
    }
  }

  // 3c. ATTAQUES EN TROP : retirer toute attaque que l'espèce ne peut pas
  //     légalement avoir (pool niveau + entraînement = fullPool, ou CT/CS).
  if (speciesFullPool.length > 0) {
    var speciesValid = [];
    for (var mi = 0; mi < validMoves.length; mi++) {
      var mvId = validMoves[mi].id;
      if (speciesFullPool.indexOf(mvId) >= 0 || ctMoveSet[mvId]) {
        speciesValid.push(validMoves[mi]);
      } else {
        changed = true;
      }
    }
    validMoves = speciesValid;
  }

  // 3d. Dédoublonner (conserver la première occurrence)
  var seenMoves = {};
  validMoves = validMoves.filter(function(mv) {
    if (seenMoves[mv.id]) { changed = true; return false; }
    seenMoves[mv.id] = true;
    return true;
  });

  // 3e. ATTAQUES MANQUANTES : compléter avec les attaques que le Pokémon
  //     aurait dû apprendre par niveau (dans la limite des 4 slots).
  if (typeof getMovesForLevel === 'function') {
    var expectedMoves = getMovesForLevel(nid, level) || [];
    for (var ei = 0; ei < expectedMoves.length && validMoves.length < 4; ei++) {
      var expId = expectedMoves[ei] && expectedMoves[ei].id;
      if (expId && moveData[expId] && moveData[expId].power !== undefined && !seenMoves[expId]) {
        validMoves.push({ id: expId });
        seenMoves[expId] = true;
        changed = true;
      }
    }
  }

  // 3g. ATTAQUES APPRISES (liste "learnable moves" persistante des anciennes
  //     saves : p.movepool chez PokeChill) : mêmes règles que pour les
  //     attaques courantes — retirer les attaques en trop / corrompues,
  //     dédoublonner, puis compléter avec TOUTES les attaques de niveau déjà
  //     accessibles à SON niveau (pas seulement le top-4 des slots courants).
  var missingLevelIds = [];
  for (var ml = 0; ml < speciesPool.length; ml++) {
    var mlId = speciesPool[ml];
    if (!mlId || !(moveData[mlId] && moveData[mlId].power !== undefined)) continue;
    if (seenMoves[mlId]) continue; // déjà équipée dans les 4 slots courants
    if (typeof getMoveLearnLevel === 'function' && getMoveLearnLevel(nid, mlId) > level) continue; // pas encore au niveau
    missingLevelIds.push(mlId);
  }
  var learnedKey = Array.isArray(p.movepool) ? 'movepool' : (Array.isArray(p.learnableMoves) ? 'learnableMoves' : null);
  if (learnedKey) {
    var seenLearned = {};
    var cleanLearned = [];
    var rawLearned = p[learnedKey];
    for (var li = 0; li < rawLearned.length; li++) {
      var lid = (typeof rawLearned[li] === 'string') ? rawLearned[li] : (rawLearned[li] && rawLearned[li].id);
      if (!lid) { changed = true; continue; }
      if (!(moveData[lid] && moveData[lid].power !== undefined)) {
        var lidSnake = String(lid).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
        if (moveData[lidSnake] && moveData[lidSnake].power !== undefined) { lid = lidSnake; changed = true; }
        else { changed = true; continue; } // attaque inconnue de MOVES
      }
      // attaque en trop : hors pool légal de l'espèce ET hors CT/CS
      if (speciesFullPool.length > 0 && speciesFullPool.indexOf(lid) < 0 && !ctMoveSet[lid]) { changed = true; continue; }
      if (seenLearned[lid]) { changed = true; continue; } // doublon
      seenLearned[lid] = true;
      cleanLearned.push(lid);
    }
    p[learnedKey] = cleanLearned;
    // attaques de niveau manquantes -> pool appris
    for (var li2 = 0; li2 < missingLevelIds.length; li2++) {
      var expId2 = missingLevelIds[li2];
      if (seenLearned[expId2]) continue;
      cleanLearned.push(expId2);
      seenLearned[expId2] = true;
      changed = true;
    }
  } else if (missingLevelIds.length) {
    // Pas de liste persistante : créer p.movepool avec les attaques de niveau
    // qui n'ont pas tenu dans les 4 slots courants.
    p.movepool = missingLevelIds.slice();
    changed = true;
  }

  // 3f. Final safety: ensure at least 1 move
  if (!validMoves || validMoves.length === 0) {
    if (speciesPool.length > 0) {
      validMoves = [{ id: speciesPool[0] }];
    } else {
      validMoves = [{ id: 'tackle' }];
    }
    changed = true;
  }

  p.moves = validMoves;
  
  // 4. Ensure at least 1 valid talent from POKE_TALENTS
  var tals = (typeof getSpeciesTalents === 'function') ? getSpeciesTalents(nid) : [];
  if (tals && tals.length > 0) {
    // Passe 24 : les ids sont normalisés en minuscules — une vieille save au
    // talent camelCase est d'abord RÉPARÉE en place (même talent, casse
    // canonique) plutôt que remplacée par le premier talent du pool.
    if (p.talent) {
      var lowTal = String(p.talent).toLowerCase();
      var match = tals.find(function(x){ return x === p.talent; }) || tals.find(function(x){ return String(x).toLowerCase() === lowTal; });
      if (match && match !== p.talent) { p.talent = match; changed = true; }
    }
    // Check if current talent is in the valid list
    if (!p.talent || !tals.includes(p.talent)) {
      var recOf = (typeof getTalentRecord === 'function') ? getTalentRecord : function(x){ return (typeof TALENTS_FULL !== 'undefined') ? TALENTS_FULL[x] : null; };
      var filtered = tals.filter(function(t) {
        return !!recOf(t);
      });
      if (filtered.length > 0) {
        p.talent = filtered[0];
        changed = true;
      } else if (tals.length > 0) {
        p.talent = tals[0];
        changed = true;
      }
    }
  }
  // Passe 24 : normalise aussi le registre des talents débloqués de l'espèce
  // (ids camelCase des anciennes sauvegardes → casse canonique du pool quand
  // identifiable, sinon minuscules résolubles dans TALENTS_FULL).
  if (typeof G !== 'undefined' && G && G.unlockedTalents && Array.isArray(G.unlockedTalents[nid])) {
    var _canon = function(x){
      var low = String(x).toLowerCase();
      var inPool = tals.find(function(y){ return String(y).toLowerCase() === low; });
      if (inPool) return inPool;
      return (typeof TALENTS_FULL !== 'undefined' && TALENTS_FULL[low]) ? low : x;
    };
    var _before = G.unlockedTalents[nid].join(',');
    G.unlockedTalents[nid] = G.unlockedTalents[nid].map(_canon).filter(function(v, i, arr){ return arr.indexOf(v) === i; });
    if (G.unlockedTalents[nid].join(',') !== _before) changed = true;
  }
  
  // 5. Ensure unlockedTalents for this species has at least the current talent
  if (!G.unlockedTalents) G.unlockedTalents = {};
  if (!G.unlockedTalents[nid]) {
    G.unlockedTalents[nid] = [p.talent || 'sturdy'];
    changed = true;
  } else if (p.talent && !G.unlockedTalents[nid].includes(p.talent)) {
    G.unlockedTalents[nid].push(p.talent);
    changed = true;
  }
  
  return changed;
}

if (typeof migratePokemonData !== 'undefined' && typeof window !== 'undefined') window.migratePokemonData = migratePokemonData;
if (typeof migrateSinglePokemon !== 'undefined' && typeof window !== 'undefined') window.migrateSinglePokemon = migrateSinglePokemon;

if (typeof repairMissingBoxPokemon !== 'undefined' && typeof window !== 'undefined') window.repairMissingBoxPokemon = repairMissingBoxPokemon;
if (typeof loadGame !== 'undefined' && typeof window !== 'undefined') window.loadGame = loadGame;
if (typeof autoSave !== 'undefined' && typeof window !== 'undefined') window.autoSave = autoSave;
if (typeof exportSave !== 'undefined' && typeof window !== 'undefined') window.exportSave = exportSave;
if (typeof importSave !== 'undefined' && typeof window !== 'undefined') window.importSave = importSave;
if (typeof deleteSave !== 'undefined' && typeof window !== 'undefined') window.deleteSave = deleteSave;
if (typeof confirmDelete !== 'undefined' && typeof window !== 'undefined') window.confirmDelete = confirmDelete;
if (typeof cancelDelete !== 'undefined' && typeof window !== 'undefined') window.cancelDelete = cancelDelete;
if (typeof doDelete !== 'undefined' && typeof window !== 'undefined') window.doDelete = doDelete;
if (typeof resetGame !== 'undefined' && typeof window !== 'undefined') window.resetGame = resetGame;
if (typeof renderSaveMenu !== 'undefined' && typeof window !== 'undefined') window.renderSaveMenu = renderSaveMenu;
if (typeof createNewSaveFromMenu !== 'undefined' && typeof window !== 'undefined') window.createNewSaveFromMenu = createNewSaveFromMenu;
if (typeof startSaveById !== 'undefined' && typeof window !== 'undefined') window.startSaveById = startSaveById;
if (typeof importMultiSave !== 'undefined' && typeof window !== 'undefined') window.importMultiSave = importMultiSave;
if (typeof exportActiveMultiSave !== 'undefined' && typeof window !== 'undefined') window.exportActiveMultiSave = exportActiveMultiSave;
if (typeof updateSaveProfileControls !== 'undefined' && typeof window !== 'undefined') window.updateSaveProfileControls = updateSaveProfileControls;
if (typeof renderSaveProfilePreviewFromControls !== 'undefined' && typeof window !== 'undefined') window.renderSaveProfilePreviewFromControls = renderSaveProfilePreviewFromControls;
if (typeof applySaveProfileSettings !== 'undefined' && typeof window !== 'undefined') window.applySaveProfileSettings = applySaveProfileSettings;
if (typeof scrollSaveList !== 'undefined' && typeof window !== 'undefined') window.scrollSaveList = scrollSaveList;
if (typeof openSaveCardContextMenu !== 'undefined' && typeof window !== 'undefined') window.openSaveCardContextMenu = openSaveCardContextMenu;
if (typeof closeSaveCardContextMenu !== 'undefined' && typeof window !== 'undefined') window.closeSaveCardContextMenu = closeSaveCardContextMenu;
if (typeof downloadSaveById !== 'undefined' && typeof window !== 'undefined') window.downloadSaveById = downloadSaveById;
if (typeof importOverwriteSaveById !== 'undefined' && typeof window !== 'undefined') window.importOverwriteSaveById = importOverwriteSaveById;
if (typeof deleteSaveById !== 'undefined' && typeof window !== 'undefined') window.deleteSaveById = deleteSaveById;
if (typeof selectSaveProfileIcon !== 'undefined' && typeof window !== 'undefined') window.selectSaveProfileIcon = selectSaveProfileIcon;
if (typeof openSaveIconBoxSelector !== 'undefined' && typeof window !== 'undefined') window.openSaveIconBoxSelector = openSaveIconBoxSelector;
if (typeof getCurrentSaveId !== 'undefined' && typeof window !== 'undefined') window.getCurrentSaveId = getCurrentSaveId;
if (typeof formatPlayTime !== 'undefined' && typeof window !== 'undefined') window.formatPlayTime = formatPlayTime;

