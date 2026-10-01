import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { TEST_COLUMNS, TEST_FEATURES, TEST_ROWS, testComponents } from '../test-utils'

import { useColumnDrag } from './column-drag'
import { ColumnDragHandle } from './column-drag-handle'
import { useDataGridHeaderCell } from './composition-context'
import { DataGrid } from './data-grid'

import type { TestRow } from '../test-utils'
import type { DndAdapter, DndDragOverEvent, DndDropEvent, DragSpec, SortableItemHandle } from './dnd'
import type { ReactNode } from 'react'

/**
 * A stand-in for a kit's adapter that a test can **drive** — the same double `row-drag.test.tsx`
 * uses, with the nodes it is handed recorded as well.
 *
 * The node matters here in a way it did not for the row: the sortable's `ref` has to land on the
 * `<th>`, and both kits' `Th` silently dropped it until this phase. Recording what arrives is what
 * turns that from an invisible omission into a failing test.
 */
function makeDrivableAdapter(draggingId?: string) {
	const specs: DragSpec[] = []
	const drops: ((event: DndDropEvent) => void)[] = []
	const guards: ((event: DndDragOverEvent) => boolean)[] = []
	const nodes = new Map<string, HTMLElement | null>()

	const adapter: DndAdapter = {
		Provider: ({ onDrop, canDrop, children }) => {
			drops.push(onDrop)
			guards.push(canDrop)
			return <>{children}</>
		},
		useSortableItem: (spec): SortableItemHandle => {
			specs.push(spec)
			return {
				ref: (node) => {
					nodes.set(spec.id, node)
				},
				handleRef: () => {},
				isDragging: spec.id === draggingId,
			}
		},
	}

	return {
		adapter,
		specs,
		nodes,
		/** Every column-axis spec, newest render last — a render pass appends, it does not replace. */
		columnSpecs: () => specs.filter((spec) => spec.axis === 'column'),
		/** One spec per column id, taking the most recent render's value. */
		latestColumnSpecs: () => {
			const byId = new Map<string, DragSpec>()
			for (const spec of specs) if (spec.axis === 'column') byId.set(spec.id, spec)
			return [...byId.values()]
		},
		fireDrop: (event: DndDropEvent) => {
			for (const onDrop of drops) onDrop(event)
		},
		/** What the grid answers for a prospective drop — the predicate `canDrop` publishes. */
		askCanDrop: (event: DndDragOverEvent): boolean => guards.every((canDrop) => canDrop(event)),
	}
}

/** A header cell that places the handle out of the render arguments — one of the two doors. */
const headerWithHandleArg = (
	<DataGrid.Table>
		<DataGrid.Header>
			{({ headerGroups }) =>
				headerGroups.map((group) => (
					<DataGrid.HeaderRow
						key={group.id}
						headerGroup={group}
					>
						{({ headers }) =>
							headers.map((header) => (
								<DataGrid.HeaderCell
									key={header.id}
									header={header}
								>
									{({ dragHandle, sortTrigger }) => (
										<>
											{dragHandle}
											{sortTrigger}
										</>
									)}
								</DataGrid.HeaderCell>
							))
						}
					</DataGrid.HeaderRow>
				))
			}
		</DataGrid.Header>
		<DataGrid.Body />
	</DataGrid.Table>
)

/** The other door: a body component reading the published header-cell context. */
function HandleFromContext() {
	const { sortTrigger } = useDataGridHeaderCell()
	return (
		<>
			<ColumnDragHandle />
			{sortTrigger}
		</>
	)
}

const headerWithHandleComponent = (
	<DataGrid.Table>
		<DataGrid.Header>
			{({ headerGroups }) =>
				headerGroups.map((group) => (
					<DataGrid.HeaderRow
						key={group.id}
						headerGroup={group}
					>
						{({ headers }) =>
							headers.map((header) => (
								<DataGrid.HeaderCell
									key={header.id}
									header={header}
								>
									<HandleFromContext />
								</DataGrid.HeaderCell>
							))
						}
					</DataGrid.HeaderRow>
				))
			}
		</DataGrid.Header>
		<DataGrid.Body />
	</DataGrid.Table>
)

