import { createContext, useContext, useMemo } from 'react'

import { tableOptionInputs } from '../table-option-inputs'
import { useDataGridSelector } from '../use-data-grid-selector'

import type { DataTable, ErasedRow, GridFeatures } from '../types'
import type { DataGridSelectorOptions } from '../use-data-grid-selector'
import type { TableFeatures, TableState } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * The live table, row-erased. See {@link ErasedRow} for why it cannot carry the caller's `TRow`
 * and why `never` is the spelling.
 */
type ErasedTable = DataTable<GridFeatures, ErasedRow>

const TableContext = createContext<ErasedTable | null>(null)

// Table identity deliberately stays stable. Options have a separate notification:
// unlike state slices, new data, column definitions and config do not write to table.store.
const TableInputsContext = createContext<unknown>(null)

export { TableContext }

/**
 * **The crossing into the erased world**, and the only place a table's row type is discarded.
 *
 * Everything below `<DataGrid>` reads the table from a React context, which takes no type
 * parameter, so the caller's `TRow` stops here — see {@link ErasedRow}. v9's row types are
 * invariant in `TRow`, so this is a cast and not an assignment; putting it behind a component
 * means it is written once rather than at all eight provider sites, and that a reader looking
 * for "where does the row type go" finds one answer.
 *
 * {@link useDataGridTable} is the mirror: it casts back out to the row type its caller names.
 */
export function TableProvider<TFeatures extends TableFeatures, TRow extends object>({
	table,
	children,
}: {
	table: DataTable<TFeatures, TRow>
	children: ReactNode
}) {
	const data = table.options.data
	const columns = table.options.columns
	const options = tableOptionInputs(table)
	const inputs = useMemo(() => ({ data, columns, options }), [data, columns, options])
	return (
		<TableContext.Provider value={table as unknown as ErasedTable}>
			<TableInputsContext.Provider value={inputs}>{children}</TableInputsContext.Provider>
		</TableContext.Provider>
	)
}

/**
 * The live `DataTable` from context. Tracks replacement of its data, column definitions and config,
 * but does not subscribe to table state: reading the table is not the same
 * as depending on its state, and the two used to be welded together — the old `useTable()`
 * subscribed to the entire `TableState` by default, so every component that merely wanted
 * `getVisibleLeafColumns()` re-rendered on every keystroke in a filter box.
 *
 * Pair it with {@link useDataGridState} for the slice the component actually reads.
 *
 * The row type cannot be recovered from context (one context serves grids of every row type),
 * so it is a caller-supplied parameter: `useDataGridTable<User>()` types the table, and
 * omitting it keeps the unchecked default.
 *
 * Throws when called outside `<DataGrid>`.
 *
 * @example
 * const table = useDataGridTable<User>()
 * useDataGridState((s) => s.columnVisibility) // re-render when columns appear/disappear
 * const colSpan = table.getVisibleLeafColumns().length
 */
export function useDataGridTable<TRow extends object = ErasedRow>(): DataTable<GridFeatures, TRow> {
	useContext(TableInputsContext)
	const table = useContext(TableContext)
	if (!table) {
		throw new Error('This component must be rendered inside <DataGrid>.')
	}
	// The mirror of {@link TableProvider}'s cast, and the reason `as unknown as` is needed on both
	// sides: v9's row types are invariant in `TRow`, so the erased type and the caller's do not
	// overlap in either direction. See {@link ErasedRow}.
	return table as unknown as DataTable<GridFeatures, TRow>
}

/**
 * The table, or `null` outside `<DataGrid>` — the non-throwing read, for the few components that
 * are legitimately rendered on their own.
 *
 * Not an escape hatch from {@link useDataGridTable}: the throw is right for everything that reads
 * the table to *do* something, because such a component outside a grid is a mistake with no useful
 * behaviour left. What this serves is the opposite case — a component whose grid-less rendering is
 * a supported arrangement and needs no table at all.
 *
 * One member of that set is `<DataGrid.VisibilityItem>`, which a kit's `VisibilityMenu`
 * renders per row. That menu is a DI component taking a `columns` array, so it can be — and in both
 * kits is — rendered standalone in a unit test; the item then has no drag to register and falls back
 * to the plain markup it replaced, which is exactly what a grid with no adapter gets.
 *
 * The kits' `VisibilityMenu` is also **registry payload** in the shadcn kit — copied verbatim into a
 * consumer's project by `npx shadcn add` — so its grid-less rendering is not only a test shape: it
 * can be mounted anywhere a consumer chooses. The alternatives were worse for the phase's whole
 * point: making the kits wrap their tests in a grid, or handing them a participation flag, both put
 * the decision back in the kits.
 *
 * `useGridMessages` also reads here: standalone kit blocks keep their English fallback, while
 * blocks inside a grid observe replacement messages through the same options notification.
 * Internal to this package; not exported from `index.ts`.
 */
export function useOptionalDataGridTable<TRow extends object = ErasedRow>(): DataTable<GridFeatures, TRow> | null {
	useContext(TableInputsContext)
	// The same cast {@link useDataGridTable} makes, for the reason recorded there.
	return useContext(TableContext) as unknown as DataTable<GridFeatures, TRow> | null
}

/**
 * Subscribe to a slice of the table state from context. Re-renders only when the selected
 * slice changes, judged by `options.compare` — strict equality unless one is passed. See
 * {@link useDataGridSelector} for the full contract.
 *
 * @example Subscribe to a slice
 *   const sorting = useDataGridState((s) => s.sorting)
 *
 * @example Row-targeted boolean (no re-render for unrelated rows)
 *   // Stably `false` while the user edits a different row; flips exactly
 *   // when this row enters / leaves edit mode.
 *   const isEditingThisRow = useDataGridState((s) => s.editing.rowId === row.id)
 *
 * @example A derived object — `shallow` keeps it from re-rendering on unrelated changes
 *   const counts = useDataGridState((s) => ({ sorted: s.sorting.length, filtered: s.columnFilters.length }), {
 *     compare: shallow,
 *   })
 *
 * @example Deliberately broad — the snapshot itself is stable until something changes
 *   useDataGridState((s) => s)
 */
export function useDataGridState<TSelected>(
	selector: (state: TableState<GridFeatures>) => TSelected,
	options?: DataGridSelectorOptions<TSelected>,
): TSelected {
	return useDataGridSelector(useDataGridTable(), selector, options)
}

/** Opaque render functions can read any mutable model answer; ordinary components select only
 * what they display. This compatibility path is enabled only for a supplied callback/template.
 */
export function useRenderCallbackState(enabled: boolean) {
	useDataGridState((state) => (enabled ? state : null))
}
