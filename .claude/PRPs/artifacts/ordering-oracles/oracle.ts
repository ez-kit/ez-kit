import {
	columnOrderingFeature,
	columnPinningFeature,
	columnVisibilityFeature,
	rowSelectionFeature,
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
const F = tableFeatures({ columnOrderingFeature, columnPinningFeature, columnVisibilityFeature, rowSelectionFeature })
const D = [{ a: '', b: '', c: '', d: '', e: '' }] as R[]

let failures = 0
function fail(msg: string) {
	failures++
	console.log('  *** ' + msg)
}

/** Build a table whose leaf order is exactly `order` (or the declared order when omitted). */
function mk(cols: any, cfg: Any, order?: string[]): Any {
	const initialState = { ...(cfg.initialState ?? {}), ...(order ? { columnOrder: order } : {}) }
	return createTable({
		features: F,
		data: D,
		columns: createColumns<R>(cols),
		ordering: true,
		...cfg,
		initialState,
	} as never) as Any
}

/**
 * ORACLE — BFS over every order reachable from the start by one legal `moveColumn` step.
 * Uses ONLY the step API. Never calls canDropColumn / dropColumn / isReachableByStepping.
 */
function reachableOrders(cols: any, cfg: Any, scope: any, start: string[]): Set<string> {
	const seen = new Set<string>([start.join('|')])
	const queue: string[][] = [start]
	while (queue.length) {
		const order = queue.shift()!
		const t = mk(cols, cfg, order)
		for (const id of order) {
			for (const dir of [ColumnMoveDirection.Start, ColumnMoveDirection.End]) {
				if (!canMoveColumn(t, id, dir, scope)) continue
				const next = moveColumn(t, id, dir, scope)
				const key = next.join('|')
				if (seen.has(key)) continue
				seen.add(key)
				queue.push(next)
			}
		}
	}
	return seen
}

function audit(label: string, cols: any, cfg: Any, scope: any) {
	const t0 = mk(cols, cfg)
	const ids: string[] = t0.getAllLeafColumns().map((c: Any) => c.id)
	const reach = reachableOrders(cols, cfg, scope, ids)
	console.log('--- ' + label + ' [' + ids.join(',') + '] scope=' + scope + '  reachable orders=' + reach.size)

	// (A) every legal drop must produce an order the step path can reach
	for (const s of ids)
		for (const tg of ids) {
			if (!canDropColumn(t0, s, tg, scope)) continue
			const got = dropColumn(t0, s, tg, scope).join('|')
			if (!reach.has(got)) fail('DROP PRODUCES UNREACHABLE ORDER: ' + s + '->' + tg + ' => ' + got.replace(/\|/g, ''))
		}
	// (B) every one-hop step must be an available drop onto the same target, with the same order
	for (const s of ids)
		for (const dir of [ColumnMoveDirection.Start, ColumnMoveDirection.End]) {
			if (!canMoveColumn(t0, s, dir, scope)) continue
			const stepped = moveColumn(t0, s, dir, scope)
			const si = stepped.indexOf(s)
			const tgt = dir === ColumnMoveDirection.End ? stepped[si - 1] : stepped[si + 1]
			if (tgt === undefined) {
				fail('cannot recover step target for ' + s + ' ' + dir)
				continue
			}
			if (!canDropColumn(t0, s, tgt, scope)) fail('STEP ALLOWS, DROP REFUSES: ' + s + ' ' + dir + ' -> ' + tgt)
			else if (dropColumn(t0, s, tgt, scope).join('|') !== stepped.join('|'))
				fail(
					'STEP/DROP DIFFER: ' +
						s +
						'->' +
						tgt +
						' step=' +
						stepped.join('') +
						' drop=' +
						dropColumn(t0, s, tgt, scope).join(''),
				)
		}
	// (C) a refused drop must leave the order untouched
	for (const s of ids)
		for (const tg of ids) {
			if (canDropColumn(t0, s, tg, scope)) continue
			if (dropColumn(t0, s, tg, scope).join('|') !== ids.join('|')) fail('REFUSED DROP MUTATED ORDER: ' + s + '->' + tg)
		}
	// (D) every drop the ORACLE says is a legal repeated-step outcome must be an available drop.
	//     For each target, the minimal repeated-step order that carries s past tg.
	for (const s of ids)
		for (const tg of ids) {
			if (s === tg) continue
			let order = ids.slice()
			let hops = 0
			let blocked = false
			const dir = ids.indexOf(s) < ids.indexOf(tg) ? ColumnMoveDirection.End : ColumnMoveDirection.Start
			for (;;) {
				const oi = order.indexOf(s),
					ti = order.indexOf(tg)
				if (dir === ColumnMoveDirection.End ? oi > ti : oi < ti) break
				const t = mk(cols, cfg, order)
				if (!canMoveColumn(t, s, dir, scope)) {
					blocked = true
					break
				}
				order = moveColumn(t, s, dir, scope)
				hops++
				if (hops > 12) {
					blocked = true
					break
				}
			}
			const dropOk = canDropColumn(t0, s, tg, scope)
			if (!blocked && !dropOk)
				fail('STEPS REACH IT IN ' + hops + ' HOPS, DROP REFUSES: ' + s + '->' + tg + ' stepped=' + order.join(''))
			if (!blocked && dropOk && dropColumn(t0, s, tg, scope).join('|') !== order.join('|'))
				fail(
					'MULTI-HOP MISMATCH: ' +
						s +
						'->' +
						tg +
						' steps=' +
						order.join('') +
						' drop=' +
						dropColumn(t0, s, tg, scope).join(''),
				)
			if (blocked && dropOk)
				fail('STEPS CANNOT REACH IT, DROP ALLOWS: ' + s + '->' + tg + ' => ' + dropColumn(t0, s, tg, scope).join(''))
		}
}

const C = (o: Any) => ({ accessorKey: o.k, header: o.k.toUpperCase(), ...o.x })
const FIX: [string, any, Any][] = [
	['plain', ['a', 'b', 'c', 'd', 'e'].map((k) => C({ k, x: {} })), {}],
	[
		'locked-middle',
		[C({ k: 'a', x: {} }), C({ k: 'b', x: { ordering: false } }), C({ k: 'c', x: {} }), C({ k: 'd', x: {} })],
		{},
	],
	[
		'locked-two',
		[
			C({ k: 'a', x: {} }),
			C({ k: 'b', x: { ordering: false } }),
			C({ k: 'c', x: {} }),
			C({ k: 'd', x: { ordering: false } }),
			C({ k: 'e', x: {} }),
		],
		{},
	],
	[
		'pinned-middle',
		[C({ k: 'a', x: {} }), C({ k: 'b', x: { pinning: 'start' } }), C({ k: 'c', x: {} }), C({ k: 'd', x: {} })],
		{ pinning: true },
	],
	[
		'pinned+locked',
		[
			C({ k: 'a', x: {} }),
			C({ k: 'b', x: { pinning: 'start' } }),
			C({ k: 'c', x: { ordering: false } }),
			C({ k: 'd', x: {} }),
		],
		{ pinning: true },
	],
	[
		'hidden-middle',
		[
			C({ k: 'a', x: {} }),
			C({ k: 'b', x: { visibility: { initialHidden: true } } }),
			C({ k: 'c', x: {} }),
			C({ k: 'd', x: {} }),
		],
		{ visibility: true },
	],
	[
		'hidden+locked',
		[
			C({ k: 'a', x: {} }),
			C({ k: 'b', x: { ordering: false, visibility: { initialHidden: true } } }),
			C({ k: 'c', x: {} }),
			C({ k: 'd', x: {} }),
		],
		{ visibility: true },
	],
	[
		'groups',
		[
			{ id: 'G1', header: 'G1', columns: [C({ k: 'a', x: {} }), C({ k: 'b', x: {} })] },
			{ id: 'G2', header: 'G2', columns: [C({ k: 'c', x: {} }), C({ k: 'd', x: {} })] },
		],
		{},
	],
	[
		'group+lock',
		[
			{
				id: 'G1',
				header: 'G1',
				columns: [C({ k: 'a', x: {} }), C({ k: 'b', x: { ordering: false } }), C({ k: 'c', x: {} })],
			},
			{ id: 'G2', header: 'G2', columns: [C({ k: 'd', x: {} })] },
		],
		{},
	],
	['selection', ['a', 'b', 'c', 'd'].map((k) => C({ k, x: {} })), { selection: true }],
]
for (const [label, cols, cfg] of FIX) {
	for (const scope of [ColumnMoveScope.Visible, ColumnMoveScope.All]) audit(label, cols, cfg, scope)
}
console.log(failures === 0 ? '\nORACLE: all invariants hold' : '\nORACLE: ' + failures + ' FAILURES')
