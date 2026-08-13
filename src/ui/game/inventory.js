// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
// Inventory UI state lives on the shared global object: unit harnesses drive
// it directly (sb._invCat = 'held'…) and the classic app mutates it through
// the click handlers — a lexical binding would shadow those external writes.
if (typeof globalThis._invCat === 'undefined') globalThis._invCat = 'held';
if (typeof globalThis._invCatTouched === 'undefined') globalThis._invCatTouched = false; // phase 27: tab explicitly chosen by the player
if (typeof globalThis._invSort === 'undefined') globalThis._invSort = 'name';
if (typeof globalThis._invSearch === 'undefined') globalThis._invSearch = ''; // phase 26: text search (same ergonomics as the PC box)

function isEvolutionItem(key) {
  if (typeof normalizeItemKey === 'function') key = normalizeItemKey(key);
  const itm = (typeof ITEMS !== 'undefined' && ITEMS) ? ITEMS[key] : null;
  if (!itm) return false;
  if (itm.type === 'stone' || itm.type === 'evolution' || itm.evolution === true) return true;
  const HELD_EVO_KEYS = [
    'metal_coat', 'kings_rock', 'dragon_scale', 'upgrade',
    'deep_sea_tooth', 'deep_sea_scale', 'prism_scale',
    'sunstone', 'moonstone', 'firestone', 'waterstone', 'thunderstone', 'leafstone'
  ];
  if (HELD_EVO_KEYS.includes(key)) return true;
  if (typeof STONE_EVO !== 'undefined' && STONE_EVO) {
    for (const pid in STONE_EVO) {
      if (STONE_EVO[pid] && STONE_EVO[pid][key]) return true;
    }
  }
  return false;
}

function itemCat(key){
 // Phase 26: berries are held items ('berry' category removed);
 // the "Misc." filter disappears — anything not classified elsewhere
 // joins "special" (keys, candies, supplies).
 const itm=ITEMS[key]; if(!itm) return 'special';
 const isCtCs = (typeof isCtCsItem==='function') ? isCtCsItem(key) : (itm.type==='ct' || itm.type==='cs');
 if(isCtCs) return 'ct_cs';
 if(isEvolutionItem(key)) return 'evolution';
 if(itm.type==='fossil') return 'fossil';
 if(itm.type==='treasure') return 'treasure';
 if(itm.type==='key') return 'special';
 if(itm.type==='candy' || itm.type==='special') return 'special';
 if(itm.type==='held' || itm.category || itm.buff || String(key).endsWith('_berry')) return 'held';
 return 'special';
}
function setInvCat(c){
 _invCat=c; _invCatTouched=true;
 let el=document.getElementById('fs-panel-content');
 if(!el) el=document.getElementById('tab-content');
 if(el) renderInventory(el);
}

function setInvSort(s){
 _invSort=s;
 let el=document.getElementById('fs-panel-content');
 if(!el) el=document.getElementById('tab-content');
 if(el) renderInventory(el);
}
// Phase 26: recherche in the sac (saisie of the barre unifiee).
function setInvSearch(v){
 _invSearch = String(v || '').toLowerCase().trim();
 let el=document.getElementById('fs-panel-content');
 if(!el) el=document.getElementById('tab-content');
 if(el) renderInventory(el);
}
// Phase 26: "Reset" button identical to the PC box one.
function resetInvFilters(){
 _invCat='held'; _invCatTouched=false; _invSort='name'; _invSearch='';
 let el=document.getElementById('fs-panel-content');
 if(!el) el=document.getElementById('tab-content');
 if(el) renderInventory(el);
}

