import { queryOptions } from '@tanstack/react-query'

import type { GridFetcher, GridQueryParams } from './types'
import type { DefaultError, QueryKey, UseQueryOptions } from '@tanstack/react-query'

/** Native options retain their keys and their selected result type. */
export type GridListSource<TResponse, TError, TSelected, TRow extends object, TKey extends QueryKey> = {
	query: (params: GridQueryParams) => UseQueryOptions<TResponse, TError, TSelected, TKey>
	getRows: (data: TSelected) => readonly TRow[]
	getRowCount?: (data: TSelected) => number | undefined
}

export type GridListFetcherOptions<TArgs, TResponse, TSelected, TRow extends object, TError> = {
	key: QueryKey
	fetcher: GridFetcher<TArgs, TResponse>
	prepareArgs: (params: GridQueryParams) => NoInfer<TArgs>
	getRows: (data: TSelected) => readonly TRow[]
	getRowCount?: (data: TSelected) => number | undefined
	options?: Omit<UseQueryOptions<TResponse, TError, TSelected>, 'queryKey' | 'queryFn'>
}

/** Normalize a fetcher while keeping its response in the native query cache. */
export function createListSource<TArgs, TResponse, TRow extends object, TSelected = TResponse, TError = DefaultError>(
	config: GridListFetcherOptions<TArgs, TResponse, TSelected, TRow, TError>,
) {
	return {
		query: (params: GridQueryParams) => {
			const args = config.prepareArgs(params)
			return queryOptions({
				...config.options,
				queryKey: [...config.key, 'list', args],
				queryFn: ({ signal }) => config.fetcher(args, { signal }),
			})
		},
		getRows: config.getRows,
		...(config.getRowCount === undefined ? {} : { getRowCount: config.getRowCount }),
	}
}
