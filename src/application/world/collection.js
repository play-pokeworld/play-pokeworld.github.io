// Wave 41 — native ESM module. The classic surface (window/globalThis) is
// kept: classic consumers, VM harnesses and the engine registry.
// =============================================================================
// Shiny rolls — regles player (2026-07)
// -----------------------------------------------------------------------------
// • BASE rate: 1/4096
// • With the Shiny Charm: 1/2048, only on species of a region whose Pokedex
//   is 100% complete.
//   E.g.: Kanto dex 100% -> bonus on Kanto species only.
//         Kanto + Johto dex 100% -> bonus on Kanto and Johto.
// • The Charm is obtained by completing 100% of a regional Pokedex (after
//   the League). Each completed region extends the bonus.
// • IMPORTANT: the shiny roll must not decide the wild encounter's on-route
//   appearance (that would "burn" rolls). The roll happens at CAPTURE (and
//   at incubation / fossil revival). Wild encounters always look non-shiny;
//   the shiny is revealed on a successful capture.
// • ORAS flags: no shiny bonus.
// • GoodAsGold ability: +15% on the effective rate (soft multiplier).
// =============================================================================

export const SHINY_BASE_RATE = 1 / 4096;
export const SHINY_CHARM_RATE = 1 / 2048;

function rollShiny(speciesId) {
  const rate = getShinyRateForSpecies(speciesId);
  return Math.random() < rate;
}

function getShinyRateForSpecies(speciesId) {
  let rate = SHINY_BASE_RATE;
  const nid = Number(speciesId);
  if (Number.isFinite(nid) && nid > 0 && hasRegionalShinyCharmForSpecies(nid)) {
    rate = SHINY_CHARM_RATE;
  }
  if (typeof getTeamShinyRateMultiplier === 'function') {
    try {
      const mult = Number(getTeamShinyRateMultiplier());
      if (Number.isFinite(mult) && mult > 0) rate = Math.min(1, rate * mult);
    } catch (_) { /* noop */ }
  }
  return rate;
}

function hasRegionalShinyCharmForSpecies(speciesId) {
  const nid = Number(speciesId);
  if (!Number.isFinite(nid) || nid <= 0) return false;
  if (typeof G === 'undefined' || !G || !G.inventory || !(G.inventory['shiny_charm'] > 0)) {
    return false;
  }
  const completed = getShinyCharmCompletedRegions();
  if (!completed.length) return false;
  for (const region of completed) {
    if (typeof isPokemonNativeToRegion === 'function' && isPokemonNativeToRegion(nid, region)) {
      return true;
    }
  }
  return false;
}

function getShinyCharmCompletedRegions() {
  const out = [];
  const order = (typeof REGION_ORDER !== 'undefined' && Array.isArray(REGION_ORDER))
    ? REGION_ORDER
    : ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea'];
  for (const region of order) {
    let complete = false;
    if (typeof isRegionDexComplete === 'function') {
      try { complete = !!isRegionDexComplete(region); } catch (_) { complete = false; }
    }
    if (!complete && typeof G !== 'undefined' && G && G.shinyCharmRegions && G.shinyCharmRegions[region]) {
      complete = true;
    }
    if (complete) out.push(region);
  }
  return out;
}

function getShinyCharmRollsForSpecies(_speciesId) {
  return 1;
}

