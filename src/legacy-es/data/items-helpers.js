function getItemName(key){
 const v = (typeof t==='function') ? t('items.'+key+'.name') : key;
 return v || key;
}
function getItemDesc(key){
 return (typeof t==='function') ? (t('items.'+key+'.desc') || '') : '';
}


function openItemInfo(key){
 const itm = ITEMS[key];
 if(!itm) return;
 const inner = document.getElementById('poke-modal-inner');
 if(!inner) return;
 
 const name = getItemName(key);
 const desc = getItemDesc(key);
 const qty = (G.inventory && G.inventory[key]) || 0;
 
 let effectHtml = '';
 if(itm.buff){
 const buffLines = Object.entries(itm.buff).map(([s, mx]) => {
 const label = {atk:'Atk',def:'Déf',spe:'Vit',hpMax:'PV Max',spa:'Atk Spé',spd:'Déf Spé'}[s] || s;
 const full = Math.round(mx * 100);
 return `<div class="extracted-template-style-001">
 <span class="extracted-template-style-002">${label}</span>
 <span class="extracted-template-style-003">+${full}% (max)</span>
 </div>`;
 }).join('');
 effectHtml = `<div class="extracted-template-style-004">
 <div class="extracted-template-style-005">${t('held_effect_max')}</div>
 ${buffLines}
 </div>`;
 }
 
 let typeLabel = '';
 if(itm.type === 'stone') typeLabel = t('item_type_stone');
 else if(itm.type === 'treasure') typeLabel = t('item_type_treasure');
 else if(itm.type === 'candy') typeLabel = t('item_type_candy');
 else if(itm.type === 'special') typeLabel = t('item_type_special');
 else if(itm.type === 'key') typeLabel = t('item_type_key');
 else if(itm.buff) typeLabel = t('item_type_held');
 else typeLabel = t('item_type_berry');
 
 inner.innerHTML = `<div class="modal-title">
 <div class="extracted-template-style-006">
 ${itemSpriteHtml(key, 48)}
 <div>
 <div>${name}</div>
 <div class="extracted-template-style-007">${typeLabel}</div>
 </div>
 </div>
 <span class="modal-close" data-action="close-poke-modal"></span>
 </div>
 <div class="extracted-template-style-008">
 <div class="extracted-template-style-009">${t('description')}</div>
 <div class="extracted-template-style-010">${desc}</div>
 </div>
 ${effectHtml}
 <div class="extracted-template-style-011">
 <span class="extracted-template-style-007">${t('price')}</span>
 <span class="extracted-template-style-003">${(itm.price||0).toLocaleString()}₽</span>
 </div>
 <div class="extracted-template-style-011">
 <span class="extracted-template-style-007">${t('owned')}</span>
 <span class="extracted-template-style-012">&times;${qty}</span>
 </div>
 <div class="extracted-template-style-013"><button class="hbtn" data-action="close-poke-modal">${t('close')}</button></div>`;
 document.getElementById('poke-modal').classList.add('open');
}


function getItemSpriteUrl(key) {
  if (!key || !ITEMS[key]) return null;
  return 'src/assets/images/items/' + key + '.png';
}

function itemSpriteHtml(key, size) {
  const url = getItemSpriteUrl(key);
  const s = size || 24;
  const icon = (ITEMS[key] && ITEMS[key].icon) || '';
  if (url) {
    return '<img src="' + url + '" class="extracted-template-style-014" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline-flex\';"><span class="extracted-template-style-015">' + icon + '</span>';
  }
  return '<span class="extracted-template-style-016">' + icon + '</span>';
}


// --- Migrated to ES module, globals exposed ---
if (typeof getItemName !== 'undefined' && typeof window !== 'undefined') window.getItemName = getItemName;
if (typeof getItemDesc !== 'undefined' && typeof window !== 'undefined') window.getItemDesc = getItemDesc;
if (typeof openItemInfo !== 'undefined' && typeof window !== 'undefined') window.openItemInfo = openItemInfo;
if (typeof getItemSpriteUrl !== 'undefined' && typeof window !== 'undefined') window.getItemSpriteUrl = getItemSpriteUrl;
if (typeof itemSpriteHtml !== 'undefined' && typeof window !== 'undefined') window.itemSpriteHtml = itemSpriteHtml;

export {};
