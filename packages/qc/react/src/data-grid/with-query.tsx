import { useDataGridSelector } from '@ez-kit/data-grid-react'
import { useCollectionQuery } from '@ez-kit/query-react/collection'
import { hashKey, replaceEqualDeep } from '@tanstack/react-query'
import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { GridMutationSource } from './mutation-source'
import type {
	GridCreateContext,
	GridUpdateContext,
	GridDeleteContext,
	GridDeleteManyContext,
	GridInfiniteParams,
	GridQueryParams,
} from './types'
import type {
	BoundUseDataGridConfig,
	CreatingConfig,
	EditingConfig,
	DeletingConfig,
	BulkDeletingConfig,
	DataGridConfigTransform,
	CellTypeRegistry,
	ColumnConfigShape,
	DataGridBundle,
	DataGridControlledProps,
	DataGridSharedProps,
	DataGridStatics,
	DataTable,
	GridContextRecord,
	GridFeatures,
	LoadingState,
	TableFeatures,
	UncheckedColumnConfig,
	UseDataGridConfig,
} from '@ez-kit/data-grid-react'
import type {
	InfiniteData,
	InvalidateQueryFilters,
	UseInfiniteQueryOptions,
	UseQueryOptions,
	UseQueryResult,
	UseInfiniteQueryResult,
} from '@tanstack/react-query'
import type { ReactElement } from 'react'

/** Sources retain their concrete options types; the connection only needs their row contract. */
export type GridDataSource<TRow extends object> = {
	getAll?: {
		query: (params: GridQueryParams) => unknown
		getRows: (data: never) => readonly TRow[]
		getRowCount?: (data: never) => number | undefined
	}
	getInfinite?: {
		query: (params: GridInfiniteParams) => unknown
		getRows: (data: never) => readonly TRow[]
	}
}

type Context<C extends object | undefined> = C extends object ? Partial<C> : GridContextRecord
type Features<F extends TableFeatures | undefined> = F extends TableFeatures ? F : TableFeatures
type Extra = Record<never, never>
export type QueryGridConfig<
	F extends TableFeatures,
	R extends object,
	C extends CellTypeRegistry,
	ContextType extends object,
	ColumnConfig extends ColumnConfigShape,
	E extends CellTypeRegistry = Extra,
> = Omit<
	BoundUseDataGridConfig<F, NoInfer<R>, ContextType, C, E, ColumnConfig>,
	'data' | 'creating' | 'editing' | 'deleting'
> & {
	creating?:
		boolean | (Omit<CreatingConfig<NoInfer<R>>, 'onSave'> & Partial<Pick<CreatingConfig<NoInfer<R>>, 'onSave'>>)
	editing?: boolean | (Omit<EditingConfig<NoInfer<R>>, 'onSave'> & Partial<Pick<EditingConfig<NoInfer<R>>, 'onSave'>>)
	deleting?:
		| boolean
		| (Omit<DeletingConfig<NoInfer<R>>, 'onDelete' | 'bulk'> &
				Partial<Pick<DeletingConfig<NoInfer<R>>, 'onDelete'>> & {
					bulk?:
						| boolean
						| (Omit<BulkDeletingConfig<NoInfer<R>>, 'onDelete'> &
								Partial<Pick<BulkDeletingConfig<NoInfer<R>>, 'onDelete'>>)
				})
	dataSource: GridDataSource<R>
	data?: never
}

type ConnectionBundle<
	C extends CellTypeRegistry,
	F extends TableFeatures | undefined,
	X extends object | undefined,
	CC extends ColumnConfigShape,
> = Omit<DataGridBundle<C, F, X, CC>, 'DataGrid' | 'useDataGrid'> & {
	useDataGrid: <R extends object, CF extends TableFeatures = Features<F>, E extends CellTypeRegistry = Extra>(
		config: QueryGridConfig<CF, R, C, Context<X>, CC, E> & (F extends TableFeatures ? unknown : { features: CF }),
	) => DataTable<CF, R>
	DataGrid: (<R extends object, CF extends TableFeatures = Features<F>, E extends CellTypeRegistry = Extra>(
		props:
			| (DataGridControlledProps<CF, R> & { dataSource?: never })
			| (DataGridSharedProps &
					QueryGridConfig<CF, R, C, Context<X>, CC, E> &
					(F extends TableFeatures ? unknown : { features: CF }) & { table?: never }),
	) => ReactElement) &
		DataGridStatics
}

