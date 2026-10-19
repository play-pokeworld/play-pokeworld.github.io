/**
 * @file IconRegistry.js
 * @brief Single source of truth for every vector glyph used by the UI (C++: class IconRegistry, static).
 * Icons are pure geometry data (SVG path definitions) — never text, never styling.
 * Widgets render them through UIIcon: `new UIIcon({ name: 'discord' })`.
 */

/**
 * @typedef {Object} IconDefinition
 * @property {string} viewBox      - SVG viewBox
 * @property {string[]} [paths]    - Path "d" attributes
 * @property {Array<{tag: 'circle'|'line'|'rect', attrs: Object<string, number>}>} [shapes] - Primitive shapes
 * @property {'fill'|'stroke'} mode - Paint mode (filled glyph or outlined glyph)
 */

const circle = (cx, cy, r) => ({ tag: 'circle', attrs: { cx, cy, r } });
const line = (x1, y1, x2, y2) => ({ tag: 'line', attrs: { x1, y1, x2, y2 } });
const stroke = (paths, shapes = []) => ({ viewBox: '0 0 24 24', mode: 'stroke', paths, shapes });

/** @type {Readonly<Record<string, IconDefinition>>} */
const ICONS = Object.freeze({
  discord: {
    viewBox: '0 0 24 24',
    mode: 'fill',
    paths: [
      'M19.54 5.3A17.3 17.3 0 0 0 15.3 4a12 12 0 0 0-.55 1.13 16 16 0 0 0-4.8 0A12 12 0 0 0 9.4 4a17.3 17.3 0 0 0-4.25 1.3C2.45 9.3 1.72 13.2 2.08 17a17.4 17.4 0 0 0 5.2 2.63 12.8 12.8 0 0 0 1.12-1.82 11.3 11.3 0 0 1-1.76-.85l.43-.34a12.4 12.4 0 0 0 10.6 0l.43.34c-.56.33-1.15.62-1.76.85.33.64.7 1.25 1.12 1.82A17.3 17.3 0 0 0 22.66 17c.43-4.4-.73-8.26-3.12-11.7ZM9.1 14.66c-1.02 0-1.86-.93-1.86-2.08s.82-2.08 1.86-2.08c1.05 0 1.88.94 1.86 2.08 0 1.15-.82 2.08-1.86 2.08Zm6.84 0c-1.02 0-1.86-.93-1.86-2.08s.82-2.08 1.86-2.08c1.05 0 1.88.94 1.86 2.08 0 1.15-.82 2.08-1.86 2.08Z'
    ]
  },
  chevronLeft: {
    viewBox: '0 0 24 24',
    mode: 'stroke',
    paths: ['M15 18l-6-6 6-6']
  },
  chevronRight: {
    viewBox: '0 0 24 24',
    mode: 'stroke',
    paths: ['M9 18l6-6-6-6']
  },
  emptyDiamond: {
    viewBox: '0 0 24 24',
    mode: 'stroke',
    paths: ['M12 3l9 9-9 9-9-9z']
  },
  rename: {
    viewBox: '0 0 24 24',
    mode: 'stroke',
    paths: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z']
  },
  duplicate: {
    viewBox: '0 0 24 24',
    mode: 'stroke',
    paths: ['M9 9h11v11H9z', 'M5 15H4V4h11v1']
  },
  download: {
    viewBox: '0 0 24 24',
    mode: 'stroke',
    paths: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']
  },
  trash: {
    viewBox: '0 0 24 24',
    mode: 'stroke',
    paths: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6']
  },
  close: {
    viewBox: '0 0 24 24',
    mode: 'stroke',
    paths: ['M18 6L6 18', 'M6 6l12 12']
  },

  // --- Window header glyphs ---
  settings: stroke(
    ['M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z'],
    [circle(12, 12, 3)]
  ),
  book: stroke(['M4 19.5A2.5 2.5 0 016.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z']),
  trophy: stroke(
    ['M6 9H4.5a2.5 2.5 0 010-5H6', 'M18 9h1.5a2.5 2.5 0 000-5H18', 'M4 22h16', 'M18 2H6v7a6 6 0 0012 0V2Z'],
    [line(12, 15, 12, 22)]
  ),
  team: stroke(
    ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87', 'M16 3.13a4 4 0 010 7.75'],
    [circle(9, 7, 4)]
  ),
  egg: stroke(['M12 3c-3.5 0-6 4.2-6 9 0 4.5 2.2 8 6 8s6-3.5 6-8c0-4.8-2.5-9-6-9z']),
  pickaxe: stroke(['M14 3l7 7', 'M4 20l7-7', 'M14 3l-4 4 7 7 4-4', 'M2 22l8-8']),
  map: stroke(['M1 6v16l7-4 8 4 7-4V2l-7 4-8-4z', 'M8 2v16', 'M16 6v16']),
  swords: stroke(['M14.5 17.5L3 6V3h3l11.5 11.5', 'M13 19l6-6', 'M16 16l4 4', 'M19 21l2-2']),
  sparkle: stroke(['M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z']),
  home: stroke(['M3 9.5L12 3l9 6.5', 'M5 8.5V21h14V8.5', 'M9 21v-6h6v6']),
  link: stroke(['M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71']),
  pokedollar: stroke(['M8 21V3h5.5a4.5 4.5 0 010 9H8', 'M5 16h9']),
  pokeball: stroke([], [circle(12, 12, 10), line(2, 12, 22, 12), circle(12, 12, 3)]),
  mapPin: stroke(['M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z'], [circle(12, 10, 3)]),
  dumbbell: stroke(['M6 6v12', 'M18 6v12', 'M3 9h6', 'M15 9h6', 'M3 15h6', 'M15 15h6', 'M9 12h6']),

  // --- Action glyphs (buttons, shortcuts) ---
  box: stroke(['M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', 'M3.27 6.96L12 12.01l8.73-5.05', 'M12 22.08V12']),
  backpack: stroke(['M5 10a7 7 0 0114 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2z', 'M9 4V2h6v2', 'M8 14h8', 'M8 18h8']),
  store: stroke(['M3 9l1.5-5h15L21 9', 'M3 9h18v2a3 3 0 01-6 0 3 3 0 01-6 0 3 3 0 01-6 0z', 'M5 13v8h14v-8', 'M10 21v-5h4v5']),
  bookOpen: stroke(['M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z', 'M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z']),
  help: stroke(['M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3', 'M12 17h.01'], [circle(12, 12, 10)]),
  medal: stroke(['M8.21 13.89L7 23l5-3 5 3-1.21-9.12'], [circle(12, 8, 7)]),
  cart: stroke(['M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6'], [circle(9, 21, 1), circle(20, 21, 1)]),
  chat: stroke(['M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z']),
  door: stroke(['M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4', 'M10 17l5-5-5-5', 'M15 12H3']),
  sofa: stroke(['M4 11V8a3 3 0 013-3h10a3 3 0 013 3v3', 'M2 13a2 2 0 014 0v2h12v-2a2 2 0 014 0v5H2z', 'M5 18v2', 'M19 18v2']),
  save: stroke(['M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8']),
  refresh: stroke(['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0114.85-3.36L23 10', 'M1 14l4.64 4.36A9 9 0 0020.49 15']),
  star: stroke(['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z']),
  zap: stroke(['M13 2L3 14h9l-1 8 10-12h-9z']),
  coin: stroke(['M12 7v10', 'M14.5 9.5h-4a1.5 1.5 0 000 3h3a1.5 1.5 0 010 3h-4'], [circle(12, 12, 9)]),
  tent: stroke(['M3 20L12 4l9 16z', 'M10 20l2-5 2 5']),
  plus: stroke(['M12 5v14', 'M5 12h14'])
});

export class IconRegistry {
  /**
   * @param {string} name
   * @returns {boolean}
   */
  static has(name) {
    return typeof name === 'string' && Object.prototype.hasOwnProperty.call(ICONS, name);
  }

  /**
   * @param {string} name
   * @returns {IconDefinition|null}
   */
  static get(name) {
    return IconRegistry.has(name) ? ICONS[name] : null;
  }

  /** @returns {string[]} */
  static list() {
    return Object.keys(ICONS);
  }
}
