// Repli si util.js (pwSetHtml) n'est pas chargé — tests unitaires ciblés.
var _pwSetHtmlSafe = _pwSetHtmlSafe || function(el, html){ if(typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
function samePokemonForBattleEditLock(a, b){
 if(!a || !b) return false;
 if(a.uid && b.uid) return a.uid === b.uid;
 return a === b;
}

function isPokemonLockedForBattleEdits(p, idx, boxId){
 const g = (typeof G !== 'undefined') ? G : globalThis.G;
 const b = (typeof battle !== 'undefined') ? battle : globalThis.battle;
 if(!p && g){
   if(boxId !== undefined && boxId !== null && boxId !== '' && g.collection){
     p = g.collection[boxId] || g.collection[String(boxId)];
   } else if(idx !== undefined && idx !== null && idx !== '' && g.team){
     p = g.team[Number(idx)];
   }
 }
 if(!p || !b || !b.active) return false;
 if(b.isTraining){
   return !!(b.trainee && samePokemonForBattleEditLock(p, b.trainee));
 }
 const activePoke = (typeof getActivePlayerPoke === 'function') ? getActivePlayerPoke() : null;
 if(samePokemonForBattleEditLock(p, activePoke)) return true;
 const team = (g && Array.isArray(g.team)) ? g.team : [];
 if(idx !== undefined && idx !== null && idx !== '' && idx !== 'null'){
   const n = Number(idx);
   if(!Number.isNaN(n) && team[n] && samePokemonForBattleEditLock(p, team[n])) return true;
 }
 return team.some(tp => samePokemonForBattleEditLock(p, tp));
}

function battleEditLockMessage(){
 return (typeof t === 'function') ? t('action_blocked_in_battle') : "Action impossible en combat : quittez le combat d'abord !";
}

function notifyBattleEditLocked(){
 if(typeof notify === 'function') notify(battleEditLockMessage(), 'var(--red)');
}

function togglePokemonFavorite(idx, boxId){
 const p = boxId ? (G.collection[boxId] || G.collection[String(boxId)]) : G.team[Number(idx)];
 if(!p) return;
 p.favorite = !p.favorite;
 saveGame();
 if(boxId) openBoxPokeModal(boxId); else openPokeModal(Number(idx));
 try{ renderTeamWindow(); }catch(_){}
 try{ renderUnifiedGrid(); }catch(_){}
}
function togglePokemonLock(idx, boxId){
 const p = boxId ? (G.collection[boxId] || G.collection[String(boxId)]) : G.team[Number(idx)];
 if(!p) return;
 p.locked = !p.locked;
 saveGame();
 if(boxId) openBoxPokeModal(boxId); else openPokeModal(Number(idx));
 try{ renderTeamWindow(); }catch(_){}
 try{ renderUnifiedGrid(); }catch(_){}
}
function pokemonProtectionControlsHtml(p, idx, boxId, readonly){
 if(readonly || !p) return '';
 const favArgs = boxId ? `null, '${boxId}'` : `${idx}, ''`;
 const lockArgs = favArgs;
 return `<div class="poke-protection-actions">
  <button class="hbtn poke-protect-btn ${p.favorite?'is-on':'is-off'}" data-action="legacy-call" data-call="togglePokemonFavorite" data-call-args="${favArgs}"><span class="poke-protect-label">${p.favorite?t('pokemon_favorite_on'):t('pokemon_favorite_off')}</span></button>
  <button class="hbtn poke-protect-btn ${p.locked?'is-locked':'is-off'}" data-action="legacy-call" data-call="togglePokemonLock" data-call-args="${lockArgs}"><span class="poke-protect-icon">${typeof getIcon==='function'?getIcon('close',12):'×'}</span><span class="poke-protect-label">${p.locked?t('pokemon_locked_on'):t('pokemon_locked_off')}</span></button>
 </div>`;
}

function pokemonQueueControlsHtml(p, boxId, readonly){
 if(readonly || !p || !boxId) return '';
 const inHatchery = typeof isPokemonQueuedHatchery === 'function' && isPokemonQueuedHatchery(p);
 const inTraining = typeof isPokemonQueuedTraining === 'function' && isPokemonQueuedTraining(p);
 return `<div class="poke-queue-actions">
  <div class="poke-detail-subtle">${t('queue_add_from_box')}</div>
  <button class="hbtn queue-action-btn ${inHatchery?'is-on':''}" data-action="legacy-call" data-call="addPokemonToHatcheryQueue" data-call-args="'${boxId}'">${typeof getIcon==='function'?getIcon('hatchery',14):''} ${inHatchery?t('queue_already_added_short'):t('queue_add_hatchery')}</button>
  <button class="hbtn queue-action-btn ${inTraining?'is-on':''}" data-action="legacy-call" data-call="addPokemonToTrainingQueue" data-call-args="0, '${boxId}'">${typeof getIcon==='function'?getIcon('training',14):''} ${t('queue_add_training_slot1')}</button>
  <button class="hbtn queue-action-btn ${inTraining?'is-on':''}" data-action="legacy-call" data-call="addPokemonToTrainingQueue" data-call-args="1, '${boxId}'">${typeof getIcon==='function'?getIcon('training',14):''} ${t('queue_add_training_slot2')}</button>
 </div>`;
}

function buildTalentSelectorHtml(p, idx, boxId){
 const nid = Number(p.id);
 const tals = getSpeciesTalents(nid);
 const locked = isPokemonLockedForBattleEdits(p, idx, boxId);
 const talentChangeAttrs = locked
   ? 'disabled data-battle-edit-locked="true"'
   : `data-change-call="changePokeTalent" data-change-args="${idx!=null?idx:'null'}, '${boxId||''}', this.value"`;

 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.unlockedTalents[nid]) G.unlockedTalents[nid] = [tals[0]];
 if(p.talent && !G.unlockedTalents[nid].includes(p.talent)) G.unlockedTalents[nid].push(p.talent);

 
 const uniqueTals = [];
 tals.forEach(tal => {
   if(!uniqueTals.includes(tal)) {
     uniqueTals.push(tal);
   }
 });

 // Build hidden ability display
 var haStr = '';
 try {
   var pokeData = (typeof POKEMON_TALENTS !== 'undefined') ? POKEMON_TALENTS[nid] : null;
   var hiddenTal = pokeData ? pokeData.hiddenAbility : null;
   if (hiddenTal && typeof getTalentName === 'function') {
     var haInfo = (typeof getTalentRecord === 'function') ? getTalentRecord(hiddenTal) : (TALENTS_FULL && TALENTS_FULL[hiddenTal] ? TALENTS_FULL[hiddenTal] : null);
     var haRarity = haInfo && haInfo.rarity ? getRarityLabel(haInfo.rarity) : '';
     var haDesc = haInfo ? getTalentDesc(hiddenTal) : '';
     haStr = '<div class="poke-detail-ability-chip is-hidden" data-style="opacity:0.7;border:1px dashed var(--light1);"><span>' + (t('hidden_ability_label')||'Talent Caché') + ': ' + getTalentName(hiddenTal) + '</span><small>' + haRarity + '</small></div><div class="poke-detail-subtle">' + haDesc + '</div>';
   }
 } catch(_) {}

 return `<div class="pw-card-83">
 <div class="pw-text-sm pw-light2 pw-bold">${typeof getIcon==='function'?getIcon('training',14):''} ${t('pokemon_talents')}</div>
 ${locked?`<div class="pw-text-sm pw-light1">${battleEditLockMessage()}</div>`:''}
 <select data-action="stop-propagation" ${talentChangeAttrs} class="extracted-bridge-style-024">
 ${uniqueTals.map(tal => {
   const unlocked = (G.unlockedTalents?.[nid] || []).includes(tal) || (G.unlockedTalents?.[nid] || []).map(x=>String(x).toLowerCase()).includes(String(tal).toLowerCase());
   const talName = getTalentName(tal);
   const talInfo = (typeof getTalentRecord === 'function') ? getTalentRecord(tal) : (TALENTS_FULL && TALENTS_FULL[tal]);
   const rarityLabel = talInfo ? getRarityLabel(talInfo.rarity) : 'Inconnu';
   if(!unlocked){
     return `<option value=""disabled>  ${talName} [${rarityLabel}] — (${t('locked_talent_hint')})</option>`;
   }
   return `<option value="${tal}"${p.talent===tal?'selected':''}> ${talName} [${rarityLabel}]</option>`;
 }).join('')}
 </select>
 <div class="pw-text-84">${p.talent ? getTalentDesc(p.talent) : ''}</div>
 ${haStr || ''}
 </div>`;
}


function changePokeTalent(idx, boxId, newTalent){
 const p = boxId ? (G.collection[boxId] || G.collection[String(boxId)]) : G.team[idx];
 if(isPokemonLockedForBattleEdits(p, idx, boxId)){
   notifyBattleEditLocked();
   return;
 }
 if(!newTalent) return;
 if(!p) return;
 const nid = p.id;
 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.unlockedTalents[nid]) G.unlockedTalents[nid] = [];
 if(!G.unlockedTalents[nid].includes(newTalent)) return;
 p.talent = newTalent;
 saveGame();
 if(boxId) {
   openBoxPokeModal(boxId);
 } else {
   openPokeModal(idx);
 }
}




