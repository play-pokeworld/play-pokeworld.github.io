// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseWindowRender(...args) { const f = __pwV43Link('baseWindowRender'); return f ? f(...args) : undefined; }
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function updateRegionSelectorLocks(){
 const sel = document.getElementById('map-region-select');
 if(!sel) return;
 Array.from(sel.options || []).forEach(opt => {
  if(!opt.value) return;
  const ok = (typeof canAccessRegion !== 'function') || canAccessRegion(opt.value);
  opt.disabled = !ok || opt.dataset.forceDisabled === 'true';
  if(!ok && typeof regionAccessMessage === 'function') opt.title = regionAccessMessage(opt.value);
 });
}

function renderMap(){
 recomputeUnlocks();
 updateFeatureWindows();
 // Phase 35: the window Base Secrete is permanente — re-rendre has each refresh
 try{ if(typeof __pwV43Link('baseWindowRender') === 'function') baseWindowRender(); }catch(_){}

 
 
 const regSel = document.getElementById('map-region-select');
 if(regSel && G && G.region){ regSel.value = G.region; if(typeof updateRegionSelectorLocks === 'function') updateRegionSelectorLocks(); }
 
 
 const mapWT = document.getElementById('map-win-title');
 if(mapWT){
 const rName = G.region==='johto'?'Johto':G.region==='hoenn'?'Hoenn':'Kanto';
 mapWT.textContent = tr('map_title_name', {region:rName});
 }
 const svg=document.getElementById('map-svg');
 if(svg) svg.setAttribute('viewBox','0 0 1600 960');
 const connG=document.getElementById('connections');
 const nodeG=document.getElementById('nodes');
 const terrainG=document.getElementById('map-terrain');
 const reg = (typeof G!=='undefined'&&G&&G.region)?G.region:'kanto';
 const img = reg==='johto'?JOHTO_MAP_IMG:reg==='hoenn'?HOENN_MAP_IMG:KANTO_MAP_IMG;
 if(terrainG){
 _pwSetHtmlSafe(terrainG, `<image href="${img}"xlink:href="${img}"x="0"y="0"width="1600"height="960"preserveAspectRatio="xMidYMid meet"/>`);
 }
 const regLocs = getCurrentRegionLocs();

 
 
 connG.replaceChildren();

 
 let rectsHTML = '';
 let labelsHTML = '';
 for(const [id, loc] of Object.entries(regLocs)){
 const isCurrent=id===G.location;
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
 // on the map, the parenthesized qualifiers of the three Regi sites
 // (Desert Ruins / Island Cave / Ancient Tomb) are hidden: only the
 // main name is shown. The full name stays in use everywhere else.
 const _noParenIds = { desert_ruins: 1, island_cave: 1, ancient_tomb: 1 };
 const lname = _noParenIds[id] ? getLocName(id).replace(/\s*\([^)]*\)\s*$/, '') : getLocName(id);
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
 <g class="loc-node${isCurrent?' current':''}${isReachable?' adjacent':''}${isLocked?' locked':''}" data-action="legacy-call" data-call="clickLocation" data-call-args="'${id}'">
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
 const npcName = getNpc(id, pni).name || 'NPC';
 const nx=loc.x + labelW/2 + 10, ny=loc.y - 13;
 rectsHTML+=`<g class="npc-node extracted-bridge-style-023" data-action="legacy-call-stop" data-call="openNpc" data-call-args="'${id}',${pni}"><title>${npcName}</title>`
 +`<circle cx="${nx}"cy="${ny}"r="11"fill="#7b3fa0"stroke="#fff"stroke-width="2"/>`
 +`<text x="${nx}"y="${ny+1}"text-anchor="middle"dominant-baseline="middle"font-size="13">…</text></g>`;
 }
 }
 }
 _pwSetHtmlSafe(nodeG, rectsHTML + labelsHTML);
 ensureMapHelpButton();
 initMobileMapPinchZoom();

}

let __pwMapZoom = 1.0;
let __pwMapVbX = 0;
let __pwMapVbY = 0;
let __pwIsPinchingOrDragging = false;
let __pwPinchResetTimer = null;
const __pwActivePointers = new Map();

function applyMapViewBox() {
  const svg = document.getElementById('map-svg');
  if (!svg) return;
  const w = 1600 / __pwMapZoom;
  const h = 960 / __pwMapZoom;
  __pwMapVbX = Math.max(0, Math.min(1600 - w, __pwMapVbX));
  __pwMapVbY = Math.max(0, Math.min(960 - h, __pwMapVbY));
  svg.setAttribute('viewBox', `${__pwMapVbX} ${__pwMapVbY} ${w} ${h}`);
  svg.style.transform = 'none';
}

