function _pwMarkTutorial(id) {
  try {
    const fn = (typeof tutorialMark === 'function') ? tutorialMark
      : (typeof window !== 'undefined' && typeof window.tutorialMark === 'function') ? window.tutorialMark
      : (typeof globalThis !== 'undefined' && typeof globalThis.tutorialMark === 'function') ? globalThis.tutorialMark
      : null;
    if (fn) fn(id);
  } catch (_) {}
}
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.


// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
let _dictionaryTab = 'items';
let _dictionarySearch = '';
function setDictionaryTab(tab){
 _dictionaryTab = tab || 'items';
 _dictionarySearch = '';
 const content = document.getElementById('fs-panel-content');
 if(content) renderDictionary(content);
}
function setDictionarySearch(value){
 _dictionarySearch = String(value || '').toLowerCase().trim();
 const content = document.getElementById('fs-panel-content');
 if(content) renderDictionary(content);
}
function _dictPokemonList(){
 const out=[];
 (G.team||[]).forEach((p,idx)=>{ if(p) out.push({p, loc:t('team_location_clean'), ref:String(idx)}); });
 Object.entries(G.collection||{}).forEach(([k,p])=>{ if(p) out.push({p, loc:t('box_pc_location'), ref:k}); });
 return out;
}
// Phase 26: delegue has getItemSourceList (couvre routes, boutiques — base +
// CT/CS —, mine, atoll, quetes, labo fossile). Conserve for compatibilite.
function findItemSources(key){
 const list = (typeof getItemSourceList === 'function') ? getItemSourceList(key) : [];
 return list.length ? list : [t('dict_unknown_source')||'Source not listed'];
}
// Phase 24: enriches the description (colored weather + status badges).
function _enrichDesc(d){
 if(typeof replaceWeatherTerms === 'function') d = replaceWeatherTerms(d);
 if(typeof replaceStatusTerms === 'function') d = replaceStatusTerms(d);
 return d;
}
function openAbilityInfo(key){
 const info = (typeof getTalentRecord === 'function') ? getTalentRecord(key) : TALENTS_FULL[key];
 if(!info) return;
 const inner = document.getElementById('poke-modal-inner');
 if(!inner) return;
 const species = [];
 if(typeof getSpeciesTalents === 'function'){
   for(let id=1; id<=(PD?PD.length:0); id++){
     if(PD[id] && getSpeciesTalents(id).includes(key)) species.push(id);
   }
 }
 // Phase 26: carriers in HIDDEN ABILITY too (workshop = the player's only
 // way; the list answers "which Pokemon can have it").
 const hiddenCarriers = [];
 if(typeof POKEMON_TALENTS !== 'undefined' && POKEMON_TALENTS){
   const needle = String(key || '').toLowerCase();
   for(const [nid, rec] of Object.entries(POKEMON_TALENTS)){
     if(rec && rec.hiddenAbility && String(rec.hiddenAbility).toLowerCase() === needle && PD && PD[Number(nid)]) hiddenCarriers.push(Number(nid));
   }
 }
 if(typeof window.pwModalInfo==='function') window.pwModalInfo(true);
 // Remember where this panel comes from (dictionary, sheet, bag…) for the back button
 window._pwInfoSource = (typeof window.pwInfoCaptureSource === 'function') ? window.pwInfoCaptureSource() : null;
 const _abilityChips = species.length
   ? species.map(id=>`<span class="dict-chip">#${id} ${getPokeName(id)}</span>`).join('')
   : `<span class="dict-muted">${t('dict_no_pokemon_listed')||'No Pokémon listed.'}</span>`;
 const _hiddenChips = hiddenCarriers.map(id=>`<span class="dict-chip dict-chip-hidden">#${id} ${getPokeName(id)}</span>`).join('');
 if (typeof window.pwBuildInfoPanel === 'function') {
   const _sections = [
     { title: t('description')||'Description', body: `<div class="pw-text-sm pw-light1">${_enrichDesc(getTalentDesc(key))}</div>` },
     { title: t('affected_pokemon_lbl')||t('dict_affected_pokemon')||'Affected Pokémon', body: `<div class="dict-chip-list">${_abilityChips}</div>` }
   ];
   if(hiddenCarriers.length) _sections.push({ title: t('hidden_carriers')||'Talent caché de…', body: `<div class="dict-chip-list">${_hiddenChips}</div>` });
   _pwSetHtmlSafe(inner, window.pwBuildInfoPanel({
     icon: (typeof getIcon==='function'?getIcon('training',16):''),
     title: getTalentName(key),
     subtitle: getRarityLabel(info.rarity),
     sections: _sections,
     rows: [{ label: t('dict_rarity')||'Rareté', value: getRarityLabel(info.rarity) }]
   }));
 } else {
   _pwSetHtmlSafe(inner, `<div class="modal-title"><div>${typeof getIcon==='function'?getIcon('training',16):''} ${getTalentName(key)}</div><span class="modal-close" data-action="pw-info-back">✕</span></div>`);
 }
 if(typeof window.pwApplyWindowChrome==='function') window.pwApplyWindowChrome(inner); // wave 30: canonical window chrome
 document.getElementById('poke-modal').classList.add('open');
}
function renderDictionary(el){
 el.classList.add('dictionary-panel-content');
 const tab = _dictionaryTab || 'items';
 const q = _dictionarySearch || '';
 const tabs = [{id:'items',label:t('dict_items')||'Objets'},{id:'moves',label:t('dict_moves')||'Attaques'},{id:'abilities',label:t('dict_abilities')||'Talents'}];
 const entries = [];
 if(tab === 'items'){
  let keys = Object.keys(ITEMS||{}).sort((a,b)=>getItemName(a).localeCompare(getItemName(b)));
  if(q) keys = keys.filter(k => (getItemName(k)+' '+k+' '+getItemDesc(k)).toLowerCase().includes(q));
  keys.forEach(k=>{
   const owned = !!(G.inventory&&G.inventory[k]>0);
   entries.push({ key:k, iconHtml:itemSpriteHtml(k,32), title:getItemName(k),
    subtitle: owned?tr('dict_owned_qty',{count:G.inventory[k]}):(t('dict_not_owned')||'Not owned'),
    owned: owned, dataset:{ action:'legacy-call', call:'openItemInfo', callArgs:`'${k}'` } });
  });
 } else if(tab === 'moves'){
  const mons = _dictPokemonList();
  let keys = Object.keys(MOVES||{}).sort((a,b)=>getMoveName(a).localeCompare(getMoveName(b)));
  if(q) keys = keys.filter(k => (getMoveName(k)+' '+k+' '+(MOVES[k]?.type||'')).toLowerCase().includes(q));
  // Deduplicate by normalized name (prefer PokeChill entries).
  const seenNames = new Set();
  keys = keys.filter(k => {
   const mv = MOVES[k];
   if (!mv || !mv.type) return false;
   const name = getMoveName(k).toLowerCase().trim().replace(/[\s-]+/g, '');
   if(seenNames.has(name)) return false;
   const enName = (mv.en || mv.name || k).toLowerCase().trim().replace(/[\s-]+/g, '');
   if (enName && enName !== name && seenNames.has(enName)) return false;
   seenNames.add(name);
   if (enName) seenNames.add(enName);
   return true;
  });
  keys.forEach(k=>{
   const mv = MOVES[k];
   const users = mons.filter(o=>(o.p.moves||[]).some(mv2=>mv2.id===k));
   entries.push({ key:k, owned: users.length>0, title:getMoveName(k),
    subtitle: users.length?tr('dict_move_users',{count:users.length}):(t('dict_move_users_none')||'No Pokémon know this move'),
    iconHtml:`<span class="type-badge ${typeClass(mv?.type||'?')}">${(typeof getTypeName==='function'?getTypeName(mv?.type):(mv?.type))||'?'}</span>`,
    dataset:{ action:'legacy-call', call:'openMoveInfo', callArgs:`'${k}'`, typeColor:(TYPE_COLORS[mv?.type||'']||'#555') } });
  });
 } else {
  const mons = _dictPokemonList();
  const unlocked = new Set();
  Object.values(G.unlockedTalents||{}).forEach(arr=>(arr||[]).forEach(tal=>unlocked.add(tal)));
  mons.forEach(o=>{ if(o.p.talent) unlocked.add(o.p.talent); });
  let keys = Object.keys(TALENTS_FULL||{}).sort((a,b)=>getTalentName(a).localeCompare(getTalentName(b)));
  if(q) keys = keys.filter(k => (getTalentName(k)+' '+k+' '+getTalentDesc(k)).toLowerCase().includes(q));
  const seenTalents = new Set();
  keys = keys.filter(k => {
   const name = getTalentName(k).toLowerCase().trim();
   if(seenTalents.has(name)) return false;
   seenTalents.add(name);
   return true;
  });
  keys.forEach(k=>{
   const info=(typeof getTalentRecord==='function'?getTalentRecord(k):TALENTS_FULL[k])||{rarity:1};
   entries.push({ key:k, owned: unlocked.has(k), title:getTalentName(k),
    subtitle:(unlocked.has(k)?(t('dict_ability_unlocked')||'Unlocked'):(t('dict_ability_locked')||'Locked')) + ' · ' + getRarityLabel(info.rarity),
    iconHtml:(typeof getIcon==='function'?getIcon('training',16):''),
    dataset:{ action:'legacy-call', call:'openAbilityInfo', callArgs:`'${k}'` } });
  });
 }
 const model = {
  tabs: tabs.map(tb=>({ id:tb.id, label:tb.label, active: tab===tb.id })),
  search: { value:q, placeholder:t('dict_search_placeholder') || 'Search...' },
  entries: entries,
  emptyLabel: t('dict_no_results')||'No results.'
 };
 // Rebuilt display: the dictionary is rendered by the ECS design-system
 // screen; the tab/search toolbar lives in the panel's FIXED filters slot
 // (outside the scroller — no gap between header and toolbar).
 const dictFilterBar = document.getElementById('fs-panel-filters');
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.DictionaryView) throw new Error('[ui] PokeUI views not loaded (DictionaryView)');
 const parts = views.DictionaryView.toHTML(model);
 if(dictFilterBar){ dictFilterBar.style.display = 'block'; _pwSetHtmlSafe(dictFilterBar, parts.filters); }
 _pwSetHtmlSafe(el, dictFilterBar ? parts.content : (parts.filters + parts.content));
 const input = (dictFilterBar && typeof dictFilterBar.querySelector==='function' ? dictFilterBar.querySelector('.dict-search') : null) || (el && typeof el.querySelector==='function' ? el.querySelector('.dict-search') : null);
 if(input){ try{ input.focus({preventScroll:true}); }catch(_){ input.focus(); } input.setSelectionRange(input.value.length,input.value.length); }
 if(typeof applyDynamicStyles === 'function') applyDynamicStyles(el);
}


