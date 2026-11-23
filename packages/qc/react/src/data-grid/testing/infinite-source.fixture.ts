import { collectionCacheArgs } from '@ez-kit/query-react/collection'
import { infiniteQueryOptions } from '@tanstack/react-query'

import type { GridFetcher, GridInfiniteParams } from '../types'
import type { ReadSelection } from '@ez-kit/query-react/collection'
import type { DefaultError, InfiniteData, QueryKey, UseInfiniteQueryOptions } from '@tanstack/react-query'

export type GridInfiniteFetcherOptions<
	TArgs,
	TCollection,
	TPage,
	TPageParam,
	TSelectedPage,
	TRow extends object,
	TError,
> = {
	key: QueryKey
	fetcher: GridFetcher<TArgs, TPage>
	prepareArgs: (params: GridInfiniteParams) => TCollection
	prepareKey?: (args: NoInfer<TCollection>, params: GridInfiniteParams) => unknown
	preparePageArgs: (context: { args: TCollection; pageParam: TPageParam }) => NoInfer<TArgs>
	initialPageParam: TPageParam
	getNextPageParam: (
		lastPage: TPage,
		allPages: TPage[],
		lastPageParam: TPageParam,
		allPageParams: TPageParam[],
	) => TPageParam | null | undefined
	getRows: (page: TSelectedPage) => readonly TRow[]
	options?: Omit<
		UseInfiniteQueryOptions<TPage, TError, InfiniteData<TSelectedPage, TPageParam>, QueryKey, TPageParam>,
		'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
	>
}

/** Page preparation is transport-only; collection arguments own cache identity. */
export function createInfiniteSource<
	TArgs,
	TCollection,
	TPage,
	TPageParam,
	TRow extends object,
	TSelectedPage = TPage,
	TError = DefaultError,
>(
	config: GridInfiniteFetcherOptions<TArgs, TCollection, TPage, TPageParam, TSelectedPage, TRow, TError> &
		([NoInfer<TPage>] extends [NoInfer<TSelectedPage>] ? unknown : { options: { select: (data: never) => unknown } }),
) {
	return {
		query: (params: GridInfiniteParams) => {
			const args = config.prepareArgs(params)
			const options = infiniteQueryOptions<
				TPage,
				TError,
				InfiniteData<TSelectedPage, TPageParam>,
				QueryKey,
				TPageParam
			>({
				...config.options,
				queryKey: [
					...config.key,
					'infinite',
					collectionCacheArgs(config.prepareKey ? config.prepareKey(args, params) : args),
				],
				initialPageParam: config.initialPageParam,
				getNextPageParam: config.getNextPageParam,
				// QueryFunctionContext uses unknown for its conditional page parameter.
				// The options above bind it to the same TPageParam as both page callbacks.
				queryFn: ({ pageParam, signal }) =>
					config.fetcher(config.preparePageArgs({ args, pageParam: pageParam as TPageParam }), { signal }),
			})
			return options as typeof options & ReadSelection<InfiniteData<TPage>, InfiniteData<TSelectedPage>>
		},
		getRows: config.getRows,
	}
}
