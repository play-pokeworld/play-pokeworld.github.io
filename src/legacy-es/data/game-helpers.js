function getSpeciesTalents(id){
 const nid = Number(id);
 
 if(typeof POKEMON_TALENTS !== 'undefined' && POKEMON_TALENTS[nid]) {
   return POKEMON_TALENTS[nid];
 }
 
 return POKE_TALENTS[nid] || ['sturdy', 'intimidate', 'hugepower'];
}


function getTalentByKey(key) {
 if(typeof TALENTS_FULL !== 'undefined' && TALENTS_FULL[key]) {
   return TALENTS_FULL[key];
 }
 return null;
}


function getRarityLabel(rarity) {
 if(rarity === 1) return 'Commun';
 if(rarity === 2) return 'Peu commun';
 if(rarity === 3) return 'Rare';
 return 'Inconnu';
}


function getTalentName(tal){
 if(!tal) return 'Normal';
 return (typeof t==='function') ? (t('talents.'+tal+'.name') || tal) : tal;
}


function getTalentDesc(tal){
 return (typeof t==='function') ? (t('talents.'+tal+'.desc') || '') : '';
}


function isTalentHidden(id, tal){
 const tals = getSpeciesTalents(id);
 return tals[2] === tal && tals[0] !== tal && tals[1] !== tal;
}


function unlockTalentForSpecies(id, tal){
 if(typeof G === 'undefined' || !G) return;
 if(!G.unlockedTalents) G.unlockedTalents = {};
 const nid = Number(id);
 const tals = getSpeciesTalents(nid);
 if(!G.unlockedTalents[nid]) {
 G.unlockedTalents[nid] = [tals[0]];
 }
 if(tal && !G.unlockedTalents[nid].includes(tal)){
 G.unlockedTalents[nid].push(tal);
 const lang = G.lang || 'fr';
 const pokeName = getPokeName(nid);
 const isHid = isTalentHidden(nid, tal);
 if(typeof notify === 'function'){
 notify(tr("m.talent_unlocked", {name: pokeName, talent: getTalentName(tal), hidden: isHid ? t("m.talent_hidden") : ''}), 'var(--accent)');
 }
 }
}


function getMovesForLevel(moveset, level){
 if(!moveset || !moveset.length) return [{id:'tackle', pp:35, maxPP:35}];
 const count = level >= 24 ? 4 : level >= 16 ? 3 : level >= 8 ? 2 : 1;
 const available = moveset.slice(0, Math.min(count, moveset.length));
 return available.map(m => ({id:m, pp:MOVES[m]?.pp||10, maxPP:MOVES[m]?.pp||10}));
}


function calcStat(base, level, isHP=false, isShiny=false, iv=0, ev=0){
 let val = isHP ? Math.floor((2*base*level)/100) + level + 10 : Math.floor((2*base*level)/100) + 5;
 if(isShiny) val = Math.floor(val * 1.2);
 const starMult = 1 + ((iv||0) * 0.05) + ((ev||0) * 0.05);
 return Math.floor(val * starMult);
}


function recalcPokeStats(p){
 if(!p) return;
 const d = PD[p.id];
 if(!d) return;
 if((p.xp||0) < xpForLevel(p.level)) p.xp = xpForLevel(p.level) + (p.xp || 0);
 if(!p.xpNext || p.xpNext <= xpForLevel(p.level)) p.xpNext = xpForLevel(p.level + 1);
 if(!p.ivs) p.ivs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 if(!p.evs) p.evs = {hp:0, atk:0, def:0, spa:0, spd:0, spe:0};
 const isShiny = !!(p.shinyUnlocked || p.shinyActive || p.shiny);
 const hpRatio = p.currentHP / p.maxHP;
 p.maxHP = calcStat(d[3], p.level, true, isShiny, p.ivs.hp, p.evs.hp);
 p.currentHP = Math.max(1, Math.floor(p.maxHP * hpRatio));
 p.atk = calcStat(d[4], p.level, false, isShiny, p.ivs.atk, p.evs.atk);
 p.def = calcStat(d[5], p.level, false, isShiny, p.ivs.def, p.evs.def);
 p.spa = calcStat(d[6], p.level, false, isShiny, p.ivs.spa, p.evs.spa);
 p.spd = calcStat(d[7], p.level, false, isShiny, p.ivs.spd, p.evs.spd);
 p.spe = calcStat(d[8], p.level, false, isShiny, p.ivs.spe, p.evs.spe);
}