let _atollTab = 'menu';
// ATOLL_MODES / ATOLL_RANK_SEQUENCE / rotation 12 h / bans / serie Usine :
// Phase 22 — legacy feature update
export const ATOLL_SHOP = [ ['rarecandy',25], ['leftovers',120], ['assault_vest',180], ['eviolite',200], ['choice_band',260], ['choice_specs',260], ['life_orb',360] ];
// FIX (2026-08): game-helpers.js references ATOLL_SHOP as a free identifier.
if (typeof globalThis !== 'undefined') globalThis.ATOLL_SHOP = ATOLL_SHOP;
if (typeof globalThis !== 'undefined') globalThis.ATOLL_SHOP = ATOLL_SHOP;
function isAtollUnlocked(){ return (typeof isRegionLeagueWon === 'function') ? isRegionLeagueWon('kanto') : !!G.championTitle; }
function setAtollTab(tab){ _atollTab = tab || 'menu'; renderBattleAtoll(document.getElementById('fs-panel-content')); }
function atollTeamForRestriction(mode){ const team = (G.team||[]).filter(Boolean); return mode.playerCap ? team.slice(0, mode.playerCap) : team; }
function validateAtollRankRestriction(mode){
 if(!mode) return true;
 // Rotating legendary bans (12-hour rotation): the player cannot field
 // any banned legendary — the opposing team never contains any either.
 const banned = (!mode.borrowed && typeof getAtollBannedLegendaries === 'function') ? getAtollBannedLegendaries(mode.key) : [];
 if(banned.length){
  const viol = (G.team||[]).filter(p => p && banned.includes(p.id));
  if(viol.length){ notify(tr('atoll_banned_blocked', {pokemon:viol.slice(0,3).map(p=>p.name||getPokeName(p.id)).join(', ')}), 'var(--red)'); return false; }
 }
 if(!mode.maxRank || mode.borrowed) return true;
 const invalid = atollTeamForRestriction(mode).filter(p => p && typeof rankAllowsPokemon === 'function' && !rankAllowsPokemon(mode.maxRank, p.id));
 if(invalid.length){ notify(tr('atoll_rank_blocked', {rank:mode.maxRank, pokemon:invalid.slice(0,3).map(p=>p.name||getPokeName(p.id)).join(', ')}), 'var(--red)'); return false; }
 return true;
}
// Retrocompat : created the team ADVERSE of the mode has the rotation courante (sets
// curated + graine datee, cf. atoll-core.js).
function createAtollTeam(modeKey='tower_c'){ return (typeof buildAtollTeam === 'function') ? buildAtollTeam(modeKey) : []; }
function restoreAtollTeam(){ if(G && G._atollTeamBackup){ G.team = G._atollTeamBackup; delete G._atollTeamBackup; } if(G && G._atollTeamSlotItemsBackup){ G.teamSlotItems = G._atollTeamSlotItemsBackup; delete G._atollTeamSlotItemsBackup; } try{ if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems(); renderTeamWindow(); }catch(_){} }
function startAtollBattle(modeKey='tower_c'){
 ensureAtollState(); if(!isAtollUnlocked()){ notify(t('atoll_locked'), 'var(--red)'); return; } if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return; } if(battle && battle.active){ notify(t('battle_in_progress'), 'var(--red)'); return; } if(!G.team || !G.team.length){ notify(t('no_pokemon_in_team'), 'var(--red)'); return; }
 const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c; if(!validateAtollRankRestriction(mode)) return;
 const w = (typeof getRotationWindow === 'function') ? getRotationWindow() : 0;
 let enemyWindow = w;
 if(mode.borrowed){
   // Fullscreen panel navigation and Atoll factory mode
  let run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
  if(run && run.modeKey !== modeKey){ notify(tr('atoll_factory_wrong_mode', {mode:t((ATOLL_MODES[run.modeKey]||{}).label || '')}), 'var(--red)'); return; }
  if(!run) run = createAtollFactoryRun(modeKey, w);
  if(!run || !Array.isArray(run.team) || !run.team.length){ notify(t('atoll_factory_broken'), 'var(--red)'); return; }
  G._atollTeamBackup = JSON.parse(JSON.stringify(G.team));
  G._atollTeamSlotItemsBackup = JSON.parse(JSON.stringify(G.teamSlotItems||[]));
  G.team = JSON.parse(JSON.stringify(run.team));
  const rentalTag = t('atoll_rental') + ' ';
  G.team.forEach(p => { if(p && !String(p.name||'').startsWith(rentalTag)) p.name = rentalTag + (p.name || getPokeName(p.id)); });
  G.teamSlotItems=[];
  // The opponent climbs the rotation table: step n → team (w+n) of the cycle.
  enemyWindow = getAtollFactoryOpponentWindow(run, w);
 }
 else if(mode.playerCap && G.team.length > mode.playerCap){ G._atollTeamBackup = JSON.parse(JSON.stringify(G.team)); G._atollTeamSlotItemsBackup = JSON.parse(JSON.stringify(G.teamSlotItems||[])); G.team = G.team.slice(0, mode.playerCap); if(Array.isArray(G.teamSlotItems)) G.teamSlotItems = G.teamSlotItems.slice(0, mode.playerCap); }
 if(mode.noItems){ G._atollTeamSlotItemsBackup = G._atollTeamSlotItemsBackup || JSON.parse(JSON.stringify(G.teamSlotItems||[])); G.teamSlotItems=[]; try{ syncTeamSlotHeldItems(); }catch(_){} }
 // team adverse : sets curated via graine datee (window courante, or
 // window of landing for the serie Usine).
 const team = buildAtollTeam(mode.key, enemyWindow);
 closeFullscreenPanel(); const ok=startBattle(null,true,'atoll',team);
 if(ok === false){ restoreAtollTeam(); openFullscreenPanel('atoll'); return; }
 if(ok!==false && battle && battle.active){ battle.isAtollBattle=true; battle.atollMode=mode.key; battle.atollReward=mode.reward || 10; battle.atollBorrowed=!!mode.borrowed; battle.atollPlayerCap=mode.playerCap||0; battle.trainerVisual = {name:t('battle_atoll_title'), role:'atoll', style:[mode.group, mode.key], sprite:'atoll'}; try{ renderBattleTeamRow(); }catch(_){} addBattleTimeline(`${t('battle_atoll_title')} · ${t(mode.label)}`, 'trainer'); }
}
function completeAtollBattle(tokens, modeKey){
 const st=ensureAtollState(); const mode = ATOLL_MODES[modeKey] || {};
 let gain=Math.max(0, Number(tokens||0));
 let reorgNotice = '';
 if(mode.borrowed){
  // Factory victory: reward ×(1+25%/streak) then a forced reorganization
  // (full heal + shuffle of the Pokemon order and of the moves).
  const runBefore = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
  gain = (typeof computeAtollFactoryReward === 'function') ? computeAtollFactoryReward(mode.reward || tokens, runBefore ? (runBefore.streak||0) : 0) : gain;
  if(typeof applyAtollFactoryVictory === 'function'){ applyAtollFactoryVictory(G.team); reorgNotice = ' ' + t('atoll_factory_reorg_notice'); }
 }
 st.tokens += gain; st.streak = (st.streak||0)+1; st.bestStreak=Math.max(st.bestStreak||0, st.streak); st.winsByMode[modeKey||'tower_c']=(st.winsByMode[modeKey||'tower_c']||0)+1; restoreAtollTeam(); notify(tr('atoll_win_reward', {tokens:gain, streak:st.streak}) + reorgNotice, 'var(--green)');
}
function buyAtollItem(key, price){ const st=ensureAtollState(); price=Number(price||0); if(st.tokens < price){ notify(t('atoll_not_enough_tokens'), 'var(--red)'); return; } st.tokens -= price; addToInventory(key, 1); saveGame(); renderBattleAtoll(document.getElementById('fs-panel-content')); notify(tr('atoll_item_bought', {item:getItemName(key)}), 'var(--green)'); }
function abandonAtollFactoryRunUI(){ if(typeof abandonAtollFactoryRun === 'function') abandonAtollFactoryRun(); try{ saveGame(); }catch(_){} renderBattleAtoll(document.getElementById('fs-panel-content')); notify(t('atoll_factory_run_ended'), 'var(--red)'); }
/**
 * Battle Atoll — classic adapter (model builders ONLY, rebuilt from zero)
 *
 * The whole visual tree is owned by the ECS design system
 * (ui/views/AtollPanelView.js + ui/components/atoll.js). This adapter
 * collects state, localizes labels and keeps the legacy contracts:
 * rotation ticker span, legacy-call routing names/args.
 */
