/**
 * PokeCore - Centralized engine API
 * All game code must use these getters - NEVER hardcode strings, URLs, or display logic.
 * Private closures enforce this at the architecture level.
 */
'use strict';

// ============================================================================
// 1. PRIVATE DATA - Encapsulated, no direct access
// ============================================================================

// ─── Sprite base paths (private) ───
const _SPRITE_BASE = 'src/assets/images/';
const _PATHS = {
  pokemon: _SPRITE_BASE + 'pokemon/front/',
  pokemonShiny: _SPRITE_BASE + 'pokemon/frontShiny/',
  items: _SPRITE_BASE + 'items/',
  trainers: _SPRITE_BASE + 'trainers/npcs/',
  trainerProfiles: _SPRITE_BASE + 'trainers/profil/',
  maps: _SPRITE_BASE + 'maps/',
  backgrounds: _SPRITE_BASE + 'backgrounds/',
};

// ─── Type/weather color map (single source of truth) ───
const _TYPE_COLORS = {
  fire:'#f08030', water:'#6890f0', grass:'#78c850', electric:'#f8d030',
  ice:'#98d8d8', fighting:'#c03028', poison:'#a040a0', ground:'#e0c068',
  flying:'#a890f0', psychic:'#f85888', bug:'#a8b820', rock:'#b8a038',
  ghost:'#705898', dragon:'#7038f8', dark:'#705848', steel:'#b8b8d0',
  fairy:'#ee99ac', normal:'#a8a878'
};

const _WEATHER_COLORS = {
  sunny:'#FBA64C', rainy:'#539DDF', sandstorm:'#DA7C4D', hail:'#76D1C1',
  electric:'#F2D94E', grassy:'#60BE58', misty:'#EF90E6', psychic:'#FA8582',
  burn:'#f08030', freeze:'#98d8d8', para:'#f8d030', poison:'#a040a0',
  sleep:'#705898', confuse:'#FA8582', flinch:'#d3524b', slow:'#539DDF'
};

// ─── Status/weather badge definitions ───
const _STATUS_BADGES_FR = {
  burn:'Brûlure', freeze:'Gel', para:'Paralysie', poison:(typeof t==='function'?t('status_toxic'):'Toxic'),
  sleep:'Sommeil', confuse:'Confusion', sunny:'Soleil', rainy:'Pluie',
  sand:(typeof t==='function'?t('weather_sandstorm'):'Sandstorm'), hail:'Grêle',
  eterrain:(typeof t==='function'?t('terrain_electric'):'Electric Terrain'), gterrain:'Champ Herbu',
  mterrain:'Champ Brumeux', pterrain:'Champ Psychique'
};
const _STATUS_BADGES_EN = {
  burn:'Burn', freeze:'Freeze', para:'Paralysis', poison:'Poisoned',
  sleep:'Sleep', confuse:'Confused', sunny:'Sunny', rainy:'Rainy',
  sand:'Sandstorm', hail:'Hail',
  eterrain:'Electric Terrain', gterrain:'Grassy Terrain',
  mterrain:'Misty Terrain', pterrain:'Psychic Terrain'
};

// ============================================================================
// 2. PUBLIC API - Getters (read-only access)
// ============================================================================

