const SAVE_KEY = 'pokeworld_save';
const CURRENT_SAVE_VERSION = 3;

export function validateBrowserSave() {
  try {
    const raw = window.localStorage?.getItem(SAVE_KEY);
    if (!raw) return { ok: true, deleted: false, reason: 'empty' };

    const data = JSON.parse(raw);
    const compatible = !!data
      && data.version === CURRENT_SAVE_VERSION
      && !!data.G
      && typeof data.G === 'object'
      && Array.isArray(data.G.team)
      && !!data.G.collection
      && typeof data.G.collection === 'object'
      && !!data.G.inventory
      && typeof data.G.inventory === 'object';

    if (compatible) return { ok: true, deleted: false, reason: 'compatible' };

    window.localStorage.removeItem(SAVE_KEY);
    console.warn('[PokeWorld] Incompatible browser save removed automatically.');
    return { ok: false, deleted: true, reason: 'incompatible-schema-or-version' };
  } catch (error) {
    try { window.localStorage?.removeItem(SAVE_KEY); } catch (_) {}
    console.warn('[PokeWorld] Corrupted browser save removed automatically.', error);
    return { ok: false, deleted: true, reason: 'corrupted-json' };
  }
}

