#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
// audit-unobtainable.mjs — Passe 39g (2)
//
// Question du joueur : « la liste dans tout le jeu des Pokémon non
// obtenable, ni par capture ni par évolution, ni par achat. Et dont les
// objets d'évolutions sont inaccessible/in obtenable. »
//
// L'outil calcule, depuis les DONNÉES du jeu (source unique) :
//   A. les Pokémon OBTENABLES :
//        - sauvages (toutes les tables wild des 3 régions)
//        - légendaires errants (pool 12 h de roaming.js)
//        - starters (3 régions)
//        - marché (MARKET_STOCK des 3 régions)
//        - fossiles (ITEMS[].revive, minés dans la mine)
//        - récompenses Pokémon des quêtes (histoire + Hoenn + annexes)
//        - œufs d'incubation (BABY_BREED_MAP)
//        - formes achetables (FORMS : clés "351-1"… — V7 · FORM-01)
//        - FERMETURE par évolution : LEVEL_EVO_MAP (niveau, toujours) et
//          STONE_EVO (objet — seulement si l'objet est OBTENABLE)
//   B. les OBTENABILITÉS D'OBJET : boutiques (SHOPS + SHOPS_HOENN),
//        stock CTCS, drops de routes (ROUTE_DROPS), mine (MINE_ITEMS),
//        récompenses d'objets des quêtes.
//
// Sortie :
//   1. Pokémon NON OBTENABLES (ni sauvage, ni achat, ni quête, ni fossile,
//      ni œuf, ni évolution depuis une espèce obtenable) — la liste demandée.
//   2. Évolutions BLOQUÉES : espèce atteignable uniquement par une évolution
//      dont l'objet n'est OBTENABLE NULLE PART — la seconde partie de la
//      question (« objets d'évolutions inaccessibles »).
//   3. Croisement avec getReachableSpecies() du jeu (contrôle).
//
// Usage : node tools/audit-unobtainable.mjs
// ════════════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(path.join(root, p), 'utf8');

// ── PD (script classique à fenêtre) ─────────────────────────────────────────
const fakeWindow = {};
new Function('window', read('src/data/pd-data.js'))(fakeWindow);
const PD = fakeWindow.PD;
const DEX_MAX = Math.max(...Object.keys(PD).map(Number));
const name = (id) => (PD[id] && PD[id][0]) || ('#' + id);
const regionOf = (id) => (id <= 151 ? 'Kanto' : id <= 251 ? 'Johto' : 'Hoenn');

// ── Modules de données ──────────────────────────────────────────────────────
const { LOCS } = await import('../src/data/locations-data.js');
const { LOCS_JOHTO } = await import('../src/data/locations-johto.js');
const { LOCS_HOENN } = await import('../src/data/locations-hoenn.js');
const { ITEMS } = await import('../src/data/items-data.js');
const { STORY_QUESTS } = await import('../src/data/story-quests.js');
const { STORY_QUESTS_HOENN } = await import('../src/data/story-quests-hoenn.js');
const { SIDE_QUESTS } = await import('../src/data/side-quests-data.js');
const { REPEATABLE_QUESTS } = await import('../src/data/repeatable-quests-data.js');
const { SHOPS } = await import('../src/data/shops-data.js');
const { SHOPS_HOENN } = await import('../src/data/shops-hoenn.js');
const { CTCS_SHOP_STOCK } = await import('../src/data/ctcs-shop-data.js');
const { ROUTE_DROPS } = await import('../src/data/route-drops.js');
const { MINE_ITEMS } = await import('../src/application/economy/mine.js');
const { MARKET_STOCK } = await import('../src/domain/economy/market.js');
const { LEVEL_EVO_MAP, EVO_LEVELS, STONE_EVO } = await import('../src/application/combat/progression.js');
// Le helper du jeu (surface globale) sert de contre-vérification.
await import('../src/data/game-helpers.js');
globalThis.LOCS = LOCS;
globalThis.LOCS_JOHTO = LOCS_JOHTO;
globalThis.LOCS_HOENN = LOCS_HOENN;
globalThis.ITEMS = ITEMS;
globalThis.STORY_QUESTS = STORY_QUESTS;
globalThis.STORY_QUESTS_HOENN = STORY_QUESTS_HOENN;
globalThis.SIDE_QUESTS = SIDE_QUESTS;
globalThis.LEVEL_EVO_MAP = LEVEL_EVO_MAP;
globalThis.STONE_EVO = STONE_EVO;
globalThis.PD = PD;

