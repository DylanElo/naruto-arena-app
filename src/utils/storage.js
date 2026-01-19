/**
 * Safe wrapper for localStorage to prevent crashes from corrupted data
 * and handle serialization errors securely.
 */

export const safeGet = (key, fallback = null) => {
    try {
        const item = localStorage.getItem(key);
        // JSON.parse(null) returns null, so we check existence first
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return fallback;
    }
};

export const safeSet = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error(`Error saving to localStorage key "${key}":`, e);
        return false;
    }
};

export const safeRemove = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.error(`Error removing localStorage key "${key}":`, e);
    }
};
