/**
 * PokéWorld Domain — « Où trouver ce Pokémon ? » (V7 · DEX-01 / HLP-01).
 *
 * SOURCE UNIQUE des provenances d'espèces, partagée par :
 *   - la fiche Pokédex (`findPokemonSources` dans src/ui/game/pokedex.js),
 *   - l'outil `tools/audit-unobtainable.mjs` (contrôle « tout est obtenable »),
 *   - les tests (`tests/p1-dex-sources.test.js`).
 *
 * Pur : aucune dépendance au DOM, à `G` ni à i18n — le module renvoie des
 * sources STRUCTURÉES (`{kind, …données}`) ; la couche UI les localise.
 * Les tables de données sont passées dans un contexte (`ctx`) ; par défaut
 * `defaultSourcesContext()` les lit sur la surface classique (globalThis),
 * ce qui respecte l'ordre de chargement historique.
 *
 * Kinds renvoyés :
 *   wild       { locId, region, bucket, chance, minLv, maxLv }
 *   roaming    { region, chance, level }
 *   starter    { region }
 *   market     { region }
 *   fossil     { item }
 *   quest      { questId, label }
 *   egg        { parents:[id…] }
 *   evo_level  { from, level }
 *   evo_stone  { from, item }
 *   form_shop  { shop, location, price, base }       (une forme achetée)
 *   form_of    { base }                               (forme : rappel de la base)
 *   has_forms  { keys:["351-1",…] }                   (base qui possède des formes)
 *
 * @module domain/world/species-sources
 */
import { BUCKET_ODDS, ROAMING_CHANCE, ROAMING_LEVEL } from './encounter-rules.js';

/** Pool errant par région (même liste que src/application/world/roaming.js). */
export const ROAMING_SPECIES = Object.freeze({
  kanto: [144, 145, 146, 151],
  johto: [243, 244, 245, 251],
  hoenn: [380, 381, 385, 386],
});

/** Bébés obtenus à la pension : bébé → parents (miroir de BABY_BREED_MAP). */
export const BABY_PARENTS = Object.freeze({
  172: [25, 26],
  173: [35, 36],
  174: [39, 40],
  236: [106, 107, 237],
  238: [124],
  239: [125],
  240: [126],
  298: [183, 184],
  360: [202],
});

function g(name) {
  return typeof globalThis !== 'undefined' && globalThis[name] !== undefined
    ? globalThis[name]
    : undefined;
}

/**
 * Contexte par défaut : lit les tables sur la surface classique.
 * Chaque champ est optionnel (table absente ⇒ source ignorée).
 */
export function defaultSourcesContext() {
  const cfg = g('GAME') || {};
  const quests = [];
  // V7 · LEG-01 — une quête légendaire (Kanto/Johto : quête principale enveloppée ;
  // Hoenn : dernière étape d'une chaîne annexe `legendary`) n'apparaît qu'UNE fois,
  // sous le libellé « quête légendaire ».
  const legList = g('LEGENDARY_QUESTS');
  const legArr = Array.isArray(legList) ? legList : Object.values(legList || {});
  const wrappedMain = new Set(
    legArr.filter((q) => q && q.mainQuestId != null).map((q) => String(q.mainQuestId))
  );
  const pushQuests = (list, label) => {
    const arr = Array.isArray(list) ? list : Object.values(list || {});
    for (const q of arr) {
      if (!q || !q.rewardPoke) continue;
      if (label === 'main' && wrappedMain.has(String(q.id))) continue;
      if (label === 'side' && q.legendary) continue;
      quests.push({ id: q.id, label, rewardPoke: Number(q.rewardPoke) });
    }
  };
  pushQuests(g('STORY_QUESTS'), 'main');
  pushQuests(g('STORY_QUESTS_HOENN'), 'main');
  pushQuests(g('SIDE_QUESTS'), 'side');
  pushQuests(legArr, 'legendary');
  return {
    locTables: {
      kanto: g('LOCS') || {},
      johto: g('LOCS_JOHTO') || {},
      hoenn: g('LOCS_HOENN') || {},
    },
    starters: {
      kanto: cfg.KANTO_STARTERS || [1, 4, 7],
      johto: cfg.JOHTO_STARTERS || [152, 155, 158],
      hoenn: cfg.HOENN_STARTERS || [252, 255, 258],
    },
    marketStock: g('MARKET_STOCK') || null,
    fossilMap: g('FOSSIL_REVIVE_MAP') || null,
    quests,
    babyParents: BABY_PARENTS,
    levelEvoMap: g('LEVEL_EVO_MAP') || {},
    evoLevels: g('EVO_LEVELS') || {},
    stoneEvo: g('STONE_EVO') || {},
    forms: g('FORMS') || {},
    formShops: g('FORM_SHOPS') || {},
    roaming: ROAMING_SPECIES,
  };
}

