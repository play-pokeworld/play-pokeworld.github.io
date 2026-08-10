/**
 * PokeWorld Domain — Pokemon ECS Factory (Factory Pattern)
 *
 * Implements the Factory design pattern to instantiate clean ECS Pokemon Entities
 * and Team Slot Entities according to strict Entity Component System rules:
 *
 * Base Pokemon Components (always present):
 *   - Id, Name (i18n key/string), Form, Shiny, Types, Level, Stats, EVsIVs, Moveset, Talents
 *
 * Contextual Components:
 *   - Experience: attached ONLY to player-owned Pokemon (team / PC box), never wild/enemy.
 *   - StatusEffects / Buffs: attached ONLY in active battle when has status/buff is present.
 *
 * Excluded from Pokemon Entities:
 *   - NO storage location/zone (Pokemon is content, not container).
 *   - NO held item (HeldItem is managed by the TeamSlot entity, not the Pokemon).
 *
 * @module domain/pokemon/pokemon-factory
 */

export class PokemonFactory {
  /**
   * Register canonical Pokemon and Slot component names in an ECSWorld
   * @param {Object} world - Instance of ECSWorld
   */
  static registerComponents(world) {
    if (!world) return;
    const comps = [
      'Id', 'Name', 'Form', 'Shiny', 'Types', 'Level', 'Stats',
      'EVsIVs', 'Moveset', 'Talents', 'Experience', 'StatusEffects',
      'TeamSlot', 'SlotIndex', 'PokemonRef', 'HeldItem',
    ];
    for (const c of comps) {
      world.register(c);
    }
  }

