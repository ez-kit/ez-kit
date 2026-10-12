import {
	columnGroupingFeature,
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createGroupedRowModel,
	createSortedRowModel,
	rowExpandingFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { describe, expect, it } from 'vitest'

import { createColumns } from '../../column/create-columns'
import { createTable } from '../../create-table'
import { rowOrderingFeature } from '../entry'

import { canDropColumn, canDropRow, dropColumn, dropRow } from './drop'
import { canMoveColumn, ColumnMoveDirection, ColumnMoveScope } from './ordering'
import { canMoveRow, RowMoveDirection } from './row-ordering'

import type { ColumnDef } from '../../column/types'

// ── the column axis ───────────────────────────────────────────────────────────
// Fixtures copied from `ordering.test.ts` rather than imported: that file exports nothing, and
// the two suites describe different operations over the same rules, so they must be able to drift.

type Row = { id: number; name: string; email: string; age: number }

const DATA: Row[] = [{ id: 1, name: 'Alice', email: 'alice@example.com', age: 30 }]

/**
 * Everything a column drop can read: the order it writes, plus the pin band and the visibility
 * flag its boundary rules consult. `rowSelectionFeature` is here for the two cases that ask
 * whether a system column may be an end of a drop. Which of them a given case exercises is
 * decided by the config literal, not by the registration.
 */
const ORDERING = tableFeatures({
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowSelectionFeature,
})

function makeTable(columns: ColumnDef<Row>[], config: Record<string, unknown> = {}) {
	return createTable({
		features: ORDERING,
		data: DATA,
		columns: createColumns<Row>(columns),
		ordering: true,
		...config,
	})
}

const FLAT: ColumnDef<Row>[] = [
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age' },
]

/** Five columns, because the index arithmetic a drop does is only visible across a span. */
type Wide = { c1: string; c2: string; c3: string; c4: string; c5: string }

const WIDE_DATA: Wide[] = [{ c1: '1', c2: '2', c3: '3', c4: '4', c5: '5' }]

function makeWideTable() {
	return createTable({
		features: ORDERING,
		data: WIDE_DATA,
		columns: createColumns<Wide>([
			{ accessorKey: 'c1', header: 'C1' },
			{ accessorKey: 'c2', header: 'C2' },
			{ accessorKey: 'c3', header: 'C3' },
			{ accessorKey: 'c4', header: 'C4' },
			{ accessorKey: 'c5', header: 'C5' },
		]),
		ordering: true,
	})
}

describe('dropColumn', () => {
	it('lands a column on its neighbour', () => {
		// Arrange
		const table = makeTable(FLAT)

		// Act
		const order = dropColumn(table, 'email', 'name')

		// Assert
		expect(order).toEqual(['email', 'name', 'age'])
		expect(canDropColumn(table, 'email', 'name')).toBe(true)
	})

	it('carries a column several places forward, to where its target was', () => {
		// The one piece of arithmetic in this module. The target's index is read before the source
		// is lifted out, because removing an earlier source shifts the target down by one — read
		// afterwards, a forward drop lands one place short and a one-place drop does not move at
		// all. A span is where that stops being invisible.
		const table = makeWideTable()

		expect(dropColumn(table, 'c1', 'c4')).toEqual(['c2', 'c3', 'c4', 'c1', 'c5'])
	})

	it('carries a column several places backward, to where its target was', () => {
		const table = makeWideTable()

		expect(dropColumn(table, 'c4', 'c1')).toEqual(['c4', 'c1', 'c2', 'c3', 'c5'])
	})

	it('moves a column onto the one immediately after it', () => {
		// The adjacent forward pair, which is the case the inverted arithmetic turns into a silent
		// no-op: read after the source is spliced out, the target's index is the source's own, so the
		// order comes back unchanged and the drag appears to have been ignored. The two-place case
		// below catches the same inversion, but visibly — as a wrong order rather than as no order at
		// all — so it is not a substitute for this one.
		const table = makeTable(FLAT)

		expect(dropColumn(table, 'name', 'email')).toEqual(['email', 'name', 'age'])
	})

	it('carries a column past the one between it and its target', () => {
		const table = makeTable(FLAT)

		expect(dropColumn(table, 'name', 'age')).toEqual(['email', 'age', 'name'])
	})

	it('writes the complete order, never a partial one', () => {
		// A partial `columnOrder` reads to TanStack as "these first, then the rest as declared",
		// so anything short of the full list reorders columns nobody touched.
		const table = makeTable(FLAT)

		expect(dropColumn(table, 'name', 'age')).toHaveLength(FLAT.length)
	})

	it('refuses a drop onto itself', () => {
		// A drag released over its own origin is the commonest gesture there is. Reporting a change
		// for it would mean a drag that moved nothing still wrote state and fired `onChange`.
		const table = makeTable(FLAT)

		expect(canDropColumn(table, 'name', 'name')).toBe(false)
		expect(dropColumn(table, 'name', 'name')).toEqual(['name', 'email', 'age'])
	})

	it('refuses an id the table does not have, at either end', () => {
		const table = makeTable(FLAT)

		expect(canDropColumn(table, 'nope', 'name')).toBe(false)
		expect(canDropColumn(table, 'name', 'nope')).toBe(false)
		expect(dropColumn(table, 'nope', 'name')).toEqual(['name', 'email', 'age'])
		expect(dropColumn(table, 'name', 'nope')).toEqual(['name', 'email', 'age'])
	})

	const LOCKED: ColumnDef<Row>[] = [
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', ordering: false },
		{ accessorKey: 'age', header: 'Age' },
	]

	it('does not move a column the author locked', () => {
		const table = makeTable(LOCKED)

		expect(canDropColumn(table, 'email', 'name')).toBe(false)
		expect(dropColumn(table, 'email', 'name')).toEqual(['name', 'email', 'age'])
	})

	it('does not land on a locked column either', () => {
		// A locked column is not a landing spot, exactly as it is not a neighbour for a step.
		const table = makeTable(LOCKED)

		expect(canDropColumn(table, 'age', 'email')).toBe(false)
		expect(dropColumn(table, 'age', 'email')).toEqual(['name', 'email', 'age'])
	})

	it('does not carry a column past a locked one', () => {
		// `ordering: false` fixes `email` where the author put it, so a drop that passed it would
		// change its index — moving the one column that was promised not to move. The step path has
		// always refused this (`ordering.test.ts` asserts the wall deliberately), and the drop is
		// refused for the same reason and by the same code: `canDropColumn` asks whether the target is
		// reachable by stepping, so the lock ends that walk exactly as it ends the menu's.
		const table = makeTable(LOCKED)

		expect(canDropColumn(table, 'name', 'age')).toBe(false)
		expect(canDropColumn(table, 'age', 'name')).toBe(false)
		expect(dropColumn(table, 'name', 'age')).toEqual(['name', 'email', 'age'])
		expect(canMoveColumn(table, 'name', ColumnMoveDirection.End)).toBe(canDropColumn(table, 'name', 'age'))
	})

	it('never moves a system column', () => {
		const table = makeTable(FLAT, { selection: true })

		expect(canDropColumn(table, '__selection__', 'name')).toBe(false)
	})

	it('never lands on a system column', () => {
		// The other end of the same lock: a system column has a fixed place in the layout, so it is
		// neither a thing to drag nor somewhere to drop one.
		const table = makeTable(FLAT, { selection: true })

		expect(canDropColumn(table, 'name', '__selection__')).toBe(false)
	})

	it('keeps a drop inside its pin band', () => {
		// `email` is pinned at the start; `name` is not. A drop across the band would read as a
		// pin, not a reorder.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', pinning: 'start' },
				{ accessorKey: 'age', header: 'Age' },
			],
			{ pinning: true },
		)

		expect(canDropColumn(table, 'name', 'email')).toBe(false)
		expect(canDropColumn(table, 'email', 'name')).toBe(false)
	})

	it('agrees with the step path when a pinned column sits between the two ends', () => {
		// The case that made the two paths disagree: `email` is pinned between two centre-band
		// columns, so it is rendered away from both while sitting between them in the leaf order. A
		// drop compares its two ends and never saw it; a step used to treat it as the end of the
		// order and refuse. Asserted as an equality rather than as two literals, because what matters
		// is that neither path can drift from the other — the drop is the side that was right, and
		// `findNeighbour` was changed to match it.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', pinning: 'start' },
				{ accessorKey: 'age', header: 'Age' },
			],
			{ pinning: true },
		)

		expect(canDropColumn(table, 'name', 'age')).toBe(true)
		expect(canMoveColumn(table, 'name', ColumnMoveDirection.End)).toBe(canDropColumn(table, 'name', 'age'))
		expect(canMoveColumn(table, 'age', ColumnMoveDirection.Start)).toBe(canDropColumn(table, 'age', 'name'))
	})

	it('keeps a drop inside its header group', () => {
		// Landing in a sibling group would split that group's header cell in two. Note the drop is
		// refused even though the two columns are adjacent in the leaf order — adjacency is not the
		// rule, the shared parent is.
		const table = makeTable([
			{
				id: 'person',
				header: 'Person',
				columns: [
					{ accessorKey: 'name', header: 'Name' },
					{ accessorKey: 'email', header: 'Email' },
				],
			},
			{ id: 'other', header: 'Other', columns: [{ accessorKey: 'age', header: 'Age' }] },
		])

		expect(canDropColumn(table, 'email', 'age')).toBe(false)
		expect(canDropColumn(table, 'age', 'email')).toBe(false)
		// The control: inside the group the drop is available.
		expect(dropColumn(table, 'email', 'name')).toEqual(['email', 'name', 'age'])
	})

	it('drops columns in a grid registering neither pinning nor visibility', () => {
		// `getIsPinned` and `getIsVisible` come from `columnPinningFeature` and
		// `columnVisibilityFeature`, so a grid without them has no such members. One band and
		// nothing hidden is what the drop rules fall back to, rather than crashing on the read.
		const table = createTable({
			features: tableFeatures({ columnOrderingFeature }),
			data: DATA,
			columns: createColumns<Row>(FLAT),
			ordering: true,
		})

		expect(dropColumn(table, 'email', 'name')).toEqual(['email', 'name', 'age'])
		expect(canDropColumn(table, 'name', 'age')).toBe(true)
	})
})

