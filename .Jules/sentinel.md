# Sentinel's Journal

## 2024-05-24 - Input Length Limits (DoS Prevention)
**Vulnerability:** Input fields for search and team names lacked `maxLength` attributes.
**Learning:** React inputs do not enforce character limits by default, and `type="text"` inputs allow practically infinite length strings, which can be used for DoS attacks or memory exhaustion if processed by the application (e.g., in filtering logic).
**Prevention:** Always add `maxLength` attributes to text inputs. Use schema validation (e.g., Zod) on the backend or submission handlers as a second layer of defense.