function renderStars(val, isEv=false){
 const count = clamp(val || 0, 0, 6);
 const symbol = isEv ? '🟢' : '⭐';
 const empty = isEv ? '' : '☆';
 let s = '';
 for(let i=0; i<6; i++) s += i < count ? symbol : empty;
 return `<span title="+${count*5}%">${s}</span>`;
}


function isShinyDisplay(p){ return !!(p&&p.shinyActive); }


function xpForLevel(lv){ return Math.floor(Math.pow(lv,3) * 0.8); }


const MIN_WINS_DEFAULT = 10;
(function attachMinWins(){
 const apply = (obj)=>{ for(const id in obj){ const loc=obj[id]; if(!loc) continue; loc.minWins = (loc.type==='town') ? 0 : MIN_WINS_DEFAULT; } };
 apply(LOCS); apply(LOCS_JOHTO);
})();


(function linkSplitRoutes(){
 for(const obj of [LOCS, LOCS_JOHTO]){
 const byName = {};
 for(const id in obj){ const loc=obj[id]; if(!loc||!loc.name) continue; (byName[loc.name]=byName[loc.name]||[]).push(id); }
 for(const name in byName){
 const ids = byName[name];
 if(ids.length < 2) continue;
 const primary = ids[0];
 const baseWild = obj[primary].wild || [];
 for(const id of ids){
 obj[id].group = primary; 
 if(id !== primary) obj[id].wild = baseWild.slice(); 
 }
 }
 }
})();


function getShopName(id){
 return (typeof t==='function') ? (t('shops.'+id+'.name') || id || 'Boutique') : (id || 'Boutique');
}


(function linkSplitRouteDrops(){
 for(const obj of [LOCS, LOCS_JOHTO]){
 const byName = {};
 for(const id in obj){ const loc=obj[id]; if(!loc||!loc.name) continue; (byName[loc.name]=byName[loc.name]||[]).push(id); }
 for(const name in byName){
 const ids = byName[name];
 if(ids.length < 2) continue;
 const primary = ids[0];
 const base = (ROUTE_DROPS[primary] || []).slice();
 for(const id of ids){ if(id !== primary) ROUTE_DROPS[id] = base; }
 }
 }
})();


