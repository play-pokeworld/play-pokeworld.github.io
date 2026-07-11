// ===== Shop - Header fixe, contenu scrollable =====
function renderShop(el){
 const loc=getLocObj(G.location);
 const shopId=loc?loc.shopId:null;

 // Pas de filtres pour le shop
 const filterBar = document.getElementById('fs-panel-filters');
 if(filterBar) filterBar.style.display = 'none';

 if(!shopId||!SHOPS[shopId]){
 el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--light2)">${t('shop_empty')}</div>`;
 return;
 }
 if(shopId === 'indigo' && !G.championTitle){
 el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--light2)">
 <div style="font-size:40px;margin-bottom:10px;"></div>
 <div style="font-size:15px;font-weight:bold;color:var(--light2);margin-bottom:8px;">Boutique du Plateau Indigo Verrouillée</div>
 <div style="font-size:13px;max-width:300px;margin:0 auto;line-height:1.4;color:var(--light1);">
 Cette boutique d'élite est réservée exclusivement aux Maîtres de la Ligue Kanto.
 </div>
 </div>`;
 return;
 }
 const shop=SHOPS[shopId];
 const isEn = (typeof G !== 'undefined' && G && G.lang === 'en');
 el.innerHTML=`
 ${shop.items.map(key=>{
 const itm=ITEMS[key];
 if(!itm||!itm.price) return '';
 const owned=G.inventory[key]||0;
 const isBuff = !!itm.buff;
 const full = isBuff && owned>=BAG_MAX;
 const stockStr = isBuff ? `${owned}/${BAG_MAX}` : `${owned}`;
 return `<div class="shop-item" onclick="buyItem('${key}')" style="cursor:pointer;background:var(--light1);border:2px solid var(--dark1);padding:12px;margin-bottom:10px;border-radius:10px;display:flex;align-items:center;gap:12px;">
 <div style="width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${itemSpriteHtml(key,40)}</div>
 <div style="flex:1;min-width:0;">
 <div style="font-weight:bold;color:var(--dark1);margin-bottom:4px;">${getItemName(key)}</div>
 <div style="font-size:13px;color:var(--dark3);">${getItemDesc(key)}</div>
 <div style="font-size:13px;color:var(--dark3);">Stock: ${stockStr}${full?' <span style="color:var(--red);">MAX</span>':''}</div>
 </div>
 <div style="font-weight:bold;color:var(--dark1);background:var(--light2);padding:6px 12px;border-radius:14px;flex-shrink:0;">${itm.price}₽</div>
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
 if(itm.buff && owned>=BAG_MAX){notify(`Sac plein pour ${getItemName(key)} (max ${BAG_MAX}).`,'var(--red)');return;}
 if(G.money<itm.price){notify(t("n.pas_assez_dargent"),'var(--red)');return;}
 G.money-=itm.price;
 addToInventory(key,1);
 updateHeader();
 notify(`✅ ${getItemName(key)} acheté !`);
 const fsContent = document.getElementById('fs-panel-content');
 if(fsContent && document.getElementById('fullscreen-panel-modal')?.style.display === 'flex'){
 renderShop(fsContent);
 }
}
