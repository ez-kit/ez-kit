import { createContext } from 'react'

import type { DefaultError, UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/** Renders a query that failed before it had any data; same shape as `children`. */
export type QueryErrorFallback<TData = unknown, TError = DefaultError> = (
	error: TError,
	q: UseQueryResult<TData, TError>,
) => ReactNode

/** The fallbacks a `<QueryProvider>` hands to every `<Query>` below it. */
export type QueryFallbacks = {
	/** Rendered during the first load, while there is no data yet. */
	loading?: ReactNode
	/** Rendered while the query is disabled and has no data. */
	idle?: ReactNode
	/**
	 * Rendered when the query failed without data; without one the error is thrown. It is typed with
	 * TanStack's default error (`Error`, or the type registered through `Register`): a query that
	 * declares its own error type should set `error` on its gate, which is typed from the query.
	 */
	error?: QueryErrorFallback
}

export const QueryFallbacksContext = createContext<QueryFallbacks>({})
