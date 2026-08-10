// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Phase 18 — official teams as the single source of truth:
// Single source of truth: OFFICIAL_TEAMS (src/data/official-teams-data.js).
// Before this phase, TRAINER_BATTLES lived here with legacy compact move
// ids ('shadowball', 'quickattack', 'rockthrow'…) ABSENT from MOVES →
// silently filtered → empty movesets, then randomly regenerated. Teams
// are now legitimate (natural pool ∪ TM/HM), validated by tests, and the
// rival's team DEPENDS on the player's starter.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function applySecretBaseMoneyBonus(...args) { const f = __pwV43Link('applySecretBaseMoneyBonus'); return f ? f(...args) : undefined; }
function getTrainerBattleDef(id){
 const e = (typeof OFFICIAL_TEAMS !== 'undefined' && OFFICIAL_TEAMS && OFFICIAL_TEAMS[id]) ? OFFICIAL_TEAMS[id] : ((typeof OFFICIAL_TEAMS_HOENN !== 'undefined' && OFFICIAL_TEAMS_HOENN) ? OFFICIAL_TEAMS_HOENN[id] : null);
 if(!e) return null;
 return { name: e.name || id, role: e.role || e.kind || 'trainer', style: e.style || [], rewardMoney: e.rewardMoney || 0, title: e.title || '', id: id, kind: e.kind };
}
function getTrainerBattleName(id){ const key='trainer_battle_name_'+id; const val=(typeof t==='function')?t(key):''; return (val && val!==key) ? val : ((getTrainerBattleDef(id)||{}).name || id); }

// Dialogues scenarises (i18n) : introduction before battle + punchline of
// victoire. Cles `trainer_battle_intro_<battleId>` / `trainer_battle_win_<battleId>`.
function getTrainerBattleDialog(id, kind){
 const key = 'trainer_battle_' + kind + '_' + id;
 const val = (typeof t === 'function') ? t(key) : '';
 return (val && val !== key) ? val : '';
}

// Especes of starters by region (for the variantes of the rival).
const QUEST_STARTER_SPECIES_BY_REGION = { kanto: [1, 4, 7], johto: [152, 155, 158] };
function getPlayerStarterSpecies(region){
 region = region || (typeof G !== 'undefined' && G && G.region) || 'kanto';
 const ids = QUEST_STARTER_SPECIES_BY_REGION[region] || [];
 if(typeof G === 'undefined' || !G) return null;
 // Phase 18 — legacy feature update
 if(G.starterSpecies && G.starterSpecies[region]) return G.starterSpecies[region];
 // Fallback for the saves anterieures : starter present in the team.
 if(Array.isArray(G.team)){
  for(const id of ids){ if(G.team.some(p => p && Number(p.id) === id) ) return id; }
 }
 // Fallback following : espece of starter capturee in the pokedex.
 if(G.pokedex){
  for(const id of ids){ const e = G.pokedex[id]; if(e && e.caught) return id; }
 }
 return null;
}

function createTrainerBattleTeam(battleId){
 const entry = (typeof OFFICIAL_TEAMS !== 'undefined' && OFFICIAL_TEAMS && OFFICIAL_TEAMS[battleId]) ? OFFICIAL_TEAMS[battleId] : ((typeof OFFICIAL_TEAMS_HOENN !== 'undefined' && OFFICIAL_TEAMS_HOENN) ? OFFICIAL_TEAMS_HOENN[battleId] : null);
 if(!entry || typeof getOfficialTeam !== 'function') return [];
 const starter = getPlayerStarterSpecies(entry.region || (typeof G !== 'undefined' && G && G.region) || 'kanto');
 const team = getOfficialTeam(battleId, starter);
 return Array.isArray(team) ? team.filter(Boolean) : [];
}

