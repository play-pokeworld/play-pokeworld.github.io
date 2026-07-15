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
 <div class="extracted-template-style-060">🧬 ${t('pokemon_talents')}</div>
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



function openPokeModal(idx){
 const p=G.team[idx];
 if(!p){ moveEditorFor=null; return; }
 const modal=document.getElementById('poke-modal');
 const inner=document.getElementById('poke-modal-inner');
 const editing=moveEditorFor===idx;
 const battleEditLocked = isPokemonLockedForBattleEdits(p, idx, null);
 if(battleEditLocked && moveReplaceSlot !== null) moveReplaceSlot = null;

 
 const moves=p.moves.map((m,mi)=>{
 const mv=MOVES[m.id];
 const mvName = getMoveName(m.id);
 const selected = !battleEditLocked && moveReplaceSlot === mi;
 const moveActionAttrs = battleEditLocked ? '' : ` data-action="legacy-call" data-call="toggleMoveSelect" data-call-args="${idx},${mi}"`;
 return `<div class="box-move-card ${selected?'is-selected':''}" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}"${moveActionAttrs} data-context-call="openMoveInfo" data-context-args="'${m.id}',${idx}" title="${battleEditLocked?battleEditLockMessage():t('click_replace_context_info')}">
 <span class="type-badge ${typeClass(mv?.type||'?')}">${mv?.type||'?'}</span>
 <span>${mvName}</span>
 ${selected?'<span class="extracted-template-style-018">'+t('replacement_badge')+'</span>':''}
 <span class="extracted-template-style-019">${t('power_abbrev')} ${mv?.pow||'-'}</span>
 </div>`;
 }).join('');

 
 const pool=learnableMoves(p);
 const canReplace = !battleEditLocked && moveReplaceSlot !== null;
 const full=p.moves.length>=4 && !canReplace;
 let learnHtml=`<div class="extracted-template-style-020">
  ${t('learnable_moves_title')}
 ${battleEditLocked?'<span class="extracted-template-style-021">'+battleEditLockMessage()+'</span>':''}
 ${!battleEditLocked&&canReplace?'<span class="extracted-template-style-021">'+t('click_to_replace_selected')+'</span>':''}
 ${!battleEditLocked&&full?'<span class="extracted-template-style-021">'+t('select_move_first')+'</span>':''}
 </div>
 <div class="extracted-template-style-022">
 ${pool.length?pool.map(id=>{
 const mv=MOVES[id];
 const clickAction = !battleEditLocked && (canReplace || !full) ? `learnMove(${idx},'${id}')` : '';
 const learnActionAttrs = clickAction ? ` data-action="legacy-call" data-call="learnMove" data-call-args="${idx},\'${id}\'"` : '';
 return `<div class="box-move-card box-move-card--learnable ${clickAction?'is-clickable':''} ${canReplace?'is-selectable':''}" data-type-color="${TYPE_COLORS[mv.type]||'#555'}"${learnActionAttrs} data-context-call="openMoveInfo" data-context-args="'${id}',${idx}" title="${battleEditLocked?battleEditLockMessage():t('context_info_touch')}">
 <span class="type-badge ${typeClass(mv.type)}">${mv.type}</span>
 <span>${getMoveName(id)}</span>
 <span class="extracted-template-style-019">${t('power_abbrev')} ${mv.pow||'-'}</span>
 ${!battleEditLocked&&canReplace?'<span class="extracted-template-style-017">⬆</span>':(!battleEditLocked&&!full?`<span class="extracted-template-style-017">+</span>`:'')}
 </div>`;
 }).join(''):`<div class="extracted-template-style-023">${t('no_other_moves')}</div>`}
 </div>`;

 const stLabels = [t('stat_hp'), t('stat_atk'), t('stat_def'), t('stat_spa'), t('stat_spd'), t('stat_spe')];
 const buff=getHeldBuff(p);
 const buffedAtk=Math.floor(p.atk*(1+(buff.atk||0)));
 const buffedDef=Math.floor(p.def*(1+(buff.def||0)));
 const buffedSpe=Math.floor(p.spe*(1+(buff.spe||0)));
 const buffedHP =Math.floor(p.maxHP*(1+(buff.hpMax||0)));
 const showDelta=(base,cur)=> cur>base ? `<span class="extracted-template-style-017"> +${cur-base}</span>` : '';
 const buffedSpa=Math.floor((p.spa||p.atk)*(1+(buff.spa||0)));
 const buffedSpd=Math.floor((p.spd||p.def)*(1+(buff.spd||0)));
 const stats=[
 [stLabels[0], buffedHP, 500, '#4caf50', p.maxHP],
 [stLabels[1], buffedAtk,200, '#f44336', p.atk],
 [stLabels[2], buffedDef,200, '#2196f3', p.def],
 [stLabels[3], buffedSpa,200, '#e91e63', p.spa||p.atk],
 [stLabels[4], buffedSpd,200, '#9c27b0', p.spd||p.def],
 [stLabels[5], buffedSpe,200, '#ff9800', p.spe],
 ];

 
 const itmKey=p.heldItem;
 const itm=(itmKey && ITEMS[itmKey]) ? {...ITEMS[itmKey], name:getItemName(itmKey), desc:getItemDesc(itmKey)} : null;
 const count=itmKey?Math.min(BAG_MAX,G.inventory[itmKey]||0):0;
 const heldBlock=itm
 ? `<div class="extracted-template-style-085">
 <div class="extracted-template-style-086">${t('equipped_item_label')}</div>
 <div class="extracted-template-style-087">
 <div class="extracted-template-style-024">${itm.icon}</div>
 <div class="extracted-template-style-088">
 <div class="extracted-template-style-089">${getItemName(itmKey)}</div>
 <div class="extracted-template-style-090">${t('item_power')} ${count}/${BAG_MAX} — buff ${Math.round(count/BAG_MAX*100)}%</div>
 </div>
 <button class="hbtn extracted-bridge-style-025" data-action="legacy-call" data-call="unequipItem" data-call-args="${idx}">${t('remove')}</button>
 </div>
 </div>`
 : `<div class="extracted-template-style-091">
 ${t('no_item_equipped_bag')}
 </div>`;

 inner.innerHTML=`<div class="modal-title">
 <div class="extracted-template-style-006">
 <div class="extracted-template-style-024" class="${p.shinyActive?'shiny-spark':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:72})}</div>
 <div>
 <div>${p.shinyActive?'<span class="shiny-tag"></span>':''}${p.name}</div>
 <div class="extracted-template-style-007">${t('level_word')} ${p.level}</div>
 <div class="extracted-template-style-026">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
 </div>
 </div>
 <span class="modal-close" data-action="close-poke-modal" data-reset-move-editor="true"></span>
 </div>
 ${p.shinyUnlocked?`<label class="extracted-template-style-027">
 <input type="checkbox"${p.shinyActive?'checked':''} data-change-call="toggleShinySkin" data-change-args="${idx}">
 <span> ${t('shiny_skin')}</span>
 <span class="extracted-template-style-019">${t('cosmetic_switch_only_team')}</span>
 </label>`:''}
 ${heldBlock}
 ${buildTalentSelectorHtml(p, idx, null)}
 ${getEvolutionMethodsHtml(p.id)}
 <div class="extracted-template-style-028">
 ${stats.map(([l,v,m,c,base], sIdx)=>{
 const keys = ['hp','atk','def','spa','spd','spe'];
 const k = keys[sIdx] || 'hp';
 const ivVal = (p.ivs||{})[k] || 0;
 const evVal = (p.evs||{})[k] || 0;
 return `<div class="stat-row extracted-bridge-style-001">
 <div class="extracted-template-style-029">
 <span class="stat-label extracted-bridge-style-002">${l}</span>
 <span class="stat-val extracted-bridge-style-003">${v}${showDelta(base,v)}</span>
 </div>
 <div class="stat-bar extracted-bridge-style-004"><div class="stat-fill" data-style="width:${Math.min(100,v/m*100)}%;background:${c}"></div></div>
 <div class="extracted-template-style-030">
 <span><b>IV:</b> ${renderStars(ivVal, false)} (${ivVal}/6)</span>
 <span><b>EV:</b> ${renderStars(evVal, true)} (${evVal}/6)</span>
 </div>
 </div>`;
 }).join('')}
 </div>
 <div class="extracted-template-style-031">
 <span class="extracted-template-style-007">${t('moves_lbl')}</span>
 ${!battleEditLocked&&moveReplaceSlot!==null?`<button class="hbtn extracted-bridge-style-005" data-action="cancel-move-replace" data-team-index="${idx}">${t('cancel')}</button>`:''}
 </div>
 ${moves}
 ${learnHtml}
 ${(() => {
 const curLevelBase = xpForLevel(p.level);
 const xpInLevel = Math.max(0, (p.xp||0) - curLevelBase);
 const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
 return `<div class="extracted-template-style-032">XP : ${xpInLevel} / ${xpReqLevel} <span class="extracted-template-style-033">(${p.xp||0} total)</span></div>`;
 })()}
 ${(() => {
 const evos = STONE_EVO[p.id];
 if(!evos) return '';
 let html = `<div class="extracted-template-style-034"><div class="extracted-template-style-035">${t('stone_evo_title')}</div><div class="extracted-template-style-036">`;
 for(const [stoneKey, targetId] of Object.entries(evos)){
 const stone = ITEMS[stoneKey];
 const owned = G.inventory[stoneKey]||0;
 const target = PD[targetId];
 const already = speciesOwned(targetId);
 html += `<button class="hbtn" data-action="legacy-call" data-call="tryStoneEvo" data-call-args="${idx},'${stoneKey}'"${owned<1||already?'disabled':''} title="${stone?.desc||''}">${stone?.icon||''} ${target?target[0]:'#'+targetId} ${owned>0?`(${owned})`:''}${already?' ':''}</button>`;
 }
 html += '</div></div>';
 return html;
 })()}
 `;

 modal.classList.add('open');
}