function syncShinyCharmProgress() {
  if (typeof G === 'undefined' || !G) return { unlocked: false, regions: [], newly: [] };
  if (!G.shinyCharmRegions || typeof G.shinyCharmRegions !== 'object') G.shinyCharmRegions = {};
  if (!G.inventory || typeof G.inventory !== 'object') G.inventory = {};

  const order = (typeof REGION_ORDER !== 'undefined' && Array.isArray(REGION_ORDER))
    ? REGION_ORDER
    : ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea'];

  const newly = [];
  for (const region of order) {
    let complete = false;
    if (typeof isRegionDexComplete === 'function') {
      try { complete = !!isRegionDexComplete(region); } catch (_) { complete = false; }
    }
    if (complete && !G.shinyCharmRegions[region]) {
      G.shinyCharmRegions[region] = Date.now();
      newly.push(region);
    }
  }

  const completedCount = order.filter((r) => !!G.shinyCharmRegions[r]).length;
  const hadCharm = (G.inventory['shiny_charm'] || 0) > 0;

  if (completedCount > 0 && !hadCharm) {
    G.inventory['shiny_charm'] = 1;
    if (typeof notify === 'function') {
      const r0 = newly[0] || order.find((r) => G.shinyCharmRegions[r]);
      const rName = (typeof getRegionDisplayName === 'function') ? getRegionDisplayName(r0) : r0;
      notify(
        (G.lang === 'en')
          ? `✨ Shiny Charm obtained! Odds 1/2048 for ${rName} species.`
          : `✨ Charme Chroma obtenu ! Taux 1/2048 sur les espèces de ${rName}.`,
        'var(--yellow, #ffd54f)'
      );
    }
  } else if (newly.length && hadCharm && typeof notify === 'function') {
    for (const r of newly) {
      const rName = (typeof getRegionDisplayName === 'function') ? getRegionDisplayName(r) : r;
      notify(
        (G.lang === 'en')
          ? `✨ Pokédex ${rName} complete — Shiny Charm now covers this region (1/2048).`
          : `✨ Pokédex ${rName} complété — le Charme Chroma couvre cette région (1/2048).`,
        'var(--yellow, #ffd54f)'
      );
    }
  }

  return {
    unlocked: (G.inventory['shiny_charm'] || 0) > 0,
    regions: getShinyCharmCompletedRegions(),
    newly,
  };
}

function getTeamShinyRateMultiplier() {
  let mult = 1;
  if (typeof G === 'undefined' || !G || !Array.isArray(G.team)) return mult;
  const talents = new Set();
  for (const p of G.team) {
    if (p && p.talent) talents.add(String(p.talent).toLowerCase());
  }
  if (talents.has('goodasgold')) mult *= 1.15;
  return mult;
}

function getEffectiveShinyRate(speciesId) {
  return getShinyRateForSpecies(speciesId);
}

// ---- Possession of espece ----
 // Collection PC storage and duplicate resolution
// Note: the pokedex is intentionally NOT used here, to avoid the capture
// bug where G.pokedex[caught]=true was set BEFORE the alreadyOwned check,
// making every first capture count as a duplicate (Hoenn empty-box bug).
function speciesOwnedInstance(id){
 const nid = Number(id);
 if(!G) return false;
 if(Array.isArray(G.team) && G.team.some(p=>p && Number(p.id)===nid)) return true;
 if(G.collection){
   if(G.collection[nid] || G.collection[String(nid)]) return true;
   for(const k in G.collection){
     const poke = G.collection[k];
     if(poke && Number(poke.id)===nid) return true;
   }
 }
 if(Array.isArray(G.hatchery)){
   for(const s of G.hatchery){
     if(s && s.poke && Number(s.poke.id)===nid) return true;
   }
 }
 if(Array.isArray(G.training)){
   for(const s of G.training){
     if(s && s.poke && Number(s.poke.id)===nid) return true;
   }
 }
 return false;
}

// History: speciesOwned also included the pokedex (for route counting).
// Compatibility kept, but implemented as instance + pokedex.
function speciesOwned(id){
 const nid = Number(id);
 if(speciesOwnedInstance(nid)) return true;
 if(G && G.pokedex && G.pokedex[nid] && G.pokedex[nid].caught) return true;
 return false;
}

function getSpeciesInstance(id){
 const nid=Number(id);
 const inTeam=G.team.find(p=>Number(p.id)===nid);
 if(inTeam) return {loc:'team', poke:inTeam};
 const box = G.collection[nid] || G.collection[String(nid)] || null;
 if(box) return {loc:'box', poke: box};
 for(const k in G.collection){
 const poke=G.collection[k];
 if(poke && Number(poke.id)===nid) return {loc:'box', poke};
 }
 return null;
}

