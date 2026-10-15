// ═══════════════════════════════════════════════════════════════════════════
// legendary-quests.js — V7 · LEG-01 / LEG-02 (D13)
//
// Une quête légendaire est une DÉFINITION DÉCLARATIVE, pas du code :
//   { id, region, poke, encounter:{loc, level}, requires?, npc?, steps:[…] }
//
// • Kanto (5) et Johto (6) : les quêtes principales `rewardPoke` existantes
//   sont ENVELOPPÉES (mêmes ids de quêtes → aucune migration, contenu
//   inchangé) ; seule la règle de capture change (D13 : taux × 2, plafonné).
// • Hoenn (10, LEG-02) : chaque quête est une CHAÎNE de quêtes annexes
//   (`<id>_1`, `<id>_2`…) générée par `buildLegendarySideQuests()` et fusionnée
//   dans SIDE_QUESTS au chargement. Les étapes réutilisent les types de quêtes
//   existants (talk / item / trainer_battle / defeat_wild / puzzle) plus trois
//   types ajoutés en V7 (region_wins / dex_region / own_species). La DERNIÈRE
//   étape porte `legendary:true` + `rewardPoke` : sa réclamation lance
//   `startLegendaryEncounter` (BUG-01) avec `battle.legendaryQuest = true`.
// • Capture (D13) : taux de la Ball × 2 (plafond 100 %). Si la capture échoue
//   ou si l'équipe est K.O., la quête reste « rencontre disponible » et le
//   combat peut être relancé immédiatement — le coût est la Ball consommée.
// • Objets-clés (type `key`, non vendables) : red_orb, blue_orb,
//   gs_ball_celebi, clear_bell_hooh, tidal_bell_lugia, eon_ticket_latis,
//   meteorite_shard_delta — remis par une étape, exigés par la dernière.
// ═══════════════════════════════════════════════════════════════════════════

export const LEGENDARY_KEY_ITEMS = Object.freeze([
  'red_orb', 'blue_orb', 'gs_ball_celebi', 'clear_bell_hooh', 'tidal_bell_lugia', 'eon_ticket_latis', 'meteorite_shard_delta',
]);

/** Multiplicateur du taux de capture d'une rencontre de fin de quête (D13). */
export const LEGENDARY_QUEST_CATCH_MULT = 2;

