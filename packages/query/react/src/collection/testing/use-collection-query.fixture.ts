import { useCollectionObservers } from '../use-collection-query'

import type {
	MutationResults,
	QueryResult,
	ReadObserverOptions,
	ReadProjectionCompatibility,
	RuntimeSource,
} from '../use-collection-query'
import type { InvalidateQueryFilters } from '@tanstack/react-query'

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

/** @internal Structural read checks shared with UI connectors. */
export type CollectionReadCompatibility<S> = {
	[K in keyof S as K extends 'getAll' | 'getInfinite' ? K : never]: ReadProjectionCompatibility<
		NonNullable<S[K]>,
		K extends 'getAll' ? 'pages' : 'infinite',
		'getItems',
		'getTotal'
	>
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

export type CollectionQueryOptions<S, M extends CollectionMode<S>> = ReadObserverOptions<Read<S, M>, M>

export type CollectionQueryConfig<S, M extends CollectionMode<S>> =
	M extends CollectionMode<S>
		? {
				source: S & { [K in ReadKey<M>]: Read<S, M> } & CollectionReadCompatibility<NoInfer<S>>
				mode: M
				params: CollectionParams<S, M>
				queryOptions?: CollectionQueryOptions<S, M>
			}
		: never

/** Execute externally owned parameters without introducing a second cache or state store. */
export function useCollectionQuery<S extends CollectionShape, M extends CollectionMode<S>>(
	config: CollectionQueryConfig<S, M>,
): CollectionResult<S, M> {
	const source = config.source as unknown as Omit<RuntimeSource, 'collection'> & {
		getAll?: RuntimeSource['collection']['pages']
		getInfinite?: RuntimeSource['collection']['infinite']
	}
	return useCollectionObservers(
		{ ...source, collection: { pages: source.getAll, infinite: source.getInfinite } },
		config.mode,
		config.params,
		config.queryOptions,
	) as unknown as CollectionResult<S, M>
}
