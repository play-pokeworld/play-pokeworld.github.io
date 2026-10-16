// V7 · DBT-09 — extrait de src/data/game-helpers.js (découpage par domaine, aucun changement de règle).
// Filtres de boîte / sélecteur unifié : état G.boxFilters, prédicats, barre de filtres (DS FilterBar), recherche.
import { pwLateLink } from '../core/late-link.js';
import { REGION_ORDER, getRegionMeta, getPokemonRegion, getUnlockedRegionsForPokedex } from './region.js';
const BOX_FILTER_DEFAULTS = {region:'all', type:'all', shiny:'all', evo:'all', favorite:'all', locked:'all', iv:'all', ev:'all', rank:'all', forms:'all', search:''}; // V7 · FORM-03 : filtre « Formes »
const FILTER_LEVEL_EVO_MAP = {1:2, 2:3, 4:5, 5:6, 7:8, 8:9, 10:11, 11:12, 13:14, 14:15, 16:17, 17:18, 19:20, 21:22, 23:24, 27:28, 29:30, 32:33, 41:42, 43:44, 46:47, 48:49, 50:51, 52:53, 54:55, 56:57, 60:61, 63:64, 66:67, 69:70, 72:73, 74:75, 75:76, 77:78, 79:80, 81:82, 84:85, 86:87, 88:89, 92:93, 96:97, 98:99, 100:101, 104:105, 109:110, 111:112, 116:117, 118:119, 129:130, 138:139, 140:141, 147:148, 148:149, 152:153, 153:154, 155:156, 156:157, 158:159, 159:160, 161:162, 163:164, 165:166, 167:168, 170:171, 172:25, 173:35, 174:39, 175:176, 177:178, 179:180, 180:181, 183:184, 187:188, 188:189, 194:195, 204:205, 209:210, 216:217, 218:219, 220:221, 223:224, 228:229, 231:232, 236:106, 238:124, 239:125, 240:126, 246:247, 247:248, 252:253, 253:254, 255:256, 256:257, 258:259, 259:260, 261:262, 263:264, 265:266, 266:267, 268:269, 270:271, 273:274, 276:277, 278:279, 280:281, 281:282, 283:284, 285:286, 287:288, 288:289, 290:291, 293:294, 294:295, 296:297, 298:183, 304:305, 305:306, 307:308, 309:310, 316:317, 318:319, 320:321, 322:323, 325:326, 328:329, 329:330, 331:332, 333:334, 339:340, 341:342, 343:344, 345:346, 347:348, 353:354, 355:356, 360:202, 361:362, 363:364, 364:365, 371:372, 372:373, 374:375, 375:376};
const FILTER_STONE_EVO = {37:{firestone:38},58:{firestone:59},133:{firestone:136,waterstone:134,thunderstone:135},61:{waterstone:62,kings_rock:186},90:{waterstone:91},120:{waterstone:121},25:{thunderstone:26},44:{leafstone:45,sunstone:182},70:{leafstone:71},102:{leafstone:103},30:{moonstone:31},33:{moonstone:34},35:{moonstone:36},39:{moonstone:40},79:{kings_rock:199},95:{metal_coat:208},117:{dragon_scale:230},123:{metal_coat:212},137:{upgrade:233},191:{sunstone:192},271:{waterstone:272},274:{leafstone:275},300:{moonstone:301},366:{deep_sea_tooth:367,deep_sea_scale:368},349:{prism_scale:350}};

function ensureBoxFilters(){
 if(!G.boxFilters || typeof G.boxFilters !== 'object') G.boxFilters = {...BOX_FILTER_DEFAULTS};
 for(const key in BOX_FILTER_DEFAULTS){ if(G.boxFilters[key] == null) G.boxFilters[key] = BOX_FILTER_DEFAULTS[key]; }
 return G.boxFilters;
}

