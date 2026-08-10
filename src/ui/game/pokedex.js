// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.

// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function findPokemonSources(id){
 const out=[];
 const add=(kind, label)=>{ if(label && !out.some(x=>x.kind===kind&&x.label===label)) out.push({kind,label}); };
 for(const [locId,loc] of Object.entries(LOCS||{})) if((loc.wild||[]).some(w=>Number(w[0])===Number(id))) add('zone', getLocName(locId));
 for(const [locId,loc] of Object.entries(LOCS_JOHTO||{})) if((loc.wild||[]).some(w=>Number(w[0])===Number(id))) add('zone', getLocName(locId));
 for(const [locId,loc] of Object.entries(typeof LOCS_HOENN !== 'undefined' ? LOCS_HOENN : {})) if((loc.wild||[]).some(w=>Number(w[0])===Number(id))) add('zone', getLocName(locId));
 const BABY_PARENTS = {
   172: [25, 26], 173: [35, 36], 174: [39, 40],
   236: [106, 107, 237], 238: [124], 239: [125], 240: [126],
   298: [183, 184], 360: [202]
 };
 if (BABY_PARENTS[id]) {
   const parents = BABY_PARENTS[id].map(p => getPokeName(p)).join(' / ');
   add('evo', `Éclosion en Garderie (Parent : ${parents})`);
 }

 for(const base in (LEVEL_EVO_MAP||{})) if(Number(LEVEL_EVO_MAP[base])===Number(id)) add('evo', `${getPokeName(Number(base))} (${t('level_word')} ${EVO_LEVELS[base]||'?'})`);
 for(const base in (STONE_EVO||{})) for(const stone in STONE_EVO[base]) if(Number(STONE_EVO[base][stone])===Number(id)) add('evo', `${getPokeName(Number(base))} + ${getItemName(stone)}`);
 if(typeof FOSSIL_REVIVE_MAP !== 'undefined') for(const fk in FOSSIL_REVIVE_MAP) if(Number(FOSSIL_REVIVE_MAP[fk])===Number(id)) add('fossil', getItemName(typeof getFossilDisplayKey==='function'?getFossilDisplayKey(fk):fk));
 if((STORY_QUESTS||[]).some(q=>Number(q.rewardPoke)===Number(id))) add('quest', (typeof t==='function'?t('main_quest_label'):'Main Quest'));
 if(!out.length) add('unknown', (typeof t==='function'?t('not_specified'):'Not specified'));
 return out;
}
function getDexFlavor(id){
 const lang = (G && G.lang) || 'fr';
 const data = (typeof POKEDEX_FLAVOR !== 'undefined') ? POKEDEX_FLAVOR : null;
 return (data && data[lang] && data[lang][id]) || (data && data.en && data.en[id]) || '';
}

// ── Dex filters/sort state (session-scoped, like the bag's) ────────────
// Unified FilterBar (same DS component as the bag / PC box) — region,
// type, shiny, rank, name search, sort. NO iv/ev/evolution/favorite/lock.
let _dexFilters = { region: 'all', type: 'all', shiny: 'all', rank: 'all', search: '', sort: 'number' };
function _dexRerender(){
 const el = document.getElementById('fs-panel-content') || document.getElementById('tab-content');
 if(el) renderPokedex(el);
}
function setDexFilter(key, value){
 if(!(key in _dexFilters)) return;
 _dexFilters[key] = (value == null || value === '') ? (key === 'search' ? '' : (key === 'sort' ? 'number' : 'all')) : value;
 _dexRerender();
}
function setDexSearch(value){ _dexFilters.search = String(value || ''); _dexRerender(); }
function resetDexFilters(){ _dexFilters = { region: 'all', type: 'all', shiny: 'all', rank: 'all', search: '', sort: 'number' }; _dexRerender(); }

