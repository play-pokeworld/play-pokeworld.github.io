/**
 * PokeWorld Application — ECS Gameplay Bridge
 *
 * Synchronizes legacy game state (G) with the EnTT-style ECS world (PokeECS).
 * Converts G.team, G.box, and G.location into real ECS Entities with
 * 'PokemonData', 'Stats', 'Fighter', and 'WorldLocation' components.
 *
 * @module application/ecs-gameplay-bridge
 */

export class ECSGameplayBridge {
  /**
   * @param {Object} world - Instance of ECSWorld
   */
  constructor(world) {
    this.world = world;
    this._entityMap = new Map(); // poke.uid -> eid
    if (this.world) {
      this._registerRequiredComponents();
    }
  }

  _registerRequiredComponents() {
    const comps = ['PokemonData', 'Stats', 'Fighter', 'WorldLocation', 'Display'];
    for (const c of comps) {
      this.world.register(c);
    }
  }

  /**
   * Synchronize legacy game state (G) into ECS World Entities
   * @param {Object} G - Legacy game state object
   * @returns {Object} { teamCount, boxCount, totalSynced }
   */
  syncFromGameState(G) {
    if (!G || !this.world) return { teamCount: 0, boxCount: 0, totalSynced: 0 };

    let teamCount = 0;
    let boxCount = 0;

    // 1. Sync Team Pokemon (Fighter + Stats + PokemonData)
    const team = Array.isArray(G.team) ? G.team : [];
    for (let i = 0; i < team.length; i++) {
      const poke = team[i];
      if (!poke) continue;
      const uid = poke.uid || `team_${i}_${poke.id}`;
      let eid = this._entityMap.get(uid);

      if (eid === undefined || !this.world._entities.has(eid)) {
        eid = this.world.create();
        this._entityMap.set(uid, eid);
      }

      this.world.add(eid, 'PokemonData', {
        id: poke.id,
        name: poke.name || `#${poke.id}`,
        level: poke.level || 1,
        shiny: !!(poke.shinyActive || poke.shiny),
        slotIndex: i,
        location: 'team',
      });

      this.world.add(eid, 'Stats', {
        level: poke.level || 1,
        maxHP: poke.maxHP || 100,
        atk: poke.atk || 50,
        def: poke.def || 50,
        spa: poke.spa || 50,
        spd: poke.spd || 50,
        spe: poke.spe || 50,
      });

      this.world.add(eid, 'Fighter', {
        active: i === 0,
        currentHP: poke.currentHP !== undefined ? poke.currentHP : (poke.maxHP || 100),
        cooldown: poke.cooldown || 0,
        maxCooldown: poke.maxCooldown || 2000,
        readyToAttack: false,
      });

      teamCount++;
    }

    // 2. Sync PC Box Pokemon (PokemonData + Stats)
    const box = Array.isArray(G.box) ? G.box : [];
    for (let i = 0; i < box.length; i++) {
      const poke = box[i];
      if (!poke) continue;
      const uid = poke.uid || `box_${i}_${poke.id}`;
      let eid = this._entityMap.get(uid);

      if (eid === undefined || !this.world._entities.has(eid)) {
        eid = this.world.create();
        this._entityMap.set(uid, eid);
      }

      this.world.add(eid, 'PokemonData', {
        id: poke.id,
        name: poke.name || `#${poke.id}`,
        level: poke.level || 1,
        shiny: !!(poke.shinyActive || poke.shiny),
        slotIndex: i,
        location: 'box',
      });

      this.world.add(eid, 'Stats', {
        level: poke.level || 1,
        maxHP: poke.maxHP || 100,
      });

      boxCount++;
    }

    return {
      teamCount,
      boxCount,
      totalSynced: teamCount + boxCount,
    };
  }

  /**
   * Synchronize ECS Fighter HP changes back to legacy game state G.team
   * @param {Object} G
   * @returns {number} Number of team Pokemon updated
   */
  syncToGameState(G) {
    if (!G || !this.world || !Array.isArray(G.team)) return 0;
    let updated = 0;

    for (let i = 0; i < G.team.length; i++) {
      const poke = G.team[i];
      if (!poke) continue;
      const uid = poke.uid || `team_${i}_${poke.id}`;
      const eid = this._entityMap.get(uid);
      if (eid !== undefined && this.world._entities.has(eid)) {
        const fighter = this.world.get(eid, 'Fighter');
        if (fighter && typeof fighter.currentHP === 'number') {
          poke.currentHP = fighter.currentHP;
          updated++;
        }
      }
    }

    return updated;
  }
}