function renderInventory(el){
 const entries=Object.entries(G.inventory).filter(([k,v])=>v>0 && ITEMS[k]);
 // Bag in TABS (same ergonomics as the PC box pages).
 const cats=[
 {id:'held', label: (typeof t==='function'?t('cat_held_items'):'Objets tenus')},
 {id:'ct_cs', label: "CT / CS"},
 {id:'evolution', label: (typeof t==='function'?t('cat_evolution'):'Evolution')},
 {id:'fossil', label: (typeof t==='function'?t('cat_fossils'):'Fossiles')},
 {id:'treasure', label: t("m.inventory.8")},
 {id:'special', label: (typeof t==='function'?t('cat_key_special'):'Key Items & Special')}
 ];
 // Every sort key exposes BOTH directions (user request: "ordre et ordre
 // applies to every sort"): name A→Z / Z→A, quantity 9→0 / 0→9.
 const sorts=[
 {id:'name', label: t('sort_name_asc')},
 {id:'name_desc', label: t('sort_name_desc')},
 {id:'qty', label: t('sort_quantity_desc')},
 {id:'qty_asc', label: t('sort_quantity_asc')}
 ];
 // The filter/sort toolbar lives OUTSIDE the scroller, in the panel's
 // dedicated fixed slot (fs-panel-filters): it can never scroll away or
 // leave a gap where the grid bleeds through (DS contract).
 const filterBar = document.getElementById('fs-panel-filters');
 const counts={}; cats.forEach(c=>counts[c.id]=0);
 // FIX (wave 15, user feedback): the inner variable shadowed `c` —
 // `c.id` on a STRING is undefined, so every category stayed at 0.
 entries.forEach(([k])=>{ const cat=itemCat(k); counts[cat]=(counts[cat]||0)+1; });
 if(window._equipCallback) _invCat='held';
 if(!_invCatTouched && (counts[_invCat]||0)===0){
  const firstNonEmpty = cats.find(c=>(counts[c.id]||0)>0);
  if(firstNonEmpty) _invCat = firstNonEmpty.id;
 }
 if(!cats.some(c=>c.id===_invCat)) _invCat='held';
 if(!sorts.some(o=>o.id===_invSort)) _invSort='name';
 // Search = GLOBAL (across all tabs); otherwise the active tab filters.
 let filtered = _invSearch ? entries : entries.filter(([k])=>itemCat(k)===_invCat);
 if(_invSearch) filtered = filtered.filter(([k]) => (getItemName(k)+' '+k+' '+(typeof getItemDesc==='function'?getItemDesc(k):'')).toLowerCase().includes(_invSearch));
 if(_invSort==='qty' || _invSort==='qty_asc'){
  // 'qty' keeps its historical meaning (highest first); 'qty_asc' reverses.
  const sgn=_invSort==='qty_asc'?1:-1;
  filtered.sort((a,b) => sgn*(a[1] - b[1]) || getItemName(a[0]).localeCompare(getItemName(b[0])));
 } else if(_invSort==='name_desc'){
  filtered.sort((a,b) => getItemName(b[0]).localeCompare(getItemName(a[0])));
 } else {
  filtered.sort((a,b) => getItemName(a[0]).localeCompare(getItemName(b[0])));
 }
 const _eqFinder = (typeof itemEquippedOnTeam==='function') ? itemEquippedOnTeam : () => null;
 const model = {
  tabs: cats.map(c=>({ id:c.id, label:c.label, count:counts[c.id]||0, active:_invCat===c.id })),
  sorts: sorts.map(o=>({ id:o.id, label:o.label, active:_invSort===o.id })),
  sortLabel: t('sort_label'),
  search: { value: _invSearch, placeholder: t('bag_search_placeholder') },
  resetLabel: t('box_filter_reset'),
  emptyInventory: !entries.length,
  emptyLabel: t('inv_empty'),
  noResultsLabel: t("m.inventory.6"),
  items: filtered.map(([key,qty])=>{ const eq=_eqFinder(key); return { key:key, qty:qty, name:getItemName(key), iconHtml:itemSpriteHtml(key,40), equippedName:(eq&&eq.name)||null }; })
 };
 // Rebuilt display: the bag is rendered by the ECS design-system screen
 // (zero legacy markup below this line).
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.BagView) throw new Error('[ui] PokeUI views not loaded (BagView)');
 const parts = views.BagView.toHTML(model);
 if(filterBar){ filterBar.style.display = 'block'; _pwSetHtmlSafe(filterBar, parts.filters); }
 _pwSetHtmlSafe(el, filterBar ? parts.content : (parts.filters + parts.content));
 const invSearchInput = (filterBar && typeof filterBar.querySelector==='function' ? filterBar.querySelector('.box-filter-search') : null) || (el && typeof el.querySelector==='function' ? el.querySelector('.box-filter-search') : null);
 if(invSearchInput && _invSearch){ try{ invSearchInput.focus({preventScroll:true}); }catch(_){ invSearchInput.focus(); } invSearchInput.setSelectionRange(invSearchInput.value.length, invSearchInput.value.length); }
}