function renderPokedex(el){
 const visibleIds = (typeof getUnlockedDexIds==='function') ? getUnlockedDexIds() : PD.slice(1).map((_,i)=>i+1).filter(id=>PD[id]);
 const total = visibleIds.length;
 const caught = visibleIds.filter(id=>G.pokedex && G.pokedex[id] && G.pokedex[id].caught).length;
 const seen = visibleIds.filter(id=>G.pokedex && G.pokedex[id] && (G.pokedex[id].seen || G.pokedex[id].caught)).length;
 const shinyCount = visibleIds.filter(id=>isSpeciesShiny(id)).length;
 const stats = [
 `${t('pokedex_seen')}: <b class="pw-text-md">${seen}</b>`,
 `${t('pokedex_caught')}: <b class="pw-text-md">${caught}</b> / ${total}`,
 `${t('pokedex_shiny')}: <b class="pw-text-md">${shinyCount}</b> / ${total}`,
 `${t('pokedex_regions')}: <b class="pw-text-md">${(typeof getUnlockedRegionsForPokedex==='function'?getUnlockedRegionsForPokedex():['kanto']).map(r=>getRegionDisplayName(r)).join(', ')}</b>`
 ];
 // Regional Shiny Charm info — lives in the FIXED info bar, never in the grid.
 let charm = null;
 try {
  const regions = (typeof getShinyCharmCompletedRegions==='function') ? getShinyCharmCompletedRegions() : [];
  const hasCharm = !!(G.inventory && G.inventory['shiny_charm'] > 0);
  const unlocked = (typeof getUnlockedRegionsForPokedex==='function') ? getUnlockedRegionsForPokedex() : ['kanto'];
  charm = {
   title: hasCharm
    ? ((G.lang==='en')
      ? '✨ Shiny Charm — 1/2048 on species from completed Pokédex regions only'
      : '✨ Charme Chroma — taux 1/2048 uniquement sur les espèces des dex 100 %')
    : ((G.lang==='en')
      ? '✨ Complete any regional Pokédex at 100% to obtain the Shiny Charm (1/2048 regional)'
      : '✨ Complétez un Pokédex régional à 100 % pour obtenir le Charme Chroma (1/2048 régional)'),
   regions: unlocked.map(r => {
    const name = (typeof getRegionDisplayName==='function') ? getRegionDisplayName(r) : r;
    const totalR = (typeof getRegionPokedexTotal==='function') ? getRegionPokedexTotal(r) : '?';
    const caughtR = (typeof countCaughtInRegion==='function') ? countCaughtInRegion(r) : 0;
    const done = regions.includes(r) || (typeof isRegionDexComplete==='function' && isRegionDexComplete(r));
    const pct = (typeof totalR==='number' && totalR>0) ? Math.min(100, Math.round(caughtR/totalR*100)) : 0;
    return { name:name, caught:caughtR, total:totalR, pct:pct, done:!!done };
   })
  };
 } catch(_){ charm = null; }
 // ── Filters/sort pipeline (stats above stay GLOBAL counters) ──────────
 const f = _dexFilters;
 let ids = visibleIds.slice();
 if(f.region !== 'all' && typeof getPokemonRegion === 'function') ids = ids.filter(id => getPokemonRegion(id) === f.region);
 if(f.type !== 'all') ids = ids.filter(id => PD[id] && (PD[id][1] === f.type || PD[id][2] === f.type));
 if(f.shiny === 'shiny') ids = ids.filter(id => isSpeciesShiny(id));
 else if(f.shiny === 'normal') ids = ids.filter(id => !isSpeciesShiny(id));
 if(f.rank !== 'all' && typeof getPokemonRank === 'function') ids = ids.filter(id => getPokemonRank(id) === f.rank);
 if(f.search){
  const q = f.search.toLowerCase().trim();
  if(q) ids = ids.filter(id => ((typeof getPokeName === 'function' ? getPokeName(id) : '') || '').toLowerCase().includes(q));
 }
 // Every sort key exposes BOTH directions (user request): number 1→9 / 9→1,
 // name A→Z / Z→A, rank S→E / E→S. Tiebreak stays the Pokédex number (asc).
 if(f.sort === 'name') ids.sort((a, b) => getPokeName(a).localeCompare(getPokeName(b)) || (a - b));
 else if(f.sort === 'name_desc') ids.sort((a, b) => getPokeName(b).localeCompare(getPokeName(a)) || (a - b));
 else if(f.sort === 'rank' && typeof rankValue === 'function' && typeof getPokemonRank === 'function') ids.sort((a, b) => (rankValue(getPokemonRank(b)) - rankValue(getPokemonRank(a))) || (a - b));
 else if(f.sort === 'rank_asc' && typeof rankValue === 'function' && typeof getPokemonRank === 'function') ids.sort((a, b) => (rankValue(getPokemonRank(a)) - rankValue(getPokemonRank(b))) || (a - b));
 else if(f.sort === 'number_desc') ids.sort((a, b) => b - a);
 else ids.sort((a, b) => a - b);

 // Unified FilterBar model (same component as the bag / PC box).
 const regionsList = (typeof getUnlockedRegionsForPokedex === 'function') ? getUnlockedRegionsForPokedex() : ['kanto'];
 const dexTypes = ['all'];
 for(const id of visibleIds){ const pd = PD[id]; if(!pd) continue; if(pd[1] && !dexTypes.includes(pd[1])) dexTypes.push(pd[1]); if(pd[2] && !dexTypes.includes(pd[2])) dexTypes.push(pd[2]); }
 const filterBarModel = {
  className: 'dex-filterbar',
  chips: [
   { label: t('box_filter_all_shiny'), active: f.shiny === 'all', call: 'setDexFilter', callArgs: "'shiny','all'" },
   { label: '★ ' + t('box_filter_shiny_only'), active: f.shiny === 'shiny', call: 'setDexFilter', callArgs: "'shiny','shiny'" },
   { label: t('box_filter_non_shiny_only'), active: f.shiny === 'normal', call: 'setDexFilter', callArgs: "'shiny','normal'" },
  ],
  fields: [
   { label: t('box_filter_region'), name: 'dex-region', changeCall: 'setDexFilter', changeArgs: "'region', this.value", current: f.region,
     options: [{ value: 'all', label: t('box_filter_all_regions') }, ...regionsList.map(r => ({ value: r, label: getRegionDisplayName(r) }))] },
   { label: t('box_filter_type'), name: 'dex-type', changeCall: 'setDexFilter', changeArgs: "'type', this.value", current: f.type,
     options: dexTypes.map(tp => ({ value: tp, label: tp === 'all' ? t('box_filter_all_types') : tp })) },
   { label: t('box_filter_rank'), name: 'dex-rank', changeCall: 'setDexFilter', changeArgs: "'rank', this.value", current: f.rank,
     options: ['all', 'E', 'D', 'C', 'B', 'A', 'S'].map(r => ({ value: r, label: r === 'all' ? t('box_filter_all_ranks') : r })) },
   { label: t('sort_label'), name: 'dex-sort', changeCall: 'setDexFilter', changeArgs: "'sort', this.value", current: f.sort,
     options: [{ value: 'number', label: t('dex_sort_number_asc') }, { value: 'number_desc', label: t('dex_sort_number_desc') },
               { value: 'name', label: t('dex_sort_name_asc') }, { value: 'name_desc', label: t('dex_sort_name_desc') },
               { value: 'rank', label: t('dex_sort_rank_desc') }, { value: 'rank_asc', label: t('dex_sort_rank_asc') }] },
  ],
  search: { value: f.search, placeholder: t('box_filter_search_placeholder'), action: 'filter-dex' },
  reset: { label: t('box_filter_reset'), call: 'resetDexFilters' },
 };

 // Species cells — sprites resolved through the canonical source (same as
 // the classic spriteImg helper) and rendered by the single PokemonSprite
 // component (canonical beige circle, clamped sizes).
 const cells = ids.map((id)=>{
  const pd = PD[id];
  if(!pd) return null;
  const entry = G.pokedex[id];
  const isCaught = !!(entry && entry.caught);
  const isSeen = !!(entry && (entry.seen || entry.caught));
  const isShiny = !!isSpeciesShiny(id);
  const num = (typeof DEX_MAP !== 'undefined' && DEX_MAP && DEX_MAP[String(id)] != null) ? DEX_MAP[String(id)] : Number(id);
  const bucket = isShiny ? 'frontShiny' : 'front';
  const src = (typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA && SPRITE_DATA[bucket]) ? (SPRITE_DATA[bucket][String(num)] || null) : null;
  return { id:id, name:getPokeName(id), seen:isSeen, caught:isCaught, shiny:isShiny, imgSrc:src, emoji:pd[12]||'' };
 }).filter(Boolean);
 // Rebuilt display (ECS design system): charm + stats in the fixed bar,
 // species-only grid in the scroller.
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.PokedexView) throw new Error('[ui] PokeUI views not loaded (PokedexView)');
 const parts = views.PokedexView.toHTML({ stats:stats, charm:charm, cells:cells, filterBar: filterBarModel });
 const dexFilterBar = document.getElementById('fs-panel-filters');
 if(dexFilterBar){
  dexFilterBar.style.display = 'flex';
  dexFilterBar.style.flexDirection = 'column';
  dexFilterBar.style.gap = '8px';
  dexFilterBar.style.alignItems = 'stretch';
  _pwSetHtmlSafe(dexFilterBar, parts.filters);
 }
 _pwSetHtmlSafe(el, dexFilterBar ? parts.content : parts.full);
 // Name search: keep the focus while typing (same contract as the bag).
 try{
  if(_dexFilters.search && el && typeof el.querySelector === 'function'){
   const host = (dexFilterBar && typeof dexFilterBar.querySelector === 'function') ? dexFilterBar : el;
   const si = host.querySelector('.pw-filter-input[data-action="filter-dex"]');
   if(si){ si.focus({preventScroll:true}); si.setSelectionRange(si.value.length, si.value.length); }
  }
 }catch(_){}
}

