# Palette's Journal 🎨

## 2025-12-15 - Accessibility First
**Learning:** Icon-only buttons (like color dots) are invisible to screen readers without labels.
**Action:** Always verify `aria-label` on graphic controls. In `App.jsx`, energy filters were just `<div>`s inside buttons without text descriptions.

## 2025-02-18 - Search Input Ergonomics
**Learning:** Users expect search inputs to autofocus after clearing, otherwise they must click twice to start a new search.
**Action:** Always use a `ref` to programmatically focus the input when implementing a "Clear" button.
