function getRegionChain(region){ return STORY_QUESTS.filter(q=>q.region===region); }
function getCurrentMain(region){
 const chain = getRegionChain(region);
 const idx = (G.mainStep && G.mainStep[region]!=null) ? G.mainStep[region] : 0;
 return chain[idx] || null;
}


function syncActiveMain(){
 if(!G || !G.activeQuests) return;
 const region = G.region || 'kanto';
 G.activeQuests = G.activeQuests.filter(i=>i.cat!=='main');
 const def = getCurrentMain(region);
 if(def){
 let prog = (G.mainProgress && G.mainProgress[region]!=null) ? G.mainProgress[region] : 0;
 if(def.type === 'defeat_wild'){
  const beforeBaseline = G.questBaselines && G.questBaselines[region] && G.questBaselines[region][String(def.id)] != null;
  ensureQuestBaseline(region, def);
  if(!beforeBaseline) prog = 0;
 }
 G.activeQuests.push({qid:def.id, cat:'main', progress:prog, done:false});
 }
}

function ensureQuestState(){
 if(!G) return;
 if(!G.visitedMaps) G.visitedMaps={};
 if(!G.completedQuests) G.completedQuests={};
 if(!G.mainStep || typeof G.mainStep!=='object') G.mainStep={kanto:0, johto:0};
 if(G.mainStep.kanto==null) G.mainStep.kanto=0;
 if(G.mainStep.johto==null) G.mainStep.johto=0;
 if(!G.mainProgress || typeof G.mainProgress!=='object') G.mainProgress={kanto:0, johto:0};
 if(G.mainProgress.kanto==null) G.mainProgress.kanto=0;
 if(G.mainProgress.johto==null) G.mainProgress.johto=0;
 if(!Array.isArray(G.activeQuests)) G.activeQuests=[];
 if(!Array.isArray(G.repeatables)) G.repeatables=[];
 if(typeof G.totalWildWins!=='number') G.totalWildWins=0;
 if(typeof G.maxRepeatables!=='number') G.maxRepeatables=3;
 if(!G.wildWinsByLoc || typeof G.wildWinsByLoc!=='object') G.wildWinsByLoc={};
 if(!G.unlockedLocs || typeof G.unlockedLocs!=='object') G.unlockedLocs={};
 if(typeof G.storyIdx==='undefined') G.storyIdx=0;
 if(typeof G.storyProgress==='undefined') G.storyProgress=0;
 
 if(G._questMigrated!==true && typeof G.storyIdx==='number' && G.storyIdx>0){
 const kc = getRegionChain('kanto').length;
 G.mainStep.kanto = Math.min(G.storyIdx, kc);
 G._questMigrated = true;
 }
 
 syncActiveMain();
}

function getMainQuestDef(id){ return STORY_QUESTS.find(q=>q.id===id); }
function getSideQuestDef(id){ return SIDE_QUESTS[id]; }


function locGroup(id){ const l=getLocObj(id); return (l&&l.group)||id; }


function markVisited(mapId){
 ensureQuestState();
 if(!mapId) return;
 G.visitedMaps[mapId]=true;
 
 
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 try{ if(document.getElementById('map-svg')) renderMap(); }catch(_){}
}

function getQuestWildWinCount(def){
 if(!def || def.type !== 'defeat_wild' || !def.loc) return 0;
 const group = (typeof locGroup === 'function') ? locGroup(def.loc) : def.loc;
 let total = 0;
 for(const locId in (G.wildWinsByLoc || {})){
  const locGroupId = (typeof locGroup === 'function') ? locGroup(locId) : locId;
  if(locGroupId === group) total += (G.wildWinsByLoc[locId] || 0);
 }
 return total;
}
function ensureQuestBaseline(region, def){
 if(!def || def.type !== 'defeat_wild') return null;
 if(!G.questBaselines || typeof G.questBaselines !== 'object') G.questBaselines = {};
 if(!G.questBaselines[region]) G.questBaselines[region] = {};
 const key = String(def.id);
 if(G.questBaselines[region][key] == null){
  G.questBaselines[region][key] = getQuestWildWinCount(def);
  if(!G._questBaselineMigration) G._questBaselineMigration = {};
  G._questBaselineMigration[region+'_'+key] = true;
  if(G.mainProgress && G.mainProgress[region] != null) G.mainProgress[region] = 0;
 }
 return G.questBaselines[region][key] || 0;
}
function questProgressValue(inst, def){
 if(!def || !inst) return 0;
 if(def.type === 'defeat_wild'){
  const region = def.region || (G && G.region) || 'kanto';
  const baseline = ensureQuestBaseline(region, def) || 0;
  const afterStart = Math.max(0, getQuestWildWinCount(def) - baseline);
  return Math.max(inst.progress || 0, afterStart);
 }
 return inst.progress || 0;
}


