// Vague 41 — module ESM natif. La surface classique (window/globalThis) est
// gardée : consommateurs classiques, harnais VM et registre moteur.
// Storage service (engine boot layer): resolved once, shared through the
// global object — concatenated VM harnesses and all chunks share ONE binding.
// Fallback if util.js is not loaded — targeted unit tests.
// Shared safe-HTML service (engine pwSetHtml when present, else direct).
// globalThis-backed so concatenated VM harnesses and classic stubs stay valid.
if (typeof globalThis !== 'undefined' && typeof globalThis._pwSetHtmlSafe !== 'function') {
  globalThis._pwSetHtmlSafe = function (el, html) { if (typeof pwSetHtml === 'function') pwSetHtml(el, html); else el.innerHTML = html; };
}

if (typeof globalThis !== 'undefined' && !globalThis.safeStorage) {
  globalThis.safeStorage = (typeof window !== 'undefined' && window.safeStorage) || (typeof PokeWorldCore !== 'undefined' && PokeWorldCore.storage) || null;
}
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
 // Wave 27: default to 'fr' when no save (G.lang) is loaded yet. The static
 // markup (index.html) is written in French — defaulting t() to 'en' painted
 // boot screens (save menu, starter modal, team toolbar) in English while
 // the surrounding UI stayed French, a mixed-language mess for new players.
 // An explicit language choice (settings -> G.lang) always wins.
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
          _pwSetHtmlSafe(el, text);
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

// Species outside dex 1-251 (phase 14: Johto fossils -> canonical targets).
// The name tables stay at 252 entries (Kanto/Johto dex); these two live
// in a sparse override so dex loops are not disturbed.
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
 // Wave 32: the target language pack may still be streaming in the
 // background — make sure its fragments are merged right away.
 try{
   if(typeof window !== 'undefined' && typeof window.__pwEnsureLanguage === 'function') {
     window.__pwEnsureLanguage(lang).then(() => {
       try{ const sms = document.getElementById('save-menu-screen'); if(sms && sms.classList.contains('is-open') && typeof renderSaveMenu === 'function') renderSaveMenu(); }catch(_){}
     }).catch(() => {});
   }
 }catch(_){}
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
 // Settings modal body is DS-rendered with t() at open time: re-render it
 // live if it is open, so its labels switch language immediately.
 try{ const sm = document.getElementById('settings-modal'); if(sm && sm.classList.contains('open') && typeof openSettings === 'function') openSettings(); }catch(_){}
 // Same for the save-game main menu face (SaveMenuView, wave 5).
 try{ const sms = document.getElementById('save-menu-screen'); if(sms && sms.classList.contains('is-open') && typeof renderSaveMenu === 'function') renderSaveMenu(); }catch(_){}
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
// Passe 38: the base_npc "champion" is a secret-base pal — its name is
// dynamic (carried by the ongoing battle), not a dictionary key.
function getChampName(id){
 if(id==='base_npc' && typeof battle!=='undefined' && battle && battle.baseNpcName) return battle.baseNpcName;
 return getChampionName(id);
}
function getChampTitle(id){return (typeof t==='function') ? (t('champions.'+id+'.title') || '') : '';}
function getChampBadgeName(id){return (typeof t==='function') ? (t('champions.'+id+'.badgeName') || '') : '';}

// FIX (2026-08): long-spelling aliases expected by the guarded export below
// (getChampionTitle / getChampionBadgeName without the short "Champ" form).
export const getChampionTitle = getChampTitle;
export const getChampionBadgeName = getChampBadgeName;

// FIX (2026-08): canonical accessor for NPC dialogs (L_fr_npc / L_en_npc
// were loaded but never consumed — the function no longer existed).
// getNpcDialog(locId) -> [{name, lines:[...]}] in the current language.
function getNpcDialog(locId){
 const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : ((typeof window !== 'undefined' && window.L && window.L.lang) || 'fr');
 const dict = (lang === 'en')
   ? ((typeof window !== 'undefined' && window.L_en_npc) || (typeof L_en_npc !== 'undefined' ? L_en_npc : null))
   : ((typeof window !== 'undefined' && window.L_fr_npc) || (typeof L_fr_npc !== 'undefined' ? L_fr_npc : null));
 const list = (dict && dict[locId]) ? dict[locId] : [];
 return Array.isArray(list) ? list : [];
}

