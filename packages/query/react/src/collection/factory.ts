import { createCollectionSource } from './source'

import type { ConfiguredOperations, ConfiguredQueries } from './contracts'
import type { InvalidationPolicy } from './invalidation'
import type {
	CollectionFetcher,
	CollectionRead,
	CollectionInfiniteRead,
	CollectionMutation,
	ListFetcher,
	InfiniteFetcher,
	MutationFetcher,
} from './types'
import type { DefaultError, InvalidateQueryFilters, QueryKey } from '@tanstack/react-query'

type Operation<V, A> = { prepareArgs: (input: V) => A }
type CanInherit<V, DV, DA, A> = [DV] extends [never]
	? false
	: [V] extends [DV]
		? [DA] extends [A]
			? true
			: false
		: false
type MutationOverride<V, DV, DA, A, D, E, O> =
	| (CanInherit<V, DV, DA, A> extends true ? (args: A) => Promise<D> : never)
	| (Omit<MutationFetcher<V, A, D, E, O>, 'prepareArgs'> &
			(CanInherit<V, DV, DA, A> extends true
				? { prepareArgs?: (input: V) => NoInfer<A> }
				: { prepareArgs: (input: V) => NoInfer<A> }))
type Presence = {
	getAll?: unknown
	getInfinite?: unknown
	create?: unknown
	update?: unknown
	delete?: unknown
	deleteMany?: unknown
}

/** Define an API convention once; operation options replace rather than merge defaults. */
export function createCollectionSourceFactory<
	const Defaults extends { list?: unknown; infinite?: unknown; mutations?: unknown },
	P,
	A,
	D,
	I,
	IP = never,
	IA = unknown,
	B = unknown,
	ID = unknown,
	II = I,
	C = unknown,
	CreateV = never,
	CreateA = never,
	UpdateV = never,
	UpdateA = never,
	DeleteV = never,
	DeleteA = never,
	DeleteManyV = never,
	DeleteManyA = never,