(function populateJohtoWild(){
 if(typeof LOCS_JOHTO === 'undefined') return;
 if(LOCS_JOHTO['jroute29']) LOCS_JOHTO['jroute29'].wild = [[161,3,6,'common'], [16,3,6,'common'], [19,3,6,'common'], [165,3,6,'common'], [187,3,6,'common']];
 if(LOCS_JOHTO['jroute30']) LOCS_JOHTO['jroute30'].wild = [[10,4,7,'common'], [13,4,7,'common'], [16,4,7,'common'], [161,4,7,'uncommon'], [165,4,7,'common'], [167,4,7,'common']];
 if(LOCS_JOHTO['jroute31']) LOCS_JOHTO['jroute31'].wild = [[163,5,9,'common'], [41,5,9,'common'], [19,5,9,'uncommon'], [165,5,9,'common'], [167,5,9,'common']];
 if(LOCS_JOHTO['jroute32']) LOCS_JOHTO['jroute32'].wild = [[19,6,10,'common'], [69,6,10,'common'], [41,6,10,'uncommon'], [211,8,14,'uncommon'], [194,7,11,'uncommon'], [179,6,10,'common']];
 if(LOCS_JOHTO['jroute32_mid']) LOCS_JOHTO['jroute32_mid'].wild = [[19, 6, 10, 'common'], [69, 6, 10, 'common'], [41, 6, 10, 'uncommon']];
 if(LOCS_JOHTO['jroute32_south']) LOCS_JOHTO['jroute32_south'].wild = [[19, 6, 10, 'common'], [69, 6, 10, 'common'], [41, 6, 10, 'uncommon']];
 if(LOCS_JOHTO['unioncave']) LOCS_JOHTO['unioncave'].wild = [[41, 8, 12, 'common'], [74, 8, 12, 'common'], [95, 10, 14, 'rare']];
 if(LOCS_JOHTO['jroute33']) LOCS_JOHTO['jroute33'].wild = [[19, 9, 13, 'common'], [16, 9, 13, 'common']];
 if(LOCS_JOHTO['ilexforest']) LOCS_JOHTO['ilexforest'].wild = [[10,10,14,'common'], [13,10,14,'common'], [43,10,14,'common'], [69,11,15,'uncommon'], [204,10,14,'uncommon'], [214,10,14,'rare']];
 if(LOCS_JOHTO['jroute34']) LOCS_JOHTO['jroute34'].wild = [[16, 12, 16, 'common'], [19, 12, 16, 'common'], [63, 12, 16, 'uncommon'], [29, 12, 16, 'uncommon']];
 if(LOCS_JOHTO['jroute35']) LOCS_JOHTO['jroute35'].wild = [[16,14,18,'common'], [19,14,18,'common'], [39,14,18,'uncommon'], [29,14,18,'uncommon'], [193,14,18,'rare']];
 if(LOCS_JOHTO['jroute36']) LOCS_JOHTO['jroute36'].wild = [[29,15,20,'common'], [39,15,20,'common'], [69,15,20,'uncommon'], [185,15,20,'rare'], [234,15,20,'common'], [187,15,20,'common']];
 if(LOCS_JOHTO['jroute38']) LOCS_JOHTO['jroute38'].wild = [[20, 16, 21, 'common'], [88, 16, 21, 'common'], [109, 18, 23, 'uncommon']];
 if(LOCS_JOHTO['jroute40']) LOCS_JOHTO['jroute40'].wild = [[72,18,24,'common'], [129,18,24,'common'], [98,18,24,'uncommon'], [223,18,24,'uncommon']];
 if(LOCS_JOHTO['jroute42']) LOCS_JOHTO['jroute42'].wild = [[203,20,26,'common'], [20,20,26,'common'], [21,20,26,'uncommon'], [183,20,26,'uncommon'], [179,20,26,'common']];
 if(LOCS_JOHTO['jroute43']) LOCS_JOHTO['jroute43'].wild = [[218,20,26,'common'], [219,22,28,'common'], [220,22,28,'uncommon'], [179,20,26,'common']];
 if(LOCS_JOHTO['lakerage']) LOCS_JOHTO['lakerage'].wild = [[129, 22, 28, 'common'], [130, 25, 32, 'rare']];
 if(LOCS_JOHTO['jroute44']) LOCS_JOHTO['jroute44'].wild = [[131, 24, 30, 'common'], [220, 24, 30, 'common'], [221, 26, 34, 'rare']];
 if(LOCS_JOHTO['jroute45']) LOCS_JOHTO['jroute45'].wild = [[169,25,32,'common'], [74,25,32,'common'], [111,26,34,'uncommon'], [207,25,32,'uncommon'], [227,25,32,'rare'], [231,25,32,'common']];
 if(LOCS_JOHTO['jroute26']) LOCS_JOHTO['jroute26'].wild = [[16, 30, 35, 'common'], [19, 30, 35, 'common']];
 if(LOCS_JOHTO['jroute27']) LOCS_JOHTO['jroute27'].wild = [[16, 30, 35, 'common'], [19, 30, 35, 'common'], [21, 30, 35, 'uncommon']];
 if(LOCS_JOHTO['jroute28']) LOCS_JOHTO['jroute28'].wild = [[20, 30, 35, 'common'], [112, 32, 36, 'uncommon'], [22, 30, 35, 'uncommon']];
 if(LOCS_JOHTO['jroute37']) LOCS_JOHTO['jroute37'].wild = [[163,12,18,'common'], [43,12,18,'common'], [69,12,18,'uncommon'], [167,12,18,'common'], [234,12,18,'uncommon'], [187,12,18,'common']];
 if(LOCS_JOHTO['jroute39']) LOCS_JOHTO['jroute39'].wild = [[241,14,20,'common'], [128,14,20,'common'], [16,14,20,'common'], [209,14,20,'uncommon']];
 if(LOCS_JOHTO['jroute41']) LOCS_JOHTO['jroute41'].wild = [[72,18,24,'common'], [129,18,24,'common'], [73,19,25,'uncommon'], [226,18,24,'uncommon']];
 if(LOCS_JOHTO['jroute46']) LOCS_JOHTO['jroute46'].wild = [[16,28,34,'common'], [19,28,34,'common'], [21,28,34,'uncommon'], [231,28,34,'common']];
 if(LOCS_JOHTO['jroute47']) LOCS_JOHTO['jroute47'].wild = [[16, 30, 35, 'common'], [19, 30, 35, 'common']];
 if(LOCS_JOHTO['jroute48']) LOCS_JOHTO['jroute48'].wild = [[16, 30, 35, 'common'], [19, 30, 35, 'common']];
 if(LOCS_JOHTO['nationalpark']) LOCS_JOHTO['nationalpark'].wild = [[191,15,19,'common'], [43,15,19,'common'], [123,18,22,'rare'], [127,18,22,'rare'], [190,15,19,'uncommon']];
 if(LOCS_JOHTO['sprouttower']) LOCS_JOHTO['sprouttower'].wild = [[19, 10, 14, 'common'], [92, 12, 16, 'uncommon']];
 if(LOCS_JOHTO['ruinsofalph']) LOCS_JOHTO['ruinsofalph'].wild = [[201,15,20,'common'], [41,15,20,'uncommon'], [177,15,20,'common'], [235,15,20,'rare']];
 if(LOCS_JOHTO['burnedtower']) LOCS_JOHTO['burnedtower'].wild = [[92,18,24,'common'], [109,18,24,'uncommon'], [228,18,24,'uncommon']];
 if(LOCS_JOHTO['tintower']) LOCS_JOHTO['tintower'].wild = [[92, 20, 26, 'common'], [109, 20, 26, 'uncommon']];
 if(LOCS_JOHTO['mtmortar']) LOCS_JOHTO['mtmortar'].wild = [[41, 20, 26, 'common'], [74, 20, 26, 'common'], [169, 22, 28, 'uncommon']];
 if(LOCS_JOHTO['icepath']) LOCS_JOHTO['icepath'].wild = [[124,25,32,'common'], [220,25,32,'common'], [221,26,34,'rare'], [215,25,32,'uncommon'], [225,25,32,'uncommon']];
 if(LOCS_JOHTO['darkcave']) LOCS_JOHTO['darkcave'].wild = [[41,18,24,'common'], [169,18,24,'uncommon'], [202,18,24,'uncommon'], [206,18,24,'uncommon'], [216,15,20,'rare']];
 if(LOCS_JOHTO['slowpokewell']) LOCS_JOHTO['slowpokewell'].wild = [[79,20,26,'common'], [80,22,28,'uncommon'], [198,20,26,'uncommon']];
 if(LOCS_JOHTO['whirlislands']) LOCS_JOHTO['whirlislands'].wild = [[72,18,24,'common'], [129,18,24,'common'], [170,18,24,'common'], [222,18,24,'uncommon'], [223,18,24,'uncommon']];
 
 
 
 
 if(LOCS_JOHTO['victoryroad_jo']) LOCS_JOHTO['victoryroad_jo'].wild = [[95, 30, 36, 'common'], [169, 32, 38, 'common'], [111, 30, 36, 'uncommon']];
 if(LOCS_JOHTO['mtsilver']) LOCS_JOHTO['mtsilver'].wild = [[246, 40, 46, 'common'], [247, 42, 48, 'common'], [112, 40, 46, 'uncommon']];
 if(LOCS_JOHTO['tohjofalls']) LOCS_JOHTO['tohjofalls'].wild = [[129, 28, 34, 'common'], [130, 30, 36, 'rare']];
})();