function atollSpriteChipModel(id, size){ return { title: (typeof getPokeName === 'function' ? getPokeName(id) : ('#' + id)), spriteHtml: spriteImg(id, '', { size: size || 28 }) }; }
function atollBanRowModel(modeKey){
 const banned = (typeof getAtollBannedLegendaries === 'function') ? getAtollBannedLegendaries(modeKey) : [];
 if(!banned.length) return null;
 return { label: t('atoll_banned_row'), chips: banned.map((id) => atollSpriteChipModel(id, 26)) };
}
function atollModeCardModel(key){
 const m = ATOLL_MODES[key];
 const kind = m.borrowed ? 'rental' : 'enemy';
 const ids = (typeof getAtollSpeciesList === 'function') ? getAtollSpeciesList(m.key, undefined, kind) : [];
 return {
  rankClass: 'rank-' + (m.maxRank || 'free').toLowerCase(),
  badgeLabel: m.maxRank ? tr('atoll_max_rank', { rank: m.maxRank }) : t('atoll_rank_free'),
  badgeCls: m.maxRank ? ('rank-' + m.maxRank.toLowerCase()) : 'free',
  title: t(m.label),
  ruleText: tr(m.borrowed ? 'atoll_mode_rule_factory' : 'atoll_mode_rule', { level: m.level, size: m.size, reward: m.reward }),
  previewLabel: t(m.borrowed ? 'atoll_rental_preview' : 'atoll_enemy_preview'),
  previewChips: ids.map((id) => atollSpriteChipModel(id)),
  banRow: atollBanRowModel(m.key),
  freeNote: (m.key === 'tower_free') ? t('atoll_ban_free_note') : '',
  cta: {
   label: t(m.borrowed ? 'atoll_factory_continue' : 'atoll_start'),
   call: m.borrowed ? 'prepareAtollFactoryBattle' : 'startAtollBattle',
   args: "'" + m.key + "'",
  },
 };
}
function atollRunCardModel(){
 const run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
 if(!run) return null;
 const mode = ATOLL_MODES[run.modeKey] || {};
 return {
  title: t('atoll_factory_run_title'),
  streakText: tr('atoll_factory_run_streak', { streak: run.streak || 0, mode: t(mode.label || '') }),
  chips: (run.team || []).filter(Boolean).map((p) => atollSpriteChipModel(p.id, 30)),
  prepLabel: t('atoll_factory_prep_open'),
  abandonLabel: t('atoll_factory_abandon'),
  hint: t('atoll_factory_reorg_hint'),
 };
}
function atollShopCardsModel(st){
 return ATOLL_SHOP.map(([key, price]) => {
  const affordable = (st.tokens || 0) >= price;
  return {
   iconHtml: itemSpriteHtml(key, 32),
   name: getItemName(key),
   priceText: price + ' ' + t('atoll_tokens'),
   affordable: affordable, // user rule: unaffordable ⇒ informational chip, no dead button
   buyLabel: t('buy_btn'),
   args: "'" + key + "'," + price,
   missingText: t('atoll_not_enough_tokens'),
  };
 });
}
function atollHomeModel(st){
 const en = (typeof G !== 'undefined' && G && G.lang === 'en');
 const groups = [
  ['tower', '🗼', ['tower_e','tower_d','tower_c','tower_b','tower_a','tower_s','tower_free']],
  ['factory', '🏭', ['factory_c','factory_a']],
  ['arena', '🛡️', ['arena_three','arena_no_item','arena_type']],
  ['dome', '🏟️', ['dome_quarter','dome_final']],
 ];
 return groups.map(([id, icon, keys]) => {
  const wins = keys.reduce((sum, k) => sum + ((st.winsByMode && st.winsByMode[k]) || 0), 0);
  return { label: t('atoll_' + id), icon, args: "'" + id + "'", sub: wins > 0 ? (en ? wins + ' win(s)' : wins + ' victoire(s)') : null };
 });
}
function atollPanelModel(){
 const st = ensureAtollState();
 if(!isAtollUnlocked()){
  return { locked: true, lockedTitle: t('battle_atoll_title'), lockedDesc: t('atoll_locked_desc') };
 }
 const c = (typeof getAtollCycleInfo === 'function') ? getAtollCycleInfo() : { team: 1, teamCount: 6, day: 1, dayCount: 3 };
 const time = (typeof formatRotationCountdown === 'function') ? formatRotationCountdown(getRotationTimeLeftMs()) : '';
 const model = {
  locked: false,
  hero: {
   title: t('battle_atoll_title'),
   desc: t('battle_atoll_desc'),
   tokens: st.tokens || 0,
   tokensLabel: t('atoll_tokens'),
   streakLabel: tr('atoll_streak', { streak: st.streak || 0, best: st.bestStreak || 0 }),
  },
  nav: [['menu','atoll_home'],['tower','atoll_tower'],['factory','atoll_factory'],['arena','atoll_arena'],['dome','atoll_dome'],['shop','atoll_shop']]
   .map(([id, label]) => ({ id, label: t(label), active: _atollTab === id, call: 'setAtollTab', args: "'" + id + "'" })),
  tab: _atollTab || 'menu',
 };
 if(model.tab === 'menu'){
  model.home = atollHomeModel(st);
 } else if(model.tab === 'shop'){
  model.shopTitle = t('atoll_shop');
  model.shopCards = atollShopCardsModel(st);
 } else {
  model.groupDesc = { title: t('atoll_' + model.tab), desc: t('atoll_' + model.tab + '_desc') };
  model.rotation = { timerText: tr('atoll_rotation_timer', { time }), cycleText: tr('atoll_cycle_info', { n: c.team, total: c.teamCount, day: c.day, days: c.dayCount }) };
  if(model.tab === 'factory') model.runCard = atollRunCardModel();
  const modeKeys = {
   tower: ['tower_e','tower_d','tower_c','tower_b','tower_a','tower_s','tower_free'],
   factory: ['factory_c','factory_a'],
   arena: ['arena_three','arena_no_item','arena_type'],
   dome: ['dome_quarter','dome_final'],
  }[model.tab] || [];
  model.modeCards = modeKeys.map(atollModeCardModel);
 }
 return model;
}
function renderBattleAtoll(el){
 if(!el) return;
 ensureAtollState();
 if(typeof startRotationTicker === 'function') startRotationTicker();
 // Rebuilt display: the ECS design system owns the whole tree.
 const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.AtollPanelView) throw new Error('[ui] PokeUI views not loaded (AtollPanelView)');
 _pwSetHtmlSafe(el, views.AtollPanelView.toHTML(atollPanelModel()));
}

