'use client'

import {
	columnPinningFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createSortedRowModel,
	infiniteFeature,
	loadingFeature,
	rowPaginationFeature,
	rowPinningFeature,
	rowSortingFeature,
	sortFns,
	tableFeatures,
} from '@ez-kit/data-grid-core/features'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { orderColumns, type Order } from './data'
import { queryOrders } from './server'

const features = tableFeatures({
	// Structural: the grid shell reads column widths, visibility and pin groups to lay out
	// the column grid. Everything below is this example's own.
	columnVisibilityFeature,
	columnPinningFeature,
	columnSizingFeature,
	rowSortingFeature,
	loadingFeature,
	infiniteFeature,
	rowPaginationFeature,
	rowPinningFeature,
	sortFns,
	sortedRowModel: createSortedRowModel(),
})

const PAGE_SIZE = 25
const ESTIMATED_ROW_HEIGHT_PX = 49

function useOrdersFeed() {
	const [rows, setRows] = useState<Order[]>([])
	const [isPending, setIsPending] = useState(true)
	const [hasNextPage, setHasNextPage] = useState(true)
	const nextPageRef = useRef(0)
	const isLoadingRef = useRef(false)

	const loadPage = useCallback(async () => {
		if (isLoadingRef.current) return
		isLoadingRef.current = true

		const pageIndex = nextPageRef.current
		nextPageRef.current = pageIndex + 1

		try {
			const page = await queryOrders({
				pageIndex,
				pageSize: PAGE_SIZE,
				sorting: [],
				columnFilters: [],
				globalFilter: '',
			})

			setRows((prev) => [...prev, ...page.rows])
			setHasNextPage((pageIndex + 1) * PAGE_SIZE < page.rowCount)
		} finally {
			isLoadingRef.current = false
		}
	}, [])

	useEffect(() => {
		let cancelled = false
		void loadPage().then(() => {
			if (!cancelled) setIsPending(false)
		})
		return () => {
			cancelled = true
		}
	}, [loadPage])

	const state = useMemo(() => ({ loading: { isPending, isFetching: false, isError: false, error: null } }), [isPending])

	return { rows, state, hasNextPage, onLoadMore: loadPage }
}

export function ProductionFeedExample() {
	const { rows, state, hasNextPage, onLoadMore } = useOrdersFeed()

	return (
		<DataGrid
			features={features}
			data={rows}
			columns={orderColumns}
			state={state}
			layout={{ stickyHeader: true }}
			pinning={{ column: true }}
			virtualization={{ row: { estimateSize: ESTIMATED_ROW_HEIGHT_PX, overscan: 10 } }}
			pagination={{ mode: 'infinite', hasNextPage, onLoadMore, threshold: { rows: 8 } }}
		/>
	)
}