export const LEGENDARY_QUESTS = [
  // ── Kanto (5) — enveloppes des quêtes principales existantes ──────────────
  { id: 'leg_articuno', region: 'kanto', poke: 144, rewardPoke: 144, mainQuestId: 58, encounter: { loc: 'seafoamislands', level: 50 } },
  { id: 'leg_zapdos',   region: 'kanto', poke: 145, rewardPoke: 145, mainQuestId: 59, encounter: { loc: 'powerplant', level: 50 } },
  { id: 'leg_moltres',  region: 'kanto', poke: 146, rewardPoke: 146, mainQuestId: 60, encounter: { loc: 'victoryroad', level: 50 } },
  { id: 'leg_mewtwo',   region: 'kanto', poke: 150, rewardPoke: 150, mainQuestId: 63, encounter: { loc: 'ceruleancave', level: 70 } },
  { id: 'leg_mew',      region: 'kanto', poke: 151, rewardPoke: 151, mainQuestId: 64, encounter: { loc: 'safarizone', level: 50 } },
  // ── Johto (6) ─────────────────────────────────────────────────────────────
  { id: 'leg_raikou',  region: 'johto', poke: 243, rewardPoke: 243, mainQuestId: 136, encounter: { loc: 'burnedtower', level: 50 } },
  { id: 'leg_entei',   region: 'johto', poke: 244, rewardPoke: 244, mainQuestId: 137, encounter: { loc: 'burnedtower', level: 50 } },
  { id: 'leg_suicune', region: 'johto', poke: 245, rewardPoke: 245, mainQuestId: 138, encounter: { loc: 'burnedtower', level: 50 } },
  { id: 'leg_lugia',   region: 'johto', poke: 249, rewardPoke: 249, mainQuestId: 139, keyItem: 'tidal_bell_lugia', encounter: { loc: 'whirlislands', level: 70 } },
  { id: 'leg_hooh',    region: 'johto', poke: 250, rewardPoke: 250, mainQuestId: 140, keyItem: 'clear_bell_hooh', encounter: { loc: 'tintower', level: 70 } },
  { id: 'leg_celebi',  region: 'johto', poke: 251, rewardPoke: 251, mainQuestId: 141, keyItem: 'gs_ball_celebi', encounter: { loc: 'ilexforest', level: 50 } },

  // ── Hoenn (10) — LEG-02 ───────────────────────────────────────────────────
  // « Les Sceaux » I/II/III : les trois puzzles existants, enchaînés.
  { id: 'leg_regirock', region: 'hoenn', poke: 377, rewardPoke: 377, npc: { loc: 'sealed_chamber' }, encounter: { loc: 'desert_ruins', level: 40 },
    steps: [
      { type: 'puzzle', loc: 'sealed_chamber', targetPuzzleId: 'sealed_relicanth_wailord', rewardMoney: 3000 },
      { type: 'puzzle', loc: 'desert_ruins', targetPuzzleId: 'regirock_name', rewardMoney: 5000 },
    ] },
  { id: 'leg_regice', region: 'hoenn', poke: 378, rewardPoke: 378, requires: { caught: [377] }, npc: { loc: 'island_cave' }, encounter: { loc: 'island_cave', level: 40 },
    steps: [
      { type: 'puzzle', loc: 'island_cave', targetPuzzleId: 'regice_name', rewardMoney: 5000 },
    ] },
  { id: 'leg_registeel', region: 'hoenn', poke: 379, rewardPoke: 379, requires: { caught: [378] }, npc: { loc: 'ancient_tomb' }, encounter: { loc: 'ancient_tomb', level: 40 },
    steps: [
      { type: 'puzzle', loc: 'ancient_tomb', targetPuzzleId: 'registeel_name', rewardMoney: 5000 },
    ] },
  { id: 'leg_latias', region: 'hoenn', poke: 380, rewardPoke: 380, keyItem: 'eon_ticket_latis', npc: { loc: 'slateport' }, encounter: { loc: 'southern_island', level: 50 },
    steps: [
      { type: 'talk', loc: 'slateport', rewardMoney: 1000, rewardItems: { eon_ticket_latis: 1 } },
      { type: 'defeat_wild', loc: 'route118', target: 50, rewardMoney: 2000 },
      { type: 'defeat_wild', loc: 'route119', target: 50, rewardMoney: 2000 },
      { type: 'item', loc: 'southern_island', requiredItem: 'eon_ticket_latis', rewardMoney: 5000 },
    ] },
  { id: 'leg_latios', region: 'hoenn', poke: 381, rewardPoke: 381, requires: { caught: [380], league: 'hoenn' }, npc: { loc: 'southern_island' }, encounter: { loc: 'southern_island', level: 50 },
    steps: [
      { type: 'defeat_wild', loc: 'route124', target: 50, rewardMoney: 2000 },
      { type: 'defeat_wild', loc: 'route125', target: 50, rewardMoney: 2000 },
      { type: 'defeat_wild', loc: 'route126', target: 50, rewardMoney: 6000 },
    ] },
  { id: 'leg_kyogre', region: 'hoenn', poke: 382, rewardPoke: 382, keyItem: 'blue_orb', npc: { loc: 'mt_pyre' }, encounter: { loc: 'cave_of_origin', level: 70 },
    steps: [
      { type: 'talk', loc: 'mt_pyre', rewardMoney: 1500, rewardItems: { blue_orb: 1 } },
      { type: 'trainer_battle', loc: 'seafloor_cavern', battleId: 'hoenn_aqua_seafloor', rewardMoney: 3000 },
      { type: 'defeat_wild', loc: 'route128', target: 150, rewardMoney: 4000 },
      { type: 'item', loc: 'cave_of_origin', requiredItem: 'blue_orb', rewardMoney: 8000 },
    ] },
  { id: 'leg_groudon', region: 'hoenn', poke: 383, rewardPoke: 383, keyItem: 'red_orb', npc: { loc: 'mt_pyre' }, encounter: { loc: 'cave_of_origin', level: 70 },
    steps: [
      { type: 'talk', loc: 'mt_pyre', rewardMoney: 1500, rewardItems: { red_orb: 1 } },
      { type: 'trainer_battle', loc: 'mt_chimney', battleId: 'hoenn_magma_chimney', rewardMoney: 3000 },
      { type: 'defeat_wild', loc: 'route111', target: 150, rewardMoney: 4000 },
      { type: 'item', loc: 'cave_of_origin', requiredItem: 'red_orb', rewardMoney: 8000 },
    ] },
  { id: 'leg_rayquaza', region: 'hoenn', poke: 384, rewardPoke: 384, keyItem: 'meteorite_shard_delta', requires: { caught: [382, 383] }, npc: { loc: 'sky_pillar' }, encounter: { loc: 'sky_pillar', level: 70 },
    steps: [
      { type: 'talk', loc: 'sky_pillar', rewardMoney: 2000, rewardItems: { meteorite_shard_delta: 1 } },
      { type: 'defeat_wild', loc: 'route131', target: 100, rewardMoney: 5000 },
      { type: 'item', loc: 'sky_pillar', requiredItem: 'meteorite_shard_delta', rewardMoney: 10000 },
    ] },
  // Jirachi : trois vœux = trois étapes (aucune condition horaire, règle 6).
  { id: 'leg_jirachi', region: 'hoenn', poke: 385, rewardPoke: 385, npc: { loc: 'fallarbor' }, encounter: { loc: 'mt_chimney', level: 70 },
    steps: [
      { type: 'region_wins', targetRegion: 'hoenn', target: 1000, rewardMoney: 3000 },
      { type: 'dex_region', targetRegion: 'hoenn', target: 50, rewardMoney: 3000 },
      { type: 'defeat_wild', loc: 'mt_chimney', target: 200, rewardMoney: 8000 },
    ] },
  // Deoxys : Île de l'Aurore (depuis Autopia), puzzle « triangle » + 100 victoires.
  { id: 'leg_deoxys', region: 'hoenn', poke: 386, rewardPoke: 386, npc: { loc: 'fallarbor' }, encounter: { loc: 'birth_island', level: 70 },
    steps: [
      { type: 'talk', loc: 'fallarbor', rewardMoney: 1000 },
      { type: 'puzzle', loc: 'birth_island', targetPuzzleId: 'aurora_triangle', rewardMoney: 5000 },
      { type: 'defeat_wild', loc: 'birth_island', target: 100, rewardMoney: 8000 },
    ] },
];

