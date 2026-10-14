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
//        - formes spéciales achetables (387-389 ← 351, 390-392 ← 386)
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
const regionOf = (id) => (id <= 151 ? 'Kanto' : id <= 251 ? 'Johto' : id <= 386 ? 'Hoenn' : 'formes spéciales');

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
const sources = new Map(); // id → Set<labels>
const addSrc = (id, label) => {
  id = Number(id);
  if (!id) return;
  if (!sources.has(id)) sources.set(id, new Set());
  sources.get(id).add(label);
};

for (const [label, locs] of [['sauvage (Kanto)', LOCS], ['sauvage (Johto)', LOCS_JOHTO], ['sauvage (Hoenn)', LOCS_HOENN]]) {
  for (const k in locs) for (const w of (locs[k].wild || [])) if (Array.isArray(w) && w.length) addSrc(w[0], label);
}
// Pool errant (src/application/world/roaming.js) — même liste que le jeu.
for (const id of [144, 145, 146, 151, 243, 244, 245, 251, 380, 381, 385, 386]) addSrc(id, 'légendaire errant');
for (const id of [1, 4, 7, 152, 155, 158, 252, 255, 258]) addSrc(id, 'starter');
for (const region of Object.keys(MARKET_STOCK)) for (const id of MARKET_STOCK[region]) addSrc(id, 'marché');
for (const k in ITEMS) {
  const r = Number(ITEMS[k] && ITEMS[k].revive);
  if (r && r <= DEX_MAX) addSrc(r, `fossile (${k})`);
}
for (const [label, q] of allQuests) if (q && q.rewardPoke) addSrc(q.rewardPoke, label);
// Œufs d'incubation (src/application/breeding/hatchery.js, BABY_BREED_MAP).
const BABY_BREED_MAP = { 25: 172, 26: 172, 35: 173, 36: 173, 39: 174, 40: 174, 106: 236, 107: 236, 237: 236, 124: 238, 125: 239, 126: 240, 183: 298, 184: 298, 202: 360 };
for (const [parent, baby] of Object.entries(BABY_BREED_MAP)) addSrc(baby, `œuf d'incubation (de ${name(parent)})`);
// Formes spéciales achetables (labo Météo / Météorites) — base dans le PC.
for (const [form, base] of [[387, 351], [388, 351], [389, 351], [390, 386], [391, 386], [392, 386]]) {
  addSrc(form, `forme spéciale achetée (base ${name(base)} en PC)`);
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

// ── 3) Fermeture par évolution ─────────────────────────────────────────────
// 3a. Fermeture SANS condition sur les objets (comme getReachableSpecies du jeu)
//     → sert de contrôle et détecte « évolution possible si l'objet existait ».
const closureAny = new Set([...sources.keys()].map(Number));
let changed = true;
while (changed) {
  changed = false;
  for (const f in LEVEL_EVO_MAP) {
    const t = Number(LEVEL_EVO_MAP[f]);
    if (closureAny.has(Number(f)) && !closureAny.has(t)) { closureAny.add(t); changed = true; }
  }
  for (const f in STONE_EVO) {
    if (!closureAny.has(Number(f))) continue;
    for (const sk in STONE_EVO[f]) {
      const t = Number(STONE_EVO[f][sk]);
      if (!closureAny.has(t)) { closureAny.add(t); changed = true; }
    }
  }
}
// 3b. Fermination CONDITIONNELLE : une évolution à objet n'est ouverte que si
//     l'objet est obtenable quelque part dans le jeu.
const reachable = new Set([...sources.keys()].map(Number));
const blockedEvo = new Map(); // target id → [{from, stone}]
changed = true;
while (changed) {
  changed = false;
  for (const f in LEVEL_EVO_MAP) {
    const t = Number(LEVEL_EVO_MAP[f]);
    if (reachable.has(Number(f)) && !reachable.has(t)) { reachable.add(t); changed = true; }
  }
  for (const f in STONE_EVO) {
    if (!reachable.has(Number(f))) continue;
    for (const sk in STONE_EVO[f]) {
      const t = Number(STONE_EVO[f][sk]);
      if (reachable.has(t)) continue;
      if (itemObtainable(sk)) { reachable.add(t); changed = true; }
      else {
        if (!blockedEvo.has(t)) blockedEvo.set(t, []);
        blockedEvo.get(t).push({ from: Number(f), stone: sk });
      }
    }
  }
}

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

console.log('\n── 3) OBJETS D’ÉVOLUTION — provenance (ou absence) ──');
const stones = [...new Set(Object.values(STONE_EVO).flatMap((o) => Object.keys(o)))].sort();
for (const s of stones) {
  const ok = itemObtainable(s);
  console.log(`  ${ok ? '✔' : '✘'} ${s.padEnd(16)} ${ok ? itemFrom(s) : 'AUCUNE SOURCE'}`);
}
console.log('');
