# Sentinel's Journal 🛡️

## 2025-12-15 - Content Security Policy
**Learning:** Single Page Apps (SPAs) are vulnerable to XSS if an attacker can inject script tags. A strict CSP is the first line of defense.
**Action:** Adding a logical CSP to `index.html` helps prevent unauthorized script execution.
**Policy:** `default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;`
*Note: 'unsafe-inline' is often needed for Vite/React dev mode and some styled-components, but we restrict sources as much as possible.*

## 2025-12-16 - Local Storage Robustness
**Vulnerability:** Client-side Denial of Service (DoS) caused by unhandled JSON parsing errors when `localStorage` data is malformed.
**Learning:** React state initializers that directly parse `localStorage` without error handling can cause the entire application to crash (white screen) if the data is corrupted, requiring manual user intervention (clearing cache) to fix.
**Prevention:** Always wrap `localStorage` access and `JSON.parse` in try-catch blocks with safe fallback values. Use a centralized storage utility (`safeGet`/`safeSet`) to enforce this pattern.

## 2025-10-18 - Unbounded Input Vectors
**Vulnerability:** Missing `maxLength` attributes on user inputs allowed potential DoS via massive string payloads.
**Learning:** Developers often forget client-side length constraints when relying purely on state management. React controls the state, but the browser still allows the user to paste massive strings if not restricted.
**Prevention:** Enforce `maxLength` on all text inputs via shared components or linting rules. Verify with automated tests checking for the attribute.
