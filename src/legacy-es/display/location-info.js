function renderLocInfo(el){
 const loc=getLocObj(G.location);
 if(!loc) return;
 const champId=loc.champ;
 const champ=champId?CHAMPIONS[champId]:null;
 const champDefeated=champId&&G.defeatedChamps[champId];

 
 const locTitleEl = document.getElementById('loc-win-title');
 if(locTitleEl) locTitleEl.textContent = getLocName(G.location) || 'Lieu';

 let html='';
 const uiIcon = (name, fallback='') => (typeof getIcon === 'function' ? getIcon(name, 18) : fallback);
 const regionKey = (typeof regionOfLoc === 'function') ? regionOfLoc(G.location) : (G.region || 'kanto');
 const hasShop = !!(loc.shopId && SHOPS[loc.shopId]);
 const wildCount = (loc.wild || []).length;
 const npcCount = ((typeof NPCS!=='undefined') ? (NPCS[G.location]||[]) : []).length;

 
 html += `<div class="loc-overview-card"><div class="loc-overview-title">${getLocName(G.location)}</div><div class="loc-overview-meta"><span>${typeof getRegionDisplayName === 'function' ? getRegionDisplayName(regionKey) : regionKey}</span><span>${loc.type||''}</span><span>${wildCount ? wildCount + ' ' + (t('wild_poke') || 'rencontres') : (t('no_wild_pokemon_here') || 'aucune rencontre')}</span><span>${npcCount} NPC</span>${hasShop ? `<span>${t('tab_shop') || 'Boutique'}</span>` : ''}</div></div>`;

 
 const lore = getLore(G.location);
 if(lore && lore.text){
 const spk = lore.speaker;
 const txt = lore.text;
 html += `<div class="extracted-template-style-050">
 <div class="extracted-template-style-051"> ${spk} :</div>
 <div class="extracted-template-style-052">« ${txt} »</div>
 </div>`;
 }

 
 let allButtons = '';

 
 const locNpcs = (typeof NPCS!=='undefined') ? (NPCS[G.location]||[]) : [];
 locNpcs.forEach((npc, ni)=>{
 const npcName = getNpc(G.location, ni).name || ('NPC '+(ni+1));
 allButtons += `<div class="action-btn loc-npc-btn extracted-template-style-053" data-action="legacy-call" data-call="openNpc" data-call-args="'${G.location}',${ni}"><span class="ab-icon extracted-template-style-054">${uiIcon('npc','•')}</span><span class="ab-label extracted-template-style-055">${npcName}</span></div>`;
 });

 
 if(G.location === 'vermilion'){
 const canSailJohto = (typeof canAccessRegion !== 'function') || canAccessRegion('johto');
 allButtons += canSailJohto
 ? `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="travelToRegion" data-call-args="'johto'"><span class="ab-icon extracted-template-style-056">${uiIcon('ship','•')}</span><span class="ab-label extracted-template-style-057">${t('sail_to_johto')}</span></div>`
 : `<div class="action-btn loc-action-btn disabled"><span class="ab-icon extracted-template-style-056">${uiIcon('ship','•')}</span><span class="ab-label extracted-template-style-057">${t('sail_to_johto')} (${regionAccessMessage('johto')})</span></div>`;
 } else if(G.location === 'olivine'){
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="travelToRegion" data-call-args="'kanto'"><span class="ab-icon extracted-template-style-056">${uiIcon('ship','•')}</span><span class="ab-label extracted-template-style-057">${t('sail_to_kanto')}</span></div>`;
 }

 
 if(loc.type!=='town'){
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="exploreArea" data-call-args=""><span class="ab-icon extracted-template-style-056">${uiIcon('explore','•')}</span><span class="ab-label extracted-template-style-057">${t('explore_btn')}</span></div>`;
 }
 const localDefeatQuest = (typeof getActiveLocalDefeatQuestForLocation === 'function') ? getActiveLocalDefeatQuestForLocation(G.location) : null;
 const hasRegularWildBattle = !!(loc.wild && loc.wild.length);
 if(localDefeatQuest && !hasRegularWildBattle){
 const qtxt = getQuestText(localDefeatQuest.inst.cat || 'main', localDefeatQuest.def.id);
 allButtons += `<div class="action-btn loc-action-btn quest-battle-btn" data-action="legacy-call" data-call="startQuestDefeatBattle" data-call-args="'${G.location}'"><span class="ab-icon extracted-template-style-056">${uiIcon('battle','•')}</span><span class="ab-label extracted-template-style-057">${t('quest_battle_btn')} ${qtxt.title ? '— '+qtxt.title : ''}</span></div>`;
 }

 
 if(loc.shopId&&SHOPS[loc.shopId]){
 if(loc.shopId === 'indigo' && !G.championTitle){
 allButtons += `<div class="action-btn loc-action-btn disabled"><span class="ab-icon extracted-template-style-056">${uiIcon('shop','•')}</span><span class="ab-label extracted-template-style-057">${t('tab_shop')} (${t('locked')})</span></div>`;
 } else {
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="openFullscreenPanel" data-call-args="'shop'"><span class="ab-icon extracted-template-style-056">${uiIcon('shop','•')}</span><span class="ab-label extracted-template-style-057">${t('tab_shop')}</span></div>`;
 }
 }

 
 if(champId){
 const champBadgeReq=champ?(champ.badgeReq||0):0;
 const haveRegionBadges = (typeof regionBadgeCount === 'function') ? regionBadgeCount(regionOfLoc(G.location)) : (G.badges||[]).length;
 const champLocked=champBadgeReq>haveRegionBadges;
 const isLeague = (typeof isLeagueChampionId === 'function' && isLeagueChampionId(champId)) || champId === 'elite4' || champId === 'johto_elite4';
 const champName = getChampName(champId);
 const lockedLabel = isLeague ? tr('league_locked_label', {champion:champName, badges:champBadgeReq}) : tr('arena_locked_label', {champion:champName, badges:champBadgeReq});
 const challengeLabel = isLeague ? tr('league_challenge_label', {champion:champName}) : tr('arena_challenge_label', {champion:champName});
 const rematchLabel = isLeague ? tr('league_rematch_label', {champion:champName}) : tr('arena_rematch_label', {champion:champName});
 if(champLocked){
 allButtons += `<div class="action-btn loc-action-btn disabled"><span class="ab-icon extracted-template-style-056">${uiIcon('battle','•')}</span><span class="ab-label extracted-template-style-057">${lockedLabel}</span></div>`;
 } else if(champDefeated){
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="startChampBattle" data-call-args="'${champId}'"><span class="ab-icon extracted-template-style-056">${uiIcon('rematch','•')}</span><span class="ab-label extracted-template-style-057">${rematchLabel}</span></div>`;
 } else {
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="startChampBattle" data-call-args="'${champId}'"><span class="ab-icon extracted-template-style-056">${uiIcon('battle','•')}</span><span class="ab-label extracted-template-style-057">${challengeLabel}</span></div>`;
 }
 }

 
 if(allButtons){
 html += `<div class="extracted-template-style-058">${allButtons}</div>`;
 }

 
 if(loc.type!=='town' && (loc.minWins||0) > 0 && loc.wild && loc.wild.length){
 const linkedIds = (typeof getLinkedRouteIds === 'function') ? getLinkedRouteIds(G.location) : [G.location];
 const curWins = linkedIds.reduce((sum,id)=>sum+(((G.wildWinsByLoc||{})[id])||0),0);
 const need = loc.minWins;
 const nextZoneIds = (typeof zonesUnlockedByClearing === 'function') ? zonesUnlockedByClearing(G.location) : [];
 const nextZones = nextZoneIds.map(id => getLocName(id));
 if(curWins < need && nextZones.length){
 const pct = clamp(Math.floor((curWins / need) * 100), 0, 100);
 const zone_txt = nextZones.length ? nextZones.slice(0,2).join(', ') : t('next_zone');
 html += `<div class="extracted-template-style-059">
 <div class="extracted-template-style-060">
 ${curWins} / ${need} ${t('battles')} — ${t('to_unlock')} ${zone_txt}
 </div>
 <div class="extracted-template-style-061">
 <div></div>
 </div>
 </div>`;
 }
 }

 
 const roamingId = getRoamingLegendaryForRoute(G.location);
 if(roamingId){
 html += `<div class="extracted-template-style-062">
 <span><b>${t('roaming_legendary_rotation')}</b> ${getPokeName(roamingId)} ${t('can_appear_here')}</span>
 </div>`;
 }
 if(loc.type !== 'town'){
 html += `<div class="route-events-placeholder"><b>${t('route_events_placeholder_title') || 'Événements de route'}</b><span>${t('route_events_placeholder_desc') || ''}</span></div>`;
 }

 
 if(loc.wild&&loc.wild.length){
 const comp=locCompletion(G.location);
 const complete=comp&&comp.caught===comp.total;
 const shinyCount=comp?comp.ids.filter(id=>isSpeciesShiny(id)).length:0;
 html+=`<div class="extracted-template-style-063">
 <span>${t('wild_poke')}</span>
 <span>${comp?`${comp.caught}/${comp.total}`:''}</span>
 ${shinyCount>0?`<span class="extracted-template-style-064"> Shiny : ${shinyCount}/${comp.total}</span>`:''}
 </div>`;
 html+=`<div class="extracted-template-style-065">`;
 for(const w of loc.wild){
 const [id,lo,hi,rarity] = w;
 const r = rarity||"common";
 const pd=PD[id];
 if(!pd) continue;
 const seen=G.pokedex[id];
 const owned=speciesOwned(id);
 const shinyOwned=isSpeciesShiny(id);
 const entryCls = `location-entry loc-wild-poke ${owned?'is-owned':'is-missing'} ${shinyOwned?'is-shiny-owned':''} ${seen?'is-seen':'is-unseen'}`;
 html+=`<div class="${entryCls}">
 <div class="loc-caught-badge ${owned?'is-owned':'is-missing'}">${owned?'✓':'?'}</div>
 <div class="extracted-template-style-066">${spriteImg(id,'',{size:60, shiny:shinyOwned})}</div>
 <div class="extracted-template-style-067">${getPokeName(id)}${shinyOwned?'<span class="shiny-tag extracted-template-style-068">★</span>':''}</div>
 <div class="extracted-template-style-025">Nv.${lo}-${hi}</div><div>${r==='rare'?t('rarity_rare'):r==='uncommon'?t('rarity_uncom'):t('rarity_com')}</div>
 </div>`;
 }
 if(roamingId){
 const pd = PD[roamingId];
 const seen = G.pokedex[roamingId];
 const owned = speciesOwned(roamingId);
 const shinyOwned = isSpeciesShiny(roamingId);
 const roamCls = `extracted-template-style-069 location-entry loc-wild-poke is-roaming ${owned?'is-owned':'is-missing'} ${shinyOwned?'is-shiny-owned':''} ${seen?'is-seen':'is-unseen'}`;
 html += `<div class="${roamCls}">
 <div class="loc-caught-badge ${owned?'is-owned':'is-missing'}">${owned?'✓':'?'}</div>
 <div class="extracted-template-style-066">${spriteImg(roamingId,'',{size:60, shiny:shinyOwned})}</div>
 <div class="extracted-template-style-070">${getPokeName(roamingId)}${shinyOwned?'<span class="shiny-tag extracted-template-style-071">★</span>':''}</div>
 <div class="extracted-template-style-025">Nv.45</div>
 <div class="extracted-template-style-072">${t('roaming_short')}</div>
 </div>`;
 }
 html+=`</div>`;
 }

 
 if(loc.type !== 'town'){
 const drops=ROUTE_DROPS[G.location];
 if(drops&&drops.length){
 html+=`<div class="extracted-template-style-073">${t('drop_items_lbl')}</div>`;
 html+=`<div class="extracted-template-style-074">`;
 for(const d of drops){
 const itm=ITEMS[d];
 html+=`<span class="extracted-template-style-075">${itm?itemIcon(d,24):'?'} ${getItemName(d)}</span>`;
 }
 html+=`</div>`;
 }
 }

 el.innerHTML=html;
}

function typeLabel(typ){
 return t('typ_' + typ) || typ;
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderLocInfo !== 'undefined' && typeof window !== 'undefined') window.renderLocInfo = renderLocInfo;
if (typeof typeLabel !== 'undefined' && typeof window !== 'undefined') window.typeLabel = typeLabel;

export {};

