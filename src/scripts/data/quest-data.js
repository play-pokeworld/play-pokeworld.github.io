// ============================================================
// quest-data.js — QUEST_TRIGGERS + re-exports
// Data split into: side-quests-data.js, repeatable-quests-data.js, npc-data.js
// ============================================================
// ============================================================
// QUEST DATA — definitions only (no logic).
// Déclarées APRÈS game-data.js (STORY_QUESTS y est défini).
// ============================================================

// ============================================================
// QUEST SYSTEM — PokéClicker style (main / side / repeatable)
// Plusieurs quêtes actives en même temps, PNJ dans les villes,
// quêtes principales octroyées à la 1ʳᵉ visite d'une carte,
// quêtes secondaires via PNJ, quêtes répétables (menu accept/roll).
// ============================================================

// --- Déclencheur (carte) de chaque quête PRINCIPALE (octroyée à 1ʳᵉ visite) ---
var QUEST_TRIGGERS = {
  0:'pallet', 1:'pewter', 2:'route3', 3:'cerulean', 4:'route11', 5:'vermilion',
  6:'vermilion', 7:'lavender', 8:'celadon', 9:'fuchsia', 10:'saffron',
  11:'cinnabar', 12:'viridian', 13:'indigo', 14:'seafoamislands', 15:'powerplant',
  16:'victoryroad', 17:'pokemonmansion', 18:'ceruleancave', 19:'safarizone',
  // Johto
  20:'newbark', 21:'violet', 22:'azalea', 23:'goldenrod', 24:'ecruteak',
  25:'cianwood', 26:'olivine', 27:'mahogany', 28:'blackthorn',
  30:'pallet', 31:'newbark'
};


// --- Quêtes SECONDAIRES (proposées par les PNJ) ---
// --- Quêtes RÉPÉTABLES (menu accept/roll façon PokéClicker) ---

// --- PNJ par ville (clic sur le marqueur 🗣 de la carte) ---
