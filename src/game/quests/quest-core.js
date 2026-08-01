// ═══ Combats de dresseurs de quêtes (étape 2 — passe 18) ═══
// Source de vérité unique : OFFICIAL_TEAMS (src/data/official-teams-data.js).
// Avant cette passe, TRAINER_BATTLES vivait ici avec des ids d'attaques
// legacy compacts ('shadowball', 'quickattack', 'rockthrow'…) ABSENTS de
// MOVES → filtrés silencieusement → movesets vides puis regénérés au
// hasard. Les équipes sont désormais légitimes (pool naturel ∪ CT/CS),
// validées par tests, et l'équipe du rival DÉPEND du starter du joueur.
function getTrainerBattleDef(id){
 const e = (typeof OFFICIAL_TEAMS !== 'undefined' && OFFICIAL_TEAMS && OFFICIAL_TEAMS[id]) ? OFFICIAL_TEAMS[id] : ((typeof OFFICIAL_TEAMS_HOENN !== 'undefined' && OFFICIAL_TEAMS_HOENN) ? OFFICIAL_TEAMS_HOENN[id] : null);
 if(!e) return null;
 return { name: e.name || id, role: e.role || e.kind || 'trainer', style: e.style || [], rewardMoney: e.rewardMoney || 0, title: e.title || '', id: id, kind: e.kind };
}
function getTrainerBattleName(id){ const key='trainer_battle_name_'+id; const val=(typeof t==='function')?t(key):''; return (val && val!==key) ? val : ((getTrainerBattleDef(id)||{}).name || id); }

// Dialogues scénarisés (i18n) : introduction avant combat + punchline de
// victoire. Clés `trainer_battle_intro_<battleId>` / `trainer_battle_win_<battleId>`.
function getTrainerBattleDialog(id, kind){
 const key = 'trainer_battle_' + kind + '_' + id;
 const val = (typeof t === 'function') ? t(key) : '';
 return (val && val !== key) ? val : '';
}

// Espèces de starters par région (pour les variantes du rival).
const QUEST_STARTER_SPECIES_BY_REGION = { kanto: [1, 4, 7], johto: [152, 155, 158] };
function getPlayerStarterSpecies(region){
 region = region || (typeof G !== 'undefined' && G && G.region) || 'kanto';
 const ids = QUEST_STARTER_SPECIES_BY_REGION[region] || [];
 if(typeof G === 'undefined' || !G) return null;
 // Champ explicite (enregistré par pickStarter depuis la passe 18).
 if(G.starterSpecies && G.starterSpecies[region]) return G.starterSpecies[region];
 // Repli pour les sauvegardes antérieures : starter présent dans l'équipe.
 if(Array.isArray(G.team)){
  for(const id of ids){ if(G.team.some(p => p && Number(p.id) === id) ) return id; }
 }
 // Repli suivant : espèce de starter capturée dans le pokédex.
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

// ═══ Migration de sauvegarde V2 (passe 18) ═══
// Les quêtes principales ont été rangées et renumérotées (Kanto 1-44 avec
// l'insertion du combat Rocket de la Tour Pokémon en 22 ; Johto 101-126),
// et les quêtes secondaires regroupées par région (Kanto s1-s13, Johto
// s14-s26). Cette migration recalcule mainStep (index), completedQuests,
// questBaselines et les instances actives depuis les anciens ids.
const QUEST_V2_OLD_KANTO_ORDER = [30,0,40,41,1001,1,42,2,1002,1003,43,1004,3,44,45,1005,5,4,46,47,7,52,48,1006,1007,8,9,1008,1009,10,49,50,11,12,51,1010,13,14,15,16,17,18,19];
const QUEST_V2_OLD_JOHTO_ORDER = [31,20,1101,1102,21,1103,22,1104,23,1105,24,25,26,1106,27,1107,28,1108,29,60,61,62,63,64,65,66];
const QUEST_V2_KANTO_INSERT_INDEX = 21; // nouvelle quête « kanto_rocket_tower » (id 22)
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
 // 1) mainStep : index dans l'ancienne chaîne → index dans la nouvelle.
 const kIdx = (G.mainStep.kanto != null) ? G.mainStep.kanto : 0;
 if(kIdx >= QUEST_V2_OLD_KANTO_ORDER.length) G.mainStep.kanto = QUEST_V2_OLD_KANTO_ORDER.length + 1; // tout était fini (44 quêtes désormais)
 else if(kIdx >= QUEST_V2_KANTO_INSERT_INDEX) G.mainStep.kanto = kIdx + 1;
 // Johto : ordre inchangé, renumérotation seule → même index.
 // 2) completedQuests : clés anciens ids → nouveaux ids (+ 'side_x').
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
 // 4) Instances secondaires actives : qid remappé.
 if(Array.isArray(G.activeQuests)){
  for(const inst of G.activeQuests){
   if(inst && inst.cat === 'side') inst.qid = QUEST_V2_SIDE_REMAP[inst.qid] || inst.qid;
  }
 }
 G._questIdMigrationV2 = 2;
}

