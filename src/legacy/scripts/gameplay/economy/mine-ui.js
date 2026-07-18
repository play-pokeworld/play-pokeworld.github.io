function renderMineManagementTabs(active){
 return `<div class="management-tabs">
  <button class="hbtn ${active==='upgrades'?'active':''}" data-action="legacy-call" data-call="openMineManagementMenu" data-call-args="'upgrades'">⬆ ${t('management_upgrades')}</button>
  <button class="hbtn ${active==='automation'?'active':''}" data-action="legacy-call" data-call="openMineManagementMenu" data-call-args="'automation'">🤖 ${t('management_automation')}</button>
  <button class="hbtn ${active==='miners'?'active':''}" data-action="legacy-call" data-call="openMineManagementMenu" data-call-args="'miners'">⛏️ ${t('management_miners')}</button>
 </div>`;
}
function mineAutoUnlockCard(){
 const auto = G.mine.automation || {purchased:false};
 return `<div class="upgrade-card ${auto.purchased?'is-owned':''}"><div><b>${t('mine_auto_title')}</b><span>${auto.purchased?t('automation_owned'):tr('automation_buy_button', {price:'1 000 000'})}</span></div>${auto.purchased?'':`<button class="hbtn purchase-btn" data-action="legacy-call" data-call="buyMineAutomation" data-call-args="">${t('buy_btn')}</button>`}</div>`;
}
function mineToolUpgradeCard(tool){
 const unlocked = typeof isMineToolUnlocked==='function' && isMineToolUnlocked(tool);
 const def = typeof MINE_TOOL_DEFS !== 'undefined' ? MINE_TOOL_DEFS[tool] : null;
 return `<div class="upgrade-card mine-tool-upgrade-card ${unlocked?'is-owned':''}"><div><b>${t('mine_tool_'+tool)}</b><span>${unlocked?t('owned'):(def&&def.cost?def.cost.toLocaleString()+'₽':'')}</span></div>${unlocked?'':`<button class="hbtn purchase-btn" data-action="legacy-call" data-call="buyMineTool" data-call-args="'${tool}'">${t('buy_btn')}</button>`}</div>`;
}
function openMineManagementMenu(page='upgrades'){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 modal.classList.remove('poke-detail-front');
 inner.classList.remove('poke-detail-inner');
 inner.classList.add('management-inner');
 if(typeof ensureMineAutomation === 'function') ensureMineAutomation();
 const auto = G.mine.automation || {purchased:false, enabled:false};
 const energyCost = typeof getMineEnergyUpgradeCost === 'function' ? getMineEnergyUpgradeCost() : null;
 const body = page === 'miners'
  ? `${typeof renderStaffList==='function'?renderStaffList('mine'):''}`
  : page === 'automation'
  ? `<div class="automation-dashboard">${auto.purchased
       ? `<button class="hbtn automation-toggle-btn ${auto.enabled?'is-on':'is-off'}" data-action="legacy-call" data-call="toggleMineAutomation" data-call-args=""><span>⛏️ ${t('mine_auto_title')}</span><b>${auto.enabled?t('automation_enabled'):t('automation_disabled')}</b></button>`
       : `<div class="automation-locked-card"><span>⛏️ ${t('mine_auto_title')}</span><b>${t('automation_locked_upgrade')}</b></div>`}</div>`
  : `<div class="upgrade-grid">
      <div class="upgrade-card ${energyCost?'':'is-owned'}"><div><b>${t('mine_energy_upgrade_title')}</b><span>${G.mine.maxEnergy||100}</span></div>${energyCost?`<button class="hbtn purchase-btn" data-action="legacy-call" data-call="upgradeMineEnergy" data-call-args="">${energyCost.toLocaleString()}₽</button>`:`<b>${t('automation_owned')}</b>`}</div>
      ${mineAutoUnlockCard()}
      ${['pickaxe','drill','dynamite'].map(tool=>mineToolUpgradeCard(tool)).join('')}
     </div>`;
 inner.innerHTML = `<div class="modal-title management-title"><div>⚙️ ${t('mine_management_title')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="management-shell management-mine">
  ${renderMineManagementTabs(page)}
  <div class="management-content">${body}</div>
 </div>`;
 modal.classList.add('open');
}

