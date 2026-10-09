import {
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	tableFeatures,
} from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { canDropColumn, dropColumn } from '@ez-kit/data-grid-core/src/features/ordering/drop'
import {
	canMoveColumn,
	moveColumn,
	ColumnMoveDirection,
	ColumnMoveScope,
} from '@ez-kit/data-grid-core/src/features/ordering/ordering'
type Any = Record<string, any>
type R = { a: string; b: string; c: string; d: string; e: string }
const F = tableFeatures({ columnOrderingFeature, columnPinningFeature, columnVisibilityFeature })
const D = [{ a: '', b: '', c: '', d: '', e: '' }] as R[]
const mk = (cols: any, cfg: Any = {}) =>
	createTable({ features: F, data: D, columns: createColumns<R>(cols), ordering: true, ...cfg } as never) as Any

// Does ONE drop equal N successive steps, when skipped items lie between?
// Simulate N steps on a fake table view over a mutable id list, reusing the real moveColumn
// by rebuilding a table with columnOrder set each time.
function nSteps(cols: any, cfg: Any, s: string, dir: any, scope: any, n: number) {
	let order: string[] | null = null
	for (let k = 0; k < n; k++) {
		const t = mk(cols, order ? { ...cfg, initialState: { ...(cfg.initialState ?? {}), columnOrder: order } } : cfg)
		if (!canMoveColumn(t, s, dir, scope)) return { order, stoppedAt: k }
		order = moveColumn(t, s, dir, scope)
	}
	return { order, stoppedAt: n }
}

const cases: [string, any, Any, any][] = [
	[
		'hidden between',
		[
			{ accessorKey: 'a' },
			{ accessorKey: 'b', visibility: { initialHidden: true } },
			{ accessorKey: 'c' },
			{ accessorKey: 'd' },
			{ accessorKey: 'e' },
		],
		{ visibility: true },
		ColumnMoveScope.Visible,
	],
	[
		'pinned between',
		[
			{ accessorKey: 'a' },
			{ accessorKey: 'b', pinning: 'start' },
			{ accessorKey: 'c' },
			{ accessorKey: 'd' },
			{ accessorKey: 'e' },
		],
		{ pinning: true },
		ColumnMoveScope.Visible,
	],
	[
		'two pinned between',
		[
			{ accessorKey: 'a' },
			{ accessorKey: 'b', pinning: 'start' },
			{ accessorKey: 'c', pinning: 'end' },
			{ accessorKey: 'd' },
			{ accessorKey: 'e' },
		],
		{ pinning: true },
		ColumnMoveScope.Visible,
	],
	[
		'plain',
		[{ accessorKey: 'a' }, { accessorKey: 'b' }, { accessorKey: 'c' }, { accessorKey: 'd' }, { accessorKey: 'e' }],
		{},
		ColumnMoveScope.Visible,
	],
]
for (const [label, cols, cfg, scope] of cases) {
	const t0 = mk(cols, cfg)
	const ids: string[] = t0.getAllLeafColumns().map((c: Any) => c.id)
	console.log('--- ' + label + ' [' + ids.join(',') + ']')
	for (const s of ids)
		for (const tg of ids) {
			if (s === tg) continue
			if (!canDropColumn(t0, s, tg, scope)) continue
			const one = dropColumn(t0, s, tg, scope)
			// count how many eligible steps it takes for s to pass tg
			const dir = ids.indexOf(s) < ids.indexOf(tg) ? ColumnMoveDirection.End : ColumnMoveDirection.Start
			// step until s sits on tg's original side
			let order: string[] = ids.slice()
			let k = 0
			for (; k < 10; k++) {
				const t = mk(cols, { ...cfg, initialState: { ...(cfg.initialState ?? {}), columnOrder: order } })
				const oi = order.indexOf(s),
					ti = order.indexOf(tg)
				if (dir === ColumnMoveDirection.End ? oi > ti : oi < ti) break
				if (!canMoveColumn(t, s, dir, scope)) {
					k = -1
					break
				}
				order = moveColumn(t, s, dir, scope)
			}
			const agree = k >= 0 && JSON.stringify(order) === JSON.stringify(one)
			console.log(
				(agree ? '  ok   ' : '  *** MISMATCH ') +
					s +
					'->' +
					tg +
					'  1drop=' +
					one.join('') +
					'  ' +
					(k < 0 ? 'steps=BLOCKED' : k + 'steps=' + order.join('')),
			)
		}
}
