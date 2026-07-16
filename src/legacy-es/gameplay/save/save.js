const SAVE_KEY = 'pokeworld_save';
const SAVE_VERSION = 3;

function isCompatibleSaveData(saveData) {
  return !!saveData
    && saveData.version === SAVE_VERSION
    && !!saveData.G
    && typeof saveData.G === 'object'
    && Array.isArray(saveData.G.team)
    && !!saveData.G.collection
    && typeof saveData.G.collection === 'object'
    && !!saveData.G.inventory
    && typeof saveData.G.inventory === 'object';
}

function deleteIncompatibleSave(reason) {
  try {
    localStorage.removeItem(SAVE_KEY);
    console.warn('[SAVE] Incompatible browser save removed automatically:', reason || 'unknown reason');
    return true;
  } catch (e) {
    console.error('[SAVE] Unable to remove incompatible save:', e);
    return false;
  }
}


function saveGame(manual = false) {
  try {
    
    const saveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      G: JSON.parse(JSON.stringify(G)) 
    };
    
    const json = JSON.stringify(saveData);
    
    
    if (json.length > 5 * 1024 * 1024) { 
      console.error('[SAVE] Save too large:', json.length, 'bytes');
      if (manual) notify("Erreur: sauvegarde trop volumineuse", "var(--red)");
      return false;
    }
    
    
    localStorage.setItem(SAVE_KEY, json);
    
    if (manual) {
      const collectionCount = Object.keys(G.collection || {}).length;
      const teamCount = G.team ? G.team.length : 0;
      console.log(`[SAVE] ✅ Saved successfully: ${teamCount} team, ${collectionCount} box`);
      notify(t("legacy_message_n_partie_sauvegard_e"));
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


function loadGame(manual = false) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    
    if (!raw) {
      if (manual) notify(t('no_save_found'), "var(--light1)");
      return false;
    }
    
    console.log('[LOAD] Raw save size:', raw.length, 'bytes');
    
    const saveData = JSON.parse(raw);
    
    
    if (!isCompatibleSaveData(saveData)) {
      deleteIncompatibleSave('version=' + (saveData && saveData.version));
      if (manual) notify(t('save_incompatible_deleted') || 'Incompatible save removed automatically.', 'var(--red)');
      return false;
    }
    
    
    G = saveData.G;
    if (typeof window !== 'undefined') window.G = G;
    if (typeof globalThis !== 'undefined') globalThis.G = G;
    
    
    if (!G) {
      console.error('[LOAD] G is null after load!');
      return false;
    }
    
    
    if (!G.collection) G.collection = {};
    if (!G.team) G.team = [];
    if (!G.inventory) G.inventory = {};
    if (!G.pokedex) G.pokedex = {};
    if (!G.unlockedTalents) G.unlockedTalents = {};
    if (!G.mainStep) G.mainStep = { kanto: 0, johto: 0 };
    if (!G.automation) G.automation = { autoHatch: false, autoSeedHatchery: false, autoExplore: false };
    if (typeof applyOfficialPokemonDataToSave === 'function') applyOfficialPokemonDataToSave();
    
    
    const collectionCount = Object.keys(G.collection).length;
    const teamCount = G.team.length;
    console.log(`[LOAD] ✅ Loaded successfully: ${teamCount} team, ${collectionCount} box`);
    console.log('[LOAD] Collection keys:', Object.keys(G.collection).slice(0, 5));
    
    
    saveGame(false);
    
    if (manual) {
      notify(t('game_loaded'), "var(--green)");
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


function autoSave() {
  try {
    saveGame(false);
  } catch (e) {
    console.error('[AUTOSAVE ERROR]', e);
  }
}


function exportSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      notify(t('no_save_to_export'), "var(--red)");
      return;
    }
    
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pokeworld_save_${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    notify(t('save_exported'), "var(--green)");
  } catch (e) {
    console.error('[EXPORT ERROR]', e);
    notify("Erreur lors de l'export", "var(--red)");
  }
}


function importSave(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const json = e.target.result;
      const saveData = JSON.parse(json);
      
      
      if (!isCompatibleSaveData(saveData)) {
        notify(t('save_incompatible_deleted') || "Fichier de sauvegarde incompatible", "var(--red)");
        return;
      }
      
      
      const currentSave = localStorage.getItem(SAVE_KEY);
      
      
      localStorage.setItem(SAVE_KEY, json);
      
      
      if (loadGame(false)) {
        notify(t('save_imported_reload'), "var(--green)");
        setTimeout(() => location.reload(), 1000);
      } else {
        
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


function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    notify(t('save_deleted'), "var(--green)");
    setTimeout(() => location.reload(), 1000);
  } catch (e) {
    console.error('[DELETE ERROR]', e);
    notify("Erreur lors de la suppression", "var(--red)");
  }
}


setInterval(() => {
  autoSave();
}, 30000);


function confirmDelete() {
  
  const deleteRow = document.getElementById('delete-row');
  const confirmRow = document.getElementById('delete-confirm-row');
  if (deleteRow) deleteRow.style.display = 'none';
  if (confirmRow) confirmRow.style.display = 'flex';
}

function cancelDelete() {
  
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


// --- Migrated to ES module, globals exposed ---
if (typeof isCompatibleSaveData !== 'undefined' && typeof window !== 'undefined') window.isCompatibleSaveData = isCompatibleSaveData;
if (typeof deleteIncompatibleSave !== 'undefined' && typeof window !== 'undefined') window.deleteIncompatibleSave = deleteIncompatibleSave;
if (typeof saveGame !== 'undefined' && typeof window !== 'undefined') window.saveGame = saveGame;
if (typeof loadGame !== 'undefined' && typeof window !== 'undefined') window.loadGame = loadGame;
if (typeof autoSave !== 'undefined' && typeof window !== 'undefined') window.autoSave = autoSave;
if (typeof exportSave !== 'undefined' && typeof window !== 'undefined') window.exportSave = exportSave;
if (typeof importSave !== 'undefined' && typeof window !== 'undefined') window.importSave = importSave;
if (typeof deleteSave !== 'undefined' && typeof window !== 'undefined') window.deleteSave = deleteSave;
if (typeof confirmDelete !== 'undefined' && typeof window !== 'undefined') window.confirmDelete = confirmDelete;
if (typeof cancelDelete !== 'undefined' && typeof window !== 'undefined') window.cancelDelete = cancelDelete;
if (typeof doDelete !== 'undefined' && typeof window !== 'undefined') window.doDelete = doDelete;
if (typeof resetGame !== 'undefined' && typeof window !== 'undefined') window.resetGame = resetGame;

export {};
