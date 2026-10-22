import { createColumns } from '@ez-kit/data-grid-core'
import { createStore, useSelector } from '@tanstack/react-store'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { useCellTypes } from '../cell-types-context'
import { GridComponentsProvider } from '../components-context'
import { useGridContext } from '../grid-context'
import { TEST_FEATURES, testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { CellTypeDefinition, CellViewProps } from '../cell-types-context'
import type { GridComponents } from '../contract'
import type { GridFeatures, ThProps, TrProps } from '../types'
import type { Store } from '@tanstack/react-store'
import type { ReactElement, ReactNode } from 'react'

const useIsolationContext = useGridContext.withTypes<{
	isolationCanEdit?: boolean
	isolationHighlight?: Store<{ highlighted: boolean }>
}>()

// JSDOM lacks ResizeObserver; the table layout effect needs one.
beforeAll(() => {
	vi.stubGlobal(
		'ResizeObserver',
		class StubResizeObserver {
			observe(): void {}
			unobserve(): void {}
			disconnect(): void {}
		},
	)
})

/*
 * What this file guards, and the audit behind it.
 *
 * Every context value `<DataGrid>` publishes was checked for a rebuild with unchanged inputs:
 * `DndBundleProvider` (a constant `null`), `DndAdapterProvider` (the bundle's adapter, read from
 * context), `GridFactoryDefaultsProvider` (a constant `undefined`), `GridComponentsProvider`
 * (memoised; `guard` is a module-level function), `TableProvider` (the `useState`-held table),
 * `RowDragRegistryProvider` (a ref), `GridDndProvider` (every prop to the adapter's provider is a
 * `useCallback` / `useMemo`), `ItemsSourceProvider` (a `useState`-held store) and
 * `AriaRowIndexProvider` (memoised). One was rebuilt per render, `CellTypesProvider`'s registry —
 * merged inline in `DataGridControlled`, so every cell re-rendered with its host. That is the fix
 * the second and third tests hold.
 *
 * Two are rebuilt per render and are **left that way on purpose**, both mounted by `DataGridTable`:
 *
 * - `VirtualProvider`'s `{ rowVirtualizer }`. The rebuild is the notification: `useVirtualizer`
 *   re-renders `DataGridTable`, the hook's owner, on every scroll frame, and a `VirtualBody`
 *   mounted through a composed table's `children` learns the window moved only because this value
 *   changed. Memoising it would freeze virtual scrolling in exactly that arrangement.
 * - `InfiniteProvider`'s `{ getScrollElement }`. Its one reader, `LoadMoreFooter`, also reads the
 *   virtual context above, so it re-renders with `DataGridTable` whatever this value does.
 *
 * Neither reaches a cell, a header cell or a row, and neither re-renders on a host re-render when
 * the layout is `children`, which is what the tests below assert.
 */

/**
 * Render counts, bumped from an **effect** rather than during render: an effect without a
 * dependency list runs once per committed render, which is the quantity under test, and it keeps
 * the counting components pure.
 */
type Counters = { cell: number; header: number; row: number }

type Row = { id: number; name: string; email: string }
const DATA: Row[] = [
	{ id: 1, name: 'Alice', email: 'a@x' },
	{ id: 2, name: 'Bob', email: 'b@x' },
	{ id: 3, name: 'Carol', email: 'c@x' },
]
const COUNTED_TYPE = 'counted' as const

/** Calls `onRender` once per committed render of the component that calls it. */
function useCountRender(onRender: () => void): void {
	useEffect(() => {
		onRender()
	})
}

/** A callback bumping one counter, built outside the component so the hook only calls it. */
function bump<TKey extends string>(counters: Record<TKey, number>, key: TKey): () => void {
	return () => {
		counters[key] += 1
	}
}

function makeCellTypes(counters: Counters): Record<string, CellTypeDefinition> {
	function CountedCell({ value }: CellViewProps): ReactElement {
		useCountRender(bump(counters, 'cell'))
		return <span>{String(value)}</span>
	}
	return { [COUNTED_TYPE]: { view: CountedCell } }
}

function makeComponents(counters: Counters): Required<GridComponents> {
	const InnerTh = testComponents.core.Th
	const InnerTr = testComponents.core.Tr
	function CountedTh(props: ThProps): ReactElement {
		useCountRender(bump(counters, 'header'))
		return <InnerTh {...props} />
	}
	function CountedTr(props: TrProps): ReactElement {
		useCountRender(bump(counters, 'row'))
		return <InnerTr {...props} />
	}
	return { ...testComponents, core: { ...testComponents.core, Th: CountedTh, Tr: CountedTr } }
}

const COLUMNS = createColumns<Row, { [COUNTED_TYPE]: Record<never, never> }>([
	{ accessorKey: 'name', cell: { type: COUNTED_TYPE } },
	{ accessorKey: 'email', cell: { type: COUNTED_TYPE } },
])

/**
 * A host holding state of its own, rendering a grid whose whole configuration is hoisted, with the
 * layout handed in as `children` built **outside** the host — the arrangement the render-isolation
 * guarantee is stated for. The button re-renders the host and changes nothing the grid reads.
 */
function renderHostedGrid(): { counters: Counters; registries: unknown[] } {
	const counters: Counters = { cell: 0, header: 0, row: 0 }
	const registries: unknown[] = []
	const cellTypes = makeCellTypes(counters)
	const components = makeComponents(counters)

	/** Records the registry every render receives, so a test can compare identities across renders. */
	function RegistryProbe(): null {
		registries.push(useCellTypes())
		return null
	}

	const layout = (
		<>
			<RegistryProbe />
			<DataGrid.Table />
		</>
	)

	function Host({ children }: { children: ReactNode }): ReactElement {
		const [renders, setRenders] = useState(0)
		const table = useDataGrid<GridFeatures, Row>({
			features: TEST_FEATURES,
			data: DATA,
			columns: COLUMNS,
			cellTypes,
		})
		return (
			<>
				<button
					type='button'
					onClick={() => {
						setRenders((n) => n + 1)
					}}
				>
					re-render host {renders}
				</button>
				<DataGrid<GridFeatures, Row> table={table}>{children}</DataGrid>
			</>
		)
	}

	render(
		<GridComponentsProvider components={components}>
			<Host>{layout}</Host>
		</GridComponentsProvider>,
	)
	return { counters, registries }
}

describe('host re-render isolation', () => {
	it('renders every counted component on mount', () => {
		const { counters } = renderHostedGrid()

		expect(counters.cell).toBeGreaterThanOrEqual(DATA.length * 2)
		expect(counters.header).toBeGreaterThanOrEqual(2)
		expect(counters.row).toBeGreaterThanOrEqual(DATA.length)
	})

	it('a host re-render with an unchanged configuration re-renders no cell, header cell or row', () => {
		const { counters } = renderHostedGrid()
		const before = { ...counters }

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /re-render host/ }))
		})

		expect(screen.getByRole('button', { name: 're-render host 1' })).toBeInTheDocument()
		expect(counters).toEqual(before)
	})

	it('a host re-render leaves the cell type registry untouched, so its readers do not re-render', () => {
		const { registries } = renderHostedGrid()
		const rendersBefore = registries.length

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /re-render host/ }))
		})

		expect(registries).toHaveLength(rendersBefore)
		expect(new Set(registries).size).toBe(1)
	})
})