describe('dropColumn scope', () => {
	const WITH_HIDDEN: ColumnDef<Row>[] = [
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', visibility: { initialHidden: true } },
		{ accessorKey: 'age', header: 'Age' },
	]

	it('refuses a hidden target in the visible scope', () => {
		// In the header the user sees the table, so a hidden column is not a landing spot they
		// could have aimed at.
		const table = makeTable(WITH_HIDDEN, { visibility: true })

		expect(canDropColumn(table, 'age', 'email', ColumnMoveScope.Visible)).toBe(false)
		expect(dropColumn(table, 'age', 'email', ColumnMoveScope.Visible)).toEqual(['name', 'email', 'age'])
	})

	it('lands on a hidden target in the All scope', () => {
		// The column panel lists hidden columns, so there the row is right in front of the user.
		const table = makeTable(WITH_HIDDEN, { visibility: true })

		expect(canDropColumn(table, 'age', 'email', ColumnMoveScope.All)).toBe(true)
		expect(dropColumn(table, 'age', 'email', ColumnMoveScope.All)).toEqual(['name', 'age', 'email'])
	})

	it('defaults to the visible scope', () => {
		const table = makeTable(WITH_HIDDEN, { visibility: true })

		expect(canDropColumn(table, 'age', 'email')).toBe(false)
	})

	it('asks the scope of the target only, so a hidden source may still be dropped', () => {
		// The asymmetry is deliberate: `scope` says where the user is looking for a landing spot, and
		// `canMoveColumn` is exactly as one-sided — it never asks whether the column being stepped is
		// visible either, which the third assertion pins. Nothing can drag a hidden column in the
		// header, since it renders no cell there; the case belongs to the column panel, which lists
		// hidden columns precisely so they can be reordered.
		const table = makeTable(WITH_HIDDEN, { visibility: true })

		expect(canDropColumn(table, 'email', 'name')).toBe(true)
		expect(canDropColumn(table, 'name', 'email')).toBe(false)
		expect(canMoveColumn(table, 'email', ColumnMoveDirection.Start)).toBe(true)
	})

	it('stops at a column that is hidden and locked, where the visible scope walks over it', () => {
		// The one case where `All` is not a superset of `Visible`, asserted so that it is a recorded
		// decision rather than a surprise. Counting a hidden column means the walk reaches its lock and
		// stops; skipping it means the walk never asks. `ColumnMoveScope`'s docblock has the reasoning
		// and the one-line fix, should the configuration ever turn up in earnest.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', visibility: { initialHidden: true }, ordering: false },
				{ accessorKey: 'age', header: 'Age' },
			],
			{ visibility: true },
		)

		expect(canDropColumn(table, 'name', 'age', ColumnMoveScope.Visible)).toBe(true)
		expect(canDropColumn(table, 'name', 'age', ColumnMoveScope.All)).toBe(false)
	})

	it('is still bound by bands, groups and locks under All', () => {
		// Widening which targets count says nothing about which drops are legal.
		const table = makeTable(
			[
				{ accessorKey: 'name', header: 'Name' },
				{ accessorKey: 'email', header: 'Email', pinning: 'start', visibility: { initialHidden: true } },
				{ accessorKey: 'age', header: 'Age', ordering: false },
			],
			{ pinning: true, visibility: true },
		)

		expect(canDropColumn(table, 'email', 'name', ColumnMoveScope.All)).toBe(false)
		expect(canDropColumn(table, 'name', 'age', ColumnMoveScope.All)).toBe(false)
		expect(canDropColumn(table, 'age', 'name', ColumnMoveScope.All)).toBe(false)
	})
})