type RuntimeSource<R extends object> = {
	create?: GridMutationSource<GridCreateContext<R>, unknown, unknown, unknown>
	update?: GridMutationSource<GridUpdateContext<R>, unknown, unknown, unknown>
	delete?: GridMutationSource<GridDeleteContext<R>, unknown, unknown, unknown>
	deleteMany?: GridMutationSource<GridDeleteManyContext<R>, unknown, unknown, unknown>
	invalidation?: readonly InvalidateQueryFilters[]
	transformError?: (error: unknown) => unknown
	getAll?: {
		query: (params: GridQueryParams) => UseQueryOptions<unknown, unknown>
		getRows: (data: unknown) => readonly R[]
		getRowCount?: (data: unknown) => number | undefined
	}
	getInfinite?: {
		query: (params: GridInfiniteParams) => UseInfiniteQueryOptions<unknown, unknown, InfiniteData<unknown>>
		getRows: (page: unknown) => readonly R[]
	}
}
type Projection<R> = { data: R[]; loading: LoadingState; rowCount: number | undefined; hasNextPage: boolean }
const useCommitEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect
const EMPTY: never[] = []
function enabled(value: unknown): boolean {
	return (
		value !== undefined &&
		value !== false &&
		!(typeof value === 'object' && value !== null && 'enabled' in value && value.enabled === false)
	)
}
function sameProjection<R>(a: Projection<R>, b: Projection<R>) {
	return (
		a.data === b.data &&
		a.rowCount === b.rowCount &&
		a.hasNextPage === b.hasNextPage &&
		a.loading.isPending === b.loading.isPending &&
		a.loading.isFetching === b.loading.isFetching &&
		a.loading.isError === b.loading.isError &&
		a.loading.error === b.loading.error
	)
}

/** Add Query to an existing bundle; helpers and the compound namespace keep their identity. */
export function withQuery<
	C extends CellTypeRegistry,
	F extends TableFeatures | undefined = undefined,
	X extends object | undefined = undefined,
	CC extends ColumnConfigShape = UncheckedColumnConfig,
