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
		fireDrop({ axis: 'row', surface: 'table', sourceId: '1', targetIndex: 2 })

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

		fireDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetIndex: 1 })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('ignores a landing index no row occupies', () => {
		// The grid resolves the index against its own row model; out of range there is nothing to
		// aim at, and guessing a neighbour would move a row the user never pointed at.
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		fireDrop({ axis: 'row', surface: 'table', sourceId: '1', targetIndex: 99 })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('ignores a landing index the source already occupies', () => {
		// Nothing moved, so nothing is committed — this is what keeps "exactly one onChange per
		// drag" true for a drag that ends where it began.
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: { onChange } } })

		fireDrop({ axis: 'row', surface: 'table', sourceId: '1', targetIndex: 0 })

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
})
