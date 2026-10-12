import {
	rowPinningFeature,
	rowExpandingFeature,
	createExpandedRowModel,
	columnFilteringFeature,
	createFilteredRowModel,
	filterFns,
	columnOrderingFeature,
	columnPinningFeature,
	rowSelectionFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { rowOrderingFeature } from '@ez-kit/data-grid-core/src/features/entry'
import { canDropRow, dropRow, canDropColumn, dropColumn } from '@ez-kit/data-grid-core/src/features/ordering/drop'
import { canMoveRow, moveRow, RowMoveDirection } from '@ez-kit/data-grid-core/src/features/ordering/row-ordering'
import { canMoveColumn, ColumnMoveDirection } from '@ez-kit/data-grid-core/src/features/ordering/ordering'
type Any = Record<string, any>
type N = { id: string; name: string; children?: N[] }

// 1) genuinely empty rendered model
const FF = tableFeatures({
	rowOrderingFeature,
	columnFilteringFeature,
	filteredRowModel: createFilteredRowModel(filterFns),
	filterFns,
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
console.log('1 rendered rows =', te.getRowModel().rows.length)
console.log('1 moveRow(a,Down) =', JSON.stringify(moveRow(te, 'a', RowMoveDirection.Down)))
console.log('1 dropRow(a,b)    =', JSON.stringify(dropRow(te, 'a', 'b')))

// 2) deep source, band-foreign shallow row with same-depth-as-source-minus-one children after it
const RF = tableFeatures({
	rowOrderingFeature,
	rowPinningFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})
const DEEP: N[] = [
	{
		id: 'p1',
		name: 'P1',
		children: [
			{
				id: 'c1',
				name: 'C1',
				children: [
					{ id: 'g1', name: 'G1' },
					{ id: 'g2', name: 'G2' },
				],
			},
		],
	},
	{ id: 'P', name: 'P', children: [{ id: 'pc', name: 'PC', children: [{ id: 'pg', name: 'PG' }] }] },
]
const t2 = createTable({
	features: RF,
	data: DEEP,
	columns: createColumns<N>([{ accessorKey: 'name', header: 'Name' }]),
	getRowId: (r) => r.id,
	ordering: { row: { onChange: () => undefined } },
	pinning: { row: { top: true, bottom: true } },
	expanding: { mode: 'tree', getSubRows: (r) => r.children },
} as never) as Any
t2.toggleAllRowsExpanded(true)
t2.getRow('P').pin('top', false, false)
console.log(
	'2',
	t2
		.getRowModel()
		.rows.map((r: Any) => r.id + '@' + r.depth + ':' + String(r.getIsPinned()))
		.join(' '),
)
for (const s of ['g2', 'g1', 'c1', 'p1', 'pc'])
	for (const d of [RowMoveDirection.Up, RowMoveDirection.Down]) {
		const m = moveRow(t2, s, d)
		console.log(
			'2 moveRow(' + s + ',' + d + ') =',
			m ? m.targetRowId : 'none',
			' canDropRow same pair =',
			m ? canDropRow(t2, s, m.targetRowId) : '-',
		)
	}
console.log('2 canDropRow(g2,pc) =', canDropRow(t2, 'g2', 'pc'), ' canDropRow(g2,pg) =', canDropRow(t2, 'g2', 'pg'))
console.log('2 canDropRow(p1,pc) =', canDropRow(t2, 'p1', 'pc'), ' canDropRow(p1,P) =', canDropRow(t2, 'p1', 'P'))

// 3) system column inside the same band as data columns?
type CR = { a: string; b: string; c: string }
const CF = tableFeatures({ columnOrderingFeature, columnPinningFeature, rowSelectionFeature })
for (const cfg of [{ selection: true }, { selection: true, pinning: true }, { rowActions: { items: [] } }]) {
	const t = createTable({
		features: CF,
		data: [{ a: '1', b: '2', c: '3' }] as CR[],
		columns: createColumns<CR>([{ accessorKey: 'a' }, { accessorKey: 'b' }, { accessorKey: 'c' }]),
		ordering: true,
		...cfg,
	} as never) as Any
	console.log(
		'3',
		JSON.stringify(cfg),
		t
			.getAllLeafColumns()
			.map((c: Any) => c.id + ':' + String(c.getIsPinned?.()))
			.join(' '),
	)
}

// 4) the LOCKED disagreement, in a table where the locked column is a plain data column
const t4 = createTable({
	features: CF,
	data: [{ a: '1', b: '2', c: '3' }] as CR[],
	columns: createColumns<CR>([{ accessorKey: 'a' }, { accessorKey: 'b', ordering: false }, { accessorKey: 'c' }]),
	ordering: true,
} as never) as Any
console.log(
	'4 leaves',
	t4.getAllLeafColumns().map((c: Any) => c.id),
)
console.log('4 canMoveColumn(a,End)  =', canMoveColumn(t4, 'a', ColumnMoveDirection.End))
console.log('4 canMoveColumn(c,Start)=', canMoveColumn(t4, 'c', ColumnMoveDirection.Start))
console.log('4 canDropColumn(a,c)    =', canDropColumn(t4, 'a', 'c'), dropColumn(t4, 'a', 'c'))
console.log('4 canDropColumn(c,a)    =', canDropColumn(t4, 'c', 'a'), dropColumn(t4, 'c', 'a'))
