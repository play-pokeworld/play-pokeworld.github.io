function renderShop(el){
 const loc=getLocObj(G.location);
 const shopId=loc?loc.shopId:null;

 
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar) filterBar.style.display = 'none';

 if(!shopId||!SHOPS[shopId]){
 el.innerHTML=`<div class="extracted-template-style-207">${t('shop_empty')}</div>`;
 return;
 }
 if(shopId === 'indigo' && !G.championTitle){
 el.innerHTML = `<div class="extracted-template-style-207">
 <div class="extracted-template-style-236"></div>
 <div class="extracted-template-style-237">${t('indigo_shop_locked_title')}</div>
 <div class="extracted-template-style-238">
 ${t('indigo_shop_locked_desc')}
 </div>
 </div>`;
 return;
 }
 const shop=SHOPS[shopId];
 el.innerHTML=`
 ${shop.items.map(key=>{
 const itm=ITEMS[key];
 if(!itm||!itm.price) return '';
 const owned=G.inventory[key]||0;
 const isBuff = !!itm.buff;
 const full = isBuff && owned>=BAG_MAX;
 const stockStr = isBuff ? `${owned}/${BAG_MAX}` : `${owned}`;
 return `<div class="shop-item extracted-template-style-239" data-action="legacy-call" data-call="buyItem" data-call-args="'${key}'">
 <div class="extracted-template-style-240">${itemSpriteHtml(key,40)}</div>
 <div class="extracted-template-style-144">
 <div class="extracted-template-style-218">${getItemName(key)}</div>
 <div class="extracted-template-style-241">${getItemDesc(key)}</div>
 <div class="extracted-template-style-241">${t('stock')}: ${stockStr}${full?' <span class="extracted-template-style-155">MAX</span>':''}</div>
 </div>
 <div class="extracted-template-style-221">${itm.price}₽</div>
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
 if(itm.buff && owned>=BAG_MAX){notify(tr('bag_full_for', {item:getItemName(key), max:BAG_MAX}),'var(--red)');return;}
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

export {};
