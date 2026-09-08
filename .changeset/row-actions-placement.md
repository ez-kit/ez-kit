---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-shadcn': minor
'@ez-kit/data-grid-heroui': minor
---

Replace `rowActions.variant` with `rowActions.placement`, and let a custom row action be an inline button.

One word at two levels instead of two words for one question. `rowActions.placement: 'inline' | 'menu'` is what `variant` was — where the built-in edit / delete pair lives — and an entry of `rowActions.actions` now carries the same `placement` for itself. `placement` names the container a control sits in, which is what this option always meant and what `filtering.panel.placement` and `pagination.pageSizer.placement` already say.

Custom entries were menu-only, so `variant: 'inline'` governed the built-ins and quietly did nothing for the actions an application contributed — the same `ActionItem` that is a button in the selection bar could never be one in a row. An entry that should sit beside Edit and Delete now asks for it with `placement: 'inline'`, which makes its `icon` required at the type level (an icon button with no icon is a blank square) and is never implicit: an entry defaults to the menu whatever the column's placement is.

The grid stops auto-sizing the actions column once entries are promoted this way, and says so: `actions` is a function of the row, so how many buttons a row renders is unknown when the column is built. Set `rowActions.column.width`; in development the cell reports the width it needs. An inline `{ id, component }` entry declares its own `width`, defaulting to one button and warning.

An entry's `icon` is now the consumer's own element only — the built-in `GridMenuIcon` names (`'edit'`, `'delete'`, `'pin-top'`, …) are no longer accepted there. That vocabulary is semantic and each kit maps a name to the glyph it draws for _that grid affordance_, so lending `'delete'` to an application's Archive handed it the icon the kit means by the grid's own Delete.

Entries also take `className`, applied to whatever the kit draws for them — the menu entry, the bar button, or the inline button.
