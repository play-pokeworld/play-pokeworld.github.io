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
 
 let headerHtml = '';
 
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
 html += `<div data-style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.25);padding:8px;border-radius:8px;border:1px solid ${done?'var(--green)':(isFossil?'#6b5b3e':'#5a504a')};">
 <div class="extracted-template-style-143" data-action="legacy-call" data-call="openUnifiedSelectorModal" data-call-args="'box_view'">
 ${isFossil ? itemIcon(fossilDisplayKey,40) : spriteImg(displayId, displayEmoji, {size:60, shiny:displayShiny})}
 </div>
 <div class="extracted-template-style-144">
 <div class="extracted-template-style-145">${iconEmoji} ${displayName} <span class="extracted-template-style-007">Slot #${i+1}</span></div>
 <div class="extracted-template-style-146">${done ? t('ready') : tr('incubating', {steps:steps, required:req})}</div>
 <div class="extracted-template-style-147">
 <div data-style="width:${pct}%;background:${done?'var(--green)':(isFossil?'var(--light2)':'var(--blue)')};height:100%;transition:0.3s;"></div>
 </div>
 </div>
 ${done ? `<button class="hbtn extracted-bridge-style-030" data-action="legacy-call" data-call="hatchEgg" data-call-args="${i}"> ${t('hatch')}</button>` : ''}
 </div>`;
 }
 }
 if(maxSlots < 4){
 const upgradeCost = maxSlots * 15000;
 html += `<button class="hbtn extracted-bridge-style-031" data-action="legacy-call" data-call="upgradeHatcherySlots" data-call-args="${upgradeCost}">⬆ ${tr('hatchery_upgrade_slot', {cost:upgradeCost.toLocaleString()})}</button>`;
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
