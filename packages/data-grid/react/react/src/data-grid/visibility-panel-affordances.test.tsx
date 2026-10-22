import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { TEST_FEATURES, TEST_ROWS, testComponents } from '../test-utils'

import { ColumnDragHandle } from './column-drag-handle'
import { DataGrid } from './data-grid'

import type { VisibilityColumnItem } from '../types'
import type { DndAdapter, DragSpec, SortableItemHandle } from './dnd'

/**
 * The column panel's affordances, chosen by `ordering.column.visibilityMenu: boolean | ReorderMode`.
 *
 * The panel is the one surface of either axis whose controls a call site does not compose: a kit's
 * `VisibilityMenu` renders the grip and the move pair unconditionally and each one self-hides, so
 * "which of the two does this panel offer" is a question only the config can answer — unlike a row
 * handle or a header handle, which are there iff someone wrote them into the JSX.
 *
 * Every case here reads the two through the signals a kit reads: `col.ordering` on the trigger's
 * render args is the move pair, and a registered panel spec is the drag.
 */

/** Minimal double — enough to say whether the panel registered anything on its surface. */
function makeAdapter() {
	const specs: DragSpec[] = []

	const adapter: DndAdapter = {
		Provider: ({ children }) => <>{children}</>,
		useSortableItem: (spec): SortableItemHandle => {
			specs.push(spec)
			return { ref: () => {}, handleRef: () => {}, isDragging: false }
		},
	}

	return {
		adapter,
		/** Panel-surface column specs, latest render only. */
		panelSpecs: () => {
			const byId = new Map<string, DragSpec>()
			for (const spec of specs) if (spec.surface === 'panel' && spec.axis === 'column') byId.set(spec.id, spec)
			return [...byId.values()]
		},
	}
}

type Row = { name: string; age: number }

/** One locked leaf, so the wide-list rule is observable beside the affordances. */
const COLUMNS = createColumns<Row>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age', visibility: false },
] as never)

/**
 * Renders a bound grid's panel and reports both signals at once.
 *
 * Both have to come from one render: the defect being guarded is the two affordances appearing
 * *together*, which no test reading one of them in isolation can see.
 */
function renderPanel({ withAdapter, ordering }: { withAdapter: boolean; ordering: Record<string, unknown> }): {
	items: VisibilityColumnItem[]
	draggedIds: string[]
} {
	const { adapter, panelSpecs } = makeAdapter()
	const { DataGrid: BoundDataGrid } = createDataGrid({
		components: testComponents,
		...(withAdapter ? { dnd: adapter } : {}),
	})

	let items: VisibilityColumnItem[] = []

	render(
		<BoundDataGrid
			columns={COLUMNS}
			data={TEST_ROWS as unknown as Row[]}
			features={TEST_FEATURES}
			ordering={ordering}
			visibility
		>
			<DataGrid.VisibilityTrigger>
				{({ columns }) => {
					items = columns
					return columns.map((col) => (
						<DataGrid.VisibilityItem
							key={col.id}
							columnId={col.id}
						>
							<ColumnDragHandle />
						</DataGrid.VisibilityItem>
					))
				}}
			</DataGrid.VisibilityTrigger>
		</BoundDataGrid>,
	)

	return { items, draggedIds: panelSpecs().map((spec) => spec.id) }
}

const hasMoveControls = (items: VisibilityColumnItem[]) => items.some((item) => item.ordering !== undefined)

describe('`visibilityMenu: true`', () => {
	it('offers the drag and withholds the arrows when an adapter is bound', () => {
		// The pair and the grip do the same job, and the grip does it better; offering both is the
		// duplication this split exists to remove.
		const { items, draggedIds } = renderPanel({ withAdapter: true, ordering: { column: { visibilityMenu: true } } })

		expect(draggedIds).toEqual(['name', 'age'])
		expect(hasMoveControls(items)).toBe(false)
	})

	it('offers the arrows when no adapter is bound', () => {
		// Unchanged from before the split, and the only behaviour a released grid can have: the drag
		// adapter has never shipped, so every existing `visibilityMenu: true` lands here.
		const { items, draggedIds } = renderPanel({ withAdapter: false, ordering: { column: { visibilityMenu: true } } })

		expect(draggedIds).toEqual([])
		expect(hasMoveControls(items)).toBe(true)
	})
})

