import { createColumns, createTable } from '@ez-kit/data-grid-core'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createDataGrid } from './create-data-grid'
import { DataGrid } from './data-grid/data-grid'
import { DataGridOptionsProvider } from './data-grid-options-context'
import { useGridContext } from './grid-context'
import { prepareDataGridTable } from './prepare-table'
import { TEST_FEATURES, renderWithComponents, TEST_COLUMNS, TEST_ROWS, testComponents } from './test-utils'
import { useDataGrid } from './use-data-grid'

import type { GridFeatures } from './types'
import type { UseDataGridConfig } from './use-data-grid'
import type { ReactElement, ReactNode } from 'react'

// The whole point of the feature: a consumer names its own members and every reader sees them.
// Optional throughout, because each test supplies only the keys it is about.
declare module './grid-context' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
	interface GridContext {
		tenant?: string
		permissions?: { canEdit: boolean }
		/** Stands in for a kit writing under its own key — see the ownership convention. */
		shadcn?: { density: 'compact' | 'comfortable' }
	}
}

type TestRow = (typeof TEST_ROWS)[number]

/** Renders a grid with `children` inside it, so a probe can read the context from where a kit would. */
function renderGridWith(
	config: Partial<UseDataGridConfig<GridFeatures, TestRow>>,
	children: ReactNode,
): ReturnType<typeof render> {
	function Harness(): ReactElement {
		const table = useDataGrid<GridFeatures, TestRow>({
			features: TEST_FEATURES,
			data: TEST_ROWS,
			columns: TEST_COLUMNS,
			...config,
		})
		return <DataGrid<GridFeatures, TestRow> table={table}>{children}</DataGrid>
	}
	return renderWithComponents(<Harness />)
}

/** Reports the whole context, for the assertions about what merging produced. */
function WholeContextProbe(): ReactElement {
	const context = useGridContext()
	return <div data-testid='whole'>{JSON.stringify(context)}</div>
}

function readWhole(): unknown {
	return JSON.parse(screen.getByTestId('whole').textContent)
}

describe('useGridContext — the default', () => {
	it('is an empty object for a grid that never sets `context`', () => {
		renderGridWith({}, <WholeContextProbe />)

		expect(readWhole()).toEqual({})
	})

	it('is an empty object on a table built straight from `createTable`', () => {
		// The reason `prepareDataGridTable` seeds the store: a headless table, or one driven
		// through the compound components by hand, must not crash the first reader.
		const table = prepareDataGridTable(
			createTable({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: createColumns<TestRow>([{ accessorKey: 'name' }]),
			}),
		)

		expect(table.gridContext.get()).toEqual({})
	})
})

describe('useGridContext — option layers', () => {
	it('merges factory < provider < instance, with the instance winning a named key', () => {
		const kit = createDataGrid({
			components: testComponents,
			defaults: { context: { shadcn: { density: 'comfortable' }, tenant: 'kit' } },
		})

		function Harness(): ReactElement {
			const table = kit.useDataGrid<GridFeatures, TestRow>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				context: { permissions: { canEdit: true } },
			})
			return (
				<kit.DataGrid<GridFeatures, TestRow> table={table}>
					<WholeContextProbe />
				</kit.DataGrid>
			)
		}

		render(
			<DataGridOptionsProvider defaults={{ context: { tenant: 'app' } }}>
				<Harness />
			</DataGridOptionsProvider>,
		)

		expect(readWhole()).toEqual({
			// the factory's own key survives — nothing above it named `shadcn`
			shadcn: { density: 'comfortable' },
			// the provider outranks the factory on the key both wrote
			tenant: 'app',
			// and the instance contributes its own
			permissions: { canEdit: true },
		})
	})

	it('replaces a named key rather than accumulating it', () => {
		function Harness(): ReactElement {
			const table = useDataGrid<GridFeatures, TestRow>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				context: { permissions: { canEdit: false } },
			})
			return (
				<DataGrid<GridFeatures, TestRow> table={table}>
					<WholeContextProbe />
				</DataGrid>
			)
		}

		renderWithComponents(
			<DataGridOptionsProvider defaults={{ context: { permissions: { canEdit: true } } }}>
				<Harness />
			</DataGridOptionsProvider>,
		)

		expect(readWhole()).toEqual({ permissions: { canEdit: false } })
	})

	it('never reaches the headless table — `context` is a React-layer option', () => {
		function Harness(): ReactElement {
			const table = useDataGrid<GridFeatures, TestRow>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				context: { tenant: 'acme' },
			})
			return <div data-testid='leak'>{String('context' in table.options)}</div>
		}

		renderWithComponents(<Harness />)

		expect(screen.getByTestId('leak').textContent).toBe('false')
	})
})

describe('useGridContext — reactivity', () => {
	/** Counts its own renders, so a test can assert what a changed context did and did not wake. */
	function makeSliceProbe(onRender: () => void) {
		return function SliceProbe(): ReactElement {
			const canEdit = useGridContext((context) => context.permissions?.canEdit ?? false)
			onRender()
			return <div data-testid='slice'>{String(canEdit)}</div>
		}
	}

	/**
	 * Drives both halves of the subscription from one mounted grid: a button per key, and a probe
	 * whose element is created **once**, so React bails out of re-rendering it when the grid above
	 * re-renders. Anything that reaches the probe after that reached it through its own
	 * subscription — which is what these tests are actually about, and what a memoized subtree
	 * would otherwise hide by re-rendering for free.
	 */
	function renderProbedGrid(onRender: () => void): void {
		const SliceProbe = makeSliceProbe(onRender)
		const probe = <SliceProbe />

		function Harness(): ReactElement {
			const [tenant, setTenant] = useState('acme')
			const [permissions, setPermissions] = useState(DENIED)
			const table = useDataGrid<GridFeatures, TestRow>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				context: { tenant, permissions },
			})
			return (
				<>
					<button
						type='button'
						onClick={() => {
							setTenant('globex')
						}}
					>
						switch tenant
					</button>
					<button
						type='button'
						onClick={() => {
							setPermissions(GRANTED)
						}}
					>
						grant
					</button>
					<DataGrid<GridFeatures, TestRow> table={table}>{probe}</DataGrid>
				</>
			)
		}

		renderWithComponents(<Harness />)
	}

	it('wakes a reader whose slice changed, even inside a subtree React would skip', () => {
		const onRender = vi.fn()
		renderProbedGrid(onRender)
		expect(screen.getByTestId('slice').textContent).toBe('false')
		const before = onRender.mock.calls.length

		fireEvent.click(screen.getByRole('button', { name: 'grant' }))

		expect(screen.getByTestId('slice').textContent).toBe('true')
		expect(onRender.mock.calls.length).toBeGreaterThan(before)
	})

	it('leaves that same reader alone when an unrelated key changes', () => {
		// The pair is the point: the previous test proves the probe *can* be woken through its
		// subscription, so this one failing to wake it is the selector bailing out rather than
		// React skipping a memoized element.
		const onRender = vi.fn()
		renderProbedGrid(onRender)
		const before = onRender.mock.calls.length

		fireEvent.click(screen.getByRole('button', { name: 'switch tenant' }))

		expect(screen.getByTestId('slice').textContent).toBe('false')
		expect(onRender.mock.calls.length).toBe(before)
	})
})

/** Referentially stable, so switching tenants leaves the permissions slice untouched. */
const DENIED = { canEdit: false }
const GRANTED = { canEdit: true }