function speciesInBox(id){
 const nid = Number(id);
 if(!G || !G.collection) return false;
 if(G.collection[nid] || G.collection[String(nid)]) return true;
 for(const k in G.collection){
  const poke = G.collection[k];
  if(poke && Number(poke.id) === nid) return true;
 }
 return false;
}
function isSpeciesShiny(id){
 const nid = Number(id);
 if(!nid) return false;
 if(G.pokedex && G.pokedex[nid]?.shiny) return true;
 if(G.team.some(p=>Number(p.id)===nid && (p.shinyUnlocked || p.shinyActive || p.shiny))) return true;
 const box = G.collection[nid] || G.collection[String(nid)];
 if(box && (box.shinyUnlocked || box.shinyActive || box.shiny)) return true;
 for(const k in G.collection){
 const poke = G.collection[k];
 if(poke && Number(poke.id)===nid && (poke.shinyUnlocked || poke.shinyActive || poke.shiny)) return true;
 }
 return false;
}
function syncShinyState(){
 if(!G.pokedex) G.pokedex = {};
 const shinySpecies = new Set();
 for(const idStr in G.pokedex){
 if(G.pokedex[idStr]?.shiny) shinySpecies.add(Number(idStr));
 }
 for(const p of G.team){
 if(p && (p.shinyUnlocked || p.shinyActive || p.shiny)) shinySpecies.add(Number(p.id));
 }
 for(const k in G.collection){
 const p = G.collection[k];
 if(p && (p.shinyUnlocked || p.shinyActive || p.shiny)) shinySpecies.add(Number(p.id));
 }
 for(const nid of shinySpecies){
 if(!G.pokedex[nid]) G.pokedex[nid] = {seen:true, caught:true};
 G.pokedex[nid].shiny = true;
 }
 for(const p of G.team){
 if(p && shinySpecies.has(Number(p.id))){
 p.shinyUnlocked = true;
 if(p.shinyActive === undefined) p.shinyActive = true;
 p.shiny = !!p.shinyActive;
 }
 }
 for(const k in G.collection){
 const p = G.collection[k];
 if(p && shinySpecies.has(Number(p.id))){
 p.shinyUnlocked = true;
 if(p.shinyActive === undefined) p.shinyActive = true;
 p.shiny = !!p.shinyActive;
 }
 }
}
function unlockShinyForSpecies(id){
 const nid = Number(id);
 if(!G.pokedex[nid]) G.pokedex[nid] = {seen:true, caught:true};
 G.pokedex[nid].shiny = true;
 for(const p of G.team){
 if(Number(p.id)===nid){
 p.shinyUnlocked = true;
 p.shinyActive = true;
 p.shiny = true;
 }
 }
 const box = G.collection[nid] || G.collection[String(nid)];
 if(box){
 box.shinyUnlocked = true;
 box.shinyActive = true;
 box.shiny = true;
 }
 for(const k in G.collection){
 const poke = G.collection[k];
 if(poke && Number(poke.id)===nid){
 poke.shinyUnlocked = true;
 poke.shinyActive = true;
 poke.shiny = true;
 }
 }
}
function locCompletion(locId){
 const idsToCheck = (typeof getLinkedRouteIds === 'function') ? getLinkedRouteIds(locId) : [locId];
 const species = new Set();
 for(const id of idsToCheck){
  const loc = getLocObj(id);
  if(!loc || !loc.wild || !loc.wild.length) continue;
  for(const w of loc.wild) species.add(Number(w[0]));
 }
 if(!species.size) return null;
 const ids = Array.from(species).filter(Boolean);
 const caught=ids.filter(id=>speciesOwned(id)).length;
 return {caught, total:ids.length, ids};
}
function boxedEntries(){
 const out=[];
 // On ignore the cles not-pokemon (ex: eventuel __isProxy accidentel)
 for(const [idStr,poke] of Object.entries(G.collection||{})){
 if(!poke || typeof poke !== 'object') continue;
 if(!('id' in poke)) continue;
 // Filters out technical entries (keys starting with __)
 if(String(idStr).startsWith('__')) continue;
 const cid = poke.id || parseInt(String(idStr).replace(/\D/g, ''), 10) || 1;
 out.push({id: idStr, cleanId: +cid, poke});
 }
 out.sort((a,b)=>a.cleanId-b.cleanId);
 return out;
}

