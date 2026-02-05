# Palette's Journal

## 2024-05-22 - Initial Setup
**Learning:** UX is about continuous improvement.
**Action:** Start by observing the existing interface.

## 2024-10-24 - Inline Icon Components
**Learning:** Inline component definitions (like `EnergyIcon` in App.jsx) bypass accessibility audits and prevent consistent ARIA labeling across the app.
**Action:** Extract inline UI elements to `src/components/` to enforce `role="img"` and dynamic `aria-label` props centrally.
