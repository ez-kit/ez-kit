import { createContext, useContext } from 'react'

import { useDataGridSelector } from '../use-data-grid-selector'

import type { DataTable, ErasedRow, GridFeatures } from '../types'
import type { TableFeatures, TableState } from '@tanstack/table-core'
import type { ReactNode } from 'react'

/**
 * The live table, row-erased. See {@link ErasedRow} for why it cannot carry the caller's `TRow`
 * and why `never` is the spelling.
 */
type ErasedTable = DataTable<GridFeatures, ErasedRow>

const TableContext = createContext<ErasedTable | null>(null)

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
	return <TableContext.Provider value={table as unknown as ErasedTable}>{children}</TableContext.Provider>
}

/**
 * The live `DataTable` from context. **Does not subscribe**: reading the table is not the same
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
 * The one member of that set today is `<DataGrid.VisibilityItem>`, which a kit's `VisibilityMenu`
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
 * Internal to this package: it is not exported from `index.ts`, and `VisibilityItem` is its only
 * caller. Nothing enforces that — there is no test for it — so a second caller is the moment to ask
 * whether the throw was the wrong default rather than to add a third.
 */
export function useOptionalDataGridTable<TRow extends object = ErasedRow>(): DataTable<GridFeatures, TRow> | null {
	// The same cast {@link useDataGridTable} makes, for the reason recorded there.
	return useContext(TableContext) as unknown as DataTable<GridFeatures, TRow> | null
}

/**
 * Subscribe to a slice of the table state from context. Re-renders only when the selected
 * slice changes. The selector must return a referentially stable value — see
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
 * @example Deliberately broad — the snapshot itself is stable until something changes
 *   useDataGridState((s) => s)
 */
export function useDataGridState<TSelected>(selector: (state: TableState<GridFeatures>) => TSelected): TSelected {
	return useDataGridSelector(useDataGridTable(), selector)
}
