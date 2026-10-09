import { rowPinningFeature, rowExpandingFeature, createExpandedRowModel, tableFeatures } from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { applyRowOrder } from '@ez-kit/data-grid-core/src/features/ordering/apply-row-order'
import { canDropRow, dropRow } from '@ez-kit/data-grid-core/src/features/ordering/drop'
import {
	applyRowMove,
	moveRow,
	isRowReachableByStepping,
	RowMoveDirection,
} from '@ez-kit/data-grid-core/src/features/ordering/row-ordering'
import { rowOrderingFeature } from '@ez-kit/data-grid-core/src/features/entry'
type Any = Record<string, any>
type N = { id: string; name: string; children?: N[] }
const RF = tableFeatures({
	rowOrderingFeature,
	rowPinningFeature,
	rowExpandingFeature,
	expandedRowModel: createExpandedRowModel(),
})
let failures = 0
const fail = (m: string) => {
	failures++
	console.log('  *** ' + m)
}

function mk(data: N[], pins: [string, 'top' | 'bottom'][], rowOrder: string[] | undefined, expand: boolean): Any {
	const t = createTable({
		features: RF,
		data,
		columns: createColumns<N>([{ accessorKey: 'name', header: 'Name' }]),
		getRowId: (r) => r.id,
		// controlled, so the pure helpers are reachable for sub-rows too and nothing writes the slice
		ordering: { row: { onChange: () => undefined } },
		pinning: { row: { top: true, bottom: true } },
		expanding: { mode: 'tree', getSubRows: (r) => r.children },
		...(rowOrder ? { initialState: { rowOrder } } : {}),
	} as never) as Any
	if (expand) t.toggleAllRowsExpanded(true)
	for (const [id, side] of pins) t.getRow(id).pin(side, false, false)
	return t
}
/** The projected rendered list, exactly as both helpers compute it. */
const projected = (t: Any): string[] =>
	applyRowOrder(t.getRowModel().rows, t.atoms.rowOrder.get(), (r: Any) => r.id).map((r: Any) => r.id)
/** Every row the table holds, for applyRowMove to operate over. */
const coreOrder = (t: Any, ro: string[]): string[] =>
	applyRowOrder(
		t.getCoreRowModel().rows.map((r: Any) => r.id),
		ro,
		(id: string) => id,
	)

/**
 * ORACLE — the ids the source actually LANDS ON over repeated real stepping.
 * Drives the step producer (`moveRow`) and commits with `applyRowMove`, rebuilding the table each
 * hop so the next step sees the real new arrangement. Never calls dropRow / canDropRow /
 * isRowReachableByStepping.
 */
function landedOn(data: N[], pins: any, seed: string[] | undefined, expand: boolean, s: string): Set<string> {
	const out = new Set<string>()
	for (const dir of [RowMoveDirection.Up, RowMoveDirection.Down]) {
		let ro = seed ? seed.slice() : undefined
		for (let hop = 0; hop < 25; hop++) {
			const t = mk(data, pins, ro, expand)
			const m = moveRow(t, s, dir)
			if (!m) break
			out.add(m.targetRowId)
			ro = applyRowMove(coreOrder(t, t.atoms.rowOrder.get()), m)
		}
	}
	return out
}
/** The order after stepping s in `dir` until it lands on `tg`. */
function stepOnto(
	data: N[],
	pins: any,
	seed: string[] | undefined,
	expand: boolean,
	s: string,
	tg: string,
	dir: any,
): string[] | null {
	let ro = seed ? seed.slice() : undefined
	for (let hop = 0; hop < 25; hop++) {
		const t = mk(data, pins, ro, expand)
		const m = moveRow(t, s, dir)
		if (!m) return null
		ro = applyRowMove(coreOrder(t, t.atoms.rowOrder.get()), m)
		if (m.targetRowId === tg) return ro
	}
	return null
}

function audit(label: string, data: N[], pins: any, seed: string[] | undefined, expand: boolean) {
	const t0 = mk(data, pins, seed, expand)
	const rows = t0.getRowModel().rows
	const proj = projected(t0)
	const ids: string[] = rows.map((r: Any) => r.id)
	console.log('--- ' + label)
	console.log('    rendered  ' + rows.map((r: Any) => r.id + '@' + r.depth + ':' + String(r.getIsPinned())).join(' '))
	console.log('    projected ' + proj.join(' '))
	for (const s of ids) {
		const oracle = landedOn(data, pins, seed, expand, s)
		const impl = new Set(ids.filter((tg) => canDropRow(t0, s, tg)))
		const onlyO = [...oracle].filter((x) => !impl.has(x))
		const onlyI = [...impl].filter((x) => !oracle.has(x))
		if (onlyO.length) fail(label + ' STEPS LAND ON IT, DROP REFUSES: ' + s + ' -> ' + onlyO.join(','))
		if (onlyI.length) fail(label + ' DROP ALLOWS, STEPS NEVER LAND: ' + s + ' -> ' + onlyI.join(','))
		for (const tg of oracle) {
			if (!impl.has(tg)) continue
			const si = proj.indexOf(s),
				ti = proj.indexOf(tg)
			const dir = si < ti ? RowMoveDirection.Down : RowMoveDirection.Up
			const byStep = stepOnto(data, pins, seed, expand, s, tg, dir)
			const mv = dropRow(t0, s, tg)
			if (!mv) {
				fail(label + ' dropRow returned undefined for an allowed pair ' + s + '->' + tg)
				continue
			}
			const byDrop = applyRowMove(coreOrder(t0, t0.atoms.rowOrder.get()), mv)
			if (byStep === null) {
				fail(label + ' oracle could not step ' + s + '->' + tg + ' in ' + dir)
				continue
			}
			if (byStep.join('|') !== byDrop.join('|'))
				fail(label + ' ORDER MISMATCH ' + s + '->' + tg + ' steps=' + byStep.join('') + ' drop=' + byDrop.join(''))
			// direction must agree with which side of the target the row ended up on
			const di = byDrop.indexOf(s),
				dt = byDrop.indexOf(tg)
			const expect = si < ti ? RowMoveDirection.Down : RowMoveDirection.Up
			if (mv.direction !== expect) fail(label + ' DIRECTION WRONG ' + s + '->' + tg + ' got ' + mv.direction)
			if ((mv.direction === RowMoveDirection.Down) !== di > dt)
				fail(
					label +
						' DIRECTION CONTRADICTS RESULT ' +
						s +
						'->' +
						tg +
						' dir=' +
						mv.direction +
						' order=' +
						byDrop.join(''),
				)
		}
	}
}

