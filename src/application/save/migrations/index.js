/**
 * PokéWorld — migrations de sauvegarde (V7 · FORM-02, règle 12 : « une
 * sauvegarde ne se supprime jamais »).
 *
 * Une fonction par version cible, appliquée en chaîne par `migrateSaveData`
 * dans `readSlot` / import — AU LIEU de `deleteIncompatibleSave`.
 *
 *   v3 → v4 : les formes ne sont plus des numéros de dex (387–392) mais des
 *             Pokémon `{ id: 351|386, form: 1..3 }` (FORM-01). Réécrit
 *             équipe, boîtes (re-clé "351-1"), pension, entraînement, marché,
 *             Atoll, `G.pokedex` (sous-entrées `forms`), talents débloqués,
 *             compteurs de doublons.
 *
 * @module application/save/migrations
 */
import { FORMS, LEGACY_FORM_IDS } from '../../../data/forms-data.js';

/** Version de schéma courante — identique à SAVE_VERSION (save.js / game-config.js). */
export const CURRENT_SAVE_SCHEMA = 4;
/** Plus ancienne version encore chargeable (migrée à la volée). */
export const OLDEST_SUPPORTED_SCHEMA = 3;

function legacyFormOf(id) {
  const key = LEGACY_FORM_IDS[Number(id)];
  if (!key) return null;
  const def = FORMS[key];
  if (!def) return null;
  return { key, def };
}

function looksLikePokemon(o) {
  return !!(
    o &&
    typeof o === 'object' &&
    !Array.isArray(o) &&
    Number.isFinite(Number(o.id)) &&
    ('level' in o || 'maxHP' in o || 'moves' in o || 'uid' in o)
  );
}

/**
 * Réécrit un objet Pokémon porteur d'un ancien id de forme (387–392).
 * @returns {boolean} vrai si l'objet a été réécrit
 */
export function rewriteLegacyFormPokemon(p, lang) {
  const lf = legacyFormOf(p && p.id);
  if (!lf || !looksLikePokemon(p)) return false;
  p.id = lf.def.base;
  p.form = lf.def.slot;
  p.name = (lang === 'en' ? lf.def.name_en : lf.def.name_fr) || lf.def.name_en;
  if (lf.def.types) {
    p.type1 = lf.def.types[0] || p.type1;
    p.type2 = lf.def.types[1] || '';
  }
  return true;
}

// Parcours profond (cycles protégés) : tout Pokémon stocké n'importe où dans G.
function walk(node, seen, fn) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (const v of node) walk(v, seen, fn);
    return;
  }
  fn(node);
  for (const k of Object.keys(node)) walk(node[k], seen, fn);
}

