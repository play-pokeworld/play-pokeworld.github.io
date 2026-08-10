// ===== EN — STATS strings =====
// Auto-extracted & grouped by domain. Edit text here, never hardcode in logic.

export const L_en_stats = {
"stat_atk":"Attack",
"stat_def":"Defense",
"stat_hp":"Max HP",
"stat_spa":"Sp. Atk",
"stat_spd":"Sp. Def",
"stat_spe":"Speed",
"stat_atk_short":"Atk",
"stat_def_short":"Def",
"stat_spe_short":"Spe",
"stat_spa_short":"SpA",
"stat_spd_short":"SpD",
"stat_hp_short":"HP",
};

// T2 (vague 38) : module ESM — export natif ; la surface classique est
// gardée sur l'objet global pour les registres (data.js) et les harnais VM.
if (typeof globalThis !== 'undefined') globalThis.L_en_stats = L_en_stats;