function switchPokemonStatTab(tab){
 const root = document.getElementById('poke-modal-inner');
 if(!root) return;
 root.querySelectorAll('.poke-detail-stat-tab').forEach(btn=>btn.classList.toggle('active', btn.dataset.statTab === tab));
 root.querySelectorAll('.poke-detail-stat-panel').forEach(panel=>panel.classList.toggle('active', panel.dataset.statPanel === tab));
}

function pokemonDetailStatRows(p){
 const labels = [t('stat_hp'), t('stat_atk'), t('stat_def'), t('stat_spa'), t('stat_spd'), t('stat_spe')];
 const keys = ['hp','atk','def','spa','spd','spe'];
 const baseVals = [p.maxHP||p.hp||0, p.atk||0, p.def||0, p.spa||p.atk||0, p.spd||p.def||0, p.spe||0];
 const maxVals = [500,220,220,220,220,220];
 const colors = ['#60BE58','#D3425F','#539DDF','#EF90E6','#B763CF','#FBA64C'];
 const statRow = (label, pct, color, text) => `<div class="poke-detail-stat-row">
   <span class="poke-detail-stat-name">${label}</span>
   <div class="poke-detail-stat-bar"><div class="poke-detail-stat-fill" data-pct="${pct}" data-bg="${color}"></div></div>
   <span class="poke-detail-stat-value">${text}</span>
 </div>`;
 return {
   base: labels.map((label,i)=>statRow(label, Math.min(100, Math.round(baseVals[i]/maxVals[i]*100)), colors[i], baseVals[i])).join(''),
   iv: labels.map((label,i)=>{ const val=(p.ivs||{})[keys[i]]||0; return statRow(label, Math.round(val/6*100), colors[i], `${val}/6`); }).join(''),
   ev: labels.map((label,i)=>{ const val=(p.evs||{})[keys[i]]||0; return statRow(label, Math.round(val/6*100), colors[i], `${val}/6`); }).join('')
 };
}
function pokemonDetailRankPanelHtml(p){
 const rank = typeof getPokemonRank === 'function' ? getPokemonRank(p.id) : '?';
 const bst = typeof getPokemonBaseStatTotal === 'function' ? getPokemonBaseStatTotal(p.id) : '';
 return `<div class="poke-rank-panel rank-${String(rank).toLowerCase()}"><div class="poke-rank-letter">${rank}</div><div><b>${t('pokemon_rank')}</b><span>${bst?`BST ${bst}`:''}</span></div></div>`;
}