function parseRef(ref) {
  if (ref && typeof ref === 'object')
    return { id: Number(ref.id) || 0, form: Number(ref.form) || 0 };
  const s = String(ref == null ? '' : ref);
  const dash = s.indexOf('-');
  if (dash > 0) return { id: Number(s.slice(0, dash)) || 0, form: Number(s.slice(dash + 1)) || 0 };
  return { id: Number(s) || 0, form: 0 };
}

/**
 * Probabilité d'apparition d'une espèce à chaque spawn d'une table sauvage,
 * d'après la règle des seaux de `pickWildFromTable` : tirage 4 % rare /
 * 20 % peu commun / 76 % commun, puis tirage uniforme DANS le seau ; un seau
 * vide se replie sur le palier suivant (rare → peu commun → commun), donc une
 * table sans rare donne ses 4 % à ses peu communs, etc. Les chances d'une
 * table somment toujours à 1 (hors errant).
 * @returns {{bucket:string, chance:number, minLv:number, maxLv:number}|null}
 */
export function wildOdds(wildTable, speciesId) {
  const wild = Array.isArray(wildTable) ? wildTable : [];
  const nid = Number(speciesId);
  const row = wild.find((w) => Array.isArray(w) && Number(w[0]) === nid);
  if (!row) return null;
  const bucket = row[3] || 'common';
  const order = ['rare', 'uncommon', 'common'];
  const odds = {
    rare: BUCKET_ODDS.rare,
    uncommon: BUCKET_ODDS.uncommon,
    common: 1 - BUCKET_ODDS.rare - BUCKET_ODDS.uncommon,
  };
  const entriesOf = (b) => wild.filter((w) => (w[3] || 'common') === b);
  // Même algorithme que pickWildFromTable : pour chaque seau tiré, on prend le
  // premier seau non vide à partir de lui (sinon toute la table), tirage uniforme.
  let chance = 0;
  for (let i = 0; i < order.length; i++) {
    let pool = [];
    for (const b of order.slice(i)) {
      const ent = entriesOf(b);
      if (ent.length) {
        pool = ent;
        break;
      }
    }
    if (!pool.length) pool = wild;
    if (pool.some((w) => Number(w[0]) === nid)) chance += odds[order[i]] / pool.length;
  }
  return {
    bucket,
    chance,
    minLv: Number(row[1]) || 1,
    maxLv: Number(row[2]) || Number(row[1]) || 1,
  };
}

/**
 * Toutes les provenances structurées d'une espèce (id, "351-1" ou Pokémon).
 * @param {number|string|{id:number,form?:number}} ref
 * @param {Object} [ctx=defaultSourcesContext()]
 * @returns {Array<Object>}
 */
