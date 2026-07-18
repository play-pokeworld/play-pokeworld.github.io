import { applyDynamicStyles } from '../helpers/dynamic-styles.js';

function getPokeHelpers() {
  return {
    G: globalThis.G,
    MOVES: globalThis.MOVES || {},
    ITEMS: globalThis.ITEMS || {},
    PD: globalThis.PD || {},
    STONE_EVO: globalThis.STONE_EVO || {},
    t: globalThis.t || (k => k),
    tr: globalThis.tr || ((k, o) => k),
    spriteImg: globalThis.spriteImg || (() => ''),
    typeClass: globalThis.typeClass || (t => 'type-'+t),
    typeSpan: globalThis.typeSpan || (t => t),
    getMoveName: globalThis.getMoveName || (id => id),
    getItemName: globalThis.getItemName || (id => id),
    learnableMoves: globalThis.learnableMoves || (() => []),
    renderStars: globalThis.renderStars || (() => ''),
    xpForLevel: globalThis.xpForLevel || (l => l*100),
    isSpeciesShiny: globalThis.isSpeciesShiny || (() => false),
    speciesOwned: globalThis.speciesOwned || (() => false),
    buildTalentSelectorHtml: globalThis.buildTalentSelectorHtml || (() => ''),
    getEvolutionMethodsHtml: globalThis.getEvolutionMethodsHtml || (() => ''),
    saveGame: globalThis.saveGame || (() => {}),
    notify: globalThis.notify || (() => {}),
  };
}


function sameBoxBattlePoke(a, b) {
  if (!a || !b) return false;
  if (a.uid && b.uid) return a.uid === b.uid;
  return a === b;
}

function isBoxPokeBattleEditLocked(p, boxId) {
  if (globalThis.isPokemonLockedForBattleEdits) {
    return !!globalThis.isPokemonLockedForBattleEdits(p, null, boxId);
  }
  const b = globalThis.battle;
  const G = globalThis.G;
  if (!p || !b || !b.active) return false;
  if (b.isTraining) return !!(b.trainee && sameBoxBattlePoke(p, b.trainee));
  const team = (G && Array.isArray(G.team)) ? G.team : [];
  return team.some(tp => sameBoxBattlePoke(p, tp));
}

function isBoxPokeMoveEditLocked(boxId, existingPoke) {
  const G = globalThis.G;
  const p = existingPoke || (G && G.collection ? (G.collection[boxId] || G.collection[String(boxId)]) : null);
  return isBoxPokeBattleEditLocked(p, boxId);
}

function boxBattleEditLockMessage() {
  return globalThis.t ? globalThis.t('action_blocked_in_battle') : "Action impossible en combat : quittez le combat d'abord !";
}

function notifyBoxMoveEditLocked() {
  if (globalThis.notifyBattleEditLocked) globalThis.notifyBattleEditLocked();
  else if (globalThis.notify) globalThis.notify(boxBattleEditLockMessage(), 'var(--red)');
}

