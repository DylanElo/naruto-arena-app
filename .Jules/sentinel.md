## 2026-02-06 - Unbounded Input Fields
**Vulnerability:** Input fields (`team-name-input`, search fields) lacked `maxLength` attributes, allowing unlimited text entry.
**Learning:** Persisted inputs (localStorage) without length limits pose a DoS risk via quota exhaustion or UI freezing. React's controlled inputs do not automatically limit length.
**Prevention:** Always enforce `maxLength` on user input fields, especially those persisted or used in expensive filters.
