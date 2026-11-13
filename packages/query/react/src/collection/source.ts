import { listInvalidation, resolveInvalidation } from './invalidation'

import type { InvalidationPolicy } from './invalidation'
import type {
	CollectionRead,
	CollectionInfiniteRead,
	CollectionMutation,
	ListFetcher,
	InfiniteFetcher,
	MutationFetcher,
} from './types'
import type { DefaultError, QueryKey } from '@tanstack/react-query'

function list<P, A, D, S, I, E, K extends QueryKey>(
	value: ListFetcher<P, A, D, S, I, E> | CollectionRead<P, D, S, I, E, K>,
	key: QueryKey,
): CollectionRead<P, D, S, I, E, K> {
	if ('query' in value) return value
	const generated: CollectionRead<P, D, S, I, E> = {
		query: (params) => {
			const args = value.prepareArgs(params)
			return {
				...value.options,
				queryKey: [...key, 'list', args],
				queryFn: ({ signal }) => value.fetcher(args, { signal }),
			}
		},
		getItems: value.getItems,
		...(value.getTotal === undefined ? {} : { getTotal: value.getTotal }),
	}
	return generated as unknown as CollectionRead<P, D, S, I, E, K>
}

function infinite<P, A, B, D, S, I, C, E, IK extends QueryKey>(
	value: InfiniteFetcher<P, A, B, D, S, I, C, E> | CollectionInfiniteRead<P, D, S, I, C, E, IK>,
	key: QueryKey,
): CollectionInfiniteRead<P, D, S, I, C, E, IK> {
	if ('query' in value) return value
	const generated: CollectionInfiniteRead<P, D, S, I, C, E> = {
		query: (params) => {
			const args = value.prepareArgs(params)
			return {
				...value.options,
				queryKey: [...key, 'infinite', args],
				initialPageParam: value.initialPageParam,
				getNextPageParam: value.getNextPageParam,
				queryFn: ({ signal, pageParam }) =>
					value.fetcher(value.preparePageArgs({ args, pageParam: pageParam as C }), { signal }),
			}
		},
		getItems: value.getItems,
	}
	return generated as unknown as CollectionInfiniteRead<P, D, S, I, C, E, IK>
}

function mutation<V, A, D, E, O>(
	value: MutationFetcher<V, A, D, E, O> | CollectionMutation<V, D, E, O>,
	key: QueryKey,
	name: string,
): CollectionMutation<V, D, E, O> {
	if ('mutation' in value) return value
	return {
		mutation: {
			mutationKey: [...key, name],
			...value.options,
			mutationFn: (input) => value.fetcher(value.prepareArgs(input)),
		},
		...(value.invalidate === undefined ? {} : { invalidate: value.invalidate }),
	}
}
type SourceCapabilities = {
	getAll?: unknown
	getInfinite?: unknown
	create?: unknown
	update?: unknown
	delete?: unknown
	deleteMany?: unknown
}

export function createCollectionSource<
	Enabled extends SourceCapabilities,
	P = void,
	A = unknown,
	D = unknown,
	I = unknown,
	S = D,
	E = DefaultError,
	K extends QueryKey = QueryKey,
	IP = void,
	IA = unknown,
	B = unknown,
	ID = unknown,
	IS = ID,
	II = I,
	C = unknown,
	IE = DefaultError,
	IK extends QueryKey = QueryKey,
	CreateV = void,
	CreateA = unknown,
	CreateD = unknown,
	CreateE = DefaultError,
	CreateO = unknown,
	UpdateV = void,
	UpdateA = unknown,
	UpdateD = unknown,
	UpdateE = DefaultError,
	UpdateO = unknown,
	DeleteV = void,
	DeleteA = unknown,
	DeleteD = unknown,
	DeleteE = DefaultError,
	DeleteO = unknown,
	DeleteManyV = void,
	DeleteManyA = unknown,
	DeleteManyD = unknown,
	DeleteManyE = DefaultError,
	DeleteManyO = unknown,
>(
	config: Enabled & {
		key?: QueryKey
		invalidate?: InvalidationPolicy
		getAll?: ListFetcher<P, A, D, S, I, E> | CollectionRead<P, D, S, I, E, K>
		getInfinite?: InfiniteFetcher<IP, IA, B, ID, IS, II, C, IE> | CollectionInfiniteRead<IP, ID, IS, II, C, IE, IK>
		create?:
			| MutationFetcher<CreateV, CreateA, CreateD, CreateE, CreateO>
			| CollectionMutation<CreateV, CreateD, CreateE, CreateO>
		update?:
			| MutationFetcher<UpdateV, UpdateA, UpdateD, UpdateE, UpdateO>
			| CollectionMutation<UpdateV, UpdateD, UpdateE, UpdateO>
		delete?:
			| MutationFetcher<DeleteV, DeleteA, DeleteD, DeleteE, DeleteO>
			| CollectionMutation<DeleteV, DeleteD, DeleteE, DeleteO>
		deleteMany?:
			| MutationFetcher<DeleteManyV, DeleteManyA, DeleteManyD, DeleteManyE, DeleteManyO>
			| CollectionMutation<DeleteManyV, DeleteManyD, DeleteManyE, DeleteManyO>
	} & ({ getAll: unknown } | { getInfinite: unknown }),
) {
	const hasGenerated =
		(config.getAll !== undefined && !('query' in config.getAll)) ||
		(config.getInfinite !== undefined && !('query' in config.getInfinite))
	if (hasGenerated && !config.key) throw new Error('Fetcher sources require a collection key')
	const hasNative =
		(config.getAll !== undefined && 'query' in config.getAll) ||
		(config.getInfinite !== undefined && 'query' in config.getInfinite)
	if (hasNative && config.invalidate === undefined)
		throw new Error('Native sources require an explicit invalidation policy')
	const key = config.key ?? []
	const getAll = config.getAll ? list(config.getAll, key) : undefined
	const getInfinite = config.getInfinite ? infinite(config.getInfinite, key) : undefined
	const result = {
		...(getAll ? { getAll } : {}),
		...(getInfinite ? { getInfinite } : {}),
		invalidation: resolveInvalidation(hasGenerated ? listInvalidation(key) : [], config.invalidate),
		queries: { ...(getAll ? { list: getAll.query } : {}), ...(getInfinite ? { infinite: getInfinite.query } : {}) },
		...(config.create ? { create: mutation(config.create, key, 'create') } : {}),
		...(config.update ? { update: mutation(config.update, key, 'update') } : {}),
		...(config.delete ? { delete: mutation(config.delete, key, 'delete') } : {}),
		...(config.deleteMany ? { deleteMany: mutation(config.deleteMany, key, 'deleteMany') } : {}),
	}
	type Operations = {
		getAll: CollectionRead<P, D, S, I, E, K>
		getInfinite: CollectionInfiniteRead<IP, ID, IS, II, C, IE, IK>
		create: CollectionMutation<CreateV, CreateD, CreateE, CreateO>
		update: CollectionMutation<UpdateV, UpdateD, UpdateE, UpdateO>
		delete: CollectionMutation<DeleteV, DeleteD, DeleteE, DeleteO>
		deleteMany: CollectionMutation<DeleteManyV, DeleteManyD, DeleteManyE, DeleteManyO>
	}
	return result as unknown as Pick<Operations, Extract<keyof Enabled, keyof Operations>> & {
		invalidation: typeof result.invalidation
		queries: ('getAll' extends keyof Enabled ? { list: Operations['getAll']['query'] } : Record<never, never>) &
			('getInfinite' extends keyof Enabled ? { infinite: Operations['getInfinite']['query'] } : Record<never, never>)
	}
}
