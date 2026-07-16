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
 panel.innerHTML = (typeof renderTutorialQuestBlock === 'function' ? renderTutorialQuestBlock() : '') + `<div class="extracted-template-style-242">\n 📜 ${t("m.quest_ui.27")}</div>`;
 return;
 }

 const qCard = (inst, cat, def, numLabel)=>{
 const prog = (inst.progress||0);
 const tgt = def.target||1;
 const done = questDone(inst, def);
 const pct = clamp(Math.floor((prog/tgt)*100),0,100);
 const btnText = (cat==='main' && def.rewardPoke) ? t('quest_challenge_btn') : t("m.quest_ui.26");
 const qt = getQuestText(cat, def.id);
 const ttl = (numLabel?numLabel+' ':'') + qt.title;
 const dsc = qt.desc;
 const rew = qt.rewardDesc;
 let body;
 if(def.type==='badge'){
 body = `<div data-style="font-size:13px;color:${done?'var(--green)':'var(--light2)'};font-weight:bold;margin:2px 0 6px;">${done?(t("m.quest_ui.25")):(t("m.quest_ui.24"))}</div>`;
 } else if(def.type==='talk'){
 body = `<div data-style="font-size:13px;color:${done?'var(--green)':'var(--light2)'};font-weight:bold;margin:2px 0 6px;">${done?(t("m.quest_ui.23")):(t("m.quest_ui.22"))}</div>`;
 } else {
 body = `<div class="extracted-template-style-243"><span>${t("m.quest_ui.21")}</span><span data-style="color:${done?'var(--green)':'var(--light2)'};font-weight:bold;">${done?'':prog+' / '+tgt}</span></div>\n <div class="extracted-template-style-244"><div data-style="width:${pct}%;background:${done?'var(--green)':'var(--light2)'};height:100%;transition:width .3s;"></div></div>`;
 }
 return `<div class="extracted-template-style-245">\n <div class="extracted-template-style-246">${ttl}</div>\n <div class="extracted-template-style-247">${dsc}</div>\n ${body}\n <div class="extracted-template-style-248"> ${rew}</div>\n <button class="hbtn" data-style="width:100%;padding:6px;font-size:13px;font-weight:bold;background:${done?(def.rewardPoke?'var(--accent)':'var(--green)'):'#332a22'};color:#fff;cursor:${done?'pointer':'not-allowed'};border:1px solid ${done?'#388e3c':'#44382e'};opacity:${done?1:0.6};"\n ${done?`data-action="legacy-call" data-call="claimQuest" data-call-args="'${inst.qid}','${cat}'"`:'disabled'}>${done?btnText:(t("m.quest_ui.20"))}</button>\n </div>`;
 };

 let html=(typeof renderTutorialQuestBlock === 'function' ? renderTutorialQuestBlock() : '');
 if(mainDef){
 const step = (G.mainStep[region]||0)+1;
 html += `<div class="extracted-template-style-249">📖 ${t("m.quest_ui.19")} (${regionName} — ${step}/${total})</div>`;
 html += qCard(mainInst, 'main', mainDef, step+'.');
 }
 if(sideActive.length){
 html += `<div class="extracted-template-style-250">🗣 ${t("m.quest_ui.18")} (${regionName})</div>`;
 for(const inst of sideActive){ const def=SIDE_QUESTS[inst.qid]; if(def) html+=qCard(inst,'side',def,''); }
 }
 if(repsActive.length){
 html += `<div class="extracted-template-style-251">🔁 ${t("m.quest_ui.17")} (${tr("m.repeatable_limit", {n: (G.maxRepeatables||3)})})</div>`;
 for(const inst of repsActive){ const def=inst.def; if(def) html+=qCard(inst,'repeatable',def,''); }
 }
 html += `<div class="extracted-template-style-252">\n <button class="hbtn extracted-bridge-style-048" data-action="legacy-call" data-call="openRepeatableMenu" data-call-args="">🔁 ${t("m.quest_ui.16")}</button>\n </div>`;
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
 <div class="extracted-template-style-254">🗣 ${npcName}</div>
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
 html += `<div class="extracted-template-style-256">📌 ${t("m.quest_ui.15")} ${ttl}</div>`;
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
 html += `<button class="hbtn extracted-bridge-style-050" data-action="legacy-call" data-call="openRepeatableMenu" data-call-args="">🔁 ${t("m.quest_ui.12")}</button>`;
 }
 html += `<div class="extracted-template-style-262"><button class="hbtn" data-action="legacy-call" data-call="closeQuestModal" data-call-args=""> ${t("m.quest_ui.11")}</button></div>`;
 if(talkedMain){
 html += `<div class="extracted-template-style-256">📖 ${t("m.quest_ui.10")}</div>`;
 }
 const tEl=document.getElementById('quest-title'); if(tEl) tEl.textContent = '🗣 ' + npcName;
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
function rollRepeatables(){
 ensureQuestState();
 const johtoVisited = (G.region === 'johto') || (G.regionStarter && G.regionStarter.johto) ||
 (G.badges && G.badges.length >= 8) ||
 (G.visitedMaps && (G.visitedMaps.newbark || G.visitedMaps.jroute29));
 
 const pool = REPEATABLE_QUESTS.filter(q => {
 if(!q.loc) return true; 
 
 const isJohtoLoc = q.loc.startsWith('j') || ['darkcave','ilexforest','slowpokewell','unioncave','ruinsofalph','burnedtower','tintower','mtmortar','icepath','whirlislands','sprouttower','mtsilver'].includes(q.loc);
 if(isJohtoLoc && !johtoVisited) return false;
 return true;
 }).slice();
 _repeatableRoll = [];
 for(let i=0;i<3 && pool.length;i++){
 const r = Math.floor(Math.random()*pool.length);
 _repeatableRoll.push(pool.splice(r,1)[0]);
 }
 renderRepeatableBoard();
}
function openRepeatableMenu(){
 ensureQuestState();
 if(!_repeatableRoll || !_repeatableRoll.length) rollRepeatables();
 else renderRepeatableBoard();
 const tEl=document.getElementById('quest-title');
 if(tEl) tEl.textContent = (t("m.quest_ui.8"));
 const mEl=document.getElementById('quest-modal'); if(mEl) mEl.classList.add('open');
}
function renderRepeatableBoard(){
 const lang=G.lang||'fr';
 let html = `<div class="extracted-template-style-263">${t("m.quest_ui.7")}</div>`;
 html += _repeatableRoll.map((tpl,i)=>{
 const active = G.repeatables.some(r=>r.tplId===tpl.id);
 const rt = getQuestText('repeatable', tpl.id);
 const ttl = rt.title;
 const dsc = rt.desc;
 const rew = rt.rewardDesc;
 return `<div class="extracted-template-style-264">
 <div class="extracted-template-style-265">${tpl.icon||'🔁'} ${ttl}</div>
 <div class="extracted-template-style-260">${dsc}</div>
 <div class="extracted-template-style-261"> ${rew}</div>
 ${active?`<div class="extracted-template-style-266"> ${t("m.quest_ui.6")}</div>`:`<button class="hbtn extracted-bridge-style-051" data-action="legacy-call" data-call="acceptRepeatable" data-call-args="${i}"> ${t("m.quest_ui.5")}</button>`}
 </div>`;
 }).join('');
 html += `<div class="extracted-template-style-131">
 <button class="hbtn extracted-bridge-style-052" data-action="legacy-call" data-call="rollRepeatables" data-call-args="">🎲 ${t("m.quest_ui.4")}</button>
 <button class="hbtn extracted-bridge-style-044" data-action="legacy-call" data-call="closeQuestModal" data-call-args=""> ${t("m.quest_ui.3")}</button>
 </div>`;
 const bEl=document.getElementById('quest-body'); if(bEl) bEl.innerHTML=html;
}
function acceptRepeatable(i){
 ensureQuestState();
 const tpl = _repeatableRoll[i];
 if(!tpl) return;
 if((G.repeatables||[]).length >= (G.maxRepeatables||3)){
 const lang = G.lang||'fr';
 notify(tr("m.quest_ui.2", {p0:G.maxRepeatables||3}),'var(--accent)');
 return;
 }
 if(G.repeatables.some(r=>r.tplId===tpl.id)){ notify(t("legacy_message_n_qu_te_r_p_table_d_j_active"),'var(--green)'); return; }
 G.repeatables.push({qid:'r_'+tpl.id, tplId:tpl.id, cat:'repeatable', def:tpl, progress:0, done:false});
 closeQuestModal();
 updateHeader();
 try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 saveGame();
 const lang=G.lang||'fr';
 notify(t("m.quest_ui.1"),'var(--accent)');
}
