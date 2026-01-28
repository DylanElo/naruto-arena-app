# Palette's Journal 🎨

## 2025-12-15 - Accessibility First
**Learning:** Icon-only buttons (like color dots) are invisible to screen readers without labels.
**Action:** Always verify `aria-label` on graphic controls. In `App.jsx`, energy filters were just `<div>`s inside buttons without text descriptions.

## 2025-05-21 - Semantic Lists
**Learning:** Interactive lists (like character selectors) often use `div`s which exclude keyboard users.
**Action:** Convert these to `<button>` elements with `w-full text-left` to maintain layout while adding full accessibility (focus, enter/space keys) and semantics.