function openDexEntry(id){
 const pd = PD[id];
 if(!pd) return;
 const name = getPokeName(id);
 const t1 = pd[1], t2 = pd[2];
 const bhp = pd[3] || 0, batk = pd[4] || 0, bdef = pd[5] || 0, bspa = pd[6] || batk, bspd = pd[7] || bdef, bspe = pd[8] || 0;
 const moves = Array.isArray(pd[9]) ? pd[9] : [];
 const emoji = pd[12] || '';
 const isShiny = isSpeciesShiny(id);
 const inner = document.getElementById('poke-modal-inner');
 if(!inner) return;
 const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || typeof views.DexDetailView !== 'function') throw new Error('[ui] PokeUI views not loaded (DexDetailView)');
 const desc = getDexFlavor(id);
 const sources = findPokemonSources(id);
 const tals = (typeof getSpeciesTalents === 'function') ? getSpeciesTalents(id) : [];
 // Wave 19 (ECS DS): the sheet is rendered from zero by DexDetailView —
 // this adapter only shapes the (localized) model. Contracts kept:
 // .poke-detail-inner on the host, .poke-detail-title + close-poke-modal
 // cross, legacy-call chips (openMoveInfo/openAbilityInfo), the shared
 // evolution-methods block and the canonical 96px sprite disc.
 inner.classList.add('poke-detail-inner');
 _pwSetHtmlSafe(inner, views.DexDetailView.toHTML({
  id: id,
  name: name,
  shiny: isShiny,
  spriteHtml: spriteImg(id, emoji, { size: 'team', shiny: isShiny }),
  typesHtml: typeSpan(t1) + (t2 ? typeSpan(t2) : ''),
  flavorLabel: (typeof t === 'function' && t('description')) || 'Description',
  flavor: desc || (t('dict_description_unavailable') || 'Description unavailable for now.'),
  evolutionsHtml: getEvolutionMethodsHtml(id),
  sourcesLabel: t('dict_where_find') || 'Where to find it',
  sources: sources.map(s => s.label),
  movesLabel: t('pokedex_moves'),
  moves: moves.map(mv => ({ key: mv, label: getMoveName(mv) || mv })),
  noMovesLabel: t('dict_no_moves_listed') || 'No moves listed.',
  talentsLabel: t('pokemon_talents'),
  talents: tals.map(tal => ({ key: tal, label: (typeof getTalentName === 'function' ? getTalentName(tal) : (TALENTS_FULL[tal]?.name || tal)) })),
  noTalentsLabel: t('dict_no_abilities_listed') || 'No abilities listed.',
  statsLabel: t('dict_base_stats') || 'Base stats',
  stats: [
   { label: 'PV', value: bhp }, { label: 'ATK', value: batk }, { label: 'DEF', value: bdef },
   { label: 'ASP', value: bspa }, { label: 'DSP', value: bspd }, { label: 'VIT', value: bspe },
  ],
 }));
 document.getElementById('poke-modal').classList.add('open');
}


