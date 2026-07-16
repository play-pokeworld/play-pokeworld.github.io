var _guideSection = null;
function ensureTutorialState(){
 if(!G.tutorial || typeof G.tutorial !== 'object') G.tutorial = {};
 if(G.tutorial.enabled === undefined) G.tutorial.enabled = true;
 if(!G.tutorial.completed) G.tutorial.completed = {};
 if(!G.tutorial.dismissedTips) G.tutorial.dismissedTips = {};
 if(!G.tutorial.rewards) G.tutorial.rewards = {};
 return G.tutorial;
}
function tutorialIsEnabled(){ return !!ensureTutorialState().enabled; }
function tutorialDisable(){ const st=ensureTutorialState(); st.enabled=false; saveGame(); try{ renderStoryWindow(); }catch(_){} notify(t('tutorial_disabled'),'var(--light1)'); }
function tutorialEnable(){ const st=ensureTutorialState(); st.enabled=true; saveGame(); try{ renderStoryWindow(); }catch(_){} notify(t('tutorial_enabled'),'var(--green)'); }
function tutorialDismissTip(id){ if(id) ensureTutorialState().dismissedTips[id]=true; saveGame(); }
function closeTutorialTip(){ const el=document.getElementById('tutorial-tip'); if(el) el.remove(); }
function tutorialMark(id){ const st=ensureTutorialState(); if(id && !st.completed[id]){ st.completed[id]=true; updateTutorialProgress(); saveGame(); try{ renderStoryWindow(); }catch(_){} } }
function tutorialDeviceHint(kind){
 const touch = (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
 if(kind === 'sheet') return touch ? t('tutorial_hint_sheet_mobile') : t('tutorial_hint_sheet_pc');
 if(kind === 'map') return touch ? t('tutorial_hint_map_mobile') : t('tutorial_hint_map_pc');
 return touch ? t('tutorial_hint_map_mobile') : t('tutorial_hint_sheet_pc');
}
function tutorialSteps(){ return [
 {id:'route1_battles', title:()=>t('tutorial_step_route1_title'), desc:()=>t('tutorial_step_route1_desc'), how:()=>`${t('tutorial_route1_how')} ${tutorialDeviceHint('map')}`, actionLabel:()=>t('tutorial_go_route1'), actionCall:'clickLocation', actionArgs:"'route1'", done:()=>((G.wildWinsByLoc||{}).route1||0)>=3, money:300, items:{berry_oran:3}, rewardText:()=>t('tutorial_reward_route1')},
 {id:'open_poke_sheet', title:()=>t('tutorial_step_sheet_title'), desc:()=>t('tutorial_step_sheet_desc'), how:()=>`${tutorialDeviceHint('sheet')} ${t('tutorial_sheet_how')}`, actionLabel:()=>t('tutorial_view_team'), actionCall:'showTab', actionArgs:"'team'", done:()=>!!ensureTutorialState().completed.open_poke_sheet, money:200, rewardText:()=>t('tutorial_reward_money200')},
 {id:'open_bag', title:()=>t('tutorial_step_bag_title'), desc:()=>t('tutorial_step_bag_desc'), how:()=>t('tutorial_bag_how'), actionLabel:()=>t('tutorial_open_bag'), actionCall:'openFullscreenPanel', actionArgs:"'inventory'", items:{potion:2}, done:()=>!!ensureTutorialState().completed.open_bag, rewardText:()=>t('tutorial_reward_potions')},
 {id:'open_pokedex', title:()=>t('tutorial_step_dex_title'), desc:()=>t('tutorial_step_dex_desc'), how:()=>t('tutorial_dex_how'), actionLabel:()=>t('tutorial_open_pokedex'), actionCall:'openFullscreenPanel', actionArgs:"'pokedex'", done:()=>!!ensureTutorialState().completed.open_pokedex, money:500, rewardText:()=>t('tutorial_reward_money500')},
 {id:'first_badge', title:()=>t('tutorial_step_badge_title'), desc:()=>t('tutorial_step_badge_desc'), how:()=>t('tutorial_badge_how'), actionLabel:()=>t('tutorial_view_location'), actionCall:'showTab', actionArgs:"'info'", done:()=>G.badges&&G.badges.includes('brock'), items:{rarecandy:1}, rewardText:()=>t('tutorial_reward_candy')}
]; }
function tutorialGiveReward(step){
 const st=ensureTutorialState(); if(!step || st.rewards[step.id]) return;
 if(step.money){ G.money=(G.money||0)+step.money; try{ updateHeader(); }catch(_){} }
 if(step.items){ for(const k in step.items) addToInventory(k, step.items[k]); }
 st.rewards[step.id]=true; if(step.rewardText) notify(step.rewardText(),'var(--green)');
}
function updateTutorialProgress(){
 const st=ensureTutorialState(); for(const step of tutorialSteps()){ if(!st.completed[step.id]&&step.done()) st.completed[step.id]=true; if(st.completed[step.id]) tutorialGiveReward(step); }
 if(tutorialSteps().every(step=>st.completed[step.id])&&st.enabled){ st.enabled=false; try{ saveGame(); }catch(_){} }
}
function currentTutorialStep(){ updateTutorialProgress(); const st=ensureTutorialState(); return tutorialSteps().find(step=>!st.completed[step.id])||null; }
function renderTutorialQuestBlock(){
 const st=ensureTutorialState(); if(!st.enabled) return '';
 const steps=tutorialSteps(); const doneCount=steps.filter(s=>st.completed[s.id]).length; const step=currentTutorialStep();
 if(!step){ st.enabled=false; try{ saveGame(); }catch(_){} return ''; }
 const idx=steps.findIndex(s=>s.id===step.id)+1;
 return `<div class="tutorial-quest-card active"><div class="tutorial-quest-head"><span>💡</span><b>${t('tutorial_guided')} — ${t('tutorial_step_word')} ${idx}/${steps.length}</b></div><div class="tutorial-quest-title">${step.title()}</div><p>${step.desc()}</p><div class="tutorial-how"><b>${t('tutorial_how')} :</b><br>${step.how()}</div><div class="tutorial-progress-bar"><div data-pct="${Math.round(doneCount/steps.length*100)}"></div></div><div class="tutorial-quest-actions">${step.actionCall?`<button class="hbtn tutorial-primary" data-action="legacy-call" data-call="${step.actionCall}" data-call-args="${step.actionArgs||''}">${step.actionLabel()}</button>`:''}<button class="hbtn" data-action="legacy-call" data-call="openFullscreenPanel" data-call-args="'guide'">${t('guide_title')}</button><button class="hbtn" data-action="legacy-call" data-call="tutorialDisable" data-call-args="">${t('tutorial_disable_short')}</button></div></div>`;
}
function showTutorialTip(id,title,body){ return; }
function guideSections(){ return {
 map:{icon:'🗺️', title:t('guide_map_title'), pages:[[t('guide_map_read_title'),t('guide_map_read_text')],[t('guide_map_place_title'),t('guide_map_place_text')],[t('guide_map_unlock_title'),t('guide_map_unlock_text')]]},
 combat:{icon:'⚔️', title:t('guide_combat_title'), pages:[[t('guide_combat_auto_title'),t('guide_combat_auto_text')],[t('guide_combat_switch_title'),t('guide_combat_switch_text')],[t('guide_combat_status_title'),t('guide_combat_status_text')]]},
 pokemon:{icon:'🧬', title:t('guide_pokemon_title'), pages:[[t('guide_pokemon_sheet_title'),`${tutorialDeviceHint('sheet')} ${t('guide_pokemon_sheet_text')}`],[t('guide_pokemon_ivev_title'),t('guide_pokemon_ivev_text')],[t('guide_pokemon_moves_title'),t('guide_pokemon_moves_text')]]},
 bag:{icon:'🎒', title:t('guide_bag_title'), pages:[[t('guide_bag_categories_title'),t('guide_bag_categories_text')],[t('guide_bag_held_title'),t('guide_bag_held_text')]]},
 mine:{icon:'⛏️', title:t('guide_mine_title'), pages:[[t('guide_mine_dig_title'),t('guide_mine_dig_text')]]},
 hatchery:{icon:'🥚', title:t('guide_hatchery_title'), pages:[[t('guide_hatchery_slots_title'),t('guide_hatchery_slots_text')],[t('guide_hatchery_upgrade_title'),t('guide_hatchery_upgrade_text')]]},
 training:{icon:'🏋️', title:t('guide_training_title'), pages:[[t('guide_training_modes_title'),t('guide_training_modes_text')]]},
 dictionary:{icon:'📚', title:t('guide_dictionary_title'), pages:[[t('guide_dictionary_search_title'),t('guide_dictionary_search_text')]]}
}; }
function setGuideSection(section){ _guideSection=section||null; const el=document.getElementById('fs-panel-content'); if(el) renderGuidePanel(el); }
function renderGuidePanel(el){
 const sections=guideSections();
 if(_guideSection&&sections[_guideSection]){ const sec=sections[_guideSection]; el.innerHTML=`<div class="guide-header"><div><h2>${sec.icon} ${sec.title}</h2><p>${t('guide_detailed')}</p></div><button class="hbtn" data-action="legacy-call" data-call="setGuideSection" data-call-args="null">← ${t('guide_back')}</button></div><div class="guide-page-list">${sec.pages.map(([title,txt])=>`<article class="guide-info-card"><h3>${title}</h3><p>${txt}</p></article>`).join('')}</div>`; return; }
 el.innerHTML=`<div class="guide-header"><div><h2>${t('guide_title')}</h2><p>${t('guide_choose_topic')}</p></div></div><div class="guide-actions"><button class="hbtn" data-action="legacy-call" data-call="tutorialEnable" data-call-args="">${t('tutorial_enable')}</button><button class="hbtn" data-action="legacy-call" data-call="tutorialDisable" data-call-args="">${t('tutorial_disable_all')}</button></div><div class="guide-grid">${Object.entries(sections).map(([id,sec])=>`<button class="guide-card guide-card-button" data-action="legacy-call" data-call="setGuideSection" data-call-args="'${id}'"><h3>${sec.icon} ${sec.title}</h3><p>${sec.pages.length} ${t('guide_pages')}</p></button>`).join('')}</div>`;
}
function installTutorialHooks(){
 const wrap=(name,cb)=>{ const fn=window[name]; if(typeof fn!=='function'||fn.__tutorialWrapped) return; const nw=function(...args){ const res=fn.apply(this,args); try{cb(args,res);}catch(_){} return res;}; nw.__tutorialWrapped=true; window[name]=nw; };
 wrap('pickStarter',()=>{try{renderStoryWindow();}catch(_){}}); wrap('openFullscreenPanel',([panel])=>{ if(panel==='inventory') tutorialMark('open_bag'); if(panel==='pokedex') tutorialMark('open_pokedex'); }); wrap('openPokeModal',()=>tutorialMark('open_poke_sheet')); wrap('openBoxPokeModal',()=>tutorialMark('open_poke_sheet')); wrap('exploreArea',()=>updateTutorialProgress()); wrap('renderMap',()=>updateTutorialProgress());
}
setTimeout(installTutorialHooks,500);
if(typeof window!=='undefined'){ window.ensureTutorialState=ensureTutorialState; window.tutorialDisable=tutorialDisable; window.tutorialEnable=tutorialEnable; window.tutorialDismissTip=tutorialDismissTip; window.closeTutorialTip=closeTutorialTip; window.tutorialMark=tutorialMark; window.renderTutorialQuestBlock=renderTutorialQuestBlock; window.renderGuidePanel=renderGuidePanel; window.setGuideSection=setGuideSection; window.showTutorialTip=showTutorialTip; window.installTutorialHooks=installTutorialHooks; }
export {};
