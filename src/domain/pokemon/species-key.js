/**
 * PokéWorld Domain — identité d'espèce avec formes (V7 · FORM-01).
 *
 * Un Pokémon = `{ id: 351, form: 1, … }` ; `id` reste NUMÉRIQUE (régions,
 * tris, évolutions, errance inchangés). La seule clé d'identité utilisée pour
 * les stats, sprites, noms, boîtes et dex est `speciesKey(p)` :
 *   base  → "351"        forme → "351-1"
 *
 * Pur : aucune dépendance au DOM ni à `G`. `PD` (classique) et `FORMS` sont
 * lus à l'appel pour respecter l'ordre de chargement historique.
 *
 * @module domain/pokemon/species-key
 */
import { FORMS } from '../../data/forms-data.js';

function pdTable() {
  return typeof globalThis !== 'undefined' && globalThis.PD ? globalThis.PD : [];
}

/**
 * Normalise n'importe quelle désignation d'espèce en `{ id, form }`.
 * Accepte : un nombre (base), "351", "351-1", ou un objet Pokémon `{id, form}`.
 * @returns {{id:number, form:number}}
 */
export function parseSpeciesKey(ref) {
  if (ref && typeof ref === 'object') {
    return { id: Number(ref.id) || 0, form: Number(ref.form) || 0 };
  }
  const s = String(ref == null ? '' : ref);
  const dash = s.indexOf('-');
  if (dash > 0) return { id: Number(s.slice(0, dash)) || 0, form: Number(s.slice(dash + 1)) || 0 };
  return { id: Number(s) || 0, form: 0 };
}

/**
 * Clé d'espèce ("351" ou "351-1").
 * `speciesKey(poke)`, `speciesKey(351, 1)`, `speciesKey('351-1')`.
 */
export function speciesKey(ref, form) {
  const k = parseSpeciesKey(ref);
  const f = form != null ? Number(form) || 0 : k.form;
  return f > 0 ? `${k.id}-${f}` : String(k.id);
}

/** Vrai si la clé désigne une forme (slot > 0). */
export function isFormKey(ref) {
  return parseSpeciesKey(ref).form > 0;
}

/** Même espèce ET même forme. */
export function sameSpecies(a, b) {
  const ka = parseSpeciesKey(a);
  const kb = parseSpeciesKey(b);
  return ka.id === kb.id && ka.form === kb.form;
}

/** Définition de forme (`FORMS["351-1"]`) ou null pour une base / inconnue. */
export function getFormDef(ref, form) {
  const k = parseSpeciesKey(ref);
  const f = form != null ? Number(form) || 0 : k.form;
  if (!(f > 0)) return null;
  return FORMS[`${k.id}-${f}`] || null;
}

/** Toutes les formes d'une espèce de base, triées par slot. */
export function formsOf(baseId) {
  const nid = Number(baseId);
  return Object.values(FORMS)
    .filter((f) => f.base === nid)
    .sort((a, b) => a.slot - b.slot);
}

/** Nom localisé d'une définition de forme. */
export function formName(def, lang) {
  if (!def) return '';
  return (lang === 'en' ? def.name_en : def.name_fr) || def.name_en || def.name_fr || def.key;
}

/**
 * Données d'espèce au format `PD` :
 * `[name, type1, type2, hp, atk, def, spa, spd, spe, moveset, catchRate, xpYield]`.
 * Une forme hérite du taux de capture et du rendement XP de sa base.
 * @returns {Array|null}
 */
export function getSpeciesData(ref, form) {
  const k = parseSpeciesKey(ref);
  const f = form != null ? Number(form) || 0 : k.form;
  const PD = pdTable();
  const base = PD[k.id] || null;
  if (!(f > 0)) return base;
  const def = FORMS[`${k.id}-${f}`];
  if (!def) return base;
  const st = def.stats || [];
  return [
    def.name_en || def.name_fr,
    (def.types && def.types[0]) || (base ? base[1] : ''),
    (def.types && def.types[1]) || '',
    st[0],
    st[1],
    st[2],
    st[3],
    st[4],
    st[5],
    base ? base[9] : [],
    base ? base[10] : 45,
    base ? base[11] : 60,
  ];
}

if (typeof globalThis !== 'undefined') {
  globalThis.parseSpeciesKey = parseSpeciesKey;
  globalThis.speciesKey = speciesKey;
  globalThis.isFormKey = isFormKey;
  globalThis.sameSpecies = sameSpecies;
  globalThis.getFormDef = getFormDef;
  globalThis.formsOf = formsOf;
  globalThis.formName = formName;
  globalThis.getSpeciesData = getSpeciesData;
}