// ---- Simple anti-duplicate system, no Proxy ----
// Centralized logic: if the species is already owned, 10% chance of +1 IV on the existing one
 // Collection PC storage and duplicate resolution
function findExistingPokemonBySpecies(speciesId){
  const nid = Number(speciesId);
  if(!G) return null;
  if(Array.isArray(G.team)){
    const t = G.team.find(p=>p && Number(p.id)===nid);
    if(t) return t;
  }
  if(G.collection){
    for(const k in G.collection){
      const p = G.collection[k];
      if(p && Number(p.id)===nid) return p;
    }
  }
  return null;
}

function giveIvBonusToExisting(existing){
  if(!existing) return null;
  if(!existing.ivs) existing.ivs = {hp:0,atk:0,def:0,spa:0,spd:0,spe:0};
  const avail = ['hp','atk','def','spa','spd','spe'].filter(k => (existing.ivs[k]||0) < 6);
  if(!avail.length) return null;
  const pick = avail[Math.floor(Math.random()*avail.length)];
  existing.ivs[pick] = (existing.ivs[pick]||0)+1;
  try { if (typeof recalcPokeStats === 'function') recalcPokeStats(existing); } catch(_){}
  return pick;
}

 // Collection PC storage and duplicate resolution
 // Collection PC storage and duplicate resolution
function addPokemonRespectingUniqueness(poke, opts={}){
  // opts: {allowDuplicate: bool} // for debug, but by defaut false
  if(!poke || !poke.id) return {added:false};
  const nid = Number(poke.id);
  const existing = findExistingPokemonBySpecies(nid);
  if(existing && !opts.allowDuplicate){
    // Duplicate -> 10% IV
    let ivKey = null;
    if(Math.random() < 0.1){
      ivKey = giveIvBonusToExisting(existing);
      if(ivKey && typeof notify === 'function'){
        try { notify(`${existing.name} déjà possédé : +1 IV ${ivKey.toUpperCase()} !`, 'var(--green)'); } catch(_){}
      }
    }
    return {added:false, ivBonus: ivKey, existing, duplicate:true};
  }
  // addition normal
  if(G.team.length < 6 && opts.preferTeam !== false && !existing){
    // if the team is not full, put in team unless box is forced
    // (original logic: team only if <6 members, otherwise box)
     // Collection PC storage and duplicate resolution
     // Collection PC storage and duplicate resolution
  }
  const boxId = (typeof generateUniqueBoxId === 'function') ? generateUniqueBoxId(nid) : String(nid);
  G.collection[boxId] = poke;
  return {added:true, boxId, existing:null, duplicate:false};
}

