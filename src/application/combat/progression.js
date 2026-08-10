function canEvolveToRegion(targetId) {
 const nid = Number(targetId);
 if (nid >= 152 && nid <= 251) return (typeof canAccessRegion === 'function' ? canAccessRegion('johto') : true);
 if (nid >= 252 && nid <= 386) return (typeof canAccessRegion === 'function' ? canAccessRegion('hoenn') : true);
 return true;
}
// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function getSecretBaseBonuses(...args) { const f = __pwV43Link('getSecretBaseBonuses'); return f ? f(...args) : undefined; }
function gainXP(enemy){
 const base=Math.floor(enemy.xpYield*enemy.level/7);
 const alive=G.team.filter(p=>p.currentHP>0);
 if(!alive.length) return 0;
 const xpMult = (typeof __pwV43Link('getSecretBaseBonuses') === 'function' && Number.isFinite(getSecretBaseBonuses().xpMult)) ? getSecretBaseBonuses().xpMult : 1;
 const share=Math.max(1,Math.floor(base*0.7*xpMult));
 for(const p of alive){
 if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
 const before=p.level;
 p.xp+=share;
 while(p.xp>=p.xpNext&&p.level<100){
 levelUp(p);
 }
 if(p.level>before) addBattleLog(` ${p.name} passe au niveau ${p.level} !`);
 }

  // Phase 30: daycare no longer uses an XP counter — it progresses on
  // the shared K.O. counter (hatcheryRegisterBattleKills, called on each
  // enemy knocked out), like incubation. XP block removed here.

 return share;
}
function levelUp(p){
 p.level++;
 const oldMax = p.maxHP;
 recalcPokeStats(p);
 p.currentHP = Math.min(p.maxHP, p.currentHP + (p.maxHP - oldMax));
 p.xpNext = xpForLevel(p.level+1);
 if(p.xp < xpForLevel(p.level)) p.xp = xpForLevel(p.level);
 
 // Systeme PokeChill : pool deterministe by espece
 // each level check if a new move is unlocks
  // Level-up move assignment and stat recalculation
 let targetMoves = [];
 if (typeof getMovesForLevel === 'function') {
   targetMoves = getMovesForLevel(p.id, p.level);
 }
 if (!targetMoves || targetMoves.length === 0) {
   targetMoves = [{id:'tackle'}];
 }
 
 // Make sure p.moves exists
 if (!p.moves) p.moves = [];
 
 // Count the moves the Pokemon SHOULD have at this level
 const expectedCount = targetMoves.length;
 const currentCount = p.moves.length;
 
  // Level-up move assignment and stat recalculation
 const isKeyLevel = (p.level === 10 || p.level === 20 || p.level === 30 || p.level === 50 || p.level === 100);
 
 if (isKeyLevel && (!p.moves || p.moves.length === 0)) {
   // Trier the moves of the pool by puissance decroissante
   const sortedPool = targetMoves.slice().sort(function(a, b) {
     const mvData = (typeof MOVES !== 'undefined') ? MOVES : (window.MOVES || {});
     const ma = mvData[a.id];
     const mb = mvData[b.id];
     return (mb ? mb.power || 0 : 0) - (ma ? ma.power || 0 : 0);
   });
   p.moves = sortedPool.slice(0, 4).filter(Boolean);
   p.moves.forEach(function(mv) {
     if (mv && mv.id && typeof addBattleLog === "function") {
       addBattleLog(tr("m.progression.9", {p0:p.name, p1:getMoveName(mv.id), p2:p.level}));
     }
   });
 } else if (expectedCount > currentCount && currentCount < 4) {
    // Level-up move assignment and stat recalculation
   for (let mi = currentCount; mi < Math.min(expectedCount, 4); mi++) {
     const newMvId = targetMoves[mi] ? targetMoves[mi].id : null;
     if (newMvId && !p.moves.some(function(mv) { return mv && mv.id === newMvId; })) {
       p.moves.push({id: newMvId});
       if (typeof addBattleLog === "function") {
         addBattleLog(tr("m.progression.9", {p0:p.name, p1:getMoveName(newMvId), p2:p.level}));
       }
     }
   }
 }
 
 checkEvolution(p);
}

