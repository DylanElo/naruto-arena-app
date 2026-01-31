# Palette's Journal 🎨

## 2025-12-15 - Accessibility First
**Learning:** Icon-only buttons (like color dots) are invisible to screen readers without labels.
**Action:** Always verify `aria-label` on graphic controls. In `App.jsx`, energy filters were just `<div>`s inside buttons without text descriptions.

## 2025-12-15 - Filter State Visibility
**Learning:** Filter buttons (like energy toggles) need to communicate their active state to screen readers, not just visually.
**Action:** Use `aria-pressed="true"` (or `aria-current`) on the active filter button to ensure the state is perceptible to all users.