// ═══════════════════════════════════════════════════════════════════════
// Atoll Factory — preparation panel + loaned-team drag & drop (kept
// classic chain; the Atoll PANEL behind it is rebuilt by the ECS DS).
// ═══════════════════════════════════════════════════════════════════════
function atollFactoryPrepCardHtml(p, i){
 return generatePokeCardHTML(p, i, {
  isActive:false,
  isFainted:false,
  showMoves:true,
  showXP:false,
  showStatus:false,
  movesAsBars:false,
  movesDraggable:true,
  moveDragAttr:'atoll-move-drag',
  noSpriteHandlers:true,
  itemReadonly:true,
  spriteTitle:(typeof t === 'function' ? t('atoll_factory_order_poke') : ''),
  // Move sheet without an explicit context → its back button returns to
  // the preparation panel (source deduced via _atollPrepOpen).
  moveInfoContextless:true,
 });
}
function renderAtollFactoryPrep(){
 const run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
 const box = (typeof ensurePokeModal === 'function') ? ensurePokeModal() : { inner: document.getElementById('poke-modal-inner') };
 const inner = box.inner;
 if(!inner) return false;
 if(!run || !Array.isArray(run.team) || !run.team.length) return false;
 const mode = ATOLL_MODES[run.modeKey] || {};
 const cards = run.team.map((p, i) => p ? atollFactoryPrepCardHtml(p, i) : '').join('');
 // Wave 22 (ECS DS): the shell is rendered from zero by AtollFactoryPrepView
 // — this adapter only shapes the (localized) model. Contracts kept:
 // #atoll-prep-body.team-view (drag&drop target, installed just after),
 // data-call atollFactoryPrepFight / atollFactoryPrepAbandon /
 // closeAtollFactoryPrep, hints .atoll-prep-hint/.atoll-prep-note.
 const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || typeof views.AtollFactoryPrepView !== 'function') throw new Error('[ui] PokeUI views not loaded (AtollFactoryPrepView)');
 _pwSetHtmlSafe(inner, views.AtollFactoryPrepView.toHTML({
  title: t('atoll_factory_run_title'),
  streakText: tr('atoll_factory_run_streak', {streak:run.streak||0, mode:t(mode.label||'')}),
  hintText: t('atoll_factory_prep_hint'),
  cardsHtml: cards,
  continueLabel: t('atoll_factory_continue'),
  abandonLabel: t('atoll_factory_abandon'),
  noteText: t('atoll_factory_reorg_hint'),
 }));
 installAtollPrepDragDrop();
 return true;
}
function openAtollFactoryPrep(){
  const box = (typeof ensurePokeModal === 'function') ? ensurePokeModal() : { modal: document.getElementById('poke-modal'), inner: document.getElementById('poke-modal-inner') };
 const modal = box.modal;
 if(!modal){
  if(typeof notify==='function') notify((typeof t==='function'&&t('preset_modal_missing'))||"Interface non prête. Réessayez.", 'var(--red)');
  return;
 }
 const ok = renderAtollFactoryPrep();
 if(!ok){  // Fullscreen panel navigation and Atoll factory mode
  window._atollPrepOpen = false;
  modal.classList.remove('open');
  modal.classList.remove('atoll-prep-modal');
  return;
 }
 window._atollPrepOpen = true;
 window._atollPrepModeKey = ((typeof getAtollFactoryRun === 'function' && getAtollFactoryRun()) || {}).modeKey || window._atollPrepModeKey || 'factory_c';
 window._pwPokeSheet = null; // this is NOT a team/box sheet
 if(typeof window.pwModalInfo === 'function') window.pwModalInfo(false);
 modal.classList.add('atoll-prep-modal');
 modal.classList.add('open');
 innerScrollReset();
}
function innerScrollReset(){ try{ const inner = document.getElementById('poke-modal-inner'); if(inner) inner.scrollTop = 0; }catch(_){} }
function closeAtollFactoryPrep(){
 window._atollPrepOpen = false;
 const modal = document.getElementById('poke-modal');
 if(modal){ modal.classList.remove('open'); modal.classList.remove('atoll-prep-modal'); }
 // the atoll status card behind reflects the new order.
 renderBattleAtoll(document.getElementById('fs-panel-content'));
}
function atollFactoryPrepFight(){
 const run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
 const modeKey = (run && run.modeKey) || window._atollPrepModeKey || 'factory_c';
 closeAtollFactoryPrep();
 startAtollBattle(modeKey);
}
function atollFactoryPrepAbandon(){
 closeAtollFactoryPrep();
 abandonAtollFactoryRunUI();
}
// Drag & drop in the preparation panel: cards = Pokemon order; moves
// (data-atoll-move-drag) = order within a Pokemon.
let _atollPrepDrag = null; // {kind:'poke', idx} | {kind:'move', i, mi}
// Phase 27: drop preview — ghost data of the borrowed team.
function _atollPrepGhostPoke(idx){
 const r=(typeof getAtollFactoryRun==='function')?getAtollFactoryRun():null; const _dp=r&&r.team?r.team[idx]:null;
 if(!_dp) return {icon:'', title:'?'};
 return { icon:(typeof spriteImg==='function'?spriteImg(_dp.id,_dp.emoji,{size:26,shiny:!!_dp.shinyActive}):''), title:(typeof getPokeName==='function'?getPokeName(_dp.id):(_dp.name||'')), sub:'Nv.'+(_dp.level||1) };
}
function _atollPrepGhostMove(i, mi){
 const r=(typeof getAtollFactoryRun==='function')?getAtollFactoryRun():null; const _dm=r&&r.team&&r.team[i]&&r.team[i].moves?r.team[i].moves[mi]:null;
 const _dmv=_dm&&typeof MOVES!=='undefined'?MOVES[_dm.id]:null;
 if(!_dm) return {icon:'', title:'?'};
 return { icon:_dmv?'<span class="type-badge type-'+String(_dmv.type||'').toLowerCase()+'">'+(typeof getTypeName==='function'?getTypeName(_dmv.type):(_dmv.type||''))+'</span>':'', title:(typeof getMoveName==='function'?getMoveName(_dm.id):_dm.id) };
}
function installAtollPrepDragDrop(){
 const body = document.getElementById('atoll-prep-body');
 if(!body || typeof body.querySelectorAll !== 'function') return;
 const cards = Array.prototype.slice.call(body.querySelectorAll('.poke-card'));
 cards.forEach((card, idx) => {
  card.setAttribute('draggable', 'true');
  card.addEventListener('dragstart', (ev) => {
   if(_atollPrepDrag && _atollPrepDrag.kind === 'move'){ ev.preventDefault(); return; }
   _atollPrepDrag = { kind:'poke', idx };
   ev.dataTransfer.effectAllowed = 'move';
   try{ ev.dataTransfer.setData('text/plain', String(idx)); }catch(_){}
   card.style.opacity = '0.6';
   // Phase 26: vignette of drag unifiee (team pretee of the Usine).
   const _drp = (typeof getAtollFactoryRun === 'function' && getAtollFactoryRun() && getAtollFactoryRun().team) ? getAtollFactoryRun().team[idx] : null;
   if(_drp && typeof pwApplyDragGhost === 'function'){
    pwApplyDragGhost(ev, {
     icon: (typeof spriteImg === 'function') ? spriteImg(_drp.id, _drp.emoji, { size: 26, shiny: !!_drp.shinyActive }) : '',
     title: (typeof getPokeName === 'function' ? getPokeName(_drp.id) : (_drp.name || '')),
     sub: 'Nv.' + (_drp.level || 1),
    });
   }
  });
  card.addEventListener('dragover', (ev) => {
   if(!_atollPrepDrag || _atollPrepDrag.kind !== 'poke') return;
   ev.preventDefault();
   ev.dataTransfer.dropEffect = 'move';
   card.classList.add('atoll-prep-drag-over');
   try { if(typeof pwDropPreviewShow==='function' && typeof pwSwapPreviewHtml==='function') pwDropPreviewShow(pwSwapPreviewHtml(_atollPrepGhostPoke(_atollPrepDrag.idx), _atollPrepGhostPoke(idx)), ev.clientX||0, ev.clientY||0); } catch(_){}
  });
  card.addEventListener('dragleave', () => { card.classList.remove('atoll-prep-drag-over'); if(typeof pwDropPreviewHide==='function') pwDropPreviewHide(); });
  card.addEventListener('drop', (ev) => {
   if(!_atollPrepDrag || _atollPrepDrag.kind !== 'poke') return;
   ev.preventDefault();
   if(typeof pwDropPreviewHide==='function') pwDropPreviewHide();
   card.classList.remove('atoll-prep-drag-over');
   card.style.opacity = '';
   const from = _atollPrepDrag.idx; _atollPrepDrag = null;
   atollFactorySwapPoke(from, idx);
  });
  card.addEventListener('dragend', () => {
   card.style.opacity = '';
   cards.forEach(c => c.classList.remove('atoll-prep-drag-over'));
   if(_atollPrepDrag && _atollPrepDrag.kind === 'poke') _atollPrepDrag = null;
   if(typeof pwDropPreviewHide==='function') pwDropPreviewHide();
  });
 });
 Array.prototype.slice.call(body.querySelectorAll('[data-atoll-move-drag]')).forEach((el) => {
  el.addEventListener('dragstart', (ev) => {
   ev.stopPropagation(); // a move se drag, not its card
   const parts = String(el.dataset.atollMoveDrag).split('|');
   _atollPrepDrag = { kind:'move', i:Number(parts[0]), mi:Number(parts[1]) };
   ev.dataTransfer.effectAllowed = 'move';
   try{ ev.dataTransfer.setData('text/plain', el.dataset.atollMoveDrag); }catch(_){}
   el.classList.add('pw-move-drag-src');
   // Phase 26: vignette of drag unifiee for the move pretee deplacee.
   try{
    const _drr = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
    const _dm = _drr && _drr.team && _drr.team[_atollPrepDrag.i] && _drr.team[_atollPrepDrag.i].moves ? _drr.team[_atollPrepDrag.i].moves[_atollPrepDrag.mi] : null;
    const _dmv = _dm && typeof MOVES!=='undefined' ? MOVES[_dm.id] : null;
    if(_dm && typeof pwApplyDragGhost === 'function'){
     pwApplyDragGhost(ev, {
      icon: _dmv ? '<span class="type-badge type-' + String(_dmv.type || '').toLowerCase() + '">' + (typeof getTypeName === 'function' ? getTypeName(_dmv.type) : (_dmv.type || '')) + '</span>' : '',
      title: (typeof getMoveName === 'function' ? getMoveName(_dm.id) : _dm.id),
     });
    }
   }catch(_){}
  });
  el.addEventListener('dragover', (ev) => {
   if(!_atollPrepDrag || _atollPrepDrag.kind !== 'move') return;
   const parts = String(el.dataset.atollMoveDrag).split('|');
   if(Number(parts[0]) !== _atollPrepDrag.i) return; // same Pokemon only
   ev.preventDefault();
   ev.stopPropagation();
   ev.dataTransfer.dropEffect = 'move';
   el.classList.add('atoll-prep-move-over');
   try { if(typeof pwDropPreviewShow==='function' && typeof pwSwapPreviewHtml==='function') pwDropPreviewShow(pwSwapPreviewHtml(_atollPrepGhostMove(_atollPrepDrag.i,_atollPrepDrag.mi), _atollPrepGhostMove(Number(parts[0]),Number(parts[1]))), ev.clientX||0, ev.clientY||0); } catch(_){}
  });
  el.addEventListener('dragleave', () => { el.classList.remove('atoll-prep-move-over'); if(typeof pwDropPreviewHide==='function') pwDropPreviewHide(); });
  el.addEventListener('drop', (ev) => {
   if(!_atollPrepDrag || _atollPrepDrag.kind !== 'move') return;
   ev.preventDefault();
   ev.stopPropagation();
   if(typeof pwDropPreviewHide==='function') pwDropPreviewHide();
   el.classList.remove('atoll-prep-move-over');
   const parts = String(el.dataset.atollMoveDrag).split('|');
   const src = _atollPrepDrag; _atollPrepDrag = null;
   if(Number(parts[0]) !== src.i) return;
   atollFactorySwapMoves(src.i, src.mi, Number(parts[1]));
  });
  el.addEventListener('dragend', () => {
   el.classList.remove('pw-move-drag-src');
   if(_atollPrepDrag && _atollPrepDrag.kind === 'move') _atollPrepDrag = null;
   if(typeof pwDropPreviewHide==='function') pwDropPreviewHide();
  });
 });
}
// swap two positions of the borrowed team (persisted + panel re-rendered).
function atollFactorySwapPoke(from, to){
 const run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
 if(!run || !Array.isArray(run.team)) return;
 from = Number(from); to = Number(to);
 if(!(from >= 0) || !(to >= 0) || from >= run.team.length || to >= run.team.length || from === to) return;
 const tmp = run.team[from]; run.team[from] = run.team[to]; run.team[to] = tmp;
 try{ saveGame(); }catch(_){}
 renderAtollFactoryPrep();
}
// swap deux moves to the sein of the same Pokemon prete.
function atollFactorySwapMoves(i, from, to){
 const run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
 const p = run && run.team && run.team[Number(i)];
 if(!p || !Array.isArray(p.moves)) return;
 from = Number(from); to = Number(to);
 if(!(from >= 0) || !(to >= 0) || from >= p.moves.length || to >= p.moves.length || from === to) return;
 const tmp = p.moves[from]; p.moves[from] = p.moves[to]; p.moves[to] = tmp;
 try{ saveGame(); }catch(_){}
 renderAtollFactoryPrep();
}
// Click on a Factory card with no run in progress: create the run, then open
// the prep panel (instead of starting the battle immediately).
function prepareAtollFactoryBattle(modeKey='factory_c'){
 ensureAtollState(); if(!isAtollUnlocked()){ notify(t('atoll_locked'), 'var(--red)'); return; }
 const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.factory_c;
 if(!mode.borrowed){ startAtollBattle(modeKey); return; }
 let run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
 if(run && run.modeKey !== modeKey){ notify(tr('atoll_factory_wrong_mode', {mode:t((ATOLL_MODES[run.modeKey]||{}).label || '')}), 'var(--red)'); return; }
 if(!run){
  const w = (typeof getRotationWindow === 'function') ? getRotationWindow() : 0;
  run = createAtollFactoryRun(modeKey, w);
  try{ saveGame(); }catch(_){}
 }
 window._atollPrepModeKey = run.modeKey;
 _atollTab = 'factory';
 renderBattleAtoll(document.getElementById('fs-panel-content'));
 // Phase 25: opens the preparation panel (Active team clone).
 openAtollFactoryPrep();
}

