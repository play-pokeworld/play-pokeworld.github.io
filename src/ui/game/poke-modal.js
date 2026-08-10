// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
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
function pokemonProtectionModel(p, idx, boxId, readonly){
 if(readonly || !p) return null;
 const favArgs = boxId ? `null, '${boxId}'` : `${idx}, ''`;
 return {
   favorite: { on: !!p.favorite, label: p.favorite ? t('pokemon_favorite_on') : t('pokemon_favorite_off'), call: 'togglePokemonFavorite', args: favArgs },
   lock: { on: !!p.locked, label: p.locked ? t('pokemon_locked_on') : t('pokemon_locked_off'), iconHtml: (typeof getIcon==='function'?getIcon('close',12):'×'), call: 'togglePokemonLock', args: favArgs },
 };
}

function buildTalentModel(p, idx, boxId){
 const nid = Number(p.id);
 const tals = getSpeciesTalents(nid);
 const locked = isPokemonLockedForBattleEdits(p, idx, boxId);

 if(!G.unlockedTalents) G.unlockedTalents = {};
 if(!G.unlockedTalents[nid]) G.unlockedTalents[nid] = [tals[0]];
 if(p.talent && !G.unlockedTalents[nid].includes(p.talent)) G.unlockedTalents[nid].push(p.talent);

 const uniqueTals = [];
 tals.forEach(tal => {
   if(!uniqueTals.includes(tal)) {
     uniqueTals.push(tal);
   }
 });

 const options = uniqueTals.map(tal => {
   const unlocked = (G.unlockedTalents?.[nid] || []).includes(tal) || (G.unlockedTalents?.[nid] || []).map(x=>String(x).toLowerCase()).includes(String(tal).toLowerCase());
   const talName = getTalentName(tal);
   const talInfo = (typeof getTalentRecord === 'function') ? getTalentRecord(tal) : (TALENTS_FULL && TALENTS_FULL[tal]);
   const rarityLabel = talInfo ? getRarityLabel(talInfo.rarity) : 'Inconnu';
   if(!unlocked){
     return { value: '', label: `  ${talName} [${rarityLabel}] — (${t('locked_talent_hint')})`, disabled: true };
   }
   return { value: tal, label: ` ${talName} [${rarityLabel}]`, selected: p.talent === tal };
 });

 // Hidden ability display (same resolution as before)
 let hidden = null;
 try {
   const pokeData = (typeof POKEMON_TALENTS !== 'undefined') ? POKEMON_TALENTS[nid] : null;
   const hiddenTal = pokeData ? pokeData.hiddenAbility : null;
   if (hiddenTal && typeof getTalentName === 'function') {
     const haInfo = (typeof getTalentRecord === 'function') ? getTalentRecord(hiddenTal) : (TALENTS_FULL && TALENTS_FULL[hiddenTal] ? TALENTS_FULL[hiddenTal] : null);
     hidden = {
       isHidden: true,
       label: (t('hidden_ability_label')||'Talent Caché') + ': ' + getTalentName(hiddenTal),
       rarity: haInfo && haInfo.rarity ? getRarityLabel(haInfo.rarity) : '',
       desc: haInfo ? getTalentDesc(hiddenTal) : '',
     };
   }
 } catch(_) {}

 return {
   readonly: false,
   locked,
   lockMsg: locked ? battleEditLockMessage() : '',
   title: t('pokemon_talents'),
   iconHtml: (typeof getIcon==='function'?getIcon('training',14):''),
   changeArgs: `${idx!=null?idx:'null'}, '${boxId||''}', this.value`,
   options,
   desc: p.talent ? getTalentDesc(p.talent) : '',
   hidden,
 };
}

