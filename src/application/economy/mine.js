// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function getSecretBaseBonuses(...args) { const f = __pwV43Link('getSecretBaseBonuses'); return f ? f(...args) : undefined; }
export const MINE_W = 10;
export const MINE_H = 8;
// Evolution stones = Mine exclusives (removed from the shops).
// Fossils + treasures + a few rare held evolution items.
export const MINE_ITEMS = [
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
 // items of evolution held (rares) — alternative to the drops of donjon
 {key:'kings_rock', name:'kings_rock', shape:[[0,1,0],[1,1,1],[0,1,0]]},
 {key:'metal_coat', name:'metal_coat', shape:[[1,1,1],[1,0,1],[1,1,1]]},
 {key:'dragon_scale', name:'dragon_scale', shape:[[0,1,1],[1,1,0],[0,1,1]]},
 {key:'upgrade', name:'upgrade', shape:[[1,1],[1,1],[1,1]]},
 {key:'deep_sea_tooth', name:'deep_sea_tooth', shape:[[1,0],[1,1],[0,1]]},
 {key:'deep_sea_scale', name:'deep_sea_scale', shape:[[0,1],[1,1],[1,0]]},
 {key:'prism_scale', name:'prism_scale', shape:[[0,1,0],[1,1,1],[0,1,0]]},
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

export const MINE_AUTO_COST = 1000000;
export const MINE_TOOL_DEFS = {
 chisel:{cost:5, power:2, shape:'single'},
 hammer:{cost:15, power:1, shape:'square3'},
 pickaxe:{cost:500000, energy:20, power:2, shape:'cross'},
 drill:{cost:1500000, energy:35, power:2, shape:'line5'},
 dynamite:{cost:3000000, energy:60, power:4, shape:'square3'}
};
export const MINE_ENERGY_UPGRADE_COSTS = [250000, 750000, 1500000, 3000000];
let _mineAutoTicker = null;
function appSetInterval(name, callback, delay){
 if(typeof PokeWorldTimers !== 'undefined' && PokeWorldTimers?.set) return PokeWorldTimers.set(name, callback, delay);
 return setInterval(callback, delay);
}
function ensureMineAutomation(){
 initMineIfNeeded();
 if(!G.mine.automation || typeof G.mine.automation !== 'object') G.mine.automation = {purchased:false, enabled:false, strategy:'balanced'};
 if(!G.mine.upgrades || typeof G.mine.upgrades !== 'object') G.mine.upgrades = {energyLevel:0};
 if(typeof G.mine.automation.purchased !== 'boolean') G.mine.automation.purchased = false;
 if(typeof G.mine.automation.enabled !== 'boolean') G.mine.automation.enabled = false;
 if(!G.mine.automation.strategy) G.mine.automation.strategy = 'balanced';
 return G.mine.automation;
}
function ensureMineTools(){
 initMineIfNeeded();
 if(!G.mine.unlockedTools || typeof G.mine.unlockedTools !== 'object') G.mine.unlockedTools = {chisel:true, hammer:true};
 G.mine.unlockedTools.chisel = true;
 G.mine.unlockedTools.hammer = true;
 return G.mine.unlockedTools;
}
function isMineToolUnlocked(tool){ return !!ensureMineTools()[tool]; }
function buyMineTool(tool){
 ensureMineTools();
 const def = MINE_TOOL_DEFS[tool];
 if(!def || !def.cost){ return; }
 if(isMineToolUnlocked(tool)){ notify(t('mine_tool_owned'), 'var(--green)'); return; }
 if(G.money < def.cost){ notify(t('n.pas_assez_dargent'), 'var(--red)'); return; }
 G.money -= def.cost;
 G.mine.unlockedTools[tool] = true;
 updateHeader(); saveGame();
 notify(tr('mine_tool_bought', {tool:t('mine_tool_'+tool)}), 'var(--green)');
 try{ openMineManagementMenu('upgrades'); renderMineWindow(); }catch(_){}
}
function mineToolEnergyCost(tool){
 const def = MINE_TOOL_DEFS[tool] || MINE_TOOL_DEFS.chisel;
 let cost = def.energy || def.cost || 5;
 const bonus = (typeof getStaffBonus === 'function') ? (getStaffBonus('mine','mine_energy_cost') || getStaffBonus('mine','mine_efficiency') || 0) : 0;
 if(bonus) {
   const discount = Math.min(0.50, bonus);
   cost = Math.max(1, Math.ceil(cost * (1 - discount)));
 }
 return cost;
}
function mineToolCells(tool, tx, ty){
 const def = MINE_TOOL_DEFS[tool] || MINE_TOOL_DEFS.chisel;
 const cells = [];
 const add = (x,y)=>{ if(x>=0 && x<MINE_W && y>=0 && y<MINE_H) cells.push([x,y]); };
 if(def.shape === 'square3'){
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) add(tx+dx, ty+dy);
 } else if(def.shape === 'cross'){
  add(tx,ty); add(tx+1,ty); add(tx-1,ty); add(tx,ty+1); add(tx,ty-1);
 } else if(def.shape === 'line5'){
  for(let dx=-2;dx<=2;dx++) add(tx+dx,ty);
 } else add(tx,ty);
 return cells;
}
function buyMineAutomation(){
 ensureMineAutomation();
 if(G.mine.automation.purchased){ notify(t('automation_already_bought'), 'var(--green)'); return; }
 if(G.money < MINE_AUTO_COST){ notify(tr('automation_upgrade_need_money', {price:MINE_AUTO_COST.toLocaleString()}), 'var(--red)'); return; }
 G.money -= MINE_AUTO_COST;
 G.mine.automation.purchased = true;
 updateHeader();
 saveGame();
 notify(tr('automation_upgrade_bought', {name:t('mine_auto_title'), price:MINE_AUTO_COST.toLocaleString()}), 'var(--green)');
 try{ openMineManagementMenu('automation'); }catch(_){}
}
function toggleMineAutomation(){
 ensureMineAutomation();
 if(!G.mine.automation.purchased){ buyMineAutomation(); return; }
 G.mine.automation.enabled = !G.mine.automation.enabled;
 saveGame();
 if(G.mine.automation.enabled) startMineAutomationTicker();
 try{ openMineManagementMenu('automation'); }catch(_){}
}
function getMineEnergyUpgradeCost(){
 ensureMineAutomation();
 const lvl = G.mine.upgrades.energyLevel || 0;
 return MINE_ENERGY_UPGRADE_COSTS[lvl] || null;
}
function upgradeMineEnergy(){
 ensureMineAutomation();
 const cost = getMineEnergyUpgradeCost();
 if(!cost){ notify(t('mine_energy_maxed'), 'var(--green)'); return; }
 if(G.money < cost){ notify(t('n.pas_assez_dargent'), 'var(--red)'); return; }
 G.money -= cost;
 G.mine.upgrades.energyLevel = (G.mine.upgrades.energyLevel||0)+1;
 G.mine.maxEnergy = (G.mine.maxEnergy||100) + 25;
 G.mine.energy = Math.min(G.mine.maxEnergy, (G.mine.energy||0) + 25);
 updateHeader();
 saveGame();
 notify(tr('mine_energy_upgraded', {energy:G.mine.maxEnergy}), 'var(--green)');
 try{ renderMineWindow(); openMineManagementMenu('upgrades'); }catch(_){}
}
function findMineAutoTarget(){
 initMineIfNeeded();
 for(let y=0;y<MINE_H;y++){
  for(let x=0;x<MINE_W;x++){
   if(G.mine.grid[y][x] > 0) return {x,y};
  }
 }
 return null;
}
function mineAutoStep(){
 ensureMineAutomation();
 if(!G.mine.automation.enabled || !G.mine.automation.purchased) return;
 if((G.mine.energy||0) < 5) return;
 
 const fee = typeof getMineAutomationFee === 'function' ? getMineAutomationFee() : 0;
 if(fee > 0) {
   if(G.money < fee) {
     G.mine.automation.enabled = false;
     notify(t('mine_auto_no_money'), "var(--red)");
     saveGame();
     try{ renderMineWindow(); }catch(_){}
     return;
   }
   G.money -= fee;
   addBattleLog((typeof tr === 'function' ? tr('mine_auto_fee_log', {fee: fee}) : ` [Mine] -${fee}₽ payés pour l'extraction automatique d'une tuile.`));
   updateHeader();
 }

 const oldTool = G.mine.tool;
 G.mine.tool = 'chisel';
 const target = findMineAutoTarget();
 if(target) digMineTile(target.x, target.y, true);
 G.mine.tool = oldTool || 'chisel';
}
function simulateAfkMineAutomation(seconds){
 ensureMineAutomation();
 if(!G.mine.automation.enabled || !G.mine.automation.purchased) return 0;
 // Phase 28: TIME budget (no more hidden 500-step cap ≈ 10 min).
 // Live regeneration (+2/s) is interleaved at each 1.2 s step, as the
 // real ticker does while the shovel spins — otherwise the mine would
 // starve beyond the stored energy, betraying the 100% efficiency.
 const steps = Math.min(40000, Math.floor(Math.max(0, seconds||0) / 1.2)); // perf guard
 const regenPerStep = 2 * 1.2;
 let done = 0;
 for(let i=0;i<steps;i++){
  G.mine.energy = Math.min(G.mine.maxEnergy || 100, (G.mine.energy||0) + regenPerStep);
  const before = G.mine.energy || 0;
  mineAutoStep();
  if((G.mine.energy||0) < before) done++;
 }
 return done;
}
function startMineAutomationTicker(){
 if(_mineAutoTicker) return;
 _mineAutoTicker = appSetInterval('mine', ()=>{
  try{ if(G && G.mine && G.mine.automation && G.mine.automation.enabled) mineAutoStep(); }catch(e){ console.error(e); }
 }, 1200);
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
 let extraItems = 0;
 try {
   const active = (G.staff && G.staff.active && G.staff.active.mine) || [];
   if (active.includes('miner_mahogany')) {
     const lvl = (typeof staffLevel === 'function') ? staffLevel('miner_mahogany') : 1;
     extraItems = Math.min(3, Math.floor(1 + 2 * (lvl - 1) / 99));
   }
 } catch(_){}
 const numItems = rand(3, 5) + extraItems;
 const placed = [];
 const occupied = Array.from({length: MINE_H}, () => Array(MINE_W).fill(false));

 
  const hoennUnlocked = !!(typeof G !== 'undefined' && G && (
   G.region === 'hoenn' ||
   (G.mainStep && (G.mainStep.hoenn > 0)) ||
   (G.completedQuests && (G.completedQuests[201] || G.completedQuests['201'])) ||
   (G.visitedMaps && (G.visitedMaps.rustboro || G.visitedMaps.route104 || G.visitedMaps.petalburg || G.visitedMaps.mauville))
 ));
 const minePool = MINE_ITEMS.filter(it => {
   if (!hoennUnlocked && (it.key === 'root_fossil' || it.key === 'claw_fossil')) return false;
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
 try{ autoSave(); }catch(_e){}
}


function setMineTool(tool){
 if(!G.mine) return;
 if(!isMineToolUnlocked(tool)){ notify(t('mine_tool_locked'), 'var(--red)'); return; }
 G.mine.tool = tool;
 renderMineWindow();
}


function digMineTile(tx, ty, silent=false){
 initMineIfNeeded();
 const tool = isMineToolUnlocked(G.mine.tool || 'chisel') ? (G.mine.tool || 'chisel') : 'chisel';
 const def = MINE_TOOL_DEFS[tool] || MINE_TOOL_DEFS.chisel;
 const cost = mineToolEnergyCost(tool);
 const cells = mineToolCells(tool, tx, ty);
 const canDig = cells.some(([x,y]) => G.mine.grid[y][x] > 0);
 if(!canDig) return;
 if((G.mine.energy||0) < cost){
  if(!silent) notify(t("legacy_message_n_nergie_insuffisante_combattez_des_pok_m"),'var(--red)');
  return;
 }
 G.mine.energy -= cost;
 for(const [x,y] of cells){
  if(G.mine.grid[y][x] > 0) G.mine.grid[y][x] = Math.max(0, G.mine.grid[y][x] - (def.power || 1));
 }
 for(const itm of G.mine.items){
  if(itm.collected) continue;
  const shW = itm.shape[0].length;
  const shH = itm.shape.length;
  let allUncovered = true;
  for(let dy=0; dy<shH; dy++){
   for(let dx=0; dx<shW; dx++){
    if(itm.shape[dy][dx] === 1 && G.mine.grid[itm.y+dy][itm.x+dx] > 0){ allUncovered = false; break; }
   }
   if(!allUncovered) break;
  }
  if(allUncovered){
   itm.collected = true;
   try { if (typeof progressMainQuestType === 'function') progressMainQuestType('mine_items', 1); } catch (_) {}
   addToInventory(itm.key, 1);
   if(!G.mine.completedCount) G.mine.completedCount = 0;
   G.mine.completedCount++;
   if(typeof addStaffXp === 'function') addStaffXp('mine', 1);
   if(!silent) notify(tr('mine_found', {item:getItemName(itm.key)}),'var(--green)');
   try{ addBattleLog(tr('mine_battle_log', {icon:ITEMS[itm.key]?.icon||'', item:getItemName(itm.key)})); }catch(_){ }
  }
 }
 if(G.mine.items && (!G.mine.items.length || G.mine.items.every(it => it.collected))){
  if(!silent) notify(t('mine_depleted_new'), 'var(--blue)');
  generateMineLayer();
 }
 saveGame();
 try{ autoSave(); }catch(_e){}
 renderMineWindow();
}



// --- Migrated to ES module, globals exposed ---
function getMineMaxEnergy() {
  const base = (G.mine && G.mine.maxEnergy) ? G.mine.maxEnergy : 100;
  const bonusPct = (typeof __pwV43Link('getSecretBaseBonuses') === 'function') ? (getSecretBaseBonuses().mineBonus || 0) : 0;
  return Math.round(base * (1 + bonusPct / 100));
}

if (typeof getMineMaxEnergy !== 'undefined') { if (typeof window !== 'undefined') window.getMineMaxEnergy = getMineMaxEnergy; if (typeof globalThis !== 'undefined') globalThis.getMineMaxEnergy = getMineMaxEnergy; }
if (typeof MINE_ITEMS !== 'undefined') { if (typeof window !== 'undefined') window.MINE_ITEMS = MINE_ITEMS; if (typeof globalThis !== 'undefined') globalThis.MINE_ITEMS = MINE_ITEMS; }
if (typeof initMineIfNeeded !== 'undefined') { if (typeof window !== 'undefined') window.initMineIfNeeded = initMineIfNeeded; if (typeof globalThis !== 'undefined') globalThis.initMineIfNeeded = initMineIfNeeded; }
if (typeof generateMineLayer !== 'undefined') { if (typeof window !== 'undefined') window.generateMineLayer = generateMineLayer; if (typeof globalThis !== 'undefined') globalThis.generateMineLayer = generateMineLayer; }
if (typeof setMineTool !== 'undefined') { if (typeof window !== 'undefined') window.setMineTool = setMineTool; if (typeof globalThis !== 'undefined') globalThis.setMineTool = setMineTool; }
if (typeof digMineTile !== 'undefined') { if (typeof window !== 'undefined') window.digMineTile = digMineTile; if (typeof globalThis !== 'undefined') globalThis.digMineTile = digMineTile; }

if (typeof ensureMineAutomation !== 'undefined') { if (typeof window !== 'undefined') window.ensureMineAutomation = ensureMineAutomation; if (typeof globalThis !== 'undefined') globalThis.ensureMineAutomation = ensureMineAutomation; }
if (typeof isMineToolUnlocked !== 'undefined') { if (typeof window !== 'undefined') window.isMineToolUnlocked = isMineToolUnlocked; if (typeof globalThis !== 'undefined') globalThis.isMineToolUnlocked = isMineToolUnlocked; }
if (typeof buyMineTool !== 'undefined') { if (typeof window !== 'undefined') window.buyMineTool = buyMineTool; if (typeof globalThis !== 'undefined') globalThis.buyMineTool = buyMineTool; }
if (typeof mineToolEnergyCost !== 'undefined') { if (typeof window !== 'undefined') window.mineToolEnergyCost = mineToolEnergyCost; if (typeof globalThis !== 'undefined') globalThis.mineToolEnergyCost = mineToolEnergyCost; }
if (typeof buyMineAutomation !== 'undefined') { if (typeof window !== 'undefined') window.buyMineAutomation = buyMineAutomation; if (typeof globalThis !== 'undefined') globalThis.buyMineAutomation = buyMineAutomation; }
if (typeof toggleMineAutomation !== 'undefined') { if (typeof window !== 'undefined') window.toggleMineAutomation = toggleMineAutomation; if (typeof globalThis !== 'undefined') globalThis.toggleMineAutomation = toggleMineAutomation; }
if (typeof getMineEnergyUpgradeCost !== 'undefined') { if (typeof window !== 'undefined') window.getMineEnergyUpgradeCost = getMineEnergyUpgradeCost; if (typeof globalThis !== 'undefined') globalThis.getMineEnergyUpgradeCost = getMineEnergyUpgradeCost; }
if (typeof upgradeMineEnergy !== 'undefined') { if (typeof window !== 'undefined') window.upgradeMineEnergy = upgradeMineEnergy; if (typeof globalThis !== 'undefined') globalThis.upgradeMineEnergy = upgradeMineEnergy; }
if (typeof startMineAutomationTicker !== 'undefined') { if (typeof window !== 'undefined') window.startMineAutomationTicker = startMineAutomationTicker; if (typeof globalThis !== 'undefined') globalThis.startMineAutomationTicker = startMineAutomationTicker; }
if (typeof simulateAfkMineAutomation !== 'undefined') { if (typeof window !== 'undefined') window.simulateAfkMineAutomation = simulateAfkMineAutomation; if (typeof globalThis !== 'undefined') globalThis.simulateAfkMineAutomation = simulateAfkMineAutomation; }



// --- Exported globals ---
if (typeof appSetInterval !== 'undefined') { if (typeof window !== 'undefined') window.appSetInterval = appSetInterval; if (typeof globalThis !== 'undefined') globalThis.appSetInterval = appSetInterval; }
if (typeof ensureMineTools !== 'undefined') { if (typeof window !== 'undefined') window.ensureMineTools = ensureMineTools; if (typeof globalThis !== 'undefined') globalThis.ensureMineTools = ensureMineTools; }
if (typeof findMineAutoTarget !== 'undefined') { if (typeof window !== 'undefined') window.findMineAutoTarget = findMineAutoTarget; if (typeof globalThis !== 'undefined') globalThis.findMineAutoTarget = findMineAutoTarget; }
if (typeof mineAutoStep !== 'undefined') { if (typeof window !== 'undefined') window.mineAutoStep = mineAutoStep; if (typeof globalThis !== 'undefined') globalThis.mineAutoStep = mineAutoStep; }
if (typeof mineToolCells !== 'undefined') { if (typeof window !== 'undefined') window.mineToolCells = mineToolCells; if (typeof globalThis !== 'undefined') globalThis.mineToolCells = mineToolCells; }

// FIX (2026-08, broken Mine window): shared dimensions and definitions.
// mine-ui.js references MINE_W / MINE_H / MINE_TOOL_DEFS as free identifiers;
// left unexposed, renderMine() threw a ReferenceError => window never shown.
if (typeof MINE_W !== 'undefined') { if (typeof window !== 'undefined') window.MINE_W = MINE_W; if (typeof globalThis !== 'undefined') globalThis.MINE_W = MINE_W; }
if (typeof MINE_H !== 'undefined') { if (typeof window !== 'undefined') window.MINE_H = MINE_H; if (typeof globalThis !== 'undefined') globalThis.MINE_H = MINE_H; }
if (typeof MINE_TOOL_DEFS !== 'undefined') { if (typeof window !== 'undefined') window.MINE_TOOL_DEFS = MINE_TOOL_DEFS; if (typeof globalThis !== 'undefined') globalThis.MINE_TOOL_DEFS = MINE_TOOL_DEFS; }
if (typeof MINE_AUTO_COST !== 'undefined') { if (typeof window !== 'undefined') window.MINE_AUTO_COST = MINE_AUTO_COST; if (typeof globalThis !== 'undefined') globalThis.MINE_AUTO_COST = MINE_AUTO_COST; }
if (typeof MINE_ENERGY_UPGRADE_COSTS !== 'undefined') { if (typeof window !== 'undefined') window.MINE_ENERGY_UPGRADE_COSTS = MINE_ENERGY_UPGRADE_COSTS; if (typeof globalThis !== 'undefined') globalThis.MINE_ENERGY_UPGRADE_COSTS = MINE_ENERGY_UPGRADE_COSTS; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  getMineMaxEnergy,
  initMineIfNeeded,
  generateMineLayer,
  setMineTool,
  digMineTile,
  ensureMineAutomation,
  isMineToolUnlocked,
  buyMineTool,
  mineToolEnergyCost,
  buyMineAutomation,
  toggleMineAutomation,
  getMineEnergyUpgradeCost,
  upgradeMineEnergy,
  startMineAutomationTicker,
  simulateAfkMineAutomation,
  appSetInterval,
  ensureMineTools,
  findMineAutoTarget,
  mineAutoStep,
  mineToolCells,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('generateMineLayer', generateMineLayer); } catch (_) {} }

