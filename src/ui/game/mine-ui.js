// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
/**
 * Mine management model (tabs + content blocks) consumed by
 * ui/views/ManagementMenuView. Labels stay localized via t()/tr() at call
 * time. Uniform parts (tabs, upgrade cards, automation toggle) are pure
 * ECS design-system blocks; the staff list remains a staged classic
 * fragment for now.
 */
// FIX (2026-08): the energy hint used to be a frozen string ("+2 / sec · +15
// par victoire sauvage"), so rebalancing ENERGY_PER_BATTLE from 15 to 5 left
// the UI lying to the player. It now interpolates the real constants.
function _mineEnergyHint(){
 let regen = 2, perBattle = 5;
 try{ if(typeof MINE_ENERGY_REGEN === 'number') regen = MINE_ENERGY_REGEN; }catch(_){}
 try{ if(typeof MINE_ENERGY_PER_BATTLE === 'number') perBattle = MINE_ENERGY_PER_BATTLE; }catch(_){}
 return (typeof tr === 'function')
  ? tr('mine_energy_hint', { regen, perBattle })
  : t('mine_energy_hint');
}

function mineManagementModel(page){
 const icon=(n)=> (typeof getIcon==='function'?getIcon(n,14):'');
 const call='openMineManagementMenu';
 const tabs=[
  {id:'upgrades',label:t('management_upgrades'),iconHtml:icon('save'),call,args:`'upgrades'`,active:page==='upgrades'},
  {id:'automation',label:t('management_automation'),iconHtml:icon('settings'),call,args:`'automation'`,active:page==='automation'},
  {id:'miners',label:t('management_miners'),iconHtml:icon('mine'),call,args:`'miners'`,active:page==='miners'},
 ];
 const blocks=[];
 if(page==='miners'){
  // automation.js may be absent in targeted unit-test sandboxes — the
  // block then renders nothing (same as the old guarded fragment).
  blocks.push({kind:'staff',class:'management-staff-block',staff:typeof staffListModel==='function'?staffListModel('mine'):null});
 }else if(page==='automation'){
  const auto=G.mine.automation||{purchased:false,enabled:false};
  blocks.push({kind:'toggles',cards:[
   {iconHtml:icon('mine'),label:t('mine_auto_title'),purchased:!!auto.purchased,enabled:!!auto.enabled,
    call:'toggleMineAutomation',args:'',onLabel:t('automation_enabled'),offLabel:t('automation_disabled'),lockedLabel:t('automation_locked_upgrade')},
  ]});
 }else{
  const auto=G.mine.automation||{purchased:false,enabled:false};
  const energyCost=typeof getMineEnergyUpgradeCost==='function'?getMineEnergyUpgradeCost():null;
  const toolCard=(tool)=>{
   const unlocked=typeof isMineToolUnlocked==='function'&&isMineToolUnlocked(tool);
   const def=typeof MINE_TOOL_DEFS!=='undefined'?MINE_TOOL_DEFS[tool]:null;
   return unlocked
    ? {title:t('mine_tool_'+tool),value:t('owned'),state:'owned',stateLabel:t('owned')}
    : {title:t('mine_tool_'+tool),value:(def&&def.cost?def.cost.toLocaleString()+'₽':''),state:'buy',call:'buyMineTool',args:`'${tool}'`,buyLabel:t('buy_btn')};
  };
  blocks.push({kind:'upgrades',cards:[
   energyCost
    ? {title:t('mine_energy_upgrade_title'),value:String(G.mine.maxEnergy||100),state:'buy',call:'upgradeMineEnergy',args:'',buyLabel:`${energyCost.toLocaleString()}₽`}
    : {title:t('mine_energy_upgrade_title'),value:String(G.mine.maxEnergy||100),state:'owned',stateLabel:t('automation_owned')},
   auto.purchased
    ? {title:t('mine_auto_title'),value:t('automation_owned'),state:'owned',stateLabel:t('automation_owned')}
    : {title:t('mine_auto_title'),value:tr('automation_buy_button',{price:'1 000 000'}),state:'buy',call:'buyMineAutomation',args:'',buyLabel:t('buy_btn')},
   toolCard('pickaxe'),
   toolCard('drill'),
   toolCard('dynamite'),
  ]});
 }
 return {machine:'mine',title:t('mine_management_title'),titleIconHtml:icon('settings'),tabs,activeTab:page,blocks};
}
let _mineMgmtLastPage = null; // suivi of page for the conservation of the scroll
function openMineManagementMenu(page='upgrades'){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 // Anti "jump to top" (passes 15+16): persistent skeleton like the
 // hatchery and the training (scrollable container never recreated).
 // The shell itself is the ECS ManagementMenuView.
 const _keepScroll = (_mineMgmtLastPage === page);
 _mineMgmtLastPage = page;
 modal.classList.remove('poke-detail-front');
 inner.classList.remove('poke-detail-inner');
 inner.classList.add('management-inner');
 if(typeof ensureMineAutomation === 'function') ensureMineAutomation();
 const views=(typeof window!=='undefined'&&window.PokeUI&&window.PokeUI.views)?window.PokeUI.views:null;
 if(!views||typeof views.ManagementMenuView!=='function') throw new Error('[ui] PokeUI views not loaded (ManagementMenuView)');
 const model=mineManagementModel(page);
 const shell = inner.querySelector && inner.querySelector('.management-shell.management-mine');
 let contentEl = shell ? shell.querySelector('.management-content') : null;
 if(!contentEl){
  _pwSetHtmlSafe(inner, views.ManagementMenuView.toHTML(model));
  contentEl = inner.querySelector('.management-content');
 }
 const tabsHost = inner.querySelector('.management-tabs-host');
 if(tabsHost) _pwSetHtmlSafe(tabsHost, views.ManagementMenuView.tabsHTML(model));
 const _pos = _keepScroll && contentEl ? (contentEl.scrollTop || 0) : 0;
 const body = views.ManagementMenuView.contentHTML(model);
 _pwSetHtmlSafe(contentEl, body);
 if(_keepScroll){ try{ contentEl.scrollTop = _pos; }catch(_){} }
 else if(typeof pwResetScrollNow === 'function') pwResetScrollNow(contentEl);
 else { try{ contentEl.scrollTop = 0; }catch(_){} }
 if(typeof window!=='undefined' && typeof window.pwModalInfo==='function') window.pwModalInfo(false);
 modal.classList.add('open');
}