// Phase 18 — legacy feature update
// the quetes principales have been rangees and renumerotees (Kanto 1-44 with
// the insertion of the battle Rocket of the Tour Pokemon in 22 ; Johto 101-126),
// and the quetes secondaires regroupees by region (Kanto s1-s13, Johto
// s14-s26). this migration recalcule mainStep (index), completedQuests,
// questBaselines and the instances actives from the anciens ids.
const QUEST_V2_OLD_KANTO_ORDER = [30,0,40,41,1001,1,42,2,1002,1003,43,1004,3,44,45,1005,5,4,46,47,7,52,48,1006,1007,8,9,1008,1009,10,49,50,11,12,51,1010,13,14,15,16,17,18,19];
const QUEST_V2_OLD_JOHTO_ORDER = [31,20,1101,1102,21,1103,22,1104,23,1105,24,25,26,1106,27,1107,28,1108,29,60,61,62,63,64,65,66];
const QUEST_V2_KANTO_INSERT_INDEX = 21; // new "kanto_rocket_tower" quest (id 22)
const QUEST_V2_SIDE_REMAP = { s1:'s1', s2:'s2', s11:'s3', s3:'s4', s4:'s5', s12:'s6', s14:'s7', s5:'s8', s15:'s9', s6:'s10', s13:'s11', s7:'s12', s8:'s13', s34:'s14', s39:'s15', s35:'s16', s33:'s17', s37:'s18', s32:'s19', s36:'s20', s9:'s21', s38:'s22', s40:'s23', s30:'s24', s31:'s25', s10:'s26' };
const QUEST_V2_MAIN_REMAP = (function(){
 const map = {};
 QUEST_V2_OLD_KANTO_ORDER.forEach((oldId, i) => { map[String(oldId)] = (i >= QUEST_V2_KANTO_INSERT_INDEX) ? (i + 2) : (i + 1); });
 QUEST_V2_OLD_JOHTO_ORDER.forEach((oldId, i) => { map[String(oldId)] = 101 + i; });
 return map;
})();
function migrateQuestSaveV2(){
 if(!G || G._questIdMigrationV2 === 2) return;
 if(!G.mainStep || typeof G.mainStep !== 'object') G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
 // 1) mainStep : index in the old chaine → index in the new.
 const kIdx = (G.mainStep.kanto != null) ? G.mainStep.kanto : 0;
 if(kIdx >= QUEST_V2_OLD_KANTO_ORDER.length) G.mainStep.kanto = QUEST_V2_OLD_KANTO_ORDER.length + 1; // everything was done (44 quests now)
 else if(kIdx >= QUEST_V2_KANTO_INSERT_INDEX) G.mainStep.kanto = kIdx + 1;
 // Johto: unchanged order, renumbering only → same index.
  // Quest state tracking and progression rules
 if(G.completedQuests && typeof G.completedQuests === 'object'){
  const next = {};
  for(const k of Object.keys(G.completedQuests)){
   if(k.indexOf('side_') === 0){
    const oldSide = k.slice(5);
    next['side_' + (QUEST_V2_SIDE_REMAP[oldSide] || oldSide)] = G.completedQuests[k];
   } else {
    const mapped = QUEST_V2_MAIN_REMAP[k];
    next[String(mapped != null ? mapped : k)] = G.completedQuests[k];
   }
  }
  G.completedQuests = next;
 }
 // 3) questBaselines[region][oldId] → [region][newId].
 if(G.questBaselines && typeof G.questBaselines === 'object'){
  for(const region of Object.keys(G.questBaselines)){
   const next = {};
   for(const k of Object.keys(G.questBaselines[region] || {})){
    const mapped = QUEST_V2_MAIN_REMAP[k];
    next[String(mapped != null ? mapped : k)] = G.questBaselines[region][k];
   }
   G.questBaselines[region] = next;
  }
 }
 // 4) Instances secondaires actives : qid remappe.
 if(Array.isArray(G.activeQuests)){
  for(const inst of G.activeQuests){
   if(inst && inst.cat === 'side') inst.qid = QUEST_V2_SIDE_REMAP[inst.qid] || inst.qid;
  }
 }
 G._questIdMigrationV2 = 2;
}

// Phase 20 — legacy feature update
// the 26 anciens ids Johto are remappes towards their new position ; the
 // Quest state tracking and progression rules
const QUEST_V3_OLD_JOHTO_ORDER = [101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126];
export const QUEST_V3_JOHTO_REMAP = {
 101:101, 102:102, 103:103, 104:104, 105:105, 106:106, 107:107,
 108:110, 109:111,                    // GS Ball 108-109 insere before the rival of the Bois
 110:116,                             // arc film 3 (112-115) before Tour Cendree
 111:118, 112:119,                    // Eusine 117 before Mortimer ; Amphy 120-121 before Jasmine
 113:122,
 114:125,                             // Peter 123 + Leviator rouge 124 before the repaire Rocket
 115:126, 116:127, 117:128,
 118:131, 119:132,                    // dragon trial 129-130 before the Victory Road rival
 120:133,                             // Suicune chase 134 after the Silver Wing
 121:135, 122:136, 123:137, 124:138, 125:139, 126:140,
};
function migrateQuestSaveV3(){
 if(!G || (G._questIdMigrationV3 || 0) >= 3) return;
 if(!G.mainStep || typeof G.mainStep !== 'object') G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
 // 1) mainStep.johto : index in the old chaine → index of the same quete
 //    in the new (the completees — by ids — not bougent not).
 const chain = (typeof getRegionChain === 'function') ? getRegionChain('johto') : [];
 const oldIdx = (G.mainStep.johto != null) ? G.mainStep.johto : 0;
 if(oldIdx >= QUEST_V3_OLD_JOHTO_ORDER.length){
  G.mainStep.johto = chain.length; // everything was finished -> everything is finished
 } else if(oldIdx > 0){
  const oldId = QUEST_V3_OLD_JOHTO_ORDER[oldIdx];
  const newId = QUEST_V3_JOHTO_REMAP[oldId];
  const nIdx = chain.findIndex((q) => q.id === newId);
  if(nIdx >= 0) G.mainStep.johto = nIdx;
 }
  // Quest state tracking and progression rules
 //    Kanto (1-44) and 'side_*' are not in the remap → unchanged.
 if(G.completedQuests && typeof G.completedQuests === 'object'){
  const next = {};
  for(const k of Object.keys(G.completedQuests)){
   const mapped = QUEST_V3_JOHTO_REMAP[k];
   next[String(mapped != null ? mapped : k)] = G.completedQuests[k];
  }
  G.completedQuests = next;
 }
 // 3) questBaselines.johto.
 if(G.questBaselines && G.questBaselines.johto && typeof G.questBaselines.johto === 'object'){
  const next = {};
  for(const k of Object.keys(G.questBaselines.johto)){
   const mapped = QUEST_V3_JOHTO_REMAP[k];
   next[String(mapped != null ? mapped : k)] = G.questBaselines.johto[k];
  }
  G.questBaselines.johto = next;
 }
 // 4) Instance of quete principale active (Johto) : qid remappe.
 if(Array.isArray(G.activeQuests)){
  for(const inst of G.activeQuests){
   if(inst && inst.cat === 'main' && QUEST_V3_JOHTO_REMAP[inst.qid] != null) inst.qid = QUEST_V3_JOHTO_REMAP[inst.qid];
  }
 }
 G._questIdMigrationV3 = 3;
}

