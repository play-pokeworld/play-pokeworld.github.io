// ============================================================
// INVENTORY ACTIONS — (split from inventory.js)
// ============================================================
// Helper: get the active content container (fullscreen panel or tab-content)
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
 <div style="display:flex;gap:10px;margin-top:16px;justify-content:center;flex-wrap:wrap">
 <button class="hbtn"style="background:var(--light2);color:#000;font-weight:bold;padding:8px 16px"onclick="sellTreasure('${key}', 1)">${t('sell_one')} (+${(itm.value||2000).toLocaleString()}₽)</button>
 ${qty>1?`<button class="hbtn"style="background:var(--green);color:#fff;font-weight:bold;padding:8px 16px"onclick="sellTreasure('${key}', ${qty})">${t('sell_all')} (+${((itm.value||2000)*qty).toLocaleString()}₽)</button>`:''}
 <button class="hbtn"style="padding:8px 16px"onclick="var fsM=document.getElementById('fullscreen-panel-modal');if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}else{showTab('inventory')}"class="hbtn">${t('back_bag')}</button>
 </div>`;
 return;
 }

 if(itm.type === 'stone'){
 const qty = G.inventory[key] || 0;
 const el = _getActiveContent();
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

 el.innerHTML = `<div class="loc-title">${t('use_stone')} ${itemSpriteHtml(key, 24)} ${getItemName(key)}</div>
 <div class="loc-sub">${t('stone_sub')}</div>
 <div style="margin:16px 0">
 ${candidates.length > 0 ? candidates.map(({p, loc, idx, idStr, targetId}) => {
 const target = PD[targetId];
 const owned = speciesOwned(targetId);
 const clickFn = loc === 'team' ? `tryStoneEvo(${idx}, '${key}')` : `tryBoxStoneEvo('${idStr}', '${key}')`;
 return `<div class="poke-card"style="margin-bottom:8px;${owned?'border:1px solid var(--green)':''}">
 <div class="poke-card-top"style="align-items:center">
 <div class="poke-sprite">${spriteImg(p.id, p.emoji, {size:40, shiny:p.shinyActive})}</div>
 <div class="poke-info"style="flex:1">
 <div class="poke-name">${p.name} Nv.${p.level} <span style="font-size:13px;color:var(--light1)">(${loc==='team'?' Équipe':' Boîte PC'})</span></div>
 <div style="font-size:13px;color:var(--light2);margin-top:2px">${t('evolves_into')} <b>${target?getPokeName(targetId):'#'+targetId}</b> ${owned?`(${t('already_owned_sp')})`:''}</div>
 </div>
 <button class="hbtn"style="background:var(--accent);color:#fff;padding:6px 12px;font-weight:bold"onclick="${clickFn}"${qty<1 ? 'disabled' : ''}>${t('evolve_btn')}</button>
 </div>
 </div>`;
 }).join('') : `<div style="text-align:center;padding:24px;color:var(--light1)">${t('no_evo_stone')} ${getItemName(key)}.</div>`}
 </div>
 <div style="text-align:center"><button class="hbtn"style="padding:8px 16px"onclick="var fsM=document.getElementById('fullscreen-panel-modal');if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}else{showTab('inventory')}"class="hbtn">${t('back_bag')}</button></div>`;
 return;
 }

 if(itm.type === 'candy' || key === 'rarecandy'){
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
 if(p.level < 100) candidates.push({p, loc:'team', idx});
 });
 Object.entries(G.collection).forEach(([idStr, p]) => {
 if(p && p.level < 100) candidates.push({p, loc:'box', idStr});
 });

 // Header avec quantité (style boîte PC)
 let headerHtml = `<div style="position:sticky;top:0;background:var(--dark1);padding:12px;border-bottom:2px solid var(--dark3);z-index:10;min-height:60px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
 <div style="display:flex;align-items:center;gap:10px;">
 <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;">${itemSpriteHtml(key, 40)}</div>
 <div>
 <div style="font-size: 15px;font-weight:bold;color:var(--light2);">${t("m.inventory.4")} ${getItemName(key)}</div>
 <div style="font-size:13px;color:var(--light1);">${t("m.inventory.3")}</div>
 </div>
 </div>
 <div style="background:var(--light2);color:var(--dark1);font-weight:bold;font-size: 15px;padding:6px 14px;border-radius:14px;">×${qty}</div>
</div>`;

 // Liste des Pokémon style boîte PC (ronds avec sprites)
 let candidatesHtml = '';
 if(candidates.length > 0) {
 candidatesHtml = '<div style="display:flex;flex-wrap:wrap;gap:12px;padding:16px;">' + candidates.map(({p, loc, idx, idStr}) => {
 const clickFn = loc === 'team' ? `useRareCandy(${idx})` : `useBoxRareCandy('${idStr}')`;
 return `<div style="position:relative;cursor:pointer;" onclick="${clickFn}">
 <div style="width:72px;height:72px;border-radius:50%;background:var(--light1);border:2px solid var(--dark1);display:flex;align-items:center;justify-content:center;position:relative;">
 <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:var(--dark1);color:var(--light2);font-size:13px;font-weight:bold;padding:2px 8px;border-radius:10px;">Lv.${p.level}</div>
 ${spriteImg(p.id, p.emoji, {size: 72, shiny: p.shinyActive})}
 </div>
 </div>`;
 }).join('') + '</div>';
 } else {
 candidatesHtml = `<div style="text-align:center;padding:40px;color:var(--light1);">${t("m.inventory.1")}</div>`;
 }

 el.innerHTML = headerHtml + candidatesHtml;
 return;
 }

  if(!itm.buff) return;
  // From bag: just show info popup, no equip flow (equip only from team window)
  openItemInfo(key);
  return;
}

function useItem(key){ onInventoryClick(key); }

function consumeItem(key){
 if(G.inventory[key]>0) G.inventory[key]--;
 if(G.inventory[key]===0) delete G.inventory[key];
}

