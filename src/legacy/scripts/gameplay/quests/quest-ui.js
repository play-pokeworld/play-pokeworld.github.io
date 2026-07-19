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
 panel.innerHTML = (typeof renderTutorialQuestBlock === 'function' ? renderTutorialQuestBlock() : '') + `<div class="extracted-template-style-242">${(typeof getIcon==='function'?getIcon('story',16):'')} ${t("m.quest_ui.27")}</div><div class="extracted-template-style-252">\n <button class="hbtn extracted-bridge-style-048" data-action="legacy-call" data-call="openRepeatableMenu" data-call-args="">${typeof getIcon==='function'?getIcon('rematch',14):''} ${t("m.quest_ui.16")}</button>\n </div>`;
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
 body = `<div>${done?'Poké Flûte obtenue !':'Obtenez la Poké Flûte.'}</div>`;
 } else if(def.type==='trainer_battle'){
 const trainer = typeof getTrainerBattleDef === 'function' ? getTrainerBattleDef(def.battleId) : null;
 body = `<div class="quest-trainer-target"><b>${done?t('trainer_battle_done'):tr('trainer_battle_target', {trainer:typeof getTrainerBattleName==='function'?getTrainerBattleName(def.battleId):(trainer?trainer.name:def.battleId)})}</b><small>${done?'':t('trainer_battle_hint')}</small></div>`;
 } else {
 body = `<div class="extracted-template-style-243"><span>${t("m.quest_ui.21")}</span><span>${done?`${t('ready')}`:prog+' / '+tgt}</span></div>\n <div class="extracted-template-style-244 quest-progress-container"><div class="quest-progress-bar ${done?'is-done':''}" data-pct="${pct}"></div></div>`;
 }
 const claimCls = `hbtn quest-claim-btn ${done?'is-done':''} ${((def.type==='trainer_battle'&&!done)||(cat==='main'&&def.rewardPoke&&done))?'is-challenge':''}`;
 return `<div class="extracted-template-style-245">\n <div class="extracted-template-style-246">${ttl}</div>\n <div class="extracted-template-style-247">${dsc}</div>\n ${body}\n <div class="extracted-template-style-248"> ${rew}</div>\n <button class="${claimCls}" ${actionAttrs}>${canPress?btnText:(t("m.quest_ui.20"))}</button>\n </div>`;
 };

 let html=(typeof renderTutorialQuestBlock === 'function' ? renderTutorialQuestBlock() : '');
 if(mainDef){
 const step = (G.mainStep[region]||0)+1;
 html += `<div class="extracted-template-style-249">${(typeof getIcon==='function'?getIcon('story',16):'')} ${t("m.quest_ui.19")} (${regionName} — ${step}/${total})</div>`;
 html += qCard(mainInst, 'main', mainDef, step+'.');
 }
 if(sideActive.length){
 html += `<div class="extracted-template-style-250">${(typeof getIcon==='function'?getIcon('npc',16):'')} ${t("m.quest_ui.18")} (${regionName})</div>`;
 for(const inst of sideActive){ const def=SIDE_QUESTS[inst.qid]; if(def) html+=qCard(inst,'side',def,''); }
 }
 if(repsActive.length){
 html += `<div class="extracted-template-style-251">${(typeof getIcon==='function'?getIcon('rematch',16):'')} ${t("m.quest_ui.17")} (${tr("m.repeatable_limit", {n: (G.maxRepeatables||3)})})</div>`;
 for(const inst of repsActive){ const def=inst.def; if(def) html+=qCard(inst,'repeatable',def,''); }
 }
 html += `<div class="extracted-template-style-252">\n <button class="hbtn extracted-bridge-style-048" data-action="legacy-call" data-call="openRepeatableMenu" data-call-args="">${typeof getIcon==='function'?getIcon('rematch',14):''} ${t("m.quest_ui.16")}</button>\n </div>`;
 panel.innerHTML = html;
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
 const lines = npcText.lines;
 let html = `<div class="extracted-template-style-253">
 <div class="extracted-template-style-254">${(typeof getIcon==='function'?getIcon('npc',16):'')} ${npcName}</div>
 ${lines.map(l=>`<div class="extracted-template-style-255">« ${l} »</div>`).join('')}
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
 html += `<div class="extracted-template-style-256">${(typeof getIcon==='function'?getIcon('quests',16):'')} ${t("m.quest_ui.15")} ${ttl}</div>`;
 } else if(done){
 html += `<div class="extracted-template-style-257"> ${t("m.quest_ui.14")} ${ttl}</div>`;
 } else {
 html += `<div class="extracted-template-style-258">
 <div class="extracted-template-style-259"> ${ttl}</div>
 <div class="extracted-template-style-260">${dsc}</div>
 <div class="extracted-template-style-261"> ${rew}</div>
 <button class="hbtn extracted-bridge-style-049" data-action="legacy-call" data-call="acceptSideQuest" data-call-args="'${npc.quest}'"> ${t("m.quest_ui.13")}</button>
 </div>`;
 }
 }
 if(npc.board){
 html += `<button class="hbtn extracted-bridge-style-050" data-action="legacy-call" data-call="openRepeatableMenu" data-call-args="">${typeof getIcon==='function'?getIcon('rematch',14):''} ${t("m.quest_ui.12")}</button>`;
 }
 html += `<div class="extracted-template-style-262"><button class="hbtn" data-action="legacy-call" data-call="closeQuestModal" data-call-args=""> ${t("m.quest_ui.11")}</button></div>`;
 if(talkedMain){
 html += `<div class="extracted-template-style-256">${(typeof getIcon==='function'?getIcon('story',16):'')} ${t("m.quest_ui.10")}</div>`;
 }
 const tEl=document.getElementById('quest-title'); if(tEl) tEl.innerHTML = (typeof getIcon==='function'?getIcon('npc',16):'') + ' ' + npcName;
 const bEl=document.getElementById('quest-body'); if(bEl) bEl.innerHTML = html;
 const mEl=document.getElementById('quest-modal'); if(mEl) mEl.classList.add('open');
}
function acceptSideQuest(sid){
 ensureQuestState();
 if(!SIDE_QUESTS[sid]) return;
 if(G.activeQuests.some(i=>i.qid===sid && i.cat==='side')){ notify(t("legacy_message_n_qu_te_d_j_active"),'var(--light2)'); return; }
 if(G.completedQuests['side_'+sid]){ notify(t("legacy_message_n_qu_te_d_j_termin_e"),'var(--green)'); return; }
 G.activeQuests.push({qid:sid, cat:'side', progress:0, done:false});
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
 html += `<div class="extracted-template-style-263">${t("m.quest_ui.7")}</div>`;
 html += _repeatableRoll.map((tpl,i)=>{
 const active = G.repeatables.some(r=>r.tplId===tpl.id);
 const rt = getQuestText('repeatable', tpl.id);
 const ttl = rt.title;
 const dsc = rt.desc;
 const rew = rt.rewardDesc;
 const canAccept = activeCount < max && !active;
 return `<div class="extracted-template-style-264">
 <div class="extracted-template-style-265">${(tpl.iconHtml || (typeof getIcon==='function'?getIcon('rematch',14):''))} ${ttl}</div>
 <div class="extracted-template-style-260">${dsc}</div>
 <div class="extracted-template-style-261"> ${rew}</div>
 ${active?`<div class="extracted-template-style-266"> ${t("m.quest_ui.6")}</div>`:`<button class="hbtn extracted-bridge-style-051" ${canAccept?`data-action="legacy-call" data-call="acceptRepeatable" data-call-args="${i}"`:'disabled'}> ${canAccept?t("m.quest_ui.5"):t('repeatable_slots_full')}</button>`}
 </div>`;
 }).join('');
 html += `<div class="extracted-template-style-131">
 <button class="hbtn extracted-bridge-style-052" ${left<=0?`data-action="legacy-call" data-call="rollRepeatables" data-call-args="false"`:'disabled'}>${typeof getIcon==='function'?getIcon('rematch',14):''} ${left>0?tr('repeatable_reroll_wait', {time:formatRepeatableCooldown(left)}):t("m.quest_ui.4")}</button>
 <button class="hbtn extracted-bridge-style-044" data-action="legacy-call" data-call="closeQuestModal" data-call-args=""> ${t("m.quest_ui.3")}</button>
 </div>`;
 const bEl=document.getElementById('quest-body'); if(bEl) bEl.innerHTML=html;
}
function openRepeatableUpgradeMenu(){
 ensureQuestState();
 const inner=document.getElementById('poke-modal-inner');
 const modal=document.getElementById('poke-modal');
 if(!inner||!modal) return;
 const lvl = G.repeatableSlotUpgrades || 0;
 const max = 1 + lvl;
 const nextCost = REPEATABLE_SLOT_UPGRADE_COSTS[lvl];
 inner.innerHTML = `<div class="modal-title"><div>${typeof getIcon==='function'?getIcon('settings',14):''} ${t('repeatable_upgrades')}</div><span class="modal-close" data-action="close-poke-modal">✕</span></div>
 <div class="dict-info-block"><b>${t('repeatable_slots')}</b><br>${tr('repeatable_slots_current', {count:max, max:5})}</div>
 <div class="dict-info-block">${nextCost ? `<button class="hbtn" data-action="legacy-call" data-call="upgradeRepeatableSlots" data-call-args="${nextCost}">${typeof getIcon==='function'?getIcon('save',14):''} ${tr('repeatable_slot_upgrade_buy', {next:max+1, price:nextCost.toLocaleString()})}</button>` : t('repeatable_slots_max')}</div>
 <div class="dict-info-block">${t('repeatable_reroll_free_desc')}</div>`;
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


