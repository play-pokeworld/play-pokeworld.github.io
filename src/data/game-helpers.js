// Wave 40 — native ESM module. The classic surface (window/globalThis) is
// kept verbatim further down: classic consumers and VM harnesses.
// Phase 24: LOCALIZED name of a type ('Fire' -> 'Feu' in French). Data
// stores types in English; this helper covers cards, sheets, pokedex,
// item badges and info panels.
// Wave 43 — lazy cross-module links (P7 regression fix):
// zero static imports (chunks + VM harness isolates frozen); each alias resolves
// AT CALL TIME — engine registry first, then the global surface (VM harness).
const __pwV43Link = (n) => ((typeof PokeActions !== 'undefined' && PokeActions && typeof PokeActions.get === 'function') ? PokeActions.get(n) : null)
  || (typeof globalThis !== 'undefined' ? globalThis[n] : null) || null;
function applySecretBaseMoneyBonus(...args) { const f = __pwV43Link('applySecretBaseMoneyBonus'); return f ? f(...args) : undefined; }
function getTypeName(type){
 if(!type) return '';
 const raw = String(type).trim();
 const low = raw.toLowerCase();
 if(typeof t === 'function'){
   const loc = t('types.' + low);
   if(loc && loc !== 'types.' + low) return loc;
 }
 return typeof titleCaseDisplayName === 'function' ? titleCaseDisplayName(raw) : raw;
}


function getLocObj(id) {
  // Look up a location by ID from LOCS, LOCS_JOHTO or LOCS_HOENN
  var locs = typeof LOCS !== 'undefined' ? LOCS : (typeof window !== 'undefined' ? window.LOCS : null);
  var johto = typeof LOCS_JOHTO !== 'undefined' ? LOCS_JOHTO : (typeof window !== 'undefined' ? window.LOCS_JOHTO : null);
  var hoenn = typeof LOCS_HOENN !== 'undefined' ? LOCS_HOENN : (typeof window !== 'undefined' ? window.LOCS_HOENN : null);
  if (locs && locs[id]) return locs[id];
  if (johto && johto[id]) return johto[id];
  if (hoenn && hoenn[id]) return hoenn[id];
  return null;
}


function getSpeciesTalents(id){
  const nid = Number(id);
  // Use type-based POKE_TALENTS first (POKE_TALENTS from data)
  var pokeTalents = (typeof POKE_TALENTS !== 'undefined') ? POKE_TALENTS : (globalThis.POKE_TALENTS || null);
  if (pokeTalents && pokeTalents[nid]) return pokeTalents[nid].slice();
  // Fallback: PokeChill type-based system - get abilities matching Pokémon's types
  const d = (typeof PD !== 'undefined' && PD) ? PD[nid] : null;
  if (!d) return ['sturdy', 'intimidate', 'hugepower'];
  const t1 = String(d[1] || '').toLowerCase();
  const t2 = String(d[2] || '').toLowerCase();
  // From TALENTS_FULL which mirrors ability.xxx from PokeChill
  const matched = [];
  if (typeof TALENTS_FULL !== 'undefined') {
    for (const [key, obj] of Object.entries(TALENTS_FULL)) {
      const types = obj.types || [];
      if (types.includes('all') || (t1 && types.includes(t1)) || (t2 && types.includes(t2))) matched.push(key);
    }
  }
  return matched.length > 0 ? matched : ['sturdy', 'intimidate', 'hugepower'];
}



// Phase 24: canonical resolution of an ability id. Pools and curated sets
// are normalized to lowercase, but OLD SAVES may still hold camelCase ids
// ('waterAbsorb'…) — resolve exact first, then lowercase, to stay
// compatible without a destructive migration.
function getTalentRecord(key) {
 if(!key || typeof TALENTS_FULL === 'undefined') return null;
 if(TALENTS_FULL[key]) return TALENTS_FULL[key];
 const low = String(key).toLowerCase();
 if(TALENTS_FULL[low]) return TALENTS_FULL[low];
 return null;
}

function getTalentByKey(key) {
 return getTalentRecord(key);
}


function getRarityLabel(rarity) {
 if(rarity === 1) return (typeof t === 'function' ? t('rarity_common_label') : 'Common');
 if(rarity === 2) return (typeof t === 'function' ? t('rarity_uncommon_label') : 'Uncommon');
 if(rarity === 3) return (typeof t === 'function' ? t('rarity_rare_label') : 'Rare');
 return (typeof t === 'function' ? t('rarity_unknown_label') : 'Unknown');
}


function getTalentName(tal){
 if(!tal) return 'Normal';
 if(typeof t==='function'){
   // Locale: exact id, then normalized id (lowercase) for old saves.
   for(const cand of [tal, String(tal).toLowerCase()]){
     const loc = t('talents.'+cand+'.name');
     if(loc && loc !== 'talents.'+cand+'.name') return typeof titleCaseDisplayName === 'function' ? titleCaseDisplayName(loc) : loc;
   }
 }
 const rec = getTalentRecord(tal);
 if(rec && rec.name) return typeof titleCaseDisplayName === 'function' ? titleCaseDisplayName(rec.name) : rec.name;
 return typeof titleCaseDisplayName === 'function' ? titleCaseDisplayName(tal) : tal;
}


