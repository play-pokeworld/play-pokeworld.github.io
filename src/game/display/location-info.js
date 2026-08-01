function renderLocInfo(el){
 const loc=getLocObj(G.location);
 if(!loc) return;
 const champId=loc.champ;
 const champ=champId?((typeof getChampDef==='function')?getChampDef(champId):null):null;
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
 html += `<div class="pw-tip pw-text-sm">
 <div class="pw-bold pw-light2"> ${spk} :</div>
 <div class="pw-italic">« ${txt} »</div>
 </div>`;
 }

 
 let allButtons = '';

 
 const locNpcs = (typeof NPCS!=='undefined') ? (NPCS[G.location]||[]) : [];
 locNpcs.forEach((npc, ni)=>{
 const npcName = getNpc(G.location, ni).name || ('NPC '+(ni+1));
 allButtons += `<div class="action-btn loc-npc-btn pw-badge-purple" data-action="legacy-call" data-call="openNpc" data-call-args="'${G.location}',${ni}"><span class="ab-icon pw-icon-white-lg">${uiIcon('npc','•')}</span><span class="ab-label pw-label-white-bold">${npcName}</span></div>`;
 });
 if(loc.type!=='town'){
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="exploreArea" data-call-args=""><span class="ab-icon pw-icon-md">${uiIcon('explore','•')}</span><span class="ab-label pw-text-sm">${t('explore_btn')}</span></div>`;
 }
 // Explorations à énigmes (si le lieu en propose)
 if(typeof getPuzzlesForLocation === 'function'){
   const _puzzlesHere = getPuzzlesForLocation(G.location) || [];
   if(_puzzlesHere.length){
     const _done = _puzzlesHere.filter(p => typeof isPuzzleCompleted==='function' && isPuzzleCompleted(p.id)).length;
     const _label = (typeof t==='function' && t('puzzle_explore_btn') !== 'puzzle_explore_btn')
       ? t('puzzle_explore_btn')
       : ((G.lang==='en') ? 'Puzzle explorations' : 'Explorations à énigmes');
     allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="openPuzzleListForLocation" data-call-args="'${G.location}'"><span class="ab-icon pw-icon-md">🧩</span><span class="ab-label pw-text-sm">${_label} (${_done}/${_puzzlesHere.length})</span></div>`;
   }
 }
 const localDefeatQuest = (typeof getActiveLocalDefeatQuestForLocation === 'function') ? getActiveLocalDefeatQuestForLocation(G.location) : null;
 const hasRegularWildBattle = !!(loc.wild && loc.wild.length);
 if(localDefeatQuest && !hasRegularWildBattle){
 const qtxt = getQuestText(localDefeatQuest.inst.cat || 'main', localDefeatQuest.def.id);
 allButtons += `<div class="action-btn loc-action-btn quest-battle-btn" data-action="legacy-call" data-call="startQuestDefeatBattle" data-call-args="'${G.location}'"><span class="ab-icon pw-icon-md">${uiIcon('battle','•')}</span><span class="ab-label pw-text-sm">${t('quest_battle_btn')} ${qtxt.title ? '— '+qtxt.title : ''}</span></div>`;
 }

 
 if(loc.shopId&&SHOPS[loc.shopId]){
 if(loc.shopId === 'indigo' && !G.championTitle){
 allButtons += `<div class="action-btn loc-action-btn disabled"><span class="ab-icon pw-icon-md">${uiIcon('shop','•')}</span><span class="ab-label pw-text-sm">${t('tab_shop')} (${t('locked')})</span></div>`;
 } else {
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="openFullscreenPanel" data-call-args="'shop'"><span class="ab-icon pw-icon-md">${uiIcon('shop','•')}</span><span class="ab-label pw-text-sm">${t('tab_shop')}</span></div>`;
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
 allButtons += `<div class="action-btn loc-action-btn disabled"><span class="ab-icon pw-icon-md">${uiIcon('battle','•')}</span><span class="ab-label pw-text-sm">${lockedLabel}</span></div>`;
 } else if(champDefeated){
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="startChampBattle" data-call-args="'${champId}'"><span class="ab-icon pw-icon-md">${uiIcon('rematch','•')}</span><span class="ab-label pw-text-sm">${rematchLabel}</span></div>`;
 } else {
 allButtons += `<div class="action-btn loc-action-btn" data-action="legacy-call" data-call="startChampBattle" data-call-args="'${champId}'"><span class="ab-icon pw-icon-md">${uiIcon('battle','•')}</span><span class="ab-label pw-text-sm">${challengeLabel}</span></div>`;
 }
 }

 
 if(allButtons){
 html += `<div class="pw-grid-2">${allButtons}</div>`;
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
 html += `<div class="pw-tip">
 <div class="pw-text-sm pw-light2 pw-bold">
 ${curWins} / ${need} ${t('battles')} — ${t('to_unlock')} ${zone_txt}
 </div>
 <div class="pw-stat-bar">
 <div></div>
 </div>
 </div>`;
 }
 }

 
 const roamingId = getRoamingLegendaryForRoute(G.location);
 if(roamingId){
 if(typeof startRotationTicker === 'function') startRotationTicker(); // minuteur rotation 12 h (passe 22)
 const _roamTime = (typeof formatRotationCountdown === 'function' && typeof getRotationTimeLeftMs === 'function') ? formatRotationCountdown(getRotationTimeLeftMs()) : '';
 html += `<div class="pw-info-chip-gold">
 <span><b>${t('roaming_legendary_rotation')}</b> ${getPokeName(roamingId)} ${t('can_appear_here')}</span>
 <span class="pw-roaming-timer" data-rotation-timer="roam">${tr('roaming_rotation_timer', {time:_roamTime})}</span>
 </div>`;
 }

 // ── Île Mirage : minuteur d'apparition/disparition (rotation 12 h, même
 // fenêtre UTC que l'Atoll et les légendaires vagabonds — getRotationWindow).
 // Affiché sur l'île elle-même et sur les lieux qui y mènent.
 if(G.location === 'mirage_island' || (loc.conn||[]).includes('mirage_island')){
 if(typeof startRotationTicker === 'function') startRotationTicker();
 const _mirTime = (typeof formatRotationCountdown === 'function' && typeof getRotationTimeLeftMs === 'function') ? formatRotationCountdown(getRotationTimeLeftMs()) : '';
 const _mirWindow = (typeof getRotationWindow === 'function') ? getRotationWindow() : Math.floor(Date.now() / (12 * 3600 * 1000));
 const _mirVisible = _mirWindow % 2 === 0;
 html += `<div class="pw-info-chip-gold">
 <span><b>🌫️</b> ${_mirVisible ? t('mirage_island_present') : t('mirage_island_absent')}</span>
 <span class="pw-roaming-timer" data-rotation-timer="mirage">${tr('mirage_rotation_timer', {time:_mirTime})}</span>
 </div>`;
 }


 
 if(loc.wild&&loc.wild.length){
 const comp=locCompletion(G.location);
 const complete=comp&&comp.caught===comp.total;
 const shinyCount=comp?comp.ids.filter(id=>isSpeciesShiny(id)).length:0;
 html+=`<div class="pw-meta-row">
 <span>${t('wild_poke')}</span>
 <span>${comp?`${comp.caught}/${comp.total}`:''}</span>
 ${shinyCount>0?`<span class="pw-tag-outline"> Shiny : ${shinyCount}/${comp.total}</span>`:''}
 </div>`;
 html+=`<div class="pw-row-wrap">`;
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
 <div class="pw-flex-center">${spriteImg(id,'',{size:60, shiny:shinyOwned})}</div>
 <div class="pw-bold pw-text-sm">${getPokeName(id)}${shinyOwned?'<span class="shiny-tag pw-shiny">★</span>':''}</div>
 <div class="pw-text-sm pw-light1">Nv.${lo}-${hi}</div><div>${r==='rare'?t('rarity_rare'):r==='uncommon'?t('rarity_uncom'):t('rarity_com')}</div>
 </div>`;
 }
 if(roamingId){
 const pd = PD[roamingId];
 const seen = G.pokedex[roamingId];
 const owned = speciesOwned(roamingId);
 const shinyOwned = isSpeciesShiny(roamingId);
 const roamCls = `pw-loc-roaming location-entry loc-wild-poke is-roaming ${owned?'is-owned':'is-missing'} ${shinyOwned?'is-shiny-owned':''} ${seen?'is-seen':'is-unseen'}`;
 html += `<div class="${roamCls}">
 <div class="loc-caught-badge ${owned?'is-owned':'is-missing'}">${owned?'✓':'?'}</div>
 <div class="pw-flex-center">${spriteImg(roamingId,'',{size:60, shiny:shinyOwned})}</div>
 <div class="pw-accent-bold">${getPokeName(roamingId)}${shinyOwned?'<span class="shiny-tag pw-shiny">★</span>':''}</div>
 <div class="pw-text-sm pw-light1">${(typeof t === 'function' ? t('level_abbrev') : 'Nv.')}45</div>
 <div class="pw-roaming-badge">${t('roaming_short')}</div>
 </div>`;
 }
 html+=`</div>`;
 }

 
 if(loc.type !== 'town'){
 const drops=ROUTE_DROPS[G.location];
 if(drops&&drops.length){
 html+=`<div class="pw-drop-title">${t('drop_items_lbl')}</div>`;
 html+=`<div class="pw-drop-list">`;
 for(const d of drops){
 const itm=ITEMS[d];
 html+=`<span class="pw-drop-chip">${itm?itemIcon(d,24):'?'} ${getItemName(d)}</span>`;
 }
 html+=`</div>`;
 }
 // ── Bases Secrètes de Hoenn : alcôves DISSÉMINÉES par route ──────────────
 // Chaque route porte ses propres emplacements (type de salle différent selon
 // l'environnement). Pour chaque alcôve : « Visiter » (session de visite de
 // l'alcôve vide — compte pour la quête 217, ne touche pas à la base du
 // joueur) et « S'installer » (confirmation systématique si une base existe).
 const _alcoves = (typeof baseWindowGetRouteAlcoves === 'function') ? baseWindowGetRouteAlcoves(G.location) : [];
 if(G && G.region === 'hoenn' && _alcoves.length && !!G.unlockedSecretBaseHoenn){
   const _bEn = (G.lang === 'en');
   const _bSt = (typeof baseGetState === 'function') ? baseGetState() : null;
   const _hasBase = !!(_bSt && _bSt.layoutId);
   const _bHere = (typeof baseWindowRouteOfCurrentBase === 'function') ? baseWindowRouteOfCurrentBase() : null;
   const _isHere = _hasBase && _bHere === G.location;
   const _curLayout = _bSt ? _bSt.layoutId : null;
   const _layLbl = (id) => { const v = (typeof t === 'function') ? t('base.win.layout.' + id) : id; return (v && v !== 'base.win.layout.' + id) ? v : id; };
   html += `<div class="pw-drop-title" style="margin-top:12px;">${_bEn ? `Secret Base alcoves — ${getLocName(G.location)}` : `Alcôves de Base Secrète — ${getLocName(G.location)}`}${_isHere ? ' ✓' : ''}</div>`;
   if(!_hasBase){
     html += `<div class="pw-text-sm pw-light1" style="margin:4px 0;">${_bEn ? 'You don\u2019t have a Secret Base yet — visit an alcove, then settle in!' : 'Vous n\u2019avez pas encore de Base Secrète — visitez une alcôve, puis installez-vous !'}</div>`;
   } else if(_isHere){
     html += `<div class="pw-text-sm pw-green" style="margin:4px 0;">${_bEn ? 'Your Secret Base is established here' : 'Votre Base Secrète est établie ici'} (${_layLbl(_curLayout)}).</div>`;
   }
   html += `<div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">`;
   for(const _aid of _alcoves){
     const _isCur = _isHere && _curLayout === _aid;
     html += `<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
       <span class="pw-text-sm" style="min-width:170px;">🕳️ ${_layLbl(_aid)}</span>
       ${_isCur
         ? `<span class="pw-text-sm pw-green">${_bEn ? 'Your base' : 'Votre base'} ✓</span>`
         : `<button class="hbtn" data-action="legacy-call" data-call="baseWindowVisitAlcove" data-call-args="'${G.location}','${_aid}'">${_bEn ? 'Visit' : 'Visiter'}</button>
       <button class="hbtn" data-action="legacy-call" data-call="baseWindowConfirmEstablish" data-call-args="'${G.location}','${_aid}'">${_bEn ? 'Settle here' : 'S\u2019installer ici'}</button>`}
     </div>`;
   }
   html += `</div>`;
 }
 }


 // ── Formes spéciales (Morphéo au Labo Météo / Deoxys à Autopia) ──────────
 // Fenêtre dédiée type shop/market ouverte via un bouton interactif du lieu.
 // Le bouton d'ouverture est TOUJOURS visible sur place ; ce sont les 3
 // boutons de formes DANS le panneau qui restent verrouillés tant que
 // l'espèce de base n'est pas dans la boîte PC (l'équipe ne compte pas).
 if(G && G.location === 'weather_institute'){
   const _cfLabel = (G.lang==='en') ? 'Weather Lab — Castform Forms' : 'Labo Météo — Formes de Morphéo';
   html += `<div class="pw-grid-2" style="margin-top:12px;">
     <div class="action-btn loc-action-btn" data-action="legacy-call" data-call="openFullscreenPanel" data-call-args="'castform_forms'"><span class="ab-icon pw-icon-md">🌤️</span><span class="ab-label pw-text-sm">${_cfLabel}</span></div>
   </div>`;
 }
 if(G && G.location === 'fallarbor'){
   const _dxLabel = (G.lang==='en') ? 'Meteorites — Deoxys Forms' : 'Météorites — Formes de Deoxys';
   html += `<div class="pw-grid-2" style="margin-top:12px;">
     <div class="action-btn loc-action-btn" data-action="legacy-call" data-call="openFullscreenPanel" data-call-args="'deoxys_forms'"><span class="ab-icon pw-icon-md">☄️</span><span class="ab-label pw-text-sm">${_dxLabel}</span></div>
   </div>`;
 }
 el.innerHTML=html;

}

