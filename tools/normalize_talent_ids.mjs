// ============================================================================
// Passe 24 — Normalize ability ids to lowercase.
// ----------------------------------------------------------------------------
// Finding: the battle engine, TALENTS_FULL and the locales use lowercase ids
// ('waterabsorb', 'noguard', 'solarpower'…), while the generated pools
// (POKE_TALENTS / POKEMON_TALENTS.hiddenAbility) and some abilities pinned in
// curated sets were camelCase ('waterAbsorb'…).
// Consequences: empty TALENTS_FULL[tal] lookup → 'Unknown' rarity, sheet shows
// 'No talent', ability INERT in battle (lowercase === comparisons).
// This script lowercases ids (deduplicating pool lists) and is idempotent:
// running it again changes nothing.
// ============================================================================
import { readFileSync, writeFileSync } from 'fs';

const TF = readFileSync(new URL('../src/data/talents-full.js', import.meta.url), 'utf8');
const tfKeys = new Set([...TF.matchAll(/^ {2}(\w+):\s*\{/gm)].map((m) => m[1]));

let changedTotal = 0;

// ——— 1) Generated pools (poke-talents-data.js) ———
{
  const path = new URL('../src/data/poke-talents-data.js', import.meta.url);
  let src = readFileSync(path, 'utf8');
  let changed = 0;
  // JSON arrays "id":["a","b",…] → lowercase + dedupe (order preserved)
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

// ——— 2) Abilities pinned in curated sets ———
// 2 formats: `talent: 'xxx'` (official teams) and positional arrays
// `id: ['xxx', 'item', [moves], 'style']` (atoll) — the ability is the FIRST
// token of the array. Only normalized when the lowercase form is a known
// TALENTS_FULL ability (otherwise left untouched).
for (const rel of ['../src/data/official-teams-data.js', '../src/data/atoll-sets-data.js']) {
  const path = new URL(rel, import.meta.url);
  let src = readFileSync(path, 'utf8');
  let changed = 0;
  src = src.replace(/talent:\s*'([A-Za-z]+)'/g, (whole, id) => {
    const low = id.toLowerCase();
    if (low === id || !tfKeys.has(low)) return whole; // unknown → leave untouched
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

console.log(changedTotal ? `TOTAL : ${changedTotal}` : 'Nothing to normalize (already clean).');


