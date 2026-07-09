

// BATTLE STATE

// ============================================================
// SHINY / COLLECTION (box) HELPERS
// One copy MAX per espèce (équipe + boîte confondues).
// Shiny n'est plus une entité distincte : c'est un skin cosmétique débloqué
// par instance (shinyUnlocked). shinyActive = skin actif.
// ============================================================

// Une espèce est déjà possédée si présente en équipe ou en boîte

// Indicateur de complétion "façon PokéClicker" : combien d'espèces sauvages
// différentes d'un lieu sont déjà possédées (équipe ou boîte) sur le total.

// ============================================================
// HELD ITEMS & BUFFS
// ============================================================

// Effet effectif = (count / 25) × maxMultiplier

function getRoamingLegendaryForRoute(locId){
  if(typeof G === 'undefined' || !G) return null;
  const nowWindow = Math.floor(Date.now() / (12 * 3600 * 1000));
  if(!G.roamingWindow || G.roamingWindow !== nowWindow || !G.roamingPool){
    G.roamingWindow = nowWindow;
    // --- Kanto : oiseaux légendaires (Artikodin / Électhor / Sulfura) ---
    const kantoOutdoor = ['route1','route22','route2','route3','route4','route24','route25','route5','route6','route11','route9','route10','route8','route7','route16','route17','route18','route15','route14','route13','route12','route19','route20','route21','route23'];
    // --- Johto : Bêtes Légendaires (Raikou / Entei / Suicune) — roaming ---
    const johtoOutdoor = ['jroute29','jroute30','jroute31','jroute32','jroute33','jroute34','jroute35','jroute36','jroute37','jroute38','jroute39','jroute42','jroute43','jroute44','jroute45','jroute46','jroute47','jroute48','nationalpark','jroute26','jroute27','jroute28'];
    let kIdx = nowWindow % kantoOutdoor.length;
    let jIdx = (nowWindow + 5) % johtoOutdoor.length;
    G.roamingPool = {
      [kantoOutdoor[(kIdx) % kantoOutdoor.length]]: 144,
      [kantoOutdoor[(kIdx+7) % kantoOutdoor.length]]: 145,
      [kantoOutdoor[(kIdx+13) % kantoOutdoor.length]]: 146,
      [johtoOutdoor[(jIdx) % johtoOutdoor.length]]: 243,
      [johtoOutdoor[(jIdx+7) % johtoOutdoor.length]]: 244,
      [johtoOutdoor[(jIdx+13) % johtoOutdoor.length]]: 245
    };
  }
  return G.roamingPool[locId] || null;
}

// ============================================================
// ENGINE UTILITIES
// ============================================================

// ============================================================================
// PART 3: VISUALS, UI RENDERING & DOM EVENT HANDLING
// Can be separated into ui.js. Contains notifications, DOM updates, map drawing,
// window management, modal dialogs, and user input handlers.
// ============================================================================

// Le cadre de texte visible pendant les combats a été retiré : les événements
// sont maintenant conservés en mémoire et consultables via le menu "📋 Butin"
// (bouton en bas de l'écran de combat), affiché aussi automatiquement en fin
// de session.

function updateHeader(){
  document.getElementById('h-money').textContent=G.money.toLocaleString();
  document.getElementById('h-badges').textContent=G.badges.length;
  try{ renderTeamWindow(); }catch(_){}
  try{ renderStoryWindow(); }catch(_){}
  try{ renderHatcheryWindow(); }catch(_){}
  try{ renderTrainingWindow(); }catch(_){}
  try{ renderAutomationWindow(); }catch(_){}
}

// ============================================================
// MAP RENDER
// ============================================================