function openReadonlyPokeModal(p, contextLabel){
 if(!p) return;
 const modal=document.getElementById('poke-modal');
 const inner=document.getElementById('poke-modal-inner');
 if(!modal || !inner) return;
 const buff=(typeof getHeldBuff === 'function') ? getHeldBuff(p) : {atk:0,def:0,spe:0,spa:0,spd:0,hpMax:0};
 const buffedAtk=Math.floor((p.atk||0)*(1+(buff.atk||0)));
 const buffedDef=Math.floor((p.def||0)*(1+(buff.def||0)));
 const buffedSpe=Math.floor((p.spe||0)*(1+(buff.spe||0)));
 const buffedHP =Math.floor((p.maxHP||p.hp||0)*(1+(buff.hpMax||0)));
 const buffedSpa=Math.floor((p.spa||p.atk||0)*(1+(buff.spa||0)));
 const buffedSpd=Math.floor((p.spd||p.def||0)*(1+(buff.spd||0)));
 const stLabels = [t('stat_hp'), t('stat_atk'), t('stat_def'), t('stat_spa'), t('stat_spd'), t('stat_spe')];
 const stats=[
 [stLabels[0], buffedHP, 500, '#4caf50', p.maxHP||p.hp||0],
 [stLabels[1], buffedAtk,200, '#f44336', p.atk||0],
 [stLabels[2], buffedDef,200, '#2196f3', p.def||0],
 [stLabels[3], buffedSpa,200, '#e91e63', p.spa||p.atk||0],
 [stLabels[4], buffedSpd,200, '#9c27b0', p.spd||p.def||0],
 [stLabels[5], buffedSpe,200, '#ff9800', p.spe||0],
 ];
 const showDelta=(base,cur)=> cur>base ? `<span class="extracted-template-style-017"> +${cur-base}</span>` : '';
 const talentInfo = p.talent && typeof TALENTS_FULL !== 'undefined' && TALENTS_FULL[p.talent] ? TALENTS_FULL[p.talent] : null;
 const talentHtml = talentInfo ? `<div class="extracted-template-style-083">
 <div class="extracted-template-style-060">🧬 ${t('pokemon_talents')}</div>
 <div class="box-move-card" data-type-color="#94886B">
 <span>${talentInfo.name}</span>
 <span class="extracted-template-style-019">${getRarityLabel(talentInfo.rarity)}</span>
 </div>
 <div class="extracted-template-style-084">${talentInfo.info || ''}</div>
 </div>` : '';
 const moves=(p.moves||[]).map((m)=>{
 const mv=MOVES[m.id];
 return `<div class="box-move-card" data-type-color="${TYPE_COLORS[mv?.type||'']||'#555'}" data-context-call="openMoveInfo" data-context-args="'${m.id}'" title="${t('context_info_touch')}">
 <span class="type-badge ${typeClass(mv?.type||'?')}">${mv?.type||'?'}</span>
 <span>${getMoveName(m.id)}</span>
 <span class="extracted-template-style-019">${t('power_abbrev')} ${mv?.pow||'-'}</span>
 </div>`;
 }).join('');
 inner.innerHTML=`<div class="modal-title">
 <div class="extracted-template-style-006">
 <div class="extracted-template-style-024 ${p.shinyActive?'shiny-spark is-shiny':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:72})}</div>
 <div>
 <div>${p.shinyActive?'<span class="shiny-tag"></span>':''}${p.name} <span class="extracted-template-style-025">#${p.id}</span></div>
 <div class="extracted-template-style-007">${contextLabel ? contextLabel + ' — ' : ''}${t('level_word')} ${p.level || 1}</div>
 <div class="extracted-template-style-026">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
 </div>
 </div>
 <span class="modal-close" data-action="close-poke-modal"></span>
 </div>
 ${talentHtml}
 ${getEvolutionMethodsHtml(p.id)}
 <div class="extracted-template-style-028">
 ${stats.map(([l,v,m,c,base], sIdx)=>{
 const keys = ['hp','atk','def','spa','spd','spe'];
 const k = keys[sIdx] || 'hp';
 const ivVal = (p.ivs||{})[k] || 0;
 const evVal = (p.evs||{})[k] || 0;
 return `<div class="stat-row extracted-bridge-style-001">
 <div class="extracted-template-style-029">
 <span class="stat-label extracted-bridge-style-002">${l}</span>
 <span class="stat-val extracted-bridge-style-003">${v}${showDelta(base,v)}</span>
 </div>
 <div class="stat-bar extracted-bridge-style-004"><div class="stat-fill"></div></div>
 <div class="extracted-template-style-030">
 <span><b>IV:</b> ${renderStars(ivVal, false)} (${ivVal}/6)</span>
 <span><b>EV:</b> ${renderStars(evVal, true)} (${evVal}/6)</span>
 </div>
 </div>`;
 }).join('')}
 </div>
 <div class="extracted-template-style-031"><span class="extracted-template-style-007">${t('moves_lbl')}</span></div>
 ${moves || `<div class="extracted-template-style-023">${t('no_other_moves')}</div>`}`;
 modal.classList.add('open');
 if(typeof applyDynamicStyles === 'function') applyDynamicStyles(inner);
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
 <div data-style="font-size: 15px;font-weight:bold;color:${pow>80?'var(--light2)':pow==='-'?'var(--light1)':'var(--light2)'}">${pow}</div>
 </div>
 <div class="extracted-template-style-098">
 <div class="extracted-template-style-090">${t('accuracy')}</div>
 <div data-style="font-size: 15px;font-weight:bold;color:${acc>=90?'var(--green)':'var(--light2)'}">${acc}%</div>
 </div>
 </div>
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
