'use client'

import { useQuery } from '@tanstack/react-query'
import { useContext } from 'react'

import { QueryFallbacksContext } from './query-fallbacks'
import { resolveGateState } from './resolve-gate-state'

import type { QueryErrorFallback } from './query-fallbacks'
import type { DefaultError, QueryKey, UseQueryOptions, UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

export type QueryProps<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
> = {
	/**
	 * The options `useQuery` takes — usually the result of `queryOptions(...)`, `select` included.
	 * Like a `queryFn`, a `select` must not return `undefined`: the gate reads it as "no data yet".
	 */
	query: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
	/**
	 * Rendered whenever the query has data, including during a background refetch. `NoInfer`: the
	 * types come from `query`, never from an annotation on this function.
	 */
	children: (data: NoInfer<TData>, q: UseQueryResult<NoInfer<TData>, NoInfer<TError>>) => ReactNode
	/** Overrides the provider's `loading`. Defaults to nothing. */
	loading?: ReactNode
	/** Overrides the provider's `idle`. Defaults to nothing. */
	idle?: ReactNode
	/** Overrides the provider's `error`. Without either, the error is thrown to an error boundary. */
	error?: QueryErrorFallback<NoInfer<TData>, NoInfer<TError>>
}

/**
 * Runs `useQuery(query)` and renders `children` once there is data, or the `loading`, `idle` or
 * `error` fallback until then. Only the gate subscribes to the query, so its parent and siblings
 * do not re-render when the query changes.
 *
 * @example
 * ```tsx
 * <Query query={deviceQueries.list()} loading={<Spinner />}>
 * 	{(devices) => <DeviceList devices={devices} />}
 * </Query>
 * ```
 */
export function Query<
	TQueryFnData = unknown,
	TError = DefaultError,
	TData = TQueryFnData,
	TQueryKey extends QueryKey = QueryKey,
>({ query, children, loading, idle, error }: QueryProps<TQueryFnData, TError, TData, TQueryKey>): ReactNode {
	const q = useQuery(query)
	const fallbacks = useContext(QueryFallbacksContext)

	switch (resolveGateState(q)) {
		case 'data':
			return children(q.data as TData, q)
		case 'loading':
			return loading !== undefined ? loading : (fallbacks.loading ?? null)
		case 'idle':
			return idle !== undefined ? idle : (fallbacks.idle ?? null)
		case 'error': {
			const fallback = error ?? (fallbacks.error as QueryErrorFallback<TData, TError> | undefined)
			// eslint-disable-next-line @typescript-eslint/only-throw-error -- rethrows exactly what the queryFn rejected with, so the error boundary sees the query's own error
			if (fallback === undefined) throw q.error
			return fallback(q.error as TError, q)
		}
	}
}
