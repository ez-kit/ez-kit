import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { TEST_COLUMNS, TEST_FEATURES, TEST_ROWS, testComponents } from '../test-utils'

import { DataGrid } from './data-grid'
import { RowDragHandle } from './row-drag-handle'

import type { TestRow } from '../test-utils'
import type { DndAdapter, DndDropEvent, DragSpec, SortableItemHandle } from './dnd'

/**
 * A stand-in for a kit's adapter that a test can **drive**: it records every spec it is handed,
 * reports a chosen row as dragging, and fires a drop on demand.
 *
 * Driving the drop is the only way to reach the commit without a browser — dnd-kit measures layout
 * and jsdom reports every element as zero-sized, so a simulated pointer gesture here would test
 * jsdom's geometry stub. The real gesture is the Playwright spec's job.
 */
function makeDrivableAdapter(draggingId?: string) {
	const specs: DragSpec[] = []
	const drops: ((event: DndDropEvent) => void)[] = []
	const inert = { ref: () => {}, handleRef: () => {} }

	const adapter: DndAdapter = {
		Provider: ({ onDrop, children }) => {
			drops.push(onDrop)
			return <>{children}</>
		},
		useSortableItem: (spec): SortableItemHandle => {
			specs.push(spec)
			return { ...inert, isDragging: spec.id === draggingId }
		},
	}

	return {
		adapter,
		specs,
		specFor: (id: string) => specs.find((spec) => spec.id === id),
		fireDrop: (event: DndDropEvent) => {
			for (const onDrop of drops) onDrop(event)
		},
	}
}

/**
 * The ordinary placement: a column whose cell renderer is the handle. Nothing mounts a handle by
 * itself — there is no system column and no placement option, by design — so a test that wants one
 * places it exactly as a consumer would.
 */
const DRAG_COLUMNS = createColumns<TestRow>([
	{ id: 'drag', header: '', cell: { component: () => <RowDragHandle /> } },
	...TEST_COLUMNS,
] as never)

function renderDndGrid(adapter: DndAdapter, config: Record<string, unknown> = {}, children?: React.ReactNode): void {
	const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })
	render(
		<BoundDataGrid
			features={TEST_FEATURES}
			data={TEST_ROWS}
			columns={TEST_COLUMNS}
			ordering={{ row: true }}
			{...config}
		>
			{children}
		</BoundDataGrid>,
	)
}

describe('a grid with no drag adapter', () => {
	it('renders no handle and no dragging state', () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents })
		const { container } = render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				ordering={{ row: true }}
			/>,
		)

		expect(container.querySelector('[data-slot="row-drag-handle"]')).toBeNull()
		expect(container.querySelector('[data-row-dragging]')).toBeNull()
	})
})

describe('the row registers itself with the adapter', () => {
	it('names the row axis and the row’s real index', () => {
		// Arrange / Act
		const { adapter, specFor } = makeDrivableAdapter()
		renderDndGrid(adapter)

		// Assert — `index` is the row's place in the row model, which is what a virtualized body
		// would otherwise get wrong by handing over a window-relative position.
		expect(specFor('2')).toEqual({ id: '2', index: 1, axis: 'row', surface: 'table', disabled: false })
	})

	/**
	 * The index is a position in the **row model**, not `row.index` — and the difference is the whole
	 * defect this case exists for.
	 *
	 * TanStack's `row.index` is a row's place among its parent's children in the *core* model, so on a
	 * later page it starts at the page offset: two rows on page three register `4` and `5`, which is
	 * not the `0..n-1` the drag library requires per group. It bails out of everything silently — the
	 * handle works, the pointer moves, nothing displaces and nothing commits — so nothing but an
	 * assertion on the registered numbers can catch it.
	 */
	it('counts from zero on a later page, where row.index does not', () => {
		const { adapter, specs } = makeDrivableAdapter()
		const data = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `Row ${String(i + 1)}`, age: 20 + i }))
		// `initialState.pagination` alone: writing `pagination.pageSize` beside it is the mistake
		// `createTable` warns about in development.
		renderDndGrid(adapter, { data, initialState: { pagination: { pageIndex: 2, pageSize: 2 } } })

		expect(specs.filter((spec) => spec.axis === 'row').map((spec) => [spec.id, spec.index])).toEqual([
			['5', 0],
			['6', 1],
		])
	})

	/**
	 * The same defect through a different door: a filter keeps each surviving row's original
	 * `row.index`, so the registered run has **gaps** rather than an offset. Same silent death.
	 */
	it('counts from zero under a filter, where row.index leaves gaps', () => {
		const { adapter, specs } = makeDrivableAdapter()
		const data = [
			{ id: 1, name: 'Alice', age: 30 },
			{ id: 2, name: 'Bob', age: 24 },
			{ id: 3, name: 'Alfred', age: 41 },
		]
		renderDndGrid(adapter, { data, initialState: { columnFilters: [{ id: 'name', value: 'Al' }] } })

		expect(specs.filter((spec) => spec.axis === 'row').map((spec) => [spec.id, spec.index])).toEqual([
			['1', 0],
			['3', 1],
		])
	})

	it('disables every row while row ordering is off', () => {
		const { adapter, specs } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: false } })

		expect(specs.every((spec) => spec.disabled)).toBe(true)
	})
})

