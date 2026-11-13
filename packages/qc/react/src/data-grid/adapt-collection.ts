import type { GridMutationSource } from './mutation-source'
import type {
	GridQueryParams,
	GridInfiniteParams,
	GridCreateContext,
	GridUpdateContext,
	GridDeleteContext,
	GridDeleteManyContext,
} from './types'
import type { GridDataSource } from './with-query'
import type { CollectionShape, CollectionParams, CollectionMutation } from '@ez-kit/query-react/collection'

type Item<S> = S extends { getAll: { getItems: (value: never) => readonly (infer I extends object)[] } }
	? I
	: S extends { getInfinite: { getItems: (value: never) => readonly (infer I extends object)[] } }
		? I
		: never
type Contexts<I extends object> = {
	create: GridCreateContext<I>
	update: GridUpdateContext<I>
	delete: GridDeleteContext<I>
	deleteMany: GridDeleteManyContext<I>
}
type Input<S, K extends keyof S> = S[K] extends CollectionMutation<infer V, infer _D, infer _E, infer _O> ? V : never
type Operations<S> = Extract<keyof S, keyof Contexts<object>>
type RequiredMappings<S> = {
	[K in Operations<S> as Contexts<Item<S>>[K] extends Input<S, K> ? never : K]: (
		context: Contexts<Item<S>>[K],
	) => Input<S, K>
}
type OptionalMappings<S> = {
	[K in Operations<S> as Contexts<Item<S>>[K] extends Input<S, K> ? K : never]?: (
		context: Contexts<Item<S>>[K],
	) => Input<S, K>
}
export type CollectionGridMapping<S> = ('getAll' extends keyof S
	? { params: (params: GridQueryParams) => CollectionParams<S, 'pages'> }
	: { params?: never }) &
	('getInfinite' extends keyof S
		? { infiniteParams: (params: GridInfiniteParams) => CollectionParams<S, 'infinite'> }
		: { infiniteParams?: never }) &
	RequiredMappings<S> &
	OptionalMappings<S> & { transformError?: (error: unknown) => unknown }
type AdaptedOperations<S> = {
	[K in Operations<S>]: S[K] extends CollectionMutation<infer V, infer D, infer E, infer O>
		? GridMutationSource<Contexts<Item<S>>[K], V, D, E, O>
		: never
}

/** Map table state and action contexts without changing collection cache identity. */
export function adaptCollectionToGrid<S extends CollectionShape>(
	source: S,
	mapping: CollectionGridMapping<S>,
): GridDataSource<Item<S>> & AdaptedOperations<S> & Pick<S, 'invalidation'> {
	const read = source as unknown as {
		getAll?: {
			query: (params: unknown) => unknown
			getItems: (data: never) => readonly Item<S>[]
			getTotal?: (data: never) => number | undefined
		}
		getInfinite?: { query: (params: unknown) => unknown; getItems: (data: never) => readonly Item<S>[] }
	}
	const map = mapping as {
		params?: (params: GridQueryParams) => unknown
		infiniteParams?: (params: GridInfiniteParams) => unknown
	} & Partial<Record<keyof Contexts<object>, (value: unknown) => unknown>> & {
			transformError?: (error: unknown) => unknown
		}
	const operations: Record<string, unknown> = {}
	for (const name of ['create', 'update', 'delete', 'deleteMany'] as const) {
		const operation = source[name]
		if (operation) operations[name] = { ...operation, prepareArgs: map[name] ?? ((value: unknown) => value) }
	}
	if (read.getAll && !map.params) throw new Error('Collection grid mapping requires params')
	if (read.getInfinite && !map.infiniteParams) throw new Error('Collection grid mapping requires infiniteParams')
	return {
		...operations,
		...(read.getAll
			? {
					getAll: {
						query: (params: GridQueryParams) => read.getAll?.query(map.params?.(params)),
						getRows: read.getAll.getItems,
						...(read.getAll.getTotal ? { getRowCount: read.getAll.getTotal } : {}),
					},
				}
			: {}),
		...(read.getInfinite
			? {
					getInfinite: {
						query: (params: GridInfiniteParams) => read.getInfinite?.query(map.infiniteParams?.(params)),
						getRows: read.getInfinite.getItems,
					},
				}
			: {}),
		invalidation: source.invalidation,
		...(map.transformError ? { transformError: map.transformError } : {}),
	} as GridDataSource<Item<S>> & AdaptedOperations<S> & Pick<S, 'invalidation'>
}
