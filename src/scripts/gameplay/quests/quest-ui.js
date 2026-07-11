
// ===== extracted from src/scripts/gameplay/quests.js =====
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
 panel.innerHTML = `<div style="text-align:center;padding:14px;color:var(--light1);font-size: 13px;line-height:1.6;">\n 📜 ${t("m.quest_ui.27")}</div>`;
 return;
 }

 const qCard = (inst, cat, def, numLabel)=>{
 const prog = (inst.progress||0);
 const tgt = def.target||1;
 const done = questDone(inst, def);
 const pct = clamp(Math.floor((prog/tgt)*100),0,100);
 const btnText = t("m.quest_ui.26");
 const qt = getQuestText(cat, def.id);
 const ttl = (numLabel?numLabel+' ':'') + qt.title;
 const dsc = qt.desc;
 const rew = qt.rewardDesc;
 let body;
 if(def.type==='badge'){
 body = `<div style="font-size:13px;color:${done?'var(--green)':'var(--light2)'};font-weight:bold;margin:2px 0 6px;">${done?(t("m.quest_ui.25")):(t("m.quest_ui.24"))}</div>`;
 } else if(def.type==='talk'){
 body = `<div style="font-size:13px;color:${done?'var(--green)':'var(--light2)'};font-weight:bold;margin:2px 0 6px;">${done?(t("m.quest_ui.23")):(t("m.quest_ui.22"))}</div>`;
 } else {
 body = `<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--light1);"><span>${t("m.quest_ui.21")}</span><span style="color:${done?'var(--green)':'var(--light2)'};font-weight:bold;">${done?'':prog+' / '+tgt}</span></div>\n <div style="height:6px;background:#221e1c;border-radius:3px;overflow:hidden;margin:4px 0 6px;"><div style="width:${pct}%;background:${done?'var(--green)':'var(--light2)'};height:100%;transition:width .3s;"></div></div>`;
 }
 return `<div style="background:rgba(255,255,255,0.04);border:1px solid #3a322c;border-radius:6px;padding:8px;margin-bottom:8px;">\n <div style="font-weight:bold;color:#fff;font-size: 13px;">${ttl}</div>\n <div style="color:#bbb;font-size:13px;line-height:1.4;margin:4px 0;">${dsc}</div>\n ${body}\n <div style="background:rgba(148,136,107,0.08);border:1px solid rgba(148,136,107,0.25);padding:4px 6px;border-radius:4px;font-size: 13px;margin-bottom:6px;color:var(--light2);"> ${rew}</div>\n <button class="hbtn"style="width:100%;padding:6px;font-size:13px;font-weight:bold;background:${done?(def.rewardPoke?'var(--accent)':'var(--green)'):'#332a22'};color:#fff;cursor:${done?'pointer':'not-allowed'};border:1px solid ${done?'#388e3c':'#44382e'};opacity:${done?1:0.6};"\n ${done?`onclick="claimQuest('${inst.qid}','${cat}')"`:'disabled'}>${done?btnText:(t("m.quest_ui.20"))}</button>\n </div>`;
 };

 let html='';
 if(mainDef){
 const step = (G.mainStep[region]||0)+1;
 html += `<div style="font-weight:bold;color:var(--light2);font-size: 13px;margin:2px 0 6px;border-bottom:1px solid #3a322c;padding-bottom:3px;">📖 ${t("m.quest_ui.19")} (${regionName} — ${step}/${total})</div>`;
 html += qCard(mainInst, 'main', mainDef, step+'.');
 }
 if(sideActive.length){
 html += `<div style="font-weight:bold;color:var(--blue);font-size: 13px;margin:10px 0 6px;border-bottom:1px solid #3a322c;padding-bottom:3px;">🗣 ${t("m.quest_ui.18")} (${regionName})</div>`;
 for(const inst of sideActive){ const def=SIDE_QUESTS[inst.qid]; if(def) html+=qCard(inst,'side',def,''); }
 }
 if(repsActive.length){
 html += `<div style="font-weight:bold;color:var(--accent);font-size: 13px;margin:10px 0 6px;border-bottom:1px solid #3a322c;padding-bottom:3px;">🔁 ${t("m.quest_ui.17")} (${tr("m.repeatable_limit", {n: (G.maxRepeatables||3)})})</div>`;
 for(const inst of repsActive){ const def=inst.def; if(def) html+=qCard(inst,'repeatable',def,''); }
 }
 html += `<div style="margin-top:8px;">\n <button class="hbtn"style="width:100%;background:var(--accent);color:#fff;font-size:13px;font-weight:bold;"onclick="openRepeatableMenu()">🔁 ${t("m.quest_ui.16")}</button>\n </div>`;
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
 let html = `<div style="background:rgba(123,63,160,0.15);border:1px solid #7b3fa0;padding:8px 10px;border-radius:6px;margin-bottom:8px;">
 <div style="font-weight:bold;color:#c79be0;margin-bottom:4px;">🗣 ${npcName}</div>
 ${lines.map(l=>`<div style="font-size: 13px;color:#eee;line-height:1.5;margin-bottom:4px;">« ${l} »</div>`).join('')}
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
 html += `<div style="color:var(--light2);font-size: 13px;margin:6px 0;">📌 ${t("m.quest_ui.15")} ${ttl}</div>`;
 } else if(done){
 html += `<div style="color:var(--green);font-size: 13px;margin:6px 0;"> ${t("m.quest_ui.14")} ${ttl}</div>`;
 } else {
 html += `<div style="background:rgba(148,136,107,0.08);border:1px solid rgba(148,136,107,0.3);padding:6px 8px;border-radius:6px;margin:6px 0;">
 <div style="font-weight:bold;color:var(--light2);font-size: 13px;"> ${ttl}</div>
 <div style="font-size:13px;color:#ccc;margin:4px 0;">${dsc}</div>
 <div style="font-size:13px;color:var(--light2);margin-bottom:6px;"> ${rew}</div>
 <button class="hbtn"style="background:var(--green);color:#fff;font-weight:bold;width:100%;"onclick="acceptSideQuest('${npc.quest}')"> ${t("m.quest_ui.13")}</button>
 </div>`;
 }
 }
 if(npc.board){
 html += `<button class="hbtn"style="background:var(--accent);color:#fff;font-weight:bold;width:100%;margin-top:6px;"onclick="openRepeatableMenu()">🔁 ${t("m.quest_ui.12")}</button>`;
 }
 html += `<div style="text-align:right;margin-top:10px;"><button class="hbtn"onclick="closeQuestModal()"> ${t("m.quest_ui.11")}</button></div>`;
 if(talkedMain){
 html += `<div style="color:var(--light2);font-size: 13px;margin:6px 0;">📖 ${t("m.quest_ui.10")}</div>`;
 }
 const tEl=document.getElementById('quest-title'); if(tEl) tEl.textContent = '🗣 ' + npcName;
 const bEl=document.getElementById('quest-body'); if(bEl) bEl.innerHTML = html;
 const mEl=document.getElementById('quest-modal'); if(mEl) mEl.classList.add('open');
}
function acceptSideQuest(sid){
 ensureQuestState();
 if(!SIDE_QUESTS[sid]) return;
 if(G.activeQuests.some(i=>i.qid===sid && i.cat==='side')){ notify(t("n.quête_déjà_active"),'var(--light2)'); return; }
 if(G.completedQuests['side_'+sid]){ notify(t("n.quête_déjà_terminée"),'var(--green)'); return; }
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
 // Filter the pool: only include Johto-location quests if Johto has been visited.
 const pool = REPEATABLE_QUESTS.filter(q => {
 if(!q.loc) return true; // global quests always available
 // Johto locations start with 'j' or are known Johto dungeons
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
 let html = `<div style="font-size: 13px;color:#ccc;margin-bottom:8px;">${t("m.quest_ui.7")}</div>`;
 html += _repeatableRoll.map((tpl,i)=>{
 const active = G.repeatables.some(r=>r.tplId===tpl.id);
 const rt = getQuestText('repeatable', tpl.id);
 const ttl = rt.title;
 const dsc = rt.desc;
 const rew = rt.rewardDesc;
 return `<div style="background:rgba(156,39,176,0.1);border:1px solid var(--accent);padding:8px;border-radius:6px;margin-bottom:8px;">
 <div style="font-weight:bold;color:#d9a6f0;font-size: 13px;">${tpl.icon||'🔁'} ${ttl}</div>
 <div style="font-size:13px;color:#ccc;margin:4px 0;">${dsc}</div>
 <div style="font-size:13px;color:var(--light2);margin-bottom:6px;"> ${rew}</div>
 ${active?`<div style="color:var(--green);font-size:13px;"> ${t("m.quest_ui.6")}</div>`:`<button class="hbtn"style="background:var(--accent);color:#fff;font-weight:bold;width:100%;"onclick="acceptRepeatable(${i})"> ${t("m.quest_ui.5")}</button>`}
 </div>`;
 }).join('');
 html += `<div style="display:flex;gap:8px;">
 <button class="hbtn"style="flex:1;background:#444;color:#fff;"onclick="rollRepeatables()">🎲 ${t("m.quest_ui.4")}</button>
 <button class="hbtn"style="flex:1;"onclick="closeQuestModal()"> ${t("m.quest_ui.3")}</button>
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
 if(G.repeatables.some(r=>r.tplId===tpl.id)){ notify(t("n.quête_répétable_déjà_active"),'var(--green)'); return; }
 G.repeatables.push({qid:'r_'+tpl.id, tplId:tpl.id, cat:'repeatable', def:tpl, progress:0, done:false});
 closeQuestModal();
 updateHeader();
 try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 saveGame();
 const lang=G.lang||'fr';
 notify(t("m.quest_ui.1"),'var(--accent)');
}



