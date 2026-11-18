import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { resolveInvalidation } from './invalidation'

import type { InvalidationPolicy } from './invalidation'
import type { CollectionMutation } from './types'
import type {
	InfiniteData,
	InvalidateQueryFilters,
	UseInfiniteQueryOptions,
	UseInfiniteQueryResult,
	UseMutationOptions,
	UseMutationResult,
	UseQueryOptions,
	UseQueryResult,
} from '@tanstack/react-query'

export type CollectionShape = {
	getAll?: {
		query: (params: never) => unknown
		getItems: (data: never) => readonly unknown[]
		getTotal?: (data: never) => number | undefined
	}
	getInfinite?: { query: (params: never) => unknown; getItems: (data: never) => readonly unknown[] }
	create?: { mutation: unknown }
	update?: { mutation: unknown }
	delete?: { mutation: unknown }
	deleteMany?: { mutation: unknown }
	invalidation: readonly InvalidateQueryFilters[]
}
export type CollectionMode<S> =
	('getAll' extends keyof S ? 'pages' : never) | ('getInfinite' extends keyof S ? 'infinite' : never)
type ReadKey<M> = M extends 'pages' ? 'getAll' : 'getInfinite'
type Read<S, M> = ReadKey<M> extends keyof S ? NonNullable<S[ReadKey<M>]> : never
export type CollectionParams<S, M> = Read<S, M> extends { query: (params: infer P) => unknown } ? P : never
export type CollectionItems<S, M> = Read<S, M> extends { getItems: (data: never) => readonly (infer I)[] } ? I : never
type QueryResult<R, M> = R extends { query: (params: never) => infer O }
	? M extends 'pages'
		? O extends UseQueryOptions<infer _D, infer E, infer D, infer _K>
			? UseQueryResult<D, E>
			: never
		: O extends UseInfiniteQueryOptions<infer _D, infer E, infer D, infer _K, infer _C>
			? UseInfiniteQueryResult<D, E>
			: never
	: never
type MutationResults<S> = {
	[K in keyof S as K extends 'create' | 'update' | 'delete' | 'deleteMany' ? K : never]: NonNullable<
		S[K]
	> extends CollectionMutation<infer V, infer D, infer E, infer O>
		? UseMutationResult<D, E, V, O>
		: never
}
export type CollectionResult<S, M extends CollectionMode<S>> =
	M extends CollectionMode<S>
		? {
				mode: M
				items: readonly CollectionItems<S, M>[]
				total: number | undefined
				query: QueryResult<Read<S, M>, M>
			} & MutationResults<S>
		: never
const OBSERVER_OPTIONS = [
	'enabled',
	'staleTime',
	'gcTime',
	'retry',
	'retryDelay',
	'retryOnMount',
	'refetchInterval',
	'refetchIntervalInBackground',
	'refetchOnMount',
	'refetchOnWindowFocus',
	'refetchOnReconnect',
	'networkMode',
	'throwOnError',
	'notifyOnChangeProps',
] as const
type NativeObserverOptions<R, M> = R extends { query: (params: never) => infer O }
	? M extends 'pages'
		? O extends UseQueryOptions<infer D, infer E, infer S, infer K>
			? UseQueryOptions<D, E, S, K>
			: never
		: O extends UseInfiniteQueryOptions<infer D, infer E, infer S, infer K, infer C>
			? UseInfiniteQueryOptions<D, E, S, K, C>
			: never
	: never
export type CollectionQueryOptions<S, M extends CollectionMode<S>> = Pick<
	NativeObserverOptions<Read<S, M>, M>,
	Extract<(typeof OBSERVER_OPTIONS)[number], keyof NativeObserverOptions<Read<S, M>, M>>
>

// Whitelist at runtime too: untyped callers cannot replace cache identity or projections.
function observerOptions(options: unknown) {
	const result: Record<string, unknown> = {}
	if (options && typeof options === 'object') {
		for (const key of OBSERVER_OPTIONS) {
			if (Object.prototype.hasOwnProperty.call(options, key)) result[key] = (options as Record<string, unknown>)[key]
		}
	}
	return result
}

export type CollectionQueryConfig<S, M extends CollectionMode<S>> =
	M extends CollectionMode<S>
		? {
				source: S & { [K in ReadKey<M>]: Read<S, M> }
				mode: M
				params: CollectionParams<S, M>
				queryOptions?: CollectionQueryOptions<S, M>
			}
		: never