function typeLabel(typ){
 return t('typ_' + typ) || typ;
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderLocInfo !== 'undefined' && typeof window !== 'undefined') window.renderLocInfo = renderLocInfo;
if (typeof typeLabel !== 'undefined' && typeof window !== 'undefined') window.typeLabel = typeLabel;



// ── Panneaux de formes (type shop/market) ────────────────────────────────
// Morphéo (Labo Météo) : exactement 3 boutons — un par forme (387/388/389).
// Deoxys (Autopia)     : même logique — 3 formes (390/391/392).
// Une forme déjà obtenue affiche un texte descriptif sous l'entrée, sur le
// modèle du market (label « Acheté »), et son bouton d'achat est neutralisé.
var SPECIAL_FORM_DEFS = {
  castform_forms: {
    title: '🌤️ Labo Météo — Formes de Morphéo',
    baseId: 351,
    forms: [
      { id: 387, price: 20000, icon: '☀️', label: 'Morphéo Solaire' },
      { id: 388, price: 20000, icon: '🌧️', label: 'Morphéo Eau de Pluie' },
      { id: 389, price: 20000, icon: '❄️', label: 'Morphéo Blizzard' }
    ]
  },
  deoxys_forms: {
    title: '☄️ Météorites Cosmiques — Formes de Deoxys',
    baseId: 386,
    forms: [
      { id: 390, price: 50000, icon: '🔴', label: 'Deoxys Attaque' },
      { id: 391, price: 50000, icon: '🟢', label: 'Deoxys Défense' },
      { id: 392, price: 50000, icon: '🔵', label: 'Deoxys Vitesse' }
    ]
  }
};

