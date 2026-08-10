// ===== FR — Noms des types =====
// ===== FR — Type names =====
// Phase 24: consumed via the nested 'types' domain (t('types.fire')) and
// getTypeName(). Keys are the engine ids (lowercase).
export const L_fr_types = {
  "normal": "Normal",
  "fire": "Feu",
  "water": "Eau",
  "grass": "Plante",
  "electric": "Électrik",
  "ice": "Glace",
  "fighting": "Combat",
  "poison": "Poison",
  "ground": "Sol",
  "flying": "Vol",
  "psychic": "Psy",
  "bug": "Insecte",
  "rock": "Roche",
  "ghost": "Spectre",
  "dragon": "Dragon",
  "dark": "Ténèbres",
  "steel": "Acier",
  "fairy": "Fée"
};

// T2 (vague 38) : module ESM — export natif ; la surface classique est
// gardée sur l'objet global pour les registres (data.js) et les harnais VM.
if (typeof globalThis !== 'undefined') globalThis.L_fr_types = L_fr_types;