function renderDndGrid(
	adapter: DndAdapter | undefined,
	config: Record<string, unknown> = {},
	children?: ReactNode,
): ReturnType<typeof render> {
	const { DataGrid: BoundDataGrid } = createDataGrid({
		components: testComponents,
		...(adapter ? { dnd: adapter } : {}),
	})
	return render(
		<BoundDataGrid
			features={TEST_FEATURES}
			data={TEST_ROWS}
			columns={TEST_COLUMNS}
			ordering={{ column: true }}
			{...config}
		>
			{children}
		</BoundDataGrid>,
	)
}

describe('a grid with no drag adapter', () => {
	it('renders no column handle and no dragging state', () => {
		const { container } = renderDndGrid(undefined, {}, headerWithHandleArg)

		expect(container.querySelector('[data-slot="column-drag-handle"]')).toBeNull()
		expect(container.querySelector('[data-column-dragging]')).toBeNull()
	})

	it('renders the same header markup as a grid that never mentions drag', () => {
		const withProviders = renderDndGrid(undefined, {}, headerWithHandleArg)
		const withProvidersHtml = withProviders.container.querySelector('[data-slot="thead"]')?.outerHTML
		withProviders.unmount()

		const plain = renderDndGrid(undefined, {}, headerWithHandleArg)
		expect(plain.container.querySelector('[data-slot="thead"]')?.outerHTML).toBe(withProvidersHtml)
	})
})

describe('the column drag handle', () => {
	it('renders from the render arguments, with the accessible name from the catalogue', () => {
		const { adapter } = makeDrivableAdapter()
		const { container } = renderDndGrid(adapter, {}, headerWithHandleArg)

		const handles = container.querySelectorAll('[data-slot="column-drag-handle"]')
		expect(handles).toHaveLength(TEST_COLUMNS.length)
		expect(screen.getAllByRole('button', { name: 'Reorder column' })).toHaveLength(TEST_COLUMNS.length)
	})

	// Both doors are the same handle on the same sortable — the shape `HeaderCell` already had for
	// `sortTrigger` / `menu` / `resizer`, repeated for this one.
	it('renders from a header cell body reading the published context', () => {
		const { adapter } = makeDrivableAdapter()
		const { container } = renderDndGrid(adapter, {}, headerWithHandleComponent)

		expect(container.querySelectorAll('[data-slot="column-drag-handle"]')).toHaveLength(TEST_COLUMNS.length)
	})

	it('renders nothing when column ordering is off', () => {
		const { adapter } = makeDrivableAdapter()
		const { container } = renderDndGrid(adapter, { ordering: { column: false } }, headerWithHandleArg)

		expect(container.querySelector('[data-slot="column-drag-handle"]')).toBeNull()
	})

	it('takes an explicit aria-label over the catalogue default', () => {
		const { adapter } = makeDrivableAdapter()
		renderDndGrid(
			adapter,
			{},
			<DataGrid.Table>
				<DataGrid.Header>
					{({ headerGroups }) =>
						headerGroups.map((group) => (
							<DataGrid.HeaderRow
								key={group.id}
								headerGroup={group}
							>
								{({ headers }) =>
									headers.map((header) => (
										<DataGrid.HeaderCell
											key={header.id}
											header={header}
										>
											<ColumnDragHandle aria-label='Move this column' />
										</DataGrid.HeaderCell>
									))
								}
							</DataGrid.HeaderRow>
						))
					}
				</DataGrid.Header>
				<DataGrid.Body />
			</DataGrid.Table>,
		)

		expect(screen.getAllByRole('button', { name: 'Move this column' })).toHaveLength(TEST_COLUMNS.length)
	})
})

/**
 * The index space, which is the part of this phase that fails silently when it is wrong.
 *
 * `@dnd-kit/dom`'s `OptimisticSortingPlugin` sorts each group's sortables by index and asserts the
 * i-th has `index === i`; one hole and the drag stops displacing *and* stops committing. So these
 * cases assert the **whole set** rather than one member — a set assertion is what catches a branch
 * that forgot to register, and a per-column assertion is not.
 */
