'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { createOrder, deleteOrders, queryOrders, updateOrder, type OrdersQuery } from './server'

import type { Order } from './data'
import type { ColumnFiltersState, SortingState } from '@ez-kit/data-grid-react'

const DEFAULT_PAGE_SIZE = 10

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

	const queryRef = useRef<OrdersQuery>({ pageIndex, pageSize, sorting, columnFilters, globalFilter })
	queryRef.current = { pageIndex, pageSize, sorting, columnFilters, globalFilter }

	const requestIdRef = useRef(0)
	const hasRowsRef = useRef(false)

	const refetch = useCallback(async () => {
		const requestId = ++requestIdRef.current

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
