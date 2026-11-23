import { useCollectionObservers } from './use-collection-query'

import type { CollectionPagination } from './collection-source'
import type {
	MutationResults,
	QueryResult,
	ReadObserverOptions,
	ReadProjectionCompatibility,
	RuntimeSource,
} from './use-collection-query'

type ReadShape = {
	query: (input: never) => unknown
	getItems: (data: never) => readonly unknown[]
	getTotal?: (data: never) => number | undefined
}
export type CollectionShape = {
	collection: { pages?: ReadShape; infinite?: ReadShape }
	invalidation: RuntimeSource['invalidation']
	create?: { mutation: unknown }
	update?: { mutation: unknown }
	delete?: { mutation: unknown }
	deleteMany?: { mutation: unknown }
}

type ReadCompatibility<R> = {
	[K in keyof R]: ReadProjectionCompatibility<NonNullable<R[K]>, K, 'getItems', 'getTotal'>
}

type Mode = CollectionPagination['mode']
type Read<S extends CollectionShape, M extends Mode> = M extends keyof S['collection']
	? NonNullable<S['collection'][M]>
	: never
export type CollectionMode<S extends CollectionShape> = {
	[K in Mode]: S['collection'] extends Record<K, unknown> ? K : never
}[Mode]
export type CollectionItems<S extends CollectionShape, M extends Mode> =
	Read<S, M> extends { getItems: (data: never) => readonly (infer I)[] } ? I : never
export type CollectionParams<S extends CollectionShape, M extends Mode> =
	Read<S, M> extends {
		query: (input: infer I) => unknown
	}
		? I extends { params: infer P }
			? P
			: undefined
		: never
export type CollectionQueryOptions<S extends CollectionShape, M extends Mode> = ReadObserverOptions<Read<S, M>, M>
export type CollectionResult<S extends CollectionShape, M extends Mode> = M extends Mode
	? {
			mode: M
			items: readonly CollectionItems<S, M>[]
			total: number | undefined
			query: QueryResult<Read<S, M>, M>
		} & MutationResults<S>
	: never

type ParamsArg<P> = undefined extends P ? { params?: P } : { params: P }

export type CollectionQueryConfig<S extends CollectionShape, M extends Mode> = {
	source: S & { collection: NoInfer<ReadCompatibility<S['collection']> & Record<M, unknown>> }
	pagination: CollectionPagination & { mode: M }
	queryOptions?: NoInfer<CollectionQueryOptions<S, M>>
} & ParamsArg<NoInfer<CollectionParams<S, M>>>

/** Observe one resource with application-owned criteria and pagination. */
export function useCollectionQuery<S extends CollectionShape, M extends Mode>(
	config: CollectionQueryConfig<S, M>,
): CollectionResult<S, M> {
	// The public boundary checks both the active read capability and its projection.
	const pagination: CollectionPagination = config.pagination
	const { params } = config
	const input =
		pagination.mode === 'pages'
			? { mode: pagination.mode, pageSize: pagination.pageSize, pageIndex: pagination.pageIndex, params }
			: { mode: pagination.mode, pageSize: pagination.pageSize, params }
	return useCollectionObservers(
		config.source as unknown as RuntimeSource,
		pagination.mode,
		input,
		config.queryOptions,
	) as unknown as CollectionResult<S, M>
}
