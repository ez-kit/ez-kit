import { collectionCacheArgs } from './cache-args'
import { collectionInvalidation, resolveInvalidation } from './invalidation'

import type { ConfiguredOperations } from './contracts'
import type { InvalidationPolicy } from './invalidation'
import type {
	CollectionFetcher,
	CollectionInfiniteRead,
	CollectionMutation,
	CollectionRead,
	MutationFetcher,
} from './types'
import type {
	DefaultError,
	GetNextPageParamFunction,
	QueryKey,
	UseInfiniteQueryOptions,
	UseQueryOptions,
	InfiniteData,
} from '@tanstack/react-query'

export type CollectionPagination =
	{ mode: 'pages'; pageIndex: number; pageSize: number } | { mode: 'infinite'; pageSize: number }

export type CollectionPageInput<P> = { params: P } & Extract<CollectionPagination, { mode: 'pages' }>
export type CollectionInfiniteInput<P> = { params: P } & Extract<CollectionPagination, { mode: 'infinite' }>
export type CollectionReadInput<P, C = never> =
	CollectionPageInput<P> | ([C] extends [never] ? never : CollectionInfiniteInput<P> & { pageParam: C })

type KeyAndSelection = { queryKey?: never; queryFn?: never; select?: never }

type ReadOptions<D, I, E, C> = {
	getItems: (data: D) => readonly I[]
	getTotal?: (data: D) => number | undefined
	options?: Omit<UseQueryOptions<D, E>, keyof KeyAndSelection> & KeyAndSelection
	infinite?: {
		initialPageParam: C
		getNextPageParam: GetNextPageParamFunction<C, NoInfer<D>>
		options?: Omit<
			UseInfiniteQueryOptions<D, E, InfiniteData<D>, QueryKey, C>,
			keyof KeyAndSelection | 'initialPageParam' | 'getNextPageParam'
		> &
			KeyAndSelection & { initialPageParam?: never; getNextPageParam?: never }
	}
}

export type CollectionFetcherConfig<P, A, D, I, C, E = DefaultError> = ReadOptions<NoInfer<D>, I, E, C> & {
	fetcher: CollectionFetcher<A, D>
	pages?: never
	prepareArgs: (input: CollectionReadInput<P, NoInfer<C>>) => NoInfer<A>
	prepareKey?: (input: CollectionPageInput<NoInfer<P>> | CollectionInfiniteInput<NoInfer<P>>) => unknown
}
export type CollectionOperation<V, A, D, E, O> = (MutationFetcher<V, A, D, E, O> | CollectionMutation<V, D, E, O>) & {
	transformError?: (error: unknown) => unknown
}
export type MutationCapabilities = { create?: unknown; update?: unknown; delete?: unknown; deleteMany?: unknown }
export const mutationNames = ['create', 'update', 'delete', 'deleteMany'] as const

type Operation<V, D, E, O> = CollectionMutation<V, D, E, O> & { transformError?: (error: unknown) => unknown }

type NativeReads<P, D, S, I, E, K extends QueryKey, ID, IS, II, IE, IK extends QueryKey, C> = {
	pages?: CollectionRead<CollectionPageInput<P>, D, S, I, E, K>
	infinite?: CollectionInfiniteRead<CollectionInfiniteInput<P>, ID, IS, II, C, IE, IK>
}

type NativeConfig = { pages?: unknown; infinite?: unknown; fetcher?: never }
type ReadCapabilities = { infinite?: unknown }
type GeneratedReads<P, D, I, C, E, R> = {
	pages: CollectionRead<CollectionPageInput<P>, D, D, I, E>
} & ('infinite' extends keyof R
	? R extends { infinite: unknown }
		? { infinite: CollectionInfiniteRead<CollectionInfiniteInput<P>, D, D, I, C, E> }
		: { infinite?: CollectionInfiniteRead<CollectionInfiniteInput<P>, D, D, I, C, E> }
	: { infinite?: never })

