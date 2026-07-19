const TRAINER_BATTLES = {
 kanto_rival_route22:{name:'Blue', role:'rival', style:['balanced','speed'], team:[[16,9],[19,9],[133,10]], rewardMoney:1200},
 kanto_rocket_mtmoon:{name:'Team Rocket Grunt', role:'rocket', style:['poison','early'], team:[[19,14],[41,14],[23,15]], rewardMoney:1800},
 kanto_super_nerd_fossil:{name:'Super Nerd Miguel', role:'trainer', style:['science','electric'], team:[[81,16],[100,16],[109,17]], rewardMoney:2200},
 kanto_rival_cerulean:{name:'Blue', role:'rival', style:['balanced'], team:[[17,18],[63,17],[19,16],[133,18]], rewardMoney:3000},
 kanto_rival_ssanne:{name:'Blue', role:'rival', style:['balanced','special'], team:[[17,23],[20,22],[64,22],[133,24]], rewardMoney:4500},
 kanto_rocket_hideout:{name:'Team Rocket Admin', role:'rocket', style:['poison','dark'], team:[[20,28],[42,29],[24,30],[110,31]], rewardMoney:7000},
 kanto_giovanni_hideout:{name:'Giovanni', role:'boss', style:['ground','boss'], team:[[95,30],[111,31],[115,33]], rewardMoney:9000},
 kanto_rival_silph:{name:'Blue', role:'rival', style:['balanced','fast'], team:[[18,37],[65,35],[112,36],[59,38],[133,38]], rewardMoney:12000},
 kanto_giovanni_silph:{name:'Giovanni', role:'boss', style:['ground','rocket'], team:[[31,37],[34,38],[115,39],[112,41]], rewardMoney:15000},
 kanto_rival_victory:{name:'Blue', role:'rival', style:['balanced','champion-prep'], team:[[18,47],[65,47],[112,47],[59,48],[103,48],[130,50]], rewardMoney:20000},
 johto_rival_cherrygrove:{name:'Silver', role:'rival', style:['starter','aggressive'], team:[[152,8],[155,8],[158,8]], rewardMoney:1200},
 johto_sprout_elder:{name:'Sage Li', role:'sage', style:['grass','tower'], team:[[69,12],[163,12],[69,14]], rewardMoney:2200},
 johto_rocket_slowpoke:{name:'Team Rocket Grunt', role:'rocket', style:['poison'], team:[[19,15],[41,15],[109,16]], rewardMoney:2500},
 johto_rival_ilex:{name:'Silver', role:'rival', style:['aggressive'], team:[[92,18],[41,18],[153,19],[156,19],[159,19]], rewardMoney:4000},
 johto_rival_burned:{name:'Silver', role:'rival', style:['ghost','aggressive'], team:[[92,22],[42,22],[198,23],[153,24],[156,24],[159,24]], rewardMoney:6000},
 johto_rocket_lake:{name:'Rocket Executive', role:'rocket', style:['poison','rage'], team:[[42,30],[109,30],[198,31],[110,32]], rewardMoney:9000},
 johto_rocket_radio:{name:'Team Rocket Executive', role:'rocket', style:['rocket','boss'], team:[[24,34],[42,35],[110,36],[229,38]], rewardMoney:14000},
 johto_rival_victory:{name:'Silver', role:'rival', style:['balanced'], team:[[215,38],[169,38],[94,39],[208,40],[153,41],[156,41],[159,41]], rewardMoney:16000}
};
function getTrainerBattleDef(id){ return TRAINER_BATTLES[id] || null; }
function getTrainerBattleName(id){ const key='trainer_battle_name_'+id; const val=(typeof t==='function')?t(key):''; return (val && val!==key) ? val : ((getTrainerBattleDef(id)||{}).name || id); }
function questTrainerMoves(id){
 const map = {
  63:['confusion','psybeam','shadowball'],64:['confusion','psybeam','psychic','shadowball'],65:['psychic','shadowball','psybeam','thunderbolt'],
  133:['quickattack','bite','shadowball','bodyslam'],17:['gust','wingattack','quickattack'],18:['gust','wingattack','quickattack','skyattack'],
  19:['bite','quickattack','tackle'],20:['bite','quickattack','hyperbeam'],23:['poisonsting','bite','sludgebomb'],24:['poisonsting','bite','sludgebomb','earthquake'],
  41:['bite','wingattack','poisonsting'],42:['bite','wingattack','sludgebomb'],109:['sludgebomb','toxic','flamethrower'],110:['sludgebomb','toxic','flamethrower','shadowball'],
  95:['rockthrow','dig','earthquake'],111:['earthquake','rockthrow','bodyslam'],112:['earthquake','stoneedge','bodyslam'],115:['bodyslam','earthquake','rockslide'],
  31:['earthquake','sludgebomb','bodyslam'],34:['earthquake','sludgebomb','thunderbolt'],59:['flamethrower','fireblast','bite'],103:['psychic','solarbeam','earthquake'],130:['surf','bite','dragonbreath','icebeam'],
  152:['razorleaf','bodyslam','poisonsting'],155:['ember','quickattack','bodyslam'],158:['watergun','bite','surf'],153:['razorleaf','bodyslam','poisonsting'],156:['flamethrower','quickattack','earthquake'],159:['surf','bite','icebeam'],
  92:['lick','shadowball','nightshade'],94:['shadowball','nightshade','psychic'],198:['bite','wingattack','shadowball'],215:['bite','icebeam','quickattack'],208:['irontail','earthquake','rockthrow'],229:['crunch','flamethrower','fireblast']
 };
 return map[Number(id)] || null;
}
function createTrainerBattleTeam(battleId){
 const def = getTrainerBattleDef(battleId);
 if(!def) return [];
 return (def.team||[]).map(entry => {
  const id = Array.isArray(entry) ? entry[0] : entry.id;
  const lv = Array.isArray(entry) ? entry[1] : entry.level;
  const p = createPoke(id, lv, false);
  if(!p) return null;
  const moves = (entry.moves || questTrainerMoves(id) || []).filter(m => MOVES && MOVES[m]).slice(0,4);
  if(moves.length) p.moves = moves.map(m=>({id:m}));
  if(entry.talent) p.talent = entry.talent;
  try{ recalcPokeStats(p); p.currentHP = p.maxHP; }catch(_){}
  return p;
 }).filter(Boolean);
}

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
 if(typeof G.repeatableSlotUpgrades!=='number') G.repeatableSlotUpgrades=0;
 G.repeatableSlotUpgrades = clamp(G.repeatableSlotUpgrades||0, 0, 4);
 G.maxRepeatables = 1 + G.repeatableSlotUpgrades;
 if(!Array.isArray(G.repeatableChoices)) G.repeatableChoices=[];
 if(typeof G.repeatableLastRollAt!=='number') G.repeatableLastRollAt=0;
 if(!G.wildWinsByLoc || typeof G.wildWinsByLoc!=='object') G.wildWinsByLoc={};
 if(!G.unlockedLocs || typeof G.unlockedLocs!=='object') G.unlockedLocs={};
 if(!G.questTrainerWins || typeof G.questTrainerWins!=='object') G.questTrainerWins={};
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
 if(def.type==='trainer_battle') return !!(G.questTrainerWins && G.questTrainerWins[def.battleId]);
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
     notify(t('quest_battle_stop_current'), 'var(--blue)');
     try{ endBattle(); }catch(_){}
     setTimeout(()=>{ try{ claimQuest(qid, cat); }catch(e){ console.error(e); } }, 350);
     return;
   }
   if(!G.team || !G.team.length){
     notify(t('no_pokemon_in_team'), 'var(--red)');
     return;
   }
   const started = (typeof startLegendaryEncounter === 'function') ? startLegendaryEncounter(def.rewardPoke, def.rewardLevel || 65) : false;
   if(started && typeof battle !== 'undefined' && battle && battle.active){
    battle.questRewardQuestId = inst.qid;
    battle.questRewardCat = cat;
    battle.questRewardRegion = def.region || (G.region || 'kanto');
    battle.questRewardDefId = def.id;
    notify(tr('quest_reward_battle_started', {pokemon:getPokeName(def.rewardPoke)}), 'var(--green)');
    saveGame();
   }
   return;
 }

 if(def.rewardMoney) G.money += def.rewardMoney;
 if(def.rewardItems){ if(typeof grantRewardItems === 'function') grantRewardItems(def.rewardItems); else for(const k in def.rewardItems) addToInventory(k, def.rewardItems[k]); }

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
 if(def.rewardPoke && cat==='side'){
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

function completeQuestRewardBattle(qid){
 ensureQuestState();
 const inst = (G.activeQuests || []).find(i=>String(i.qid)===String(qid) && i.cat==='main');
 const def = inst ? getMainQuestDef(inst.qid) : getMainQuestDef(qid);
 if(!inst || !def) return false;
 if(def.rewardMoney) G.money += def.rewardMoney;
 if(def.rewardItems){
  if(typeof grantRewardItems === 'function') grantRewardItems(def.rewardItems);
  else for(const k in def.rewardItems) addToInventory(k, def.rewardItems[k]);
 }
 G.completedQuests[inst.qid]=true;
 const region = def.region || (G.region || 'kanto');
 const chain = getRegionChain(region);
 const chainIdx = chain.findIndex(q=>String(q.id)===String(inst.qid));
 if(chainIdx>=0) G.mainStep[region] = chainIdx+1;
 G.mainProgress[region] = 0;
 if(G.questBaselines && G.questBaselines[region]) delete G.questBaselines[region][String(inst.qid)];
 G.activeQuests = G.activeQuests.filter(i=>!(String(i.qid)===String(inst.qid) && i.cat==='main'));
 syncActiveMain();
 updateHeader();
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
 saveGame();
 try{ autoSave(); }catch(e){}
 notify(t("m.quest_core.1"),'var(--green)');
 return true;
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
 if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return; }
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


function startQuestTrainerBattle(qid, cat='main'){
 ensureQuestState();
 const inst = (G.activeQuests || []).find(i=>String(i.qid)===String(qid) && i.cat===cat);
 const def = inst ? getQuestDefinitionForInstance(inst) : (cat==='main' ? getMainQuestDef(qid) : null);
 if(!def || def.type !== 'trainer_battle') return;
 if(questDone(inst || {progress:0}, def)){ claimQuest(qid, cat); return; }
 if(typeof battle !== 'undefined' && battle && battle.active){
  notify(t('quest_battle_stop_current'), 'var(--blue)');
  try{ endBattle(); }catch(_){}
  setTimeout(()=>{ try{ startQuestTrainerBattle(qid, cat); }catch(e){ console.error(e); } }, 350);
  return;
 }
 if(typeof hasActiveTrainingBattle === 'function' && hasActiveTrainingBattle()){ notify(t('training_in_progress_no_battle'), 'var(--red)'); return; }
 if(!G.team || !G.team.length){ notify(t('no_pokemon_in_team'), 'var(--red)'); return; }
 const trainer = getTrainerBattleDef(def.battleId);
 const team = createTrainerBattleTeam(def.battleId);
 if(!trainer || !team.length){ notify(t('enemy_not_found_error'), 'var(--red)'); return; }
 const ok = startBattle(null, true, 'quest_trainer_'+def.battleId, team);
 if(ok !== false && battle && battle.active){
  battle.isQuestTrainerBattle = true;
  battle.questTrainerBattleId = def.battleId;
  battle.questTrainerQuestId = def.id;
  battle.questTrainerCat = cat;
  battle.trainerVisual = trainer;
  try{ renderBattleTeamRow(); }catch(_){}
  addBattleTimeline(getTrainerBattleName(def.battleId), 'trainer');
 }
}
function completeQuestTrainerBattle(battleId){
 if(!G.questTrainerWins || typeof G.questTrainerWins !== 'object') G.questTrainerWins = {};
 G.questTrainerWins[battleId] = true;
 const trainer = getTrainerBattleDef(battleId);
 if(trainer && trainer.rewardMoney) G.money = (G.money||0) + trainer.rewardMoney;
 updateHeader();
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 saveGame();
 notify(tr('trainer_battle_won', {trainer:getTrainerBattleName(battleId)}), 'var(--green)');
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
if (typeof completeQuestRewardBattle !== 'undefined' && typeof window !== 'undefined') window.completeQuestRewardBattle = completeQuestRewardBattle;
if (typeof talkNpcMainQuest !== 'undefined' && typeof window !== 'undefined') window.talkNpcMainQuest = talkNpcMainQuest;
if (typeof getQuestDefinitionForInstance !== 'undefined' && typeof window !== 'undefined') window.getQuestDefinitionForInstance = getQuestDefinitionForInstance;
if (typeof getActiveLocalDefeatQuestForLocation !== 'undefined' && typeof window !== 'undefined') window.getActiveLocalDefeatQuestForLocation = getActiveLocalDefeatQuestForLocation;
if (typeof getQuestBattlePool !== 'undefined' && typeof window !== 'undefined') window.getQuestBattlePool = getQuestBattlePool;
if (typeof startQuestDefeatBattle !== 'undefined' && typeof window !== 'undefined') window.startQuestDefeatBattle = startQuestDefeatBattle;
if (typeof getTrainerBattleDef !== 'undefined' && typeof window !== 'undefined') window.getTrainerBattleDef = getTrainerBattleDef;
if (typeof getTrainerBattleName !== 'undefined' && typeof window !== 'undefined') window.getTrainerBattleName = getTrainerBattleName;
if (typeof startQuestTrainerBattle !== 'undefined' && typeof window !== 'undefined') window.startQuestTrainerBattle = startQuestTrainerBattle;
if (typeof completeQuestTrainerBattle !== 'undefined' && typeof window !== 'undefined') window.completeQuestTrainerBattle = completeQuestTrainerBattle;
if (typeof _refreshUI !== 'undefined' && typeof window !== 'undefined') window._refreshUI = _refreshUI;