export function openBoxPokeModal(boxId) {
  const { G, MOVES, ITEMS, PD, STONE_EVO, t, tr, spriteImg, typeClass, typeSpan, getMoveName, getItemName, learnableMoves, renderStars, xpForLevel, isSpeciesShiny, speciesOwned, buildTalentSelectorHtml, getEvolutionMethodsHtml } = getPokeHelpers();
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if (!p) { globalThis.moveEditorFor = null; return; }
  const modal = document.getElementById('poke-modal');
  const inner = document.getElementById('poke-modal-inner');
  const isShiny = p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id);

  if (isShiny) {
    p.shinyUnlocked = true;
    if (p.shinyActive === undefined) p.shinyActive = true;
    p.shiny = p.shinyActive;
  }

  if (typeof globalThis.renderPokemonDetailModal === 'function') {
    globalThis.renderPokemonDetailModal(p, { boxId, locationLabel: t('pc_box') });
    return;
  }

  const buff = { atk:0, def:0, spe:0, spa:0, spd:0, hpMax:0 };
  const buffedAtk = Math.floor(p.atk*(1+(buff.atk||0)));
  const buffedDef = Math.floor(p.def*(1+(buff.def||0)));
  const buffedSpe = Math.floor(p.spe*(1+(buff.spe||0)));
  const buffedHP = Math.floor(p.maxHP*(1+(buff.hpMax||0)));
  const showDelta = (base,cur)=> cur>base ? `<span class="pw-delta"> +${cur-base}</span>` : '';
  const buffedSpa = Math.floor((p.spa||p.atk)*(1+(buff.spa||0)));
  const buffedSpd = Math.floor((p.spd||p.def)*(1+(buff.spd||0)));

  const stLabels = [t('stat_hp'), t('stat_atk'), t('stat_def'), t('stat_spa'), t('stat_spd'), t('stat_spe')];
  const stats = [
    [stLabels[0], buffedHP, 500, '#4caf50', p.maxHP],
    [stLabels[1], buffedAtk,200, '#f44336', p.atk],
    [stLabels[2], buffedDef,200, '#2196f3', p.def],
    [stLabels[3], buffedSpa,200, '#e91e63', p.spa||p.atk],
    [stLabels[4], buffedSpd,200, '#9c27b0', p.spd||p.def],
    [stLabels[5], buffedSpe,200, '#ff9800', p.spe],
  ];

  const battleEditLocked = isBoxPokeBattleEditLocked(p, boxId);
  if (battleEditLocked && globalThis.boxMoveReplaceSlot !== null) globalThis.boxMoveReplaceSlot = null;
  const boxMoveReplaceSlot = battleEditLocked ? null : globalThis.boxMoveReplaceSlot;

  const moves = (p.moves||[]).map((m,mi)=>{
    const mv = MOVES[m.id];
    const mvName = getMoveName(m.id);
    const selected = !battleEditLocked && boxMoveReplaceSlot === mi;
    const moveActionAttrs = battleEditLocked ? '' : ` data-action="legacy-call" data-call="toggleBoxMoveSelect" data-call-args="'${boxId}',${mi}"`;
    return `<div class="box-move-card ${selected?'is-selected':''}" data-type-color="${(globalThis.TYPE_COLORS||{})[mv?.type||'']||'#555'}"${moveActionAttrs} data-context-call="openMoveInfo" data-context-args="'${m.id}'" title="${battleEditLocked?boxBattleEditLockMessage():t('click_replace_context_info')}">
      <span class="type-badge ${typeClass(mv?.type||'?')}">${mv?.type||'?'}</span>
      <span>${mvName}</span>
      ${selected?'<span class="pw-replace-badge">'+t('replacement_badge')+'</span>':''}
      <span class="pw-power">${t('power_abbrev')} ${mv?.pow||'-'}</span>
    </div>`;
  }).join('');

  const pool = learnableMoves(p);
  const canReplace = !battleEditLocked && boxMoveReplaceSlot !== null;
  const fullB = (p.moves||[]).length >= 4 && !canReplace;
  let learnHtml = `<div class="pw-learnable-title">
    📖 ${t('learnable_moves_title')}
    ${battleEditLocked?'<span class="pw-hint">'+boxBattleEditLockMessage()+'</span>':''}
    ${!battleEditLocked&&canReplace?'<span class="pw-hint">'+t('click_to_replace_selected')+'</span>':''}
    ${!battleEditLocked&&fullB?'<span class="pw-hint">'+t('select_move_first')+'</span>':''}
  </div>
  <div class="pw-learnable-list">
  ${pool.length?pool.map(id=>{
    const mv = MOVES[id];
    const clickAttrs = !battleEditLocked && (canReplace || !fullB) ? `data-action="legacy-call" data-call="learnBoxMove" data-call-args="'${boxId}','${id}'"` : '';
    return `<div class="box-move-card box-move-card--learnable ${clickAttrs?'is-clickable':''} ${canReplace?'is-selectable':''}" data-type-color="${(globalThis.TYPE_COLORS||{})[mv?.type||'']||'#555'}" ${clickAttrs} data-context-call="openMoveInfo" data-context-args="'${id}'" title="${battleEditLocked?boxBattleEditLockMessage():t('context_info_touch')}">
      <span class="type-badge ${typeClass(mv.type)}">${mv.type}</span>
      <span>${getMoveName(id)}</span>
      <span class="pw-power">${t('power_abbrev')} ${mv.pow||'-'}</span>
      ${!battleEditLocked&&canReplace?'<span class="pw-plus"></span>':(!battleEditLocked&&!fullB?'<span class="pw-plus">+</span>':'')}
    </div>`;
  }).join(''):`<div class="pw-empty">${t('no_other_moves')}</div>`}
  </div>`;

  const swap = (globalThis._swapFromTeamIdx != null && G.team[globalThis._swapFromTeamIdx]);

  inner.innerHTML = `<div class="modal-title">
    <div class="pw-modal-header">
      <div class="pw-sprite ${p.shinyActive?'shiny-spark is-shiny':''}">${spriteImg(p.id,p.emoji,{shiny:p.shinyActive,size:72})}</div>
      <div>
        <div>${p.shinyActive?'<span class="shiny-tag"></span>':''}${p.name} <span class="pw-id">#${p.id}</span></div>
        <div class="pw-level">${t('level_word')} ${p.level} (${t('pc_box')})</div>
        <div class="pw-types">${typeSpan(p.type1)}${p.type2?typeSpan(p.type2):''}</div>
      </div>
    </div>
    <span class="modal-close" data-action="close-poke-modal" data-reset-box-move="true">✕</span>
  </div>
  ${isShiny?`<button class="hbtn poke-detail-shiny-toggle ${p.shinyActive?'is-on':'is-off'}" data-action="legacy-call" data-call="toggleBoxShinySkin" data-call-args="'${boxId}'"><span class="poke-detail-shiny-star">★</span><span>${p.shinyActive?t('shiny_skin_on'):t('shiny_skin_off')}</span></button>`:''}
  ${buildTalentSelectorHtml(p, null, boxId)}
  ${getEvolutionMethodsHtml(p.id)}
  <div class="pw-stats">
  ${stats.map(([l,v,m,c,base], sIdx)=>{
    const keys = ['hp','atk','def','spa','spd','spe'];
    const k = keys[sIdx] || 'hp';
    const ivVal = (p.ivs||{})[k] || 0;
    const evVal = (p.evs||{})[k] || 0;
    return `<div class="stat-row">
      <div class="pw-stat-top">
        <span class="stat-label">${l}</span>
        <span class="stat-val">${v}${showDelta(base,v)}</span>
      </div>
      <div class="stat-bar"><div class="stat-fill" data-pct="${Math.min(100,v/m*100)}" data-bg="${c}"></div></div>
      <div class="pw-iv-ev">
        <span><b>IV:</b> ${renderStars(ivVal, false)} (${ivVal}/6)</span>
        <span><b>EV:</b> ${renderStars(evVal, true)} (${evVal}/6)</span>
      </div>
    </div>`;
  }).join('')}
  </div>
  <div class="pw-moves-header">
    <span class="pw-label">${t('moves_title')}</span>
    ${!battleEditLocked&&boxMoveReplaceSlot!==null?`<button class="hbtn pw-cancel" data-action="cancel-box-move-replace" data-box-id="${boxId}">${t('cancel')}</button>`:''}
  </div>
  ${moves}
  ${learnHtml}
  ${(() => {
    const curLevelBase = xpForLevel(p.level);
    const xpInLevel = Math.max(0, (p.xp||0) - curLevelBase);
    const xpReqLevel = Math.max(1, (p.xpNext || 1) - curLevelBase);
    return `<div class="pw-xp">XP : ${xpInLevel} / ${xpReqLevel} <span class="pw-total">(${p.xp||0} total)</span></div>`;
  })()}
  ${(() => {
    const evos = STONE_EVO[p.id];
    if(!evos) return '';
    let html = `<div class="pw-stone-evo"><div class="pw-stone-title"> ${t('stone_evolution')}</div><div class="pw-stone-list">`;
    for(const [stoneKey, targetId] of Object.entries(evos)){
      const stone = ITEMS[stoneKey];
      const owned = G.inventory[stoneKey]||0;
      const target = PD[targetId];
      const already = speciesOwned(targetId);
      html += `<button class="hbtn" data-action="legacy-call" data-call="tryBoxStoneEvo" data-call-args="'${boxId}','${stoneKey}'"${owned<1||already?'disabled':''} title="${stone?.desc||''}">${stone?.icon||''} ${target?target[0]:'#'+targetId} ${owned>0?`(${owned})`:''}${already?' ':''}</button>`;
    }
    html += '</div></div>';
    return html;
  })()}
  <div class="pw-actions">
  ${swap
    ? `<button class="hbtn pw-swap" data-action="call-close-poke" data-call="swapBoxWithTeam" data-call-args="'${boxId}'">${tr('swap_with', {name:G.team[globalThis._swapFromTeamIdx]?.name||t('the_team')})}</button>
       <button class="hbtn pw-remove" data-action="call-close-poke" data-call="removeFromTeam" data-call-args="${globalThis._swapFromTeamIdx}">${t('remove_from_team')}</button>
       <button class="hbtn" data-action="call-close-poke" data-call="cancelSwap">✖ ${t('cancel')}</button>`
    : `<button class="hbtn pw-add" data-action="call-close-poke" data-call="addBoxedToTeam" data-call-args="'${boxId}'"${G.team.length>=6 ? 'disabled title="'+t('team_full_title')+'"' : ''}>${t('add_to_team')}</button>`}
  </div>`;

  modal.classList.add('open');
  // Apply dynamic styles (width, bg)
  if (typeof applyDynamicStyles === 'function') applyDynamicStyles(inner);
}

