# Bolt's Journal ⚡

## 2025-12-15 - Initial Setup
**Learning:** Performance optimization requires a baseline.
**Action:** Always check for existing `useMemo` and `useCallback` usage before assuming code is unoptimized. In `CollectionManager.jsx`, heavy filtering was running on every render.
