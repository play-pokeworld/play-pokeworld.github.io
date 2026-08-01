function renderShop(el){
 const loc=getLocObj(G.location);
 const shopId=loc?loc.shopId:null;

 
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar) filterBar.style.display = 'none';

 if(!shopId||!SHOPS[shopId]){
 el.innerHTML=`<div class="pw-empty-state-lg">${t('shop_empty')}</div>`;
 return;
 }
 if(shopId === 'indigo' && !G.championTitle){
 el.innerHTML = `<div class="pw-empty-state-lg">
 <div class="pw-big-icon"></div>
 <div class="pw-choice-title">${t('indigo_shop_locked_title')}</div>
 <div class="pw-choice-desc">
 ${t('indigo_shop_locked_desc')}
 </div>
 </div>`;
 return;
 }
 const shop=SHOPS[shopId];
 // Passe 26 : le stock CT/CS généré (canonique par version : gen 1 à Kanto,
 // gen 2 + restes à Johto) est fusionné au stock de base de la boutique.
 const baseItems = shop.items || [];
 const ctcsStock = (typeof CTCS_SHOP_STOCK !== 'undefined' && CTCS_SHOP_STOCK && CTCS_SHOP_STOCK[shopId]) || [];
 const stockList = baseItems.concat(ctcsStock.filter(k => !baseItems.includes(k)));
 el.innerHTML=`
 ${stockList.map(key=>{
 const itm=ITEMS[key];
 if(!itm||!itm.price) return '';
 const owned=G.inventory[key]||0;
 const isBuff = !!itm.buff;
 const full = isBuff && owned>=25;
 const stockStr = isBuff ? `${owned}/25` : `${owned}`;
 return `<div class="shop-item pw-choice-card" data-action="legacy-call" data-call="buyItem" data-call-args="'${key}'">
 <div class="pw-choice-icon">${itemSpriteHtml(key,40)}</div>
 <div class="pw-flex-1">
 <div class="pw-manage-name">${getItemName(key)}</div>
 <div class="pw-choice-sub">${getItemDesc(key)}</div>
 <div class="pw-choice-sub">${t('stock')}: ${stockStr}${full?' <span class="pw-red">'+(typeof t==='function'?t('max_lbl'):'MAX')+'</span>':''}</div>
 </div>
 <div class="pw-manage-level">${itm.price}₽</div>
 </div>`;
 }).join('')}`;
}

function buyItem(key){
 const loc=getLocObj(G.location);
 const shopId=loc?loc.shopId:null;
 if(shopId === 'indigo' && !G.championTitle){
 notify(t("m.shop.1"), 'var(--red)');
 return;
 }
 const itm=ITEMS[key];
 if(!itm) return;
 const owned=G.inventory[key]||0;
 if(itm && (itm.type === 'held' || itm.category || itm.buff) && owned>=25){notify(tr('bag_full_for', {item:getItemName(key), max:BAG_MAX}),'var(--red)');return;}
 if(G.money<itm.price){notify(t("n.pas_assez_dargent"),'var(--red)');return;}
 G.money-=itm.price;
 addToInventory(key,1);
 updateHeader();
 notify(tr('item_bought', {item:getItemName(key)}));
 const fsContent = document.getElementById('fs-panel-content');
 if(fsContent && document.getElementById('fullscreen-panel-modal')?.style.display === 'flex'){
 renderShop(fsContent);
 }
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderShop !== 'undefined' && typeof window !== 'undefined') window.renderShop = renderShop;
if (typeof buyItem !== 'undefined' && typeof window !== 'undefined') window.buyItem = buyItem;