export function toggleBoxShinySkin(boxId) {
  const G = globalThis.G;
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p || !(p.shinyUnlocked || p.shiny || (globalThis.isSpeciesShiny && globalThis.isSpeciesShiny(p.id)))) return;
  if(p.shinyActive === undefined) p.shinyActive = true;
  p.shinyActive = !p.shinyActive;
  p.shiny = !!p.shinyActive;
  if (typeof globalThis.saveGame === 'function') globalThis.saveGame();
  if (typeof globalThis.refreshAfterShinyToggle === 'function') globalThis.refreshAfterShinyToggle();
  openBoxPokeModal(boxId);
}

export let boxMoveReplaceSlot = null;
if (typeof window !== 'undefined') {
  if (window.boxMoveReplaceSlot === undefined) window.boxMoveReplaceSlot = null;
}

export function toggleBoxMoveSelect(boxId, moveIdx) {
  if (isBoxPokeMoveEditLocked(boxId)) { notifyBoxMoveEditLocked(); return; }
  const G = globalThis.G;
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  if (globalThis.boxMoveReplaceSlot === moveIdx) {
    globalThis.boxMoveReplaceSlot = null;
  } else {
    globalThis.boxMoveReplaceSlot = moveIdx;
  }
  openBoxPokeModal(boxId);
}

