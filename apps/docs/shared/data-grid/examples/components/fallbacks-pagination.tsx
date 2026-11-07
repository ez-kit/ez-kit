'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	loadingFeature,
	rowPaginationFeature,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { createColumns } from '@ez-kit/data-grid-react'
import { keepPreviousData, QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { makeUsers, type User } from './_data'

const features = tableFeatures({
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	loadingFeature,
	rowPaginationFeature,
})

const users = makeUsers(300)
const columns = createColumns<User>([
	{ accessorKey: 'name', header: 'Name' },
	{ accessorKey: 'email', header: 'Email' },
	{ accessorKey: 'age', header: 'Age', cell: 'number' },
])

async function fetchPage(pageIndex: number, pageSize: number) {
	// Simulate a server request so the overlay is easy to see on every page change.
	await new Promise((resolve) => setTimeout(resolve, 1200))
	return {
		rows: users.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
		rowCount: users.length,
	}
}

function PaginationGrid({ virtualized }: { virtualized: boolean }) {
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: virtualized ? 100 : 5 })
	const query = useQuery({
		queryKey: ['fallbacks-pagination', pagination.pageIndex, pagination.pageSize],
		queryFn: () => fetchPage(pagination.pageIndex, pagination.pageSize),
		placeholderData: keepPreviousData,
	})

	return (
		<DataGrid
			features={features}
			data={query.data?.rows ?? []}
			columns={columns}
			virtualization={virtualized ? { row: { estimateSize: 40, overscan: 3 } } : false}
			layout={virtualized ? { maxHeight: '280px', stickyHeader: true } : {}}
			state={{ pagination, loading: query }}
			pagination={{
				manual: true,
				rowCount: query.data?.rowCount ?? 0,
				onChange: setPagination,
			}}
		/>
	)
}

export function FallbacksPaginationExample({ virtualized = false }: { virtualized?: boolean } = {}) {
	const [queryClient] = useState(() => new QueryClient())
	return (
		<QueryClientProvider client={queryClient}>
			<PaginationGrid virtualized={virtualized} />
		</QueryClientProvider>
	)
}

export function FallbacksPaginationVirtualizedExample() {
	return <FallbacksPaginationExample virtualized />
}