function getUnlockedDexIds(){
 const out = [];
 for(const region of getUnlockedRegionsForPokedex()){
  const meta = getRegionMeta(region);
  for(let id=meta.start; id<=meta.end && id<=(PD ? PD.length-1 : meta.end); id++) if(PD[id]) out.push(id);
 }
 return out;
}
// FIX-08 : espèces atteignables — rencontres sauvages des 3 régions,
// évolutions (cartes canoniques progression.js, sinon fallback), starters,
// fossiles, légendaires errants, marché PQ et récompenses Pokémon des quêtes.
function getReachableSpecies(){
 const reach = new Set();
 const addWild = (loc) => { if(!loc || !Array.isArray(loc.wild)) return; for(const entry of loc.wild){ if(Array.isArray(entry) && entry.length) reach.add(Number(entry[0])); } };
 const locSets = [ (typeof LOCS !== 'undefined' ? LOCS : null), (typeof LOCS_JOHTO !== 'undefined' ? LOCS_JOHTO : null), (typeof LOCS_HOENN !== 'undefined' ? LOCS_HOENN : null) ];
 for(const locs of locSets){ if(!locs) continue; for(const id in locs) addWild(locs[id]); }
 // Starters donnés au départ.
 for(let i=1;i<=9;i++) reach.add(i);
 for(let i=152;i<=160;i++) reach.add(i);
 for(let i=252;i<=260;i++) reach.add(i);
 // Fossiles (champ revive ≤ 386).
 if(typeof ITEMS !== 'undefined' && ITEMS){ for(const k in ITEMS){ const r = Number(ITEMS[k] && ITEMS[k].revive); if(r && r <= 386) reach.add(r); } }
 // Légendaires errants.
 for(const id of [144,145,146,151,243,244,245,251,380,381,385,386]) reach.add(id);
 // Marché PQ (stock classique).
 for(const id of [1,4,7,133,137,106,107,122,124,131,152,155,158,172,173,174,175,236,196,197,199,213,238,239,240,252,255,258,298,351]) reach.add(id);
 // Récompenses Pokémon des quêtes (histoire + annexes + Hoenn).
 const addReward = (qs) => { if(!qs) return; if(Array.isArray(qs)){ for(const q of qs){ const r = q && q.rewardPoke; if(r && Number(r) <= 386) reach.add(Number(r)); } } else { for(const k in qs){ const q = qs[k]; const r = q && q.rewardPoke; if(r && Number(r) <= 386) reach.add(Number(r)); } } };
 addReward(typeof STORY_QUESTS !== 'undefined' ? STORY_QUESTS : null);
 addReward(typeof STORY_QUESTS_HOENN !== 'undefined' ? STORY_QUESTS_HOENN : null);
 addReward(typeof SIDE_QUESTS !== 'undefined' ? SIDE_QUESTS : null);
 // Fermeture par évolution.
 const lvlMap = (typeof LEVEL_EVO_MAP !== 'undefined' && LEVEL_EVO_MAP && Object.keys(LEVEL_EVO_MAP).length) ? LEVEL_EVO_MAP : FILTER_LEVEL_EVO_MAP;
 const stMap = (typeof STONE_EVO !== 'undefined' && STONE_EVO && Object.keys(STONE_EVO).length) ? STONE_EVO : FILTER_STONE_EVO;
 let changed = true;
 while(changed){
  changed = false;
  for(const f in lvlMap){ const t = Number(lvlMap[f]); if(reach.has(Number(f)) && !reach.has(t)){ reach.add(t); changed = true; } }
  for(const f in stMap){ if(!reach.has(Number(f))) continue; const targets = stMap[f]; if(!targets) continue; for(const sk in targets){ const t = Number(targets[sk]); if(!reach.has(t)){ reach.add(t); changed = true; } } }
 }
 const out = [];
 for(let i=1;i<=386;i++) if(reach.has(i)) out.push(i);
 return out;
}

