---
'@ez-kit/data-grid-react': patch
---

Three accessible names that the dictionary defines and the shadcn kit was not rendering. The
heroui kit had all three, so the localization page's promise — one dictionary, every string,
both kits — was only true of one of them.

- The `<table>` now carries `messages.grid.label`. It is written in the shared React layer, where
  the key is documented as "accessible name of the table element", so any kit inherits it; the
  heroui adapter already set the same string on React Aria's grid.
- The shadcn `Checkbox` adapter forwards `aria-label`. It dropped the prop, which left every
  selection checkbox — the select-all in the header included — with no accessible name at all.
- The shadcn filter-operator select is named by `messages.filtering.operator`. Its visible text
  is the current operator, which says what is selected but not what the control is, and a
  filtered grid renders one per column.