function getTalentDesc(tal){
 if(!tal) return '';
 if(typeof t==='function'){
   for(const cand of [tal, String(tal).toLowerCase()]){
     const loc = t('talents.'+cand+'.desc');
     if(loc && loc !== 'talents.'+cand+'.desc') return loc;
   }
 }
 const rec = getTalentRecord(tal);
 if(rec && rec.info) return rec.info;
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


// ── Seeded PRNG (mulberry32) for deterministic pools ──
function _seedRng(seed) {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Deterministic per-species move pool (PokeChill-style) ──

function getSpeciesMovePool(speciesId) {
  var cache = getSpeciesMovePool._cache || (getSpeciesMovePool._cache = {});
  var nid = Number(speciesId);
  if (cache[nid]) return cache[nid];

  var d = (typeof PD !== 'undefined' && PD) ? PD[nid] : null;
  if (!d) { cache[nid] = ['tackle']; return ['tackle']; }

  var t1 = String(d[1] || '').toLowerCase();
  var t2 = String(d[2] || '').toLowerCase();
  var types = [t1];
  if (t2 && t2 !== '') types.push(t2);

  var moveData = (typeof MOVES !== 'undefined') ? MOVES : (globalThis.MOVES || {});

  // Collect all eligible moves per Pokemon
  var stabDmg = [], otherDmg = [], status = [];

  for (var mid in moveData) {
    var mv = moveData[mid];
    if (!mv || mv.power === undefined) continue;

    var moveType = (mv.type || '').toLowerCase();
    var mvTypes = mv.moveset;
    if (!mvTypes) continue; // Skip signature-only moves
    var isTypeMatch = types.includes(moveType);
    var isMovesetMatch = mvTypes.some(function(mt) { return types.includes(mt); });
    var isAll = mvTypes.includes('all');

    if (!isTypeMatch && !isMovesetMatch && !isAll) continue;

    var entry = { id: mid, power: mv.power || 0, rarity: mv.rarity || 1 };
    if (mv.power === 0) {
      status.push(entry);
    } else if (isTypeMatch) {
      stabDmg.push(entry);
    } else {
      otherDmg.push(entry);
    }
  }

  var sorter = function(a, b) {
    var accA = (moveData[a.id] && moveData[a.id].acc) || 100;
    var accB = (moveData[b.id] && moveData[b.id].acc) || 100;
    if ((accA === 100) !== (accB === 100)) return (accB === 100 ? 1 : -1);
    if (a.rarity !== b.rarity) return a.rarity - b.rarity;
    if (a.power !== b.power) return b.power - a.power;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  };
  stabDmg.sort(sorter);
  otherDmg.sort(sorter);
  status.sort(sorter);

  // Damaging STAB first, then damaging non-STAB, then status
  var combined = stabDmg.concat(otherDmg).concat(status);
  var pool = [];
  for (var i = 0; i < Math.min(15, combined.length); i++) {
    pool.push(combined[i].id);
  }
  if (pool.length === 0) pool = ['tackle'];

  cache[nid] = pool;
  return pool;
}function getSpeciesFullLearnablePool(speciesId) {
  var cache = getSpeciesFullLearnablePool._cache || (getSpeciesFullLearnablePool._cache = {});
  var nid = Number(speciesId);
  if (cache[nid]) return cache[nid];

  var d = (typeof PD !== 'undefined' && PD) ? PD[nid] : null;
  if (!d) { cache[nid] = ['tackle']; return ['tackle']; }

  var t1 = String(d[1] || '').toLowerCase();
  var t2 = String(d[2] || '').toLowerCase();
  var types = [t1];
  if (t2 && t2 !== '') types.push(t2);

  var moveData = (typeof MOVES !== 'undefined') ? MOVES : (globalThis.MOVES || {});
  var result = [];

  for (var mid in moveData) {
    var mv = moveData[mid];
    if (!mv || mv.power === undefined) continue;
    var mvTypes = mv.moveset;
    if (!mvTypes) continue; // Skip signature-only moves
    var moveType = (mv.type || '').toLowerCase();
    var isTypeMatch = types.includes(moveType);
    var isMovesetMatch = mvTypes.some(function(mt) { return types.includes(mt); });
    var isAll = mvTypes.includes('all');

    if (!isTypeMatch && !isMovesetMatch && !isAll) continue;
    result.push(mid);
  }

  result.sort();
  cache[nid] = result;
  return result;
}

// ── Level at which a move is learned ──
function getMoveLearnLevel(speciesId, moveId) {
  var pool = getSpeciesMovePool(speciesId);
  var idx = pool.indexOf(moveId);
  if (idx === -1) return 999; // Not in the pool -> not learned by level-up
  // PokeChill: level 1, then every 7 levels (1, 7, 14, 21, 28, ... 98)
  if (idx === 0) return 1;
  return Math.min(100, 1 + idx * 7);
}

// ── Category of a learnable move: level / TM-HM / training ──
// (phase 10: training must only offer the "training" category; the level
// pool unlocks by level-up, TMs/HMs by item usage.)
function getCtCsMoveIds() {
  var cache = getCtCsMoveIds._cache || (getCtCsMoveIds._cache = {});
  if (cache.done) return cache.map;
  var map = {};
  var items = (typeof ITEMS !== 'undefined' && ITEMS) ? ITEMS : (globalThis.ITEMS || {});
  for (var k in items) {
    var it = items[k];
    if (!it || !it.moveId) continue;
    // Shared predicate (items-helpers.js) + local fallback: also recognizes
    // TMs without a declared `type` (ct_*/hm_* key + moveId, e.g. ct_airshlash).
    var isCtCs = (typeof isCtCsItem === 'function')
      ? isCtCsItem(k)
      : (it.type === 'ct' || it.type === 'cs' || /^(ct|cs)/.test(String(k)));
    if (!isCtCs) continue;
    // Canonical move id (legacy alias resolved: icebeam -> ice_beam…)
    // to match pools built on MOVES keys.
    var moveId = (typeof resolveCtCsMoveId === 'function') ? (resolveCtCsMoveId(k) || it.moveId) : it.moveId;
    map[moveId] = true;
  }
  cache.done = true;
  cache.map = map;
  return map;
}

// "Training category" pool of a species = full learnable pool
// - level pool - TM/HM moves.
function getSpeciesTrainingOnlyPool(speciesId) {
  var cache = getSpeciesTrainingOnlyPool._cache || (getSpeciesTrainingOnlyPool._cache = {});
  var nid = Number(speciesId);
  if (cache[nid]) return cache[nid];
  var full = (typeof getSpeciesFullLearnablePool === 'function') ? getSpeciesFullLearnablePool(nid) : [];
  var ct = getCtCsMoveIds();
  var out = [];
  for (var i = 0; i < full.length; i++) {
    var id = full[i];
    if (ct[id]) continue;                               // TM/HM category -> unlocked by item usage
    if (getMoveLearnLevel(nid, id) !== 999) continue;   // level pool -> unlocked by level-up
    out.push(id);
  }
  cache[nid] = out;
  return out;
}

// ── Number of moves known at a given level ──
function getMoveCountForLevel(level) {
  if (level >= 99) return 15;
  if (level >= 92) return 14;
  if (level >= 85) return 13;
  if (level >= 78) return 12;
  if (level >= 71) return 11;
  if (level >= 64) return 10;
  if (level >= 57) return 9;
  if (level >= 50) return 8;
  if (level >= 43) return 7;
  if (level >= 36) return 6;
  if (level >= 29) return 5;
  if (level >= 22) return 4;
  if (level >= 15) return 3;
  if (level >= 8) return 2;
  return 1; // niveau 1-7 : 1 move
}

// ── Get moves learned by level-up for a species at a given level ──
function getMovesForSpeciesLevel(speciesId, moveset, level) {
  var nid = Number(speciesId);
  var pool = getSpeciesMovePool(nid);
  var count = getMoveCountForLevel(level);
  var sliceCount = Math.min(4, Math.min(count, pool.length));
  var result = [];
  for (var i = 0; i < sliceCount; i++) {
    result.push({ id: pool[i] });
  }
  if (result.length === 0) result.push({ id: 'tackle' });
  return result;
}

// ── Shortcut: moves for a species at a level (no passsed moveset) ──
function getMovesForLevel(speciesId, level) {
  return getMovesForSpeciesLevel(speciesId, null, level);
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
 const symbol = isEv ? '●' : '★';
 const empty = isEv ? '○' : '☆';
 let s = '';
 for(let i=0; i<6; i++) s += i < count ? symbol : empty;
 return `<span title="+${count*5}%">${s}</span>`;
}


function isShinyDisplay(p){ return !!(p&&p.shinyActive); }


function xpForLevel(lv){ return Math.floor(Math.pow(lv,3) * 0.8); }


const MIN_WINS_DEFAULT = 10;
(function attachMinWins(){
 const apply = (obj)=>{ for(const id in obj){ const loc=obj[id]; if(!loc) continue; loc.minWins = (loc.type==='town') ? 0 : MIN_WINS_DEFAULT; } };
  const _L = (typeof LOCS !== 'undefined') ? LOCS : ((typeof window !== 'undefined' && window.LOCS) || {});
  const _LJ = (typeof LOCS_JOHTO !== 'undefined') ? LOCS_JOHTO : ((typeof window !== 'undefined' && window.LOCS_JOHTO) || {});
  const _LH = (typeof LOCS_HOENN !== 'undefined') ? LOCS_HOENN : ((typeof window !== 'undefined' && window.LOCS_HOENN) || {});
  apply(_L); apply(_LJ); apply(_LH);
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
function _allLocsObjs(){
  const _L = (typeof LOCS !== 'undefined') ? LOCS : ((typeof window !== 'undefined' && window.LOCS) || null);
  const _LJ = (typeof LOCS_JOHTO !== 'undefined') ? LOCS_JOHTO : ((typeof window !== 'undefined' && window.LOCS_JOHTO) || null);
  const _LH = (typeof LOCS_HOENN !== 'undefined') ? LOCS_HOENN : ((typeof window !== 'undefined' && window.LOCS_HOENN) || null);
  return [_L, _LJ, _LH].filter(Boolean);
}
function applyRouteLinkGroups(){
  const objects = _allLocsObjs();
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
  for(const obj of _allLocsObjs()){
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
  if (typeof t === 'function') {
    let res = t('shops.' + id + '.name');
    if (!res || res === 'shops.' + id + '.name') {
      res = t('shops.' + id + '.name.name');
    }
    if (res && typeof res === 'object' && res.name) res = res.name;
    if (res && res !== 'shops.' + id + '.name' && res !== 'shops.' + id + '.name.name') return String(res);
  }
  return id || 'Boutique';
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
// FIX (2026-08) : partage inter-modules (pokedex.js, collection.js).
if (typeof window !== 'undefined') window.REGION_ORDER = REGION_ORDER;
if (typeof globalThis !== 'undefined') globalThis.REGION_ORDER = REGION_ORDER;
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
function isKalosCompleted(){
  // Delta Episode / Primal Reversions: only accessible after Kalos
  // (Kalos League won). The classic Hoenn dex stays open before that.
  try {
    if (typeof isRegionLeagueWon === 'function' && isRegionLeagueWon('kalos')) return true;
  } catch (_) {}
  return !!(typeof G !== 'undefined' && G && G.regionLeagueWon && G.regionLeagueWon.kalos);
}

function ensureRegionProgress(){
 if(!G) return;
 if(!G.regionLeagueWon || typeof G.regionLeagueWon !== 'object') G.regionLeagueWon = {};
 if(G.championTitle || (G.defeatedChamps && G.defeatedChamps.elite4)) G.regionLeagueWon.kanto = true;
 if(G.defeatedChamps && G.defeatedChamps.johto_elite4) G.regionLeagueWon.johto = true;
 if(G.defeatedChamps && G.defeatedChamps.hoenn_elite4) G.regionLeagueWon.hoenn = true;
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
 if(region === 'hoenn') G.hoennChampionTitle = true;
}
function getRegionAccessStatus(targetRegion){
 targetRegion = targetRegion || 'kanto';
 if(targetRegion === 'kanto') return {ok:true};
 if(targetRegion === 'hoenn' && typeof G !== 'undefined' && G && G._debugUnlockAllRegions) return {ok:true};
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

function getDuplicateItemPayout(key, qty){
 const itm = ITEMS[key] || ITEMS[normalizeItemKey ? normalizeItemKey(key) : key];
 const unit = Math.max(0, Math.floor(((itm && (itm.price || itm.value)) || 0) * 0.25));
 return unit * Math.max(1, qty || 1);
}
// Item stack limit (same rule as addToInventory): held / battle items /
// berries = 25, everything else is virtually unlimited. Phase 30: loot
// money-conversion must only trigger WHEN the stack is full — before,
// owning ONE single copy was enough to convert everything into money,
// and routes were handing out cash for no reason (beta feedback).
function getItemStackLimit(key){
 const itm = ITEMS[key] || ITEMS[normalizeItemKey ? normalizeItemKey(key) : key];
 return (itm && (itm.type === 'held' || itm.category || itm.buff)) ? 25 : 999999;
}
function grantRewardItem(key, qty){
 qty = Math.max(1, Number(qty || 1));
 if(!ITEMS[key]) return {added:0, money:0};
 const itm = ITEMS[key];
 if(itm.type === 'treasure' || itm.type === 'fossil'){
  addToInventory(key, qty);
  return {added:qty, money:0};
 }
 const cap = getItemStackLimit(key);
 const cur = Number((G.inventory && G.inventory[key]) || 0);
 const added = Math.min(Math.max(0, cap - cur), qty);
 if(added > 0) addToInventory(key, added);
 const overflow = qty - added;
 let money = 0;
 if(overflow > 0){
  money = getDuplicateItemPayout(key, overflow); // stack full: the overflow IS converted
  if(money > 0){
    if(typeof __pwV43Link('applySecretBaseMoneyBonus') === 'function') money = applySecretBaseMoneyBonus(money);
    G.money = (G.money || 0) + money;
  }
 }
 return {added, money};
}
function grantRewardItems(items){
 const result = {added:{}, money:0};
 if(!items) return result;
 for(const key in items){
  const r = grantRewardItem(key, items[key]);
  if(r.added) result.added[key] = (result.added[key] || 0) + r.added;
  result.money += r.money || 0;
 }
 return result;
}


const POKEMON_RANK_ORDER = ['E','D','C','B','A','S','SS'];
const POKEMON_RANK_OVERRIDES = {
  10:'E',11:'E',13:'E',14:'E',129:'E',191:'E',172:'D',173:'D',174:'D',175:'D',236:'D',238:'D',239:'D',240:'D',132:'B',25:'C',83:'C',113:'A',115:'A',122:'A',123:'A',127:'A',131:'A',143:'A',149:'S',150:'S',151:'S',243:'S',244:'S',245:'S',248:'S',249:'S',250:'S',251:'S'
};
function getPokemonBaseStatTotal(id){
 const d = PD && PD[Number(id)];
 if(!d) return 300;
 return Number(d[3]||0)+Number(d[4]||0)+Number(d[5]||0)+Number(d[6]||0)+Number(d[7]||0)+Number(d[8]||0);
}
function getPokemonRank(id){
 const nid = Number(id);
 if(POKEMON_RANK_OVERRIDES[nid]) return POKEMON_RANK_OVERRIDES[nid];
 const bst = getPokemonBaseStatTotal(nid);
 if(bst < 250) return 'E';
 if(bst < 330) return 'D';
 if(bst < 420) return 'C';
 if(bst < 500) return 'B';
 if(bst < 580) return 'A';
 return 'S';
}
function rankValue(rank){ return Math.max(0, POKEMON_RANK_ORDER.indexOf(rank || 'E')); }
function rankAllowsPokemon(maxRank, id){ return rankValue(getPokemonRank(id)) <= rankValue(maxRank || 'S'); }
function rankBadgeHtml(id){ const rank = getPokemonRank(id); return `<span class="pokemon-rank-badge rank-${rank.toLowerCase()}">${rank}</span>`; }


const BOX_FILTER_DEFAULTS = {region:'all', type:'all', shiny:'all', evo:'all', favorite:'all', locked:'all', iv:'all', ev:'all', rank:'all', search:''};
const FILTER_LEVEL_EVO_MAP = {1:2, 2:3, 4:5, 5:6, 7:8, 8:9, 10:11, 11:12, 13:14, 14:15, 16:17, 17:18, 19:20, 21:22, 23:24, 27:28, 29:30, 32:33, 41:42, 43:44, 46:47, 48:49, 50:51, 52:53, 54:55, 56:57, 60:61, 63:64, 66:67, 69:70, 72:73, 74:75, 75:76, 77:78, 79:80, 81:82, 84:85, 86:87, 88:89, 92:93, 96:97, 98:99, 100:101, 104:105, 109:110, 111:112, 116:117, 118:119, 129:130, 138:139, 140:141, 147:148, 148:149, 152:153, 153:154, 155:156, 156:157, 158:159, 159:160, 161:162, 163:164, 165:166, 167:168, 170:171, 172:25, 173:35, 174:39, 175:176, 177:178, 179:180, 180:181, 183:184, 187:188, 188:189, 194:195, 204:205, 209:210, 216:217, 218:219, 220:221, 223:224, 228:229, 231:232, 236:106, 238:124, 239:125, 240:126, 246:247, 247:248, 252:253, 253:254, 255:256, 256:257, 258:259, 259:260, 261:262, 263:264, 265:266, 266:267, 268:269, 270:271, 273:274, 276:277, 278:279, 280:281, 281:282, 283:284, 285:286, 287:288, 288:289, 290:291, 293:294, 294:295, 296:297, 298:183, 304:305, 305:306, 307:308, 309:310, 316:317, 318:319, 320:321, 322:323, 328:329, 329:330, 331:332, 333:334, 339:340, 341:342, 343:344, 345:346, 347:348, 353:354, 355:356, 360:202, 361:362, 363:364, 364:365, 371:372, 372:373, 374:375, 375:376};
const FILTER_STONE_EVO = {37:{firestone:38},58:{firestone:59},133:{firestone:136,waterstone:134,thunderstone:135},61:{waterstone:62,kings_rock:186},90:{waterstone:91},120:{waterstone:121},25:{thunderstone:26},44:{leafstone:45,sunstone:182},70:{leafstone:71},102:{leafstone:103},30:{moonstone:31},33:{moonstone:34},35:{moonstone:36},39:{moonstone:40},79:{kings_rock:200},95:{metal_coat:208},117:{dragon_scale:230},123:{metal_coat:212},137:{upgrade:233},191:{sunstone:192},271:{waterstone:272},274:{leafstone:275},300:{moonstone:301},366:{deep_sea_tooth:367,deep_sea_scale:368},349:{prism_scale:350}};

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
function pokemonMatchesBoxFilters(p, ignoreSearch){
 const filters = ensureBoxFilters();
 if(!p) return false;
 if(filters.region && filters.region !== 'all' && getPokemonRegion(p.id) !== filters.region) return false;
 if(filters.type && filters.type !== 'all' && p.type1 !== filters.type && p.type2 !== filters.type) return false;
 const shiny = !!(p.shinyUnlocked || p.shinyActive || p.shiny || isSpeciesShiny(p.id));
 if(filters.shiny === 'shiny' && !shiny) return false;
 if(filters.shiny === 'normal' && shiny) return false;
 if(filters.evo === 'missing' && !canPokemonEvolveToUnowned(p)) return false;
 if(filters.favorite === 'favorite' && !p.favorite) return false;
 if(filters.favorite === 'not_favorite' && p.favorite) return false;
 if(filters.locked === 'locked' && !p.locked) return false;
 if(filters.locked === 'unlocked' && p.locked) return false;
 const ivTotal = Object.values(p.ivs||{}).reduce((a,b)=>a+(Number(b)||0),0);
 if(filters.iv === 'complete' && ivTotal < 36) return false;
 if(filters.iv === 'incomplete' && ivTotal >= 36) return false;
 const evTotal = Object.values(p.evs||{}).reduce((a,b)=>a+(Number(b)||0),0);
 if(filters.ev === 'complete' && evTotal < 36) return false;
 if(filters.ev === 'incomplete' && evTotal >= 36) return false;
 if(filters.rank && filters.rank !== 'all' && typeof getPokemonRank === 'function' && getPokemonRank(p.id) !== filters.rank) return false;
 if(!ignoreSearch && filters.search){
  const q = String(filters.search).toLowerCase().trim();
  if(q){
   const disp = (typeof getPokeName === 'function' ? getPokeName(p.id) : '') || '';
   const hay = (disp + ' ' + (p.name || '') + ' #' + (p.id != null ? p.id : '')).toLowerCase();
   if(!hay.includes(q)) return false;
  }
 }
 return true;
}
// opts.ignoreSearch: contexts owning their own search field (unified
// selector) must not inherit the box tab's text search invisibly.
function applyPokemonBoxFilters(entries, opts){
 ensureBoxFilters();
 const ignoreSearch = !!(opts && opts.ignoreSearch);
 return (entries || []).filter(entry => pokemonMatchesBoxFilters(entry.p || entry.poke, ignoreSearch));
}
function boxFilterOptionHtml(value, label, current){ return `<option value="${value}"${String(current)===String(value)?' selected':''}>${label}</option>`; }
// THE single filter toolbar (shared with the bag): the PC box bar renders
// through the exact same DS FilterBar component — identical skeleton
// (quick-filter chips + labeled selects + name search + reset), identical
// look. Classic files cannot import: this goes through window.PokeUI.
// opts.search !== false renders the name-search field; the unified selector
// passes {search:false} because it owns its own top search input. opts.sorts
// prepends sort chips (wave 15: legacy top TRI row removed).
function renderBoxFiltersHtml(opts){
 const comps = (typeof window !== 'undefined' && window.PokeUI && window.PokeUI.components) ? window.PokeUI.components : null;
 if(!comps || typeof comps.filterBarHTML !== 'function') throw new Error('[ui] PokeUI components not loaded (filterBarHTML)');
 const wantSearch = !opts || opts.search !== false;
 const filters = ensureBoxFilters();
 const regions = getBoxFilterRegions();
 const types = getBoxFilterTypes();
 const chip = (label, key, value) => ({
  label: label,
  active: String(filters[key]) === String(value),
  call: 'setBoxFilter',
  callArgs: `'${key}','${value}'`,
 });
 // Wave 15 (user feedback): the legacy TRI button row ON TOP of the USM
 // is gone — sort chips live INSIDE the one FilterBar (same bar as the bag).
 // opts.sorts: [{ label, active, dir, call, callArgs }] built by the caller
 // (sort state is owned by the unified selector module).
 const sortChips = (opts && Array.isArray(opts.sorts)) ? opts.sorts : [];
 const model = {
  chips: [
   ...sortChips.map((sc, i) => ({
     label: sc.label,
     active: !!sc.active,
     call: sc.call,
     callArgs: sc.callArgs,
     extraClass: 'usm-sort-btn usm-sort-chip' + (i === sortChips.length - 1 ? ' usm-sort-chip-last' : ''),
     // data-sort locates a criterion independently of the locale text;
     // data-dir carries the ▲/▼ marker for the CSS content:attr() marker.
     data: Object.assign({ sort: sc.sort || '' }, (sc.active && sc.dir) ? { dir: sc.dir } : {}),
   })),
   chip(t('box_filter_all_shiny'), 'shiny', 'all'),
   chip('★ ' + t('box_filter_shiny_only'), 'shiny', 'shiny'),
   chip(t('box_filter_non_shiny_only'), 'shiny', 'normal'),
   chip(t('box_filter_favorite_only'), 'favorite', filters.favorite === 'favorite' ? 'all' : 'favorite'),
   chip(t('box_filter_locked_only'), 'locked', filters.locked === 'locked' ? 'all' : 'locked'),
  ],
  fields: [
   { label: t('box_filter_region'), name: 'box-filter-region', changeCall: 'setBoxFilter', changeArgs: "'region', this.value", current: filters.region,
     options: regions.map(r => ({ value: r, label: r === 'all' ? t('box_filter_all_regions') : getRegionDisplayName(r) })) },
   { label: t('box_filter_type'), name: 'box-filter-type', changeCall: 'setBoxFilter', changeArgs: "'type', this.value", current: filters.type,
     options: types.map(tp => ({ value: tp, label: tp === 'all' ? t('box_filter_all_types') : tp })) },
   { label: t('box_filter_evolution'), name: 'box-filter-evo', changeCall: 'setBoxFilter', changeArgs: "'evo', this.value", current: filters.evo,
     options: [{ value: 'all', label: t('box_filter_all_evo') }, { value: 'missing', label: t('box_filter_evo_missing') }] },
   { label: t('box_filter_iv'), name: 'box-filter-iv', changeCall: 'setBoxFilter', changeArgs: "'iv', this.value", current: filters.iv,
     options: [{ value: 'all', label: t('box_filter_all_iv') }, { value: 'complete', label: t('box_filter_iv_complete') }, { value: 'incomplete', label: t('box_filter_iv_incomplete') }] },
   { label: t('box_filter_ev'), name: 'box-filter-ev', changeCall: 'setBoxFilter', changeArgs: "'ev', this.value", current: filters.ev,
     options: [{ value: 'all', label: t('box_filter_all_ev') }, { value: 'complete', label: t('box_filter_ev_complete') }, { value: 'incomplete', label: t('box_filter_ev_incomplete') }] },
   { label: t('box_filter_rank'), name: 'box-filter-rank', changeCall: 'setBoxFilter', changeArgs: "'rank', this.value", current: filters.rank,
     options: ['all', 'E', 'D', 'C', 'B', 'A', 'S'].map(r => ({ value: r, label: r === 'all' ? t('box_filter_all_ranks') : r })) },
  ],
  search: wantSearch ? {
   value: filters.search || '',
   placeholder: t('box_filter_search_placeholder'),
   action: 'filter-box',
  } : null,
  reset: { label: t('box_filter_reset'), call: 'resetBoxFilters' },
 };
 return comps.filterBarHTML(model);
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
// Text search (same ergonomics as the bag): updates instantly without a save
// hit per keystroke; the filter is folded into the next regular save.
function setBoxSearch(value){
 ensureBoxFilters();
 G.boxFilters.search = String(value || '');
 try{ if(typeof renderUnifiedGrid === 'function') renderUnifiedGrid(); }catch(_){}
 try{ const tab = document.getElementById('tab-content'); if(tab && typeof _activeTab !== 'undefined' && _activeTab === 'box') renderBox(tab); }catch(_){}
}


// ── Phase 26: "where to find" an item (item info panel section) ──
// Returns a list of readable labels (routes, shops — base stock
// + TM/HM stock —, mine, atoll, quests, fossil lab).
function getItemSourceList(key){
 const out=[];
 const add=(s)=>{ if(s && !out.includes(s)) out.push(s); };
 if(!key) return out;
 if(typeof ROUTE_DROPS !== 'undefined' && ROUTE_DROPS){
  for(const [locId,drops] of Object.entries(ROUTE_DROPS)) if((drops||[]).includes(key)) add('🗺️ ' + (typeof getLocName==='function'?getLocName(locId):locId));
 }
 for(const [shopId,shop] of Object.entries((typeof SHOPS !== 'undefined' && SHOPS) ? SHOPS : {})){
  const items=(shop && (shop.items||shop.stock))||[];
  if(Array.isArray(items)&&items.some(it=>(Array.isArray(it)?it[0]:(it.key||it.id||it))===key)) add('🏬 ' + (typeof getShopName==='function'?getShopName(shopId):shopId));
 }
 for(const [shopId,stock] of Object.entries((typeof CTCS_SHOP_STOCK !== 'undefined' && CTCS_SHOP_STOCK) ? CTCS_SHOP_STOCK : {})){
  if((stock||[]).includes(key)) add('🏬 ' + (typeof getShopName==='function'?getShopName(shopId):shopId) + ' · CT');
 }
 if(typeof ATOLL_SHOP !== 'undefined' && Array.isArray(ATOLL_SHOP)){
  for(const pair of ATOLL_SHOP) if(pair && pair[0]===key) add('🏭 ' + (typeof t==='function'?t('battle_atoll_title'):'Atoll') + ' — ' + pair[1] + ' ' + (typeof t==='function'?t('atoll_tokens'):'jetons'));
 }
 if(typeof MINE_ITEMS !== 'undefined' && Array.isArray(MINE_ITEMS) && MINE_ITEMS.some(it=>it && it.key===key)) add('⛏️ ' + (typeof t==='function'?t('mine_title'):'Mine'));
 if(typeof STORY_QUESTS !== 'undefined' && Array.isArray(STORY_QUESTS)) for(const q of STORY_QUESTS) if(q && q.rewardItems && q.rewardItems[key]) add('📖 ' + (typeof t==='function'?t('dict_main_quest'):'Main quest'));
 if(typeof SIDE_QUESTS !== 'undefined' && SIDE_QUESTS) for(const q of Object.values(SIDE_QUESTS)) if(q && q.rewardItems && q.rewardItems[key]) add('📗 ' + (typeof t==='function'?t('dict_side_quest'):'Side quest'));
 if(typeof G !== 'undefined' && G && Array.isArray(G.repeatables)) for(const r of G.repeatables) if(r && r.def && r.def.rewardItems && r.def.rewardItems[key]) add('🔁 ' + (typeof t==='function'?t('dict_repeatable_quest'):'Repeatable quest'));
 if(typeof ITEMS !== 'undefined' && ITEMS && ITEMS[key] && ITEMS[key].type === 'fossil') add('🔬 ' + (typeof t==='function'?t('fossil_lab'):'Fossil Lab'));
 return out;
}

// ── Phase 26: who can learn a move (move info panel) ──
// Sorted by the game's legitimacy category: level / TM-HM / training.
function getMoveLearners(moveId){
 var cache=getMoveLearners._cache || (getMoveLearners._cache={});
 if(cache[moveId]) return cache[moveId];
 var res={level:[], ctcs:[], training:[]};
 if(!moveId || typeof getSpeciesFullLearnablePool !== 'function') return res;
 var ctcsMap=(typeof getCtCsMoveIds === 'function') ? getCtCsMoveIds() : {};
 var maxId=(typeof PD !== 'undefined' && PD) ? (PD.length-1) : 251;
 for(var id=1; id<=maxId; id++){
  if(typeof PD !== 'undefined' && PD && !PD[id]) continue;
  var pool=getSpeciesFullLearnablePool(id);
  if(!pool || !pool.includes(moveId)) continue;
  var lvPool=(typeof getSpeciesMovePool === 'function') ? getSpeciesMovePool(id) : [];
  if(lvPool.includes(moveId)) res.level.push(id);
  else if(ctcsMap[moveId]) res.ctcs.push(id);
  else res.training.push(id);
 }
 cache[moveId]=res;
 return res;
}

// --- Migrated to ES module, globals exposed ---


// PokeChill-style move learning: uses the deterministic per-species pool
function learnPkmnMove(id, level) {
  var pool = getSpeciesMovePool(id);
  if (!pool || pool.length === 0) return 'tackle';
  var count = getMoveCountForLevel(level);
  var idx = Math.min(count - 1, pool.length - 1);
  if (idx < 0) idx = 0;
  return pool[idx];
}

// PokeChill-style ability learning (excludes hidden ability)
function learnPkmnAbility(id) {
  var d = (typeof PD !== 'undefined' && PD) ? PD[Number(id)] : null;
  if (!d) return 'sturdy';
  var t1 = String(d[1] || '').toLowerCase();
  var t2 = String(d[2] || '').toLowerCase();
  var types = [t1];
  if (t2 && t2 !== '') types.push(t2);
  var hiddenTal = null;
  var pt = (typeof POKEMON_TALENTS !== 'undefined') ? POKEMON_TALENTS : (globalThis.POKEMON_TALENTS || {});
  if (pt[Number(id)] && pt[Number(id)].hiddenAbility) hiddenTal = pt[Number(id)].hiddenAbility;
  var tier = 1;
  if (Math.random() < 0.20) tier = 2;
  if (Math.random() < 0.06) tier = 3;
  var pool = [];
  if (typeof TALENTS_FULL !== 'undefined') {
    for (var key in TALENTS_FULL) {
      var ab = TALENTS_FULL[key];
      if (!ab || ab.rarity !== tier) continue;
      if (!ab.types) continue;
      if (key === hiddenTal) continue;
      if (ab.types.includes('all') || ab.types.some(function(t) { return types.includes(t); })) pool.push(key);
    }
  }
  if (pool.length === 0) return 'sturdy';
  return pool[Math.floor(Math.random() * pool.length)];
}

// Check if an ability is the hidden ability for a species
function isHiddenAbility(speciesId, abilityKey) {
  var pt = (typeof POKEMON_TALENTS !== 'undefined') ? POKEMON_TALENTS : (globalThis.POKEMON_TALENTS || {});
  return pt[Number(speciesId)] && pt[Number(speciesId)].hiddenAbility === abilityKey;
}

if (typeof ensureBoxFilters !== 'undefined') { if (typeof window !== 'undefined') window.ensureBoxFilters = ensureBoxFilters; if (typeof globalThis !== 'undefined') globalThis.ensureBoxFilters = ensureBoxFilters; }
if (typeof getPokemonRegion !== 'undefined') { if (typeof window !== 'undefined') window.getPokemonRegion = getPokemonRegion; if (typeof globalThis !== 'undefined') globalThis.getPokemonRegion = getPokemonRegion; }
if (typeof getUnlockedRegionsForPokedex !== 'undefined') { if (typeof window !== 'undefined') window.getUnlockedRegionsForPokedex = getUnlockedRegionsForPokedex; if (typeof globalThis !== 'undefined') globalThis.getUnlockedRegionsForPokedex = getUnlockedRegionsForPokedex; }
if (typeof getUnlockedDexIds !== 'undefined') { if (typeof window !== 'undefined') window.getUnlockedDexIds = getUnlockedDexIds; if (typeof globalThis !== 'undefined') globalThis.getUnlockedDexIds = getUnlockedDexIds; }
if (typeof isEvolutionTargetObtained !== 'undefined') { if (typeof window !== 'undefined') window.isEvolutionTargetObtained = isEvolutionTargetObtained; if (typeof globalThis !== 'undefined') globalThis.isEvolutionTargetObtained = isEvolutionTargetObtained; }
if (typeof canPokemonEvolveToUnowned !== 'undefined') { if (typeof window !== 'undefined') window.canPokemonEvolveToUnowned = canPokemonEvolveToUnowned; if (typeof globalThis !== 'undefined') globalThis.canPokemonEvolveToUnowned = canPokemonEvolveToUnowned; }
if (typeof pokemonMatchesBoxFilters !== 'undefined') { if (typeof window !== 'undefined') window.pokemonMatchesBoxFilters = pokemonMatchesBoxFilters; if (typeof globalThis !== 'undefined') globalThis.pokemonMatchesBoxFilters = pokemonMatchesBoxFilters; }
if (typeof applyPokemonBoxFilters !== 'undefined') { if (typeof window !== 'undefined') window.applyPokemonBoxFilters = applyPokemonBoxFilters; if (typeof globalThis !== 'undefined') globalThis.applyPokemonBoxFilters = applyPokemonBoxFilters; }
if (typeof renderBoxFiltersHtml !== 'undefined') { if (typeof window !== 'undefined') window.renderBoxFiltersHtml = renderBoxFiltersHtml; if (typeof globalThis !== 'undefined') globalThis.renderBoxFiltersHtml = renderBoxFiltersHtml; }
if (typeof setBoxFilter !== 'undefined') { if (typeof window !== 'undefined') window.setBoxFilter = setBoxFilter; if (typeof globalThis !== 'undefined') globalThis.setBoxFilter = setBoxFilter; }
if (typeof resetBoxFilters !== 'undefined') { if (typeof window !== 'undefined') window.resetBoxFilters = resetBoxFilters; if (typeof globalThis !== 'undefined') globalThis.resetBoxFilters = resetBoxFilters; }
if (typeof setBoxSearch !== 'undefined') { if (typeof window !== 'undefined') window.setBoxSearch = setBoxSearch; if (typeof globalThis !== 'undefined') globalThis.setBoxSearch = setBoxSearch; }
if (typeof getRegionMeta !== 'undefined') { if (typeof window !== 'undefined') window.getRegionMeta = getRegionMeta; if (typeof globalThis !== 'undefined') globalThis.getRegionMeta = getRegionMeta; }
if (typeof getRegionDisplayName !== 'undefined') { if (typeof window !== 'undefined') window.getRegionDisplayName = getRegionDisplayName; if (typeof globalThis !== 'undefined') globalThis.getRegionDisplayName = getRegionDisplayName; }
if (typeof isPokemonNativeToRegion !== 'undefined') { if (typeof window !== 'undefined') window.isPokemonNativeToRegion = isPokemonNativeToRegion; if (typeof globalThis !== 'undefined') globalThis.isPokemonNativeToRegion = isPokemonNativeToRegion; }
if (typeof countCaughtInRegion !== 'undefined') { if (typeof window !== 'undefined') window.countCaughtInRegion = countCaughtInRegion; if (typeof globalThis !== 'undefined') globalThis.countCaughtInRegion = countCaughtInRegion; }
if (typeof getRegionPokedexTotal !== 'undefined') { if (typeof window !== 'undefined') window.getRegionPokedexTotal = getRegionPokedexTotal; if (typeof globalThis !== 'undefined') globalThis.getRegionPokedexTotal = getRegionPokedexTotal; }
if (typeof isRegionDexComplete !== 'undefined') { if (typeof window !== 'undefined') window.isRegionDexComplete = isRegionDexComplete; if (typeof globalThis !== 'undefined') globalThis.isRegionDexComplete = isRegionDexComplete; }
if (typeof isKalosCompleted !== 'undefined') { if (typeof window !== 'undefined') window.isKalosCompleted = isKalosCompleted; if (typeof globalThis !== 'undefined') globalThis.isKalosCompleted = isKalosCompleted; }
if (typeof ensureRegionProgress !== 'undefined') { if (typeof window !== 'undefined') window.ensureRegionProgress = ensureRegionProgress; if (typeof globalThis !== 'undefined') globalThis.ensureRegionProgress = ensureRegionProgress; }
if (typeof isRegionLeagueWon !== 'undefined') { if (typeof window !== 'undefined') window.isRegionLeagueWon = isRegionLeagueWon; if (typeof globalThis !== 'undefined') globalThis.isRegionLeagueWon = isRegionLeagueWon; }
if (typeof markRegionLeagueWon !== 'undefined') { if (typeof window !== 'undefined') window.markRegionLeagueWon = markRegionLeagueWon; if (typeof globalThis !== 'undefined') globalThis.markRegionLeagueWon = markRegionLeagueWon; }
if (typeof getRegionAccessStatus !== 'undefined') { if (typeof window !== 'undefined') window.getRegionAccessStatus = getRegionAccessStatus; if (typeof globalThis !== 'undefined') globalThis.getRegionAccessStatus = getRegionAccessStatus; }
if (typeof canAccessRegion !== 'undefined') { if (typeof window !== 'undefined') window.canAccessRegion = canAccessRegion; if (typeof globalThis !== 'undefined') globalThis.canAccessRegion = canAccessRegion; }
if (typeof regionAccessMessage !== 'undefined') { if (typeof window !== 'undefined') window.regionAccessMessage = regionAccessMessage; if (typeof globalThis !== 'undefined') globalThis.regionAccessMessage = regionAccessMessage; }
if (typeof regionRequiresNativeTeam !== 'undefined') { if (typeof window !== 'undefined') window.regionRequiresNativeTeam = regionRequiresNativeTeam; if (typeof globalThis !== 'undefined') globalThis.regionRequiresNativeTeam = regionRequiresNativeTeam; }
if (typeof getInvalidTeamPokemonForRegion !== 'undefined') { if (typeof window !== 'undefined') window.getInvalidTeamPokemonForRegion = getInvalidTeamPokemonForRegion; if (typeof globalThis !== 'undefined') globalThis.getInvalidTeamPokemonForRegion = getInvalidTeamPokemonForRegion; }
if (typeof canUseCurrentTeamForRegion !== 'undefined') { if (typeof window !== 'undefined') window.canUseCurrentTeamForRegion = canUseCurrentTeamForRegion; if (typeof globalThis !== 'undefined') globalThis.canUseCurrentTeamForRegion = canUseCurrentTeamForRegion; }
if (typeof regionTeamRestrictionMessage !== 'undefined') { if (typeof window !== 'undefined') window.regionTeamRestrictionMessage = regionTeamRestrictionMessage; if (typeof globalThis !== 'undefined') globalThis.regionTeamRestrictionMessage = regionTeamRestrictionMessage; }
if (typeof getLeagueChampionIdForRegion !== 'undefined') { if (typeof window !== 'undefined') window.getLeagueChampionIdForRegion = getLeagueChampionIdForRegion; if (typeof globalThis !== 'undefined') globalThis.getLeagueChampionIdForRegion = getLeagueChampionIdForRegion; }
if (typeof getLeagueRegionForChampion !== 'undefined') { if (typeof window !== 'undefined') window.getLeagueRegionForChampion = getLeagueRegionForChampion; if (typeof globalThis !== 'undefined') globalThis.getLeagueRegionForChampion = getLeagueRegionForChampion; }
if (typeof isLeagueChampionId !== 'undefined') { if (typeof window !== 'undefined') window.isLeagueChampionId = isLeagueChampionId; if (typeof globalThis !== 'undefined') globalThis.isLeagueChampionId = isLeagueChampionId; }
if (typeof getSpeciesTalents !== 'undefined') { if (typeof window !== 'undefined') window.getSpeciesTalents = getSpeciesTalents; if (typeof globalThis !== 'undefined') globalThis.getSpeciesTalents = getSpeciesTalents; }
if (typeof getTalentByKey !== 'undefined') { if (typeof window !== 'undefined') window.getTalentByKey = getTalentByKey; if (typeof globalThis !== 'undefined') globalThis.getTalentByKey = getTalentByKey; }
if (typeof getTalentRecord !== 'undefined') { if (typeof window !== 'undefined') window.getTalentRecord = getTalentRecord; if (typeof globalThis !== 'undefined') globalThis.getTalentRecord = getTalentRecord; }
if (typeof getTypeName !== 'undefined') { if (typeof window !== 'undefined') window.getTypeName = getTypeName; if (typeof globalThis !== 'undefined') globalThis.getTypeName = getTypeName; }
if (typeof getRarityLabel !== 'undefined') { if (typeof window !== 'undefined') window.getRarityLabel = getRarityLabel; if (typeof globalThis !== 'undefined') globalThis.getRarityLabel = getRarityLabel; }
if (typeof getTalentName !== 'undefined') { if (typeof window !== 'undefined') window.getTalentName = getTalentName; if (typeof globalThis !== 'undefined') globalThis.getTalentName = getTalentName; }
if (typeof getTalentDesc !== 'undefined') { if (typeof window !== 'undefined') window.getTalentDesc = getTalentDesc; if (typeof globalThis !== 'undefined') globalThis.getTalentDesc = getTalentDesc; }
if (typeof isTalentHidden !== 'undefined') { if (typeof window !== 'undefined') window.isTalentHidden = isTalentHidden; if (typeof globalThis !== 'undefined') globalThis.isTalentHidden = isTalentHidden; }
if (typeof unlockTalentForSpecies !== 'undefined') { if (typeof window !== 'undefined') window.unlockTalentForSpecies = unlockTalentForSpecies; if (typeof globalThis !== 'undefined') globalThis.unlockTalentForSpecies = unlockTalentForSpecies; }
if (typeof getMovesForSpeciesLevel !== 'undefined') { if (typeof window !== 'undefined') window.getMovesForSpeciesLevel = getMovesForSpeciesLevel; if (typeof globalThis !== 'undefined') globalThis.getMovesForSpeciesLevel = getMovesForSpeciesLevel; }
if (typeof getSpeciesMovePool !== 'undefined') { if (typeof window !== 'undefined') window.getSpeciesMovePool = getSpeciesMovePool; if (typeof globalThis !== 'undefined') globalThis.getSpeciesMovePool = getSpeciesMovePool; }
if (typeof getSpeciesFullLearnablePool !== 'undefined') { if (typeof window !== 'undefined') window.getSpeciesFullLearnablePool = getSpeciesFullLearnablePool; if (typeof globalThis !== 'undefined') globalThis.getSpeciesFullLearnablePool = getSpeciesFullLearnablePool; }
if (typeof getMoveLearnLevel !== 'undefined') { if (typeof window !== 'undefined') window.getMoveLearnLevel = getMoveLearnLevel; if (typeof globalThis !== 'undefined') globalThis.getMoveLearnLevel = getMoveLearnLevel; }
if (typeof getCtCsMoveIds !== 'undefined') { if (typeof window !== 'undefined') window.getCtCsMoveIds = getCtCsMoveIds; if (typeof globalThis !== 'undefined') globalThis.getCtCsMoveIds = getCtCsMoveIds; }
if (typeof getSpeciesTrainingOnlyPool !== 'undefined') { if (typeof window !== 'undefined') window.getSpeciesTrainingOnlyPool = getSpeciesTrainingOnlyPool; if (typeof globalThis !== 'undefined') globalThis.getSpeciesTrainingOnlyPool = getSpeciesTrainingOnlyPool; }
if (typeof getMoveCountForLevel !== 'undefined') { if (typeof window !== 'undefined') window.getMoveCountForLevel = getMoveCountForLevel; if (typeof globalThis !== 'undefined') globalThis.getMoveCountForLevel = getMoveCountForLevel; }
if (typeof getMovesForLevel !== 'undefined') { if (typeof window !== 'undefined') window.getMovesForLevel = getMovesForLevel; if (typeof globalThis !== 'undefined') globalThis.getMovesForLevel = getMovesForLevel; }
if (typeof calcStat !== 'undefined') { if (typeof window !== 'undefined') window.calcStat = calcStat; if (typeof globalThis !== 'undefined') globalThis.calcStat = calcStat; }
if (typeof recalcPokeStats !== 'undefined') { if (typeof window !== 'undefined') window.recalcPokeStats = recalcPokeStats; if (typeof globalThis !== 'undefined') globalThis.recalcPokeStats = recalcPokeStats; }
if (typeof renderStars !== 'undefined') { if (typeof window !== 'undefined') window.renderStars = renderStars; if (typeof globalThis !== 'undefined') globalThis.renderStars = renderStars; }
if (typeof isShinyDisplay !== 'undefined') { if (typeof window !== 'undefined') window.isShinyDisplay = isShinyDisplay; if (typeof globalThis !== 'undefined') globalThis.isShinyDisplay = isShinyDisplay; }
if (typeof xpForLevel !== 'undefined') { if (typeof window !== 'undefined') window.xpForLevel = xpForLevel; if (typeof globalThis !== 'undefined') globalThis.xpForLevel = xpForLevel; }
if (typeof applyRouteLinkGroups !== 'undefined') { if (typeof window !== 'undefined') window.applyRouteLinkGroups = applyRouteLinkGroups; if (typeof globalThis !== 'undefined') globalThis.applyRouteLinkGroups = applyRouteLinkGroups; }
if (typeof getLinkedRouteIds !== 'undefined') { if (typeof window !== 'undefined') window.getLinkedRouteIds = getLinkedRouteIds; if (typeof globalThis !== 'undefined') globalThis.getLinkedRouteIds = getLinkedRouteIds; }
if (typeof getDuplicateItemPayout !== 'undefined') { if (typeof window !== 'undefined') window.getDuplicateItemPayout = getDuplicateItemPayout; if (typeof globalThis !== 'undefined') globalThis.getDuplicateItemPayout = getDuplicateItemPayout; }
if (typeof grantRewardItem !== 'undefined') { if (typeof window !== 'undefined') window.grantRewardItem = grantRewardItem; if (typeof globalThis !== 'undefined') globalThis.grantRewardItem = grantRewardItem; }
if (typeof grantRewardItems !== 'undefined') { if (typeof window !== 'undefined') window.grantRewardItems = grantRewardItems; if (typeof globalThis !== 'undefined') globalThis.grantRewardItems = grantRewardItems; }
if (typeof getItemStackLimit !== 'undefined') { if (typeof window !== 'undefined') window.getItemStackLimit = getItemStackLimit; if (typeof globalThis !== 'undefined') globalThis.getItemStackLimit = getItemStackLimit; }
if (typeof getShopName !== 'undefined') { if (typeof window !== 'undefined') window.getShopName = getShopName; if (typeof globalThis !== 'undefined') globalThis.getShopName = getShopName; }
if (typeof getItemSourceList !== 'undefined') { if (typeof window !== 'undefined') window.getItemSourceList = getItemSourceList; if (typeof globalThis !== 'undefined') globalThis.getItemSourceList = getItemSourceList; }
if (typeof getMoveLearners !== 'undefined') { if (typeof window !== 'undefined') window.getMoveLearners = getMoveLearners; if (typeof globalThis !== 'undefined') globalThis.getMoveLearners = getMoveLearners; }
if (typeof getPokemonBaseStatTotal !== 'undefined') { if (typeof window !== 'undefined') window.getPokemonBaseStatTotal = getPokemonBaseStatTotal; if (typeof globalThis !== 'undefined') globalThis.getPokemonBaseStatTotal = getPokemonBaseStatTotal; }
if (typeof getPokemonRank !== 'undefined') { if (typeof window !== 'undefined') window.getPokemonRank = getPokemonRank; if (typeof globalThis !== 'undefined') globalThis.getPokemonRank = getPokemonRank; }
if (typeof rankValue !== 'undefined') { if (typeof window !== 'undefined') window.rankValue = rankValue; if (typeof globalThis !== 'undefined') globalThis.rankValue = rankValue; }
if (typeof rankAllowsPokemon !== 'undefined') { if (typeof window !== 'undefined') window.rankAllowsPokemon = rankAllowsPokemon; if (typeof globalThis !== 'undefined') globalThis.rankAllowsPokemon = rankAllowsPokemon; }
if (typeof rankBadgeHtml !== 'undefined') { if (typeof window !== 'undefined') window.rankBadgeHtml = rankBadgeHtml; if (typeof globalThis !== 'undefined') globalThis.rankBadgeHtml = rankBadgeHtml; }



if (typeof learnPkmnMove !== 'undefined') { if (typeof window !== 'undefined') window.learnPkmnMove = learnPkmnMove; if (typeof globalThis !== 'undefined') globalThis.learnPkmnMove = learnPkmnMove; }
if (typeof learnPkmnAbility !== 'undefined') { if (typeof window !== 'undefined') window.learnPkmnAbility = learnPkmnAbility; if (typeof globalThis !== 'undefined') globalThis.learnPkmnAbility = learnPkmnAbility; }
if (typeof isHiddenAbility !== 'undefined') { if (typeof window !== 'undefined') window.isHiddenAbility = isHiddenAbility; if (typeof globalThis !== 'undefined') globalThis.isHiddenAbility = isHiddenAbility; }
if (typeof getLocObj !== 'undefined') { if (typeof window !== 'undefined') window.getLocObj = getLocObj; if (typeof globalThis !== 'undefined') globalThis.getLocObj = getLocObj; }

let _boxUidCounter = 1;
function generateUniqueBoxId(speciesId) {
  if (typeof G === 'undefined' || !G || !G.collection) return String(speciesId);
  const strId = String(speciesId);
  if (!G.collection[strId]) return strId;
  let candidate = 'box_' + speciesId + '_' + Date.now() + '_' + (++_boxUidCounter);
  while (G.collection[candidate] || G.collection[String(candidate)]) {
    candidate = 'box_' + speciesId + '_' + Date.now() + '_' + Math.floor(Math.random() * 100000) + '_' + (++_boxUidCounter);
  }
  return candidate;
}
if (typeof window !== 'undefined') window.generateUniqueBoxId = generateUniqueBoxId;

// --- Exported globals ---
if (typeof boxFilterOptionHtml !== 'undefined') { if (typeof window !== 'undefined') window.boxFilterOptionHtml = boxFilterOptionHtml; if (typeof globalThis !== 'undefined') globalThis.boxFilterOptionHtml = boxFilterOptionHtml; }
if (typeof getAutoRouteLinkGroups !== 'undefined') { if (typeof window !== 'undefined') window.getAutoRouteLinkGroups = getAutoRouteLinkGroups; if (typeof globalThis !== 'undefined') globalThis.getAutoRouteLinkGroups = getAutoRouteLinkGroups; }
if (typeof getBoxFilterRegions !== 'undefined') { if (typeof window !== 'undefined') window.getBoxFilterRegions = getBoxFilterRegions; if (typeof globalThis !== 'undefined') globalThis.getBoxFilterRegions = getBoxFilterRegions; }
if (typeof getBoxFilterTypes !== 'undefined') { if (typeof window !== 'undefined') window.getBoxFilterTypes = getBoxFilterTypes; if (typeof globalThis !== 'undefined') globalThis.getBoxFilterTypes = getBoxFilterTypes; }
if (typeof getPreviousRegion !== 'undefined') { if (typeof window !== 'undefined') window.getPreviousRegion = getPreviousRegion; if (typeof globalThis !== 'undefined') globalThis.getPreviousRegion = getPreviousRegion; }

// Wave 40 — native ESM module: grouped export of the same names as the
// classic surface kept above/here (bodies unchanged).
export {
  REGION_ORDER,
  ensureBoxFilters,
  getPokemonRegion,
  getUnlockedRegionsForPokedex,
  getUnlockedDexIds,
  isEvolutionTargetObtained,
  canPokemonEvolveToUnowned,
  pokemonMatchesBoxFilters,
  applyPokemonBoxFilters,
  renderBoxFiltersHtml,
  setBoxFilter,
  resetBoxFilters,
  setBoxSearch,
  getRegionMeta,
  getRegionDisplayName,
  isPokemonNativeToRegion,
  countCaughtInRegion,
  getRegionPokedexTotal,
  isRegionDexComplete,
  isKalosCompleted,
  ensureRegionProgress,
  isRegionLeagueWon,
  markRegionLeagueWon,
  getRegionAccessStatus,
  canAccessRegion,
  regionAccessMessage,
  regionRequiresNativeTeam,
  getInvalidTeamPokemonForRegion,
  canUseCurrentTeamForRegion,
  regionTeamRestrictionMessage,
  getLeagueChampionIdForRegion,
  getLeagueRegionForChampion,
  isLeagueChampionId,
  getSpeciesTalents,
  getTalentByKey,
  getTalentRecord,
  getTypeName,
  getRarityLabel,
  getTalentName,
  getTalentDesc,
  isTalentHidden,
  unlockTalentForSpecies,
  getMovesForSpeciesLevel,
  getSpeciesMovePool,
  getSpeciesFullLearnablePool,
  getMoveLearnLevel,
  getCtCsMoveIds,
  getSpeciesTrainingOnlyPool,
  getMoveCountForLevel,
  getMovesForLevel,
  calcStat,
  recalcPokeStats,
  renderStars,
  isShinyDisplay,
  xpForLevel,
  applyRouteLinkGroups,
  getLinkedRouteIds,
  getDuplicateItemPayout,
  grantRewardItem,
  grantRewardItems,
  getItemStackLimit,
  getShopName,
  getItemSourceList,
  getMoveLearners,
  getPokemonBaseStatTotal,
  getPokemonRank,
  rankValue,
  rankAllowsPokemon,
  rankBadgeHtml,
  learnPkmnMove,
  learnPkmnAbility,
  isHiddenAbility,
  getLocObj,
  generateUniqueBoxId,
  boxFilterOptionHtml,
  getAutoRouteLinkGroups,
  getBoxFilterRegions,
  getBoxFilterTypes,
  getPreviousRegion,
};

// Wave 42 — engine-registry absorption: these dispatched actions
// register in the registry (registry-first dispatcher = engine
// indirection instead of the window fallback); the window surface is kept for
// classic cross-module consumers (documented duplicate, T2-B).
// Wave 43 — same measured lesson as closeConfirm (game-utils): this module
// lives in an early chunk evaluated BEFORE the engine chunk — microtask re-arm.
const __pwV43RegisterSetBoxSearch = () => { if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('setBoxSearch', setBoxSearch); } catch (_) {} } };
__pwV43RegisterSetBoxSearch();
if ((typeof PokeActions === 'undefined' || !PokeActions || (typeof PokeActions.has === 'function' && !PokeActions.has('setBoxSearch')))
  && typeof queueMicrotask === 'function') {
  queueMicrotask(__pwV43RegisterSetBoxSearch);
}