function openFullscreenPanel(panelType){
  try {
    if (panelType === 'inventory') { _pwMarkTutorial('open_bag'); }
    if (panelType === 'pokedex') { _pwMarkTutorial('open_pokedex'); }
  } catch(_){}
 
 closeUnifiedSelectorModal();
 closeFullscreenPanel();
 if(typeof closeBattleSummary === 'function') closeBattleSummary();
 const pm = document.getElementById('poke-modal');
 if(pm){ pm.classList.remove('open'); pm.classList.remove('atoll-prep-modal'); pm.classList.remove('preset-editor-modal'); }
 window._atollPrepOpen = false; // phase 25 : the preparation Usine not survit not a a changement of panel
 window._presetEditorOpen = null; window._presetEditorReturn = null; // phase 27 : idem editeur of preset
 const qm = document.getElementById('quest-modal');
 if(qm) qm.classList.remove('open');
 const sm = document.getElementById('settings-modal');
 if(sm) sm.classList.remove('open');

 // Remembers the current fullscreen panel (for the info panels' return)
 window._fsCurrentPanel = panelType;
 if (!window._isEquipOpen) {
   window._equipCallback = null;
   window._equipPickerMeta = null;
 }
 window._isEquipOpen = false;
 window._pwPokeSheet = null;
 if (typeof window.pwInfoClearSource === 'function') window.pwInfoClearSource();

 const titles = {
 inventory: t('panel_inventory_title'),
 shop: t('panel_shop_title'),
 market: t('panel_market_title'),
 pokedex: t('panel_pokedex_title'),
 dictionary: t('dictionary_title'),
 guide: t('guide_title'),
 atoll: t('battle_atoll_title'),
 presets: t('panel_presets_title'),
 puzzles: (typeof t==='function' && t('panel_puzzles_title') !== 'panel_puzzles_title') ? t('panel_puzzles_title') : '🧩 Explorations à énigmes',
 castform_forms: '🌤️ Labo Météo — Formes de Morphéo',
 deoxys_forms: '☄️ Météorites — Formes de Deoxys'
 };

 
 let modal = document.getElementById('fullscreen-panel-modal');
 if(!modal){
 modal = document.createElement('div');
 modal.id = 'fullscreen-panel-modal';
 modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:600;display:none;align-items:center;justify-content:center;padding:16px;';
 _pwSetHtmlSafe(modal, `
 <div class="pw-modal-container">
   <div id="fs-panel-header" class="pw-modal-header">
     <div id="fs-panel-title" class="pw-modal-title"></div>
     <span class="pw-modal-close" data-action="legacy-call" data-call="closeFullscreenPanel" data-call-args="">✕</span>
   </div>
   <div id="fs-panel-filters" class="pw-modal-search-bar"></div>
   <div id="fs-panel-content" class="pw-modal-body"></div>
 </div>`);
 document.body.appendChild(modal);
 modal.addEventListener('click', function(e){ if(e.target===modal) closeFullscreenPanel(); });
 }

 
 document.getElementById('fs-panel-filters').style.display = 'none';
 document.getElementById('fs-panel-filters').replaceChildren();
 document.getElementById('fs-panel-title').textContent = titles[panelType] || panelType;
 const content = document.getElementById('fs-panel-content');
 content.classList.remove('dictionary-panel-content');

 if(panelType === 'presets' && typeof renderPresetManager === 'function') renderPresetManager(content);
 else if(panelType === 'inventory') renderInventory(content);
 else if(panelType === 'shop') renderShop(content);
 else if(panelType === 'market') renderMarket(content);
 else if(panelType === 'pokedex') renderPokedex(content);
 else if(panelType === 'dictionary') renderDictionary(content);
 else if(panelType === 'guide' && typeof renderGuidePanel === 'function'){ if(typeof window !== 'undefined' && typeof window.setGuideSection === 'function') window.setGuideSection(null); else renderGuidePanel(content); }
 else if(panelType === 'atoll') renderBattleAtoll(content);
 else if(panelType === 'castform_forms' && typeof renderCastformFormsPanel === 'function') renderCastformFormsPanel(content);
 else if(panelType === 'deoxys_forms' && typeof renderDeoxysFormsPanel === 'function') renderDeoxysFormsPanel(content);
 else if(panelType === 'puzzles'){
   if(typeof renderPuzzleListPanel === 'function') renderPuzzleListPanel(window._puzzleLocPending || (typeof G!=='undefined' && G ? G.location : null));
   else _pwSetHtmlSafe(content, '<div class="pw-empty-state-md">Module énigmes indisponible.</div>');
 }

 modal.style.display = 'flex';
}

