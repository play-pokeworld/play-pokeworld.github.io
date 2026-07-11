// ============================================================
// MAP RENDER — (split from map.js)
// ============================================================
function renderMap(){
 recomputeUnlocks();
 updateFeatureWindows();
 // Sync the region dropdown with the saved/current region (fixes dropdown
 // showing"Kanto"after a reload while actually in Johto).
 const regSel = document.getElementById('map-region-select');
 if(regSel && G && G.region){ regSel.value = G.region; }
 // Sync the map window title too (use .win-header-title since #map-win-title
 // is overwritten by updateI18nLabels).
 const mapWT = document.querySelector('#win-map .win-header-title');
 if(mapWT){
 const lang = (typeof G!=='undefined'&&G&&G.lang)?G.lang:'fr';
 const rName = G.region==='johto'?'Johto':'Kanto';
 mapWT.textContent = '⋮⋮ 🗺 ' + (lang==='en'?('Map: '+rName):('Carte '+rName));
 }
 const svg=document.getElementById('map-svg');
 if(svg) svg.setAttribute('viewBox','0 0 1600 960');
 const connG=document.getElementById('connections');
 const nodeG=document.getElementById('nodes');
 const terrainG=document.getElementById('map-terrain');
 const reg = (typeof G!=='undefined'&&G&&G.region)?G.region:'kanto';
 const img = reg==='johto'?JOHTO_MAP_IMG:KANTO_MAP_IMG;
 if(terrainG){
 terrainG.innerHTML = `<image href="${img}"xlink:href="${img}"x="0"y="0"width="1600"height="960"preserveAspectRatio="xMidYMid meet"/>`;
 }
 const regLocs = getCurrentRegionLocs();

 // Connexions : la carte de fond (style PokéClicker) porte déjà les routes.
 // On n'affiche plus de traits droits qui traversaient la carte d'un bord à l'autre.
 connG.innerHTML='';

 // Draw nodes (marqueurs RECTANGULAIRES = « zones », façon PokéClicker)
 let rectsHTML = '';
 let labelsHTML = '';
 for(const [id, loc] of Object.entries(regLocs)){
 const isCurrent=id===G.location;
 const badgeReq=loc.badgeReq||0;
 const storyReq=loc.storyReq||0;
 const isLocked=badgeReq>G.badges.length || storyReq>(G.storyIdx||0) || !isLocUnlocked(id);
 const isReachable=!isLocked&&!isCurrent;
 const dims=nodeDims(loc, id);
 const w=dims.w, h=dims.h;
 const st=mapNodeState(id);
 const color=st.color;
 const stroke=isCurrent?'var(--light2)':isLocked?'#444':(st.kind==='done'?'rgba(255,255,255,0.25)':'#fff');
 const sw=isCurrent?4:2;
 const icon = loc.type==='town'?'🏘':loc.type==='sea'?'🌊':loc.type==='dungeon'?'⛰':'';
 const lname = getLocName(id);
 const labelW = Math.max(38, lname.length*7 + 14);
 const labelH = 18;
 const labelColor = isCurrent?'#94886B':isReachable?'#ececec':'#9a9a9a';
 const x0=loc.x - w/2, y0=loc.y - h/2;
 const lang = (typeof G!=='undefined'&&G&&G.lang)?G.lang:'fr';
 const blk = blockingNeighbor(id);
 const reqStr = (badgeReq>G.badges.length)
 ? (lang==='en'?`requires ${badgeReq} badge(s) (you have ${G.badges.length})`:`n\u00e9cessite ${badgeReq} badge(s) (vous en avez ${G.badges.length})`)
 : (blk)
 ? (lang==='en'?`win ${getLocObj(blk).minWins||0} wild battles in ${getLocName(blk)} (you have ${((G.wildWinsByLoc||{})[blk]||0)})`:`remporte ${getLocObj(blk).minWins||0} combats sauvages \u00e0 ${getLocName(blk)} (tu en as ${((G.wildWinsByLoc||{})[blk]||0)})`)
 : (lang==='en'?`locked by story \u2014 ${G.storyIdx||0}/${storyReq}`:`verrouill\u00e9 par l'histoire \u2014 ${G.storyIdx||0}/${storyReq}`);
 const title = isLocked?`${getLocName(id)} \u2014 ${reqStr}`:getLocName(id);
 rectsHTML+=`
 <g class="loc-node${isCurrent?' current':''}${isReachable?' adjacent':''}${isLocked?' locked':''}"onclick="clickLocation('${id}')"style="cursor:${isLocked?'not-allowed':'pointer'}">
 <title>${title}</title>
 <rect x="${x0-2}"y="${y0-2}"width="${w+4}"height="${h+4}"rx="11"fill="#000"opacity="${isLocked?0.35:0.4}"/>
 <rect x="${x0}"y="${y0}"width="${w}"height="${h}"rx="9"fill="${color}"stroke="${stroke}"stroke-width="${sw}"/>
 ${isCurrent?`<rect x="${x0-6}"y="${y0-6}"width="${w+12}"height="${h+12}"rx="13"fill="none"stroke="var(--light2)"stroke-width="3"opacity="0.9"class="pulse"/>`:''}
 <text x="${loc.x}"y="${loc.y - h/2 + 14}"text-anchor="middle"dominant-baseline="middle"font-size="${isCurrent?18:15}"fill="#fff"opacity="${isLocked?0.6:1}">${isLocked?'':icon}</text>
 </g>`;
 labelsHTML += `<g class="map-label"style="pointer-events:none;">
 <rect x="${loc.x - labelW/2}"y="${loc.y - labelH/2}"width="${labelW}"height="${labelH}"rx="9"fill="rgba(0,0,0,0.80)"stroke="${isCurrent?'#94886B':'rgba(255,255,255,0.25)'}"stroke-width="0.8"/>
 <text x="${loc.x}"y="${loc.y+0.5}"text-anchor="middle"dominant-baseline="middle"font-size="12"font-weight="bold"fill="${labelColor}"style="paint-order:stroke;stroke:#000;stroke-width:3px;"opacity="${isLocked?0.6:1}">${lname}</text>
 </g>`;
 // NPC markers
 const npcs = (typeof NPCS!=='undefined')?NPCS[id]:null;
 if(npcs && npcs.length && !isLocked){
 let pni=-1;
 for(let ni=0; ni<npcs.length; ni++){
 const npc=npcs[ni];
 if(npc.mainTalk!=null){
 const inst=(typeof G!=='undefined'&&G)?G.activeQuests.find(i=>i.qid===npc.mainTalk && i.cat==='main'):null;
 const def=(typeof getMainQuestDef==='function')?getMainQuestDef(npc.mainTalk):null;
 if(inst && def && !questDone(inst,def)){ pni=ni; break; }
 }
 if(npc.quest && (typeof SIDE_QUESTS!=='undefined') && SIDE_QUESTS[npc.quest]){
 const done=(typeof G!=='undefined'&&G)?!!G.completedQuests['side_'+npc.quest]:false;
 const active=(typeof G!=='undefined'&&G)?G.activeQuests.some(i=>i.qid===npc.quest && i.cat==='side'):false;
 if(!done && !active){ pni=ni; break; }
 }
 }
 if(pni>=0){
 const npc=npcs[pni];
 const npcName = getNpc(id, pni).name || 'NPC';
 const nx=loc.x + labelW/2 + 10, ny=loc.y - 13;
 rectsHTML+=`<g class="npc-node"onclick="event.stopPropagation();openNpc('${id}',${pni})"style="cursor:pointer"><title>${npcName}</title>`
 +`<circle cx="${nx}"cy="${ny}"r="11"fill="#7b3fa0"stroke="#fff"stroke-width="2"/>`
 +`<text x="${nx}"y="${ny+1}"text-anchor="middle"dominant-baseline="middle"font-size="13">🗣</text></g>`;
 }
 }
 }
 nodeG.innerHTML = rectsHTML + labelsHTML;
 ensureMapHelpButton();

}


