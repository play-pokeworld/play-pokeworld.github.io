// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function baseGetState(...args) { const f = __pwV43Link('baseGetState'); return f ? f(...args) : undefined; }
function baseWindowGetRouteAlcoves(...args) { const f = __pwV43Link('baseWindowGetRouteAlcoves'); return f ? f(...args) : undefined; }
function baseWindowRouteOfCurrentBase(...args) { const f = __pwV43Link('baseWindowRouteOfCurrentBase'); return f ? f(...args) : undefined; }
/**
 * Location info panel — classic adapter (model builder ONLY, rebuilt
 * from zero)
 *
 * The whole visual tree is owned by the ECS design system
 * (ui/views/LocationInfoView.js + ui/components/map-dressing.js). This
 * adapter collects the location state, localizes every label and keeps
 * the legacy contracts (rotation ticker spans, loc-caught-badge state
 * classes, legacy-call routing names/args).
 */
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

function locationInfoModel(){
 const loc = getLocObj(G.location);
 const champId = loc.champ;
 const champ = champId ? ((typeof getChampDef==='function')?getChampDef(champId):null) : null;
 const champDefeated = champId && G.defeatedChamps[champId];
 const uiIcon = (name, fallback='') => (typeof getIcon === 'function' ? getIcon(name, 18) : fallback);
 const regionKey = (typeof regionOfLoc === 'function') ? regionOfLoc(G.location) : (G.region || 'kanto');
 const hasShop = !!(loc.shopId && SHOPS[loc.shopId]);
 const wildCount = (loc.wild || []).length;
 const npcCount = ((typeof NPCS!=='undefined') ? (NPCS[G.location]||[]) : []).length;

 const model = { actions: [], timerChips: [] };
 model.overview = {
  title: getLocName(G.location),
  metas: [
   (typeof getRegionDisplayName === 'function' ? getRegionDisplayName(regionKey) : regionKey),
   loc.type || '',
   wildCount ? (wildCount + ' ' + (t('wild_poke') || 'rencontres')) : (t('no_wild_pokemon_here') || 'aucune rencontre'),
   npcCount + ' NPC',
   hasShop ? (t('tab_shop') || 'Boutique') : null,
  ].filter(Boolean),
 };

 // ── Lore quote ─────────────────────────────────────────────────────────
 const lore = getLore(G.location);
 if(lore && lore.text) model.lore = { speaker: lore.speaker, text: lore.text };

 // ── Action buttons (locked entries = informational rows, user rule) ────
 const locNpcs = (typeof NPCS!=='undefined') ? (NPCS[G.location]||[]) : [];
 locNpcs.forEach((npc, ni)=>{
  const npcName = getNpc(G.location, ni).name || ('NPC ' + (ni + 1));
  model.actions.push({ kind: 'button', cls: 'pw-loc-npc-btn', iconHtml: uiIcon('npc', '•'), label: npcName, call: 'openNpc', callArgs: "'" + G.location + "'," + ni });
 });
 if(loc.type !== 'town'){
  model.actions.push({ kind: 'button', iconHtml: uiIcon('explore', '•'), label: t('explore_btn'), call: 'exploreArea', callArgs: '' });
 }
 if(typeof getPuzzlesForLocation === 'function'){
  const puzzlesHere = getPuzzlesForLocation(G.location) || [];
  if(puzzlesHere.length){
   const done = puzzlesHere.filter(p => typeof isPuzzleCompleted === 'function' && isPuzzleCompleted(p.id)).length;
   const label = (typeof t==='function' && t('puzzle_explore_btn') !== 'puzzle_explore_btn')
    ? t('puzzle_explore_btn')
    : ((G.lang==='en') ? 'Puzzle explorations' : 'Explorations à énigmes');
   model.actions.push({ kind: 'button', iconHtml: '🧩', label: label + ' (' + done + '/' + puzzlesHere.length + ')', call: 'openPuzzleListForLocation', callArgs: "'" + G.location + "'" });
  }
 }
 const localDefeatQuest = (typeof getActiveLocalDefeatQuestForLocation === 'function') ? getActiveLocalDefeatQuestForLocation(G.location) : null;
 const hasRegularWildBattle = !!(loc.wild && loc.wild.length);
 if(localDefeatQuest && !hasRegularWildBattle){
  const qtxt = getQuestText(localDefeatQuest.inst.cat || 'main', localDefeatQuest.def.id);
  model.actions.push({ kind: 'button', cls: 'pw-loc-quest-btn', iconHtml: uiIcon('battle', '•'), label: t('quest_battle_btn') + (qtxt.title ? ' — ' + qtxt.title : ''), call: 'startQuestDefeatBattle', callArgs: "'" + G.location + "'" });
 }
 if(loc.shopId && SHOPS[loc.shopId]){
  if(loc.shopId === 'indigo' && !G.championTitle){
   model.actions.push({ kind: 'info', iconHtml: uiIcon('shop', '•'), label: t('tab_shop') + ' (' + t('locked') + ')' });
  } else {
   model.actions.push({ kind: 'button', iconHtml: uiIcon('shop', '•'), label: t('tab_shop'), call: 'openFullscreenPanel', callArgs: "'shop'" });
  }
 }
 if(champId){
  const champBadgeReq = champ ? (champ.badgeReq || 0) : 0;
  const haveRegionBadges = (typeof regionBadgeCount === 'function') ? regionBadgeCount(regionOfLoc(G.location)) : (G.badges||[]).length;
  const champLocked = champBadgeReq > haveRegionBadges;
  const isLeague = (typeof isLeagueChampionId === 'function' && isLeagueChampionId(champId)) || champId === 'elite4' || champId === 'johto_elite4';
  const champName = getChampName(champId);
  if(champLocked){
   const lockedLabel = isLeague ? tr('league_locked_label', { champion: champName, badges: champBadgeReq }) : tr('arena_locked_label', { champion: champName, badges: champBadgeReq });
   model.actions.push({ kind: 'info', iconHtml: uiIcon('battle', '•'), label: lockedLabel });
  } else if(champDefeated){
   const rematchLabel = isLeague ? tr('league_rematch_label', { champion: champName }) : tr('arena_rematch_label', { champion: champName });
   model.actions.push({ kind: 'button', iconHtml: uiIcon('rematch', '•'), label: rematchLabel, call: 'startChampBattle', callArgs: "'" + champId + "'" });
  } else {
   const challengeLabel = isLeague ? tr('league_challenge_label', { champion: champName }) : tr('arena_challenge_label', { champion: champName });
   model.actions.push({ kind: 'button', iconHtml: uiIcon('battle', '•'), label: challengeLabel, call: 'startChampBattle', callArgs: "'" + champId + "'" });
  }
 }

 // ── Zone unlock progress (self-contained bar in the DS component) ───────
 if(loc.type !== 'town' && (loc.minWins||0) > 0 && loc.wild && loc.wild.length){
  const linkedIds = (typeof getLinkedRouteIds === 'function') ? getLinkedRouteIds(G.location) : [G.location];
  const curWins = linkedIds.reduce((sum,id) => sum + (((G.wildWinsByLoc||{})[id])||0), 0);
  const need = loc.minWins;
  const nextZoneIds = (typeof zonesUnlockedByClearing === 'function') ? zonesUnlockedByClearing(G.location) : [];
  const nextZones = nextZoneIds.map(id => getLocName(id));
  if(curWins < need && nextZones.length){
   const pct = clamp(Math.floor((curWins / need) * 100), 0, 100);
   const zoneTxt = nextZones.length ? nextZones.slice(0,2).join(', ') : t('next_zone');
   model.unlockTip = { text: curWins + ' / ' + need + ' ' + t('battles') + ' — ' + t('to_unlock') + ' ' + zoneTxt, pct };
  }
 }

 // ── Roaming legendary rotation chip ─────────────────────────────────────
 const roamingId = getRoamingLegendaryForRoute(G.location);
 if(roamingId){
  if(typeof startRotationTicker === 'function') startRotationTicker(); // 12 h rotation timer (phase 22)
  const roamTime = (typeof formatRotationCountdown === 'function' && typeof getRotationTimeLeftMs === 'function') ? formatRotationCountdown(getRotationTimeLeftMs()) : '';
  model.timerChips.push({
   labelHtml: '<b>' + t('roaming_legendary_rotation') + '</b> ' + getPokeName(roamingId) + ' ' + t('can_appear_here'),
   timerKind: 'roam',
   timerText: tr('roaming_rotation_timer', { time: roamTime }),
  });
 }

 // ── Mirage Island show/hide timer (same 12 h UTC window) ───────────────
 if(G.location === 'mirage_island' || (loc.conn||[]).includes('mirage_island')){
  if(typeof startRotationTicker === 'function') startRotationTicker();
  const mirTime = (typeof formatRotationCountdown === 'function' && typeof getRotationTimeLeftMs === 'function') ? formatRotationCountdown(getRotationTimeLeftMs()) : '';
  const mirWindow = (typeof getRotationWindow === 'function') ? getRotationWindow() : Math.floor(Date.now() / (12 * 3600 * 1000));
  const mirVisible = mirWindow % 2 === 0;
  model.timerChips.push({
   labelHtml: '<b>\ud83c\udf2b\ufe0f</b> ' + (mirVisible ? t('mirage_island_present') : t('mirage_island_absent')),
   timerKind: 'mirage',
   timerText: tr('mirage_rotation_timer', { time: mirTime }),
  });
 }

 // ── Wild encounters grid ────────────────────────────────────────────────
 if(loc.wild && loc.wild.length){
  const comp = locCompletion(G.location);
  const shinyCount = comp ? comp.ids.filter(id => isSpeciesShiny(id)).length : 0;
  const entries = [];
  for(const w of loc.wild){
   const [id, lo, hi, rarity] = w;
   const r = rarity || 'common';
   const pd = PD[id];
   if(!pd) continue;
   const seen = G.pokedex[id];
   const owned = speciesOwned(id);
   const shinyOwned = isSpeciesShiny(id);
   entries.push({
    owned, seen: !!seen, shinyOwned,
    name: getPokeName(id),
    spriteHtml: spriteImg(id, '', { size: 56, shiny: shinyOwned }),
    levelText: 'Nv.' + lo + '-' + hi,
    rarityText: r === 'rare' ? t('rarity_rare') : r === 'uncommon' ? t('rarity_uncom') : t('rarity_com'),
   });
  }
  if(roamingId){
   const seen = G.pokedex[roamingId];
   const owned = speciesOwned(roamingId);
   const shinyOwned = isSpeciesShiny(roamingId);
   entries.push({
    owned, seen: !!seen, shinyOwned, roaming: true, accentCls: 'pw-accent-bold',
    name: getPokeName(roamingId),
    spriteHtml: spriteImg(roamingId, '', { size: 56, shiny: shinyOwned }),
    levelText: ((typeof t === 'function' ? t('level_abbrev') : 'Nv.')) + '45',
    rarityText: t('roaming_short'),
   });
  }
  model.wild = {
   meta: {
    label: t('wild_poke'),
    progress: comp ? (comp.caught + '/' + comp.total) : '',
    shinyTag: shinyCount > 0 ? ('Shiny : ' + shinyCount + '/' + comp.total) : null,
   },
   entries,
  };
 }

 // ── Route drops + Hoenn secret-base alcoves ─────────────────────────────
 if(loc.type !== 'town'){
  const drops = ROUTE_DROPS[G.location];
  if(drops && drops.length){
   model.drops = {
    title: t('drop_items_lbl'),
    chips: drops.map((d) => {
     const itm = ITEMS[d];
     // Wave 28 (user): same display as the wild Pokémon — the canonical
     // .pw-poke-circle-wrap disc (56px sprite, 72px frame) with the name
     // below. The old 24px inline chip was unreadably small.
     const icon = itm ? itemIcon(d, 56) : null;
     return {
      discHtml: icon ? ('<span class="pw-poke-circle-wrap" style="width:56px;height:56px;"><span class="pw-poke-circle-bg"></span>' + icon + '</span>') : '?',
      iconHtml: icon || '?',
      name: getItemName(d),
     };
    }),
   };
  }
  const routeAlcoves = (typeof __pwV43Link('baseWindowGetRouteAlcoves') === 'function') ? baseWindowGetRouteAlcoves(G.location) : [];
  if(G && G.region === 'hoenn' && routeAlcoves.length && !!G.unlockedSecretBaseHoenn){
   const bEn = (G.lang === 'en');
   const bSt = (typeof __pwV43Link('baseGetState') === 'function') ? baseGetState() : null;
   const hasBase = !!(bSt && bSt.layoutId);
   const baseHere = (typeof __pwV43Link('baseWindowRouteOfCurrentBase') === 'function') ? baseWindowRouteOfCurrentBase() : null;
   const isHere = hasBase && baseHere === G.location;
   const curLayout = bSt ? bSt.layoutId : null;
   const layLbl = (id) => { const v = (typeof t === 'function') ? t('base.win.layout.' + id) : id; return (v && v !== 'base.win.layout.' + id) ? v : id; };
   model.alcoves = {
    title: (bEn ? 'Secret Base alcoves — ' : 'Alcôves de Base Secrète — ') + getLocName(G.location) + (isHere ? ' ✓' : ''),
    subText: !hasBase
     ? (bEn ? 'You don\u2019t have a Secret Base yet — visit an alcove, then settle in!' : 'Vous n\u2019avez pas encore de Base Secrète — visitez une alcôve, puis installez-vous !')
     : (isHere
       ? (bEn ? 'Your Secret Base is established here' : 'Votre Base Secrète est établie ici') + ' (' + layLbl(curLayout) + ').'
       // Wave 35 (user): spatial orientation — where IS my base from here.
       : (bEn ? 'Your Secret Base is established elsewhere' : 'Votre Base Secrète est établie ailleurs')
         + (baseHere ? ' (' + getLocName(baseHere) + ')' : '')
         + (bEn ? ' — travel there to visit it.' : ' — rendez-vous sur place pour la visiter.')),
    subCls: isHere && hasBase ? 'pw-text-positive' : 'pw-light1',
    rows: routeAlcoves.map((aid) => {
     const isCur = isHere && curLayout === aid;
     return {
      label: layLbl(aid),
      current: isCur,
      currentLabel: bEn ? 'Your base' : 'Votre base',
      // Wave 35 (user): direct entry from the location hosting the base —
      // until now the current row was plain text with NO way in.
      enterLabel: bEn ? 'Enter my base' : 'Entrer dans ma base',
      visitLabel: bEn ? 'Visit' : 'Visiter',
      establishLabel: bEn ? 'Settle here' : 'S\u2019installer ici',
      visitArgs: "'" + G.location + "','" + aid + "'",
      establishArgs: "'" + G.location + "','" + aid + "'",
     };
    }),
   };
  }
 }

 // ── Special forms (Weather Lab / Meteorites) — interactive buttons ──────
 if(G && G.location === 'weather_institute'){
  const cfLabel = (G.lang==='en') ? 'Weather Lab — Castform Forms' : 'Labo Météo — Formes de Morphéo';
  model.actions.push({ kind: 'button', iconHtml: '\ud83c\udf24\ufe0f', label: cfLabel, call: 'openFullscreenPanel', callArgs: "'castform_forms'" });
 }
 if(G && G.location === 'fallarbor'){
  const dxLabel = (G.lang==='en') ? 'Meteorites — Deoxys Forms' : 'Météorites — Formes de Deoxys';
  model.actions.push({ kind: 'button', iconHtml: '\u2604\ufe0f', label: dxLabel, call: 'openFullscreenPanel', callArgs: "'deoxys_forms'" });
 }
 return model;
}
function renderLocInfo(el){
 try { if (typeof PokeTrace !== 'undefined' && PokeTrace) PokeTrace.count('render', 'ui:loc-info'); } catch (_) {}
 const loc = getLocObj(G.location);
 if(!loc) return;
 // Window title side effect (kept contract).
 const locTitleEl = document.getElementById('loc-win-title');
 if(locTitleEl) locTitleEl.textContent = getLocName(G.location) || 'Lieu';
 // Rebuilt display: the ECS design system owns the whole tree.
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.LocationInfoView) throw new Error('[ui] PokeUI views not loaded (LocationInfoView)');
 _pwSetHtmlSafe(el, views.LocationInfoView.toHTML(locationInfoModel()));
}

