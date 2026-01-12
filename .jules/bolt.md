# Bolt's Journal ⚡

## 2025-12-15 - Initial Setup
**Learning:** Performance optimization requires a baseline.
**Action:** Always check for existing `useMemo` and `useCallback` usage before assuming code is unoptimized. In `CollectionManager.jsx`, heavy filtering was running on every render.

## 2025-05-20 - Set vs Array for Collections
**Learning:** Passing converted Arrays (`Array.from(set)`) as props breaks `useMemo` optimizations in child components because the reference changes on every render.
**Action:** Pass `Set` objects directly to components when possible. Implement components to handle both `Set` (O(1) lookup) and `Array` (O(N) lookup) to maintain flexibility while enabling performance gains.

## 2025-05-23 - Unrolling Fixed-Shape Object Copies
**Learning:** In hot code paths like simulation loops, iterating over object keys (`for..in`) is significantly slower than direct property assignment, even for small objects. The `delete` operator is also a deoptimization killer in V8.
**Action:** When an object has a stable shape (e.g. `statusEffects`), unroll the copy logic into explicit assignments and remove dynamic key deletion if the schema is guaranteed. This yielded a ~4x speedup in the simulation loop.
