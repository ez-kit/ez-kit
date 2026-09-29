import {
	rowPinningFeature,
	rowExpandingFeature,
	createExpandedRowModel,
	columnFilteringFeature,
	createFilteredRowModel,
	filterFns,
	tableFeatures,
} from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { rowOrderingFeature } from '@ez-kit/data-grid-core/src/features/entry'
import { canDropRow, dropRow } from '@ez-kit/data-grid-core/src/features/ordering/drop'
import { canMoveRow, moveRow, RowMoveDirection } from '@ez-kit/data-grid-core/src/features/ordering/row-ordering'
type Any = Record<string, any>

type N = { id: string; name: string; children?: N[] }
const RF = tableFeatures({
	rowOrderingFeature,
	rowPinningFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})
function tree(data: N[], pins: [string, 'top' | 'bottom'][] = []) {
	const t = createTable({
		features: RF,
		data,
		columns: createColumns<N>([{ accessorKey: 'name', header: 'Name' }]),
		getRowId: (r) => r.id,
		ordering: { row: { onChange: () => undefined } },
		pinning: { row: { top: true, bottom: true } },
		expanding: { mode: 'tree', getSubRows: (r) => r.children },
	} as never) as Any
	t.toggleAllRowsExpanded(true)
	for (const [id, side] of pins) t.getRow(id).pin(side, false, false)
	return t
}
function sweepRows(label: string, t: Any) {
	const rows = t.getRowModel().rows
	const ids: string[] = rows.map((r: Any) => r.id)
	console.log(label, rows.map((r: Any) => r.id + '@' + r.depth + ':' + String(r.getIsPinned())).join(' '))
	for (const s of ids) {
		for (const dir of [RowMoveDirection.Up, RowMoveDirection.Down]) {
			const m = moveRow(t, s, dir)
			if (!m) continue
			const srcRow = rows.find((r: Any) => r.id === s),
				tgtRow = rows.find((r: Any) => r.id === m.targetRowId)
			if (!canDropRow(t, s, m.targetRowId))
				console.log('  *** step allows, DROP REFUSES: ' + s + ' ' + dir + ' -> ' + m.targetRowId)
			if (tgtRow.depth > srcRow.depth)
				console.log(
					'  *** DESCENDANT returned as neighbour: ' +
						s +
						'@' +
						srcRow.depth +
						' -> ' +
						m.targetRowId +
						'@' +
						tgtRow.depth,
				)
			if (tgtRow.parentId !== srcRow.parentId)
				console.log(
					'  *** FOREIGN PARENT accepted: ' +
						s +
						'(' +
						srcRow.parentId +
						') -> ' +
						m.targetRowId +
						'(' +
						tgtRow.parentId +
						')',
				)
			if (String(tgtRow.getIsPinned()) !== String(srcRow.getIsPinned()))
				console.log('  *** FOREIGN BAND accepted: ' + s + ' -> ' + m.targetRowId)
		}
	}
	// drop allows on a sibling-adjacent pair => step must allow
	for (const s of ids)
		for (const tg of ids) {
			if (!canDropRow(t, s, tg)) continue
			const up = moveRow(t, s, RowMoveDirection.Up),
				down = moveRow(t, s, RowMoveDirection.Down)
			if (up?.targetRowId === tg || down?.targetRowId === tg) continue
			// is tg the nearest same-parent same-band sibling of s? then the step should have found it
			const si = ids.indexOf(s),
				ti = ids.indexOf(tg)
			const between = rows.slice(Math.min(si, ti) + 1, Math.max(si, ti))
			const sr = rows[si]
			const blockers = between.filter(
				(r: Any) => r.depth <= sr.depth && String(r.getIsPinned()) === String(sr.getIsPinned()),
			)
			if (blockers.length === 0) console.log('  *** DROP ALLOWS, STEP REFUSES (nearest sibling): ' + s + ' -> ' + tg)
		}
}