function renderSpecialFormsPanel(el, panelKey){
  const def = SPECIAL_FORM_DEFS[panelKey];
  if(!def || !el) return;
  const en = (G && G.lang === 'en');
  const filterBar = document.getElementById('fs-panel-filters');
  if(filterBar){
    filterBar.style.display = 'flex';
    filterBar.style.alignItems = 'center';
    filterBar.style.justifyContent = 'flex-end';
    filterBar.innerHTML = `<span class="pw-text-sm pw-light2">${t('money')}: <b class="pw-text-md pw-light2">${G.money.toLocaleString()}₽</b></span>`;
  }
  // Condition : l'espèce de base doit être dans la BOÎTE PC (pas l'équipe).
  // Tant que ce n'est pas le cas, les boutons de formes ne s'affichent PAS —
  // seul un message d'explication apparaît.
  const unlocked = (typeof speciesInBox === 'function') ? speciesInBox(def.baseId) : false;
  let html = `<div class="pw-manage-title">${def.title}</div>`;
  if(!unlocked){
    html += `<div class="pw-empty-state-lg">${en
      ? getPokeName(def.baseId) + ' must be in your PC Box (not in your active team) to access its forms.'
      : getPokeName(def.baseId) + ' doit être dans votre Boîte PC (pas dans l\u2019équipe active) pour accéder à ses formes.'}</div>`;
    el.innerHTML = html;
    return;
  }
  html += def.forms.map(f=>{
    const owned = (typeof speciesOwned === 'function') ? speciesOwned(f.id) : false;
    const isShiny = (typeof isSpeciesShiny === 'function') ? isSpeciesShiny(f.id) : false;
    const action = owned ? '' : `data-action="legacy-call" data-call="buySpecialFormPokemon" data-call-args="${f.id},${f.price}"`;
    const ownedTxt = en ? `${t('bought')} — form already obtained, it awaits you in the PC Box.` : `${t('bought')} — forme déjà obtenue, elle vous attend dans la Boîte PC.`;
    const buyTxt = en ? 'Stabilized form, delivered straight to the PC Box.' : 'Forme stabilisée, livrée directement dans la Boîte PC.';
    return `<div class="shop-item pw-manage-card${owned?' pw-owned':''}" ${action}>
      <div class="pw-manage-orb"><div class="pw-manage-sprite">${spriteImg(f.id,'',{size:72, shiny:isShiny})}</div></div>
      <div class="pw-flex-1">
        <div class="pw-manage-name">${f.icon} ${f.label}</div>
        ${owned?`<div class="pw-text-sm pw-green">${ownedTxt}</div>`:`<div class="pw-manage-desc pw-text-sm">${buyTxt}</div>`}
      </div>
      <div class="pw-manage-level">${owned?'✓':f.price.toLocaleString()+'₽'}</div>
    </div>`;
  }).join('');
  el.innerHTML = html;
}
function renderCastformFormsPanel(el){ renderSpecialFormsPanel(el, 'castform_forms'); }
function renderDeoxysFormsPanel(el){ renderSpecialFormsPanel(el, 'deoxys_forms'); }