function readonlyTalentModel(p){
 // Phase 24: a Pokemon in GAME always has an ability — if the detailed
 // sheet cannot resolve the TALENTS_FULL entry (old camelCase save),
 // we display the raw name rather than the alarmist "No ability".
 const chips = [];
 if (p.talent) {
   const info = (typeof getTalentRecord === 'function') ? getTalentRecord(p.talent) : (TALENTS_FULL && TALENTS_FULL[p.talent]);
   chips.push({
     label: getTalentName(p.talent),
     rarity: info ? getRarityLabel(info.rarity) : '',
     desc: getTalentDesc(p.talent) || '',
   });
 }
 try {
   const pokeData = (typeof POKEMON_TALENTS !== 'undefined') ? POKEMON_TALENTS[Number(p.id)] : null;
   const hiddenTal = pokeData ? pokeData.hiddenAbility : null;
   if (hiddenTal && typeof getTalentName === 'function') {
     const haInfo = (typeof getTalentRecord === 'function') ? getTalentRecord(hiddenTal) : (TALENTS_FULL && TALENTS_FULL[hiddenTal] ? TALENTS_FULL[hiddenTal] : null);
     chips.push({
       isHidden: true,
       label: (t('hidden_ability_label')||'Talent Caché') + ': ' + getTalentName(hiddenTal),
       rarity: haInfo && haInfo.rarity ? getRarityLabel(haInfo.rarity) : '',
       desc: haInfo ? getTalentDesc(hiddenTal) : '',
     });
   }
 } catch(_) {}
 return { readonly: true, title: t('pokemon_talents'), chips, emptyLabel: t('no_talent_species')||'No talent' };
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

function pokemonDetailStatsModel(p){
 const labels = [t('stat_hp'), t('stat_atk'), t('stat_def'), t('stat_spa'), t('stat_spd'), t('stat_spe')];
 const keys = ['hp','atk','def','spa','spd','spe'];
 const baseVals = [p.maxHP||p.hp||0, p.atk||0, p.def||0, p.spa||p.atk||0, p.spd||p.def||0, p.spe||0];
 const maxVals = [500,220,220,220,220,220];
 const colors = ['#60BE58','#D3425F','#539DDF','#EF90E6','#B763CF','#FBA64C'];
 return {
   base: labels.map((label,i)=>({ name: label, pct: Math.min(100, Math.round(baseVals[i]/maxVals[i]*100)), color: colors[i], value: baseVals[i] })),
   iv: labels.map((label,i)=>{ const val=(p.ivs||{})[keys[i]]||0; return { name: label, pct: Math.round(val/6*100), color: colors[i], value: `${val}/6` }; }),
   ev: labels.map((label,i)=>{ const val=(p.evs||{})[keys[i]]||0; return { name: label, pct: Math.round(val/6*100), color: colors[i], value: `${val}/6` }; })
 };
}

function pokemonDetailMoveModels(p, opts){
 opts = opts || {};
 const idx = opts.idx;
 const boxId = opts.boxId;
 const readonly = !!opts.readonly;
 const locked = !!opts.locked;
 const replaceSlot = boxId ? globalThis.boxMoveReplaceSlot : (typeof moveReplaceSlot !== 'undefined' ? moveReplaceSlot : null);
 const canReplace = !readonly && !locked && replaceSlot !== null;
 const full = (p.moves||[]).length >= 4 && !canReplace;
 const knownRows = (p.moves||[]).map((m, mi)=>({m: typeof m === 'string' ? {id:m} : m, mi})).filter(entry => entry.m && MOVES[entry.m.id]).map(({m, mi})=>{
   const mv = MOVES[m.id];
   const selected = !readonly && !locked && replaceSlot === mi;
   const ctxMoveArgs = boxId ? `'${m.id}',null,'${boxId}'` : (idx != null ? `'${m.id}',${idx}` : `'${m.id}'`);
   return {
     name: getMoveName(m.id),
     typeCls: typeClass(mv?.type||'?'),
     typeName: (typeof getTypeName==='function'?getTypeName(mv?.type):mv?.type)||'?',
     typeColor: TYPE_COLORS[mv?.type||'']||'#555',
     meta: `${mv?.pow||0} ${t('power_abbrev')} · ${mv?.cat||''}`,
     stateClass: selected ? 'selected' : '',
     title: locked ? battleEditLockMessage() : t('click_replace_context_info'),
     action: (readonly || locked) ? null : (boxId
       ? { action: 'legacy-call', call: 'toggleBoxMoveSelect', callArgs: `'${boxId}',${mi}` }
       : { action: 'legacy-call', call: 'toggleMoveSelect', callArgs: `${idx},${mi}` }),
     context: { call: 'openMoveInfo', args: ctxMoveArgs },
     pill: selected ? { label: t('replacement_badge'), class: 'danger' } : null,
   };
 });
 const pool = readonly ? [] : learnableMoves(p);
 const learnRows = pool.map(id=>{
   const mv = MOVES[id];
   const active = !locked && (canReplace || !full);
   const ctxLearnArgs = boxId ? `'${id}',null,'${boxId}'` : (idx != null ? `'${id}',${idx}` : `'${id}'`);
   return {
     name: getMoveName(id),
     typeCls: typeClass(mv?.type||'?'),
     typeName: (typeof getTypeName==='function'?getTypeName(mv?.type):mv?.type)||'?',
     typeColor: TYPE_COLORS[mv?.type||'']||'#555',
     meta: `${mv?.pow||0} ${t('power_abbrev')} · ${mv?.cat||''}`,
     stateClass: `learnable${active ? ' clickable' : ''}`,
     title: locked ? battleEditLockMessage() : t('context_info_touch'),
     action: active ? (boxId
       ? { action: 'legacy-call', call: 'learnBoxMove', callArgs: `'${boxId}','${id}'` }
       : { action: 'legacy-call', call: 'learnMove', callArgs: `${idx},'${id}'` }) : null,
     context: { call: 'openMoveInfo', args: ctxLearnArgs },
     pill: active ? { label: '+', class: '' } : null,
   };
 });
 return { knownRows, learnRows, canReplace, full };
}

function renderPokemonDetailModal(p, opts){
 opts = opts || {};
 if(!p) return;
 const modal = document.getElementById('poke-modal');
 const inner = document.getElementById('poke-modal-inner');
 if(!modal || !inner) return;
 // Trace of or viennent the panels of info ouverts from this fiche
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
 // Wave 10 (ECS DS): the fiche is now 100% design-system — the adapter
 // only shapes MODELS (stat rows, talent selector/chips, rank, evolution
 // methods, move rows, shiny/protection toggles); PokeDetailView renders
 // every block through DS components. All behavioral contracts kept.
 const statsModel = pokemonDetailStatsModel(p);
 const moveModels = pokemonDetailMoveModels(p, {idx, boxId, readonly, locked});
 const talentModel = readonly ? readonlyTalentModel(p) : buildTalentModel(p, idx!=null?idx:null, boxId||null);
 const shinyToggle = (!readonly && shinyUnlocked)
   ? { on: isShiny, label: isShiny ? t('shiny_skin_on') : t('shiny_skin_off'), call: boxId ? 'toggleBoxShinySkin' : 'toggleShinySkin', args: boxId ? `'${boxId}'` : String(idx) }
   : null;
 const evosModel = (typeof getEvolutionMethodsModel === 'function') ? getEvolutionMethodsModel(p.id) : null;
 // Get localized name
 const _pName = typeof getPokeName === 'function' ? getPokeName(p.id) : p.name;
 const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || typeof views.PokeDetailView !== 'function') throw new Error('[ui] PokeUI views not loaded (PokeDetailView)');
 const _rank = typeof getPokemonRank === 'function' ? getPokemonRank(p.id) : '?';
 const _bst = typeof getPokemonBaseStatTotal === 'function' ? getPokemonBaseStatTotal(p.id) : '';
 const _detailSections = [
   { title: t('pokemon_talents'), kind: 'talent', talent: talentModel },
   { title: t('pokemon_rank'), kind: 'rank', rank: { rank: _rank, bst: _bst, label: t('pokemon_rank') } },
 ];
 if(evosModel) _detailSections.push({ title: t('evolutions_title') || 'Evolutions', kind: 'evos', evos: evosModel, wide: true });
 const fullListBtnHtml = readonly ? '' : `<button class="hbtn poke-detail-full-list-btn" data-style="width:calc(100% - 24px);margin:8px auto 4px;display:block;" data-action="legacy-call" data-call="openLearnableMovesPanel" data-call-args="${boxId ? `'box','${boxId}'` : `'team',${idx != null ? idx : 0}`}">${typeof t==='function'?t('view_all_learnable_moves'):'View All Learnable Moves'}</button>`;
 _pwSetHtmlSafe(inner, views.PokeDetailView.toHTML({
  titleHtml: `${isShiny?'<span class="shiny-tag">★</span>':''}${_pName} <span class="poke-detail-id">#${p.id}</span>`,
  hero: {
   nameHtml: `<b>${_pName}</b><span>${t('level_word')} ${p.level||1}${locLabel?` · ${locLabel}`:''}</span>`,
   spriteHtml: spriteImg(p.id,p.emoji,{shiny:isShiny,size:132}),
   spriteClass: `poke-detail-sprite-card${isShiny?' is-shiny':''}`,
   typesHtml: `${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}`,
   shinyToggle: shinyToggle,
   protections: pokemonProtectionModel(p, idx, boxId, readonly),
  },
  stats: {
   tabs: [
     { id: 'base', label: t('base_stats_tab')||'Base Stats', active: true },
     { id: 'iv', label: 'IV' },
     { id: 'ev', label: 'EV' },
   ],
   panels: [
     { id: 'base', active: true, rows: statsModel.base },
     { id: 'iv', rows: statsModel.iv },
     { id: 'ev', rows: statsModel.ev },
   ],
  },
  sections: _detailSections,
  moves: {
   titleLabel: t('moves_lbl'),
   cancelHtml: moveModels.canReplace ? `<button class="hbtn poke-detail-mini-btn" data-action="${boxId?'cancel-box-move-replace':'cancel-move-replace'}" ${boxId?`data-box-id="${boxId}"`:`data-team-index="${idx}"`}>${t('cancel')}</button>` : '',
   knownRows: moveModels.knownRows,
   knownEmptyLabel: t('no_other_moves'),
   learn: readonly ? null : {
     titleLabel: t('learnable_moves_title'),
     hintHtml: locked?`<span>${battleEditLockMessage()}</span>`:moveModels.full?`<span>${t('select_move_first')}</span>`:'',
     rows: moveModels.learnRows,
     emptyLabel: t('no_other_moves'),
   },
   fullListBtnHtml: fullListBtnHtml,
  },
 }));
 if(typeof window!=='undefined' && typeof window.pwModalInfo==='function') window.pwModalInfo(false);
 modal.classList.add('poke-detail-front');
 modal.classList.add('open');
 if(typeof applyDynamicStyles === 'function') applyDynamicStyles(inner);
 else if(typeof window !== 'undefined' && window.applyDynamicStyles) window.applyDynamicStyles(inner);
}


