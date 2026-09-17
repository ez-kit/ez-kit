---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

**`<DataGrid.BottomBar>`, and `data-slot='pagination-row'` renamed to `'bottom-bar'`.**

The strip below the table is now a compound member, the counterpart of `<DataGrid.Toolbar>` on the
other side of the table. Given no children it renders the page controls — the size selector and the
pagination — which is the arrangement `BottomBarLayout` mounts it for. Given children it holds those
instead, laid out as one row with two ends. It takes `className` and `style`, handed to the element
as-is.

It is named for the region, not for the pagination that usually fills it: a grid composing its own
layout may put a selection count, a summary or an export button down there, and the kits' rule for
un-centring the pagination keys on the child rather than on the bar, so a bar holding something else
is untouched by it.

Not `Footer`: that name is the `<tfoot>` counterpart of `<DataGrid.Header>`, built from each
column's `footer`. This element is a region of the grid's shell, outside the table.

**Breaking:** hand-written markup carrying `data-slot='pagination-row'` loses the kits' layout for
it. Use `<DataGrid.BottomBar>` (or rename the attribute to `bottom-bar`).