function closeFullscreenPanel(){
 window._fsCurrentPanel = null;
 window._equipCallback = null;
 window._equipPickerMeta = null;
 window._isEquipOpen = false;
 const modal = document.getElementById('fullscreen-panel-modal');
 if(modal) modal.style.display = 'none';
}


// --- Migrated to ES module, globals exposed ---
if (typeof setDictionarySearch !== 'undefined') { if (typeof window !== 'undefined') window.setDictionarySearch = setDictionarySearch; if (typeof globalThis !== 'undefined') globalThis.setDictionarySearch = setDictionarySearch; }
if (typeof findItemSources !== 'undefined') { if (typeof window !== 'undefined') window.findItemSources = findItemSources; if (typeof globalThis !== 'undefined') globalThis.findItemSources = findItemSources; }
if (typeof setDictionaryTab !== 'undefined') { if (typeof window !== 'undefined') window.setDictionaryTab = setDictionaryTab; if (typeof globalThis !== 'undefined') globalThis.setDictionaryTab = setDictionaryTab; }
if (typeof renderDictionary !== 'undefined') { if (typeof window !== 'undefined') window.renderDictionary = renderDictionary; if (typeof globalThis !== 'undefined') globalThis.renderDictionary = renderDictionary; }
if (typeof openAbilityInfo !== 'undefined') { if (typeof window !== 'undefined') window.openAbilityInfo = openAbilityInfo; if (typeof globalThis !== 'undefined') globalThis.openAbilityInfo = openAbilityInfo; }
if (typeof openFullscreenPanel !== 'undefined') { if (typeof window !== 'undefined') window.openFullscreenPanel = openFullscreenPanel; if (typeof globalThis !== 'undefined') globalThis.openFullscreenPanel = openFullscreenPanel; }
if (typeof closeFullscreenPanel !== 'undefined') { if (typeof window !== 'undefined') window.closeFullscreenPanel = closeFullscreenPanel; if (typeof globalThis !== 'undefined') globalThis.closeFullscreenPanel = closeFullscreenPanel; }
if (typeof renderBattleAtoll !== 'undefined') { if (typeof window !== 'undefined') window.renderBattleAtoll = renderBattleAtoll; if (typeof globalThis !== 'undefined') globalThis.renderBattleAtoll = renderBattleAtoll; }
if (typeof atollPanelModel !== 'undefined') { if (typeof window !== 'undefined') window.atollPanelModel = atollPanelModel; if (typeof globalThis !== 'undefined') globalThis.atollPanelModel = atollPanelModel; }
if (typeof setAtollTab !== 'undefined') { if (typeof window !== 'undefined') window.setAtollTab = setAtollTab; if (typeof globalThis !== 'undefined') globalThis.setAtollTab = setAtollTab; }
if (typeof restoreAtollTeam !== 'undefined') { if (typeof window !== 'undefined') window.restoreAtollTeam = restoreAtollTeam; if (typeof globalThis !== 'undefined') globalThis.restoreAtollTeam = restoreAtollTeam; }
if (typeof startAtollBattle !== 'undefined') { if (typeof window !== 'undefined') window.startAtollBattle = startAtollBattle; if (typeof globalThis !== 'undefined') globalThis.startAtollBattle = startAtollBattle; }
if (typeof prepareAtollFactoryBattle !== 'undefined') { if (typeof window !== 'undefined') window.prepareAtollFactoryBattle = prepareAtollFactoryBattle; if (typeof globalThis !== 'undefined') globalThis.prepareAtollFactoryBattle = prepareAtollFactoryBattle; }
if (typeof openAtollFactoryPrep !== 'undefined') { if (typeof window !== 'undefined') window.openAtollFactoryPrep = openAtollFactoryPrep; if (typeof globalThis !== 'undefined') globalThis.openAtollFactoryPrep = openAtollFactoryPrep; }
if (typeof closeAtollFactoryPrep !== 'undefined') { if (typeof window !== 'undefined') window.closeAtollFactoryPrep = closeAtollFactoryPrep; if (typeof globalThis !== 'undefined') globalThis.closeAtollFactoryPrep = closeAtollFactoryPrep; }
if (typeof atollFactoryPrepFight !== 'undefined') { if (typeof window !== 'undefined') window.atollFactoryPrepFight = atollFactoryPrepFight; if (typeof globalThis !== 'undefined') globalThis.atollFactoryPrepFight = atollFactoryPrepFight; }
if (typeof atollFactoryPrepAbandon !== 'undefined') { if (typeof window !== 'undefined') window.atollFactoryPrepAbandon = atollFactoryPrepAbandon; if (typeof globalThis !== 'undefined') globalThis.atollFactoryPrepAbandon = atollFactoryPrepAbandon; }
if (typeof atollFactorySwapPoke !== 'undefined') { if (typeof window !== 'undefined') window.atollFactorySwapPoke = atollFactorySwapPoke; if (typeof globalThis !== 'undefined') globalThis.atollFactorySwapPoke = atollFactorySwapPoke; }
if (typeof atollFactorySwapMoves !== 'undefined') { if (typeof window !== 'undefined') window.atollFactorySwapMoves = atollFactorySwapMoves; if (typeof globalThis !== 'undefined') globalThis.atollFactorySwapMoves = atollFactorySwapMoves; }
if (typeof renderAtollFactoryPrep !== 'undefined') { if (typeof window !== 'undefined') window.renderAtollFactoryPrep = renderAtollFactoryPrep; if (typeof globalThis !== 'undefined') globalThis.renderAtollFactoryPrep = renderAtollFactoryPrep; }
if (typeof installAtollPrepDragDrop !== 'undefined') { if (typeof window !== 'undefined') window.installAtollPrepDragDrop = installAtollPrepDragDrop; if (typeof globalThis !== 'undefined') globalThis.installAtollPrepDragDrop = installAtollPrepDragDrop; }
if (typeof completeAtollBattle !== 'undefined') { if (typeof window !== 'undefined') window.completeAtollBattle = completeAtollBattle; if (typeof globalThis !== 'undefined') globalThis.completeAtollBattle = completeAtollBattle; }
if (typeof buyAtollItem !== 'undefined') { if (typeof window !== 'undefined') window.buyAtollItem = buyAtollItem; if (typeof globalThis !== 'undefined') globalThis.buyAtollItem = buyAtollItem; }



