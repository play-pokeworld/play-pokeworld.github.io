/**
 * @file ContentTables.js
 * @brief Merges the generated tables (src/data/raw, rewritten by tools/data) with the hand-made
 * content tables (src/data/content, never touched by the generators).
 * A content entry with the id of a generated entry REPLACES it (whole entry, no deep merge);
 * any other content entry is ADDED after the generated ones.
 */

/**
 * Keyed tables ({ id: entry }).
 * @param {Object} generated
 * @param {Object} [content]
 * @returns {Object} New object, generated order first
 */
export function withContent(generated, content = {}) {
  return { ...generated, ...content };
}

/**
 * List tables ([entry]) whose entries are identified by `keyOf(entry)`.
 * @param {Object[]} generated
 * @param {Object[]} [content]
 * @param {function(Object):string} keyOf
 * @returns {Object[]} New array: replaced entries keep their position, new ones are appended
 */
export function withContentList(generated, content = [], keyOf) {
  const byKey = new Map(content.map((entry) => [keyOf(entry), entry]));
  const merged = generated.map((entry) => {
    const key = keyOf(entry);
    if (!byKey.has(key)) return entry;
    const replacement = byKey.get(key);
    byKey.delete(key);
    return replacement;
  });
  return [...merged, ...byKey.values()];
}