function typeLabel(typ){
 return t('typ_' + typ) || typ;
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderLocInfo !== 'undefined') { if (typeof window !== 'undefined') window.renderLocInfo = renderLocInfo; if (typeof globalThis !== 'undefined') globalThis.renderLocInfo = renderLocInfo; }
if (typeof locationInfoModel !== 'undefined') { if (typeof window !== 'undefined') window.locationInfoModel = locationInfoModel; if (typeof globalThis !== 'undefined') globalThis.locationInfoModel = locationInfoModel; }
if (typeof typeLabel !== 'undefined') { if (typeof window !== 'undefined') window.typeLabel = typeLabel; if (typeof globalThis !== 'undefined') globalThis.typeLabel = typeLabel; }



// ── Form panels (shop/market style) ────────────────────────────────
// Castform (Weather Lab): exactly 3 buttons — one per form (387/388/389).
// Deoxys (Autopia)      : same logic — 3 forms (390/391/392).
// An already-obtained form shows a descriptive text under the entry,
// like the market does ("Bought" label), and its buy button is disabled.
const SPECIAL_FORM_DEFS = {
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
    _pwSetHtmlSafe(filterBar, `<span class="pw-text-sm pw-light2">${t('money')}: <b class="pw-text-md pw-light2">${G.money.toLocaleString()}₽</b></span>`);
  }
  // Condition: the base species must be in the PC box (not the team).
  // Until this is the case, the form buttons are not shown —
  // only an explanatory message appears.
  const unlocked = (typeof speciesInBox === 'function') ? speciesInBox(def.baseId) : false;
  // Wave 21 (ECS DS): the panel content is rendered from zero by
  // SpecialFormsView — this adapter only shapes (localized) models. The
  // buy contract (buySpecialFormPokemon with UNQUOTED numeric args) is
  // unchanged; the vdom serializer escapes every string.
  const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if(!views || typeof views.SpecialFormsView !== 'function') throw new Error('[ui] PokeUI views not loaded (SpecialFormsView)');
  const model = { title: def.title, emptyLabel: '', rows: [] };
  if(!unlocked){
    model.emptyLabel = en
      ? getPokeName(def.baseId) + ' must be in your PC Box (not in your active team) to access its forms.'
      : getPokeName(def.baseId) + ' doit être dans votre Boîte PC (pas dans l\u2019équipe active) pour accéder à ses formes.';
    _pwSetHtmlSafe(el, views.SpecialFormsView.toHTML(model));
    return;
  }
  model.rows = def.forms.map((f)=>{
    const owned = (typeof speciesOwned === 'function') ? speciesOwned(f.id) : false;
    const isShiny = (typeof isSpeciesShiny === 'function') ? isSpeciesShiny(f.id) : false;
    return {
      spriteHtml: spriteImg(f.id,'',{size:72, shiny:isShiny}),
      nameLabel: f.icon + ' ' + f.label,
      owned: owned,
      ownedText: en ? `${t('bought')} — form already obtained, it awaits you in the PC Box.` : `${t('bought')} — forme déjà obtenue, elle vous attend dans la Boîte PC.`,
      descText: en ? 'Stabilized form, delivered straight to the PC Box.' : 'Forme stabilisée, livrée directement dans la Boîte PC.',
      sideText: owned ? '✓' : f.price.toLocaleString()+'₽',
      callArgs: f.id + ',' + f.price,
    };
  });
  _pwSetHtmlSafe(el, views.SpecialFormsView.toHTML(model));
}
function renderCastformFormsPanel(el){ renderSpecialFormsPanel(el, 'castform_forms'); }
function renderDeoxysFormsPanel(el){ renderSpecialFormsPanel(el, 'deoxys_forms'); }