/** Types d'étapes acceptés (tous résolus par questDone / questProgressValue). */
export const LEGENDARY_STEP_TYPES = Object.freeze(['talk', 'item', 'trainer_battle', 'defeat_wild', 'puzzle', 'region_wins', 'dex_region', 'own_species']);

function _g(name) { return (typeof globalThis !== 'undefined') ? globalThis[name] : undefined; }

/** Dernière étape (= quête annexe finale) d'une chaîne légendaire. */
export function legendaryFinalStepId(q) {
  return (q && Array.isArray(q.steps) && q.steps.length) ? `${q.id}_${q.steps.length}` : null;
}

/** Vrai quand les prérequis d'une chaîne sont remplis (captures, ligue, autres chaînes). */
export function legendaryRequirementsMet(q, G) {
  const g = G || _g('G');
  if (!q || !q.requires) return true;
  const r = q.requires;
  if (Array.isArray(r.caught)) {
    for (const id of r.caught) {
      const e = g && g.pokedex ? g.pokedex[id] : null;
      if (!(e && e.caught)) return false;
    }
  }
  if (r.league) {
    const fn = _g('isRegionLeagueWon');
    if (typeof fn === 'function') { if (!fn(r.league)) return false; }
    else if (!(g && g.leagueWon && g.leagueWon[r.league])) return false;
  }
  if (Array.isArray(r.quests)) {
    for (const legId of r.quests) {
      const other = LEGENDARY_QUESTS.find((x) => x.id === legId);
      const fin = legendaryFinalStepId(other);
      if (!(fin && g && g.completedQuests && g.completedQuests['side_' + fin])) return false;
    }
  }
  return true;
}

