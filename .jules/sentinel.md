# Sentinel's Journal 🛡️

## 2025-12-15 - Content Security Policy
**Learning:** Single Page Apps (SPAs) are vulnerable to XSS if an attacker can inject script tags. A strict CSP is the first line of defense.
**Action:** Adding a logical CSP to `index.html` helps prevent unauthorized script execution.
**Policy:** `default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;`
*Note: 'unsafe-inline' is often needed for Vite/React dev mode and some styled-components, but we restrict sources as much as possible.*

## 2026-01-14 - LocalStorage Deserialization Resilience
**Vulnerability:** `JSON.parse` called directly on `localStorage` data can cause React to crash if data is malformed.
**Learning:** Client-side storage is untrusted input. Users or extensions can modify it.
**Prevention:** Always wrap `JSON.parse(localStorage.getItem(...))` in `try-catch` blocks and provide safe fallbacks.