function pokemonDetailMoveRows(p, opts){
 opts = opts || {};
 const idx = opts.idx;
 const boxId = opts.boxId;
 const readonly = !!opts.readonly;
 const locked = !!opts.locked;
 const replaceSlot = boxId ? globalThis.boxMoveReplaceSlot : (typeof moveReplaceSlot !== 'undefined' ? moveReplaceSlot : null);
 const canReplace = !readonly && !locked && replaceSlot !== null;
 const full = (p.moves||[]).length >= 4 && !canReplace;
 const known = (p.moves||[]).map((m, mi)=>({m: typeof m === 'string' ? {id:m} : m, mi})).filter(entry => entry.m && MOVES[entry.m.id]).map(({m, mi})=>{
   const mv = MOVES[m.id];
   const selected = !readonly && !locked && replaceSlot === mi;
   const action = readonly || locked ? '' : (boxId ? ` data-action="legacy-call" data-call="toggleBoxMoveSelect" data-call-args="'${boxId}',${mi}"` : ` data-action="legacy-call" data-call="toggleMoveSelect" data-call-args="${idx},${mi}"`);
   const ctxMoveArgs = boxId ? `'${m.id}',null,'${boxId}'` : (idx != null ? `'${m.id}',${idx}` : `'${m.id}'`);
   return `<div class="poke-detail-move-row ${selected?'selected':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}"${action} data-context-call="openMoveInfo" data-context-args="${ctxMoveArgs}" title="${locked?battleEditLockMessage():t('click_replace_context_info')}">
     <span class="type-badge ${typeClass(mv?.type||'?')}">${(typeof getTypeName==='function'?getTypeName(mv?.type):mv?.type)||'?'}</span>
     <span class="poke-detail-move-name">${getMoveName(m.id)}</span>
     <span class="poke-detail-move-meta">${mv?.pow||0} ${t('power_abbrev')} · ${mv?.cat||''}</span>
     ${selected?`<span class="poke-detail-pill danger">${t('replacement_badge')}</span>`:''}
   </div>`;
 }).join('');
 const pool = readonly ? [] : learnableMoves(p);
 const learn = pool.length ? pool.map(id=>{
   const mv = MOVES[id];
   const active = !locked && (canReplace || !full);
   const attrs = active ? (boxId ? ` data-action="legacy-call" data-call="learnBoxMove" data-call-args="'${boxId}','${id}'"` : ` data-action="legacy-call" data-call="learnMove" data-call-args="${idx},'${id}'"`) : '';
   const ctxLearnArgs = boxId ? `'${id}',null,'${boxId}'` : (idx != null ? `'${id}',${idx}` : `'${id}'`);
   return `<div class="poke-detail-move-row learnable ${active?'clickable':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}"${attrs} data-context-call="openMoveInfo" data-context-args="${ctxLearnArgs}" title="${locked?battleEditLockMessage():t('context_info_touch')}">
     <span class="type-badge ${typeClass(mv?.type||'?')}">${(typeof getTypeName==='function'?getTypeName(mv?.type):mv?.type)||'?'}</span>
     <span class="poke-detail-move-name">${getMoveName(id)}</span>
     <span class="poke-detail-move-meta">${mv?.pow||0} ${t('power_abbrev')} · ${mv?.cat||''}</span>
     ${active?'<span class="poke-detail-pill">+</span>':''}
   </div>`;
 }).join('') : `<div class="poke-detail-empty">${t('no_other_moves')}</div>`;
 return { known, learn, canReplace, full };
}

function pokemonDetailHeldItemHtml(p, opts){
 opts = opts || {};
 const key = (opts.idx != null && typeof getTeamSlotItem === 'function') ? getTeamSlotItem(opts.idx) : (p && p.heldItem);
 if(!key) return `<div class="poke-detail-subtle">${t('no_item_equipped_bag')}</div>`;
 const itm = ITEMS[key];
 const qty = Math.min(25, (G.inventory||{})[key]||0);
 const removeCall = opts.boxId ? `unequipItemFromBox` : `unequipItem`;
 const removeArgs = opts.boxId ? `'${opts.boxId}'` : `${opts.idx}`;
 return `<div class="poke-detail-held">
   <div class="poke-detail-held-icon">${itemSpriteHtml(key,34)}</div>
   <div class="poke-detail-held-text"><b>${getItemName(key)}</b><div data-style="margin-top:6px;font-size:12px;color:var(--light2);line-height:1.5;">${(getItemDesc(key)||'')}</div></div>
   ${opts.readonly?'':`<button class="hbtn poke-detail-mini-btn" data-action="legacy-call" data-call="${removeCall}" data-call-args="${removeArgs}">${t('remove')}</button>`}
 </div>`;
}

