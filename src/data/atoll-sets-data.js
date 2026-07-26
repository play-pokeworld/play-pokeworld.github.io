// ═══════════════════════════════════════════════════════════════════════════
// ATOLL DE COMBAT — Sets canoniques curated (passe 22, étape 6 du grand projet)
// ═══════════════════════════════════════════════════════════════════════════
// Chaque espèce utilisée dans les formats « vrai défi » (Tour C→S/Libre,
// Usine, Arène, Dôme) a un set FIXE, légitime et fort :
//   t : talent ∈ pool réel de l'espèce (talents actifs du moteur privilégiés :
//       levitate, intimidate, multiscale, filter, ironFist, static, scrappy…)
//   i : objet tenu (uniquement type_boost / choice, règle économique validée)
//   m : 1-4 attaques ∈ pool légal (apprentissage naturel ∪ CT/CS)
//   prof : profil de stats (voir ATOLL_STAT_PROFILES — IV/EV ≤ 18 au total,
//          même règle que les dresseurs officiels de la campagne)
// Les espèces « fun » des rangs E/D (Chenipan, Magicarpe…) n'ont pas de set
// fixe : le générateur déterministe d'atoll-core.js leur construit un set
// légal à la volée (même graine → même set), cf. buildFallbackSet().
//
// Format compact :  id: [talent, item|0, [moves], profil]
// ─────────────────────────────────────────────────────────────────────────────
const ATOLL_STAT_PROFILES = {
 // EXCEPTION ENDGAME (passe 23, validée par simulations moteur) : l'Atoll est le
 // sommet du jeu — ses dresseurs poussent les budgets à 36 EV / 36 IV, soit le
 // maximum qu'un joueur peut légalement atteindre en jeu (training 36 EV max,
 // hatchery 36 IV max). Tout le reste de l'histoire reste plafonné à 18/18.
 phys:  { evs: { atk: 18, spe: 18 },          ivs: { atk: 12, spe: 12, hp: 12 } },
 spec:  { evs: { spa: 18, spe: 18 },          ivs: { spa: 12, spe: 12, hp: 12 } },
 tank:  { evs: { hp: 18, def: 9, spd: 9 },    ivs: { hp: 12, def: 12, spd: 12 } },
 tanks: { evs: { hp: 18, def: 9, spd: 9 },    ivs: { hp: 12, def: 12, spd: 12 } },
 bulka: { evs: { hp: 12, atk: 18, def: 6 },   ivs: { hp: 12, atk: 12, def: 6, spd: 6 } },
 bulks: { evs: { hp: 12, spa: 18, spd: 6 },   ivs: { hp: 12, spa: 12, def: 6, spd: 6 } },
};