export function computeSpeciesSources(ref, ctx) {
  const c = ctx || defaultSourcesContext();
  const { id, form } = parseRef(ref);
  const out = [];
  if (!id) return out;

  // ── Formes : une forme a SA provenance (boutique) ; la base liste ses formes.
  if (form > 0) {
    const def = (c.forms || {})[`${id}-${form}`];
    if (def && def.source && def.source.shop) {
      const shop = (c.formShops || {})[def.source.shop] || {};
      out.push({
        kind: 'form_shop',
        shop: def.source.shop,
        location: shop.location || null,
        price: Number(def.source.price) || 0,
        base: id,
      });
    }
    out.push({ kind: 'form_of', base: id });
    return out;
  }

  // ── Sauvage (3 régions) avec seau + probabilité.
  for (const region of Object.keys(c.locTables || {})) {
    const locs = c.locTables[region] || {};
    for (const locId of Object.keys(locs)) {
      const odds = wildOdds(locs[locId] && locs[locId].wild, id);
      if (odds) out.push({ kind: 'wild', locId, region, ...odds });
    }
  }
  // ── Légendaire errant.
  for (const region of Object.keys(c.roaming || {})) {
    if ((c.roaming[region] || []).includes(id))
      out.push({ kind: 'roaming', region, chance: ROAMING_CHANCE, level: ROAMING_LEVEL });
  }
  // ── Starter.
  for (const region of Object.keys(c.starters || {})) {
    if ((c.starters[region] || []).includes(id)) out.push({ kind: 'starter', region });
  }
  // ── Marché.
  if (c.marketStock) {
    for (const region of Object.keys(c.marketStock)) {
      if ((c.marketStock[region] || []).map(Number).includes(id))
        out.push({ kind: 'market', region });
    }
  }
  // ── Fossiles.
  if (c.fossilMap) {
    for (const item of Object.keys(c.fossilMap))
      if (Number(c.fossilMap[item]) === id) out.push({ kind: 'fossil', item });
  }
  // ── Quêtes à récompense Pokémon.
  for (const q of c.quests || [])
    if (Number(q.rewardPoke) === id) out.push({ kind: 'quest', questId: q.id, label: q.label });
  // ── Œufs (bébés).
  if (c.babyParents && c.babyParents[id])
    out.push({ kind: 'egg', parents: c.babyParents[id].slice() });
  // ── Évolutions.
  for (const from of Object.keys(c.levelEvoMap || {})) {
    if (Number(c.levelEvoMap[from]) === id)
      out.push({
        kind: 'evo_level',
        from: Number(from),
        level: Number((c.evoLevels || {})[from]) || null,
      });
  }
  for (const from of Object.keys(c.stoneEvo || {})) {
    const map = c.stoneEvo[from] || {};
    for (const item of Object.keys(map))
      if (Number(map[item]) === id) out.push({ kind: 'evo_stone', from: Number(from), item });
  }
  // ── Formes connues de cette base.
  const formKeys = Object.keys(c.forms || {})
    .filter((k) => Number(c.forms[k].base) === id)
    .sort();
  if (formKeys.length) out.push({ kind: 'has_forms', keys: formKeys });
  return out;
}

/** Kinds qui ne sont PAS une provenance directe (liens d'évolution / de forme). */
const INDIRECT_KINDS = new Set(['evo_level', 'evo_stone', 'has_forms', 'form_of']);

/**
 * Vrai si l'espèce a au moins une provenance DIRECTE : sauvage, errant,
 * starter, marché, fossile, quête, œuf ou boutique de forme. Les évolutions
 * ne comptent pas (c'est `reachableSpecies` qui fait la fermeture).
 */
export function hasDirectSource(ref, ctx) {
  return computeSpeciesSources(ref, ctx).some((s) => !INDIRECT_KINDS.has(s.kind));
}

/**
 * Fermeture par évolution : ensemble des espèces atteignables depuis les
 * sources directes (niveau toujours ; pierre seulement si `itemObtainable`
 * accepte l'objet — passer `() => true` pour la fermeture sans condition).
 * @param {number[]} allIds
 * @param {Object} ctx
 * @param {(item:string)=>boolean} [itemObtainable]
 */
export function reachableSpecies(allIds, ctx, itemObtainable) {
  const c = ctx || defaultSourcesContext();
  const ok = typeof itemObtainable === 'function' ? itemObtainable : () => true;
  const reach = new Set(allIds.filter((id) => hasDirectSource(id, c)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of Object.keys(c.levelEvoMap || {})) {
      const t = Number(c.levelEvoMap[f]);
      if (reach.has(Number(f)) && !reach.has(t)) {
        reach.add(t);
        changed = true;
      }
    }
    for (const f of Object.keys(c.stoneEvo || {})) {
      if (!reach.has(Number(f))) continue;
      for (const item of Object.keys(c.stoneEvo[f] || {})) {
        const t = Number(c.stoneEvo[f][item]);
        if (!reach.has(t) && ok(item)) {
          reach.add(t);
          changed = true;
        }
      }
    }
  }
  return reach;
}

if (typeof globalThis !== 'undefined') {
  globalThis.computeSpeciesSources = computeSpeciesSources;
  globalThis.defaultSourcesContext = defaultSourcesContext;
  globalThis.wildOdds = wildOdds;
  globalThis.hasDirectSource = hasDirectSource;
  globalThis.reachableSpecies = reachableSpecies;
  globalThis.ROAMING_SPECIES = ROAMING_SPECIES;
  globalThis.BABY_PARENTS = BABY_PARENTS;
}
