function renderMap(){
 recomputeUnlocks();
 updateFeatureWindows();
 
 
 const regSel = document.getElementById('map-region-select');
 if(regSel && G && G.region){ regSel.value = G.region; }
 
 
 const mapWT = document.querySelector('#win-map .win-header-title');
 if(mapWT){
 const rName = G.region==='johto'?'Johto':'Kanto';
 mapWT.textContent = '⋮⋮ 🗺 ' + tr('map_title_name', {region:rName});
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

 
 
 connG.innerHTML='';

 
 let rectsHTML = '';
 let labelsHTML = '';
 for(const [id, loc] of Object.entries(regLocs)){
 const isCurrent=id===G.location;
 const badgeReq=loc.badgeReq||0;
 const storyReq=loc.storyReq||0;
 const gateStatus = (typeof locGateStatus === 'function') ? locGateStatus(id) : {ok:true};
 const isLocked=storyReq>(G.storyIdx||0) || !isLocUnlocked(id);
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
 const blk = blockingNeighbor(id);
 const reqStr = (!gateStatus.ok && typeof locGateMessage === 'function')
 ? locGateMessage(id)
 : (blk)
 ? tr('win_wild_battles_req', {need:getLocObj(blk).minWins||0, location:getLocName(blk), have:((G.wildWinsByLoc||{})[blk]||0)})
 : tr('locked_by_story', {current:G.storyIdx||0, required:storyReq});
 const title = isLocked?`${getLocName(id)} \u2014 ${reqStr}`:getLocName(id);
 rectsHTML+=`
 <g class="loc-node${isCurrent?' current':''}${isReachable?' adjacent':''}${isLocked?' locked':''}" data-action="legacy-call" data-call="clickLocation" data-call-args="'${id}'" data-style="cursor:${isLocked?'not-allowed':'pointer'}">
 <title>${title}</title>
 <rect x="${x0-2}"y="${y0-2}"width="${w+4}"height="${h+4}"rx="11"fill="#000"opacity="${isLocked?0.35:0.4}"/>
 <rect x="${x0}"y="${y0}"width="${w}"height="${h}"rx="9"fill="${color}"stroke="${stroke}"stroke-width="${sw}"/>
 ${isCurrent?`<rect x="${x0-6}"y="${y0-6}"width="${w+12}"height="${h+12}"rx="13"fill="none"stroke="var(--light2)"stroke-width="3"opacity="0.9" class="pulse"/>`:''}
 <text x="${loc.x}"y="${loc.y - h/2 + 14}"text-anchor="middle"dominant-baseline="middle"font-size="${isCurrent?18:15}"fill="#fff"opacity="${isLocked?0.6:1}">${isLocked?'':icon}</text>
 </g>`;
 labelsHTML += `<g class="map-label extracted-bridge-style-021">
 <rect x="${loc.x - labelW/2}"y="${loc.y - labelH/2}"width="${labelW}"height="${labelH}"rx="9"fill="rgba(0,0,0,0.80)"stroke="${isCurrent?'#94886B':'rgba(255,255,255,0.25)'}"stroke-width="0.8"/>
 <text x="${loc.x}"y="${loc.y+0.5}"text-anchor="middle"dominant-baseline="middle"font-size="12"font-weight="bold"fill="${labelColor}" class="extracted-bridge-style-022"opacity="${isLocked?0.6:1}">${lname}</text>
 </g>`;
 
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
 rectsHTML+=`<g class="npc-node extracted-bridge-style-023" data-action="legacy-call-stop" data-call="openNpc" data-call-args="'${id}',${pni}"><title>${npcName}</title>`
 +`<circle cx="${nx}"cy="${ny}"r="11"fill="#7b3fa0"stroke="#fff"stroke-width="2"/>`
 +`<text x="${nx}"y="${ny+1}"text-anchor="middle"dominant-baseline="middle"font-size="13">🗣</text></g>`;
 }
 }
 }
 nodeG.innerHTML = rectsHTML + labelsHTML;
 ensureMapHelpButton();

}


function clickLocation(id){
 const loc=getLocObj(id);
 if(!loc) return;
 
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
 
 if(id==='route1'){
 const has = !!(G.starterKanto || G.starter || (G.regionStarter && G.regionStarter.kanto));
 if(!has){
 setMsg(t('choose_kanto_starter_first'));
 if(typeof checkStarterNeeded==='function') checkStarterNeeded();
 return;
 }
 }
 if(id==='jroute29'){
 const has = !!(G.starterJohto || (G.regionStarter && G.regionStarter.johto));
 if(!has){
 setMsg(t('choose_johto_starter_first'));
 if(typeof checkStarterNeeded==='function') checkStarterNeeded();
 return;
 }
 }
 const gateStatus = (typeof locGateStatus === 'function') ? locGateStatus(id) : {ok:true};
 if(!gateStatus.ok){
 setMsg(typeof locGateMessage === 'function' ? locGateMessage(id) : tr('location_not_reachable', {location:getLocName(id)}));
 return;
 }
 const storyReq=loc.storyReq||0;
 if(storyReq>(G.storyIdx||0)){
 setMsg(tr('story_not_reached', {location:getLocName(id), current:G.storyIdx||0, required:storyReq}));
 return;
 }
 if(!isLocUnlocked(id)){
 const blk = blockingNeighbor(id);
 const msg = blk
 ? tr('win_battles_to_unlock', {need:getLocObj(blk).minWins||0, from:getLocName(blk), to:getLocName(id), have:((G.wildWinsByLoc||{})[blk]||0)})
 : tr('location_not_reachable', {location:getLocName(id)});
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
 setMsg(tr('teleported_to', {location:getLocName(id)}));
 saveGame();
}


function refreshMapAndLoc(){
 try{ if(document.getElementById('map-svg')) renderMap(); }catch(e){}
 try{ if(_activeTab==='info'){ const tc=document.getElementById('tab-content'); if(tc) renderLocInfo(tc); } }catch(e){}
}