function initMobileMapPinchZoom() {
  const panel = document.getElementById('map-panel');
  const svg = document.getElementById('map-svg');
  if (!panel || !svg || panel.dataset.pinchZoomInit === 'true') return;
  panel.dataset.pinchZoomInit = 'true';

  let lastPinchDist = null;
  let lastDragScreen = null;
  let touchDownPos = { x: 0, y: 0 };
  let maxMoveDist = 0;

  panel.addEventListener('pointerdown', (e) => {
    if (!e.target.closest('#map-svg')) return;
    __pwActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (__pwActivePointers.size === 1) {
      touchDownPos = { x: e.clientX, y: e.clientY };
      lastDragScreen = { x: e.clientX, y: e.clientY };
      maxMoveDist = 0;
    } else if (__pwActivePointers.size === 2) {
      const pts = Array.from(__pwActivePointers.values());
      lastPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  });

  panel.addEventListener('pointermove', (e) => {
    if (!__pwActivePointers.has(e.pointerId)) return;
    __pwActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const moved = Math.hypot(e.clientX - touchDownPos.x, e.clientY - touchDownPos.y);
    if (moved > maxMoveDist) maxMoveDist = moved;

    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const curW = 1600 / __pwMapZoom;
    const curH = 960 / __pwMapZoom;
    const scaleX = curW / rect.width;
    const scaleY = curH / rect.height;

    if (__pwActivePointers.size === 2 && lastPinchDist != null) {
      const pts = Array.from(__pwActivePointers.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (lastPinchDist > 5 && dist > 5) {
        const factor = dist / lastPinchDist;
        const oldZoom = __pwMapZoom;
        const newZoom = Math.max(1.0, Math.min(3.0, oldZoom * factor));

        const cx = ((pts[0].x + pts[1].x) / 2) - rect.left;
        const cy = ((pts[0].y + pts[1].y) / 2) - rect.top;
        const svgCx = __pwMapVbX + cx * scaleX;
        const svgCy = __pwMapVbY + cy * scaleY;

        __pwMapZoom = newZoom;
        const newW = 1600 / __pwMapZoom;
        const newH = 960 / __pwMapZoom;
        const newScaleX = newW / rect.width;
        const newScaleY = newH / rect.height;

        __pwMapVbX = svgCx - cx * newScaleX;
        __pwMapVbY = svgCy - cy * newScaleY;

        if (__pwMapZoom === 1.0) {
          __pwMapVbX = 0;
          __pwMapVbY = 0;
        }
        applyMapViewBox();
      }
      lastPinchDist = dist;
    } else if (__pwActivePointers.size === 1 && lastDragScreen && __pwMapZoom > 1.0 && maxMoveDist > 8) {
      const dx = e.clientX - lastDragScreen.x;
      const dy = e.clientY - lastDragScreen.y;
      __pwMapVbX -= dx * scaleX;
      __pwMapVbY -= dy * scaleY;
      lastDragScreen = { x: e.clientX, y: e.clientY };
      applyMapViewBox();
    }
  });

  const onPointerUp = (e) => {
    __pwActivePointers.delete(e.pointerId);
    if (__pwActivePointers.size < 2) {
      lastPinchDist = null;
    }
    if (__pwActivePointers.size === 0) {
      lastDragScreen = null;
      if (maxMoveDist >= 10) {
        __pwIsPinchingOrDragging = true;
        clearTimeout(__pwPinchResetTimer);
        __pwPinchResetTimer = setTimeout(() => {
          __pwIsPinchingOrDragging = false;
        }, 150);
      } else {
        __pwIsPinchingOrDragging = false;
      }
    }
  };

  panel.addEventListener('pointerup', onPointerUp);
  panel.addEventListener('pointercancel', onPointerUp);
}


function clickLocation(id){
 if (__pwIsPinchingOrDragging) return;
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
 if(id==='route101'){
 const has = !!(G.starterHoenn || (G.regionStarter && G.regionStarter.hoenn));
 if(!has){
 setMsg(t('choose_hoenn_starter_first') || 'Choisis d\'abord ton Pokémon de Hoenn !');
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
 try{ if(document.getElementById('map-svg')) renderMap(); }catch(_e){}
 try{
   const tc = document.getElementById('tab-content');
   if(tc && (typeof _activeTab === 'undefined' || _activeTab === 'info' || !tc.querySelector('.box-panel'))){
     if(typeof renderLocInfo === 'function') renderLocInfo(tc);
   }
 }catch(_e){}
 try{
   const el = document.getElementById('location-info-panel');
   if(el && typeof renderLocInfo === 'function') renderLocInfo(el);
 }catch(_e){}
}


// --- Migrated to ES module, globals exposed ---
if (typeof updateRegionSelectorLocks !== 'undefined') { if (typeof window !== 'undefined') window.updateRegionSelectorLocks = updateRegionSelectorLocks; if (typeof globalThis !== 'undefined') globalThis.updateRegionSelectorLocks = updateRegionSelectorLocks; }
if (typeof renderMap !== 'undefined') { if (typeof window !== 'undefined') window.renderMap = renderMap; if (typeof globalThis !== 'undefined') globalThis.renderMap = renderMap; }
if (typeof clickLocation !== 'undefined') { if (typeof window !== 'undefined') window.clickLocation = clickLocation; if (typeof globalThis !== 'undefined') globalThis.clickLocation = clickLocation; }
if (typeof refreshMapAndLoc !== 'undefined') { if (typeof window !== 'undefined') window.refreshMapAndLoc = refreshMapAndLoc; if (typeof globalThis !== 'undefined') globalThis.refreshMapAndLoc = refreshMapAndLoc; }
if (typeof initMobileMapPinchZoom !== 'undefined') { if (typeof window !== 'undefined') window.initMobileMapPinchZoom = initMobileMapPinchZoom; if (typeof globalThis !== 'undefined') globalThis.initMobileMapPinchZoom = initMobileMapPinchZoom; }



// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  updateRegionSelectorLocks,
  renderMap,
  clickLocation,
  refreshMapAndLoc,
  initMobileMapPinchZoom,
};