describe('the drag index space', () => {
	const denseFrom = (specs: DragSpec[]): number[] => specs.map((spec) => spec.index).sort((a, b) => a - b)
	const range = (length: number): number[] => [...Array(length).keys()]

	it('registers one dense item per visible leaf column', () => {
		const { adapter, latestColumnSpecs } = makeDrivableAdapter()
		renderDndGrid(adapter, {}, headerWithHandleArg)

		const specs = latestColumnSpecs()
		expect(specs).toHaveLength(TEST_COLUMNS.length)
		expect(denseFrom(specs)).toEqual(range(TEST_COLUMNS.length))
		expect(specs.every((spec) => spec.axis === 'column')).toBe(true)
	})

	/*
	 * The whole set at once, with every kind of member a real grid has: a selection column (which
	 * renders through an early return of its own), an actions column, a column the author locked,
	 * and ordinary ones. Asserted as a set rather than per column, because that is what catches a
	 * branch which forgot to register — and a hole is silent, not loud.
	 */
	it('registers every kind of leaf column exactly once, densely', () => {
		const { adapter, latestColumnSpecs } = makeDrivableAdapter()
		renderDndGrid(
			adapter,
			{
				selection: true,
				editing: { mode: 'row', onSave: () => Promise.resolve() },
				deleting: { onDelete: () => {} },
				columns: createColumns<TestRow>([
					{ accessorKey: 'name', header: 'Name', ordering: false },
					{ accessorKey: 'age', header: 'Age' },
				]),
			},
			headerWithHandleArg,
		)

		const specs = latestColumnSpecs()
		// selection + 2 declared + actions
		expect(specs).toHaveLength(4)
		expect(denseFrom(specs)).toEqual(range(4))
		// Only the unlocked ordinary column may be picked up; the other three are disabled members.
		expect(specs.filter((spec) => !spec.disabled).map((spec) => spec.id)).toEqual(['age'])
	})

	/*
	 * The selection column renders through an early return of its own — a select-all checkbox and
	 * none of the composed cell — and is still a visible leaf, so it occupies index 0. Skipping it
	 * would leave a hole there in nearly every grid.
	 */
	it('includes the selection column, disabled, so index 0 is not a hole', () => {
		const { adapter, latestColumnSpecs } = makeDrivableAdapter()
		renderDndGrid(adapter, { selection: true }, headerWithHandleArg)

		const specs = latestColumnSpecs()
		expect(specs).toHaveLength(TEST_COLUMNS.length + 1)
		expect(denseFrom(specs)).toEqual(range(TEST_COLUMNS.length + 1))
		const selection = specs.find((spec) => spec.index === 0)
		expect(selection?.disabled).toBe(true)
	})

	it('includes a column the author locked, disabled, and keeps the set dense', () => {
		const lockedColumns = createColumns<TestRow>([
			{ accessorKey: 'name', header: 'Name', ordering: false },
			{ accessorKey: 'age', header: 'Age' },
		])
		const { adapter, latestColumnSpecs } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: lockedColumns }, headerWithHandleArg)

		const specs = latestColumnSpecs()
		expect(denseFrom(specs)).toEqual(range(2))
		expect(specs.find((spec) => spec.id === 'name')?.disabled).toBe(true)
		expect(specs.find((spec) => spec.id === 'age')?.disabled).toBe(false)
	})

	it('disables every column when ordering.column is off, and still registers them all', () => {
		const { adapter, latestColumnSpecs } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { column: false } }, headerWithHandleArg)

		const specs = latestColumnSpecs()
		expect(denseFrom(specs)).toEqual(range(TEST_COLUMNS.length))
		expect(specs.every((spec) => spec.disabled)).toBe(true)
	})

	/*
	 * A column group has sub-headers and a placeholder stands in for a leaf whose real header is in
	 * another row. Neither is a member of the leaf order, so neither may take an index — the set
	 * stays exactly the leaves.
	 */
	it('registers leaves only under a grouped header', () => {
		const groupedColumns = createColumns<TestRow>([
			{ header: 'Person', columns: [{ accessorKey: 'name', header: 'Name' }] },
			{ accessorKey: 'age', header: 'Age' },
		] as never)
		const { adapter, latestColumnSpecs } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: groupedColumns }, headerWithHandleArg)

		const specs = latestColumnSpecs()
		expect(specs.map((spec) => spec.id).sort()).toEqual(['age', 'name'])
		expect(denseFrom(specs)).toEqual(range(2))
	})

	/*
	 * The order is the visual one — start-pinned, centre, end-pinned — because that is the order the
	 * header renders in and the order a drop is resolved against. `getVisibleLeafColumns()` keeps
	 * the declaration order and would put `age` at index 1 here.
	 */
	it('indexes by visual order, so a pinned column moves to the front of the space', () => {
		const { adapter, latestColumnSpecs } = makeDrivableAdapter()
		renderDndGrid(
			adapter,
			{ pinning: { column: true }, initialState: { columnPinning: { start: ['age'] } } },
			headerWithHandleArg,
		)

		expect(latestColumnSpecs().find((spec) => spec.id === 'age')?.index).toBe(0)
	})
})

