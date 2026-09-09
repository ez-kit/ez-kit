---
'@ez-kit/data-grid-core': minor
'@ez-kit/data-grid-heroui': minor
---

Fix the kit-bound `createColumns` / `createColumnHelper` type-checking nothing through the
published `.d.ts`. Imported from a built kit, `cell: { type: 'nope' }`, a `select` column with no
`config`, and a typo inside a known config all compiled and ran — surfacing as a blank cell — and
`cell.component`'s parameter came back as an implicit `any`, so the form the docs teach did not
compile under `strict`. The same code checked correctly against the kits' sources, which is why
several audits missed it.

Each kit now **declares** its `KitCellTypes` (the ids it registers and the config each declares)
instead of deriving it from `typeof cellTypes`: a declared type survives the declaration emitter as
a name, while the runtime registry — nine entries of real component types — is re-printed
structurally, and over that blob the column types degenerate to an error type. A bidirectional
compile-time proof in each kit keeps the declaration matching the registry it describes. The kits'
`extendDataGrid` is annotated for the same reason, so the merged registry keeps checking too.

**Breaking (types only):** `KitCellTypes` is now the cell-type contract rather than the type of the
runtime `cellTypes` object — it no longer carries the renderer slots. Read those from `cellTypes`
or `CellTypeRegistry` instead. Columns that only compiled because of the defect now report the
error they always should have.

`@ez-kit/data-grid-core` gains `CellTypeContractOf`, the projection those proofs are written with.