describe('the handle', () => {
	it('renders once per row, named from the message catalogue', () => {
		const { adapter } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: DRAG_COLUMNS })

		// Reached by its accessible name rather than by a class — the name is the contract.
		const handles = screen.getAllByRole('button', { name: 'Reorder row' })
		expect(handles).toHaveLength(TEST_ROWS.length)
		expect(handles[0]).toHaveAttribute('data-slot', 'row-drag-handle')
	})

	it('renders nothing for a row that cannot be dragged', () => {
		const { adapter } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: DRAG_COLUMNS, ordering: { row: false } })

		expect(screen.queryByRole('button', { name: 'Reorder row' })).toBeNull()
	})

	it('renders nothing when no adapter is bound', () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents })
		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={DRAG_COLUMNS}
				ordering={{ row: true }}
			/>,
		)

		expect(screen.queryByRole('button', { name: 'Reorder row' })).toBeNull()
	})

	it('describes its role from the message catalogue', () => {
		/*
		 * REGRESSION. `messages.ordering.draggable` reached nothing: no component read it, and the drag
		 * library's accessibility plugin wrote its own hardcoded English `"draggable"` into the
		 * attribute — so a translated dictionary was ignored. The plugin only writes the attribute when
		 * it is absent, which is what makes authoring it here sufficient.
		 */
		const { adapter } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: DRAG_COLUMNS, messages: { ordering: { draggable: 'перетаскиваемый' } } })

		const handles = screen.getAllByRole('button', { name: 'Reorder row' })
		expect(handles).toHaveLength(TEST_ROWS.length)
		expect(handles[0]).toHaveAttribute('aria-roledescription', 'перетаскиваемый')
	})

	it('takes a caller’s label over the default', () => {
		const { adapter } = makeDrivableAdapter()
		const columns = createColumns<TestRow>([
			{ id: 'drag', header: '', cell: { component: () => <RowDragHandle aria-label='Move this order' /> } },
			...TEST_COLUMNS,
		] as never)
		renderDndGrid(adapter, { columns })

		expect(screen.getAllByRole('button', { name: 'Move this order' })).toHaveLength(TEST_ROWS.length)
		expect(screen.queryByRole('button', { name: 'Reorder row' })).toBeNull()
	})
})