>(bundle: DataGridBundle<C, F, X, CC>): ConnectionBundle<C, F, X, CC> {
	// The public signature retains the bundle's feature/registry/context constraints. At
	// runtime the existing bound hook is called unchanged, so its defaults still apply.
	const useBoundGrid = bundle.useDataGrid as unknown as (
		config: UseDataGridConfig<GridFeatures, object>,
		transform?: DataGridConfigTransform<GridFeatures, object>,
	) => DataTable<GridFeatures, object>
	const BaseGrid = bundle.DataGrid as unknown as (props: DataGridControlledProps<GridFeatures, object>) => ReactElement
	function useConnectedGrid(
		config: Omit<UseDataGridConfig<GridFeatures, object>, 'data'> & { dataSource: GridDataSource<object> },
	) {
		const { dataSource, ...gridConfig } = config
		// Query options and their projections cross this boundary together. Their response
		// type is opaque to the connector; only the projection consumes the selected value.
		const source = dataSource as unknown as RuntimeSource<object>
		const mutations = useRef<Record<string, { mutateAsync: (input: unknown) => Promise<unknown> }>>({})
		function action(name: 'create' | 'update' | 'delete' | 'deleteMany') {
			return {
				execute: async (input: never) => {
					const operation = source[name]
					if (!operation) throw new Error(`Missing grid ${name} executor`)
					try {
						const mutation = mutations.current[name]
						if (!mutation) throw new Error(`Missing grid ${name} mutation`)
						await mutation.mutateAsync(operation.prepareArgs(input))
					} catch (error) {
						throw (operation.transformError ?? source.transformError)?.(error) ?? error
					}
				},
			}
		}
		const create = action('create') as { execute: (input: GridCreateContext<object>) => Promise<void> }
		const update = action('update') as { execute: (input: GridUpdateContext<object>) => Promise<void> }
		const remove = action('delete') as { execute: (input: GridDeleteContext<object>) => Promise<void> }
		const removeMany = action('deleteMany') as { execute: (input: GridDeleteManyContext<object>) => Promise<void> }

		const [projection, setProjection] = useState<Projection<object>>({
			data: EMPTY,
			rowCount: undefined,
			hasNextPage: false,
			loading: { isPending: true, isFetching: false, isError: false, error: null },
		})
		const nextPageRequest = useRef<Promise<void> | null>(null)
		const nextPageRef = useRef<() => Promise<void>>(async () => {})
		const loadMore = useMemo(() => () => nextPageRef.current(), [])
		let draft = false
		const table = useBoundGrid({ ...gridConfig, data: projection.data }, (merged) => {
			const {
				rowCount: _rowCount,
				pageCount: _pageCount,
				...pagination
			} = typeof merged.pagination === 'object' ? merged.pagination : {}
			draft = enabled(merged.draft)
			const creating: Partial<CreatingConfig<object>> = typeof merged.creating === 'object' ? merged.creating : {}
			const editing: Partial<EditingConfig<object>> = typeof merged.editing === 'object' ? merged.editing : {}
			const deleting: Partial<DeletingConfig<object>> = typeof merged.deleting === 'object' ? merged.deleting : {}
			const bulk: Partial<BulkDeletingConfig<object>> = typeof deleting.bulk === 'object' ? deleting.bulk : {}
			if (enabled(merged.creating) && !creating.onSave && !source.create)
				throw new Error('creating requires dataSource.create or creating.onSave')
			if (enabled(merged.editing) && !editing.onSave && !source.update)
				throw new Error('editing requires dataSource.update or editing.onSave')
			if (enabled(merged.deleting) && !deleting.onDelete && !source.delete)
				throw new Error('deleting requires dataSource.delete or deleting.onDelete')
			if (enabled(merged.deleting) && enabled(deleting.bulk) && !bulk.onDelete && !source.deleteMany)
				throw new Error('Bulk deletion requires dataSource.deleteMany or deleting.bulk.onDelete')

			return {
				...merged,

				...(enabled(merged.creating)
					? { creating: { ...creating, onSave: creating.onSave ?? (({ values }) => create.execute({ values })) } }
					: {}),
				...(enabled(merged.editing)
					? {
							editing: {
								...editing,
								onSave: editing.onSave ?? (({ rowId, row, values }) => update.execute({ rowId, row, values })),
							},
						}
					: {}),
				...(enabled(merged.deleting)
					? {
							deleting: {
								...deleting,
								onDelete: deleting.onDelete ?? (({ rowId, row }) => remove.execute({ rowId, row: row.original })),
								...(enabled(deleting.bulk)
									? {
											bulk: {
												...bulk,
												onDelete:
													bulk.onDelete ??
													(({ rowIds, rows }) => removeMany.execute({ rowIds, rows: rows.map((row) => row.original) })),
											},
										}
									: {}),
							},
						}
					: {}),
				pagination: {
					...pagination,
					manual: true,
					enabled: enabled(merged.pagination),
					...(projection.rowCount === undefined ? { pageCount: -1 } : { rowCount: projection.rowCount }),
					hasNextPage: projection.hasNextPage,
					onLoadMore: loadMore,
				},
				sorting: {
					...(typeof merged.sorting === 'object' ? merged.sorting : {}),
					manual: true,
					enabled: enabled(merged.sorting),
				},
				filtering: {
					...(typeof merged.filtering === 'object' ? merged.filtering : {}),
					manual: true,
					enabled: enabled(merged.filtering),
				},
				globalFiltering: {
					...(typeof merged.globalFiltering === 'object' ? merged.globalFiltering : {}),
					manual: true,
					enabled: enabled(merged.globalFiltering),
				},
				state: { ...merged.state, loading: projection.loading },
			}
		})
		const infiniteMode = table.grid.pagination.infinite !== undefined
		const axes = useDataGridSelector(
			table,
			(snapshot) => {
				// Feature registration is runtime-composed; absent axes use empty criteria.
				const state = snapshot as Partial<GridQueryParams> & { applied?: Omit<GridQueryParams, 'pagination'> }
				return {
					pagination: state.pagination ?? { pageIndex: 0, pageSize: 20 },
					sorting: (draft ? state.applied?.sorting : state.sorting) ?? EMPTY,
					columnFilters: (draft ? state.applied?.columnFilters : state.columnFilters) ?? EMPTY,
					globalFilter: draft ? state.applied?.globalFilter : state.globalFilter,
				}
			},
			{
				compare: (a, b) =>
					a.pagination.pageIndex === b.pagination.pageIndex &&
					a.pagination.pageSize === b.pagination.pageSize &&
					a.sorting === b.sorting &&
					a.columnFilters === b.columnFilters &&
					a.globalFilter === b.globalFilter,
			},
		)
		const criteria = hashKey([axes.sorting, axes.columnFilters, axes.globalFilter])
		const previousCriteria = useRef(criteria)
		const reset = previousCriteria.current !== criteria
		const params = { ...axes, pagination: reset ? { ...axes.pagination, pageIndex: 0 } : axes.pagination }
		useEffect(() => {
			previousCriteria.current = criteria
			if (reset && axes.pagination.pageIndex !== 0) table.setPageIndex(0)
		}, [criteria, reset, axes.pagination.pageIndex, table])
		const collectionSource = useMemo(
			() => ({
				...(source.getAll
					? {
							getAll: {
								query: source.getAll.query,
								getItems: source.getAll.getRows,
								...(source.getAll.getRowCount ? { getTotal: source.getAll.getRowCount } : {}),
							},
						}
					: {}),
				...(source.getInfinite
					? { getInfinite: { query: source.getInfinite.query, getItems: source.getInfinite.getRows } }
					: {}),
				...(source.create ? { create: source.create } : {}),
				...(source.update ? { update: source.update } : {}),
				...(source.delete ? { delete: source.delete } : {}),
				...(source.deleteMany ? { deleteMany: source.deleteMany } : {}),
				invalidation: source.invalidation ?? EMPTY,
			}),
			[source],
		)
		// The runtime source crosses one opaque response boundary; modes are checked below.
		const collection = useCollectionQuery(
			infiniteMode
				? {
						source: collectionSource,
						mode: 'infinite',
						params: {
							sorting: params.sorting,
							columnFilters: params.columnFilters,
							globalFilter: params.globalFilter,
							pageSize: params.pagination.pageSize,
						},
					}
				: { source: collectionSource, mode: 'pages', params },
		)

		useCommitEffect(() => {
			mutations.current = {
				...(collection.create ? { create: collection.create } : {}),
				...(collection.update ? { update: collection.update } : {}),
				...(collection.delete ? { delete: collection.delete } : {}),
				...(collection.deleteMany ? { deleteMany: collection.deleteMany } : {}),
			}
		})
		const current = collection.query
		const list = current as UseQueryResult<unknown, unknown>
		const pages = current as UseInfiniteQueryResult<InfiniteData<unknown>, unknown>
		const data = collection.items as object[]
		const rowCount = !infiniteMode && !list.isPlaceholderData ? collection.total : undefined

		const next = {
			data: replaceEqualDeep(projection.data, data),
			rowCount,
			hasNextPage: infiniteMode && pages.hasNextPage,
			loading: {
				isPending: current.isPending,
				isFetching: current.isFetching && !(infiniteMode && pages.isFetchingNextPage),
				isError: current.isError && !(infiniteMode && pages.isFetchNextPageError),
				error: infiniteMode && pages.isFetchNextPageError ? null : current.error,
			},
		}
		// Feed the result through the grid's supported config/publication path before children
		// commit. This holds a projection reference, not another cache or parameter store.
		if (!sameProjection(projection, next)) setProjection(next)
		const { hasNextPage, isFetching, fetchNextPage } = pages
		useCommitEffect(() => {
			nextPageRef.current = async () => {
				if (nextPageRequest.current) return nextPageRequest.current
				if (!hasNextPage || isFetching) return
				const pending = fetchNextPage({ throwOnError: true }).then(() => undefined)
				nextPageRequest.current = pending
				try {
					await pending
				} finally {
					if (nextPageRequest.current === pending) nextPageRequest.current = null
				}
			}
		}, [hasNextPage, isFetching, fetchNextPage])
		useEffect(() => {
			if (infiniteMode || !list.isSuccess || list.isFetching || list.isPlaceholderData || rowCount === undefined) return
			const last = Math.max(0, Math.ceil(rowCount / params.pagination.pageSize) - 1)
			if (params.pagination.pageIndex > last) table.setPageIndex(last)
		}, [
			infiniteMode,
			list.isSuccess,
			list.isFetching,
			list.isPlaceholderData,
			rowCount,
			params.pagination.pageIndex,
			params.pagination.pageSize,
			table,
		])
		if (infiniteMode && !source.getInfinite) throw new Error('An infinite grid requires dataSource.getInfinite')
		return table
	}
	function ConnectedGrid(
		props: Omit<UseDataGridConfig<GridFeatures, object>, 'data'> & {
			dataSource: GridDataSource<object>
		} & DataGridSharedProps,
	) {
		const table = useConnectedGrid(props)
		return createElement(BaseGrid, { ...props, table })
	}
	function QueryGrid(
		props:
			| DataGridControlledProps<GridFeatures, object>
			| (Omit<UseDataGridConfig<GridFeatures, object>, 'data'> & {
					dataSource: GridDataSource<object>
			  } & DataGridSharedProps),
	) {
		return 'table' in props ? createElement(BaseGrid, props) : createElement(ConnectedGrid, props)
	}
	return {
		...bundle,
		DataGrid: Object.assign(QueryGrid, bundle.DataGrid),
		useDataGrid: useConnectedGrid,
	} as unknown as ConnectionBundle<C, F, X, CC>
}