// --- Exported globals ---
if (typeof abandonAtollFactoryRunUI !== 'undefined') { if (typeof window !== 'undefined') window.abandonAtollFactoryRunUI = abandonAtollFactoryRunUI; if (typeof globalThis !== 'undefined') globalThis.abandonAtollFactoryRunUI = abandonAtollFactoryRunUI; }
if (typeof atollFactoryPrepCardHtml !== 'undefined') { if (typeof window !== 'undefined') window.atollFactoryPrepCardHtml = atollFactoryPrepCardHtml; if (typeof globalThis !== 'undefined') globalThis.atollFactoryPrepCardHtml = atollFactoryPrepCardHtml; }
if (typeof atollTeamForRestriction !== 'undefined') { if (typeof window !== 'undefined') window.atollTeamForRestriction = atollTeamForRestriction; if (typeof globalThis !== 'undefined') globalThis.atollTeamForRestriction = atollTeamForRestriction; }
if (typeof createAtollTeam !== 'undefined') { if (typeof window !== 'undefined') window.createAtollTeam = createAtollTeam; if (typeof globalThis !== 'undefined') globalThis.createAtollTeam = createAtollTeam; }
if (typeof innerScrollReset !== 'undefined') { if (typeof window !== 'undefined') window.innerScrollReset = innerScrollReset; if (typeof globalThis !== 'undefined') globalThis.innerScrollReset = innerScrollReset; }
if (typeof isAtollUnlocked !== 'undefined') { if (typeof window !== 'undefined') window.isAtollUnlocked = isAtollUnlocked; if (typeof globalThis !== 'undefined') globalThis.isAtollUnlocked = isAtollUnlocked; }
if (typeof validateAtollRankRestriction !== 'undefined') { if (typeof window !== 'undefined') window.validateAtollRankRestriction = validateAtollRankRestriction; if (typeof globalThis !== 'undefined') globalThis.validateAtollRankRestriction = validateAtollRankRestriction; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  setDictionarySearch,
  findItemSources,
  setDictionaryTab,
  renderDictionary,
  openAbilityInfo,
  openFullscreenPanel,
  closeFullscreenPanel,
  renderBattleAtoll,
  atollPanelModel,
  setAtollTab,
  restoreAtollTeam,
  startAtollBattle,
  prepareAtollFactoryBattle,
  openAtollFactoryPrep,
  closeAtollFactoryPrep,
  atollFactoryPrepFight,
  atollFactoryPrepAbandon,
  atollFactorySwapPoke,
  atollFactorySwapMoves,
  renderAtollFactoryPrep,
  installAtollPrepDragDrop,
  completeAtollBattle,
  buyAtollItem,
  abandonAtollFactoryRunUI,
  atollFactoryPrepCardHtml,
  atollTeamForRestriction,
  createAtollTeam,
  innerScrollReset,
  isAtollUnlocked,
  validateAtollRankRestriction,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('closeFullscreenPanel', closeFullscreenPanel); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('openFullscreenPanel', openFullscreenPanel); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('setDictionarySearch', setDictionarySearch); } catch (_) {} }