describe('the row’s render arguments', () => {
	/*
	 * The second door onto the same handle, and the reason the row owns the sortable rather than the
	 * handle: a call site that writes its own row markup gets the element ready-made, exactly as a
	 * header cell hands back `sortTrigger` and `resizer`.
	 */
	it('hand back a ready-made handle and the dragging state', () => {
		const { adapter } = makeDrivableAdapter('2')
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })

		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				ordering={{ row: true }}
			>
				<DataGrid.Table>
					<DataGrid.Body>
						{({ rows }) =>
							rows.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								>
									{({ dragHandle, isDragging, content }) => (
										<>
											<td data-slot='td'>
												{dragHandle}
												<span data-testid={`dragging-${row.id}`}>{String(isDragging)}</span>
											</td>
											{content}
										</>
									)}
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</BoundDataGrid>,
		)

		expect(screen.getAllByRole('button', { name: 'Reorder row' })).toHaveLength(TEST_ROWS.length)
		expect(screen.getByTestId('dragging-2')).toHaveTextContent('true')
		expect(screen.getByTestId('dragging-1')).toHaveTextContent('false')
	})

	it('hand back null where the row cannot be dragged', () => {
		const { adapter } = makeDrivableAdapter()
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })

		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				ordering={{ row: false }}
			>
				<DataGrid.Table>
					<DataGrid.Body>
						{({ rows }) =>
							rows.map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
								>
									{({ dragHandle, content }) => (
										<>
											<td data-slot='td'>{dragHandle}</td>
											{content}
										</>
									)}
								</DataGrid.Row>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</BoundDataGrid>,
		)

		expect(screen.queryByRole('button', { name: 'Reorder row' })).toBeNull()
	})
})

describe('the dragging state', () => {
	it('lands on the dragged row and nowhere else', () => {
		const { adapter } = makeDrivableAdapter('2')
		renderDndGrid(adapter)

		const dragging = document.querySelectorAll('[data-row-dragging="true"]')
		expect(dragging).toHaveLength(1)
		expect(dragging[0]).toHaveAttribute('data-row-id', '2')
	})
})

describe('committing a drop', () => {
	it('moves the row once, through the ordering API', () => {
		// Arrange
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		// Act
		fireDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: '3' })

		// Assert — exactly one, which is the PRD's own success metric for a drag.
		expect(onChange).toHaveBeenCalledOnce()
		expect(onChange.mock.calls[0]?.[0]).toMatchObject({ rowId: '1' })
	})

	it('ignores a drop on the column axis', () => {
		// Header dragging commits through `dropColumn`, which is a different call and a later
		// phase. Until then the event must be dropped, not guessed at.
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		fireDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'age' })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('ignores a target id no row carries', () => {
		// `dropRow` resolves both ids against the table's own row model; an id that is in neither end
		// of it names nothing to aim at, and guessing a neighbour would move a row the user never
		// pointed at.
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		fireDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: 'nope' })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('ignores a drop onto the source itself', () => {
		// Nothing moved, so nothing is committed — this is what keeps "exactly one onChange per
		// drag" true for a drag that ends where it began. An adapter reports no drop in that case
		// either; the grid does not depend on it having done so.
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		fireDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: '1' })

		expect(onChange).not.toHaveBeenCalled()
	})
})

describe('the row element carries both refs', () => {
	/*
	 * The `<tr>` was already somebody's ref — `virtual-body.tsx` measures pinned rows through it —
	 * and the sortable wants the same element. A merge that dropped either would break silently:
	 * pinned offsets stop updating, or the draggable never registers.
	 */
	it('hands the element to the caller’s ref as well as the adapter’s', () => {
		const { adapter } = makeDrivableAdapter()
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })
		const rowRef = createRef<HTMLTableRowElement>()

		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				ordering={{ row: true }}
			>
				<DataGrid.Table>
					<DataGrid.Body>
						{({ rows }) =>
							rows.slice(0, 1).map((row) => (
								<DataGrid.Row
									key={row.id}
									row={row}
									ref={rowRef}
								/>
							))
						}
					</DataGrid.Body>
				</DataGrid.Table>
			</BoundDataGrid>,
		)

		expect(rowRef.current).toBeInstanceOf(HTMLTableRowElement)
		expect(rowRef.current).toHaveAttribute('data-row-id', '1')
	})
})