export type CollectionSourceResult<M, R, Ops> = ConfiguredOperations<M, Ops> & {
	collection: R
	invalidation: ReturnType<typeof resolveInvalidation>
	transformError?: (error: unknown) => unknown
}

export type GeneratedCollectionSource<
	M,
	R,
	P,
	D,
	I,
	C,
	E,
	CV,
	CD,
	CE,
	CO,
	UV,
	UD,
	UE,
	UO,
	DV,
	DD,
	DE,
	DO,
	BV,
	BD,
	BE,
	BO,
> = CollectionSourceResult<
	M,
	GeneratedReads<P, D, I, C, E, R>,
	{
		create: Operation<CV, CD, CE, CO>
		update: Operation<UV, UD, UE, UO>
		delete: Operation<DV, DD, DE, DO>
		deleteMany: Operation<BV, BD, BE, BO>
	}
>

type SourceOperations<CV, CA, CD, CE, CO, UV, UA, UD, UE, UO, DV, DA, DD, DE, DO, BV, BA, BD, BE, BO> = {
	create?: CollectionOperation<CV, CA, CD, CE, CO>
	update?: CollectionOperation<UV, UA, UD, UE, UO>
	delete?: CollectionOperation<DV, DA, DD, DE, DO>
	deleteMany?: CollectionOperation<BV, BA, BD, BE, BO>
	invalidate?: InvalidationPolicy
	transformError?: (error: unknown) => unknown
}

type RuntimeOperation = CollectionOperation<unknown, unknown, unknown, unknown, unknown>
type RuntimeConfig = {
	key?: QueryKey
	invalidate?: InvalidationPolicy
	transformError?: (error: unknown) => unknown
	collection: CollectionFetcherConfig<unknown, unknown, unknown, unknown, unknown, unknown> | NativeConfig
} & Partial<Record<(typeof mutationNames)[number], RuntimeOperation>>

export function createCollectionSource<
	M extends MutationCapabilities,
	R extends ReadCapabilities,
	A,
	D,
	I,
	P = void,
	C = never,
	E = DefaultError,
	CV = void,
	CA = unknown,
	CD = unknown,
	CE = DefaultError,
	CO = unknown,
	UV = void,
	UA = unknown,
	UD = unknown,
	UE = DefaultError,
	UO = unknown,
	DV = void,
	DA = unknown,
	DD = unknown,
	DE = DefaultError,
	DO = unknown,
	BV = void,
	BA = unknown,
	BD = unknown,
	BE = DefaultError,
	BO = unknown,
>(
	config: M & {
		key: QueryKey
		collection: R & CollectionFetcherConfig<P, A, D, I, C, E>
	} & SourceOperations<CV, CA, CD, CE, CO, UV, UA, UD, UE, UO, DV, DA, DD, DE, DO, BV, BA, BD, BE, BO>,
): GeneratedCollectionSource<M, R, P, D, I, C, E, CV, CD, CE, CO, UV, UD, UE, UO, DV, DD, DE, DO, BV, BD, BE, BO>

export function createCollectionSource<
	M extends MutationCapabilities,
	const R extends NativeConfig,
	P = void,
	D = unknown,
	S = D,
	I = unknown,
	E = DefaultError,
	K extends QueryKey = QueryKey,
	ID = unknown,
	IS = ID,
	II = I,
	IE = DefaultError,
	IK extends QueryKey = QueryKey,
	C = unknown,
	CV = void,
	CA = unknown,
	CD = unknown,
	CE = DefaultError,
	CO = unknown,
	UV = void,
	UA = unknown,
	UD = unknown,
	UE = DefaultError,
	UO = unknown,
	DV = void,
	DA = unknown,
	DD = unknown,
	DE = DefaultError,
	DO = unknown,
	BV = void,
	BA = unknown,
	BD = unknown,
	BE = DefaultError,
	BO = unknown,
