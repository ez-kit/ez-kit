'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createOrder, deleteOrders, queryOrders, updateOrder, type OrdersQuery } from './server'

import type { Order } from './data'
import type { TableState } from '@ez-kit/data-grid-react'

const DEFAULT_PAGE_SIZE = 10

/** What `onStateChange` hands back: the next state, or a function producing it. */
type StateUpdater = TableState | ((prev: TableState) => TableState)

const INITIAL_STATE: Partial<TableState> = {
	pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE },
	sorting: [],
	columnFilters: [],
	globalFilter: '',
}

function toQuery(state: Partial<TableState>): OrdersQuery {
	return {
		pageIndex: state.pagination?.pageIndex ?? 0,
		pageSize: state.pagination?.pageSize ?? DEFAULT_PAGE_SIZE,
		sorting: state.sorting ?? [],
		columnFilters: state.columnFilters ?? [],
		globalFilter: String(state.globalFilter ?? ''),
	}
}

/**
 * The whole grid state in one `useState`, fed by one `onStateChange`.
 * The server-owned slices are derived from it; everything else just rides along.
 * Mutations write, then refetch the current query.
 */
export function useOrdersState() {
	const [tableState, setTableState] = useState<Partial<TableState>>(INITIAL_STATE)

	const [rows, setRows] = useState<Order[]>([])
	const [rowCount, setRowCount] = useState(0)
	const [isPending, setIsPending] = useState(true)
	const [isFetching, setIsFetching] = useState(false)
	const [isError, setIsError] = useState(false)
	const [error, setError] = useState<unknown>(null)

	// Only the query-owning slices belong in the deps — sizing, pinning or visibility
	// travel through the same handler and must not trigger a request.
	const query = useMemo(
		() => toQuery(tableState),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[tableState.pagination, tableState.sorting, tableState.columnFilters, tableState.globalFilter],
	)

	const queryRef = useRef(query)
	queryRef.current = query

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
			if (requestId !== requestIdRef.current) return // a newer query already started

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
	}, [refetch, query])

	const onStateChange = useCallback((updater: StateUpdater) => {
		setTableState((prev) => {
			const next = typeof updater === 'function' ? updater(prev as TableState) : updater

			const invalidatesPage =
				next.sorting !== prev.sorting ||
				next.columnFilters !== prev.columnFilters ||
				next.globalFilter !== prev.globalFilter

			if (!invalidatesPage) return next

			return { ...next, pagination: { pageIndex: 0, pageSize: next.pagination.pageSize } }
		})
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

	const loading = useMemo(() => ({ isPending, isFetching, isError, error }), [isPending, isFetching, isError, error])

	return { rows, rowCount, tableState, onStateChange, loading, create, update, remove }
}
