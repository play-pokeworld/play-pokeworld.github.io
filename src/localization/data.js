// ============================================================================
// LOCALIZATION DATA LOADER
// ----------------------------------------------------------------------------
// Runs BEFORE i18n.js. Merges every language module (fr/ and en/ folders, one
// file per domain) into the legacy globals the rest of the game consumes.
//
// Each module file sets a `window.L_<lang>_<domain>` fragment. Here we merge
// them into a single I18N dictionary per language, and expose the special
// arrays/objects (POKE_NAMES_FR, MOVE_NAMES_EN, LOC_NAMES_FR/EN) directly.
//
// To add a new language: create a <lang>/ folder with the same files, then add
// the language code to LANGS below.
// ============================================================================

// Domains that contribute FLAT keys to the root of the dictionary.
var LANG_FLAT_DOMAINS = ['ui','economy','combat','stats','pokedex','messages'];
// Domains kept as NESTED namespaces (data-driven text: items, quests, lore...).
var LANG_NESTED_DOMAINS = ['items','quests','lore','npc','talents','champions','shops','settings','breeding','training','box','automation','map','types'];

var LANGS = ['fr','en'];

function _mergeLang(lang){
 var flat = {};
 for(var i=0;i<LANG_FLAT_DOMAINS.length;i++){
 var d = LANG_FLAT_DOMAINS[i];
 var frag = window['L_'+lang+'_'+d];
 if(frag) for(var k in frag) if(Object.prototype.hasOwnProperty.call(frag,k)) flat[k]=frag[k];
}
 var nested = {};
 for(var j=0;j<LANG_NESTED_DOMAINS.length;j++){
 var nd = LANG_NESTED_DOMAINS[j];
 var nfrag = window['L_'+lang+'_'+nd];
 if(nfrag) nested[nd]=nfrag;
}
 // Combine: nested namespaces sit alongside flat keys.
 var out = flat;
 for(var nk in nested) out[nk]=nested[nk];
 return out;
}

window.I18N = {
 fr: _mergeLang('fr'),
 en: _mergeLang('en')
};

// Pokémon French names (array indexed by species id).
window.POKE_NAMES_FR = (typeof L_pokemon_names_fr !== 'undefined') ? L_pokemon_names_fr : [];
// Move English names (object keyed by move id).
window.MOVE_NAMES_EN = (typeof L_move_names_en !== 'undefined') ? L_move_names_en : {};
// Location names per language.
window.LOC_NAMES_FR = (typeof L_location_names_fr !== 'undefined') ? L_location_names_fr : {};
window.LOC_NAMES_EN = (typeof L_location_names_en !== 'undefined') ? L_location_names_en : {};

