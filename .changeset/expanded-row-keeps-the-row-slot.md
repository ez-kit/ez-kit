---
'@ez-kit/data-grid-react': patch
---

Give the expanded sub-content panel the same `data-slot` as every other row.

`ExpandedRow` rendered `<Tr data-expanded='true'>` without passing `data-slot`, so the kit's own
default won — `data-slot="table-row"` and `data-slot="table-cell"` under shadcn — and the panel
became the one row in the body that `[data-slot="tr"]` did not match. A kit stylesheet or a
consumer's selector written against the documented contract skipped it silently.

It now emits `data-slot="tr"` / `data-slot="td"` alongside `data-expanded="true"`, the way the
creating draft row already did. It still carries no `data-row-id`: like that draft row, it is a
row of the table and not a row of the data.