function renderMineToolButton(tool){
 const unlocked = typeof isMineToolUnlocked === 'function' ? isMineToolUnlocked(tool) : (tool==='chisel'||tool==='hammer');
 const selected = G.mine && G.mine.tool === tool;
 const cost = typeof mineToolEnergyCost === 'function' ? mineToolEnergyCost(tool) : 5;
 return `<button class="hbtn mine-tool-btn ${selected?'active':''}" ${unlocked?`data-action="legacy-call" data-call="setMineTool" data-call-args="'${tool}'"`:'disabled'}>${t('mine_tool_'+tool)} · ${cost}⚡</button>`;
}
function renderMineWindow(){
 const el = document.getElementById('mine-window-body');
 if(!el) return;
 if(!mineUnlocked()){
 el.innerHTML = `<div class="extracted-template-style-222"> ${t('mine_locked_badges')}</div>`;
 return;
 }
 renderMine(el);
}

function renderMine(el){
 initMineIfNeeded();
 const {energy, maxEnergy, tool, grid, items} = G.mine;

 const rockColors = {
 4: '#4e3629',
 3: '#6d4c3d',
 2: '#8f6350',
 1: '#b5836d',
 0: 'var(--dark2)'
 };
 const itemColors = {
 firestone:'#ff3b1f', waterstone:'#00a6ff', thunderstone:'#ffe600', leafstone:'#39ff64', moonstone:'#d28cff', sunstone:'#ffb000',
 nugget:'#ffd84a', stardust:'#7ff7ff', helix_fossil:'#ff7bd5', dome_fossil:'#ff8a3d', old_amber:'#ffbf2f', fossil:'#ff5f9e', root_fossil:'#70ff3d', claw_fossil:'#ff5252'
 };

 let gridHtml = `<div class="mine-grid" data-grid-cols="${MINE_W}">`;

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
 const revealedItem = !!(depth === 0 && cellItem);
 const revealedColor = revealedItem ? (itemColors[cellItem.key] || '#ff4fd8') : null;
 if(depth === 0){
 if(cellItem){
 contentHtml = `<div class="mine-revealed-item ${cellItem.collected?'is-collected':''}" data-bg="${revealedColor}">${isItemCenter ? itemIcon(cellItem.key, 24) : ''}</div>`;
 }
 } else {
 contentHtml = `<div class="extracted-template-style-224">${depth}</div>`;
 }

 const canClick = depth > 0 || tool === 'hammer';
 gridHtml += `<div class="mine-tile ${canClick?'mine-tile-clickable':''} ${revealedItem?'mine-tile-revealed-item':''}" data-bg="${rockColors[depth]}" ${revealedItem?`data-bg="${revealedColor}"`:''} ${canClick ? `data-action="legacy-call" data-call="digMineTile" data-call-args="${x},${y}"` : ''}>
 ${contentHtml}
 </div>`;
 }
 }
 gridHtml += `</div>`;

 const foundCount = items.filter(i=>i.collected).length;

 el.innerHTML = `<div class="hatchery-upgrade-row"><button class="hbtn" data-action="legacy-call" data-call="openMineManagementMenu" data-call-args="'upgrades'">⚙️ ${t('mine_management_button')}</button></div>
 <div class="loc-title">${t('mine_title')}</div>
 <div class="loc-sub">${t('mine_sub')}</div>

 <div class="extracted-template-style-225">
 <div class="extracted-template-style-226">
 <div class="extracted-template-style-227">
 <span>${t('mine_energy')}</span>
 <span id="mine-energy-val" class="extracted-bridge-style-046">${energy||0} / ${maxEnergy||100}</span>
 </div>
 <div class="stat-bar extracted-bridge-style-047"><div id="mine-energy-bar" class="stat-fill"></div></div>
 <div class="extracted-template-style-228">${t('mine_energy_hint')}</div>
 </div>

 <div class="extracted-template-style-229">
 ${['chisel','hammer','pickaxe','drill','dynamite'].filter(tool=>typeof isMineToolUnlocked !== 'function' || isMineToolUnlocked(tool)).map(tool=>renderMineToolButton(tool)).join('')}
 </div>
 </div>

 ${gridHtml}

 <div class="extracted-template-style-230">
 <div>
 <span class="extracted-template-style-089">${t('mine_treasures')} <span class="extracted-template-style-002">${foundCount} / ${items.length}</span></span>
 <div class="extracted-template-style-231">
 ${items.map(i=>`<span>${i.collected?'':'❓'} ${getItemName(i.key)}</span>`).join('')}
 </div>
 </div>
 <button class="hbtn extracted-bridge-style-006" data-action="generate-mine-layer">${t('mine_new_layer')}</button>
 </div>`;
}


// --- Migrated to ES module, globals exposed ---
if (typeof openMineManagementMenu !== 'undefined' && typeof window !== 'undefined') window.openMineManagementMenu = openMineManagementMenu;
if (typeof renderMineWindow !== 'undefined' && typeof window !== 'undefined') window.renderMineWindow = renderMineWindow;
if (typeof renderMine !== 'undefined' && typeof window !== 'undefined') window.renderMine = renderMine;

