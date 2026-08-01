

// Repli si util.js (pwSetHtml) n'est pas chargé — tests unitaires ciblés.
var _pwSetHtmlSafe = _pwSetHtmlSafe || function(el, html){ if(typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
var _dictionaryTab = 'items';
var _dictionarySearch = '';
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
// Passe 26 : délègue à getItemSourceList (couvre routes, boutiques — base +
// CT/CS —, mine, atoll, quêtes, labo fossile). Conservé pour compatibilité.
function findItemSources(key){
 const list = (typeof getItemSourceList === 'function') ? getItemSourceList(key) : [];
 return list.length ? list : [t('dict_unknown_source')||'Source not listed'];
}
// Passe 24 : enrichit une description (badges couleur météo + statuts).
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
 // Passe 26 : porteurs en TALENT CACHÉ aussi (atelier = seule voie pour le
 // joueur ; la liste répond à « quel Pokémon peut l'avoir »).
 const hiddenCarriers = [];
 if(typeof POKEMON_TALENTS !== 'undefined' && POKEMON_TALENTS){
   const needle = String(key || '').toLowerCase();
   for(const [nid, rec] of Object.entries(POKEMON_TALENTS)){
     if(rec && rec.hiddenAbility && String(rec.hiddenAbility).toLowerCase() === needle && PD && PD[Number(nid)]) hiddenCarriers.push(Number(nid));
   }
 }
 if(typeof window.pwModalInfo==='function') window.pwModalInfo(true);
 // Mémorise d'où vient ce panneau (dictionnaire, fiche, sac…) pour le bouton retour
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
   inner.innerHTML = window.pwBuildInfoPanel({
     icon: (typeof getIcon==='function'?getIcon('training',16):''),
     title: getTalentName(key),
     subtitle: getRarityLabel(info.rarity),
     sections: _sections,
     rows: [{ label: t('dict_rarity')||'Rareté', value: getRarityLabel(info.rarity) }]
   });
 } else {
   inner.innerHTML = `<div class="modal-title"><div>${typeof getIcon==='function'?getIcon('training',16):''} ${getTalentName(key)}</div><span class="modal-close" data-action="pw-info-back">✕</span></div>`;
 }
 document.getElementById('poke-modal').classList.add('open');
}
function renderDictionary(el){
 el.classList.add('dictionary-panel-content');
 const tab = _dictionaryTab || 'items';
 const q = _dictionarySearch || '';
 const tabs = [{id:'items',label:t('dict_items')||'Objets'},{id:'moves',label:t('dict_moves')||'Attaques'},{id:'abilities',label:t('dict_abilities')||'Talents'}];
 let html = `<div class="dict-toolbar"><div class="dict-tabs">${tabs.map(tb=>`<button class="hbtn dict-tab ${tab===tb.id?'active':''}" data-action="legacy-call" data-call="setDictionaryTab" data-call-args="'${tb.id}'">${tb.label}</button>`).join('')}</div><input class="dict-search" data-action="filter-dictionary" value="${q.replace(/"/g,'&quot;')}" placeholder="${t('dict_search_placeholder') || 'Search...'}"></div>`;
 if(tab === 'items'){
   let keys = Object.keys(ITEMS||{}).sort((a,b)=>getItemName(a).localeCompare(getItemName(b)));
   if(q) keys = keys.filter(k => (getItemName(k)+' '+k+' '+getItemDesc(k)).toLowerCase().includes(q));
   html += `<div class="dict-grid">${keys.map(k=>{
     const owned = (G.inventory&&G.inventory[k]>0);
     // Passe 26 : les lieux/sources ne s'affichent plus dans la case — ils
     // sont listés dans le panneau d'information de l'objet (clic).
     return `<div class="dict-entry ${owned?'owned':''}" data-action="legacy-call" data-call="openItemInfo" data-call-args="'${k}'">
       <div class="dict-entry-icon">${itemSpriteHtml(k,32)}</div><div><b>${getItemName(k)}</b><span>${owned?tr('dict_owned_qty',{count:G.inventory[k]}):(t('dict_not_owned')||'Not owned')}</span></div>
     </div>`;
   }).join('') || `<div class="dict-muted">${t('dict_no_results')||'No results.'}</div>`}</div>`;
  } else if(tab === 'moves'){
    const mons = _dictPokemonList();
    let keys = Object.keys(MOVES||{}).sort((a,b)=>getMoveName(a).localeCompare(getMoveName(b)));
    if(q) keys = keys.filter(k => (getMoveName(k)+' '+k+' '+(MOVES[k]?.type||'')).toLowerCase().includes(q));
    
    // Deduplicate by normalized name (prefer PokeChill entries)
    const seenNames = new Set();
    keys = keys.filter(k => {
      const mv = MOVES[k];
      // Prefer PokeChill version (has 'id' field, name is raw English)
      if (!mv || !mv.type) return false;
      // Get display name, normalize for comparison
      const name = getMoveName(k).toLowerCase().trim().replace(/[\s-]+/g, '');
      if(seenNames.has(name)) return false;
      // Also check if the same basic English name exists
      const enName = (mv.en || mv.name || k).toLowerCase().trim().replace(/[\s-]+/g, '');
      if (enName && enName !== name && seenNames.has(enName)) return false;
      seenNames.add(name);
      if (enName) seenNames.add(enName);
      return true;
    });

    html += `<div class="dict-grid">${keys.map(k=>{
      const mv = MOVES[k];
      const users = mons.filter(o=>(o.p.moves||[]).some(m=>m.id===k));
      // Passe 26 : la liste des Pokémon pouvant apprendre l'attaque vit dans
      // son panneau d'information — la case reste épurée (compteur conservé).
      return `<div class="dict-entry ${users.length?'owned':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}" data-action="legacy-call" data-call="openMoveInfo" data-call-args="'${k}'">
        <div class="dict-entry-icon type-badge ${typeClass(mv?.type||'?')}">${(typeof getTypeName==='function'?getTypeName(mv?.type):(mv?.type))||'?'}</div><div><b>${getMoveName(k)}</b><span>${users.length?tr('dict_move_users',{count:users.length}):(t('dict_move_users_none')||'No Pokémon know this move')}</span></div>
      </div>`;
    }).join('') || `<div class="dict-muted">${t('dict_no_results')||'No results.'}</div>`}</div>`;
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

    html += `<div class="dict-grid">${keys.map(k=>{
      const info=(typeof getTalentRecord==='function'?getTalentRecord(k):TALENTS_FULL[k])||{rarity:1}; const users=mons.filter(o=>o.p.talent===k);
      // Passe 26 : porteurs listés dans le panneau d'information du talent
      // (espèces normales ET talent caché) — case épurée.
      return `<div class="dict-entry ${unlocked.has(k)?'owned':''}" data-action="legacy-call" data-call="openAbilityInfo" data-call-args="'${k}'">
        <div class="dict-entry-icon">${typeof getIcon==='function'?getIcon('training',16):''}</div><div><b>${getTalentName(k)}</b><span>${unlocked.has(k)?(t('dict_ability_unlocked')||'Unlocked'):(t('dict_ability_locked')||'Locked')} · ${getRarityLabel(info.rarity)}</span></div>
      </div>`;
    }).join('') || `<div class="dict-muted">${t('dict_no_results')||'No results.'}</div>`}</div>`;
 }
 _pwSetHtmlSafe(el, html);
 const input = el.querySelector('.dict-search');
 // preventScroll : focus() remettrait le panneau en haut (passe 16)
 if(input){ try{ input.focus({preventScroll:true}); }catch(_){ input.focus(); } input.setSelectionRange(input.value.length,input.value.length); }
 if(typeof applyDynamicStyles === 'function') applyDynamicStyles(el);
}


