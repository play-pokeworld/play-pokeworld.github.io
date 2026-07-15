const MINE_W = 10;
const MINE_H = 8;
const MINE_ITEMS = [
 {key:'firestone', name:'firestone', shape:[[1,1,1],[1,1,1],[1,1,1]]},
 {key:'waterstone', name:'waterstone', shape:[[1,1,1],[1,1,1],[1,1,0]]},
 {key:'thunderstone', name:'thunderstone', shape:[[0,1,0],[1,1,1],[0,1,0]]},
 {key:'leafstone', name:'leafstone', shape:[[0,1,0],[1,1,1],[1,1,1]]},
 {key:'moonstone', name:'moonstone', shape:[[1,1],[1,1]]},
 {key:'sunstone', name:'sunstone', shape:[[1,0,1],[0,1,0],[1,0,1]]},
 {key:'nugget', name:'nugget', shape:[[1,1,1],[1,1,1]]},
 {key:'stardust', name:'stardust', shape:[[1,1],[1,1]]},
 
 {key:'helix_fossil', name:'helix_fossil', shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]},
 {key:'dome_fossil', name:'dome_fossil', shape:[[1,1,1],[1,1,1],[0,1,0]]},
 {key:'old_amber', name:'old_amber', shape:[[1,1],[1,1],[1,1]]},
 {key:'root_fossil', name:'root_fossil', shape:[[1,1,0],[1,1,1],[0,1,1]]},
 {key:'claw_fossil', name:'claw_fossil', shape:[[1,0,1],[1,1,1],[1,0,1]]},
 {key:'fossil', name:'fossil', shape:[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]]},
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
 if(!G.mine.grid || !G.mine.items || !G.mine.items.length || G.mine.items.every(it => it.collected)){
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

 
 const region = (G && G.region) ? G.region : 'kanto';
 
 
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
 try{ autoSave(); }catch(e){}
}


function setMineTool(tool){
 if(!G.mine) return;
 G.mine.tool = tool;
 renderMineWindow();
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
 notify(t("legacy_message_n_nergie_insuffisante_combattez_des_pok_m"),'var(--red)');
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
 notify(tr('mine_found', {item:getItemName(itm.key)}),'var(--green)');
 addBattleLog(tr('mine_battle_log', {icon:ITEMS[itm.key]?.icon||'', item:getItemName(itm.key)}));
 }
 }

 if(G.mine.items && (!G.mine.items.length || G.mine.items.every(it => it.collected))){
 notify('⛏️ Couche épuisée : nouvelle mine générée automatiquement !', 'var(--blue)');
 generateMineLayer();
 }
 saveGame();
 try{ autoSave(); }catch(e){}
 renderMineWindow();
}
