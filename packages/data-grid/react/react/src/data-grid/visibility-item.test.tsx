import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { TEST_FEATURES, TEST_ROWS, testComponents } from '../test-utils'

import { ColumnDragHandle } from './column-drag-handle'
import { DataGrid } from './data-grid'

import type { TestRow } from '../test-utils'
import type { DndAdapter, DndDragOverEvent, DndDropEvent, DragSpec, SortableItemHandle } from './dnd'
import type { ReactNode } from 'react'

/**
 * The visibility panel is the **second surface of the column axis**, and every case here is about
 * the one thing that makes it a surface rather than another axis: its index space is a different
 * list. The header registers the visible leaves in visual (pin-banded) order; the panel registers
 * every listed leaf, hidden ones included, in the `columnOrder` order — not the declaration order,
 * which `getAllLeafColumns()` only falls back to when that slice is empty. Those two runs cannot share one dense `0..n-1`
 * space — and the penalty for trying is total, silent failure of both. See `DragSurface`.
 *
 * Driven through `<DataGrid.VisibilityTrigger>`'s render function rather than through a kit's
 * `VisibilityMenu`, because the component under test is the one a kit mounts: this is exactly the
 * shape both kits' panels now have, minus their markup.
 */

/** The same drivable double the other two drag suites use, with the surface exposed for filtering. */
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
					nodes.set(`${spec.surface}:${spec.id}`, node)
				},
				handleRef: () => {},
				isDragging: spec.id === draggingId,
			}
		},
	}

	/**
	 * One column spec per id on one surface, taking the most recent render's value.
	 *
	 * Filtered on the **axis as well as the surface**, because `table` holds both: a grid with a
	 * body registers every row there too, disabled while row ordering is off, in its own dense
	 * space. Reading the surface alone mixed the two — which is a fair reminder that the axis is
	 * what partitions the slice and the surface only the list.
	 */
	const latestOn = (surface: DragSpec['surface']) => {
		const byId = new Map<string, DragSpec>()
		for (const spec of specs) if (spec.surface === surface && spec.axis === 'column') byId.set(spec.id, spec)
		return [...byId.values()]
	}

	return {
		adapter,
		specs,
		nodes,
		latestOn,
		fireDrop: (event: DndDropEvent) => {
			for (const onDrop of drops) onDrop(event)
		},
		askCanDrop: (event: DndDragOverEvent): boolean => guards.every((canDrop) => canDrop(event)),
	}
}

/**
 * Four leaves, one of them locked — enough to tell the two index spaces apart once one is hidden.
 *
 * `city` carries `ordering: false`, which is the author fixing its place: it must still **register**,
 * because leaving it out would put a gap in the space, and must offer no handle.
 */
const PANEL_COLUMNS = createColumns<TestRow>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'age', header: 'Age' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'city', header: 'City', ordering: false },
] as never)

/** The panel as both kits now render it: the shared item, the kit's contents, the shared handle. */
const panel = (
	<DataGrid.VisibilityTrigger>
		{({ columns }) =>
			columns.map((col) => (
				<DataGrid.VisibilityItem
					key={col.id}
					columnId={col.id}
				>
					<ColumnDragHandle />
					<span>{col.label}</span>
				</DataGrid.VisibilityItem>
			))
		}
	</DataGrid.VisibilityTrigger>
)