describe('a mode, written out', () => {
	it("`'step'` leaves the arrows as the whole affordance", () => {
		const { items, draggedIds } = renderPanel({ withAdapter: true, ordering: { column: { visibilityMenu: 'step' } } })

		expect(draggedIds).toEqual([])
		expect(hasMoveControls(items)).toBe(true)
	})

	it("`'both'` asks for the grip and the arrows together", () => {
		const { items, draggedIds } = renderPanel({ withAdapter: true, ordering: { column: { visibilityMenu: 'both' } } })

		expect(draggedIds).toEqual(['name', 'age'])
		expect(hasMoveControls(items)).toBe(true)
	})

	it("`'drag'` is what `true` already resolves to under an adapter", () => {
		const { items, draggedIds } = renderPanel({ withAdapter: true, ordering: { column: { visibilityMenu: 'drag' } } })

		expect(draggedIds).toEqual(['name', 'age'])
		expect(hasMoveControls(items)).toBe(false)
	})
})

describe('the default', () => {
	it('keeps the Columns toggle a visibility list when `visibilityMenu` is not written', () => {
		const { items, draggedIds } = renderPanel({ withAdapter: true, ordering: { column: {} } })

		expect(items.map((item) => item.id)).toEqual(['name'])
		expect(hasMoveControls(items)).toBe(false)
		expect(draggedIds).toEqual([])
	})
})

describe('the wide list', () => {
	it('lists the locked column whichever affordance is on', () => {
		// The list widens because the author asked for an ordering panel — a list that skipped a
		// column could not be read as the order — and that is one question, not two.
		for (const ordering of [
			{ column: { visibilityMenu: true } },
			{ column: { visibilityMenu: 'step' } },
			{ column: { visibilityMenu: 'both' } },
		]) {
			const { items } = renderPanel({ withAdapter: true, ordering })
			expect(items.map((item) => item.id)).toEqual(['name', 'age'])
		}
	})

	it('stays narrow while the column axis is off', () => {
		const { items, draggedIds } = renderPanel({
			withAdapter: true,
			ordering: { column: { enabled: false, visibilityMenu: true } },
		})

		expect(items.map((item) => item.id)).toEqual(['name'])
		expect(hasMoveControls(items)).toBe(false)
		expect(draggedIds).toEqual([])
	})
})

describe('a panel asked for something it cannot offer', () => {
	let warn: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		warn.mockRestore()
	})

	it.each(['drag', 'both'])("falls back to the arrows and says so when `'%s'` has no adapter", (mode) => {
		const { items, draggedIds } = renderPanel({ withAdapter: false, ordering: { column: { visibilityMenu: mode } } })

		expect(draggedIds).toEqual([])
		expect(hasMoveControls(items)).toBe(true)
		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`ordering.column.visibilityMenu`'))
	})

	it("says nothing for `'step'` or `true` without an adapter", () => {
		renderPanel({ withAdapter: false, ordering: { column: { visibilityMenu: 'step' } } })
		renderPanel({ withAdapter: false, ordering: { column: { visibilityMenu: true } } })

		expect(warn).not.toHaveBeenCalled()
	})

	it('names the header option once, however many header cells ask', () => {
		renderPanel({ withAdapter: false, ordering: { column: { header: 'drag' } } })

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('`ordering.column.header`'))
	})

	it('does not repeat on a re-render driven by another slice', async () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents })
		render(
			<BoundDataGrid
				columns={COLUMNS}
				data={TEST_ROWS as unknown as Row[]}
				features={TEST_FEATURES}
				ordering={{ column: { visibilityMenu: 'both' } }}
				visibility
			>
				<DataGrid.VisibilityTrigger>
					{({ columns }) =>
						columns.map((col) => (
							<button
								key={col.id}
								type='button'
								onClick={col.onToggle}
							>
								{col.label}
							</button>
						))
					}
				</DataGrid.VisibilityTrigger>
			</BoundDataGrid>,
		)

		await userEvent.click(screen.getByRole('button', { name: 'Name' }))

		expect(warn).toHaveBeenCalledTimes(1)
	})

	it('says nothing when the panel offers something', () => {
		renderPanel({ withAdapter: true, ordering: { column: { visibilityMenu: true } } })

		expect(warn).not.toHaveBeenCalled()
	})
})