// Evolution methods as a UI-agnostic model (rows are raw inner-span HTML fragments
// so classic call sites keep byte-parity with the legacy markup).
function getEvolutionMethodsModel(id){
 const nid = Number(id);
 const rows = [];

 if(LEVEL_EVO_MAP[nid] && EVO_LEVELS[nid]){
 const targetId = LEVEL_EVO_MAP[nid];
 const targetName = getPokeName(targetId);
 rows.push(`<b>${t("m.progression.8")}</b> ${tr("m.progression.7", {lvl: EVO_LEVELS[nid]})} <b>${targetName}</b>`);
 }

 if(STONE_EVO[nid]){
 for(const [stoneKey, targetId] of Object.entries(STONE_EVO[nid])){
 const stone = ITEMS[stoneKey];
 const targetName = getPokeName(targetId);
 const stName = getItemName(stoneKey);
 rows.push(` <b>${t("m.progression.6")}</b> ${t("m.progression.5")} ${stone ? stone.icon + ' <b>' + stName + '</b>' : stoneKey} → <b>${targetName}</b>`);
 }
 }

 if(rows.length === 0){
 return { none: true, noneText: `<b>${t("m.progression.4")}</b> ${t("m.progression.3")}` };
 }

 return { title: ` ${t("m.progression.2")}`, rows };
}
// String-shaped legacy entry point (pokédex detail + callers in other classic files):
// rendering is delegated to the design-system component.
function getEvolutionMethodsHtml(id){
 const comp = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) || null;
 if(!comp || typeof comp.evoMethodsHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (evoMethods)');
 return comp.evoMethodsHTML(getEvolutionMethodsModel(id));
}
function checkEvolution(p){
 if(!p) return;
 if(p.id === 265 && p.level >= 7){ // Wurmple -> Silcoon & Cascoon
   if(!p._evoDone || (!p._evoDone[266] && !p._evoDone[268])){
     evolve(p, 266);
     evolve(p, 268);
   }
   return;
 }
 if(p.id === 290 && p.level >= 20){ // Nincada -> Ninjask & Shedinja
   if(!p._evoDone || !p._evoDone[291]){
     evolve(p, 291);
     evolve(p, 292);
   }
   return;
 }
 const pid = Number(p.id);
 const evoLevel=EVO_LEVELS[pid] || EVO_LEVELS[p.id];
 const targetId=LEVEL_EVO_MAP[pid] || LEVEL_EVO_MAP[p.id];
 if(evoLevel&&targetId&&p.level>=evoLevel){
 if(p._evoDone && p._evoDone[targetId]) return;
 evolve(p,targetId);
 }
}
function evolve(p,targetId){
 const nd=PD[targetId];
 if(!nd) return;
 if(!nd) return;
 if(!G.evolvedSpecies) G.evolvedSpecies=[];
 if(!G.dupeCatches) G.dupeCatches={};
 
 if(G.evolvedSpecies.indexOf(targetId)!==-1) return;
 if(p._evoDone && p._evoDone[targetId]) return;
 if(speciesOwned(targetId)){
 
 G.evolvedSpecies.push(targetId);
 G.dupeCatches[targetId]=(G.dupeCatches[targetId]||0)+1;
 const bonus=rand(150,350);
 G.money+=bonus;
 updateHeader();
 notify(tr('evolution_duplicate_bonus', {name:p.name, target:nd[0], money:bonus}),'var(--blue)');
 if(battle.active) addBattleLog(tr('evolution_duplicate_bonus_html', {name:p.name, target:nd[0], money:bonus}));
 if(!p._evoDone) p._evoDone={};
 p._evoDone[targetId]=true;
 saveGame();
 try{ autoSave(); }catch(_e){}
 return;
 }
 const shinyUnlock=!!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(targetId));
 const evo=createPoke(targetId,1,shinyUnlock);
 if(!evo) return;
 evo.shinyActive=shinyUnlock; evo.shiny=shinyUnlock;
 evo.shinyUnlocked=shinyUnlock;
 if(G.collection[targetId]) return; 
 const _pKey = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(targetId) : (!G.collection[String(targetId)] ? String(targetId) : ('box_' + targetId + '_' + Date.now()));
 G.collection[_pKey]=evo;
 G.evolvedSpecies.push(targetId);
 if(!p._evoDone) p._evoDone={};
 p._evoDone[targetId]=true;
 G.pokedex[targetId]={...(G.pokedex[targetId]||{}), seen:true,caught:true};
 if(shinyUnlock) unlockShinyForSpecies(targetId);
 notify(tr('evolution_triggered_box', {name:p.name, target:evo.name}),'var(--accent)');
 if(battle.active) addBattleLog(tr('evolution_created_box', {name:p.name, target:evo.name}));
 saveGame();
 try{ autoSave(); }catch(_e){}
}
export const LEVEL_EVO_MAP = {
 1:2, 2:3, 4:5, 42:169, 64:65, 67:68, 93:94, 113:242, 5:6, 7:8, 8:9, 10:11, 11:12, 13:14, 14:15, 16:17, 17:18, 19:20, 21:22, 23:24, 27:28, 29:30, 32:33, 41:42, 43:44, 46:47, 48:49, 50:51, 52:53, 54:55, 56:57, 60:61, 63:64, 66:67, 69:70, 72:73, 74:75, 75:76, 77:78, 79:80, 81:82, 84:85, 86:87, 88:89, 92:93, 96:97, 98:99, 100:101, 104:105, 109:110, 111:112, 116:117, 118:119, 129:130, 138:139, 140:141, 147:148, 148:149, 152:153, 153:154, 155:156, 156:157, 158:159, 159:160, 161:162, 163:164, 165:166, 167:168, 170:171, 172:25, 173:35, 174:39, 175:176, 177:178, 179:180, 180:181, 183:184, 187:188, 188:189, 194:195, 204:205, 209:210, 216:217, 218:219, 220:221, 223:224, 228:229, 231:232, 236:106, 238:124, 239:125, 240:126, 246:247, 247:248, 252:253, 253:254, 255:256, 256:257, 258:259, 259:260, 261:262, 263:264, 265:266, 266:267, 268:269, 270:271, 273:274, 276:277, 278:279, 280:281, 281:282, 283:284, 285:286, 287:288, 288:289, 290:291, 293:294, 294:295, 296:297, 298:183, 304:305, 305:306, 307:308, 309:310, 316:317, 318:319, 320:321, 322:323, 328:329, 329:330, 331:332, 333:334, 339:340, 341:342, 343:344, 345:346, 347:348, 353:354, 355:356, 360:202, 361:362, 363:364, 364:365, 371:372, 372:373, 374:375, 375:376
};
export const EVO_LEVELS = {
 1:16, 2:32, 4:16, 42:36, 64:40, 67:40, 93:40, 113:36, 173:15, 174:15, 298:15, 5:36, 7:16, 8:36, 10:7, 11:10, 13:7, 14:10, 16:18, 17:36, 19:20, 21:20, 23:22, 27:22, 29:16, 32:16, 41:22, 43:21, 46:24, 48:31, 50:26, 52:28, 54:33, 56:28, 60:25, 63:16, 66:28, 69:21, 72:30, 74:25, 75:40, 77:40, 79:37, 81:30, 84:31, 86:34, 88:38, 92:25, 96:26, 98:28, 100:30, 104:28, 109:35, 111:42, 116:32, 118:33, 129:20, 138:40, 140:40, 147:30, 148:55, 152:16, 153:32, 155:14, 156:36, 158:18, 159:30, 161:15, 163:20, 165:18, 167:22, 170:27, 172:20, 175:20, 177:25, 179:15, 180:30, 183:18, 187:18, 188:27, 194:20, 204:31, 209:23, 216:30, 218:38, 220:33, 223:25, 228:24, 231:25, 236:20, 238:30, 239:30, 240:30, 246:30, 247:55, 252:16, 253:36, 255:16, 256:36, 258:16, 259:36, 261:18, 263:20, 265:7, 266:10, 268:10, 270:14, 273:14, 276:14, 278:25, 280:20, 281:30, 283:22, 285:23, 287:18, 288:36, 290:20, 293:20, 294:40, 296:24, 304:32, 305:42, 307:37, 309:26, 316:26, 318:30, 320:40, 322:33, 328:35, 329:45, 331:32, 333:35, 339:30, 341:30, 343:36, 345:40, 347:40, 353:37, 355:37, 360:15, 361:42, 363:32, 364:44, 371:30, 372:50, 374:20, 375:45
};
export const STONE_EVO = {
 37: {firestone:38},
 58: {firestone:59},
 133: {firestone:136, waterstone:134, thunderstone:135, sunstone:196, moonstone:197},
 61: {waterstone:62, kings_rock:186},
 90: {waterstone:91},
 120:{waterstone:121},
 25: {thunderstone:26},
 44: {leafstone:45, sunstone:182},
 70: {leafstone:71},
 102:{leafstone:103},
 30: {moonstone:31},
 33: {moonstone:34},
 35: {moonstone:36},
 39: {moonstone:40},
 79: {kings_rock:199},
 95: {metal_coat:208},
 117: {dragon_scale:230},
 123: {metal_coat:212},
 137: {upgrade:233},
 191: {sunstone:192},
 271: {waterstone:272},
 274: {leafstone:275},
 300: {moonstone:301},
 366: {deep_sea_tooth:367, deep_sea_scale:368},
 349: {prism_scale:350},
 // Hoenn held / stones already covered above for lombre/nuzleaf/skitty/clamperl/feebas
};
function tryStoneEvo(teamIdx, stoneKey){
 const p=G.team[teamIdx];
 if(!p) return;
 const evo = (STONE_EVO[Number(p.id)] || STONE_EVO[p.id] || {})[stoneKey];
 if(!evo){ setMsg(t("legacy_message_n2_cet_objet_na_aucun_effet_sur_ce_pok_mon")); return; }
 const minLvl = [350, 367, 368, 208, 212, 186, 192, 182, 134, 135, 136, 196, 197, 26, 62, 91, 121, 230, 233].includes(evo) ? 50 : 25;
 if ((p.level || 1) < minLvl) {
   const msg = `Niveau ${minLvl} minimum requis pour évoluer (actuel : Nv. ${p.level || 1}) !`;
   setMsg(msg);
   if (typeof notify === 'function') notify(msg, 'var(--red)');
   return;
 }

 if((G.inventory[stoneKey]||0)<1){ setMsg(t("n.pierre_manquante")); return; }
 G.inventory[stoneKey]--;
 if(G.inventory[stoneKey]<=0) delete G.inventory[stoneKey];
const shinyUnlock = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(evo) || rollShiny());
 const evoMon = createPoke(evo, 1, shinyUnlock);
 if(evoMon){
 if(!G.evolvedSpecies) G.evolvedSpecies = [];
 if(G.evolvedSpecies.indexOf(evo) === -1) G.evolvedSpecies.push(evo);
 evoMon.shinyActive = shinyUnlock; evoMon.shiny = shinyUnlock;
 const _pKey2 = (typeof generateUniqueBoxId==='function') ? generateUniqueBoxId(evo) : (!G.collection[String(evo)] ? String(evo) : ('box_' + evo + '_' + Date.now()));
 G.collection[_pKey2]=evoMon;
 G.pokedex[evo]={...(G.pokedex[evo]||{}), seen:true,caught:true};
 if(shinyUnlock) unlockShinyForSpecies(evo);
 notify(tr("m.progression.1", {p0:p.name, p1:evoMon.name, p2:getItemName(stoneKey)}),"var(--accent)");
 saveGame();
 try{ autoSave(); }catch(_e){}
 if(document.querySelector('.tab.active')?.textContent.includes('Sac') || (document.getElementById('fullscreen-panel-modal')?.style.display==='flex')){
 onInventoryClick(stoneKey);
 } else {
 renderTeamWindow();
 const m=document.getElementById('poke-modal'); if(m) m.classList.remove('open');
 }
 }
}


