// Vague 41 — module ESM natif. La surface classique (window/globalThis) est
// gardée : consommateurs classiques, harnais VM et registre moteur.
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
var LANG_NESTED_DOMAINS = ['items','quests','lore','npc','talents','champions','shops','settings','breeding','training','box','automation','map','types','move_descs','base'];

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

// Merge (or re-merge) every loaded L_<lang>_<domain> fragment into the
// legacy globals. Runs at import time, then again after a language pack
// finishes its dynamic import (wave 32: only the active language is loaded
// on the startup path — the merge must therefore be re-runnable). t() and
// the *NAMES* lookups read these globals live, so replacing the objects is
// enough for every downstream consumer.
function _pwLocalizeApply(){
 var dict = {
  fr: _mergeLang('fr'),
  en: _mergeLang('en')
 };
 window.I18N = globalThis.I18N = dict;
 // Pokémon names per language (array indexed by species id).
 window.POKE_NAMES_FR = globalThis.POKE_NAMES_FR = (typeof L_pokemon_names_fr !== 'undefined') ? L_pokemon_names_fr : [];
 window.POKE_NAMES_EN = globalThis.POKE_NAMES_EN = (typeof L_pokemon_names_en !== 'undefined') ? L_pokemon_names_en : [];
 // Move English names (object keyed by move id).
 window.MOVE_NAMES_EN = globalThis.MOVE_NAMES_EN = (typeof L_move_names_en !== 'undefined') ? L_move_names_en : {};
 // Location names per language.
 window.LOC_NAMES_FR = globalThis.LOC_NAMES_FR = (typeof L_location_names_fr !== 'undefined') ? L_location_names_fr : {};
 window.LOC_NAMES_EN = globalThis.LOC_NAMES_EN = (typeof L_location_names_en !== 'undefined') ? L_location_names_en : {};
 return dict;
}

var I18N = _pwLocalizeApply();
if (typeof I18N !== 'undefined') {
  if (typeof window !== 'undefined') window.I18N = I18N;
  if (typeof globalThis !== 'undefined') globalThis.I18N = I18N;
}
if (typeof window !== 'undefined') window.__pwLocalizeRemerge = _pwLocalizeApply;
if (typeof globalThis !== 'undefined') globalThis.__pwLocalizeRemerge = _pwLocalizeApply;




// Vague 41 — module ESM natif : export des mêmes noms que la surface
// classique gardée ci-dessus (corps inchangé).
const __pwrb_I18N = (typeof globalThis !== 'undefined') ? globalThis.I18N : undefined;
const __pwrb_POKE_NAMES_FR = (typeof globalThis !== 'undefined') ? globalThis.POKE_NAMES_FR : undefined;
const __pwrb_POKE_NAMES_EN = (typeof globalThis !== 'undefined') ? globalThis.POKE_NAMES_EN : undefined;
const __pwrb_MOVE_NAMES_EN = (typeof globalThis !== 'undefined') ? globalThis.MOVE_NAMES_EN : undefined;
const __pwrb_LOC_NAMES_FR = (typeof globalThis !== 'undefined') ? globalThis.LOC_NAMES_FR : undefined;
const __pwrb_LOC_NAMES_EN = (typeof globalThis !== 'undefined') ? globalThis.LOC_NAMES_EN : undefined;
export {
  __pwrb_I18N as I18N,
  __pwrb_POKE_NAMES_FR as POKE_NAMES_FR,
  __pwrb_POKE_NAMES_EN as POKE_NAMES_EN,
  __pwrb_MOVE_NAMES_EN as MOVE_NAMES_EN,
  __pwrb_LOC_NAMES_FR as LOC_NAMES_FR,
  __pwrb_LOC_NAMES_EN as LOC_NAMES_EN,
};