/** v3 → v4 — formes = Pokémon à part. Retourne un petit rapport (tests). */
export function migrateV3toV4(G) {
  const report = { pokemon: 0, boxKeys: 0, dex: 0, talents: 0, dupes: 0 };
  if (!G || typeof G !== 'object') return report;
  const lang = G.lang === 'en' ? 'en' : 'fr';

  // 1) Tous les Pokémon, où qu'ils soient (équipe, boîtes, pension, entraînement, marché, Atoll…).
  walk(G, new Set(), (o) => {
    if (rewriteLegacyFormPokemon(o, lang)) report.pokemon++;
  });

  // 2) Boîtes : clé canonique "351-1" (ou dérivée si déjà prise).
  if (G.collection && typeof G.collection === 'object') {
    for (const key of Object.keys(G.collection)) {
      const p = G.collection[key];
      if (!p || typeof p !== 'object' || !(Number(p.form) > 0)) continue;
      const canon = `${Number(p.id)}-${Number(p.form)}`;
      const legacyKey =
        /^(?:box_|form_)?(38[7-9]|39[0-2])(?:_|$)/.test(String(key)) || /^\d+$/.test(String(key));
      if (key === canon || !legacyKey) continue;
      let target = canon;
      let n = 0;
      while (G.collection[target] && G.collection[target] !== p) target = `box_${canon}_${++n}`;
      delete G.collection[key];
      G.collection[target] = p;
      report.boxKeys++;
    }
  }

  // 3) Pokédex : 387–392 → G.pokedex[base].forms[slot].
  if (G.pokedex && typeof G.pokedex === 'object') {
    for (const oldId of Object.keys(LEGACY_FORM_IDS)) {
      const e = G.pokedex[oldId];
      if (!e) continue;
      const lf = legacyFormOf(oldId);
      const base = G.pokedex[lf.def.base] || (G.pokedex[lf.def.base] = {});
      if (!base.forms || typeof base.forms !== 'object') base.forms = {};
      base.forms[lf.def.slot] = Object.assign({}, base.forms[lf.def.slot] || {}, e);
      delete G.pokedex[oldId];
      report.dex++;
    }
  }

  // 4) Talents débloqués et doublons : fusion sur la base (talents partagés).
  for (const field of ['unlockedTalents', 'dupeCatches']) {
    const tbl = G[field];
    if (!tbl || typeof tbl !== 'object') continue;
    for (const oldId of Object.keys(LEGACY_FORM_IDS)) {
      if (!(oldId in tbl)) continue;
      const lf = legacyFormOf(oldId);
      const v = tbl[oldId];
      if (field === 'unlockedTalents') {
        const cur = Array.isArray(tbl[lf.def.base]) ? tbl[lf.def.base] : [];
        tbl[lf.def.base] = Array.from(new Set(cur.concat(Array.isArray(v) ? v : [])));
        report.talents++;
      } else {
        tbl[lf.def.base] = (Number(tbl[lf.def.base]) || 0) + (Number(v) || 0);
        report.dupes++;
      }
      delete tbl[oldId];
    }
  }
  return report;
}

/** Table version-cible → fonction (reçoit G). */
export const SAVE_MIGRATIONS = { 4: migrateV3toV4 };

/**
 * Applique les migrations manquantes à un `saveData` `{version, G}`.
 * Idempotent : une sauvegarde déjà à jour est rendue telle quelle.
 * @returns {{migrated:boolean, from:number, to:number, reports:Object[]}}
 */
export function migrateSaveData(saveData) {
  const out = { migrated: false, from: 0, to: 0, reports: [] };
  if (!saveData || typeof saveData !== 'object' || !saveData.G) return out;
  let v = Number(saveData.version) || OLDEST_SUPPORTED_SCHEMA;
  out.from = v;
  if (v < OLDEST_SUPPORTED_SCHEMA || v >= CURRENT_SAVE_SCHEMA) {
    out.to = v;
    return out;
  }
  while (v < CURRENT_SAVE_SCHEMA) {
    const fn = SAVE_MIGRATIONS[v + 1];
    if (typeof fn !== 'function') break;
    out.reports.push(fn(saveData.G));
    v++;
    saveData.version = v;
    out.migrated = true;
  }
  if (saveData.G.saveMeta && typeof saveData.G.saveMeta === 'object')
    saveData.G.saveMeta.version = v;
  if (saveData.G) {
    if (typeof globalThis.ensureAchievementsState === 'function')
      globalThis.ensureAchievementsState(saveData.G);
    if (typeof globalThis.recalculateAllAchievements === 'function')
      globalThis.recalculateAllAchievements(saveData.G);
  }
  out.to = v;
  return out;
}

if (typeof globalThis !== 'undefined') {
  globalThis.migrateSaveData = migrateSaveData;
  globalThis.SAVE_MIGRATIONS = SAVE_MIGRATIONS;
  globalThis.CURRENT_SAVE_SCHEMA = CURRENT_SAVE_SCHEMA;
  globalThis.OLDEST_SUPPORTED_SCHEMA = OLDEST_SUPPORTED_SCHEMA;
}
