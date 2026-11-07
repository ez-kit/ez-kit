import { createColumns } from '@ez-kit/data-grid-core'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createDataGrid } from '../create-data-grid'
import { TEST_FEATURES, testComponents } from '../test-utils'

import { VirtualRefetchOverlay } from './refetch-overlay'
import { VirtualProvider } from './virtual-context'

import type { UseDataGridConfig } from '../use-data-grid'
import type { Virtualizer } from '@tanstack/react-virtual'

type Person = { id: number; name: string }
const DATA: Person[] = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
]
const COLUMNS = createColumns<Person>([{ accessorKey: 'name', header: 'Name' }])
const { DataGrid: Grid } = createDataGrid({ components: testComponents })

// jsdom has no viewport; fix the window while keeping Body and VirtualBody real.
const virtualizer = {
	getVirtualItems: () =>
		DATA.map((_, index) => ({ index, start: index * 40, end: (index + 1) * 40, size: 40, key: index, lane: 0 })),
	getTotalSize: () => 80,
} as unknown as Virtualizer<HTMLDivElement, Element>

function Fixture(props: Partial<UseDataGridConfig<typeof TEST_FEATURES, Person>>) {
	return (
		<Grid
			features={TEST_FEATURES}
			data={DATA}
			columns={COLUMNS}
			virtualization
			{...props}
		>
			<Grid.Table>
				<Grid.Header />
				<VirtualProvider rowVirtualizer={virtualizer}>
					<Grid.Body />
				</VirtualProvider>
			</Grid.Table>
		</Grid>
	)
}

describe('virtualized fallbacks', () => {
	it('updates a retained overlay when filtering changes the row model during a fetch', () => {
		const content = <VirtualRefetchOverlay />
		function RetainedFixture({ filtered }: { filtered: boolean }) {
			return (
				<Grid
					features={TEST_FEATURES}
					data={DATA}
					columns={COLUMNS}
					filtering
					state={{ loading: { isFetching: true }, columnFilters: filtered ? [{ id: 'name', value: 'missing' }] : [] }}
				>
					{content}
				</Grid>
			)
		}
		const { rerender } = render(<RetainedFixture filtered={false} />)
		expect(screen.getByTestId('refetch-overlay')).toBeInTheDocument()
		rerender(<RetainedFixture filtered />)
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
		rerender(<RetainedFixture filtered={false} />)
		expect(screen.getByTestId('refetch-overlay')).toBeInTheDocument()
	})

	it('prioritizes initial loading over data and refetch, then restores virtual rows', () => {
		const { container, rerender } = render(<Fixture state={{ loading: { isPending: true, isFetching: true } }} />)
		expect(screen.getAllByText('Loading…')).toHaveLength(5)
		expect(container.querySelector('[data-row-id]')).toBeNull()
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
		rerender(<Fixture state={{ loading: { isPending: false, isFetching: false } }} />)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(container.querySelectorAll('[data-virtual="row"]')).toHaveLength(2)
	})

	it('keeps the existing rows mounted under one overlay outside the scrolling range', () => {
		const { rerender } = render(<Fixture state={{ loading: { isFetching: false } }} />)
		const alice = screen.getByText('Alice')
		rerender(<Fixture state={{ loading: { isFetching: true } }} />)
		expect(screen.getByText('Alice')).toBe(alice)
		const overlay = screen.getByTestId('refetch-overlay')
		expect(overlay.closest('[data-slot="table-scroll"]')).toBeNull()
		expect(overlay.closest('[data-slot="table-wrapper"]')).not.toBeNull()
		expect(screen.getAllByTestId('refetch-overlay')).toHaveLength(1)
		rerender(<Fixture state={{ loading: { isFetching: false } }} />)
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
		expect(screen.getByText('Alice')).toBe(alice)
	})

	it('shows empty data without an overlay even while fetching', () => {
		const { container } = render(
			<Fixture
				data={[]}
				state={{ loading: { isFetching: true } }}
			/>,
		)
		expect(container.querySelector('[data-slot="empty-state-cell"]')).not.toBeNull()
		expect(container.querySelector('[data-slot="no-results-cell"]')).toBeNull()
		expect(screen.queryByTestId('refetch-overlay')).not.toBeInTheDocument()
	})

	it('shows no-results after filtering and restores rows when the filter is cleared', () => {
		const { container, rerender } = render(
			<Fixture
				filtering
				state={{ columnFilters: [{ id: 'name', value: 'missing' }] }}
			/>,
		)
		expect(container.querySelector('[data-slot="no-results-cell"]')).not.toBeNull()
		expect(container.querySelector('[data-slot="empty-state-cell"]')).toBeNull()
		rerender(
			<Fixture
				filtering
				state={{ columnFilters: [] }}
			/>,
		)
		expect(screen.getByText('Alice')).toBeInTheDocument()
		expect(container.querySelector('[data-slot="no-results-cell"]')).toBeNull()
	})

	it.each(['loading', 'empty', 'noResults'] as const)('honors a custom %s fallback', (slot) => {
		render(
			<Fixture
				data={slot === 'empty' ? [] : DATA}
				filtering
				state={{
					loading: { isPending: slot === 'loading' },
					columnFilters: slot === 'noResults' ? [{ id: 'name', value: 'missing' }] : [],
				}}
				fallbacks={{ [slot]: { component: <p>Custom fallback</p> } }}
			/>,
		)
		expect(screen.getByText('Custom fallback')).toBeInTheDocument()
	})

	it('honors disabled fallbacks without leaving the virtualized body', () => {
		const { container, rerender } = render(
			<Fixture
				state={{ loading: { isPending: true } }}
				fallbacks={{ loading: false }}
			/>,
		)
		expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
		expect(screen.getByText('Alice')).toBeInTheDocument()
		rerender(
			<Fixture
				data={[]}
				state={{ loading: { isPending: false } }}
				fallbacks={{ empty: false }}
			/>,
		)
		expect(container.querySelector('[data-slot="empty-state-cell"]')).toBeNull()
		expect(container.querySelector('[data-virtualized="true"][data-slot="tbody"]')).not.toBeNull()
		rerender(
			<Fixture
				filtering
				state={{ columnFilters: [{ id: 'name', value: 'missing' }] }}
				fallbacks={{ noResults: false }}
			/>,
		)
		expect(container.querySelector('[data-slot="no-results-cell"]')).toBeNull()
		expect(container.querySelector('[data-virtualized="true"][data-slot="tbody"]')).not.toBeNull()
	})
})
