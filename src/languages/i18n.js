// ============================================================
// I18N HELPERS  (translate + names)
// Depends (globals): I18N, POKE_NAMES_FR, MOVES, MOVE_NAMES_EN, PD, G
// ============================================================
function t(key){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  return I18N[lang]?.[key] || I18N['fr'][key] || key;
}
function getPokeName(id){
  const nid = Number(id);
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  if(lang === 'en') return PD[nid] ? PD[nid][0] : `#${nid}`;
  return POKE_NAMES_FR[nid] || (PD[nid] ? PD[nid][0] : `#${nid}`);
}
function getMoveName(id){
  const lang = (typeof G !== 'undefined' && G && G.lang) ? G.lang : 'fr';
  const mv = MOVES[id];
  if(!mv) return id;
  if(lang === 'en' && MOVE_NAMES_EN[id]) return MOVE_NAMES_EN[id];
  return mv.name || id;
}
function setLanguage(lang){
  if(!G) G = {};
  G.lang = lang;
  try{ safeStorage.set('pokeworld_lang', lang); }catch(_){}
  document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  syncAllNames();
  updateI18nLabels();
  updateHeader();
  renderTeamWindow();
  try{ renderHatcheryWindow(); }catch(_){}
  try{ renderMap(); }catch(_){}
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
  notify(lang === 'en' ? '🇬🇧 Language switched to English!' : '🇫🇷 Langue changée en Français !');
}
