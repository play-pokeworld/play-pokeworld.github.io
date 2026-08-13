// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}
// Wave 23 (REAL BUG FIX): quest-core.js declares `_repeatableRoll` (L751) but
// quest-ui.js is its sole consumer. Under native ES modules (main.js import
// chain, vite dev, esbuild iife bundle) module scopes differ, so the bare
// reads/assignments below threw `ReferenceError: _repeatableRoll is not
// defined` when opening the repeatable-quest menu in a real browser
// (vm-sandboxed unit tests share one classic scope and never saw it).
// quest-ui.js now OWNS the variable; window is mirrored for legacy scripts
// that may read it, and quest-core keeps its own harmless declaration.
export let _repeatableRoll = (typeof window !== 'undefined' && Array.isArray(window._repeatableRoll)) ? window._repeatableRoll : [];
if (typeof globalThis !== 'undefined') globalThis._repeatableRoll = _repeatableRoll;

function renderStoryWindow(){
 const panel = document.getElementById('story-panel');
 if(!panel) return;
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
 const views0 = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views0 || !views0.StoryWindowView) throw new Error('[ui] PokeUI views not loaded (StoryWindowView)');
 _pwSetHtmlSafe(panel, views0.StoryWindowView.toHTML({
  tutorialHtml: (typeof renderTutorialQuestBlock === 'function' ? renderTutorialQuestBlock() : ''),
  emptyState: { iconHtml: (typeof getIcon==='function'?getIcon('story',16):''), label: t("m.quest_ui.27"), boardIconHtml: (typeof getIcon==='function'?getIcon('rematch',14):''), boardLabel: t("m.quest_ui.16") },
 }));
 return;
 }

 // Wave 20 (ECS DS): the window content is rendered from zero by
 // StoryWindowView — this adapter only shapes (localized) models. The
 // action contracts (startQuestTrainerBattle / claimQuest / openRepeatableMenu,
 // quoted 'qid','cat' args) are unchanged. DS rule: no greyed-out DEAD
 // button — while a quest is not claimable the card shows an informative
 // line ("En cours…") instead of a disabled hbtn.
 const qCardModel = (inst, cat, def, numLabel)=>{
 const prog = (typeof questProgressValue === 'function') ? questProgressValue(inst, def) : (inst.progress||0);
 const tgt = def.target||1;
 const done = questDone(inst, def);
 const pct = clamp(Math.floor((prog/tgt)*100),0,100);
 const qt = getQuestText(cat, def.id);
 const card = {
  title: (numLabel?numLabel+' ':'') + qt.title,
  desc: qt.desc,
  rewardText: qt.rewardDesc,
  done: done,
 };
 // action: challenge (trainer battle) / claim (done) / informative line
 if(def.type==='trainer_battle' && !done){
  card.action = { cls: 'is-challenge', call: 'startQuestTrainerBattle', callArgs: `'${inst.qid}','${cat}'`, label: t('quest_challenge_btn') };
 } else if(done){
  card.action = { cls: 'is-done', call: 'claimQuest', callArgs: `'${inst.qid}','${cat}'`, label: t("m.quest_ui.26") };
 }
 if(def.type==='badge'){
  card.kind = 'text'; card.bodyText = done ? t("m.quest_ui.25") : t("m.quest_ui.24");
 } else if(def.type==='talk'){
  card.kind = 'text'; card.bodyText = done ? t("m.quest_ui.23") : t("m.quest_ui.22");
 } else if(def.type==='item'){
 // Phase 18: texte generique (Pokeflute, Aile of Argent, Aile Arc-in-ciel…)
 const reqKey = def.requiredItem || 'pokeflute';
 const reqName = (typeof getItemName==='function' ? getItemName(reqKey) : reqKey);
 const keyDone = 'quest_item_obtained', keyTodo = 'quest_item_obtain';
 const txtDone = (typeof t==='function' && t(keyDone)!==keyDone) ? tr(keyDone, {item:reqName}) : reqName + ' obtenu !';
 const txtTodo = (typeof t==='function' && t(keyTodo)!==keyTodo) ? tr(keyTodo, {item:reqName}) : 'Obtenez : ' + reqName;
  card.kind = 'text'; card.bodyText = done ? txtDone : txtTodo;
 } else if(def.type==='trainer_battle'){
 const trainer = typeof getTrainerBattleDef === 'function' ? getTrainerBattleDef(def.battleId) : null;
  card.kind = 'trainer';
  card.trainerText = done ? t('trainer_battle_done') : tr('trainer_battle_target', {trainer:typeof getTrainerBattleName==='function'?getTrainerBattleName(def.battleId):(trainer?trainer.name:def.battleId)});
  card.trainerHint = done ? '' : t('trainer_battle_hint');
 } else {
  card.kind = 'progress';
  card.progressLabel = t("m.quest_ui.21");
  card.progressValue = done ? `${t('ready')}` : (prog + ' / ' + tgt);
  card.pct = pct;
 }
 if(!card.action) card.infoText = t("m.quest_ui.20");
 return card;
 };

 const model = {
  tutorialHtml: (typeof renderTutorialQuestBlock === 'function' ? renderTutorialQuestBlock() : ''),
  blocks: [],
  footer: null,
 };
 if(mainDef){
 const step = (G.mainStep[region]||0)+1;
  model.blocks.push({ type: 'section', tone: 'story', iconHtml: (typeof getIcon==='function'?getIcon('story',16):''), label: `${t("m.quest_ui.19")} (${regionName} — ${step}/${total})` });
  model.blocks.push({ type: 'card', card: qCardModel(mainInst, 'main', mainDef, step+'.') });
 }
 if(sideActive.length){
  model.blocks.push({ type: 'section', tone: 'blue', iconHtml: (typeof getIcon==='function'?getIcon('npc',16):''), label: `${t("m.quest_ui.18")} (${regionName})` });
 for(const inst of sideActive){ const def=SIDE_QUESTS[inst.qid]; if(def) model.blocks.push({ type: 'card', card: qCardModel(inst,'side',def,'') }); }
 }
 if(repsActive.length){
  model.blocks.push({ type: 'section', tone: 'accent', iconHtml: (typeof getIcon==='function'?getIcon('rematch',16):''), label: `${t("m.quest_ui.17")} (${tr("m.repeatable_limit", {n: (G.maxRepeatables||3)})})` });
 for(const inst of repsActive){ const def=inst.def; if(def) model.blocks.push({ type: 'card', card: qCardModel(inst,'repeatable',def,'') }); }
 }
  if(G.repeatableQuestsUnlocked){
    model.footer = { kind: 'board', iconHtml: (typeof getIcon==='function'?getIcon('rematch',14):''), label: t("m.quest_ui.16") };
  } else {
    model.footer = { kind: 'hint', text: (typeof t === 'function' ? t('repeatable_unlock_hint') : '🔒 Talk to Swimmer Ondee in Cerulean to unlock Repeatable Quests.') };
  }
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.StoryWindowView) throw new Error('[ui] PokeUI views not loaded (StoryWindowView)');
 _pwSetHtmlSafe(panel, views.StoryWindowView.toHTML(model));
}