export function forgetBoxMove(boxId, moveIdx) {
  if (isBoxPokeMoveEditLocked(boxId)) { notifyBoxMoveEditLocked(); return; }
  const G = globalThis.G;
  const t = globalThis.t || (k=>k);
  const tr = globalThis.tr || ((k,o)=>k);
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p||(p.moves||[]).length<=1){ if (typeof globalThis.notify==='function') globalThis.notify(t("legacy_message_n_un_pok_mon_doit_conserver_au_moins_une_c")); return; }
  const removed = p.moves.splice(moveIdx,1)[0];
  if (typeof globalThis.notify==='function') globalThis.notify(tr("m.move_learning.1", {p0:p.name, p1:(globalThis.getMoveName?globalThis.getMoveName(removed.id):removed.id)||removed.id}));
  globalThis.boxMoveReplaceSlot = null;
  if (typeof globalThis.saveGame==='function') globalThis.saveGame();
  openBoxPokeModal(boxId);
}

export function learnBoxMove(boxId, moveId) {
  if (isBoxPokeMoveEditLocked(boxId)) { notifyBoxMoveEditLocked(); return; }
  const G = globalThis.G;
  const t = globalThis.t || (k=>k);
  const tr = globalThis.tr || ((k,o)=>k);
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  if(!p.moves) p.moves=[];
  if(globalThis.boxMoveReplaceSlot !== null && p.moves[globalThis.boxMoveReplaceSlot]){
    const oldId = p.moves[globalThis.boxMoveReplaceSlot].id;
    p.moves[globalThis.boxMoveReplaceSlot] = {id:moveId};
    if (typeof globalThis.notify==='function') globalThis.notify(tr("m.move_learning.2", {p0:p.name, p1:(globalThis.getMoveName?globalThis.getMoveName(moveId):moveId)||moveId, p2:(globalThis.getMoveName?globalThis.getMoveName(oldId):oldId)||oldId}));
    globalThis.boxMoveReplaceSlot = null;
    if (typeof globalThis.saveGame==='function') globalThis.saveGame();
    openBoxPokeModal(boxId);
    return;
  }
  if(p.moves.length>=4){ if (typeof globalThis.notify==='function') globalThis.notify(t("legacy_message_n_capacit_s_pleines_4_oubliezen_une_dabord")); return; }
  if(p.moves.find(m=>m.id===moveId)) return;
  p.moves.push({id:moveId});
  if (typeof globalThis.notify==='function') globalThis.notify(tr("m.move_learning.3", {p0:p.name, p1:(globalThis.getMoveName?globalThis.getMoveName(moveId):moveId)||moveId}));
  if (typeof globalThis.saveGame==='function') globalThis.saveGame();
  openBoxPokeModal(boxId);
}

