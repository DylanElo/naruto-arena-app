# Palette's Journal 🎨

## 2025-12-15 - Accessibility First
**Learning:** Icon-only buttons (like color dots) are invisible to screen readers without labels.
**Action:** Always verify `aria-label` on graphic controls. In `App.jsx`, energy filters were just `<div>`s inside buttons without text descriptions.

## 2025-02-23 - Empty States Matter
**Learning:** When a search yields no results, presenting a blank screen creates confusion about whether the system is broken or the search failed. A dedicated empty state with a "Clear filters" action reassures the user and provides a way forward.
**Action:** Always implement a `length === 0` check for filtered lists and provide a helpful recovery action.
