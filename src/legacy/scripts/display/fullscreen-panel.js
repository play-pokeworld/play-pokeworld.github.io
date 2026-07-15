function openFullscreenPanel(panelType){
 
 closeUnifiedSelectorModal();
 closeFullscreenPanel();
 if(typeof closeBattleSummary === 'function') closeBattleSummary();
 const pm = document.getElementById('poke-modal');
 if(pm) pm.classList.remove('open');
 const qm = document.getElementById('quest-modal');
 if(qm) qm.classList.remove('open');
 const sm = document.getElementById('settings-modal');
 if(sm) sm.classList.remove('open');

 const titles = {
 inventory: t('panel_inventory_title'),
 shop: t('panel_shop_title'),
 market: t('panel_market_title'),
 pokedex: t('panel_pokedex_title')
 };

 
 let modal = document.getElementById('fullscreen-panel-modal');
 if(!modal){
 modal = document.createElement('div');
 modal.id = 'fullscreen-panel-modal';
 modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:600;display:none;align-items:center;justify-content:center;padding:16px;';
 modal.innerHTML = `
 <div class="extracted-template-style-043">
   <div id="fs-panel-header" class="extracted-template-style-044">
     <div id="fs-panel-title" class="extracted-template-style-045"></div>
     <span class="extracted-template-style-046" data-action="legacy-call" data-call="closeFullscreenPanel" data-call-args="">✕</span>
   </div>
   <div id="fs-panel-filters" class="extracted-template-style-047"></div>
   <div id="fs-panel-content" class="extracted-template-style-048"></div>
 </div>`;
 document.body.appendChild(modal);
 modal.addEventListener('click', function(e){ if(e.target===modal) closeFullscreenPanel(); });
 }

 
 document.getElementById('fs-panel-filters').style.display = 'none';
 document.getElementById('fs-panel-filters').innerHTML = '';
 document.getElementById('fs-panel-title').textContent = titles[panelType] || panelType;
 const content = document.getElementById('fs-panel-content');

 if(panelType === 'inventory') renderInventory(content);
 else if(panelType === 'shop') renderShop(content);
 else if(panelType === 'market') renderMarket(content);
 else if(panelType === 'pokedex') renderPokedex(content);

 modal.style.display = 'flex';
}

function closeFullscreenPanel(){
 const modal = document.getElementById('fullscreen-panel-modal');
 if(modal) modal.style.display = 'none';
}
