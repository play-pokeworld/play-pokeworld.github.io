export const storage = {
  get(key) {
    try {
      return window.localStorage?.getItem(key) ?? null;
    } catch (_error) {
      return null;
    }
  },

  set(key, value) {
    try {
      window.localStorage?.setItem(key, value);
      return true;
    } catch (_error) {
      return false;
    }
  },

  remove(key) {
    try {
      window.localStorage?.removeItem(key);
      return true;
    } catch (_error) {
      return false;
    }
  },
};