const ATOLL_SETS = {
 // ── Tour/Arène/Dôme — rangs C et + ─────────────────────────────────────
 18:  ['thickfat', 'choice_specs', ['hyper_beam', 'hurricane', 'earthquake', 'giga_impact'], 'spec'],
 26:  ['levitate',    'choice_specs',       ['thunderbolt', 'volt_switch', 'nasty_plot', 'surf'], 'spec'],
 45:  ['solarpower', 'choice_specs', ['energy_ball', 'sludge_bomb', 'moonblast', 'toxic'], 'bulks'],
 57:  ['noguard',    'choice_band',   ['close_combat', 'ice_punch', 'knock_off', 'bulk_up'], 'phys'],
 59:  ['solarpower', 'choice_band', ['flare_blitz', 'fire_punch', 'draco_meteor', 'overheat'], 'phys'],
 62:  ['waterabsorb', 'choice_band',   ['waterfall', 'close_combat', 'ice_punch', 'bulk_up'], 'bulka'],
 65:  ['adaptability', 'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'psychic'], 'spec'],
 71:  ['solarpower', 'choice_band', ['leaf_blade', 'poison_jab', 'knock_off', 'swords_dance'], 'phys'],
 73:  ['multiscale',    'choice_specs',  ['scald', 'sludge_bomb', 'ice_beam', 'toxic'], 'bulks'],
 83:  ['thickfat',    'choice_band',   ['hurricane', 'knock_off', 'quick_attack', 'swords_dance'], 'phys'],
 85:  ['thickfat',    'choice_band',   ['hurricane', 'drill_peck', 'knock_off', 'quick_attack'], 'phys'],
 89:  ['poisonpoint', 'choice_band',  ['poison_jab', 'knock_off', 'thunder_punch', 'earthquake'], 'bulka'],
 94:  ['adaptability', 'choice_specs', ['sludge_wave', 'shadow_ball', 'giga_impact', 'phantom_force'], 'spec'],
 95:  ['filter',       'choice_band',   ['earthquake', 'rock_slide', 'stone_edge', 'rock_polish'], 'bulka'],
 97:  ['adaptability', 'choice_specs', ['psychic', 'shadow_ball', 'future_sight', 'calm_mind'], 'spec'],
 99:  ['multiscale',   'choice_band', ['waterfall', 'x_scissor', 'knock_off', 'swords_dance'], 'phys'],
 103: ['solarpower', 'choice_specs', ['leaf_storm', 'future_sight', 'giga_impact', 'solar_blade'], 'bulks'],
 105: ['filter',      'choice_band',    ['earthquake', 'rock_slide', 'knock_off', 'doubleedge'], 'bulka'],
 112: ['filter', 'choice_band', ['earthquake', 'stone_edge', 'draco_meteor', 'meteor_beam'], 'bulka'],
 115: ['thickfat', 'choice_band', ['giga_impact', 'doubleedge', 'draco_meteor', 'hyper_beam'], 'bulka'],
 117: ['multiscale',   'choice_specs', ['scald', 'ice_beam', 'dragon_pulse', 'nasty_plot'], 'spec'],
 119: ['waterabsorb',   'choice_band', ['waterfall', 'ice_beam', 'knock_off', 'aqua_jet'], 'phys'],
 121: ['multiscale', 'choice_specs', ['future_sight', 'hydro_pump', 'giga_impact', 'extrasensory'], 'spec'],
 122: ['noguard',  'choice_specs',['psychic', 'dazzling_gleam', 'shadow_ball', 'calm_mind'], 'spec'],
 123: ['filter', 'choice_band', ['first_impression', 'fly', 'draco_meteor', 'hurricane'], 'phys'],
 124: ['thickfat',     'choice_specs',['ice_beam', 'psychic', 'shadow_ball', 'nasty_plot'], 'spec'],
 127: ['filter', 'choice_band', ['first_impression', 'x_scissor', 'draco_meteor', 'bug_buzz'], 'bulka'],
 130: ['multiscale', 'choice_band', ['aqua_tail', 'fly', 'draco_meteor', 'hydro_pump'], 'phys'],
 131: ['waterabsorb', 'choice_specs', ['hydro_pump', 'blizzard', 'giga_impact', 'muddy_water'], 'spec'],
 132: ['thickfat',      'choice_band',   ['doubleedge', 'facade', 'hyper_beam', 'toxic'], 'phys'],
 137: ['technician',  'choice_specs',   ['hyper_beam', 'thunderbolt', 'ice_beam', 'nasty_plot'], 'spec'],
 143: ['thickfat', 'choice_band', ['giga_impact', 'doubleedge', 'draco_meteor', 'hyper_beam'], 'bulka'],
 149: ['intimidate', 'choice_band', ['outrage', 'dragon_rush', 'hurricane', 'draco_meteor'], 'phys'],
 150: ['noguard', 'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'psychic'], 'spec'],
 151: ['noguard', 'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'psychic'], 'spec'],
 162: ['thickfat',     'choice_band',   ['doubleedge', 'knock_off', 'u_turn', 'quick_attack'], 'phys'],
 164: ['thickfat',    'choice_specs',   ['hurricane', 'air_shlash', 'psychic', 'nasty_plot'], 'spec'],
 168: ['swarm',       'choice_band',['x_scissor', 'poison_jab', 'knock_off', 'swords_dance'], 'phys'],
 171: ['levitate',    'choice_specs',       ['scald', 'thunderbolt', 'ice_beam', 'volt_switch'], 'spec'],
 181: ['static', 'choice_specs', ['thunder', 'thunderbolt', 'giga_impact', 'wild_charge'], 'spec'],
 184: ['multiscale', 'choice_band', ['aqua_tail', 'play_rough', 'draco_meteor', 'hydro_pump'], 'bulka'],
 185: ['noguard',       'choice_band',   ['stone_edge', 'earthquake', 'body_press', 'knock_off'], 'bulka'],
 195: ['waterabsorb', 'soft_sand',    ['earthquake', 'waterfall', 'rock_slide', 'toxic'], 'tank'],
 196: ['adaptability', 'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'psychic'], 'spec'],
 197: ['adaptability', 'choice_band', ['night_slash', 'crunch', 'draco_meteor', 'night_daze'], 'bulka'],
 199: ['multiscale', 'choice_specs', ['future_sight', 'hydro_pump', 'giga_impact', 'extrasensory'], 'bulks'],
 205: ['levitate', 'choice_band', ['first_impression', 'iron_tail', 'draco_meteor', 'bug_buzz'], 'bulka'],
 208: ['sandveil', 'choice_band', ['earthquake', 'iron_tail', 'draco_meteor', 'earth_power'], 'bulka'],
 210: ['noguard',     'choice_band',['play_rough', 'earthquake', 'thunder_punch', 'knock_off'], 'bulka'],
 212: ['technician', 'choice_band', ['first_impression', 'iron_tail', 'draco_meteor', 'bug_buzz'], 'phys'],
 214: ['filter', 'choice_band', ['hammer_arm', 'superpower', 'draco_meteor', 'close_combat'], 'phys'],
 217: ['thickfat', 'choice_band', ['giga_impact', 'doubleedge', 'draco_meteor', 'hyper_beam'], 'bulka'],
 224: ['multiscale',   'choice_specs', ['hydro_pump', 'ice_beam', 'energy_ball', 'psychic'], 'spec'],
 229: ['solarpower', 'choice_specs', ['overheat', 'fire_blast', 'giga_impact', 'flare_blitz'], 'spec'],
 230: ['multiscale', 'choice_band', ['outrage', 'aqua_tail', 'hyper_beam', 'draco_meteor'], 'phys'],
 237: ['noguard',    'choice_band',   ['mach_punk', 'close_combat', 'knock_off', 'bulk_up'], 'phys'],
 242: ['thickfat', 'choice_specs', ['hyper_beam', 'hyper_voice', 'earthquake', 'giga_impact'], 'bulks'],
 243: ['voltabsorb', 'choice_specs', ['thunder', 'thunderbolt', 'giga_impact', 'wild_charge'], 'spec'],
 244: ['solarpower', 'choice_band', ['flare_blitz', 'fire_punch', 'draco_meteor', 'overheat'], 'phys'],
 245: ['multiscale', 'choice_specs', ['hydro_pump', 'muddy_water', 'giga_impact', 'aqua_tail'], 'bulks'],
 248: ['adaptability', 'choice_band', ['stone_edge', 'night_slash', 'draco_meteor', 'meteor_beam'], 'bulka'],
 249: ['adaptability', 'choice_specs', ['future_sight', 'extrasensory', 'giga_impact', 'hurricane'], 'spec'],
 250: ['solarpower', 'choice_band', ['flare_blitz', 'fly', 'draco_meteor', 'overheat'], 'phys'],
 251: ['adaptability', 'choice_specs', ['leaf_storm', 'future_sight', 'giga_impact', 'solar_blade'], 'spec'],
};

// Légendaires concernés par les bans tournants de la rotation 12 h.
// Règle absolue (spec utilisateur) : JAMAIS bannis de tous les modes à la fois
// — le mode « Tour Libre » n'a jamais de ban, c'est le refuge des légendaires.
const ATOLL_LEGENDARIES = [144, 145, 146, 150, 151, 243, 244, 245, 249, 250, 251];

// --- Globals exposés (chargé par le loader après official-teams-data) ---
if (typeof window !== 'undefined') {
 window.ATOLL_STAT_PROFILES = ATOLL_STAT_PROFILES;
 window.ATOLL_SETS = ATOLL_SETS;
 window.ATOLL_LEGENDARIES = ATOLL_LEGENDARIES;
}
