
function renderHatcheryManagementTabs(active){
 return `<div class="management-tabs">
  <button class="hbtn ${active==='upgrades'?'active':''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'upgrades'">⬆ ${t('management_upgrades')}</button>
  <button class="hbtn ${active==='automation'?'active':''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'automation'">🤖 ${t('management_automation')}</button>
  <button class="hbtn ${active==='trainers'?'active':''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'trainers'">🧑‍🏫 ${t('management_trainers')}</button>
 </div>`;
}
function hatcheryAutomationCard(key, icon, descKey){
 if(!G.automation) G.automation = {autoHatch:false, autoSeedHatchery:false, autoExplore:false};
 const purchased = typeof isAutomationPurchased === 'function' ? isAutomationPurchased(key) : true;
 const cost = (typeof AUTOMATION_UPGRADE_COSTS !== 'undefined' && AUTOMATION_UPGRADE_COSTS[key]) ? AUTOMATION_UPGRADE_COSTS[key] : (key==='autoHatch'?250000:500000);
 if(!purchased){
  return `<button class="hbtn automation-buy-btn" data-action="legacy-call" data-call="buyAutomationUpgrade" data-call-args="'${key}'">${icon} ${t('automation_'+key)} · ${tr('automation_buy_button', {price:cost.toLocaleString()})}</button>`;
 }
 const enabled = !!G.automation[key];
 return `<button class="hbtn automation-toggle-btn ${enabled?'is-on':'is-off'}" data-action="legacy-call" data-call="toggleAutomationButton" data-call-args="'${key}'">
  <span>${icon} ${t('automation_'+key)}</span><b>${enabled?t('automation_enabled'):t('automation_disabled')}</b>
 </button>`;
}
function openHatcheryManagementMenu(page='upgrades'){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
 const upgradeCost = (typeof getHatcherySlotUpgradeCost === 'function') ? getHatcherySlotUpgradeCost() : (maxSlots * 15000);
 const body = page === 'trainers'
  ? `<div class="dict-info-block"><b>🧑‍🏫 ${t('management_trainers')}</b><br>${t('hatchery_trainers_soon')}</div>`
  : page === 'automation'
  ? `<div class="dict-info-block"><b>${t('hatchery_automation_title')}</b></div>
     ${hatcheryAutomationCard('autoHatch', '🥚', 'automation_autoHatch_desc')}
     ${hatcheryAutomationCard('autoSeedHatchery', '📦', 'automation_autoSeedHatchery_desc')}`
  : `<div class="dict-info-block"><b>${t('hatchery_slots_title')}</b><br>${tr('hatchery_slots_current', {count:maxSlots, max:4})}</div>
     <div class="dict-info-block">${maxSlots<4&&upgradeCost?`<button class="hbtn purchase-btn" data-action="legacy-call" data-call="upgradeHatcherySlots" data-call-args="${upgradeCost}">⬆ ${tr('hatchery_upgrade_slot', {cost:upgradeCost.toLocaleString()})}</button>`:t('hatchery_slots_max')}</div>`;
 inner.innerHTML = `<div class="modal-title"><div>⚙️ ${t('hatchery_management_title')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 ${renderHatcheryManagementTabs(page)}
 ${body}`;
 modal.classList.add('open');
}
function openHatcheryUpgradeMenu(){ openHatcheryManagementMenu('upgrades'); }

function renderHatcheryWindow(){
 const el = document.getElementById('hatchery-window-body');
 if(!el) return;
 const unlocked = G.badges.includes('misty') || G.badges.length >= 2;
 if(!unlocked){
 el.innerHTML = `<div class="extracted-template-style-141">
 <div class="extracted-template-style-142"></div>
 <b>${t('hatchery_locked_title')}</b><br>
 ${t('hatchery_locked_desc')}
 </div>`;
 return;
 }
 
 let headerHtml = `<div class="hatchery-upgrade-row"><button class="hbtn" data-action="legacy-call" data-call="openHatcheryUpgradeMenu" data-call-args="">⚙️ ${t('hatchery_management_button')}</button></div>`;
 
 const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
 if(!G.hatchery) G.hatchery = [null];
 while(G.hatchery.length < maxSlots) G.hatchery.push(null);
 let html = headerHtml + `<div class="extracted-template-style-125">`;
 for(let i=0; i<maxSlots; i++){
 const slot = G.hatchery[i];
 if(!slot){
 html += `<button class="hbtn extracted-bridge-style-029" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'hatchery'">➕ ${tr('hatchery_place_slot', {slot:i+1})}</button>`;
 } else {
 const p = slot.poke;
 const isFossil = !!slot.isFossil;
 const displayId = isFossil ? slot.reviveId : p.id;
 const displayEmoji = isFossil ? '' : (p.emoji || '');
 const displayShiny = isFossil ? false : p.shinyActive;
 const fossilDisplayKey = isFossil && typeof getFossilDisplayKey === 'function' ? getFossilDisplayKey(slot.fossilKey) : slot.fossilKey;
 const displayName = isFossil ? getItemName(fossilDisplayKey) : getPokeName(p.id);
 const iconEmoji = isFossil ? '' : '';
 const steps = slot.steps || 0;
 const req = slot.stepsReq || 10;
 const done = steps >= req;
 const pct = clamp(Math.floor((steps / req) * 100), 0, 100);
 html += `<div class="hatchery-slot-card ${done?'is-done':''} ${isFossil?'is-fossil':''}">
 <div class="hatchery-slot-main" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'box_view'">
  <div class="hatchery-slot-media">
   ${isFossil ? itemIcon(fossilDisplayKey,44) : spriteImg(displayId, displayEmoji, {size:64, shiny:displayShiny})}
  </div>
  <div class="hatchery-slot-info">
   <div class="hatchery-slot-name">${iconEmoji} ${displayName} <span>Slot #${i+1}</span></div>
   <div class="hatchery-slot-status">${done ? t('ready') : tr('incubating', {steps:steps, required:req})}</div>
   <div class="hatchery-slot-progress"><div class="hatchery-progress ${done?'is-done':isFossil?'is-fossil':'is-normal'}" data-pct="${pct}"></div></div>
  </div>
 </div>
 ${done ? `<button class="hbtn hatchery-hatch-btn" data-action="legacy-call" data-call="hatchEgg" data-call-args="${i}"> ${t('hatch')}</button>` : ''}
 </div>`;
 }
 }
 html += `</div>`;
 el.innerHTML = html;
}


