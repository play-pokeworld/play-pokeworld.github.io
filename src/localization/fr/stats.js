// ===== FR — STATS strings =====
// Auto-extracted & grouped by domain. Edit text here, never hardcode in logic.

export const L_fr_stats = {
"stat_atk":"Attaque",
"stat_def":"Défense",
"stat_hp":"PV Max",
"stat_spa":"Atk Spéciale",
"stat_spd":"Déf Spéciale",
"stat_spe":"Vitesse",
"stat_atk_short":"Atk",
"stat_def_short":"Déf",
"stat_spe_short":"Vit",
"stat_spa_short":"Atk Spé",
"stat_spd_short":"Déf Spé",
"stat_hp_short":"PV",
};

// T2 (vague 38) : module ESM — export natif ; la surface classique est
// gardée sur l'objet global pour les registres (data.js) et les harnais VM.
if (typeof globalThis !== 'undefined') globalThis.L_fr_stats = L_fr_stats;