function renderPokemonDetailModal(p, opts){
 opts = opts || {};
 if(!p) return;
 const modal = document.getElementById('poke-modal');
 const inner = document.getElementById('poke-modal-inner');
 if(!modal || !inner) return;
 // Trace d'où viennent les panneaux d'info ouverts depuis cette fiche
 if (opts.boxId != null) window._pwPokeSheet = { kind: 'box', boxId: opts.boxId };
 else if (opts.idx != null) window._pwPokeSheet = { kind: 'team', idx: opts.idx };
 else window._pwPokeSheet = null;
 if (typeof window.pwInfoClearSource === 'function') window.pwInfoClearSource();
 inner.classList.remove('management-inner');
 inner.classList.add('poke-detail-inner');
 const idx = opts.idx;
 const boxId = opts.boxId;
 const readonly = !!opts.readonly;
 const locLabel = opts.locationLabel || (boxId ? t('pc_box') : (idx!=null ? t('team_location_clean') : ''));
 const locked = readonly ? false : isPokemonLockedForBattleEdits(p, idx, boxId);
 const shinyUnlocked = !!(p.shinyUnlocked || p.shiny || isSpeciesShiny(p.id));
 if(shinyUnlocked && p.shinyActive === undefined){ p.shinyActive = true; p.shiny = true; }
 const isShiny = !!p.shinyActive;
 const statRows = pokemonDetailStatRows(p);
 const moveRows = pokemonDetailMoveRows(p, {idx, boxId, readonly, locked});

 const talentHtml = readonly ? (function() {
   // Passe 24 : un Pokémon EN JEU a TOUJOURS un talent — si la fiche détaillée
   // ne résout pas l'entrée TALENTS_FULL (vieille save camelCase), on affiche
   // le nom brut plutôt que l'alarmiste « Aucun talent ».
   var info = p.talent && ((typeof getTalentRecord === 'function') ? getTalentRecord(p.talent) : (TALENTS_FULL && TALENTS_FULL[p.talent])) || null;
   var talStr;
   if (p.talent) {
     var chip = '<div class="poke-detail-ability-chip"><span>' + getTalentName(p.talent) + '</span>' + (info ? '<small>' + getRarityLabel(info.rarity) + '</small>' : '') + '</div>';
     var desc = getTalentDesc(p.talent);
     talStr = chip + (desc ? '<div class="poke-detail-subtle">' + desc + '</div>' : '');
   } else {
     talStr = '<div class="poke-detail-subtle">' + (t('no_talent_species')||'No talent') + '</div>';
   }
   var haStr = '';
   try {
     var pokeData = (typeof POKEMON_TALENTS !== 'undefined') ? POKEMON_TALENTS[Number(p.id)] : null;
     var hiddenTal = pokeData ? pokeData.hiddenAbility : null;
     if (hiddenTal && typeof getTalentName === 'function') {
       var haInfo = (typeof getTalentRecord === 'function') ? getTalentRecord(hiddenTal) : (TALENTS_FULL && TALENTS_FULL[hiddenTal] ? TALENTS_FULL[hiddenTal] : null);
       var haRarity = haInfo && haInfo.rarity ? getRarityLabel(haInfo.rarity) : '';
       var haDesc = haInfo ? getTalentDesc(hiddenTal) : '';
       haStr = '<div class="poke-detail-ability-chip is-hidden" data-style="opacity:0.7;border:1px dashed var(--light1);"><span>' + (t('hidden_ability_label')||'Talent Caché') + ': ' + getTalentName(hiddenTal) + '</span><small>' + haRarity + '</small></div><div class="poke-detail-subtle">' + haDesc + '</div>';
     }
   } catch(_) {}
   return talStr + haStr;
 })() : buildTalentSelectorHtml(p, idx!=null?idx:null, boxId||null); ;
 const shinyToggle = (!readonly && shinyUnlocked) ? `<button class="hbtn poke-detail-shiny-toggle ${isShiny?'is-on':'is-off'}" data-action="legacy-call" data-call="${boxId?'toggleBoxShinySkin':'toggleShinySkin'}" data-call-args="${boxId?`'${boxId}'`:idx}"><span class="poke-detail-shiny-star">★</span><span>${isShiny?t('shiny_skin_on'):t('shiny_skin_off')}</span></button>` : '';
 const evos = getEvolutionMethodsHtml(p.id);
 // Get localized name
 var _pName = typeof getPokeName === 'function' ? getPokeName(p.id) : p.name;
 _pwSetHtmlSafe(inner, `<div class="modal-title poke-detail-title">
   <div>${isShiny?'<span class="shiny-tag">★</span>':''}${_pName} <span class="poke-detail-id">#${p.id}</span></div>
   <span class="modal-close" data-action="close-poke-modal" data-reset-move-editor="true" data-reset-box-move="true">✕</span>
 </div>
 <div class="poke-detail-shell">
   <section class="poke-detail-hero">
     <div class="poke-detail-name-row"><div><b>${_pName}</b><span>${t('level_word')} ${p.level||1}${locLabel?` · ${locLabel}`:''}</span></div></div>
     <div class="poke-detail-sprite-card ${isShiny?'is-shiny':''}">${spriteImg(p.id,p.emoji,{shiny:isShiny,size:132})}</div>
     <div class="poke-detail-types">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
     ${shinyToggle}
     ${pokemonProtectionControlsHtml(p, idx, boxId, readonly)}
   </section>
   <aside class="poke-detail-side">
     <div class="poke-detail-stat-tabs">
       <button class="poke-detail-stat-tab active" data-stat-tab="base" data-action="legacy-call" data-call="switchPokemonStatTab" data-call-args="'base'">${t('base_stats_tab')||'Base Stats'}</button>
       <button class="poke-detail-stat-tab" data-stat-tab="iv" data-action="legacy-call" data-call="switchPokemonStatTab" data-call-args="'iv'">IV</button>
       <button class="poke-detail-stat-tab" data-stat-tab="ev" data-action="legacy-call" data-call="switchPokemonStatTab" data-call-args="'ev'">EV</button>
     </div>
     <div class="poke-detail-stat-panel active" data-stat-panel="base">${statRows.base}</div>
     <div class="poke-detail-stat-panel" data-stat-panel="iv">${statRows.iv}</div>
     <div class="poke-detail-stat-panel" data-stat-panel="ev">${statRows.ev}</div>
   </aside>
 </div>
 <div class="poke-detail-section-grid">
   <section class="poke-detail-panel"><h3>${t('pokemon_talents')}</h3>${talentHtml}</section>
   <section class="poke-detail-panel"><h3>${t('pokemon_rank')}</h3>${pokemonDetailRankPanelHtml(p)}</section>
   ${evos?`<section class="poke-detail-panel poke-detail-panel-wide"><h3>${t('evolutions_title') || 'Evolutions'}</h3>${evos}</section>`:''}
 </div>
 <section class="poke-detail-moves-block">
   <div class="poke-detail-moves-title"><span>${t('moves_lbl')}</span>${moveRows.canReplace?`<button class="hbtn poke-detail-mini-btn" data-action="${boxId?'cancel-box-move-replace':'cancel-move-replace'}" ${boxId?`data-box-id="${boxId}"`:`data-team-index="${idx}"`}>${t('cancel')}</button>`:''}</div>
   <div class="poke-detail-moves-list current">${moveRows.known || `<div class="poke-detail-empty">${t('no_other_moves')}</div>`}</div>
   ${readonly?'':`<div class="poke-detail-learn-title">${t('learnable_moves_title')} ${locked?`<span>${battleEditLockMessage()}</span>`:moveRows.full?`<span>${t('select_move_first')}</span>`:''}</div><div class="poke-detail-moves-list learn">${moveRows.learn}</div>`}
 </section>
  ${readonly ? '' : `<button class="hbtn poke-detail-full-list-btn" data-style="width:calc(100% - 24px);margin:8px auto 4px;display:block;" data-action="legacy-call" data-call="openLearnableMovesPanel" data-call-args="${boxId ? `'box','${boxId}'` : `'team',${idx != null ? idx : 0}`}">${typeof t==='function'?t('view_all_learnable_moves'):'View All Learnable Moves'}</button>`}
 </section>`);
 if(typeof window!=='undefined' && typeof window.pwModalInfo==='function') window.pwModalInfo(false);
 modal.classList.add('poke-detail-front');
 modal.classList.add('open');
 if(typeof applyDynamicStyles === 'function') applyDynamicStyles(inner);
 else if(typeof window !== 'undefined' && window.applyDynamicStyles) window.applyDynamicStyles(inner);
}


function openPokeModal(idx){
  window._POKEMODAL_SOURCE = 'team';
  var p = (typeof G !== 'undefined' && G && G.team) ? G.team[idx] : null;
  if (!p) { if(typeof moveEditorFor !== 'undefined') moveEditorFor = null; return; }
  renderPokemonDetailModal(p, { idx: idx, readonly: false });
}


function openReadonlyPokeModal(p, contextLabel){
 renderPokemonDetailModal(p,{readonly:true, locationLabel:contextLabel||''});
}

function openBattleEnemyPokeModal(){
 const p = (typeof battle !== 'undefined' && battle) ? battle.enemyPoke : null;
 if(!p) return;
 openReadonlyPokeModal(p, t('battle_in_progress'));
}

