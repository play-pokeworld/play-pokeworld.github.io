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

 let gridHtml = `<div data-style="display:grid;grid-template-columns:repeat(${MINE_W}, 1fr);gap:3px;background:#221814;padding:8px;border-radius:10px;border:2px solid #6d4c3d;margin:12px 0">`;

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
 contentHtml = `<div class="mine-revealed-item ${cellItem.collected?'is-collected':''}" data-style="width:100%;height:100%;background:${cellItem.collected?'rgba(76,175,80,0.35)':revealedColor};display:flex;align-items:center;justify-content:center;border-radius:3px;box-shadow:inset 0 0 12px rgba(255,255,255,0.45),0 0 12px ${revealedColor};border:2px solid rgba(255,255,255,0.75)">${isItemCenter ? itemIcon(cellItem.key, 24) : ''}</div>`;
 }
 } else {
 contentHtml = `<div class="extracted-template-style-224">${depth}</div>`;
 }

 const canClick = depth > 0 || tool === 'hammer';
 gridHtml += `<div class="mine-tile ${canClick?'mine-tile-clickable':''} ${revealedItem?'mine-tile-revealed-item':''}" ${canClick ? `data-action="legacy-call" data-call="digMineTile" data-call-args="${x},${y}"` : ''} data-style="aspect-ratio:1;background:${rockColors[depth]};border-radius:4px;cursor:${canClick ? 'pointer' : 'default'};display:flex;align-items:center;justify-content:center;user-select:none;transition:filter 0.1s;position:relative">
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
 <div class="stat-bar extracted-bridge-style-047"><div id="mine-energy-bar" class="stat-fill" data-style="width:${((energy||0)/(maxEnergy||100))*100}%;background:var(--light2)"></div></div>
 <div class="extracted-template-style-228">${t('mine_energy_hint')}</div>
 </div>

 <div class="extracted-template-style-229">
 <button class="hbtn" data-style="${tool==='chisel'?'background:var(--light2);color:#000;font-weight:bold':''}" data-action="legacy-call" data-call="setMineTool" data-call-args="'chisel'">${t('mine_chisel')}</button>
 <button class="hbtn" data-style="${tool==='hammer'?'background:var(--light2);color:#000;font-weight:bold':''}" data-action="legacy-call" data-call="setMineTool" data-call-args="'hammer'">${t('mine_hammer')}</button>
 </div>
 </div>

 ${gridHtml}

 <div class="extracted-template-style-230">
 <div>
 <span class="extracted-template-style-089">${t('mine_treasures')} <span class="extracted-template-style-002">${foundCount} / ${items.length}</span></span>
 <div class="extracted-template-style-231">
 ${items.map(i=>`<span data-style="margin-right:10px;${i.collected?'color:var(--green);font-weight:bold':''}">${i.collected?'':'❓'} ${getItemName(i.key)}</span>`).join('')}
 </div>
 </div>
 <button class="hbtn extracted-bridge-style-006" data-action="generate-mine-layer">${t('mine_new_layer')}</button>
 </div>`;
}