const questList = (qs) => (Array.isArray(qs) ? qs : Object.values(qs || {}));
const allQuests = [
  ...questList(STORY_QUESTS).map((q) => ['quête histoire', q]),
  ...questList(STORY_QUESTS_HOENN).map((q) => ['quête histoire Hoenn', q]),
  ...questList(SIDE_QUESTS).map((q) => ['quête annexe', q]),
  ...questList(REPEATABLE_QUESTS).map((q) => ['quête répétable', q]),
];

// ── 1) Sources directes de Pokémon ──────────────────────────────────────────
// V7 · DEX-01 — SOURCE UNIQUE : src/domain/world/species-sources.js (la même
// fonction alimente la fiche Pokédex). L'outil ne recopie plus aucune liste.
const { computeSpeciesSources, reachableSpecies } = await import('../src/domain/world/species-sources.js');
const { FORMS, FORM_SHOPS } = await import('../src/data/forms-data.js');
const { LEGENDARY_QUESTS } = await import('../src/data/legendary-quests.js').catch(() => ({ LEGENDARY_QUESTS: [] }));
const { FOSSIL_REVIVE_MAP } = await import('../src/application/breeding/hatchery.js').catch(() => ({ FOSSIL_REVIVE_MAP: null }));
const GAME_CONFIG = (await import('../src/data/game-config.js').catch(() => ({ GAME: {} }))).GAME || {};
const { EVO_LEVELS: _EVL } = { EVO_LEVELS };
const ctx = {
  locTables: { kanto: LOCS, johto: LOCS_JOHTO, hoenn: LOCS_HOENN },
  starters: { kanto: GAME_CONFIG.KANTO_STARTERS || [1, 4, 7], johto: GAME_CONFIG.JOHTO_STARTERS || [152, 155, 158], hoenn: GAME_CONFIG.HOENN_STARTERS || [252, 255, 258] },
  marketStock: MARKET_STOCK,
  fossilMap: FOSSIL_REVIVE_MAP || Object.fromEntries(Object.keys(ITEMS).filter((k) => ITEMS[k] && ITEMS[k].revive).map((k) => [k, Number(ITEMS[k].revive)])),
  // V7 · LEG-01 — les quêtes légendaires (mains Kanto/Johto enveloppées, dernières
  // étapes des chaînes Hoenn) ne sont listées qu'une fois : « quête légendaire ».
  quests: allQuests.filter(([, q]) => q && q.rewardPoke && !q.legendary && !LEGENDARY_QUESTS.some((l) => l.mainQuestId != null && String(l.mainQuestId) === String(q.id))).map(([label, q]) => ({ id: q.id, label, rewardPoke: Number(q.rewardPoke) }))
    .concat((Array.isArray(LEGENDARY_QUESTS) ? LEGENDARY_QUESTS : Object.values(LEGENDARY_QUESTS || {})).filter((q) => q && q.poke).map((q) => ({ id: q.id, label: 'quête légendaire', rewardPoke: Number(q.poke) }))),
  babyParents: (await import('../src/domain/world/species-sources.js')).BABY_PARENTS,
  levelEvoMap: LEVEL_EVO_MAP, evoLevels: _EVL, stoneEvo: STONE_EVO,
  forms: FORMS, formShops: FORM_SHOPS,
  roaming: (await import('../src/domain/world/species-sources.js')).ROAMING_SPECIES,
};
const srcLabel = (s) => {
  switch (s.kind) {
    case 'wild': return `sauvage (${s.region}) ${s.locId} [${s.bucket} ${(s.chance * 100).toFixed(1)} %]`;
    case 'roaming': return `légendaire errant (${s.region})`;
    case 'starter': return `starter (${s.region})`;
    case 'market': return `marché (${s.region})`;
    case 'fossil': return `fossile (${s.item})`;
    case 'quest': return `${s.label} ${s.questId}`;
    case 'egg': return `œuf d'incubation (de ${s.parents.map(name).join('/')})`;
    case 'form_shop': return `forme achetée — ${s.shop} ${s.price}₽ (base ${name(s.base)} en PC)`;
    default: return null;
  }
};
const sources = new Map(); // id|clé → Set<labels>
const allKeys = [...Object.keys(PD).map(Number), ...Object.keys(FORMS)];
for (const key of allKeys) {
  for (const s of computeSpeciesSources(key, ctx)) {
    const label = srcLabel(s);
    if (!label) continue;
    if (!sources.has(key)) sources.set(key, new Set());
    sources.get(key).add(label);
  }
}
// ── 2) Obtenabilité des objets ─────────────────────────────────────────────
const itemSources = new Map(); // key → Set<labels>
const addItemSrc = (key, label) => {
  if (!key) return;
  if (!itemSources.has(key)) itemSources.set(key, new Set());
  itemSources.get(key).add(label);
};
for (const [k, s] of Object.entries(SHOPS)) for (const it of (s && s.items) || []) addItemSrc(it, `boutique ${k}`);
for (const [k, s] of Object.entries(SHOPS_HOENN)) for (const it of (s && s.items) || []) addItemSrc(it, `boutique ${k}`);
for (const [k, list] of Object.entries(CTCS_SHOP_STOCK)) for (const it of list || []) addItemSrc(it, `stock CT ${k}`);
for (const [k, list] of Object.entries(ROUTE_DROPS)) for (const it of list || []) addItemSrc(it, `drop route (${k})`);
for (const m of MINE_ITEMS) addItemSrc(m.key, 'mine');
for (const [, q] of allQuests) if (q && q.rewardItems) for (const k in q.rewardItems) addItemSrc(k, 'récompense de quête');
const itemObtainable = (key) => itemSources.has(key);
const itemFrom = (key) => [...(itemSources.get(key) || [])].slice(0, 3).join(', ');

