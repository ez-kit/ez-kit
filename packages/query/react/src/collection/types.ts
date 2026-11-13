import type { InvalidationPolicy } from './invalidation'
import type {
	DefaultError,
	InfiniteData,
	QueryKey,
	UseQueryOptions,
	UseInfiniteQueryOptions,
	UseMutationOptions,
} from '@tanstack/react-query'

export type ReadTransport = { signal: AbortSignal }
export type CollectionFetcher<A, D> = (args: A, transport: ReadTransport) => Promise<D>
export type CollectionRead<P, D, S, I, E = DefaultError, K extends QueryKey = QueryKey> = {
	query: (params: P) => UseQueryOptions<D, E, S, K>
	getItems: (data: S) => readonly I[]
	getTotal?: (data: S) => number | undefined
}
export type CollectionInfiniteRead<P, D, S, I, C, E = DefaultError, K extends QueryKey = QueryKey> = {
	query: (params: P) => UseInfiniteQueryOptions<D, E, InfiniteData<S>, K, C>
	getItems: (page: S) => readonly I[]
}
export type CollectionMutation<V, D, E = DefaultError, O = unknown> = {
	mutation: UseMutationOptions<D, E, V, O>
	invalidate?: InvalidationPolicy
}
export type ListFetcher<P, A, D, S, I, E> = {
	prepareArgs: (params: P) => NoInfer<A>
	fetcher: CollectionFetcher<A, D>
	getItems: (data: S) => readonly I[]
	getTotal?: (data: S) => number | undefined
	options?: Omit<UseQueryOptions<D, E, S>, 'queryKey' | 'queryFn'>
}
export type InfiniteFetcher<P, A, B, D, S, I, C, E> = {
	prepareArgs: (params: P) => B
	preparePageArgs: (context: { args: B; pageParam: C }) => NoInfer<A>
	fetcher: CollectionFetcher<A, D>
	initialPageParam: C
	getNextPageParam: (lastPage: D, allPages: D[], lastPageParam: C, allPageParams: C[]) => C | null | undefined
	getItems: (page: S) => readonly I[]
	options?: Omit<
		UseInfiniteQueryOptions<D, E, InfiniteData<S>, QueryKey, C>,
		'queryKey' | 'queryFn' | 'initialPageParam' | 'getNextPageParam'
	>
}
export type MutationFetcher<V, A, D, E, O> = {
	prepareArgs: (input: V) => NoInfer<A>
	fetcher: (args: A) => Promise<D>
	options?: Omit<UseMutationOptions<D, E, V, O>, 'mutationFn'>
	invalidate?: InvalidationPolicy
}