function changeCastformForm(formKey){
  if(typeof G === 'undefined' || !G || !G.team) return;
  const p = G.team.find(x => x && Number(x.id) === 351);
  if(!p){ if(typeof notify==='function') notify('Aucun Morphéo dans votre équipe !', 'var(--red)'); return; }
  const namesFR = { sun: 'Morphéo (Solaire)', rain: 'Morphéo (Eau de Pluie)', snow: 'Morphéo (Blizzard)', normal: 'Morphéo' };
  const typesFR = { sun: 'Fire', rain: 'Water', snow: 'Ice', normal: 'Normal' };
  p.form = formKey;
  p.name = namesFR[formKey] || 'Morphéo';
  p.typeForm = typesFR[formKey] || 'Normal';
  if(typeof notify==='function') notify('Morphéo a transformé sa structure météorologique en ' + p.name + ' !', 'var(--green)');
  if(typeof saveGame==='function') saveGame();
  if(typeof renderTeamWindow==='function') renderTeamWindow();
  if(typeof renderLocInfo==='function') {
    const el = document.getElementById('location-info-panel');
    if(el) renderLocInfo(el);
  }
}

function changeDeoxysForm(formKey){
  if(typeof G === 'undefined' || !G || !G.team) return;
  const p = G.team.find(x => x && Number(x.id) === 386);
  if(!p){ if(typeof notify==='function') notify('Aucun Deoxys dans votre équipe !', 'var(--red)'); return; }
  const namesFR = { attack: 'Deoxys (Forme Attaque)', defense: 'Deoxys (Forme Défense)', speed: 'Deoxys (Forme Vitesse)', normal: 'Deoxys (Forme Normale)' };
  const statsMap = {
    normal:  { atk: 150, def: 50, spe: 150 },
    attack:  { atk: 180, def: 20, spe: 150 },
    defense: { atk: 70,  def: 160, spe: 90 },
    speed:   { atk: 95,  def: 90,  spe: 180 }
  };
  const st = statsMap[formKey] || statsMap.normal;
  p.form = formKey;
  p.name = namesFR[formKey] || 'Deoxys';
  p.baseAtkForm = st.atk;
  p.baseDefForm = st.def;
  p.baseSpeForm = st.spe;
  if(typeof notify==='function') notify('Les météorites font muter Deoxys en ' + p.name + ' !', 'var(--green)');
  if(typeof saveGame==='function') saveGame();
  if(typeof renderTeamWindow==='function') renderTeamWindow();
  if(typeof renderLocInfo==='function') {
    const el = document.getElementById('location-info-panel');
    if(el) renderLocInfo(el);
  }
}