const FLAT: N[] = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id }))
const TREE: N[] = [
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
audit('flat', FLAT, [], undefined, false)
audit('flat/pin-middle-b', FLAT, [['b', 'top']], undefined, false)
audit(
	'flat/pin-b-and-d',
	FLAT,
	[
		['b', 'top'],
		['d', 'bottom'],
	],
	undefined,
	false,
)
audit('flat/seed-reversed', FLAT, [], ['e', 'd', 'c', 'b', 'a'], false)
audit('flat/seed-partial', FLAT, [], ['c', 'a'], false)
audit('flat/seed+pin', FLAT, [['c', 'top']], ['e', 'd', 'c', 'b', 'a'], false)
audit('tree', TREE, [], undefined, true)
audit('tree/collapsed', TREE, [], undefined, false)
audit('tree/pin-child-c2', TREE, [['c2', 'top']], undefined, true)
audit('tree/pin-parent-p2', TREE, [['p2', 'top']], undefined, true)
audit('tree/pin-last-child-c3', TREE, [['c3', 'top']], undefined, true)
audit('tree/pin-grandchild-g1', TREE, [['g1', 'bottom']], undefined, true)
audit('tree/SEED-subrow-c1-p1', TREE, [], ['c1', 'p1'], true)
audit('tree/SEED-subrow-c3-p1', TREE, [], ['c3', 'p1'], true)
audit('tree/SEED-subrow-g1-p2', TREE, [], ['g1', 'p2'], true)
audit('tree/SEED-reversed', TREE, [], ['p3', 'g1', 'd1', 'p2', 'c3', 'c2', 'c1', 'p1'], true)
audit('tree/SEED-subrow+pin', TREE, [['c2', 'top']], ['c1', 'p1'], true)
console.log(failures === 0 ? '\nROW ORACLE: all invariants hold' : '\nROW ORACLE: ' + failures + ' FAILURES')

// ==== bounds / termination of isRowReachableByStepping ====
const tb = mk(TREE, [], undefined, true)
const rws = applyRowOrder(tb.getRowModel().rows, [], (r: Any) => r.id)
const one = mk([{ id: 'solo', name: 's' }], [], undefined, false)
const rsolo = applyRowOrder(one.getRowModel().rows, [], (r: Any) => r.id)
const g = (l: string, f: () => unknown) => {
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
g('down 0->7', () => isRowReachableByStepping(rws, 0, 7))
g('up 7->0', () => isRowReachableByStepping(rws, 7, 0))
g('same 3->3', () => isRowReachableByStepping(rws, 3, 3))
g('one-row list 0->0', () => isRowReachableByStepping(rsolo, 0, 0))
g('one-row list 0->1', () => isRowReachableByStepping(rsolo, 0, 1))
g('empty list', () => isRowReachableByStepping([], 0, 1))
g('source -4', () => isRowReachableByStepping(rws, -4, 2))
g('source 99', () => isRowReachableByStepping(rws, 99, 2))
g('TARGET -1 (sentinel collision)', () => isRowReachableByStepping(rws, 2, -1))
g('target 99', () => isRowReachableByStepping(rws, 0, 99))
g('fractional source 1.5', () => isRowReachableByStepping(rws, 1.5, 4))
g('NaN target', () => isRowReachableByStepping(rws, 0, NaN))
const allPin = mk(
	FLAT,
	[
		['b', 'top'],
		['c', 'top'],
		['d', 'bottom'],
		['e', 'bottom'],
	],
	undefined,
	false,
)
const rap = applyRowOrder(allPin.getRowModel().rows, [], (r: Any) => r.id)
console.log(
	'  all-others-foreign',
	allPin
		.getRowModel()
		.rows.map((r: Any) => r.id + ':' + String(r.getIsPinned()))
		.join(' '),
)
g('every candidate skipped down', () => isRowReachableByStepping(rap, 0, 4))
g('every candidate skipped up', () => isRowReachableByStepping(rap, 4, 0))
console.log(failures === 0 ? 'DONE clean' : 'DONE with ' + failures + ' failures')
