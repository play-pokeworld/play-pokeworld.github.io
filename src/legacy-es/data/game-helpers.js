function getSpeciesTalents(id){
 const nid = Number(id);
 const official = (typeof globalThis !== 'undefined' && (globalThis.OFFICIAL_POKE_TALENTS || globalThis.POKE_TALENTS || globalThis.POKEMON_TALENTS)) ? (globalThis.OFFICIAL_POKE_TALENTS || globalThis.POKE_TALENTS || globalThis.POKEMON_TALENTS) : null;
 if(official && (official[nid] || official[String(nid)])) return official[nid] || official[String(nid)];
 if(typeof POKEMON_TALENTS !== 'undefined' && POKEMON_TALENTS[nid]) return POKEMON_TALENTS[nid];
 if(typeof POKE_TALENTS !== 'undefined' && POKE_TALENTS[nid]) return POKE_TALENTS[nid];
 return ['sturdy', 'intimidate', 'hugepower'];
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
 const loc = (typeof t==='function') ? t('talents.'+tal+'.name') : '';
 if(loc && loc !== 'talents.'+tal+'.name') return loc;
 if(typeof TALENTS_FULL !== 'undefined' && TALENTS_FULL[tal] && TALENTS_FULL[tal].name) return TALENTS_FULL[tal].name;
 return tal;
}