describe('the dragging attribute', () => {
	it('lands on the dragged header cell and nowhere else', () => {
		const { adapter } = makeDrivableAdapter('name')
		const { container } = renderDndGrid(adapter, {}, headerWithHandleArg)

		const dragging = container.querySelectorAll('[data-column-dragging]')
		expect(dragging).toHaveLength(1)
		expect(dragging[0]).toHaveAttribute('data-column-id', 'name')
	})

	/*
	 * The phase-4 regression, on the other axis: reading the adapter's `isDragging` directly rather
	 * than the gated value stamped the attribute on every item of a grid with ordering off, because
	 * a disabled item still gets whatever the adapter reports for it.
	 */
	it('is absent with ordering off, whatever the adapter reports', () => {
		const { adapter } = makeDrivableAdapter('name')
		const { container } = renderDndGrid(adapter, { ordering: { column: false } }, headerWithHandleArg)

		expect(container.querySelector('[data-column-dragging]')).toBeNull()
	})
})

/**
 * `Alt+ArrowLeft` / `Alt+ArrowRight` move a column, and the drag layer's keyboard sensor moves the
 * one it has picked up with the same keys — so while a column is being dragged, exactly one of the
 * two may act on a press.
 *
 * The grid's focus model also stands down on a drag, and cannot help here: `onHeaderKeyDown` is a
 * prop of the `<th>`, below the element that model listens on, so it has already acted by the time
 * the event bubbles up there. The gate has to be on this handler.
 */
describe('Alt+Arrow while a column is being dragged', () => {
	/** The leaf columns in DOM order — what a reorder changes and a stood-down handler does not. */
	function headerOrder(container: HTMLElement): (string | null)[] {
		return [...container.querySelectorAll('[data-slot="th"]')].map((th) => th.getAttribute('data-column-id'))
	}

	it('does not reorder the dragged column, so one keystroke moves it once', () => {
		const { adapter } = makeDrivableAdapter('name')
		const { container } = renderDndGrid(adapter, {}, headerWithHandleArg)
		const before = headerOrder(container)
		// Fired from the handle inside the dragged `<th>`, which is where the keyboard sensor's own
		// activation requires the keystroke to come from — not from the `<th>`, where a `closest()`
		// matching the element itself would pass with a narrower gate than the real gesture needs.
		const handle = container.querySelector<HTMLElement>('[data-column-dragging] button')
		if (!handle) throw new Error('the dragged header cell rendered no handle')

		fireEvent.keyDown(handle, { key: 'ArrowRight', altKey: true, bubbles: true })

		expect(headerOrder(container)).toEqual(before)
	})

	/*
	 * The negative control, and **the only thing pinning the gate narrow**: it fires the chord on a
	 * column that is not the one being dragged, while a drag is in flight. The gate is a `closest()`
	 * from the event's target, so the chord still works — and any `querySelector` over the grid or
	 * the document, which is what the focus model's own gate uses, fails here. That is exactly what
	 * this case exists to catch.
	 *
	 * **Its subject is the gate's scope, not a permission.** That a sibling column can be reordered
	 * during a pointer drag — mutating the index space `OptimisticSortingPlugin` is operating over —
	 * is a real hazard, pre-existing, and nothing this phase decided to allow; asserting the chord
	 * reaches the ungated column is not an endorsement of doing it.
	 */
	it('still reorders a different column while one is being dragged', () => {
		const { adapter } = makeDrivableAdapter('name')
		const { container } = renderDndGrid(adapter, {}, headerWithHandleArg)
		const age = container.querySelector<HTMLElement>('[data-slot="th"][data-column-id="age"]')
		if (!age) throw new Error('the grid rendered no header cell for "age"')
		// The literal, as every other assertion in this file writes it: a test of a DOM contract
		// states the attribute it expects rather than reading it back from the module under test.
		expect(age.closest('[data-column-dragging]')).toBeNull()

		fireEvent.keyDown(age, { key: 'ArrowLeft', altKey: true, bubbles: true })

		expect(headerOrder(container)).toEqual(['age', 'name'])
	})

	/*
	 * The second control, pinning the other half: the gate must not **over-suppress** when idle. On
	 * its own it is weak — a gate querying the whole grid passes it, since nothing is dragging to
	 * suppress — which is why it sits beside the case above rather than replacing it. Together: that
	 * one says the gate is per-item, this one says it is off when there is no drag.
	 */
	it('reorders the same column on Alt+Arrow when no drag is in flight', () => {
		const { adapter } = makeDrivableAdapter()
		const { container } = renderDndGrid(adapter, {}, headerWithHandleArg)
		expect(container.querySelector('[data-column-dragging]')).toBeNull()
		const name = container.querySelector<HTMLElement>('[data-slot="th"][data-column-id="name"]')
		if (!name) throw new Error('the grid rendered no header cell for "name"')

		fireEvent.keyDown(name, { key: 'ArrowRight', altKey: true, bubbles: true })

		expect(headerOrder(container)).toEqual(['age', 'name'])
	})
})

