'use client'

import { CellTypesProvider, mergeCellTypes } from './cell-types-context'
import { GridComponentsProvider } from './components-context'
import { DataGrid } from './data-grid/data-grid'
import { useDataGridState } from './data-grid/table-context'
import { createColumnHelper } from './react-columns'
import { useDataGrid } from './use-data-grid'

import type { CellTypeRegistry } from './cell-types-context'
import type { GridComponents } from './contract'
import type { DataGridDefaultOptions } from './data-grid-options-context'
import type { ColumnDef, ColumnHelper } from './react-columns'
import type { UseDataGridConfig } from './use-data-grid'
import type { DataTable } from '@ez-kit/data-grid-core'

/** The ids a registry actually holds, as a string union — what the runtime helper is built from. */
type KitCellTypeId<TCellTypes extends CellTypeRegistry> = Extract<keyof TCellTypes, string>

export type CreateDataGridOptions<TCellTypes extends CellTypeRegistry> = {
	/**
	 * The kit's components, feature-grouped. Every group and every member is already optional
	 * — `GridComponents` *is* the partial shape a kit implements — so it is spelled the same
	 * way here as on `<GridComponentsProvider components>` and `<DataGrid components>`.
	 */
	components: GridComponents
	cellTypes?: TCellTypes
	/**
	 * Kit-level default grid options baked into the bundle. Merged as the **base** layer
	 * under an app-level `DataGridOptionsProvider` and the per-call config
	 * (factory `defaults` < provider `defaults` < instance config). Lets a kit ship
	 * opinionated defaults (e.g. `{ sorting: true, visibility: true }`) so consumers
	 * need not repeat them at every `useDataGrid` call site.
	 */
	defaults?: DataGridDefaultOptions<object>
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
	useDataGridState: typeof useDataGridState
	GridComponentsProvider: typeof GridComponentsProvider
	createColumns: <TRow extends object>(defs: ColumnDef<TRow, TCellTypes>[]) => ColumnDef<TRow, TCellTypes>[]
	createColumnHelper: <TRow extends object>() => ColumnHelper<TRow, TCellTypes>
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
 *   rating: defineCellType<{ max: number }>()({ view: RatingCellView, editing: RatingCellInput }),
 * })
 */
export function createDataGrid<TCellTypes extends CellTypeRegistry = CellTypeRegistry>({
	components,
	cellTypes,
	defaults,
}: CreateDataGridOptions<TCellTypes>): DataGridBundle<TCellTypes> {
	type BoundProps = Parameters<typeof DataGrid>[0]
	function BoundDataGrid(props: BoundProps) {
		return (
			<GridComponentsProvider components={components}>
				{cellTypes != null ? (
					<CellTypesProvider cellTypes={cellTypes}>
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
	// SortMenuTrigger, GlobalFilterInput, VisibilityTrigger), and the `as typeof DataGrid`
	// cast below hid it from the type checker — so `<DataGrid.SelectionBar />` from a kit was
	// `undefined` at runtime with no compile error. Assigning the namespace wholesale makes
	// that class of drift impossible.
	Object.assign(BoundDataGrid, DataGrid)

	function boundDefineColumns<TRow extends object>(defs: ColumnDef<TRow, TCellTypes>[]): ColumnDef<TRow, TCellTypes>[] {
		return defs
	}

	function boundCreateColumnHelper<TRow extends object>(): ColumnHelper<TRow, TCellTypes> {
		const ids = Object.keys(cellTypes ?? {}) as KitCellTypeId<TCellTypes>[]
		// No registry at all: fall back to the base contract's ids, so a bundle built without
		// `cellTypes` still answers to `.text()` / `.select()` rather than to nothing.
		return ids.length > 0
			? createColumnHelper<TRow, TCellTypes>(ids)
			: (createColumnHelper<TRow>() as unknown as ColumnHelper<TRow, TCellTypes>)
	}

	// Bind the kit-level `defaults` as the base option layer for every call. The provider
	// wraps the DataGrid render tree, but `useDataGrid` runs in the *consumer's* tree (the caller
	// builds the instance, then passes it to `<DataGrid table={…} />`), so factory defaults must be
	// threaded through the hook itself rather than via a wrapping provider.
	function useDataGridWithDefaults<TRow extends object>(config: UseDataGridConfig<TRow>): DataTable<TRow> {
		return useDataGrid<TRow>(config, defaults as DataGridDefaultOptions<TRow> | undefined)
	}

	function boundExtendDataGrid<TExtra extends CellTypeRegistry>(
		extraCellTypes: TExtra,
	): DataGridBundle<TCellTypes & TExtra> {
		const mergedCellTypes = mergeCellTypes(cellTypes ?? {}, extraCellTypes) as TCellTypes & TExtra
		return createDataGrid<TCellTypes & TExtra>({
			components,
			cellTypes: mergedCellTypes,
			...(defaults !== undefined ? { defaults } : {}),
		})
	}

	return {
		DataGrid: BoundDataGrid as typeof DataGrid,
		useDataGrid: useDataGridWithDefaults,
		useDataGridState,
		GridComponentsProvider,
		createColumns: boundDefineColumns,
		createColumnHelper: boundCreateColumnHelper,
		extendDataGrid: boundExtendDataGrid,
	}
}