export function toggleBoxMoveEditor(boxId) {
  if (isBoxPokeMoveEditLocked(boxId)) { notifyBoxMoveEditLocked(); return; }
  const key = 'box_'+boxId;
  globalThis.moveEditorFor = (globalThis.moveEditorFor===key) ? null : key;
  openBoxPokeModal(boxId);
}

export function tryBoxStoneEvo(boxId, stoneKey) {

 // --- Fix: cannot change moves if pokemon is currently in battle ---
 try {
   if (typeof battle !== 'undefined' && battle && battle.active) {
     var activePoke = (typeof getActivePlayerPoke === 'function') ? getActivePlayerPoke() : null;
     var thisPoke = null;
     // Determine thisPoke based on function
     if (typeof p !== 'undefined' && p) thisPoke = p;
     else if (typeof G !== 'undefined' && G) {
       // For box functions, p is from collection
       if (typeof boxId !== 'undefined' && G.collection) {
         thisPoke = G.collection[boxId] || G.collection[String(boxId)];
       } else if (typeof idx !== 'undefined' && G.team) {
         thisPoke = G.team[idx];
       }
     }
     if (activePoke && thisPoke && activePoke.uid && thisPoke.uid && activePoke.uid === thisPoke.uid) {
       if (typeof notify === 'function') notify((typeof t === 'function' ? t('action_blocked_in_battle') : 'Action impossible en combat'), 'var(--red)');
       return;
     }
   }
 } catch(_){}
  const G = globalThis.G;
  const t = globalThis.t || (k=>k);
  const tr = globalThis.tr || ((k,o)=>k);
  const p = G.collection[boxId] || G.collection[String(boxId)];
  if(!p) return;
  const evo = (globalThis.STONE_EVO||{})[p.id]?.[stoneKey];
  if(!evo){ if (typeof globalThis.notify==='function') globalThis.notify(t("legacy_message_n2_cet_objet_na_aucun_effet_sur_ce_pok_mon")); return; }
  if((G.inventory[stoneKey]||0)<1){ if (typeof globalThis.notify==='function') globalThis.notify(t("n.pierre_manquante")); return; }
  G.inventory[stoneKey]--;
  if(G.inventory[stoneKey]<=0) delete G.inventory[stoneKey];
  const shinyUnlock = !!(p.shinyUnlocked || p.shinyActive || p.shiny || (globalThis.isSpeciesShiny?globalThis.isSpeciesShiny(evo):false) || (globalThis.rollShiny?globalThis.rollShiny():false));
  const evoMon = (globalThis.createPoke?globalThis.createPoke(evo, 1, shinyUnlock):null);
  if(evoMon){
    evoMon.shinyActive = shinyUnlock; evoMon.shiny = shinyUnlock;
    delete G.collection[boxId];
    delete G.collection[String(boxId)];
    G.collection[evo] = evoMon;
    G.pokedex[evo] = {...(G.pokedex[evo]||{}), seen:true, caught:true};
    if(shinyUnlock && typeof globalThis.unlockShinyForSpecies==='function') globalThis.unlockShinyForSpecies(evo);
    if (typeof globalThis.notify==='function') globalThis.notify(tr('evolution_stone_notify', {from:p.name, to:evoMon.name, item:(globalThis.getItemName?globalThis.getItemName(stoneKey):stoneKey)}),"var(--accent)");
    if (typeof globalThis.saveGame==='function') globalThis.saveGame();
    if(document.querySelector('.tab.active')?.textContent.includes('Sac') || (document.getElementById('fullscreen-panel-modal')?.style.display==='flex')){
      if (typeof globalThis.onInventoryClick==='function') globalThis.onInventoryClick(stoneKey);
    } else {
      const modal = document.getElementById('poke-modal');
      if (modal) modal.classList.remove('open');
      if (typeof globalThis.renderTeamWindow==='function') globalThis.renderTeamWindow();
    }
  }
}

// Global compatibility
if (typeof window !== 'undefined') {
  window.openBoxPokeModal = openBoxPokeModal;
  window.toggleBoxShinySkin = toggleBoxShinySkin;
  window.toggleBoxMoveSelect = toggleBoxMoveSelect;
  window.forgetBoxMove = forgetBoxMove;
  window.learnBoxMove = learnBoxMove;
  window.toggleBoxMoveEditor = toggleBoxMoveEditor;
  window.tryBoxStoneEvo = tryBoxStoneEvo;
}
