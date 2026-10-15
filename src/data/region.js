import { pwLateLink } from '../core/late-link.js';
// V7 · DBT-09 — extrait de src/data/game-helpers.js (découpage par domaine, aucun changement de règle).
// Régions : ordre, bornes du Pokédex, progression (ligue gagnée, 100 % du dex), restrictions d'équipe, champions.
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
 const val = (pwLateLink('t')) ? t(key) : '';
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
// V7 · FORM-01 (D12) — une espèce compte pour le 100 % si LA BASE OU N'IMPORTE
// QUELLE FORME est capturée ; le total régional ne compte jamais les formes.
function isSpeciesCaughtAnyForm(id){
 const e = (G && G.pokedex) ? G.pokedex[Number(id)] : null;
 if(!e) return false;
 if(e.caught) return true;
 if(e.forms && typeof e.forms === 'object'){
  for(const f in e.forms){ if(e.forms[f] && e.forms[f].caught) return true; }
 }
 return false;
}
function countCaughtInRegion(region){
 const meta = getRegionMeta(region);
 let count = 0;
 for(let id=meta.start; id<=meta.end; id++){
  if(isSpeciesCaughtAnyForm(id)) count++;
 }
 return count;
}
// Compteur « Formes » séparé (succès famille O, P4) : formes capturées / définies.
function countCaughtForms(region){
 const forms = (typeof FORMS !== 'undefined' && FORMS) ? Object.values(FORMS) : [];
 let total = 0, caught = 0;
 for(const f of forms){
  if(region && getPokemonRegion(f.base) !== region) continue;
  total++;
  const e = (G && G.pokedex) ? G.pokedex[f.base] : null;
  if(e && e.forms && e.forms[f.slot] && e.forms[f.slot].caught) caught++;
 }
 return { caught, total };
}
function isRegionDexComplete(region){ return countCaughtInRegion(region) >= getRegionPokedexTotal(region); }
function isKalosCompleted(){
  // Delta Episode / Primal Reversions: only accessible after Kalos
  // (Kalos League won). The classic Hoenn dex stays open before that.
  try {
    if (pwLateLink('isRegionLeagueWon') && isRegionLeagueWon('kalos')) return true;
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
 return tr('region_team_restricted', {region:getRegionDisplayName(region), pokemon:bad.slice(0,3).map(p=>p.name || getPokeName(p)).join(', ')});
}
function getLeagueChampionIdForRegion(region){ return getRegionMeta(region).league || 'elite4'; }
function getLeagueRegionForChampion(champId){
 for(const region of REGION_ORDER){ if(getLeagueChampionIdForRegion(region) === champId) return region; }
 return champId === 'elite4' ? 'kanto' : ((G && G.region) || 'kanto');
}
function isLeagueChampionId(champId){ return REGION_ORDER.some(region => getLeagueChampionIdForRegion(region) === champId); }

function getPokemonRegion(id){
 const nid = Number(id);
 for(const region of REGION_ORDER){
  const meta = getRegionMeta(region);
  if(nid >= meta.start && nid <= meta.end) return region;
 }
 return 'unknown';
}
function getUnlockedRegionsForPokedex(){
 return REGION_ORDER.filter(region => region === 'kanto' || canAccessRegion(region)); // V7 · DBT-09 — même module, appel direct
}

// Surface classique (consommateurs par identifiant libre, harnais VM).
if (typeof getRegionMeta !== 'undefined') { if (typeof window !== 'undefined') window.getRegionMeta = getRegionMeta; if (typeof globalThis !== 'undefined') globalThis.getRegionMeta = getRegionMeta; }
if (typeof getRegionDisplayName !== 'undefined') { if (typeof window !== 'undefined') window.getRegionDisplayName = getRegionDisplayName; if (typeof globalThis !== 'undefined') globalThis.getRegionDisplayName = getRegionDisplayName; }
if (typeof getPreviousRegion !== 'undefined') { if (typeof window !== 'undefined') window.getPreviousRegion = getPreviousRegion; if (typeof globalThis !== 'undefined') globalThis.getPreviousRegion = getPreviousRegion; }
if (typeof isPokemonNativeToRegion !== 'undefined') { if (typeof window !== 'undefined') window.isPokemonNativeToRegion = isPokemonNativeToRegion; if (typeof globalThis !== 'undefined') globalThis.isPokemonNativeToRegion = isPokemonNativeToRegion; }
if (typeof getRegionPokedexTotal !== 'undefined') { if (typeof window !== 'undefined') window.getRegionPokedexTotal = getRegionPokedexTotal; if (typeof globalThis !== 'undefined') globalThis.getRegionPokedexTotal = getRegionPokedexTotal; }
if (typeof globalThis !== 'undefined') { globalThis.isSpeciesCaughtAnyForm = isSpeciesCaughtAnyForm; globalThis.countCaughtForms = countCaughtForms; }
if (typeof countCaughtInRegion !== 'undefined') { if (typeof window !== 'undefined') window.countCaughtInRegion = countCaughtInRegion; if (typeof globalThis !== 'undefined') globalThis.countCaughtInRegion = countCaughtInRegion; }
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
if (typeof getPokemonRegion !== 'undefined') { if (typeof window !== 'undefined') window.getPokemonRegion = getPokemonRegion; if (typeof globalThis !== 'undefined') globalThis.getPokemonRegion = getPokemonRegion; }
if (typeof getUnlockedRegionsForPokedex !== 'undefined') { if (typeof window !== 'undefined') window.getUnlockedRegionsForPokedex = getUnlockedRegionsForPokedex; if (typeof globalThis !== 'undefined') globalThis.getUnlockedRegionsForPokedex = getUnlockedRegionsForPokedex; }

export {
  REGION_ORDER,
  REGION_POKE_RANGES,
  getRegionMeta,
  getRegionDisplayName,
  getPreviousRegion,
  isPokemonNativeToRegion,
  getRegionPokedexTotal,
  isSpeciesCaughtAnyForm,
  countCaughtInRegion,
  countCaughtForms,
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
  getPokemonRegion,
  getUnlockedRegionsForPokedex,
};
