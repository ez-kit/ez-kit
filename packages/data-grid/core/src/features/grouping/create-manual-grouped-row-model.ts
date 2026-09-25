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
 *
 * **Not implemented yet.** `createManualGroupedRowModel` currently only reads the tree shape;
 * passing either field is accepted but silently ignored — `foldByLevel` for the flat shape is the
 * next task's work. These two sentences are deleted once that lands.
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
 *
 * **Not implemented yet:** `adapters` is accepted but not yet honoured — see
 * {@link ManualGroupingAdapters}. This sentence is deleted once the flat shape lands.
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

/**
 * The row surface this model marks and clears, named structurally rather than through
 * `Row<TFeatures, TData>` — `TFeatures` is unresolved inside this factory, so
 * `Row_ColumnGrouping`'s members (`groupingColumnId`, `groupingValue`, `getGroupingValue`) are a
 * `TS2339` on the generic type, the same wall `../../feature-state` exists for on state atoms.
 * This factory is only ever registered as `groupedRowModel`, which requires `columnGroupingFeature`
 * to be registered for it to run at all, so these members are genuinely present at runtime; naming
 * them here states that fact instead of casting past it silently. `leafRows` is not a typed Row
 * member anywhere upstream either (see the factory's own docblock) — it is this model's own mark,
 * named here for the same reason.
 */
type MarkableRow<TFeatures extends TableFeatures, TData extends RowData> = Row<TFeatures, TData> & {
	groupingColumnId?: string
	groupingValue?: unknown
	leafRows?: Row<TFeatures, TData>[]
	getGroupingValue: (columnId: string) => unknown
}

// `adapters` names the flat-shape adapters (see `ManualGroupingAdapters`) and is unused by this
// task's tree-only path — `foldByLevel` and flat handling are the next task's work, and that is
// where this parameter starts being read.
function build<TFeatures extends TableFeatures, TData extends RowData>(
	table: Table<TFeatures, TData>,
	_adapters: ManualGroupingAdapters<TData> | undefined,
): RowModel<TFeatures, TData> {
	const model = table.getPreGroupedRowModel()
	if (!model.rows.length) return model

	const grouping = readForeignSlice(table, 'grouping') ?? []
	// Only the levels that still resolve to a column, exactly as upstream filters them: a grouping
	// state can outlive a column it names.
	const levels = grouping.filter((columnId) => table.getAllColumns().some((column) => column.id === columnId))

	const flatRows: Row<TFeatures, TData>[] = []
	const rowsById = makeObjectMap<Row<TFeatures, TData>>()

	const walk = (rows: Row<TFeatures, TData>[], depth: number): void => {
		for (const rawRow of rows) {
			const row = rawRow as MarkableRow<TFeatures, TData>
			flatRows.push(row)
			rowsById[row.id] = row

			const columnId = levels[depth]
			// A group row is a row at a level `by` names that actually has children. A childless row
			// at that depth is a record the server chose not to nest — marking it would give it a
			// label and take its own columns away.
			if (columnId !== undefined && row.subRows.length > 0) {
				Object.assign(row, {
					groupingColumnId: columnId,
					groupingValue: row.getGroupingValue(columnId),
					leafRows: flattenBy(row.subRows, (child: Row<TFeatures, TData>) => child.subRows).filter(
						(candidate) => candidate.subRows.length === 0,
					),
				})
			} else {
				// The core row model re-runs this walk over the **same** `Row` objects whenever
				// `grouping.by` changes (or a marked column drops out of `options.columns`) — it is
				// memoised on `table.options.data` alone, not on grouping state. Without clearing, a
				// row a shrinking `by` demotes stays `getIsGrouped() === true` forever: its label
				// survives, its own columns stay hidden behind the `__group__` column, and
				// `groupingColumnId` can go on naming a column no longer in `by`. `delete` rather than
				// assigning `undefined`, so the property is genuinely absent — what a freshly
				// constructed row looks like, and what `row_getIsGrouped`'s `!!row.groupingColumnId`
				// reads the same way either way.
				delete row.groupingColumnId
				delete row.groupingValue
				delete row.leafRows
			}

			if (row.subRows.length > 0) walk(row.subRows, depth + 1)
		}
	}

	walk(model.rows, 0)

	return { rows: model.rows, flatRows, rowsById }
}
