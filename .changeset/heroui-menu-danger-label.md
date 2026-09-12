---
'@ez-kit/data-grid-heroui': patch
---

Colour destructive menu entries red again in the heroui kit — Delete rendered fully black in both the row-actions and column menus. HeroUI's `variant='danger'` reaches only two things: `.menu-item--danger [data-slot="label"]`, which no bare text node satisfies, and the item indicator. So each `Dropdown.Item` now wraps its wording in HeroUI's `<Label>`, and tints its glyph with the same `--danger` token by hand — which is what HeroUI's own with-icons example does.
