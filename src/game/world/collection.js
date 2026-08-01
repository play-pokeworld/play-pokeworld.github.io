// =============================================================================
// Shiny rolls — règles joueur (2026-07)
// -----------------------------------------------------------------------------
// • Taux de BASE : 1/4096
// • Charme Chroma : passe le taux à 1/2048, UNIQUEMENT si l'espèce appartient
//   à une région dont le Pokédex est complété à 100 %.
//   Ex. : dex Kanto 100 % → bonus sur les espèces Kanto seulement.
//         dex Kanto + Johto 100 % → bonus sur Kanto ET Johto.
// • Le Charme s'obtient en complétant 100 % d'un Pokédex régional (plus après
//   la Ligue). Chaque région complétée étend le bonus.
// • IMPORTANT : le roll shiny ne doit PAS décider l'apparence du wild sur la
//   route pour « griller » des rolls. On roll à la CAPTURE (et à l'incubation /
//   fossile). Les rencontres wild sont toujours non-shiny visuellement ; le
//   shiny se révèle à la capture réussie.
// • Drapeaux ORAS : aucun bonus shiny.
// • Talent GoodAsGold : +15 % sur le taux effectif (multiplicateur doux).
// =============================================================================

const SHINY_BASE_RATE = 1 / 4096;
const SHINY_CHARM_RATE = 1 / 2048;

/**
 * @param {number|string|null} speciesId
 * @returns {boolean}
 */
function rollShiny(speciesId) {
  const rate = getShinyRateForSpecies(speciesId);
  return Math.random() < rate;
}

/**
 * Taux shiny effectif pour une espèce (0..1).
 * Charme régional : 1/2048 si dex de la région native à 100 %, sinon 1/4096.
 */
function getShinyRateForSpecies(speciesId) {
  let rate = SHINY_BASE_RATE;
  const nid = Number(speciesId);
  if (Number.isFinite(nid) && nid > 0 && hasRegionalShinyCharmForSpecies(nid)) {
    rate = SHINY_CHARM_RATE;
  }
  // Talent d'équipe (GoodAsGold, etc.)
  if (typeof getTeamShinyRateMultiplier === 'function') {
    try {
      const mult = Number(getTeamShinyRateMultiplier());
      if (Number.isFinite(mult) && mult > 0) rate = Math.min(1, rate * mult);
    } catch (_) { /* noop */ }
  }
  return rate;
}

/** True si le joueur possède le charme ET que l'espèce est native d'un dex 100 %. */
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
    // Flag persistant (posé à la complétion) — tolère un recalcul partiel.
    if (!complete && typeof G !== 'undefined' && G && G.shinyCharmRegions && G.shinyCharmRegions[region]) {
      complete = true;
    }
    if (complete) out.push(region);
  }
  return out;
}

/** Compat : ancien API « nombre de lancers » — 1 toujours (on n'utilise plus de multi-rolls). */
function getShinyCharmRollsForSpecies(speciesId) {
  // Conservé pour UI/tests legacy. 1 = pas de multi-roll ; le taux est géré par getShinyRateForSpecies.
  return 1;
}

// Appelé après captures / évolutions / imports pour décerner le Charme et
// enregistrer les régions complétées.
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

  // Obtention : premier Pokédex régional à 100 % (plus après la Ligue).
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

  // Migration : ancien charme post-Ligue sans dex 100 % → objet gardé, bonus inerte.

  return {
    unlocked: (G.inventory['shiny_charm'] || 0) > 0,
    regions: getShinyCharmCompletedRegions(),
    newly,
  };
}

// Multiplicateur doux via talents d'équipe (GoodAsGold ≈ +15 %).
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

function speciesOwned(id){
 const nid = Number(id);
 if(G.team.some(p=>p && Number(p.id)===nid)) return true;
 if(G.collection[nid] || G.collection[String(nid)]) return true;
 for(const k in (G.collection||{})){
   const poke = G.collection[k];
   if(poke && Number(poke.id)===nid) return true;
 }
 for(const s of (G.hatchery||[])){
   if(s && s.poke && Number(s.poke.id)===nid) return true;
 }
 for(const s of (G.training||[])){
   if(s && s.poke && Number(s.poke.id)===nid) return true;
 }
 if(G.pokedex && G.pokedex[nid] && G.pokedex[nid].caught) return true;
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

// Présence d'une espèce dans la BOÎTE PC uniquement (l'équipe active ne
// compte pas) — condition d'affichage des panneaux de formes (Morphéo au
// Labo Météo, Deoxys à Autopia).
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
 for(const [idStr,poke] of Object.entries(G.collection||{})){
 if(!poke) continue;
 const cid = poke.id || parseInt(String(idStr).replace(/\D/g, ''), 10) || 1;
 out.push({id: idStr, cleanId: +cid, poke});
 }
 out.sort((a,b)=>a.cleanId-b.cleanId);
 return out;
}


// --- Migrated to ES module, globals exposed ---
if (typeof rollShiny !== 'undefined' && typeof window !== 'undefined') window.rollShiny = rollShiny;
if (typeof getShinyRateForSpecies !== 'undefined' && typeof window !== 'undefined') window.getShinyRateForSpecies = getShinyRateForSpecies;
if (typeof hasRegionalShinyCharmForSpecies !== 'undefined' && typeof window !== 'undefined') window.hasRegionalShinyCharmForSpecies = hasRegionalShinyCharmForSpecies;
if (typeof getShinyCharmRollsForSpecies !== 'undefined' && typeof window !== 'undefined') window.getShinyCharmRollsForSpecies = getShinyCharmRollsForSpecies;
if (typeof getShinyCharmCompletedRegions !== 'undefined' && typeof window !== 'undefined') window.getShinyCharmCompletedRegions = getShinyCharmCompletedRegions;
if (typeof syncShinyCharmProgress !== 'undefined' && typeof window !== 'undefined') window.syncShinyCharmProgress = syncShinyCharmProgress;
if (typeof getTeamShinyRateMultiplier !== 'undefined' && typeof window !== 'undefined') window.getTeamShinyRateMultiplier = getTeamShinyRateMultiplier;
if (typeof getEffectiveShinyRate !== 'undefined' && typeof window !== 'undefined') window.getEffectiveShinyRate = getEffectiveShinyRate;
if (typeof SHINY_BASE_RATE !== 'undefined' && typeof window !== 'undefined') window.SHINY_BASE_RATE = SHINY_BASE_RATE;
if (typeof SHINY_CHARM_RATE !== 'undefined' && typeof window !== 'undefined') window.SHINY_CHARM_RATE = SHINY_CHARM_RATE;
if (typeof speciesOwned !== 'undefined' && typeof window !== 'undefined') window.speciesOwned = speciesOwned;
if (typeof getSpeciesInstance !== 'undefined' && typeof window !== 'undefined') window.getSpeciesInstance = getSpeciesInstance;
if (typeof speciesInBox !== 'undefined' && typeof window !== 'undefined') window.speciesInBox = speciesInBox;
if (typeof isSpeciesShiny !== 'undefined' && typeof window !== 'undefined') window.isSpeciesShiny = isSpeciesShiny;
if (typeof syncShinyState !== 'undefined' && typeof window !== 'undefined') window.syncShinyState = syncShinyState;
if (typeof unlockShinyForSpecies !== 'undefined' && typeof window !== 'undefined') window.unlockShinyForSpecies = unlockShinyForSpecies;
if (typeof locCompletion !== 'undefined' && typeof window !== 'undefined') window.locCompletion = locCompletion;
if (typeof boxedEntries !== 'undefined' && typeof window !== 'undefined') window.boxedEntries = boxedEntries;