function changeCastformForm(formKey){
  if(typeof G === 'undefined' || !G || !G.team) return;
  const p = G.team.find(x => x && Number(x.id) === 351);
  if(!p){ if(typeof notify==='function') notify(tr('no_castform_in_team'), 'var(--red)'); return; }
  const namesFR = { sun: 'Morphéo (Solaire)', rain: 'Morphéo (Eau de Pluie)', snow: 'Morphéo (Blizzard)', normal: 'Morphéo' };
  const typesFR = { sun: 'Fire', rain: 'Water', snow: 'Ice', normal: 'Normal' };
  p.form = formKey;
  p.name = namesFR[formKey] || 'Morphéo';
  p.typeForm = typesFR[formKey] || 'Normal';
  if(typeof notify==='function') notify(tr('castform_weather_transformed', { name: p.name }), 'var(--green)');
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
  if(!p){ if(typeof notify==='function') notify(tr('no_deoxys_in_team'), 'var(--red)'); return; }
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
  if(typeof notify==='function') notify(tr('deoxys_mutated', { name: p.name }), 'var(--green)');
  if(typeof saveGame==='function') saveGame();
  if(typeof renderTeamWindow==='function') renderTeamWindow();
  if(typeof renderLocInfo==='function') {
    const el = document.getElementById('location-info-panel');
    if(el) renderLocInfo(el);
  }
}

