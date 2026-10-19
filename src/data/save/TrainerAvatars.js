/**
 * @file TrainerAvatars.js
 * @brief Trainer portraits offered in the save profile settings (C++: static const TrainerAvatar TRAINER_AVATARS[]).
 * `sprite` is the file stem in assets/images/trainers/, `labelKey` the localized name.
 */

export const TRAINER_AVATARS = Object.freeze([
  { sprite: 'trainer-0', labelKey: 'avatar_red' },
  { sprite: 'trainer-1', labelKey: 'avatar_leaf' },
  { sprite: 'Rival Blue', labelKey: 'avatar_blue' },
  { sprite: 'Youngster', labelKey: 'avatar_youngster' },
  { sprite: 'Cooltrainer (female)', labelKey: 'avatar_cooltrainer_f' },
  { sprite: 'Gentleman', labelKey: 'avatar_gentleman' },
  { sprite: 'Scientist (male)', labelKey: 'avatar_scientist' },
  { sprite: 'Pokémon Breeder (female)', labelKey: 'avatar_breeder_f' },
  { sprite: 'Dragon Tamer', labelKey: 'avatar_dragon_tamer' },
  { sprite: 'Team Rocket Grunts', labelKey: 'avatar_rocket_grunt' }
]);