const FLATTREE: N[] = [
	{
		id: 'p1',
		name: 'P1',
		children: [
			{ id: 'c1', name: 'C1' },
			{ id: 'c2', name: 'C2' },
			{ id: 'c3', name: 'C3' },
		],
	},
	{ id: 'p2', name: 'P2', children: [{ id: 'd1', name: 'D1', children: [{ id: 'g1', name: 'G1' }] }] },
	{ id: 'p3', name: 'P3' },
]
sweepRows('tree/nopins', tree(FLATTREE))
sweepRows('tree/pin-child-c2', tree(FLATTREE, [['c2', 'top']]))
sweepRows('tree/pin-parent-p2', tree(FLATTREE, [['p2', 'top']]))
sweepRows('tree/pin-last-child-c3', tree(FLATTREE, [['c3', 'top']]))
sweepRows('tree/pin-grandchild-g1', tree(FLATTREE, [['g1', 'bottom']]))
sweepRows(
	'tree/pin-two-p1-p3',
	tree(FLATTREE, [
		['p1', 'top'],
		['p3', 'bottom'],
	]),
)

// ---- TERMINATION EDGES ----
function flat(ids: string[], pins: [string, 'top' | 'bottom'][] = []) {
	const t = createTable({
		features: RF,
		data: ids.map((id) => ({ id, name: id })),
		columns: createColumns<N>([{ accessorKey: 'name', header: 'Name' }]),
		getRowId: (r) => r.id,
		ordering: { row: true },
		pinning: { row: { top: true, bottom: true } },
		expanding: { mode: 'tree', getSubRows: (r) => r.children },
	} as never) as Any
	for (const [id, side] of pins) t.getRow(id).pin(side, false, false)
	return t
}
const guard = (label: string, fn: () => unknown) => {
	const to = setTimeout(() => {
		console.log('*** ' + label + ' HUNG')
		process.exit(1)
	}, 3000)
	try {
		console.log(label, '=', JSON.stringify(fn()))
	} catch (e) {
		console.log(label, 'THREW', (e as Error).message)
	}
	clearTimeout(to)
}
guard('single row: moveRow(a,Up)', () => moveRow(flat(['a']), 'a', RowMoveDirection.Up))
guard('single row: moveRow(a,Down)', () => moveRow(flat(['a']), 'a', RowMoveDirection.Down))
guard('single pinned row: moveRow(a,Down)', () => moveRow(flat(['a'], [['a', 'top']]), 'a', RowMoveDirection.Down))
guard('all others pinned: moveRow(a,Down)', () =>
	moveRow(
		flat(
			['a', 'b', 'c', 'd'],
			[
				['b', 'top'],
				['c', 'top'],
				['d', 'bottom'],
			],
		),
		'a',
		RowMoveDirection.Down,
	),
)
guard('all others pinned: moveRow(d,Up)', () =>
	moveRow(
		flat(
			['a', 'b', 'c', 'd'],
			[
				['a', 'top'],
				['b', 'top'],
				['c', 'top'],
			],
		),
		'd',
		RowMoveDirection.Up,
	),
)
guard('first row up past nothing', () => moveRow(flat(['a', 'b', 'c']), 'a', RowMoveDirection.Up))
guard('last row down past nothing', () => moveRow(flat(['a', 'b', 'c']), 'c', RowMoveDirection.Down))
guard('middle, both neighbours pinned', () =>
	moveRow(
		flat(
			['a', 'b', 'c'],
			[
				['a', 'top'],
				['c', 'bottom'],
			],
		),
		'b',
		RowMoveDirection.Up,
	),
)

// empty rendered model
const FF = tableFeatures({
	rowOrderingFeature,
	columnFilteringFeature,
	filteredRowModel: createFilteredRowModel(filterFns),
})
const te = createTable({
	features: FF,
	data: [
		{ id: 'a', name: 'A' },
		{ id: 'b', name: 'B' },
	],
	columns: createColumns<N>([{ accessorKey: 'name', header: 'Name' }]),
	getRowId: (r) => r.id,
	ordering: { row: true },
	filtering: true,
} as never) as Any
te.setColumnFilters([{ id: 'name', value: 'ZZZ' }])
guard('empty rendered model: moveRow(a,Down)', () => {
	console.log('  rendered', te.getRowModel().rows.length)
	return moveRow(te, 'a', RowMoveDirection.Down)
})
guard('empty rendered model: dropRow(a,b)', () => dropRow(te, 'a', 'b'))
