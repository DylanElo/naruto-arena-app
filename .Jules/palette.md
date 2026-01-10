# Palette's Journal

## 2024-05-22 - Initial Setup
**Learning:** UX is about continuous improvement.
**Action:** Start by observing the existing interface.

## 2024-05-23 - Search Input Interactions
**Learning:** Search inputs without clear buttons force users to mash backspace, creating friction. Additionally, when clearing search programmatically, we must explicitly manage focus (`inputRef.current.focus()`) to keep the user in the flow.
**Action:** Always wrap search inputs in a `relative` container and include an `absolute` positioned clear button (`right-3`) that is only visible when `searchTerm` exists. Use `aria-label="Clear search"` for accessibility.
