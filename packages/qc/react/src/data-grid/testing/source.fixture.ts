import { resolveInvalidation } from '../invalidation'

import type { InvalidationPolicy } from '../invalidation'
import type { GridListSource } from './list-source.fixture'
import type { GridMutationSource } from './mutation-source.fixture'
import type {
	GridCreateContext,
	GridDeleteContext,
	GridDeleteManyContext,
	GridInfiniteParams,
	GridUpdateContext,
} from '../types'
import type { ReadSelection } from '@ez-kit/query-react/collection'
import type { DefaultError, InfiniteData, QueryKey, UseInfiniteQueryOptions } from '@tanstack/react-query'

// Native infiniteQueryOptions leaves stored pageParams unknown; TPageParam still
// types the request cursor and pagination callbacks. Do not narrow native cache data.
export type GridInfiniteSource<
	TPage,
	TPageParam,
	TRow extends object,
	TError = DefaultError,
	TKey extends QueryKey = QueryKey,
	TSelectedPage = TPage,
> = {
	query: (
		params: GridInfiniteParams,
	) => UseInfiniteQueryOptions<TPage, TError, InfiniteData<TSelectedPage>, TKey, TPageParam> &
		ReadSelection<InfiniteData<TPage>, InfiniteData<TSelectedPage>>
	getRows: (page: NoInfer<TSelectedPage>) => readonly TRow[]
}

export type GridSourceOperations<
	TRow extends object,
	TCreate,
	TUpdate,
	TDelete,
	TDeleteMany,
	TCreateResult,
	TUpdateResult,
	TDeleteResult,
	TDeleteManyResult,
	TError,
	TContext,
> = {
	create?: GridMutationSource<GridCreateContext<TRow>, TCreate, TCreateResult, TError, TContext>
	update?: GridMutationSource<GridUpdateContext<TRow>, TUpdate, TUpdateResult, TError, TContext>
	delete?: GridMutationSource<GridDeleteContext<TRow>, TDelete, TDeleteResult, TError, TContext>
	deleteMany?: GridMutationSource<GridDeleteManyContext<TRow>, TDeleteMany, TDeleteManyResult, TError, TContext>
}

/** Adapt native options without re-keying an existing application's queries. */
export function createGridDataSource<
	TResponse,
	TRow extends object,
	TSelected = TResponse,
	TPage = TResponse,
	TPageParam = unknown,
	TCreate = never,
	TUpdate = never,
	TDelete = never,
	TDeleteMany = never,
	TCreateResult = unknown,
	TUpdateResult = unknown,
	TDeleteResult = unknown,
	TDeleteManyResult = unknown,
	TError = DefaultError,
	TContext = unknown,
	TKey extends QueryKey = QueryKey,
	TInfiniteKey extends QueryKey = QueryKey,
	TSelectedPage = TPage,
	Capabilities extends { getAll?: unknown; getInfinite?: unknown } = { getAll?: unknown; getInfinite?: unknown },
>(
	config: Capabilities & {
		getAll: GridListSource<TResponse, TError, TSelected, TRow, TKey>
		getInfinite?: GridInfiniteSource<TPage, TPageParam, NoInfer<TRow>, TError, TInfiniteKey, TSelectedPage>
		invalidate: InvalidationPolicy
		transformError?: (error: unknown) => unknown
	} & GridSourceOperations<
			NoInfer<TRow>,
			TCreate,
			TUpdate,
			TDelete,
			TDeleteMany,
			TCreateResult,
			TUpdateResult,
			TDeleteResult,
			TDeleteManyResult,
			TError,
			TContext
		>,
) {
	const result = {
		...config,
		queries: {
			list: config.getAll.query,
			...(config.getInfinite === undefined ? {} : { infinite: config.getInfinite.query }),
		},
		invalidation: resolveInvalidation([], config.invalidate),
	}
	return result as Omit<typeof result, 'getInfinite'> &
		(Capabilities extends { getInfinite: unknown }
			? Required<Pick<typeof result, 'getInfinite'>>
			: 'getInfinite' extends keyof Capabilities
				? Pick<typeof result, 'getInfinite'>
				: { getInfinite?: never })
}

export function listInvalidation(key: QueryKey) {
	return [{ queryKey: [...key, 'list'] }, { queryKey: [...key, 'infinite'] }]
}

/** Internal source construction for generated key families. */
export function sourceInvalidation(key: QueryKey, policy: InvalidationPolicy | undefined) {
	return resolveInvalidation(listInvalidation(key), policy)
}
