
function openHatcheryUpgradeMenu(){
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 const maxSlots = clamp(G.hatcheryMaxSlots || 1, 1, 4);
 const upgradeCost = maxSlots * 15000;
 if(!G.automation) G.automation = {autoHatch:false, autoSeedHatchery:false, autoExplore:false};
 inner.innerHTML = `<div class="modal-title"><div>${t('hatchery_upgrade_title')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="dict-info-block"><b>${t('hatchery_automation')}</b><br>
 <label class="training-upgrade-line ${G.automation.autoHatch?'is-on':'is-off'}"><span>${t('hatchery_auto_hatch')}</span><input type="checkbox"${G.automation.autoHatch?'checked':''} data-change-call="toggleAutomation" data-change-args="'autoHatch', this.checked"></label>
 <label class="training-upgrade-line ${G.automation.autoSeedHatchery?'is-on':'is-off'}"><span>${t('hatchery_auto_seed')}</span><input type="checkbox"${G.automation.autoSeedHatchery?'checked':''} data-change-call="toggleAutomation" data-change-args="'autoSeedHatchery', this.checked"></label>
 </div>
 <div class="dict-info-block"><b>${t('hatchery_slots_title')}</b><br>${maxSlots<4?`<button class="hbtn" data-action="legacy-call" data-call="upgradeHatcherySlots" data-call-args="${upgradeCost}">${t('hatchery_add_slot')} (${upgradeCost.toLocaleString()}₽)</button>`:t('hatchery_all_slots')}</div>
 <div class="dict-info-block"><b>${t('training_upgrade_title')}</b><br>${t('hatchery_future')}</div>`;
 modal.classList.add('open');
}

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
 
 let headerHtml = `<div class="hatchery-upgrade-row"><button class="hbtn" data-action="legacy-call" data-call="openHatcheryUpgradeMenu" data-call-args="">${t('hatchery_upgrade_button')}</button></div>`;
 
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
 html += `<div>
 <div class="extracted-template-style-143" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'box_view'">
 ${isFossil ? itemIcon(fossilDisplayKey,40) : spriteImg(displayId, displayEmoji, {size:60, shiny:displayShiny})}
 </div>
 <div class="extracted-template-style-144">
 <div class="extracted-template-style-145">${iconEmoji} ${displayName} <span class="extracted-template-style-007">Slot #${i+1}</span></div>
 <div class="extracted-template-style-146">${done ? t('ready') : tr('incubating', {steps:steps, required:req})}</div>
 <div class="extracted-template-style-147">
 <div></div>
 </div>
 </div>
 ${done ? `<button class="hbtn extracted-bridge-style-030" data-action="legacy-call" data-call="hatchEgg" data-call-args="${i}"> ${t('hatch')}</button>` : ''}
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
if (typeof openHatcheryUpgradeMenu !== 'undefined' && typeof window !== 'undefined') window.openHatcheryUpgradeMenu = openHatcheryUpgradeMenu;
if (typeof renderHatcheryWindow !== 'undefined' && typeof window !== 'undefined') window.renderHatcheryWindow = renderHatcheryWindow;
if (typeof renderFossilLab !== 'undefined' && typeof window !== 'undefined') window.renderFossilLab = renderFossilLab;
if (typeof renderFossilLabCompact !== 'undefined' && typeof window !== 'undefined') window.renderFossilLabCompact = renderFossilLabCompact;

export {};
