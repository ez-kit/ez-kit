import { createGridContextAtom } from './grid-context'
import { defaultResolvedGridOptions } from './resolved-options'

import type { DataTable } from './types'
import type { DataTable as CoreDataTable, GridOptions } from '@ez-kit/data-grid-core'
import type { TableFeatures } from '@tanstack/table-core'

/**
 * Makes a headless core table renderable by the React layer, and returns it as this package's
 * {@link DataTable}.
 *
 * The only thing it does is seed the two fields the React layer hangs on the table — `grid`,
 * its resolved options, and `gridContext`, the atom behind the `context` option — so that
 * both are **always** present and no compound component has to guard the property itself.
 *
 * **`useDataGrid` does not call this.** That hook builds its table with `useTable`, which
 * constructs inside its own `useState` and returns a fresh object every render, so it seeds both
 * fields itself, per render, from values it already holds. What this function is for is the other
 * table: one built straight from `createTable` — a headless test, or a consumer driving the
 * compound components by hand — which keeps the all-features-off defaults and an empty context,
 * and still renders.
 *
 * `grid` **merges onto** what `createTable` already wrote rather than replacing it. Core seeds
 * `table.grid` with its own four members (`rowActions`, `rowPinning`, `virtualization`,
 * `direction`) at construction, and this function runs after it — so the bare
 * `table.grid = defaultResolvedGridOptions()` that stood here clobbered all four, and
 * `rowActions.placement`, the normalized row-pin config and the grid's direction silently
 * reached nothing. They are handed in and folded across under this layer's names; see
 * {@link defaultResolvedGridOptions}.
 *
 * **Call it exactly once per table.** It is not idempotent, and cannot be made so: it reads
 * `table.grid` as *core's* bag and writes *this layer's*, and the two spell the same settings
 * differently — core's `rowPinning` is this layer's `pinning.rowConfig`, so a second call finds no
 * `rowPinning`, drops the normalized row-pin config, and nothing fails. The asymmetry is the point
 * of the seam (see `DataTable` in `./types`), so the rule is on the call and not on the shapes.
 *
 * This replaced a `DataGridInstance` wrapper that carried `{ table, store, subscribe,
 * getSnapshot }`. Three of those four were the same functions already on the table, and what
 * was left was a wrapper whose only effect was to put every imperative call one hop further
 * away: `grid.table.creating.start()`.
 */
export function prepareDataGridTable<TFeatures extends TableFeatures, TRow extends object>(
	table: CoreDataTable<TFeatures, TRow>,
): DataTable<TFeatures, TRow> {
	// The one cast this function makes: `table` arrives carrying core's `grid`, and leaves
	// carrying this layer's. Row-erasure on `rowActions` is the same erasure `rowProps` and
	// `expanding.component` already take.
	const prepared = table as unknown as DataTable<TFeatures, TRow>
	prepared.grid = defaultResolvedGridOptions(table.grid as unknown as GridOptions<never>)
	prepared.gridContext = createGridContextAtom(table._reactivity)
	return prepared
}
