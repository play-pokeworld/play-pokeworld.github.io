// ============================================================
// Item name/desc helpers (resolve via localization t())
// ============================================================
function getItemName(key){
  const v = (typeof t==='function') ? t('items.'+key+'.name') : key;
  return v || key;
}
function getItemDesc(key){
  return (typeof t==='function') ? (t('items.'+key+'.desc') || '') : '';
}



// ============================================================
// UNIFIED ITEM INFO POPUP (right-click info)
// ============================================================
function openItemInfo(key){
  const itm = ITEMS[key];
  if(!itm) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const isEn = lang === 'en';
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
      return `<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #333">
        <span style="color:var(--text)">${label}</span>
        <span style="color:var(--gold);font-weight:bold">+${full}% (max)</span>
      </div>`;
    }).join('');
    effectHtml = `<div style="background:var(--bg);border-radius:8px;padding:10px;margin:10px 0">
      <div style="font-size:12px;font-weight:bold;color:var(--gold);margin-bottom:6px">${isEn?'Held Effect (at 25/25)':'Effet équipé (à 25/25)'}</div>
      ${buffLines}
    </div>`;
  }
  
  let typeLabel = '';
  if(itm.type === 'stone') typeLabel = isEn ? '🪨 Evolution Stone' : '🪨 Pierre d\'évolution';
  else if(itm.type === 'treasure') typeLabel = isEn ? '💎 Treasure' : '💎 Trésor';
  else if(itm.type === 'candy') typeLabel = isEn ? '🍬 Candy' : '🍬 Bonbon';
  else if(itm.type === 'special') typeLabel = isEn ? '✨ Special' : '✨ Spécial';
  else if(itm.type === 'key') typeLabel = isEn ? '🔑 Key Item' : '🔑 Objet clé';
  else if(itm.buff) typeLabel = isEn ? '🔮 Held Item' : '🔮 Objet équipé';
  else typeLabel = isEn ? '🍓 Berry' : '🍓 Baie';
  
  inner.innerHTML = `<div class="modal-title">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="font-size:32px">${itm.icon || '📦'}</div>
      <div>
        <div>${name}</div>
        <div style="font-size:12px;color:var(--dim)">${typeLabel}</div>
      </div>
    </div>
    <span class="modal-close" onclick="document.getElementById('poke-modal').classList.remove('open')">✕</span>
  </div>
  <div style="background:var(--bg);border-radius:8px;padding:10px;margin-bottom:10px">
    <div style="font-size:12px;color:var(--dim);margin-bottom:4px">${isEn?'Description':'Description'}</div>
    <div style="font-size:13px;color:var(--text);line-height:1.5">${desc}</div>
  </div>
  ${effectHtml}
  <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:8px 12px;border-radius:8px;margin-bottom:10px">
    <span style="font-size:12px;color:var(--dim)">${isEn?'Price':'Prix'}</span>
    <span style="color:var(--gold);font-weight:bold">${(itm.price||0).toLocaleString()}₽</span>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;background:var(--bg);padding:8px 12px;border-radius:8px;margin-bottom:10px">
    <span style="font-size:12px;color:var(--dim)">${isEn?'Owned':'Possédé'}</span>
    <span style="color:var(--green);font-weight:bold;font-size:16px">×${qty}</span>
  </div>
  <div style="text-align:center"><button class="hbtn" onclick="document.getElementById('poke-modal').classList.remove('open')">${isEn?'Close':'Fermer'}</button></div>`;
  document.getElementById('poke-modal').classList.add('open');
}
