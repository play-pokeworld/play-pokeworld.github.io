// ============================================================================
// LOCALIZATION ENGINE (i18n)
// ----------------------------------------------------------------------------
// Single source of truth for ALL user-facing text in PokéWorld.
//
// Text is organized in language folders (fr/, en/), each file grouping strings
// by domain (ui, economy, combat, stats, pokedex, locations, pokemon-names...).
// `data.js` (loaded BEFORE this file) assembles those fragments into the three
// legacy globals the rest of the game reads from:
//
// window.I18N -> {fr: {<flatKey>:"...", items:{...}, ...},
// en: {...}}
// window.POKE_NAMES_FR -> array (species id -> French name)
// window.MOVE_NAMES_EN -> object (move id -> English name)
// window.LOC_NAMES_FR -> object (location id -> French name)
// window.LOC_NAMES_EN -> object (location id -> English name)
//
// `t(key)` resolves either a flat legacy key ("tab_info") or a dotted path
// ("items.pokeball","quests.5.title") so data-driven text can live in nested
// namespaces while the old flat keys keep working untouched.
// ============================================================================

function currentLang(){
 return (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
}

// Display names consistently in title case without lowercasing official acronyms.
function titleCaseDisplayName(value){
 return String(value || '').replace(/(^|[\s-])(\p{L})/gu, (_, separator, letter) => separator + letter.toLocaleUpperCase());
}

// Resolve a translation key. Supports flat ("tab_info") and dotted ("a.b.c") keys.
function t(key){
 const dict = I18N[currentLang()] || I18N['fr'];
 // 1) flat legacy lookup
 if(dict && Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
 // 2) dotted namespace lookup
 let cur = dict;
 for(const p of key.split('.')){
 if(cur == null) {cur = undefined; break;}
 cur = cur[p];
}
 if(cur != null) return cur;
 // 3) fallback to French
 const fr = I18N['fr'] || {};
 if(Object.prototype.hasOwnProperty.call(fr, key)) return fr[key];
 let c2 = fr;
 for(const p of key.split('.')){
 if(c2 == null) {c2 = undefined; break;}
 c2 = c2[p];
}
 return (c2 != null) ? c2 : key;
}

// Interpolated translation: tr("hello", {name:"Tim"}) with"Hello {name}".
function tr(key, params){
 let s = t(key);
 if(params && typeof s === 'string'){
 for(const k in params){s = s.split('{'+k+'}').join(params[k]);}
}
 return s;
}

// ---- Pokémon / move / location name helpers ---------------------------------
function syncAllNames() {
  // Sync all displayed names after language change
  // Used by legacy code to refresh UI labels
  try { if (typeof renderTeamWindow === 'function') renderTeamWindow(); } catch(_) {}
  try { if (typeof renderInventory === 'function') renderInventory(document.getElementById('tab-content')); } catch(_) {}
}

function updateI18nLabels() {
  // Update all translatable DOM elements
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.dataset.i18n;
    if (key && typeof t === 'function') {
      var text = t(key);
      if (text && text !== key) {
        // Use innerHTML if element contains HTML badges, otherwise textContent
        if (String(text).indexOf('<') !== -1) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.dataset.i18nPlaceholder;
    var text = key && t(key);
    if (text && text !== key) el.setAttribute('placeholder', text);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(function(el) {
    var key = el.dataset.i18nAriaLabel;
    var text = key && t(key);
    if (text && text !== key) el.setAttribute('aria-label', text);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
    var key = el.dataset.i18nTitle;
    var text = key && t(key);
    if (text && text !== key) el.setAttribute('title', text);
  });
}

// Espèces hors dex 1-251 (passe 14 : fossiles Johto → cibles canoniques).
// Les tables de noms restent à 252 entrées (dex Kanto/Johto) ; ces deux-là
// vivent dans un override épars pour ne pas perturber les boucles du dex.
const POKE_NAMES_EXTRA_EN = { 345: 'Lileep', 347: 'Anorith' };
const POKE_NAMES_EXTRA_FR = { 345: 'Lilia', 347: 'Anorith' };
function getPokeName(id){
 const nid = Number(id);
 const lang = currentLang();
 if(lang === 'en') return (POKE_NAMES_EN && POKE_NAMES_EN[nid]) || POKE_NAMES_EXTRA_EN[nid] || ((PD && PD[nid]) ? PD[nid][0] : ('#'+nid));
 return (POKE_NAMES_FR && POKE_NAMES_FR[nid]) || POKE_NAMES_EXTRA_FR[nid] || ((PD && PD[nid]) ? PD[nid][0] : ('#'+nid));
}

function getMoveName(id){
 const lang = currentLang();
 const mv = MOVES ? MOVES[id] : null;
 if(!mv) return id;
 // Use name_en for English, name_fr for French, fallback to formatted name
 if(lang === 'en' && mv.name_en) return mv.name_en;
 if(lang === 'fr' && mv.name_fr) return mv.name_fr;
 // Fallback: format camelCase name
 var rawName = mv.name || id;
 var spaced = rawName.replace(/([a-z])([A-Z])/g, '$1 $2');
 spaced = spaced.replace(/^([a-z])/, function(m) { return m.toUpperCase(); });
 return titleCaseDisplayName(spaced);
}

function getLocName(id){
 const lang = currentLang();
 if(lang === 'en' && LOC_NAMES_EN && LOC_NAMES_EN[id]) return LOC_NAMES_EN[id];
 if(LOC_NAMES_FR && LOC_NAMES_FR[id]) return LOC_NAMES_FR[id];
 return id;
}

// ---- Language switch ---------------------------------------------------------
function setLanguage(lang){
 if(!G) G = {};
 G.lang = lang;
 // Sync the new Localization engine too
 if(typeof window !== 'undefined' && window.L && typeof window.L.set === 'function'){
   window.L.set(lang);
 } else {
   // Legacy: manually update the internal _lang
   try{ safeStorage.set('pokeworld_lang', lang); }catch(_){}
 }
 try{safeStorage.set('pokeworld_lang', lang);}catch(_){}
 document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
 syncAllNames();
 updateI18nLabels();
 try{ if(typeof updateHeader === 'function') updateHeader(); }catch(_){}
 try{ if(typeof renderTeamWindow === 'function') renderTeamWindow(); }catch(_){}
 try{renderHatcheryWindow();}catch(_){}
 try{renderMap();}catch(_){}
 const activeTab = document.querySelector('.tab.active');
 if(activeTab){
 const tabNames = ['info','box','mine','inventory','shop','market','pokedex'];
 const idx = Array.from(document.querySelectorAll('.tab')).indexOf(activeTab);
 if(idx !== -1 && tabNames[idx]) showTab(tabNames[idx]);
 else showTab('info');
} else {
 showTab('info');
}
 try{ if(typeof battle !== 'undefined' && battle && battle.active && typeof updateBattleUI === 'function') updateBattleUI(); }catch(_){}
 saveGame();
 notify(lang === 'en' ? t('lang_switched_en') : t('lang_switched_fr'));
}

// ---- Data-driven text accessors (lore, npc, quests) --------------------------
// Text for these entities now lives in localization namespaces; the data files
// only hold structural fields. These helpers resolve the localized strings.
function getLore(locId){
 const base = t('lore.' + locId);
 // t() returns the key itself when missing; normalize to {speaker,text}
 if(base && typeof base === 'object') return {speaker: base.speaker || '', text: base.text || ''};
 return {speaker: '', text: ''};
}

function getNpc(locId, idx){
 const lang = currentLang();
 const list = I18N[lang] && I18N[lang].npc && I18N[lang].npc[locId];
 const entry = list && list[idx];
 if(entry) return {name: entry.name || '', lines: entry.lines || []};
 return {name: '', lines: []};
}

function getQuestText(cat, id){
 const lang = currentLang();
 const node = I18N[lang] && I18N[lang].quests && I18N[lang].quests[cat] && I18N[lang].quests[cat][String(id)];
 if(node) return {title: node.title || '', desc: node.desc || '', rewardDesc: node.rewardDesc || ''};
 return {title: '', desc: '', rewardDesc: ''};
}

// Champion (Gym Leader) localized name / title / badge name.
function getChampionName(id){return (typeof t==='function') ? (t('champions.'+id+'.name') || id) : id;}
function getChampName(id){return getChampionName(id);}
function getChampTitle(id){return (typeof t==='function') ? (t('champions.'+id+'.title') || '') : '';}
function getChampBadgeName(id){return (typeof t==='function') ? (t('champions.'+id+'.badgeName') || '') : '';}

// Expose key functions globally
if (typeof getPokeName !== 'undefined' && typeof window !== 'undefined') window.getPokeName = getPokeName;
if (typeof getNpcDialog !== 'undefined' && typeof window !== 'undefined') window.getNpcDialog = getNpcDialog;
if (typeof getQuestText !== 'undefined' && typeof window !== 'undefined') window.getQuestText = getQuestText;
if (typeof getChampName !== 'undefined' && typeof window !== 'undefined') window.getChampName = getChampName;
if (typeof getChampTitle !== 'undefined' && typeof window !== 'undefined') window.getChampTitle = getChampTitle;
if (typeof getChampBadgeName !== 'undefined' && typeof window !== 'undefined') window.getChampBadgeName = getChampBadgeName;
if (typeof getChampionName !== 'undefined' && typeof window !== 'undefined') window.getChampionName = getChampionName;
if (typeof getChampionTitle !== 'undefined' && typeof window !== 'undefined') window.getChampionTitle = getChampionTitle;
if (typeof getChampionBadgeName !== 'undefined' && typeof window !== 'undefined') window.getChampionBadgeName = getChampionBadgeName;



