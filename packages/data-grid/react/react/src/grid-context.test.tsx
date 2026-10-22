import { createColumns, createTable } from '@ez-kit/data-grid-core'
import { createStore } from '@tanstack/react-store'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createDataGrid } from './create-data-grid'
import { DataGrid } from './data-grid/data-grid'
import { TableProvider } from './data-grid/table-context'
import { DataGridOptionsProvider } from './data-grid-options-context'
import { useGridContext } from './grid-context'
import { prepareDataGridTable } from './prepare-table'
import { TEST_FEATURES, renderWithComponents, TEST_COLUMNS, TEST_ROWS, testComponents } from './test-utils'
import { useDataGrid } from './use-data-grid'
import { shallow } from './utils/shallow-equal'

import type { GridFeatures } from './types'
import type { UseDataGridConfig } from './use-data-grid'
import type { ReactElement, ReactNode } from 'react'

/** What these tests read. Optional throughout, because each test supplies only the keys it is about. */
type TestContext = {
	tenant?: string
	permissions?: { canEdit: boolean; canDelete?: boolean }
	highlight?: { value: string }
}

// A grid without a factory types its reader this way; the bundle path is covered in
// `create-data-grid-context.test.tsx`.
const useTestContext = useGridContext.withTypes<TestContext>()

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

describe('useGridContext — types', () => {
	it('reads unknown values from the bare hook', () => {
		function Probe(): null {
			const tenant = useGridContext((context) => context.tenant)
			expectTypeOf(tenant).toEqualTypeOf<unknown>()
			expectTypeOf(useGridContext()).toEqualTypeOf<Record<string, unknown>>()
			return null
		}
		expect(Probe).toBeTypeOf('function')
	})

	it('types the selector through withTypes', () => {
		function Probe(): null {
			const reader = useGridContext.withTypes<{ tenant: string }>()
			const tenant = reader((context) => context.tenant)
			expectTypeOf(tenant).toEqualTypeOf<string>()
			expectTypeOf<Parameters<Parameters<typeof reader>[0]>[0]>().toEqualTypeOf<{ tenant: string }>()
			return null
		}
		expect(Probe).toBeTypeOf('function')
	})

	it('derives the same function at runtime', () => {
		expect(useGridContext.withTypes<TestContext>()).toBe(useGridContext)
	})
})

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
		const kitContext: TestContext = { highlight: { value: 'kit' }, tenant: 'kit' }
		const kit = createDataGrid({ components: testComponents, context: kitContext })

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
			// the factory's own key survives — nothing above it named `highlight`
			highlight: { value: 'kit' },
			// the provider outranks the factory on the key both wrote
			tenant: 'app',
			// and the instance contributes its own
			permissions: { canEdit: true },
		})
	})

	/** Renders a bare grid under a provider, both layers writing `context`. */
	function renderUnderProvider(providerContext: TestContext, instanceContext: TestContext): void {
		function Harness(): ReactElement {
			const table = useDataGrid<GridFeatures, TestRow>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				context: instanceContext,
			})
			return (
				<DataGrid<GridFeatures, TestRow> table={table}>
					<WholeContextProbe />
				</DataGrid>
			)
		}

		renderWithComponents(
			<DataGridOptionsProvider defaults={{ context: providerContext }}>
				<Harness />
			</DataGridOptionsProvider>,
		)
	}

	it('merges a nested plain object key by key', () => {
		renderUnderProvider({ permissions: { canEdit: true, canDelete: true } }, { permissions: { canEdit: false } })

		expect(readWhole()).toEqual({ permissions: { canEdit: false, canDelete: true } })
	})

	it('replaces a store instance whole', () => {
		const providerStore = createStore({ highlighted: false })
		const instanceStore = createStore({ highlighted: true })
		function StoreProbe(): ReactElement {
			const store = useGridContext((context) => context.store)
			return <div data-testid='store'>{store === instanceStore ? 'instance' : 'other'}</div>
		}
		function Harness(): ReactElement {
			const table = useDataGrid<GridFeatures, TestRow>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
				context: { store: instanceStore },
			})
			return (
				<DataGrid<GridFeatures, TestRow> table={table}>
					<StoreProbe />
				</DataGrid>
			)
		}

		renderWithComponents(
			<DataGridOptionsProvider defaults={{ context: { store: providerStore } }}>
				<Harness />
			</DataGridOptionsProvider>,
		)

		expect(screen.getByTestId('store').textContent).toBe('instance')
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
			const canEdit = useTestContext((context) => context.permissions?.canEdit ?? false)
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

describe('useGridContext — the vanilla binding', () => {
	/** A table `prepareDataGridTable` built, whose context atom notifies on `write` synchronously. */
	function makeVanillaTable() {
		return prepareDataGridTable(
			createTable<GridFeatures, TestRow>({
				features: TEST_FEATURES,
				data: TEST_ROWS,
				columns: TEST_COLUMNS,
			}),
		)
	}

	it('re-renders a slice reader only when its slice changes', () => {
		const table = makeVanillaTable()
		table.gridContext.write({ tenant: 'acme', permissions: DENIED })
		const onRender = vi.fn()
		function SliceProbe(): ReactElement {
			const canEdit = useTestContext((context) => context.permissions?.canEdit ?? false)
			onRender()
			return <div data-testid='slice'>{String(canEdit)}</div>
		}
		render(
			<TableProvider table={table}>
				<SliceProbe />
			</TableProvider>,
		)
		const before = onRender.mock.calls.length

		act(() => {
			table.gridContext.write({ tenant: 'globex', permissions: DENIED })
		})
		expect(onRender.mock.calls.length).toBe(before)

		act(() => {
			table.gridContext.write({ tenant: 'globex', permissions: GRANTED })
		})
		expect(screen.getByTestId('slice').textContent).toBe('true')
		expect(onRender.mock.calls.length).toBeGreaterThan(before)
	})

	it('re-renders a fresh-object selector with compare: shallow only when its fields change', () => {
		const table = makeVanillaTable()
		table.gridContext.write({ tenant: 'acme', permissions: DENIED })
		const onRender = vi.fn()
		function ObjectProbe(): ReactElement {
			const picked = useTestContext((context) => ({ canEdit: context.permissions?.canEdit ?? false }), {
				compare: shallow,
			})
			onRender()
			return <div data-testid='object'>{String(picked.canEdit)}</div>
		}
		render(
			<TableProvider table={table}>
				<ObjectProbe />
			</TableProvider>,
		)
		const before = onRender.mock.calls.length

		act(() => {
			table.gridContext.write({ tenant: 'globex', permissions: DENIED })
		})
		expect(onRender.mock.calls.length).toBe(before)

		act(() => {
			table.gridContext.write({ tenant: 'globex', permissions: GRANTED })
		})
		expect(screen.getByTestId('object').textContent).toBe('true')
	})
})

/** Referentially stable, so switching tenants leaves the permissions slice untouched. */
const DENIED = { canEdit: false }
const GRANTED = { canEdit: true }