function openPokeInfo(pokeId){
 const activeEnemy = (typeof battle !== 'undefined' && battle && battle.enemyPoke && Number(battle.enemyPoke.id) === Number(pokeId)) ? battle.enemyPoke : null;
 if(activeEnemy){ openReadonlyPokeModal(activeEnemy, t('battle_in_progress')); return; }
 const fallback = (typeof createPoke === 'function') ? createPoke(Number(pokeId), 1, isSpeciesShiny(Number(pokeId))) : null;
 if(fallback) openReadonlyPokeModal(fallback, '');
}

var _moveInfoContext = null;

function openMoveInfo(moveId, contextIdx, contextBoxId){
  window._POKEMODAL_SOURCE = window._POKEMODAL_SOURCE || 'dictionary';
 const mv = MOVES[moveId];
 if(!mv) return;
 const inner = document.getElementById('poke-modal-inner');
 if(!inner) return;
 _moveInfoContext = { idx: contextIdx !== undefined ? contextIdx : null, boxId: contextBoxId || null };
 const name = getMoveName(moveId);
 const type = mv.type || '?';
 const cat = mv.cat === 'phys' ? t('move_cat_physical') : mv.cat === 'spec' ? t('move_cat_special') : t('move_cat_status');
 const pow = mv.pow || '-';
 // NB : mv.acc n'est pas affichée (absente des données -> toujours 100 en moteur).

 
 const effects = [];
 const effC = mv.effC || 0;
 if(mv.cat === 'stat') {
   
   const pct = effC || 100;
   if(mv.eff === 'burn') effects.push(tr('effect_burn_stat', {pct:pct}));
   if(mv.eff === 'para') effects.push(tr('effect_para_stat', {pct:pct}));
   if(mv.eff === 'poison') effects.push(tr('effect_poison_stat', {pct:pct}));
   if(mv.eff === 'badpoison') effects.push(tr('effect_badpoison_stat', {pct:pct}));
   if(mv.eff === 'sleep') effects.push(tr('effect_sleep_stat', {pct:pct}));
   if(mv.eff === 'freeze') effects.push(tr('effect_freeze_stat', {pct:pct}));
   if(mv.eff === 'slow') effects.push(tr('effect_slow_stat', {pct:pct}));
 } else if(mv.eff && effC > 0) {
   
   if(mv.eff === 'burn') effects.push(tr('effect_burn_chance', {pct:effC}));
   if(mv.eff === 'para') effects.push(tr('effect_para_chance', {pct:effC}));
   if(mv.eff === 'poison') effects.push(tr('effect_poison_chance', {pct:effC}));
   if(mv.eff === 'freeze') effects.push(tr('effect_freeze_chance', {pct:effC}));
   if(mv.eff === 'sleep') effects.push(tr('effect_sleep_chance', {pct:effC}));
   if(mv.eff === 'slow') effects.push(tr('effect_slow_chance', {pct:effC}));
   if(mv.eff === 'confuse') effects.push(tr('effect_confuse_chance', {pct:effC}));
   if(mv.eff === 'flinch') effects.push(tr('effect_flinch_chance', {pct:effC}));
 }
 if(mv.crit) effects.push(t('effect_crit'));
 if(mv.recoil) effects.push(t('effect_recoil'));
 if(mv.recharge) effects.push(t('effect_recharge'));
 if(mv.trap) effects.push(t('effect_trap'));
 if(mv.drain) effects.push(t('effect_drain'));
 if(mv.charge) effects.push(t('effect_charge'));
 if(mv.heal) effects.push(tr('effect_heal', {pct:mv.heal*100}));
 if(mv.prio && mv.prio > 0) effects.push(tr('effect_priority', {prio:mv.prio}));
 if(mv.fixed) effects.push(tr('effect_fixed', {damage:typeof mv.fixed === 'number' ? mv.fixed : t('level_word')}));

 const effHtml = effects.length 
   ? effects.map(e => {
       let bg = 'rgba(236,222,183,0.06)';
       let border = '1px solid rgba(236,222,183,0.22)';
       let color = 'var(--light2)';
       const lower = e.toLowerCase();
       var badge = typeof getBadgeHtml === 'function' ? getBadgeHtml(e) : null;
       if (badge && typeof badge === 'string') { bg = 'transparent'; border = 'none'; color = 'inherit'; effContent = badge; }
       var effContentVar = typeof effContent !== 'undefined' ? effContent : '✦ ' + e;
       return `<div data-style="background:var(--pm-note-bg);border:var(--pm-note-border);color:var(--pm-note-c);padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:bold;margin:6px 0;display:flex;align-items:center;gap:6px;box-shadow:0 2px 4px rgba(0,0,0,0.15);width:100%;box-sizing:border-box;" style="--pm-note-bg:${bg};--pm-note-border:${border};--pm-note-c:${color};">${effContentVar}</div>`;
     }).join('') 
   : `<div class="pw-text-sm pw-light1">${t('no_special_effects')}</div>`;
 const typeColor = TYPE_COLORS[type] || '#888';
 // Passe 24 : la locale (fr/move-descs.js) passe AVANT mv.desc (anglais) —
 // sinon la traduction n'était jamais affichée.
 let moveDesc = '';
 if(typeof t === 'function'){
   const locDesc = t('move_descs.' + moveId);
   if(locDesc && locDesc !== 'move_descs.' + moveId) moveDesc = locDesc;
 }
 if(!moveDesc) moveDesc = mv.desc || (typeof MOVE_DESCRIPTIONS !== 'undefined' && MOVE_DESCRIPTIONS[moveId]) || '';
 moveDesc = typeof replaceWeatherTerms === 'function' ? replaceWeatherTerms(moveDesc) : moveDesc;
 // Passe 24 : les mots de STATUT (brûlure, poison, paralysie…) sont aussi
 // mis en couleur, comme le sont déjà météo et champs.
 moveDesc = typeof replaceStatusTerms === 'function' ? replaceStatusTerms(moveDesc) : moveDesc;

 // Mémorise d'où vient ce panneau (dictionnaire, fiche, sac…) pour le bouton retour
 // Mémorise d'où vient ce panneau : contexte explicite (clic depuis une fiche
 // Pokémon, transmis par data-context-args) en priorité, sinon déduction
 // depuis l'écran courant (panneau plein écran, fiche, sac…).
 if (contextBoxId != null && contextBoxId !== '') {
   window._pwInfoSource = { kind: 'box', boxId: contextBoxId };
 } else if (contextIdx !== undefined && contextIdx !== null) {
   // idx >= 0 : ouvert depuis la fiche équipe -> retour vers la fiche.
   // idx < 0  : contexte explicite « pas de fiche » (pilule d'attaque cliquée
   // sur une carte de la fenêtre d'équipe / de combat, fiche éventuellement
   // visible derrière) -> le retour doit simplement FERMER le panneau
   // (retour utilisateur, passe 7).
   window._pwInfoSource = (Number(contextIdx) >= 0) ? { kind: 'team', idx: contextIdx } : null;
 } else {
   window._pwInfoSource = (typeof window.pwInfoCaptureSource === 'function') ? window.pwInfoCaptureSource() : null;
 }
 if (typeof window !== 'undefined' && typeof window.pwModalInfo === 'function') window.pwModalInfo(true);

 var _infoSections = [];
 if (moveDesc) _infoSections.push({ title: t('description'), body: '<div class="pw-text-sm pw-light1">' + moveDesc + '</div>' });
 _infoSections.push({ title: t('effects'), body: effHtml });

 // Passe 26 : liste des Pokémon pouvant apprendre l'attaque, par catégorie
 // légitime du jeu (niveau / CT-CS / dressage) — le dictionnaire n'affiche
 // plus ces listes, elles vivent ici dans le panneau d'information.
 if (typeof getMoveLearners === 'function') {
   var _learners = getMoveLearners(moveId);
   var _mkChips = function (ids) {
     var cap = 24, shown = ids.slice(0, cap);
     var chipsHtml = shown.map(function (sid) { return '<span class="dict-chip">#' + sid + ' ' + (typeof getPokeName === 'function' ? getPokeName(sid) : sid) + '</span>'; }).join('');
     if (ids.length > shown.length) chipsHtml += '<span class="dict-muted">' + tr('dict_and_n_more', { count: ids.length - shown.length }) + '</span>';
     return chipsHtml;
   };
   var _learnBody = '';
   ['level', 'ctcs', 'training'].forEach(function (catKey) {
     var ids = _learners[catKey] || [];
     if (!ids.length) return;
     _learnBody += '<div class="dict-chip-line"><b>' + t('learners_' + catKey) + '</b><span class="dict-chip-list">' + _mkChips(ids) + '</span></div>';
   });
   if (_learnBody) _infoSections.push({ title: t('learners_title'), body: _learnBody });
 }

 if (typeof window.pwBuildInfoPanel === 'function') {
   _pwSetHtmlSafe(inner, window.pwBuildInfoPanel({
     icon: '<span class="type-badge ' + typeClass(type) + ' pw-type-info">' + (typeof getTypeName === 'function' ? getTypeName(type) : type) + '</span>',
     title: name,
     subtitle: cat,
     // Puissance et Catégorie sur la même ligne ; la Précision n'est pas
     // affichée (mv.acc absent des données -> toujours 100 dans le moteur).
     statCards: [
       { label: (t('item_power') || 'Puissance'), value: pow },
       { label: (t('sort_category') || 'Catégorie'), value: cat }
     ],
     sections: _infoSections
   }));
 } else {
   _pwSetHtmlSafe(inner, '<div class="modal-title"><div class="pw-row">'
     + '<span class="type-badge ' + typeClass(type) + ' pw-type-info">' + (typeof getTypeName === 'function' ? getTypeName(type) : type) + '</span><div>' + name + '</div></div>'
     + '<span class="modal-close" data-action="pw-info-back"></span></div>');
 }
 document.getElementById('poke-modal').classList.add('open');
}