function openPokeModal(idx){
  window._POKEMODAL_SOURCE = 'team';
  const p = (typeof G !== 'undefined' && G && G.team) ? G.team[idx] : null;
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

let _moveInfoContext = null;

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
 // NB: mv.acc is not displayed (absent from the data -> always 100 in the engine).

 
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
       const badge = typeof getBadgeHtml === 'function' ? getBadgeHtml(e) : null;
       // Wave 29: effContent must be DECLARED per effect row — assigning to
       // an undeclared identifier throws in ES-module strict mode whenever
       // getBadgeHtml returns a badge (the whole move-info panel crashed
       // with "effContent is not defined").
       let effContent;
       if (badge && typeof badge === 'string') { bg = 'transparent'; border = 'none'; color = 'inherit'; effContent = badge; }
       const effContentVar = effContent !== undefined ? effContent : '✦ ' + e;
       return `<div data-style="background:var(--pm-note-bg);border:var(--pm-note-border);color:var(--pm-note-c);padding:8px 12px;border-radius:8px;font-size:12.5px;font-weight:bold;margin:6px 0;display:flex;align-items:center;gap:6px;box-shadow:0 2px 4px rgba(0,0,0,0.15);width:100%;box-sizing:border-box;" style="--pm-note-bg:${bg};--pm-note-border:${border};--pm-note-c:${color};">${effContentVar}</div>`;
     }).join('') 
   : `<div class="pw-text-sm pw-light1">${t('no_special_effects')}</div>`;
 // Phase 24b: resolve the description through t() first, otherwise the
 // translation was never displayed.
 let moveDesc = '';
 if(typeof t === 'function'){
   const locDesc = t('move_descs.' + moveId);
   if(locDesc && locDesc !== 'move_descs.' + moveId) moveDesc = locDesc;
 }
 if(!moveDesc) moveDesc = mv.desc || (typeof MOVE_DESCRIPTIONS !== 'undefined' && MOVE_DESCRIPTIONS[moveId]) || '';
 moveDesc = typeof replaceWeatherTerms === 'function' ? replaceWeatherTerms(moveDesc) : moveDesc;
 // Phase 24: STATUS words (burn, poison, paralysis…) are also
 // colored, like weather and field terms already are.
 moveDesc = typeof replaceStatusTerms === 'function' ? replaceStatusTerms(moveDesc) : moveDesc;

 // Remember where this panel comes from (dictionary, sheet, bag…) for the back button.
 // Remember where this panel comes from: explicit context (click from a
 // Pokemon sheet, passed via data-context-args) takes priority, otherwise deduce
 // from the current screen (fullscreen panel, sheet, bag…).
 if (contextBoxId != null && contextBoxId !== '') {
   window._pwInfoSource = { kind: 'box', boxId: contextBoxId };
 } else if (contextIdx !== undefined && contextIdx !== null) {
   // idx >= 0 : opened from the team sheet -> back to the sheet.
   // idx < 0  : explicit "no sheet" context (move pill clicked
   // on a card of the team / battle window, sheet possibly
   // visible behind) -> back must simply close the panel
   // Phase 7 — legacy feature update
   window._pwInfoSource = (Number(contextIdx) >= 0) ? { kind: 'team', idx: contextIdx } : null;
 } else {
   window._pwInfoSource = (typeof window.pwInfoCaptureSource === 'function') ? window.pwInfoCaptureSource() : null;
 }
 if (typeof window !== 'undefined' && typeof window.pwModalInfo === 'function') window.pwModalInfo(true);

 const _infoSections = [];
 if (moveDesc) _infoSections.push({ title: t('description'), body: '<div class="pw-text-sm pw-light1">' + moveDesc + '</div>' });
 _infoSections.push({ title: t('effects'), body: effHtml });

 // Phase 26: list of Pokemon that can learn the move, by the game's
 // legitimate category (level / TM-HM / training) — the dictionary no longer
 // shows these lists; they live here in the info panel.
 if (typeof getMoveLearners === 'function') {
   const _learners = getMoveLearners(moveId);
   const _mkChips = function (ids) {
     const cap = 24, shown = ids.slice(0, cap);
     let chipsHtml = shown.map(function (sid) { return '<span class="dict-chip">#' + sid + ' ' + (typeof getPokeName === 'function' ? getPokeName(sid) : sid) + '</span>'; }).join('');
     if (ids.length > shown.length) chipsHtml += '<span class="dict-muted">' + tr('dict_and_n_more', { count: ids.length - shown.length }) + '</span>';
     return chipsHtml;
   };
   let _learnBody = '';
   ['level', 'ctcs', 'training'].forEach(function (catKey) {
     const ids = _learners[catKey] || [];
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
     // Power and Category on the same line; Accuracy is not displayed
     // (mv.acc missing from the data -> always 100 in the engine).
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
 if(typeof window.pwApplyWindowChrome==='function') window.pwApplyWindowChrome(inner); // wave 30: canonical window chrome
 document.getElementById('poke-modal').classList.add('open');
}



// ── panel of the moves apprenables by espece (categorise) ──
function openLearnableMovesPanel(idxOrBoxId, opts) {
  // Phase 8: the source can be EXPLICIT — either as first argument ('team' or
  // 'box', passed by the sheet button), or via opts.source (internal calls,
  // e.g. refresh) — otherwise the ambient fallback could resolve to another
  // Pokemon (misleading indicators / truncated list).
  let forced = null;
  if (idxOrBoxId === 'team' || idxOrBoxId === 'box') { forced = idxOrBoxId; idxOrBoxId = opts; opts = null; }
  else if (opts && (opts.source === 'team' || opts.source === 'box')) forced = opts.source;
  let p = null;
  let source = null;
  if (forced === 'box' && typeof G !== 'undefined' && G && G.collection) {
    source = 'box';
    p = G.collection[idxOrBoxId] || G.collection[String(idxOrBoxId)];
  } else if (forced === 'team' && typeof G !== 'undefined' && G && G.team) {
    source = 'team';
    const fidx = Number(idxOrBoxId);
    if (!Number.isNaN(fidx)) { p = G.team[fidx]; idxOrBoxId = fidx; }
  }
  if (!source) {
  // Primary source of truth: the currently rendered sheet (_pwPokeSheet
  // is set by renderPokemonDetailModal on each sheet render, whereas the
  // ambient _POKEMODAL_SOURCE may be stale) — otherwise the indicators
  // Phase 7 — legacy feature update
  const sheet = (typeof window !== 'undefined') ? window._pwPokeSheet : null;
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
      const idx = Number(idxOrBoxId);
      if (!Number.isNaN(idx) && typeof G !== 'undefined' && G && G.team && G.team[idx]) {
        p = G.team[idx];
      }
    }
  }
  }
  if (!p) return;

  // Contexte memorise for the rafraichissement in place of the indicateurs
   // Pokemon info modal and move learning UI
  window._pwLearnableCtx = { source: source, id: idxOrBoxId };

  const inner = document.getElementById('poke-modal-inner');
  if (!inner) return;

  const fullPool = (typeof getSpeciesFullLearnablePool === 'function') ? getSpeciesFullLearnablePool(p.id) : [];
  const levelPool = (typeof getSpeciesMovePool === 'function') ? getSpeciesMovePool(p.id) : [];
  const knownSet = new Set((p.moves || []).map(function(m) { return typeof m === 'string' ? m : m.id; }).filter(Boolean));

  // Build CT/CS moveId set from items-data
  const ctMoveSet = {};
  if (typeof window !== 'undefined' && window.ITEMS) {
    for (const itemKey in window.ITEMS) {
      const item = window.ITEMS[itemKey];
      if (item && (item.type === 'ct' || item.type === 'cs') && item.moveId) {
        ctMoveSet[item.moveId] = itemKey;
      }
    }
  }

  // Phase 10 — legacy feature update
  // getSpeciesTrainingOnlyPool (source unique partagee with the dressage),
   // Pokemon info modal and move learning UI
  const levelUpMoves = [], trainingMoves = [], ctMoves = [];
  const levelSet = {};
  for (let li = 0; li < levelPool.length; li++) levelSet[levelPool[li]] = true;
  let trainingOnlySet = null;
  if (typeof getSpeciesTrainingOnlyPool === 'function') {
    trainingOnlySet = new Set(getSpeciesTrainingOnlyPool(p.id));
  }

  for (let pi = 0; pi < fullPool.length; pi++) {
    const mid = fullPool[pi];
    const mv = (typeof MOVES !== 'undefined') ? MOVES[mid] : null;
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
      const ma = (typeof MOVES !== 'undefined') ? MOVES[a] : null;
      const mb = (typeof MOVES !== 'undefined') ? MOVES[b] : null;
      if (!ma || !mb) return 0;
      if (ma.type !== mb.type) return (ma.type || '').localeCompare(mb.type || '');
      return (mb.power || 0) - (ma.power || 0);
    });
  }
  sortPool(levelUpMoves);
  sortPool(trainingMoves);
  sortPool(ctMoves);

  const totalCount = levelUpMoves.length + trainingMoves.length + ctMoves.length;
  let knownCount = 0;
  fullPool.forEach(function(id) { if (knownSet.has(id)) knownCount++; });

  // Phase 9: an "owned" move = equipped or learnable right now
  // (unlocked by the reached level, training or a TM — same computation
  // as the sheet's "learnable moves" list, otherwise the indicators only
  // reflected the 4 equipped ones, user feedback).
  const availSet = new Set((typeof learnableMoves === 'function') ? learnableMoves(p) : []);
  let availCount = 0;
  fullPool.forEach(function(id) { if (!knownSet.has(id) && availSet.has(id)) availCount++; });

  const titleKey = (typeof t === 'function') ? t('learnable_moves_panel_title') : 'Learnable Moves';
  const countLabel = (knownCount + availCount) + '/' + totalCount + ' ' + ((typeof t === 'function') ? t('possessed_short') : 'owned');
  const pillEquipped = (typeof t === 'function') ? (t('move_pill_equipped') || 'Équipée') : 'Équipée';
  const pillAvailable = (typeof t === 'function') ? (t('move_pill_available') || 'Disponible') : 'Disponible';

  // Wave 9 (ECS DS): the panel SHELL is rendered from zero by
  // LearnableMovesPanelView (+ the shared move-row component). The classic
  // adapter keeps shaping the MODEL — same row data as before: type badge,
  // name, power meta, state class, equipped/available pill, right-click
  // context args (data-context-call="openMoveInfo").
  function sectionModel(moveIds, sectionLabel, emptyMsg) {
    const moves = [];
    for (let ri = 0; ri < (moveIds || []).length; ri++) {
      const id = moveIds[ri];
      const mv = (typeof MOVES !== 'undefined') ? MOVES[id] : null;
      if (!mv) continue;
      const isKnown = knownSet.has(id);
      const isAvailable = !isKnown && availSet.has(id);
      let ctxArg = "'" + id + "'";
      if (source === 'box' && idxOrBoxId != null) ctxArg += ",null,'" + idxOrBoxId + "'";
      else if (idxOrBoxId != null && !Number.isNaN(Number(idxOrBoxId))) ctxArg += ',' + Number(idxOrBoxId);
      moves.push({
        name: (typeof getMoveName === 'function') ? getMoveName(id) : id,
        typeCls: (typeof window !== 'undefined' && typeof window.typeClass === 'function') ? window.typeClass(mv.type) : '',
        typeName: (typeof getTypeName === 'function') ? getTypeName(mv.type) : (mv.type || '?'),
        typeColor: (typeof TYPE_COLORS !== 'undefined') ? (TYPE_COLORS[mv.type] || '#888') : '#888',
        meta: (mv.power || 0) + ' · ',
        stateClass: isKnown ? 'known' : (isAvailable ? 'learnable' : 'learnable locked'),
        pill: isKnown ? { label: '✓ ' + pillEquipped, class: 'is-known' }
             : (isAvailable ? { label: '✓ ' + pillAvailable, class: 'is-learnable' } : null),
        contextArgs: ctxArg,
      });
    }
    return { label: sectionLabel, count: moves.length, emptyMsg: emptyMsg, moves: moves };
  }

  const sectionsModel = [
    sectionModel(levelUpMoves,
      (typeof t === 'function') ? t('category_level_up') : '★ Level-up',
      (typeof t === 'function') ? t('no_level_up_moves') : 'No level-up moves'),
    sectionModel(ctMoves,
      (typeof t === 'function') ? t('category_ct_cs') : '◇ TM/CS',
      (typeof t === 'function') ? t('no_ct_moves') : 'No TM/CS moves'),
    sectionModel(trainingMoves,
      (typeof t === 'function') ? t('category_training') : '▽ Training',
      (typeof t === 'function') ? t('no_training_moves') : 'No training-only moves'),
  ];

  if (typeof window !== 'undefined' && typeof window.pwModalInfo === 'function') window.pwModalInfo(false);

 const backKey = (typeof t === 'function') ? t('back_to_pokemon') : '← Back to Pokémon';
  const closeKey = (typeof t === 'function') ? t('close') : 'Close';
  const backCall = (source === 'box' && idxOrBoxId) ? 'openBoxPokeModal' : 'openPokeModal';

  const views = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
  if (!views || typeof views.LearnableMovesPanelView !== 'function') throw new Error('[ui] PokeUI views not loaded (LearnableMovesPanelView)');
  _pwSetHtmlSafe(inner, views.LearnableMovesPanelView.toHTML({
    title: titleKey,
    countLabel: countLabel,
    sections: sectionsModel,
    back: { label: backKey, call: backCall, args: String(idxOrBoxId) },
    closeLabel: closeKey,
  }));

  document.getElementById('poke-modal').classList.add('open');
}

