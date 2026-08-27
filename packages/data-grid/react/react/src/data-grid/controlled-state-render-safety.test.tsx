import { createColumns } from '@ez-kit/data-grid-core'
import { act, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { GridComponentsProvider } from '../components-context'
import { testComponents } from '../test-utils'
import { useDataGrid } from '../use-data-grid'

import { DataGrid } from './data-grid'

import type { PaginationState } from '@tanstack/table-core'
import type { ReactElement } from 'react'

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

type Row = { id: number; name: string }
const DATA: Row[] = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: `Row ${String(index + 1)}` }))
const COLUMNS = createColumns<Row>([{ accessorKey: 'name' }])

const REACT_RENDER_PHASE_WARNING = 'Cannot update a component'

/**
 * Grid whose pagination is fully controlled by its parent — the shape every
 * server-driven grid uses. `setPage` mimics the consumer reacting to
 * `pagination.onChange` by mirroring the new page into its own React state.
 */
function ControlledGrid({ pagination }: { pagination: PaginationState }): ReactElement {
	const table = useDataGrid<Row>({
		data: DATA,
		columns: COLUMNS,
		pagination: { pageSizeOptions: [5, 10] },
		globalFiltering: true,
		state: { pagination },
	})
	return <DataGrid<Row> table={table} />
}

function Harness(): ReactElement {
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 5 })
	return (
		<GridComponentsProvider components={testComponents}>
			<button
				type='button'
				onClick={() => {
					setPagination({ pageIndex: 1, pageSize: 5 })
				}}
			>
				next
			</button>
			<ControlledGrid pagination={pagination} />
		</GridComponentsProvider>
	)
}

describe('controlled state — render-phase safety', () => {
	// The controlled `state` prop is synced into the store during render so the
	// same render reads it. Notifying subscribers from there sets state on a
	// child (PageSizer, GlobalFilterInput, Body) mid-render, which React reports
	// as an error and which future React versions may escalate.
	it('syncing controlled state does not update subscribers during render', () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

		const { rerender } = render(<Harness />)
		rerender(<Harness />)

		act(() => {
			screen.getByRole('button', { name: 'next' }).click()
		})

		const renderPhaseWarnings = consoleError.mock.calls.filter((args) =>
			args.some((arg) => typeof arg === 'string' && arg.includes(REACT_RENDER_PHASE_WARNING)),
		)
		consoleError.mockRestore()

		expect(renderPhaseWarnings).toEqual([])
	})

	it('still propagates the controlled change to the rendered rows', () => {
		render(<Harness />)
		expect(screen.getByText('Row 1')).toBeInTheDocument()

		act(() => {
			screen.getByRole('button', { name: 'next' }).click()
		})

		// Page 2 of 5 → rows 6..10; row 1 is gone.
		expect(screen.getByText('Row 6')).toBeInTheDocument()
		expect(screen.queryByText('Row 1')).toBeNull()
	})
})
