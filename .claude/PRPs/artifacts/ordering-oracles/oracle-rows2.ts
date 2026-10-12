import { rowPinningFeature, rowExpandingFeature, createExpandedRowModel, tableFeatures } from '@tanstack/table-core'
import { createColumns } from '@ez-kit/data-grid-core/src/column/create-columns'
import { createTable } from '@ez-kit/data-grid-core/src/create-table'
import { applyRowOrder } from '@ez-kit/data-grid-core/src/features/ordering/apply-row-order'
import { canDropRow, dropRow } from '@ez-kit/data-grid-core/src/features/ordering/drop'
import { applyRowMove, moveRow, RowMoveDirection } from '@ez-kit/data-grid-core/src/features/ordering/row-ordering'
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
		ordering: { row: { onChange: () => undefined } },
		pinning: { row: { top: true, bottom: true } },
		expanding: { mode: 'tree', getSubRows: (r) => r.children },
		...(rowOrder ? { initialState: { rowOrder } } : {}),
	} as never) as Any
	if (expand) t.toggleAllRowsExpanded(true)
	for (const [id, side] of pins) t.getRow(id).pin(side, false, false)
	return t
}
/**
 * COMMIT MODEL: the full projected rendered order, spliced by applyRowMove and fed back as the
 * seed. Faithful because a rowOrder naming every rendered id makes applyRowOrder a plain
 * permutation onto exactly that arrangement — verified below. Works for sub-rows, unlike the
 * uncontrolled core-row commit, whose order cannot name a child at all.
 */
const projected = (t: Any): string[] =>
	applyRowOrder(t.getRowModel().rows, t.atoms.rowOrder.get(), (r: Any) => r.id).map((r: Any) => r.id)

/** ORACLE: ids the source actually LANDS ON over repeated real stepping. Step API only. */
function landedOn(data: N[], pins: any, seed: string[] | undefined, expand: boolean, s: string): Set<string> {
	const out = new Set<string>()
	for (const dir of [RowMoveDirection.Up, RowMoveDirection.Down]) {
		let ro = seed ? seed.slice() : undefined
		for (let hop = 0; hop < 25; hop++) {
			const t = mk(data, pins, ro, expand)
			const m = moveRow(t, s, dir)
			if (!m) break
			out.add(m.targetRowId)
			ro = applyRowMove(projected(t), m)
		}
	}
	return out
}
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
		ro = applyRowMove(projected(t), m)
		if (m.targetRowId === tg) return ro
	}
	return null
}
function audit(label: string, data: N[], pins: any, seed: string[] | undefined, expand: boolean) {
	const t0 = mk(data, pins, seed, expand)
	const proj = projected(t0)
	const ids: string[] = t0.getRowModel().rows.map((r: Any) => r.id)
	// commit-model fidelity: seeding the full projection reproduces it exactly
	if (seed === undefined) {
		const round = projected(mk(data, pins, proj, expand))
		if (round.join('|') !== proj.join('|'))
			fail(label + ' COMMIT MODEL UNFAITHFUL: ' + proj.join('') + ' -> ' + round.join(''))
	}
	console.log('--- ' + label + '  projected ' + proj.join(' '))
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
			const mv = dropRow(t0, s, tg)!
			const byDrop = applyRowMove(proj, mv)
			if (byStep === null) {
				fail(label + ' oracle could not step ' + s + '->' + tg)
				continue
			}
			if (byStep.join('|') !== byDrop.join('|'))
				fail(label + ' ORDER MISMATCH ' + s + '->' + tg + ' steps=' + byStep.join('') + ' drop=' + byDrop.join(''))
			if (mv.direction !== dir) fail(label + ' DIRECTION WRONG ' + s + '->' + tg + ' got ' + mv.direction)
			const di = byDrop.indexOf(s),
				dt = byDrop.indexOf(tg)
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
const CASES: [string, N[], any, string[] | undefined, boolean][] = [
	['flat', FLAT, [], undefined, false],
	['flat/pin-middle-b', FLAT, [['b', 'top']], undefined, false],
	[
		'flat/pin-b-and-d',
		FLAT,
		[
			['b', 'top'],
			['d', 'bottom'],
		],
		undefined,
		false,
	],
	[
		'flat/pin-all-but-a-and-e',
		FLAT,
		[
			['b', 'top'],
			['c', 'top'],
			['d', 'bottom'],
		],
		undefined,
		false,
	],
	['flat/seed-reversed', FLAT, [], ['e', 'd', 'c', 'b', 'a'], false],
	['flat/seed-partial', FLAT, [], ['c', 'a'], false],
	['flat/seed+pin', FLAT, [['c', 'top']], ['e', 'd', 'c', 'b', 'a'], false],
	['tree', TREE, [], undefined, true],
	['tree/collapsed', TREE, [], undefined, false],
	['tree/pin-child-c2', TREE, [['c2', 'top']], undefined, true],
	['tree/pin-parent-p2', TREE, [['p2', 'top']], undefined, true],
	['tree/pin-last-child-c3', TREE, [['c3', 'top']], undefined, true],
	['tree/pin-grandchild-g1', TREE, [['g1', 'bottom']], undefined, true],
	[
		'tree/pin-two-bands',
		TREE,
		[
			['p1', 'top'],
			['p3', 'bottom'],
		],
		undefined,
		true,
	],
	['tree/SEED-subrow-c1-p1', TREE, [], ['c1', 'p1'], true],
	['tree/SEED-subrow-c3-p1', TREE, [], ['c3', 'p1'], true],
	['tree/SEED-subrow-g1-p2', TREE, [], ['g1', 'p2'], true],
	['tree/SEED-subrow-g1-c1', TREE, [], ['g1', 'c1'], true],
	['tree/SEED-reversed', TREE, [], ['p3', 'g1', 'd1', 'p2', 'c3', 'c2', 'c1', 'p1'], true],
	['tree/SEED-subrow+pin', TREE, [['c2', 'top']], ['c1', 'p1'], true],
	['tree/SEED-subrow+pin-parent', TREE, [['p1', 'top']], ['c1', 'p1'], true],
]
for (const c of CASES) audit(...c)
console.log(failures === 0 ? '\nROW ORACLE: all invariants hold' : '\nROW ORACLE: ' + failures + ' FAILURES')