// --- Migrated to ES module, globals exposed ---
if (typeof findPokemonSources !== 'undefined') { if (typeof window !== 'undefined') window.findPokemonSources = findPokemonSources; if (typeof globalThis !== 'undefined') globalThis.findPokemonSources = findPokemonSources; }
if (typeof renderPokedex !== 'undefined') { if (typeof window !== 'undefined') window.renderPokedex = renderPokedex; if (typeof globalThis !== 'undefined') globalThis.renderPokedex = renderPokedex; }
if (typeof setDexFilter !== 'undefined') { if (typeof window !== 'undefined') window.setDexFilter = setDexFilter; if (typeof globalThis !== 'undefined') globalThis.setDexFilter = setDexFilter; }
if (typeof setDexSearch !== 'undefined') { if (typeof window !== 'undefined') window.setDexSearch = setDexSearch; if (typeof globalThis !== 'undefined') globalThis.setDexSearch = setDexSearch; }
if (typeof resetDexFilters !== 'undefined') { if (typeof window !== 'undefined') window.resetDexFilters = resetDexFilters; if (typeof globalThis !== 'undefined') globalThis.resetDexFilters = resetDexFilters; }
if (typeof openDexEntry !== 'undefined') { if (typeof window !== 'undefined') window.openDexEntry = openDexEntry; if (typeof globalThis !== 'undefined') globalThis.openDexEntry = openDexEntry; }



// --- Exported globals ---
if (typeof getDexFlavor !== 'undefined') { if (typeof window !== 'undefined') window.getDexFlavor = getDexFlavor; if (typeof globalThis !== 'undefined') globalThis.getDexFlavor = getDexFlavor; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  findPokemonSources,
  renderPokedex,
  setDexFilter,
  setDexSearch,
  resetDexFilters,
  openDexEntry,
  getDexFlavor,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('setDexSearch', setDexSearch); } catch (_) {} }