// ── Panneau des moves apprenables par espèce (catégorisé) ──
function openLearnableMovesPanel(idxOrBoxId, opts) {
  // Passe 8 : la source peut être EXPLICITE — soit en 1er argument ('team' ou
  // 'box', transmis par le bouton de la fiche), soit via opts.source (appels
  // internes, ex. rafraîchissement) — sinon le fallback ambiant pouvait
  // résoudre un autre Pokémon (indicateurs trompeurs / liste tronquée).
  var forced = null;
  if (idxOrBoxId === 'team' || idxOrBoxId === 'box') { forced = idxOrBoxId; idxOrBoxId = opts; opts = null; }
  else if (opts && (opts.source === 'team' || opts.source === 'box')) forced = opts.source;
  var p = null;
  var source = null;
  if (forced === 'box' && typeof G !== 'undefined' && G && G.collection) {
    source = 'box';
    p = G.collection[idxOrBoxId] || G.collection[String(idxOrBoxId)];
  } else if (forced === 'team' && typeof G !== 'undefined' && G && G.team) {
    source = 'team';
    var fidx = Number(idxOrBoxId);
    if (!Number.isNaN(fidx)) { p = G.team[fidx]; idxOrBoxId = fidx; }
  }
  if (!source) {
  // Source de vérité prioritaire : la fiche actuellement rendue (_pwPokeSheet
  // est fixé par renderPokemonDetailModal à CHAQUE rendu de fiche, alors que
  // _POKEMODAL_SOURCE ambiant peut être obsolète) — sinon les indicateurs
  // d'attaque apprise reflètent un autre Pokémon (retour utilisateur, passe 7).
  var sheet = (typeof window !== 'undefined') ? window._pwPokeSheet : null;
  if (sheet && sheet.kind === 'box' && typeof G !== 'undefined' && G && G.collection) {
    p = G.collection[sheet.boxId] || G.collection[String(sheet.boxId)];
    source = 'box'; idxOrBoxId = sheet.boxId;
  } else if (sheet && sheet.kind === 'team' && typeof G !== 'undefined' && G && G.team) {
    p = G.team[sheet.idx];
    source = 'team'; idxOrBoxId = sheet.idx;
  } else {
    source = (typeof window._POKEMODAL_SOURCE !== 'undefined') ? window._POKEMODAL_SOURCE : 'team';
    if (source === 'box' && idxOrBoxId) {
      p = (typeof G !== 'undefined' && G && G.collection) ? (G.collection[idxOrBoxId] || G.collection[String(idxOrBoxId)]) : null;
    } else {
      var idx = Number(idxOrBoxId);
      if (!Number.isNaN(idx) && typeof G !== 'undefined' && G && G.team && G.team[idx]) {
        p = G.team[idx];
      }
    }
  }
  }
  if (!p) return;

  // Contexte mémorisé pour le rafraîchissement en place des indicateurs
  // (apprentissage d'une attaque, ajouts du système de sauvegarde…).
  window._pwLearnableCtx = { source: source, id: idxOrBoxId };

  var inner = document.getElementById('poke-modal-inner');
  if (!inner) return;

  var fullPool = (typeof getSpeciesFullLearnablePool === 'function') ? getSpeciesFullLearnablePool(p.id) : [];
  var levelPool = (typeof getSpeciesMovePool === 'function') ? getSpeciesMovePool(p.id) : [];
  var knownSet = new Set((p.moves || []).map(function(m) { return typeof m === 'string' ? m : m.id; }).filter(Boolean));

  // Build CT/CS moveId set from items-data
  var ctMoveSet = {};
  if (typeof window !== 'undefined' && window.ITEMS) {
    for (var itemKey in window.ITEMS) {
      var item = window.ITEMS[itemKey];
      if (item && (item.type === 'ct' || item.type === 'cs') && item.moveId) {
        ctMoveSet[item.moveId] = itemKey;
      }
    }
  }

  // Categorize moves — passe 10 : la catégorie « dressage » vient de
  // getSpeciesTrainingOnlyPool (source unique partagée avec le dressage),
  // repli sur l'ancien calcul inline si le helper est indisponible.
  var levelUpMoves = [], trainingMoves = [], ctMoves = [];
  var levelSet = {};
  for (var li = 0; li < levelPool.length; li++) levelSet[levelPool[li]] = true;
  var trainingOnlySet = null;
  if (typeof getSpeciesTrainingOnlyPool === 'function') {
    trainingOnlySet = new Set(getSpeciesTrainingOnlyPool(p.id));
  }

  for (var pi = 0; pi < fullPool.length; pi++) {
    var mid = fullPool[pi];
    var mv = (typeof MOVES !== 'undefined') ? MOVES[mid] : null;
    if (!mv) continue;

    if (levelSet[mid] === true) {
      levelUpMoves.push(mid);
    } else if (ctMoveSet[mid] !== undefined) {
      ctMoves.push(mid);
    } else if (!trainingOnlySet || trainingOnlySet.has(mid)) {
      trainingMoves.push(mid);
    }
  }

  // Sort each category by type then power desc
  function sortPool(arr) {
    arr.sort(function(a, b) {
      var ma = (typeof MOVES !== 'undefined') ? MOVES[a] : null;
      var mb = (typeof MOVES !== 'undefined') ? MOVES[b] : null;
      if (!ma || !mb) return 0;
      if (ma.type !== mb.type) return (ma.type || '').localeCompare(mb.type || '');
      return (mb.power || 0) - (ma.power || 0);
    });
  }
  sortPool(levelUpMoves);
  sortPool(trainingMoves);
  sortPool(ctMoves);

  var totalCount = levelUpMoves.length + trainingMoves.length + ctMoves.length;
  var knownCount = 0;
  fullPool.forEach(function(id) { if (knownSet.has(id)) knownCount++; });

  // Passe 9 : une attaque « possédée » = équipée OU apprenable maintenant
  // (débloquée par le niveau atteint, le dressage ou une CT — même calcul que
  // la liste « learnable moves » de la fiche, sinon les indicateurs ne
  // reflètent que les 4 équipées, retour utilisateur).
  var availSet = new Set((typeof learnableMoves === 'function') ? learnableMoves(p) : []);
  var availCount = 0;
  fullPool.forEach(function(id) { if (!knownSet.has(id) && availSet.has(id)) availCount++; });

  var titleKey = (typeof t === 'function') ? t('learnable_moves_panel_title') : 'Learnable Moves';
  var countLabel = (knownCount + availCount) + '/' + totalCount + ' ' + ((typeof t === 'function') ? t('possessed_short') : 'owned');
  var pillEquipped = (typeof t === 'function') ? (t('move_pill_equipped') || 'Équipée') : 'Équipée';
  var pillAvailable = (typeof t === 'function') ? (t('move_pill_available') || 'Disponible') : 'Disponible';

  // Render a section of moves
  function renderSection(moveIds, sectionLabel, emptyMsg) {
    if (!moveIds || !moveIds.length) {
      return '<div class="poke-detail-moves-section">' +
        '<div class="poke-detail-moves-title"><span>' + sectionLabel + '</span></div>' +
        '<div class="poke-detail-empty">' + emptyMsg + '</div></div>';
    }
    var rowsHtml = '';
    for (var ri = 0; ri < moveIds.length; ri++) {
      var id = moveIds[ri];
      var mv = (typeof MOVES !== 'undefined') ? MOVES[id] : null;
      if (!mv) continue;
      var isKnown = knownSet.has(id);
      var isAvailable = !isKnown && availSet.has(id);
      var name = (typeof getMoveName === 'function') ? getMoveName(id) : id;
      var typeColor = (typeof TYPE_COLORS !== 'undefined') ? (TYPE_COLORS[mv.type] || '#888') : '#888';
      var typeCls = (typeof window.typeClass === 'function') ? window.typeClass(mv.type) : '';
      var mvPower = mv.power || 0;
      var mvRarity = mv.rarity || 1;
      var rarityStar = '';

      var ctxArg = "'" + id + "'";
      if (source === 'box' && idxOrBoxId != null) ctxArg += ",null,'" + idxOrBoxId + "'";
      else if (idxOrBoxId != null && !Number.isNaN(Number(idxOrBoxId))) ctxArg += ',' + Number(idxOrBoxId);
      rowsHtml += '<div class="poke-detail-move-row ' + (isKnown ? 'known' : (isAvailable ? 'learnable' : 'learnable locked')) + '" data-type-color="' + typeColor + '" data-context-call="openMoveInfo" data-context-args="' + ctxArg + '">' +
        '<span class="type-badge ' + typeCls + '">' + (typeof getTypeName === 'function' ? getTypeName(mv.type) : (mv.type || '?')) + '</span>' +
        '<span class="poke-detail-move-name">' + name + '</span>' +
        '<span class="poke-detail-move-meta">' + mvPower + ' \u00B7 ' + rarityStar + '</span>' +
        (isKnown ? '<span class="poke-detail-pill is-known" data-style="font-size:10px;margin-left:auto;">\u2713 ' + pillEquipped + '</span>'
                 : (isAvailable ? '<span class="poke-detail-pill is-learnable" data-style="font-size:10px;margin-left:auto;">\u2713 ' + pillAvailable + '</span>' : '')) +
        '</div>';
    }
    return '<div class="poke-detail-moves-section">' +
      '<div class="poke-detail-moves-title"><span>' + sectionLabel + ' <span data-style="font-size:11px;color:var(--light1);font-weight:400;">(' + moveIds.length + ')</span></span></div>' +
      '<div class="poke-detail-moves-list learn">' + rowsHtml + '</div></div>';
  }

  var sectionLevel = renderSection(levelUpMoves,
    (typeof t === 'function') ? t('category_level_up') : '\u2605 Level-up',
    (typeof t === 'function') ? t('no_level_up_moves') : 'No level-up moves');
  var sectionCT = renderSection(ctMoves,
    (typeof t === 'function') ? t('category_ct_cs') : '\u25C7 TM/CS',
    (typeof t === 'function') ? t('no_ct_moves') : 'No TM/CS moves');
  var sectionTraining = renderSection(trainingMoves,
    (typeof t === 'function') ? t('category_training') : '\u25BD Training',
    (typeof t === 'function') ? t('no_training_moves') : 'No training-only moves');

  if (typeof window !== 'undefined' && typeof window.pwModalInfo === 'function') window.pwModalInfo(false);

 var backKey = (typeof t === 'function') ? t('back_to_pokemon') : '\u2190 Back to Pok\u00e9mon';
  var closeKey = (typeof t === 'function') ? t('close') : 'Close';
  var backCall = (source === 'box' && idxOrBoxId) ? 'openBoxPokeModal' : 'openPokeModal';

  _pwSetHtmlSafe(inner, '<div class="modal-title">' +
    '<div>' + titleKey + ' <span data-style="font-size:12px;color:var(--light1);font-weight:400;">' + countLabel + '</span></div>' +
    '<span class="modal-close" data-action="close-poke-modal">\u2715</span>' +
    '</div>' +
    '<div class="poke-detail-moves-block" data-learnable-panel="1" data-style="max-height:70vh;overflow-y:auto;padding:0 4px;">' +
    sectionLevel +
    sectionCT +
    sectionTraining +
    '</div>' +
    '<div class="pw-flex-center pw-gap-sm" data-style="margin-top:8px;">' +
    '<button class="hbtn poke-detail-mini-btn" data-action="legacy-call" data-call="' + backCall + '" data-call-args="' + idxOrBoxId + '">' + backKey + '</button>' +
    '<button class="hbtn" data-action="close-poke-modal">' + closeKey + '</button>' +
    '</div>');

  document.getElementById('poke-modal').classList.add('open');
}