describe('the sortable ref', () => {
	/*
	 * The `<th>` is the element the drag moves, so it is the element the ref must reach. Written as
	 * its own case because both kits' `Th` dropped the ref until this phase while typechecking
	 * clean — `ThProps` has declared it since the port landed.
	 */
	it('lands on the header cell element', () => {
		const { adapter, nodes } = makeDrivableAdapter()
		const { container } = renderDndGrid(adapter, {}, headerWithHandleArg)

		const node = nodes.get('name')
		expect(node).not.toBeNull()
		expect(node).toBe(container.querySelector('[data-slot="th"][data-column-id="name"]'))
	})
})

describe('committing a column drop', () => {
	it('writes the order once and calls onChange exactly once', () => {
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { column: { onChange } } }, headerWithHandleArg)

		// The adapter reports the column the pointer was over; `name` takes `age`'s place.
		fireDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'age' })

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith(['age', 'name'])
	})

	it('commits nothing when the drop lands on the source itself', () => {
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { column: { onChange } } }, headerWithHandleArg)

		fireDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'name' })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('commits nothing for a target id no column carries', () => {
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { column: { onChange } } }, headerWithHandleArg)

		fireDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'nope' })

		expect(onChange).not.toHaveBeenCalled()
	})

	/*
	 * The PRD's success criterion for this phase, and the first time `dropColumn` is exercised on a
	 * real boundary from the React layer: a leaf may not leave its own header group. Refused at the
	 * commit rather than mid-drag, which is the boundary model the PRD settled on.
	 */
	it('refuses a leaf dragged out of its header group, and fires no change', () => {
		const groupedColumns = createColumns<TestRow>([
			{ header: 'Person', columns: [{ accessorKey: 'name', header: 'Name' }] },
			{ header: 'Facts', columns: [{ accessorKey: 'age', header: 'Age' }] },
		] as never)
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: groupedColumns, ordering: { column: { onChange } } }, headerWithHandleArg)

		fireDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'age' })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('ignores a drop on the row axis', () => {
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { column: { onChange }, row: true } }, headerWithHandleArg)

		fireDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: '3' })

		expect(onChange).not.toHaveBeenCalled()
	})
})

/**
 * `canDrop`, the predicate the grid publishes to its adapter so that an illegal step never happens.
 *
 * It answers the same question the commit asks, and it exists because refusing at release is not
 * enough: the drag library reassigns its own indices as it displaces, and a refusal writes no state,
 * so nothing re-renders to put them back. See `DndProviderProps.canDrop`.
 */