function getBoxFilterRegions(){
 const regions = new Set(['all']);
 for(const p of Object.values(G.collection || {})) if(p) regions.add(getPokemonRegion(p.id));
 for(const p of (G.team || [])) if(p) regions.add(getPokemonRegion(p.id));
 return Array.from(regions).filter(r => r === 'all' || r !== 'unknown');
}
function getBoxFilterTypes(){
 const types = new Set(['all']);
 for(const p of Object.values(G.collection || {})){
  if(!p) continue;
  if(p.type1) types.add(p.type1);
  if(p.type2) types.add(p.type2);
 }
 for(const p of (G.team || [])){
  if(!p) continue;
  if(p.type1) types.add(p.type1);
  if(p.type2) types.add(p.type2);
 }
 return Array.from(types);
}
function isEvolutionTargetObtained(targetId){
 const nid = Number(targetId);
 return !!(speciesOwned(nid) || (G && G.pokedex && G.pokedex[nid] && G.pokedex[nid].caught));
}
function canPokemonEvolveToUnowned(p){
 if(!p) return false;
 const id = Number(p.id);
 const globalLevelMap = (typeof LEVEL_EVO_MAP !== 'undefined') ? LEVEL_EVO_MAP : (globalThis.LEVEL_EVO_MAP || {});
 const globalStoneMap = (typeof STONE_EVO !== 'undefined') ? STONE_EVO : (globalThis.STONE_EVO || {});
 const levelMap = Object.keys(globalLevelMap || {}).length ? globalLevelMap : FILTER_LEVEL_EVO_MAP;
 const stoneMap = Object.keys(globalStoneMap || {}).length ? globalStoneMap : FILTER_STONE_EVO;
 const lvlTarget = levelMap[id] || levelMap[String(id)] || null;
 if(lvlTarget && !isEvolutionTargetObtained(lvlTarget)) return true;
 const stones = stoneMap[id] || stoneMap[String(id)] || null;
 if(stones){
  for(const stoneKey in stones){
   const target = stones[stoneKey];
   if(!isEvolutionTargetObtained(target)) return true;
  }
 }
 return false;
}
// PASSE 29 — item 11: a Pokemon's `p.name` is frozen at creation time in the
// language that was active back then, so a search typed in the CURRENT
// language missed anything created in another one. Every search field must
// build its haystack from the live localized name (getPokeName) while keeping
// the stored name and the dex number as extra matches (old saves, nicknames).
function pokemonSearchHaystack(p){
 if(!p) return '';
 const disp = (pwLateLink('getPokeName') ? getPokeName(p.id, p.form) : '') || '';
 return (disp + ' ' + (p.name || '') + ' #' + (p.id != null ? p.id : '') + ' ' + (p.id != null ? p.id : '')).toLowerCase();
}
function pokemonMatchesSearch(p, query){
 const q = String(query || '').toLowerCase().trim();
 if(!q) return true;
 return pokemonSearchHaystack(p).includes(q);
}
function pokemonMatchesBoxFilters(p, ignoreSearch){
 const filters = ensureBoxFilters();
 if(!p) return false;
 if(filters.region && filters.region !== 'all' && getPokemonRegion(p.id) !== filters.region) return false;
 if(filters.type && filters.type !== 'all' && p.type1 !== filters.type && p.type2 !== filters.type) return false;
 const shiny = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(pwLateLink('speciesKey') ? speciesKey(p) : p.id));
 if(filters.shiny === 'shiny' && !shiny) return false;
 if(filters.forms === 'forms' && !(Number(p.form) > 0)) return false; // V7 · FORM-03
 if(filters.shiny === 'normal' && shiny) return false;
 if(filters.evo === 'missing' && !canPokemonEvolveToUnowned(p)) return false;
 if(filters.favorite === 'favorite' && !p.favorite) return false;
 if(filters.favorite === 'not_favorite' && p.favorite) return false;
 if(filters.locked === 'locked' && !p.locked) return false;
 if(filters.locked === 'unlocked' && p.locked) return false;
 const ivTotal = Object.values(p.ivs||{}).reduce((a,b)=>a+(Number(b)||0),0);
 if(filters.iv === 'complete' && ivTotal < 36) return false;
 if(filters.iv === 'incomplete' && ivTotal >= 36) return false;
 const evTotal = Object.values(p.evs||{}).reduce((a,b)=>a+(Number(b)||0),0);
 if(filters.ev === 'complete' && evTotal < 36) return false;
 if(filters.ev === 'incomplete' && evTotal >= 36) return false;
 if(filters.rank && filters.rank !== 'all' && pwLateLink('getPokemonRank') && getPokemonRank(p.id) !== filters.rank) return false;
 if(!ignoreSearch && filters.search && !pokemonMatchesSearch(p, filters.search)) return false;
 return true;
}
// opts.ignoreSearch: contexts owning their own search field (unified
// selector) must not inherit the box tab's text search invisibly.
function applyPokemonBoxFilters(entries, opts){
 ensureBoxFilters();
 const ignoreSearch = !!(opts && opts.ignoreSearch);
 return (entries || []).filter(entry => pokemonMatchesBoxFilters(entry.p || entry.poke, ignoreSearch));
}
function boxFilterOptionHtml(value, label, current){ return `<option value="${value}"${String(current)===String(value)?' selected':''}>${label}</option>`; }
// THE single filter toolbar (shared with the bag): the PC box bar renders
// through the exact same DS FilterBar component — identical skeleton
// (quick-filter chips + labeled selects + name search + reset), identical
// look. Classic files cannot import: this goes through window.PokeUI.
// opts.search !== false renders the name-search field; the unified selector
// passes {search:false} because it owns its own top search input. opts.sorts
// prepends sort chips (wave 15: legacy top TRI row removed).
function renderBoxFiltersHtml(opts){
 const comps = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) ? window.PokeUI.components : null;
 if(!comps || typeof comps.filterBarHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (filterBarHTML)');
 const wantSearch = !opts || opts.search !== false;
 const filters = ensureBoxFilters();
 const regions = getBoxFilterRegions();
 const types = getBoxFilterTypes();
 const chip = (label, key, value) => ({
  label: label,
  active: String(filters[key]) === String(value),
  call: 'setBoxFilter',
  callArgs: `'${key}','${value}'`,
 });
 // Wave 15 (user feedback): the legacy TRI button row ON TOP of the USM
 // is gone — sort chips live INSIDE the one FilterBar (same bar as the bag).
 // opts.sorts: [{ label, active, dir, call, callArgs }] built by the caller
 // (sort state is owned by the unified selector module).
 const sortChips = (opts && Array.isArray(opts.sorts)) ? opts.sorts : [];
 const model = {
  chips: [
   ...sortChips.map((sc, i) => ({
     label: sc.label,
     active: !!sc.active,
     call: sc.call,
     callArgs: sc.callArgs,
     extraClass: 'usm-sort-btn usm-sort-chip' + (i === sortChips.length - 1 ? ' usm-sort-chip-last' : ''),
     // data-sort locates a criterion independently of the locale text;
     // data-dir carries the ▲/▼ marker for the CSS content:attr() marker.
     data: Object.assign({ sort: sc.sort || '' }, (sc.active && sc.dir) ? { dir: sc.dir } : {}),
   })),
   chip(t('box_filter_all_shiny'), 'shiny', 'all'),
   chip('★ ' + t('box_filter_shiny_only'), 'shiny', 'shiny'),
   chip(t('box_filter_non_shiny_only'), 'shiny', 'normal'),
   chip(t('box_filter_favorite_only'), 'favorite', filters.favorite === 'favorite' ? 'all' : 'favorite'),
   chip(t('box_filter_locked_only'), 'locked', filters.locked === 'locked' ? 'all' : 'locked'),
   chip(t('box_filter_forms_only'), 'forms', filters.forms === 'forms' ? 'all' : 'forms'), // V7 · FORM-03
  ],
  fields: [
   { label: t('box_filter_region'), name: 'box-filter-region', changeCall: 'setBoxFilter', changeArgs: "'region', this.value", current: filters.region,
     options: regions.map(r => ({ value: r, label: r === 'all' ? t('box_filter_all_regions') : getRegionDisplayName(r) })) },
   { label: t('box_filter_type'), name: 'box-filter-type', changeCall: 'setBoxFilter', changeArgs: "'type', this.value", current: filters.type,
     options: types.map(tp => ({ value: tp, label: tp === 'all' ? t('box_filter_all_types') : tp })) },
   { label: t('box_filter_evolution'), name: 'box-filter-evo', changeCall: 'setBoxFilter', changeArgs: "'evo', this.value", current: filters.evo,
     options: [{ value: 'all', label: t('box_filter_all_evo') }, { value: 'missing', label: t('box_filter_evo_missing') }] },
   { label: t('box_filter_iv'), name: 'box-filter-iv', changeCall: 'setBoxFilter', changeArgs: "'iv', this.value", current: filters.iv,
     options: [{ value: 'all', label: t('box_filter_all_iv') }, { value: 'complete', label: t('box_filter_iv_complete') }, { value: 'incomplete', label: t('box_filter_iv_incomplete') }] },
   { label: t('box_filter_ev'), name: 'box-filter-ev', changeCall: 'setBoxFilter', changeArgs: "'ev', this.value", current: filters.ev,
     options: [{ value: 'all', label: t('box_filter_all_ev') }, { value: 'complete', label: t('box_filter_ev_complete') }, { value: 'incomplete', label: t('box_filter_ev_incomplete') }] },
   { label: t('box_filter_rank'), name: 'box-filter-rank', changeCall: 'setBoxFilter', changeArgs: "'rank', this.value", current: filters.rank,
     options: ['all', 'E', 'D', 'C', 'B', 'A', 'S'].map(r => ({ value: r, label: r === 'all' ? t('box_filter_all_ranks') : r })) },
  ],
  search: wantSearch ? {
   value: filters.search || '',
   placeholder: t('box_filter_search_placeholder'),
   action: 'filter-box',
  } : null,
  reset: { label: t('box_filter_reset'), call: 'resetBoxFilters' },
 };
 return comps.filterBarHTML(model);
}
function setBoxFilter(key, value){
 const filters = ensureBoxFilters();
 if(!(key in BOX_FILTER_DEFAULTS)) return;
 filters[key] = value || BOX_FILTER_DEFAULTS[key];
 try{ if(pwLateLink('renderUnifiedGrid')) renderUnifiedGrid(); }catch(_){}
 try{ const tab = document.getElementById('tab-content'); if(tab && typeof _activeTab !== 'undefined' && _activeTab === 'box') renderBox(tab); }catch(_){}
 try{ saveGame(false); }catch(_){}
}
function resetBoxFilters(){
 G.boxFilters = {...BOX_FILTER_DEFAULTS};
 try{ if(pwLateLink('renderUnifiedGrid')) renderUnifiedGrid(); }catch(_){}
 try{ const tab = document.getElementById('tab-content'); if(tab && typeof _activeTab !== 'undefined' && _activeTab === 'box') renderBox(tab); }catch(_){}
 try{ saveGame(false); }catch(_){}
}
// Text search (same ergonomics as the bag): updates instantly without a save
// hit per keystroke; the filter is folded into the next regular save.
function setBoxSearch(value){
 ensureBoxFilters();
 G.boxFilters.search = String(value || '');
 try{ if(pwLateLink('renderUnifiedGrid')) renderUnifiedGrid(); }catch(_){}
 try{ const tab = document.getElementById('tab-content'); if(tab && typeof _activeTab !== 'undefined' && _activeTab === 'box') renderBox(tab); }catch(_){}
}

