
/**
 * Safe wrapper for localStorage access to prevent crashes from
 * quota limits or malformed JSON data.
 */

const get = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage access failed for ${key}:`, e);
    return null;
  }
};

const safeGet = (key, fallback = null) => {
  try {
    const item = get(key);
    return item ? JSON.parse(item) : fallback;
  } catch (error) {
    console.warn(`Error parsing ${key} from localStorage:`, error);
    // If corrupted, remove it so the app can recover on next load
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return fallback;
  }
};

const safeSet = (key, value) => {
  try {
    const stringValue = JSON.stringify(value);
    localStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    console.warn(`Error saving ${key} to localStorage:`, error);
    return false;
  }
};

const safeRemove = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Error removing ${key} from localStorage:`, error);
  }
};

export { safeGet, safeSet, safeRemove };
