import { render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createDataGrid } from '../../create-data-grid'
import { TEST_COLUMNS, TEST_FEATURES, TEST_ROWS, testComponents } from '../../test-utils'
import { DataGrid } from '../data-grid'

import { DndAdapterProvider, noopDndAdapter, useDndEnabled, useSortableItem } from './index'

import type { DndAdapter, DragSpec, SortableItemHandle } from './index'

/** A stand-in for a kit's adapter: records the specs it is handed, returns one sentinel handle. */
function makeTestAdapter(): { adapter: DndAdapter; specs: DragSpec[]; handle: SortableItemHandle } {
	const specs: DragSpec[] = []
	const handle: SortableItemHandle = { ref: () => {}, handleRef: () => {}, isDragging: true }
	const adapter: DndAdapter = {
		Provider: ({ children }) => <>{children}</>,
		// A hook by contract, so it must obey the Rules of Hooks even while ignoring its spec —
		// hence a plain function with no state of its own.
		useSortableItem: (spec) => {
			specs.push(spec)
			return handle
		},
	}
	return { adapter, specs, handle }
}

/** Reports what a component *below* a grid root sees. */
function DndProbe({ label }: { label: string }) {
	return <span data-testid={label}>{useDndEnabled() ? 'enabled' : 'disabled'}</span>
}

describe('the no-op adapter', () => {
	it('hands back one inert handle, whatever the spec', () => {
		// Arrange / Act
		const first = noopDndAdapter.useSortableItem({ id: 'a', index: 0, axis: 'row' })
		const second = noopDndAdapter.useSortableItem({ id: 'b', index: 7, axis: 'column' })

		// Assert — the *same object*, so a grid with no DnD never invalidates a memo keyed on it.
		expect(first).toBe(second)
		expect(first.isDragging).toBe(false)
	})
})

describe('a grid whose bundle brought no adapter', () => {
	it('renders exactly the DOM a grid with no factory at all renders', () => {
		const baseline = render(
			<DataGrid
				components={testComponents}
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			/>,
		)
		const baselineHtml = baseline.container.innerHTML
		baseline.unmount()

		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents })
		const bound = render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			/>,
		)
		const boundHtml = bound.container.innerHTML
		bound.unmount()

		/*
		 * The half with teeth. Without it the case would still pass if the DnD providers were
		 * deleted outright — it would prove only that a provider emits no DOM. Rendering a grid
		 * that *has* an adapter, and getting the same markup, is what states the claim this phase
		 * actually makes: the port is inert until a surface renders a handle, which is phase 4.
		 */
		const { adapter } = makeTestAdapter()
		const { DataGrid: DndDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })
		const withDnd = render(
			<DndDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			/>,
		)

		expect(boundHtml).toBe(baselineHtml)
		expect(withDnd.container.innerHTML).toBe(baselineHtml)
	})

	it('reports DnD as disabled below the root', () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents })
		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			>
				<DndProbe label='plain' />
			</BoundDataGrid>,
		)

		expect(screen.getByTestId('plain')).toHaveTextContent('disabled')
	})
})

