'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { createOrder, deleteOrders, queryOrders, updateOrder, type OrdersQuery } from './server'

import type { Order } from './data'
import type { ColumnFiltersState, SortingState } from '@ez-kit/data-grid-react'

const DEFAULT_PAGE_SIZE = 10

/**
 * Owns every piece of state the server needs and re-queries whenever one changes.
 * Written with plain `useState` + `useEffect` so the example has no data-layer
 * dependency — in a real app this is one `useQuery` with the same query key.
 */
export function useOrders() {
	const [rows, setRows] = useState<Order[]>([])
	const [rowCount, setRowCount] = useState(0)

	const [pageIndex, setPageIndex] = useState(0)
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
	const [sorting, setSorting] = useState<SortingState>([])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [globalFilter, setGlobalFilter] = useState('')

	const [isPending, setIsPending] = useState(true)
	const [isFetching, setIsFetching] = useState(false)
	const [isError, setIsError] = useState(false)
	const [error, setError] = useState<unknown>(null)

	// The fetch closure reads the query from a ref, so it never goes stale and
	// never needs to be re-created when a query param changes.
	const queryRef = useRef<OrdersQuery>({ pageIndex, pageSize, sorting, columnFilters, globalFilter })
	queryRef.current = { pageIndex, pageSize, sorting, columnFilters, globalFilter }

	// Last-write-wins: a slow response for an older query must not overwrite a
	// newer one. Every request takes a ticket; only the latest ticket may commit.
	const requestIdRef = useRef(0)
	const hasRowsRef = useRef(false)

	const refetch = useCallback(async () => {
		const requestId = ++requestIdRef.current

		// First load has no rows to keep on screen → skeleton. Later loads keep the
		// current page visible underneath the refetch overlay.
		if (!hasRowsRef.current) setIsPending(true)
		setIsFetching(true)
		setIsError(false)
		setError(null)

		try {
			const page = await queryOrders(queryRef.current)
			if (requestId !== requestIdRef.current) return

			hasRowsRef.current = true
			setRows(page.rows)
			setRowCount(page.rowCount)
			setIsPending(false)
			setIsFetching(false)
		} catch (err: unknown) {
			if (requestId !== requestIdRef.current) return

			setIsPending(false)
			setIsFetching(false)
			setIsError(true)
			setError(err)
		}
	}, [])

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		void refetch()
	}, [refetch, pageIndex, pageSize, sorting, columnFilters, globalFilter])

	// Any query change other than paging invalidates the current page number.
	const resetToFirstPage = useCallback(() => {
		setPageIndex(0)
	}, [])

	const create = useCallback(
		async (values: Partial<Order>) => {
			await createOrder(values)
			await refetch()
		},
		[refetch],
	)

	const update = useCallback(
		async (id: number, values: Partial<Order>) => {
			await updateOrder(id, values)
			await refetch()
		},
		[refetch],
	)

	const remove = useCallback(
		async (ids: number[]) => {
			await deleteOrders(ids)
			await refetch()
		},
		[refetch],
	)

	return {
		rows,
		rowCount,
		pageIndex,
		pageSize,
		sorting,
		columnFilters,
		globalFilter,
		loading: { isPending, isFetching, isError, error },
		setPageIndex,
		setPageSize,
		setSorting,
		setColumnFilters,
		setGlobalFilter,
		resetToFirstPage,
		create,
		update,
		remove,
	}
}
