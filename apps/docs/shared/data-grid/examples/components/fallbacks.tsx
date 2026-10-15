'use client'

import {
	columnFilteringFeature,
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFns,
	loadingFeature,
	rowPaginationFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	loadingFeature,
	columnFilteringFeature,
	filterFns,
	rowPaginationFeature,
	sortFns,
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortedRowModel: createSortedRowModel(),
})

type Customer = {
	id: number
	name: string
	email: string
	phone: string
	company: string
	country: string
	city: string
	plan: string
	seats: number
	revenue: number
	signedUpAt: string
	active: boolean
}

const CUSTOMERS: Customer[] = [
	{
		id: 1,
		name: 'Alice Johnson',
		email: 'alice@example.com',
		phone: '+1 415 555 0132',
		company: 'Northwind',
		country: 'United States',
		city: 'San Francisco',
		plan: 'Enterprise',
		seats: 120,
		revenue: 48000,
		signedUpAt: '2021-03-15',
		active: true,
	},
	{
		id: 2,
		name: 'Bob Smith',
		email: 'bob@example.com',
		phone: '+44 20 7946 0958',
		company: 'Contoso',
		country: 'United Kingdom',
		city: 'London',
		plan: 'Team',
		seats: 25,
		revenue: 7500,
		signedUpAt: '2022-07-01',
		active: false,
	},
	{
		id: 3,
		name: 'Carol White',
		email: 'carol@example.com',
		phone: '+49 30 901820',
		company: 'Fabrikam',
		country: 'Germany',
		city: 'Berlin',
		plan: 'Enterprise',
		seats: 340,
		revenue: 136000,
		signedUpAt: '2019-11-20',
		active: true,
	},
	{
		id: 4,
		name: 'Dave Brown',
		email: 'dave@example.com',
		phone: '+33 1 70 18 99 00',
		company: 'Tailspin',
		country: 'France',
		city: 'Paris',
		plan: 'Starter',
		seats: 5,
		revenue: 600,
		signedUpAt: '2023-01-10',
		active: true,
	},
	{
		id: 5,
		name: 'Eve Davis',
		email: 'eve@example.com',
		phone: '+81 3 4567 8901',
		company: 'Litware',
		country: 'Japan',
		city: 'Tokyo',
		plan: 'Team',
		seats: 40,
		revenue: 12000,
		signedUpAt: '2020-08-05',
		active: false,
	},
	{
		id: 6,
		name: 'Frank Lee',
		email: 'frank@example.com',
		phone: '+61 2 9876 5432',
		company: 'Proseware',
		country: 'Australia',
		city: 'Sydney',
		plan: 'Starter',
		seats: 8,
		revenue: 960,
		signedUpAt: '2024-04-18',
		active: true,
	},
]

const columns = createColumns<Customer>([
	{ accessorKey: 'name', header: 'Name', width: 180 },
	{ accessorKey: 'email', header: 'Email', width: 220 },
	{ accessorKey: 'phone', header: 'Phone', width: 180 },
	{ accessorKey: 'company', header: 'Company', width: 160 },
	{ accessorKey: 'country', header: 'Country', width: 160 },
	{ accessorKey: 'city', header: 'City', width: 160 },
	{ accessorKey: 'plan', header: 'Plan', width: 140 },
	{ accessorKey: 'seats', header: 'Seats', width: 120, cell: { type: 'number' } },
	{ accessorKey: 'revenue', header: 'Revenue', width: 140, cell: { type: 'number' } },
	{ accessorKey: 'signedUpAt', header: 'Signed up', width: 160, cell: { type: 'date' } },
	{ accessorKey: 'active', header: 'Active', width: 120, cell: { type: 'boolean' } },
])

const EMPTY_DATA: Customer[] = []

type Mode = 'loading' | 'empty' | 'no-results' | 'normal'

const MODE_LABELS: Record<Mode, string> = {
	loading: 'Loading',
	empty: 'Empty data',
	'no-results': 'No results',
	normal: 'Normal',
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
	return (
		<button
			type='button'
			onClick={onClick}
			style={{
				padding: '0.375rem 0.875rem',
				fontSize: 13,
				fontWeight: active ? 600 : 400,
				borderRadius: 6,
				border: active ? '1px solid #6366f1' : '1px solid #e2e8f0',
				background: active ? '#6366f1' : 'white',
				color: active ? 'white' : '#475569',
				cursor: 'pointer',
				transition: 'all 120ms',
			}}
		>
			{children}
		</button>
	)
}

export function FallbacksExample() {
	const [mode, setMode] = useState<Mode>('loading')

	return (
		<div>
			<div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
				{(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
					<TabButton
						key={m}
						active={mode === m}
						onClick={() => {
							setMode(m)
						}}
					>
						{MODE_LABELS[m]}
					</TabButton>
				))}
			</div>

			{mode === 'no-results' && (
				<p style={{ marginBottom: '0.75rem', fontSize: 13, color: '#64748b' }}>
					Type something that matches no rows in the filter inputs below column headers.
				</p>
			)}

			<DataGrid
				features={features}
				data={mode === 'empty' ? EMPTY_DATA : CUSTOMERS}
				columns={columns}
				sorting
				filtering
				pagination={{ pageSize: 5 }}
				state={{
					loading: { isPending: mode === 'loading', isFetching: false, isError: false, error: null },
					// Reset column filters when leaving 'no-results' mode
					...(mode !== 'no-results' ? { columnFilters: [] } : {}),
				}}
			/>
		</div>
	)
}
