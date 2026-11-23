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
/** @internal Shape-changing reads need a selector in every branch. */
export type ReadSelection<Raw, Selected> = [Raw] extends [Selected] ? unknown : { select: (data: Raw) => Selected }

export type CollectionRead<P, D, S, I, E = DefaultError, K extends QueryKey = QueryKey> = {
	query: (params: P) => UseQueryOptions<D, E, S, K> & ReadSelection<D, S>
	getItems: (data: NoInfer<S>) => readonly I[]
	getTotal?: (data: NoInfer<S>) => number | undefined
}
export type CollectionInfiniteRead<P, D, S, I, C, E = DefaultError, K extends QueryKey = QueryKey> = {
	query: (
		params: P,
	) => UseInfiniteQueryOptions<D, E, InfiniteData<S>, K, C> & ReadSelection<InfiniteData<D>, InfiniteData<S>>
	getItems: (page: NoInfer<S>) => readonly I[]
}
export type CollectionMutation<V, D, E = DefaultError, O = unknown> = {
	mutation: UseMutationOptions<D, E, V, O>
	invalidate?: InvalidationPolicy
}
export type MutationFetcher<V, A, D, E, O> = {
	prepareArgs: (input: V) => NoInfer<A>
	fetcher: (args: A) => Promise<D>
	options?: Omit<UseMutationOptions<D, E, V, O>, 'mutationFn'>
	invalidate?: InvalidationPolicy
}
