'use client'

export {
	DataGrid,
	GridComponentsProvider,
	useDataGrid,
	createColumns,
	createColumnHelper,
	// Every group this kit registers, for a grid that uses most of them. Composing only the
	// groups a grid renders — `@ez-kit/data-grid-shadcn/core`, `/sorting`, … — is what keeps the
	// rest out of the bundle.
	allComponents,
} from './data-grid'
export { cellTypes } from './blocks/cell-types'
// Exported so a consumer can name what its columns are checked against. What keeps the emitted
// signatures honest is that `KitCellTypes` is *declared* rather than `typeof cellTypes` — see
// `blocks/cell-types.ts`; merely exporting the alias was tried first and did not help.
export type { KitCellTypes } from './blocks/cell-types'

/**
 * The whole adapter surface, so a kit consumer never needs `@ez-kit/data-grid-react` (or
 * `@ez-kit/data-grid-core`) as a second dependency to name a type. Previously a curated list
 * of nine values and nine types, which left most of the API — `ColumnSortingConfig`,
 * `CellType`, `RowActionsPlacement`, the UI-kit component contracts — unnameable from here.
 *
 * A star re-export is safe alongside the bound names above: an explicit re-export shadows a
 * star of the same name, so every one of them stays the kit-bound version.
 *
 * `createColumns` / `createColumnHelper` **must** be in that explicit list. Without them the
 * star silently supplies the headless core versions, which are typed `TCustomCellTypes =
 * never` — they compile, they run, and they quietly stop checking `cell: { type: '…' }`
 * against the kit's registered cell types, which is the entire point of the factory.
 * `src/index.test.ts` guards this.
 */
export * from '@ez-kit/data-grid-react'

// The row drag handle, wearing this kit's glyph. The shared control authors no visual; this
// wrapper supplies the grip, as `blocks/resizing/Resizer.tsx` supplies the resizer's cursor.
export { RowDragHandle } from './blocks/ordering/RowDragHandle'
// The column header's drag handle, wearing this kit's glyph. Same control, the other axis.
export { ColumnDragHandle } from './blocks/ordering/ColumnDragHandle'
