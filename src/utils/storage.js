/**
 * Safe local storage wrapper to handle errors and parsing.
 * Prevents application crashes due to malformed JSON or storage errors.
 */

/**
 * Safely retrieves and parses a value from localStorage.
 * @param {string} key - The storage key.
 * @param {*} fallback - The value to return if the key doesn't exist or parsing fails.
 * @returns {*} The parsed value or the fallback.
 */
export const safeGet = (key, fallback = null) => {
    try {
        const item = localStorage.getItem(key);
        if (item === null) return fallback;
        return JSON.parse(item);
    } catch (error) {
        console.warn(`[Sentinel] Error reading ${key} from localStorage:`, error);
        return fallback;
    }
};

/**
 * Safely stringifies and saves a value to localStorage.
 * @param {string} key - The storage key.
 * @param {*} value - The value to store.
 */
export const safeSet = (key, value) => {
    try {
        const stringified = JSON.stringify(value);
        localStorage.setItem(key, stringified);
    } catch (error) {
        console.warn(`[Sentinel] Error writing ${key} to localStorage:`, error);
    }
};
