import type { CollectionFetcher } from '../types'
import type { InfiniteData, QueryKey, UseInfiniteQueryOptions, UseQueryOptions } from '@tanstack/react-query'

export type ListFetcher<P, A, D, S, I, E> = {
	prepareArgs: (params: P) => NoInfer<A>
	/** Prepare the cache key part separately from the fetcher input. */
	prepareKey?: (args: NoInfer<A>, params: P) => unknown
	fetcher: CollectionFetcher<A, D>
	getItems: (data: NoInfer<S>) => readonly I[]
	getTotal?: (data: NoInfer<S>) => number | undefined
	options?: Omit<UseQueryOptions<D, E, S>, 'queryKey' | 'queryFn'>
}
export type InfiniteFetcher<P, A, B, D, S, I, C, E> = {
	prepareArgs: (params: P) => B
	prepareKey?: (args: NoInfer<B>, params: P) => unknown
	preparePageArgs: (context: { args: B; pageParam: C }) => NoInfer<A>
	fetcher: CollectionFetcher<A, D>
	initialPageParam: C
	getNextPageParam: (lastPage: D, allPages: D[], lastPageParam: C, allPageParams: C[]) => C | null | undefined
	getItems: (page: NoInfer<S>) => readonly I[]
	options?: Omit<
		UseInfiniteQueryOptions<D, E, InfiniteData<S>, QueryKey, C>,
		'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
	>
}
