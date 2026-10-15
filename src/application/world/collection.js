import { pwLateLink } from '../../core/late-link.js';
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
  try {
    const mult = Number(getTeamShinyRateMultiplier());
    if (Number.isFinite(mult) && mult > 0) rate = Math.min(1, rate * mult);
  } catch (_) {
    /* noop */
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
    if (pwLateLink('isPokemonNativeToRegion') && isPokemonNativeToRegion(nid, region)) {
      return true;
    }
  }
  return false;
}

function getShinyCharmCompletedRegions() {
  const out = [];
  const order =
    typeof REGION_ORDER !== 'undefined' && Array.isArray(REGION_ORDER)
      ? REGION_ORDER
      : ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea'];
  for (const region of order) {
    let complete = false;
    if (pwLateLink('isRegionDexComplete')) {
      try {
        complete = !!isRegionDexComplete(region);
      } catch (_) {
        complete = false;
      }
    }
    if (
      !complete &&
      typeof G !== 'undefined' &&
      G &&
      G.shinyCharmRegions &&
      G.shinyCharmRegions[region]
    ) {
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

  const order =
    typeof REGION_ORDER !== 'undefined' && Array.isArray(REGION_ORDER)
      ? REGION_ORDER
      : ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'paldea'];

  const newly = [];
  for (const region of order) {
    let complete = false;
    if (pwLateLink('isRegionDexComplete')) {
      try {
        complete = !!isRegionDexComplete(region);
      } catch (_) {
        complete = false;
      }
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
    if (pwLateLink('notify')) {
      const r0 = newly[0] || order.find((r) => G.shinyCharmRegions[r]);
      const rName = pwLateLink('getRegionDisplayName') ? getRegionDisplayName(r0) : r0;
      notify(
        G.lang === 'en'
          ? `✨ Shiny Charm obtained! Odds 1/2048 for ${rName} species.`
          : `✨ Charme Chroma obtenu ! Taux 1/2048 sur les espèces de ${rName}.`,
        'var(--yellow, #ffd54f)'
      );
    }
  } else if (newly.length && hadCharm && pwLateLink('notify')) {
    for (const r of newly) {
      const rName = pwLateLink('getRegionDisplayName') ? getRegionDisplayName(r) : r;
      notify(
        G.lang === 'en'
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
    const ha = pwLateLink('getPokemonHiddenTalent') ? getPokemonHiddenTalent(p) : null;
    if (ha) talents.add(String(ha).toLowerCase());
  }
  if (talents.has('goodasgold')) mult *= 1.15;
  if (talents.has('superluck')) mult *= 1.15;
  if (talents.has('serenegrace')) mult *= 1.1;
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
function speciesOwnedInstance(id) {
  const want = _pwWant(id);
  if (!G) return false;
  if (Array.isArray(G.team) && G.team.some((p) => _pwIs(p, want))) return true;
  if (G.collection) {
    for (const k in G.collection) {
      const poke = G.collection[k];
      if (_pwIs(poke, want)) return true;
    }
  }
  if (Array.isArray(G.hatchery)) {
    for (const s of G.hatchery) {
      if (s && _pwIs(s.poke, want)) return true;
    }
  }
  if (Array.isArray(G.training)) {
    for (const s of G.training) {
      if (s && _pwIs(s.poke, want)) return true;
    }
  }
  return false;
}

// History: speciesOwned also included the pokedex (for route counting).
// Compatibility kept, but implemented as instance + pokedex.
function speciesOwned(id) {
  if (speciesOwnedInstance(id)) return true;
  if (isDexCaught(id)) return true;
  return false;
}

function getSpeciesInstance(id) {
  const want = _pwWant(id);
  const inTeam = G.team.find((p) => _pwIs(p, want));
  if (inTeam) return { loc: 'team', poke: inTeam };
  for (const k in G.collection) {
    const poke = G.collection[k];
    if (_pwIs(poke, want)) return { loc: 'box', poke };
  }
  return null;
}

function speciesInBox(id) {
  const want = _pwWant(id);
  if (!G || !G.collection) return false;
  for (const k in G.collection) {
    const poke = G.collection[k];
    if (_pwIs(poke, want)) return true;
  }
  return false;
}
function isSpeciesShiny(id) {
  const want = _pwWant(id);
  if (!want.id) return false;
  const e = dexEntryFor(want, false);
  if (e && e.shiny) return true;
  if (G.team.some((p) => _pwIs(p, want) && (p.shinyUnlocked || p.shinyActive || p.shiny)))
    return true;
  for (const k in G.collection) {
    const poke = G.collection[k];
    if (_pwIs(poke, want) && (poke.shinyUnlocked || poke.shinyActive || poke.shiny)) return true;
  }
  return false;
}
function syncShinyState() {
  if (!G.pokedex) G.pokedex = {};
  // Clés d'espèce ("351" / "351-1") dont le chroma est débloqué.
  const shinySpecies = new Set();
  for (const idStr in G.pokedex) {
    const e = G.pokedex[idStr];
    if (e?.shiny) shinySpecies.add(String(Number(idStr)));
    if (e && e.forms) {
      for (const f in e.forms) {
        if (e.forms[f]?.shiny) shinySpecies.add(`${Number(idStr)}-${Number(f)}`);
      }
    }
  }
  for (const p of G.team) {
    if (p && (p.shinyUnlocked || p.shinyActive || p.shiny)) shinySpecies.add(boxKeyFor(p));
  }
  for (const k in G.collection) {
    const p = G.collection[k];
    if (p && (p.shinyUnlocked || p.shinyActive || p.shiny)) shinySpecies.add(boxKeyFor(p));
  }
  for (const key of shinySpecies) {
    const e = dexEntryFor(key, true);
    if (e) {
      if (!('caught' in e)) {
        e.seen = true;
        e.caught = true;
      }
      e.shiny = true;
    }
  }
  for (const p of G.team) {
    if (p && shinySpecies.has(boxKeyFor(p))) {
      p.shinyUnlocked = true;
      if (p.shinyActive === undefined) p.shinyActive = true;
      p.shiny = !!p.shinyActive;
    }
  }
  for (const k in G.collection) {
    const p = G.collection[k];
    if (p && shinySpecies.has(boxKeyFor(p))) {
      p.shinyUnlocked = true;
      if (p.shinyActive === undefined) p.shinyActive = true;
      p.shiny = !!p.shinyActive;
    }
  }
}
function unlockShinyForSpecies(id) {
  const want = _pwWant(id);
  const e = dexEntryFor(want, true);
  if (e) {
    if (!('caught' in e)) {
      e.seen = true;
      e.caught = true;
    }
    e.shiny = true;
  }
  for (const p of G.team) {
    if (_pwIs(p, want)) {
      p.shinyUnlocked = true;
      p.shinyActive = true;
      p.shiny = true;
    }
  }
  for (const k in G.collection) {
    const poke = G.collection[k];
    if (_pwIs(poke, want)) {
      poke.shinyUnlocked = true;
      poke.shinyActive = true;
      poke.shiny = true;
    }
  }
}
// ── Play records (Pokédex sheet + location panel) ────────────────────────
// Counts live on G.pokedex[id] (per species) and G.locStats[locId] (per
// place). Missing keys default to 0 so old saves stay valid. shinyHatched
// follows the incubation DICE only: a successful roll always +1 (even if
// that individual was already shiny — a shiny never reverts). A failed
// roll never increments, whether the mon was shiny or not.
const DEX_COUNT_KEYS = [
  'encountered',
  'captured',
  'beaten',
  'hatcheryIncub',
  'training',
  'shinyEncountered',
  'shinyCaptured',
  'shinyBeaten',
  'shinyHatched',
];
// ── V7 · FORM-01 — identité d'espèce AVEC forme ───────────────────────────
// Toutes les fonctions « par espèce » acceptent un id (base), une clé
// "351-1" ou un Pokémon `{id, form}` : une forme est un Pokémon à part
// (boîte distincte, dex distinct), la base n'est jamais confondue avec elle.
function _pwWant(ref) {
  if (pwLateLink('parseSpeciesKey')) return parseSpeciesKey(ref);
  if (ref && typeof ref === 'object')
    return { id: Number(ref.id) || 0, form: Number(ref.form) || 0 };
  const str = String(ref == null ? '' : ref),
    dash = str.indexOf('-');
  if (dash > 0)
    return { id: Number(str.slice(0, dash)) || 0, form: Number(str.slice(dash + 1)) || 0 };
  return { id: Number(str) || 0, form: 0 };
}
function _pwIs(p, want) {
  return !!(p && Number(p.id) === want.id && (Number(p.form) || 0) === want.form);
}
// Entrée de dex d'une espèce ou d'une forme (`G.pokedex[351].forms[1]`).
function dexEntryFor(ref, create) {
  const want = _pwWant(ref);
  if (!G || !Number.isFinite(want.id) || want.id <= 0) return null;
  if (!G.pokedex || typeof G.pokedex !== 'object') {
    if (!create) return null;
    G.pokedex = {};
  }
  let base = G.pokedex[want.id];
  if (!base || typeof base !== 'object') {
    if (!create) return null;
    base = G.pokedex[want.id] = {};
  }
  if (!(want.form > 0)) return base;
  if (!base.forms || typeof base.forms !== 'object') {
    if (!create) return null;
    base.forms = {};
  }
  let fe = base.forms[want.form];
  if (!fe || typeof fe !== 'object') {
    if (!create) return null;
    fe = base.forms[want.form] = {};
  }
  return fe;
}
// Marque une espèce/forme comme vue + capturée (clé, id ou Pokémon).
function markDexCaught(ref, shiny) {
  const e = dexEntryFor(ref, true);
  if (!e) return null;
  e.seen = true;
  e.caught = true;
  if (shiny) e.shiny = true;
  return e;
}
function isDexCaught(ref) {
  const e = dexEntryFor(ref, false);
  return !!(e && e.caught);
}
// Clé de boîte canonique d'un Pokémon : "351" / "351-1" (unicité par espèce ET forme).
function boxKeyFor(p) {
  if (pwLateLink('speciesKey')) return speciesKey(p);
  const w = _pwWant(p);
  return w.form > 0 ? `${w.id}-${w.form}` : String(w.id);
}

const LOC_COUNT_KEYS = ['beaten', 'encountered', 'captured'];

function ensureDexEntry(id) {
  // V7 · FORM-01 — accepte un id, une clé "351-1" ou un Pokémon (forme → sous-entrée).
  return dexEntryFor(id, true);
}

function recordDexStat(id, key, n) {
  const entry = ensureDexEntry(id);
  if (!entry || DEX_COUNT_KEYS.indexOf(key) < 0) return 0;
  const add = Number(n);
  entry[key] = (Number(entry[key]) || 0) + (Number.isFinite(add) ? add : 1);
  return entry[key];
}

function getDexRecordStats(id) {
  const entry = dexEntryFor(id, false) || {};
  const out = {};
  for (let i = 0; i < DEX_COUNT_KEYS.length; i++) {
    const k = DEX_COUNT_KEYS[i];
    out[k] = Number(entry[k]) || 0;
  }
  return out;
}

function isPokeIndividualShiny(p) {
  return !!(p && (p.shinyUnlocked || p.shinyActive || p.shiny || p._forceShiny));
}

function recordDexEncounter(id, shiny) {
  recordDexStat(id, 'encountered', 1);
  if (shiny) recordDexStat(id, 'shinyEncountered', 1);
}

function recordDexCapture(id, shiny) {
  recordDexStat(id, 'captured', 1);
  if (shiny) recordDexStat(id, 'shinyCaptured', 1);
}

function recordDexDefeat(id, shiny) {
  recordDexStat(id, 'beaten', 1);
  if (shiny) recordDexStat(id, 'shinyBeaten', 1);
}

function ensureLocStats(locId) {
  if (!locId || typeof G === 'undefined' || !G) return null;
  if (!G.locStats || typeof G.locStats !== 'object') G.locStats = {};
  if (!G.locStats[locId] || typeof G.locStats[locId] !== 'object') {
    G.locStats[locId] = {
      beaten: (G.wildWinsByLoc && G.wildWinsByLoc[locId]) || 0,
      encountered: 0,
      captured: 0,
    };
  }
  return G.locStats[locId];
}

function recordLocStat(locId, key, n) {
  const st = ensureLocStats(locId);
  if (!st || LOC_COUNT_KEYS.indexOf(key) < 0) return 0;
  const add = Number(n);
  st[key] = (Number(st[key]) || 0) + (Number.isFinite(add) ? add : 1);
  return st[key];
}

function getLocRecordStats(locId) {
  const st = (typeof G !== 'undefined' && G && G.locStats && G.locStats[locId]) || {};
  const beatenFromWins =
    (typeof G !== 'undefined' && G && G.wildWinsByLoc && G.wildWinsByLoc[locId]) || 0;
  return {
    beaten: Math.max(Number(st.beaten) || 0, beatenFromWins),
    encountered: Number(st.encountered) || 0,
    captured: Number(st.captured) || 0,
  };
}

function locCompletion(locId) {
  const idsToCheck = pwLateLink('getLinkedRouteIds') ? getLinkedRouteIds(locId) : [locId];
  const species = new Set();
  for (const id of idsToCheck) {
    const loc = getLocObj(id);
    if (!loc || !loc.wild || !loc.wild.length) continue;
    for (const w of loc.wild) species.add(Number(w[0]));
  }
  if (!species.size) return null;
  const ids = Array.from(species).filter(Boolean);
  const caught = ids.filter((id) => speciesOwned(id)).length;
  return { caught, total: ids.length, ids };
}
function boxedEntries() {
  const out = [];
  // On ignore the cles not-pokemon (ex: eventuel __isProxy accidentel)
  for (const [idStr, poke] of Object.entries(G.collection || {})) {
    if (!poke || typeof poke !== 'object') continue;
    if (!('id' in poke)) continue;
    // Filters out technical entries (keys starting with __)
    if (String(idStr).startsWith('__')) continue;
    const cid = poke.id || parseInt(String(idStr).replace(/\D/g, ''), 10) || 1;
    out.push({ id: idStr, cleanId: +cid, form: Number(poke.form) || 0, poke });
  }
  // V7 · FORM-01 — la base puis ses formes (351, 351-1, 351-2…).
  out.sort((a, b) => a.cleanId - b.cleanId || a.form - b.form);
  return out;
}

// ---- Simple anti-duplicate system, no Proxy ----
// Centralized logic: if the species is already owned, 10% chance of +1 IV on the existing one
// Collection PC storage and duplicate resolution
function findExistingPokemonBySpecies(speciesId) {
  const want = _pwWant(speciesId);
  if (!G) return null;
  if (Array.isArray(G.team)) {
    const t = G.team.find((p) => _pwIs(p, want));
    if (t) return t;
  }
  if (G.collection) {
    for (const k in G.collection) {
      const p = G.collection[k];
      if (_pwIs(p, want)) return p;
    }
  }
  return null;
}

// V7-R1 · #7 — mêmes constantes que combat/catch.js (GAME.CAPTURE), lecture
// défensive pour les harnais VM qui ne chargent pas game-config.js.
function _captureIvChancePct() {
  try {
    if (typeof CAPTURE_IV_CHANCE_PCT === 'number') return CAPTURE_IV_CHANCE_PCT;
  } catch (_) {}
  return 10;
}
function _captureIvCap() {
  try {
    if (typeof CAPTURE_IV_CAP === 'number') return CAPTURE_IV_CAP;
  } catch (_) {}
  return 12;
}
function giveIvBonusToExisting(existing) {
  if (!existing) return null;
  if (!existing.ivs) existing.ivs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const cap = _captureIvCap();
  const avail = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].filter(
    (k) => (existing.ivs[k] || 0) < cap
  );
  if (!avail.length) return null;
  const pick = avail[Math.floor(Math.random() * avail.length)];
  existing.ivs[pick] = (existing.ivs[pick] || 0) + 1;
  try {
    if (pwLateLink('recalcPokeStats')) recalcPokeStats(existing);
  } catch (_) {}
  return pick;
}

// Collection PC storage and duplicate resolution
// Collection PC storage and duplicate resolution
function addPokemonRespectingUniqueness(poke, opts = {}) {
  // opts: {allowDuplicate: bool} // for debug, but by defaut false
  if (!poke || !poke.id) return { added: false };
  const nid = boxKeyFor(poke); // V7 · FORM-01 — "351" ou "351-1"
  const existing = findExistingPokemonBySpecies(poke);
  if (existing && !opts.allowDuplicate) {
    // Duplicate -> IV chance (GAME.CAPTURE.IV_CHANCE_PCT)
    let ivKey = null;
    if (Math.random() * 100 < _captureIvChancePct()) {
      ivKey = giveIvBonusToExisting(existing);
      if (ivKey && pwLateLink('notify')) {
        try {
          notify(`${existing.name} déjà possédé : +1 IV ${ivKey.toUpperCase()} !`, 'var(--green)');
        } catch (_) {}
      }
    }
    return { added: false, ivBonus: ivKey, existing, duplicate: true };
  }
  // addition normal
  if (G.team.length < 6 && opts.preferTeam !== false && !existing) {
    // if the team is not full, put in team unless box is forced
    // (original logic: team only if <6 members, otherwise box)
    // Collection PC storage and duplicate resolution
    // Collection PC storage and duplicate resolution
  }
  const boxId = pwLateLink('generateUniqueBoxId') ? generateUniqueBoxId(nid) : String(nid);
  G.collection[boxId] = poke;
  return { added: true, boxId, existing: null, duplicate: false };
}

// Duplicate cleanup to repair old corrupted saves.
// Keep the best (max total IV or level) per species, give 10% IV to the keeper for each removed duplicate.
function deduplicateCollectionAndFixBox() {
  if (!G) return 0;
  if (!G.collection) G.collection = {};
  if (!G.team) G.team = [];
  let removed = 0;

  // Etape 1 : box — regrouper par clé d'espèce ("351" / "351-1" : une forme
  // est une espèce de boîte à part, V7 · FORM-01).
  const bestBySpecies = new Map(); // sid -> {key, poke, ivTotal}
  const dupKeys = [];
  for (const [key, poke] of Object.entries(G.collection)) {
    if (!poke || typeof poke !== 'object' || !('id' in poke)) continue;
    if (String(key).startsWith('__')) {
      dupKeys.push(key);
      continue;
    }
    if (!Number.isFinite(Number(poke.id))) continue;
    const sid = boxKeyFor(poke);
    const ivTot = Object.values(poke.ivs || {}).reduce((a, b) => a + (Number(b) || 0), 0);
    const lvl = Number(poke.level || 0);
    const score = ivTot * 1000 + lvl; // compare IV then level
    if (!bestBySpecies.has(sid)) {
      bestBySpecies.set(sid, { key, poke, score });
    } else {
      const prev = bestBySpecies.get(sid);
      // keep the best, delete the other
      if (score > prev.score) {
        dupKeys.push(prev.key);
        bestBySpecies.set(sid, { key, poke, score });
      } else {
        dupKeys.push(key);
      }
      // IV bonus on the kept one (GAME.CAPTURE.IV_CHANCE_PCT)
      if (Math.random() * 100 < _captureIvChancePct()) {
        giveIvBonusToExisting(bestBySpecies.get(sid).poke);
      }
    }
  }
  for (const k of dupKeys) {
    delete G.collection[k];
    removed++;
  }

  // Step 2: team — if a team Pokemon is already in the box, keep it in
  // the team and delete the box copy, or vice versa
  // Target outcome: at most 1 copy per species across team+box
  const seen = new Set();
  for (const { poke } of bestBySpecies.values()) {
    seen.add(boxKeyFor(poke));
  }
  // Walk the team backwards for splice safety
  for (let i = G.team.length - 1; i >= 0; i--) {
    const p = G.team[i];
    if (!p) continue;
    const sid = boxKeyFor(p);
    if (seen.has(sid)) {
      // already in box -> team duplicate, delete it (with IV bonus)
      if (Math.random() * 100 < _captureIvChancePct()) {
        const exist = findExistingPokemonBySpecies(p);
        if (exist && exist !== p) giveIvBonusToExisting(exist);
      }
      G.team.splice(i, 1);
      removed++;
    } else {
      seen.add(sid);
    }
  }

  if (removed > 0) {
    try {
      if (pwLateLink('notify'))
        notify(`${removed} doublon(s) nettoyé(s) – 10% IV appliqué`, 'var(--green)');
    } catch (_) {}
    try {
      if (pwLateLink('saveGame')) saveGame();
    } catch (_) {}
  }
  return removed;
}

// Expose globals (compat import ES)
// Wave 41 — surface kept (window → globalThis block, same scope).
if (typeof globalThis !== 'undefined') globalThis.speciesOwnedInstance = speciesOwnedInstance;
if (typeof globalThis !== 'undefined')
  globalThis.findExistingPokemonBySpecies = findExistingPokemonBySpecies;
if (typeof globalThis !== 'undefined') globalThis.giveIvBonusToExisting = giveIvBonusToExisting;
if (typeof globalThis !== 'undefined')
  globalThis.addPokemonRespectingUniqueness = addPokemonRespectingUniqueness;
if (typeof globalThis !== 'undefined')
  globalThis.deduplicateCollectionAndFixBox = deduplicateCollectionAndFixBox;
// V7 · FORM-01 — dex/boîte avec formes.
if (typeof globalThis !== 'undefined') {
  globalThis.dexEntryFor = dexEntryFor;
  globalThis.markDexCaught = markDexCaught;
  globalThis.isDexCaught = isDexCaught;
  globalThis.boxKeyFor = boxKeyFor;
}

// --- Migrated to ES module, globals exposed ---
if (typeof rollShiny !== 'undefined') {
  if (typeof window !== 'undefined') window.rollShiny = rollShiny;
  if (typeof globalThis !== 'undefined') globalThis.rollShiny = rollShiny;
}
if (typeof getShinyRateForSpecies !== 'undefined') {
  if (typeof window !== 'undefined') window.getShinyRateForSpecies = getShinyRateForSpecies;
  if (typeof globalThis !== 'undefined') globalThis.getShinyRateForSpecies = getShinyRateForSpecies;
}
if (typeof hasRegionalShinyCharmForSpecies !== 'undefined') {
  if (typeof window !== 'undefined')
    window.hasRegionalShinyCharmForSpecies = hasRegionalShinyCharmForSpecies;
  if (typeof globalThis !== 'undefined')
    globalThis.hasRegionalShinyCharmForSpecies = hasRegionalShinyCharmForSpecies;
}
if (typeof getShinyCharmRollsForSpecies !== 'undefined') {
  if (typeof window !== 'undefined')
    window.getShinyCharmRollsForSpecies = getShinyCharmRollsForSpecies;
  if (typeof globalThis !== 'undefined')
    globalThis.getShinyCharmRollsForSpecies = getShinyCharmRollsForSpecies;
}
if (typeof getShinyCharmCompletedRegions !== 'undefined') {
  if (typeof window !== 'undefined')
    window.getShinyCharmCompletedRegions = getShinyCharmCompletedRegions;
  if (typeof globalThis !== 'undefined')
    globalThis.getShinyCharmCompletedRegions = getShinyCharmCompletedRegions;
}
if (typeof syncShinyCharmProgress !== 'undefined') {
  if (typeof window !== 'undefined') window.syncShinyCharmProgress = syncShinyCharmProgress;
  if (typeof globalThis !== 'undefined') globalThis.syncShinyCharmProgress = syncShinyCharmProgress;
}
if (typeof getTeamShinyRateMultiplier !== 'undefined') {
  if (typeof window !== 'undefined') window.getTeamShinyRateMultiplier = getTeamShinyRateMultiplier;
  if (typeof globalThis !== 'undefined')
    globalThis.getTeamShinyRateMultiplier = getTeamShinyRateMultiplier;
}
if (typeof getEffectiveShinyRate !== 'undefined') {
  if (typeof window !== 'undefined') window.getEffectiveShinyRate = getEffectiveShinyRate;
  if (typeof globalThis !== 'undefined') globalThis.getEffectiveShinyRate = getEffectiveShinyRate;
}
if (typeof SHINY_BASE_RATE !== 'undefined') {
  if (typeof window !== 'undefined') window.SHINY_BASE_RATE = SHINY_BASE_RATE;
  if (typeof globalThis !== 'undefined') globalThis.SHINY_BASE_RATE = SHINY_BASE_RATE;
}
if (typeof SHINY_CHARM_RATE !== 'undefined') {
  if (typeof window !== 'undefined') window.SHINY_CHARM_RATE = SHINY_CHARM_RATE;
  if (typeof globalThis !== 'undefined') globalThis.SHINY_CHARM_RATE = SHINY_CHARM_RATE;
}
if (typeof speciesOwned !== 'undefined') {
  if (typeof window !== 'undefined') window.speciesOwned = speciesOwned;
  if (typeof globalThis !== 'undefined') globalThis.speciesOwned = speciesOwned;
}
if (typeof speciesOwnedInstance !== 'undefined') {
  if (typeof window !== 'undefined') window.speciesOwnedInstance = speciesOwnedInstance;
  if (typeof globalThis !== 'undefined') globalThis.speciesOwnedInstance = speciesOwnedInstance;
}
if (typeof getSpeciesInstance !== 'undefined') {
  if (typeof window !== 'undefined') window.getSpeciesInstance = getSpeciesInstance;
  if (typeof globalThis !== 'undefined') globalThis.getSpeciesInstance = getSpeciesInstance;
}
if (typeof speciesInBox !== 'undefined') {
  if (typeof window !== 'undefined') window.speciesInBox = speciesInBox;
  if (typeof globalThis !== 'undefined') globalThis.speciesInBox = speciesInBox;
}
if (typeof isSpeciesShiny !== 'undefined') {
  if (typeof window !== 'undefined') window.isSpeciesShiny = isSpeciesShiny;
  if (typeof globalThis !== 'undefined') globalThis.isSpeciesShiny = isSpeciesShiny;
}
if (typeof syncShinyState !== 'undefined') {
  if (typeof window !== 'undefined') window.syncShinyState = syncShinyState;
  if (typeof globalThis !== 'undefined') globalThis.syncShinyState = syncShinyState;
}
if (typeof unlockShinyForSpecies !== 'undefined') {
  if (typeof window !== 'undefined') window.unlockShinyForSpecies = unlockShinyForSpecies;
  if (typeof globalThis !== 'undefined') globalThis.unlockShinyForSpecies = unlockShinyForSpecies;
}
if (typeof locCompletion !== 'undefined') {
  if (typeof window !== 'undefined') window.locCompletion = locCompletion;
  if (typeof globalThis !== 'undefined') globalThis.locCompletion = locCompletion;
}
if (typeof recordDexStat !== 'undefined') {
  if (typeof window !== 'undefined') window.recordDexStat = recordDexStat;
  if (typeof globalThis !== 'undefined') globalThis.recordDexStat = recordDexStat;
}
if (typeof getDexRecordStats !== 'undefined') {
  if (typeof window !== 'undefined') window.getDexRecordStats = getDexRecordStats;
  if (typeof globalThis !== 'undefined') globalThis.getDexRecordStats = getDexRecordStats;
}
if (typeof recordDexEncounter !== 'undefined') {
  if (typeof window !== 'undefined') window.recordDexEncounter = recordDexEncounter;
  if (typeof globalThis !== 'undefined') globalThis.recordDexEncounter = recordDexEncounter;
}
if (typeof recordDexCapture !== 'undefined') {
  if (typeof window !== 'undefined') window.recordDexCapture = recordDexCapture;
  if (typeof globalThis !== 'undefined') globalThis.recordDexCapture = recordDexCapture;
}
if (typeof recordDexDefeat !== 'undefined') {
  if (typeof window !== 'undefined') window.recordDexDefeat = recordDexDefeat;
  if (typeof globalThis !== 'undefined') globalThis.recordDexDefeat = recordDexDefeat;
}
if (typeof recordLocStat !== 'undefined') {
  if (typeof window !== 'undefined') window.recordLocStat = recordLocStat;
  if (typeof globalThis !== 'undefined') globalThis.recordLocStat = recordLocStat;
}
if (typeof getLocRecordStats !== 'undefined') {
  if (typeof window !== 'undefined') window.getLocRecordStats = getLocRecordStats;
  if (typeof globalThis !== 'undefined') globalThis.getLocRecordStats = getLocRecordStats;
}
if (typeof ensureLocStats !== 'undefined') {
  if (typeof window !== 'undefined') window.ensureLocStats = ensureLocStats;
  if (typeof globalThis !== 'undefined') globalThis.ensureLocStats = ensureLocStats;
}
if (typeof isPokeIndividualShiny !== 'undefined') {
  if (typeof window !== 'undefined') window.isPokeIndividualShiny = isPokeIndividualShiny;
  if (typeof globalThis !== 'undefined') globalThis.isPokeIndividualShiny = isPokeIndividualShiny;
}
if (typeof boxedEntries !== 'undefined') {
  if (typeof window !== 'undefined') window.boxedEntries = boxedEntries;
  if (typeof globalThis !== 'undefined') globalThis.boxedEntries = boxedEntries;
}

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
  dexEntryFor,
  markDexCaught,
  isDexCaught,
  boxKeyFor,
  getSpeciesInstance,
  speciesInBox,
  isSpeciesShiny,
  syncShinyState,
  unlockShinyForSpecies,
  locCompletion,
  boxedEntries,
};