/** The header beside it, so one grid mounts both surfaces — which is when density can break. */
const header = (
	<DataGrid.Table>
		<DataGrid.Header>
			{({ headerGroups }) =>
				headerGroups.map((group) => (
					<DataGrid.HeaderRow
						key={group.id}
						headerGroup={group}
					>
						{({ headers }) =>
							headers.map((h) => (
								<DataGrid.HeaderCell
									key={h.id}
									header={h}
								>
									{({ dragHandle }) => dragHandle}
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

function renderPanelGrid(
	adapter: DndAdapter | undefined,
	config: Record<string, unknown> = {},
	children: ReactNode = panel,
): ReturnType<typeof render> {
	const { DataGrid: BoundDataGrid } = createDataGrid({
		components: testComponents,
		...(adapter ? { dnd: adapter } : {}),
	})

	return render(
		<BoundDataGrid
			features={TEST_FEATURES}
			data={TEST_ROWS}
			columns={PANEL_COLUMNS}
			ordering={{ column: { visibilityMenu: true } }}
			{...config}
		>
			{children}
		</BoundDataGrid>,
	)
}

describe('a panel in a grid with no drag adapter', () => {
	it('renders the same row element it rendered before the drag existed, and no handle', () => {
		const { container } = renderPanelGrid(undefined)

		const items = container.querySelectorAll('[data-slot="column-visibility-item"]')
		expect(items).toHaveLength(PANEL_COLUMNS.length)
		expect(container.querySelector('[data-slot="column-drag-handle"]')).toBeNull()
		// Nothing registered, so nothing to identify: the drag shell is what stamps the column id.
		expect(container.querySelector('[data-slot="column-visibility-item"][data-column-id]')).toBeNull()
	})

	it('registers nothing when the panel offers no moves, even with an adapter bound', () => {
		// `ordering.column: true` without `visibilityMenu` is the default Columns toggle: a list of
		// checkboxes, no order to read, nothing to drag. The header still registers.
		const { adapter, latestOn } = makeDrivableAdapter()
		renderPanelGrid(adapter, { ordering: { column: true } })

		expect(latestOn('panel')).toHaveLength(0)
	})
})

/**
 * The two components a kit's `VisibilityMenu` mounts have to survive being rendered **outside** a
 * grid, because that is what both kits' own unit suites do — the menu is a DI component taking a
 * `columns` array, so a grid is not needed to exercise its markup. Five of their cases went red
 * when this phase first landed, and neither `typecheck`, `lint` nor anything in this package caught
 * it: nothing here rendered a kit block on its own. These two cases are that gap closed on this side
 * of the boundary, where the components live.
 */
describe('rendered outside a grid', () => {
	it('renders the row with its slot and no handle', () => {
		const { container } = render(
			<DataGrid.VisibilityItem columnId='name'>
				<ColumnDragHandle />
				<span>Name</span>
			</DataGrid.VisibilityItem>,
		)

		expect(container.querySelector('[data-slot="column-visibility-item"]')).not.toBeNull()
		expect(container.querySelector('[data-slot="column-drag-handle"]')).toBeNull()
	})

	/*
	 * The handle's own half, rendered with no row above it either. It reads three contexts and must
	 * reach its `null` return before touching any of their values — which is why the components
	 * destructure sits *below* the early return in that file, and this is what stops a tidy-up from
	 * hoisting it back up.
	 */
	it('renders nothing at all with no surface above it', () => {
		const { container } = render(<ColumnDragHandle />)

		expect(container.innerHTML).toBe('')
	})
})

describe('the panel index space', () => {
	it('registers every listed column once, at dense indices in the panel list order', () => {
		const { adapter, latestOn } = makeDrivableAdapter()
		renderPanelGrid(adapter)

		expect(latestOn('panel').map((spec) => [spec.id, spec.index])).toEqual([
			['name', 0],
			['age', 1],
			['email', 2],
			['city', 3],
		])
	})

	/**
	 * "Once" needs its own case, because the one above **cannot see a duplicate**: `latestOn` folds the
	 * recorded specs through a `Map` keyed by id, so two registrations of one column collapse into one
	 * before the assertion runs. That fold is right for reading the *current* value of each spec across
	 * re-renders and wrong for counting registrations, so counting gets its own read of the raw list.
	 *
	 * The duplicate it guards against is not hypothetical: a panel that renders one column twice — a
	 * "pinned" section repeating a row, or two `<DataGrid.VisibilityTrigger>` in one grid — puts two
	 * sortables at one index, which the drag library refuses exactly as it refuses a gap, and silently.
	 */
	it('registers each column exactly once per render pass, with no duplicate index', () => {
		const { adapter, specs } = makeDrivableAdapter()
		renderPanelGrid(adapter)

		const panel = specs.filter((spec) => spec.surface === 'panel' && spec.axis === 'column')
		// One render pass per column, and the passes are whole: the count is a multiple of the list
		// length, and within the last pass every index appears once.
		const passes = panel.length / PANEL_COLUMNS.length
		expect(Number.isInteger(passes)).toBe(true)
		const lastPass = panel.slice(-PANEL_COLUMNS.length)
		expect(new Set(lastPass.map((spec) => spec.id)).size).toBe(PANEL_COLUMNS.length)
		expect(lastPass.map((spec) => spec.index).sort((a, b) => a - b)).toEqual([0, 1, 2, 3])
	})

	/*
	 * The case the whole surface exists for. A hidden column has no header cell and therefore no
	 * place in the header's space at all, while the panel lists it precisely so it can be moved — so
	 * the two spaces have different lengths, which is why one `group` could not serve both.
	 */
	it('keeps a hidden column in the space, while the header drops it', () => {
		const { adapter, latestOn } = makeDrivableAdapter()
		renderPanelGrid(
			adapter,
			{ initialState: { columnVisibility: { age: false } } },
			<>
				{header}
				{panel}
			</>,
		)

		expect(latestOn('panel').map((spec) => [spec.id, spec.index])).toEqual([
			['name', 0],
			['age', 1],
			['email', 2],
			['city', 3],
		])
		expect(latestOn('table').map((spec) => [spec.id, spec.index])).toEqual([
			['name', 0],
			['email', 1],
			['city', 2],
		])
	})

	it('registers a locked column disabled rather than leaving a gap', () => {
		const { adapter, latestOn } = makeDrivableAdapter()
		renderPanelGrid(adapter)

		const city = latestOn('panel').find((spec) => spec.id === 'city')
		expect(city).toMatchObject({ index: 3, disabled: true })
		expect(latestOn('panel').filter((spec) => spec.disabled !== true)).toHaveLength(3)
	})

	it('lands the sortable ref on the row element, which is what moves', () => {
		const { adapter, nodes } = makeDrivableAdapter()
		const { container } = renderPanelGrid(adapter)

		expect(nodes.get('panel:name')).toBe(
			container.querySelector('[data-slot="column-visibility-item"][data-column-id="name"]'),
		)
	})
})

describe('the panel drag handle', () => {
	it('renders for every column whose place is not fixed', () => {
		const { adapter } = makeDrivableAdapter()
		const { container } = renderPanelGrid(adapter)

		// Three of four: `city` is locked, so it offers no handle while keeping its index.
		expect(container.querySelectorAll('[data-slot="column-drag-handle"]')).toHaveLength(3)
	})

	it('stamps the dragging state on the row being dragged, and on no other', () => {
		const { adapter } = makeDrivableAdapter('email')
		const { container } = renderPanelGrid(adapter)

		const dragging = container.querySelectorAll('[data-column-dragging="true"]')
		expect(dragging).toHaveLength(1)
		expect(dragging[0]?.getAttribute('data-column-id')).toBe('email')
	})
})

describe('committing a panel drop', () => {
	it('resolves the target in the panel list and writes the order once', () => {
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderPanelGrid(adapter, { ordering: { column: { visibilityMenu: true, onChange } } })

		fireDrop({ axis: 'column', surface: 'panel', sourceId: 'name', targetIndex: 2 })

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith(['age', 'email', 'name', 'city'])
	})

	/*
	 * `ColumnMoveScope.All` is the panel's scope, and this is what it buys: a hidden column is a
	 * legal landing place there. The header's `Visible` scope refuses the same drop — asserted in the
	 * `canDrop` block below, in one grid, which is the PRD's success criterion for this phase.
	 */
	it('lands on a hidden column, which the header could not', () => {
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderPanelGrid(adapter, {
			initialState: { columnVisibility: { age: false } },
			ordering: { column: { visibilityMenu: true, onChange } },
		})

		// Index 1 in the panel list is `age`, hidden — and the panel still counts it.
		fireDrop({ axis: 'column', surface: 'panel', sourceId: 'email', targetIndex: 1 })

		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange).toHaveBeenCalledWith(['name', 'email', 'age', 'city'])
	})

	it('commits nothing for a source whose place the author fixed', () => {
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderPanelGrid(adapter, { ordering: { column: { visibilityMenu: true, onChange } } })

		fireDrop({ axis: 'column', surface: 'panel', sourceId: 'city', targetIndex: 0 })

		expect(onChange).not.toHaveBeenCalled()
	})

	it('commits nothing for an index the panel list does not reach', () => {
		const onChange = vi.fn()
		const { adapter, fireDrop } = makeDrivableAdapter()
		renderPanelGrid(adapter, { ordering: { column: { visibilityMenu: true, onChange } } })

		fireDrop({ axis: 'column', surface: 'panel', sourceId: 'name', targetIndex: 99 })

		expect(onChange).not.toHaveBeenCalled()
	})
})

/**
 * The two surfaces' scopes, asked of one grid — which is the only way to see that they differ.
 *
 * `canDrop` is what keeps an illegal step from happening at all; the commit's guards stay behind it.
 * Here it doubles as the cleanest statement of the phase: the same pair of columns is a legal drop
 * in the panel and not in the header.
 */
describe('canDrop per surface', () => {
	it('allows a hidden target in the panel and refuses it in the header', () => {
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderPanelGrid(
			adapter,
			{ initialState: { columnVisibility: { age: false } } },
			<>
				{header}
				{panel}
			</>,
		)

		expect(askCanDrop({ axis: 'column', surface: 'panel', sourceId: 'email', targetId: 'age' })).toBe(true)
		expect(askCanDrop({ axis: 'column', surface: 'table', sourceId: 'email', targetId: 'age' })).toBe(false)
	})

	it('refuses a locked column as the source on either surface', () => {
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderPanelGrid(
			adapter,
			{},
			<>
				{header}
				{panel}
			</>,
		)

		expect(askCanDrop({ axis: 'column', surface: 'panel', sourceId: 'city', targetId: 'name' })).toBe(false)
		expect(askCanDrop({ axis: 'column', surface: 'table', sourceId: 'city', targetId: 'name' })).toBe(false)
	})

	it('answers a self-hover true, on the panel as on the header', () => {
		// Once a sortable has displaced its first neighbour the collision resolves to the source, on
		// nearly every frame. Refusing that would stop every legal step after the first.
		const { adapter, askCanDrop } = makeDrivableAdapter()
		renderPanelGrid(adapter)

		expect(askCanDrop({ axis: 'column', surface: 'panel', sourceId: 'name', targetId: 'name' })).toBe(true)
	})
})