type RuntimeMutation = {
	mutation: UseMutationOptions<unknown, unknown, unknown>
	invalidate?: InvalidationPolicy
}
type RuntimeSource = {
	getAll?: {
		query: (params: unknown) => UseQueryOptions<unknown, unknown>
		getItems: (data: unknown) => readonly unknown[]
		getTotal?: (data: unknown) => number | undefined
	}
	getInfinite?: {
		query: (params: unknown) => UseInfiniteQueryOptions<unknown, unknown, InfiniteData<unknown>>
		getItems: (data: unknown) => readonly unknown[]
	}
	create?: RuntimeMutation
	update?: RuntimeMutation
	delete?: RuntimeMutation
	deleteMany?: RuntimeMutation
	invalidation: readonly InvalidateQueryFilters[]
}
const EMPTY: readonly never[] = []
// Resolve internal options against neutral defaults. The observers still use the
// application's client, so mode switches keep the real cache and subscriptions.
const internalDefaults = /* @__PURE__ */ new QueryClient()
const INACTIVE_LIST = /* @__PURE__ */ internalDefaults.defaultQueryOptions<unknown, unknown>({
	queryKey: ['ez-kit', 'inactive-collection-list'],
	queryFn: () => Promise.resolve(null),
	enabled: false,
	gcTime: 0,
})
const { persister: _persister, ...inactiveInfiniteDefaults } = /* @__PURE__ */ internalDefaults.defaultQueryOptions<
	unknown,
	unknown,
	InfiniteData<unknown>,
	InfiniteData<unknown>
>({
	queryKey: ['ez-kit', 'inactive-collection-infinite'],
	enabled: false,
	gcTime: 0,
})
const INACTIVE_INFINITE = {
	...inactiveInfiniteDefaults,
	queryFn: () => Promise.resolve(null),
	initialPageParam: null,
	getNextPageParam: () => undefined,
}

/** The native variables and lifecycle contract is retained, including after observer unmount. */
export function useCollectionMutation<V, D, E, O>(
	source: CollectionMutation<V, D, E, O>,
	inherited: readonly InvalidateQueryFilters[],
) {
	const client = useQueryClient()
	const filters = resolveInvalidation(inherited, source.invalidate)
	const options = client.defaultMutationOptions(source.mutation)
	return useMutation({
		...options,
		onSuccess: async (...args) => {
			try {
				await options.onSuccess?.(...args)
			} finally {
				for (const filter of filters) {
					try {
						void client.invalidateQueries(filter).catch(() => undefined)
					} catch {
						/* Isolate user predicates. */
					}
				}
			}
		},
	})
}
const MISSING = { mutation: { mutationFn: () => Promise.reject(new Error('Collection operation is not configured')) } }

// Keep the last committed operation while its capability is absent. Replacing its
// options with a placeholder would rewrite an in-flight mutation's callbacks/retry.
function useOptionalCollectionMutation(
	source: RuntimeMutation | undefined,
	inherited: readonly InvalidateQueryFilters[],
) {
	const retained = useRef({ source: source ?? MISSING, inherited })
	useEffect(() => {
		if (source) retained.current = { source, inherited }
	}, [source, inherited])
	const active = source ? { source, inherited } : retained.current
	return useCollectionMutation(active.source, active.inherited)
}

/** Execute externally owned parameters without introducing a second cache or state store. */
export function useCollectionQuery<S extends CollectionShape, M extends CollectionMode<S>>(
	config: CollectionQueryConfig<S, M>,
): CollectionResult<S, M> {
	const { mode, params } = config
	const source = config.source as unknown as RuntimeSource
	const overrides = observerOptions(config.queryOptions)
	const list = useQuery(
		mode === 'pages' && source.getAll ? { ...source.getAll.query(params), ...overrides } : INACTIVE_LIST,
	)
	const pages = useInfiniteQuery(
		mode === 'infinite' && source.getInfinite
			? { ...source.getInfinite.query(params), ...overrides }
			: INACTIVE_INFINITE,
	)
	const create = useOptionalCollectionMutation(source.create, source.invalidation)
	const update = useOptionalCollectionMutation(source.update, source.invalidation)
	const remove = useOptionalCollectionMutation(source.delete, source.invalidation)
	const deleteMany = useOptionalCollectionMutation(source.deleteMany, source.invalidation)
	const read = mode === 'pages' ? source.getAll : source.getInfinite
	const data = mode === 'pages' ? list.data : pages.data
	const items = useMemo(() => {
		if (!read || data === undefined) return EMPTY
		if (mode === 'pages') return read.getItems(data)
		return (data as InfiniteData<unknown>).pages.flatMap((page) => read.getItems(page))
	}, [mode, read, data])
	if (!read) throw new Error(`Collection source does not support ${mode} reads`)
	return {
		mode,
		items,
		total: mode === 'pages' && list.data !== undefined ? source.getAll?.getTotal?.(list.data) : undefined,
		query: mode === 'pages' ? list : pages,
		...(source.create ? { create } : {}),
		...(source.update ? { update } : {}),
		...(source.delete ? { delete: remove } : {}),
		...(source.deleteMany ? { deleteMany } : {}),
	} as unknown as CollectionResult<S, M>
}