// Fast travel: any location whose badge requirement is met can be reached
// directly from anywhere, exactly like clicking a node on PokéClicker's map.

function clickLocation(id){
 const loc=getLocObj(id);
 if(!loc) return;
 const lang_st = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 // --- Stop any active battle when travelling (prevents bugs) ---
 if(typeof battle !== 'undefined' && battle && battle.active && id !== G.location){
 if(typeof endBattle === 'function'){
 endBattle();
 } else if(typeof doLeaveBattle === 'function'){
 doLeaveBattle();
 } else {
 battle.active = false;
 if(battle.timerId) clearInterval(battle.timerId);
 }
 if(typeof openBattleSummary === 'function') openBattleSummary(false);
 }
 // --- Blocage Starter Route 1 / Route 29 ---
 if(id==='route1'){
 const has = !!(G.starterKanto || G.starter || (G.regionStarter && G.regionStarter.kanto));
 if(!has){
 setMsg(lang_st==='en' ? '⛔ Choose your Kanto starter in Pallet Town first!' : '⛔ Choisissez d\'abord votre starter Kanto à Bourg Palette !');
 if(typeof checkStarterNeeded==='function') checkStarterNeeded();
 return;
 }
 }
 if(id==='jroute29'){
 const has = !!(G.starterJohto || (G.regionStarter && G.regionStarter.johto));
 if(!has){
 setMsg(lang_st==='en' ? '⛔ Choose your Johto starter in New Bark Town first!' : '⛔ Choisissez d\'abord votre starter Johto à Bourg Geon !');
 if(typeof checkStarterNeeded==='function') checkStarterNeeded();
 return;
 }
 }
 const badgeReq=loc.badgeReq||0;
 if(badgeReq>G.badges.length){
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 const msg = lang === 'en'
 ? `⛔ You need ${badgeReq} badge(s) to access ${getLocName(id)}! (you have ${G.badges.length})`
 : `⛔ Il vous faut ${badgeReq} badge(s) pour accéder à ${getLocName(id)} ! (vous en avez ${G.badges.length})`;
 setMsg(msg);
 return;
 }
 const storyReq=loc.storyReq||0;
 if(storyReq>(G.storyIdx||0)){
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 const msg = lang === 'en'
 ? `📖 The story hasn't reached ${getLocName(id)} yet! (Story progress ${G.storyIdx||0}/${storyReq})`
 : `📖 L'histoire n'a pas encore débloqué ${getLocName(id)} ! (Progrès histoire ${G.storyIdx||0}/${storyReq})`;
 setMsg(msg);
 return;
 }
 if(!isLocUnlocked(id)){
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 const blk = blockingNeighbor(id);
 const msg = blk
 ? (lang === 'en'
 ? `⛔ Win ${getLocObj(blk).minWins||0} wild battles in ${getLocName(blk)} to unlock ${getLocName(id)}! (you have ${((G.wildWinsByLoc||{})[blk]||0)})`
 : `⛔ Remporte ${getLocObj(blk).minWins||0} combats sauvages à ${getLocName(blk)} pour débloquer ${getLocName(id)} ! (tu en as ${((G.wildWinsByLoc||{})[blk]||0)})`)
 : (lang === 'en'
 ? `⛔ ${getLocName(id)} is not reachable yet.`
 : `⛔ ${getLocName(id)} n'est pas encore accessible.`);
 setMsg(msg);
 return;
 }
 if(id===G.location){
 showTab('info');
 return;
 }
 G.location=id;
 markVisited(id);
 renderMap();
 showTab('info');
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 setMsg(lang === 'en' ? ` Teleported to ${getLocName(id)}.` : ` Vous vous téléportez à ${getLocName(id)}.`);
 saveGame();
}


function refreshMapAndLoc(){
 try{ if(document.getElementById('map-svg')) renderMap(); }catch(e){}
 try{ if(_activeTab==='info'){ const tc=document.getElementById('tab-content'); if(tc) renderLocInfo(tc); } }catch(e){}
}

