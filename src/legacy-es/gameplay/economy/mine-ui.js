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
 if(depth === 0){
 if(cellItem){
 contentHtml = `<div>${isItemCenter ? itemIcon(cellItem.key, 24) : ''}</div>`;
 }
 } else {
 const hint = (depth === 1 && cellItem) ? `<div class="extracted-template-style-223"></div>` : '';
 contentHtml = `<div class="extracted-template-style-224">${hint||depth}</div>`;
 }

 const canClick = depth > 0 || tool === 'hammer';
 gridHtml += `<div class="mine-tile ${canClick?'mine-tile-clickable':''}" data-bg="${rockColors[depth]}" ${canClick ? `data-action="legacy-call" data-call="digMineTile" data-call-args="${x},${y}"` : ''}>
 ${contentHtml}
 </div>`;
 }
 }
 gridHtml += `</div>`;

 const foundCount = items.filter(i=>i.collected).length;

 el.innerHTML = `<div class="loc-title">${t('mine_title')}</div>
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
 <button class="hbtn" data-action="legacy-call" data-call="setMineTool" data-call-args="'chisel'">${t('mine_chisel')}</button>
 <button class="hbtn" data-action="legacy-call" data-call="setMineTool" data-call-args="'hammer'">${t('mine_hammer')}</button>
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
if (typeof renderMineWindow !== 'undefined' && typeof window !== 'undefined') window.renderMineWindow = renderMineWindow;
if (typeof renderMine !== 'undefined' && typeof window !== 'undefined') window.renderMine = renderMine;

export {};
