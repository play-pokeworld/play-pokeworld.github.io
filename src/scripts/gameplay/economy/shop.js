
// ===== extracted from src/scripts/gameplay/mine.js =====
function renderShop(el){
  const loc=getLocObj(G.location);
  const shopId=loc?loc.shopId:null;
  const isEn = (typeof G !== 'undefined' && G && G.lang === 'en');
  if(!shopId||!SHOPS[shopId]){
    el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim)">${t('shop_empty')}</div>`;
    return;
  }
  if(shopId === 'indigo' && !G.championTitle){
    el.innerHTML = `<div style="text-align:center;padding:40px;color:var(--dim)">
      <div style="font-size:36px;margin-bottom:10px;">🔒</div>
      <div style="font-size:16px;font-weight:bold;color:var(--gold);margin-bottom:8px;">${isEn?'Indigo Mart Locked':'Boutique du Plateau Indigo Verrouillée'}</div>
      <div style="font-size:13px;max-width:300px;margin:0 auto;line-height:1.4;">
        ${isEn?'This elite shop and its rare treasures (including the Shiny Charm ✨) are reserved strictly for the Kanto League Champion. Triumph over the 5 League trainers to unlock access!':'Cette boutique d\'élite et ses trésors rares (dont le Charme Chroma ✨) sont réservés exclusivement aux Maîtres de la Ligue Kanto. Triomphez des 5 combats de la Ligue pour y accéder !'}
      </div>
    </div>`;
    return;
  }
  const shop=SHOPS[shopId];
  el.innerHTML=`<div class="loc-title">🛒 ${getShopName(shopId)}</div>
  <div class="loc-sub" style="margin-bottom:10px">💰 ${isEn?'Your money':'Votre argent'} : <span style="color:var(--gold);font-weight:bold">${G.money.toLocaleString()}₽</span> · ${t('shop_sub')}</div>
  ${shop.items.map(key=>{
    const itm=ITEMS[key];
    if(!itm||!itm.price) return '';
    const owned=G.inventory[key]||0;
    const isBuff = !!itm.buff;
    const full = isBuff && owned>=BAG_MAX;
    const stockStr = isBuff ? `${owned}/${BAG_MAX}` : `${owned}`;
    return `<div class="shop-item">
      <div style="font-size:22px;width:34px;text-align:center">${itemIcon(key,28)}</div>
      <div style="flex:1">
        <div style="font-weight:bold;font-size:13px">${getItemName(key)}</div>
        <div style="font-size:10px;color:var(--dim)">${getItemDesc(key)}</div>
        <div style="color:var(--dim);font-size:11px">${t('in_stock')} ${stockStr}${full?` <span style="color:var(--red)">(${t('full_btn')})</span>`:''}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <div style="color:var(--gold);font-weight:bold">${itm.price}₽</div>
        <button class="shop-buy-btn" onclick="buyItem('${key}')" ${(G.money<itm.price||full)?'disabled':''}>${full?t('full_btn'):t('buy_btn')}</button>
      </div>
    </div>`;
  }).join('')}`;
}
function buyItem(key){
  const loc=getLocObj(G.location);
  const shopId=loc?loc.shopId:null;
  if(shopId === 'indigo' && !G.championTitle){
    notify(G.lang === 'en' ? '🔒 You must become Kanto League Champion to buy items here!' : '🔒 Vous devez être Maître de la Ligue pour acheter ici !', 'var(--red)');
    return;
  }
  const itm=ITEMS[key];
  if(!itm) return;
  const owned=G.inventory[key]||0;
  if(itm.buff && owned>=BAG_MAX){notify(`Sac plein pour ${getItemName(key)} (max ${BAG_MAX}).`,'var(--red)');return;}
  if(G.money<itm.price){notify('Pas assez d\'argent !','var(--red)');return;}
  G.money-=itm.price;
  addToInventory(key,1);
  updateHeader();
  notify(`✅ ${getItemName(key)} acheté !`);
  renderShop(document.getElementById('tab-content'));
}