// Phase 21 — legacy feature update
// quetes RFVF ; secondaires : Kanto s1-s13 inchanges, Johto s14-s38 → s31-s55)
const QUEST_V4_OLD_KANTO_ORDER = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44];
export const QUEST_V4_KANTO_REMAP = {
 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12,
 13:15, 14:16, 15:17, 16:18,       // Bill 13 + Fan Club 14 before the badge Cascadia
 17:20, 18:21, 19:22, 20:23,       // Capitaine 19 after the rivalite of the Sainte-Anne
 21:25, 22:26, 23:27,              // Route 8 (24); Mr. Fuji's flute kept at 27
 24:28, 25:29, 26:30,              // Eevee/Porygon 31-32 at the Game Corner
 27:33, 28:34,                     // Cycling Road 35 + Gold Teeth 36 (post-Koga)
 29:37, 30:38,                     // Lapras 39 + Dojo → Tyrogue 40 (Silph freed)
 31:41, 32:43,                     // Mr. Psychic 42; Collector 44
 33:45, 34:46,                     // Labo → Ptera 47 (post-Blaine)
 35:48, 36:49, 37:51,              // Chenal 21 (50) ; Ultime training 52
 38:53, 39:54, 40:55, 41:56, 42:57,// Memoires of the Manoir (58) before Mewtwo 59
 43:59, 44:60,                     // Mewtwo / Mew cloturent always the region
};
// Secondaires Johto decales of +17 (Kanto recoit s14-s30) :
export const QUEST_V4_SIDE_JOHTO_REMAP = {};
for(let i=14;i<=38;i++) QUEST_V4_SIDE_JOHTO_REMAP['s'+i] = 's'+(i+17);
function migrateQuestSaveV4(){
 if(!G || (G._questIdMigrationV4 || 0) >= 4) return;
 if(!G.mainStep || typeof G.mainStep !== 'object') G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
 // 1) mainStep.kanto : index in the old chaine → index of the same quete.
 const chain = (typeof getRegionChain === 'function') ? getRegionChain('kanto') : [];
 const oldIdx = (G.mainStep.kanto != null) ? G.mainStep.kanto : 0;
 if(oldIdx >= QUEST_V4_OLD_KANTO_ORDER.length){
  G.mainStep.kanto = chain.length; // everything was finished -> everything is finished
 } else if(oldIdx > 0){
  const oldId = QUEST_V4_OLD_KANTO_ORDER[oldIdx];
  const newId = QUEST_V4_KANTO_REMAP[oldId];
  const nIdx = chain.findIndex((q) => q.id === newId);
  if(nIdx >= 0) G.mainStep.kanto = nIdx;
 }
  // Quest state tracking and progression rules
 //    → 'side_s31'-'side_s55' ; Johto ('101'-'140') and sides Kanto (s1-s13) : passthrough.
 if(G.completedQuests && typeof G.completedQuests === 'object'){
  const next = {};
  for(const k of Object.keys(G.completedQuests)){
   if(k.startsWith('side_')){
    const sid = k.slice(5);
    next['side_' + (QUEST_V4_SIDE_JOHTO_REMAP[sid] || sid)] = G.completedQuests[k];
   }else{
    const mapped = QUEST_V4_KANTO_REMAP[k];
    next[String(mapped != null ? mapped : k)] = G.completedQuests[k];
   }
  }
  G.completedQuests = next;
 }
 // 3) questBaselines.kanto (Johto unchanged).
 if(G.questBaselines && G.questBaselines.kanto && typeof G.questBaselines.kanto === 'object'){
  const next = {};
  for(const k of Object.keys(G.questBaselines.kanto)){
   const mapped = QUEST_V4_KANTO_REMAP[k];
   next[String(mapped != null ? mapped : k)] = G.questBaselines.kanto[k];
  }
  G.questBaselines.kanto = next;
 }
 // 4) Instances actives : principale Kanto (qid) + secondaire Johto (sid).
 if(Array.isArray(G.activeQuests)){
  for(const inst of G.activeQuests){
   if(inst && inst.cat === 'main' && QUEST_V4_KANTO_REMAP[inst.qid] != null) inst.qid = QUEST_V4_KANTO_REMAP[inst.qid];
   else if(inst && inst.cat === 'side' && QUEST_V4_SIDE_JOHTO_REMAP[inst.qid]) inst.qid = QUEST_V4_SIDE_JOHTO_REMAP[inst.qid];
  }
 }
 G._questIdMigrationV4 = 4;
}

