---
'@ez-kit/data-grid-shadcn': patch
'@ez-kit/data-grid-heroui': patch
---

Give the loading skeleton the same `data-slot` as every other row.

`LoadingRow` is drawn by the kit — the shared layer hands it only a `columnCount` — and neither
kit stamped the contract onto it, so the kit's own default won (`data-slot="table-row"` /
`"table-cell"` under shadcn) and the skeleton became the one row in the body that
`[data-slot="tr"]` did not match. A stylesheet or a selector written against the documented
attributes skipped the whole loading state.

Both kits now emit `data-slot="tr"` / `data-slot="td"` and mark the row `data-loading-row="true"`.
It still carries no `data-row-id`: like the creating draft row and the expanded panel, it is a row
of the table and not a row of the data.
