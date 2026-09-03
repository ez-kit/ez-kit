---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

data-grid: a column's `footer` now renders

`column.footer` was the one column option that did nothing on its own — it reached TanStack,
`<DataGrid.Footer />` could render it, and the default layout mounted neither, so a column
declared a footer and nothing appeared. Declaring it is now enough, the way declaring `align` or
`pinning` is.

- **`layout.footer`** — omitted, the footer row mounts when at least one column declares a
  `footer`; `false` opts out (the way a grid drops a footer its shared columns declare under a
  defaults layer); `true` mounts it before any column declares one, for a `<DataGrid.Footer>`
  whose `children` supply the content.
- **`layout.stickyFooter`** — keeps the totals row in view while the body scrolls, mirroring
  `layout.stickyHeader`. `<DataGrid.Footer>` takes a `sticky` prop, as `<DataGrid.Header>` does.
- Both kits now lay the footer out in the column grid. shadcn's vendored `<TableFooter>` never
  got the `display: block` its header and body have, so the footer shrink-wrapped to a third of
  the table's width; HeroUI's table is a React Aria collection, which dropped the `<tfoot>`
  entirely — the kit now lifts it out of the collection and renders it into the real `<table>`.

No behaviour changes for a grid whose columns declare no `footer`, and a hand-composed
`<DataGrid.Table>` body still mounts only what you put in it.