const PokeCore = {
  // ─── Language ───
  get lang() { return (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr'; },

  // ─── Localized text (MANDATORY for ALL user-facing strings) ───
  t: function(key, ...args) {
    if (typeof window.t === 'function') return window.t(key, ...args);
    return key;
  },
  tr: function(key, vars) {
    if (typeof window.tr === 'function') return window.tr(key, vars);
    return key;
  },

  // ─── Sprite URLs ───
  spriteUrl: {
    pokemon: function(id, shiny, back) {
      var lookup = String(id);
      var num = null;
      if (typeof DEX_MAP !== 'undefined' && DEX_MAP && DEX_MAP[lookup] != null) num = DEX_MAP[lookup];
      else if (/^\d+$/.test(lookup)) num = Number(lookup);
      else if (typeof PD !== 'undefined' && PD) {
        var normalized = lookup.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (var dexId in PD) {
          var species = String((PD[dexId] && PD[dexId][0]) || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (species === normalized) { num = Number(dexId); break; }
        }
      }
      var bucket = shiny ? 'frontShiny' : 'front';
      if (typeof getPokemonSpriteUrl === 'function') {
        return getPokemonSpriteUrl(num != null ? num : lookup, shiny);
      }
      if (typeof window !== 'undefined' && typeof window.getPokemonSpriteUrl === 'function') {
        return window.getPokemonSpriteUrl(num != null ? num : lookup, shiny);
      }
      if (num != null && typeof SPRITE_DATA !== 'undefined' && SPRITE_DATA && SPRITE_DATA[bucket] && SPRITE_DATA[bucket][String(num)]) {
        return SPRITE_DATA[bucket][String(num)];
      }
      var safe = lookup.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      var base = back ? _SPRITE_BASE + 'pokemon/back/' : (shiny ? _PATHS.pokemonShiny : _PATHS.pokemon);
      return base + safe + '.png';
    },
    item: function(key) {
      key = (typeof window.normalizeItemKey === 'function') ? normalizeItemKey(key) : key;
      if (!key) return _PATHS.items + 'unknown.png';
      if (key.startsWith('ct') || key.startsWith('cs')) {
        var it = (typeof ITEMS !== 'undefined') ? ITEMS[key] : null;
        if (it && it.moveId) {
          var mv = (typeof MOVES !== 'undefined') ? MOVES[it.moveId] : null;
          if (mv && mv.type) return _PATHS.items + 'tm_' + mv.type.toLowerCase() + '.png';
        }
        return _PATHS.items + 'tm_normal.png';
      }
      return _PATHS.items + key + '.png';
    },
    trainer: function(key) {
      var spriteKey = (typeof getTrainerSpriteKey === 'function') ? getTrainerSpriteKey(key) : 'trainer';
      var sprites = (typeof TRAINER_SPRITES !== 'undefined') ? TRAINER_SPRITES : {};
      var file = sprites[spriteKey] || sprites.trainer || 'Ace Trainer (male).png';
      return _PATHS.trainers + encodeURI(file);
    },
    trainerProfile: function(id) {
      return _PATHS.trainerProfiles + 'trainer-' + Number(id) + '.png';
    },
    map: function(region) {
      return _PATHS.maps + region + '.png';
    }
  },

  // ─── Sprite HTML helpers ───
  spriteImg: function(id, emoji, opts) {
    if (typeof window.spriteImg === 'function') return window.spriteImg(id, emoji, opts);
    opts = opts || {};
    var size = opts.size || 80;
    var shiny = opts.shiny || false;
    var url = this.spriteUrl.pokemon(id, shiny);
    var cls = 'poke-sprite-img' + (shiny ? ' shiny' : '');
    return '<img class="' + cls + '" src="' + url + '" style="width:' + size + 'px;height:' + size + 'px;image-rendering:pixelated;" alt="#' + id + '" onerror="this.style.display=\'none\';">';
  },

  itemSpriteHtml: function(key, size) {
    if (typeof window.itemSpriteHtml === 'function') return window.itemSpriteHtml(key, size);
    size = size || 24;
    var url = this.spriteUrl.item(key);
    var icon = (window.ITEMS && ITEMS[key] && ITEMS[key].icon) || '';
    if (url) {
      return '<img src="' + url + '" style="width:'+size+'px;height:'+size+'px;image-rendering:pixelated;" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'inline-flex\';"><span style="display:none;align-items:center;justify-content:center;width:'+size+'px;height:'+size+'px;font-size:'+(size-4)+'px;">' + icon + '</span>';
    }
    return '<span data-style="display:flex;align-items:center;justify-content:center;width:var(--ii-size);height:var(--ii-size);font-size:var(--ii-fs);" style="--ii-size:'+size+'px;--ii-fs:'+(size-4)+'px;">' + icon + '</span>';
  },

  trainerSpriteImg: function(key, size) {
    if (typeof window.trainerSpriteImg === 'function') return window.trainerSpriteImg(key, size);
    size = size || 72;
    var url = this.spriteUrl.trainer(key);
    return '<img class="trainer-sprite-img" src="' + url + '" width="' + size + '" height="' + size + '" alt="' + (key || 'trainer') + '">';
  },

  // ─── Type colors ───
  getTypeColor: function(type) {
    return _TYPE_COLORS[(type || '').toLowerCase()] || '#888';
  },

  // ─── Unified badge system (ALL status/weather/type badges go through here) ───
  badge: {
    type: function(typeName) {
      var key = String(typeName || '').toLowerCase();
      var color = _TYPE_COLORS[key] || '#888';
      // Phase 24: localized label ('Fire' -> 'Feu' when the active language is fr).
      var label = (typeof getTypeName === 'function') ? getTypeName(typeName) : typeName;
      return '<span class="type-badge type-' + key + '" data-type-color="' + color + '">' + window.PokeCore.escapeHtml(label) + '</span>';
    },
    status: function(statusKey, labelOverride) {
      var lang = window.PokeCore.lang;
      var names = lang === 'en' ? _STATUS_BADGES_EN : _STATUS_BADGES_FR;
      var label = labelOverride || names[statusKey] || statusKey;
      var colorKey = statusKey === 'eterrain' ? 'electric' :
                     statusKey === 'gterrain' ? 'grass' :
                     statusKey === 'mterrain' ? 'fairy' :
                     statusKey === 'pterrain' ? 'psychic' : statusKey;
      var color = _WEATHER_COLORS[statusKey] || _TYPE_COLORS[colorKey] || '#888';
      return '<span class="move-desc-badge status-badge" data-status="' + window.PokeCore.escapeHtml(statusKey) + '" data-type-color="' + color + '">' + window.PokeCore.escapeHtml(label) + '</span>';
    },
    // Parse a description and replace ALL weather/status/terrain terms with colored badges
    enrichDescription: function(desc) {
      if (!desc || typeof desc !== 'string') return desc || '';
      var self = this;
      var lang = window.PokeCore.lang;
      var dict = lang === 'en' ? _STATUS_BADGES_EN : _STATUS_BADGES_FR;
      var r = desc;
      Object.entries(dict).forEach(function([key, label]) {
        // Build regex to match all variants case-insensitively
        var patterns = [label];
        // Add English variants if FR
        if (lang === 'fr' && _STATUS_BADGES_EN[key]) patterns.push(_STATUS_BADGES_EN[key]);
        // Add lowercase variants
        patterns.push(label.toLowerCase());
        if (_STATUS_BADGES_EN[key]) patterns.push(_STATUS_BADGES_EN[key].toLowerCase());
        // Also add the English key name
        patterns.push(key);
        // Build regex
        var pattern = patterns.filter(function(p, i, a) { return a.indexOf(p) === i; }).join('|');
        try {
          var regex = new RegExp('\\b(' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'gi');
          r = r.replace(regex, function(match) {
            return self.status(key.replace('terrain',''), match);
          });
        } catch(e) {}
      });
      return r;
    }
  },

  // ─── Pokemon name (localized) ───
  getPokeName: function(id) {
    if (typeof window.getPokeName === 'function') return window.getPokeName(id);
    var nid = Number(id);
    return (window.PD && PD[nid]) ? PD[nid][0] : '#' + nid;
  },

  // ─── Move name (localized) ───
  getMoveName: function(id) {
    if (typeof window.getMoveName === 'function') return window.getMoveName(id);
    return id;
  },

  // ─── Item name (localized) ───
  getItemName: function(key) {
    if (typeof window.getItemName === 'function') return window.getItemName(key);
    return key;
  },

  // ─── Item description (localized) ───
  getItemDesc: function(key) {
    if (typeof window.getItemDesc === 'function') return window.getItemDesc(key);
    return '';
  },

  // ─── Talent helpers ───
  getTalentName: function(tal) {
    if (typeof window.getTalentName === 'function') return window.getTalentName(tal);
    return tal;
  },
  getTalentDesc: function(tal) {
    if (typeof window.getTalentDesc === 'function') return window.getTalentDesc(tal);
    return '';
  },
  getRarityLabel: function(rarity) {
    if (typeof window.getRarityLabel === 'function') return window.getRarityLabel(rarity);
    return String(rarity);
  },

  // ─── HTML helper (safe, consistent) ───
  escapeHtml: function(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  // ─── Button HTML (standardized across game) ───
  buttonHtml: function(label, action, args, variant) {
    variant = variant || '';
    var actionStr = action ? ' data-action="legacy-call" data-call="' + action + '" data-call-args="' + this.escapeHtml(args || '') + '"' : '';
    return '<button class="hbtn' + (variant ? ' ' + variant : '') + '"' + actionStr + '>' + label + '</button>';
  }
};

console.debug('[PokeCore] Engine initialized');
// T2 (wave 38): ESM module — native export; engine API kept on the
// global object (classic consumers: sprites, helpers — VM harnesses included).
export { PokeCore };
export default PokeCore;
if (typeof globalThis !== 'undefined') globalThis.PokeCore = PokeCore;