// --- Migrated to ES module, globals exposed ---
if (typeof getSpeciesTalents !== 'undefined' && typeof window !== 'undefined') window.getSpeciesTalents = getSpeciesTalents;
if (typeof getTalentByKey !== 'undefined' && typeof window !== 'undefined') window.getTalentByKey = getTalentByKey;
if (typeof getRarityLabel !== 'undefined' && typeof window !== 'undefined') window.getRarityLabel = getRarityLabel;
if (typeof getTalentName !== 'undefined' && typeof window !== 'undefined') window.getTalentName = getTalentName;
if (typeof getTalentDesc !== 'undefined' && typeof window !== 'undefined') window.getTalentDesc = getTalentDesc;
if (typeof isTalentHidden !== 'undefined' && typeof window !== 'undefined') window.isTalentHidden = isTalentHidden;
if (typeof unlockTalentForSpecies !== 'undefined' && typeof window !== 'undefined') window.unlockTalentForSpecies = unlockTalentForSpecies;
if (typeof getMovesForLevel !== 'undefined' && typeof window !== 'undefined') window.getMovesForLevel = getMovesForLevel;
if (typeof calcStat !== 'undefined' && typeof window !== 'undefined') window.calcStat = calcStat;
if (typeof recalcPokeStats !== 'undefined' && typeof window !== 'undefined') window.recalcPokeStats = recalcPokeStats;
if (typeof renderStars !== 'undefined' && typeof window !== 'undefined') window.renderStars = renderStars;
if (typeof isShinyDisplay !== 'undefined' && typeof window !== 'undefined') window.isShinyDisplay = isShinyDisplay;
if (typeof xpForLevel !== 'undefined' && typeof window !== 'undefined') window.xpForLevel = xpForLevel;
if (typeof getShopName !== 'undefined' && typeof window !== 'undefined') window.getShopName = getShopName;

export {};