// Expose key functions globally
if (typeof getPokeName !== 'undefined') { if (typeof window !== 'undefined') window.getPokeName = getPokeName; if (typeof globalThis !== 'undefined') globalThis.getPokeName = getPokeName; }
if (typeof getNpcDialog !== 'undefined') { if (typeof window !== 'undefined') window.getNpcDialog = getNpcDialog; if (typeof globalThis !== 'undefined') globalThis.getNpcDialog = getNpcDialog; }
if (typeof getQuestText !== 'undefined') { if (typeof window !== 'undefined') window.getQuestText = getQuestText; if (typeof globalThis !== 'undefined') globalThis.getQuestText = getQuestText; }
if (typeof getChampName !== 'undefined') { if (typeof window !== 'undefined') window.getChampName = getChampName; if (typeof globalThis !== 'undefined') globalThis.getChampName = getChampName; }
if (typeof getChampTitle !== 'undefined') { if (typeof window !== 'undefined') window.getChampTitle = getChampTitle; if (typeof globalThis !== 'undefined') globalThis.getChampTitle = getChampTitle; }
if (typeof getChampBadgeName !== 'undefined') { if (typeof window !== 'undefined') window.getChampBadgeName = getChampBadgeName; if (typeof globalThis !== 'undefined') globalThis.getChampBadgeName = getChampBadgeName; }
if (typeof getChampionName !== 'undefined') { if (typeof window !== 'undefined') window.getChampionName = getChampionName; if (typeof globalThis !== 'undefined') globalThis.getChampionName = getChampionName; }
if (typeof getChampionTitle !== 'undefined') { if (typeof window !== 'undefined') window.getChampionTitle = getChampionTitle; if (typeof globalThis !== 'undefined') globalThis.getChampionTitle = getChampionTitle; }
if (typeof getChampionBadgeName !== 'undefined') { if (typeof window !== 'undefined') window.getChampionBadgeName = getChampionBadgeName; if (typeof globalThis !== 'undefined') globalThis.getChampionBadgeName = getChampionBadgeName; }





// --- Exported globals ---
if (typeof currentLang !== 'undefined') { if (typeof window !== 'undefined') window.currentLang = currentLang; if (typeof globalThis !== 'undefined') globalThis.currentLang = currentLang; }
if (typeof getLocName !== 'undefined') { if (typeof window !== 'undefined') window.getLocName = getLocName; if (typeof globalThis !== 'undefined') globalThis.getLocName = getLocName; }
if (typeof getLore !== 'undefined') { if (typeof window !== 'undefined') window.getLore = getLore; if (typeof globalThis !== 'undefined') globalThis.getLore = getLore; }
if (typeof getMoveName !== 'undefined') { if (typeof window !== 'undefined') window.getMoveName = getMoveName; if (typeof globalThis !== 'undefined') globalThis.getMoveName = getMoveName; }
if (typeof getNpc !== 'undefined') { if (typeof window !== 'undefined') window.getNpc = getNpc; if (typeof globalThis !== 'undefined') globalThis.getNpc = getNpc; }
if (typeof setLanguage !== 'undefined') { if (typeof window !== 'undefined') window.setLanguage = setLanguage; if (typeof globalThis !== 'undefined') globalThis.setLanguage = setLanguage; }
if (typeof syncAllNames !== 'undefined') { if (typeof window !== 'undefined') window.syncAllNames = syncAllNames; if (typeof globalThis !== 'undefined') globalThis.syncAllNames = syncAllNames; }
if (typeof t !== 'undefined') { if (typeof window !== 'undefined') window.t = t; if (typeof globalThis !== 'undefined') globalThis.t = t; }
if (typeof titleCaseDisplayName !== 'undefined') { if (typeof window !== 'undefined') window.titleCaseDisplayName = titleCaseDisplayName; if (typeof globalThis !== 'undefined') globalThis.titleCaseDisplayName = titleCaseDisplayName; }
if (typeof tr !== 'undefined') { if (typeof window !== 'undefined') window.tr = tr; if (typeof globalThis !== 'undefined') globalThis.tr = tr; }
if (typeof updateI18nLabels !== 'undefined') { if (typeof window !== 'undefined') window.updateI18nLabels = updateI18nLabels; if (typeof globalThis !== 'undefined') globalThis.updateI18nLabels = updateI18nLabels; }

// Vague 41 — module ESM natif : export des mêmes noms que la surface
// classique gardée ci-dessus (corps inchangé).
export {
  getPokeName,
  getNpcDialog,
  getQuestText,
  getChampName,
  getChampTitle,
  getChampBadgeName,
  getChampionName,
  currentLang,
  getLocName,
  getLore,
  getMoveName,
  getNpc,
  setLanguage,
  syncAllNames,
  t,
  titleCaseDisplayName,
  tr,
  updateI18nLabels,
};

// Vague 42 — absorption registre moteur : ces actions dispatchées
// s'enregistrent dans le registre (dispatcher registry-first = indirection
// moteur au lieu du fallback window) ; la surface window est conservée pour
// les consommateurs classiques inter-modules (doublon documenté, T2-B).
if (typeof PokeActions !== 'undefined' && PokeActions) { try { PokeActions.register('setLanguage', setLanguage); } catch (_) {} }