if(typeof window !== 'undefined'){
  window.changeCastformForm = changeCastformForm;
  window.changeDeoxysForm = changeDeoxysForm;
  window.renderSpecialFormsPanel = renderSpecialFormsPanel;
  window.renderCastformFormsPanel = renderCastformFormsPanel;
  window.renderDeoxysFormsPanel = renderDeoxysFormsPanel;
}

function buySpecialFormPokemon(id, price){
  id = Number(id);
  if(!G || typeof G.money !== 'number') return;
  if(G.money < price){
    if(typeof notify === 'function') notify((typeof t==='function'?t("n.pas_assez_dargent"):"Pas assez d'argent !"), 'var(--red)');
    return;
  }
  G.money -= price;
  if(typeof updateHeader === 'function') updateHeader();
  const isShiny = (typeof rollShiny === 'function') ? rollShiny() : false;
  const p = (typeof createPoke === 'function') ? createPoke(id, 1, isShiny) : { id, name: getPokeName(id), level: 1, moves: [] };
  if(!p) return;
  if(isShiny){ p.shinyUnlocked=true; p.shinyActive=true; p.shiny=true; if(typeof unlockShinyForSpecies==='function') unlockShinyForSpecies(id); }
  let boxId = 'form_' + id + '_' + Date.now();
  while(G.collection[boxId]) boxId = 'form_' + id + '_' + Date.now() + '_' + Math.floor(Math.random()*1000);
  G.collection[boxId] = p;
  if(!G.pokedex) G.pokedex = {};
  G.pokedex[id] = { ...(G.pokedex[id] || {}), seen: true, caught: true };
  if(isShiny) G.pokedex[id].shiny = true;
  if(typeof saveGame === 'function') saveGame();
  const name = p.name || ('Pokemon #' + id);
  if(typeof notify === 'function') notify(name + ' a été ajouté directement dans votre Boîte PC ! (-' + price.toLocaleString() + '₽)', 'var(--green)');
  // Rafraîchit le panneau de formes ouvert (marque « déjà obtenue »)
  try{
    const fsContent = document.getElementById('fs-panel-content');
    const cur = (typeof window !== 'undefined') ? window._fsCurrentPanel : null;
    if(fsContent && (cur === 'castform_forms' || cur === 'deoxys_forms') && typeof renderSpecialFormsPanel === 'function'){
      renderSpecialFormsPanel(fsContent, cur);
    }
  }catch(_){ }
}
if(typeof window !== 'undefined'){
  window.buySpecialFormPokemon = buySpecialFormPokemon;
}
