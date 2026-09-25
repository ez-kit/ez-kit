import { flattenBy, makeObjectMap, tableMemo } from '@tanstack/table-core'

import { readForeignSlice } from '../../feature-state'

import type { Row, RowData, RowModel, Table, TableFeatures } from '@tanstack/table-core'

/**
 * How to read a **flat** server response — one sequence of rows carrying their own level, which is
 * what a SQL backend produces from `GROUPING SETS` / `ROLLUP`.
 *
 * Omit both and the model expects a **tree**: rows nested through `grouping.getSubRows`, where
 * depth alone says what is a group (anything shallower than `grouping.by` is one) and no adapter
 * is needed at all.
 */
export type ManualGroupingAdapters<TRow> = {
	/** Whether this row is a group row rather than a record. */
	isGroupRow?: (row: TRow) => boolean
	/** This row's nesting level, outermost `0`. */
	getLevel?: (row: TRow) => number
}

/**
 * The grouped row model for rows the **server** already grouped.
 *
 * It occupies the same `groupedRowModel` slot as `createGroupedRowModel()` and is the one thing
 * that turns server grouping on. There is no `manual` flag, because a flag can claim a behaviour
 * the registered model does not implement — which is exactly what upstream's `manualGrouping`
 * does. That option makes `getGroupedRowModel()` hand back the pre-grouped model untouched, and
 * since every part of group-row behaviour in v9 keys on `row.groupingColumnId` — a property only a
 * grouped model sets — the result is an empty `__group__` column and a grouped column missing from
 * the list.
 *
 * So this model **decorates** rather than groups: it marks the rows the server nested with the
 * three properties the rest of the grid reads, and deliberately leaves `getValue` alone, where
 * upstream's model replaces it with an aggregating one. A group row's subtotal is therefore the
 * field the server put on it, read by the ordinary accessor — which is why a server-grouped grid
 * needs neither `rowAggregationFeature` nor `aggregationFns`, and why a group row whose field is
 * absent reads `undefined` instead of a number computed behind the author's back.
 *
 * Rows are mutated in place. Upstream does the same (`resetRowRelationships` assigns `row.depth`),
 * and it is the reason this is a row model rather than something in the React layer: the row
 * objects every downstream reader already holds are the ones that have to carry the marks.
 *
 * The `leafRows` property this model sets holds the group's **childless** descendants, mirroring
 * upstream's own grouped model — its `leafRows` is `normalizeUniqueAggregationRows(groupedRows,
 * Infinity)`, the same "deepest frontier" idea. `Row.getLeafRows()` is a *different* thing: a
 * method bound once at row construction (`coreRowsFeature`), which always recomputes
 * `flattenBy(row.subRows, …)` and therefore returns **every** descendant, intermediate group rows
 * included — it never reads the `leafRows` property, in this model or in upstream's. That
 * disagreement between the property and the method is upstream's own behaviour, verified against
 * stock `createGroupedRowModel()` with an identical two-level shape, and is deliberately left
 * alone here rather than "fixed" by overriding `getLeafRows` on the row — a consumer can register
 * only one grouped row model per table, but an application can run a client-grouped grid and a
 * server-grouped grid side by side, and having `getLeafRows()` answer differently depending on
 * which model a grid happens to register would be worse than the one upstream behaviour both
 * share.
 *
 * Keep it out of `allDataGridFeatures` — two models cannot occupy one slot, and the all-in set is
 * the client one.
 */
// `TData = any` matches `createGroupedRowModel`'s own signature exactly, so the two factories
// stay interchangeable in the `groupedRowModel` slot.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createManualGroupedRowModel<TFeatures extends TableFeatures, TData extends RowData = any>(
	adapters?: ManualGroupingAdapters<TData>,
): (table: Table<TFeatures, TData>) => () => RowModel<TFeatures, TData> {
	return (table) =>
		tableMemo({
			feature: 'columnGroupingFeature',
			table,
			fnName: 'table.getGroupedRowModel',
			memoDeps: () => [readForeignSlice(table, 'grouping'), table.getPreGroupedRowModel(), table.options.columns],
			fn: () => build(table, adapters),
		})
}

// `adapters` names the flat-shape adapters (see `ManualGroupingAdapters`) and is unused by this
// task's tree-only path — `foldByLevel` and flat handling are the next task's work, and that is
// where this parameter starts being read.
function build<TFeatures extends TableFeatures, TData extends RowData>(
	table: Table<TFeatures, TData>,
	_adapters: ManualGroupingAdapters<TData> | undefined,
): RowModel<TFeatures, TData> {
	const model = table.getPreGroupedRowModel()
	const grouping = readForeignSlice(table, 'grouping') ?? []
	if (!model.rows.length || !grouping.length) return model

	// Only the levels that still resolve to a column, exactly as upstream filters them: a grouping
	// state can outlive a column it names.
	const levels = grouping.filter((columnId) => table.getAllColumns().some((column) => column.id === columnId))

	const flatRows: Row<TFeatures, TData>[] = []
	const rowsById = makeObjectMap<Row<TFeatures, TData>>()

	const walk = (rows: Row<TFeatures, TData>[], depth: number): void => {
		for (const row of rows) {
			flatRows.push(row)
			rowsById[row.id] = row

			const columnId = levels[depth]
			// A group row is a row at a level `by` names that actually has children. A childless row
			// at that depth is a record the server chose not to nest — marking it would give it a
			// label and take its own columns away.
			if (columnId !== undefined && row.subRows.length > 0) {
				Object.assign(row, {
					groupingColumnId: columnId,
					groupingValue: row.getValue(columnId),
					leafRows: flattenBy(row.subRows, (child: Row<TFeatures, TData>) => child.subRows).filter(
						(candidate) => candidate.subRows.length === 0,
					),
				})
			}

			if (row.subRows.length > 0) walk(row.subRows, depth + 1)
		}
	}

	walk(model.rows, 0)

	return { rows: model.rows, flatRows, rowsById }
}