// ── Migration V3 (passe 20 / étape 4 : densification Johto 101-126 → 101-140) ──
// Les 26 anciens ids Johto sont remappés vers leur nouvelle position ; les
// 14 nouvelles quêtes prennent les ids libres. Ancienne → nouvelle identité :
const QUEST_V3_OLD_JOHTO_ORDER = [101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126];
const QUEST_V3_JOHTO_REMAP = {
 101:101, 102:102, 103:103, 104:104, 105:105, 106:106, 107:107,
 108:110, 109:111,                    // GS Ball 108-109 inséré avant le rival du Bois
 110:116,                             // arc film 3 (112-115) avant Tour Cendrée
 111:118, 112:119,                    // Eusine 117 avant Mortimer ; Amphy 120-121 avant Jasmine
 113:122,
 114:125,                             // Peter 123 + Léviator rouge 124 avant le repaire Rocket
 115:126, 116:127, 117:128,
 118:131, 119:132,                    // épreuve dragon 129-130 avant le rival de la Route Victoire
 120:133,                             // poursuite Suicune 134 après l'Aile Argent
 121:135, 122:136, 123:137, 124:138, 125:139, 126:140,
};
function migrateQuestSaveV3(){
 if(!G || (G._questIdMigrationV3 || 0) >= 3) return;
 if(!G.mainStep || typeof G.mainStep !== 'object') G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
 // 1) mainStep.johto : index dans l'ancienne chaîne → index de la même quête
 //    dans la nouvelle (les complétées — par ids — ne bougent pas).
 const chain = (typeof getRegionChain === 'function') ? getRegionChain('johto') : [];
 const oldIdx = (G.mainStep.johto != null) ? G.mainStep.johto : 0;
 if(oldIdx >= QUEST_V3_OLD_JOHTO_ORDER.length){
  G.mainStep.johto = chain.length; // tout était fini → tout est fini
 } else if(oldIdx > 0){
  const oldId = QUEST_V3_OLD_JOHTO_ORDER[oldIdx];
  const newId = QUEST_V3_JOHTO_REMAP[oldId];
  const nIdx = chain.findIndex((q) => q.id === newId);
  if(nIdx >= 0) G.mainStep.johto = nIdx;
 }
 // 2) completedQuests : clés 101-126 (Johto V2) → nouveaux ids. Les clés
 //    Kanto (1-44) et 'side_*' ne sont pas dans le remap → inchangées.
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
 // 4) Instance de quête principale active (Johto) : qid remappé.
 if(Array.isArray(G.activeQuests)){
  for(const inst of G.activeQuests){
   if(inst && inst.cat === 'main' && QUEST_V3_JOHTO_REMAP[inst.qid] != null) inst.qid = QUEST_V3_JOHTO_REMAP[inst.qid];
  }
 }
 G._questIdMigrationV3 = 3;
}

