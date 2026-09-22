import { createColumns, defaultMessages } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from './create-data-grid'
import { DataGrid } from './data-grid/data-grid'
import { DataGridOptionsProvider } from './data-grid-options-context'
import { NARROW_TEST_FEATURES, TEST_FEATURES, testComponents } from './test-utils'

import type { GridFeatures } from './types'

type Row = { id: number; name: string }
const ROWS: Row[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const ROW_COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])

describe('createDataGrid', () => {
	it('returns DataGrid, useDataGrid, GridComponentsProvider', () => {
		const result = createDataGrid({ components: {} })
		expect(result.DataGrid).toBeTypeOf('function')
		expect(result.useDataGrid).toBeTypeOf('function')
		expect(result.GridComponentsProvider).toBeTypeOf('function')
	})

	it('bound DataGrid renders uncontrolled (inline config) with row inference', () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: testComponents })
		// TRow is inferred from `data`/`columns` — no explicit type argument.
		render(
			<BoundDataGrid
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.getByText('Bob')).toBeInTheDocument()
	})

	// Regression: the factory used to copy the compound members by hand and had fallen five
	// behind (ActionBar, BottomBar, SortMenuTrigger, GlobalFilterInput, VisibilityTrigger).
	// The `as typeof DataGrid` cast typed them as present, so a kit consumer writing
	// `<DataGrid.ActionBar />` got `undefined` at runtime and no compile error.
	// Enumerating `DataGrid` itself means a newly added member cannot be forgotten.
	it('bound DataGrid carries every compound sub-component the unbound one has', () => {
		const { DataGrid: BoundDataGrid } = createDataGrid({ components: {} })
		const members = Object.keys(DataGrid) as (keyof typeof DataGrid)[]
		expect(members.length).toBeGreaterThan(0)
		for (const member of members) {
			expect(BoundDataGrid[member], `DataGrid.${member} missing from the bound bundle`).toBe(DataGrid[member])
		}
	})

	it('extendDataGrid carries the compound namespace too', () => {
		const { extendDataGrid } = createDataGrid({ components: {} })
		const { DataGrid: Extended } = extendDataGrid({ rating: { view: () => null } })
		for (const member of Object.keys(DataGrid) as (keyof typeof DataGrid)[]) {
			expect(Extended[member], `DataGrid.${member} missing from the extended bundle`).toBe(DataGrid[member])
		}
	})
})

