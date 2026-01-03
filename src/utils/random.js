/**
 * Cryptographically secure random number generation utilities.
 * Replaces Math.random() for security-sensitive or fairness-critical operations.
 */

/**
 * Returns a cryptographically secure random integer between min (inclusive) and max (exclusive).
 * @param {number} min - The minimum value (inclusive).
 * @param {number} max - The maximum value (exclusive).
 * @returns {number} The random integer.
 */
export function getSecureRandomInt(min, max) {
    if (min >= max) {
        throw new Error('min must be less than max');
    }
    const range = max - min;
    const maxSafeInteger = Number.MAX_SAFE_INTEGER;

    if (range > maxSafeInteger) {
         throw new Error('Range too large for safe integer generation');
    }

    // Use 32-bit unsigned integers for generation
    const array = new Uint32Array(1);
    const maxUint32 = 0xFFFFFFFF;

    // Rejection sampling to avoid modulo bias
    // We want a number in [0, range-1]
    // The largest multiple of range <= maxUint32
    const limit = maxUint32 - (maxUint32 % range);

    let sample;
    do {
        crypto.getRandomValues(array);
        sample = array[0];
    } while (sample >= limit);

    return min + (sample % range);
}

/**
 * Returns a random element from an array using cryptographically secure RNG.
 * @param {Array} array - The array to select from.
 * @returns {*} The selected element.
 */
export function getSecureRandomElement(array) {
    if (!array || array.length === 0) {
        return undefined;
    }
    const index = getSecureRandomInt(0, array.length);
    return array[index];
}