>(
	defaults: Defaults & {
		list?: Omit<ListFetcher<P, A, D, D, I, DefaultError>, 'fetcher' | 'prepareArgs'> & { prepareArgs: (params: P) => A }
		infinite?: Omit<InfiniteFetcher<IP, IA, B, ID, ID, II, C, DefaultError>, 'fetcher' | 'preparePageArgs'> & {
			preparePageArgs: (context: { args: B; pageParam: C }) => IA
		}
		mutations?: {
			create?: Operation<CreateV, CreateA>
			update?: Operation<UpdateV, UpdateA>
			delete?: Operation<DeleteV, DeleteA>
			deleteMany?: Operation<DeleteManyV, DeleteManyA>
		}
	},
) {
	return function makeSource<
		const Enabled extends Presence,
		ListParams = void,
		ListArgs = unknown,
		ListData = unknown,
		ListItem = unknown,
		InfiniteParams = void,
		InfiniteArgs = unknown,
		InfiniteCriteria = unknown,
		InfiniteData = unknown,
		InfiniteItem = unknown,
		Cursor = unknown,
		CreateInput = CreateV,
		CreateArgs = CreateA,
		CreateD = unknown,
		CreateE = DefaultError,
		CreateO = unknown,
		UpdateInput = UpdateV,
		UpdateArgs = UpdateA,
		UpdateD = unknown,
		UpdateE = DefaultError,
		UpdateO = unknown,
		DeleteInput = DeleteV,
		DeleteArgs = DeleteA,
		DeleteD = unknown,
		DeleteE = DefaultError,
		DeleteO = unknown,
		DeleteManyInput = DeleteManyV,
		DeleteManyArgs = DeleteManyA,
		DeleteManyD = unknown,
		DeleteManyE = DefaultError,
		DeleteManyO = unknown,
	>(
		config: Enabled & {
			key: QueryKey
			invalidate?: InvalidationPolicy
			getAll?: Defaults extends { list: unknown }
				? | CollectionFetcher<A, D>
					| ({ fetcher: CollectionFetcher<A, D> } & Partial<
							Omit<ListFetcher<P, A, D, D, I, DefaultError>, 'fetcher' | 'prepareArgs'> & {
								prepareArgs: (params: P) => A
							}
					  >)
				: ListFetcher<ListParams, ListArgs, ListData, ListData, ListItem, DefaultError>
			getInfinite?: Defaults extends { infinite: unknown }
				? | CollectionFetcher<IA, ID>
					| ({ fetcher: CollectionFetcher<IA, ID> } & Partial<
							Omit<InfiniteFetcher<IP, IA, B, ID, ID, II, C, DefaultError>, 'fetcher' | 'preparePageArgs'> & {
								preparePageArgs: (context: { args: B; pageParam: C }) => IA
							}
					  >)
				: InfiniteFetcher<
						InfiniteParams,
						InfiniteArgs,
						InfiniteCriteria,
						InfiniteData,
						InfiniteData,
						InfiniteItem,
						Cursor,
						DefaultError
					>
			create?: MutationOverride<CreateInput, CreateV, CreateA, CreateArgs, CreateD, CreateE, CreateO>
			update?: MutationOverride<UpdateInput, UpdateV, UpdateA, UpdateArgs, UpdateD, UpdateE, UpdateO>
			delete?: MutationOverride<DeleteInput, DeleteV, DeleteA, DeleteArgs, DeleteD, DeleteE, DeleteO>
			deleteMany?: MutationOverride<
				DeleteManyInput,
				DeleteManyV,
				DeleteManyA,
				DeleteManyArgs,
				DeleteManyD,
				DeleteManyE,
				DeleteManyO
			>
		} & ({ getAll: unknown } | { getInfinite: unknown }),
	) {
		function mergeOperation(value: unknown, fallback: unknown) {
			if (value === undefined) return undefined
			const operation = (typeof value === 'function' ? { fetcher: value } : value) as Record<string, unknown>
			return { ...(fallback as Record<string, unknown> | undefined), ...operation }
		}
		const getAll = mergeOperation(config.getAll, defaults.list)
		const getInfinite = mergeOperation(config.getInfinite, defaults.infinite)
		if (getAll && (typeof getAll.prepareArgs !== 'function' || typeof getAll.getItems !== 'function'))
			throw new Error('List convention requires prepareArgs and getItems')
		if (
			getInfinite &&
			(typeof getInfinite.prepareArgs !== 'function' ||
				typeof getInfinite.preparePageArgs !== 'function' ||
				typeof getInfinite.getItems !== 'function' ||
				typeof getInfinite.getNextPageParam !== 'function' ||
				!('initialPageParam' in getInfinite))
		)
			throw new Error('Infinite convention is incomplete')
		function prepare(value: unknown, fallback: unknown) {
			const result = mergeOperation(value, fallback)
			if (!result) return undefined
			if (typeof result.prepareArgs !== 'function') throw new Error('Mutation convention requires prepareArgs')
			return result
		}

		const combined = {
			...config,
			getAll,
			getInfinite,
			create: prepare(config.create, defaults.mutations?.create),
			update: prepare(config.update, defaults.mutations?.update),
			delete: prepare(config.delete, defaults.mutations?.delete),
			deleteMany: prepare(config.deleteMany, defaults.mutations?.deleteMany),
		}
		// Runtime checks above establish the optional shared defaults. The public signature
		// preserves the convention's input types and the supplied operation capabilities.
		const source = createCollectionSource(combined as unknown as Parameters<typeof createCollectionSource>[0])
		type Operations = {
			getAll: Defaults extends { list: unknown }
				? CollectionRead<P, D, D, I>
				: CollectionRead<ListParams, ListData, ListData, ListItem>
			getInfinite: Defaults extends { infinite: unknown }
				? CollectionInfiniteRead<IP, ID, ID, II, C>
				: CollectionInfiniteRead<InfiniteParams, InfiniteData, InfiniteData, InfiniteItem, Cursor>
			create: CollectionMutation<CreateInput, CreateD, CreateE, CreateO>
			update: CollectionMutation<UpdateInput, UpdateD, UpdateE, UpdateO>
			delete: CollectionMutation<DeleteInput, DeleteD, DeleteE, DeleteO>
			deleteMany: CollectionMutation<DeleteManyInput, DeleteManyD, DeleteManyE, DeleteManyO>
		}
		return source as unknown as ConfiguredOperations<Enabled, Operations> & {
			invalidation: readonly InvalidateQueryFilters[]
			queries: ConfiguredQueries<Enabled, Operations>
		}
	}
}
