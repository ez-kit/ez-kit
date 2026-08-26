'use client'

import { createColumnHelper } from '@ez-kit/data-grid-core'

import { CellTypesProvider } from './cell-types-context'
import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { useDataGridStore } from './data-grid/table-context'
import { useDataGrid } from './use-data-grid'

import type { CellTypeRegistry } from './cell-types-context'
import type { GridComponents } from './contract'
import type { DataGridInstance } from './data-grid-instance'
import type { DataGridDefaultOptions } from './data-grid-options-context'
import type { UseDataGridConfig } from './use-data-grid'
import type { ColumnDef, ColumnHelper } from '@ez-kit/data-grid-core'

/** The custom cell-type keys a registry actually holds, as a string union. */
type KitCellType<TCellTypes extends CellTypeRegistry> = Extract<keyof TCellTypes, string>

export type CreateDataGridOptions<TCellTypes extends CellTypeRegistry> = {
	components: Partial<GridComponents>
	cellTypes?: TCellTypes
	/**
	 * Kit-level default grid options baked into the bundle. Merged as the **base** layer
	 * under an app-level `DataGridOptionsProvider` and the per-call config
	 * (factory `defaultOptions` < provider `defaults` < instance config). Lets a kit ship
	 * opinionated defaults (e.g. `{ sorting: true, columnVisibility: true }`) so consumers
	 * need not repeat them at every `useDataGrid` call site.
	 */
	defaultOptions?: DataGridDefaultOptions<object>
}

/**
 * The bundle returned by {@link createDataGrid}: the bound compound `DataGrid`, the
 * hooks, the components provider, cell-type-aware column helpers, and `extendDataGrid`
 * — a re-invocation of the factory that reuses the same `components` while merging in
 * extra cell types (return typed to the merged key union).
 */
export type DataGridBundle<TCellTypes extends CellTypeRegistry> = {
	DataGrid: typeof DataGrid
	useDataGrid: typeof useDataGrid
	useDataGridStore: typeof useDataGridStore
	GridComponentsProvider: typeof GridComponentsProvider
	createColumns: <TRow extends object>(
		defs: ColumnDef<TRow, KitCellType<TCellTypes>>[],
	) => ColumnDef<TRow, KitCellType<TCellTypes>>[]
	createColumnHelper: <TRow extends object>() => ColumnHelper<TRow, KitCellType<TCellTypes>>
	extendDataGrid: <TExtra extends CellTypeRegistry>(extraCellTypes: TExtra) => DataGridBundle<TCellTypes & TExtra>
}

/**
 * Factory for creating a typed DataGrid bundle pre-configured with UI components
 * and optional cell types. Returns a `createColumns` helper typed to the registered
 * custom cell type keys so `type: 'my-type'` on columns is type-safe.
 *
 * This package contains **zero visual styling** — every visible primitive is
 * supplied via `components`. Pair with `import '@ez-kit/data-grid-react/styles.css'`
 * once at the kit / app root to apply the shared structural CSS
 * (positioning, layout, overflow, z-index, cursor). Visuals stay in the kit.
 *
 * @example
 * // With custom cell types
 * export const { DataGrid, useDataGrid, createColumns } = extendDataGrid({
 *   rating: { view: RatingCellView, edit: RatingCellInput },
 * })
 */
export function createDataGrid<TCellTypes extends CellTypeRegistry = CellTypeRegistry>({
	components,
	cellTypes,
	defaultOptions,
}: CreateDataGridOptions<TCellTypes>): DataGridBundle<TCellTypes> {
	type BoundProps = Parameters<typeof DataGrid>[0]
	function BoundDataGrid(props: BoundProps) {
		return (
			<GridComponentsProvider components={components}>
				{cellTypes != null ? (
					<CellTypesProvider types={cellTypes}>
						<DataGrid {...props} />
					</CellTypesProvider>
				) : (
					<DataGrid {...props} />
				)}
			</GridComponentsProvider>
		)
	}
	// Copy the whole compound namespace rather than listing members by hand. The hand-written
	// list had silently fallen five members behind `DataGrid` (SelectionBar, DraftBar,
	// SortTrigger, GlobalFilterInput, ColumnVisibilityTrigger), and the `as typeof DataGrid`
	// cast below hid it from the type checker — so `<DataGrid.SelectionBar />` from a kit was
	// `undefined` at runtime with no compile error. Assigning the namespace wholesale makes
	// that class of drift impossible.
	Object.assign(BoundDataGrid, DataGrid)

	function boundDefineColumns<TRow extends object>(
		defs: ColumnDef<TRow, KitCellType<TCellTypes>>[],
	): ColumnDef<TRow, KitCellType<TCellTypes>>[] {
		return defs
	}

	function boundCreateColumnHelper<TRow extends object>(): ColumnHelper<TRow, KitCellType<TCellTypes>> {
		const customTypeKeys = Object.keys(cellTypes ?? {}) as KitCellType<TCellTypes>[]
		return customTypeKeys.length > 0
			? createColumnHelper<TRow, KitCellType<TCellTypes>>(customTypeKeys)
			: (createColumnHelper<TRow>() as ColumnHelper<TRow, KitCellType<TCellTypes>>)
	}

	// Bind the kit-level `defaultOptions` as the base option layer for every call. The provider
	// wraps the DataGrid render tree, but `useDataGrid` runs in the *consumer's* tree (the caller
	// builds the instance, then passes it to `<DataGrid table={…} />`), so factory defaults must be
	// threaded through the hook itself rather than via a wrapping provider.
	function useDataGridWithDefaults<TRow extends object>(config: UseDataGridConfig<TRow>): DataGridInstance<TRow> {
		return useDataGrid<TRow>(config, defaultOptions as DataGridDefaultOptions<TRow> | undefined)
	}

	function boundExtendDataGrid<TExtra extends CellTypeRegistry>(
		extraCellTypes: TExtra,
	): DataGridBundle<TCellTypes & TExtra> {
		const mergedCellTypes = { ...cellTypes, ...extraCellTypes } as TCellTypes & TExtra
		return createDataGrid<TCellTypes & TExtra>({
			components,
			cellTypes: mergedCellTypes,
			...(defaultOptions !== undefined ? { defaultOptions } : {}),
		})
	}

	return {
		DataGrid: BoundDataGrid as typeof DataGrid,
		useDataGrid: useDataGridWithDefaults,
		useDataGridStore,
		GridComponentsProvider,
		createColumns: boundDefineColumns,
		createColumnHelper: boundCreateColumnHelper,
		extendDataGrid: boundExtendDataGrid,
	}
}
