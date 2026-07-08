

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
    const outdoorRoutes = ['route1','route22','route2','route3','route4','route24','route25','route5','route6','route11','route9','route10','route8','route7','route16','route17','route18','route15','route14','route13','route12','route19','route20','route21','route23'];
    let idx = nowWindow % outdoorRoutes.length;
    G.roamingPool = {
      [outdoorRoutes[(idx) % outdoorRoutes.length]]: 144,
      [outdoorRoutes[(idx+7) % outdoorRoutes.length]]: 145,
      [outdoorRoutes[(idx+13) % outdoorRoutes.length]]: 146
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
