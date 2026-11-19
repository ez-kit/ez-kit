import { useDataGridSelector, ValidationError } from '@ez-kit/data-grid-react'
import {
	useCollectionQuery,
	type CollectionQueryOptions,
	type ReadProjectionCompatibility,
} from '@ez-kit/query-react/collection'
import { hashKey, replaceEqualDeep, useQueryClient } from '@tanstack/react-query'
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
	PaginationMode,
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

function requireCollectionRead<S, K extends keyof S>(source: S, key: K): S & { [P in K]-?: NonNullable<S[P]> } {
	if (!source[key]) throw new Error(`Collection source does not support ${String(key)} reads`)
	return source as S & { [P in K]-?: NonNullable<S[P]> }
}

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

type GridSourceCompatibility<S> = {
	[K in keyof S as K extends 'getAll' | 'getInfinite' ? K : never]: ReadProjectionCompatibility<
		NonNullable<S[K]>,
		K extends 'getAll' ? 'pages' : 'infinite',
		'getRows',
		'getRowCount'
	>
}
type ReadableGridSource<S, Mode> = S &
	GridSourceCompatibility<NoInfer<S>> &
	(S extends { getAll: unknown } | { getInfinite: unknown } ? unknown : never) &
	([Mode] extends ['infinite'] ? ('getInfinite' extends keyof S ? unknown : never) : unknown) &
	([Mode] extends ['pages'] ? ('getAll' extends keyof S ? unknown : never) : unknown)

type SourceCheck<S, Mode extends PaginationMode> = {
	dataSource: ReadableGridSource<NoInfer<S>, NoInfer<Mode>>
	pagination?: boolean | { mode?: Mode }
}

type PageQueryOptions = CollectionQueryOptions<{ getAll: { query: () => UseQueryOptions<unknown, unknown> } }, 'pages'>
type InfiniteQueryOptions = CollectionQueryOptions<
	{ getInfinite: { query: () => UseInfiniteQueryOptions<unknown, unknown, InfiniteData<unknown>> } },
	'infinite'
>
type OptionCallback<T> = Extract<T, (...args: never[]) => unknown>
type CommonOption<T> = [OptionCallback<T>] extends [never]
	? T
	: Exclude<T, OptionCallback<T>> | ((...args: Parameters<OptionCallback<T>>) => ReturnType<OptionCallback<T>>)

/** Consumer observer policy for either mode; callback data stays source-owned and opaque. */
export type GridQueryOptions = {
	[K in Exclude<keyof PageQueryOptions, 'notifyOnChangeProps'>]?: CommonOption<
		PageQueryOptions[K] | InfiniteQueryOptions[K]
	>
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
	S extends GridDataSource<R> = GridDataSource<R>,
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
	dataSource: GridDataSource<R> & S
	queryOptions?: GridQueryOptions
	data?: never
}

type ConnectionBundle<
	C extends CellTypeRegistry,
	F extends TableFeatures | undefined,
	X extends object | undefined,
	CC extends ColumnConfigShape,
> = Omit<DataGridBundle<C, F, X, CC>, 'DataGrid' | 'useDataGrid'> & {
	useDataGrid: <
		R extends object,
		CF extends TableFeatures = Features<F>,
		E extends CellTypeRegistry = Extra,
		S extends GridDataSource<R> = GridDataSource<R>,
		Mode extends PaginationMode = PaginationMode,
	>(
		config: QueryGridConfig<CF, R, C, Context<X>, CC, E, S> &
			SourceCheck<S, Mode> &
			(F extends TableFeatures ? unknown : { features: CF }),
	) => DataTable<CF, R>
	DataGrid: (<
		R extends object,
		CF extends TableFeatures = Features<F>,
		E extends CellTypeRegistry = Extra,
		S extends GridDataSource<R> = GridDataSource<R>,
		Mode extends PaginationMode = PaginationMode,
	>(
		props:
			| (DataGridControlledProps<CF, R> & { dataSource?: never; queryOptions?: never })
			| (DataGridSharedProps &
					QueryGridConfig<CF, R, C, Context<X>, CC, E, S> &
					SourceCheck<S, Mode> &
					(F extends TableFeatures ? unknown : { features: CF }) & { table?: never }),
	) => ReactElement) &
		DataGridStatics
}

