import { createColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createDataGrid } from './create-data-grid'
import { DataGridOptionsProvider } from './data-grid-options-context'
import { useGridContext } from './grid-context'
import { TEST_FEATURES, testComponents } from './test-utils'

import type { GridContextReader } from './grid-context'
import type { ReactElement } from 'react'

type Row = { id: number; name: string }
type User = { name: string }

const ROWS: Row[] = [{ id: 1, name: 'Alice' }]
const COLUMNS = createColumns<Row>([{ accessorKey: 'name', header: 'Name' }])
const ALICE: User = { name: 'alice' }

/** The context the spec's scenarios are written against. */
/** The context type a bundle reader hands its selector. */
type SelectorContext<TReader extends (...args: never[]) => unknown> = Parameters<Parameters<TReader>[0]>[0]

function createContextBundle() {
	return createDataGrid({
		components: testComponents,
		features: TEST_FEATURES,
		context: {
			currentUser: null as User | null,
			permissions: { canEdit: false },
		},
	})
}

describe('createDataGrid({ context }) — types', () => {
	it('infers the bundle context type from the default', () => {
		expectTypeOf<SelectorContext<ReturnType<typeof createContextBundle>['useGridContext']>>().toEqualTypeOf<{
			currentUser: User | null
			permissions: { canEdit: boolean }
		}>()
	})

	it('reads a required key without optional chaining, and rejects an unknown one', () => {
		const { useGridContext } = createContextBundle()

		function Reader(): null {
			const canEdit = useGridContext((context) => context.permissions.canEdit)
			expectTypeOf(canEdit).toEqualTypeOf<boolean>()
			expectTypeOf<SelectorContext<typeof useGridContext>>().not.toHaveProperty('tenant')
			return null
		}
		expect(Reader).toBeTypeOf('function')
	})

	it('takes the instance context as a partial, rejecting a wrong type and a foreign key', () => {
		const { DataGrid, useDataGrid } = createContextBundle()

		function Grids(): ReactElement {
			useDataGrid({ data: ROWS, columns: COLUMNS, context: { currentUser: ALICE } })
			// @ts-expect-error — `currentUser` is `User | null`, not a number
			useDataGrid({ data: ROWS, columns: COLUMNS, context: { currentUser: 42 } })
			return (
				<>
					<DataGrid
						data={ROWS}
						columns={COLUMNS}
						context={{ currentUser: ALICE }}
					/>
					<DataGrid
						data={ROWS}
						columns={COLUMNS}
						// @ts-expect-error — `tenant` is outside the bundle's context type
						context={{ tenant: 'acme' }}
					/>
				</>
			)
		}
		expect(Grids).toBeTypeOf('function')
	})

	it('types a bundle without a feature set the same way', () => {
		const { DataGrid, useGridContext } = createDataGrid({
			components: testComponents,
			context: { tenant: 'acme' },
		})

		function Grids(): ReactElement {
			expectTypeOf(useGridContext()).toEqualTypeOf<{ tenant: string }>()
			return (
				<>
					<DataGrid
						features={TEST_FEATURES}
						data={ROWS}
						columns={COLUMNS}
						context={{}}
					/>
					<DataGrid
						features={TEST_FEATURES}
						data={ROWS}
						columns={COLUMNS}
						// @ts-expect-error — `tenant` is a string
						context={{ tenant: 1 }}
					/>
				</>
			)
		}
		expect(Grids).toBeTypeOf('function')
	})

	it('accepts no context under the factory defaults', () => {
		const build = () =>
			createDataGrid({
				components: testComponents,
				// @ts-expect-error — `context` is its own factory option, not a member of `defaults`
				defaults: { context: { a: 1 } },
			})
		expect(build).toBeTypeOf('function')
	})

	it('keeps two bundles in one program apart', () => {
		const a = createDataGrid({ components: testComponents, context: { tenant: 'acme' } })
		const b = createDataGrid({ components: testComponents, context: { tenant: 7 } })

		function Readers(): null {
			expectTypeOf(a.useGridContext((context) => context.tenant)).toEqualTypeOf<string>()
			expectTypeOf(b.useGridContext((context) => context.tenant)).toEqualTypeOf<number>()
			return null
		}
		expect(Readers).toBeTypeOf('function')
	})

	it('reads an untyped record from a bundle without a factory context', () => {
		const bundle = createDataGrid({ components: testComponents })

		expectTypeOf(bundle.useGridContext).toEqualTypeOf<GridContextReader<Record<string, unknown>>>()
	})
})

describe('createDataGrid({ context }) — runtime', () => {
	// The bundle's reader is the package's at runtime, so the probe reads through the package's.
	function WholeContextProbe(): ReactElement {
		return <div data-testid='whole'>{JSON.stringify(useGridContext())}</div>
	}

	function readWhole(): unknown {
		return JSON.parse(screen.getByTestId('whole').textContent)
	}

	it('hands the default to a grid that sets no context of its own', () => {
		const { DataGrid } = createContextBundle()

		render(
			<DataGrid
				data={ROWS}
				columns={COLUMNS}
			>
				<WholeContextProbe />
			</DataGrid>,
		)

		expect(readWhole()).toEqual({ currentUser: null, permissions: { canEdit: false } })
	})

	it('lets an instance override one key while the rest come from the factory', () => {
		const { DataGrid } = createContextBundle()

		render(
			<DataGrid
				data={ROWS}
				columns={COLUMNS}
				context={{ currentUser: ALICE }}
			>
				<WholeContextProbe />
			</DataGrid>,
		)

		expect(readWhole()).toEqual({ currentUser: ALICE, permissions: { canEdit: false } })
	})

	it('merges factory < provider < instance', () => {
		const { DataGrid } = createDataGrid({
			components: testComponents,
			features: TEST_FEATURES,
			context: { a: 1, b: 1, c: 1 },
		})

		render(
			<DataGridOptionsProvider defaults={{ context: { b: 2 } }}>
				<DataGrid
					data={ROWS}
					columns={COLUMNS}
					context={{ c: 3 }}
				>
					<WholeContextProbe />
				</DataGrid>
			</DataGridOptionsProvider>,
		)

		expect(readWhole()).toEqual({ a: 1, b: 2, c: 3 })
	})

	it('reaches the controlled form through the bound hook', () => {
		const { DataGrid, useDataGrid } = createContextBundle()

		function Harness(): ReactElement {
			const table = useDataGrid({ data: ROWS, columns: COLUMNS, context: { currentUser: ALICE } })
			return (
				<DataGrid table={table}>
					<WholeContextProbe />
				</DataGrid>
			)
		}
		render(<Harness />)

		expect(readWhole()).toEqual({ currentUser: ALICE, permissions: { canEdit: false } })
	})
})
