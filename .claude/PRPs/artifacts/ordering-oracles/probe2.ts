import { rowExpandingFeature, createExpandedRowModel, tableFeatures } from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { rowOrderingFeature } from '@ez-kit/data-grid-core/src/features/entry'
import { dropRow } from '@ez-kit/data-grid-core/src/features/ordering/drop'

type RR = { id: string; name: string }
const FIVE: RR[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id.toUpperCase() }))

function make(cfg: Record<string, unknown> = {}) {
	return createTable({
		features: tableFeatures({ rowOrderingFeature }),
		data: FIVE,
		columns: createColumns<RR>([{ accessorKey: 'name', header: 'Name' }]),
		getRowId: (r) => r.id,
		ordering: { row: true },
		...cfg,
	}) as never as {
		ordering: { dropRow: (a: string, b: string) => void; canDropRow: (a: string, b: string) => boolean }
		getState: () => { rowOrder: string[] }
	}
}

// F: multi-place uncontrolled row drop -> compare with column arrayMove result c2c3c4c1c5
let t = make()
t.ordering.dropRow('a', 'd')
console.log(
	'F uncontrolled dropRow(a,d) order =',
	(t as any).atoms.rowOrder.get().join(''),
	'(column axis gave c2c3c4c1c5 => bcdae)',
)
t = make()
t.ordering.dropRow('d', 'a')
console.log(
	'F uncontrolled dropRow(d,a) order =',
	(t as any).atoms.rowOrder.get().join(''),
	'(column axis gave c4c1c2c3c5 => dabce)',
)

// G: two successive drops - does the second undo the first?
t = make()
t.ordering.dropRow('a', 'd')
console.log('G after 1st', (t as any).atoms.rowOrder.get().join(''))
t.ordering.dropRow('a', 'b')
console.log('G after 2nd (a onto b)', (t as any).atoms.rowOrder.get().join(''))

// H: does the projection change anything but `direction`?
//   same table, rowOrder reversed, raw data unprojected
const t2 = createTable({
	features: tableFeatures({ rowOrderingFeature }),
	data: FIVE,
	columns: createColumns<RR>([{ accessorKey: 'name', header: 'Name' }]),
	getRowId: (r) => r.id,
	ordering: { row: true },
	initialState: { rowOrder: ['e', 'd', 'c', 'b', 'a'] },
})
console.log('H dropRow(a,c) with reversed rowOrder =', JSON.stringify(dropRow(t2, 'a', 'c')))
console.log('H dropRow(c,a) with reversed rowOrder =', JSON.stringify(dropRow(t2, 'c', 'a')))

// I: tree - is a drop refused where a step is refused, and allowed where a step is allowed?
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
	{ id: 'p2', name: 'P2', children: [{ id: 'c3', name: 'C3', children: [{ id: 'g1', name: 'G1' }] }] },
]
const t3 = createTable({
	features: tableFeatures({ rowOrderingFeature, rowExpandingFeature, expandedRowModel: createExpandedRowModel() }),
	data: TREE,
	columns: createColumns<Node>([{ accessorKey: 'name', header: 'Name' }]),
	getRowId: (r) => r.id,
	ordering: { row: { onChange: () => undefined } },
	expanding: { mode: 'tree', getSubRows: (r) => r.children },
})
t3.toggleAllRowsExpanded(true)
console.log(
	'I rendered',
	t3.getRowModel().rows.map((r) => r.id + '@' + r.depth),
)
for (const [s, tg] of [
	['p1', 'p2'],
	['c1', 'c2'],
	['c2', 'c3'],
	['c1', 'g1'],
	['p1', 'c3'],
	['c3', 'g1'],
	['p1', 'g1'],
]) {
	console.log('I dropRow(' + s + ',' + tg + ') =', JSON.stringify(dropRow(t3 as never, s!, tg!)))
}
