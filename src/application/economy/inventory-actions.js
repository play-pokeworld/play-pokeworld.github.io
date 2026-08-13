// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function _getActiveContent(){
 const fsContent = document.getElementById('fs-panel-content');
 if(fsContent && document.getElementById('fullscreen-panel-modal')?.style.display === 'flex'){
 return fsContent;
 }
 return document.getElementById('tab-content');
}

// sellTreasure is NOT defined here anymore: the sale rule (fossil guard,
// quantity clamp, inventory decrement, wallet credit) runs in the
// `economy:market` ECS system on the Wallet/InventoryItems components
// (src/application/market-system.js, wave 33 §1.3). The name keeps its exact
// public surface, re-exposed from the application layer.

function onInventoryClick(key){
 const itm=ITEMS[key]; if(!itm) return;

 if(itm.type === 'treasure'){
 const qty = G.inventory[key] || 0;
 const el = _getActiveContent();
 if(qty <= 0){ showTab('inventory'); return; }
 _pwSetHtmlSafe(el, `<div class="loc-title">${t("m.inventory.5")} ${itemSpriteHtml(key, 24)} ${getItemName(key)}</div>
 <div class="loc-sub">${tr("m.treasure_sell_sub", {qty: qty, value: (itm.value?.toLocaleString()||'2 000')})}</div>
 <div class="pw-starter-actions">
 <button class="hbtn extracted-bridge-style-040" data-action="legacy-call" data-call="sellTreasure" data-call-args="'${key}', 1">${t('sell_one')} (+${(itm.value||2000).toLocaleString()}₽)</button>
 ${qty>1?`<button class="hbtn extracted-bridge-style-041" data-action="legacy-call" data-call="sellTreasure" data-call-args="'${key}', ${qty}">${t('sell_all')} (+${((itm.value||2000)*qty).toLocaleString()}₽)</button>`:''}
 <button class="hbtn extracted-bridge-style-042" data-action="return-inventory" class="hbtn">${t('back_bag')}</button>
 </div>`);
 return;
 }

 if((typeof isEvolutionItem === 'function' && isEvolutionItem(key)) || itm.type === 'stone' || itm.type === 'evolution' || itm.evolution === true){
 const qty = G.inventory[key] || 0;
 const el = _getActiveContent();
 if(qty <= 0){
   const fsM=document.getElementById('fullscreen-panel-modal');
   if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}
   else{showTab('inventory')}
   return;
 }
 const candidates = [];
 const stoneMap = (typeof STONE_EVO !== 'undefined' && STONE_EVO) ? STONE_EVO : {};
 const normKey = (typeof normalizeItemKey === 'function') ? normalizeItemKey(key) : key;
 G.team.forEach((p, idx) => {
 if(!p) return;
 const pid = Number(p.id);
 const targetId = (stoneMap[pid] && (stoneMap[pid][normKey] || stoneMap[pid][key]))
   || (stoneMap[p.id] && (stoneMap[p.id][normKey] || stoneMap[p.id][key]));
 // always list compatible Pokemon, even when the evolution target is already owned
 if(targetId) candidates.push({p, loc:'team', idx, targetId: Number(targetId)});
 });
 Object.entries(G.collection||{}).forEach(([idStr, p]) => {
 if(!p) return;
 const pid = Number(p.id);
 const targetId = (stoneMap[pid] && (stoneMap[pid][normKey] || stoneMap[pid][key]))
   || (stoneMap[p.id] && (stoneMap[p.id][normKey] || stoneMap[p.id][key]));
 if(targetId) candidates.push({p, loc:'box', idStr, targetId: Number(targetId)});
 });
 // "Species concerned" section (Pokedex reference) when no mon is in team/box
 let catalogHtml = '';
 if(candidates.length === 0){
   const catalog = [];
   for(const pidStr of Object.keys(stoneMap)){
     const map = stoneMap[pidStr];
     const tid = map && (map[normKey] || map[key]);
     if(tid) catalog.push({ base: Number(pidStr), target: Number(tid) });
   }
   if(catalog.length){
     catalogHtml = '<div class="pw-text-sm pw-light1" style="margin:8px 0;">'
       + ((typeof t==='function'&&t('evo_catalog_hint'))||'Espèces pouvant utiliser cet objet :')
       + '</div><div class="pw-starter-grid">'
       + catalog.map(({base,target})=>{
           const ownedT = (typeof speciesOwned==='function') ? speciesOwned(target) : false;
           const ownedB = (typeof speciesOwned==='function') ? speciesOwned(base) : false;
           return `<div class="pw-starter-card" style="opacity:${ownedB?1:0.55}" title="#${base} → #${target}">
             <div class="pw-starter-orb">${typeof spriteImg==='function'?spriteImg(base,null,{size:56}):''}
             <div class="evo-target-label">→ ${(typeof getPokeName==='function'?getPokeName(target):target)}${ownedT?' ✓':''}</div></div></div>`;
         }).join('') + '</div>';
   }
 }

 const headerHtml = `<div class="pw-sticky-header">
 <div class="pw-row">
 <div class="pw-icon-box">${itemSpriteHtml(key, 40)}</div>
 <div>
 <div class="pw-sticky-title">${t('use_stone')} ${getItemName(key)}</div>
 <div class="pw-text-sm pw-light1">${t('stone_sub')}</div>
 </div>
 </div>
 <div class="pw-count-badge">&times;${qty}</div>
 </div>`;

 let candidatesHtml = '';
 if(candidates.length > 0){
 candidatesHtml = '<div class="pw-starter-grid">' + candidates.map(({p, loc, idx, idStr, targetId}) => {
 const owned = speciesOwned(targetId);
 const targetName = getPokeName(targetId);
 const callName = loc === 'team' ? 'tryStoneEvo' : 'tryBoxStoneEvo';
 const callArgs = loc === 'team' ? `${idx},'${key}'` : `'${idStr}','${key}'`;
 return `<div class="pw-starter-card" data-action="legacy-call" data-call="${callName}" data-call-args="${callArgs}" title="${p.name} → ${targetName} (${owned?t('already_owned_sp'):(typeof t==='function'?t('non_possede'):'Not owned')})">
 <div class="pw-starter-orb">
 ${p.shinyActive?'<div class="evo-shiny-badge">★</div>':''}<div class="pw-starter-level">Nv.${p.level}</div>
 <div class="evo-owned-badge ${owned?'':'is-missing'}" title="${owned?(typeof t==='function'?t('evolution_owned'):'Evolution already owned'):(typeof t==='function'?t('evolution_not_owned'):'Evolution not owned')}">${owned?'✓':'!'}</div>
 ${spriteImg(p.id, p.emoji, {size:72, shiny:p.shinyActive})}
 <div class="evo-target-label">→ ${targetName}</div>
 </div>
 </div>`;
 }).join('') + '</div>';
 } else {
 candidatesHtml = catalogHtml || `<div class="pw-empty-state">${t('no_evo_stone')} ${getItemName(key)}.</div>`;
 }

 _pwSetHtmlSafe(el, headerHtml + candidatesHtml + `<div class="pw-btn-center"><button class="hbtn extracted-bridge-style-042" data-action="return-inventory" class="hbtn">${t('back_bag')}</button></div>`);
 return;
 }

  const isCtCs = (typeof isCtCsItem==='function') ? isCtCsItem(key) : (itm.type === 'ct' || itm.type === 'cs');
  if(isCtCs){
    startLearnMoveCtCs(key);
    return;
  }

  if(itm.type === 'candy' || key === 'rarecandy'){
 const qty = G.inventory[key] || 0;
 if(qty <= 0){
  const fsM=document.getElementById('fullscreen-panel-modal');
  if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}
  else{showTab('inventory')}
  return;
 }
 G.pendingItemUseKey = key;
 if(typeof openUnifiedSelectorModal === 'function'){
  openUnifiedSelectorModal('item_rarecandy');
  const titleEl = document.getElementById('usm-title');
  if(titleEl) titleEl.textContent = `${t("m.inventory.4")} ${getItemName(key)} ×${qty}`;
 }
 return;
 }


  if(!itm.buff) return;
  
  openItemInfo(key);
  return;
}