// Duplicate cleanup to repair old corrupted saves.
// Keep the best (max total IV or level) per species, give 10% IV to the keeper for each removed duplicate.
function deduplicateCollectionAndFixBox(){
  if(!G) return 0;
  if(!G.collection) G.collection = {};
  if(!G.team) G.team = [];
  let removed = 0;

  // Etape 1 : box — regrouper by espece id numerique exact (forms differentes = id differents therefore ok)
  const bestBySpecies = new Map(); // sid -> {key, poke, ivTotal}
  const dupKeys = [];
  for(const [key, poke] of Object.entries(G.collection)){
    if(!poke || typeof poke !== 'object' || !('id' in poke)) continue;
    if(String(key).startsWith('__')) { dupKeys.push(key); continue; }
    const sid = Number(poke.id);
    if(!Number.isFinite(sid)) continue;
    const ivTot = Object.values(poke.ivs||{}).reduce((a,b)=>a+(Number(b)||0),0);
    const lvl = Number(poke.level||0);
    const score = ivTot*1000 + lvl; // compare IV then level
    if(!bestBySpecies.has(sid)){
      bestBySpecies.set(sid, {key, poke, score});
    } else {
      const prev = bestBySpecies.get(sid);
      // keep the best, delete the other
      if(score > prev.score){
        dupKeys.push(prev.key);
        bestBySpecies.set(sid, {key, poke, score});
      } else {
        dupKeys.push(key);
      }
      // 10%: IV bonus on the kept one
      if(Math.random() < 0.1){
        giveIvBonusToExisting(bestBySpecies.get(sid).poke);
      }
    }
  }
  for(const k of dupKeys){
    delete G.collection[k];
    removed++;
  }

  // Step 2: team — if a team Pokemon is already in the box, keep it in
  // the team and delete the box copy, or vice versa
  // Target outcome: at most 1 copy per species across team+box
  const seen = new Set();
  for(const {poke} of bestBySpecies.values()){
    seen.add(Number(poke.id));
  }
  // Walk the team backwards for splice safety
  for(let i=G.team.length-1;i>=0;i--){
    const p = G.team[i];
    if(!p) continue;
    const sid = Number(p.id);
    if(seen.has(sid)){
      // already in box -> team duplicate, delete it (with IV bonus)
      if(Math.random() < 0.1){
        const exist = findExistingPokemonBySpecies(sid);
        if(exist && exist !== p) giveIvBonusToExisting(exist);
      }
      G.team.splice(i,1);
      removed++;
    } else {
      seen.add(sid);
    }
  }

  if(removed>0){
    try { if (typeof notify === 'function') notify(`${removed} doublon(s) nettoyé(s) – 10% IV appliqué`, 'var(--green)'); } catch(_){}
    try { if (typeof saveGame === 'function') saveGame(); } catch(_){}
  }
  return removed;
}

// Expose globals (compat import ES)
// Wave 41 — surface kept (window → globalThis block, same scope).
if (typeof globalThis !== 'undefined') globalThis.speciesOwnedInstance = speciesOwnedInstance;
if (typeof globalThis !== 'undefined') globalThis.findExistingPokemonBySpecies = findExistingPokemonBySpecies;
if (typeof globalThis !== 'undefined') globalThis.giveIvBonusToExisting = giveIvBonusToExisting;
if (typeof globalThis !== 'undefined') globalThis.addPokemonRespectingUniqueness = addPokemonRespectingUniqueness;
if (typeof globalThis !== 'undefined') globalThis.deduplicateCollectionAndFixBox = deduplicateCollectionAndFixBox;

