'use client'

import { useContext, useMemo } from 'react'

import { QueryFallbacksContext } from './query-fallbacks'

import type { QueryFallbacks } from './query-fallbacks'
import type { ReactNode } from 'react'

export type QueryProviderProps = QueryFallbacks & {
	children?: ReactNode
}

/**
 * Sets the default `loading`, `idle` and `error` fallbacks for every `<Query>` below it. Each key
 * it sets overrides the enclosing provider's; a key it leaves out is inherited. A `<Query>` prop
 * overrides both. Optional: without a provider, `loading` and `idle` render nothing and an error
 * is thrown to the nearest error boundary.
 *
 * JSX fallbacks are new objects on every render, so hoist them into constants when the provider
 * sits somewhere that re-renders often.
 */
export function QueryProvider({ loading, idle, error, children }: QueryProviderProps): ReactNode {
	const outer = useContext(QueryFallbacksContext)
	const value = useMemo<QueryFallbacks>(
		() => ({
			...outer,
			...(loading !== undefined && { loading }),
			...(idle !== undefined && { idle }),
			...(error !== undefined && { error }),
		}),
		[outer, loading, idle, error],
	)
	return <QueryFallbacksContext.Provider value={value}>{children}</QueryFallbacksContext.Provider>
}
