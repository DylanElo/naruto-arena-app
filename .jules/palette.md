# Palette's Journal 🎨

## 2025-12-15 - Accessibility First
**Learning:** Icon-only buttons (like color dots) are invisible to screen readers without labels.
**Action:** Always verify `aria-label` on graphic controls. In `App.jsx`, energy filters were just `<div>`s inside buttons without text descriptions.

## 2026-01-29 - Semantic Buttons in Lists
**Learning:** Using `<div>` with `onClick` for list items (like character selection) breaks accessibility for keyboard users.
**Action:** Always use `<button type="button">` for interactive list items. This provides native keyboard support (Enter/Space) and correct semantics without extra aria roles.