// Recompute the "all learnable moves" panel if it is open,
// so the "move learned" indicators immediately reflect a
 // Pokemon info modal and move learning UI
// Phase 8: double guard against "spontaneous reopening" — the DOM marker
// survives the modal closing (innerHTML kept); without checking that the
// modal is REALLY open, a training unlock would reopen the panel
// by itself (user feedback).
function refreshLearnableMovesPanelIfOpen() {
  try {
    const pm = document.getElementById('poke-modal');
    if (!pm || !pm.classList || !pm.classList.contains('open')) return;
    const inner = document.getElementById('poke-modal-inner');
    if (!inner || !inner.querySelector('[data-learnable-panel]')) return;
    const ctx = window._pwLearnableCtx;
    if (!ctx) return;
    openLearnableMovesPanel(ctx.id, { source: ctx.source });
  } catch (_) {}
}

// --- Migrated to ES module, globals exposed ---
if (typeof switchPokemonStatTab !== 'undefined') { if (typeof window !== 'undefined') window.switchPokemonStatTab = switchPokemonStatTab; if (typeof globalThis !== 'undefined') globalThis.switchPokemonStatTab = switchPokemonStatTab; }
if (typeof renderPokemonDetailModal !== 'undefined') { if (typeof window !== 'undefined') window.renderPokemonDetailModal = renderPokemonDetailModal; if (typeof globalThis !== 'undefined') globalThis.renderPokemonDetailModal = renderPokemonDetailModal; }
if (typeof isPokemonLockedForBattleEdits !== 'undefined') { if (typeof window !== 'undefined') window.isPokemonLockedForBattleEdits = isPokemonLockedForBattleEdits; if (typeof globalThis !== 'undefined') globalThis.isPokemonLockedForBattleEdits = isPokemonLockedForBattleEdits; }
if (typeof notifyBattleEditLocked !== 'undefined') { if (typeof window !== 'undefined') window.notifyBattleEditLocked = notifyBattleEditLocked; if (typeof globalThis !== 'undefined') globalThis.notifyBattleEditLocked = notifyBattleEditLocked; }
if (typeof togglePokemonFavorite !== 'undefined') { if (typeof window !== 'undefined') window.togglePokemonFavorite = togglePokemonFavorite; if (typeof globalThis !== 'undefined') globalThis.togglePokemonFavorite = togglePokemonFavorite; }
if (typeof togglePokemonLock !== 'undefined') { if (typeof window !== 'undefined') window.togglePokemonLock = togglePokemonLock; if (typeof globalThis !== 'undefined') globalThis.togglePokemonLock = togglePokemonLock; }
if (typeof changePokeTalent !== 'undefined') { if (typeof window !== 'undefined') window.changePokeTalent = changePokeTalent; if (typeof globalThis !== 'undefined') globalThis.changePokeTalent = changePokeTalent; }
if (typeof openReadonlyPokeModal !== 'undefined') { if (typeof window !== 'undefined') window.openReadonlyPokeModal = openReadonlyPokeModal; if (typeof globalThis !== 'undefined') globalThis.openReadonlyPokeModal = openReadonlyPokeModal; }
if (typeof openBattleEnemyPokeModal !== 'undefined') { if (typeof window !== 'undefined') window.openBattleEnemyPokeModal = openBattleEnemyPokeModal; if (typeof globalThis !== 'undefined') globalThis.openBattleEnemyPokeModal = openBattleEnemyPokeModal; }
if (typeof openPokeModal !== 'undefined') { if (typeof window !== 'undefined') window.openPokeModal = openPokeModal; if (typeof globalThis !== 'undefined') globalThis.openPokeModal = openPokeModal; }
if (typeof openPokeInfo !== 'undefined') { if (typeof window !== 'undefined') window.openPokeInfo = openPokeInfo; if (typeof globalThis !== 'undefined') globalThis.openPokeInfo = openPokeInfo; }
if (typeof openMoveInfo !== 'undefined') { if (typeof window !== 'undefined') window.openMoveInfo = openMoveInfo; if (typeof globalThis !== 'undefined') globalThis.openMoveInfo = openMoveInfo; }