// ── Migration V4 (passe 21 / étape 5 : densification Kanto 1-44 → 1-60, +16 ──
// quêtes RFVF ; secondaires : Kanto s1-s13 inchangés, Johto s14-s38 → s31-s55)
const QUEST_V4_OLD_KANTO_ORDER = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44];
const QUEST_V4_KANTO_REMAP = {
 1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12,
 13:15, 14:16, 15:17, 16:18,       // Bill 13 + Fan Club 14 avant le badge Cascadia
 17:20, 18:21, 19:22, 20:23,       // Capitaine 19 après la rivalité du Sainte-Anne
 21:25, 22:26, 23:27,              // Route 8 (24) ; flûte M. Fuji conservée en 27
 24:28, 25:29, 26:30,              // Évoli/Porygon 31-32 au Game Corner
 27:33, 28:34,                     // Piste Cyclable 35 + Dentiers d'or 36 (post-Koga)
 29:37, 30:38,                     // Lokhlass 39 + Dojo → Tyrogue 40 (Sylphe libérée)
 31:41, 32:43,                     // M. Psyché 42 ; Collecteur 44
 33:45, 34:46,                     // Labo → Ptéra 47 (post-Blaine)
 35:48, 36:49, 37:51,              // Chenal 21 (50) ; Ultime entraînement 52
 38:53, 39:54, 40:55, 41:56, 42:57,// Mémoires du Manoir (58) avant Mewtwo 59
 43:59, 44:60,                     // Mewtwo / Mew clôturent toujours la région
};
// Secondaires Johto décalés de +17 (Kanto reçoit s14-s30) :
const QUEST_V4_SIDE_JOHTO_REMAP = {};
for(let i=14;i<=38;i++) QUEST_V4_SIDE_JOHTO_REMAP['s'+i] = 's'+(i+17);
function migrateQuestSaveV4(){
 if(!G || (G._questIdMigrationV4 || 0) >= 4) return;
 if(!G.mainStep || typeof G.mainStep !== 'object') G.mainStep = { kanto: 0, johto: 0, hoenn: 0 };
 // 1) mainStep.kanto : index dans l'ancienne chaîne → index de la même quête.
 const chain = (typeof getRegionChain === 'function') ? getRegionChain('kanto') : [];
 const oldIdx = (G.mainStep.kanto != null) ? G.mainStep.kanto : 0;
 if(oldIdx >= QUEST_V4_OLD_KANTO_ORDER.length){
  G.mainStep.kanto = chain.length; // tout était fini → tout est fini
 } else if(oldIdx > 0){
  const oldId = QUEST_V4_OLD_KANTO_ORDER[oldIdx];
  const newId = QUEST_V4_KANTO_REMAP[oldId];
  const nIdx = chain.findIndex((q) => q.id === newId);
  if(nIdx >= 0) G.mainStep.kanto = nIdx;
 }
 // 2) completedQuests : clés Kanto '1'-'44' → nouveaux ids ; 'side_s14'-'side_s38'
 //    → 'side_s31'-'side_s55' ; Johto ('101'-'140') et sides Kanto (s1-s13) : passthrough.
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
 // 3) questBaselines.kanto (Johto inchangé).
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

// ═══ Migration V5 : insertion des quêtes découverte Base Secrète (217/218) ═══
// Les quêtes Hoenn 217-275 deviennent 219-277 (+2). Les ids 217-275 sont sans
// ambiguïté (Kanto 1-60, Johto 101-140) → remap direct des clés de sauvegarde.
function migrateQuestSaveV5(){
 if(!G || (G._questIdMigrationV5 || 0) >= 5) return;
 const shift = (id) => { const n = Number(id); return (n >= 217 && n <= 275) ? n + 2 : null; };
 // 1) mainStep.hoenn : index dans la chaîne — l'insertion se fait à l'index 16
 //    (quête 217) : tout index ≥ 16 est décalé de +2.
 if(G.mainStep && typeof G.mainStep.hoenn === 'number' && G.mainStep.hoenn >= 16){
  G.mainStep.hoenn += 2;
 }
 // 2) completedQuests : clés '217'-'275' → '+2'.
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
 // Passe 18 : migration des ids de quêtes (renumérotation + ajout Tour Rocket).
 try{ migrateQuestSaveV2(); }catch(_){}
 // Passe 20 : densification Johto (étape 4) — renumérotation 101-126 → 101-140.
 try{ migrateQuestSaveV3(); }catch(_){}
 // Passe 21 : densification Kanto (étape 5) — renumérotation 1-44 → 1-60
 // (+ secondaires Johto s14-s38 → s31-s55).
 try{ migrateQuestSaveV4(); }catch(_){}
 // V5 : quêtes découverte Base Secrète insérées (Hoenn 217-275 → 219-277).
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
 // storyIdx indexe l'ANCIENNE chaîne (43 quêtes) : l'insertion de la quête
 // de la Tour Pokémon (position 21) décale les index suivants de +1.
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
  // Quêtes d'arène / ligue : la victoire RÉELLE contre l'arène (badge,
  // defeatedChamps) ou la ligue (titre régional) valide la quête — le combat
  // est lancé contre la vraie arène (startChampBattle), plus jamais contre un
  // double « quest_trainer_<gym> ».
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
  // Progression quête = résolue pendant la run (runSolved). L'historique ever-completed reste pour l'UI.
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
   // def.rewardShiny (passe 20 : le Léviator rouge du Lac Colère, canon OAC)
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

 if(def.rewardMoney) G.money += (typeof applySecretBaseMoneyBonus==='function' ? applySecretBaseMoneyBonus(def.rewardMoney) : def.rewardMoney);
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
 // Quêtes puzzle : marquées « déjà terminées » mais rejouables (re-accept OK).
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

 const lang = G.lang||'fr';
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
 try{ autoSave(); }catch(e){}
 notify(t("m.quest_core.1"),'var(--green)');
}

function completeQuestRewardBattle(qid){
 ensureQuestState();
 const inst = (G.activeQuests || []).find(i=>String(i.qid)===String(qid) && i.cat==='main');
 const def = inst ? getMainQuestDef(inst.qid) : getMainQuestDef(qid);
 if(!inst || !def) return false;
 if(def.rewardMoney) G.money += (typeof applySecretBaseMoneyBonus==='function' ? applySecretBaseMoneyBonus(def.rewardMoney) : def.rewardMoney);
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
 // ── Quêtes d'arène & de ligue : lancer le VRAI affrontement d'arène ──
 // (correctif : avant, un double de l'arène était instancié en combat de
 // dresseur de quête « quest_trainer_<gym> » ; désormais le bouton « Défier »
 // de la quête démarre startChampBattle sur la véritable arène — badge,
 // récompenses et revanches passent par le circuit normal, et questDone()
 // valide la quête via G.badges / G.defeatedChamps / le titre de ligue.)
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
  // Passe 18 : dialogue d'introduction scénarisé (i18n) du dresseur.
  const intro = (typeof getTrainerBattleDialog === 'function') ? getTrainerBattleDialog(def.battleId, 'intro') : '';
  if(intro && typeof addBattleLog === 'function') addBattleLog('« ' + intro + ' » — ' + getTrainerBattleName(def.battleId));
 }
}
function completeQuestTrainerBattle(battleId){
 if(!G.questTrainerWins || typeof G.questTrainerWins !== 'object') G.questTrainerWins = {};
 G.questTrainerWins[battleId] = true;
 const trainer = getTrainerBattleDef(battleId);
 if(trainer && trainer.rewardMoney) G.money = (G.money||0) + (typeof applySecretBaseMoneyBonus==='function' ? applySecretBaseMoneyBonus(trainer.rewardMoney) : trainer.rewardMoney);
 updateHeader();
 try{ if(document.getElementById('story-panel')) renderStoryWindow(); }catch(_){}
 saveGame();
 notify(tr('trainer_battle_won', {trainer:getTrainerBattleName(battleId)}), 'var(--green)');
 // Passe 18 : réplique de défaite du dresseur (i18n) dans le journal.
 const winQuote = (typeof getTrainerBattleDialog === 'function') ? getTrainerBattleDialog(battleId, 'win') : '';
 if(winQuote && typeof addBattleLog === 'function') addBattleLog('« ' + winQuote + ' » — ' + getTrainerBattleName(battleId));
}