var _atollTab = 'menu';
// ATOLL_MODES / ATOLL_RANK_SEQUENCE / rotation 12 h / bans / série Usine :
// moteur déplacé dans src/game/world/atoll-core.js (passe 22) — ici : UI + flux.
const ATOLL_SHOP = [ ['rarecandy',25], ['leftovers',120], ['assault_vest',180], ['eviolite',200], ['choice_band',260], ['choice_specs',260], ['life_orb',360] ];
function isAtollUnlocked(){ return (typeof isRegionLeagueWon === 'function') ? isRegionLeagueWon('kanto') : !!G.championTitle; }
function setAtollTab(tab){ _atollTab = tab || 'menu'; renderBattleAtoll(document.getElementById('fs-panel-content')); }
function atollTeamForRestriction(mode){ const team = (G.team||[]).filter(Boolean); return mode.playerCap ? team.slice(0, mode.playerCap) : team; }
function validateAtollRankRestriction(mode){
 if(!mode) return true;
 // Bans tournants de légendaires (rotation 12 h) : le joueur ne peut aligner
 // aucun légendaire banni — l'équipe adverse n'en contient jamais non plus.
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
// Rétrocompat : crée l'équipe ADVERSE du mode à la rotation courante (sets
// curated + graine datée, cf. atoll-core.js).
function createAtollTeam(modeKey='tower_c'){ return (typeof buildAtollTeam === 'function') ? buildAtollTeam(modeKey) : []; }
function restoreAtollTeam(){ if(G && G._atollTeamBackup){ G.team = G._atollTeamBackup; delete G._atollTeamBackup; } if(G && G._atollTeamSlotItemsBackup){ G.teamSlotItems = G._atollTeamSlotItemsBackup; delete G._atollTeamSlotItemsBackup; } try{ if(typeof syncTeamSlotHeldItems === 'function') syncTeamSlotHeldItems(); renderTeamWindow(); }catch(_){} }
function startAtollBattle(modeKey='tower_c'){
 ensureAtollState(); if(!isAtollUnlocked()){ notify(t('atoll_locked'), 'var(--red)'); return; } if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return; } if(battle && battle.active){ notify(t('battle_in_progress'), 'var(--red)'); return; } if(!G.team || !G.team.length){ notify(t('no_pokemon_in_team'), 'var(--red)'); return; }
 const mode = ATOLL_MODES[modeKey] || ATOLL_MODES.tower_c; if(!validateAtollRankRestriction(mode)) return;
 const w = (typeof getRotationWindow === 'function') ? getRotationWindow() : 0;
 let enemyWindow = w;
 if(mode.borrowed){
  // Mode « équipe prêtée » : série Usine persistante (sauvegardée dans G.atoll).
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
  // L'adversaire grimpe la table de rotation : palier n → équipe (w+n) du cycle.
  enemyWindow = getAtollFactoryOpponentWindow(run, w);
 }
 else if(mode.playerCap && G.team.length > mode.playerCap){ G._atollTeamBackup = JSON.parse(JSON.stringify(G.team)); G._atollTeamSlotItemsBackup = JSON.parse(JSON.stringify(G.teamSlotItems||[])); G.team = G.team.slice(0, mode.playerCap); if(Array.isArray(G.teamSlotItems)) G.teamSlotItems = G.teamSlotItems.slice(0, mode.playerCap); }
 if(mode.noItems){ G._atollTeamSlotItemsBackup = G._atollTeamSlotItemsBackup || JSON.parse(JSON.stringify(G.teamSlotItems||[])); G.teamSlotItems=[]; try{ syncTeamSlotHeldItems(); }catch(_){} }
 // Équipe adverse : sets curated via graine datée (fenêtre courante, ou
 // fenêtre de palier pour la série Usine).
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
  // Victoire Usine : prime ×(1+25 %/palier) puis réorganisation imposée
  // (soin complet + mélange de l'ordre des Pokémon ET des attaques).
  const runBefore = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
  gain = (typeof computeAtollFactoryReward === 'function') ? computeAtollFactoryReward(mode.reward || tokens, runBefore ? (runBefore.streak||0) : 0) : gain;
  if(typeof applyAtollFactoryVictory === 'function'){ applyAtollFactoryVictory(G.team); reorgNotice = ' ' + t('atoll_factory_reorg_notice'); }
 }
 st.tokens += gain; st.streak = (st.streak||0)+1; st.bestStreak=Math.max(st.bestStreak||0, st.streak); st.winsByMode[modeKey||'tower_c']=(st.winsByMode[modeKey||'tower_c']||0)+1; restoreAtollTeam(); notify(tr('atoll_win_reward', {tokens:gain, streak:st.streak}) + reorgNotice, 'var(--green)');
}
function buyAtollItem(key, price){ const st=ensureAtollState(); price=Number(price||0); if(st.tokens < price){ notify(t('atoll_not_enough_tokens'), 'var(--red)'); return; } st.tokens -= price; addToInventory(key, 1); saveGame(); renderBattleAtoll(document.getElementById('fs-panel-content')); notify(tr('atoll_item_bought', {item:getItemName(key)}), 'var(--green)'); }
function abandonAtollFactoryRunUI(){ if(typeof abandonAtollFactoryRun === 'function') abandonAtollFactoryRun(); try{ saveGame(); }catch(_){} renderBattleAtoll(document.getElementById('fs-panel-content')); notify(t('atoll_factory_run_ended'), 'var(--red)'); }
function atollNav(){ const tabs=[['menu','atoll_home'],['tower','atoll_tower'],['factory','atoll_factory'],['arena','atoll_arena'],['dome','atoll_dome'],['shop','atoll_shop']]; return `<div class="atoll-nav">${tabs.map(([id,label])=>`<button class="hbtn ${_atollTab===id?'active':''}" data-action="legacy-call" data-call="setAtollTab" data-call-args="'${id}'">${t(label)}</button>`).join('')}</div>`; }
function atollRankBadge(mode){ return mode.maxRank ? `<span class="atoll-rank-lock rank-${mode.maxRank.toLowerCase()}">${tr('atoll_max_rank', {rank:mode.maxRank})}</span>` : `<span class="atoll-rank-lock free">${t('atoll_rank_free')}</span>`; }
function atollSpriteChip(id, size){ return `<span class="atoll-chip" title="${getPokeName(id)}">${spriteImg(id,'',{size:size||28})}</span>`; }
function atollRotationMeta(){
 const c = (typeof getAtollCycleInfo === 'function') ? getAtollCycleInfo() : {team:1, teamCount:6, day:1, dayCount:3};
 const time = (typeof formatRotationCountdown === 'function') ? formatRotationCountdown(getRotationTimeLeftMs()) : '';
 return `<div class="atoll-rotation-meta"><span class="atoll-timer-chip" data-rotation-timer="atoll">${tr('atoll_rotation_timer', {time})}</span><span class="atoll-cycle-chip">${tr('atoll_cycle_info', {n:c.team, total:c.teamCount, day:c.day, days:c.dayCount})}</span></div>`;
}
function atollBanRow(modeKey){
 const banned = (typeof getAtollBannedLegendaries === 'function') ? getAtollBannedLegendaries(modeKey) : [];
 if(!banned.length) return '';
 return `<div class="atoll-ban-row"><span>${t('atoll_banned_row')}</span>${banned.map(id=>atollSpriteChip(id,26)).join('')}</div>`;
}
function atollModeCard(key){
 const m=ATOLL_MODES[key];
 const kind = m.borrowed ? 'rental' : 'enemy';
 const ids = (typeof getAtollSpeciesList === 'function') ? getAtollSpeciesList(m.key, undefined, kind) : [];
 const preview = ids.map(id=>atollSpriteChip(id)).join('');
 const freeNote = (m.key === 'tower_free') ? `<span class="atoll-free-note">${t('atoll_ban_free_note')}</span>` : '';
 return `<div class="atoll-rank-card atoll-mode-card rank-${(m.maxRank||'free').toLowerCase()}"><div>${atollRankBadge(m)}<b>${t(m.label)}</b><span>${tr(m.borrowed ? 'atoll_mode_rule_factory' : 'atoll_mode_rule', {level:m.level, size:m.size, reward:m.reward})}</span><small class="atoll-rotation-hint">${t(m.borrowed ? 'atoll_rental_preview' : 'atoll_enemy_preview')}</small><div class="atoll-preview-row">${preview}</div>${atollBanRow(m.key)}${freeNote}</div><button class="hbtn" data-action="legacy-call" data-call="${m.borrowed ? 'prepareAtollFactoryBattle' : 'startAtollBattle'}" data-call-args="'${m.key}'">${t(m.borrowed ? 'atoll_factory_continue' : 'atoll_start')}</button></div>`;
}
function atollFactoryRunCard(){
 const run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
 if(!run) return '';
 const mode = ATOLL_MODES[run.modeKey] || {};
 // Passe 25 : carte de STATUT de la série — l'édition (ordre des Pokémon et des
 // attaques) vit dans le panneau de préparation dédié (openAtollFactoryPrep),
 // clone de la fenêtre « Équipe Active ». Ici : résumé + accès au panneau.
 const chips = (run.team||[]).map(p => p ? atollSpriteChip(p.id, 30) : '').join('');
 return `<div class="atoll-run-card"><div class="atoll-run-head"><b>${t('atoll_factory_run_title')}</b><span>${tr('atoll_factory_run_streak', {streak:run.streak||0, mode:t(mode.label||'')})}</span></div><div class="atoll-preview-row">${chips}</div><div class="pw-btn-group"><button class="hbtn" data-action="legacy-call" data-call="openAtollFactoryPrep" data-call-args="">${t('atoll_factory_prep_open')}</button><button class="hbtn" data-action="legacy-call" data-call="abandonAtollFactoryRunUI" data-call-args="">${t('atoll_factory_abandon')}</button></div><small>${t('atoll_factory_reorg_hint')}</small></div>`;
}
// ——— Panneau de préparation pré-combat (passe 25) ———
// Clone de la fenêtre « Équipe Active » : MÊMES cartes Pokémon
// (generatePokeCardHTML), réorganisation par glisser-déposer (ordre des
// Pokémon ET ordre des attaques), mais AUCUN changement d'objet, de talent
// ou d'attaque — seule la position compte.
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
  // Fiche attaque SANS contexte explicite → son bouton retour revient au
  // panneau de préparation (source déduite via _atollPrepOpen).
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
 _pwSetHtmlSafe(inner,
  `<div class="modal-title"><div class="pw-row"><span class="pw-info-icon">🏭</span><div class="pw-info-head-text"><div class="pw-info-name">${t('atoll_factory_run_title')}</div><div class="pw-text-sm pw-light1">${tr('atoll_factory_run_streak', {streak:run.streak||0, mode:t(mode.label||'')})}</div></div></div><span class="modal-close" data-action="legacy-call" data-call="closeAtollFactoryPrep" data-call-args=""></span></div>`
  + `<small class="atoll-prep-hint">${t('atoll_factory_prep_hint')}</small>`
  + `<div id="atoll-prep-body" class="team-view">${cards}</div>`
  + `<div class="pw-btn-group"><button class="hbtn" data-action="legacy-call" data-call="atollFactoryPrepFight" data-call-args="">${t('atoll_factory_continue')}</button><button class="hbtn pw-btn-danger" data-action="legacy-call" data-call="atollFactoryPrepAbandon" data-call-args="">${t('atoll_factory_abandon')}</button></div>`
  + `<small class="atoll-prep-note">${t('atoll_factory_reorg_hint')}</small>`);
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
 if(!ok){ // pas de série : refermer proprement (retour d'info orphelin…)
  window._atollPrepOpen = false;
  modal.classList.remove('open');
  modal.classList.remove('atoll-prep-modal');
  return;
 }
 window._atollPrepOpen = true;
 window._atollPrepModeKey = ((typeof getAtollFactoryRun === 'function' && getAtollFactoryRun()) || {}).modeKey || window._atollPrepModeKey || 'factory_c';
 window._pwPokeSheet = null; // ce n'est PAS une fiche d'équipe/box
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
 // La carte de statut du panneau atoll derrière reflète le nouvel ordre.
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
// Glisser-déposer DANS le panneau de préparation : cartes = ordre des
// Pokémon ; attaques (data-atoll-move-drag) = ordre au sein d'un Pokémon.
let _atollPrepDrag = null; // {kind:'poke', idx} | {kind:'move', i, mi}
// Passe 27 : preview de drop — données fantôme de l'équipe prêtée.
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
   // Passe 26 : vignette de drag unifiée (équipe prêtée de l'Usine).
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
   ev.stopPropagation(); // une attaque se drag, pas sa carte
   const parts = String(el.dataset.atollMoveDrag).split('|');
   _atollPrepDrag = { kind:'move', i:Number(parts[0]), mi:Number(parts[1]) };
   ev.dataTransfer.effectAllowed = 'move';
   try{ ev.dataTransfer.setData('text/plain', el.dataset.atollMoveDrag); }catch(_){}
   el.classList.add('pw-move-drag-src');
   // Passe 26 : vignette de drag unifiée pour l'attaque prêtée déplacée.
   try{
    const _drr = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
    const _dm = _drr && _drr.team && _drr.team[_atollPrepDrag.i] && _drr.team[_atollPrepDrag.i].moves ? _drr.team[_atollPrepDrag.i].moves[_atollPrepDrag.mi] : null;
    const _dmv = _dm && typeof MOVES !== 'undefined' ? MOVES[_dm.id] : null;
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
   if(Number(parts[0]) !== _atollPrepDrag.i) return; // même Pokémon uniquement
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
// Échange deux positions de l'équipe prêtée (persisté + panneau re-rendu).
function atollFactorySwapPoke(from, to){
 const run = (typeof getAtollFactoryRun === 'function') ? getAtollFactoryRun() : null;
 if(!run || !Array.isArray(run.team)) return;
 from = Number(from); to = Number(to);
 if(!(from >= 0) || !(to >= 0) || from >= run.team.length || to >= run.team.length || from === to) return;
 const tmp = run.team[from]; run.team[from] = run.team[to]; run.team[to] = tmp;
 try{ saveGame(); }catch(_){}
 renderAtollFactoryPrep();
}
// Échange deux attaques au sein du même Pokémon prêté.
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
// Clic sur une carte Usine SANS série en cours : crée la série puis ouvre le
// panneau de préparation (au lieu de lancer le combat immédiatement).
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
 // Passe 25 : ouvre le panneau de préparation (clone de l'Équipe Active).
 openAtollFactoryPrep();
}
function atollGroupDesc(group){ return `<div class="atoll-group-desc"><b>${t('atoll_'+group)}</b><p>${t('atoll_'+group+'_desc')}</p></div>`; }
function renderAtollTab(){
 if(_atollTab==='tower') return `${atollGroupDesc('tower')}${atollRotationMeta()}<div class="atoll-rank-grid">${['tower_e','tower_d','tower_c','tower_b','tower_a','tower_s','tower_free'].map(atollModeCard).join('')}</div>`;
 if(_atollTab==='factory') return `${atollGroupDesc('factory')}${atollRotationMeta()}${atollFactoryRunCard()}<div class="atoll-rank-grid">${['factory_c','factory_a'].map(atollModeCard).join('')}</div>`;
 if(_atollTab==='arena') return `${atollGroupDesc('arena')}${atollRotationMeta()}<div class="atoll-rank-grid">${['arena_three','arena_no_item','arena_type'].map(atollModeCard).join('')}</div>`;
 if(_atollTab==='dome') return `${atollGroupDesc('dome')}${atollRotationMeta()}<div class="atoll-rank-grid">${['dome_quarter','dome_final'].map(atollModeCard).join('')}</div>`;
 if(_atollTab==='shop') return `<div class="atoll-section-title">${t('atoll_shop')}</div><div class="atoll-shop-grid">${ATOLL_SHOP.map(([key,price])=>`<div class="atoll-shop-card"><div>${itemSpriteHtml(key,32)}<b>${getItemName(key)}</b><span>${price} ${t('atoll_tokens')}</span></div><button class="hbtn" data-action="legacy-call" data-call="buyAtollItem" data-call-args="'${key}',${price}">${t('buy_btn')}</button></div>`).join('')}</div>`;
 return `<div class="atoll-rank-grid atoll-home-grid"><button class="atoll-rank-card" data-action="legacy-call" data-call="setAtollTab" data-call-args="'tower'"><div><b>${t('atoll_tower')}</b></div></button><button class="atoll-rank-card" data-action="legacy-call" data-call="setAtollTab" data-call-args="'factory'"><div><b>${t('atoll_factory')}</b></div></button><button class="atoll-rank-card" data-action="legacy-call" data-call="setAtollTab" data-call-args="'arena'"><div><b>${t('atoll_arena')}</b></div></button><button class="atoll-rank-card" data-action="legacy-call" data-call="setAtollTab" data-call-args="'dome'"><div><b>${t('atoll_dome')}</b></div></button></div>`;
}
function renderBattleAtoll(el){ if(!el) return; const st=ensureAtollState(); if(typeof startRotationTicker === 'function') startRotationTicker(); if(!isAtollUnlocked()){ _pwSetHtmlSafe(el, `<div class="atoll-panel"><div class="atoll-hero"><div><h2>${t('battle_atoll_title')}</h2><p>${t('atoll_locked_desc')}</p></div></div></div>`); return; } _pwSetHtmlSafe(el, `<div class="atoll-panel"><div class="atoll-hero"><div><h2>${t('battle_atoll_title')}</h2><p>${t('battle_atoll_desc')}</p></div><div class="atoll-token-box"><b>${st.tokens}</b><span>${t('atoll_tokens')}</span><small>${tr('atoll_streak', {streak:st.streak||0, best:st.bestStreak||0})}</small></div></div>${atollNav()}${renderAtollTab()}</div>`); }

