import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'

import { resolveInvalidation } from './invalidation'

import type { InvalidationPolicy } from './invalidation'
import type { CollectionMutation } from './types'
import type {
	InfiniteData,
	QueryKey,
	InvalidateQueryFilters,
	UseInfiniteQueryOptions,
	UseInfiniteQueryResult,
	UseMutationOptions,
	UseMutationResult,
	UseQueryOptions,
	UseQueryResult,
} from '@tanstack/react-query'

export type QueryResult<R, M> = R extends { query: (params: never) => infer O }
	? M extends 'pages'
		? O extends UseQueryOptions<infer _Raw, infer E, infer _Selected, infer _K>
			? UseQueryResult<ReadData<O, M>, E>
			: never
		: O extends UseInfiniteQueryOptions<infer _Raw, infer E, infer _Selected, infer _K, infer _C>
			? UseInfiniteQueryResult<ReadData<O, M>, E>
			: never
	: never
type ResultOf<Fn> = Fn extends (...args: never[]) => infer Value ? Value : never
type ResolveSeed<T> = T extends () => infer Value ? Value : T
type SeedData<O> = O extends { initialData?: infer Seed } ? Exclude<ResolveSeed<Seed>, undefined> : never
type FetchData<O> = O extends { queryFn?: infer Fn } ? Awaited<ResultOf<Fn>> : never

type RawData<O, M> = [FetchData<O>] extends [never]
	? [SeedData<O>] extends [never]
		? M extends 'infinite'
			? InfiniteData<unknown>
			: unknown
		: SeedData<O>
	: M extends 'infinite'
		? InfiniteData<FetchData<O>>
		: FetchData<O>

type ReadData<O, M> = O extends unknown
	? O extends { select: (...args: never[]) => infer Selected }
		? Selected
		: RawData<O, M> | ('select' extends keyof O ? ResultOf<O['select']> : never)
	: never

type ProjectedData<O, M> = M extends 'infinite'
	? ReadData<O, M> extends InfiniteData<infer Page>
		? Page
		: never
	: ReadData<O, M>

type InfiniteReadOptions = {
	initialPageParam: unknown
	getNextPageParam: (...args: never[]) => unknown
	initialData?: InfiniteData<unknown> | (() => InfiniteData<unknown> | undefined) | undefined
	select?: ((...args: never[]) => InfiniteData<unknown>) | undefined
}

/** @internal Verify a structural read before erasing the options and projection together. */
export type ReadProjectionCompatibility<
	R,
	M,
	Items extends PropertyKey,
	Total extends PropertyKey = never,
> = R extends { query: (...args: never[]) => infer Options }
	? [Options] extends [{ queryKey: QueryKey }]
		? [InvalidReadOptions<Options, M>] extends [never]
			? M extends 'infinite'
				? [Options] extends [InfiniteReadOptions]
					? ProjectionCompatibility<R, ProjectedData<Options, M>, Items | Total>
					: never
				: ProjectionCompatibility<R, ProjectedData<Options, M>, Items | Total>
			: never
		: never
	: never

type InvalidReadOptions<O, M> = O extends unknown
	? [QueryResult<{ query: () => O }, M>] extends [never]
		? O
		: [SeedData<O>] extends [RawData<O, M>]
			? never
			: O
	: never

type ProjectionCompatibility<R, D, Keys extends PropertyKey> = {
	[K in keyof R as K extends Keys ? K : never]: NonNullable<R[K]> extends (data: D) => unknown ? unknown : never
}
export type MutationResults<S> = {
	[K in keyof S as K extends 'create' | 'update' | 'delete' | 'deleteMany' ? K : never]: NonNullable<
		S[K]
	> extends CollectionMutation<infer V, infer D, infer E, infer O>
		? UseMutationResult<D, E, V, O>
		: never
}
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
export type ReadObserverOptions<R, M> = Pick<
	NativeObserverOptions<R, M>,
	Extract<(typeof OBSERVER_OPTIONS)[number], keyof NativeObserverOptions<R, M>>
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

type RuntimeMutation = {
	mutation: UseMutationOptions<unknown, unknown, unknown>
	invalidate?: InvalidationPolicy
}
export type RuntimeSource = {
	read: {
		pages?:
			| {
					query: (params: unknown) => UseQueryOptions<unknown, unknown>
					getItems: (data: unknown) => readonly unknown[]
					getTotal?: (data: unknown) => number | undefined
			  }
			| undefined
		infinite?:
			| {
					query: (params: unknown) => UseInfiniteQueryOptions<unknown, unknown, InfiniteData<unknown>>
					getItems: (data: unknown) => readonly unknown[]
			  }
			| undefined
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

export function useCollectionObservers(
	source: RuntimeSource,
	mode: 'pages' | 'infinite',
	params: unknown,
	queryOptions: unknown,
) {
	const reads = source.read
	const overrides = observerOptions(queryOptions)
	const list = useQuery(
		mode === 'pages' && reads.pages ? { ...reads.pages.query(params), ...overrides } : INACTIVE_LIST,
	)
	const pages = useInfiniteQuery(
		mode === 'infinite' && reads.infinite ? { ...reads.infinite.query(params), ...overrides } : INACTIVE_INFINITE,
	)
	const create = useOptionalCollectionMutation(source.create, source.invalidation)
	const update = useOptionalCollectionMutation(source.update, source.invalidation)
	const remove = useOptionalCollectionMutation(source.delete, source.invalidation)
	const deleteMany = useOptionalCollectionMutation(source.deleteMany, source.invalidation)
	const read = mode === 'pages' ? reads.pages : reads.infinite
	const data = mode === 'pages' ? list.data : pages.data
	const getItems = read?.getItems
	const items = useMemo(() => {
		if (!getItems || data === undefined) return EMPTY
		if (mode === 'pages') return getItems(data)
		return (data as InfiniteData<unknown>).pages.flatMap((page) => getItems(page))
	}, [mode, getItems, data])
	if (!read) throw new Error(`Collection source does not support ${mode} reads`)
	return {
		mode,
		items,
		total: mode === 'pages' && list.data !== undefined ? reads.pages?.getTotal?.(list.data) : undefined,
		query: mode === 'pages' ? list : pages,
		...(source.create ? { create } : {}),
		...(source.update ? { update } : {}),
		...(source.delete ? { delete: remove } : {}),
		...(source.deleteMany ? { deleteMany } : {}),
	}
}
