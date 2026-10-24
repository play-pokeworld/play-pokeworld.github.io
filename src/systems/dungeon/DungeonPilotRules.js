/** @file DungeonPilotRules.js @brief Pure pilot planning on the canonical map; never traverses the guardian incidentally. */
import { DungeonAutoRules as Rules } from '../../config/DungeonAutoRules.js';
export class DungeonPilotRules {
  /** @param {Object} run @param {string} destination @param {number} fightPenalty @returns {string[]|null} */
  static path(run, destination, fightPenalty = 0) {
    const tiles = run?.map?.tiles;
    if (!tiles?.[run.pos] || !tiles[destination]) return null;
    const costs = new Map([[run.pos, 0]]),
      previous = new Map([[run.pos, null]]),
      queue = [run.pos];
    while (queue.length) {
      queue.sort((a, b) => costs.get(a) - costs.get(b));
      const current = queue.shift();
      if (current === destination) break;
      const tile = tiles[current];
      for (const [dx, dy] of Rules.DIRECTIONS) {
        const next = tiles[`c${tile.col + dx}r${tile.row + dy}`];
        if (!next || (next.id === run.bossTile && next.id !== destination))
          continue;
        const cost =
          costs.get(current) +
          1 +
          (!next.done &&
          Rules.FIGHT_TYPES.includes(next.type) &&
          next.id !== destination
            ? fightPenalty
            : 0);
        if (costs.has(next.id) && costs.get(next.id) <= cost) continue;
        costs.set(next.id, cost);
        previous.set(next.id, current);
        if (!queue.includes(next.id)) queue.push(next.id);
      }
    }
    if (!previous.has(destination)) return null;
    const path = [];
    for (let id = destination; id !== null; id = previous.get(id))
      path.unshift(id);
    return path;
  }
  /** @param {Object} run @param {string} mode @returns {string|null} Next legal waypoint (not an alternate movement engine). */
  static destination(run, mode) {
    if (!run?.map?.tiles || !Rules.MODES.includes(mode)) return null;
    const tiles = Object.values(run.map.tiles),
      isChest = (t) => !t.done && t.type === 'chest',
      isLoot = (t) =>
        isChest(t) || (!t.done && Rules.FIGHT_TYPES.includes(t.type));
    let candidates = [];
    if (mode === 'farm')
      candidates = tiles.filter(
        (t) => t.id !== run.bossTile && (!t.revealed || isLoot(t)),
      );
    else if (mode === 'chest') candidates = tiles.filter(isChest);
    if (!candidates.length)
      candidates = tiles.filter((t) => t.id === run.bossTile);
    let chosen = null;
    for (const tile of candidates) {
      const path = this.path(
        run,
        tile.id,
        mode === 'chest' ? Rules.FIGHT_AVOIDANCE_COST : 0,
      );
      if (!path) continue;
      const score = (p) =>
        p
          .slice(1)
          .reduce(
            (sum, id) =>
              sum +
              1 +
              (mode === 'chest' &&
              !run.map.tiles[id].done &&
              Rules.FIGHT_TYPES.includes(run.map.tiles[id].type)
                ? Rules.FIGHT_AVOIDANCE_COST
                : 0),
            0,
          );
      if (!chosen || score(path) < score(chosen)) chosen = path;
    }
    if (!chosen) return null;
    const target = run.map.tiles[chosen[chosen.length - 1]];
    return target.revealed || chosen.length === 1 ? target.id : chosen[1];
  }
}