// ═══ Migration V5 : insertion of the quetes decouverte Base Secrete (217/218) ═══
// the quetes Hoenn 217-275 deviennent 219-277 (+2). the ids 217-275 are without
// ambiguite (Kanto 1-60, Johto 101-140) → remap direct of the cles of save.
function migrateQuestSaveV5(){
 if(!G || (G._questIdMigrationV5 || 0) >= 5) return;
 const shift = (id) => { const n = Number(id); return (n >= 217 && n <= 275) ? n + 2 : null; };
 // 1) mainStep.hoenn : index in the chaine — the insertion se done has the index 16
 //    (quete 217) : all index ≥ 16 is decale of +2.
 if(G.mainStep && typeof G.mainStep.hoenn === 'number' && G.mainStep.hoenn >= 16){
  G.mainStep.hoenn += 2;
 }
 // 2) completedQuests : cles '217'-'275' → '+2'.
 if(G.completedQuests && typeof G.completedQuests === 'object'){
  const next = {};
  for(const k of Object.keys(G.completedQuests)){
   const s = (!k.startsWith('side_')) ? shift(k) : null;
   next[s != null ? String(s) : k] = G.completedQuests[k];
  }
  G.completedQuests = next;
 }
 // 3) questBaselines.hoenn.
 if(G.questBaselines && G.questBaselines.hoenn && typeof G.questBaselines.hoenn === 'object'){
  const next = {};
  for(const k of Object.keys(G.questBaselines.hoenn)){
   const s = shift(k);
   next[s != null ? String(s) : k] = G.questBaselines.hoenn[k];
  }
  G.questBaselines.hoenn = next;
 }
 // 4) Instances actives principales.
 if(Array.isArray(G.activeQuests)){
  for(const inst of G.activeQuests){
   if(inst && inst.cat === 'main'){ const s = shift(inst.qid); if(s != null) inst.qid = s; }
  }
 }
 G._questIdMigrationV5 = 5;
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
 if(def.reqCondition && typeof def.reqCondition === 'function' && !def.reqCondition()){
   return;
 }
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
 // Phase 18: migration of the ids of quetes (renumerotation + addition Tour Rocket).
 try{ migrateQuestSaveV2(); }catch(_){}
 // Phase 20: densification Johto (etape 4) — renumerotation 101-126 → 101-140.
 try{ migrateQuestSaveV3(); }catch(_){}
 // Phase 21: densification Kanto (etape 5) — renumerotation 1-44 → 1-60
 // (+ secondaires Johto s14-s38 → s31-s55).
 try{ migrateQuestSaveV4(); }catch(_){}
 // V5 : quetes decouverte Base Secrete inserees (Hoenn 217-275 → 219-277).
 try{ migrateQuestSaveV5(); }catch(_){}
 if(!G.visitedMaps) G.visitedMaps={};
 if(!G.completedQuests) G.completedQuests={};
 if(!G.mainStep || typeof G.mainStep!=='object') G.mainStep={kanto:0, johto:0, hoenn:0};
 if(G.mainStep.kanto==null) G.mainStep.kanto=0;
 if(G.mainStep.johto==null) G.mainStep.johto=0;
 if(G.mainStep.hoenn==null) G.mainStep.hoenn=0;
 if(!G.mainProgress || typeof G.mainProgress!=='object') G.mainProgress={kanto:0, johto:0, hoenn:0};
 if(G.mainProgress.kanto==null) G.mainProgress.kanto=0;
 if(G.mainProgress.johto==null) G.mainProgress.johto=0;
 if(G.mainProgress.hoenn==null) G.mainProgress.hoenn=0;
 if(G.completedQuests[216] || (G.mainStep && G.mainStep.hoenn >= 16)) G.unlockedSecretBaseHoenn = true;
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
 // storyIdx indexe the OLD chaine (43 quetes) : the insertion of the quete
 // of the Tour Pokemon (position 21) decale the index following of +1.
 let legacyIdx = G.storyIdx;
 if(legacyIdx >= QUEST_V2_KANTO_INSERT_INDEX) legacyIdx = legacyIdx + 1;
 G.mainStep.kanto = Math.min(legacyIdx, kc);
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
 if(def.type==='trainer_battle'){
  if(G.questTrainerWins && G.questTrainerWins[def.battleId]) return true;
  // Gym / league quests: the REAL victory against the gym (badge,
  // defeatedChamps) or the league (regional title) validates the quest —
  // the battle starts against the true gym (startChampBattle), never
  // against a "quest_trainer_<gym>" double anymore.
  const _e = ((typeof OFFICIAL_TEAMS !== 'undefined' && OFFICIAL_TEAMS && OFFICIAL_TEAMS[def.battleId]) || (typeof OFFICIAL_TEAMS_HOENN !== 'undefined' && OFFICIAL_TEAMS_HOENN && OFFICIAL_TEAMS_HOENN[def.battleId])) || null;
  if(_e && _e.kind === 'gym') return !!(((G.badges||[]).includes(def.battleId)) || ((G.defeatedChamps||{})[def.battleId]));
  if(_e && _e.kind === 'league'){
   const _reg = _e.region || 'kanto';
   if(typeof isRegionLeagueWon === 'function') return !!isRegionLeagueWon(_reg);
   return !!G.championTitle;
  }
  return false;
 }
 if(def.type==='puzzle'){
  // Progression quete = resolue during the run (runSolved). the historique ever-completed remains for the UI.
  if(def.targetPuzzleId){
    if(typeof isPuzzleSolvedThisRun==='function' && isPuzzleSolvedThisRun(def.targetPuzzleId)) return true;
    // compat: progress counter via advanceQuests
    return questProgressValue(inst, def) >= (def.target||1);
  }
  return questProgressValue(inst, def) >= (def.target||1);
 }
 return questProgressValue(inst, def) >= (def.target||1);
}