describe('the keyboard model while a drag is in flight', () => {
	/*
	 * The grid's own focus model and the drag sensor want the same keys. `Escape` is the sharp end:
	 * the drag layer cancels on it, so the grid taking it would leave a gesture running with nothing
	 * left to end it. The gate is a DOM read for the reason the editing gate is one — this runs on
	 * every keystroke.
	 *
	 * Only the shadcn kit runs this model (`createDataGrid({ keyboardNavigation: true })`); heroui
	 * brings React Aria's own.
	 */
	it('stands down while a row reports itself as dragging', () => {
		const { adapter } = makeDrivableAdapter('2')
		const { DataGrid: BoundDataGrid } = createDataGrid({
			components: testComponents,
			dnd: adapter,
			keyboardNavigation: true,
		})
		const { container } = render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
				ordering={{ row: true }}
			/>,
		)

		expect(container.querySelector('[data-row-dragging="true"]')).not.toBeNull()

		// Fired on the **cell**, which is what the model reads as `event.target` — firing on the
		// table instead makes `cellOf` return null and the handler bails for an unrelated reason,
		// which is a test that passes with the gate deleted.
		const first = container.querySelector<HTMLElement>('[data-slot="td"]')
		if (!first) throw new Error('the grid rendered no cells')
		first.focus()
		expect(document.activeElement).toBe(first)

		fireEvent.keyDown(first, { key: 'ArrowDown', bubbles: true })

		// Still on the first cell: the model returned before it moved the stop.
		expect(document.activeElement).toBe(first)
	})

	/*
	 * `Alt+ArrowUp` / `Alt+ArrowDown` move the row, and the drag layer's keyboard sensor moves the
	 * row it has picked up with the same keys — so while this row is being dragged exactly one of
	 * the two may act, or one press moves it twice.
	 *
	 * The gate is on `onRowKeyDown` itself and nowhere else it could be. The focus model above also
	 * stands down on a drag and cannot help: that handler is on the kit's `Table`, above the `<tr>`
	 * this one sits on, so the reorder has already happened by the time the event reaches it.
	 */
	it('does not reorder the dragged row on Alt+Arrow', () => {
		const onChange = vi.fn()
		const { adapter } = makeDrivableAdapter('2')
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		const dragged = document.querySelector<HTMLElement>('[data-row-dragging="true"]')
		if (!dragged) throw new Error('the grid reported no dragging row')

		fireEvent.keyDown(dragged, { key: 'ArrowDown', altKey: true, bubbles: true })

		expect(onChange).not.toHaveBeenCalled()
	})

	/*
	 * The negative control, and **the only thing pinning the gate narrow**: it fires the chord on a
	 * row that is not the one being dragged, while a drag is in flight. The gate reads this row's
	 * own drag state, so the chord still works; any grid-wide or `document`-wide variant of the gate
	 * fails here, which is exactly what this case exists to catch.
	 *
	 * **Its subject is the gate's scope, not a permission.** That a second row can be reordered
	 * during a pointer drag — mutating the index space `OptimisticSortingPlugin` is operating over —
	 * is a real hazard, pre-existing, and nothing this phase decided to allow; asserting the chord
	 * reaches the ungated row is not an endorsement of doing it.
	 */
	it('still reorders a different row while one is being dragged', () => {
		const onChange = vi.fn()
		const { adapter } = makeDrivableAdapter('2')
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		const other = document.querySelector<HTMLElement>('[data-row-id="1"]')
		if (!other) throw new Error('the grid rendered no row "1"')

		fireEvent.keyDown(other, { key: 'ArrowDown', altKey: true, bubbles: true })

		expect(onChange).toHaveBeenCalledTimes(1)
	})

	/*
	 * The second control, pinning the other half: the gate must not **over-suppress** when idle. On
	 * its own it is weak — a grid-wide gate passes it, since nothing is dragging to suppress — which
	 * is exactly why it sits beside the case above rather than replacing it. Together: that one says
	 * the gate is per-item, this one says it is off when there is no drag.
	 */
	it('reorders the same row on Alt+Arrow when no drag is in flight', () => {
		const onChange = vi.fn()
		const { adapter } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		expect(document.querySelector('[data-row-dragging="true"]')).toBeNull()
		const row = document.querySelector<HTMLElement>('[data-row-id="2"]')
		if (!row) throw new Error('the grid rendered no row "2"')

		fireEvent.keyDown(row, { key: 'ArrowDown', altKey: true, bubbles: true })

		expect(onChange).toHaveBeenCalledTimes(1)
	})
})