/**
 * The two live-value arrangements the guarantee is stated for: a value in the host's own state,
 * passed through `context`, and a store held in `context` by reference and written outside React.
 *
 * The `name` column reads the live value; the `email` column does not. So a change must reach the
 * three `name` cells and nothing else — not the `email` cells, not a header cell, not a row.
 */
describe('live values through context', () => {
	type LiveCounters = Counters & { reader: number }

	const PERMISSION_TYPE = 'permission' as const
	const HIGHLIGHT_TYPE = 'highlight' as const

	function makeLiveCellTypes(counters: LiveCounters): Record<string, CellTypeDefinition> {
		function PermissionCell({ value }: CellViewProps): ReactElement {
			const canEdit = useIsolationContext((context) => context.isolationCanEdit ?? false)
			useCountRender(bump(counters, 'reader'))
			return <span data-testid='permission'>{`${String(value)}:${String(canEdit)}`}</span>
		}
		function HighlightCell({ value }: CellViewProps): ReactElement {
			const store = useIsolationContext((context) => context.isolationHighlight)
			if (!store) throw new Error('the highlight store was not passed through context')
			const highlighted = useSelector(store, (state) => state.highlighted)
			useCountRender(bump(counters, 'reader'))
			return <span data-testid='highlight'>{`${String(value)}:${String(highlighted)}`}</span>
		}
		function CountedCell({ value }: CellViewProps): ReactElement {
			useCountRender(bump(counters, 'cell'))
			return <span>{String(value)}</span>
		}
		return {
			[PERMISSION_TYPE]: { view: PermissionCell },
			[HIGHLIGHT_TYPE]: { view: HighlightCell },
			[COUNTED_TYPE]: { view: CountedCell },
		}
	}

	function columnsReading(type: typeof PERMISSION_TYPE | typeof HIGHLIGHT_TYPE) {
		return createColumns<
			Row,
			Record<typeof PERMISSION_TYPE | typeof HIGHLIGHT_TYPE | typeof COUNTED_TYPE, Record<never, never>>
		>([
			{ accessorKey: 'name', cell: { type } },
			{ accessorKey: 'email', cell: { type: COUNTED_TYPE } },
		])
	}

	function renderLiveGrid(type: typeof PERMISSION_TYPE | typeof HIGHLIGHT_TYPE) {
		const counters: LiveCounters = { cell: 0, header: 0, row: 0, reader: 0 }
		const cellTypes = makeLiveCellTypes(counters)
		const components = makeComponents(counters)
		const columns = columnsReading(type)
		const highlight = createStore({ highlighted: false })
		const layout = <DataGrid.Table />
		const host = { renders: 0 }

		function Host({ children }: { children: ReactNode }): ReactElement {
			useEffect(() => {
				host.renders += 1
			})
			const [canEdit, setCanEdit] = useState(false)
			const table = useDataGrid<GridFeatures, Row>({
				features: TEST_FEATURES,
				data: DATA,
				columns,
				cellTypes,
				context: { isolationCanEdit: canEdit, isolationHighlight: highlight },
			})
			return (
				<>
					<button
						type='button'
						onClick={() => {
							setCanEdit((value) => !value)
						}}
					>
						toggle permission
					</button>
					<DataGrid<GridFeatures, Row> table={table}>{children}</DataGrid>
				</>
			)
		}

		render(
			<GridComponentsProvider components={components}>
				<Host>{layout}</Host>
			</GridComponentsProvider>,
		)
		return { counters, highlight, host }
	}

	it('a permission changed in host state re-renders the cells that select it and nothing else', () => {
		const { counters } = renderLiveGrid(PERMISSION_TYPE)
		const before = { ...counters }

		act(() => {
			fireEvent.click(screen.getByRole('button', { name: 'toggle permission' }))
		})

		expect(screen.getAllByTestId('permission').map((cell) => cell.textContent)).toEqual([
			'Alice:true',
			'Bob:true',
			'Carol:true',
		])
		expect(counters.reader - before.reader).toBe(DATA.length)
		expect({ cell: counters.cell, header: counters.header, row: counters.row }).toEqual({
			cell: before.cell,
			header: before.header,
			row: before.row,
		})
	})

	it('a store held in context and written outside React re-renders only its subscribers', () => {
		const { counters, highlight, host } = renderLiveGrid(HIGHLIGHT_TYPE)
		const before = { ...counters }
		const hostBefore = host.renders

		act(() => {
			highlight.setState((state) => ({ ...state, highlighted: true }))
		})

		expect(screen.getAllByTestId('highlight').map((cell) => cell.textContent)).toEqual([
			'Alice:true',
			'Bob:true',
			'Carol:true',
		])
		expect(counters.reader - before.reader).toBe(DATA.length)
		expect({ cell: counters.cell, header: counters.header, row: counters.row }).toEqual({
			cell: before.cell,
			header: before.header,
			row: before.row,
		})
		expect(host.renders).toBe(hostBefore)
	})
})