// ── 3) Fermeture par évolution (domaine : reachableSpecies) ────────────────
const pdIds = Object.keys(PD).map(Number);
// 3a. sans condition sur les objets (= getReachableSpecies du jeu)
const closureAny = reachableSpecies(pdIds, ctx, () => true);
// 3b. conditionnelle : une évolution à objet n'est ouverte que si l'objet est obtenable.
const reachable = reachableSpecies(pdIds, ctx, itemObtainable);
const blockedEvo = new Map(); // target id → [{from, stone}]
for (const f in STONE_EVO) {
  if (!reachable.has(Number(f))) continue;
  for (const sk in STONE_EVO[f]) {
    const t = Number(STONE_EVO[f][sk]);
    if (reachable.has(t) || itemObtainable(sk)) continue;
    if (!blockedEvo.has(t)) blockedEvo.set(t, []);
    blockedEvo.get(t).push({ from: Number(f), stone: sk });
  }
}
// Formes : chacune doit avoir une provenance directe (boutique).
const formsWithoutSource = Object.keys(FORMS).filter((k) => !sources.has(k));

// ── 4) Rapport ──────────────────────────────────────────────────────────────
const allIds = Object.keys(PD).map(Number).sort((a, b) => a - b);
const unobtainable = allIds.filter((id) => !closureAny.has(id));
const blockedOnly = allIds.filter((id) => closureAny.has(id) && !reachable.has(id) && blockedEvo.has(id));
const gameReach = typeof globalThis.getReachableSpecies === 'function' ? new Set(globalThis.getReachableSpecies()) : null;

