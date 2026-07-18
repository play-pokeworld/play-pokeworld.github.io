function _getActiveContent(){
 const fsContent = document.getElementById('fs-panel-content');
 if(fsContent && document.getElementById('fullscreen-panel-modal')?.style.display === 'flex'){
 return fsContent;
 }
 return document.getElementById('tab-content');
}

function sellTreasure(key, count){
 const itm = ITEMS[key];
 if(!itm || !G.inventory[key]) return;
 if(itm.type === 'fossil'){ notify(t('fossil_not_sellable'), 'var(--red)'); return; }
 const actual = Math.min(count, G.inventory[key]);
 G.inventory[key] -= actual;
 if(G.inventory[key] <= 0) delete G.inventory[key];
 const gain = actual * (itm.value || 2000);
 G.money += gain;
 EventBus.emit(EVENTS.MINE_SELL, { key, amount: actual });
 updateHeader();
 notify(` Vendu ${actual}x ${getItemName(key)} pour +${gain.toLocaleString()}₽ !`, 'var(--green)');
 saveGame();
 onInventoryClick(key);
}

function onInventoryClick(key){
 const itm=ITEMS[key]; if(!itm) return;
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

 if(itm.type === 'treasure'){
 const qty = G.inventory[key] || 0;
 const el = _getActiveContent();
 if(qty <= 0){ showTab('inventory'); return; }
 el.innerHTML = `<div class="loc-title">${t("m.inventory.5")} ${itemSpriteHtml(key, 24)} ${getItemName(key)}</div>
 <div class="loc-sub">${tr("m.treasure_sell_sub", {qty: qty, value: (itm.value?.toLocaleString()||'2 000')})}</div>
 <div class="extracted-template-style-194">
 <button class="hbtn extracted-bridge-style-040" data-action="legacy-call" data-call="sellTreasure" data-call-args="'${key}', 1">${t('sell_one')} (+${(itm.value||2000).toLocaleString()}₽)</button>
 ${qty>1?`<button class="hbtn extracted-bridge-style-041" data-action="legacy-call" data-call="sellTreasure" data-call-args="'${key}', ${qty}">${t('sell_all')} (+${((itm.value||2000)*qty).toLocaleString()}₽)</button>`:''}
 <button class="hbtn extracted-bridge-style-042" data-action="return-inventory" class="hbtn">${t('back_bag')}</button>
 </div>`;
 return;
 }

 if(itm.type === 'stone'){
 const qty = G.inventory[key] || 0;
 const el = _getActiveContent();
 if(qty <= 0){
   var fsM=document.getElementById('fullscreen-panel-modal');
   if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}
   else{showTab('inventory')}
   return;
 }
 const candidates = [];
 G.team.forEach((p, idx) => {
 const targetId = STONE_EVO[p.id]?.[key];
 if(targetId) candidates.push({p, loc:'team', idx, targetId});
 });
 Object.entries(G.collection).forEach(([idStr, p]) => {
 if(!p) return;
 const targetId = STONE_EVO[p.id]?.[key];
 if(targetId) candidates.push({p, loc:'box', idStr, targetId});
 });

 let headerHtml = `<div class="extracted-template-style-198">
 <div class="extracted-template-style-006">
 <div class="extracted-template-style-185">${itemSpriteHtml(key, 40)}</div>
 <div>
 <div class="extracted-template-style-199">${t('use_stone')} ${getItemName(key)}</div>
 <div class="extracted-template-style-090">${t('stone_sub')}</div>
 </div>
 </div>
 <div class="extracted-template-style-200">&times;${qty}</div>
 </div>`;

 let candidatesHtml = '';
 if(candidates.length > 0){
 candidatesHtml = '<div class="extracted-template-style-201">' + candidates.map(({p, loc, idx, idStr, targetId}) => {
 const owned = speciesOwned(targetId);
 const targetName = getPokeName(targetId);
 const callName = loc === 'team' ? 'tryStoneEvo' : 'tryBoxStoneEvo';
 const callArgs = loc === 'team' ? `${idx},'${key}'` : `'${idStr}','${key}'`;
 return `<div class="extracted-template-style-202" data-action="legacy-call" data-call="${callName}" data-call-args="${callArgs}" title="${p.name} → ${targetName} (${owned?t('already_owned_sp'):'Non possédé'})">
 <div class="extracted-template-style-203">
 ${p.shinyActive?'<div class="evo-shiny-badge">★</div>':''}<div class="extracted-template-style-204">Nv.${p.level}</div>
 <div class="evo-owned-badge ${owned?'':'is-missing'}" title="${owned?'Évolution déjà possédée':'Évolution non possédée'}">${owned?'✓':'!'}</div>
 ${spriteImg(p.id, p.emoji, {size:72, shiny:p.shinyActive})}
 <div class="evo-target-label">→ ${targetName}</div>
 </div>
 </div>`;
 }).join('') + '</div>';
 } else {
 candidatesHtml = `<div class="extracted-template-style-039">${t('no_evo_stone')} ${getItemName(key)}.</div>`;
 }

 el.innerHTML = headerHtml + candidatesHtml + `<div class="extracted-template-style-013"><button class="hbtn extracted-bridge-style-042" data-action="return-inventory" class="hbtn">${t('back_bag')}</button></div>`;
 return;
 }

 if(itm.type === 'candy' || key === 'rarecandy'){
 const qty = G.inventory[key] || 0;
 if(qty <= 0){
  var fsM=document.getElementById('fullscreen-panel-modal');
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


// --- Migrated to ES module, globals exposed ---
if (typeof _getActiveContent !== 'undefined' && typeof window !== 'undefined') window._getActiveContent = _getActiveContent;
if (typeof sellTreasure !== 'undefined' && typeof window !== 'undefined') window.sellTreasure = sellTreasure;
if (typeof onInventoryClick !== 'undefined' && typeof window !== 'undefined') window.onInventoryClick = onInventoryClick;
if (typeof useItem !== 'undefined' && typeof window !== 'undefined') window.useItem = useItem;
if (typeof consumeItem !== 'undefined' && typeof window !== 'undefined') window.consumeItem = consumeItem;

export {};
