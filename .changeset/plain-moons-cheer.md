---
'@ez-kit/data-grid-react': minor
---

Let `DataGridOptionsProvider` and `createDataGrid({ defaultOptions })` describe writes.

`creating`, `editing` and `deleting` previously could not appear in a defaults layer at all: they
inherit `onSave` / `onDelete` as **required** fields from the instance config type, so a shared
default had to supply a handler it cannot have. `DataGridDefaultOptions` now relaxes exactly those
handlers, letting `creating: { mode: 'modal' }` or `deleting: { confirmation: … }` be set once for
a whole app.

A write feature is now enabled by its handler rather than by its presence in the merged options: a
grid that supplies no `onSave` / `onDelete` resolves the feature away instead of rendering a trigger
whose commit would call `undefined`. Grids that pass their write config inline are unaffected — the
handler is right there.
