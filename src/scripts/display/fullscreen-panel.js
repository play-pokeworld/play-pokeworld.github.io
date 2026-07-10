// ============================================================
// FULLSCREEN PANEL — opens Bag/Shop/Market/Pokédex in a full-screen modal
// All fullscreen panels close each other before opening (no overlap).
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
    inventory: isEn ? '🎒 Bag' : '🎒 Sac',
    shop: isEn ? '🛒 Shop' : '🛒 Boutique',
    market: isEn ? '🏪 Poké Market' : '🏪 Poké Marché',
    pokedex: isEn ? '📖 Pokédex' : '📖 Pokédex'
  };

  let modal = document.getElementById('fullscreen-panel-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'fullscreen-panel-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:600;display:none;align-items:center;justify-content:center;padding:16px;';
    modal.innerHTML = `<div style="background:var(--panel);border:2px solid var(--gold);border-radius:12px;width:95vw;max-width:960px;height:90vh;display:flex;flex-direction:column;box-shadow:0 0 35px rgba(255,215,0,0.25);overflow:hidden;">
      <div class="modal-title" style="padding:12px 18px;border-bottom:1px solid #4a3820;display:flex;align-items:center;justify-content:space-between;background:#1e1814;flex-shrink:0;">
        <div id="fs-panel-title" style="font-size:16px;font-weight:bold;color:var(--gold);"></div>
        <span class="modal-close" style="cursor:pointer;font-size:20px;color:#fff;" onclick="closeFullscreenPanel()">✕</span>
      </div>
      <div id="fs-panel-content" style="flex:1;overflow-y:auto;padding:16px;background:#0f0d0b;"></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', function(e){ if(e.target===modal) closeFullscreenPanel(); });
  }

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

