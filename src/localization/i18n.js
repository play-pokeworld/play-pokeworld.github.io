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
function getPokeName(id){
 const nid = Number(id);
 const lang = currentLang();
 if(lang === 'en') return (PD && PD[nid]) ? PD[nid][0] : ('#'+nid);
 return (POKE_NAMES_FR && POKE_NAMES_FR[nid]) || ((PD && PD[nid]) ? PD[nid][0] : ('#'+nid));
}

function getMoveName(id){
 const lang = currentLang();
 const mv = MOVES ? MOVES[id] : null;
 if(!mv) return id;
 if(lang === 'en' && MOVE_NAMES_EN && MOVE_NAMES_EN[id]) return MOVE_NAMES_EN[id];
 return mv.name || id;
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
 try{safeStorage.set('pokeworld_lang', lang);}catch(_){}
 document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
 syncAllNames();
 updateI18nLabels();
 updateHeader();
 renderTeamWindow();
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
 if(battle && battle.active) updateBattleUI();
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
function getChampionTitle(id){return (typeof t==='function') ? (t('champions.'+id+'.title') || '') : '';}
function getChampionBadgeName(id){return (typeof t==='function') ? (t('champions.'+id+'.badgeName') || '') : '';}