const OPERATIONS = ['create', 'update', 'delete', 'deleteMany'] as const
type ActionInputs<R extends object> = {
	create: GridCreateContext<R>
	update: GridUpdateContext<R>
	delete: GridDeleteContext<R>
	deleteMany: GridDeleteManyContext<R>
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
type Projection<R> = {
	scope?: string | undefined
	data: R[]
	loading: LoadingState
	rowCount: number | undefined
	hasNextPage: boolean
	loadMoreKey?: string | undefined
}
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
		a.scope === b.scope &&
		a.data === b.data &&
		a.rowCount === b.rowCount &&
		a.hasNextPage === b.hasNextPage &&
		a.loadMoreKey === b.loadMoreKey &&
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
		config: Omit<UseDataGridConfig<GridFeatures, object>, 'data'> & {
			dataSource: GridDataSource<object>
			queryOptions?: GridQueryOptions
		},
	) {
		const { dataSource, queryOptions, ...gridConfig } = config
		const client = useQueryClient()
		// Query options and their projections cross this boundary together. Their response
		// type is opaque to the connector; only the projection consumes the selected value.
		const source = dataSource as unknown as RuntimeSource<object>
		// Child effects can submit before our passive effect publishes the observers.
		// Wait for this committed render's publication without dispatching to an old owner.
		const publication = { ready: false, waiters: [] as (() => void)[] }
		const mutations = useRef<Partial<Record<keyof ActionInputs<object>, (input: unknown) => Promise<unknown>>>>({})
		const mutationKeys = OPERATIONS.map(
			(name) => client.defaultMutationOptions(source[name]?.mutation ?? {}).mutationKey ?? [],
		)
		const createOwner = hashKey(mutationKeys[0] ?? [])
		const scope = hashKey(mutationKeys)
		const owners = useRef({ createOwner, scope })
		const lastReadScope = useRef<string | undefined>(undefined)
		const abandonedForms = useRef<{
			create?: Readonly<Record<string, unknown>> | undefined
			update?: Readonly<Record<string, unknown>> | undefined
		}>({})
		async function execute<K extends keyof ActionInputs<object>>(
			name: K,
			input: ActionInputs<object>[K],
			signal: AbortSignal,
		) {
			const form = name === 'create' ? table.creating : name === 'update' ? table.editing : undefined
			const expectedOwner = name === 'create' ? createOwner : scope
			const currentOwner = () => (name === 'create' ? owners.current.createOwner : owners.current.scope)
			const startedInScope = currentOwner() === expectedOwner
			if (!publication.ready) await new Promise<void>((resolve) => publication.waiters.push(resolve))
			if (signal.aborted) return
			if (
				!startedInScope ||
				currentOwner() !== expectedOwner ||
				(name !== 'create' && projection.scope !== scope) ||
				(form && abandonedForms.current[name as 'create' | 'update'] === form.getState().initialValues)
			) {
				if (form) throw new ValidationError({ formError: table.grid.messages.form.sourceChanged })
				return
			}
			const operation = source[name] as
				GridMutationSource<ActionInputs<object>[K], unknown, unknown, unknown> | undefined
			const mutate = mutations.current[name]
			if (!operation || !mutate) throw new Error(`Missing grid ${name} executor`)
			try {
				await mutate(operation.prepareArgs(input))
			} catch (error) {
				throw (operation.transformError ?? source.transformError)?.(error) ?? error
			}
		}

		const [projection, setProjection] = useState<Projection<object>>({
			data: EMPTY,
			rowCount: undefined,
			hasNextPage: false,
			loading: { isPending: true, isFetching: false, isError: false, error: null },
		})
		const nextPageRequest = useRef(new Map<string, Promise<void>>())
		const nextPageRef = useRef<() => Promise<void>>(async () => {})
		const loadMore = useMemo(() => () => nextPageRef.current(), [])
		let draft = false
		const rows = projection.scope === scope ? projection.data : EMPTY
		const table = useBoundGrid({ ...gridConfig, data: rows }, (merged) => {
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
					? {
							creating: {
								...creating,
								onSave: creating.onSave ?? (({ values, signal }) => execute('create', { values }, signal)),
							},
						}
					: {}),
				...(enabled(merged.editing)
					? {
							editing: {
								...editing,
								onSave:
									editing.onSave ??
									(({ rowId, row, values, signal }) => execute('update', { rowId, row, values }, signal)),
							},
						}
					: {}),
				...(enabled(merged.deleting)
					? {
							deleting: {
								...deleting,
								onDelete:
									deleting.onDelete ??
									(({ rowId, row, signal }) => execute('delete', { rowId, row: row.original }, signal)),
								...(enabled(deleting.bulk)
									? {
											bulk: {
												...bulk,
												onDelete:
													bulk.onDelete ??
													(({ rowIds, rows, signal }) =>
														execute('deleteMany', { rowIds, rows: rows.map((row) => row.original) }, signal)),
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
					loadMoreKey: projection.loadMoreKey,
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
		useCommitEffect(() => {
			// Pending validation settles quietly. Keep an open draft for recovery, but
			// require a new form session before it can be written under a different owner.
			const previous = owners.current
			const oldCreating = previous.createOwner !== createOwner
			const oldEditing = previous.scope !== scope
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- feature registration is optional
			if (oldCreating && table.creating) {
				const state = table.creating.getState()
				abandonedForms.current.create = state.isOpen ? state.initialValues : undefined
				table.creating.cancelValidation()
				if (!state.isOpen) table.creating.cancel() // pinned draft, if present
			}
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- feature registration is optional
			if (oldEditing && table.editing) {
				abandonedForms.current.update = table.editing.getState().initialValues
				table.editing.cancelValidation()
			}
			if (previous.scope !== scope) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- feature registration is optional
				table.deleting?.cancel()
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- feature registration is optional
				table.deleting?.bulk.cancel()
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- feature registration is optional
				table.resetRowSelection?.(true)
			}
			owners.current = { createOwner, scope }
		}, [createOwner, scope, table])
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
		const infiniteParams = {
			sorting: params.sorting,
			columnFilters: params.columnFilters,
			globalFilter: params.globalFilter,
			pageSize: params.pagination.pageSize,
		}
		const infiniteOptions = infiniteMode ? source.getInfinite?.query(infiniteParams) : undefined
		const infiniteIdentity = infiniteOptions ? client.defaultQueryOptions(infiniteOptions).queryHash : undefined
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
					? {
							getInfinite: {
								query: infiniteOptions ? () => infiniteOptions : source.getInfinite.query,
								getItems: source.getInfinite.getRows,
							},
						}
					: {}),
				...(source.create ? { create: source.create } : {}),
				...(source.update ? { update: source.update } : {}),
				...(source.delete ? { delete: source.delete } : {}),
				...(source.deleteMany ? { deleteMany: source.deleteMany } : {}),
				invalidation: source.invalidation ?? EMPTY,
			}),
			[source, infiniteOptions],
		)
		const observerPolicy = { ...queryOptions, notifyOnChangeProps: 'all' as const }
		// The runtime source crosses one opaque response boundary; modes are checked below.
		const collection = useCollectionQuery<typeof collectionSource, 'pages' | 'infinite'>(
			infiniteMode
				? {
						source: requireCollectionRead(collectionSource, 'getInfinite'),
						mode: 'infinite',
						queryOptions: observerPolicy,
						params: infiniteParams,
					}
				: {
						source: requireCollectionRead(collectionSource, 'getAll'),
						mode: 'pages',
						params,
						queryOptions: observerPolicy,
					},
		)

		// Publish after TanStack updates observer options in its passive effects.
		useEffect(() => {
			const current: typeof mutations.current = {}
			for (const name of OPERATIONS) {
				const mutation = collection[name]
				if (mutation) current[name] = mutation.mutateAsync
			}
			mutations.current = current
			publication.ready = true
			for (const resolve of publication.waiters) resolve()
			publication.waiters.length = 0
		})
		const current = collection.query
		const list = current as UseQueryResult<unknown, unknown>
		const pages = current as UseInfiniteQueryResult<InfiniteData<unknown>, unknown>
		const placeholderFromOtherScope =
			current.isPlaceholderData && lastReadScope.current !== undefined && lastReadScope.current !== scope
		useCommitEffect(() => {
			if (current.data !== undefined && !placeholderFromOtherScope) lastReadScope.current = scope
		}, [current.data, placeholderFromOtherScope, scope])
		const data = placeholderFromOtherScope ? EMPTY : (collection.items as object[])
		const readScope = placeholderFromOtherScope ? undefined : scope
		const authoritativeTotal = list.isFetchedAfterMount || (list.isEnabled && !list.isStale)
		const rowCount = !infiniteMode && !list.isPlaceholderData && authoritativeTotal ? collection.total : undefined

		const next = {
			scope: readScope,
			data: replaceEqualDeep(projection.data, data),
			rowCount,
			hasNextPage: infiniteMode && pages.isEnabled && !placeholderFromOtherScope && pages.hasNextPage,
			loadMoreKey: infiniteIdentity,
			loading: {
				isPending: current.isPending || (placeholderFromOtherScope && current.isFetching),
				isFetching: current.isFetching && !(infiniteMode && pages.isFetchingNextPage),
				isError: current.isError && !(infiniteMode && pages.isFetchNextPageError),
				error: infiniteMode && pages.isFetchNextPageError ? null : current.error,
			},
		}
		// Feed the result through the grid's supported config/publication path before children
		// commit. This holds a projection reference, not another cache or parameter store.
		if (!sameProjection(projection, next)) setProjection(next)
		const { hasNextPage, isEnabled, isFetching, fetchNextPage } = pages
		useCommitEffect(() => {
			nextPageRef.current = async () => {
				if (!infiniteIdentity || !isEnabled || placeholderFromOtherScope) return
				const previous = nextPageRequest.current.get(infiniteIdentity)
				if (previous) return previous
				if (!hasNextPage || isFetching) return
				const pending = fetchNextPage({ throwOnError: true }).then(() => undefined)
				nextPageRequest.current.set(infiniteIdentity, pending)
				try {
					await pending
				} finally {
					if (nextPageRequest.current.get(infiniteIdentity) === pending)
						nextPageRequest.current.delete(infiniteIdentity)
				}
			}
		}, [infiniteIdentity, hasNextPage, isEnabled, isFetching, fetchNextPage, placeholderFromOtherScope])
		useEffect(() => {
			if (
				infiniteMode ||
				!list.isEnabled ||
				!list.isSuccess ||
				list.fetchStatus !== 'idle' ||
				list.isPlaceholderData ||
				rowCount === undefined
			)
				return
			// A stale cache hit with refetch disabled is not an authoritative total.
			// A completed response remains authoritative even with staleTime: 0.
			if (!list.isFetchedAfterMount && list.isStale) return
			const last = Math.max(0, Math.ceil(rowCount / params.pagination.pageSize) - 1)
			if (params.pagination.pageIndex > last) table.setPageIndex(last)
		}, [
			infiniteMode,
			list.isSuccess,
			list.isEnabled,
			list.fetchStatus,
			list.isFetchedAfterMount,
			list.isStale,
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
			queryOptions?: GridQueryOptions
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
					queryOptions?: GridQueryOptions
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
