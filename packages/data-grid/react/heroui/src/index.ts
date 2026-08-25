export { DataGrid, GridComponentsProvider, useDataGrid, extendDataGrid } from './data-grid'
export { cellTypes } from './blocks/cell-types'

/**
 * The whole adapter surface, so a kit consumer never needs `@ez-kit/data-grid-react` (or
 * `@ez-kit/data-grid-core`) as a second dependency to name a type. Previously a curated list
 * of nine values and nine types, which left most of the API — `ColumnSortingConfig`,
 * `CellType`, `RowActionsVariant`, the UI-kit component contracts — unnameable from here.
 *
 * A star re-export is safe alongside the four bound names above: an explicit re-export
 * shadows a star of the same name, so `DataGrid` / `useDataGrid` / `GridComponentsProvider` /
 * `extendDataGrid` stay the heroui-bound ones.
 */
export * from '@ez-kit/data-grid-react'