function advanceQuests(type, loc, amount){
 ensureQuestState();
 const amt = amount||1;
 const region = G.region || 'kanto';
 
 
 
 function locMatches(def, type, loc){
 if(def.region && def.region !== (G.region || 'kanto')) return false;
 if(type === 'puzzle'){
  if(def.targetPuzzleId && loc === def.targetPuzzleId) return true;
  if(def.loc && loc === def.loc) return true;
  if(def.targetPuzzleId && !def.loc) return loc === def.targetPuzzleId;
  return !def.loc && !def.targetPuzzleId;
 }
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
 if (typeof window.EventBus !== 'undefined' && window.EventBus && window.EventBus.emit) {
   window.EventBus.emit('quest:update', { type: type, loc: loc, amount: amt });
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
   // Phase 20 — legacy feature update
   const started = (typeof startLegendaryEncounter === 'function') ? startLegendaryEncounter(def.rewardPoke, def.rewardLevel || 65, { shiny: !!def.rewardShiny }) : false;
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

 if(def.rewardMoney) G.money += (typeof __pwV43Link('applySecretBaseMoneyBonus') === 'function' ? applySecretBaseMoneyBonus(def.rewardMoney) : def.rewardMoney);
 if(def.rewardItems){ if(typeof grantRewardItems === 'function') grantRewardItems(def.rewardItems); else for(const k in def.rewardItems) addToInventory(k, def.rewardItems[k]); }

 if(cat==='main'){
 G.completedQuests[inst.qid]=true;
 if(Number(inst.qid) === 216) G.unlockedSecretBaseHoenn = true;
 const region = G.region || 'kanto';
 const chain = getRegionChain(region);
 const idx = chain.findIndex(q=>q.id===inst.qid);
 if(idx>=0) G.mainStep[region] = idx+1;
 G.mainProgress[region] = 0;
 if(G.questBaselines && G.questBaselines[region]) delete G.questBaselines[region][String(inst.qid)];
 
 G.activeQuests = G.activeQuests.filter(i=>!(i.cat==='main'));
 syncActiveMain();
 } else if(cat==='side'){
 // Puzzle quests: marked "already done" but replayable (re-accept OK).
 if(def && def.type==='puzzle'){
  G.completedQuests['side_'+inst.qid]=true; // indicateur
  if(def.targetPuzzleId && typeof resetPuzzleRun==='function'){
    try{ resetPuzzleRun(def.targetPuzzleId); }catch(_){}
  }
 } else {
  G.completedQuests['side_'+inst.qid]=true;
 }
 }
 list.splice(idx,1); 

 if(def.rewardPoke && cat==='side'){
 const legMon = createPoke(def.rewardPoke, 50, true);
 if(legMon){
 if(G.team.length<6) G.team.push(legMon); else { const _qKey = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(legMon.id) : (!G.collection[String(legMon.id)] ? String(legMon.id) : ('box_' + legMon.id + '_' + Date.now())); G.collection[_qKey]=legMon; }
 G.pokedex[def.rewardPoke]={...(G.pokedex[def.rewardPoke]||{}),seen:true,caught:true};
 unlockTalentForSpecies(def.rewardPoke, legMon.talent);
 notify(tr("m.quest_core.2", {p0:legMon.name}),'var(--green)');
 }
 }
 updateHeader();
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){}
 saveGame();
 try{ autoSave(); }catch(_e){}
 notify(t("m.quest_core.1"),'var(--green)');
}

function completeQuestRewardBattle(qid){
 ensureQuestState();
 const inst = (G.activeQuests || []).find(i=>String(i.qid)===String(qid) && i.cat==='main');
 const def = inst ? getMainQuestDef(inst.qid) : getMainQuestDef(qid);
 if(!inst || !def) return false;
 if(def.rewardMoney) G.money += (typeof __pwV43Link('applySecretBaseMoneyBonus') === 'function' ? applySecretBaseMoneyBonus(def.rewardMoney) : def.rewardMoney);
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
 try{ autoSave(); }catch(_e){}
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
 // ── Gym & league quests: start the TRUE gym confrontation ──
 // (fix: before, a gym double was instantiated as a
 // "quest_trainer_<gym>" quest-trainer battle; now the quest's
 // "Challenge" button starts startChampBattle on the real gym — badge,
 // rewards and rematches go through the normal circuit, and questDone()
 // validates the quest via G.badges / G.defeatedChamps / the league
 // title.)
 const _entry = ((typeof OFFICIAL_TEAMS !== 'undefined' && OFFICIAL_TEAMS && OFFICIAL_TEAMS[def.battleId]) || (typeof OFFICIAL_TEAMS_HOENN !== 'undefined' && OFFICIAL_TEAMS_HOENN && OFFICIAL_TEAMS_HOENN[def.battleId])) || null;
 if(_entry && (_entry.kind === 'gym' || _entry.kind === 'league')){
  const champId = (_entry.kind === 'gym')
   ? def.battleId
   : ((_entry.region === 'hoenn') ? 'hoenn_elite4' : (_entry.region === 'johto') ? 'johto_elite4' : 'elite4');
  if(typeof startChampBattle === 'function'){ startChampBattle(champId); return; }
 }
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
  // Phase 18: dialogue of introduction scenarise (i18n) of the trainer.
  const intro = (typeof getTrainerBattleDialog === 'function') ? getTrainerBattleDialog(def.battleId, 'intro') : '';
  if(intro && typeof addBattleLog === 'function') addBattleLog('« ' + intro + ' » — ' + getTrainerBattleName(def.battleId));
 }
}
function completeQuestTrainerBattle(battleId){
 if(!G.questTrainerWins || typeof G.questTrainerWins !== 'object') G.questTrainerWins = {};
 G.questTrainerWins[battleId] = true;
 const trainer = getTrainerBattleDef(battleId);
 if(trainer && trainer.rewardMoney) G.money = (G.money||0) + (typeof __pwV43Link('applySecretBaseMoneyBonus') === 'function' ? applySecretBaseMoneyBonus(trainer.rewardMoney) : trainer.rewardMoney);
 updateHeader();
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 saveGame();
 notify(tr('trainer_battle_won', {trainer:getTrainerBattleName(battleId)}), 'var(--green)');
 // Phase 18: replique of defaite of the trainer (i18n) in the journal.
 const winQuote = (typeof getTrainerBattleDialog === 'function') ? getTrainerBattleDialog(battleId, 'win') : '';
 if(winQuote && typeof addBattleLog === 'function') addBattleLog('« ' + winQuote + ' » — ' + getTrainerBattleName(battleId));
}


