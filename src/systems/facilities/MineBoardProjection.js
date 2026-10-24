/**
 * @file MineBoardProjection.js
 * @brief Projects buried shapes into exposed tile models without leaking hidden icons to the UI.
 */
export class MineBoardProjection {
  /** @param {Object} mine @returns {Object[][]} */
  static create(mine, tool) {
    return mine.grid.map((row, y) => row.map((depth, x) => {
      const item = mine.items.find((entry) => entry.shape[y - entry.y]?.[x - entry.x] === 1);
      const center = item && x - item.x === Math.floor(item.shape[0].length / 2) &&
        y - item.y === Math.floor(item.shape.length / 2);
      return { x, y, depth, canDig: tool.offsets.some(([dx, dy]) => (mine.grid[y + dy]?.[x + dx] || 0) > 0), itemId: depth === 0 && item ? item.itemId : null,
        itemCenter: depth === 0 && !!center, collected: item?.collected === true };
    }));
  }
}
