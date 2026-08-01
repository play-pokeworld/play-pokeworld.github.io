/**
 * ItemEngine — Data-driven item system
 * 
 * Powers: calculated dynamically from quantity owned
 * Descriptions: generated from templates with injected values
 * Locations: retrieved from item-database
 * 
 * Architecture: Pure engine — no DOM, no globals (except final exposure)
 */
(function() {
  'use strict';
  
  // ───── Power levels by quantity owned (PokeChill system) ─────
  function getPowerLevel(qty) {
    if (qty >= 20) return 5;
    if (qty >= 15) return 4;
    if (qty >= 10) return 3;
    if (qty >= 5)  return 2;
    return 1;
  }
  
  // ───── Evaluate a power formula string ─────
  function evalFormula(formula, level) {
    try {
      return Function('level', '"use strict"; return (' + formula + ')')(level);
    } catch(e) {
      return 1;
    }
  }
  
  // ───── Get effective power of an item ─────
  function getItemPower(itemKey, qtyOverride) {
    var item = window.ITEMS && window.ITEMS[itemKey];
    if (!item || !item.powerFormula) return 1;
    var qty = (qtyOverride !== undefined) ? qtyOverride : 
              (window.G && window.G.inventory ? (window.G.inventory[itemKey] || 0) : 0);
    var level = getPowerLevel(qty);
    return evalFormula(item.powerFormula, level);
  }
  
  // ───── Get power display string (e.g. "x1.10" at 1 copy, "x1.50" at 25) ─────
  function getPowerDisplay(itemKey) {
    var item = window.ITEMS && window.ITEMS[itemKey];
    if (!item || !item.powerFormula) return '';
    var qty = (window.G && window.G.inventory) ? (window.G.inventory[itemKey] || 0) : 0;
    var level = getPowerLevel(qty);
    var power = evalFormula(item.powerFormula, level);
    var level5 = evalFormula(item.powerFormula, 5);
    return 'x' + power.toFixed(2) + ' (max x' + level5.toFixed(2) + ')';
  }
  
  // ───── Status/type badge HTML generator ─────
  var TYPE_COLORS = {
    fire:'#f08030', water:'#6890f0', grass:'#78c850', electric:'#f8d030',
    ice:'#98d8d8', fighting:'#c03028', poison:'#a040a0', ground:'#e0c068',
    flying:'#a890f0', psychic:'#f85888', bug:'#a8b820', rock:'#b8a038',
    ghost:'#705898', dragon:'#7038f8', dark:'#705848', steel:'#b8b8d0',
    fairy:'#ee99ac', normal:'#a8a878'
  };
  
  function typeBadge(typeName) {
    var key = typeName.toLowerCase();
    var color = TYPE_COLORS[key] || '#888';
    var label = (typeof getTypeName === 'function') ? getTypeName(typeName) : typeName;
    return '<span class="type-badge type-' + key + '" data-type-color="' + color + '" data-style="color:white;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:bold;">' + label + '</span>';
  }
  
  function statusTag(statusName, colorType) {
    var key = (colorType || statusName).toLowerCase();
    var color = TYPE_COLORS[key] || '#888';
    return '<span data-buff="' + key + '"><span data-type-color="' + color + '" data-style="color:white;cursor:help;padding:0.1rem 0.7rem;border-radius:0.2rem;font-size:1.1rem;width:auto;background:var(--type-color,#888);">' + statusName + '</span></span>';
  }
  
  var STATUS_TAGS = {
    burn:    statusTag((typeof t==='function'?t('status_burn_label'):'Burn'),'fire'),
    freeze:  statusTag((typeof t==='function'?t('status_freeze_label'):'Freeze'),'ice'),
    para:    statusTag((typeof t==='function'?t('status_para_label'):'Paralysis'),'electric'),
    poison:  statusTag((typeof t==='function'?t('status_poisoned'):'Poisoned'),'poison'),
    sleep:   statusTag((typeof t==='function'?t('status_sleep_label'):'Sleep'),'normal'),
    confuse: statusTag((typeof t==='function'?t('status_confuse_label'):'Confusion'),'psychic'),
    sunny:   statusTag((typeof t==='function'?t('weather_sunny'):'Sunny'),'fire'),
    rainy:   statusTag((typeof t==='function'?t('weather_rainy'):'Rainy'),'water'),
    sand:    statusTag((typeof t==='function'?t('weather_sandstorm'):'Sandstorm'),'ground'),
    hail:    statusTag((typeof t==='function'?t('weather_hail'):'Hail'),'ice'),
    eterrain: statusTag((typeof t==='function'?t('terrain_electric'):'Electric Terrain'),'electric'),
    gterrain: statusTag((typeof t==='function'?t('terrain_grassy'):'Grassy Terrain'),'grass'),
    mterrain: statusTag((typeof t==='function'?t('terrain_misty'):'Misty Terrain'),'fairy'),
  };
  
  var EN_STATUS = {
    burn:'Burn', freeze:'Freeze', para:'Paralysis', poison:'Poisoned',
    sleep:'Sleep', confuse:'Confused', sunny:'Sunny', rainy:'Rainy',
    sand:'Sandstorm', hail:'Hail', eterrain:'Electric Terrain',
    gterrain:'Grassy Terrain', mterrain:'Misty Terrain'
  };
  
  function getStatusTag(key, lang) {
    if (lang === 'en') {
      var enName = EN_STATUS[key] || key;
      var colorKey = key.replace('eterrain','electric').replace('gterrain','grass').replace('mterrain','fairy');
      return statusTag(enName, colorKey);
    }
    return STATUS_TAGS[key] || key;
  }
  
  // ───── Generate description for an item ─────
  function generateItemDesc(itemKey, lang) {
    lang = lang || 'fr';
    var item = window.ITEMS && window.ITEMS[itemKey];
    if (!item) return '';
    
    var qty = (window.G && window.G.inventory) ? (window.G.inventory[itemKey] || 0) : 0;
    var level = getPowerLevel(qty);
    var power = evalFormula(item.powerFormula || '1', level);
    // Passe 27 : affichage puissance SIMPLE et complet « x1.20 (max x2.00) »
    // directement dans la description (le cadre ⚡ du panneau est retiré).
    var levelMax = evalFormula(item.powerFormula || '1', 5);
    var powStr = 'x' + power.toFixed(2) + ' (max x' + levelMax.toFixed(2) + ')';
    function _statusLabel(key, langKey) {
            var frKeys = { burn:'status_burn_label', freeze:'status_freeze_label', para:'status_para_label', poison:'status_poison', sleep:'status_sleep_label', confuse:'status_confuse_label', sunny:'weather_sunny', rainy:'weather_rainy', sand:'weather_sandstorm', hail:'weather_hail', eterrain:'terrain_electric', gterrain:'terrain_grassy', mterrain:'terrain_misty' }; // passe 27b : 'status_poison' (« Poison », substantif badgable) à la place de status_poisoned (« Empoisonné », non capturé par le badgeur)
      if (langKey === 'en') { var enMap = { sand:'Sandstorm', eterrain:'Electric Terrain', gterrain:'Grassy Terrain', mterrain:'Misty Terrain' }; return enMap[key] || EN_STATUS[key] || key; }
      var k = frKeys[key];
      var v = k && (typeof t === 'function') ? t(k) : '';
      return (v && v !== k) ? v : (EN_STATUS[key] || key);
    }
    function _powerSentence(langKey) {
      if (langKey === 'en') return 'Boosts power by ';
      var v = (typeof t === 'function') ? t('held_power_sentence') : '';
      return (v && v !== 'held_power_sentence') ? v : 'Augmente la puissance de ';
    }

    // Type boosters
    if (item.category === 'type_boost' && item.typeBoost) {
      var badge = typeBadge(item.typeBoost);
      if (lang === 'en') {
        return 'When held: Increase the damage of ' + badge + '-Type moves by ' + powStr;
      }
      return (typeof t==='function'?t('held_boost_type'):'Held: boosts ') + badge + ' de ' + powStr;
    }
    
    // Resistance berries
    if (item.category === 'resistance_berry' && item.resistType) {
      var badge = typeBadge(item.resistType);
      var pct = item.resistPercent || 30;
      if (lang === 'en') {
        return 'When held: Decreases the super-effective damage taken from ' + badge + '-Type moves by ' + pct + '%.';
      }
      return (typeof t==='function'?t('held_resist_prefix'):'Held: reduces ') + pct + '% ' + (typeof t==='function'?t('held_resist_suffix'):'super effective damage of ') + badge;
    }
    
    // Choice items
    if (item.category === 'choice') {
      var statEn = ({atk:(typeof t==='function'?t('stat_atk'):'Attack'),spa:(typeof t==='function'?t('stat_spa'):'Sp. Atk'),spe:(typeof t==='function'?t('stat_spe'):'Speed')})[item.stat] || (typeof t==='function'?t('stat_atk'):'Attack');
      var statFr = ({atk: (typeof t==='function'?t('stat_atk'):'Attack'), spa: (typeof t==='function'?t('stat_spa'):'Sp. Atk'), spe: (typeof t==='function'?t('stat_spe'):'Speed')})[item.stat] || (typeof t==='function'?t('stat_atk'):'Attack');
      if (lang === 'en') {
        return 'When held: Increases the ' + statEn + ' of the user by ' + powStr + ', but prevents them from switching';
      }
      return (typeof t==='function'?t('held_choice_item'):'Held: raises ') + statEn + ' de ' + powStr + (typeof t==='function'?t('held_choice_lock'):", but prevents switching");
    }
    
    // Gems
    if (item.category === 'gem' && item.gemType) {
      var badge = typeBadge(item.gemType);
      if (lang === 'en') {
        return 'When held: Boosts ' + badge + ' damage by 30% once';
      }
      return (typeof t==='function'?t('held_boost_prefix'):'Held: boosts ') + badge + ' de 30% une fois';
    }
    
    // Seeds
    if (item.category === 'seed') {
      var s = item.seedType || '';
      if (lang === 'en') return 'When held: Raises Defense in ' + s + ' Terrain';
      return (typeof t==='function'?t('held_terrain_def'):'Held: raises Defense in ') + s;
    }
    
    // Weather rocks
    if (item.category === 'weather' && item.weather) {
      var wTag = _statusLabel(item.weather, lang);
      if (lang === 'en') return 'When held: Increases the duration of ' + wTag + ' weather';
      return (typeof t==='function'?t('held_weather_duration'):'Held: extends weather ') + wTag;
    }
    
    // Status orbs
    if (item.category === 'status' && item.statusEffect) {
      var sTag = _statusLabel(item.statusEffect, lang);
      if (lang === 'en') {
        return 'When held: Increases the Damage of the user by ' + powStr + ', but inflicts ' + sTag;
      }
      return (typeof t==='function'?t('held_damage_boost'):'Held: boost user damage by ') + powStr + (typeof t==='function'?t('held_inflicts'):', mais inflige ') + sTag;
    }
    
    // CT/TM items: use localization
    if (itemKey.startsWith('ct') || itemKey.startsWith('cs')) {
      var locKey = 'items.' + itemKey + '.desc';
      if (typeof t === 'function') {
        var loc = t(locKey);
        if (loc && loc !== locKey) return loc;
      }
      // Fallback to desc_en/desc_fr or effect
      if (item.desc_en && item.desc_fr) {
        return lang === 'en' ? item.desc_en : item.desc_fr;
      }
      var moveName = item.moveId || itemKey;
      if (lang === 'en') return 'Teaches ' + moveName.replace(/_/g, ' ') + ' to a compatible Pokemon.';
      return (typeof t==='function'?t('teaches_move'):'Teaches ') + moveName.replace(/_/g, ' ') + ' ' + (typeof t==='function'?t('to_compatible_pokemon'):'to a compatible Pokemon.');
    }
    
    // Special items with explicit desc_en/desc_fr
    if (item.desc_en && item.desc_fr) {
      var dTxt = lang === 'en' ? item.desc_en : item.desc_fr;
      // Passe 27 : puissance ajoutée en ligne pour les objets à formule
      // (Orbe Vie, Amulette Claire, Restes…) — plus de cadre séparé.
      if (item.powerFormula) dTxt += ' ' + _powerSentence(lang) + powStr + '.';
      return dTxt;
    }
    
    // Fallback: raw effect
    if (item.effect) { var eTxt = item.effect; if (item.powerFormula) eTxt += ' ' + _powerSentence(lang) + powStr + '.'; return eTxt; }
    // Passe 27 : objet à formule sans description — la phrase de puissance
    // EST la description complète (ex. « Augmente la puissance de x1.20 (max x2.00). »).
    if (item.powerFormula) return _powerSentence(lang) + powStr + '.';
    
    return '';
  }
  
  // ───── French name lookup ─────
  function getItemNameLocalized(key, lang) {
    lang = lang || 'fr';
    var displayKey = window.normalizeItemKey ? window.normalizeItemKey(key) : key;
    var item = window.ITEMS && window.ITEMS[displayKey];
    if (!item) return key.replace(/_/g, ' ');
    
    // CT/CS naming
    if (displayKey.startsWith('ct') || displayKey.startsWith('cs')) {
      var isCS = displayKey.startsWith('cs');
      var locName = (typeof t === 'function') ? t('items.' + displayKey + '.name') : '';
      if (locName && locName !== 'items.' + displayKey + '.name') {
        if (isCS && lang === 'en') return locName + ' TM';
        if (isCS) return locName + ' CS';
        if (lang === 'en') return locName + ' TM';
        return locName + ' CT';
      }
    }
    
    if (lang === 'fr' && item.name_fr) return item.name_fr;
    if (lang === 'en' && item.name_en) return item.name_en;
    
    if (typeof t === 'function') {
      var v = t('items.' + displayKey + '.name');
      if (v && v !== 'items.' + displayKey + '.name') return v;
    }
    
    if (!item.name_en) return key.replace(/_/g, ' ');
    return lang === 'fr' ? (item.name_fr || item.name_en) : item.name_en;
  }
  
  // ───── Expose globally ─────
  window.ItemEngine = {
    getPowerLevel: getPowerLevel,
    getItemPower: getItemPower,
    getPowerDisplay: getPowerDisplay,
    generateItemDesc: generateItemDesc,
    getItemNameLocalized: getItemNameLocalized,
    typeBadge: typeBadge,
    statusTag: statusTag,
    getStatusTag: getStatusTag,
    evalFormula: evalFormula
  };
})();

