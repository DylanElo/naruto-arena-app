# Bolt's Journal ⚡

## 2025-12-15 - Initial Setup
**Learning:** Performance optimization requires a baseline.
**Action:** Always check for existing `useMemo` and `useCallback` usage before assuming code is unoptimized. In `CollectionManager.jsx`, heavy filtering was running on every render.

## 2025-05-20 - Set vs Array for Collections
**Learning:** Passing converted Arrays (`Array.from(set)`) as props breaks `useMemo` optimizations in child components because the reference changes on every render.
**Action:** Pass `Set` objects directly to components when possible. Implement components to handle both `Set` (O(1) lookup) and `Array` (O(N) lookup) to maintain flexibility while enabling performance gains.

## 2025-10-26 - Gating Expensive Logic by Tab
**Learning:** In a single-component SPA structure (`App.jsx`), global state changes (like `ownedCharacters`) trigger re-renders of all memoized values, even those used only in hidden tabs.
**Action:** Gate expensive `useMemo` calculations with `if (activeTab !== 'targetTab') return default` to prevent background processing when interacting with other parts of the UI.