// ── the row axis ──────────────────────────────────────────────────────────────

type RowRow = { id: string; name: string }

const ROWS: RowRow[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]

/**
 * Every feature a drop reads: `rowOrderingFeature` owns the `rowOrder` slice these helpers project
 * through, `rowSortingFeature` owns the `sorting` slice that refuses a drop, and
 * `rowPinningFeature` supplies the band boundary.
 */
const ROW_ORDERING = tableFeatures({
	rowOrderingFeature,
	rowSortingFeature,
	rowPinningFeature,
	sortedRowModel: createSortedRowModel(),
})

/** The same, plus what grouping needs — a group row is a row with `subRows`. */
const ROW_ORDERING_GROUPED = tableFeatures({
	rowOrderingFeature,
	columnGroupingFeature,
	groupedRowModel: createGroupedRowModel(),
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

/** The same, plus what tree data needs to render its sub-rows. */
const ROW_ORDERING_TREE = tableFeatures({
	rowOrderingFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})

function makeRowTable(config: Record<string, unknown> = {}) {
	return createTable({
		features: ROW_ORDERING,
		data: ROWS,
		columns: createColumns<RowRow>([{ accessorKey: 'name', header: 'Name' }]),
		getRowId: (row) => row.id,
		...config,
	})
}

function makeGroupedTable(config: Record<string, unknown>) {
	return createTable({
		features: ROW_ORDERING_GROUPED,
		data: ROWS,
		columns: createColumns<RowRow>([{ accessorKey: 'name', header: 'Name' }]),
		getRowId: (row) => row.id,
		...config,
	})
}

describe('dropRow', () => {
	it('describes the drop and performs none of it', () => {
		// Arrange
		const table = makeRowTable()

		// Act
		const move = dropRow(table, 'a', 'c')

		// Assert
		expect(move).toEqual({ rowId: 'a', targetRowId: 'c', direction: RowMoveDirection.Down })
		expect(table.getRowModel().rows.map((row) => row.id)).toEqual(['a', 'b', 'c'])
	})

	it('derives Up for a backward drop', () => {
		// `direction` is informational — it records which way the row travelled, and nothing reads
		// it to compute a position. It is reported because it is part of the payload
		// `ordering.row.onChange` already receives.
		const table = makeRowTable()

		expect(dropRow(table, 'c', 'a')).toEqual({
			rowId: 'c',
			targetRowId: 'a',
			direction: RowMoveDirection.Up,
		})
	})

	it('refuses a drop onto itself', () => {
		const table = makeRowTable()

		expect(dropRow(table, 'b', 'b')).toBeUndefined()
		expect(canDropRow(table, 'b', 'b')).toBe(false)
	})

	it('refuses a row id the table does not have, at either end', () => {
		const table = makeRowTable()

		expect(dropRow(table, 'nope', 'a')).toBeUndefined()
		expect(dropRow(table, 'a', 'nope')).toBeUndefined()
	})

	it('refuses every drop while a sort is applied', () => {
		// Sorting computes the order from the data, so a dropped row would be recomputed away on
		// the next render and would visibly spring back to where it came from.
		const table = makeRowTable({ sorting: true })
		table.setSorting([{ id: 'name', desc: false }])

		expect(dropRow(table, 'a', 'c')).toBeUndefined()
		expect(canDropRow(table, 'c', 'a')).toBe(false)
	})

	it('refuses every drop while a grouping is applied', () => {
		// The same reasoning, and a second one on top: half the rows are synthetic groups, so
		// "put this row there" has no answer across a group boundary.
		const table = makeGroupedTable({ grouping: { by: ['name'] } })

		expect(dropRow(table, 'a', 'c')).toBeUndefined()
		expect(canDropRow(table, 'a', 'c')).toBe(false)
	})

	it('drops freely again once the grouping is dropped', () => {
		// The control: the refusal is the grouping's, not the feature set's.
		const table = makeGroupedTable({ grouping: true })

		expect(dropRow(table, 'a', 'c')).toEqual({
			rowId: 'a',
			targetRowId: 'c',
			direction: RowMoveDirection.Down,
		})
	})

	it('does not drop a row into a different pinning band', () => {
		// Pinning is not expressible as a row fixture, so the band is set after construction.
		const table = makeRowTable({ pinning: { row: { top: true, bottom: true } } })
		table.getRow('a').pin('top', false, false)

		expect(canDropRow(table, 'b', 'a')).toBe(false)
		expect(canDropRow(table, 'a', 'b')).toBe(false)
		// The control: inside the centre band the drop is available.
		expect(canDropRow(table, 'b', 'c')).toBe(true)
	})

	it('agrees with the step path when a pinned row sits between the two ends', () => {
		// The row-axis twin of the column case above. Pinning a row does not take it out of the row
		// model, so 'b' sits between 'a' and 'c' while being rendered at the top, away from both.
		const table = makeRowTable({ pinning: { row: { top: true, bottom: true } } })
		table.getRow('b').pin('top', false, false)

		expect(canDropRow(table, 'a', 'c')).toBe(true)
		expect(canMoveRow(table, 'a', RowMoveDirection.Down)).toBe(canDropRow(table, 'a', 'c'))
		expect(canMoveRow(table, 'c', RowMoveDirection.Up)).toBe(canDropRow(table, 'c', 'a'))
	})

	it('drops rows in a grid registering neither sorting nor row pinning', () => {
		// `sorting` is a foreign slice and `getIsPinned` a foreign member: a grid with neither
		// feature never sorts and has one band, which is what the drop rules fall back to rather
		// than throwing on the read.
		const table = createTable({
			features: tableFeatures({ rowOrderingFeature }),
			data: ROWS,
			columns: createColumns<RowRow>([{ accessorKey: 'name', header: 'Name' }]),
			getRowId: (row) => row.id,
		})

		expect(dropRow(table, 'a', 'c')).toEqual({
			rowId: 'a',
			targetRowId: 'c',
			direction: RowMoveDirection.Down,
		})
	})

	it('names the missing feature when row ordering was never registered', () => {
		// `rowOrder` is `rowOrderingFeature`'s own slice. Reading it off a table that does not have
		// the feature is a composition mistake, and the accessor says so by name rather than
		// letting an empty order compute every drop from the original positions.
		const table = createTable({
			features: tableFeatures({}),
			data: ROWS,
			columns: createColumns<RowRow>([{ accessorKey: 'name', header: 'Name' }]),
			getRowId: (row) => row.id,
		})

		expect(() => dropRow(table, 'a', 'c')).toThrow(/state slice "rowOrder" is missing/)
	})

	it('projects through `rowOrder` rather than the raw row model', () => {
		// A grid that has not yet fed the projected data back would otherwise compute every drop
		// from the original positions, so a second drop would undo the first. With the order
		// reversed, `a` sits last and `c` first — so dropping `a` onto `c` travels *up*, which is
		// the opposite of what the raw model would say.
		const table = makeRowTable({ initialState: { rowOrder: ['c', 'b', 'a'] } })

		expect(dropRow(table, 'a', 'c')).toEqual({
			rowId: 'a',
			targetRowId: 'c',
			direction: RowMoveDirection.Up,
		})
	})
})

describe('dropRow in a tree', () => {
	type Node = { id: string; name: string; children?: Node[] }

	const TREE: Node[] = [
		{
			id: 'p1',
			name: 'P1',
			children: [
				{ id: 'c1', name: 'C1' },
				{ id: 'c2', name: 'C2' },
			],
		},
		{ id: 'p2', name: 'P2', children: [{ id: 'c3', name: 'C3' }] },
	]

	function makeTreeTable(extra: Record<string, unknown> = {}) {
		const table = createTable({
			features: ROW_ORDERING_TREE,
			data: TREE,
			columns: createColumns<Node>([{ accessorKey: 'name', header: 'Name' }]),
			getRowId: (row) => row.id,
			// The pure helper never reads the config, so this option changes nothing here — it is
			// carried over so the fixture matches `row-ordering.test.ts`'s tree table line for line,
			// and a case moved between the two files keeps behaving the same. Where the mode does
			// decide the answer is `table.ordering.dropRow`, covered in `row-ordering-feature.test.ts`.
			ordering: { row: { onChange: () => undefined } },
			expanding: { mode: 'tree', getSubRows: (row) => row.children },
			...extra,
		})
		// Without the expand the child rows are not in the rendered model at all and every lookup
		// answers -1.
		table.toggleAllRowsExpanded(true)
		return table
	}

	it('drops a child onto a sibling', () => {
		const table = makeTreeTable()

		expect(dropRow(table, 'c1', 'c2')).toEqual({
			rowId: 'c1',
			targetRowId: 'c2',
			direction: RowMoveDirection.Down,
		})
	})

	it('keeps a child inside its own subtree', () => {
		// `c2` and `c3` are adjacent in the rendered list but sit under different parents. Crossing
		// there would change the row's parent, which is a different operation with a different
		// meaning.
		const table = makeTreeTable()

		expect(canDropRow(table, 'c2', 'c3')).toBe(false)
	})

	it('drops a parent past another parent whole subtree', () => {
		// The rows between `p1` and `p2` are `p1`'s own children. They are not a boundary — the
		// shared parent is what makes the two ends siblings, and there is no span to walk.
		const table = makeTreeTable()

		expect(dropRow(table, 'p1', 'p2')).toEqual({
			rowId: 'p1',
			targetRowId: 'p2',
			direction: RowMoveDirection.Down,
		})
	})

	it('refuses a child onto a top-level row', () => {
		const table = makeTreeTable()

		expect(canDropRow(table, 'c1', 'p2')).toBe(false)
	})

	it('refuses what the step path refuses when `rowOrder` names a sub-row', () => {
		// `applyRowOrder` permutes the rendered list within the slots the rows it names already
		// occupy, so an order naming a child lifts it above its own parent in the projection: the
		// depths interleave, and `c1` ends up before `p1`. Comparing the two ends then reads `c1` and
		// `c2` as siblings — which they are — while the walk meets `p1` on the way and stops at the
		// parent boundary. The walk is right, and asking it is what keeps the drop from allowing an
		// arrangement no sequence of menu steps could produce. The uncontrolled path never writes such
		// an order, `isTopLevelRow` seeing to that; a controlled grid restoring one from a deep link
		// can.
		const table = makeTreeTable({ initialState: { rowOrder: ['c1', 'p1'] } })

		expect(canDropRow(table, 'c1', 'c2')).toBe(false)
		expect(canMoveRow(table, 'c1', RowMoveDirection.Down)).toBe(canDropRow(table, 'c1', 'c2'))
	})
})
