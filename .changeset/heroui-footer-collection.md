---
'@ez-kit/data-grid-heroui': minor
---

Render the column footer as a React Aria collection section

`TableFooter` arrived in react-aria-components 1.18 and HeroUI made that package a peer, so
`<tfoot>` is finally a node the collection understands. That removes the workaround it needed
before: the kit lifted `<DataGrid.Footer>` out of the table's children, portalled it back into the
real `<table>`, and rendered footer rows and cells as plain DOM through a context. Four parts, all
gone. Footer cells are ordinary collection cells now, so they take part in keyboard navigation
like body cells.

The kit's `./core` entry drops from 40 658 to 10 522 gzipped bytes with it, because the split
named `DataGrid.Footer` and reading one key off the compound namespace kept all 29 components.
`Tfoot` imports `TableFooter` from `react-aria-components` directly — HeroUI does not re-export
it, since their own `Table.Footer` is a `<div>` outside the table for pagination.
