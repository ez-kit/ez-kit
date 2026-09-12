---
'@ez-kit/data-grid-heroui': patch
---

Divide overflow-menu sections in the heroui kit. `Dropdown.Section` groups its entries but draws no rule — HeroUI's own examples place a `<Separator />` between sections by hand — so the row-actions menu ran the pin entries straight on from Delete, and the column menu ran Hide on from the sort entries. The shadcn kit has separated them all along.