if(typeof window !== 'undefined'){
if (typeof globalThis !== 'undefined') globalThis.changeCastformForm = changeCastformForm;
if (typeof globalThis !== 'undefined') globalThis.changeDeoxysForm = changeDeoxysForm;
if (typeof globalThis !== 'undefined') globalThis.renderSpecialFormsPanel = renderSpecialFormsPanel;
if (typeof globalThis !== 'undefined') globalThis.renderCastformFormsPanel = renderCastformFormsPanel;
if (typeof globalThis !== 'undefined') globalThis.renderDeoxysFormsPanel = renderDeoxysFormsPanel;
}

function buySpecialFormPokemon(id, price){
  id = Number(id);
  if(!G || typeof G.money !== 'number') return;
  if(G.money < price){
    if(typeof notify === 'function') notify(t('n.pas_assez_dargent'), 'var(--red)');
    return;
  }
  G.money -= price;
  if(typeof updateHeader === 'function') updateHeader();
  const isShiny = (typeof rollShiny === 'function') ? rollShiny() : false;
  const p = (typeof createPoke === 'function') ? createPoke(id, 1, isShiny) : { id, name: getPokeName(id), level: 1, moves: [] };
  if(!p) return;
  if(isShiny){ p.shinyUnlocked=true; p.shinyActive=true; p.shiny=true; if(typeof unlockShinyForSpecies==='function') unlockShinyForSpecies(id); }
  // if already owned (same ID), do not create a duplicate but try +1 IV at 10% (consistent with fossils)
  const alreadyOwned = (typeof speciesOwned === 'function' && speciesOwned(id));
  if (alreadyOwned) {
    let existing = null;
    if (G.team) existing = G.team.find(x => x && Number(x.id) === Number(id));
    if (!existing) {
      for (const k in G.collection || {}) {
        const cand = G.collection[k];
        if (cand && Number(cand.id) === Number(id)) { existing = cand; break; }
      }
    }
    if (existing && Math.random() < 0.1) {
      if (!existing.ivs) existing.ivs = {hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
      const avail = ['hp','atk','def','spa','spd','spe'].filter(k => (existing.ivs[k]||0) < 6);
      if (avail.length) {
        const pick = avail[Math.floor(Math.random()*avail.length)];
        existing.ivs[pick] = (existing.ivs[pick]||0)+1;
        try { if (typeof recalcPokeStats === 'function') recalcPokeStats(existing); } catch(_){}
        if (typeof notify === 'function') notify(`${existing.name} déjà possédé : +1 IV ${pick.toUpperCase()} !`, 'var(--green)');
      }
    } else {
      if (typeof notify === 'function') notify(`${p.name} déjà possédé : pas de doublon créé.`, 'var(--light1)');
    }
    if (typeof saveGame === 'function') saveGame();
    return;
  }
  let boxId = 'form_' + id + '_' + Date.now();
  while(G.collection[boxId]) boxId = 'form_' + id + '_' + Date.now() + '_' + Math.floor(Math.random()*1000);
  G.collection[boxId] = p;
  if(!G.pokedex) G.pokedex = {};
  G.pokedex[id] = { ...(G.pokedex[id] || {}), seen: true, caught: true };
  if(isShiny) G.pokedex[id].shiny = true;
  if(typeof saveGame === 'function') saveGame();
  try { if (typeof renderUnifiedGrid === 'function') renderUnifiedGrid(); } catch(_){}
  try { if (typeof renderTeamWindow === 'function') renderTeamWindow(); } catch(_){}

  const name = p.name || ('Pokemon #' + id);
  if(typeof notify === 'function') notify(name + ' a été ajouté directement dans votre Boîte PC ! (-' + price.toLocaleString() + '₽)', 'var(--green)');
  // Refresh the open forms panel (marks "already obtained")
  try{
    const fsContent = document.getElementById('fs-panel-content');
    const cur = (typeof window !== 'undefined') ? window._fsCurrentPanel : null;
    if(fsContent && (cur === 'castform_forms' || cur === 'deoxys_forms') && typeof renderSpecialFormsPanel === 'function'){
      renderSpecialFormsPanel(fsContent, cur);
    }
  }catch(_){ }
}
if(typeof window !== 'undefined'){
if (typeof globalThis !== 'undefined') globalThis.buySpecialFormPokemon = buySpecialFormPokemon;
}

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderLocInfo,
  locationInfoModel,
  typeLabel,
  changeCastformForm,
  changeDeoxysForm,
  renderSpecialFormsPanel,
  renderCastformFormsPanel,
  renderDeoxysFormsPanel,
  buySpecialFormPokemon,
};
