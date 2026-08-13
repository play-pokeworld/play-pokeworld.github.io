// ===== EN — Type names =====
// Keys are the engine type ids (lowercase). Consumed via t('types.fire') and
// getTypeName().
export const L_en_types = {
  "normal": "Normal",
  "fire": "Fire",
  "water": "Water",
  "grass": "Grass",
  "electric": "Electric",
  "ice": "Ice",
  "fighting": "Fighting",
  "poison": "Poison",
  "ground": "Ground",
  "flying": "Flying",
  "psychic": "Psychic",
  "bug": "Bug",
  "rock": "Rock",
  "ghost": "Ghost",
  "dragon": "Dragon",
  "dark": "Dark",
  "steel": "Steel",
  "fairy": "Fairy"
};

// T2 (vague 38) : module ESM — export natif ; la surface classique est
// gardée sur l'objet global pour les registres (data.js) et les harnais VM.
if (typeof globalThis !== 'undefined') globalThis.L_en_types = L_en_types;

