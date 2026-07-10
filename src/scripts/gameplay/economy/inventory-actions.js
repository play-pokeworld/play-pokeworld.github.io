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
  notify(`💰 Vendu ${actual}x ${getItemName(key)} pour +${gain.toLocaleString()}₽ !`, 'var(--green)');
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
    el.innerHTML = `<div class="loc-title">${t("m.inventory.5")} ${itemIcon(key, 24)} ${getItemName(key)}</div>
      <div class="loc-sub">${tr("m.treasure_sell_sub", {qty: qty, value: (itm.value?.toLocaleString()||'2 000')})}</div>
      <div style="display:flex;gap:10px;margin-top:16px;justify-content:center;flex-wrap:wrap">
        <button class="hbtn" style="background:var(--gold);color:#000;font-weight:bold;padding:8px 16px" onclick="sellTreasure('${key}', 1)">${t('sell_one')} (+${(itm.value||2000).toLocaleString()}₽)</button>
        ${qty>1?`<button class="hbtn" style="background:var(--green);color:#fff;font-weight:bold;padding:8px 16px" onclick="sellTreasure('${key}', ${qty})">${t('sell_all')} (+${((itm.value||2000)*qty).toLocaleString()}₽)</button>`:''}
        <button class="hbtn" style="padding:8px 16px" onclick="var fsM=document.getElementById('fullscreen-panel-modal');if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}else{showTab('inventory')}" class="hbtn">${t('back_bag')}</button>
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
      <div style="text-align:center"><button class="hbtn" style="padding:8px 16px" onclick="var fsM=document.getElementById('fullscreen-panel-modal');if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}else{showTab('inventory')}" class="hbtn">${t('back_bag')}</button></div>`;
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

    el.innerHTML = `<div style="background:linear-gradient(135deg,rgba(128,0,128,0.2),rgba(0,0,0,0.3));border:2px solid var(--purple);border-radius:10px;padding:12px;margin-bottom:12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="font-size:32px">${itemIcon(key, 32)}</div>
        <div>
          <div class="loc-title" style="margin:0">${t("m.inventory.4")} ${getItemName(key)}</div>
          <div style="font-size:11px;color:var(--dim)">${t("m.inventory.3")}</div>
        </div>
      </div>
      <div style="background:var(--purple);color:#fff;font-weight:bold;font-size:18px;padding:6px 16px;border-radius:20px;min-width:50px;text-align:center;box-shadow:0 2px 8px rgba(128,0,128,0.4);">×${qty}</div>
    </div>
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
            <button class="hbtn" style="background:var(--purple);color:#fff;padding:6px 12px;font-weight:bold" onclick="${clickFn}" ${qty<1 ? 'disabled' : ''}>${t("m.inventory.2")}</button>
          </div>
        </div>`;
      }).join('') : `<div style="text-align:center;padding:24px;color:var(--dim)">${t("m.inventory.1")}</div>`}
    </div>
    <div style="text-align:center"><button class="hbtn" style="padding:8px 16px" onclick="var fsM=document.getElementById('fullscreen-panel-modal');if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}else{showTab('inventory')}">${t('back_bag')}</button></div>`;
    return;
  }

  if(!itm.buff) return;
  const equipped=itemEquippedOnTeam(key);
  if(equipped){
    const idx=G.team.indexOf(equipped);
    askConfirm(`${getItemName(key)} ${t('already_eq')} ${equipped.name}. ${t('remove_q')}`, ()=>unequipItem(idx));
    return;
  }
  const el=_getActiveContent();
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
    <div style="text-align:center;margin-top:10px"><button class="hbtn" onclick="var fsM=document.getElementById('fullscreen-panel-modal');if(fsM&&fsM.style.display==='flex'){renderInventory(document.getElementById('fs-panel-content'))}else{showTab('inventory')}" class="hbtn">${t('back_bag')}</button></div>`;
}

function useItem(key){ onInventoryClick(key); }

function consumeItem(key){
  if(G.inventory[key]>0) G.inventory[key]--;
  if(G.inventory[key]===0) delete G.inventory[key];
}

