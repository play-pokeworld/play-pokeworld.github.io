// ============================================================
// MINE UI — (split from mine.js)
// ============================================================
function renderMine(el){
  initMineIfNeeded();
  const {energy, maxEnergy, tool, grid, items} = G.mine;

  const rockColors = {
    4: '#4e3629',
    3: '#6d4c3d',
    2: '#8f6350',
    1: '#b5836d',
    0: 'var(--bg)'
  };

  let gridHtml = `<div style="display:grid;grid-template-columns:repeat(${MINE_W}, 1fr);gap:3px;background:#221814;padding:8px;border-radius:10px;border:2px solid #6d4c3d;margin:12px 0">`;

  for(let y=0; y<MINE_H; y++){
    for(let x=0; x<MINE_W; x++){
      const depth = grid[y][x];
      let cellItem = null;
      let isItemCenter = false;
      for(const itm of items){
        const dx = x - itm.x;
        const dy = y - itm.y;
        if(dx>=0 && dy>=0 && dy<itm.shape.length && dx<itm.shape[0].length && itm.shape[dy][dx]===1){
          cellItem = itm;
          if(dx === Math.floor(itm.shape[0].length/2) && dy === Math.floor(itm.shape.length/2)){
            isItemCenter = true;
          }
          break;
        }
      }

      let contentHtml = '';
      if(depth === 0){
        if(cellItem){
          contentHtml = `<div style="width:100%;height:100%;background:${cellItem.collected?'rgba(76,175,80,0.25)':'rgba(255,215,0,0.25)'};display:flex;align-items:center;justify-content:center;border-radius:3px">${isItemCenter ? itemIcon(cellItem.key, 24) : ''}</div>`;
        }
      } else {
        const hint = (depth === 1 && cellItem) ? `<div style="width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,0.4)"></div>` : '';
        contentHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:11px;color:rgba(255,255,255,0.35);font-weight:bold">${hint||depth}</div>`;
      }

      const canClick = depth > 0 || tool === 'hammer';
      gridHtml += `<div ${canClick ? `onclick="digMineTile(${x},${y})"` : ''} style="aspect-ratio:1;background:${rockColors[depth]};border-radius:4px;cursor:${canClick ? 'pointer' : 'default'};display:flex;align-items:center;justify-content:center;user-select:none;transition:filter 0.1s;position:relative" ${canClick ? `onmouseover="this.style.filter='brightness(1.25)'" onmouseout="this.style.filter='none'"` : ''}>
        ${contentHtml}
      </div>`;
    }
  }
  gridHtml += `</div>`;

  const foundCount = items.filter(i=>i.collected).length;

  el.innerHTML = `<div class="loc-title">${t('mine_title')}</div>
  <div class="loc-sub">${t('mine_sub')}</div>

  <div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap">
    <div style="flex:1;min-width:200px">
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px;display:flex;justify-content:space-between">
        <span>${t('mine_energy')}</span>
        <span id="mine-energy-val" style="color:var(--gold);font-weight:bold">${energy||0} / ${maxEnergy||100}</span>
      </div>
      <div class="stat-bar" style="height:12px;background:var(--bg)"><div id="mine-energy-bar" class="stat-fill" style="width:${((energy||0)/(maxEnergy||100))*100}%;background:var(--gold)"></div></div>
      <div style="font-size:10px;color:var(--dim);margin-top:3px">${t('mine_energy_hint')}</div>
    </div>

    <div style="display:flex;gap:6px">
      <button class="hbtn" style="${tool==='chisel'?'background:var(--gold);color:#000;font-weight:bold':''}" onclick="setMineTool('chisel')">${t('mine_chisel')}</button>
      <button class="hbtn" style="${tool==='hammer'?'background:var(--gold);color:#000;font-weight:bold':''}" onclick="setMineTool('hammer')">${t('mine_hammer')}</button>
    </div>
  </div>

  ${gridHtml}

  <div style="display:flex;justify-content:space-between;align-items:center;background:var(--card);padding:10px 14px;border-radius:8px;flex-wrap:wrap;gap:10px">
    <div>
      <span style="font-weight:bold">${t('mine_treasures')} <span style="color:var(--gold)">${foundCount} / ${items.length}</span></span>
      <div style="font-size:11px;color:var(--dim);margin-top:4px">
        ${items.map(i=>`<span style="margin-right:10px;${i.collected?'color:var(--green);font-weight:bold':''}">${i.collected?'✅':'❓'} ${getItemName(i.key)}</span>`).join('')}
      </div>
    </div>
    <button class="hbtn" style="background:var(--blue);color:#fff" onclick="generateMineLayer(); renderMine(document.getElementById('tab-content'));">${t('mine_new_layer')}</button>
  </div>`;
}

// ============================================================
// INVENTORY TAB
// ============================================================

// ============================================================
// SHOP TAB
// ============================================================

// ============================================================
// POKÉMON MARKET
// ============================================================

// ============================================================
// POKEDEX TAB
// ============================================================

// ============================================================
// BATTLE ENGINE — real-time auto-battle, Pokéchill-style.
// Combat resolves on its own: each active Pokémon "charges" an
// attack (shown as filling cooldown bars on its moves) and fires
// automatically once ready. There is no manual move/bag/ball
// input during a fight — the only actions left to the player are
// "Fuir/Abandonner" (leave anytime, no penalty, never blocks a
// rematch) and "Quitter" (stop a wild Pokéchill loop).
// ============================================================

// Cooldown (ms) before a Pokémon's next auto-attack, scaled by its effective Speed
// (base Speed stat, adjusted by paralysis and any temporary buffs/debuffs).
