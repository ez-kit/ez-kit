import type { GridCollectionParams } from '../data-grid-source'
import type { GridInfiniteParams, GridQueryParams } from '../types'
import type { CollectionInfiniteInput, CollectionPageInput, InvalidationPolicy } from '@ez-kit/query-react/collection'
import type { InvalidateQueryFilters, QueryKey, UseMutationOptions } from '@tanstack/react-query'

type Fixture = {
	getAll?: {
		query: (params: GridQueryParams) => { queryKey: QueryKey }
		getRows: (value: never) => readonly object[]
		getRowCount?: (value: never) => number | undefined
	}
	getInfinite?: {
		query: (params: GridInfiniteParams) => { queryKey: QueryKey }
		getRows: (value: never) => readonly object[]
	}
	invalidation?: readonly InvalidateQueryFilters[]
	transformError?: (error: unknown) => unknown
}
const operations = ['create', 'update', 'delete', 'deleteMany'] as const
type Reads<S extends Fixture> = {
	[
		K in keyof S as [NonNullable<S[K]>] extends [never]
			? never
			: K extends 'getAll'
				? 'pages'
				: K extends 'getInfinite'
					? 'infinite'
					: never
	]: NonNullable<S[K]> extends { query: (...args: never[]) => infer Q; getRows: infer GetItems }
		? {
				query: (
					input: K extends 'getAll'
						? CollectionPageInput<GridCollectionParams>
						: CollectionInfiniteInput<GridCollectionParams>,
				) => Q
				getItems: GetItems
			}
		: never
}
type Unified<S extends Fixture> = { read: Reads<S>; invalidation: readonly InvalidateQueryFilters[] }
const fixtures = new WeakMap<object, unknown>()

/** Run existing connector regressions with their native keys and server responses. */
export function fixtureSource<S extends Fixture>(source: S): Unified<S> {
	const cached = fixtures.get(source)
	if (cached) return cached as Unified<S>
	const { getAll, getInfinite, invalidation, transformError } = source
	const migrated = {
		invalidation: invalidation ?? [],
		transformError,
		read: {
			...(getAll
				? {
						pages: {
							query: ({ params, pageIndex, pageSize }: CollectionPageInput<GridCollectionParams>) =>
								getAll.query({ ...params, pagination: { pageIndex, pageSize } }),
							getItems: getAll.getRows,
							getTotal: getAll.getRowCount,
						},
					}
				: {}),
			...(getInfinite
				? {
						infinite: {
							query: ({ params, pageSize }: CollectionInfiniteInput<GridCollectionParams>) =>
								getInfinite.query({ ...params, pageSize }),
							getItems: getInfinite.getRows,
						},
					}
				: {}),
		},
	}
	const input = source as Fixture &
		Partial<
			Record<
				(typeof operations)[number],
				{
					mutation: UseMutationOptions<unknown, unknown, unknown> & {
						mutationFn: NonNullable<UseMutationOptions<unknown, unknown, unknown>['mutationFn']>
					}
					prepareArgs: (input: unknown) => unknown
					invalidate?: InvalidationPolicy
					transformError?: (error: unknown) => unknown
				}
			>
		>
	for (const name of operations) {
		const operation = input[name]
		if (!operation) continue
		Object.assign(migrated, {
			[name]: {
				...operation,
				mutation: {
					...operation.mutation,
					mutationFn: (value: unknown, context: Parameters<typeof operation.mutation.mutationFn>[1]) =>
						operation.mutation.mutationFn(operation.prepareArgs(value), context),
				},
			},
		})
	}
	fixtures.set(source, migrated)
	return migrated as unknown as Unified<S>
}
