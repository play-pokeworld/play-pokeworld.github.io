// ============================================================
// SAVE SYSTEM — Inspiré de PokéChill (simple et robuste)
// ============================================================

const SAVE_KEY = 'pokeworld_save';
const SAVE_VERSION = 2;

// Sauvegarde complète de l'état du jeu
function saveGame(manual = false) {
  try {
    // Créer un objet sérialisable avec TOUT l'état
    const saveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      G: JSON.parse(JSON.stringify(G)) // Deep clone pour éviter les références
    };
    
    const json = JSON.stringify(saveData);
    
    // Vérifier que la sauvegarde n'est pas trop volumineuse
    if (json.length > 5 * 1024 * 1024) { // 5MB
      console.error('[SAVE] Save too large:', json.length, 'bytes');
      if (manual) notify("Erreur: sauvegarde trop volumineuse", "var(--red)");
      return false;
    }
    
    // Sauvegarder dans localStorage
    localStorage.setItem(SAVE_KEY, json);
    
    if (manual) {
      const collectionCount = Object.keys(G.collection || {}).length;
      const teamCount = G.team ? G.team.length : 0;
      console.log(`[SAVE] ✅ Saved successfully: ${teamCount} team, ${collectionCount} box`);
      notify(t("n.partie_sauvegardée") || "Partie sauvegardée !");
    }
    
    return true;
  } catch (e) {
    console.error('[SAVE ERROR]', e);
    if (manual) {
      notify("Erreur lors de la sauvegarde: " + e.message, "var(--red)");
    }
    return false;
  }
}

// Chargement de la sauvegarde
function loadGame(manual = false) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    
    if (!raw) {
      if (manual) notify("Aucune sauvegarde trouvée", "var(--light1)");
      return false;
    }
    
    console.log('[LOAD] Raw save size:', raw.length, 'bytes');
    
    const saveData = JSON.parse(raw);
    
    // Vérifier la version
    if (saveData.version < SAVE_VERSION) {
      console.warn('[LOAD] Old save version:', saveData.version, '-> migrating to', SAVE_VERSION);
      // Migration si nécessaire
    }
    
    // Restaurer l'état complet
    G = saveData.G;
    
    // Vérifier que G est bien restauré
    if (!G) {
      console.error('[LOAD] G is null after load!');
      return false;
    }
    
    // Initialiser les structures manquantes (pour compatibilité)
    if (!G.collection) G.collection = {};
    if (!G.team) G.team = [];
    if (!G.inventory) G.inventory = {};
    if (!G.pokedex) G.pokedex = {};
    if (!G.unlockedTalents) G.unlockedTalents = {};
    if (!G.mainStep) G.mainStep = { kanto: 0, johto: 0 };
    if (!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
    
    // Logs de debug
    const collectionCount = Object.keys(G.collection).length;
    const teamCount = G.team.length;
    console.log(`[LOAD] ✅ Loaded successfully: ${teamCount} team, ${collectionCount} box`);
    console.log('[LOAD] Collection keys:', Object.keys(G.collection).slice(0, 5));
    
    // Sauvegarder immédiatement pour consolider
    saveGame(false);
    
    if (manual) {
      notify("Partie chargée !", "var(--green)");
    }
    
    return true;
  } catch (e) {
    console.error('[LOAD ERROR]', e);
    if (manual) {
      notify("Erreur lors du chargement: " + e.message, "var(--red)");
    }
    return false;
  }
}

// Autosave silencieux
function autoSave() {
  try {
    saveGame(false);
  } catch (e) {
    console.error('[AUTOSAVE ERROR]', e);
  }
}

// Export de sauvegarde (pour backup)
function exportSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      notify("Aucune sauvegarde à exporter", "var(--red)");
      return;
    }
    
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokeworld_save_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    notify("Sauvegarde exportée !", "var(--green)");
  } catch (e) {
    console.error('[EXPORT ERROR]', e);
    notify("Erreur lors de l'export", "var(--red)");
  }
}

// Import de sauvegarde (depuis fichier)
function importSave(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = e.target.result;
      const saveData = JSON.parse(json);
      
      // Vérifier que c'est une sauvegarde valide
      if (!saveData.G || !saveData.version) {
        notify("Fichier de sauvegarde invalide", "var(--red)");
        return;
      }
      
      // Sauvegarder l'actuelle au cas où
      const currentSave = localStorage.getItem(SAVE_KEY);
      
      // Charger la nouvelle sauvegarde
      localStorage.setItem(SAVE_KEY, json);
      
      // Recharger le jeu
      if (loadGame(false)) {
        notify("Sauvegarde importée ! Rechargement...", "var(--green)");
        setTimeout(() => location.reload(), 1000);
      } else {
        // Restaurer l'ancienne si échec
        if (currentSave) {
          localStorage.setItem(SAVE_KEY, currentSave);
        }
        notify("Erreur lors de l'import", "var(--red)");
      }
    } catch (err) {
      console.error('[IMPORT ERROR]', err);
      notify("Erreur lors de l'import: " + err.message, "var(--red)");
    }
  };
  reader.readAsText(file);
}

// Suppression de sauvegarde
function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    notify("Sauvegarde supprimée", "var(--green)");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    console.error('[DELETE ERROR]', e);
    notify("Erreur lors de la suppression", "var(--red)");
  }
}

// Autosave périodique (toutes les 30 secondes)
setInterval(() => {
  autoSave();
}, 30000);

// ============================================================
// FONCTIONS DE GESTION DE SAUVEGARDE (pour les boutons UI)
// ============================================================

function confirmDelete() {
  // Cache le bouton supprimer, affiche les boutons confirmer/annuler
  const deleteRow = document.getElementById('delete-row');
  const confirmRow = document.getElementById('delete-confirm-row');
  if (deleteRow) deleteRow.style.display = 'none';
  if (confirmRow) confirmRow.style.display = 'flex';
}

function cancelDelete() {
  // Cache les boutons confirmer/annuler, réaffiche le bouton supprimer
  const deleteRow = document.getElementById('delete-row');
  const confirmRow = document.getElementById('delete-confirm-row');
  if (deleteRow) deleteRow.style.display = 'flex';
  if (confirmRow) confirmRow.style.display = 'none';
}

function doDelete() {
  deleteSave();
}

function resetGame() {
  confirmDelete();
}
