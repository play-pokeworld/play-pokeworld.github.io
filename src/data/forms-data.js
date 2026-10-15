/**
 * PokéWorld — formes alternatives (V7 · FORM-01, décisions D1/D12).
 *
 * Une forme est un Pokémon À PART pour le jeu et les boîtes (entrée de boîte
 * distincte, propre Pokémon), mais elle NE compte PAS pour le 100 % d'une
 * région : la base OU n'importe quelle forme suffit (`countCaughtInRegion`).
 *
 * Clé = `${base}-${slot}` (= `speciesKey(p)` pour un Pokémon `{id, form}`).
 * `PD` ne contient plus aucun id > 386 : les anciens « numéros » 387–392 sont
 * réécrits par la migration de sauvegarde v4 (FORM-02).
 *
 *   kind : 'alt'      — Morphéo, Deoxys, Motisma…
 *          'mega'     — P8 (un Pokémon à part, D12/D21)
 *          'cosmetic' — Prismillon, Couafarel (P7)
 *          'weather' / 'season' — formes pilotées par WEA-01 / SEA-01 (P7)
 *
 * Champs : base, slot, key, name_fr, name_en, types, stats [PV, ATK, DEF,
 * ASP, DSP, VIT], sprite (clé dans sprites.js), kind, source
 * (`{ shop: panelKey, price }` — lu par la boutique ET par la fiche dex).
 *
 * @module data/forms-data
 */
export const FORMS = {
  '351-1': { base: 351, slot: 1, key: 'sunny', name_fr: 'Morphéo Solaire', name_en: 'Castform Sunny',
             types: ['Fire', ''], stats: [70, 70, 70, 70, 70, 70], sprite: '351-1', kind: 'alt',
             source: { shop: 'castform_forms', price: 20000 } },
  '351-2': { base: 351, slot: 2, key: 'rainy', name_fr: 'Morphéo Eau de Pluie', name_en: 'Castform Rainy',
             types: ['Water', ''], stats: [70, 70, 70, 70, 70, 70], sprite: '351-2', kind: 'alt',
             source: { shop: 'castform_forms', price: 20000 } },
  '351-3': { base: 351, slot: 3, key: 'snowy', name_fr: 'Morphéo Blizzard', name_en: 'Castform Snowy',
             types: ['Ice', ''], stats: [70, 70, 70, 70, 70, 70], sprite: '351-3', kind: 'alt',
             source: { shop: 'castform_forms', price: 20000 } },
  '386-1': { base: 386, slot: 1, key: 'attack', name_fr: 'Deoxys Attaque', name_en: 'Deoxys Attack',
             types: ['Psychic', ''], stats: [50, 180, 20, 180, 20, 150], sprite: '386-1', kind: 'alt',
             source: { shop: 'deoxys_forms', price: 50000 } },
  '386-2': { base: 386, slot: 2, key: 'defense', name_fr: 'Deoxys Défense', name_en: 'Deoxys Defense',
             types: ['Psychic', ''], stats: [50, 70, 160, 70, 160, 90], sprite: '386-2', kind: 'alt',
             source: { shop: 'deoxys_forms', price: 50000 } },
  '386-3': { base: 386, slot: 3, key: 'speed', name_fr: 'Deoxys Vitesse', name_en: 'Deoxys Speed',
             types: ['Psychic', ''], stats: [50, 95, 90, 95, 90, 180], sprite: '386-3', kind: 'alt',
             source: { shop: 'deoxys_forms', price: 50000 } },
};

/** Valeurs admises pour `kind` (validate-project.mjs, FORM-04). */
export const FORM_KINDS = ['alt', 'mega', 'cosmetic', 'weather', 'season'];

/**
 * Panneaux « boutique de formes » (Institut Météo, Autopia) — titre i18n,
 * base requise en boîte, lieu. Les prix sont dans chaque forme (`source`).
 */
export const FORM_SHOPS = {
  castform_forms: { baseId: 351, titleKey: 'forms_shop_castform_title', location: 'weather_institute', icon: '\u{1F324}\uFE0F' },
  deoxys_forms:   { baseId: 386, titleKey: 'forms_shop_deoxys_title',   location: 'fallarbor',         icon: '\u2604\uFE0F' },
};

/**
 * Anciens « numéros de dex » des formes (sauvegardes v3) → clé de forme.
 * Utilisé UNIQUEMENT par la migration v4 (FORM-02).
 */
export const LEGACY_FORM_IDS = {
  387: '351-1', 388: '351-2', 389: '351-3',
  390: '386-1', 391: '386-2', 392: '386-3',
};

if (typeof globalThis !== 'undefined') {
  globalThis.FORMS = FORMS;
  globalThis.FORM_KINDS = FORM_KINDS;
  globalThis.FORM_SHOPS = FORM_SHOPS;
  globalThis.LEGACY_FORM_IDS = LEGACY_FORM_IDS;
}