// "Usable" item from the bag: a left click triggers its usage (Pokemon
// list, sale…) instead of the info panel. The panel stays accessible via
// right-click / long press (data-context-call="openItemInfo").
function isUsableBagItem(key){
  if (typeof normalizeItemKey === 'function') key = normalizeItemKey(key);
  const itm=(typeof ITEMS!=='undefined' && ITEMS) ? ITEMS[key] : null;
  if(!itm) return false;
  if(itm.type==='treasure') return true;                                    // sale screen
  if(isEvolutionItem(key)) return true;                                     // evolution list
  const isCtCs = (typeof isCtCsItem==='function') ? isCtCsItem(key) : (itm.type==='ct' || itm.type==='cs');
  if(isCtCs) return true;                                                   // move teaching
  if(itm.type==='candy' || key==='rarecandy') return true;                  // rare candy
  return false;
}

function handleInventoryClick(key){
  // Resolution of alias (ex. fire_stone → firestone) for the recherche of the
  // catalogue, all in conservant the cle of origine for the flux of usage.
  const lookupKey = (typeof normalizeItemKey === 'function') ? normalizeItemKey(key) : key;
  const itm = ITEMS[key] || ITEMS[lookupKey];
  if(!itm) return;
  // If in equip mode (from team), call the equip callback
  if(window._equipCallback) {
    // Phase 18: if the clicked item is not EQUIPPABLE (stone, TM,
    // treasure…), we do NOT consume the callback and we flag the error —
    // before, the callback was lost and the next click opened the info
    // panel.
    const equippable = (typeof isHeldEquippableItem === 'function') ? isHeldEquippableItem(key) : !!(itm.type === 'held' || itm.buff);
    if(!equippable){
      if(typeof notify === 'function' && typeof tr === 'function') notify(tr('item_not_holdable', {item:(typeof getItemName==='function'?getItemName(key):key)}), 'var(--red)');
      return;
    }
    const cb = window._equipCallback;
    window._equipCallback = null;
    cb(key);
    return;
  }
  // Left-click on a usable item (TM/HM, evolution item, candy,
  // treasure) → usage flow (onInventoryClick opens the Pokemon list or
  // the dedicated screen). Other items show their info sheet.
  if(isUsableBagItem(key) && typeof onInventoryClick === 'function') {
    onInventoryClick(key);
    return;
  }
  if(typeof openItemInfo === 'function') {
    openItemInfo(key);
  } else if(typeof onInventoryClick === 'function') {
    onInventoryClick(key);
  }
}


// --- Migrated to ES module, globals exposed ---
if (typeof isEvolutionItem !== 'undefined') { if (typeof window !== 'undefined') window.isEvolutionItem = isEvolutionItem; if (typeof globalThis !== 'undefined') globalThis.isEvolutionItem = isEvolutionItem; }
if (typeof itemCat !== 'undefined') { if (typeof window !== 'undefined') window.itemCat = itemCat; if (typeof globalThis !== 'undefined') globalThis.itemCat = itemCat; }
if (typeof isUsableBagItem !== 'undefined') { if (typeof window !== 'undefined') window.isUsableBagItem = isUsableBagItem; if (typeof globalThis !== 'undefined') globalThis.isUsableBagItem = isUsableBagItem; }
if (typeof setInvCat !== 'undefined') { if (typeof window !== 'undefined') window.setInvCat = setInvCat; if (typeof globalThis !== 'undefined') globalThis.setInvCat = setInvCat; }
if (typeof setInvSort !== 'undefined') { if (typeof window !== 'undefined') window.setInvSort = setInvSort; if (typeof globalThis !== 'undefined') globalThis.setInvSort = setInvSort; }
if (typeof setInvSearch !== 'undefined') { if (typeof window !== 'undefined') window.setInvSearch = setInvSearch; if (typeof globalThis !== 'undefined') globalThis.setInvSearch = setInvSearch; }
if (typeof resetInvFilters !== 'undefined') { if (typeof window !== 'undefined') window.resetInvFilters = resetInvFilters; if (typeof globalThis !== 'undefined') globalThis.resetInvFilters = resetInvFilters; }
if (typeof renderInventory !== 'undefined') { if (typeof window !== 'undefined') window.renderInventory = renderInventory; if (typeof globalThis !== 'undefined') globalThis.renderInventory = renderInventory; }
if (typeof handleInventoryClick !== 'undefined') { if (typeof window !== 'undefined') window.handleInventoryClick = handleInventoryClick; if (typeof globalThis !== 'undefined') globalThis.handleInventoryClick = handleInventoryClick; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  isEvolutionItem,
  itemCat,
  isUsableBagItem,
  setInvCat,
  setInvSort,
  setInvSearch,
  resetInvFilters,
  renderInventory,
  handleInventoryClick,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('renderInventory', renderInventory); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('setInvSearch', setInvSearch); } catch (_) {} }

