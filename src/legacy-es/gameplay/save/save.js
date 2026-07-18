const SAVE_KEY = 'pokeworld_save';
const SAVE_LIBRARY_KEY = 'pokeworld_saves_v1';
const ACTIVE_SAVE_ID_KEY = 'pokeworld_active_save_id';
const SAVE_SLOT_PREFIX = 'pokeworld_save_slot_';
const SAVE_VERSION = 3;
const SAVE_CARD_BACKGROUNDS = ['classic', 'goldsilver', 'emerald', 'diamondpearl', 'blackwhite', 'xy', 'forest'];
const SAVE_BACKGROUND_ALIASES = { blue:'classic', red:'classic', green:'emerald', purple:'xy', gold:'goldsilver', silver:'goldsilver' };
let currentSaveId = null;
let saveSessionStartedAt = 0;
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
 if(!G.team) G.team = [];
 if(!G.inventory) G.inventory = {};
 if(!G.pokedex) G.pokedex = {};
 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.mainStep) G.mainStep = { kanto: 0, johto: 0 };
 if(!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
 if(!Array.isArray(G.teamSlotItems)) G.teamSlotItems = [];
 if(!G.evolvedSpecies) G.evolvedSpecies = [];
 if(!G.dupeCatches) G.dupeCatches = {};
 if(!G.teamPresets) G.teamPresets = { preset1:{name:t('preset_adventure'),uids:[]}, preset2:{name:t('preset_boss'),uids:[]}, preset3:{name:t('preset_training'),uids:[]} };
 if(!G.activePresetId) G.activePresetId = 'preset1';
 if(G.playTimeMs == null) G.playTimeMs = 0;
 if(!G.saveMeta || typeof G.saveMeta !== 'object') G.saveMeta = {};
 G.saveMeta.background = normalizeBackground(G.saveMeta.background);
 ensureDefaultSaveIcon();
 for(const p of (G.team || [])){ if(!p.moves) p.moves = []; for(const m of p.moves){ if(m.maxPP === undefined) m.maxPP = MOVES[m.id]?.pp || 10; if(m.pp === undefined) m.pp = m.maxPP; } }
 if (typeof applyOfficialPokemonDataToSave === 'function') applyOfficialPokemonDataToSave();
 if(typeof ensureTeamSlotItems === 'function') ensureTeamSlotItems();
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
 const safeName = String(meta.name || 'pokeworld').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'pokeworld';
 return `pokeworld-${safeName}-${meta.id}.json`;
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
 if(!window.confirm(t('save_delete_confirm'))) return;
 storageRemove(slotKey(id));
 removeSaveFromIndex(id);
 if(currentSaveId === id){
  currentSaveId = null;
  window.currentSaveId = null;
  storageRemove(ACTIVE_SAVE_ID_KEY);
  storageRemove(SAVE_KEY);
  window.PokeWorldGameStarted = false;
 }
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
function createFreshGameState(){ let state = null; try{ if(window.PokeWorldState && window.PokeWorldState.createInitialGameState) state = window.PokeWorldState.createInitialGameState(); }catch(_){ } if(!state) state = { location:'pallet', region:'kanto', team:[], inventory:{}, money:2000, badges:[], defeatedChamps:{}, pokedex:{}, stepsLeft:0, starter:false, starterKanto:false, starterJohto:false, regionStarter:{kanto:false,johto:false}, collection:{}, evolvedSpecies:[], dupeCatches:{}, lang:'fr', storyIdx:0, storyProgress:0, unlockedTalents:{}, activeQuests:[], repeatables:[], visitedMaps:{}, completedQuests:{}, wildWinsByLoc:{}, playTimeMs:0, saveMeta:{} }; const storedLang = storageGet('pokeworld_lang'); if(storedLang) state.lang = storedLang; if(state.playTimeMs == null) state.playTimeMs = 0; return state; }
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
function saveGame(manual = false) { try { if(!currentSaveId && G && G.saveMeta && G.saveMeta.id) currentSaveId = G.saveMeta.id; if(!currentSaveId){ if(manual) notify(t('no_save_found'), 'var(--light1)'); return false; } if(!hasStarterInState(G)){ if(manual) notify(t('save_need_starter'), 'var(--red)'); return false; } if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems(); ensureDefaultSaveIcon(); if(!afkApplying && typeof markAfkSeen === 'function') markAfkSeen(false); updatePlayTimeBeforeSave(); G.saveMeta.pendingStarter = false; const saveData = { version:SAVE_VERSION, timestamp:saveNow(), saveId:currentSaveId, G:JSON.parse(JSON.stringify(G)) }; ensureSaveMeta(saveData, currentSaveId); const json = JSON.stringify(saveData); if (json.length > 5 * 1024 * 1024) { console.error('[SAVE] Save too large:', json.length, 'bytes'); if (manual) notify(t('save_error_too_large'), 'var(--red)'); return false; } writeSlot(currentSaveId, saveData, true); storageSet(ACTIVE_SAVE_ID_KEY, currentSaveId); upsertSaveIndex(saveData); if (manual) notify(t('legacy_message_n_partie_sauvegard_e')); const settingsModal = document.getElementById('settings-modal'); const editingProfile = document.activeElement && document.activeElement.closest ? document.activeElement.closest('#save-profile-section') : null; if(settingsModal && settingsModal.classList.contains('open') && !editingProfile) updateSaveProfileControls(); return true; } catch (e) { console.error('[SAVE ERROR]', e); if (manual) notify(tr('save_error_message', {message:e.message}), 'var(--red)'); return false; } }
function loadGame(manual = false) { try { const id = currentSaveId || storageGet(ACTIVE_SAVE_ID_KEY); let saveData = id ? readSlot(id) : null; if(!saveData){ const raw = storageGet(SAVE_KEY); saveData = raw ? JSON.parse(raw) : null; } if (!saveData) { if (manual) notify(t('no_save_found'), 'var(--light1)'); return false; } if (!isCompatibleSaveData(saveData) || !hasStarterInState(saveData.G)) { deleteIncompatibleSave('version=' + (saveData && saveData.version)); if (manual) notify(t('save_incompatible_deleted'), 'var(--red)'); return false; } const loadedId = id || saveData.saveId || saveData.G?.saveMeta?.id || uniqueSaveId(); currentSaveId = loadedId; ensureSaveMeta(saveData, loadedId); assignGlobalState(saveData.G); normalizeLoadedState(); const freshData = {version:SAVE_VERSION, timestamp:saveNow(), saveId:currentSaveId, G:JSON.parse(JSON.stringify(G))}; writeSlot(currentSaveId, freshData, true); upsertSaveIndex(freshData); activateCurrentSave(manual); return true; } catch (e) { console.error('[LOAD ERROR]', e); if (manual) notify(tr('load_error_message', {message:e.message}), 'var(--red)'); return false; } }
function deleteIncompatibleSave(reason) { try { if(currentSaveId){ storageRemove(slotKey(currentSaveId)); removeSaveFromIndex(currentSaveId); } storageRemove(SAVE_KEY); console.warn('[SAVE] Incompatible browser save removed automatically:', reason || 'unknown reason'); return true; } catch (e) { console.error('[SAVE] Unable to remove incompatible save:', e); return false; } }
function autoSave() { try { if(currentSaveId && window.PokeWorldGameStarted) saveGame(false); } catch (e) { console.error('[AUTOSAVE ERROR]', e); } }
function exportActiveMultiSave(){ try { if(currentSaveId) saveGame(false); const raw = currentSaveId ? storageGet(slotKey(currentSaveId)) : null; if (!raw) { notify(t('no_save_to_export'), 'var(--red)'); return; } const data = JSON.parse(raw); const meta = ensureSaveMeta(data, currentSaveId); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); const safeName = String(meta.name || 'pokeworld').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'pokeworld'; a.href = url; a.download = `pokeworld-${safeName}-${meta.id}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); notify(t('save_exported'), 'var(--green)'); } catch (e) { console.error('[EXPORT ERROR]', e); notify(t('save_export_error'), 'var(--red)'); } }
function exportSave(){ exportActiveMultiSave(); }
function normalizeImportedSave(parsed){ if(!parsed || !parsed.G) return null; const saveData = {version: parsed.version || SAVE_VERSION, timestamp: saveNow(), saveId: parsed.saveId || parsed.G?.saveMeta?.id, G: parsed.G}; if(!isCompatibleSaveData(saveData) || !hasStarterInState(saveData.G)) return null; const id = uniqueSaveId(saveData.saveId || saveData.G?.saveMeta?.id); ensureSaveMeta(saveData, id); saveData.G.saveMeta.id = id; saveData.saveId = id; if(!saveData.G.saveMeta.name) saveData.G.saveMeta.name = importedSaveName(); saveData.G.saveMeta.updatedAt = saveNow(); saveData.G.saveMeta.createdAt = saveData.G.saveMeta.createdAt || saveNow(); return saveData; }
function importMultiSave(eventOrFile){ const file = eventOrFile && eventOrFile.target ? eventOrFile.target.files && eventOrFile.target.files[0] : eventOrFile; if(!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const imported = normalizeImportedSave(JSON.parse(e.target.result)); if(!imported){ notify(t('save_incompatible_deleted'), 'var(--red)'); return; } writeSlot(imported.saveId, imported, false); upsertSaveIndex(imported); const menuOpen = document.body.classList.contains('save-menu-active') || !window.PokeWorldGameStarted; if(menuOpen){ renderSaveMenu(); notify(t('save_imported_library'), 'var(--green)'); } else { currentSaveId = imported.saveId; storageSet(ACTIVE_SAVE_ID_KEY, currentSaveId); loadGame(true); if(typeof closeSettings === 'function') closeSettings(); notify(t('save_imported_library'), 'var(--green)'); } } catch (err) { console.error('[IMPORT ERROR]', err); notify(tr('save_import_error', {message:err.message}), 'var(--red)'); } finally { if(eventOrFile && eventOrFile.target) eventOrFile.target.value = ''; } }; reader.readAsText(file); }
function importSave(event){ importMultiSave(event); }

const AFK_MIN_MS = 5000;
const AFK_MAX_MS = 8 * 60 * 60 * 1000;
const AFK_MAX_WINS = 720;
let afkHandlersInstalled = false;
let afkApplying = false;
let afkCatchupTimer = null;
let afkPendingSince = null;
let afkLastHeartbeat = saveNow();
function afkStorageKey(){ return currentSaveId ? ('pokeworld_afk_last_' + currentSaveId) : 'pokeworld_afk_last'; }
function countAfkTeamKo(){ return (G && Array.isArray(G.team)) ? G.team.filter(p => p && p.currentHP <= 0).length : 0; }
function getAfkInfo(){
 let fromStorage = null;
 try{ const raw = storageGet(afkStorageKey()); if(raw) fromStorage = JSON.parse(raw); }catch(_){ }
 const node = G && G.afk ? G.afk : {};
 return { ts: Number(fromStorage?.ts || node.lastSeenAt || saveNow()), wasWildBattle: !!(fromStorage?.wasWildBattle || node.wasWildBattle), battleSpeed: Number(fromStorage?.battleSpeed || node.battleSpeed || (battle && battle.speed) || 1), teamKoAtStart: Number((fromStorage && fromStorage.teamKoAtStart != null ? fromStorage.teamKoAtStart : node.teamKoAtStart) || 0) };
}
function markAfkSeen(force){
 if(!G || !currentSaveId) return;
 if(!force && afkPendingSince) return;
 if(!force && typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
 if(!G.afk || typeof G.afk !== 'object') G.afk = {};
 const wildBattle = !!(battle && battle.active && !battle.isChamp && !battle.isTraining);
 const now = saveNow();
 G.afk.lastSeenAt = now;
 G.afk.wasWildBattle = wildBattle;
 G.afk.battleSpeed = wildBattle ? (battle.speed || 1) : (G.afk.battleSpeed || 1);
 afkLastHeartbeat = now;
 if(force) afkPendingSince = null;
 G.afk.teamKoAtStart = countAfkTeamKo();
 try{ storageSet(afkStorageKey(), JSON.stringify({ts:G.afk.lastSeenAt, wasWildBattle:G.afk.wasWildBattle, battleSpeed:G.afk.battleSpeed, teamKoAtStart:G.afk.teamKoAtStart})); }catch(_){ }
}
function beginAfkSleep(){
 if(!window.PokeWorldGameStarted || !G || !hasStarterInState(G)) return;
 if(!currentSaveId && G.saveMeta && G.saveMeta.id) currentSaveId = G.saveMeta.id;
 const now = saveNow();
 afkPendingSince = now;
 if(!G.afk || typeof G.afk !== 'object') G.afk = {};
 const wildBattle = !!(battle && battle.active && !battle.isChamp && !battle.isTraining);
 G.afk.lastSeenAt = now;
 G.afk.wasWildBattle = wildBattle || !!(G.afk.wasWildBattle);
 G.afk.battleSpeed = wildBattle ? (battle.speed || 1) : (G.afk.battleSpeed || 1);
 G.afk.teamKoAtStart = countAfkTeamKo();
 try{ storageSet(afkStorageKey(), JSON.stringify({ts:now, wasWildBattle:G.afk.wasWildBattle, battleSpeed:G.afk.battleSpeed, teamKoAtStart:G.afk.teamKoAtStart})); }catch(_){ }
 if(battle && battle.active && !battle.isChamp && !battle.isTraining) battle.paused = true;
 try{ if(hasStarterInState(G)) saveGame(false); }catch(_){ }
}
function scheduleAfkCatchup(reason){
 clearTimeout(afkCatchupTimer);
 afkCatchupTimer = setTimeout(() => applyAfkReturn(reason || 'return'), 120);
}
function resumeAfkBattleIfNeeded(){
 if(battle && battle.active && !battle.isChamp && !battle.isTraining && battle.paused){
  battle.paused = false;
  try{ updateBattleUI(); renderMoveButtons(); renderEnemyMoveBars(); renderBattleTeamRow(); }catch(_){}
 }
}
function pollAfkHeartbeat(){
 const now = saveNow();
 if(!window.PokeWorldGameStarted || afkApplying){ afkLastHeartbeat = now; return; }
 if(!G || !hasStarterInState(G)){ afkLastHeartbeat = now; return; }
 if(!currentSaveId && G.saveMeta && G.saveMeta.id) currentSaveId = G.saveMeta.id;
 const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
 if(hidden){
  if(!afkPendingSince) beginAfkSleep();
  return;
 }
 const start = afkPendingSince || afkLastHeartbeat;
 const elapsed = now - start;
 if(elapsed >= AFK_MIN_MS){
  const info = afkPendingSince ? getAfkInfo() : {ts:start, wasWildBattle:!!(battle && battle.active && !battle.isChamp && !battle.isTraining), battleSpeed:(battle && battle.speed) || 1, teamKoAtStart:countAfkTeamKo()};
  applyAfkProgress(elapsed, afkPendingSince ? 'heartbeat-return' : 'heartbeat-gap', info);
  return;
 }
 markAfkSeen(false);
}
function installAfkHandlers(){
 if(afkHandlersInstalled || typeof window === 'undefined') return;
 afkHandlersInstalled = true;
 document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden') beginAfkSleep();
  else scheduleAfkCatchup('visible');
 });
 window.addEventListener('blur', () => beginAfkSleep());
 window.addEventListener('focus', () => scheduleAfkCatchup('focus'));
 window.addEventListener('pageshow', () => scheduleAfkCatchup('pageshow'));
 window.addEventListener('pagehide', () => beginAfkSleep());
 setInterval(pollAfkHeartbeat, 2000);
}
function applyAfkReturn(reason){
 if(afkApplying) return;
 if(!window.PokeWorldGameStarted || !G || !hasStarterInState(G)){ resumeAfkBattleIfNeeded(); return; }
 if(!currentSaveId && G.saveMeta && G.saveMeta.id) currentSaveId = G.saveMeta.id;
 const info = getAfkInfo();
 const start = afkPendingSince || info.ts;
 const elapsed = saveNow() - start;
 if(!(elapsed >= AFK_MIN_MS)){ resumeAfkBattleIfNeeded(); markAfkSeen(true); return; }
 applyAfkProgress(elapsed, reason, {...info, ts:start});
}
function canAfkBattle(info){
 const loc = (typeof getLocObj === 'function') ? getLocObj(G.location) : null;
 if(!loc || !loc.wild || !loc.wild.length || !G.team || !G.team.length) return false;
 if(battle && battle.active && (battle.isChamp || battle.isTraining)) return false;
 return true;
}
function getAfkEncounterSeconds(loc, info){
 const wild = loc?.wild || [];
 let enemyLv = 10;
 if(wild.length){ enemyLv = wild.reduce((sum,w)=>sum+(((w[1]||1)+(w[2]||w[1]||1))/2),0)/wild.length; }
 const alive = (G.team||[]).filter(p=>p && p.currentHP > 0);
 const team = alive.length ? alive : (G.team||[]).filter(Boolean);
 const teamLv = team.length ? team.reduce((sum,p)=>sum+(p.level||1),0)/team.length : 1;
 const diff = enemyLv - teamLv;
 let base = 18 + Math.max(0, diff) * 1.6 - Math.max(0, -diff) * 0.25;
 const spd = Math.max(1, Math.min(10, Number(info.battleSpeed || battle?.speed || 1)));
 return Math.max(7, base / Math.sqrt(spd));
}
function advanceAfkHatchery(wins){
 if(!wins || !G.hatchery || !Array.isArray(G.hatchery)) return 0;
 let changed = 0;
 for(let i=0;i<G.hatchery.length;i++){
  const slot = G.hatchery[i];
  if(!slot) continue;
  slot.steps = (slot.steps || 0) + wins;
  changed++;
  if(G.automation && G.automation.autoHatch && slot.steps >= (slot.stepsReq || 10)){
   try{ hatchEgg(i); }catch(_){ }
  }
 }
 return changed;
}
function getAfkActivePokemon(){
 return (G.team||[]).find(p => p && p.currentHP > 0) || null;
}
function getAfkAttackStat(attacker, move){
 const isSpec = move && move.cat === 'spec';
 const base = isSpec ? (attacker.spa || attacker.atk || 1) : (attacker.atk || 1);
 try{
  const buff = getHeldBuff(attacker) || {};
  return Math.max(1, base * (1 + (buff[isSpec ? 'spa' : 'atk'] || 0)));
 }catch(_){ return Math.max(1, base); }
}
function getAfkDefenseStat(defender, move){
 const isSpec = move && move.cat === 'spec';
 const base = isSpec ? (defender.spd || defender.def || 1) : (defender.def || 1);
 try{
  const buff = getHeldBuff(defender) || {};
  return Math.max(1, base * (1 + (buff[isSpec ? 'spd' : 'def'] || 0)));
 }catch(_){ return Math.max(1, base); }
}
function estimateAfkMoveDamage(attacker, defender, moveId){
 const mv = MOVES && MOVES[moveId];
 if(!mv) return 0;
 if(mv.fixed !== undefined && mv.fixed !== null) return Math.max(1, typeof mv.fixed === 'number' ? mv.fixed : (attacker.level || 1));
 if(!mv.pow || mv.pow <= 0) return 0;
 const eff = typeof typeEff === 'function' ? typeEff(mv.type, defender.type1, defender.type2) : 1;
 if(eff <= 0 && !mv.fixed) return 0;
 const level = Math.max(1, attacker.level || 1);
 let atk = getAfkAttackStat(attacker, mv);
 let def = getAfkDefenseStat(defender, mv);
 if((attacker.talent === 'hugepower' || attacker.talent === 'purepower') && mv.cat !== 'spec') atk *= 1.6;
 if(attacker.talent === 'guts' && attacker.status && mv.cat !== 'spec') atk *= 1.35;
 const stab = (attacker.type1 === mv.type || attacker.type2 === mv.type) ? (attacker.talent === 'adaptability' ? 2 : 1.5) : 1;
 const avgAccuracy = Math.max(0.35, Math.min(1, (mv.acc || 100) / 100));
 const raw = (((2 * level / 5 + 2) * mv.pow * atk / Math.max(1, def)) / 50 + 2) * stab * eff * 0.925 * avgAccuracy;
 return Math.max(1, Math.floor(raw));
}
function estimateAfkBestDamage(attacker, defender){
 const moves = (attacker && attacker.moves) || [];
 let best = 0;
 for(const m of moves){ best = Math.max(best, estimateAfkMoveDamage(attacker, defender, m.id)); }
 if(best <= 0) best = Math.max(1, Math.floor((attacker.level || 1) / 2));
 return best;
}
function afkCdFor(poke){
 if(typeof calcAttackCd === 'function') return Math.max(350, calcAttackCd(poke?.spe || 50));
 const spe = Math.max(1, poke?.spe || 50);
 return Math.max(500, Math.round(1900 * (100 / (100 + Math.min(spe, 180)))));
}
function simulateAfkFight(enemy){
 if(!enemy) return {won:false, lost:false, damage:0, fainted:0};
 let enemyHp = Math.max(1, enemy.currentHP || enemy.maxHP || 1);
 let totalDamage = 0;
 let fainted = 0;
 let p = getAfkActivePokemon();
 if(!p) return {won:false, lost:true, damage:0, fainted:0};
 let pCd = afkCdFor(p);
 let eCd = afkCdFor(enemy);
 let guard = 0;
 while(enemyHp > 0 && guard < 250){
  guard++;
  p = getAfkActivePokemon();
  if(!p) return {won:false, lost:true, damage:totalDamage, fainted};
  const pDmg = estimateAfkBestDamage(p, enemy);
  const eDmg = estimateAfkBestDamage(enemy, p);
  if(pCd <= eCd){
   enemyHp -= pDmg;
   eCd -= pCd;
   pCd = afkCdFor(p);
   if(enemyHp <= 0) return {won:true, lost:false, damage:totalDamage, fainted};
  } else {
   p.currentHP = Math.max(0, (p.currentHP || p.maxHP || 1) - eDmg);
   totalDamage += eDmg;
   pCd -= eCd;
   eCd = afkCdFor(enemy);
   if(p.currentHP <= 0){
    p.status = null;
    p.statusTurns = 0;
    fainted++;
    const next = getAfkActivePokemon();
    if(!next) return {won:false, lost:true, damage:totalDamage, fainted};
    pCd = afkCdFor(next);
   }
  }
 }
 const lost = enemyHp > 0;
 return {won:!lost, lost, damage:totalDamage, fainted};
}
function simulateAfkWildWin(loc){
 const roamingId = typeof getRoamingLegendaryForRoute === 'function' ? getRoamingLegendaryForRoute(G.location) : null;
 const e = typeof pickWildEncounter === 'function' ? pickWildEncounter(loc, roamingId) : null;
 if(!e) return null;
 if(!battle.sessionCatches) battle.sessionCatches = [];
 if(!battle.sessionItems) battle.sessionItems = {};
 battle.legendaryCatch = false;
 G.pokedex[e.id] = {...(G.pokedex[e.id]||{}), seen:true};
 const fight = simulateAfkFight(e);
 if(!fight.won){
  return {won:false, money:0, damage:fight.damage, fainted:fight.fainted, lost:true};
 }
 const xp = typeof gainXP === 'function' ? gainXP(e) : 0;
 G.totalWildWins = (G.totalWildWins||0) + 1;
 if(!G.wildWinsByLoc) G.wildWinsByLoc = {};
 G.wildWinsByLoc[G.location] = (G.wildWinsByLoc[G.location]||0) + 1;
 try{ attemptAutoCatch(e); }catch(_){ }
 try{ EventBus.emit(EVENTS.WILD_DEFEATED, {loc:G.location}); }catch(_){ }
 const drops = ROUTE_DROPS[G.location];
 if(drops && drops.length && chance(4)){
  const drop = drops[rand(0,drops.length-1)];
  addToInventory(drop,1);
  battle.sessionItems[drop] = (battle.sessionItems[drop]||0)+1;
 }
 const mon = rand(e.level*5, e.level*10);
 G.money += mon;
 return {won:true, money:mon, damage:fight.damage, fainted:fight.fainted, lost:false};
}
function ensureAfkActiveBattlePokemon(){
 if(!battle || !battle.active || !G || !Array.isArray(G.team)) return false;
 const current = G.team[battle.playerPokeIdx || 0];
 if(current && current.currentHP > 0) return true;
 let idx = -1;
 try{ if(typeof firstAlive === 'function') idx = firstAlive(); }catch(_){}
 if(idx == null || idx < 0) idx = G.team.findIndex(p => p && p.currentHP > 0);
 if(idx >= 0){
  battle.playerPokeIdx = idx;
  battle.pMoveIdx = 0;
  battle.playerMods = {atk:1,def:1,spe:1};
  try{ resetPlayerCd(); }catch(_){}
  return true;
 }
 return false;
}
function finishAfkBattleState(shouldContinue, loc){
 if(!shouldContinue || !loc || !loc.wild || !loc.wild.length) return;
 const next = typeof pickWildEncounter === 'function' ? pickWildEncounter(loc, getRoamingLegendaryForRoute(G.location)) : null;
 if(!next) return;
 if(battle && battle.active){
  const hasAlive = ensureAfkActiveBattlePokemon();
  if(!hasAlive){ endBattle(); return; }
  battle.enemyPoke = next;
  battle.enemyMods = {atk:1,def:1,spe:1};
  battle.playerMods = {atk:1,def:1,spe:1};
  battle.eMoveIdx = 0;
  battle.escaped = false;
  battle.paused = false;
  try{ resetEnemyCd(); resetPlayerCd(); triggerEntryTalents('both'); updateBattleUI(); renderMoveButtons(); renderEnemyMoveBars(); renderBattleTeamRow(); }catch(_){ }
 }
}
function snapshotInventory(){ return {...(G.inventory || {})}; }
function snapshotSessionItems(){ return {...((battle && battle.sessionItems) || {})}; }
function diffInventory(before, after){
 const keys = new Set([...Object.keys(before||{}), ...Object.keys(after||{})]);
 const out = [];
 for(const key of keys){
  const delta = Number((after&&after[key]) || 0) - Number((before&&before[key]) || 0);
  if(delta > 0) out.push({key, qty:delta});
 }
 return out;
}
function diffSessionItems(before, after){
 const keys = new Set([...Object.keys(before||{}), ...Object.keys(after||{})]);
 const out = [];
 for(const key of keys){
  const delta = Number((after&&after[key]) || 0) - Number((before&&before[key]) || 0);
  if(delta > 0) out.push({key, qty:delta});
 }
 return out;
}
function ensureAfkResultPanel(){
 let modal = document.getElementById('afk-result-modal');
 if(!modal){
  modal = document.createElement('div');
  modal.id = 'afk-result-modal';
  modal.className = 'afk-result-modal';
  document.body.appendChild(modal);
 }
 return modal;
}
function closeAfkResultPanel(){ const modal = document.getElementById('afk-result-modal'); if(modal) modal.classList.remove('open'); }
function groupAfkCaptures(captures){
 const grouped = {};
 for(const c of captures || []){
  const id = Number(c.id || 0);
  if(!id) continue;
  const key = id + ':' + (!!c.shiny);
  if(!grouped[key]) grouped[key] = {id, name:c.name || getPokeName(id), emoji:c.emoji || '', shiny:!!c.shiny, count:0, dupes:0};
  grouped[key].count++;
  if(c.dupe) grouped[key].dupes++;
 }
 return Object.values(grouped).sort((a,b) => (b.shiny-a.shiny) || a.id-b.id);
}
function renderAfkCaptureCards(list){
 if(!list || !list.length) return `<span class="afk-muted">${escHtml(t('afk_none'))}</span>`;
 return list.map(c => `<div class="afk-loot-card ${c.shiny?'is-shiny':''}" title="${escHtml(c.name)}${c.dupes?` · ${c.dupes} ${escHtml(t('duplicate_short'))}`:''}">${spriteImg(c.id, c.emoji, {shiny:c.shiny, size:44})}<span>${escHtml(c.name)}</span>${c.count>1?`<b>×${c.count}</b>`:''}${c.shiny?'<em>★</em>':''}</div>`).join('');
}
function renderAfkCaptureList(captures){
 const grouped = groupAfkCaptures(captures || []);
 if(!grouped.length) return `<span class="afk-muted">${escHtml(t('afk_none'))}</span>`;
 return `<div class="afk-loot-row">${renderAfkCaptureCards(grouped)}</div>`;
}
function renderAfkItemList(items){
 if(!items || !items.length) return `<span class="afk-muted">${escHtml(t('afk_none'))}</span>`;
 return items.map(it => `<div class="afk-loot-card item" title="${escHtml(getItemName(it.key))}">${itemSpriteHtml(it.key,34)}<span>${escHtml(getItemName(it.key))}</span><b>×${it.qty}</b></div>`).join('');
}
function showAfkResultPanel(result){
 const modal = ensureAfkResultPanel();
 const capturesHtml = renderAfkCaptureList(result.captureList || []);
 const itemsHtml = renderAfkItemList(result.items || []);
 const titleKey = result.debug ? 'afk_panel_title_debug' : 'afk_panel_title_return';
 const statusKey = result.error ? 'afk_panel_status_error' : result.lost ? 'afk_panel_status_lost' : result.wins > 0 ? 'afk_panel_status_ok' : 'afk_panel_status_empty';
 modal.innerHTML = `<div class="afk-result-card"><div class="modal-title"><div>⏱ ${escHtml(t(titleKey))}</div><span class="afk-modal-close" data-action="legacy-call" data-call="closeAfkResultPanel" data-call-args="">✕</span></div><div class="afk-result-status ${result.error?'danger':result.lost?'danger':result.wins>0?'success':''}">${escHtml(t(statusKey))}</div><div class="afk-result-grid"><div><b>${escHtml(formatPlayTime(result.timeMs || 0))}</b><span>${escHtml(t('afk_panel_duration'))}</span></div><div><b>${result.wins || 0}</b><span>${escHtml(t('afk_panel_battles'))}</span></div><div><b>+${Number(result.money || 0).toLocaleString()}₽</b><span>${escHtml(t('afk_panel_money'))}</span></div><div><b>${result.fainted || 0}</b><span>${escHtml(t('afk_panel_team_ko'))}</span></div><div><b>${result.captures || 0}</b><span>${escHtml(t('afk_panel_captures'))}</span></div><div><b>+${result.energy || 0}</b><span>${escHtml(t('afk_panel_energy'))}</span></div></div><div class="afk-result-section"><b>${escHtml(t('captured_pokemon_title'))}</b>${capturesHtml}</div><div class="afk-result-section"><b>${escHtml(t('found_items_title'))}</b><div class="afk-loot-row">${itemsHtml}</div></div>${result.message?`<div class="afk-result-note">${escHtml(result.message)}</div>`:''}<div class="afk-result-actions"><button class="hbtn" data-action="legacy-call" data-call="closeAfkResultPanel" data-call-args="">${escHtml(t('close'))}</button></div></div>`;
 modal.classList.add('open');
}
function applyAfkProgress(elapsedMs, reason, info){
 afkApplying = true;
 try{
  const capped = Math.min(elapsedMs, AFK_MAX_MS);
  const seconds = Math.floor(capped / 1000);
  const startMoney = Number(G.money || 0);
  const startEnergy = G.mine ? Number(G.mine.energy || 0) : 0;
  const invBefore = snapshotInventory();
  const sessionItemsBefore = snapshotSessionItems();
  const catchBefore = (battle && battle.sessionCatches) ? battle.sessionCatches.length : 0;
  const teamKoBefore = Number(info && info.teamKoAtStart != null ? info.teamKoAtStart : countAfkTeamKo());
  let wins = 0;
  let money = 0;
  let damage = 0;
  let fainted = 0;
  let lost = false;
  if(G.mine){
   G.mine.energy = Math.min(G.mine.maxEnergy || 100, (G.mine.energy || 0) + seconds * 2);
  }
  const loc = (typeof getLocObj === 'function') ? getLocObj(G.location) : null;
  const shouldFight = canAfkBattle(info);
  const shouldContinue = shouldFight;
  const wasActive = !!(battle && battle.active && !battle.isChamp && !battle.isTraining);
  if(wasActive) battle.paused = true;
  if(shouldFight && loc){
   const perFight = getAfkEncounterSeconds(loc, info);
   const plannedWins = Math.max(0, Math.min(AFK_MAX_WINS, Math.floor(seconds / perFight)));
   let completed = 0;
   for(let i=0;i<plannedWins;i++){
    const result = simulateAfkWildWin(loc);
    if(!result) break;
    money += Number(result.money || 0);
    damage += Number(result.damage || 0);
    fainted += Number(result.fainted || 0);
    if(result.lost){ lost = true; break; }
    if(result.won) completed++;
   }
   wins = completed;
   advanceAfkHatchery(wins);
   if(lost){
    try{ addBattleLog(t('afk_party_ko_log')); }catch(_){}
    if(battle && battle.active) endBattle();
   } else {
    finishAfkBattleState(shouldContinue, loc);
   }
  }
  if(!shouldFight) resumeAfkBattleIfNeeded();
  if(G.afk){ G.afk.wasWildBattle = !!(battle && battle.active && !battle.isChamp && !battle.isTraining); }
  markAfkSeen(true);
  try{ updateHeader(); renderBattleLoot(); renderBattleSummary(); }catch(_){ }
  saveGame(false);
  const teamKoAfter = countAfkTeamKo();
  const displayedFainted = Math.max(fainted, Math.max(0, teamKoAfter - teamKoBefore));
  const captureList = ((battle && battle.sessionCatches) ? battle.sessionCatches.slice(catchBefore) : []);
  let itemList = diffSessionItems(sessionItemsBefore, (battle && battle.sessionItems) || {});
  if(!itemList.length) itemList = diffInventory(invBefore, G.inventory || {});
  const result = {debug: reason === 'debug', timeMs:capped, wins, money:Math.max(0, Number(G.money || 0) - startMoney), damage, fainted:displayedFainted, lost, energy:G.mine ? Math.max(0, Number(G.mine.energy || 0) - startEnergy) : 0, captures:captureList.length, captureList, items:itemList};
  showAfkResultPanel(result);
  if(wins > 0 || lost){
   const params = {time:formatPlayTime(capped), wins:wins, money:Number(result.money || 0).toLocaleString(), fainted:result.fainted};
   notify(tr(lost ? 'afk_progress_lost_summary' : 'afk_progress_summary', params), lost ? 'var(--red)' : 'var(--green)');
   try{ addBattleLog(tr(lost ? 'afk_battle_log_lost_summary' : 'afk_battle_log_summary', params)); }catch(_){ }
  } else if(seconds >= 30 && G.mine){
   notify(tr('afk_energy_summary', {time:formatPlayTime(capped)}), 'var(--blue)');
  } else if(seconds >= 5){
   notify(tr('afk_no_progress_summary', {time:formatPlayTime(capped)}), 'var(--light1)');
  }
 } catch(e) {
  console.error('[AFK ERROR]', e);
  resumeAfkBattleIfNeeded();
  try{ markAfkSeen(true); }catch(_){}
  try{ showAfkResultPanel({error:true, timeMs:elapsedMs || 0, wins:0, money:0, damage:0, fainted:0, captures:0, energy:0, items:[], message:t('afk_error_resume')}); notify(t('afk_error_resume'), 'var(--red)'); }catch(_){}
 } finally {
  afkApplying = false;
 }
}
function debugTimeSkip10Minutes(){
 if(!window.PokeWorldGameStarted || !G || !hasStarterInState(G)){ showAfkResultPanel({debug:true, timeMs:10*60*1000, wins:0, money:0, damage:0, fainted:0, captures:0, energy:0, items:[], message:t('save_need_starter')}); notify(t('save_need_starter'), 'var(--red)'); return; }
 if(!currentSaveId && G.saveMeta && G.saveMeta.id) currentSaveId = G.saveMeta.id;
 applyAfkProgress(10 * 60 * 1000, 'debug', {ts:saveNow() - 10 * 60 * 1000, wasWildBattle:true, battleSpeed:(battle && battle.speed) || 1, forceBattle:true});
}
installAfkHandlers();

function deleteSave() { try { const id = currentSaveId; if(id){ storageRemove(slotKey(id)); removeSaveFromIndex(id); } storageRemove(SAVE_KEY); storageRemove(ACTIVE_SAVE_ID_KEY); currentSaveId = null; window.currentSaveId = null; window.PokeWorldGameStarted = false; notify(t('save_deleted'), 'var(--green)'); setTimeout(() => { if(typeof closeSettings === 'function') closeSettings(); renderSaveMenu(); }, 400); } catch (e) { console.error('[DELETE ERROR]', e); notify(t('save_delete_error'), 'var(--red)'); } }
setInterval(() => { autoSave(); }, 30000);
if(typeof window !== 'undefined' && !window._pokeWorldSaveBeforeUnload){ window._pokeWorldSaveBeforeUnload = true; window.addEventListener('beforeunload', () => { autoSave(); }); }
function confirmDelete() { const deleteRow = document.getElementById('delete-row'); const confirmRow = document.getElementById('delete-confirm-row'); if (deleteRow) deleteRow.style.display = 'none'; if (confirmRow) confirmRow.style.display = 'flex'; }
function cancelDelete() { const deleteRow = document.getElementById('delete-row'); const confirmRow = document.getElementById('delete-confirm-row'); if (deleteRow) deleteRow.style.display = 'flex'; if (confirmRow) confirmRow.style.display = 'none'; }
function doDelete() { deleteSave(); }
function resetGame() { confirmDelete(); }
function getBoxIconOptions(){
 const out = [];
 for(const key of Object.keys(G?.collection || {})){
  const p = G.collection[key];
  const id = Number(p && p.id);
  if(id > 0) out.push({key:String(key).replace(/\\/g,'\\\\').replace(/'/g,"\\'"), id, name:p.name || getPokeName(id), level:p.level || 1, shiny:!!p.shiny});
 }
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
if (typeof isCompatibleSaveData !== 'undefined' && typeof window !== 'undefined') window.isCompatibleSaveData = isCompatibleSaveData;
if (typeof deleteIncompatibleSave !== 'undefined' && typeof window !== 'undefined') window.deleteIncompatibleSave = deleteIncompatibleSave;
if (typeof saveGame !== 'undefined' && typeof window !== 'undefined') window.saveGame = saveGame;
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
if (typeof debugTimeSkip10Minutes !== 'undefined' && typeof window !== 'undefined') window.debugTimeSkip10Minutes = debugTimeSkip10Minutes;
if (typeof closeAfkResultPanel !== 'undefined' && typeof window !== 'undefined') window.closeAfkResultPanel = closeAfkResultPanel;
export {};
