
// ===== extracted from src/scripts/gameplay/quests.js =====
function renderStoryWindow(){
  const panel = document.getElementById('story-panel');
  if(!panel) return;
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  ensureQuestState();
  const titleEl = document.getElementById('story-win-title');
  if(titleEl) titleEl.textContent = lang==='en' ? 'Story & Quests' : 'Histoire & Quêtes';

  const region = G.region || 'kanto';
  const regionName = region==='johto' ? (lang==='en'?'Johto':'Johto') : (lang==='en'?'Kanto':'Kanto');
  const chain = getRegionChain(region);
  const total = chain.length;

  const mainInst = G.activeQuests.find(i=>i.cat==='main');
  const mainDef = mainInst ? getMainQuestDef(mainInst.qid) : null;
  const sideActive = G.activeQuests.filter(i=>i.cat==='side' && SIDE_QUESTS[i.qid] && SIDE_QUESTS[i.qid].region===region);
  const repsActive = G.repeatables || [];

  if(!mainDef && !sideActive.length && !repsActive.length){
    panel.innerHTML = `<div style="text-align:center;padding:14px;color:var(--dim);font-size:12px;line-height:1.6;">\n      📜 ${lang==='en'?'No active quests yet.<br>Talk to NPCs in towns (🗣 markers on the map) for side quests,<br>or open the Repeatable Quests board!':'Aucune quête active pour l’instant.<br>Parlez aux PNJ des villes (marqueurs 🗣 sur la carte) pour des quêtes secondaires,<br>ou ouvrez le tableau de Quêtes Répétables !'}</div>`;
    return;
  }

  const qCard = (inst, cat, def, numLabel)=>{
    const prog = (inst.progress||0);
    const tgt = def.target||1;
    const done = questDone(inst, def);
    const pct = clamp(Math.floor((prog/tgt)*100),0,100);
    const btnText = lang==='en'?'🎉 Claim Reward!':'🎉 Réclamer la récompense !';
    const ttl = (numLabel?numLabel+' ':'') + (lang==='en'?def.title_en:def.title_fr);
    const dsc = lang==='en'?def.desc_en:def.desc_fr;
    const rew = lang==='en'?def.rewardDesc_en:def.rewardDesc_fr;
    let body;
    if(def.type==='badge'){
      body = `<div style="font-size:11px;color:${done?'var(--green)':'var(--gold)'};font-weight:bold;margin:2px 0 6px;">${done?(lang==='en'?'✅ Badge obtained!':'✅ Badge obtenu !'):(lang==='en'?'Defeat the Gym Leader to complete':'Vainquez le Champion d’Arène pour terminer')}</div>`;
    } else if(def.type==='talk'){
      body = `<div style="font-size:11px;color:${done?'var(--green)':'var(--gold)'};font-weight:bold;margin:2px 0 6px;">${done?(lang==='en'?'✅ You spoke with the NPC!':'✅ Vous avez parlé au PNJ !'):(lang==='en'?'Talk to the indicated NPC':'Parlez au PNJ indiqué')}</div>`;
    } else {
      body = `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--dim);"><span>${lang==='en'?'Progress:':'Progression :'}</span><span style="color:${done?'var(--green)':'var(--gold)'};font-weight:bold;">${done?'✅':prog+' / '+tgt}</span></div>\n        <div style="height:6px;background:#221e1c;border-radius:3px;overflow:hidden;margin:4px 0 6px;"><div style="width:${pct}%;background:${done?'var(--green)':'var(--gold)'};height:100%;transition:width .3s;"></div></div>`;
    }
    return `<div style="background:rgba(255,255,255,0.04);border:1px solid #3a322c;border-radius:6px;padding:8px;margin-bottom:8px;">\n      <div style="font-weight:bold;color:#fff;font-size:12px;">${ttl}</div>\n      <div style="color:#bbb;font-size:11px;line-height:1.4;margin:4px 0;">${dsc}</div>\n      ${body}\n      <div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.25);padding:4px 6px;border-radius:4px;font-size:10px;margin-bottom:6px;color:var(--gold);">🎁 ${rew}</div>\n      <button class="hbtn" style="width:100%;padding:6px;font-size:11px;font-weight:bold;background:${done?(def.rewardPoke?'var(--purple)':'var(--green)'):'#332a22'};color:#fff;cursor:${done?'pointer':'not-allowed'};border:1px solid ${done?'#388e3c':'#44382e'};opacity:${done?1:0.6};"\n        ${done?`onclick="claimQuest('${inst.qid}','${cat}')"`:'disabled'}>${done?btnText:(lang==='en'?'⏳ In progress...':'⏳ En cours...')}</button>\n    </div>`;
  };

  let html='';
  if(mainDef){
    const step = (G.mainStep[region]||0)+1;
    html += `<div style="font-weight:bold;color:var(--gold);font-size:12px;margin:2px 0 6px;border-bottom:1px solid #3a322c;padding-bottom:3px;">📖 ${lang==='en'?'Main Quests':'Quêtes Principales'} (${regionName} — ${step}/${total})</div>`;
    html += qCard(mainInst, 'main', mainDef, step+'.');
  }
  if(sideActive.length){
    html += `<div style="font-weight:bold;color:var(--blue);font-size:12px;margin:10px 0 6px;border-bottom:1px solid #3a322c;padding-bottom:3px;">🗣️ ${lang==='en'?'Side Quests':'Quêtes Secondaires'} (${regionName})</div>`;
    for(const inst of sideActive){ const def=SIDE_QUESTS[inst.qid]; if(def) html+=qCard(inst,'side',def,''); }
  }
  if(repsActive.length){
    html += `<div style="font-weight:bold;color:var(--purple);font-size:12px;margin:10px 0 6px;border-bottom:1px solid #3a322c;padding-bottom:3px;">🔁 ${lang==='en'?'Repeatable Quests':'Quêtes Répétables'} (${lang==='en'?('Limit '+(G.maxRepeatables||3)):('Limite '+(G.maxRepeatables||3))})</div>`;
    for(const inst of repsActive){ const def=inst.def; if(def) html+=qCard(inst,'repeatable',def,''); }
  }
  html += `<div style="margin-top:8px;">\n    <button class="hbtn" style="width:100%;background:var(--purple);color:#fff;font-size:11px;font-weight:bold;" onclick="openRepeatableMenu()">🔁 ${lang==='en'?'Open Repeatable Quests Board':'Ouvrir le Tableau de Quêtes Répétables'}</button>\n  </div>`;
  panel.innerHTML = html;
}
function openNpc(locId, idx){
  ensureQuestState();
  const arr = (typeof NPCS!=='undefined') ? NPCS[locId] : null;
  if(!arr || !arr[idx]) return;
  const npc = arr[idx];
  const talkedMain = talkNpcMainQuest(npc);
  const lang = G.lang||'fr';
  const lines = (lang==='en') ? (npc.lines_en||npc.lines_fr||[]) : (npc.lines_fr||npc.lines_en||[]);
  let html = `<div style="background:rgba(123,63,160,0.15);border:1px solid #7b3fa0;padding:8px 10px;border-radius:6px;margin-bottom:8px;">
      <div style="font-weight:bold;color:#c79be0;margin-bottom:4px;">🗣 ${npc.name}</div>
      ${lines.map(l=>`<div style="font-size:12px;color:#eee;line-height:1.5;margin-bottom:4px;">« ${l} »</div>`).join('')}
    </div>`;

  if(npc.quest && SIDE_QUESTS[npc.quest]){
    const sq = SIDE_QUESTS[npc.quest];
    const active = G.activeQuests.some(i=>i.qid===npc.quest && i.cat==='side');
    const done = G.completedQuests['side_'+npc.quest];
    const ttl = lang==='en'?sq.title_en:sq.title_fr;
    const dsc = lang==='en'?sq.desc_en:sq.desc_fr;
    const rew = lang==='en'?sq.rewardDesc_en:sq.rewardDesc_fr;
    if(active){
      html += `<div style="color:var(--gold);font-size:12px;margin:6px 0;">📌 ${lang==='en'?'Side quest in progress:':'Quête secondaire en cours :'} ${ttl}</div>`;
    } else if(done){
      html += `<div style="color:var(--green);font-size:12px;margin:6px 0;">✅ ${lang==='en'?'Quest already completed:':'Quête déjà terminée :'} ${ttl}</div>`;
    } else {
      html += `<div style="background:rgba(255,215,0,0.08);border:1px solid rgba(255,215,0,0.3);padding:6px 8px;border-radius:6px;margin:6px 0;">
        <div style="font-weight:bold;color:var(--gold);font-size:12px;">📋 ${ttl}</div>
        <div style="font-size:11px;color:#ccc;margin:4px 0;">${dsc}</div>
        <div style="font-size:11px;color:var(--gold);margin-bottom:6px;">🎁 ${rew}</div>
        <button class="hbtn" style="background:var(--green);color:#fff;font-weight:bold;width:100%;" onclick="acceptSideQuest('${npc.quest}')">✅ ${lang==='en'?'Accept Quest':'Accepter la quête'}</button>
      </div>`;
    }
  }
  if(npc.board){
    html += `<button class="hbtn" style="background:var(--purple);color:#fff;font-weight:bold;width:100%;margin-top:6px;" onclick="openRepeatableMenu()">🔁 ${lang==='en'?'Repeatable Quests Board':'Tableau de Quêtes Répétables'}</button>`;
  }
  html += `<div style="text-align:right;margin-top:10px;"><button class="hbtn" onclick="closeQuestModal()">✕ ${lang==='en'?'Close':'Fermer'}</button></div>`;
  if(talkedMain){
    html += `<div style="color:var(--gold);font-size:12px;margin:6px 0;">📖 ${lang==='en'?'Main quest objective updated!':'Objectif de quête principale mis à jour !'}</div>`;
  }
  const tEl=document.getElementById('quest-title'); if(tEl) tEl.textContent = '🗣️ ' + npc.name;
  const bEl=document.getElementById('quest-body'); if(bEl) bEl.innerHTML = html;
  const mEl=document.getElementById('quest-modal'); if(mEl) mEl.classList.add('open');
}
function acceptSideQuest(sid){
  ensureQuestState();
  if(!SIDE_QUESTS[sid]) return;
  if(G.activeQuests.some(i=>i.qid===sid && i.cat==='side')){ notify('📌 Quête déjà active.','var(--gold)'); return; }
  if(G.completedQuests['side_'+sid]){ notify('✅ Quête déjà terminée.','var(--green)'); return; }
  G.activeQuests.push({qid:sid, cat:'side', progress:0, done:false});
  closeQuestModal();
  updateHeader();
  try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
  try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
  saveGame();
  const lang=G.lang||'fr';
  notify(lang==='en'?'📋 Side quest accepted!':'📋 Quête secondaire acceptée !','var(--blue)');
}
function closeQuestModal(){
  const m=document.getElementById('quest-modal'); if(m) m.classList.remove('open');
}
function rollRepeatables(){
  const pool = REPEATABLE_QUESTS.slice();
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
  if(tEl) tEl.textContent = (G.lang==='en'?'🔁 Repeatable Quests':'🔁 Quêtes Répétables');
  const mEl=document.getElementById('quest-modal'); if(mEl) mEl.classList.add('open');
}
function renderRepeatableBoard(){
  const lang=G.lang||'fr';
  let html = `<div style="font-size:12px;color:#ccc;margin-bottom:8px;">${lang==='en'?'Accept a quest — it stays active until completed, then you can take it again!':'Acceptez une quête — elle reste active jusqu’à complétion, puis vous pouvez la reprendre !'}</div>`;
  html += _repeatableRoll.map((tpl,i)=>{
    const active = G.repeatables.some(r=>r.tplId===tpl.id);
    const ttl = lang==='en'?tpl.title_en:tpl.title_fr;
    const dsc = lang==='en'?tpl.desc_en:tpl.desc_fr;
    const rew = lang==='en'?tpl.rewardDesc_en:tpl.rewardDesc_fr;
    return `<div style="background:rgba(156,39,176,0.1);border:1px solid var(--purple);padding:8px;border-radius:6px;margin-bottom:8px;">
      <div style="font-weight:bold;color:#d9a6f0;font-size:12px;">${tpl.icon||'🔁'} ${ttl}</div>
      <div style="font-size:11px;color:#ccc;margin:4px 0;">${dsc}</div>
      <div style="font-size:11px;color:var(--gold);margin-bottom:6px;">🎁 ${rew}</div>
      ${active?`<div style="color:var(--green);font-size:11px;">✅ ${lang==='en'?'Already active':'Déjà active'}</div>`:`<button class="hbtn" style="background:var(--purple);color:#fff;font-weight:bold;width:100%;" onclick="acceptRepeatable(${i})">✅ ${lang==='en'?'Accept':'Accepter'}</button>`}
    </div>`;
  }).join('');
  html += `<div style="display:flex;gap:8px;">
      <button class="hbtn" style="flex:1;background:#444;color:#fff;" onclick="rollRepeatables()">🎲 ${lang==='en'?'Roll new quests':'Relancer'}</button>
      <button class="hbtn" style="flex:1;" onclick="closeQuestModal()">✕ ${lang==='en'?'Close':'Fermer'}</button>
    </div>`;
  const bEl=document.getElementById('quest-body'); if(bEl) bEl.innerHTML=html;
}
function acceptRepeatable(i){
  ensureQuestState();
  const tpl = _repeatableRoll[i];
  if(!tpl) return;
  if((G.repeatables||[]).length >= (G.maxRepeatables||3)){
    const lang = G.lang||'fr';
    notify(lang==='en'?`🔁 Repeatable quest limit reached (${G.maxRepeatables||3}). Claim one first!`:`🔁 Limite de quêtes répétables atteinte (${G.maxRepeatables||3}). Réclamez-en une d'abord !`,'var(--purple)');
    return;
  }
  if(G.repeatables.some(r=>r.tplId===tpl.id)){ notify('✅ Quête répétable déjà active.','var(--green)'); return; }
  G.repeatables.push({qid:'r_'+tpl.id, tplId:tpl.id, cat:'repeatable', def:tpl, progress:0, done:false});
  closeQuestModal();
  updateHeader();
  try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
  try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
  saveGame();
  const lang=G.lang||'fr';
  notify(lang==='en'?'🔁 Repeatable quest accepted!':'🔁 Quête répétable acceptée !','var(--purple)');
}

