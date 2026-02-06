# Palette's Journal

## 2024-05-22 - Initial Setup
**Learning:** UX is about continuous improvement.
**Action:** Start by observing the existing interface.

## 2024-05-24 - Accessibility of Inline Elements
**Learning:** Inline UI elements (like icons defined as variables in a parent component) often lack accessibility attributes because they are "just visuals". Extracting them to standalone components forces a contract where accessibility props (aria-label, title) become required or standard.
**Action:** Identify inline "helper" components in large files and extract them to enforce accessibility standards centrally.
