# Sentinel's Journal 🛡️

## 2025-12-15 - Content Security Policy
**Learning:** Single Page Apps (SPAs) are vulnerable to XSS if an attacker can inject script tags. A strict CSP is the first line of defense.
**Action:** Adding a logical CSP to `index.html` helps prevent unauthorized script execution.
**Policy:** `default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;`
*Note: 'unsafe-inline' is often needed for Vite/React dev mode and some styled-components, but we restrict sources as much as possible.*

## 2025-12-15 - CSP Refinement
**Learning:** Broad `img-src` policies (like `https:`) allow data exfiltration via image requests to arbitrary domains.
**Action:** Tightened `img-src` to only allow `self`, `data:`, and the specific placeholder service (`via.placeholder.com`) used by the app.
**Prevention:** Always whitelist specific domains for external resources instead of allowing wildcards.