function claimFirstTimeNpcReward(locId, idx, npcName) {
  if (!G.npcRewardsClaimed || typeof G.npcRewardsClaimed !== 'object') G.npcRewardsClaimed = {};
  const key = locId + '_' + idx;
  if (G.npcRewardsClaimed[key]) return false;

  let claimed = false;
  if ((npcName === "Président Fan Club" || npcName === "Fan Club President") && locId === 'vermilion') {
    G.npcRewardsClaimed[key] = true;
    addToInventory('rarecandy', 1);
    G.money = (G.money || 0) + 1000;
    notify(t('npc_reward_received') + " : 1 Super Bonbon + 1 000₽ !", "var(--green)");
    claimed = true;
  } else if ((npcName === "Léo" || npcName === "Bill") && locId === 'billshouse') {
    const isQ13Active = (G.activeQuests || []).some(i => i.qid === 13 && i.cat === 'main');
    if (!isQ13Active) {
      G.npcRewardsClaimed[key] = true;
      addToInventory('upgrade', 1);
      G.money = (G.money || 0) + 1000;
      notify(t('leo_reward_received') + " : 1 Évoluteur + 1 000₽ !", "var(--green)");
      claimed = true;
    }
  } else if ((npcName === "Employé de la Sylphe" || npcName === "Silph Employee") && locId === 'saffron') {
    G.npcRewardsClaimed[key] = true;
    G.money = (G.money || 0) + 1500;
    const lapras = (typeof createPoke === 'function') ? createPoke(131, 1) : null;
    if (lapras) {
      if (G.team.length < 6) G.team.push(lapras);
      else {
        const _qKey = (typeof generateUniqueBoxId === 'function') ? generateUniqueBoxId(131) : ('box_131_' + Date.now());
        G.collection[_qKey] = lapras;
      }
      if (G.pokedex && G.pokedex[131]) G.pokedex[131] = {...G.pokedex[131], seen: true, caught: true};
      if (typeof unlockTalentForSpecies === 'function') unlockTalentForSpecies(131, lapras.talent);
    }
    notify(t('npc_reward_received') + " : Lokhlass (Nv.1) + 1 500₽ !", "var(--green)");
    claimed = true;
  } else if ((npcName === "M. Psyché" || npcName === "Mr. Psychic") && locId === 'saffron') {
    G.npcRewardsClaimed[key] = true;
    addToInventory('twisted_spoon', 1);
    G.money = (G.money || 0) + 1000;
    notify(t('npc_reward_received') + " : 1 Cuillère Tordue + 1 000₽ !", "var(--green)");
    claimed = true;
  } else if ((npcName === "Pharmacien Didier" || npcName === "Pharmacist Didier") && locId === 'cianwood') {
    G.npcRewardsClaimed[key] = true;
    addToInventory('prine_berry', 1);
    G.money = (G.money || 0) + 1500;
    notify(t('npc_reward_received') + " : 1 Baie Prine + 1 500₽ !", "var(--green)");
    claimed = true;
  }

  if (claimed) {
    saveGame();
    try { if (document.getElementById('location-info-body')) renderLocationInfo(); } catch (_) {}
  }
  return claimed;
}

