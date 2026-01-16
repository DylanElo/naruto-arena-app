/**
 * Secure storage utilities to handle localStorage operations safely.
 * Prevents application crashes due to malformed JSON or storage quota errors.
 */

/**
 * Safely retrieves and parses a value from localStorage.
 * @param {string} key - The storage key.
 * @param {*} fallback - The value to return if retrieval fails or key is missing.
 * @returns {*} The parsed value or the fallback.
 */
export const safeGet = (key, fallback = null) => {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return fallback;
        return JSON.parse(item);
    } catch (error) {
        console.error(`Error reading ${key} from localStorage:`, error);
        return fallback;
    }
};

/**
 * Safely serializes and saves a value to localStorage.
 * @param {string} key - The storage key.
 * @param {*} value - The value to save.
 */
export const safeSet = (key, value) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
    }
};

/**
 * Safely removes an item from localStorage.
 * @param {string} key - The storage key.
 */
export const safeRemove = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Error removing ${key} from localStorage:`, error);
    }
};
