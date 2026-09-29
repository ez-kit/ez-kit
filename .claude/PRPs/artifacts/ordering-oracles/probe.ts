import {
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowPinningFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { rowOrderingFeature } from '@ez-kit/data-grid-core/src/features/entry'
import { canDropColumn, dropColumn, canDropRow, dropRow } from '@ez-kit/data-grid-core/src/features/ordering/drop'
import { canMoveColumn, moveColumn, ColumnMoveDirection } from '@ez-kit/data-grid-core/src/features/ordering/ordering'
import { canMoveRow, moveRow, RowMoveDirection } from '@ez-kit/data-grid-core/src/features/ordering/row-ordering'

const F = tableFeatures({ columnOrderingFeature, columnPinningFeature, columnVisibilityFeature })
type R = { name: string; email: string; age: number }
const DATA: R[] = [{ name: 'a', email: 'b', age: 1 }]

// --- PROBE A: pinned MIDDLE column. step refuses, drop allows?
const t = createTable({
	features: F,
	data: DATA,
	columns: createColumns<R>([
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', pinning: 'start' },
		{ accessorKey: 'age', header: 'Age' },
	]),
	ordering: true,
	pinning: true,
})
console.log(
	'A order',
	t.getAllLeafColumns().map((c) => c.id),
)
console.log(
	'A bands',
	t.getAllLeafColumns().map((c) => String(c.getIsPinned())),
)
console.log('A canMoveColumn(name, End)  =', canMoveColumn(t, 'name', ColumnMoveDirection.End))
console.log('A canMoveColumn(age, Start) =', canMoveColumn(t, 'age', ColumnMoveDirection.Start))
console.log('A canDropColumn(name, age)  =', canDropColumn(t, 'name', 'age'))
console.log('A dropColumn(name, age)     =', dropColumn(t, 'name', 'age'))

// --- PROBE B: hidden middle column - step skips it, drop should agree
const t2 = createTable({
	features: F,
	data: DATA,
	columns: createColumns<R>([
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', visibility: { initialHidden: true } },
		{ accessorKey: 'age', header: 'Age' },
	]),
	ordering: true,
	visibility: true,
})
console.log('B moveColumn(name, End) =', moveColumn(t2, 'name', ColumnMoveDirection.End))
console.log('B dropColumn(name, age) =', dropColumn(t2, 'name', 'age'))

// --- PROBE C: one-step agreement, all pairs, 5 flat columns
type W = { c1: string; c2: string; c3: string; c4: string; c5: string }
const t3 = createTable({
	features: F,
	data: [{ c1: '', c2: '', c3: '', c4: '', c5: '' }] as W[],
	columns: createColumns<W>(
		[1, 2, 3, 4, 5].map((n) => ({ accessorKey: ('c' + n) as keyof W & string, header: 'C' + n })) as never,
	),
	ordering: true,
})
const ids = t3.getAllLeafColumns().map((c) => c.id)
for (let i = 0; i < ids.length; i++) {
	for (const dir of [ColumnMoveDirection.Start, ColumnMoveDirection.End]) {
		const step = moveColumn(t3, ids[i]!, dir)
		const nb = dir === ColumnMoveDirection.Start ? ids[i - 1] : ids[i + 1]
		if (!nb) continue
		const drop = dropColumn(t3, ids[i]!, nb)
		const same = JSON.stringify(step) === JSON.stringify(drop)
		console.log('C', ids[i], dir, 'step', step.join(''), 'drop', drop.join(''), same ? 'AGREE' : '*** DISAGREE ***')
	}
}

// --- PROBE D: multi-place drop vs arrayMove convention
console.log('D dropColumn(c1,c4) =', dropColumn(t3, 'c1', 'c4').join(''))
console.log('D dropColumn(c4,c1) =', dropColumn(t3, 'c4', 'c1').join(''))
console.log('D dropColumn(c1,c2) =', dropColumn(t3, 'c1', 'c2').join(''))
console.log('D dropColumn(c2,c1) =', dropColumn(t3, 'c2', 'c1').join(''))

// --- PROBE E: pinned MIDDLE row. step refuses, drop allows?
type RR = { id: string; name: string }
const ROWS: RR[] = [
	{ id: 'a', name: 'A' },
	{ id: 'b', name: 'B' },
	{ id: 'c', name: 'C' },
]
const t4 = createTable({
	features: tableFeatures({ rowOrderingFeature, rowPinningFeature }),
	data: ROWS,
	columns: createColumns<RR>([{ accessorKey: 'name', header: 'Name' }]),
	getRowId: (r) => r.id,
	ordering: { row: true },
	pinning: { row: { top: true, bottom: true } },
})
t4.getRow('b').pin('top', false, false)
console.log(
	'E rendered',
	t4.getRowModel().rows.map((r) => r.id),
)
console.log(
	'E bands',
	t4.getRowModel().rows.map((r) => String(r.getIsPinned())),
)
console.log('E canMoveRow(a, Down) =', canMoveRow(t4, 'a', RowMoveDirection.Down))
console.log('E canMoveRow(c, Up)   =', canMoveRow(t4, 'c', RowMoveDirection.Up))
console.log('E canDropRow(a, c)    =', canDropRow(t4, 'a', 'c'))
console.log('E dropRow(a, c)       =', JSON.stringify(dropRow(t4, 'a', 'c')))
console.log('E moveRow(a, Down)    =', JSON.stringify(moveRow(t4, 'a', RowMoveDirection.Down)))
