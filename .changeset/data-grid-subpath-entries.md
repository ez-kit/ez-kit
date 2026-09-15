---
'@ez-kit/data-grid-react': minor
'@ez-kit/data-grid-heroui': minor
---

Build the data-grid packages as multiple entry points, so a consumer stops paying for features it
does not use.

Every package shipped as a single `tsup src/index.ts` bundle, and a consumer's bundler shakes
nothing out of one pre-bundled file. Measured with esbuild (minified, gzipped, peers external):
importing the `PAGE_GAP` constant from `@ez-kit/data-grid-react` cost 54 857 bytes, against 54 873
for the whole `DataGrid` — 16 bytes apart. Three plausible causes were measured and ruled out: the
28 `DataGrid.X = …` compound assignments (273 bytes), the `export * from '@ez-kit/data-grid-core'`
star (2.5 kB), and the top-level `createContext` calls (nothing). Giving a module its own entry is
what worked.

`@ez-kit/data-grid-react` gains `./state`, `./cell-types`, `./contract`, `./kit` and `./menu`;
`@ez-kit/data-grid-heroui` gains one entry per feature group — `./core`, `./filtering`,
`./pagination`, `./sorting`, `./editing`, `./deleting`, `./selection`, `./draft`, `./row-actions`,
`./resizing`, `./visibility`, `./fallbacks`, `./infinite`, `./expanding` — plus `./cell-types` and
one entry per cell type under it (`./cell-types/text`, `./cell-types/date`, …). Each feature group
exports a `<group>Components` const annotated with its tier type from `./contract`, so a kit's set
can be composed through `createDataGrid` with groups left out.

The per-type entries are there because the barrel alone did not help: imported from it,
`textCellType` and `dateCellType` cost 79 863 and 79 860 bytes gzipped in the shadcn kit — three
bytes apart, one indivisible unit. Through their own entries, in heroui, text is 25 356 and date
94 710, the difference being the date picker that a grid without a date column no longer ships.

`./kit` is the one that made the kit split pay off. Nearly every block in both kits imported
`useGridMessages` from the package root, which anchored all ~187 kB of it into any bundle reaching
that block — a kit's `textCellType` alone bundled to ~200 kB. Those blocks now import the runtime
primitives they call from `./kit` (~3.7 kB) and their types from the root, where type imports are
erased and cost nothing.

Each kit also exports `allComponents` — every group in one object, for a grid that wants the
factory without the trimming. It is the aggregate equivalent of the existing `cellTypes` barrel,
and like TanStack's own `stockFeatures` it is documented as the convenient option rather than the
cheap one: naming it reaches every group.

Nothing is removed or renamed. `.` still exports the whole surface, `DataGrid` still arrives with
every component and every cell type registered, and an existing import keeps resolving to the same
value with the same type — the subpaths are an option, not a migration.
`apps/docs/test/tree-shaking.test.ts` now records, per entry, the complete set of entry points it
may reach, so a regression fails there rather than in someone's bundle.
