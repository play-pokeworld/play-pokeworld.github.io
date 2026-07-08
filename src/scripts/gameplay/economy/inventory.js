
// ===== extracted from src/scripts/gameplay/mine.js =====
var _invCat = 'all';
function itemCat(key){
  const itm=ITEMS[key]; if(!itm) return 'all';
  if(itm.type==='stone') return 'stone';
  if(itm.type==='treasure') return 'treasure';
  if(itm.type==='candy'||itm.type==='special') return 'special';
  if(itm.buff) return 'object';
  return 'berry';
}
function setInvCat(c){
  _invCat=c;
  const el=document.getElementById('tab-content');
  if(el) renderInventory(el);
}
function renderInventory(el){
  const lang = (typeof G !== 'undefined' && G) ? G.lang : 'fr';
  const entries=Object.entries(G.inventory).filter(([k,v])=>v>0 && ITEMS[k]);
  const cats=[
    {id:'all', label: lang==='en'?'All':'Tous', icon:'🎒'},
    {id:'berry', label: lang==='en'?'Berries':'Baies', icon:'🍓'},
    {id:'object', label: lang==='en'?'Items':'Objets', icon:'🔮'},
    {id:'stone', label: lang==='en'?'Stones':'Pierres', icon:'🔷'},
    {id:'treasure', label: lang==='en'?'Treasures':'Trésors', icon:'💎'},
    {id:'special', label: lang==='en'?'Special':'Spéciaux', icon:'✨'}
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
    html += `<div style="text-align:center;padding:20px;color:var(--dim);font-size:12px;">${lang==='en'?'No items in this category.':'Aucun objet dans cette catégorie.'}</div>`;
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

    return `<div class="inv-item" onclick="onInventoryClick('${key}')">
      <div class="inv-icon">${itemIcon(key,26)}</div>
      <div style="flex:1">
        <div class="inv-name">${getItemName(key)} <span style="color:var(--dim);font-size:10px">(×${qty})</span></div>
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
  notify(`💰 Vendu ${actual}x ${getItemName(key)} pour +${gain.toLocaleString()}₽ !`, 'var(--green)');
  saveGame();
  onInventoryClick(key);
}
function onInventoryClick(key){
  const itm=ITEMS[key]; if(!itm) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

  if(itm.type === 'treasure'){
    const qty = G.inventory[key] || 0;
    const el = document.getElementById('tab-content');
    if(qty <= 0){ showTab('inventory'); return; }
    el.innerHTML = `<div class="loc-title">${lang==='en'?'Sell':'Revendre'} ${itemIcon(key, 24)} ${getItemName(key)}</div>
      <div class="loc-sub">${lang==='en' ? `You own <b>${qty}</b> unit(s). Each unit is worth <b>${itm.value?.toLocaleString()||'2,000'}₽</b>.` : `Vous possédez <b>${qty}</b> exemplaire(s). Chaque exemplaire vaut <b>${itm.value?.toLocaleString()||'2 000'}₽</b>.`}</div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:center;flex-wrap:wrap">
        <button class="hbtn" style="background:var(--gold);color:#000;font-weight:bold;padding:8px 16px" onclick="sellTreasure('${key}', 1)">${t('sell_one')} (+${(itm.value||2000).toLocaleString()}₽)</button>
        ${qty>1?`<button class="hbtn" style="background:var(--green);color:#fff;font-weight:bold;padding:8px 16px" onclick="sellTreasure('${key}', ${qty})">${t('sell_all')} (+${((itm.value||2000)*qty).toLocaleString()}₽)</button>`:''}
        <button class="hbtn" style="padding:8px 16px" onclick="showTab('inventory')">${t('back_bag')}</button>
      </div>`;
    return;
  }

  if(itm.type === 'stone'){
    const qty = G.inventory[key] || 0;
    const el = document.getElementById('tab-content');
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

    el.innerHTML = `<div class="loc-title">${t('use_stone')} ${itemIcon(key, 24)} ${getItemName(key)}</div>
      <div class="loc-sub">${t('stone_sub')}</div>
      <div style="margin:16px 0">
        ${candidates.length > 0 ? candidates.map(({p, loc, idx, idStr, targetId}) => {
          const target = PD[targetId];
          const owned = speciesOwned(targetId);
          const clickFn = loc === 'team' ? `tryStoneEvo(${idx}, '${key}')` : `tryBoxStoneEvo('${idStr}', '${key}')`;
          return `<div class="poke-card" style="margin-bottom:8px;${owned?'border:1px solid var(--green)':''}">
            <div class="poke-card-top" style="align-items:center">
              <div class="poke-sprite">${spriteImg(p.id, p.emoji, {size:40, shiny:p.shinyActive})}</div>
              <div class="poke-info" style="flex:1">
                <div class="poke-name">${p.name} Nv.${p.level} <span style="font-size:11px;color:var(--dim)">(${loc==='team'?'⚡ Équipe':'📦 Boîte PC'})</span></div>
                <div style="font-size:11px;color:var(--gold);margin-top:2px">${t('evolves_into')} <b>${target?getPokeName(targetId):'#'+targetId}</b> ${owned?`(${t('already_owned_sp')})`:''}</div>
              </div>
              <button class="hbtn" style="background:var(--purple);color:#fff;padding:6px 12px;font-weight:bold" onclick="${clickFn}" ${qty<1 ? 'disabled' : ''}>${t('evolve_btn')}</button>
            </div>
          </div>`;
        }).join('') : `<div style="text-align:center;padding:24px;color:var(--dim)">${t('no_evo_stone')} ${getItemName(key)}.</div>`}
      </div>
      <div style="text-align:center"><button class="hbtn" style="padding:8px 16px" onclick="showTab('inventory')">${t('back_bag')}</button></div>`;
    return;
  }

  if(itm.type === 'candy' || key === 'rarecandy'){
    const qty = G.inventory[key] || 0;
    const el = document.getElementById('tab-content');
    if(qty <= 0){ showTab('inventory'); return; }
    const candidates = [];
    G.team.forEach((p, idx) => {
      if(p.level < 100) candidates.push({p, loc:'team', idx});
    });
    Object.entries(G.collection).forEach(([idStr, p]) => {
      if(p && p.level < 100) candidates.push({p, loc:'box', idStr});
    });

    el.innerHTML = `<div class="loc-title">${lang==='en'?'Use':'Utiliser'} ${itemIcon(key, 24)} ${getItemName(key)}</div>
      <div class="loc-sub">${lang==='en'?'Select a Pokémon to instantly increase its level by +1.':'Sélectionnez un Pokémon pour augmenter instantanément son niveau de +1.'}</div>
      <div style="margin:16px 0">
        ${candidates.length > 0 ? candidates.map(({p, loc, idx, idStr}) => {
          const clickFn = loc === 'team' ? `useRareCandy(${idx})` : `useBoxRareCandy('${idStr}')`;
          const curBase = xpForLevel(p.level);
          const inLvl = Math.max(0, (p.xp||0) - curBase);
          const reqLvl = Math.max(1, (p.xpNext||1) - curBase);
          return `<div class="poke-card" style="margin-bottom:8px">
            <div class="poke-card-top" style="align-items:center">
              <div class="poke-sprite">${spriteImg(p.id, p.emoji, {size:40, shiny:p.shinyActive})}</div>
              <div class="poke-info" style="flex:1">
                <div class="poke-name">${p.name} Nv.${p.level} <span style="font-size:11px;color:var(--dim)">(${loc==='team'?'⚡ Équipe':'📦 Boîte PC'})</span></div>
                <div style="font-size:11px;color:var(--dim);margin-top:2px">XP : ${inLvl} / ${reqLvl}</div>
              </div>
              <button class="hbtn" style="background:var(--purple);color:#fff;padding:6px 12px;font-weight:bold" onclick="${clickFn}" ${qty<1 ? 'disabled' : ''}>${lang==='en'?'Give 🍬':'Donner 🍬'}</button>
            </div>
          </div>`;
        }).join('') : `<div style="text-align:center;padding:24px;color:var(--dim)">${lang==='en'?'All your Pokémon are already level 100!':'Tous vos Pokémon sont déjà niveau 100 !'}</div>`}
      </div>
      <div style="text-align:center"><button class="hbtn" style="padding:8px 16px" onclick="showTab('inventory')">${t('back_bag')}</button></div>`;
    return;
  }

  if(!itm.buff) return;
  const equipped=itemEquippedOnTeam(key);
  if(equipped){
    const idx=G.team.indexOf(equipped);
    askConfirm(`${getItemName(key)} ${t('already_eq')} ${equipped.name}. ${t('remove_q')}`, ()=>unequipItem(idx));
    return;
  }
  const el=document.getElementById('tab-content');
  const capped=Math.min(BAG_MAX,G.inventory[key]||0);
  const ratio=capped/BAG_MAX;
  const buffLines=Object.entries(itm.buff).map(([s,mx])=>{
    const label={atk:'Atk',def:'Déf',spe:'Vit',hpMax:'PV Max'}[s]||s;
    return `${label} +${Math.round(mx*ratio*100)}%`;
  }).join(' · ');
  el.innerHTML=`<div class="loc-title">${t('equip_btn')} ${itm.icon} ${getItemName(key)}</div>
    <div class="loc-sub" style="margin-bottom:8px">${t('eq_sub')} (${capped}/${BAG_MAX}) : <span style="color:var(--gold)">${buffLines}</span></div>
    ${G.team.map((p,i)=>`
      <div class="poke-card" style="cursor:pointer" onclick="equipItemOn(${i},'${key}')">
        <div class="poke-card-top">
          <div class="poke-sprite${p.shinyActive?' is-shiny':''}" style="background:${TYPE_COLORS[p.type1]||'#333'}22;border:2px solid ${TYPE_COLORS[p.type1]}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:40})}</div>
          <div class="poke-info">
            <div class="poke-name">${p.name} <span style="color:var(--dim);font-size:10px">Nv.${p.level}</span></div>
            <div style="font-size:11px;color:var(--dim);margin-top:2px">${p.heldItem?`${t('already_held')} ${getItemName(p.heldItem)} ${t('will_replace')}`:t('no_item')}</div>
          </div>
        </div>
      </div>`).join('')}
    <div style="text-align:center;margin-top:10px"><button class="hbtn" onclick="showTab('inventory')">${t('back_bag')}</button></div>`;
}
function useItem(key){ onInventoryClick(key); }
function consumeItem(key){
  if(G.inventory[key]>0) G.inventory[key]--;
  if(G.inventory[key]===0) delete G.inventory[key];
}

