// Repli si util.js (pwSetHtml) n'est pas chargé — tests unitaires ciblés.
var _pwSetHtmlSafe = _pwSetHtmlSafe || function(el, html){ if(typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
function renderStoryWindow(){
 const panel = document.getElementById('story-panel');
 if(!panel) return;
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
 ensureQuestState();
 const titleEl = document.getElementById('story-win-title');
 if(titleEl) titleEl.textContent = t("m.quest_ui.30");

 const region = G.region || 'kanto';
 const regionName = region==='johto' ? (t("m.quest_ui.29")) : (t("m.quest_ui.28"));
 const chain = getRegionChain(region);
 const total = chain.length;

 const mainInst = G.activeQuests.find(i=>i.cat==='main');
 const mainDef = mainInst ? getMainQuestDef(mainInst.qid) : null;
 const sideActive = G.activeQuests.filter(i=>i.cat==='side' && SIDE_QUESTS[i.qid] && SIDE_QUESTS[i.qid].region===region);
 const repsActive = G.repeatables || [];

 if(!mainDef && !sideActive.length && !repsActive.length){
 _pwSetHtmlSafe(panel, (typeof renderTutorialQuestBlock === 'function' ? renderTutorialQuestBlock() : '') + `<div class="pw-empty-center">${(typeof getIcon==='function'?getIcon('story',16):'')} ${t("m.quest_ui.27")}</div><div class="pw-margin-top-sm">\n <button class="hbtn extracted-bridge-style-048" data-action="legacy-call" data-call="openRepeatableMenu" data-call-args="">${typeof getIcon==='function'?getIcon('rematch',14):''} ${t("m.quest_ui.16")}</button>\n </div>`);
 return;
 }

 const qCard = (inst, cat, def, numLabel)=>{
 const prog = (typeof questProgressValue === 'function') ? questProgressValue(inst, def) : (inst.progress||0);
 const tgt = def.target||1;
 const done = questDone(inst, def);
 const pct = clamp(Math.floor((prog/tgt)*100),0,100);
 const btnText = (cat==='main' && def.rewardPoke) ? t('quest_challenge_btn') : (def.type==='trainer_battle' && !done ? t('quest_challenge_btn') : t("m.quest_ui.26"));
 const actionAttrs = (def.type==='trainer_battle' && !done)
   ? `data-action="legacy-call" data-call="startQuestTrainerBattle" data-call-args="'${inst.qid}','${cat}'"`
   : (done ? `data-action="legacy-call" data-call="claimQuest" data-call-args="'${inst.qid}','${cat}'"` : 'disabled');
 const canPress = done || def.type==='trainer_battle';
 const qt = getQuestText(cat, def.id);
 const ttl = (numLabel?numLabel+' ':'') + qt.title;
 const dsc = qt.desc;
 const rew = qt.rewardDesc;
 let body;
 if(def.type==='badge'){
 body = `<div>${done?(t("m.quest_ui.25")):(t("m.quest_ui.24"))}</div>`;
 } else if(def.type==='talk'){
 body = `<div>${done?(t("m.quest_ui.23")):(t("m.quest_ui.22"))}</div>`;
 } else if(def.type==='item'){
 // Passe 18 : texte générique (Pokéflûte, Aile d'Argent, Aile Arc-en-ciel…)
 const reqKey = def.requiredItem || 'pokeflute';
 const reqName = (typeof getItemName==='function' ? getItemName(reqKey) : reqKey);
 const keyDone = 'quest_item_obtained', keyTodo = 'quest_item_obtain';
 const txtDone = (typeof t==='function' && t(keyDone)!==keyDone) ? tr(keyDone, {item:reqName}) : reqName + ' obtenu !';
 const txtTodo = (typeof t==='function' && t(keyTodo)!==keyTodo) ? tr(keyTodo, {item:reqName}) : 'Obtenez : ' + reqName;
 body = `<div>${done ? txtDone : txtTodo}</div>`;
 } else if(def.type==='trainer_battle'){
 const trainer = typeof getTrainerBattleDef === 'function' ? getTrainerBattleDef(def.battleId) : null;
 body = `<div class="quest-trainer-target"><b>${done?t('trainer_battle_done'):tr('trainer_battle_target', {trainer:typeof getTrainerBattleName==='function'?getTrainerBattleName(def.battleId):(trainer?trainer.name:def.battleId)})}</b><small>${done?'':t('trainer_battle_hint')}</small></div>`;
 } else {
 body = `<div class="pw-progress-label"><span>${t("m.quest_ui.21")}</span><span>${done?`${t('ready')}`:prog+' / '+tgt}</span></div>\n <div class="pw-progress-bar-sm quest-progress-container"><div class="quest-progress-bar ${done?'is-done':''}" data-pct="${pct}"></div></div>`;
 }
 const claimCls = `hbtn quest-claim-btn ${done?'is-done':''} ${((def.type==='trainer_battle'&&!done)||(cat==='main'&&def.rewardPoke&&done))?'is-challenge':''}`;
 return `<div class="pw-tip-card">\n <div class="pw-tip-title">${ttl}</div>\n <div class="pw-tip-body">${dsc}</div>\n ${body}\n <div class="pw-tag-pill"> ${rew}</div>\n <button class="${claimCls}" ${actionAttrs}>${canPress?btnText:(t("m.quest_ui.20"))}</button>\n </div>`;
 };

 let html=(typeof renderTutorialQuestBlock === 'function' ? renderTutorialQuestBlock() : '');
 if(mainDef){
 const step = (G.mainStep[region]||0)+1;
 html += `<div class="pw-section-label">${(typeof getIcon==='function'?getIcon('story',16):'')} ${t("m.quest_ui.19")} (${regionName} — ${step}/${total})</div>`;
 html += qCard(mainInst, 'main', mainDef, step+'.');
 }
 if(sideActive.length){
 html += `<div class="pw-section-blue">${(typeof getIcon==='function'?getIcon('npc',16):'')} ${t("m.quest_ui.18")} (${regionName})</div>`;
 for(const inst of sideActive){ const def=SIDE_QUESTS[inst.qid]; if(def) html+=qCard(inst,'side',def,''); }
 }
 if(repsActive.length){
 html += `<div class="pw-section-accent">${(typeof getIcon==='function'?getIcon('rematch',16):'')} ${t("m.quest_ui.17")} (${tr("m.repeatable_limit", {n: (G.maxRepeatables||3)})})</div>`;
 for(const inst of repsActive){ const def=inst.def; if(def) html+=qCard(inst,'repeatable',def,''); }
 }
  if(G.repeatableQuestsUnlocked){
    html += `<div class="pw-margin-top-sm">\n <button class="hbtn extracted-bridge-style-048" data-action="legacy-call" data-call="openRepeatableMenu" data-call-args="">${typeof getIcon==='function'?getIcon('rematch',14):''} ${t("m.quest_ui.16")}</button>\n </div>`;
  } else {
    html += `<div class="pw-margin-top-sm" data-style="font-size:12px;color:var(--light2);text-align:center;padding:8px;background:rgba(0,0,0,0.15);border-radius:4px;">
      ${typeof t === 'function' ? t('repeatable_unlock_hint') : '🔒 Talk to Swimmer Ondee in Cerulean to unlock Repeatable Quests.'}
    </div>`;
  }
 _pwSetHtmlSafe(panel, html);
}
function openNpc(locId, idx){
 ensureQuestState();
 const arr = (typeof NPCS!=='undefined') ? NPCS[locId] : null;
 if(!arr || !arr[idx]) return;
 const npc = arr[idx];
 const talkedMain = talkNpcMainQuest(npc);
 const lang = G.lang||'fr';
  const npcText = getNpc(locId, idx);
  const npcName = npcText.name;
  
  if((npcName === "Nageuse Ondée" || npcName === "Swimmer Ondée" || npcName === "Swimmer Ondee") && !G.repeatableQuestsUnlocked){
    G.repeatableQuestsUnlocked = true;
    saveGame();
    notify(typeof t === 'function' ? t('repeatable_quests_unlocked') : 'Repeatable Quests unlocked!', "var(--green)");
    setTimeout(() => {
      try { renderStoryWindow(); } catch(_){}
    }, 100);
  }
 const lines = npcText.lines;
 let html = `<div class="pw-card-purple">
 <div class="pw-purple-title">${(typeof getIcon==='function'?getIcon('npc',16):'')} ${npcName}</div>
 ${lines.map(l=>`<div class="pw-purple-desc">« ${l} »</div>`).join('')}
 </div>`;

 if(npc.quest && SIDE_QUESTS[npc.quest]){
 const sq = SIDE_QUESTS[npc.quest];
 const active = G.activeQuests.some(i=>i.qid===npc.quest && i.cat==='side');
 const done = G.completedQuests['side_'+npc.quest];
 const sqt = getQuestText('side', sq.id);
 const ttl = sqt.title;
 const dsc = sqt.desc;
 const rew = sqt.rewardDesc;
 if(active){
 html += `<div class="pw-text-sm pw-light2">${(typeof getIcon==='function'?getIcon('quests',16):'')} ${t("m.quest_ui.15")} ${ttl}</div>`;
 } else if(done && sq.type==='puzzle'){
 html += `<div class="pw-detail-chip">
 <div class="pw-detail-label">✓ ${ttl} <span class="pw-text-sm pw-green">(${(G.lang==='en')?'Already cleared · replayable':'Déjà terminée · rejouable'})</span></div>
 <div class="pw-detail-text">${dsc}</div>
 <div class="pw-detail-hint"> ${rew}</div>
 <button class="hbtn extracted-bridge-style-049" data-action="legacy-call" data-call="acceptSideQuest" data-call-args="'${npc.quest}'">${(G.lang==='en')?'Play again':'Rejouer'}</button>
 </div>`;
 } else if(done){
 html += `<div class="pw-text-sm pw-green"> ${t("m.quest_ui.14")} ${ttl}</div>`;
 } else {
 html += `<div class="pw-detail-chip">
 <div class="pw-detail-label"> ${ttl}</div>
 <div class="pw-detail-text">${dsc}</div>
 <div class="pw-detail-hint"> ${rew}</div>
 <button class="hbtn extracted-bridge-style-049" data-action="legacy-call" data-call="acceptSideQuest" data-call-args="'${npc.quest}'"> ${t("m.quest_ui.13")}</button>
 </div>`;
 }
 }
 if(npc.board){
 html += `<button class="hbtn extracted-bridge-style-050" data-action="legacy-call" data-call="openRepeatableMenu" data-call-args="">${typeof getIcon==='function'?getIcon('rematch',14):''} ${t("m.quest_ui.12")}</button>`;
 }
 html += `<div class="pw-detail-right"><button class="hbtn" data-action="legacy-call" data-call="closeQuestModal" data-call-args=""> ${t("m.quest_ui.11")}</button></div>`;
 if(talkedMain){
 html += `<div class="pw-text-sm pw-light2">${(typeof getIcon==='function'?getIcon('story',16):'')} ${t("m.quest_ui.10")}</div>`;
 }
 const tEl=document.getElementById('quest-title'); if(tEl) tEl.innerHTML = (typeof getIcon==='function'?getIcon('npc',16):'') + ' ' + npcName;
 const bEl=document.getElementById('quest-body'); if(bEl) bEl.innerHTML = html;
 const mEl=document.getElementById('quest-modal'); if(mEl) mEl.classList.add('open');
}
function acceptSideQuest(sid){
 ensureQuestState();
 if(!SIDE_QUESTS[sid]) return;
 if(G.activeQuests.some(i=>i.qid===sid && i.cat==='side')){ notify(t("legacy_message_n_qu_te_d_j_active"),'var(--light2)'); return; }
 const _sqDef = SIDE_QUESTS[sid];
 const _isPuzzle = _sqDef && _sqDef.type === 'puzzle';
 // Non-puzzle : une seule complétion. Puzzle : rejouable à l'infini.
 if(!_isPuzzle && G.completedQuests['side_'+sid]){ notify(t("legacy_message_n_qu_te_d_j_termin_e"),'var(--green)'); return; }
 if(_isPuzzle && _sqDef.targetPuzzleId && typeof resetPuzzleRun==='function'){
   try{ resetPuzzleRun(_sqDef.targetPuzzleId); }catch(_){}
 }
 G.activeQuests.push({qid:sid, cat:'side', progress:0, done:false, replay:!!(_isPuzzle && G.completedQuests['side_'+sid])});
 closeQuestModal();
 updateHeader();
 try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 saveGame();
 const lang=G.lang||'fr';
 notify(t("m.quest_ui.9"),'var(--blue)');
}
function closeQuestModal(){
 const m=document.getElementById('quest-modal'); if(m) m.classList.remove('open');
 // Stop the reroll timer interval if it exists
 if (window._rerollTimerInterval) {
   clearInterval(window._rerollTimerInterval);
   window._rerollTimerInterval = null;
 }
}
const REPEATABLE_REROLL_MS = 10 * 60 * 1000;
const REPEATABLE_SLOT_UPGRADE_COSTS = [75000, 200000, 500000, 1200000];
function getRepeatableChoices(){
 ensureQuestState();
 if(!Array.isArray(G.repeatableChoices)) G.repeatableChoices=[];
 _repeatableRoll = G.repeatableChoices.map(id => REPEATABLE_QUESTS.find(q => q.id === id)).filter(Boolean);
 return _repeatableRoll;
}
function isRepeatableAvailable(q){
 if(!q || !q.loc) return true;
 const qRegion = (typeof regionOfLoc === 'function') ? regionOfLoc(q.loc) : (q.region || 'kanto');
 return qRegion === (G.region || 'kanto');
}
function repeatablePool(){
 ensureQuestState();
 const activeIds = new Set((G.repeatables||[]).map(r=>r.tplId));
 const choiceIds = new Set((G.repeatableChoices||[]));
 return REPEATABLE_QUESTS.filter(q => isRepeatableAvailable(q) && !activeIds.has(q.id) && !choiceIds.has(q.id));
}
function pickRepeatableChoice(extraExcluded){
 const excluded = new Set(extraExcluded || []);
 const activeIds = new Set((G.repeatables||[]).map(r=>r.tplId));
 const currentIds = new Set((G.repeatableChoices||[]));
 let pool = REPEATABLE_QUESTS.filter(q => isRepeatableAvailable(q) && !activeIds.has(q.id) && !currentIds.has(q.id) && !excluded.has(q.id));
 if(!pool.length) pool = REPEATABLE_QUESTS.filter(q => isRepeatableAvailable(q) && !activeIds.has(q.id) && !excluded.has(q.id));
 if(!pool.length) return null;
 return pool[rand(0, pool.length-1)];
}
function fillRepeatableChoices(){
 ensureQuestState();
 const choices = (G.repeatableChoices||[]).filter(id => { const q = REPEATABLE_QUESTS.find(x => x.id === id); return q && isRepeatableAvailable(q); });
 G.repeatableChoices = choices.slice(0,3);
 while(G.repeatableChoices.length < 3){
  const q = pickRepeatableChoice(G.repeatableChoices);
  if(!q) break;
  G.repeatableChoices.push(q.id);
 }
 _repeatableRoll = getRepeatableChoices();
}
function repeatableCooldownLeft(){
 ensureQuestState();
 return Math.max(0, (G.repeatableLastRollAt || 0) + REPEATABLE_REROLL_MS - Date.now());
}
function formatRepeatableCooldown(ms){
 const s = Math.ceil(ms/1000);
 const m = Math.floor(s/60);
 const r = s%60;
 return `${m}:${String(r).padStart(2,'0')}`;
}
function rollRepeatables(force){
 ensureQuestState();
 const left = repeatableCooldownLeft();
 if(!force && left > 0 && (G.repeatableChoices||[]).length){
  notify(tr('repeatable_reroll_wait', {time:formatRepeatableCooldown(left)}), 'var(--light1)');
  renderRepeatableBoard();
  return;
 }
 G.repeatableChoices = [];
 for(let i=0;i<3;i++){
  const q = pickRepeatableChoice(G.repeatableChoices);
  if(q) G.repeatableChoices.push(q.id);
 }
 G.repeatableLastRollAt = Date.now();
 _repeatableRoll = getRepeatableChoices();
 renderRepeatableBoard();
 saveGame();
}
function openRepeatableMenu(){
 ensureQuestState();
 if(!G.repeatableChoices || !G.repeatableChoices.length) rollRepeatables(true);
 else renderRepeatableBoard();
 const tEl=document.getElementById('quest-title');
 if(tEl) tEl.textContent = (t("m.quest_ui.8"));
 const mEl=document.getElementById('quest-modal'); if(mEl) mEl.classList.add('open');
}
function renderRepeatableBoard(){
 ensureQuestState();
 fillRepeatableChoices();
 const lang=G.lang||'fr';
 const activeCount = (G.repeatables||[]).length;
 const max = G.maxRepeatables || 1;
 const left = repeatableCooldownLeft();
 let html = `<div class="repeatable-upgrade-head"><div><b>${t('repeatable_slots')}</b> ${activeCount}/${max}<br><span>${tr('repeatable_reroll_timer', {time:left>0?formatRepeatableCooldown(left):t('ready')})}</span></div><button class="hbtn" data-action="legacy-call" data-call="openRepeatableUpgradeMenu" data-call-args="">${typeof getIcon==='function'?getIcon('settings',14):''} ${t('repeatable_upgrades')}</button></div>`;
 html += `<div class="pw-detail-body">${t("m.quest_ui.7")}</div>`;
 html += _repeatableRoll.map((tpl,i)=>{
 const active = G.repeatables.some(r=>r.tplId===tpl.id);
 const rt = getQuestText('repeatable', tpl.id);
 const ttl = rt.title;
 const dsc = rt.desc;
 const rew = rt.rewardDesc;
 const canAccept = activeCount < max && !active;
 return `<div class="pw-card-evo">
 <div class="pw-evo-title">${(tpl.iconHtml || (typeof getIcon==='function'?getIcon('rematch',14):''))} ${ttl}</div>
 <div class="pw-detail-text">${dsc}</div>
 <div class="pw-detail-hint"> ${rew}</div>
 ${active?`<div class="pw-green-text"> ${t("m.quest_ui.6")}</div>`:`<button class="hbtn extracted-bridge-style-051" ${canAccept?`data-action="legacy-call" data-call="acceptRepeatable" data-call-args="${i}"`:'disabled'}> ${canAccept?t("m.quest_ui.5"):t('repeatable_slots_full')}</button>`}
 </div>`;
 }).join('');
 html += `<div class="pw-row">
 <button class="hbtn extracted-bridge-style-052" data-action="legacy-call" data-call="rollRepeatables" data-call-args="false" ${left>0?'disabled':''}>${typeof getIcon==='function'?getIcon('rematch',14):''} ${left>0?formatRepeatableCooldown(left):t("m.quest_ui.4")}</button>
 <button class="hbtn extracted-bridge-style-044" data-action="legacy-call" data-call="closeQuestModal" data-call-args=""> ${t("m.quest_ui.3")}</button>
 </div>`;
 const bEl=document.getElementById('quest-body'); if(bEl) bEl.innerHTML=html;
 // Set up timer interval to update the reroll button every second
 if (window._rerollTimerInterval) clearInterval(window._rerollTimerInterval);
 window._rerollTimerInterval = setInterval(function() {
   var bEl2 = document.getElementById('quest-body');
   if (!bEl2 || !bEl2.closest('.open')) {
     clearInterval(window._rerollTimerInterval);
     window._rerollTimerInterval = null;
     return;
   }
   var left2 = repeatableCooldownLeft();
   var rerollBtn = bEl2.querySelector('[data-action="legacy-call"][data-call="rollRepeatables"]');
   var timerSpan = bEl2.querySelector('.repeatable-upgrade-head span');
   if (rerollBtn) {
     // Passe 10 : innerHTML (et non textContent) — getIcon() renvoie du HTML
     // (<span class="ui-icon…">) qui s'affichait en texte brut sur le bouton.
     var iconHtml = (typeof getIcon === 'function' ? getIcon('rematch', 14) : '');
     if (left2 <= 0) {
       rerollBtn.disabled = false;
       rerollBtn.setAttribute('data-action', 'legacy-call');
       rerollBtn.setAttribute('data-call', 'rollRepeatables');
       rerollBtn.setAttribute('data-call-args', 'false');
       rerollBtn.innerHTML = iconHtml + ' ' + (typeof t === 'function' ? t('m.quest_ui.4') : 'Reroll');
     } else {
       rerollBtn.disabled = true;
       rerollBtn.innerHTML = iconHtml + ' ' + formatRepeatableCooldown(left2);
     }
   }
   if (timerSpan) {
     timerSpan.textContent = left2 > 0 ? formatRepeatableCooldown(left2) : (typeof t === 'function' ? t('ready') : 'Ready');
   }
 }, 1000);
}
function openRepeatableUpgradeMenu(){
 ensureQuestState();
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 const lvl = G.repeatableSlotUpgrades || 0;
 const max = 1 + lvl;
 const nextCost = REPEATABLE_SLOT_UPGRADE_COSTS[lvl];
 _pwSetHtmlSafe(inner, `<div class="modal-title"><div>${typeof getIcon==='function'?getIcon('settings',14):''} ${t('repeatable_upgrades')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="dict-info-block"><b>${t('repeatable_slots')}</b><br>${tr('repeatable_slots_current', {count:max, max:5})}</div>
 <div class="dict-info-block">${nextCost ? `<button class="hbtn" data-action="legacy-call" data-call="upgradeRepeatableSlots" data-call-args="${nextCost}">${typeof getIcon==='function'?getIcon('save',14):''} ${tr('repeatable_slot_upgrade_buy', {next:max+1, price:nextCost.toLocaleString()})}</button>` : t('repeatable_slots_max')}</div>
 <div class="dict-info-block">${t('repeatable_reroll_free_desc')}</div>`);
 if(typeof window!=='undefined' && typeof window.pwModalInfo==='function') window.pwModalInfo(true);
 modal.classList.add('open');
}
function upgradeRepeatableSlots(cost){
 ensureQuestState();
 const lvl = G.repeatableSlotUpgrades || 0;
 const expected = REPEATABLE_SLOT_UPGRADE_COSTS[lvl];
 if(!expected){ notify(t('repeatable_slots_max'), 'var(--green)'); return; }
 if(Number(cost) !== expected) cost = expected;
 if(G.money < cost){ notify(t('n.pas_assez_dargent'), 'var(--red)'); return; }
 G.money -= cost;
 G.repeatableSlotUpgrades = Math.min(4, lvl + 1);
 G.maxRepeatables = 1 + G.repeatableSlotUpgrades;
 updateHeader();
 saveGame();
 notify(tr('repeatable_slot_upgraded', {count:G.maxRepeatables}), 'var(--green)');
 openRepeatableUpgradeMenu();
 try{ renderRepeatableBoard(); }catch(_){}
}
function acceptRepeatable(i){
 ensureQuestState();
 fillRepeatableChoices();
 const tpl = _repeatableRoll[i];
 if(!tpl) return;
 if(G.repeatables.length >= (G.maxRepeatables||1)){
 notify(tr('repeatable_limit_reached', {n:G.maxRepeatables||1}),'var(--accent)');
 renderRepeatableBoard();
 return;
 }
 if(G.repeatables.some(r=>r.tplId===tpl.id)){ notify(t("legacy_message_n_qu_te_r_p_table_d_j_active"),'var(--green)'); return; }
 G.repeatables.push({qid:'r_'+tpl.id, tplId:tpl.id, cat:'repeatable', def:tpl, progress:0, done:false});
 if(!Array.isArray(G.repeatableChoices)) G.repeatableChoices=[];
 const replacement = pickRepeatableChoice([tpl.id]);
 if(replacement) G.repeatableChoices[i] = replacement.id;
 else G.repeatableChoices.splice(i,1);
 _repeatableRoll = getRepeatableChoices();
 updateHeader();
 try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 saveGame();
 notify(t("m.quest_ui.1"),'var(--accent)');
 renderRepeatableBoard();
}


// --- Migrated to ES module, globals exposed ---
if (typeof renderStoryWindow !== 'undefined' && typeof window !== 'undefined') window.renderStoryWindow = renderStoryWindow;
if (typeof openNpc !== 'undefined' && typeof window !== 'undefined') window.openNpc = openNpc;
if (typeof acceptSideQuest !== 'undefined' && typeof window !== 'undefined') window.acceptSideQuest = acceptSideQuest;
if (typeof closeQuestModal !== 'undefined' && typeof window !== 'undefined') window.closeQuestModal = closeQuestModal;
if (typeof rollRepeatables !== 'undefined' && typeof window !== 'undefined') window.rollRepeatables = rollRepeatables;
if (typeof openRepeatableMenu !== 'undefined' && typeof window !== 'undefined') window.openRepeatableMenu = openRepeatableMenu;
if (typeof renderRepeatableBoard !== 'undefined' && typeof window !== 'undefined') window.renderRepeatableBoard = renderRepeatableBoard;
if (typeof acceptRepeatable !== 'undefined' && typeof window !== 'undefined') window.acceptRepeatable = acceptRepeatable;
if (typeof openRepeatableUpgradeMenu !== 'undefined' && typeof window !== 'undefined') window.openRepeatableUpgradeMenu = openRepeatableUpgradeMenu;
if (typeof upgradeRepeatableSlots !== 'undefined' && typeof window !== 'undefined') window.upgradeRepeatableSlots = upgradeRepeatableSlots;


