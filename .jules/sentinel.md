# Sentinel's Journal 🛡️

## 2025-12-15 - Content Security Policy
**Learning:** Single Page Apps (SPAs) are vulnerable to XSS if an attacker can inject script tags. A strict CSP is the first line of defense.
**Action:** Adding a logical CSP to `index.html` helps prevent unauthorized script execution.
**Policy:** `default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;`
*Note: 'unsafe-inline' is often needed for Vite/React dev mode and some styled-components, but we restrict sources as much as possible.*

## 2025-12-15 - Secure Local Storage
**Vulnerability:** Unchecked `JSON.parse()` on `localStorage` data caused application crashes when data was malformed (Client-side DoS).
**Learning:** Never trust data from storage to be valid JSON.
**Prevention:** Created `src/utils/storage.js` with `safeGet`/`safeSet` wrappers. All storage access must use this utility to ensure robustness.