// UI overhaul: the mine window is rendered by the ECS design system
// (MineWindowView) — zero legacy markup below. Rock/item colors are theme
// CLASSES on the design-system palette (mine-tile--d*/--item-*), not
// hardcoded hex strings in JS.
function renderMineWindow(){
 const el = document.getElementById('mine-window-body');
 if(!el) return;
 if(!mineUnlocked()){
 _pwSetHtmlSafe(el, `<div class="pw-empty-state-sm"> ${t('mine_locked_badges')}</div>`);
 return;
 }
 renderMine(el);
}

function renderMine(el){
 initMineIfNeeded();
 const {energy, maxEnergy, tool, grid, items} = G.mine;

 // Board model: shape detection stays here, every visual decision moves
 // to the view + design-system.css.
 const tiles = [];
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
 const canClick = depth > 0 || tool === 'hammer';
 tiles.push({
  depth: depth, x: x, y: y, clickable: canClick,
  itemKey: (depth === 0 && cellItem) ? cellItem.key : null,
  itemCenter: !!(depth === 0 && cellItem && isItemCenter),
  itemCollected: !!(cellItem && cellItem.collected),
  iconHtml: (depth === 0 && cellItem && isItemCenter) ? itemIcon(cellItem.key, 24) : null,
 });
 }
 }
 const foundCount = items.filter(i=>i.collected).length;
 const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.MineWindowView) throw new Error('[ui] PokeUI views not loaded (MineWindowView)');
 _pwSetHtmlSafe(el, views.MineWindowView.toHTML({
  className: 'mine-window',
  header: { classes: 'hatchery-upgrade-row', actions: [{ label: t('mine_management_button'), iconHtml: (typeof getIcon==='function'?getIcon('settings',14):''), call: 'openMineManagementMenu', callArgs: `'upgrades'` }] },
  title: t('mine_title'),
  subtitle: t('mine_sub'),
  energy: { label: t('mine_energy'), valueText: `${energy||0} / ${maxEnergy||100}`, pct: clamp(Math.floor(((energy||0)/Math.max(1,(maxEnergy||100)))*100), 0, 100), hint: _mineEnergyHint() },
  tools: ['chisel','hammer','pickaxe','drill','dynamite']
   .filter(tl => (typeof isMineToolUnlocked === 'function' ? isMineToolUnlocked(tl) : (tl==='chisel'||tl==='hammer')))
   .map(tl => ({ id: tl, label: t('mine_tool_'+tl), cost: (typeof mineToolEnergyCost==='function' ? mineToolEnergyCost(tl) : 5), selected: tool === tl, call: 'setMineTool', callArgs: `'${tl}'` })),
  grid: { cols: MINE_W, tiles: tiles },
  // Wave 32 (retour utilisateur) : chaque trésor est une pastille dont le
  // FOND et la couleur du nom disent s'il est encore enfoui ; une fois
  // déterré, le sprite de l'objet précède son nom. Aucun marqueur ❓/✔ :
  // le fond suffit (l'état reste annoncé aux lecteurs d'écran via `state`).
  treasures: { label: t('mine_treasures'), found: foundCount, total: items.length,
   rows: items.map(i => ({
     collected: !!i.collected,
     name: getItemName(i.key),
     iconHtml: i.collected ? itemIcon(i.key, 18, 'pw-mine-treasure-icon') : '',
     state: i.collected ? t('mine_treasure_found') : t('mine_treasure_buried'),
   })) },
  newLayerLabel: t('mine_new_layer'),
 }));
}


// --- Migrated to ES module, globals exposed ---
if (typeof openMineManagementMenu !== 'undefined') { if (typeof window !== 'undefined') window.openMineManagementMenu = openMineManagementMenu; if (typeof globalThis !== 'undefined') globalThis.openMineManagementMenu = openMineManagementMenu; }
if (typeof renderMineWindow !== 'undefined') { if (typeof window !== 'undefined') window.renderMineWindow = renderMineWindow; if (typeof globalThis !== 'undefined') globalThis.renderMineWindow = renderMineWindow; }
if (typeof renderMine !== 'undefined') { if (typeof window !== 'undefined') window.renderMine = renderMine; if (typeof globalThis !== 'undefined') globalThis.renderMine = renderMine; }



// --- Exported globals ---

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  openMineManagementMenu,
  renderMineWindow,
  renderMine,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('renderMineWindow', renderMineWindow); } catch (_) {} }

