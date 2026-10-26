/**
 * @file TeamAmbushRules.js
 * @brief Enemy team ambush definitions per region and location.
 */

export const TeamAmbushRules = Object.freeze({
  /** Fixed / contested story ambushes across regions */
  AMBUSHES: Object.freeze([
    // Kanto
    Object.freeze({
      locationId: 'mtmoon',
      region: 'kanto',
      trainerId: 'kanto_rocket_mtmoon',
      sprite: 'Team Rocket Grunt (male)',
      teamNameKey: 'team_rocket',
      minBadges: 1
    }),
    Object.freeze({
      locationId: 'pokemontower',
      region: 'kanto',
      trainerId: 'kanto_rocket_tower',
      sprite: 'Team Rocket Grunt (male)',
      teamNameKey: 'team_rocket',
      minBadges: 3
    }),
    Object.freeze({
      locationId: 'celadon',
      region: 'kanto',
      trainerId: 'kanto_rocket_hideout',
      sprite: 'Rocket Executive (archer)',
      teamNameKey: 'team_rocket',
      minBadges: 3
    }),

    // Johto
    Object.freeze({
      locationId: 'slowpokewell',
      region: 'johto',
      trainerId: 'johto_rocket_slowpoke',
      sprite: 'Team Rocket Grunt (male)',
      teamNameKey: 'team_rocket',
      minBadges: 1
    }),
    Object.freeze({
      locationId: 'goldenrod',
      region: 'johto',
      trainerId: 'johto_rocket_radio',
      sprite: 'Rocket Executive (archer)',
      teamNameKey: 'team_rocket',
      minBadges: 2
    }),
    Object.freeze({
      locationId: 'lakerage',
      region: 'johto',
      trainerId: 'johto_rocket_lake',
      sprite: 'Rocket Executive (archer)',
      teamNameKey: 'team_rocket',
      minBadges: 6
    }),

    // Hoenn
    Object.freeze({
      locationId: 'rusturf_tunnel',
      region: 'hoenn',
      trainerId: 'hoenn_aqua_rusturf',
      sprite: 'Team Aqua Grunt (male)',
      teamNameKey: 'team_aqua',
      minBadges: 1
    }),
    Object.freeze({
      locationId: 'slateport',
      region: 'hoenn',
      trainerId: 'hoenn_aqua_museum',
      sprite: 'Team Aqua Grunt (female)',
      teamNameKey: 'team_aqua',
      minBadges: 1
    }),
    Object.freeze({
      locationId: 'mt_chimney',
      region: 'hoenn',
      trainerId: 'hoenn_magma_chimney',
      sprite: 'Magma Admin (courtney)',
      teamNameKey: 'team_magma',
      minBadges: 3
    }),
    Object.freeze({
      locationId: 'weather_institute',
      region: 'hoenn',
      trainerId: 'hoenn_aqua_weather',
      sprite: 'Aqua Admin (matt)',
      teamNameKey: 'team_aqua',
      minBadges: 5
    })
  ])
});