/**
 * Génère les quêtes annexes des chaînes (Hoenn). Chaque étape devient une
 * entrée SIDE_QUESTS `<legId>_<n>` ; la première porte `reqCondition`
 * (prérequis), la dernière `legendary:true` + `rewardPoke`.
 */
export function buildLegendarySideQuests() {
  const out = {};
  for (const q of LEGENDARY_QUESTS) {
    if (!Array.isArray(q.steps) || !q.steps.length) continue;
    q.steps.forEach((st, i) => {
      const n = i + 1;
      const id = `${q.id}_${n}`;
      const last = n === q.steps.length;
      const def = Object.assign({}, st, {
        id, region: q.region,
        target: st.target || 1,
        rewardMoney: st.rewardMoney || 0,
        rewardItems: st.rewardItems || {},
        legendaryId: q.id, legendaryPoke: q.poke, stepIndex: n, stepCount: q.steps.length,
        prevStep: n > 1 ? `${q.id}_${n - 1}` : null,
        nextStep: last ? null : `${q.id}_${n + 1}`,
      });
      if (last) {
        def.legendary = true;
        def.rewardPoke = q.poke;
        def.rewardLevel = (q.encounter && q.encounter.level) || 50;
        def.encounterLoc = (q.encounter && q.encounter.loc) || st.loc || null;
      }
      if (n === 1 && q.requires) def.reqCondition = () => legendaryRequirementsMet(q);
      out[id] = def;
    });
  }
  return out;
}

export const LEGENDARY_SIDE_QUESTS = buildLegendarySideQuests();

/** Définition légendaire associée à une quête principale (Kanto/Johto). */
export function getLegendaryQuestForMain(mainQuestId) {
  return LEGENDARY_QUESTS.find((q) => q.mainQuestId != null && String(q.mainQuestId) === String(mainQuestId)) || null;
}
export function getLegendaryQuest(legId) {
  return LEGENDARY_QUESTS.find((q) => q.id === legId) || null;
}

/** Statut d'une chaîne pour l'UI / l'audit : locked | available | active | done. */
export function legendaryQuestStatus(q, G) {
  const g = G || _g('G');
  if (!q) return 'locked';
  const fin = legendaryFinalStepId(q);
  if (fin) {
    if (g && g.completedQuests && g.completedQuests['side_' + fin]) return 'done';
    const active = Array.isArray(g && g.activeQuests) && g.activeQuests.some((i) => i.cat === 'side' && String(i.qid).startsWith(q.id + '_'));
    if (active) return 'active';
    return legendaryRequirementsMet(q, g) ? 'available' : 'locked';
  }
  if (g && g.completedQuests && g.completedQuests[q.mainQuestId]) return 'done';
  return 'available';
}

// ── Fusion dans SIDE_QUESTS + surface globale ───────────────────────────────
if (typeof globalThis !== 'undefined') {
  if (globalThis.SIDE_QUESTS && typeof globalThis.SIDE_QUESTS === 'object') Object.assign(globalThis.SIDE_QUESTS, LEGENDARY_SIDE_QUESTS);
  globalThis.LEGENDARY_QUESTS = LEGENDARY_QUESTS;
  globalThis.LEGENDARY_SIDE_QUESTS = LEGENDARY_SIDE_QUESTS;
  globalThis.LEGENDARY_KEY_ITEMS = LEGENDARY_KEY_ITEMS;
  globalThis.LEGENDARY_QUEST_CATCH_MULT = LEGENDARY_QUEST_CATCH_MULT;
  globalThis.legendaryRequirementsMet = legendaryRequirementsMet;
  globalThis.legendaryQuestStatus = legendaryQuestStatus;
  globalThis.getLegendaryQuestForMain = getLegendaryQuestForMain;
  globalThis.getLegendaryQuest = getLegendaryQuest;
  globalThis.legendaryFinalStepId = legendaryFinalStepId;
}
