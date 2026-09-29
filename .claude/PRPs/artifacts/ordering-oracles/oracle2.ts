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
	isReachableByStepping,
	ColumnMoveDirection,
	ColumnMoveScope,
} from '@ez-kit/data-grid-core/src/features/ordering/ordering'
type Any = Record<string, any>
type R = { a: string; b: string; c: string; d: string; e: string }
const F = tableFeatures({ columnOrderingFeature, columnPinningFeature, columnVisibilityFeature, rowSelectionFeature })
const D = [{ a: '', b: '', c: '', d: '', e: '' }] as R[]
let failures = 0
const fail = (m: string) => {
	failures++
	console.log('  *** ' + m)
}
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
/** ORACLE: the ids the source actually LANDS ON over repeated real stepping. Step API only. */
function landedOn(cols: any, cfg: Any, scope: any, start: string[], s: string): Set<string> {
	const out = new Set<string>()
	for (const dir of [ColumnMoveDirection.Start, ColumnMoveDirection.End]) {
		let order = start.slice()
		for (let hop = 0; hop < 20; hop++) {
			const t = mk(cols, cfg, order)
			if (!canMoveColumn(t, s, dir, scope)) break
			const next = moveColumn(t, s, dir, scope)
			const si = next.indexOf(s)
			const tgt = dir === ColumnMoveDirection.End ? next[si - 1] : next[si + 1]
			if (tgt === undefined) break
			out.add(tgt)
			order = next
		}
	}
	return out
}
function audit(label: string, cols: any, cfg: Any, scope: any) {
	const t0 = mk(cols, cfg)
	const ids: string[] = t0.getAllLeafColumns().map((c: Any) => c.id)
	for (const s of ids) {
		const oracle = landedOn(cols, cfg, scope, ids, s)
		const impl = new Set(ids.filter((tg) => canDropColumn(t0, s, tg, scope)))
		const onlyOracle = [...oracle].filter((x) => !impl.has(x))
		const onlyImpl = [...impl].filter((x) => !oracle.has(x))
		if (onlyOracle.length)
			fail(label + '/' + scope + ' STEPS LAND ON IT, DROP REFUSES: ' + s + ' -> ' + onlyOracle.join(','))
		if (onlyImpl.length)
			fail(label + '/' + scope + ' DROP ALLOWS, STEPS NEVER LAND: ' + s + ' -> ' + onlyImpl.join(','))
		for (const tg of oracle) {
			if (!impl.has(tg)) continue
			// the drop must equal the order after stepping s exactly up to and onto tg
			let order = ids.slice()
			const dir = ids.indexOf(s) < ids.indexOf(tg) ? ColumnMoveDirection.End : ColumnMoveDirection.Start
			for (let hop = 0; hop < 20; hop++) {
				const t = mk(cols, cfg, order)
				if (!canMoveColumn(t, s, dir, scope)) break
				const next = moveColumn(t, s, dir, scope)
				const si = next.indexOf(s)
				const landed = dir === ColumnMoveDirection.End ? next[si - 1] : next[si + 1]
				order = next
				if (landed === tg) break
			}
			if (dropColumn(t0, s, tg, scope).join('|') !== order.join('|'))
				fail(
					label +
						'/' +
						scope +
						' ORDER MISMATCH ' +
						s +
						'->' +
						tg +
						' steps=' +
						order.join('') +
						' drop=' +
						dropColumn(t0, s, tg, scope).join(''),
				)
		}
	}
	console.log('  audited ' + label + '/' + scope + ' [' + ids.join(',') + ']')
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
		'two-pinned-middle',
		[
			C({ k: 'a', x: {} }),
			C({ k: 'b', x: { pinning: 'start' } }),
			C({ k: 'c', x: { pinning: 'end' } }),
			C({ k: 'd', x: {} }),
			C({ k: 'e', x: {} }),
		],
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
		'two-hidden',
		[
			C({ k: 'a', x: {} }),
			C({ k: 'b', x: { visibility: { initialHidden: true } } }),
			C({ k: 'c', x: { visibility: { initialHidden: true } } }),
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
	[
		'group+pin',
		[
			{
				id: 'G1',
				header: 'G1',
				columns: [C({ k: 'a', x: {} }), C({ k: 'b', x: { pinning: 'start' } }), C({ k: 'c', x: {} })],
			},
			{ id: 'G2', header: 'G2', columns: [C({ k: 'd', x: {} })] },
		],
		{ pinning: true },
	],
	['selection', ['a', 'b', 'c', 'd'].map((k) => C({ k, x: {} })), { selection: true }],
]
for (const [l, c, g] of FIX) for (const sc of [ColumnMoveScope.Visible, ColumnMoveScope.All]) audit(l, c, g, sc)
console.log(failures === 0 ? 'SET-EQUALITY ORACLE: all hold\n' : 'SET-EQUALITY ORACLE: ' + failures + ' FAILURES\n')

// ===== Q1 bounds / termination of isReachableByStepping =====
const t = mk(
	['a', 'b', 'c', 'd', 'e'].map((k) => C({ k, x: {} })),
	{},
)
const cols = t.getAllLeafColumns()
const one = mk([C({ k: 'a', x: {} })], {}).getAllLeafColumns()
const guard = (l: string, f: () => unknown) => {
	const to = setTimeout(() => {
		console.log('*** ' + l + ' HUNG')
		process.exit(1)
	}, 3000)
	try {
		console.log('  ' + l + ' = ' + JSON.stringify(f()))
	} catch (e) {
		console.log('  ' + l + ' THREW ' + (e as Error).message)
	}
	clearTimeout(to)
}
const V = ColumnMoveScope.Visible
guard('target after source (0->4)', () => isReachableByStepping(cols, 0, 4, V))
guard('target before source (4->0)', () => isReachableByStepping(cols, 4, 0, V))
guard('same index (2->2)', () => isReachableByStepping(cols, 2, 2, V))
guard('source at end (4->3)', () => isReachableByStepping(cols, 4, 3, V))
guard('source at start (0->1)', () => isReachableByStepping(cols, 0, 1, V))
guard('one-column list (0->0)', () => isReachableByStepping(one, 0, 0, V))
guard('empty list (0->1)', () => isReachableByStepping([], 0, 1, V))
guard('source index invalid (-3)', () => isReachableByStepping(cols, -3, 2, V))
guard('source index past end (99)', () => isReachableByStepping(cols, 99, 2, V))
guard('target index invalid (-1) !!', () => isReachableByStepping(cols, 2, -1, V))
guard('target index past end (99)', () => isReachableByStepping(cols, 0, 99, V))
guard('both invalid (-5 -> -1)', () => isReachableByStepping(cols, -5, -1, V))
guard('fractional source (1.5)', () => isReachableByStepping(cols, 1.5, 3, V))
guard('NaN target', () => isReachableByStepping(cols, 0, NaN, V))

// every candidate skipped: all others in a foreign band
const allPinned = mk(
	[
		C({ k: 'a', x: {} }),
		C({ k: 'b', x: { pinning: 'start' } }),
		C({ k: 'c', x: { pinning: 'start' } }),
		C({ k: 'd', x: { pinning: 'end' } }),
	],
	{ pinning: true },
)
const ap = allPinned.getAllLeafColumns()
console.log('  all-others-foreign leaves', ap.map((c: Any) => c.id + ':' + String(c.getIsPinned())).join(' '))
guard('every candidate skipped, forward', () => isReachableByStepping(ap, 0, 3, V))
guard('every candidate skipped, backward', () => isReachableByStepping(ap, 3, 0, V))

// ===== Q2 specific list =====
const hid = mk(
	[
		C({ k: 'a', x: {} }),
		C({ k: 'b', x: { visibility: { initialHidden: true } } }),
		C({ k: 'c', x: {} }),
		C({ k: 'd', x: {} }),
	],
	{ visibility: true },
)
console.log(
	'Q2 target hidden under All  (a->b) =',
	canDropColumn(hid, 'a', 'b', ColumnMoveScope.All),
	' order',
	dropColumn(hid, 'a', 'b', ColumnMoveScope.All).join(''),
)
console.log('Q2 target hidden under Vis  (a->b) =', canDropColumn(hid, 'a', 'b', V))
console.log(
	'Q2 source hidden under Vis  (b->c) =',
	canDropColumn(hid, 'b', 'c', V),
	' order',
	dropColumn(hid, 'b', 'c', V).join(''),
)
console.log(
	'Q2 source hidden under Vis  (b->d) =',
	canDropColumn(hid, 'b', 'd', V),
	' order',
	dropColumn(hid, 'b', 'd', V).join(''),
)
const pin = mk(
	[C({ k: 'a', x: {} }), C({ k: 'b', x: { pinning: 'start' } }), C({ k: 'c', x: {} }), C({ k: 'd', x: {} })],
	{ pinning: true },
)
console.log('Q2 target other band (a->b) =', canDropColumn(pin, 'a', 'b', V), '(expect false)')
console.log(
	'Q2 adjacent same band (a->c) =',
	canDropColumn(pin, 'a', 'c', V),
	' order',
	dropColumn(pin, 'a', 'c', V).join(','),
)
const grp = mk(
	[
		{ id: 'G1', header: 'G1', columns: [C({ k: 'a', x: {} }), C({ k: 'b', x: {} })] },
		{ id: 'G2', header: 'G2', columns: [C({ k: 'c', x: {} }), C({ k: 'd', x: {} })] },
	],
	{},
)
console.log('Q2 first leaf of sibling group (b->c) =', canDropColumn(grp, 'b', 'c', V), '(expect false)')
console.log(
	'Q2 within group (a->b) =',
	canDropColumn(grp, 'a', 'b', V),
	' order',
	dropColumn(grp, 'a', 'b', V).join(''),
)

// ===== Q2b scope monotonicity: is All ever STRICTER than Visible? =====
for (const [l, c, g] of FIX) {
	const tv = mk(c, g)
	const ids: string[] = tv.getAllLeafColumns().map((x: Any) => x.id)
	for (const s of ids)
		for (const tg of ids) {
			const v = canDropColumn(tv, s, tg, V),
				a = canDropColumn(tv, s, tg, ColumnMoveScope.All)
			if (v && !a) console.log('  NOTE ' + l + ': Visible allows but All refuses ' + s + '->' + tg)
		}
}
console.log(failures === 0 ? 'DONE clean' : 'DONE with ' + failures + ' failures')