// Surface classique (consommateurs par identifiant libre, harnais VM).
if (typeof ensureBoxFilters !== 'undefined') { if (typeof window !== 'undefined') window.ensureBoxFilters = ensureBoxFilters; if (typeof globalThis !== 'undefined') globalThis.ensureBoxFilters = ensureBoxFilters; }
if (typeof getUnlockedDexIds !== 'undefined') { if (typeof window !== 'undefined') window.getUnlockedDexIds = getUnlockedDexIds; if (typeof globalThis !== 'undefined') globalThis.getUnlockedDexIds = getUnlockedDexIds; }
if (typeof getReachableSpecies !== 'undefined') { if (typeof window !== 'undefined') window.getReachableSpecies = getReachableSpecies; if (typeof globalThis !== 'undefined') globalThis.getReachableSpecies = getReachableSpecies; }
if (typeof getBoxFilterRegions !== 'undefined') { if (typeof window !== 'undefined') window.getBoxFilterRegions = getBoxFilterRegions; if (typeof globalThis !== 'undefined') globalThis.getBoxFilterRegions = getBoxFilterRegions; }
if (typeof getBoxFilterTypes !== 'undefined') { if (typeof window !== 'undefined') window.getBoxFilterTypes = getBoxFilterTypes; if (typeof globalThis !== 'undefined') globalThis.getBoxFilterTypes = getBoxFilterTypes; }
if (typeof isEvolutionTargetObtained !== 'undefined') { if (typeof window !== 'undefined') window.isEvolutionTargetObtained = isEvolutionTargetObtained; if (typeof globalThis !== 'undefined') globalThis.isEvolutionTargetObtained = isEvolutionTargetObtained; }
if (typeof canPokemonEvolveToUnowned !== 'undefined') { if (typeof window !== 'undefined') window.canPokemonEvolveToUnowned = canPokemonEvolveToUnowned; if (typeof globalThis !== 'undefined') globalThis.canPokemonEvolveToUnowned = canPokemonEvolveToUnowned; }
if (typeof pokemonSearchHaystack !== 'undefined') { if (typeof window !== 'undefined') window.pokemonSearchHaystack = pokemonSearchHaystack; if (typeof globalThis !== 'undefined') globalThis.pokemonSearchHaystack = pokemonSearchHaystack; }
if (typeof pokemonMatchesSearch !== 'undefined') { if (typeof window !== 'undefined') window.pokemonMatchesSearch = pokemonMatchesSearch; if (typeof globalThis !== 'undefined') globalThis.pokemonMatchesSearch = pokemonMatchesSearch; }
if (typeof pokemonMatchesBoxFilters !== 'undefined') { if (typeof window !== 'undefined') window.pokemonMatchesBoxFilters = pokemonMatchesBoxFilters; if (typeof globalThis !== 'undefined') globalThis.pokemonMatchesBoxFilters = pokemonMatchesBoxFilters; }
if (typeof applyPokemonBoxFilters !== 'undefined') { if (typeof window !== 'undefined') window.applyPokemonBoxFilters = applyPokemonBoxFilters; if (typeof globalThis !== 'undefined') globalThis.applyPokemonBoxFilters = applyPokemonBoxFilters; }
if (typeof boxFilterOptionHtml !== 'undefined') { if (typeof window !== 'undefined') window.boxFilterOptionHtml = boxFilterOptionHtml; if (typeof globalThis !== 'undefined') globalThis.boxFilterOptionHtml = boxFilterOptionHtml; }
if (typeof renderBoxFiltersHtml !== 'undefined') { if (typeof window !== 'undefined') window.renderBoxFiltersHtml = renderBoxFiltersHtml; if (typeof globalThis !== 'undefined') globalThis.renderBoxFiltersHtml = renderBoxFiltersHtml; }
if (typeof setBoxFilter !== 'undefined') { if (typeof window !== 'undefined') window.setBoxFilter = setBoxFilter; if (typeof globalThis !== 'undefined') globalThis.setBoxFilter = setBoxFilter; }
if (typeof resetBoxFilters !== 'undefined') { if (typeof window !== 'undefined') window.resetBoxFilters = resetBoxFilters; if (typeof globalThis !== 'undefined') globalThis.resetBoxFilters = resetBoxFilters; }
if (typeof setBoxSearch !== 'undefined') { if (typeof window !== 'undefined') window.setBoxSearch = setBoxSearch; if (typeof globalThis !== 'undefined') globalThis.setBoxSearch = setBoxSearch; }
// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
// Wave 43 — same measured lesson as closeConfirm (game-utils): this module
// lives in an early chunk evaluated BEFORE the engine chunk — microtask re-arm.
const __pwV43RegisterSetBoxSearch = () => { if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('setBoxSearch', setBoxSearch); } catch (_) {} } };
__pwV43RegisterSetBoxSearch();
if ((typeof PokeActions === 'undefined' || !PokeActions || (typeof PokeActions.has === 'function' && !PokeActions.has('setBoxSearch')))
  && typeof queueMicrotask === 'function') {
  queueMicrotask(__pwV43RegisterSetBoxSearch);
}

export {
  BOX_FILTER_DEFAULTS,
  FILTER_LEVEL_EVO_MAP,
  FILTER_STONE_EVO,
  ensureBoxFilters,
  getUnlockedDexIds,
  getReachableSpecies,
  getBoxFilterRegions,
  getBoxFilterTypes,
  isEvolutionTargetObtained,
  canPokemonEvolveToUnowned,
  pokemonSearchHaystack,
  pokemonMatchesSearch,
  pokemonMatchesBoxFilters,
  applyPokemonBoxFilters,
  boxFilterOptionHtml,
  renderBoxFiltersHtml,
  setBoxFilter,
  resetBoxFilters,
  setBoxSearch,
};
