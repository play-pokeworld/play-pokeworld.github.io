/**
 * @file StaffCatalog.js
 * @brief Immutable reference-game staff data. Advertised-but-unused legacy bonuses are explicit.
 */
import { deepFreeze } from '../core/DataRepository.js';

export const STAFF_CATALOG = deepFreeze([
  {
    "id": "manager_daisy",
    "sector": "hatchery",
    "locationId": "cerulean",
    "bonus": "hatchery_speed",
    "perLevel": 0.01,
    "sprite": "Lass",
    "effectImplemented": true
  },
  {
    "id": "manager_celadon",
    "sector": "hatchery",
    "locationId": "celadon",
    "bonus": "hatchery_cost",
    "perLevel": 0.005,
    "sprite": "Beauty",
    "effectImplemented": false
  },
  {
    "id": "manager_saffron",
    "sector": "hatchery",
    "locationId": "saffron",
    "bonus": "hatchery_shiny",
    "perLevel": 0.01,
    "sprite": "Gentleman",
    "effectImplemented": false
  },
  {
    "id": "manager_cinnabar",
    "sector": "hatchery",
    "locationId": "cinnabar",
    "bonus": "hatchery_exp",
    "perLevel": 0.01,
    "sprite": "Scientist (female)",
    "effectImplemented": false
  },
  {
    "id": "manager_goldenrod",
    "sector": "hatchery",
    "locationId": "goldenrod",
    "bonus": "hatchery_double_iv_level",
    "perLevel": 0.002,
    "sprite": "Lady",
    "effectImplemented": true
  },
  {
    "id": "trainer_vermilion",
    "sector": "training",
    "locationId": "vermilion",
    "bonus": "training_exp",
    "perLevel": 0.01,
    "sprite": "Ace Trainer (male)",
    "effectImplemented": false
  },
  {
    "id": "trainer_saffron",
    "sector": "training",
    "locationId": "saffron",
    "bonus": "training_kill_reduction",
    "perLevel": 0.03,
    "sprite": "Black Belt",
    "effectImplemented": true
  },
  {
    "id": "trainer_fuchsia",
    "sector": "training",
    "locationId": "fuchsia",
    "bonus": "training_cost",
    "perLevel": 0.005,
    "sprite": "Battle Girl",
    "effectImplemented": false
  },
  {
    "id": "trainer_indigo",
    "sector": "training",
    "locationId": "indigo",
    "bonus": "training_crit",
    "perLevel": 0.003,
    "sprite": "Veteran (male)",
    "effectImplemented": false
  },
  {
    "id": "trainer_blackthorn",
    "sector": "training",
    "locationId": "blackthorn",
    "bonus": "training_drop",
    "perLevel": 0.002,
    "sprite": "Dragon Tamer",
    "effectImplemented": true
  },
  {
    "id": "miner_pewter",
    "sector": "mine",
    "locationId": "pewter",
    "bonus": "mine_energy_cost",
    "perLevel": 0.005,
    "sprite": "Hiker",
    "effectImplemented": true
  },
  {
    "id": "miner_cerulean",
    "sector": "mine",
    "locationId": "cerulean",
    "bonus": "mine_energy_regen",
    "perLevel": 0.01,
    "sprite": "Worker (male)",
    "effectImplemented": false
  },
  {
    "id": "miner_cinnabar",
    "sector": "mine",
    "locationId": "cinnabar",
    "bonus": "mine_value",
    "perLevel": 0.01,
    "sprite": "Ruin Maniac",
    "effectImplemented": false
  },
  {
    "id": "miner_mahogany",
    "sector": "mine",
    "locationId": "mahogany",
    "bonus": "mine_extra_items",
    "perLevel": 0.03,
    "sprite": "Backpacker (male)",
    "effectImplemented": false
  },
  {
    "id": "miner_blackthorn",
    "sector": "mine",
    "locationId": "blackthorn",
    "bonus": "mine_energy_max",
    "perLevel": 1,
    "sprite": "Worker (female)",
    "effectImplemented": false
  }
]);