function openBoxPokeModal(boxId) {
  window._POKEMODAL_SOURCE = 'box';
  const p = (typeof G !== 'undefined' && G && G.collection) ? (G.collection[boxId] || G.collection[String(boxId)]) : null;
  if (!p) return;
  // NOT readonly — allows talent selection, shiny toggle, and move editing
  renderPokemonDetailModal(p, { boxId: boxId, readonly: false });
}
if (typeof openBoxPokeModal !== 'undefined') { if (typeof window !== 'undefined') window.openBoxPokeModal = openBoxPokeModal; if (typeof globalThis !== 'undefined') globalThis.openBoxPokeModal = openBoxPokeModal; }
if (typeof openLearnableMovesPanel !== 'undefined') { if (typeof window !== 'undefined') window.openLearnableMovesPanel = openLearnableMovesPanel; if (typeof globalThis !== 'undefined') globalThis.openLearnableMovesPanel = openLearnableMovesPanel; }
if (typeof refreshLearnableMovesPanelIfOpen !== 'undefined') { if (typeof window !== 'undefined') window.refreshLearnableMovesPanelIfOpen = refreshLearnableMovesPanelIfOpen; if (typeof globalThis !== 'undefined') globalThis.refreshLearnableMovesPanelIfOpen = refreshLearnableMovesPanelIfOpen; }


