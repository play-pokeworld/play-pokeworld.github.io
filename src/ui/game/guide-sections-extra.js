/**
 * PokéWorld UI — Guide : rubriques ajoutées en V7-R3c (retour joueur « le guide
 * doit expliquer les IV, comment les gagner, et plein d'autres trucs »).
 *
 * Rubriques : « Stats, IV & EV », « Poké Balls & filtres », « Chromatiques »,
 * « Son & musique », plus la page « Où acheter » de l'automatisation. Comme
 * dans guide-sections.js, les CHIFFRES viennent du code qui les applique
 * (GAME.STATS, GAME.CAPTURE, ITEMS, SHOPS, BALL_DEFS, PRESET_FILTERS,
 * AUDIO_MUSIC_TRACKS…) — jamais recopiés en dur dans un texte (TXT-01).
 *
 * Sorti de guide-sections.js pour rester sous le budget de 1 000 lignes
 * (DBT-09) ; guide-sections.js fusionne `guideExtraSections()` à sa carte.
 *
 * @module ui/game/guide-sections-extra
 */

const _T = (k) => (typeof globalThis.t === 'function' ? globalThis.t(k) : k);
const _TR = (k, v) =>
  typeof globalThis.tr === 'function' ? globalThis.tr(k, v) : k + ' ' + JSON.stringify(v);

function _fmt(n) {
  const g = globalThis;
  return typeof g.formatNumber === 'function' ? g.formatNumber(n) : String(n);
}

/** Icône de rubrique (getIcon est une globale UI, absente des harnais VM). */
function _icon(name) {
  const fn = globalThis.getIcon;
  return typeof fn === 'function' ? fn(name, 14) : '';
}

/** Prix d'un objet (ITEMS) formaté, ou « — » s'il n'est pas vendu. */
function _price(key) {
  const items = globalThis.ITEMS || {};
  const itm = items[key];
  return itm && itm.price ? _fmt(itm.price) : '—';
}

/** Noms des boutiques (SHOPS) qui vendent un objet, « — » si aucune. */
function _shopsSelling(key) {
  const shops = globalThis.SHOPS || {};
  const nameFn = globalThis.getShopName;
  const out = [];
  for (const id of Object.keys(shops)) {
    const list = (shops[id] && shops[id].items) || [];
    if (!list.includes(key)) continue;
    let name = id;
    try {
      if (typeof nameFn === 'function') name = nameFn(id) || id;
    } catch (_) {}
    out.push(name);
  }
  return out.length ? out.join(', ') : '—';
}

/** Valeurs réelles de la rubrique « Stats, IV & EV ». */
function statsGuideValues() {
  const g = globalThis;
  const S = (g.GAME && g.GAME.STATS) || {};
  const C = (g.GAME && g.GAME.CAPTURE) || {};
  const ivStep = Number(S.IV_STEP_PCT) || 5;
  const evStep = Number(S.EV_STEP_PCT) || 5;
  const ivCap = Number(C.IV_CAP) || 12;
  const evCap = Number(S.EV_CAP) || 18;
  const vitamins = ['hp_up', 'protein', 'iron', 'calcium', 'carbos', 'zinc'];
  const nameFn = g.getItemName;
  const itemName = (k) => {
    try {
      if (typeof nameFn === 'function') return nameFn(k) || k;
    } catch (_) {}
    return k;
  };
  return {
    ivStep: _fmt(ivStep),
    evStep: _fmt(evStep),
    shinyBonus: _fmt(Number(S.SHINY_BONUS_PCT) || 20),
    ivCap: _fmt(ivCap),
    ivMaxBonus: _fmt(ivCap * ivStep),
    evCap: _fmt(evCap),
    evTotal: _fmt(Number(S.EV_TOTAL_CAP) || 36),
    evMaxBonus: _fmt(evCap * evStep),
    capturePct: _fmt(Number(C.IV_CHANCE_PCT) || 10),
    bottleCap: _price('bottle_cap'),
    goldenCap: _price('golden_bottle_cap'),
    capShops: _shopsSelling('bottle_cap'),
    goldenCapShops: _shopsSelling('golden_bottle_cap'),
    vitaminPrice: _price('hp_up'),
    vitaminNames: vitamins.map(itemName).join(', '),
    vitaminShops: _shopsSelling('hp_up'),
    abilityCapsule: _price('ability_capsule'),
    abilityPatch: _price('ability_patch'),
    abilityShops: _shopsSelling('ability_capsule'),
    patchShops: _shopsSelling('ability_patch'),
    hatcheryLoc: (() => {
      try {
        if (typeof g.getLocName === 'function') return g.getLocName('route5') || 'Route 5';
      } catch (_) {}
      return 'Route 5';
    })(),
  };
}