// --- Migrated to ES module, globals exposed ---
if (typeof LEVEL_EVO_MAP !== 'undefined') { if (typeof window !== 'undefined') window.LEVEL_EVO_MAP = LEVEL_EVO_MAP; if (typeof globalThis !== 'undefined') globalThis.LEVEL_EVO_MAP = LEVEL_EVO_MAP; }
if (typeof EVO_LEVELS !== 'undefined') { if (typeof window !== 'undefined') window.EVO_LEVELS = EVO_LEVELS; if (typeof globalThis !== 'undefined') globalThis.EVO_LEVELS = EVO_LEVELS; }
if (typeof STONE_EVO !== 'undefined') { if (typeof window !== 'undefined') window.STONE_EVO = STONE_EVO; if (typeof globalThis !== 'undefined') globalThis.STONE_EVO = STONE_EVO; }
if (typeof gainXP !== 'undefined') { if (typeof window !== 'undefined') window.gainXP = gainXP; if (typeof globalThis !== 'undefined') globalThis.gainXP = gainXP; }
if (typeof levelUp !== 'undefined') { if (typeof window !== 'undefined') window.levelUp = levelUp; if (typeof globalThis !== 'undefined') globalThis.levelUp = levelUp; }
if (typeof getEvolutionMethodsHtml !== 'undefined') { if (typeof window !== 'undefined') window.getEvolutionMethodsHtml = getEvolutionMethodsHtml; if (typeof globalThis !== 'undefined') globalThis.getEvolutionMethodsHtml = getEvolutionMethodsHtml; }
if (typeof getEvolutionMethodsModel !== 'undefined') { if (typeof window !== 'undefined') window.getEvolutionMethodsModel = getEvolutionMethodsModel; if (typeof globalThis !== 'undefined') globalThis.getEvolutionMethodsModel = getEvolutionMethodsModel; }
if (typeof checkEvolution !== 'undefined') { if (typeof window !== 'undefined') window.checkEvolution = checkEvolution; if (typeof globalThis !== 'undefined') globalThis.checkEvolution = checkEvolution; }
if (typeof evolve !== 'undefined') { if (typeof window !== 'undefined') window.evolve = evolve; if (typeof globalThis !== 'undefined') globalThis.evolve = evolve; }
if (typeof tryStoneEvo !== 'undefined') { if (typeof window !== 'undefined') window.tryStoneEvo = tryStoneEvo; if (typeof globalThis !== 'undefined') globalThis.tryStoneEvo = tryStoneEvo; }