describe('a grid whose bundle brought an adapter', () => {
	it('reports DnD as enabled below the root', () => {
		const { adapter } = makeTestAdapter()
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })
		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			>
				<DndProbe label='dnd' />
			</BoundDataGrid>,
		)

		expect(screen.getByTestId('dnd')).toHaveTextContent('enabled')
	})

	it('routes useSortableItem to it, spec intact', () => {
		const { adapter, specs, handle } = makeTestAdapter()
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })
		// Wrapper object written in an effect, not a bare `let` written during render — the same
		// shape `renderGrid` uses in `test-utils.tsx`, and for the same reason.
		const seen: { handle: SortableItemHandle | null } = { handle: null }

		function Item() {
			const item = useSortableItem({ id: 'row-3', index: 3, axis: 'row', disabled: false })
			useEffect(() => {
				seen.handle = item
			}, [item])
			return null
		}

		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			>
				<Item />
			</BoundDataGrid>,
		)

		expect(specs).toContainEqual({ id: 'row-3', index: 3, axis: 'row', disabled: false })
		expect(seen.handle).toBe(handle)
	})

	/*
	 * The defect the two-context split exists to prevent. Every context in this package is created
	 * at module scope, so without a grid-level layer the inner grid would read the outer bundle's
	 * adapter — and a nested grid is a real arrangement here (an expanded detail row, a grid in a
	 * cell), not a hypothetical.
	 */
	it('does not hand its adapter to a grid nested among its children', () => {
		const { adapter } = makeTestAdapter()
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents, dnd: adapter })

		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			>
				<DndProbe label='outer' />
				<DataGrid
					features={TEST_FEATURES}
					data={TEST_ROWS}
					columns={TEST_COLUMNS}
				>
					<DndProbe label='inner' />
				</DataGrid>
			</BoundDataGrid>,
		)

		expect(screen.getByTestId('outer')).toHaveTextContent('enabled')
		expect(screen.getByTestId('inner')).toHaveTextContent('disabled')
	})

	/*
	 * The same isolation one layer up: a grid from a *second bundle* nested inside. The inner
	 * `BoundDataGrid` republishes its own bundle layer, so the inner grid must run on the inner
	 * adapter — not the outer one, and not nothing. This is the arrangement a docs page or an app
	 * with two kits produces, and it is the case where a single shared context would be wrong in
	 * the opposite direction from the test above.
	 */
	it('lets a nested bundle bring its own adapter', () => {
		const outer = makeTestAdapter()
		const inner = makeTestAdapter()
		const { DataGrid: OuterDataGrid } = createDataGrid({ components: testComponents, dnd: outer.adapter })
		const { DataGrid: InnerDataGrid } = createDataGrid({ components: testComponents, dnd: inner.adapter })

		function InnerItem() {
			useSortableItem({ id: 'inner-row', index: 0, axis: 'row' })
			return null
		}

		render(
			<OuterDataGrid
				features={TEST_FEATURES}
				data={TEST_ROWS}
				columns={TEST_COLUMNS}
			>
				<DndProbe label='bundle-outer' />
				<InnerDataGrid
					features={TEST_FEATURES}
					data={TEST_ROWS}
					columns={TEST_COLUMNS}
				>
					<DndProbe label='bundle-inner' />
					<InnerItem />
				</InnerDataGrid>
			</OuterDataGrid>,
		)

		expect(screen.getByTestId('bundle-outer')).toHaveTextContent('enabled')
		expect(screen.getByTestId('bundle-inner')).toHaveTextContent('enabled')
		expect(inner.specs).toContainEqual({ id: 'inner-row', index: 0, axis: 'row' })
		expect(outer.specs).toEqual([])
	})
})

describe('the development-mode identity warning', () => {
	it('fires when the adapter changes under a mounted tree', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const first = makeTestAdapter().adapter
		const second = makeTestAdapter().adapter

		const { rerender } = render(
			<DndAdapterProvider adapter={first}>
				<DndProbe label='warned' />
			</DndAdapterProvider>,
		)
		expect(error).not.toHaveBeenCalled()

		rerender(
			<DndAdapterProvider adapter={second}>
				<DndProbe label='warned' />
			</DndAdapterProvider>,
		)

		expect(error).toHaveBeenCalledOnce()
		expect(error.mock.calls[0]?.[0]).toContain('bound once')
		error.mockRestore()
	})

	it('stays quiet while the adapter keeps its identity', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { adapter } = makeTestAdapter()

		const { rerender } = render(
			<DndAdapterProvider adapter={adapter}>
				<DndProbe label='quiet' />
			</DndAdapterProvider>,
		)
		rerender(
			<DndAdapterProvider adapter={adapter}>
				<DndProbe label='quiet' />
			</DndAdapterProvider>,
		)

		expect(error).not.toHaveBeenCalled()
		error.mockRestore()
	})
})
