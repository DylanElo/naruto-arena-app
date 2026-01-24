# Palette's Journal 🎨

## 2025-12-15 - Accessibility First
**Learning:** Icon-only buttons (like color dots) are invisible to screen readers without labels.
**Action:** Always verify `aria-label` on graphic controls. In `App.jsx`, energy filters were just `<div>`s inside buttons without text descriptions.

## 2025-05-22 - Semantic Interaction
**Learning:** `CounterBuilder` used clickable `div`s for selection without `role` or keyboard support, unlike `App` which used accessible patterns.
**Action:** When auditing lists, prioritize converting interactive `div`s to native `<button>` elements over adding ARIA attributes to `div`s for better default accessibility.