// --- Exported globals ---
if (typeof battleEditLockMessage !== 'undefined') { if (typeof window !== 'undefined') window.battleEditLockMessage = battleEditLockMessage; if (typeof globalThis !== 'undefined') globalThis.battleEditLockMessage = battleEditLockMessage; }
if (typeof samePokemonForBattleEditLock !== 'undefined') { if (typeof window !== 'undefined') window.samePokemonForBattleEditLock = samePokemonForBattleEditLock; if (typeof globalThis !== 'undefined') globalThis.samePokemonForBattleEditLock = samePokemonForBattleEditLock; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  switchPokemonStatTab,
  renderPokemonDetailModal,
  isPokemonLockedForBattleEdits,
  notifyBattleEditLocked,
  togglePokemonFavorite,
  togglePokemonLock,
  changePokeTalent,
  openReadonlyPokeModal,
  openBattleEnemyPokeModal,
  openPokeModal,
  openPokeInfo,
  openMoveInfo,
  openBoxPokeModal,
  openLearnableMovesPanel,
  refreshLearnableMovesPanelIfOpen,
  battleEditLockMessage,
  samePokemonForBattleEditLock,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('openPokeModal', openPokeModal); } catch (_) {} }
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('openBoxPokeModal', openBoxPokeModal); } catch (_) {} }