function openNpc(locId, idx){
 ensureQuestState();
 if (!G.npcTalked || typeof G.npcTalked !== 'object') G.npcTalked = {};
 G.npcTalked[locId + '_' + idx] = true;
 const arr = (typeof NPCS!=='undefined') ? NPCS[locId] : null;
 if(!arr || !arr[idx]) return;
 const npc = arr[idx];
 const talkedMain = talkNpcMainQuest(npc);
  const npcText = getNpc(locId, idx);
  const npcName = npcText.name;
  
  claimFirstTimeNpcReward(locId, idx, npcName);

  if((npcName === "Nageuse Ondée" || npcName === "Swimmer Ondée" || npcName === "Swimmer Ondee") && !G.repeatableQuestsUnlocked){
    G.repeatableQuestsUnlocked = true;
    saveGame();
    notify(t('repeatable_quests_unlocked'), "var(--green)");
    setTimeout(() => {
      try { renderStoryWindow(); } catch(_){}
    }, 100);
  }
 let lines = Array.isArray(npcText.lines) ? [...npcText.lines] : [];
 const key = locId + '_' + idx;
 if (G.npcRewardsClaimed && G.npcRewardsClaimed[key]) {
   if (npcName === "Président Fan Club" || npcName === "Fan Club President") {
     lines = [(G.lang === 'en') ? "My Pokémon are the cutest in the world! Thank you for listening so passionately." : "Mes Pokémon sont les plus mignons du monde ! Merci d'avoir écouté mes histoires avec tant de passion."];
   } else if (npcName === "Léo" || npcName === "Bill") {
     lines = [(G.lang === 'en') ? "Thanks again for visiting! My teleporter and Storage System are working like a charm." : "Merci encore d'être passé ! Mon téléporteur et mon Système de Stockage fonctionnent à merveille maintenant."];
   } else if (npcName === "Employé de la Sylphe" || npcName === "Silph Employee") {
     lines = [(G.lang === 'en') ? "Take good care of little Lapras! It has great potential." : "Prenez bien soin du petit Lokhlass ! Il a un grand potentiel dans votre équipe."];
   } else if (npcName === "M. Psyché" || npcName === "Mr. Psychic") {
     lines = [(G.lang === 'en') ? "The Twisted Spoon boosts the power of Psychic moves!" : "La Cuillère Tordue augmente la puissance des capacités Psy !"];
   } else if (npcName === "Pharmacien Didier" || npcName === "Pharmacist Didier") {
     lines = [(G.lang === 'en') ? "Amphy at the Lighthouse is feeling much better thanks to you!" : "Amphy au Phare va mieux grâce à toi ! Bonne route en Johto."];
   }
 }
 // Wave 20 (ECS DS): the dialog body is rendered from zero by
 // NpcDialogView — model shaping only, action contracts unchanged
 // (acceptSideQuest / openRepeatableMenu / closeQuestModal).
 const dlgModel = {
  npcIconHtml: (typeof getIcon==='function'?getIcon('npc',16):''),
  npcName: npcName,
  lines: lines,
  quest: null,
  board: npc.board ? { iconHtml: (typeof getIcon==='function'?getIcon('rematch',14):''), label: t("m.quest_ui.12") } : null,
  closeLabel: t("m.quest_ui.11"),
  talkedMainText: talkedMain ? t("m.quest_ui.10") : null,
  storyIconHtml: talkedMain ? ((typeof getIcon==='function'?getIcon('story',16):'')) : null,
 };

 if(npc.quest && SIDE_QUESTS[npc.quest]){
 const sq = SIDE_QUESTS[npc.quest];
 const active = G.activeQuests.some(i=>i.qid===npc.quest && i.cat==='side');
 const done = G.completedQuests['side_'+npc.quest];
 const sqt = getQuestText('side', sq.id);
 if(active){
  dlgModel.quest = { state: 'active', iconHtml: (typeof getIcon==='function'?getIcon('quests',16):''), text: `${t("m.quest_ui.15")} ${sqt.title}` };
 } else if(done && sq.type==='puzzle'){
  dlgModel.quest = { state: 'doneReplay', title: '✓ ' + sqt.title, doneSuffix: (G.lang==='en')?'Already cleared · replayable':'Déjà terminée · rejouable', desc: sqt.desc, rewardText: sqt.rewardDesc, actionLabel: (G.lang==='en')?'Play again':'Rejouer', callArgs: `'${npc.quest}'` };
 } else if(done){
  dlgModel.quest = { state: 'done', text: `${t("m.quest_ui.14")} ${sqt.title}` };
 } else {
  dlgModel.quest = { state: 'offer', title: sqt.title, desc: sqt.desc, rewardText: sqt.rewardDesc, actionLabel: t("m.quest_ui.13"), callArgs: `'${npc.quest}'` };
 }
 }
 const viewsN = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!viewsN || !viewsN.NpcDialogView) throw new Error('[ui] PokeUI views not loaded (NpcDialogView)');
 const tEl=document.getElementById('quest-title'); if(tEl) _pwSetHtmlSafe(tEl, (typeof getIcon==='function'?getIcon('npc',16):'') + ' ' + npcName);
 const bEl=document.getElementById('quest-body'); if(bEl) _pwSetHtmlSafe(bEl, viewsN.NpcDialogView.toHTML(dlgModel));
 // Non-board flows (NPC dialog, side quests) own the whole body — the
 // pinned footer belongs to the repeatable board only.
 const nfEl=document.getElementById('quest-footer'); if(nfEl) nfEl.replaceChildren();
 const mEl=document.getElementById('quest-modal'); if(mEl) mEl.classList.add('open');
}
function acceptSideQuest(sid){
 ensureQuestState();
 if(!SIDE_QUESTS[sid]) return;
 if(G.activeQuests.some(i=>i.qid===sid && i.cat==='side')){ notify(t("legacy_message_n_qu_te_d_j_active"),'var(--light2)'); return; }
 const _sqDef = SIDE_QUESTS[sid];
 const _isPuzzle = _sqDef && _sqDef.type === 'puzzle';
 // Non-puzzle: a single completion. Puzzle: infinitely replayable.
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
 const activeCount = (G.repeatables||[]).length;
 const max = G.maxRepeatables || 1;
 const left = repeatableCooldownLeft();
 // Rebuilt display (ECS design system): the board lives inside the
 // canonical window shell (quest-body / quest-footer pinned actions).
 const model = {
  head: {
   slotsLabel: t('repeatable_slots'),
   activeCount: activeCount,
   max: max,
   timerText: tr('repeatable_reroll_timer', {time:left>0?formatRepeatableCooldown(left):t('ready')}),
   upgradesLabel: t('repeatable_upgrades'),
   upgradesIconHtml: (typeof getIcon==='function'?getIcon('settings',14):'')
  },
  introText: t("m.quest_ui.7"),
  offers: _repeatableRoll.map((tpl,i)=>{
   const active = G.repeatables.some(r=>r.tplId===tpl.id);
   const rt = getQuestText('repeatable', tpl.id);
   return {
    index: i,
    iconHtml: (tpl.iconHtml || (typeof getIcon==='function'?getIcon('rematch',14):'')),
    title: rt.title,
    desc: rt.desc,
    reward: rt.rewardDesc,
    active: active,
    canAccept: (activeCount<max && !active),
    acceptLabel: t("m.quest_ui.5"),
    activeLabel: t("m.quest_ui.6")
   };
  }),
  footer: {
   rerollIconHtml: (typeof getIcon==='function'?getIcon('rematch',14):''),
   rerollLabel: left>0?formatRepeatableCooldown(left):t("m.quest_ui.4"),
   rerollCooldown: left>0,
   closeLabel: t("m.quest_ui.3")
  }
 };
 const views = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!views || !views.QuestView) throw new Error('[ui] PokeUI views not loaded (QuestView)');
 const parts = views.QuestView.toHTML(model);
 const bEl=document.getElementById('quest-body'); if(bEl) _pwSetHtmlSafe(bEl, parts.body);
 const fEl=document.getElementById('quest-footer'); if(fEl) _pwSetHtmlSafe(fEl, parts.footer);
 // Set up timer interval to update the reroll button every second
 if (window._rerollTimerInterval) clearInterval(window._rerollTimerInterval);
 window._rerollTimerInterval = setInterval(function() {
  const bEl2 = document.getElementById('quest-body');
  if (!bEl2 || !bEl2.closest('.open')) {
   clearInterval(window._rerollTimerInterval);
   window._rerollTimerInterval = null;
   return;
  }
  const left2 = repeatableCooldownLeft();
  const fEl2 = document.getElementById('quest-footer');
  const rerollBtn = (fEl2 && fEl2.querySelector) ? fEl2.querySelector('[data-action="legacy-call"][data-call="rollRepeatables"]') : null;
  const timerSpan = bEl2.querySelector('.quest-board-head span');
   if (rerollBtn) {
     // Phase 10: innerHTML (not textContent) — getIcon() returns HTML
     // (<span class="ui-icon…">) that would otherwise render as raw text on the button.
     const iconHtml = (typeof getIcon === 'function' ? getIcon('rematch', 14) : '');
     const label = (left2 <= 0) ? (typeof t === 'function' ? t('m.quest_ui.4') : 'Reroll') : formatRepeatableCooldown(left2);
     _pwSetHtmlSafe(rerollBtn, iconHtml + ' ' + label);
     rerollBtn.disabled = left2 > 0;
     if (left2 <= 0) {
       rerollBtn.setAttribute('data-action', 'legacy-call');
       rerollBtn.setAttribute('data-call', 'rollRepeatables');
       rerollBtn.setAttribute('data-call-args', 'false');
     }
     if (rerollBtn.classList && typeof rerollBtn.classList.toggle === 'function') {
       // Strict rule: the action is hidden while unusable (cooldown).
       rerollBtn.classList.toggle('is-hidden', left2 > 0);
     }
   }
   if (timerSpan) {
     timerSpan.textContent = left2 > 0
       ? (typeof tr === 'function' ? tr('repeatable_reroll_timer', { time: formatRepeatableCooldown(left2) }) : formatRepeatableCooldown(left2))
       : (typeof tr === 'function' ? tr('repeatable_reroll_timer', { time: (typeof t === 'function' ? t('ready') : 'Ready') }) : 'Ready');
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
 // Wave 20 (ECS DS): the panel is rendered from zero by
 // RepeatableUpgradeView — close cross contract (close-poke-modal) and
 // the UNQUOTED numeric call-args are unchanged.
 const viewsU = (typeof window!=='undefined' && window.PokeUI && window.PokeUI.views) ? window.PokeUI.views : null;
 if(!viewsU || !viewsU.RepeatableUpgradeView) throw new Error('[ui] PokeUI views not loaded (RepeatableUpgradeView)');
 _pwSetHtmlSafe(inner, viewsU.RepeatableUpgradeView.toHTML({
  titleHtml: `${typeof getIcon==='function'?getIcon('settings',14):''} ${t('repeatable_upgrades')}`,
  currentTitle: t('repeatable_slots'),
  currentText: tr('repeatable_slots_current', {count:max, max:5}),
  buy: nextCost ? { cost: nextCost, label: `${typeof getIcon==='function'?getIcon('save',14):''} ${tr('repeatable_slot_upgrade_buy', {next:max+1, price:nextCost.toLocaleString()})}` } : null,
  maxText: t('repeatable_slots_max'),
  descText: t('repeatable_reroll_free_desc'),
 }));
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
 if(G.completedQuests) {
   delete G.completedQuests['r_'+tpl.id];
   delete G.completedQuests['repeatable_'+tpl.id];
   delete G.completedQuests[tpl.id];
 }
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
if (typeof renderStoryWindow !== 'undefined') { if (typeof window !== 'undefined') window.renderStoryWindow = renderStoryWindow; if (typeof globalThis !== 'undefined') globalThis.renderStoryWindow = renderStoryWindow; }
if (typeof openNpc !== 'undefined') { if (typeof window !== 'undefined') window.openNpc = openNpc; if (typeof globalThis !== 'undefined') globalThis.openNpc = openNpc; }
if (typeof acceptSideQuest !== 'undefined') { if (typeof window !== 'undefined') window.acceptSideQuest = acceptSideQuest; if (typeof globalThis !== 'undefined') globalThis.acceptSideQuest = acceptSideQuest; }
if (typeof closeQuestModal !== 'undefined') { if (typeof window !== 'undefined') window.closeQuestModal = closeQuestModal; if (typeof globalThis !== 'undefined') globalThis.closeQuestModal = closeQuestModal; }
if (typeof rollRepeatables !== 'undefined') { if (typeof window !== 'undefined') window.rollRepeatables = rollRepeatables; if (typeof globalThis !== 'undefined') globalThis.rollRepeatables = rollRepeatables; }
if (typeof openRepeatableMenu !== 'undefined') { if (typeof window !== 'undefined') window.openRepeatableMenu = openRepeatableMenu; if (typeof globalThis !== 'undefined') globalThis.openRepeatableMenu = openRepeatableMenu; }
if (typeof renderRepeatableBoard !== 'undefined') { if (typeof window !== 'undefined') window.renderRepeatableBoard = renderRepeatableBoard; if (typeof globalThis !== 'undefined') globalThis.renderRepeatableBoard = renderRepeatableBoard; }
if (typeof acceptRepeatable !== 'undefined') { if (typeof window !== 'undefined') window.acceptRepeatable = acceptRepeatable; if (typeof globalThis !== 'undefined') globalThis.acceptRepeatable = acceptRepeatable; }
if (typeof openRepeatableUpgradeMenu !== 'undefined') { if (typeof window !== 'undefined') window.openRepeatableUpgradeMenu = openRepeatableUpgradeMenu; if (typeof globalThis !== 'undefined') globalThis.openRepeatableUpgradeMenu = openRepeatableUpgradeMenu; }
if (typeof upgradeRepeatableSlots !== 'undefined') { if (typeof window !== 'undefined') window.upgradeRepeatableSlots = upgradeRepeatableSlots; if (typeof globalThis !== 'undefined') globalThis.upgradeRepeatableSlots = upgradeRepeatableSlots; }

if (typeof window !== 'undefined' && typeof window.EventBus !== 'undefined' && window.EventBus && window.EventBus.on) {
  window.EventBus.on('quest:update', function() {
    const panel = document.getElementById('story-panel');
    if (panel && typeof renderStoryWindow === 'function') {
      renderStoryWindow();
    }
  });
}



// --- Exported globals ---
if (typeof fillRepeatableChoices !== 'undefined') { if (typeof window !== 'undefined') window.fillRepeatableChoices = fillRepeatableChoices; if (typeof globalThis !== 'undefined') globalThis.fillRepeatableChoices = fillRepeatableChoices; }
if (typeof formatRepeatableCooldown !== 'undefined') { if (typeof window !== 'undefined') window.formatRepeatableCooldown = formatRepeatableCooldown; if (typeof globalThis !== 'undefined') globalThis.formatRepeatableCooldown = formatRepeatableCooldown; }
if (typeof getRepeatableChoices !== 'undefined') { if (typeof window !== 'undefined') window.getRepeatableChoices = getRepeatableChoices; if (typeof globalThis !== 'undefined') globalThis.getRepeatableChoices = getRepeatableChoices; }
if (typeof isRepeatableAvailable !== 'undefined') { if (typeof window !== 'undefined') window.isRepeatableAvailable = isRepeatableAvailable; if (typeof globalThis !== 'undefined') globalThis.isRepeatableAvailable = isRepeatableAvailable; }
if (typeof pickRepeatableChoice !== 'undefined') { if (typeof window !== 'undefined') window.pickRepeatableChoice = pickRepeatableChoice; if (typeof globalThis !== 'undefined') globalThis.pickRepeatableChoice = pickRepeatableChoice; }
if (typeof repeatableCooldownLeft !== 'undefined') { if (typeof window !== 'undefined') window.repeatableCooldownLeft = repeatableCooldownLeft; if (typeof globalThis !== 'undefined') globalThis.repeatableCooldownLeft = repeatableCooldownLeft; }
if (typeof repeatablePool !== 'undefined') { if (typeof window !== 'undefined') window.repeatablePool = repeatablePool; if (typeof globalThis !== 'undefined') globalThis.repeatablePool = repeatablePool; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  renderStoryWindow,
  openNpc,
  acceptSideQuest,
  closeQuestModal,
  rollRepeatables,
  openRepeatableMenu,
  renderRepeatableBoard,
  acceptRepeatable,
  openRepeatableUpgradeMenu,
  upgradeRepeatableSlots,
  fillRepeatableChoices,
  formatRepeatableCooldown,
  getRepeatableChoices,
  isRepeatableAvailable,
  pickRepeatableChoice,
  repeatableCooldownLeft,
  repeatablePool,
};

