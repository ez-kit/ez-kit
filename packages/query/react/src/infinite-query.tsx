'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useContext } from 'react'

import { QueryFallbacksContext } from './query-fallbacks'
import { resolveGateState } from './resolve-gate-state'

import type {
	DefaultError,
	InfiniteData,
	QueryKey,
	UseInfiniteQueryOptions,
	UseInfiniteQueryResult,
} from '@tanstack/react-query'
import type { ReactNode } from 'react'

export type InfiniteQueryErrorFallback<TData = unknown, TError = DefaultError> = (
	error: TError,
	q: UseInfiniteQueryResult<TData, TError>,
) => ReactNode

export type InfiniteQueryProps<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = InfiniteData<TQueryFnData>,
	TQueryKey extends QueryKey = QueryKey,
	TPageParam = unknown,
> = {
	/** Native useInfiniteQuery options, usually from infiniteQueryOptions, including select. */
	query: UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>
	/** Types come from query. The full native result includes all pagination methods and flags. */
	children: (data: NoInfer<TData>, q: UseInfiniteQueryResult<NoInfer<TData>, NoInfer<TError>>) => ReactNode
	loading?: ReactNode
	idle?: ReactNode
	error?: InfiniteQueryErrorFallback<NoInfer<TData>, NoInfer<TError>>
}

/** A query gate that keeps loaded pages visible during pagination and failed refetches. */
export function InfiniteQuery<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = InfiniteData<TQueryFnData>,
	TQueryKey extends QueryKey = QueryKey,
	TPageParam = unknown,
>({
	query,
	children,
	loading,
	idle,
	error,
}: InfiniteQueryProps<TQueryFnData, TError, TData, TQueryKey, TPageParam>): ReactNode {
	const q = useInfiniteQuery(query)
	const fallbacks = useContext(QueryFallbacksContext)

	switch (resolveGateState(q)) {
		case 'data':
			return children(q.data as TData, q)
		case 'loading':
			return loading !== undefined ? loading : (fallbacks.loading ?? null)
		case 'idle':
			return idle !== undefined ? idle : (fallbacks.idle ?? null)
		case 'error': {
			const fallback = error ?? (fallbacks.error as InfiniteQueryErrorFallback<TData, TError> | undefined)
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- preserves TanStack's original error
			if (fallback === undefined) throw q.error
			return fallback(q.error as TError, q)
		}
	}
}