describe('extendDataGrid (folded into createDataGrid)', () => {
	it('is returned from the factory and yields a complete bundle', () => {
		const base = createDataGrid({ components: testComponents })
		expect(base.extendDataGrid).toBeTypeOf('function')

		const extended = base.extendDataGrid({ rating: { view: () => null } })
		expect(extended.DataGrid).toBeTypeOf('function')
		expect(extended.useDataGrid).toBeTypeOf('function')
		expect(extended.GridComponentsProvider).toBeTypeOf('function')
		expect(extended.createColumns).toBeTypeOf('function')
		// The extended bundle can itself be extended again.
		expect(extended.extendDataGrid).toBeTypeOf('function')
	})

	it('extended bundle renders with the original components', () => {
		const { extendDataGrid } = createDataGrid({ components: testComponents })
		const { DataGrid: Extended } = extendDataGrid({})
		render(
			<Extended
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})
})

// ── Factory defaults reach *both* call shapes ─────────────────────────────────
// Regression: `createDataGrid({ defaults })` bound its layer to the returned `useDataGrid`
// only, so `<DataGrid table={useDataGrid(...)} />` saw the kit's dictionary while
// `<DataGrid data columns />` — which runs the hook itself, inside the component — did not,
// and rendered the English fallbacks instead.
describe('createDataGrid({ defaults })', () => {
	const SELECT_ROW = 'Выбрать строку'
	const SELECT_ALL = 'Выбрать все'
	const KIT = {
		components: testComponents,
		defaults: { selection: true, messages: { selection: { selectRow: SELECT_ROW, selectAll: SELECT_ALL } } },
	}

	it('applies to the controlled form', () => {
		const { DataGrid: Bound, useDataGrid } = createDataGrid(KIT)
		function Grid() {
			const table = useDataGrid<GridFeatures, Row>({ features: TEST_FEATURES, data: ROWS, columns: ROW_COLUMNS })
			return <Bound table={table} />
		}
		render(<Grid />)
		expect(screen.getAllByLabelText(SELECT_ROW).length).toBe(ROWS.length)
	})

	it('applies to the uncontrolled form', () => {
		const { DataGrid: Bound } = createDataGrid(KIT)
		render(
			<Bound
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getAllByLabelText(SELECT_ROW).length).toBe(ROWS.length)
	})

	it('a `messages` prop on the grid beats the factory dictionary', () => {
		const { DataGrid: Bound } = createDataGrid(KIT)
		render(
			<Bound
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
				messages={{ selection: { selectRow: 'Отметить строку' } }}
			/>,
		)
		expect(screen.getAllByLabelText('Отметить строку').length).toBe(ROWS.length)
		// The strings the grid did not name still come from the factory layer.
		expect(screen.getByLabelText(SELECT_ALL)).toBeInTheDocument()
	})

	it('an app-level DataGridOptionsProvider beats the factory dictionary, and the grid beats both', () => {
		const { DataGrid: Bound } = createDataGrid(KIT)
		render(
			<DataGridOptionsProvider
				defaults={{ messages: { selection: { selectRow: 'Провайдер', selectAll: 'Провайдер: все' } } }}
			>
				<Bound
					features={TEST_FEATURES}
					data={ROWS}
					columns={ROW_COLUMNS}
					messages={{ selection: { selectRow: 'Грид' } }}
				/>
			</DataGridOptionsProvider>,
		)
		expect(screen.getAllByLabelText('Грид').length).toBe(ROWS.length)
		expect(screen.getByLabelText('Провайдер: все')).toBeInTheDocument()
	})

	// `messages` and the feature toggles take different routes out of the merge
	// (`resolveMessages` vs the resolved feature options), so a dictionary arriving is no
	// evidence that the rest of the layer did. Assert one option that shows in the DOM.
	it('carries options other than messages into the uncontrolled form', () => {
		const { DataGrid: Bound } = createDataGrid({
			components: testComponents,
			defaults: { pagination: { pageSize: 1 } },
		})
		render(
			<Bound
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(screen.queryByText('Bob')).not.toBeInTheDocument()
	})

	// The layer belongs to the grid the kit configures, not to everything rendered beneath it.
	it('does not leak into a grid nested among the children', () => {
		const { DataGrid: Bound } = createDataGrid(KIT)
		render(
			<Bound
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
			>
				<DataGrid
					features={TEST_FEATURES}
					data={ROWS}
					columns={ROW_COLUMNS}
					selection
				/>
			</Bound>,
		)
		// The inner grid is the only one rendered here, and it stands on the English dictionary.
		expect(screen.getAllByLabelText(defaultMessages.selection.selectRow).length).toBe(ROWS.length)
		expect(screen.queryByLabelText(SELECT_ROW)).not.toBeInTheDocument()
	})

	// Same boundary as above, reached through the controlled form: a second kit's bound hook,
	// running among the outer grid's children, must not pick up the outer kit's layer.
	it('does not leak into another kit’s grid nested among the children', () => {
		const { DataGrid: Bound } = createDataGrid(KIT)
		const { DataGrid: Plain, useDataGrid } = createDataGrid({ components: testComponents })
		function Inner() {
			const table = useDataGrid<GridFeatures, Row>({
				features: TEST_FEATURES,
				data: ROWS,
				columns: ROW_COLUMNS,
				selection: true,
			})
			return <Plain table={table} />
		}
		render(
			<Bound
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
			>
				<Inner />
			</Bound>,
		)
		expect(screen.getAllByLabelText(defaultMessages.selection.selectRow).length).toBe(ROWS.length)
		expect(screen.queryByLabelText(SELECT_ROW)).not.toBeInTheDocument()
	})

	it('a bundle built without defaults still renders the English dictionary', () => {
		const { DataGrid: Bound } = createDataGrid({ components: testComponents })
		render(
			<Bound
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
				selection
			/>,
		)
		expect(screen.getAllByLabelText(defaultMessages.selection.selectRow).length).toBe(ROWS.length)
	})

	it('extendDataGrid keeps the defaults in both forms', () => {
		const { extendDataGrid } = createDataGrid(KIT)
		const { DataGrid: Extended, useDataGrid } = extendDataGrid({ rating: { view: () => null } })

		const inline = render(
			<Extended
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getAllByLabelText(SELECT_ROW).length).toBe(ROWS.length)
		inline.unmount()

		function Grid() {
			const table = useDataGrid<GridFeatures, Row>({ features: TEST_FEATURES, data: ROWS, columns: ROW_COLUMNS })
			return <Extended table={table} />
		}
		render(<Grid />)
		expect(screen.getAllByLabelText(SELECT_ROW).length).toBe(ROWS.length)
	})
})

describe('createDataGrid({ features })', () => {
	it('binds the set: neither form names one at the call site', () => {
		const { DataGrid: Bound, useDataGrid } = createDataGrid({
			components: testComponents,
			features: TEST_FEATURES,
		})

		// Uncontrolled — no `features` prop.
		const inline = render(
			<Bound
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		inline.unmount()

		// Controlled — no `features` key, and `TRow` still inferred from `data`.
		function Grid() {
			const table = useDataGrid({ data: ROWS, columns: ROW_COLUMNS })
			return <Bound table={table} />
		}
		render(<Grid />)
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	// The binding is a *defaults* layer, and `features` is the one option `mergeOptionLayers`
	// replaces rather than deep-merges. Asserted through the structural three: a set with nothing
	// registered cannot lay out a column grid, so a merge with the bound all-in set would render
	// and a replacement throws. The throw is the proof that the narrow set arrived intact.
	it('a set named at the call site replaces the bound one rather than merging with it', () => {
		const { DataGrid: Bound } = createDataGrid({ components: testComponents, features: TEST_FEATURES })
		expect(() =>
			render(
				<Bound
					features={NARROW_TEST_FEATURES}
					data={ROWS}
					columns={ROW_COLUMNS}
				/>,
			),
		).toThrow()
	})

	it('extendDataGrid carries the bound set into the extended bundle', () => {
		const { extendDataGrid } = createDataGrid({ components: testComponents, features: TEST_FEATURES })
		const { DataGrid: Extended } = extendDataGrid({ rating: { view: () => null } })
		render(
			<Extended
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})

	// The unbound bundle is unchanged: `features` stays required, which is what core declares and
	// what a grid composed from the per-feature subpaths still writes. Both kits' prebuilt
	// `DataGrid` binds `allDataGridFeatures` instead — that export already carries every component
	// group, so the set saved 3.9 kB there and cost an import block at every call site.
	it('leaves the unbound bundle demanding a set', () => {
		const { DataGrid: Unbound } = createDataGrid({ components: testComponents })
		render(
			<Unbound
				features={TEST_FEATURES}
				data={ROWS}
				columns={ROW_COLUMNS}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
	})
})
