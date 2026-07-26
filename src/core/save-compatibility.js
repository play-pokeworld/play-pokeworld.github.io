const DEFAULT_SAVE_KEY = 'pokeworld_save';

function isCompatibleSave(save) {
  return !!(
    save &&
    typeof save === 'object' &&
    Number(save.version || 0) >= 3 &&
    save.G &&
    typeof save.G === 'object' &&
    Array.isArray(save.G.team) &&
    save.G.collection &&
    typeof save.G.collection === 'object' &&
    save.G.inventory &&
    typeof save.G.inventory === 'object'
  );
}

export function validateBrowserSave({ key = DEFAULT_SAVE_KEY, storage } = {}) {
  const store = storage || globalThis.window?.localStorage;
  if (!store) return { ok: true, skipped: true };
  const raw = store.getItem(key);
  if (raw == null || raw === '') return { ok: true, empty: true };
  try {
    const save = JSON.parse(raw);
    if (isCompatibleSave(save)) return { ok: true };
    throw new Error('Incompatible PokéWorld save structure');
  } catch (error) {
    const recoveryKey = `${key}_recovery_${Date.now()}`;
    try { store.setItem(recoveryKey, raw); } catch (_) {}
    try { store.removeItem(key); } catch (_) {}
    return { ok: false, recovered: true, recoveryKey, error };
  }
}