// Recalcule le panneau « toutes les attaques apprenables » s'il est ouvert,
// pour que les indicateurs « attaque apprise » reflètent immédiatement un
// apprentissage (fiche, boîte, CT) ou les ajouts du système de sauvegarde.
// Passe 8 : double garde anti « réouverture spontanée » — le marqueur DOM
// survit à la fermeture du modal (innerHTML conservé) ; sans vérifier que le
// modal est VRAIMENT ouvert, un déblocage d'entraînement rouvrait le panneau
// tout seul (retour utilisateur).
function refreshLearnableMovesPanelIfOpen() {
  try {
    var pm = document.getElementById('poke-modal');
    if (!pm || !pm.classList || !pm.classList.contains('open')) return;
    var inner = document.getElementById('poke-modal-inner');
    if (!inner || !inner.querySelector('[data-learnable-panel]')) return;
    var ctx = window._pwLearnableCtx;
    if (!ctx) return;
    openLearnableMovesPanel(ctx.id, { source: ctx.source });
  } catch (_) {}
}

// --- Migrated to ES module, globals exposed ---
if (typeof switchPokemonStatTab !== 'undefined' && typeof window !== 'undefined') window.switchPokemonStatTab = switchPokemonStatTab;
if (typeof renderPokemonDetailModal !== 'undefined' && typeof window !== 'undefined') window.renderPokemonDetailModal = renderPokemonDetailModal;
if (typeof isPokemonLockedForBattleEdits !== 'undefined' && typeof window !== 'undefined') window.isPokemonLockedForBattleEdits = isPokemonLockedForBattleEdits;
if (typeof notifyBattleEditLocked !== 'undefined' && typeof window !== 'undefined') window.notifyBattleEditLocked = notifyBattleEditLocked;
if (typeof togglePokemonFavorite !== 'undefined' && typeof window !== 'undefined') window.togglePokemonFavorite = togglePokemonFavorite;
if (typeof togglePokemonLock !== 'undefined' && typeof window !== 'undefined') window.togglePokemonLock = togglePokemonLock;
if (typeof buildTalentSelectorHtml !== 'undefined' && typeof window !== 'undefined') window.buildTalentSelectorHtml = buildTalentSelectorHtml;
if (typeof changePokeTalent !== 'undefined' && typeof window !== 'undefined') window.changePokeTalent = changePokeTalent;
if (typeof openReadonlyPokeModal !== 'undefined' && typeof window !== 'undefined') window.openReadonlyPokeModal = openReadonlyPokeModal;
if (typeof openBattleEnemyPokeModal !== 'undefined' && typeof window !== 'undefined') window.openBattleEnemyPokeModal = openBattleEnemyPokeModal;
if (typeof openPokeModal !== 'undefined' && typeof window !== 'undefined') window.openPokeModal = openPokeModal;
if (typeof openPokeInfo !== 'undefined' && typeof window !== 'undefined') window.openPokeInfo = openPokeInfo;
if (typeof openMoveInfo !== 'undefined' && typeof window !== 'undefined') window.openMoveInfo = openMoveInfo;



function openBoxPokeModal(boxId) {
  window._POKEMODAL_SOURCE = 'box';
  var p = (typeof G !== 'undefined' && G && G.collection) ? (G.collection[boxId] || G.collection[String(boxId)]) : null;
  if (!p) return;
  // NOT readonly — allows talent selection, shiny toggle, and move editing
  renderPokemonDetailModal(p, { boxId: boxId, readonly: false });
}
if (typeof openBoxPokeModal !== 'undefined' && typeof window !== 'undefined') window.openBoxPokeModal = openBoxPokeModal;
if (typeof openLearnableMovesPanel !== 'undefined' && typeof window !== 'undefined') window.openLearnableMovesPanel = openLearnableMovesPanel;
if (typeof refreshLearnableMovesPanelIfOpen !== 'undefined' && typeof window !== 'undefined') window.refreshLearnableMovesPanelIfOpen = refreshLearnableMovesPanelIfOpen;

