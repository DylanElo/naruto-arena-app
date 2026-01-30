# Palette's Journal 🎨

## 2025-12-15 - Accessibility First
**Learning:** Icon-only buttons (like color dots) are invisible to screen readers without labels.
**Action:** Always verify `aria-label` on graphic controls. In `App.jsx`, energy filters were just `<div>`s inside buttons without text descriptions.

## 2025-05-23 - Interactive Elements Semantics
**Learning:** Found critical accessibility pattern where `div`s with `onClick` were used instead of `<button>`s, blocking keyboard users and screen readers.
**Action:** Always use `<button type="button">` for interactive elements, even for list items that look like cards.