const _repeatableRoll = [];


function _refreshUI(){ try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){} }
// Wave 41 — subscriptions kept: in prod globalThis.EventBus/EVENTS are
// placed by classic-bridge BEFORE this module; without them (targeted sandboxes),
// the module must finish evaluating for its kept surfaces to attach
// (in a classic script, function hoisting masked the failure swallowed here —
// an ESM module has no hoisting to the global scope).
if (typeof EventBus !== 'undefined' && EventBus && EventBus.on) {
  EventBus.on(EVENTS.WILD_DEFEATED, ({loc}) => { advanceQuests('defeat_wild', loc, 1); _refreshUI(); });
  EventBus.on(EVENTS.POKEMON_CAUGHT, ({loc}) => { advanceQuests('catch', loc, 1); _refreshUI(); });
  EventBus.on(EVENTS.MINE_SELL, ({amount}) => { advanceQuests('mine_sell', null, amount); _refreshUI(); });
  EventBus.on(EVENTS.BADGE_EARNED, () => { advanceQuests('badge', null, 1); _refreshUI(); });
  EventBus.on(EVENTS.LEAGUE_WON, () => { advanceQuests('league', null, 1); _refreshUI(); });
  try{ EventBus.on('PUZZLE_SOLVED', ({id,loc}) => { advanceQuests('puzzle', id, 1); if(loc) advanceQuests('puzzle', loc, 0); _refreshUI(); }); }catch(_){}
}