>(
	config: M & {
		key?: QueryKey
		invalidate: InvalidationPolicy
		collection: R & NativeReads<P, D, S, I, E, K, ID, IS, II, IE, IK, C> & ({ pages: unknown } | { infinite: unknown })
	} & SourceOperations<CV, CA, CD, CE, CO, UV, UA, UD, UE, UO, DV, DA, DD, DE, DO, BV, BA, BD, BE, BO> &
		([Extract<M[keyof M], { fetcher: unknown }>] extends [never] ? unknown : { key: QueryKey }),
): CollectionSourceResult<
	M,
	ConfiguredOperations<R, Required<NativeReads<P, D, S, I, E, K, ID, IS, II, IE, IK, C>>>,
	{
		create: Operation<CV, CD, CE, CO>
		update: Operation<UV, UD, UE, UO>
		delete: Operation<DV, DD, DE, DO>
		deleteMany: Operation<BV, BD, BE, BO>
	}
>

export function createCollectionSource(config: unknown): unknown {
	return normalizeCollectionSource(config as RuntimeConfig)
}

export function normalizeCollectionSource(config: RuntimeConfig): unknown {
	const { key, collection, invalidate, transformError, ...operations } = config
	const generated = typeof collection.fetcher === 'function'
	if (generated && key === undefined) throw new Error('Fetcher sources require a collection key')
	if (!generated && invalidate === undefined) throw new Error('Native sources require an explicit invalidation policy')

	const normalized = {
		collection: generated ? normalizeRead(collection, key ?? []) : collection,
		invalidation: resolveInvalidation(generated ? collectionInvalidation(key ?? []) : [], invalidate),
		...(transformError === undefined ? {} : { transformError }),
	}
	for (const name of mutationNames) {
		const operation = operations[name]
		if (!operation) continue
		if ('mutation' in operation) Object.assign(normalized, { [name]: operation })
		else {
			if (key === undefined) throw new Error('Fetcher mutations require a collection key')
			Object.assign(normalized, {
				[name]: {
					mutation: {
						mutationKey: [...key, name],
						...operation.options,
						mutationFn: (input: unknown) => operation.fetcher(operation.prepareArgs(input)),
					},
					invalidate: operation.invalidate,
					transformError: operation.transformError,
				},
			})
		}
	}
	return normalized
}

function normalizeRead(
	read: CollectionFetcherConfig<unknown, unknown, unknown, unknown, unknown, unknown>,
	key: QueryKey,
) {
	const { infinite, getItems, getTotal } = read
	const keyPart = (input: CollectionPageInput<unknown> | CollectionInfiniteInput<unknown>) => {
		if (read.prepareKey) return collectionCacheArgs(read.prepareKey(input))
		const { params, pageSize } = input
		return collectionCacheArgs(
			input.mode === 'pages' ? { params, pageSize, pageIndex: input.pageIndex } : { params, pageSize },
		)
	}
	const pages = {
		query: (input: CollectionPageInput<unknown>) => ({
			...read.options,
			queryKey: [...key, 'pages', keyPart(input)],
			queryFn: ({ signal }: { signal: AbortSignal }) => read.fetcher(read.prepareArgs(input), { signal }),
		}),
		getItems,
		...(getTotal === undefined ? {} : { getTotal }),
	}
	return {
		pages,
		...(infinite
			? {
					infinite: {
						query: (input: CollectionInfiniteInput<unknown>) => ({
							...infinite.options,
							initialPageParam: infinite.initialPageParam,
							getNextPageParam: infinite.getNextPageParam,
							queryKey: [...key, 'infinite', keyPart(input)],
							queryFn: ({ signal, pageParam }: { signal: AbortSignal; pageParam: unknown }) =>
								read.fetcher(read.prepareArgs({ ...input, pageParam }), { signal }),
						}),
						getItems,
					},
				}
			: {}),
	}
}
