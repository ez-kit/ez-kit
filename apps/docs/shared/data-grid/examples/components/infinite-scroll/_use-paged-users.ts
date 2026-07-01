'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { type User } from '../_data'

import { fetchUsersPage, type SortSpec } from './_api'

export type PagedUsers = {
	data: User[]
	/**
	 * Memoised controlled `state` slice carrying `loading` — pass straight to
	 * `useDataGrid({ state })`. `isPending` is true while the initial page 1 load
	 * is in flight (no rows yet → skeleton); `isFetching` could be used for
	 * subsequent loads but infinite-scroll uses `onLoadMore` instead.
	 */
	state: { loading: { isPending: boolean; isFetching: boolean; isError: boolean; error: unknown } }
	hasNextPage: boolean
	/** Append the next page (pass to `pagination.onLoadMore`). */
	onLoadMore: () => Promise<void>
	/** Drop accumulated rows and refetch page 1 (optionally for a new sort). */
	reset: (sort?: SortSpec) => Promise<void>
}

/**
 * Example helper: owns the accumulated rows + cursor for a simulated paged API,
 * loads page 1 on mount (so the grid shows a loading state instead of an empty
 * fallback), and exposes `onLoadMore` / `reset` for the infinite-scroll grid.
 */
export function usePagedUsers(): PagedUsers {
	const [data, setData] = useState<User[]>([])
	const [loading, setLoading] = useState(true)
	const [hasNextPage, setHasNextPage] = useState(true)
	const cursorRef = useRef(0)
	const sortRef = useRef<SortSpec | undefined>(undefined)

	const onLoadMore = useCallback(async () => {
		const page = await fetchUsersPage(cursorRef.current, sortRef.current)
		setData((prev) => [...prev, ...page.rows])
		cursorRef.current += page.rows.length
		setHasNextPage(page.nextCursor !== null)
	}, [])

	const reset = useCallback(async (sort?: SortSpec) => {
		sortRef.current = sort
		cursorRef.current = 0
		setLoading(true)
		setHasNextPage(true)
		const page = await fetchUsersPage(0, sort)
		setData(page.rows)
		cursorRef.current = page.rows.length
		setHasNextPage(page.nextCursor !== null)
		setLoading(false)
	}, [])

	// Load page 1 on mount. State updates happen after the await (not synchronously
	// in the effect body) since `loading` already starts `true`.
	useEffect(() => {
		let cancelled = false
		void fetchUsersPage(0).then((page) => {
			if (cancelled) return
			setData(page.rows)
			cursorRef.current = page.rows.length
			setHasNextPage(page.nextCursor !== null)
			setLoading(false)
		})
		return () => {
			cancelled = true
		}
	}, [])

	const state = useMemo(
		() => ({ loading: { isPending: loading, isFetching: false, isError: false, error: null } }),
		[loading],
	)

	return { data, state, hasNextPage, onLoadMore, reset }
}