function questDone(inst, def){
 if(!def) return false;
 if(def.type==='badge'){
 if(typeof isLeagueChampionId === 'function' && isLeagueChampionId(def.targetBadge)) return isRegionLeagueWon(getLeagueRegionForChampion(def.targetBadge));
 if(def.targetBadge==='elite4') return !!(G.championTitle || G.badges.includes('elite4'));
 return G.badges.includes(def.targetBadge);
 }
 if(def.type==='badge_or_loc'){
 if(def.targetBadge && G.badges.includes(def.targetBadge)) return true;
 return questProgressValue(inst, def) >= (def.target||1);
 }
 if(def.type==='talk') return questProgressValue(inst, def) >= (def.target||1);
 if(def.type==='item') return !!(def.requiredItem && G.inventory && G.inventory[def.requiredItem] > 0);
 return questProgressValue(inst, def) >= (def.target||1);
}

function advanceQuests(type, loc, amount){
 ensureQuestState();
 const amt = amount||1;
 const region = G.region || 'kanto';
 
 
 
 function locMatches(def, type, loc){
 if(type !== 'defeat_wild' && type !== 'catch') return true;
 if(!def.loc) return true; 
 return locGroup(def.loc) === locGroup(loc);
 }
 
 const mainInst = G.activeQuests.find(i=>i.cat==='main');
 if(mainInst){
 const def = getMainQuestDef(mainInst.qid);
 if(def && def.region===region && def.type===type && !mainInst.done){
 if(locMatches(def, type, loc)){
 mainInst.progress = (mainInst.progress||0) + amt;
 G.mainProgress[region] = questProgressValue(mainInst, def);
 }
 }
 }
 
 const lists = [G.activeQuests, G.repeatables];
 for(const list of lists){
 for(const inst of list){
 const def = inst.cat==='side'? SIDE_QUESTS[inst.qid] : inst.def;
 if(!def) continue;
 if(inst.cat==='main') continue;
 if(inst.done) continue;
 if(def.type!==type) continue;
 if(!locMatches(def, type, loc)) continue;
 inst.progress = (inst.progress||0) + amt;
 }
 }
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
}


function claimQuest(qid, cat){
 ensureQuestState();
 const list = (cat==='repeatable') ? G.repeatables : G.activeQuests;
 
 
 const idx = list.findIndex(i=>String(i.qid)===String(qid) && i.cat===cat);
 if(idx<0) return;
 const inst = list[idx];
 const def = (cat==='main') ? getMainQuestDef(inst.qid)
 : (cat==='side') ? SIDE_QUESTS[inst.qid]
 : inst.def;
 if(!questDone(inst, def)){ notify(t("legacy_message_n_objectif_pas_encore_termin"),'var(--red)'); return; }
 if(def.rewardPoke && cat==='main'){
   if(typeof battle !== 'undefined' && battle && battle.active){
     notify('Un combat est déjà en cours : terminez-le avant de défier ce légendaire.', 'var(--red)');
     return;
   }
   if(!G.team || !G.team.length){
     notify(t('no_pokemon_in_team'), 'var(--red)');
     return;
   }
 }

 if(def.rewardMoney) G.money += def.rewardMoney;
 if(def.rewardItems){ for(const k in def.rewardItems) addToInventory(k, def.rewardItems[k]); }

 if(cat==='main'){
 G.completedQuests[inst.qid]=true;
 const region = G.region || 'kanto';
 const chain = getRegionChain(region);
 const idx = chain.findIndex(q=>q.id===inst.qid);
 if(idx>=0) G.mainStep[region] = idx+1;
 G.mainProgress[region] = 0;
 if(G.questBaselines && G.questBaselines[region]) delete G.questBaselines[region][String(inst.qid)];
 
 G.activeQuests = G.activeQuests.filter(i=>!(i.cat==='main'));
 syncActiveMain();
 } else if(cat==='side'){
 G.completedQuests['side_'+inst.qid]=true;
 }
 list.splice(idx,1); 

 const lang = G.lang||'fr';
 if(def.rewardPoke && cat==='main'){
 
 startLegendaryEncounter(def.rewardPoke, def.rewardLevel || 65);
 } else if(def.rewardPoke && cat==='side'){
 const legMon = createPoke(def.rewardPoke, 50, true);
 if(legMon){
 if(G.team.length<6) G.team.push(legMon); else G.collection[String(legMon.id)]=legMon;
 G.pokedex[def.rewardPoke]={...(G.pokedex[def.rewardPoke]||{}),seen:true,caught:true};
 unlockTalentForSpecies(def.rewardPoke, legMon.talent);
 notify(tr("m.quest_core.2", {p0:legMon.name}),'var(--green)');
 }
 }
 updateHeader();
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
 saveGame();
 try{ autoSave(); }catch(e){}
 notify(t("m.quest_core.1"),'var(--green)');
}