// --- Migrated to ES module, globals exposed ---
if (typeof rollShiny !== 'undefined') { if (typeof window !== 'undefined') window.rollShiny = rollShiny; if (typeof globalThis !== 'undefined') globalThis.rollShiny = rollShiny; }
if (typeof getShinyRateForSpecies !== 'undefined') { if (typeof window !== 'undefined') window.getShinyRateForSpecies = getShinyRateForSpecies; if (typeof globalThis !== 'undefined') globalThis.getShinyRateForSpecies = getShinyRateForSpecies; }
if (typeof hasRegionalShinyCharmForSpecies !== 'undefined') { if (typeof window !== 'undefined') window.hasRegionalShinyCharmForSpecies = hasRegionalShinyCharmForSpecies; if (typeof globalThis !== 'undefined') globalThis.hasRegionalShinyCharmForSpecies = hasRegionalShinyCharmForSpecies; }
if (typeof getShinyCharmRollsForSpecies !== 'undefined') { if (typeof window !== 'undefined') window.getShinyCharmRollsForSpecies = getShinyCharmRollsForSpecies; if (typeof globalThis !== 'undefined') globalThis.getShinyCharmRollsForSpecies = getShinyCharmRollsForSpecies; }
if (typeof getShinyCharmCompletedRegions !== 'undefined') { if (typeof window !== 'undefined') window.getShinyCharmCompletedRegions = getShinyCharmCompletedRegions; if (typeof globalThis !== 'undefined') globalThis.getShinyCharmCompletedRegions = getShinyCharmCompletedRegions; }
if (typeof syncShinyCharmProgress !== 'undefined') { if (typeof window !== 'undefined') window.syncShinyCharmProgress = syncShinyCharmProgress; if (typeof globalThis !== 'undefined') globalThis.syncShinyCharmProgress = syncShinyCharmProgress; }
if (typeof getTeamShinyRateMultiplier !== 'undefined') { if (typeof window !== 'undefined') window.getTeamShinyRateMultiplier = getTeamShinyRateMultiplier; if (typeof globalThis !== 'undefined') globalThis.getTeamShinyRateMultiplier = getTeamShinyRateMultiplier; }
if (typeof getEffectiveShinyRate !== 'undefined') { if (typeof window !== 'undefined') window.getEffectiveShinyRate = getEffectiveShinyRate; if (typeof globalThis !== 'undefined') globalThis.getEffectiveShinyRate = getEffectiveShinyRate; }
if (typeof SHINY_BASE_RATE !== 'undefined') { if (typeof window !== 'undefined') window.SHINY_BASE_RATE = SHINY_BASE_RATE; if (typeof globalThis !== 'undefined') globalThis.SHINY_BASE_RATE = SHINY_BASE_RATE; }
if (typeof SHINY_CHARM_RATE !== 'undefined') { if (typeof window !== 'undefined') window.SHINY_CHARM_RATE = SHINY_CHARM_RATE; if (typeof globalThis !== 'undefined') globalThis.SHINY_CHARM_RATE = SHINY_CHARM_RATE; }
if (typeof speciesOwned !== 'undefined') { if (typeof window !== 'undefined') window.speciesOwned = speciesOwned; if (typeof globalThis !== 'undefined') globalThis.speciesOwned = speciesOwned; }
if (typeof speciesOwnedInstance !== 'undefined') { if (typeof window !== 'undefined') window.speciesOwnedInstance = speciesOwnedInstance; if (typeof globalThis !== 'undefined') globalThis.speciesOwnedInstance = speciesOwnedInstance; }
if (typeof getSpeciesInstance !== 'undefined') { if (typeof window !== 'undefined') window.getSpeciesInstance = getSpeciesInstance; if (typeof globalThis !== 'undefined') globalThis.getSpeciesInstance = getSpeciesInstance; }
if (typeof speciesInBox !== 'undefined') { if (typeof window !== 'undefined') window.speciesInBox = speciesInBox; if (typeof globalThis !== 'undefined') globalThis.speciesInBox = speciesInBox; }
if (typeof isSpeciesShiny !== 'undefined') { if (typeof window !== 'undefined') window.isSpeciesShiny = isSpeciesShiny; if (typeof globalThis !== 'undefined') globalThis.isSpeciesShiny = isSpeciesShiny; }
if (typeof syncShinyState !== 'undefined') { if (typeof window !== 'undefined') window.syncShinyState = syncShinyState; if (typeof globalThis !== 'undefined') globalThis.syncShinyState = syncShinyState; }
if (typeof unlockShinyForSpecies !== 'undefined') { if (typeof window !== 'undefined') window.unlockShinyForSpecies = unlockShinyForSpecies; if (typeof globalThis !== 'undefined') globalThis.unlockShinyForSpecies = unlockShinyForSpecies; }
if (typeof locCompletion !== 'undefined') { if (typeof window !== 'undefined') window.locCompletion = locCompletion; if (typeof globalThis !== 'undefined') globalThis.locCompletion = locCompletion; }
if (typeof boxedEntries !== 'undefined') { if (typeof window !== 'undefined') window.boxedEntries = boxedEntries; if (typeof globalThis !== 'undefined') globalThis.boxedEntries = boxedEntries; }

// Wave 41 — native ESM module: exports the same names as the
// classic surface kept above (bodies unchanged).
export {
  speciesOwnedInstance,
  findExistingPokemonBySpecies,
  giveIvBonusToExisting,
  addPokemonRespectingUniqueness,
  deduplicateCollectionAndFixBox,
  rollShiny,
  getShinyRateForSpecies,
  hasRegionalShinyCharmForSpecies,
  getShinyCharmRollsForSpecies,
  getShinyCharmCompletedRegions,
  syncShinyCharmProgress,
  getTeamShinyRateMultiplier,
  getEffectiveShinyRate,
  speciesOwned,
  getSpeciesInstance,
  speciesInBox,
  isSpeciesShiny,
  syncShinyState,
  unlockShinyForSpecies,
  locCompletion,
  boxedEntries,
};