/** Valeurs réelles de la rubrique « Poké Balls & filtres ». */
function ballGuideValues() {
  const g = globalThis;
  const presets = Array.isArray(g.PRESET_FILTERS) ? g.PRESET_FILTERS : [];
  const defs = g.BALL_DEFS || {};
  const presetLine = presets.map((p) => _T(p.labelKey)).join(' → ');
  // Balls à condition : nom + effet (getItemDesc = même texte que le sélecteur).
  const descFn = g.getItemDesc;
  const condBalls = Object.keys(defs)
    .filter((k) => defs[k] && defs[k].condition)
    .map((k) => {
      let d = '';
      try {
        if (typeof descFn === 'function') d = descFn(k) || '';
      } catch (_) {}
      return d ? `${_T('ball_' + k)} — ${d}` : _T('ball_' + k);
    })
    .join(' · ');
  const scale = g.BALL_SCALE || {};
  return {
    presets: presetLine,
    presetCount: _fmt(presets.length),
    condBalls: condBalls || '—',
    scaleMax: _fmt(Number(scale.maxCopies) || 25),
  };
}

/** Valeurs réelles de la rubrique « Chromatiques » (taux lus dans encounter-rules). */
function shinyGuideValues() {
  const g = globalThis;
  const base = g.SHINY_BASE_RATE ? Math.round(1 / g.SHINY_BASE_RATE) : 4096;
  const S = (g.GAME && g.GAME.STATS) || {};
  return {
    shiny: _fmt(base),
    shinyCharm: _fmt(Math.round(base / 2)),
    shinyBonus: _fmt(Number(S.SHINY_BONUS_PCT) || 20),
  };
}

/** Valeurs réelles de la rubrique « Son & musique ». */
function soundGuideValues() {
  const g = globalThis;
  const tracks = g.AUDIO_MUSIC_TRACKS ? Object.keys(g.AUDIO_MUSIC_TRACKS).length : 0;
  return {
    tracks: _fmt(tracks),
    music: _T('settings_music'),
    sfx: _T('settings_sfx'),
    cries: _T('settings_cries'),
  };
}

/**
 * Rubriques supplémentaires : { id: { icon, title, pages, after } } — `after`
 * = id de la rubrique de guide-sections.js derrière laquelle s'insérer.
 */
function guideExtraSections() {
  const sv = statsGuideValues();
  const bv = ballGuideValues();
  const snd = soundGuideValues();
  const shv = shinyGuideValues();
  return {
    stats: {
      after: 'pokemon',
      icon: _icon('training'),
      title: _T('guide_stats_title'),
      pages: [
        [_T('guide_stats_formula'), _TR('guide_stats_formula_desc', sv)],
        [_T('guide_stats_iv_gain'), _TR('guide_stats_iv_gain_desc', sv)],
        [_T('guide_stats_iv_items'), _TR('guide_stats_iv_items_desc', sv)],
        [_T('guide_stats_ev_gain'), _TR('guide_stats_ev_gain_desc', sv)],
        [_T('guide_stats_abilities'), _TR('guide_stats_abilities_desc', sv)],
      ],
    },
    pokeballs: {
      after: 'capture',
      icon: _icon('pokeball'),
      title: _T('guide_balls_title'),
      pages: [
        [_T('guide_balls_filters'), _TR('guide_balls_filters_desc', bv)],
        [_T('guide_balls_shiny_case'), _T('guide_balls_shiny_case_desc')],
        [_T('guide_balls_custom'), _T('guide_balls_custom_desc')],
        [_T('guide_balls_special'), _TR('guide_balls_special_desc', bv)],
      ],
    },
    shiny: {
      after: 'pokeballs',
      icon: _icon('shiny'),
      title: _T('guide_shiny_title'),
      pages: [
        [_T('guide_shiny_odds'), _TR('guide_shiny_odds_desc', shv)],
        [_T('guide_shiny_bonus'), _TR('guide_shiny_bonus_desc', shv)],
        [_T('guide_shiny_dupes'), _T('guide_shiny_dupes_desc')],
        [_T('guide_shiny_farm'), _T('guide_shiny_farm_desc')],
      ],
    },
    sound: {
      after: 'save',
      icon: _icon('settings'),
      title: _T('guide_sound_title'),
      pages: [
        [_T('guide_sound_settings'), _TR('guide_sound_settings_desc', snd)],
        [_T('guide_sound_places'), _TR('guide_sound_places_desc', snd)],
        [_T('guide_sound_official'), _T('guide_sound_official_desc')],
      ],
    },
  };
}

/** Page « Où acheter » de la rubrique Automatisation (prix sur chaque bouton). */
function automationBuyPage() {
  return [_T('guide_automation_buy'), _T('guide_automation_buy_desc')];
}

/**
 * Fusionne les rubriques supplémentaires dans la carte de guide-sections.js en
 * respectant l'ordre d'affichage (`after`).
 */
function mergeGuideSections(base) {
  const extra = guideExtraSections();
  const order = Object.keys(base);
  for (const id of Object.keys(extra)) {
    const { after, ...section } = extra[id];
    const at = order.indexOf(after);
    if (at < 0) order.push(id);
    else order.splice(at + 1, 0, id);
    base[id] = section;
  }
  const out = {};
  for (const id of order) if (base[id]) out[id] = base[id];
  return out;
}

export {
  guideExtraSections,
  mergeGuideSections,
  automationBuyPage,
  statsGuideValues,
  shinyGuideValues,
  ballGuideValues,
  soundGuideValues,
};
