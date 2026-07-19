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

 return `<div class="extracted-template-style-083">
 <div class="extracted-template-style-060">${typeof getIcon==='function'?getIcon('training',14):''} ${t('pokemon_talents')}</div>
 ${locked?`<div class="extracted-template-style-090">${battleEditLockMessage()}</div>`:''}
 <select data-action="stop-propagation" ${talentChangeAttrs} class="extracted-bridge-style-024">
 ${uniqueTals.map(tal => {
   const unlocked = (G.unlockedTalents?.[nid] || []).includes(tal);
   const talInfo = TALENTS_FULL && TALENTS_FULL[tal];
   const talName = talInfo ? talInfo.name : tal;
   const rarityLabel = talInfo ? getRarityLabel(talInfo.rarity) : 'Inconnu';
   if(!unlocked){
     return `<option value=""disabled>  ${talName} [${rarityLabel}] — (${t('locked_talent_hint')})</option>`;
   }
   return `<option value="${tal}"${p.talent===tal?'selected':''}> ${talName} [${rarityLabel}]</option>`;
 }).join('')}
 </select>
 <div class="extracted-template-style-084">${p.talent && TALENTS_FULL && TALENTS_FULL[p.talent] ? TALENTS_FULL[p.talent].info : ''}</div>
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
   return `<div class="poke-detail-move-row ${selected?'selected':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}"${action} data-context-call="openMoveInfo" data-context-args="'${m.id}'" title="${locked?battleEditLockMessage():t('click_replace_context_info')}">
     <span class="type-badge ${typeClass(mv?.type||'?')}">${mv?.type||'?'}</span>
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
   return `<div class="poke-detail-move-row learnable ${active?'clickable':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}"${attrs} data-context-call="openMoveInfo" data-context-args="'${id}'" title="${locked?battleEditLockMessage():t('context_info_touch')}">
     <span class="type-badge ${typeClass(mv?.type||'?')}">${mv?.type||'?'}</span>
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
 const qty = Math.min(BAG_MAX, (G.inventory||{})[key]||0);
 const removeCall = opts.boxId ? `unequipItemFromBox` : `unequipItem`;
 const removeArgs = opts.boxId ? `'${opts.boxId}'` : `${opts.idx}`;
 return `<div class="poke-detail-held">
   <div class="poke-detail-held-icon">${itemSpriteHtml(key,34)}</div>
   <div class="poke-detail-held-text"><b>${getItemName(key)}</b><span>${itm?.buff?`${t('item_power')} ${qty}/${BAG_MAX}`:(getItemDesc(key)||'')}</span></div>
   ${opts.readonly?'':`<button class="hbtn poke-detail-mini-btn" data-action="legacy-call" data-call="${removeCall}" data-call-args="${removeArgs}">${t('remove')}</button>`}
 </div>`;
}

function renderPokemonDetailModal(p, opts){
 opts = opts || {};
 if(!p) return;
 const modal = document.getElementById('poke-modal');
 const inner = document.getElementById('poke-modal-inner');
 if(!modal || !inner) return;
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
 const talentHtml = readonly ? (()=>{
   const info = p.talent && TALENTS_FULL[p.talent] ? TALENTS_FULL[p.talent] : null;
   return info ? `<div class="poke-detail-ability-chip"><span>${info.name}</span><small>${getRarityLabel(info.rarity)}</small></div><div class="poke-detail-subtle">${info.info||''}</div>` : `<div class="poke-detail-subtle">${t('no_talent_species')}</div>`;
 })() : buildTalentSelectorHtml(p, idx!=null?idx:null, boxId||null);
 const shinyToggle = (!readonly && shinyUnlocked) ? `<button class="hbtn poke-detail-shiny-toggle ${isShiny?'is-on':'is-off'}" data-action="legacy-call" data-call="${boxId?'toggleBoxShinySkin':'toggleShinySkin'}" data-call-args="${boxId?`'${boxId}'`:idx}"><span class="poke-detail-shiny-star">★</span><span>${isShiny?t('shiny_skin_on'):t('shiny_skin_off')}</span></button>` : '';
 const evos = getEvolutionMethodsHtml(p.id);
 inner.innerHTML = `<div class="modal-title poke-detail-title">
   <div>${isShiny?'<span class="shiny-tag">★</span>':''}${p.name} <span class="poke-detail-id">#${p.id}</span></div>
   <span class="modal-close" data-action="close-poke-modal" data-reset-move-editor="true" data-reset-box-move="true">✕</span>
 </div>
 <div class="poke-detail-shell">
   <section class="poke-detail-hero">
     <div class="poke-detail-name-row"><div><b>${p.name}</b><span>${t('level_word')} ${p.level||1}${locLabel?` · ${locLabel}`:''}</span></div></div>
     <div class="poke-detail-sprite-card ${isShiny?'is-shiny':''}">${spriteImg(p.id,p.emoji,{shiny:isShiny,size:132})}</div>
     <div class="poke-detail-types">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
     ${shinyToggle}
     ${pokemonProtectionControlsHtml(p, idx, boxId, readonly)}
   </section>
   <aside class="poke-detail-side">
     <div class="poke-detail-stat-tabs">
       <button class="poke-detail-stat-tab active" data-stat-tab="base" data-action="legacy-call" data-call="switchPokemonStatTab" data-call-args="'base'">Base Stats</button>
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
 </section>`;
 modal.classList.add('poke-detail-front');
 modal.classList.add('open');
 if(typeof applyDynamicStyles === 'function') applyDynamicStyles(inner);
 else if(typeof window !== 'undefined' && window.applyDynamicStyles) window.applyDynamicStyles(inner);
}

function openPokeModal(idx){
 const p=G.team[idx];
 if(!p){ moveEditorFor=null; return; }
 renderPokemonDetailModal(p,{idx, locationLabel:t('team_location_clean')});
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
 const mv = MOVES[moveId];
 if(!mv) return;
 const inner = document.getElementById('poke-modal-inner');
 if(!inner) return;
 _moveInfoContext = { idx: contextIdx !== undefined ? contextIdx : null, boxId: contextBoxId || null };
 const name = getMoveName(moveId);
 const type = mv.type || '?';
 const cat = mv.cat === 'phys' ? t('move_cat_physical') : mv.cat === 'spec' ? t('move_cat_special') : t('move_cat_status');
 const pow = mv.pow || '-';
 const acc = mv.acc || '-';

 
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

 const effHtml = effects.length ? effects.map(e=>`<div class="extracted-template-style-096">✦ ${e}</div>`).join('') : `<div class="extracted-template-style-090">${t('no_special_effects')}</div>`;
 const typeColor = TYPE_COLORS[type] || '#888';
 const moveDesc = (typeof MOVE_DESCRIPTIONS !== 'undefined' && MOVE_DESCRIPTIONS[moveId]) ? MOVE_DESCRIPTIONS[moveId] : '';

 inner.innerHTML = `<div class="modal-title">
 <div class="extracted-template-style-006">
 <span class="type-badge ${typeClass(type)} pw-type-info">${type}</span>
 <div>${name}</div>
 <span class="extracted-template-style-090">${cat}</span>
 </div>
 <span class="modal-close" data-action="close-poke-modal"></span>
 </div>
 <div class="extracted-template-style-097">
 <div class="extracted-template-style-098">
 <div class="extracted-template-style-090">${t('item_power')}</div>
 <div>${pow}</div>
 </div>
 <div class="extracted-template-style-098">
 <div class="extracted-template-style-090">${t('accuracy')}</div>
 <div>${acc}%</div>
 </div>
 </div>
 ${moveDesc?`<div class="extracted-template-style-008"><div class="extracted-template-style-005">${t('description')}</div><div class="extracted-template-style-090">${moveDesc}</div></div>`:''}
 <div class="extracted-template-style-008">
 <div class="extracted-template-style-005">${t('effects')}</div>
 ${effHtml}
 </div>
 <div class="extracted-template-style-099">
 <button class="hbtn extracted-bridge-style-027" data-action="back-to-move-context">← ${t('back_to_pokemon')}</button>
 <button class="hbtn" data-action="close-poke-modal" data-reset-move-info="true">${t('close')}</button>
 </div>`;
 document.getElementById('poke-modal').classList.add('open');
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

export {};

