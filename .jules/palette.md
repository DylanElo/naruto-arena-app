# Palette's Journal 🎨

## 2025-12-15 - Accessibility First
**Learning:** Icon-only buttons (like color dots) are invisible to screen readers without labels.
**Action:** Always verify `aria-label` on graphic controls. In `App.jsx`, energy filters were just `<div>`s inside buttons without text descriptions.

## 2024-05-22 - Search Input Focus Flow
**Learning:** Clearing a search input via a button often drops keyboard focus to the document body, disrupting the user's flow.
**Action:** When implementing "Clear" buttons in search fields, always use a `ref` to programmatically return focus to the input (`inputRef.current?.focus()`) immediately after the clear action.
