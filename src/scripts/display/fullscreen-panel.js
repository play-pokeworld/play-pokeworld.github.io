// ============================================================
// FULLSCREEN PANEL — Header fixe avec titre + filtres + contenu scrollable
// ============================================================

function openFullscreenPanel(panelType){
 // Close any other open modals first
 closeUnifiedSelectorModal();
 closeFullscreenPanel();
 if(typeof closeBattleSummary === 'function') closeBattleSummary();
 const pm = document.getElementById('poke-modal');
 if(pm) pm.classList.remove('open');
 const qm = document.getElementById('quest-modal');
 if(qm) qm.classList.remove('open');
 const sm = document.getElementById('settings-modal');
 if(sm) sm.classList.remove('open');

 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 const isEn = lang === 'en';
 const titles = {
 inventory: isEn ? 'Sac' : 'Bag',
 shop: isEn ? 'Shop' : 'Boutique',
 market: isEn ? 'Poké Market' : 'Poké Marché',
 pokedex: isEn ? 'Pokédex' : 'Pokédex'
 };

 // Récupérer ou créer le modal
 let modal = document.getElementById('fullscreen-panel-modal');
 if(!modal){
 modal = document.createElement('div');
 modal.id = 'fullscreen-panel-modal';
 modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:600;display:none;align-items:center;justify-content:center;padding:16px;';
 modal.innerHTML = `
 <div style="background:var(--dark2);border:1px solid var(--dark3);border-radius:12px;width:95vw;max-width:960px;height:90vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.6);overflow:hidden;">
   <!-- HEADER FIXE: Titre à gauche, croix à droite -->
   <div id="fs-panel-header" style="background:var(--dark1);padding:12px 18px;border-bottom:2px solid var(--dark3);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;min-height:50px;">
     <div id="fs-panel-title" style="font-size:15px;font-weight:bold;color:var(--light2);"></div>
     <span style="cursor:pointer;font-size:22px;color:var(--light2);font-weight:bold;" onclick="closeFullscreenPanel()">✕</span>
   </div>
   <!-- BARRE FILTRES FIXE (injectée par chaque render function) -->
   <div id="fs-panel-filters" style="background:var(--dark1);padding:10px 18px;border-bottom:2px solid var(--dark3);flex-shrink:0;display:none;"></div>
   <!-- CONTENU SCROLLABLE -->
   <div id="fs-panel-content" style="flex:1;overflow-y:auto;padding:16px;background:var(--dark2);"></div>
 </div>`;
 document.body.appendChild(modal);
 modal.addEventListener('click', function(e){ if(e.target===modal) closeFullscreenPanel(); });
 }

 // Reset la barre filtres
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
