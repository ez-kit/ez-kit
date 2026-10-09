import {
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowSortingFeature,
	createSortedRowModel,
	tableFeatures,
} from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { rowOrderingFeature } from '@ez-kit/data-grid-core/src/features/entry'
import {
	canMoveColumn,
	moveColumn,
	ColumnMoveDirection,
	ColumnMoveScope,
	isMovable,
	isVisible,
	pinnedColumnBand,
} from '@ez-kit/data-grid-core/src/features/ordering/ordering'
import { canMoveRow, RowMoveDirection, pinnedRowBand } from '@ez-kit/data-grid-core/src/features/ordering/row-ordering'

type Any = Record<string, any>

// ---- PATCHED column findNeighbour: SKIP a foreign band instead of returning undefined
function patchedColNeighbour(columns: Any[], index: number, dir: string, scope: string): Any | undefined {
	const column = columns[index]
	if (!column) return undefined
	const step = dir === 'start' ? -1 : 1
	const parentId = column.parent?.id
	const pinned = pinnedColumnBand(column)
	for (let i = index + step; i >= 0 && i < columns.length; i += step) {
		const c = columns[i]
		if (!c) continue
		if (pinnedColumnBand(c) !== pinned) continue // <-- was: return undefined
		if (c.parent?.id !== parentId) return undefined
		if (scope === 'visible' && !isVisible(c)) continue
		return isMovable(c) ? c : undefined
	}
	return undefined
}
const patchedCanMoveColumn = (t: Any, id: string, dir: string, scope = 'visible') => {
	const cols = t.getAllLeafColumns()
	const i = cols.findIndex((c: Any) => c.id === id)
	const col = cols[i]
	if (!col || !isMovable(col)) return false
	return patchedColNeighbour(cols, i, dir, scope) !== undefined
}

// ---- PATCHED row findNeighbour
function patchedRowNeighbour(rows: Any[], index: number, dir: string): Any | undefined {
	const row = rows[index]
	if (!row) return undefined
	const step = dir === 'up' ? -1 : 1
	for (let cursor = index + step; cursor >= 0 && cursor < rows.length; cursor += step) {
		const c = rows[cursor]
		if (!c) continue
		if (c.depth > row.depth) continue
		if (pinnedRowBand(c) !== pinnedRowBand(row)) continue // <-- was: return undefined
		if (c.parentId !== row.parentId) return undefined
		return c
	}
	return undefined
}
const patchedCanMoveRow = (t: Any, id: string, dir: string) => {
	const rows = t.getRowModel().rows
	const i = rows.findIndex((r: Any) => r.id === id)
	if (i === -1) return false
	return patchedRowNeighbour(rows, i, dir) !== undefined
}

const F = tableFeatures({ columnOrderingFeature, columnPinningFeature, columnVisibilityFeature, rowSelectionFeature })
type Row = { id: number; name: string; email: string; age: number }
const DATA: Row[] = [{ id: 1, name: 'Alice', email: 'a@e.com', age: 30 }]
const makeTable = (columns: any, config: Any = {}) =>
	createTable({
		features: F,
		data: DATA,
		columns: createColumns<Row>(columns),
		ordering: true,
		...config,
	} as never) as Any

function cmp(label: string, actual: boolean, patched: boolean) {
	console.log(
		(actual === patched ? '  same  ' : '*** FLIPS ***') + ' ' + label + ': current=' + actual + ' patched=' + patched,
	)
}