describe('the canDrop predicate', () => {
	it('allows a move between siblings of one header group', () => {
		const groupedColumns = createColumns<TestRow>([
			{
				header: 'Person',
				columns: [
					{ accessorKey: 'name', header: 'Name' },
					{ accessorKey: 'age', header: 'Age' },
				],
			},
		] as never)
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: groupedColumns }, headerWithHandleArg)

		expect(askCanDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'age' })).toBe(true)
	})

	it('refuses a leaf leaving its header group', () => {
		const groupedColumns = createColumns<TestRow>([
			{ header: 'Person', columns: [{ accessorKey: 'name', header: 'Name' }] },
			{ header: 'Facts', columns: [{ accessorKey: 'age', header: 'Age' }] },
		] as never)
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: groupedColumns }, headerWithHandleArg)

		expect(askCanDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'age' })).toBe(false)
	})

	it('refuses a locked column as the source', () => {
		const lockedColumns = createColumns<TestRow>([
			{ accessorKey: 'name', header: 'Name', ordering: false },
			{ accessorKey: 'age', header: 'Age' },
		])
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { columns: lockedColumns }, headerWithHandleArg)

		expect(askCanDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'age' })).toBe(false)
	})

	/*
	 * The case whose absence would break every drag after its first step, on both axes: once a
	 * sortable has displaced a neighbour the source occupies its destination, so the collision
	 * resolves to the source itself from then on. `canDropColumn(a, a)` is `false` — correctly, as a
	 * drop — so answering from it would refuse every subsequent hover, silently. The grid allows it
	 * rather than relying on each adapter to filter it first.
	 */
	it('allows a self-hover on either axis, because it asks no question', () => {
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: true, column: true } }, headerWithHandleArg)

		expect(askCanDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'name' })).toBe(true)
		expect(askCanDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: '1' })).toBe(true)
	})

	it('refuses an id no column owns', () => {
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, {}, headerWithHandleArg)

		expect(askCanDrop({ axis: 'column', surface: 'table', sourceId: 'name', targetId: 'nope' })).toBe(false)
	})

	// The row arm of the same predicate, asked from a grid that registered row ordering. Its own
	// refusals are core's (`canDropRow`); what is checked here is that the arm is wired at all.
	it('answers the row axis from the row ordering API', () => {
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { row: true, column: true } }, headerWithHandleArg)

		// `TEST_ROWS` carry their own `id`, so the row ids are '1'..'3', not positions.
		expect(askCanDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: '2' })).toBe(true)
		// A row id nothing owns still reaches `canDropRow`, which refuses it.
		expect(askCanDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: 'nope' })).toBe(false)
	})

	it('refuses the row axis in a grid that has no row ordering', () => {
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderDndGrid(adapter, { ordering: { column: true } }, headerWithHandleArg)

		expect(askCanDrop({ axis: 'row', surface: 'table', sourceId: '1', targetId: '2' })).toBe(false)
	})
})

/**
 * `useColumnDrag()` — the public read a kit or an application uses to write a handle of its own, and
 * the replacement for the `isDragging` that `DataGridHeaderCellRenderArgs` deliberately does not
 * carry (the sortable lives in the shell, so the cell cannot know the flag).
 */
describe('useColumnDrag', () => {
	function DragProbe({ onRead }: { onRead: (value: ReturnType<typeof useColumnDrag>) => void }) {
		onRead(useColumnDrag())
		return null
	}

	const headerWithProbe = (onRead: (value: ReturnType<typeof useColumnDrag>) => void) => (
		<DataGrid.Table>
			<DataGrid.Header>
				{({ headerGroups }) =>
					headerGroups.map((group) => (
						<DataGrid.HeaderRow
							key={group.id}
							headerGroup={group}
						>
							{({ headers }) =>
								headers.map((header) => (
									<DataGrid.HeaderCell
										key={header.id}
										header={header}
									>
										{header.column.id === 'name' ? <DragProbe onRead={onRead} /> : null}
									</DataGrid.HeaderCell>
								))
							}
						</DataGrid.HeaderRow>
					))
				}
			</DataGrid.Header>
			<DataGrid.Body />
		</DataGrid.Table>
	)

	it('reports the activator ref and the dragging flag of its own column', () => {
		const reads: ReturnType<typeof useColumnDrag>[] = []
		const { adapter } = makeDrivableAdapter('name')
		renderDndGrid(
			adapter,
			{},
			headerWithProbe((value) => reads.push(value)),
		)

		const last = reads.at(-1)
		expect(last).not.toBeNull()
		expect(last?.isDragging).toBe(true)
		expect(last?.handleRef).toBeTypeOf('function')
	})

	it('reports null for a column that cannot be dragged', () => {
		const reads: ReturnType<typeof useColumnDrag>[] = []
		const { adapter } = makeDrivableAdapter()
		renderDndGrid(
			adapter,
			{ ordering: { column: false } },
			headerWithProbe((value) => reads.push(value)),
		)

		expect(reads.at(-1)).toBeNull()
	})

	it('reports null in a grid with no adapter at all', () => {
		const reads: ReturnType<typeof useColumnDrag>[] = []
		renderDndGrid(
			undefined,
			{},
			headerWithProbe((value) => reads.push(value)),
		)

		expect(reads.at(-1)).toBeNull()
	})
})