function renderFossilLab(el){
 const fossils = getFossilInventory();
 let html = `<div class="loc-title"> ${t('fossil_lab')}</div>
 <div class="loc-sub extracted-bridge-style-032">${t('fossil_lab_desc')}</div>`;

 if(!fossils.length){
 html += `<div class="extracted-template-style-148">
 <div class="extracted-template-style-134">⛏</div>
 <b>${t('no_fossils_yet')}</b><br>
 <span class="extracted-template-style-033">${t('fossil_mine_hint')}</span>
 <div class="extracted-template-style-135"><button class="hbtn extracted-bridge-style-006" data-action="legacy-call" data-call="showTab" data-call-args="'mine'">⛏ ${t('go_to_mine')}</button></div>
 </div>`;
 el.innerHTML = html;
 return;
 }

 html += `<div class="extracted-template-style-149">`;
 fossils.forEach(f => {
 const displayKey = f.displayKey || (typeof getFossilDisplayKey === 'function' ? getFossilDisplayKey(f.key) : f.key);
 const item = ITEMS[displayKey] || ITEMS[f.key] || {};
 const pokeId = f.reviveId;
 const pokeName = getPokeName(pokeId);
 const seen = G.pokedex[pokeId]?.seen;
 const owned = speciesOwned(pokeId);
 html += `<div class="extracted-template-style-150">
 <div class="extracted-template-style-006">
 <div class="extracted-template-style-024">${itemIcon(displayKey,36)}</div>
 <div class="extracted-template-style-088">
 <div class="extracted-template-style-089">${getItemName(displayKey)}</div>
 <div class="extracted-template-style-090">${t('quantity_abbrev')}: <b class="extracted-template-style-002">${f.qty}</b></div>
 </div>
 </div>
 <div class="extracted-template-style-151">
 <div>${spriteImg(pokeId,'🦖',{size: 60})}</div>
 <div>
 <div class="extracted-template-style-067">${seen ? pokeName : '???'} <span class="extracted-template-style-025">#${pokeId}</span></div>
 <div class="extracted-template-style-090">${t('revives_into')}</div>
 ${owned ? `<div class="extracted-template-style-152"> ${t('owned')}</div>` : ''}
 </div>
 </div>
 <button class="hbtn extracted-bridge-style-033" data-action="legacy-call" data-call="reviveFossil" data-call-args="'${f.key}'">🧬 ${t('revive')}${f.qty>1 ? ` (${f.qty})` : ''}</button>
 </div>`;
 });
 html += `</div>`;
 html += `<div class="extracted-template-style-153">
 💡 ${t('fossil_lab_tip')}
 </div>`;
 el.innerHTML = html;
}


function renderFossilLabCompact(el){
 
 if(typeof renderFossilLab === 'function') renderFossilLab(el);
}


// --- Migrated to ES module, globals exposed ---
if (typeof openHatcheryManagementMenu !== 'undefined' && typeof window !== 'undefined') window.openHatcheryManagementMenu = openHatcheryManagementMenu;
if (typeof openHatcheryUpgradeMenu !== 'undefined' && typeof window !== 'undefined') window.openHatcheryUpgradeMenu = openHatcheryUpgradeMenu;
if (typeof renderHatcheryWindow !== 'undefined' && typeof window !== 'undefined') window.renderHatcheryWindow = renderHatcheryWindow;
if (typeof renderFossilLab !== 'undefined' && typeof window !== 'undefined') window.renderFossilLab = renderFossilLab;
if (typeof renderFossilLabCompact !== 'undefined' && typeof window !== 'undefined') window.renderFossilLabCompact = renderFossilLabCompact;