// --- Migrated to ES module, globals exposed ---
if (typeof getRegionChain !== 'undefined') { if (typeof window !== 'undefined') window.getRegionChain = getRegionChain; if (typeof globalThis !== 'undefined') globalThis.getRegionChain = getRegionChain; }
if (typeof getCurrentMain !== 'undefined') { if (typeof window !== 'undefined') window.getCurrentMain = getCurrentMain; if (typeof globalThis !== 'undefined') globalThis.getCurrentMain = getCurrentMain; }
if (typeof syncActiveMain !== 'undefined') { if (typeof window !== 'undefined') window.syncActiveMain = syncActiveMain; if (typeof globalThis !== 'undefined') globalThis.syncActiveMain = syncActiveMain; }
if (typeof ensureQuestState !== 'undefined') { if (typeof window !== 'undefined') window.ensureQuestState = ensureQuestState; if (typeof globalThis !== 'undefined') globalThis.ensureQuestState = ensureQuestState; }
if (typeof getMainQuestDef !== 'undefined') { if (typeof window !== 'undefined') window.getMainQuestDef = getMainQuestDef; if (typeof globalThis !== 'undefined') globalThis.getMainQuestDef = getMainQuestDef; }
if (typeof getSideQuestDef !== 'undefined') { if (typeof window !== 'undefined') window.getSideQuestDef = getSideQuestDef; if (typeof globalThis !== 'undefined') globalThis.getSideQuestDef = getSideQuestDef; }
if (typeof locGroup !== 'undefined') { if (typeof window !== 'undefined') window.locGroup = locGroup; if (typeof globalThis !== 'undefined') globalThis.locGroup = locGroup; }
if (typeof markVisited !== 'undefined') { if (typeof window !== 'undefined') window.markVisited = markVisited; if (typeof globalThis !== 'undefined') globalThis.markVisited = markVisited; }
if (typeof getQuestWildWinCount !== 'undefined') { if (typeof window !== 'undefined') window.getQuestWildWinCount = getQuestWildWinCount; if (typeof globalThis !== 'undefined') globalThis.getQuestWildWinCount = getQuestWildWinCount; }
if (typeof ensureQuestBaseline !== 'undefined') { if (typeof window !== 'undefined') window.ensureQuestBaseline = ensureQuestBaseline; if (typeof globalThis !== 'undefined') globalThis.ensureQuestBaseline = ensureQuestBaseline; }
if (typeof questProgressValue !== 'undefined') { if (typeof window !== 'undefined') window.questProgressValue = questProgressValue; if (typeof globalThis !== 'undefined') globalThis.questProgressValue = questProgressValue; }
if (typeof questDone !== 'undefined') { if (typeof window !== 'undefined') window.questDone = questDone; if (typeof globalThis !== 'undefined') globalThis.questDone = questDone; }
if (typeof advanceQuests !== 'undefined') { if (typeof window !== 'undefined') window.advanceQuests = advanceQuests; if (typeof globalThis !== 'undefined') globalThis.advanceQuests = advanceQuests; }
if (typeof locMatches !== 'undefined') { if (typeof window !== 'undefined') window.locMatches = locMatches; if (typeof globalThis !== 'undefined') globalThis.locMatches = locMatches; }
if (typeof claimQuest !== 'undefined') { if (typeof window !== 'undefined') window.claimQuest = claimQuest; if (typeof globalThis !== 'undefined') globalThis.claimQuest = claimQuest; }
if (typeof completeQuestRewardBattle !== 'undefined') { if (typeof window !== 'undefined') window.completeQuestRewardBattle = completeQuestRewardBattle; if (typeof globalThis !== 'undefined') globalThis.completeQuestRewardBattle = completeQuestRewardBattle; }
if (typeof talkNpcMainQuest !== 'undefined') { if (typeof window !== 'undefined') window.talkNpcMainQuest = talkNpcMainQuest; if (typeof globalThis !== 'undefined') globalThis.talkNpcMainQuest = talkNpcMainQuest; }
if (typeof getQuestDefinitionForInstance !== 'undefined') { if (typeof window !== 'undefined') window.getQuestDefinitionForInstance = getQuestDefinitionForInstance; if (typeof globalThis !== 'undefined') globalThis.getQuestDefinitionForInstance = getQuestDefinitionForInstance; }
if (typeof getActiveLocalDefeatQuestForLocation !== 'undefined') { if (typeof window !== 'undefined') window.getActiveLocalDefeatQuestForLocation = getActiveLocalDefeatQuestForLocation; if (typeof globalThis !== 'undefined') globalThis.getActiveLocalDefeatQuestForLocation = getActiveLocalDefeatQuestForLocation; }
if (typeof getQuestBattlePool !== 'undefined') { if (typeof window !== 'undefined') window.getQuestBattlePool = getQuestBattlePool; if (typeof globalThis !== 'undefined') globalThis.getQuestBattlePool = getQuestBattlePool; }
if (typeof startQuestDefeatBattle !== 'undefined') { if (typeof window !== 'undefined') window.startQuestDefeatBattle = startQuestDefeatBattle; if (typeof globalThis !== 'undefined') globalThis.startQuestDefeatBattle = startQuestDefeatBattle; }
if (typeof getTrainerBattleDef !== 'undefined') { if (typeof window !== 'undefined') window.getTrainerBattleDef = getTrainerBattleDef; if (typeof globalThis !== 'undefined') globalThis.getTrainerBattleDef = getTrainerBattleDef; }
if (typeof getTrainerBattleName !== 'undefined') { if (typeof window !== 'undefined') window.getTrainerBattleName = getTrainerBattleName; if (typeof globalThis !== 'undefined') globalThis.getTrainerBattleName = getTrainerBattleName; }
if (typeof getTrainerBattleDialog !== 'undefined') { if (typeof window !== 'undefined') window.getTrainerBattleDialog = getTrainerBattleDialog; if (typeof globalThis !== 'undefined') globalThis.getTrainerBattleDialog = getTrainerBattleDialog; }
if (typeof getPlayerStarterSpecies !== 'undefined') { if (typeof window !== 'undefined') window.getPlayerStarterSpecies = getPlayerStarterSpecies; if (typeof globalThis !== 'undefined') globalThis.getPlayerStarterSpecies = getPlayerStarterSpecies; }
if (typeof migrateQuestSaveV2 !== 'undefined') { if (typeof window !== 'undefined') window.migrateQuestSaveV2 = migrateQuestSaveV2; if (typeof globalThis !== 'undefined') globalThis.migrateQuestSaveV2 = migrateQuestSaveV2; }
if (typeof migrateQuestSaveV3 !== 'undefined') { if (typeof window !== 'undefined') window.migrateQuestSaveV3 = migrateQuestSaveV3; if (typeof globalThis !== 'undefined') globalThis.migrateQuestSaveV3 = migrateQuestSaveV3; }
if (typeof QUEST_V3_JOHTO_REMAP !== 'undefined') { if (typeof window !== 'undefined') window.QUEST_V3_JOHTO_REMAP = QUEST_V3_JOHTO_REMAP; if (typeof globalThis !== 'undefined') globalThis.QUEST_V3_JOHTO_REMAP = QUEST_V3_JOHTO_REMAP; }
if (typeof migrateQuestSaveV4 !== 'undefined') { if (typeof window !== 'undefined') window.migrateQuestSaveV4 = migrateQuestSaveV4; if (typeof globalThis !== 'undefined') globalThis.migrateQuestSaveV4 = migrateQuestSaveV4; }
if (typeof QUEST_V4_KANTO_REMAP !== 'undefined') { if (typeof window !== 'undefined') window.QUEST_V4_KANTO_REMAP = QUEST_V4_KANTO_REMAP; if (typeof globalThis !== 'undefined') globalThis.QUEST_V4_KANTO_REMAP = QUEST_V4_KANTO_REMAP; }
if (typeof QUEST_V4_SIDE_JOHTO_REMAP !== 'undefined') { if (typeof window !== 'undefined') window.QUEST_V4_SIDE_JOHTO_REMAP = QUEST_V4_SIDE_JOHTO_REMAP; if (typeof globalThis !== 'undefined') globalThis.QUEST_V4_SIDE_JOHTO_REMAP = QUEST_V4_SIDE_JOHTO_REMAP; }
if (typeof startQuestTrainerBattle !== 'undefined') { if (typeof window !== 'undefined') window.startQuestTrainerBattle = startQuestTrainerBattle; if (typeof globalThis !== 'undefined') globalThis.startQuestTrainerBattle = startQuestTrainerBattle; }
if (typeof completeQuestTrainerBattle !== 'undefined') { if (typeof window !== 'undefined') window.completeQuestTrainerBattle = completeQuestTrainerBattle; if (typeof globalThis !== 'undefined') globalThis.completeQuestTrainerBattle = completeQuestTrainerBattle; }
if (typeof _refreshUI !== 'undefined') { if (typeof window !== 'undefined') window._refreshUI = _refreshUI; if (typeof globalThis !== 'undefined') globalThis._refreshUI = _refreshUI; }