function openFullscreenPanel(panelType){
 
 closeUnifiedSelectorModal();
 closeFullscreenPanel();
 if(typeof closeBattleSummary === 'function') closeBattleSummary();
 const pm = document.getElementById('poke-modal');
 if(pm){ pm.classList.remove('open'); pm.classList.remove('atoll-prep-modal'); pm.classList.remove('preset-editor-modal'); }
 window._atollPrepOpen = false; // passe 25 : la préparation Usine ne survit pas à un changement de panneau
 window._presetEditorOpen = null; window._presetEditorReturn = null; // passe 27 : idem éditeur de preset
 const qm = document.getElementById('quest-modal');
 if(qm) qm.classList.remove('open');
 const sm = document.getElementById('settings-modal');
 if(sm) sm.classList.remove('open');

 // Mémorise le panneau plein écran courant (pour le retour des panneaux d'info)
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
 modal.innerHTML = `
 <div class="pw-modal-container">
   <div id="fs-panel-header" class="pw-modal-header">
     <div id="fs-panel-title" class="pw-modal-title"></div>
     <span class="pw-modal-close" data-action="legacy-call" data-call="closeFullscreenPanel" data-call-args="">✕</span>
   </div>
   <div id="fs-panel-filters" class="pw-modal-search-bar"></div>
   <div id="fs-panel-content" class="pw-modal-body"></div>
 </div>`;
 document.body.appendChild(modal);
 modal.addEventListener('click', function(e){ if(e.target===modal) closeFullscreenPanel(); });
 }

 
 document.getElementById('fs-panel-filters').style.display = 'none';
 document.getElementById('fs-panel-filters').innerHTML = '';
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
   else content.innerHTML = '<div class="pw-empty-state-md">Module énigmes indisponible.</div>';
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
if (typeof setDictionarySearch !== 'undefined' && typeof window !== 'undefined') window.setDictionarySearch = setDictionarySearch;
if (typeof findItemSources !== 'undefined' && typeof window !== 'undefined') window.findItemSources = findItemSources;
if (typeof setDictionaryTab !== 'undefined' && typeof window !== 'undefined') window.setDictionaryTab = setDictionaryTab;
if (typeof renderDictionary !== 'undefined' && typeof window !== 'undefined') window.renderDictionary = renderDictionary;
if (typeof openAbilityInfo !== 'undefined' && typeof window !== 'undefined') window.openAbilityInfo = openAbilityInfo;
if (typeof openFullscreenPanel !== 'undefined' && typeof window !== 'undefined') window.openFullscreenPanel = openFullscreenPanel;
if (typeof closeFullscreenPanel !== 'undefined' && typeof window !== 'undefined') window.closeFullscreenPanel = closeFullscreenPanel;
if (typeof renderBattleAtoll !== 'undefined' && typeof window !== 'undefined') window.renderBattleAtoll = renderBattleAtoll;
if (typeof setAtollTab !== 'undefined' && typeof window !== 'undefined') window.setAtollTab = setAtollTab;
if (typeof restoreAtollTeam !== 'undefined' && typeof window !== 'undefined') window.restoreAtollTeam = restoreAtollTeam;
if (typeof startAtollBattle !== 'undefined' && typeof window !== 'undefined') window.startAtollBattle = startAtollBattle;
if (typeof prepareAtollFactoryBattle !== 'undefined' && typeof window !== 'undefined') window.prepareAtollFactoryBattle = prepareAtollFactoryBattle;
if (typeof openAtollFactoryPrep !== 'undefined' && typeof window !== 'undefined') window.openAtollFactoryPrep = openAtollFactoryPrep;
if (typeof closeAtollFactoryPrep !== 'undefined' && typeof window !== 'undefined') window.closeAtollFactoryPrep = closeAtollFactoryPrep;
if (typeof atollFactoryPrepFight !== 'undefined' && typeof window !== 'undefined') window.atollFactoryPrepFight = atollFactoryPrepFight;
if (typeof atollFactoryPrepAbandon !== 'undefined' && typeof window !== 'undefined') window.atollFactoryPrepAbandon = atollFactoryPrepAbandon;
if (typeof atollFactorySwapPoke !== 'undefined' && typeof window !== 'undefined') window.atollFactorySwapPoke = atollFactorySwapPoke;
if (typeof atollFactorySwapMoves !== 'undefined' && typeof window !== 'undefined') window.atollFactorySwapMoves = atollFactorySwapMoves;
if (typeof renderAtollFactoryPrep !== 'undefined' && typeof window !== 'undefined') window.renderAtollFactoryPrep = renderAtollFactoryPrep;
if (typeof installAtollPrepDragDrop !== 'undefined' && typeof window !== 'undefined') window.installAtollPrepDragDrop = installAtollPrepDragDrop;
if (typeof completeAtollBattle !== 'undefined' && typeof window !== 'undefined') window.completeAtollBattle = completeAtollBattle;
if (typeof buyAtollItem !== 'undefined' && typeof window !== 'undefined') window.buyAtollItem = buyAtollItem;


