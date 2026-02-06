# Bolt's Journal ⚡

## 2025-12-15 - Initial Setup
**Learning:** Performance optimization requires a baseline.
**Action:** Always check for existing `useMemo` and `useCallback` usage before assuming code is unoptimized. In `CollectionManager.jsx`, heavy filtering was running on every render.

## 2025-05-20 - Set vs Array for Collections
**Learning:** Passing converted Arrays (`Array.from(set)`) as props breaks `useMemo` optimizations in child components because the reference changes on every render.
**Action:** Pass `Set` objects directly to components when possible. Implement components to handle both `Set` (O(1) lookup) and `Array` (O(N) lookup) to maintain flexibility while enabling performance gains.

## 2025-05-21 - Pre-computation for Search
**Learning:** In React apps filtering large datasets (~1000+ items) in the render loop (O(N*M) where M is string length) causes measurable input lag. The `characters.json` file is static, yet we were re-calculating `toLowerCase()` for every character on every keystroke.
**Action:** Pre-compute derived search fields (e.g., `_searchName`, `_searchTags`) once using `useMemo` when loading static data. Hoist invariant transformations (like `search.toLowerCase()`) outside the filter loop.