// --- Exported globals ---
if (typeof createTrainerBattleTeam !== 'undefined') { if (typeof window !== 'undefined') window.createTrainerBattleTeam = createTrainerBattleTeam; if (typeof globalThis !== 'undefined') globalThis.createTrainerBattleTeam = createTrainerBattleTeam; }
if (typeof migrateQuestSaveV5 !== 'undefined') { if (typeof window !== 'undefined') window.migrateQuestSaveV5 = migrateQuestSaveV5; if (typeof globalThis !== 'undefined') globalThis.migrateQuestSaveV5 = migrateQuestSaveV5; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  getRegionChain,
  getCurrentMain,
  syncActiveMain,
  ensureQuestState,
  getMainQuestDef,
  getSideQuestDef,
  locGroup,
  markVisited,
  getQuestWildWinCount,
  ensureQuestBaseline,
  questProgressValue,
  questDone,
  advanceQuests,
  claimQuest,
  completeQuestRewardBattle,
  talkNpcMainQuest,
  getQuestDefinitionForInstance,
  getActiveLocalDefeatQuestForLocation,
  getQuestBattlePool,
  startQuestDefeatBattle,
  getTrainerBattleDef,
  getTrainerBattleName,
  getTrainerBattleDialog,
  getPlayerStarterSpecies,
  migrateQuestSaveV2,
  migrateQuestSaveV3,
  migrateQuestSaveV4,
  startQuestTrainerBattle,
  completeQuestTrainerBattle,
  _refreshUI,
  createTrainerBattleTeam,
  migrateQuestSaveV5,
};
