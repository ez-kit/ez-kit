import { collectionCacheArgs } from '@ez-kit/query-react/collection'
import { queryOptions } from '@tanstack/react-query'

import type { GridFetcher, GridQueryParams } from './types'
import type { ReadSelection } from '@ez-kit/query-react/collection'
import type { DefaultError, QueryKey, UseQueryOptions } from '@tanstack/react-query'

/** Native options retain their keys and their selected result type. */
export type GridListSource<TResponse, TError, TSelected, TRow extends object, TKey extends QueryKey> = {
	query: (
		params: GridQueryParams,
	) => UseQueryOptions<TResponse, TError, TSelected, TKey> & ReadSelection<TResponse, TSelected>
	getRows: (data: NoInfer<TSelected>) => readonly TRow[]
	getRowCount?: (data: NoInfer<TSelected>) => number | undefined
}

export type GridListFetcherOptions<TArgs, TResponse, TSelected, TRow extends object, TError> = {
	key: QueryKey
	fetcher: GridFetcher<TArgs, TResponse>
	prepareArgs: (params: GridQueryParams) => NoInfer<TArgs>
	prepareKey?: (args: NoInfer<TArgs>, params: GridQueryParams) => unknown
	getRows: (data: TSelected) => readonly TRow[]
	getRowCount?: (data: NoInfer<TSelected>) => number | undefined
	options?: Omit<UseQueryOptions<TResponse, TError, TSelected>, 'queryKey' | 'queryFn'>
}

/** Normalize a fetcher while keeping its response in the native query cache. */
export function createListSource<TArgs, TResponse, TRow extends object, TSelected = TResponse, TError = DefaultError>(
	config: GridListFetcherOptions<TArgs, TResponse, TSelected, TRow, TError> &
		([NoInfer<TResponse>] extends [NoInfer<TSelected>] ? unknown : { options: { select: (data: never) => unknown } }),
) {
	return {
		query: (params: GridQueryParams) => {
			const args = config.prepareArgs(params)
			const options = queryOptions({
				...config.options,
				queryKey: [
					...config.key,
					'list',
					collectionCacheArgs(config.prepareKey ? config.prepareKey(args, params) : args),
				],
				queryFn: ({ signal }) => config.fetcher(args, { signal }),
			})
			return options as typeof options & ReadSelection<TResponse, TSelected>
		},
		getRows: config.getRows,
		...(config.getRowCount === undefined ? {} : { getRowCount: config.getRowCount }),
	}
}