function talkNpcMainQuest(npc){
 if(!npc || npc.mainTalk==null) return false;
 const region = G.region || 'kanto';
 const inst = G.activeQuests.find(i=>i.cat==='main');
 if(!inst || inst.done) return false;
 const def = getMainQuestDef(inst.qid);
 if(!def || def.id!==npc.mainTalk) return false;
 if(def.type!=='talk') return false;
 
 G.mainProgress[region] = (def.target||1);
 
 claimQuest(def.id, 'main');
 return true;
}

function getQuestDefinitionForInstance(inst){
 if(!inst) return null;
 if(inst.cat === 'main') return getMainQuestDef(inst.qid);
 if(inst.cat === 'side') return SIDE_QUESTS[inst.qid];
 if(inst.cat === 'repeatable') return inst.def;
 return inst.def || null;
}
function getActiveLocalDefeatQuestForLocation(locId){
 ensureQuestState();
 const group = locGroup(locId);
 const candidates = [];
 for(const inst of (G.activeQuests || [])) candidates.push(inst);
 for(const inst of (G.repeatables || [])) candidates.push(inst);
 for(const inst of candidates){
  const def = getQuestDefinitionForInstance(inst);
  if(!def || def.type !== 'defeat_wild' || !def.loc || inst.done) continue;
  if(locGroup(def.loc) !== group) continue;
  if(questDone(inst, def)) continue;
  return {inst, def};
 }
 return null;
}
const QUEST_TOWN_BATTLE_POOLS = {
 azalea: [[41,16],[23,16],[109,18],[19,17]],
 goldenrod: [[19,20],[20,22],[41,20],[109,22],[88,22]],
 mahogany: [[20,27],[41,26],[88,28],[109,29],[110,30]],
 olivine: [[72,24],[98,24],[66,26],[73,26]],
 cherrygrove: [[19,6],[16,6],[161,6]],
 newbark: [[161,4],[16,4],[19,4]],
 violet: [[16,10],[21,10],[163,10]],
 ecruteak: [[92,22],[93,24],[109,23]],
 blackthorn: [[147,32],[74,32],[169,34]]
};
function getQuestBattlePool(locId){
 const loc = getLocObj(locId);
 if(loc && loc.wild && loc.wild.length){
  return loc.wild.map(w => [Number(w[0]), Math.max(1, Number(w[1]||1)), Math.max(1, Number(w[2]||w[1]||1))]);
 }
 if(QUEST_TOWN_BATTLE_POOLS[locId]) return QUEST_TOWN_BATTLE_POOLS[locId];
 const linked = (typeof getLinkedRouteIds === 'function') ? getLinkedRouteIds(locId) : [locId];
 for(const lid of linked){
  const l = getLocObj(lid);
  if(l && l.wild && l.wild.length) return l.wild.map(w => [Number(w[0]), Math.max(1, Number(w[1]||1)), Math.max(1, Number(w[2]||w[1]||1))]);
 }
 const conn = (loc && loc.conn) || [];
 for(const cid of conn){
  const l = getLocObj(cid);
  if(l && l.wild && l.wild.length) return l.wild.map(w => [Number(w[0]), Math.max(1, Number(w[1]||1)), Math.max(1, Number(w[2]||w[1]||1))]);
 }
 return [[19,10],[41,10],[23,10]];
}
function startQuestDefeatBattle(locId){
 const active = getActiveLocalDefeatQuestForLocation(locId || G.location);
 if(!active){ notify(t('quest_battle_none'), 'var(--light1)'); return; }
 if(!G.team || !G.team.length){ notify(t('no_pokemon_in_team'), 'var(--red)'); return; }
 if(typeof canUseCurrentTeamForRegion === 'function' && !canUseCurrentTeamForRegion(G.region || 'kanto')){ notify(regionTeamRestrictionMessage(G.region || 'kanto'), 'var(--red)'); return; }
 if(battle && battle.active){ notify(t('battle_in_progress'), 'var(--red)'); return; }
 const pool = getQuestBattlePool(locId || G.location);
 const picked = pool[rand(0, pool.length-1)];
 const minLv = Number(picked[1] || picked[0] || 10);
 const maxLv = Number(picked[2] || minLv);
 const enemy = createPoke(Number(picked[0]), rand(minLv, maxLv), false);
 if(!enemy){ notify(t('enemy_not_found_error'), 'var(--red)'); return; }
 startBattle(enemy, false);
 if(battle && battle.active){
  battle.chill = false;
  battle.noAutoCatch = true;
  battle.questDefeatLoc = active.def.loc || locId || G.location;
  battle.isQuestDefeatBattle = true;
  addBattleLog(tr('quest_battle_started', {quest:getQuestText(active.inst.cat || 'main', active.def.id).title || t('quest_battle_title')}));
 }
}


