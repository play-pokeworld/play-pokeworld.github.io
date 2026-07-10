// ============================================================
// MINE — (split from mine.js)
// ============================================================
const MINE_W = 10;
const MINE_H = 8;
const MINE_ITEMS = [
  {key:'firestone',    name:'Pierre Feu',       shape:[[1,1,1],[1,1,1],[1,1,1]]},
  {key:'waterstone',   name:'Pierre Eau',       shape:[[1,1,1],[1,1,1],[1,1,0]]},
  {key:'thunderstone', name:'Pierre Foudre',    shape:[[0,1,0],[1,1,1],[0,1,0]]},
  {key:'leafstone',    name:'Pierre Plante',    shape:[[0,1,0],[1,1,1],[1,1,1]]},
  {key:'moonstone',    name:'Pierre Lune',      shape:[[1,1],[1,1]]},
  {key:'sunstone',     name:'Pierre Soleil',    shape:[[1,0,1],[0,1,0],[1,0,1]]},
  {key:'nugget',       name:'Pépite',           shape:[[1,1,1],[1,1,1]]},
  {key:'stardust',     name:'Poussière Étoile', shape:[[1,1],[1,1]]},
  // Fossiles PokéClicker
  {key:'helix_fossil', name:'Fossile Nautile',  shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]},
  {key:'dome_fossil',  name:'Fossile Dôme',     shape:[[1,1,1],[1,1,1],[0,1,0]]},
  {key:'old_amber',    name:'Vieil Ambre',      shape:[[1,1],[1,1],[1,1]]},
  {key:'root_fossil',  name:'Fossile Racine',   shape:[[1,1,0],[1,1,1],[0,1,1]]},
  {key:'claw_fossil',  name:'Fossile Griffe',   shape:[[1,0,1],[1,1,1],[1,0,1]]},
  {key:'fossil',       name:'Fossile Ancien',   shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]},
];

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

  // --- Fossiles régionaux : Kanto d'abord, Johto après déblocage ---
  const region = (G && G.region) ? G.region : 'kanto';
  // Region gating: Johto fossils only appear once the player has travelled to Johto.
  // Kanto fossils (helix/dome/amber) are always available.
  const johtoVisited = (region === 'johto') || (G.regionStarter && G.regionStarter.johto) ||
                       (G.badges && G.badges.length >= 8) ||
                       (G.visitedMaps && (G.visitedMaps.newbark || G.visitedMaps.jroute29));
  const minePool = MINE_ITEMS.filter(it=>{
    if(!johtoVisited && (it.key==='root_fossil' || it.key==='claw_fossil')) return false;
    return true;
  });
  for(let i=0; i<numItems; i++){
    const tmpl = minePool[rand(0, minePool.length - 1)];
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
    notify(t("n.énergie_insuffisante_combattez_des_pokém"),'var(--red)');
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

