function initMineIfNeeded(){
  if(!G.mine){
    G.mine = {
      energy: 100,
      maxEnergy: 100,
      tool: 'chisel',
      grid: null,
      items: null,
      completedCount: 0
    };
  }
  if(!G.mine.grid || !G.mine.items){
    generateMineLayer();
  }
}

function generateMineLayer(){
  if(!G.mine) initMineIfNeeded();
  const grid = [];
  for(let y=0; y<MINE_H; y++){
    const row = [];
    for(let x=0; x<MINE_W; x++){
      row.push(rand(1, 4));
    }
    grid.push(row);
  }
  const numItems = rand(3, 5);
  const placed = [];
  const occupied = Array.from({length: MINE_H}, () => Array(MINE_W).fill(false));

  for(let i=0; i<numItems; i++){
    const tmpl = MINE_ITEMS[rand(0, MINE_ITEMS.length - 1)];
    const shW = tmpl.shape[0].length;
    const shH = tmpl.shape.length;
    for(let attempt=0; attempt<30; attempt++){
      const rx = rand(0, MINE_W - shW);
      const ry = rand(0, MINE_H - shH);
      let canPlace = true;
      for(let dy=0; dy<shH; dy++){
        for(let dx=0; dx<shW; dx++){
          if(tmpl.shape[dy][dx] === 1 && occupied[ry+dy][rx+dx]){
            canPlace = false; break;
          }
        }
        if(!canPlace) break;
      }
      if(canPlace){
        for(let dy=0; dy<shH; dy++){
          for(let dx=0; dx<shW; dx++){
            if(tmpl.shape[dy][dx] === 1) occupied[ry+dy][rx+dx] = true;
          }
        }
        placed.push({
          key: tmpl.key,
          name: tmpl.name,
          x: rx,
          y: ry,
          shape: tmpl.shape,
          collected: false
        });
        break;
      }
    }
  }

  G.mine.grid = grid;
  G.mine.items = placed;
  saveGame();
}

function setMineTool(tool){
  if(!G.mine) return;
  G.mine.tool = tool;
  const content = document.getElementById('tab-content');
  if(document.querySelector('.tab.active')?.textContent.includes('Mine')) renderMine(content);
}

function digMineTile(tx, ty){
  initMineIfNeeded();
  const tool = G.mine.tool || 'chisel';
  const cost = tool === 'hammer' ? 15 : 5;

  let canDig = false;
  if(tool === 'hammer'){
    for(let dy=-1; dy<=1; dy++){
      for(let dx=-1; dx<=1; dx++){
        const nx = tx + dx;
        const ny = ty + dy;
        if(nx>=0 && nx<MINE_W && ny>=0 && ny<MINE_H){
          if(G.mine.grid[ny][nx] > 0) canDig = true;
        }
      }
    }
  } else {
    if(G.mine.grid[ty][tx] > 0) canDig = true;
  }
  if(!canDig) return;

  if((G.mine.energy||0) < cost){
    notify('⚡ Énergie insuffisante ! Combattez des Pokémon sauvages pour recharger.','var(--red)');
    return;
  }
  G.mine.energy -= cost;

  if(tool === 'hammer'){
    for(let dy=-1; dy<=1; dy++){
      for(let dx=-1; dx<=1; dx++){
        const nx = tx + dx;
        const ny = ty + dy;
        if(nx>=0 && nx<MINE_W && ny>=0 && ny<MINE_H){
          G.mine.grid[ny][nx] = Math.max(0, G.mine.grid[ny][nx] - 1);
        }
      }
    }
  } else {
    if(G.mine.grid[ty][tx] > 0){
      G.mine.grid[ty][tx] = Math.max(0, G.mine.grid[ty][tx] - 2);
    }
  }

  for(const itm of G.mine.items){
    if(itm.collected) continue;
    const shW = itm.shape[0].length;
    const shH = itm.shape.length;
    let allUncovered = true;
    for(let dy=0; dy<shH; dy++){
      for(let dx=0; dx<shW; dx++){
        if(itm.shape[dy][dx] === 1 && G.mine.grid[itm.y+dy][itm.x+dx] > 0){
          allUncovered = false; break;
        }
      }
      if(!allUncovered) break;
    }
    if(allUncovered){
      itm.collected = true;
      addToInventory(itm.key, 1);
      if(!G.mine.completedCount) G.mine.completedCount = 0;
      G.mine.completedCount++;
      notify(`⛏️ Trouvé : ${getItemName(itm.key)} !`,'var(--green)');
      addBattleLog(`⛏️ Souterrain : Vous avez déterré ${ITEMS[itm.key]?.icon||'💎'} <b>${getItemName(itm.key)}</b> !`);
    }
  }

  saveGame();
  const content = document.getElementById('tab-content');
  if(document.querySelector('.tab.active')?.textContent.includes('Mine')) renderMine(content);
}

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