function useItem(key){ onInventoryClick(key); }

function consumeItem(key){
 if(G.inventory[key]>0) G.inventory[key]--;
 if(G.inventory[key]===0) delete G.inventory[key];
}


function startLearnMoveCtCs(key) {
  const itm = ITEMS[key];
  if(!itm) return;
   // Inventory item usage and effect application
   // Inventory item usage and effect application
  if((G.inventory[key] || 0) <= 0){
    const fsM = document.getElementById('fullscreen-panel-modal');
    if(fsM && fsM.style.display === 'flex'){ renderInventory(document.getElementById('fs-panel-content')); }
    else { showTab('inventory'); }
    return;
  }
  // Some TMs have no declared `type` → we deduce TM/HM from the key.
  const tmKind = String(key).startsWith('cs') ? 'CS' : 'CT';
  const moveId = (typeof resolveCtCsMoveId === 'function') ? (resolveCtCsMoveId(key) || itm.moveId) : itm.moveId;
  G.pendingItemUseKey = key;
  if(typeof openUnifiedSelectorModal === 'function') {
    openUnifiedSelectorModal('item_ct_cs_' + key);
    const titleEl = document.getElementById('usm-title');
    if(titleEl) titleEl.textContent = `${typeof t==='function'?t('teaching_move'):'Teaching'} ${getMoveName(moveId)} (${tmKind})`;
  }
}

// --- Migrated to ES module, globals exposed ---
if (typeof _getActiveContent !== 'undefined') { if (typeof window !== 'undefined') window._getActiveContent = _getActiveContent; if (typeof globalThis !== 'undefined') globalThis._getActiveContent = _getActiveContent; }
// sellTreasure: exposed by src/application/market-system.js (ECS).
if (typeof onInventoryClick !== 'undefined') { if (typeof window !== 'undefined') window.onInventoryClick = onInventoryClick; if (typeof globalThis !== 'undefined') globalThis.onInventoryClick = onInventoryClick; }
if (typeof useItem !== 'undefined') { if (typeof window !== 'undefined') window.useItem = useItem; if (typeof globalThis !== 'undefined') globalThis.useItem = useItem; }
if (typeof consumeItem !== 'undefined') { if (typeof window !== 'undefined') window.consumeItem = consumeItem; if (typeof globalThis !== 'undefined') globalThis.consumeItem = consumeItem; }
if (typeof startLearnMoveCtCs !== 'undefined') { if (typeof window !== 'undefined') window.startLearnMoveCtCs = startLearnMoveCtCs; if (typeof globalThis !== 'undefined') globalThis.startLearnMoveCtCs = startLearnMoveCtCs; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  _getActiveContent,
  onInventoryClick,
  useItem,
  consumeItem,
  startLearnMoveCtCs,
};