function tryBoxStoneEvo(boxKey, stoneKey){
 const p = G.collection[boxKey];
 if(!p) return;
 const evo = (STONE_EVO[Number(p.id)] || STONE_EVO[p.id] || {})[stoneKey];
 if(!evo){ setMsg(t("legacy_message_n2_cet_objet_na_aucun_effet_sur_ce_pok_mon")); return; }
 const minLvl = [350, 367, 368, 208, 212, 186, 192, 182, 134, 135, 136, 196, 197, 26, 62, 91, 121, 230, 233].includes(evo) ? 50 : 25;
 if ((p.level || 1) < minLvl) {
   const msg = `Niveau ${minLvl} minimum requis pour évoluer (actuel : Nv. ${p.level || 1}) !`;
   setMsg(msg);
   if (typeof notify === 'function') notify(msg, 'var(--red)');
   return;
 }
 if((G.inventory[stoneKey]||0)<1){ setMsg(t("n.pierre_manquante")); return; }
 G.inventory[stoneKey]--;
 if(G.inventory[stoneKey]<=0) delete G.inventory[stoneKey];
 const shinyUnlock = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(evo) || rollShiny());
 const evoMon = createPoke(evo, 1, shinyUnlock);
 if(evoMon){
 if(!G.evolvedSpecies) G.evolvedSpecies = [];
 if(G.evolvedSpecies.indexOf(evo) === -1) G.evolvedSpecies.push(evo);
   evoMon.shinyActive = shinyUnlock; evoMon.shiny = shinyUnlock;
   let newBoxId = 'box_' + evo + '_' + Date.now();
   while(G.collection[newBoxId]) newBoxId = 'box_' + evo + '_' + Date.now() + '_' + Math.floor(Math.random()*1000);
   G.collection[newBoxId] = evoMon;
   G.pokedex[evo] = { ...(G.pokedex[evo]||{}), seen:true, caught:true };
   if(shinyUnlock) unlockShinyForSpecies(evo);
   notify(tr("m.progression.1", {p0:p.name, p1:evoMon.name, p2:getItemName(stoneKey)}), "var(--accent)");
   saveGame();
   try{ autoSave(); }catch(_e){}
   if(document.querySelector('.tab.active')?.textContent.includes('Sac') || (document.getElementById('fullscreen-panel-modal')?.style.display==='flex')){
     onInventoryClick(stoneKey);
   } else {
     renderTeamWindow();
     const m = document.getElementById('poke-modal'); if(m) m.classList.remove('open');
   }
 }
}
if (typeof tryBoxStoneEvo !== 'undefined') { if (typeof window !== 'undefined') window.tryBoxStoneEvo = tryBoxStoneEvo; if (typeof globalThis !== 'undefined') globalThis.tryBoxStoneEvo = tryBoxStoneEvo; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  gainXP,
  levelUp,
  getEvolutionMethodsHtml,
  getEvolutionMethodsModel,
  checkEvolution,
  evolve,
  tryStoneEvo,
  tryBoxStoneEvo,
};
