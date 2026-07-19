
function renderHatcheryManagementTabs(active){
 return `<div class="management-tabs ui-management-tabs">
  ${typeof uiTabButtonHtml==='function' ? uiTabButtonHtml({label:t('management_upgrades'), icon:(typeof getIcon==='function'?getIcon('save',14):''), call:'openHatcheryManagementMenu', args:`'upgrades'`, active:active==='upgrades'}) : `<button class="hbtn ${active==='upgrades'?'active':''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'upgrades'">${t('management_upgrades')}</button>`}
  ${typeof uiTabButtonHtml==='function' ? uiTabButtonHtml({label:t('management_automation'), icon:(typeof getIcon==='function'?getIcon('settings',14):''), call:'openHatcheryManagementMenu', args:`'automation'`, active:active==='automation'}) : `<button class="hbtn ${active==='automation'?'active':''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'automation'">${t('management_automation')}</button>`}
  ${typeof uiTabButtonHtml==='function' ? uiTabButtonHtml({label:t('hatchery_managers_title'), icon:(typeof getIcon==='function'?getIcon('team',14):''), call:'openHatcheryManagementMenu', args:`'trainers'`, active:active==='trainers'}) : `<button class="hbtn ${active==='trainers'?'active':''}" data-action="legacy-call" data-call="openHatcheryManagementMenu" data-call-args="'trainers'">${t('hatchery_managers_title')}</button>`}
 </div>`;
}
function hatcheryAutomationCard(key, icon, descKey){
 if(!G.automation) G.automation = {autoHatch:false, autoSeedHatchery:false, autoExplore:false};
 const purchased = typeof isAutomationPurchased === 'function' ? isAutomationPurchased(key) : true;
 if(!purchased){
  return `<div class="automation-locked-card"><span>${icon} ${t('automation_'+key)}</span><b>${t('automation_locked_upgrade')}</b></div>`;
 }
 const enabled = !!G.automation[key];
 return `<button class="hbtn automation-toggle-btn ${enabled?'is-on':'is-off'}" data-action="legacy-call" data-call="toggleAutomationButton" data-call-args="'${key}'">
  <span>${icon} ${t('automation_'+key)}</span><b>${enabled?t('automation_enabled'):t('automation_disabled')}</b>
 </button>`;
}
function hatcheryAutomationUnlockCard(key, icon){
 const purchased = typeof isAutomationPurchased === 'function' ? isAutomationPurchased(key) : true;
 const cost = (typeof AUTOMATION_UPGRADE_COSTS !== 'undefined' && AUTOMATION_UPGRADE_COSTS[key]) ? AUTOMATION_UPGRADE_COSTS[key] : 1000000;
 return `<div class="upgrade-card ${purchased?'is-owned':''}"><div><b>${icon} ${t('automation_'+key)}</b><span>${purchased?t('automation_owned'):tr('automation_buy_button', {price:cost.toLocaleString()})}</span></div>${purchased?'':`<button class="hbtn purchase-btn" data-action="legacy-call" data-call="buyAutomationUpgrade" data-call-args="'${key}'">${t('buy_btn')}</button>`}</div>`;
}
function hatcheryAutomationRulesHtml(){
 const cfg = typeof ensureHatcheryAutomation === 'function' ? ensureHatcheryAutomation() : {filterShiny:'all', filterIv:'all', sort:'iv_desc'};
 return `<div class="automation-rules-grid">
  <label class="automation-field"><span>${t('auto_filter_shiny')}</span><select data-change-call="setHatcheryAutomationOption" data-change-args="'filterShiny', this.value">
   <option value="all" ${cfg.filterShiny==='all'?'selected':''}>${t('box_filter_all_shiny')}</option>
   <option value="non_shiny" ${cfg.filterShiny==='non_shiny'?'selected':''}>${t('box_filter_non_shiny_only')}</option>
   <option value="shiny" ${cfg.filterShiny==='shiny'?'selected':''}>${t('box_filter_shiny_only')}</option>
  </select></label>
  <label class="automation-field"><span>${t('box_filter_iv')}</span><select data-change-call="setHatcheryAutomationOption" data-change-args="'filterIv', this.value">
   <option value="all" ${cfg.filterIv==='all'?'selected':''}>${t('box_filter_all_iv')}</option>
   <option value="complete" ${cfg.filterIv==='complete'?'selected':''}>${t('box_filter_iv_complete')}</option>
   <option value="incomplete" ${cfg.filterIv==='incomplete'?'selected':''}>${t('box_filter_iv_incomplete')}</option>
  </select></label>
  <label class="automation-field"><span>${t('sort_label')}</span><select data-change-call="setHatcheryAutomationOption" data-change-args="'sort', this.value">
   <option value="iv_desc" ${cfg.sort==='iv_desc'?'selected':''}>${t('auto_sort_iv_desc')}</option>
   <option value="iv_asc" ${cfg.sort==='iv_asc'?'selected':''}>${t('auto_sort_iv_asc')}</option>
   <option value="level_desc" ${cfg.sort==='level_desc'?'selected':''}>${t('auto_sort_level_desc')}</option>
   <option value="level_asc" ${cfg.sort==='level_asc'?'selected':''}>${t('auto_sort_level_asc')}</option>
   <option value="dex" ${cfg.sort==='dex'?'selected':''}>${t('auto_sort_dex')}</option>
  </select></label>
 </div>`;
}
function openHatcheryManagementMenu(page='upgrades'){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 modal.classList.remove('poke-detail-front');
 inner.classList.remove('poke-detail-inner');
 inner.classList.add('management-inner');
 const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
 const upgradeCost = (typeof getHatcherySlotUpgradeCost === 'function') ? getHatcherySlotUpgradeCost() : null;
 const queueCost = (typeof getHatcheryQueueUpgradeCost === 'function') ? getHatcheryQueueUpgradeCost() : null;
 const slotsBought = maxSlots >= 4;
 const body = page === 'trainers'
  ? `${typeof renderStaffList==='function'?renderStaffList('hatchery'):''}`
  : page === 'automation'
  ? `<div class="automation-dashboard hatchery-auto-layout">
      <div class="automation-toggle-row">${hatcheryAutomationCard('autoHatch', getIcon('hatchery',14), 'automation_autoHatch_desc')}${hatcheryAutomationCard('autoSeedHatchery', getIcon('box',14), 'automation_autoSeedHatchery_desc')}</div>
      <div class="automation-two-cols">
       <div class="automation-panel"><div class="queue-panel-head"><b>${t('filters_title')}</b><span>${t('sort_label')}</span></div>${hatcheryAutomationRulesHtml()}</div>
       <div class="queue-panel"><div class="queue-panel-head"><b>${t('queue_waiting_list')}</b><span>${typeof getHatcheryQueueLimit==='function'?tr('queue_capacity', {count:(G.hatcheryQueue||[]).length, max:getHatcheryQueueLimit()}):''}</span></div><div class="queue-list">${typeof renderHatcheryQueuePreview==='function'?renderHatcheryQueuePreview():''}</div><div class="queue-actions"><button class="hbtn queue-build-btn" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'hatchery_queue'">${typeof getIcon==='function'?getIcon('box',14):''} ${t('queue_add_from_box')}</button><button class="hbtn" data-action="legacy-call" data-call="clearHatcheryQueue" data-call-args="">${t('queue_clear')}</button></div></div>
      </div>
     </div>`
  : `<div class="upgrade-grid">
      <div class="upgrade-card ${slotsBought?'is-owned':''}"><div><b>${t('hatchery_slots_title')}</b><span>${maxSlots}/4</span></div>${slotsBought?`<b>${t('automation_owned')}</b>`:`<button class="hbtn purchase-btn" data-action="legacy-call" data-call="upgradeHatcherySlots" data-call-args="${upgradeCost}">${upgradeCost.toLocaleString()}₽</button>`}</div>
      <div class="upgrade-card ${queueCost?'':'is-owned'}"><div><b>${t('queue_size_title')}</b><span>${tr('queue_capacity', {count:(G.hatcheryQueue||[]).length, max:getHatcheryQueueLimit()})}</span></div>${queueCost?`<button class="hbtn purchase-btn" data-action="legacy-call" data-call="upgradeHatcheryQueueSize" data-call-args="">${queueCost.toLocaleString()}₽</button>`:`<b>${t('automation_owned')}</b>`}</div>
      ${hatcheryAutomationUnlockCard('autoHatch', getIcon('hatchery',14))}
      ${hatcheryAutomationUnlockCard('autoSeedHatchery', getIcon('box',14))}
     </div>`;
 inner.innerHTML = `<div class="modal-title management-title"><div>${typeof getIcon==='function'?getIcon('settings',14):''} ${t('hatchery_management_title')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="management-shell management-hatchery">
  ${renderHatcheryManagementTabs(page)}
  <div class="management-content">${body}</div>
 </div>`;
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
 
 let headerHtml = `<div class="hatchery-upgrade-row"><button class="hbtn" data-action="legacy-call" data-call="openHatcheryUpgradeMenu" data-call-args="">${typeof getIcon==='function'?getIcon('settings',14):''} ${t('hatchery_management_button')}</button></div>`;
 
 const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
 if(!G.hatchery) G.hatchery = [null];
 while(G.hatchery.length < maxSlots) G.hatchery.push(null);
 let html = headerHtml + `<div class="extracted-template-style-125">`;
 for(let i=0; i<maxSlots; i++){
 const slot = G.hatchery[i];
 if(!slot){
 html += `<button class="hbtn extracted-bridge-style-029" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'hatchery'">${tr('hatchery_place_slot', {slot:i+1})}</button>`;
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
 <div class="extracted-template-style-134">${typeof getIcon==='function'?getIcon('mine',20):''}</div>
 <b>${t('no_fossils_yet')}</b><br>
 <span class="extracted-template-style-033">${t('fossil_mine_hint')}</span>
 <div class="extracted-template-style-135"><button class="hbtn extracted-bridge-style-006" data-action="legacy-call" data-call="showTab" data-call-args="'mine'">${typeof getIcon==='function'?getIcon('mine',14):''} ${t('go_to_mine')}</button></div>
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
 <div>${spriteImg(pokeId,'',{size: 60})}</div>
 <div>
 <div class="extracted-template-style-067">${seen ? pokeName : '???'} <span class="extracted-template-style-025">#${pokeId}</span></div>
 <div class="extracted-template-style-090">${t('revives_into')}</div>
 ${owned ? `<div class="extracted-template-style-152"> ${t('owned')}</div>` : ''}
 </div>
 </div>
 <button class="hbtn extracted-bridge-style-033" data-action="legacy-call" data-call="reviveFossil" data-call-args="'${f.key}'">${t('revive')}${f.qty>1 ? ` (${f.qty})` : ''}</button>
 </div>`;
 });
 html += `</div>`;
 html += `<div class="extracted-template-style-153">
 ${t('fossil_lab_tip')}
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

export {};