var _repeatableRoll = [];


function _refreshUI(){ try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){} }
EventBus.on(EVENTS.WILD_DEFEATED, ({loc}) => { advanceQuests('defeat_wild', loc, 1); _refreshUI(); });
EventBus.on(EVENTS.POKEMON_CAUGHT, ({loc}) => { advanceQuests('catch', loc, 1); _refreshUI(); });
EventBus.on(EVENTS.MINE_SELL, ({amount}) => { advanceQuests('mine_sell', null, amount); _refreshUI(); });
EventBus.on(EVENTS.BADGE_EARNED, () => { advanceQuests('badge', null, 1); _refreshUI(); });
EventBus.on(EVENTS.LEAGUE_WON, () => { advanceQuests('league', null, 1); _refreshUI(); });


// --- Migrated to ES module, globals exposed ---
if (typeof getRegionChain !== 'undefined' && typeof window !== 'undefined') window.getRegionChain = getRegionChain;
if (typeof getCurrentMain !== 'undefined' && typeof window !== 'undefined') window.getCurrentMain = getCurrentMain;
if (typeof syncActiveMain !== 'undefined' && typeof window !== 'undefined') window.syncActiveMain = syncActiveMain;
if (typeof ensureQuestState !== 'undefined' && typeof window !== 'undefined') window.ensureQuestState = ensureQuestState;
if (typeof getMainQuestDef !== 'undefined' && typeof window !== 'undefined') window.getMainQuestDef = getMainQuestDef;
if (typeof getSideQuestDef !== 'undefined' && typeof window !== 'undefined') window.getSideQuestDef = getSideQuestDef;
if (typeof locGroup !== 'undefined' && typeof window !== 'undefined') window.locGroup = locGroup;
if (typeof markVisited !== 'undefined' && typeof window !== 'undefined') window.markVisited = markVisited;
if (typeof getQuestWildWinCount !== 'undefined' && typeof window !== 'undefined') window.getQuestWildWinCount = getQuestWildWinCount;
if (typeof ensureQuestBaseline !== 'undefined' && typeof window !== 'undefined') window.ensureQuestBaseline = ensureQuestBaseline;
if (typeof questProgressValue !== 'undefined' && typeof window !== 'undefined') window.questProgressValue = questProgressValue;
if (typeof questDone !== 'undefined' && typeof window !== 'undefined') window.questDone = questDone;
if (typeof advanceQuests !== 'undefined' && typeof window !== 'undefined') window.advanceQuests = advanceQuests;
if (typeof locMatches !== 'undefined' && typeof window !== 'undefined') window.locMatches = locMatches;
if (typeof claimQuest !== 'undefined' && typeof window !== 'undefined') window.claimQuest = claimQuest;
if (typeof talkNpcMainQuest !== 'undefined' && typeof window !== 'undefined') window.talkNpcMainQuest = talkNpcMainQuest;
if (typeof getQuestDefinitionForInstance !== 'undefined' && typeof window !== 'undefined') window.getQuestDefinitionForInstance = getQuestDefinitionForInstance;
if (typeof getActiveLocalDefeatQuestForLocation !== 'undefined' && typeof window !== 'undefined') window.getActiveLocalDefeatQuestForLocation = getActiveLocalDefeatQuestForLocation;
if (typeof getQuestBattlePool !== 'undefined' && typeof window !== 'undefined') window.getQuestBattlePool = getQuestBattlePool;
if (typeof startQuestDefeatBattle !== 'undefined' && typeof window !== 'undefined') window.startQuestDefeatBattle = startQuestDefeatBattle;
if (typeof _refreshUI !== 'undefined' && typeof window !== 'undefined') window._refreshUI = _refreshUI;

export {};
