export {
	DataGrid,
	GridComponentsProvider,
	useDataGrid,
	extendDataGrid,
	createColumns,
	createColumnHelper,
} from './data-grid'
export { cellTypes } from './blocks/cell-types'
// Exported so the bundled `.d.ts` can refer to the registry **by name**. Left unexported, the
// declaration emitter re-prints all nine entries structurally into every signature that mentions
// them — and a `CellDef` union built over that structural blob is large enough that TypeScript
// stops contextually typing `cell.component`, handing its parameter back as an implicit `any`.
export type { KitCellTypes } from './blocks/cell-types'

/**
 * The whole adapter surface, so a kit consumer never needs `@ez-kit/data-grid-react` (or
 * `@ez-kit/data-grid-core`) as a second dependency to name a type. Previously a curated list
 * of nine values and nine types, which left most of the API — `ColumnSortingConfig`,
 * `CellType`, `RowActionsVariant`, the UI-kit component contracts — unnameable from here.
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
