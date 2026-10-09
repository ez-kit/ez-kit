import {
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	columnFilteringFeature,
	rowPinningFeature,
	rowSelectionFeature,
	rowExpandingFeature,
	createExpandedRowModel,
	createFilteredRowModel,
	filterFns,
	tableFeatures,
} from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { rowOrderingFeature } from '@ez-kit/data-grid-core/src/features/entry'
import { canDropColumn, dropColumn, canDropRow, dropRow } from '@ez-kit/data-grid-core/src/features/ordering/drop'
import {
	canMoveColumn,
	moveColumn,
	ColumnMoveDirection,
	ColumnMoveScope,
} from '@ez-kit/data-grid-core/src/features/ordering/ordering'
import { canMoveRow, moveRow, RowMoveDirection } from '@ez-kit/data-grid-core/src/features/ordering/row-ordering'
type Any = Record<string, any>

// ===== COLUMN AXIS: exhaustive step<->drop cross-check =====
type Row = { a: string; b: string; c: string; d: string }
const DATA = [{ a: '1', b: '2', c: '3', d: '4' }] as Row[]
const F = tableFeatures({ columnOrderingFeature, columnPinningFeature, columnVisibilityFeature, rowSelectionFeature })
function colTable(columns: any, config: Any = {}) {
	return createTable({
		features: F,
		data: DATA,
		columns: createColumns<Row>(columns),
		ordering: true,
		...config,
	} as never) as Any
}
function sweepColumns(label: string, t: Any, scope: any) {
	const cols = t.getAllLeafColumns()
	const ids: string[] = cols.map((c: Any) => c.id)
	// step-allows => drop must allow the same pair
	for (const s of ids) {
		for (const dir of [ColumnMoveDirection.Start, ColumnMoveDirection.End]) {
			if (!canMoveColumn(t, s, dir, scope)) continue
			const stepped = moveColumn(t, s, dir, scope)
			// the target is the id that ended up adjacent: recover it from the step result
			const before = ids.slice()
			const after = stepped
			const si = after.indexOf(s)
			const tgt = dir === ColumnMoveDirection.End ? after[si - 1] : after[si + 1]
			const ok = tgt !== undefined && canDropColumn(t, s, tgt, scope)
			const same = tgt !== undefined && JSON.stringify(dropColumn(t, s, tgt, scope)) === JSON.stringify(stepped)
			if (!ok || !same)
				console.log(
					'*** ' +
						label +
						' step allows but drop ' +
						(!ok ? 'REFUSES' : 'DIFFERS') +
						': ' +
						s +
						' ' +
						dir +
						' -> ' +
						tgt +
						' step=' +
						before.join('') +
						'=>' +
						stepped.join(''),
				)
		}
	}
	// drop-allows on an ADJACENT-eligible pair => step must allow
	for (const s of ids) {
		for (const dir of [ColumnMoveDirection.Start, ColumnMoveDirection.End]) {
			for (const tg of ids) {
				if (!canDropColumn(t, s, tg, scope)) continue
				const dropped = dropColumn(t, s, tg, scope)
				// is this drop one that a step in `dir` would also have produced?
				const stepped = canMoveColumn(t, s, dir, scope) ? moveColumn(t, s, dir, scope) : null
				if (stepped && JSON.stringify(stepped) === JSON.stringify(dropped)) continue
				// one-place drop with no matching step = the disagreement we hunt
				const si = ids.indexOf(s),
					ti = ids.indexOf(tg)
				if (
					Math.abs(si - ti) === 1 &&
					!canMoveColumn(t, s, si < ti ? ColumnMoveDirection.End : ColumnMoveDirection.Start, scope)
				) {
					console.log(
						'*** ' +
							label +
							' DROP ALLOWS, STEP REFUSES (adjacent): ' +
							s +
							'->' +
							tg +
							'  ' +
							ids.join('') +
							' => ' +
							dropped.join(''),
					)
				}
			}
		}
	}
	console.log('swept ' + label + ' [' + ids.join(',') + ']')
}

sweepColumns(
	'flat',
	colTable([{ accessorKey: 'a' }, { accessorKey: 'b' }, { accessorKey: 'c' }, { accessorKey: 'd' }]),
	ColumnMoveScope.Visible,
)
sweepColumns(
	'pinned-middle',
	colTable([{ accessorKey: 'a' }, { accessorKey: 'b', pinning: 'start' }, { accessorKey: 'c' }, { accessorKey: 'd' }], {
		pinning: true,
	}),
	ColumnMoveScope.Visible,
)
sweepColumns(
	'LOCKED-middle',
	colTable([{ accessorKey: 'a' }, { accessorKey: 'b', ordering: false }, { accessorKey: 'c' }, { accessorKey: 'd' }]),
	ColumnMoveScope.Visible,
)
sweepColumns(
	'hidden-middle',
	colTable(
		[
			{ accessorKey: 'a' },
			{ accessorKey: 'b', visibility: { initialHidden: true } },
			{ accessorKey: 'c' },
			{ accessorKey: 'd' },
		],
		{ visibility: true },
	),
	ColumnMoveScope.Visible,
)
sweepColumns(
	'hidden-middle-All',
	colTable(
		[
			{ accessorKey: 'a' },
			{ accessorKey: 'b', visibility: { initialHidden: true } },
			{ accessorKey: 'c' },
			{ accessorKey: 'd' },
		],
		{ visibility: true },
	),
	ColumnMoveScope.All,
)
sweepColumns(
	'groups',
	colTable([
		{ id: 'G1', header: 'G1', columns: [{ accessorKey: 'a' }, { accessorKey: 'b' }] },
		{ id: 'G2', header: 'G2', columns: [{ accessorKey: 'c' }, { accessorKey: 'd' }] },
	]),
	ColumnMoveScope.Visible,
)
sweepColumns(
	'group-with-pinned-leaf',
	colTable(
		[
			{
				id: 'G1',
				header: 'G1',
				columns: [{ accessorKey: 'a' }, { accessorKey: 'b', pinning: 'start' }, { accessorKey: 'c' }],
			},
			{ id: 'G2', header: 'G2', columns: [{ accessorKey: 'd' }] },
		],
		{ pinning: true },
	),
	ColumnMoveScope.Visible,
)

// the headline LOCKED case, spelled out
const tl = colTable([
	{ accessorKey: 'a' },
	{ accessorKey: 'b', ordering: false },
	{ accessorKey: 'c' },
	{ accessorKey: 'd' },
])
console.log(
	'LOCKED leaves',
	tl.getAllLeafColumns().map((c: Any) => c.id),
)
console.log('LOCKED canMoveColumn(a,End) =', canMoveColumn(tl, 'a', ColumnMoveDirection.End))
console.log('LOCKED canDropColumn(a,c)   =', canDropColumn(tl, 'a', 'c'))
console.log('LOCKED dropColumn(a,c)      =', dropColumn(tl, 'a', 'c'))
console.log('LOCKED canMoveColumn(c,Start)=', canMoveColumn(tl, 'c', ColumnMoveDirection.Start))
console.log('LOCKED canDropColumn(c,a)   =', canDropColumn(tl, 'c', 'a'), dropColumn(tl, 'c', 'a'))