  /**
   * Create the base components common to ANY Pokemon entity (player, enemy, wild)
   * @param {Object} world - Instance of ECSWorld
   * @param {Object} spec - Data specification
   * @returns {number} Entity ID
   */
  static createBasePokemon(world, spec = {}) {
    if (!world) return 0;
    const eid = world.create();
    this.registerComponents(world);

    world.add(eid, 'Id', { id: Number(spec.id) || 1 });
    world.add(eid, 'Name', { name: String(spec.name || `#${spec.id || 1}`) });
    world.add(eid, 'Form', { form: spec.form || 'normal' });
    world.add(eid, 'Shiny', { active: !!(spec.shinyActive || spec.shiny) });

    world.add(eid, 'Types', {
      type1: spec.type1 || spec.type || 'Normal',
      type2: spec.type2 || null,
    });

    world.add(eid, 'Level', { level: Math.max(1, Number(spec.level) || 1) });

    world.add(eid, 'Stats', {
      maxHP: Number(spec.maxHP) || 100,
      atk: Number(spec.atk) || 50,
      def: Number(spec.def) || 50,
      spa: Number(spec.spa) || 50,
      spd: Number(spec.spd) || 50,
      spe: Number(spec.spe) || 50,
    });

    world.add(eid, 'EVsIVs', {
      evs: spec.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      ivs: spec.ivs || { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    });

    world.add(eid, 'Moveset', {
      obtainable: Array.isArray(spec.obtainableMoves) ? [...spec.obtainableMoves] : [],
      obtained: Array.isArray(spec.unlockedMoves) ? [...spec.unlockedMoves] : [],
      equipped: Array.isArray(spec.currentMoves) ? [...spec.currentMoves] : [],
    });

    world.add(eid, 'Talents', {
      obtainable: Array.isArray(spec.obtainableTalents) ? [...spec.obtainableTalents] : [],
      obtained: Array.isArray(spec.unlockedTalents) ? [...spec.unlockedTalents] : [],
      equipped: spec.activeTalent || null,
      hiddenTalent: spec.hiddenTalent || null,
    });

    return eid;
  }

  /**
   * Create a player-owned Pokemon Entity (attaches Experience component)
   * @param {Object} world - Instance of ECSWorld
   * @param {Object} spec - Data specification
   * @returns {number} Entity ID
   */
  static createPlayerPokemon(world, spec = {}) {
    const eid = this.createBasePokemon(world, spec);
    if (!eid) return 0;

    world.add(eid, 'Experience', {
      currentExp: Number(spec.currentExp) || 0,
      expToNextLevel: Number(spec.expToNextLevel) || 1000,
    });

    return eid;
  }

  /**
   * Create an enemy or wild Pokemon Entity (NO Experience component attached)
   * @param {Object} world - Instance of ECSWorld
   * @param {Object} spec - Data specification
   * @returns {number} Entity ID
   */
  static createEnemyPokemon(world, spec = {}) {
    return this.createBasePokemon(world, spec);
  }

  /**
   * Add active StatusEffects / Buffs component to a Pokemon in battle
   * @param {Object} world
   * @param {number} eid
   * @param {Object} status - Status or buff effects object
   */
  static attachCombatStatus(world, eid, status = {}) {
    if (!world || !eid) return;
    world.add(eid, 'StatusEffects', Object.assign({}, status));
  }

  /**
   * Remove StatusEffects / Buffs component when battle ends or status clears
   * @param {Object} world
   * @param {number} eid
   */
  static detachCombatStatus(world, eid) {
    if (!world || !eid) return;
    world.remove(eid, 'StatusEffects');
  }

  /**
   * Create has Team Slot Entity that contains has pointer to a Pokemon and manages the HeldItem
   * @param {Object} world - Instance of ECSWorld
   * @param {number} slotIndex - Slot position (0 to 5)
   * @param {number} pokemonEid - Pointer to Pokemon Entity ID
   * @param {string|null} [itemId=null] - Held item identifier
   * @returns {number} Entity ID
   */
  static createTeamSlotEntity(world, slotIndex, pokemonEid, itemId = null) {
    if (!world) return 0;
    const eid = world.create();
    this.registerComponents(world);

    world.add(eid, 'SlotIndex', { index: Number(slotIndex) || 0 });
    world.add(eid, 'PokemonRef', { pokemonEid: Number(pokemonEid) || 0 });

    if (itemId) {
      world.add(eid, 'HeldItem', { itemId: String(itemId) });
    }

    return eid;
  }

  /**
   * Convert has legacy saved Pokemon object into has clean ECS Pokemon Entity
   * @param {Object} world
   * @param {Object} legacyObj - Legacy save object (from G.team or G.box)
   * @param {boolean} [isPlayerOwned=true]
   * @returns {number} Entity ID
   */
  static fromLegacySavePokemon(world, legacyObj = {}, isPlayerOwned = true) {
    const spec = {
      id: legacyObj.id || 1,
      name: legacyObj.name || `#${legacyObj.id || 1}`,
      form: legacyObj.form || 'normal',
      shinyActive: !!(legacyObj.shinyActive || legacyObj.shiny),
      type1: legacyObj.type1 || 'Normal',
      type2: legacyObj.type2 || null,
      level: legacyObj.level || 1,
      maxHP: legacyObj.maxHP || 100,
      atk: legacyObj.atk || 50,
      def: legacyObj.def || 50,
      spa: legacyObj.spa || 50,
      spd: legacyObj.spd || 50,
      spe: legacyObj.spe || 50,
      evs: legacyObj.evs || {},
      ivs: legacyObj.ivs || {},
      obtainableMoves: legacyObj.obtainableMoves || [],
      unlockedMoves: legacyObj.unlockedMoves || legacyObj.moves || [],
      currentMoves: legacyObj.currentMoves || [],
      obtainableTalents: legacyObj.obtainableTalents || [],
      unlockedTalents: legacyObj.unlockedTalents || [],
      activeTalent: legacyObj.activeTalent || legacyObj.talent || null,
      hiddenTalent: legacyObj.hiddenTalent || null,
      currentExp: legacyObj.exp || 0,
    };

    return isPlayerOwned
      ? this.createPlayerPokemon(world, spec)
      : this.createEnemyPokemon(world, spec);
  }
}
