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

## 2025-05-22 - Input Limits & DoS Prevention
**Vulnerability:** Unbounded text inputs in Search and Team Name fields can lead to UI rendering issues or Client-Side Denial of Service (DoS) if users paste massive strings.
**Learning:** While React escapes XSS, large strings can still freeze the browser or break layouts.
**Prevention:** Always enforce `maxLength` attributes on user inputs. For this app, 50 chars for search and 30 for names is sufficient.

## 2025-05-22 - Implicit React Imports
**Vulnerability:** Using `React.hookName` (e.g., `React.useCallback`) without importing `React` fails in some build/test environments (like Vitest) even if it works in others.
**Learning:** Always import hooks directly (`import { useCallback } from 'react'`) or import React explicitly. Don't rely on global `React`.
