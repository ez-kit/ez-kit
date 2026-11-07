import { act, render } from '@testing-library/react'
import { useEffect } from 'react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { createColumns } from '../react-columns'
import { TEST_FEATURES, testComponents } from '../test-utils'
import { useGridMessages } from '../use-grid-messages'

import { useDataGridTable } from './table-context'

const DATA = [{ id: 1, amount: 10 }]
const COLUMNS = createColumns<(typeof DATA)[number]>([{ accessorKey: 'amount', header: 'Amount' }])
const { DataGrid: Grid, useDataGrid: useGrid } = createDataGrid({ components: testComponents, features: TEST_FEATURES })
const { DataGrid: LabelGrid } = createDataGrid({
	components: {
		...testComponents,
		pagination: { ...testComponents.pagination, Pagination: ({ label }) => <output>{label}</output> },
	},
	features: TEST_FEATURES,
})
const PAGINATION = (
	<Grid.Pagination>
		{({ pageCount, rowCount, canNextPage }) => (
			<output>{`${String(pageCount)}/${String(rowCount)}/${String(canNextPage)}`}</output>
		)}
	</Grid.Pagination>
)
const TABLE = (
	<Grid.Table>
		<Grid.Header />
		<Grid.Body />
		<Grid.Footer />
	</Grid.Table>
)

describe('options publication to retained composition', () => {
	it('keeps equivalent option wrappers isolated and invokes the latest state handler', () => {
		let renders = 0
		let notifiedHost = -1
		let table: ReturnType<typeof useGrid<(typeof DATA)[number]>>
		function Probe() {
			useDataGridTable()
			useEffect(() => {
				renders += 1
			})
			return null
		}
		const probe = <Probe />
		function Harness({ host }: { host: number }) {
			table = useGrid({
				data: DATA,
				columns: COLUMNS,
				sorting: {
					multi: { max: 2 },
					onChange: () => {
						notifiedHost = host
					},
				},
				layout: { stickyHeader: true },
			})
			return <Grid table={table}>{probe}</Grid>
		}
		const view = render(<Harness host={0} />)
		const before = renders
		view.rerender(<Harness host={1} />)
		expect(renders).toBe(before)
		act(() => {
			table.setSorting([{ id: 'amount', desc: false }])
		})
		expect(notifiedHost).toBe(1)
		expect(renders).toBe(before)
	})

	it('refreshes a replaced renderer rather than treating every function as an event handler', () => {
		const pagination = <LabelGrid.Pagination />
		function Harness({ label }: { label: string }) {
			return (
				<LabelGrid
					data={DATA}
					columns={COLUMNS}
					pagination={{ pageSize: 10, label: () => label }}
				>
					{pagination}
				</LabelGrid>
			)
		}
		const view = render(<Harness label='First label' />)
		expect(view.container).toHaveTextContent('First label')
		view.rerender(<Harness label='Second label' />)
		expect(view.container).toHaveTextContent('Second label')
	})

	it('updates manual row totals without a data or state change', () => {
		function Harness({ rowCount }: { rowCount: number }) {
			return (
				<Grid
					data={DATA}
					columns={COLUMNS}
					pagination={{ manual: true, pageSize: 10, rowCount }}
				>
					{PAGINATION}
				</Grid>
			)
		}
		const view = render(<Harness rowCount={10} />)
		expect(view.container.querySelector('output')).toHaveTextContent('1/10/false')
		view.rerender(<Harness rowCount={30} />)
		expect(view.container.querySelector('output')).toHaveTextContent('3/30/true')
	})

	it('updates manual page totals independently of row totals', () => {
		function Harness({ pageCount }: { pageCount: number }) {
			return (
				<Grid
					data={DATA}
					columns={COLUMNS}
					pagination={{ manual: true, pageSize: 10, pageCount }}
				>
					{PAGINATION}
				</Grid>
			)
		}
		const view = render(<Harness pageCount={1} />)
		expect(view.container.querySelector('output')).toHaveTextContent('1/undefined/false')
		view.rerender(<Harness pageCount={4} />)
		expect(view.container.querySelector('output')).toHaveTextContent('4/undefined/true')
	})

	it('updates supplied aggregates while retaining rows and columns', () => {
		function Harness({ total }: { total: number }) {
			return (
				<Grid
					data={DATA}
					columns={COLUMNS}
					aggregation={{ manual: true, totals: { amount: total } }}
					layout={{ footer: true }}
				>
					{TABLE}
				</Grid>
			)
		}
		const view = render(<Harness total={100} />)
		expect(view.container.querySelector('tfoot')).toHaveTextContent('100')
		view.rerender(<Harness total={250} />)
		expect(view.container.querySelector('tfoot')).toHaveTextContent('250')
	})

	it('publishes messages to a component that only reads useGridMessages', () => {
		function Message() {
			return <output>{useGridMessages().globalFiltering.placeholder}</output>
		}
		const message = <Message />
		function Harness({ placeholder }: { placeholder: string }) {
			return (
				<Grid
					data={DATA}
					columns={COLUMNS}
					messages={{ globalFiltering: { placeholder } }}
				>
					{message}
				</Grid>
			)
		}
		const view = render(<Harness placeholder='Search' />)
		expect(view.container.querySelector('output')).toHaveTextContent('Search')
		view.rerender(<Harness placeholder='Find employees' />)
		expect(view.container.querySelector('output')).toHaveTextContent('Find employees')
	})

	it('updates layout on retained table, header and footer', () => {
		function Harness({ sticky }: { sticky: boolean }) {
			return (
				<Grid
					data={DATA}
					columns={COLUMNS}
					layout={{ footer: true, stickyHeader: sticky, stickyFooter: sticky }}
				>
					{TABLE}
				</Grid>
			)
		}
		const view = render(<Harness sticky={false} />)
		expect(view.container.querySelector('thead')).not.toHaveAttribute('data-sticky')
		view.rerender(<Harness sticky />)
		expect(view.container.querySelector('thead')).toHaveAttribute('data-sticky', 'true')
		expect(view.container.querySelector('tfoot')).toHaveAttribute('data-sticky', 'true')
		view.rerender(<Harness sticky={false} />)
		expect(view.container.querySelector('thead')).not.toHaveAttribute('data-sticky')
		expect(view.container.querySelector('tfoot')).not.toHaveAttribute('data-sticky')
	})
})