function getTalentDesc(tal){
 const loc = (typeof t==='function') ? t('talents.'+tal+'.desc') : '';
 if(loc && loc !== 'talents.'+tal+'.desc') return loc;
 if(typeof TALENTS_FULL !== 'undefined' && TALENTS_FULL[tal] && TALENTS_FULL[tal].info) return TALENTS_FULL[tal].info;
 return '';
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


function getLearnReqFallbackFromPool(pool, moveId){
 const idx = (pool||[]).indexOf(moveId);
 if(idx < 0) return 999;
 if(idx < 4) return 1;
 return Math.min(100, 1 + Math.floor((idx - 3) * 2));
}
function getMovesForLevel(moveset, level){
 const moveData = (typeof globalThis !== 'undefined' && globalThis.MOVES) ? globalThis.MOVES : MOVES;
 if(!moveset || !moveset.length) return [{id:'tackle', pp:moveData.tackle?.pp||35, maxPP:moveData.tackle?.pp||35}];
 const count = level >= 24 ? 4 : level >= 16 ? 3 : level >= 8 ? 2 : 1;
 const available = moveset.filter(m => moveData[m]).filter(m => getLearnReqFallbackFromPool(moveset, m) <= level);
 const picked = (available.length ? available : moveset.filter(m => moveData[m])).slice(-Math.min(count, 4));
 return picked.map(m => ({id:m, pp:moveData[m]?.pp||10, maxPP:moveData[m]?.pp||10}));
}
function getMovesForSpeciesLevel(speciesId, moveset, level){
 const pools = (typeof globalThis !== 'undefined' && (globalThis.OFFICIAL_POKE_MOVE_POOLS || globalThis.POKE_MOVE_POOLS)) ? (globalThis.OFFICIAL_POKE_MOVE_POOLS || globalThis.POKE_MOVE_POOLS) : null;
 const levels = (typeof globalThis !== 'undefined' && globalThis.POKE_MOVE_LEVELS) ? globalThis.POKE_MOVE_LEVELS : null;
 const moveData = (typeof globalThis !== 'undefined' && globalThis.MOVES) ? globalThis.MOVES : MOVES;
 const pool = (pools && (pools[speciesId] || pools[String(speciesId)])) || moveset || [];
 const lmap = (levels && (levels[speciesId] || levels[String(speciesId)])) || {};
 const count = level >= 24 ? 4 : level >= 16 ? 3 : level >= 8 ? 2 : 1;
 const available = pool.filter(m => moveData[m] && ((lmap[m] != null ? lmap[m] : getLearnReqFallbackFromPool(pool,m)) <= level));
 const picked = (available.length ? available : pool.filter(m => moveData[m])).slice(-Math.min(count, 4));
 return picked.map(m => ({id:m, pp:moveData[m]?.pp||10, maxPP:moveData[m]?.pp||10}));
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


function getAutoRouteLinkGroups(obj){
 const byName = {};
 for(const id in obj){
  const loc = obj[id];
  if(!loc || !loc.name) continue;
  const isRouteLike = loc.type === 'route' || loc.type === 'sea';
  const routeName = /^(Route|Chenal|Piste Cyclable)\b/.test(loc.name);
  if(isRouteLike && routeName) (byName[loc.name] = byName[loc.name] || []).push(id);
 }
 return Object.values(byName).filter(ids => ids.length > 1);
}
function _wildKey(entry){ return [Number(entry[0]), Number(entry[1]||0), Number(entry[2]||entry[1]||0), entry[3]||'common'].join(':'); }
function _mergeWildLists(ids, obj){
 const seen = new Set();
 const out = [];
 for(const id of ids){
  const loc = obj[id];
  for(const entry of ((loc && loc.wild) || [])){
   const key = _wildKey(entry);
   if(!seen.has(key)){ seen.add(key); out.push(entry.slice ? entry.slice() : entry); }
  }
 }
 return out;
}
function _mergeDropLists(ids){
 if(typeof ROUTE_DROPS === 'undefined') return [];
 const seen = new Set();
 const out = [];
 for(const id of ids){
  for(const key of (ROUTE_DROPS[id] || [])){
   if(!seen.has(key)){ seen.add(key); out.push(key); }
  }
 }
 return out;
}
function applyRouteLinkGroups(){
 const objects = [LOCS, LOCS_JOHTO].filter(Boolean);
 for(const obj of objects){
  const groups = getAutoRouteLinkGroups(obj);
  for(const ids of groups){
   const primary = ids[0];
   const wild = _mergeWildLists(ids, obj);
   const drops = _mergeDropLists(ids);
   for(const id of ids){
    if(!obj[id]) continue;
    obj[id].group = primary;
    obj[id].wild = wild.map(w => w.slice ? w.slice() : w);
    if(drops.length && typeof ROUTE_DROPS !== 'undefined') ROUTE_DROPS[id] = drops.slice();
   }
  }
 }
}
function getLinkedRouteIds(id){
 const out = new Set([id]);
 const baseLoc = getLocObj(id);
 const group = (baseLoc && baseLoc.group) || id;
 for(const obj of [LOCS, LOCS_JOHTO]){
  if(!obj) continue;
  for(const locId in obj){
   const loc = obj[locId];
   if(!loc) continue;
   if(((loc.group || locId) === group)) out.add(locId);
  }
 }
 return Array.from(out);
}

applyRouteLinkGroups();


function getShopName(id){
 return (typeof t==='function') ? (t('shops.'+id+'.name') || id || 'Boutique') : (id || 'Boutique');
}


applyRouteLinkGroups();


(function populateJohtoWild(){
 if(typeof LOCS_JOHTO === 'undefined') return;
 if(LOCS_JOHTO['jroute29']) LOCS_JOHTO['jroute29'].wild = [[161,3,6,'common'], [16,3,6,'common'], [19,3,6,'common'], [165,3,6,'common'], [187,3,6,'common']];
 if(LOCS_JOHTO['jroute30']) LOCS_JOHTO['jroute30'].wild = [[10,4,7,'common'], [13,4,7,'common'], [16,4,7,'common'], [161,4,7,'uncommon'], [165,4,7,'common'], [167,4,7,'common']];
 if(LOCS_JOHTO['jroute31']) LOCS_JOHTO['jroute31'].wild = [[163,5,9,'common'], [41,5,9,'common'], [19,5,9,'uncommon'], [165,5,9,'common'], [167,5,9,'common']];
 if(LOCS_JOHTO['jroute32']) LOCS_JOHTO['jroute32'].wild = [[19,6,10,'common'],[69,6,10,'common'],[41,6,10,'uncommon'],[211,8,14,'uncommon'],[194,7,11,'uncommon'],[179,6,10,'common']];
 if(LOCS_JOHTO['jroute32_mid']) LOCS_JOHTO['jroute32_mid'].wild = [[19,6,10,'common'],[69,6,10,'common'],[41,6,10,'uncommon'],[211,8,14,'uncommon'],[194,7,11,'uncommon'],[179,6,10,'common']];
 if(LOCS_JOHTO['jroute32_south']) LOCS_JOHTO['jroute32_south'].wild = [[19,6,10,'common'],[69,6,10,'common'],[41,6,10,'uncommon'],[211,8,14,'uncommon'],[194,7,11,'uncommon'],[179,6,10,'common']];
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
applyRouteLinkGroups();


const REGION_ORDER = ['kanto','johto','hoenn','sinnoh','unova','kalos','alola','galar','paldea'];
const REGION_POKE_RANGES = {
  kanto: {start:1, end:151, previous:null, league:'elite4'},
  johto: {start:152, end:251, previous:'kanto', league:'johto_elite4'},
  hoenn: {start:252, end:386, previous:'johto', league:'hoenn_elite4'},
  sinnoh: {start:387, end:493, previous:'hoenn', league:'sinnoh_elite4'},
  unova: {start:494, end:649, previous:'sinnoh', league:'unova_elite4'},
  kalos: {start:650, end:721, previous:'unova', league:'kalos_elite4'},
  alola: {start:722, end:809, previous:'kalos', league:'alola_elite4'},
  galar: {start:810, end:905, previous:'alola', league:'galar_league'},
  paldea: {start:906, end:1025, previous:'galar', league:'paldea_league'}
};
function getRegionMeta(region){ return REGION_POKE_RANGES[region || 'kanto'] || REGION_POKE_RANGES.kanto; }
function getRegionDisplayName(region){
 const key = 'region_'+(region||'kanto');
 const val = (typeof t === 'function') ? t(key) : '';
 if(val && val !== key) return val;
 return String(region||'kanto').charAt(0).toUpperCase()+String(region||'kanto').slice(1);
}
function getPreviousRegion(region){ return getRegionMeta(region).previous || null; }
function isPokemonNativeToRegion(id, region){
 const meta = getRegionMeta(region);
 const nid = Number(id);
 return nid >= meta.start && nid <= meta.end;
}
function getRegionPokedexTotal(region){
 const meta = getRegionMeta(region);
 return Math.max(0, (meta.end || 0) - (meta.start || 0) + 1);
}
function countCaughtInRegion(region){
 const meta = getRegionMeta(region);
 let count = 0;
 for(let id=meta.start; id<=meta.end; id++){
  if(G && G.pokedex && G.pokedex[id] && G.pokedex[id].caught) count++;
 }
 return count;
}
function isRegionDexComplete(region){ return countCaughtInRegion(region) >= getRegionPokedexTotal(region); }
function ensureRegionProgress(){
 if(!G) return;
 if(!G.regionLeagueWon || typeof G.regionLeagueWon !== 'object') G.regionLeagueWon = {};
 if(G.championTitle || (G.defeatedChamps && G.defeatedChamps.elite4)) G.regionLeagueWon.kanto = true;
 if(G.defeatedChamps && G.defeatedChamps.johto_elite4) G.regionLeagueWon.johto = true;
}
function isRegionLeagueWon(region){
 ensureRegionProgress();
 region = region || 'kanto';
 if(region === 'kanto') return !!(G && (G.championTitle || (G.regionLeagueWon && G.regionLeagueWon.kanto) || (G.defeatedChamps && G.defeatedChamps.elite4)));
 return !!(G && G.regionLeagueWon && G.regionLeagueWon[region]);
}
function markRegionLeagueWon(region){
 if(!G) return;
 if(!G.regionLeagueWon || typeof G.regionLeagueWon !== 'object') G.regionLeagueWon = {};
 G.regionLeagueWon[region || 'kanto'] = true;
 if(region === 'kanto') G.championTitle = true;
 if(region === 'johto') G.johtoChampionTitle = true;
}
function getRegionAccessStatus(targetRegion){
 targetRegion = targetRegion || 'kanto';
 if(targetRegion === 'kanto') return {ok:true};
 const prev = getPreviousRegion(targetRegion);
 if(!prev) return {ok:true};
 if(!isRegionLeagueWon(prev)) return {ok:false, reason:'league', previous:prev, target:targetRegion};
 const caught = countCaughtInRegion(prev);
 const total = getRegionPokedexTotal(prev);
 if(caught < total) return {ok:false, reason:'dex', previous:prev, target:targetRegion, caught, total};
 return {ok:true};
}
function canAccessRegion(targetRegion){ return getRegionAccessStatus(targetRegion).ok; }
function regionAccessMessage(targetRegion){
 const st = getRegionAccessStatus(targetRegion);
 if(st.ok) return '';
 if(st.reason === 'league') return tr('region_locked_league', {region:getRegionDisplayName(st.previous), target:getRegionDisplayName(st.target)});
 if(st.reason === 'dex') return tr('region_locked_dex', {region:getRegionDisplayName(st.previous), target:getRegionDisplayName(st.target), caught:st.caught, total:st.total});
 return tr('region_locked_generic', {target:getRegionDisplayName(targetRegion)});
}
function regionRequiresNativeTeam(region){ return !!(region && region !== 'kanto' && !isRegionLeagueWon(region)); }
function getInvalidTeamPokemonForRegion(region){
 if(!regionRequiresNativeTeam(region)) return [];
 return (G.team || []).filter(p => p && !isPokemonNativeToRegion(p.id, region));
}
function canUseCurrentTeamForRegion(region){ return getInvalidTeamPokemonForRegion(region || (G && G.region) || 'kanto').length === 0; }
function regionTeamRestrictionMessage(region){
 region = region || (G && G.region) || 'kanto';
 const bad = getInvalidTeamPokemonForRegion(region);
 if(!bad.length) return '';
 return tr('region_team_restricted', {region:getRegionDisplayName(region), pokemon:bad.slice(0,3).map(p=>p.name || getPokeName(p.id)).join(', ')});
}
function getLeagueChampionIdForRegion(region){ return getRegionMeta(region).league || 'elite4'; }
function getLeagueRegionForChampion(champId){
 for(const region of REGION_ORDER){ if(getLeagueChampionIdForRegion(region) === champId) return region; }
 return champId === 'elite4' ? 'kanto' : ((G && G.region) || 'kanto');
}
function isLeagueChampionId(champId){ return REGION_ORDER.some(region => getLeagueChampionIdForRegion(region) === champId); }


const BOX_FILTER_DEFAULTS = {region:'all', type:'all', shiny:'all', evo:'all'};
const FILTER_LEVEL_EVO_MAP = {1:2,2:3,4:5,5:6,7:8,8:9,10:11,11:12,13:14,14:15,16:17,17:18,19:20,21:22,23:24,27:28,29:30,32:33,41:42,43:44,46:47,48:49,50:51,52:53,54:55,56:57,60:61,63:64,64:65,66:67,67:68,69:70,72:73,74:75,75:76,77:78,79:80,81:82,84:85,86:87,88:89,92:93,93:94,96:97,98:99,100:101,104:105,109:110,111:112,116:117,118:119,129:130,138:139,140:141,147:148,148:149,113:242,152:153,153:154,155:156,156:157,158:159,159:160,161:162,163:164,165:166,167:168,170:171,172:25,173:35,174:39,175:176,177:178,179:180,180:181,183:184,187:188,188:189,194:195,204:205,209:210,216:217,218:219,220:221,223:224,228:229,231:232,236:237,238:124,239:125,240:126,246:247,247:248};
const FILTER_STONE_EVO = {37:{firestone:38},58:{firestone:59},133:{firestone:136,waterstone:134,thunderstone:135},61:{waterstone:62,kings_rock:186},90:{waterstone:91},120:{waterstone:121},25:{thunderstone:26},44:{leafstone:45,sunstone:182},70:{leafstone:71},102:{leafstone:103},30:{moonstone:31},33:{moonstone:34},35:{moonstone:36},39:{moonstone:40},79:{kings_rock:200},95:{metal_coat:208},117:{dragon_scale:230},123:{metal_coat:212},137:{up_grade:233},191:{sunstone:192}};

function ensureBoxFilters(){
 if(!G.boxFilters || typeof G.boxFilters !== 'object') G.boxFilters = {...BOX_FILTER_DEFAULTS};
 for(const key in BOX_FILTER_DEFAULTS){ if(G.boxFilters[key] == null) G.boxFilters[key] = BOX_FILTER_DEFAULTS[key]; }
 return G.boxFilters;
}
function getPokemonRegion(id){
 const nid = Number(id);
 for(const region of REGION_ORDER){
  const meta = getRegionMeta(region);
  if(nid >= meta.start && nid <= meta.end) return region;
 }
 return 'unknown';
}
function getUnlockedRegionsForPokedex(){
 return REGION_ORDER.filter(region => region === 'kanto' || (typeof canAccessRegion === 'function' && canAccessRegion(region)));
}
function getUnlockedDexIds(){
 const out = [];
 for(const region of getUnlockedRegionsForPokedex()){
  const meta = getRegionMeta(region);
  for(let id=meta.start; id<=meta.end && id<=(PD ? PD.length-1 : meta.end); id++) if(PD[id]) out.push(id);
 }
 return out;
}
function getBoxFilterRegions(){
 const regions = new Set(['all']);
 for(const p of Object.values(G.collection || {})) if(p) regions.add(getPokemonRegion(p.id));
 for(const p of (G.team || [])) if(p) regions.add(getPokemonRegion(p.id));
 return Array.from(regions).filter(r => r === 'all' || r !== 'unknown');
}
function getBoxFilterTypes(){
 const types = new Set(['all']);
 for(const p of Object.values(G.collection || {})){
  if(!p) continue;
  if(p.type1) types.add(p.type1);
  if(p.type2) types.add(p.type2);
 }
 for(const p of (G.team || [])){
  if(!p) continue;
  if(p.type1) types.add(p.type1);
  if(p.type2) types.add(p.type2);
 }
 return Array.from(types);
}
function isEvolutionTargetObtained(targetId){
 const nid = Number(targetId);
 return !!(speciesOwned(nid) || (G && G.pokedex && G.pokedex[nid] && G.pokedex[nid].caught));
}
function canPokemonEvolveToUnowned(p){
 if(!p) return false;
 const id = Number(p.id);
 const globalLevelMap = (typeof LEVEL_EVO_MAP !== 'undefined') ? LEVEL_EVO_MAP : (globalThis.LEVEL_EVO_MAP || {});
 const globalStoneMap = (typeof STONE_EVO !== 'undefined') ? STONE_EVO : (globalThis.STONE_EVO || {});
 const levelMap = Object.keys(globalLevelMap || {}).length ? globalLevelMap : FILTER_LEVEL_EVO_MAP;
 const stoneMap = Object.keys(globalStoneMap || {}).length ? globalStoneMap : FILTER_STONE_EVO;
 const lvlTarget = levelMap[id] || levelMap[String(id)] || null;
 if(lvlTarget && !isEvolutionTargetObtained(lvlTarget)) return true;
 const stones = stoneMap[id] || stoneMap[String(id)] || null;
 if(stones){
  for(const stoneKey in stones){
   const target = stones[stoneKey];
   if(!isEvolutionTargetObtained(target)) return true;
  }
 }
 return false;
}
function pokemonMatchesBoxFilters(p){
 const filters = ensureBoxFilters();
 if(!p) return false;
 if(filters.region && filters.region !== 'all' && getPokemonRegion(p.id) !== filters.region) return false;
 if(filters.type && filters.type !== 'all' && p.type1 !== filters.type && p.type2 !== filters.type) return false;
 const shiny = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id));
 if(filters.shiny === 'shiny' && !shiny) return false;
 if(filters.shiny === 'normal' && shiny) return false;
 if(filters.evo === 'missing' && !canPokemonEvolveToUnowned(p)) return false;
 return true;
}
function applyPokemonBoxFilters(entries){
 ensureBoxFilters();
 return (entries || []).filter(entry => pokemonMatchesBoxFilters(entry.p || entry.poke));
}
function boxFilterOptionHtml(value, label, current){ return `<option value="${value}"${String(current)===String(value)?' selected':''}>${label}</option>`; }
function renderBoxFiltersHtml(){
 const filters = ensureBoxFilters();
 const regions = getBoxFilterRegions();
 const types = getBoxFilterTypes();
 const regionOptions = regions.map(r => boxFilterOptionHtml(r, r==='all'?t('box_filter_all_regions'):getRegionDisplayName(r), filters.region)).join('');
 const typeOptions = types.map(tp => boxFilterOptionHtml(tp, tp==='all'?t('box_filter_all_types'):tp, filters.type)).join('');
 const shinyOptions = [
  ['all', t('box_filter_all_shiny')],
  ['shiny', t('box_filter_shiny_only')],
  ['normal', t('box_filter_non_shiny_only')]
 ].map(o => boxFilterOptionHtml(o[0], o[1], filters.shiny)).join('');
 const evoOptions = [
  ['all', t('box_filter_all_evo')],
  ['missing', t('box_filter_evo_missing')]
 ].map(o => boxFilterOptionHtml(o[0], o[1], filters.evo)).join('');
 return `<div class="box-filter-panel"><div class="box-filter-title">${t('filters_title')}</div>
  <label><span>${t('box_filter_region')}</span><select data-action="select-self" data-change-call="setBoxFilter" data-change-args="'region', this.value">${regionOptions}</select></label>
  <label><span>${t('box_filter_type')}</span><select data-action="select-self" data-change-call="setBoxFilter" data-change-args="'type', this.value">${typeOptions}</select></label>
  <label><span>${t('box_filter_shiny')}</span><select data-action="select-self" data-change-call="setBoxFilter" data-change-args="'shiny', this.value">${shinyOptions}</select></label>
  <label><span>${t('box_filter_evolution')}</span><select data-action="select-self" data-change-call="setBoxFilter" data-change-args="'evo', this.value">${evoOptions}</select></label>
  <button class="hbtn" data-action="legacy-call" data-call="resetBoxFilters" data-call-args="">${t('box_filter_reset')}</button>
 </div>`;
}
function setBoxFilter(key, value){
 const filters = ensureBoxFilters();
 if(!(key in BOX_FILTER_DEFAULTS)) return;
 filters[key] = value || BOX_FILTER_DEFAULTS[key];
 try{ if(typeof renderUnifiedGrid === 'function') renderUnifiedGrid(); }catch(_){}
 try{ const tab = document.getElementById('tab-content'); if(tab && typeof _activeTab !== 'undefined' && _activeTab === 'box') renderBox(tab); }catch(_){}
 try{ saveGame(false); }catch(_){}
}
function resetBoxFilters(){
 G.boxFilters = {...BOX_FILTER_DEFAULTS};
 try{ if(typeof renderUnifiedGrid === 'function') renderUnifiedGrid(); }catch(_){}
 try{ const tab = document.getElementById('tab-content'); if(tab && typeof _activeTab !== 'undefined' && _activeTab === 'box') renderBox(tab); }catch(_){}
 try{ saveGame(false); }catch(_){}
}


// --- Migrated to ES module, globals exposed ---
if (typeof ensureBoxFilters !== 'undefined' && typeof window !== 'undefined') window.ensureBoxFilters = ensureBoxFilters;
if (typeof getPokemonRegion !== 'undefined' && typeof window !== 'undefined') window.getPokemonRegion = getPokemonRegion;
if (typeof getUnlockedRegionsForPokedex !== 'undefined' && typeof window !== 'undefined') window.getUnlockedRegionsForPokedex = getUnlockedRegionsForPokedex;
if (typeof getUnlockedDexIds !== 'undefined' && typeof window !== 'undefined') window.getUnlockedDexIds = getUnlockedDexIds;
if (typeof isEvolutionTargetObtained !== 'undefined' && typeof window !== 'undefined') window.isEvolutionTargetObtained = isEvolutionTargetObtained;
if (typeof canPokemonEvolveToUnowned !== 'undefined' && typeof window !== 'undefined') window.canPokemonEvolveToUnowned = canPokemonEvolveToUnowned;
if (typeof pokemonMatchesBoxFilters !== 'undefined' && typeof window !== 'undefined') window.pokemonMatchesBoxFilters = pokemonMatchesBoxFilters;
if (typeof applyPokemonBoxFilters !== 'undefined' && typeof window !== 'undefined') window.applyPokemonBoxFilters = applyPokemonBoxFilters;
if (typeof renderBoxFiltersHtml !== 'undefined' && typeof window !== 'undefined') window.renderBoxFiltersHtml = renderBoxFiltersHtml;
if (typeof setBoxFilter !== 'undefined' && typeof window !== 'undefined') window.setBoxFilter = setBoxFilter;
if (typeof resetBoxFilters !== 'undefined' && typeof window !== 'undefined') window.resetBoxFilters = resetBoxFilters;
if (typeof getRegionMeta !== 'undefined' && typeof window !== 'undefined') window.getRegionMeta = getRegionMeta;
if (typeof getRegionDisplayName !== 'undefined' && typeof window !== 'undefined') window.getRegionDisplayName = getRegionDisplayName;
if (typeof isPokemonNativeToRegion !== 'undefined' && typeof window !== 'undefined') window.isPokemonNativeToRegion = isPokemonNativeToRegion;
if (typeof countCaughtInRegion !== 'undefined' && typeof window !== 'undefined') window.countCaughtInRegion = countCaughtInRegion;
if (typeof getRegionPokedexTotal !== 'undefined' && typeof window !== 'undefined') window.getRegionPokedexTotal = getRegionPokedexTotal;
if (typeof isRegionDexComplete !== 'undefined' && typeof window !== 'undefined') window.isRegionDexComplete = isRegionDexComplete;
if (typeof ensureRegionProgress !== 'undefined' && typeof window !== 'undefined') window.ensureRegionProgress = ensureRegionProgress;
if (typeof isRegionLeagueWon !== 'undefined' && typeof window !== 'undefined') window.isRegionLeagueWon = isRegionLeagueWon;
if (typeof markRegionLeagueWon !== 'undefined' && typeof window !== 'undefined') window.markRegionLeagueWon = markRegionLeagueWon;
if (typeof getRegionAccessStatus !== 'undefined' && typeof window !== 'undefined') window.getRegionAccessStatus = getRegionAccessStatus;
if (typeof canAccessRegion !== 'undefined' && typeof window !== 'undefined') window.canAccessRegion = canAccessRegion;
if (typeof regionAccessMessage !== 'undefined' && typeof window !== 'undefined') window.regionAccessMessage = regionAccessMessage;
if (typeof regionRequiresNativeTeam !== 'undefined' && typeof window !== 'undefined') window.regionRequiresNativeTeam = regionRequiresNativeTeam;
if (typeof getInvalidTeamPokemonForRegion !== 'undefined' && typeof window !== 'undefined') window.getInvalidTeamPokemonForRegion = getInvalidTeamPokemonForRegion;
if (typeof canUseCurrentTeamForRegion !== 'undefined' && typeof window !== 'undefined') window.canUseCurrentTeamForRegion = canUseCurrentTeamForRegion;
if (typeof regionTeamRestrictionMessage !== 'undefined' && typeof window !== 'undefined') window.regionTeamRestrictionMessage = regionTeamRestrictionMessage;
if (typeof getLeagueChampionIdForRegion !== 'undefined' && typeof window !== 'undefined') window.getLeagueChampionIdForRegion = getLeagueChampionIdForRegion;
if (typeof getLeagueRegionForChampion !== 'undefined' && typeof window !== 'undefined') window.getLeagueRegionForChampion = getLeagueRegionForChampion;
if (typeof isLeagueChampionId !== 'undefined' && typeof window !== 'undefined') window.isLeagueChampionId = isLeagueChampionId;
if (typeof getSpeciesTalents !== 'undefined' && typeof window !== 'undefined') window.getSpeciesTalents = getSpeciesTalents;
if (typeof getTalentByKey !== 'undefined' && typeof window !== 'undefined') window.getTalentByKey = getTalentByKey;
if (typeof getRarityLabel !== 'undefined' && typeof window !== 'undefined') window.getRarityLabel = getRarityLabel;
if (typeof getTalentName !== 'undefined' && typeof window !== 'undefined') window.getTalentName = getTalentName;
if (typeof getTalentDesc !== 'undefined' && typeof window !== 'undefined') window.getTalentDesc = getTalentDesc;
if (typeof isTalentHidden !== 'undefined' && typeof window !== 'undefined') window.isTalentHidden = isTalentHidden;
if (typeof unlockTalentForSpecies !== 'undefined' && typeof window !== 'undefined') window.unlockTalentForSpecies = unlockTalentForSpecies;
if (typeof getMovesForSpeciesLevel !== 'undefined' && typeof window !== 'undefined') window.getMovesForSpeciesLevel = getMovesForSpeciesLevel;
if (typeof getMovesForLevel !== 'undefined' && typeof window !== 'undefined') window.getMovesForLevel = getMovesForLevel;
if (typeof calcStat !== 'undefined' && typeof window !== 'undefined') window.calcStat = calcStat;
if (typeof recalcPokeStats !== 'undefined' && typeof window !== 'undefined') window.recalcPokeStats = recalcPokeStats;
if (typeof renderStars !== 'undefined' && typeof window !== 'undefined') window.renderStars = renderStars;
if (typeof isShinyDisplay !== 'undefined' && typeof window !== 'undefined') window.isShinyDisplay = isShinyDisplay;
if (typeof xpForLevel !== 'undefined' && typeof window !== 'undefined') window.xpForLevel = xpForLevel;
if (typeof applyRouteLinkGroups !== 'undefined' && typeof window !== 'undefined') window.applyRouteLinkGroups = applyRouteLinkGroups;
if (typeof getLinkedRouteIds !== 'undefined' && typeof window !== 'undefined') window.getLinkedRouteIds = getLinkedRouteIds;
if (typeof getShopName !== 'undefined' && typeof window !== 'undefined') window.getShopName = getShopName;

export {};
