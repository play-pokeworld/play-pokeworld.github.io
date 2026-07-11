// ============================================================
// LOCATION INFO — (split from map.js)
// ============================================================
function renderLocInfo(el){
 const loc=getLocObj(G.location);
 if(!loc) return;
 const champId=loc.champ;
 const champ=champId?CHAMPIONS[champId]:null;
 const champDefeated=champId&&G.defeatedChamps[champId];
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';

 // Update the location window header title dynamically
 const locTitleEl = document.getElementById('loc-win-title');
 if(locTitleEl) locTitleEl.textContent = loc.name || 'Lieu';

 let html='';

 // LOCATION NAME at the top of content
 html += `<div style="font-size:15px;font-weight:bold;color:var(--light2);margin-bottom:10px;text-align:center;">${loc.name}</div>`;

 // Lore
 const lore = getLore(G.location);
 if(lore && lore.text){
 const spk = lore.speaker;
 const txt = lore.text;
 html += `<div style="background:rgba(255,255,255,0.05);border-left:3px solid var(--light1);padding:8px 10px;border-radius:0 6px 6px 0;margin:8px 0;font-size:13px;color:#ddd;line-height:1.4;">
 <div style="font-weight:bold;color:var(--light2);margin-bottom:3px;"> ${spk} :</div>
 <div style="font-style:italic;">« ${txt} »</div>
 </div>`;
 }

 // Build all action buttons
 let allButtons = '';

 // PNJ dialogue buttons (violet + 🗣)
 const locNpcs = (typeof NPCS!=='undefined') ? (NPCS[G.location]||[]) : [];
 locNpcs.forEach((npc, ni)=>{
 const npcName = getNpc(G.location, ni).name || ('NPC '+(ni+1));
 allButtons += `<div class="action-btn loc-npc-btn" onclick="openNpc('${G.location}',${ni})" style="background:var(--purple);border:1px solid #8a4fb0;"><span class="ab-icon" style="color:#fff;font-size:20px;">🗣</span><span class="ab-label" style="color:#fff;font-weight:bold;font-size:13px;">${npcName}</span></div>`;
 });

 // Travel buttons
 if(G.location === 'vermilion'){
 allButtons += `<div class="action-btn loc-action-btn" onclick="travelToRegion('johto')"><span class="ab-icon" style="font-size:20px;">🚢</span><span class="ab-label" style="font-size:13px;">${lang==='en'?'Sail to Johto':'Prendre le bateau vers Johto'}</span></div>`;
 } else if(G.location === 'olivine'){
 allButtons += `<div class="action-btn loc-action-btn" onclick="travelToRegion('kanto')"><span class="ab-icon" style="font-size:20px;">🚢</span><span class="ab-label" style="font-size:13px;">${lang==='en'?'Sail to Kanto':'Prendre le bateau vers Kanto'}</span></div>`;
 }

 // Explore button (non-town only)
 if(loc.type!=='town'){
 allButtons += `<div class="action-btn loc-action-btn" onclick="exploreArea()"><span class="ab-icon" style="font-size:20px;">🌾</span><span class="ab-label" style="font-size:13px;">${t('explore_btn')}</span></div>`;
 }

 // Shop button (same style as arena)
 if(loc.shopId&&SHOPS[loc.shopId]){
 if(loc.shopId === 'indigo' && !G.championTitle){
 allButtons += `<div class="action-btn loc-action-btn disabled"><span class="ab-icon" style="font-size:20px;">🏪</span><span class="ab-label" style="font-size:13px;">${t('tab_shop')} (${lang==='en'?'Locked':'Verrouillé'})</span></div>`;
 } else {
 allButtons += `<div class="action-btn loc-action-btn" onclick="openFullscreenPanel('shop')"><span class="ab-icon" style="font-size:20px;">🏪</span><span class="ab-label" style="font-size:13px;">${t('tab_shop')}</span></div>`;
 }
 }

 // Champion/Arena button (same style)
 if(champId){
 const champBadgeReq=champ?(champ.badgeReq||0):0;
 const champLocked=champBadgeReq>G.badges.length;
 if(champLocked){
 allButtons += `<div class="action-btn loc-action-btn disabled"><span class="ab-icon" style="font-size:20px;">⚔️</span><span class="ab-label" style="font-size:13px;">${getChampName(champId)} (${champBadgeReq} ${t('req_lbl')})</span></div>`;
 } else if(champDefeated){
 allButtons += `<div class="action-btn loc-action-btn" onclick="startChampBattle('${champId}')"><span class="ab-icon" style="font-size:20px;">🔄</span><span class="ab-label" style="font-size:13px;">${t('rematch_btn')} ${getChampName(champId)}</span></div>`;
 } else {
 allButtons += `<div class="action-btn loc-action-btn" onclick="startChampBattle('${champId}')"><span class="ab-icon" style="font-size:20px;">⚔️</span><span class="ab-label" style="font-size:13px;">${t('challenge_btn')} ${getChampName(champId)}</span></div>`;
 }
 }

 // Render all buttons in a uniform 2-column grid
 if(allButtons){
 html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0;">${allButtons}</div>`;
 }

 // Compteur de déblocage
 if(loc.type!=='town' && (loc.minWins||0) > 0 && loc.wild && loc.wild.length){
 const curWins = ((G.wildWinsByLoc||{})[G.location]||0);
 const need = loc.minWins;
 const nextZones = [];
 for(const c of (loc.conn||[])){
 if(c === G.location) continue;
 const cLoc = getLocObj(c);
 if(!cLoc) continue;
 if(!locReachable(c)) nextZones.push(getLocName(c));
 }
 if(curWins < need){
 const pct = clamp(Math.floor((curWins / need) * 100), 0, 100);
 const zone_txt = nextZones.length ? nextZones.slice(0,2).join(', ') : (lang==='en'?'the next zone':'la prochaine zone');
 html += `<div style="background:rgba(148,136,107,0.08);border:1px solid var(--light2);padding:8px 10px;border-radius:8px;margin:8px 0;">
 <div style="font-size:13px;color:var(--light2);font-weight:bold;margin-bottom:4px;">
 ${curWins} / ${need} ${lang==='en'?'battles':'combats'} — ${lang==='en'?'to unlock':'avant le déblocage de'} ${zone_txt}
 </div>
 <div style="height:8px;background:#221e1c;border-radius:4px;overflow:hidden;border:1px solid #111;">
 <div style="width:${pct}%;background:var(--light2);height:100%;transition:width .3s;"></div>
 </div>
 </div>`;
 }
 }

 // Légendaire errant
 const roamingId = getRoamingLegendaryForRoute(G.location);
 if(roamingId){
 html += `<div style="background:rgba(148,136,107,0.12);border:1px solid var(--light2);padding:6px 10px;border-radius:6px;margin:8px 0;font-size:13px;color:var(--light2);display:flex;align-items:center;gap:8px;">
 <span><b>${lang==='en'?'Roaming Legendary (12h rotation):':'Légendaire errant (rotation 12h) :'}</b> ${getPokeName(roamingId)} ${lang==='en'?'can appear here!':'peut apparaître ici !'}</span>
 </div>`;
 }

 // Wild Pokémon (non-town only)
 if(loc.wild&&loc.wild.length){
 const comp=locCompletion(G.location);
 const complete=comp&&comp.caught===comp.total;
 const shinyCount=comp?comp.ids.filter(id=>isSpeciesShiny(id)).length:0;
 html+=`<div style="margin-top:10px;font-size:13px;color:var(--light1);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
 <span>${t('wild_poke')}</span>
 <span style="color:${complete?'var(--green)':'var(--light2)'};font-weight:bold">${comp?`${comp.caught}/${comp.total}`:''}</span>
 ${shinyCount>0?`<span style="color:var(--light2);background:rgba(148,136,107,0.1);padding:1px 6px;border-radius:8px;border:1px solid var(--light2);font-weight:bold"> Shiny : ${shinyCount}/${comp.total}</span>`:''}
 </div>`;
 html+=`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">`;
 for(const w of loc.wild){
 const [id,lo,hi,rarity] = w;
 const r = rarity||"common";
 const pd=PD[id];
 if(!pd) continue;
 const seen=G.pokedex[id];
 const owned=speciesOwned(id);
 const shinyOwned=isSpeciesShiny(id);
 html+=`<div style="background:var(--dark3);border-radius:6px;padding:6px 8px;font-size:13px;text-align:center;position:relative;${owned?`border:1px solid ${shinyOwned?'var(--light2)':'var(--green)'}`:''}">
 <div style="height:60px;display:flex;align-items:center;justify-content:center;margin-bottom:2px">${spriteImg(id,'',{size:60, shiny:shinyOwned})}</div>
 <div style="font-weight:bold;font-size:13px;">${getPokeName(id)}${shinyOwned?'<span class="shiny-tag" style="color:var(--shiny);margin-left:4px;">★</span>':''}</div>
 <div style="color:var(--light1);font-size:13px;">Nv.${lo}-${hi}</div><div style="font-size:13px;margin-top:2px;color:${r==='rare'?'var(--light2)':r==='uncommon'?'var(--blue)':'var(--light1)'}">${r==='rare'?t('rarity_rare'):r==='uncommon'?t('rarity_uncom'):t('rarity_com')}</div>
 </div>`;
 }
 if(roamingId){
 const pd = PD[roamingId];
 const seen = G.pokedex[roamingId];
 const owned = speciesOwned(roamingId);
 const shinyOwned = isSpeciesShiny(roamingId);
 html += `<div style="background:var(--dark3);border-radius:6px;padding:6px 8px;font-size:13px;text-align:center;position:relative;border:1px solid var(--accent);box-shadow:0 0 10px rgba(156,39,176,0.3);">
 <div style="height:60px;display:flex;align-items:center;justify-content:center;margin-bottom:2px">${spriteImg(roamingId,'',{size:60, shiny:shinyOwned})}</div>
 <div style="font-weight:bold;color:var(--accent);font-size:13px;">${getPokeName(roamingId)}${shinyOwned?'<span class="shiny-tag" style="color:var(--shiny);">★</span>':''}</div>
 <div style="color:var(--light1);font-size:13px;">Nv.45</div>
 <div style="font-size:13px;margin-top:2px;color:var(--accent);font-weight:bold;">${lang==='en'?'Roaming (1%)':'Errant (1%)'}</div>
 </div>`;
 }
 html+=`</div>`;
 }

 // Drop items — UNIQUEMENT pour les routes/donjons (PAS les villes)
 if(loc.type !== 'town'){
 const drops=ROUTE_DROPS[G.location];
 if(drops&&drops.length){
 html+=`<div style="margin-top:10px;font-size:13px;color:var(--light1)">${t('drop_items_lbl')}</div>`;
 html+=`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">`;
 for(const d of drops){
 const itm=ITEMS[d];
 html+=`<span style="background:var(--dark3);border-radius:4px;padding:2px 8px;font-size:13px;display:inline-flex;align-items:center;gap:4px">${itm?itemIcon(d,24):'?'} ${getItemName(d)}</span>`;
 }
 html+=`</div>`;
 }
 }

 el.innerHTML=html;
}

function typeLabel(typ){
 return t('typ_' + typ) || typ;
}
