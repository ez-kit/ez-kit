import { defineColumns } from '@ez-kit/data-grid-core'
import { act, render } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { GridComponents } from '../contract'
import type { TbodyProps } from '../types'
import type { ReactElement } from 'react'

/** Every row reports this height, so expected offsets are exact multiples of it. */
const ROW_HEIGHT = 40
const PIN_OFFSET_VAR = '--dg-row-pin-offset'

let restoreOffsetHeight: (() => void) | undefined

beforeAll(() => {
	// JSDOM lacks ResizeObserver; the offsets layout effect needs one.
	vi.stubGlobal(
		'ResizeObserver',
		class StubResizeObserver {
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
		},
	)
	// JSDOM reports every offsetHeight as 0, which would make all offsets collapse to 0 and hide
	// exactly the stacking bug these tests exist to catch.
	const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
	Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
		configurable: true,
		get: () => ROW_HEIGHT,
	})
	restoreOffsetHeight = () => {
		if (original) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original)
	}
})

afterAll(() => {
	restoreOffsetHeight?.()
})

type Row = { id: number; name: string }
const DATA: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
	{ id: 3, name: 'Carol' },
	{ id: 4, name: 'Dave' },
]
const COLUMNS = defineColumns<Row>([{ accessorKey: 'name' }])

type Instance = ReturnType<typeof useDataGrid<Row>>

/**
 * Renders one commit behind, so a row's `<tr>` — and therefore its ref — lands *after* the layout
 * effect that measures offsets. This is what HeroUI's `Tbody` does: it maps onto a react-aria
 * collection, which builds the collection first and mounts the real rows in a later pass.
 */
function DeferredTbody({ children, ...rest }: TbodyProps): ReactElement {
	const [shown, setShown] = useState<TbodyProps['children']>(null)
	useEffect(() => {
		// The cascading render this rule guards against is exactly what is being reproduced: rows
		// must reach the DOM one commit after the body renders them.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setShown(children)
	}, [children])
	return <tbody {...rest}>{shown}</tbody>
}

type Counters = { tbody: number }

function makeCountingComponents(counters: Counters, deferRows: boolean): Required<GridComponents> {
	function CountingTbody(props: TbodyProps): ReactElement {
		// Counting renders is the whole point of this probe, and a render counter cannot live in
		// state without changing what it measures.
		// eslint-disable-next-line react-hooks/immutability
		counters.tbody += 1
		return deferRows ? <DeferredTbody {...props} /> : <tbody {...props} />
	}
	return {
		...testComponents,
		core: { ...testComponents.core, Tbody: CountingTbody },
	}
}

function makeHarness(ref: { instance: Instance | null }) {
	return function Harness(): ReactElement {
		const table = useDataGrid<Row>({ data: DATA, columns: COLUMNS, pinning: { row: { top: true, bottom: true } } })
		useEffect(() => {
			ref.instance = table
		}, [table])
		return <DataGrid<Row> table={table} />
	}
}

function renderGrid(options?: { deferRows?: boolean }) {
	const counters: Counters = { tbody: 0 }
	const components = makeCountingComponents(counters, options?.deferRows ?? false)

	const ref: { instance: Instance | null } = { instance: null }
	const Harness = makeHarness(ref)

	render(
		<GridComponentsProvider components={components}>
			<Harness />
		</GridComponentsProvider>,
	)

	const instance = ref.instance
	if (!instance) throw new Error('instance not initialised')
	return { counters, instance }
}

function pinnedOffsets(side: 'top' | 'bottom'): string[] {
	return Array.from(document.querySelectorAll<HTMLElement>(`tr[data-pinned="${side}"]`)).map((row) =>
		row.style.getPropertyValue(PIN_OFFSET_VAR),
	)
}

/** Rows are addressed by their position in `data`; the id itself comes from the table's getRowId. */
async function pin(instance: Instance, dataIndex: number, side: 'top' | 'bottom' | false) {
	const row = instance.table.getCoreRowModel().rows[dataIndex]
	if (!row) throw new Error(`no row at index ${String(dataIndex)}`)
	await act(async () => {
		row.pin(side, false, false)
		// Let the ref-attachment microtask run: rows registered after the layout effect (a kit whose
		// Tbody is a react-aria collection mounts them in a later pass) are measured from there.
		await Promise.resolve()
	})
}

describe('usePinnedRowOffsets', () => {
	it('stacks each pinned top row below the previous one', async () => {
		const { instance } = renderGrid()

		await pin(instance, 0, 'top')
		expect(pinnedOffsets('top')).toEqual(['0px'])

		await pin(instance, 1, 'top')
		expect(pinnedOffsets('top')).toEqual(['0px', `${String(ROW_HEIGHT)}px`])

		await pin(instance, 2, 'top')
		expect(pinnedOffsets('top')).toEqual(['0px', `${String(ROW_HEIGHT)}px`, `${String(ROW_HEIGHT * 2)}px`])
	})

	it('stacks bottom rows upwards from the last', async () => {
		const { instance } = renderGrid()

		await pin(instance, 0, 'bottom')
		await pin(instance, 1, 'bottom')

		// The last bottom row sits flush with the edge; the one above it is offset by a row height.
		expect(pinnedOffsets('bottom')).toEqual([`${String(ROW_HEIGHT)}px`, '0px'])
	})

	it('recomputes when the pinned set changes without changing its size', async () => {
		const { instance } = renderGrid()

		await pin(instance, 0, 'top')
		await pin(instance, 1, 'top')
		expect(pinnedOffsets('top')).toEqual(['0px', `${String(ROW_HEIGHT)}px`])

		// Unpin A, pin B: the count stays at 2 while the nodes change. Keying the measurement on the
		// row count alone would leave the newly pinned row without an offset.
		await pin(instance, 0, false)
		await pin(instance, 3, 'top')

		expect(pinnedOffsets('top')).toEqual(['0px', `${String(ROW_HEIGHT)}px`])
	})

	it('applies offsets in the same commit when refs attach synchronously', async () => {
		const { instance } = renderGrid()

		await pin(instance, 0, 'top')
		await pin(instance, 1, 'top')

		// Swap one pinned row for another, leaving the count at 2, and assert *without* flushing the
		// microtask: a kit with synchronous refs must be correct before paint, or the row visibly
		// jumps for a frame. Keying the effect on the count alone would miss this change entirely.
		const replacement = instance.table.getCoreRowModel().rows[3]
		if (!replacement) throw new Error('no row at index 3')
		const removed = instance.table.getCoreRowModel().rows[0]
		if (!removed) throw new Error('no row at index 0')
		act(() => {
			removed.pin(false, false, false)
			replacement.pin('top', false, false)
		})

		expect(pinnedOffsets('top')).toEqual(['0px', `${String(ROW_HEIGHT)}px`])
	})

	it('measures rows whose ref attaches after the layout effect', async () => {
		const { instance } = renderGrid({ deferRows: true })

		await pin(instance, 0, 'top')
		await pin(instance, 1, 'top')

		// The second row is registered a commit late. Measuring only from the effect leaves it
		// without an offset, so it renders on top of the first one — the #140 gap, inverted.
		expect(pinnedOffsets('top')).toEqual(['0px', `${String(ROW_HEIGHT)}px`])
	})

	it('pinning a row does not re-render the body more than twice', async () => {
		const { counters, instance } = renderGrid()
		const before = counters.tbody

		await pin(instance, 0, 'top')

		// One render for the row leaving the center list. The measurement itself must add none: it
		// used to call setState per attached ref, re-rendering every row and cell several times over.
		expect(counters.tbody - before).toBeLessThanOrEqual(2)
	})
})