console.log('═══════════════════════════════════════════════════════════════════');
console.log('AUDIT — Pokémon non obtenables (Passe 39f)');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Pokédex : ${allIds.length} espèces (#1 → #${DEX_MAX})`);
console.log(`Obtenables (fermeture évolution conditionnelle) : ${reachable.size}`);
console.log(`Obtenables sans condition sur les objets : ${closureAny.size}`);
console.log(`NON obtenables : ${unobtainable.length}`);
console.log(`Évolutions bloquées (objet inaccessible) : ${blockedOnly.length}`);
console.log(`Formes (FORMS) : ${Object.keys(FORMS).length} — sans provenance : ${formsWithoutSource.length ? formsWithoutSource.join(', ') : '0'}`);
for (const k of Object.keys(FORMS)) console.log(`  forme ${k} ${(FORMS[k].name_fr || '').padEnd(18)} ← ${[...(sources.get(k) || [])].join(' ; ') || 'AUCUNE SOURCE'}`);
if (gameReach) {
  const mineOnly = [...reachable].filter((id) => !gameReach.has(id));
  const gameOnly = [...gameReach].filter((id) => !reachable.has(id));
  console.log(`Contrôle getReachableSpecies() : écart auditeur−jeu = [${mineOnly.join(',') || '∅'}], jeu−auditeur = [${gameOnly.join(',') || '∅'}]`);
}

console.log('\n── 1) POKÉMON NON OBTENABLES (ni capture, ni évolution, ni achat) ──');
if (!unobtainable.length) console.log('(aucun — toute la Pokédex est atteignable)');
for (const id of unobtainable) {
  const pre = [];
  for (const f in LEVEL_EVO_MAP) if (Number(LEVEL_EVO_MAP[f]) === id) pre.push(`${name(Number(f))} (niveau ${EVO_LEVELS[f] || '?'})`);
  for (const f in STONE_EVO) {
    const stones = Object.keys(STONE_EVO[f]).filter((s) => Number(STONE_EVO[f][s]) === id);
    if (stones.length) pre.push(`${name(Number(f))} (${stones.join('/')})`);
  }
  const suffix = pre.length ? ' · pré-évolution(s) : ' + pre.join(' ou ') : ' · n’est la cible d’aucune évolution';
  console.log(`  #${String(id).padStart(3)} ${name(id).padEnd(14)} ${regionOf(id).padEnd(16)} ← aucune source${suffix}`);
}

console.log('\n── 2) Évolutions BLOQUÉES — objet d’évolution INOBTENABLE ──');
if (!blockedOnly.length) console.log('(aucune — tous les objets d’évolution sont obtenables)');
for (const id of blockedOnly) {
  for (const b of blockedEvo.get(id)) {
    console.log(`  #${String(id).padStart(3)} ${name(id).padEnd(14)} ← ${name(b.from)} + ${b.stone}  [${b.stone} : AUCUNE source dans le jeu]`);
  }
}

// V7 · LEG-01/02 — provenance de chaque légendaire (acceptation LEG-02 : 377–386 ont une source « quête »).
console.log('\n── 2b) LÉGENDAIRES — provenance ──');
const LEGENDARY_SPECIES = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251, 377, 378, 379, 380, 381, 382, 383, 384, 385, 386];
for (const id of LEGENDARY_SPECIES) {
  const labels = [...(sources.get(id) || [])];
  const hasQuest = labels.some((l) => l.startsWith('quête légendaire'));
  console.log(`  ${hasQuest ? '✔' : '✘'} #${String(id).padStart(3)} ${name(id).padEnd(12)} ← ${labels.join(' ; ') || 'AUCUNE SOURCE'}`);
}

console.log('\n── 3) OBJETS D’ÉVOLUTION — provenance (ou absence) ──');
const stones = [...new Set(Object.values(STONE_EVO).flatMap((o) => Object.keys(o)))].sort();
for (const s of stones) {
  const ok = itemObtainable(s);
  console.log(`  ${ok ? '✔' : '✘'} ${s.padEnd(16)} ${ok ? itemFrom(s) : 'AUCUNE SOURCE'}`);
}
console.log('');
