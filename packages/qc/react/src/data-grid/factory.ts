import { createInfiniteSource } from './infinite-source'
import { createListSource } from './list-source'
import { sourceInvalidation } from './source'

import type { GridInfiniteFetcherOptions } from './infinite-source'
import type { InvalidationPolicy } from './invalidation'
import type { GridListFetcherOptions } from './list-source'
import type { GridMutationSource } from './mutation-source'
import type {
	GridCreateContext,
	GridDeleteContext,
	GridDeleteManyContext,
	GridFetcher,
	GridQueryParams,
	GridInfiniteParams,
	GridUpdateContext,
} from './types'
import type { DefaultError, QueryKey, UseMutationOptions } from '@tanstack/react-query'

type MutationDefaults<TInput, TArgs> = {
	prepareArgs: (input: TInput) => TArgs
	transformError?: (error: unknown) => unknown
}
type MutationFetcher<TArgs, TResult> = (args: TArgs) => Promise<TResult>
type Preparation<TInput, TDefaultArgs, TArgs> = [TDefaultArgs] extends [never]
	? { prepareArgs: (input: TInput) => NoInfer<TArgs> }
	: [TDefaultArgs] extends [TArgs]
		? { prepareArgs?: (input: TInput) => NoInfer<TArgs> }
		: { prepareArgs: (input: TInput) => NoInfer<TArgs> }

type MutationInput<TInput, TDefaultArgs, TArgs, TResult, TError, TContext> =
	| ([TDefaultArgs] extends [never] ? never : [TDefaultArgs] extends [TArgs] ? MutationFetcher<TArgs, TResult> : never)
	| ({
			fetcher: MutationFetcher<TArgs, TResult>
			options?: Omit<UseMutationOptions<TResult, TError, TArgs, TContext>, 'mutationFn'>
			invalidate?: InvalidationPolicy
			transformError?: (error: unknown) => unknown
	  } & Preparation<TInput, TDefaultArgs, TArgs>)

function mutationSource<TInput, TDefaultArgs, TArgs, TResult, TError, TContext>(
	input: MutationInput<TInput, TDefaultArgs, TArgs, TResult, TError, TContext> | undefined,
	defaults: MutationDefaults<TInput, TDefaultArgs> | undefined,
): GridMutationSource<TInput, TArgs, TResult, TError, TContext> | undefined {
	if (input === undefined) return undefined
	const operation: {
		fetcher: MutationFetcher<TArgs, TResult>
		prepareArgs?: (input: TInput) => TArgs
		options?: Omit<UseMutationOptions<TResult, TError, TArgs, TContext>, 'mutationFn'>
		invalidate?: InvalidationPolicy
		transformError?: (error: unknown) => unknown
	} = typeof input === 'function' ? { fetcher: input } : input
	// Preparation requires an override unless the default result is assignable to
	// this fetcher's argument. TS cannot reduce that conditional inside a generic body.
	const prepareArgs = (operation.prepareArgs ?? defaults?.prepareArgs) as ((input: TInput) => TArgs) | undefined
	if (!prepareArgs) throw new Error('A grid mutation requires prepareArgs on the operation or API factory')
	const transformError = operation.transformError ?? defaults?.transformError
	return {
		mutation: { ...operation.options, mutationFn: operation.fetcher },
		prepareArgs,
		...(operation.invalidate === undefined ? {} : { invalidate: operation.invalidate }),
		...(transformError === undefined ? {} : { transformError }),
	}
}

/** Shared conventions are generic functions when they serve multiple entity row types. */
export function createGridSourceFactory<
	TArgs,
	TResponse,
	TRow extends object,
	TInfiniteArgs = TArgs,
	TCollection = TArgs,
	TPage = TResponse,
	TPageParam = unknown,
	TCreate = never,
	TUpdate = never,
	TDelete = never,
	TDeleteMany = never,
