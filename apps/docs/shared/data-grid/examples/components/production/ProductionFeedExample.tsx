'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { DataGrid } from 'shared/DataGrid'

import { orderColumns, type Order } from './data'
import { queryOrders } from './server'

const PAGE_SIZE = 25
const ESTIMATED_ROW_HEIGHT_PX = 49

/**
 * The same server, read as an endless feed instead of pages: rows accumulate as
 * the user scrolls and only the visible window renders. Paging is the one thing
 * this variant cannot share with the main grid — a page footer and infinite
 * scroll are mutually exclusive — so it lives as its own example.
 */
function useOrdersFeed() {
	const [rows, setRows] = useState<Order[]>([])
	const [isPending, setIsPending] = useState(true)
	const [hasNextPage, setHasNextPage] = useState(true)
	const nextPageRef = useRef(0)

	const loadPage = useCallback(async () => {
		const pageIndex = nextPageRef.current
		const page = await queryOrders({
			pageIndex,
			pageSize: PAGE_SIZE,
			sorting: [],
			columnFilters: [],
			globalFilter: '',
		})

		nextPageRef.current = pageIndex + 1
		setRows((prev) => [...prev, ...page.rows])
		setHasNextPage((pageIndex + 1) * PAGE_SIZE < page.rowCount)
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
			data={rows}
			columns={orderColumns}
			getRowId={(row) => String(row.id)}
			state={state}
			stickyHeader
			pinning={{ column: true }}
			virtualized={{ row: { estimateSize: ESTIMATED_ROW_HEIGHT_PX, overscan: 10 } }}
			pagination={{ mode: 'infinite', hasNextPage, onLoadMore, threshold: { rows: 8 } }}
		/>
	)
}
