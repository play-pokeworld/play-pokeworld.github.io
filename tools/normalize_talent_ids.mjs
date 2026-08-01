// ============================================================================
// Passe 24 — Normalisation des identifiants de talents en minuscules.
// ----------------------------------------------------------------------------
// Constat : le moteur de combat, TALENTS_FULL et les locales utilisent des ids
// EN MINUSCULES ('waterabsorb', 'noguard', 'solarpower'…), alors que les pools
// générés (POKE_TALENTS / POKEMON_TALENTS.hiddenAbility) et certains talents
// épinglés dans les sets curés étaient en camelCase ('waterAbsorb'…).
// Conséquences : filtre TALENTS_FULL[tal] vide → rareté « Unknown », fiche
// « Aucun talent », talent INERTE en combat (comparaisons === en minuscules).
// Ce script réécrit les ids en minuscules (déduplique les listes de pools) et
// idempotent : le relancer ne change plus rien.
// ============================================================================
import { readFileSync, writeFileSync } from 'fs';

const TF = readFileSync(new URL('../src/data/talents-full.js', import.meta.url), 'utf8');
const tfKeys = new Set([...TF.matchAll(/^ {2}(\w+):\s*\{/gm)].map((m) => m[1]));

let changedTotal = 0;

// ——— 1) Pools générés (poke-talents-data.js) ———
{
  const path = new URL('../src/data/poke-talents-data.js', import.meta.url);
  let src = readFileSync(path, 'utf8');
  let changed = 0;
  // Tableaux JSON "id":["a","b",…] → lowercase + déduplication (ordre conservé)
  src = src.replace(/\[((?:"[A-Za-z]+",?)+)\]/g, (whole, body) => {
    const ids = body.match(/"([A-Za-z]+)"/g).map((s) => s.slice(1, -1));
    const seen = new Set();
    const out = [];
    for (const id of ids) {
      const low = id.toLowerCase();
      if (seen.has(low)) { changed++; continue; }
      seen.add(low);
      if (low !== id) changed++;
      out.push(low);
    }
    return '[' + out.map((id) => `"${id}"`).join(',') + ']';
  });
  // hiddenAbility="camelCase" → lowercase
  src = src.replace(/hiddenAbility="([A-Za-z]+)"/g, (whole, id) => {
    const low = id.toLowerCase();
    if (low !== id) changed++;
    return `hiddenAbility="${low}"`;
  });
  if (changed) { writeFileSync(path, src); changedTotal += changed; }
  console.log(`poke-talents-data.js : ${changed} id(s) normalisé(s)/dédupliqué(s)`);
}

// ——— 1b) Talents cachés par espèce (pokemon-talents.js, format JSON) ———
// Ce fichier REDÉFINIT POKEMON_TALENTS en binding lexical (const) — c'est lui
// que lit le code unqualified ensuite : ses valeurs DOIVENT aussi être
// normalisées (sinon 132 talents cachés restent camelCase et inertes).
{
  const path = new URL('../src/data/pokemon-talents.js', import.meta.url);
  let src = readFileSync(path, 'utf8');
  let changed = 0;
  src = src.replace(/"hiddenAbility":\s*"([A-Za-z]+)"/g, (whole, id) => {
    const low = id.toLowerCase();
    if (low === id || !tfKeys.has(low)) return whole;
    changed++;
    return `"hiddenAbility": "${low}"`;
  });
  if (changed) { writeFileSync(path, src); changedTotal += changed; }
  console.log(`pokemon-talents.js : ${changed} hiddenAbility normalisé(s)`);
}

// ——— 2) Talents épinglés dans les sets curés ———
// 2 formats : `talent: 'xxx'` (official teams) et tableaux positionnels
// `id: ['xxx', 'item', [moves], 'style']` (atoll) — le talent est le PREMIER
// token du tableau. On ne normalise que si la version minuscule est un talent
// connu de TALENTS_FULL (sinon on ne touche à rien).
for (const rel of ['../src/data/official-teams-data.js', '../src/data/atoll-sets-data.js']) {
  const path = new URL(rel, import.meta.url);
  let src = readFileSync(path, 'utf8');
  let changed = 0;
  src = src.replace(/talent:\s*'([A-Za-z]+)'/g, (whole, id) => {
    const low = id.toLowerCase();
    if (low === id || !tfKeys.has(low)) return whole; // inconnu → on ne touche pas
    changed++;
    return `talent: '${low}'`;
  });
  src = src.replace(/(\d+:\s*\[\s*)'([A-Za-z]+)'/g, (whole, head, id) => {
    const low = id.toLowerCase();
    if (low === id || !tfKeys.has(low)) return whole;
    changed++;
    return `${head}'${low}'`;
  });
  if (changed) { writeFileSync(path, src); changedTotal += changed; }
  console.log(`${rel.split('/').pop()} : ${changed} talent(s) normalisé(s)`);
}

console.log(changedTotal ? `TOTAL : ${changedTotal}` : 'Rien à normaliser (déjà propre).');