>(defaults: {
	list: {
		prepareArgs: (params: GridQueryParams) => TArgs
		getRows: (response: TResponse) => readonly TRow[]
		getRowCount?: (response: TResponse) => number | undefined
		options?: NonNullable<GridListFetcherOptions<TArgs, TResponse, TResponse, TRow, DefaultError>['options']>
	}
	infinite?: {
		prepareArgs: (params: GridInfiniteParams) => TCollection
		preparePageArgs: (context: { args: TCollection; pageParam: TPageParam }) => TInfiniteArgs
		initialPageParam: TPageParam
		getNextPageParam: (
			lastPage: TPage,
			allPages: TPage[],
			lastPageParam: TPageParam,
			allPageParams: TPageParam[],
		) => TPageParam | null | undefined
		getRows: (page: TPage) => readonly TRow[]
		options?: NonNullable<
			GridInfiniteFetcherOptions<TInfiniteArgs, TCollection, TPage, TPageParam, TPage, TRow, DefaultError>['options']
		>
	}

	mutations?: {
		create?: MutationDefaults<GridCreateContext<TRow>, TCreate>
		update?: MutationDefaults<GridUpdateContext<TRow>, TUpdate>
		delete?: MutationDefaults<GridDeleteContext<TRow>, TDelete>
		deleteMany?: MutationDefaults<GridDeleteManyContext<TRow>, TDeleteMany>
	}
	transformError?: (error: unknown) => unknown
}) {
	return function createSource<
		TCreateArgs = TCreate,
		TUpdateArgs = TUpdate,
		TDeleteArgs = TDelete,
		TDeleteManyArgs = TDeleteMany,
		TCreateResult = unknown,
		TUpdateResult = unknown,
		TDeleteResult = unknown,
		TDeleteManyResult = unknown,
		TCreateError = DefaultError,
		TCreateContext = unknown,
		TUpdateError = DefaultError,
		TUpdateContext = unknown,
		TDeleteError = DefaultError,
		TDeleteContext = unknown,
		TDeleteManyError = DefaultError,
		TDeleteManyContext = unknown,
	>(config: {
		key: QueryKey
		getAll:
			| GridFetcher<TArgs, TResponse>
			| ({ fetcher: GridFetcher<TArgs, TResponse> } & Partial<
					Omit<GridListFetcherOptions<TArgs, TResponse, TResponse, TRow, DefaultError>, 'key' | 'fetcher'>
			  >)
		getInfinite?:
			| GridFetcher<TInfiniteArgs, TPage>
			| ({ fetcher: GridFetcher<TInfiniteArgs, TPage> } & Partial<
					Omit<
						GridInfiniteFetcherOptions<TInfiniteArgs, TCollection, TPage, TPageParam, TPage, TRow, DefaultError>,
						'key' | 'fetcher'
					>
			  >)
		create?: MutationInput<GridCreateContext<TRow>, TCreate, TCreateArgs, TCreateResult, TCreateError, TCreateContext>
		update?: MutationInput<GridUpdateContext<TRow>, TUpdate, TUpdateArgs, TUpdateResult, TUpdateError, TUpdateContext>
		delete?: MutationInput<GridDeleteContext<TRow>, TDelete, TDeleteArgs, TDeleteResult, TDeleteError, TDeleteContext>
		deleteMany?: MutationInput<
			GridDeleteManyContext<TRow>,
			TDeleteMany,
			TDeleteManyArgs,
			TDeleteManyResult,
			TDeleteManyError,
			TDeleteManyContext
		>
		invalidate?: InvalidationPolicy
		transformError?: (error: unknown) => unknown
	}) {
		const listInput = typeof config.getAll === 'function' ? { fetcher: config.getAll } : config.getAll
		const getAll = createListSource({ ...defaults.list, ...listInput, key: config.key })
		let getInfinite
		if (config.getInfinite !== undefined) {
			const input = typeof config.getInfinite === 'function' ? { fetcher: config.getInfinite } : config.getInfinite
			const combined = { ...defaults.infinite, ...input }
			if (
				!combined.prepareArgs ||
				!combined.preparePageArgs ||
				!combined.getRows ||
				!combined.getNextPageParam ||
				!('initialPageParam' in combined)
			) {
				throw new Error(
					'An infinite grid source requires prepareArgs, preparePageArgs, getRows, initialPageParam and getNextPageParam',
				)
			}
			getInfinite = createInfiniteSource({
				...combined,
				key: config.key,
				prepareArgs: combined.prepareArgs,
				preparePageArgs: combined.preparePageArgs,
				getRows: combined.getRows,
				getNextPageParam: combined.getNextPageParam,
				initialPageParam: combined.initialPageParam,
			})
		}
		const create = mutationSource(config.create, defaults.mutations?.create)
		const update = mutationSource(config.update, defaults.mutations?.update)
		const remove = mutationSource(config.delete, defaults.mutations?.delete)
		const deleteMany = mutationSource(config.deleteMany, defaults.mutations?.deleteMany)
		const transformError = config.transformError ?? defaults.transformError
		return {
			getAll,
			...(getInfinite === undefined ? {} : { getInfinite }),
			...(create === undefined ? {} : { create }),
			...(update === undefined ? {} : { update }),
			...(remove === undefined ? {} : { delete: remove }),
			...(deleteMany === undefined ? {} : { deleteMany }),
			...(transformError === undefined ? {} : { transformError }),
			invalidation: sourceInvalidation(config.key, config.invalidate),
			queries: { list: getAll.query, ...(getInfinite === undefined ? {} : { infinite: getInfinite.query }) },
		}
	}
}
