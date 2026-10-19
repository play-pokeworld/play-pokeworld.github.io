/**
 * @file panels.js (fr)
 * @brief Texts of the game-page panels (map, location, team, achievements, battle log...).
 * Keys added in v1.0: they were used by the panels but missing from every domain,
 * so the raw keys were displayed (e.g. "map_title", "btn_explore").
 */
export const panels = {
  app_name: 'PokéWorld',

  // Map
  map_title: 'Carte',
  map_current_loc: 'Position actuelle : {name}',
  loc_pallet_town: 'Bourg Palette',
  loc_route_1: 'Route 1',
  loc_viridian_city: 'Jadielle',
  loc_route_2: 'Route 2',
  loc_pewter_city: 'Argenta',

  // Location
  btn_explore: 'Explorer',
  btn_challenge: 'Défier',
  btn_shop: 'Boutique',
  btn_talk: 'Parler',
  battle_wild_encountered: 'Un {name} sauvage apparaît !',
  gym_closed: 'L’arène locale est fermée pour le moment.',
  shop_welcome: 'Bienvenue à la boutique Pokémon !',
  npc_greeting: 'Prof. Chen : « Prends bien soin de tes Pokémon ! »',
  loc_wild_pokemon: 'Pokémon sauvages de la zone',

  // Achievements
  achievements_pinned_label: 'Épinglé',
  ach_dex_kanto: 'Pokédex de Kanto',
  ach_badges_kanto: 'Badges de Kanto',
  ach_total_battles: 'Combats remportés',
  notif_achievement_pinned: 'Succès épinglé : {name}',
  ach_open_hint: 'Cliquer pour ouvrir les Succès',

  // Hatchery / mine / secret base
  hatchery_slot_empty: 'Emplacement libre',
  mine_dig_feedback: 'Coup de pioche !',
  base_room_preview: 'Base Secrète (Kanto/Hoenn)',
  btn_visit: 'Visiter',
  secret_base_decor_btn: 'Décorer',

  // Poké Balls filters
  ball_filter_already_caught: 'Déjà capturé',
  ball_filter_shiny: 'Chromatique',

  // Team modal
  team_modal_title: 'Gestion de l’Équipe',
  team_set_lead_btn: 'Placer en tête',
  level_short: 'Nv.',
  hp_label: 'PV',
  exp_label: 'EXP',

  // Settings
  save_success: 'Partie sauvegardée avec succès.',

  // Battle log
  combat_wild_encounter: 'Un {name} sauvage apparaît !',
  combat_player_attack: '{attacker} utilise {move} et inflige {damage} dégâts !',
  combat_enemy_attack: '{attacker} sauvage utilise {move} et inflige {damage} dégâts !',
  combat_victory: 'Le {name} sauvage est K.O. !',
  combat_reward_summary: 'Vous gagnez {exp} EXP et {money} ₽.',
  combat_player_fainted: 'Votre Pokémon est K.O. !',
  value_over_max: "{value} / {max}",
  percent_value: "{value} %",
  hp_value_over_max: "{value} / {max} PV",
  exp_value_over_max: "{value} / {max} XP",
  level_short_value: "N.{level}",
  level_range: "N.{min}–{max}",
  money_amount: "{value} ₽",
  add_slot_symbol: "+",
  held_item_empty_symbol: "+",
  held_item_tooltip: "Objet tenu : {name}",
  ach_rank_bronze: "Bronze",
  ach_progress_summary: "{done} / {total} succès débloqués",
  story_no_quest: "Aucune quête en cours.",
  list_separator: ", ",
  quest_progress_label: "Progression",
  battle_loot_summary: "Butin de session : <b>{money} ₽</b> · <b>{exp} XP</b>",
  battle_no_wild_here: "Aucun Pokémon sauvage ici.",
  battle_no_team: "Votre équipe ne peut pas combattre.",
  loc_species_count: "{count} espèces",
  loc_no_wild: "Aucun Pokémon sauvage dans cette zone.",
  loc_desc_town: "Une ville paisible. Soignez votre équipe et préparez votre prochaine aventure.",
  loc_desc_wild: "Des Pokémon sauvages rôdent dans les hautes herbes. Explorez pour les affronter !",
  map_location_locked: "{name} — {badges} badges requis",
  feature_coming_soon: "{name} : bientôt disponible.",
  training_dummy_title: "Mannequin d'entraînement",
  training_dummy_desc: "Entraînez vos Pokémon pour gagner de l'expérience sans risque.",
  training_start_btn: "Commencer l'entraînement",
  team_new_lead: "{name} mène désormais l'équipe.",
  hatchery_mystery_egg: "Œuf mystère",
  shortcut_badges: "Badges",
  save_profile_avatar: "Icône de profil",
  avatar_red: "Red (Garçon)",
  avatar_leaf: "Leaf (Fille)",
  avatar_blue: "Blue (Rival)",
  avatar_youngster: "Gamin",
  avatar_cooltrainer_f: "Topdresseuse",
  avatar_gentleman: "Gentleman",
  avatar_scientist: "Scientifique",
  avatar_breeder_f: "Éleveuse",
  avatar_dragon_tamer: "Dracologue",
  avatar_rocket_grunt: "Sbire Rocket",
  quest_reward_line: "<b>Récompense :</b> {rewards}",
  quest_reward_points: "{count} Points de Quête",
  quest_reward_item: "{name} ×{quantity}",
  quest_reward_pokemon: "{name} (N. {level})",
  quest_category_main: "Quête principale",
  quest_category_side: "Quête secondaire",
  quest_category_repeatable: "Quête répétable",
  quest_claim_btn: "Réclamer la récompense",
  quest_in_progress_btn: "En cours…",
  quest_reward_claimed: "Récompense de « {title} » réclamée !",
  quest_still_in_progress: "« {title} » est encore en cours.",
  move_slot_empty: "-",
  eff_0x: "×0",
  caught_status_shiny: "Chromatique capturé",
  caught_status_caught: "Capturé",
  caught_status_not_caught: "Non capturé",
  battle_timeline_damage: "{damage} {multiplier}"
};
