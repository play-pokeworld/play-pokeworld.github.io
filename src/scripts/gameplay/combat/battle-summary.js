// ============================================================
// BATTLE SUMMARY — (split from battle.js)
// ============================================================
function renderBattleSummary(){
  const el=document.getElementById('battle-summary-content');
  const inline=document.getElementById('battle-loot-inline');
  let html='';
  if(!battle.isChamp){
    html+=`<div style="font-size:11px;color:var(--gold);margin-bottom:6px">${t('live_loot')}</div>`;
    const catches=battle.sessionCatches||[];
    if(catches.length){
      const agg={};
      for(const c of catches){
        if(!agg[c.id]) agg[c.id]={id:Number(c.id),name:c.name,count:0,shinyCount:0,dupeCount:0};
        agg[c.id].count++; if(c.shiny) agg[c.id].shinyCount++; if(c.dupe) agg[c.id].dupeCount++;
      }
      html+=`<div style="display:flex;flex-direction:column;gap:3px;margin-bottom:8px">`;
      for(const id in agg){
        const a=agg[id];
        html+=`<div style="display:flex;align-items:center;gap:8px;background:var(--card);border-radius:6px;padding:4px 8px;font-size:11px"><div>${spriteImg(a.id,'',{shiny:a.shinyCount>0,size:24})}</div><div style="flex:1;font-weight:bold">${a.shinyCount?'✨ ':''}${a.name}${a.dupeCount?` <span style="color:var(--dim);font-weight:normal">(x${a.dupeCount} ${t('dupe_tag')})</span>`:''}</div><div style="color:var(--gold);font-weight:bold">x${a.count}</div></div>`;
      }
      html+=`</div>`;
    }
    const itemKeys=Object.keys(battle.sessionItems||{});
    if(itemKeys.length){
      html+=`<div style="display:flex;flex-wrap:wrap;gap:4px">`;
      for(const k of itemKeys){
        const itm=ITEMS[k];
        html+=`<span style="background:var(--card);border-radius:4px;padding:2px 6px;font-size:10px">${itemIcon(k,14)} x${battle.sessionItems[k]}</span>`;
      }
      html+=`</div>`;
    }
    if(!catches.length && !itemKeys.length){
      html+=`<div style="color:var(--dim);font-size:11px">${t('no_loot_yet')}</div>`;
    }
  } else {
    html+=`<div style="color:var(--dim);font-size:11px">${t('champ_no_loot')}</div>`;
  }
  if(el) el.innerHTML=html;
  if(inline) inline.innerHTML=html;
}


function openBattleSummary(auto){
  renderBattleSummary();
  document.getElementById('battle-summary-title').textContent=t('loot_summary_title');
  document.getElementById('battle-summary-modal').classList.add('open');
}

function closeBattleSummary(){
  document.getElementById('battle-summary-modal').classList.remove('open');
}

// ============================================================
// BATTLE: team switching + enemy cooldown bars (Pokéchill-style)
// ============================================================