var _repeatableRoll = [];


function _refreshUI(){ try{ if(typeof refreshMapAndLoc==='function') refreshMapAndLoc(); }catch(_){} }
EventBus.on(EVENTS.WILD_DEFEATED, ({loc}) => { advanceQuests('defeat_wild', loc, 1); _refreshUI(); });
EventBus.on(EVENTS.POKEMON_CAUGHT, ({loc}) => { advanceQuests('catch', loc, 1); _refreshUI(); });
EventBus.on(EVENTS.MINE_SELL, ({amount}) => { advanceQuests('mine_sell', null, amount); _refreshUI(); });
EventBus.on(EVENTS.BADGE_EARNED, () => { advanceQuests('badge', null, 1); _refreshUI(); });
EventBus.on(EVENTS.LEAGUE_WON, () => { advanceQuests('league', null, 1); _refreshUI(); });
try{ EventBus.on('PUZZLE_SOLVED', ({id,loc}) => { advanceQuests('puzzle', id, 1); if(loc) advanceQuests('puzzle', loc, 0); _refreshUI(); }); }catch(_){}


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
if (typeof getTrainerBattleDialog !== 'undefined' && typeof window !== 'undefined') window.getTrainerBattleDialog = getTrainerBattleDialog;
if (typeof getPlayerStarterSpecies !== 'undefined' && typeof window !== 'undefined') window.getPlayerStarterSpecies = getPlayerStarterSpecies;
if (typeof migrateQuestSaveV2 !== 'undefined' && typeof window !== 'undefined') window.migrateQuestSaveV2 = migrateQuestSaveV2;
if (typeof migrateQuestSaveV3 !== 'undefined' && typeof window !== 'undefined') window.migrateQuestSaveV3 = migrateQuestSaveV3;
if (typeof QUEST_V3_JOHTO_REMAP !== 'undefined' && typeof window !== 'undefined') window.QUEST_V3_JOHTO_REMAP = QUEST_V3_JOHTO_REMAP;
if (typeof migrateQuestSaveV4 !== 'undefined' && typeof window !== 'undefined') window.migrateQuestSaveV4 = migrateQuestSaveV4;
if (typeof QUEST_V4_KANTO_REMAP !== 'undefined' && typeof window !== 'undefined') window.QUEST_V4_KANTO_REMAP = QUEST_V4_KANTO_REMAP;
if (typeof QUEST_V4_SIDE_JOHTO_REMAP !== 'undefined' && typeof window !== 'undefined') window.QUEST_V4_SIDE_JOHTO_REMAP = QUEST_V4_SIDE_JOHTO_REMAP;
if (typeof startQuestTrainerBattle !== 'undefined' && typeof window !== 'undefined') window.startQuestTrainerBattle = startQuestTrainerBattle;
if (typeof completeQuestTrainerBattle !== 'undefined' && typeof window !== 'undefined') window.completeQuestTrainerBattle = completeQuestTrainerBattle;
if (typeof _refreshUI !== 'undefined' && typeof window !== 'undefined') window._refreshUI = _refreshUI;


