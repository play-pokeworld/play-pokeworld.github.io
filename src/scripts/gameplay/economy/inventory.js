// ============================================================
// INVENTORY — (split from inventory.js)
// ============================================================
var _invCat = 'all';

function itemCat(key){
  const itm=ITEMS[key]; if(!itm) return 'all';
  // Berries always classified as berries regardless of buff
  if(key.startsWith('berry')) return 'berry';
  if(itm.type==='stone') return 'stone';
  if(itm.type==='treasure') return 'treasure';
  if(itm.type==='candy'||itm.type==='special') return 'special';
  if(itm.buff) return 'object';
  return 'berry';
}

function setInvCat(c){
  _invCat=c;
  let el=document.getElementById('fs-panel-content');
  if(!el) el=document.getElementById('tab-content');
  if(el) renderInventory(el);
}

function renderInventory(el){
  const lang = (typeof G !== 'undefined' && G) ? G.lang : 'fr';
  const entries=Object.entries(G.inventory).filter(([k,v])=>v>0 && ITEMS[k]);
  const cats=[
    {id:'all', label: t("m.inventory.12"), icon:'🎒'},
    {id:'berry', label: t("m.inventory.11"), icon:'🍓'},
    {id:'object', label: t("m.inventory.10"), icon:'🔮'},
    {id:'stone', label: t("m.inventory.9"), icon:'🔷'},
    {id:'treasure', label: t("m.inventory.8"), icon:'💎'},
    {id:'special', label: t("m.inventory.7"), icon:'✨'}
  ];
  if(!entries.length){
    el.innerHTML=`<div style="text-align:center;padding:40px;color:var(--dim)">${t('inv_empty')}</div>`;
    return;
  }
  const filtered = _invCat==='all' ? entries : entries.filter(([k])=>itemCat(k)===_invCat);
  let html = `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">`+
    cats.map(c=>`<button class="hbtn" onclick="setInvCat('${c.id}')" style="padding:4px 9px;font-size:11px;${_invCat===c.id?'background:var(--accent);border-color:#ff8a80;font-weight:bold;':''}">${c.icon} ${c.label}</button>`).join('')+
    `</div>`;
  html += `<div style="font-size:11px;color:var(--dim);margin-bottom:8px">${t('inv_desc_sub')}</div>`;
  if(!filtered.length){
    html += `<div style="text-align:center;padding:20px;color:var(--dim);font-size:12px;">${t("m.inventory.6")}</div>`;
  } else {
    html += filtered.map(([key,qty])=>{
    const itm=ITEMS[key];
    const capped=itm.buff ? Math.min(BAG_MAX,qty) : qty;
    const ratio=itm.buff ? capped/BAG_MAX : 0;
    const equipped=itemEquippedOnTeam(key);
    const buffLines=itm.buff?Object.entries(itm.buff).map(([st,mx])=>{
      const label={atk:'Atk',def:'Déf',spe:'Vit',hpMax:'PV Max'}[st]||st;
      return `${label} +${Math.round(mx*ratio*100)}% (max +${Math.round(mx*100)}%)`;
    }).join(' · '):'';

    let subTypeHtml = '';
    if(itm.type === 'stone') subTypeHtml = `<div style="font-size:11px;color:var(--purple);margin-top:2px">${t('stone_inv_lbl')}</div>`;
    else if(itm.type === 'treasure') subTypeHtml = `<div style="font-size:11px;color:var(--gold);margin-top:2px">${t('treasure_inv_lbl')} (${itm.value?.toLocaleString()}₽/u)</div>`;
    else if(buffLines) subTypeHtml = `<div style="font-size:11px;color:var(--gold);margin-top:2px">🔮 Effet actuel : ${buffLines}</div>`;

    return `<div class="inv-item" onclick="onInventoryClick('${key}')" oncontextmenu="event.preventDefault();openItemInfo('${key}');return false;" title="Clic droit : info">
      <div class="inv-icon">${itemIcon(key,26)}</div>
      <div style="flex:1">
        <div class="inv-name">${getItemName(key)}</div>
        <div class="inv-desc">${getItemDesc(key)}</div>
        ${subTypeHtml}
        ${equipped?`<div style="font-size:11px;color:var(--green);margin-top:2px">${t('equipped_lbl')} ${equipped.name}</div>`:''}
      </div>
      <div class="inv-qty">×${qty}</div>
    </div>`;
  }).join('');
  }
  el.innerHTML = html;
}

