import { flattenBy, makeObjectMap, tableMemo } from '@tanstack/table-core'

import { readForeignSlice } from '../../feature-state'

import type { Row, RowData, RowModel, Table, TableFeatures } from '@tanstack/table-core'

// Runtime-only, like every `IS_DEV` guard in this package — each module that needs it declares
// its own copy rather than importing a shared one (see `create-table-options.ts`,
// `operators.ts`, `map-columns.ts`).
const IS_DEV = process.env.NODE_ENV !== 'production'

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
 * Marks a factory's return value as the server-grouping model.
 *
 * Core cannot otherwise tell the two grouped row models apart — both are plain functions in the
 * same slot — and it has to, because a `grouping.getSubRows` paired with the client model and a
 * manual model paired with nothing are both silent wrong answers rather than errors. The value
 * is `{ flat: boolean }` rather than a bare `true`: `.flat` says whether the factory was given
 * `isGroupRow`, which is what lets the mismatch guard in `create-table-options.ts` stay silent on
 * a correctly configured flat-shape grid — one with adapters and no `grouping.getSubRows`.
 */
export const MANUAL_GROUPED_ROW_MODEL = Symbol('ez-kit.manualGroupedRowModel')

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
 * The returned factory carries {@link MANUAL_GROUPED_ROW_MODEL} so core can tell it apart from
 * `createGroupedRowModel()` at the `groupedRowModel` slot — see that symbol's own docblock.
 *
 * This model has no `onAfterUpdate`. Upstream's does: it calls `table_autoResetExpanded` /
 * `table_autoResetPageIndex` when the grouping or the pre-grouped model changed, so changing
 * `by` also collapses expanded groups and jumps back to the first page. Neither helper is
 * exported from `@tanstack/table-core`, so this model cannot call the same functions upstream
 * does, and it does not reach back into `table.resetExpanded()` / `resetPageIndex()` to
 * approximate them — a row model driving table state from inside its own update is how render
 * loops start. The consumer-visible result: after `by` changes, previously expanded rows stay
 * expanded and the page index is unchanged. This interacts with the stale-marks fix above — a
 * row that is still marked as grouped *and* still expanded was the visible symptom of that bug;
 * with marks cleared correctly, an expanded id pointing at a row that is now a plain record is
 * comparatively harmless (an expand affordance with nothing left to hide).
 */
// `TData = any` matches `createGroupedRowModel`'s own signature exactly, so the two factories
// stay interchangeable in the `groupedRowModel` slot.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createManualGroupedRowModel<TFeatures extends TableFeatures, TData extends RowData = any>(
	adapters?: ManualGroupingAdapters<TData>,
): (table: Table<TFeatures, TData>) => () => RowModel<TFeatures, TData> {
	const factory = (table: Table<TFeatures, TData>) =>
		tableMemo({
			feature: 'columnGroupingFeature',
			table,
			fnName: 'table.getGroupedRowModel',
			memoDeps: () => [readForeignSlice(table, 'grouping'), table.getPreGroupedRowModel(), table.options.columns],
			fn: () => build(table, adapters),
		})
	return Object.assign(factory, { [MANUAL_GROUPED_ROW_MODEL]: { flat: adapters?.isGroupRow !== undefined } })
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

/**
 * Folds a flat sequence into a hierarchy using each row's own level.
 *
 * A level greater than the previous row's opens a child list; an equal or smaller one closes back
 * to that depth. A jump of more than one past the row before it is a hole in the response — a
 * group level the server skipped — and it **throws in development**, because both alternatives are
 * worse: attaching the row anyway invents a parent it does not have, and dropping it loses data
 * silently. In production it attaches at the nearest legal depth, so a bad page degrades rather
 * than blanks.
 *
 * The check is against the **previous row's own declared level**, not the stack's current depth —
 * the two are not the same thing. A row can legally close back several levels at once (going
 * straight from a level-2 record to a new level-0 group is an ordinary "start the next group"),
 * which would read as just as large a gap against `stack.length` as a genuine skipped level does.
 * And the very first row of the whole sequence has no previous row to jump from at all: a lone
 * record arriving at level 1 with nothing before it is not a hole, it is a childless top-level row
 * (see the model's own docblock on that case) — there is nothing to skip past yet.
 *
 * Idempotent by construction: every row gets a fresh `subRows: []` before any child is pushed onto
 * it, in the same pass that assigns it. A rerun over rows this already folded (the core row model
 * reruns the same `Row` objects whenever `grouping.by`-independent state changes) walks the same
 * flat sequence in the same order and overwrites each row's stale `subRows` before reading it, so
 * the result is the same tree rather than a doubled one.
 */
function foldByLevel<TFeatures extends TableFeatures, TData extends RowData>(
	rows: Row<TFeatures, TData>[],
	getLevel: (row: TData) => number,
): Row<TFeatures, TData>[] {
	const roots: Row<TFeatures, TData>[] = []
	// `stack[d]` is the row currently open at depth `d`.
	const stack: Row<TFeatures, TData>[] = []
	// The previous row's own declared level — the baseline the throw guard below measures a jump
	// against. `undefined` for the very first row, which has nothing to jump from.
	let previousLevel: number | undefined

	for (const row of rows) {
		const declared = getLevel(row.original)
		if (IS_DEV && previousLevel !== undefined && declared > previousLevel + 1) {
			throw new Error(
				`[data-grid] Row '${row.id}' declares level ${String(declared)} but the previous row declared ` +
					`${String(previousLevel)} — the response skipped a group level. Rows must arrive in order, ` +
					'outermost first.',
			)
		}

		const depth = Math.min(declared, stack.length)
		stack.length = depth
		const parent = depth > 0 ? stack[depth - 1] : undefined
		Object.assign(row, { depth, subRows: [], parentId: parent?.id })
		if (parent) parent.subRows.push(row)
		else roots.push(row)
		stack.push(row)
		previousLevel = declared
	}

	return roots
}

function build<TFeatures extends TableFeatures, TData extends RowData>(
	table: Table<TFeatures, TData>,
	adapters: ManualGroupingAdapters<TData> | undefined,
): RowModel<TFeatures, TData> {
	const model = table.getPreGroupedRowModel()
	if (!model.rows.length) return model

	const grouping = readForeignSlice(table, 'grouping') ?? []
	// Only the levels that still resolve to a column, exactly as upstream filters them: a grouping
	// state can outlive a column it names.
	const levels = grouping.filter((columnId) => table.getAllColumns().some((column) => column.id === columnId))

	// `isGroupRow` is what selects the flat shape; `getLevel` is what gives the depth. With
	// `isGroupRow` alone the fold degenerates to one group level, which is the common case.
	const rootRows =
		adapters?.isGroupRow !== undefined
			? foldByLevel(model.rows, adapters.getLevel ?? ((row: TData) => (adapters.isGroupRow?.(row) === true ? 0 : 1)))
			: model.rows

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

	walk(rootRows, 0)

	return { rows: rootRows, flatRows, rowsById }
}