// ordering.test.ts:115 'keeps a move inside its pin band'
let t = makeTable(
	[
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', pinning: 'start' },
		{ accessorKey: 'age', header: 'Age' },
	],
	{ pinning: true },
)
console.log(
	'fixture leaves',
	t.getAllLeafColumns().map((c: Any) => c.id + ':' + String(c.getIsPinned())),
)
cmp(
	'ordering.test.ts:127 canMoveColumn(email, End)',
	canMoveColumn(t, 'email', ColumnMoveDirection.End),
	patchedCanMoveColumn(t, 'email', 'end'),
)
cmp(
	'ordering.test.ts:128 canMoveColumn(name, Start)',
	canMoveColumn(t, 'name', ColumnMoveDirection.Start),
	patchedCanMoveColumn(t, 'name', 'start'),
)
cmp(
	'[UNASSERTED] canMoveColumn(name, End)',
	canMoveColumn(t, 'name', ColumnMoveDirection.End),
	patchedCanMoveColumn(t, 'name', 'end'),
)
cmp(
	'[UNASSERTED] canMoveColumn(age, Start)',
	canMoveColumn(t, 'age', ColumnMoveDirection.Start),
	patchedCanMoveColumn(t, 'age', 'start'),
)

// ordering.test.ts:198 'is still bound by pin bands, header groups and locks'
let t2 = makeTable(
	[
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', pinning: 'start', visibility: { initialHidden: true } },
		{ accessorKey: 'age', header: 'Age', ordering: false },
	],
	{ pinning: true, visibility: true },
)
cmp(
	'ordering.test.ts:209 canMoveColumn(email, End, All)',
	canMoveColumn(t2, 'email', ColumnMoveDirection.End, ColumnMoveScope.All),
	patchedCanMoveColumn(t2, 'email', 'end', 'all'),
)
cmp(
	'ordering.test.ts:210 canMoveColumn(age, Start, All)',
	canMoveColumn(t2, 'age', ColumnMoveDirection.Start, ColumnMoveScope.All),
	patchedCanMoveColumn(t2, 'age', 'start', 'all'),
)
cmp(
	'ordering.test.ts:211 canMoveColumn(name, End, All)',
	canMoveColumn(t2, 'name', ColumnMoveDirection.End, ColumnMoveScope.All),
	patchedCanMoveColumn(t2, 'name', 'end', 'all'),
)

// row-ordering.test.ts:126 'does not move a row into a different pinning band'
type RR = { id: string; name: string }
const ROWS: RR[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]
const RF = tableFeatures({
	rowOrderingFeature,
	rowSortingFeature,
	rowPinningFeature,
	sortedRowModel: createSortedRowModel(),
})
const t3 = createTable({
	features: RF,
	data: ROWS,
	columns: createColumns<RR>([{ accessorKey: 'name', header: 'Name' }]),
	getRowId: (r) => r.id,
	ordering: { row: true },
	pinning: { row: { top: true, bottom: true } },
} as never) as Any
t3.getRow('a').pin('top', false, false)
console.log(
	'row fixture',
	t3.getRowModel().rows.map((r: Any) => r.id + ':' + String(r.getIsPinned())),
)
cmp(
	'row-ordering.test.ts:131 canMoveRow(b, Up)',
	canMoveRow(t3, 'b', RowMoveDirection.Up),
	patchedCanMoveRow(t3, 'b', 'up'),
)
cmp(
	'row-ordering.test.ts:132 canMoveRow(b, Down)',
	canMoveRow(t3, 'b', RowMoveDirection.Down),
	patchedCanMoveRow(t3, 'b', 'down'),
)

// the middle-pinned case HIGH 1 is about
const t4 = createTable({
	features: RF,
	data: ROWS,
	columns: createColumns<RR>([{ accessorKey: 'name', header: 'Name' }]),
	getRowId: (r) => r.id,
	ordering: { row: true },
	pinning: { row: { top: true, bottom: true } },
} as never) as Any
t4.getRow('b').pin('top', false, false)
cmp(
	'[UNASSERTED] canMoveRow(a, Down) with b pinned',
	canMoveRow(t4, 'a', RowMoveDirection.Down),
	patchedCanMoveRow(t4, 'a', 'down'),
)
cmp(
	'[UNASSERTED] canMoveRow(c, Up) with b pinned',
	canMoveRow(t4, 'c', RowMoveDirection.Up),
	patchedCanMoveRow(t4, 'c', 'up'),
)
