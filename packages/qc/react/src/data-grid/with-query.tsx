import { publishGridWriteContext, useDataGridSelector, ValidationError } from '@ez-kit/data-grid-react'
import {
	useCollectionQuery,
	type CollectionQueryOptions,
	type CollectionQueryConfig,
	type CollectionPageInput,
	type CollectionInfiniteInput,
	type CollectionMutation,
	type ReadProjectionCompatibility,
} from '@ez-kit/query-react/collection'
import { hashKey, replaceEqualDeep, useQueryClient } from '@tanstack/react-query'
import { createElement, useEffect, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import type { GridCollectionParams } from './data-grid-source'
import type {
	GridCreateContext,
	GridUpdateContext,
	GridDeleteContext,
	GridDeleteManyContext,
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
	QueryKey,
	InvalidateQueryFilters,
	UseInfiniteQueryOptions,
	UseQueryOptions,
	UseQueryResult,
	UseInfiniteQueryResult,
} from '@tanstack/react-query'
import type { ReactElement } from 'react'

function withoutPreviousData<T extends { placeholderData?: unknown }>(options: T): T {
	const { placeholderData } = options
	return {
		...options,
		placeholderData:
			typeof placeholderData === 'function'
				? () => (placeholderData as (data: undefined, query: undefined) => unknown)(undefined, undefined)
				: placeholderData,
	}
}

/** Sources retain native option types; the connector needs only the row and criteria contracts. */
type GridReads<TRow extends object> = {
	pages?: {
		query: (input: CollectionPageInput<GridCollectionParams>) => { queryKey: QueryKey }
		getItems: (data: never) => readonly TRow[]
		getTotal?: (data: never) => number | undefined
	}
	infinite?: {
		query: (input: CollectionInfiniteInput<GridCollectionParams>) => { queryKey: QueryKey }
		getItems: (data: never) => readonly TRow[]
	}
}

export type GridDataSource<TRow extends object> = {
	read: GridReads<TRow> & (Required<Pick<GridReads<TRow>, 'pages'>> | Required<Pick<GridReads<TRow>, 'infinite'>>)
	invalidation: readonly InvalidateQueryFilters[]
}

type GridSourceCompatibility<S> = S extends { read: infer Reads }
	? {
			read: {
				[K in keyof Reads]: ReadProjectionCompatibility<NonNullable<Reads[K]>, K, 'getItems', 'getTotal'>
			}
		}
	: never

type GridWriteCompatibility<S extends GridDataSource<object>> = {
	[K in keyof S as K extends keyof ActionInputs<object> ? K : never]: NonNullable<S[K]> extends CollectionMutation<
		infer V,
		infer _D,
		infer _E,
		infer _O
	>
		? K extends keyof ActionInputs<GridRow<S>>
			? ActionInputs<GridRow<S>>[K] extends V
				? unknown
				: never
			: never
		: never
}

type ReadableGridSource<S extends GridDataSource<object>, Mode> = S &
	GridSourceCompatibility<NoInfer<S>> &
	GridWriteCompatibility<NoInfer<S>> &
	([Mode] extends [never]
		? unknown
		: [S] extends [{ read: Record<Extract<Mode, PropertyKey>, unknown> }]
			? unknown
			: never)

type SourceCheck<S extends GridDataSource<object>, Mode extends PaginationMode> = {
	dataSource: ReadableGridSource<NoInfer<S>, NoInfer<Mode>>
	pagination?: boolean | { mode?: Mode }
}

type PolicySource<R> = { read: R; invalidation: readonly InvalidateQueryFilters[] }
type PageQueryOptions = CollectionQueryOptions<
	PolicySource<{ pages: { query: () => UseQueryOptions<unknown, unknown>; getItems: () => [] } }>,
	'pages'
>
type InfiniteQueryOptions = CollectionQueryOptions<
	PolicySource<{
		infinite: { query: () => UseInfiniteQueryOptions<unknown, unknown, InfiniteData<unknown>>; getItems: () => [] }
	}>,
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
	S extends GridDataSource<object> = GridDataSource<R>,
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
	dataSource: S
	scopeKey?: QueryKey
	queryOptions?: GridQueryOptions
	data?: never
}

type GridReadRow<R> = R extends { getItems: (data: never) => readonly (infer Row)[] } ? Row : never
type GridRow<S extends GridDataSource<object>> =
	S extends GridDataSource<object> ? GridReadRow<S['read'][Extract<keyof S['read'], 'pages' | 'infinite'>]> : never

type ConnectionBundle<
	C extends CellTypeRegistry,
	F extends TableFeatures | undefined,
	X extends object | undefined,
	CC extends ColumnConfigShape,
> = Omit<DataGridBundle<C, F, X, CC>, 'DataGrid' | 'useDataGrid'> & {
	useDataGrid: <
		S extends GridDataSource<object>,
		CF extends TableFeatures = Features<F>,
		E extends CellTypeRegistry = Extra,
		Mode extends PaginationMode = never,
	>(
		config: QueryGridConfig<CF, GridRow<NoInfer<S>>, C, Context<X>, CC, E, S> &
			SourceCheck<S, Mode> &
			(F extends TableFeatures ? unknown : { features: CF }),
	) => DataTable<CF, GridRow<S>>
	DataGrid: (<R extends object, CF extends TableFeatures = Features<F>>(
		props: DataGridControlledProps<CF, R> & { dataSource?: never; queryOptions?: never; scopeKey?: never },
	) => ReactElement) &
		(<
			S extends GridDataSource<object>,
			CF extends TableFeatures = Features<F>,
			E extends CellTypeRegistry = Extra,
			Mode extends PaginationMode = never,
		>(
			props: DataGridSharedProps &
				QueryGridConfig<CF, GridRow<NoInfer<S>>, C, Context<X>, CC, E, S> &
				SourceCheck<S, Mode> &
				(F extends TableFeatures ? unknown : { features: CF }) & { table?: never },
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
	[Name in keyof ActionInputs<R>]?: CollectionMutation<ActionInputs<R>[Name], unknown, unknown> & {
		transformError?: (error: unknown) => unknown
	}
} & {
	invalidation: readonly InvalidateQueryFilters[]
	transformError?: (error: unknown) => unknown
	read: {
		pages?: {
			query: (input: CollectionPageInput<GridCollectionParams>) => UseQueryOptions<unknown, unknown>
			getItems: (data: unknown) => readonly R[]
			getTotal?: (data: unknown) => number | undefined
		}
		infinite?: {
			query: (
				input: CollectionInfiniteInput<GridCollectionParams>,
			) => UseInfiniteQueryOptions<unknown, unknown, InfiniteData<unknown>>
			getItems: (data: unknown) => readonly R[]
		}
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
function waitForPublication(ready: AbortSignal, superseded: AbortSignal, signal: AbortSignal): Promise<void> {
	return new Promise((resolve) => {
		function finish() {
			ready.removeEventListener('abort', finish)
			superseded.removeEventListener('abort', finish)
			signal.removeEventListener('abort', finish)
			resolve()
		}
		if (ready.aborted || superseded.aborted || signal.aborted) finish()
		else {
			ready.addEventListener('abort', finish, { once: true })
			superseded.addEventListener('abort', finish, { once: true })
			signal.addEventListener('abort', finish, { once: true })
		}
	})
}

function enabled(value: unknown): boolean {
	return (
		value !== undefined &&
		value !== false &&
		!(typeof value === 'object' && value !== null && 'enabled' in value && value.enabled === false)
	)
}
function stableRowId(row: object): string {
	const id = (row as { id?: unknown }).id
	if ((typeof id === 'string' && id !== '') || (typeof id === 'number' && Number.isFinite(id))) return String(id)
	throw new Error('Connected editing and deletion require a stable row id. Supply getRowId for rows without an id.')
}

type Criteria = Omit<GridQueryParams, 'pagination'>
function sameCriteria(a: Criteria, b: Criteria): boolean {
	return (
		Object.is(a.sorting, b.sorting) &&
		Object.is(a.columnFilters, b.columnFilters) &&
		Object.is(a.globalFilter, b.globalFilter)
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
			scopeKey?: QueryKey
			queryOptions?: GridQueryOptions
		},
	) {
		const { dataSource, queryOptions, scopeKey, ...gridConfig } = config
		const client = useQueryClient()
		// Query options and their projections cross this boundary together. Their response
		// type is opaque to the connector; only the projection consumes the selected value.
		const source = dataSource as unknown as RuntimeSource<object>
		// Child layout effects can run before TanStack installs the observer options.
		const ready = new AbortController()
		const isPublished = () => ready.signal.aborted
		const superseded = new AbortController()
		const mutations = useRef<
			Partial<
				Record<
					keyof ActionInputs<object>,
					{
						key: string
						run: (input: unknown) => Promise<unknown>
					}
				>
			>
		>({})
		const mutationKeys = OPERATIONS.map(
			(name) => client.defaultMutationOptions(source[name]?.mutation ?? {}).mutationKey ?? [],
		)
		const scope = hashKey(scopeKey ?? mutationKeys)
		const createOwner = scopeKey === undefined ? hashKey(mutationKeys[0] ?? []) : scope
		const operationKey = (name: keyof ActionInputs<object>) => hashKey(mutationKeys[OPERATIONS.indexOf(name)] ?? [])
		const owners = useRef({ createOwner, scope })
		const lastRead = useRef<{ scope: string; query: unknown; getRows: unknown } | undefined>(undefined)
		const abandonedForms = useRef<{
			create?: Readonly<Record<string, unknown>> | undefined
			update?: Readonly<Record<string, unknown>> | undefined
		}>({})
		function currentOwner(name: keyof ActionInputs<object>): string {
			return name === 'create' ? owners.current.createOwner : owners.current.scope
		}
		function expectedOwner(name: keyof ActionInputs<object>): string {
			return name === 'create' ? createOwner : scope
		}
		function canWrite(name: keyof ActionInputs<object>, startedInScope: boolean): boolean {
			const form = name === 'create' ? table.creating : name === 'update' ? table.editing : undefined
			if (
				startedInScope &&
				currentOwner(name) === expectedOwner(name) &&
				(name === 'create' || projection.scope === scope) &&
				(!form || abandonedForms.current[name as 'create' | 'update'] !== form.getState().initialValues)
			)
				return true
			if (form) throw new ValidationError({ formError: table.grid.messages.form.sourceChanged })
			return false
		}
		function guardCustom<T>(
			name: keyof ActionInputs<object>,
			handler: ((context: T) => void | Promise<void>) | undefined,
		) {
			if (scopeKey === undefined || !handler) return handler
			return (context: T) => {
				if (canWrite(name, true)) return handler(context)
			}
		}
		async function execute<K extends keyof ActionInputs<object>>(
			name: K,
			input: ActionInputs<object>[K],
			signal: AbortSignal,
		) {
			const startedInScope = currentOwner(name) === expectedOwner(name)
			if (!isPublished()) {
				await waitForPublication(ready.signal, superseded.signal, signal)
				if (!isPublished() && !signal.aborted) {
					throw new ValidationError({ formError: table.grid.messages.form.sourceChanged })
				}
			}
			if (signal.aborted || !canWrite(name, startedInScope)) return
			const operation = source[name]
			const mutate = mutations.current[name]
			if (!operation || !mutate) throw new Error(`Missing grid ${name} executor`)
			try {
				if (mutate.key !== operationKey(name)) throw new Error(`Grid ${name} scope changed before dispatch`)
				await mutate.run(input)
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
		const identity = { needsRowId: false }
		let controlledPageIndex: number | undefined
		const awaitingSelection = useRef(false)
		let selectionReady = true
		const rows = projection.scope === scope ? projection.data : EMPTY
		const table = useBoundGrid({ ...gridConfig, data: rows }, (merged) => {
			const {
				rowCount: _rowCount,
				pageCount: _pageCount,
				...pagination
			} = typeof merged.pagination === 'object' ? merged.pagination : {}
			draft = enabled(merged.draft)
			identity.needsRowId = !merged.getRowId && (enabled(merged.editing) || enabled(merged.deleting))
			controlledPageIndex = merged.state?.pagination?.pageIndex
			const controlledSelection = merged.state?.rowSelection
			selectionReady = !(
				(owners.current.scope !== scope || awaitingSelection.current) &&
				controlledSelection &&
				Object.keys(controlledSelection).length
			)
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
				...(!selectionReady && enabled(merged.selection)
					? { selection: { ...(typeof merged.selection === 'object' ? merged.selection : {}), bar: false } }
					: {}),
				...((enabled(merged.editing) || enabled(merged.deleting)) && !merged.getRowId ? { getRowId: stableRowId } : {}),

				...(enabled(merged.creating)
					? {
							creating: {
								...creating,
								onSave:
									guardCustom('create', creating.onSave) ??
									(({ values, signal }) => execute('create', { values }, signal)),
							},
						}
					: {}),
				...(enabled(merged.editing)
					? {
							editing: {
								...editing,
								onSave:
									guardCustom('update', editing.onSave) ??
									(({ rowId, row, values, signal }) => execute('update', { rowId, row, values }, signal)),
							},
						}
					: {}),
				...(enabled(merged.deleting)
					? {
							deleting: {
								...deleting,
								onDelete:
									guardCustom('delete', deleting.onDelete) ??
									(({ rowId, row, signal }) => execute('delete', { rowId, row: row.original }, signal)),
								...(enabled(deleting.bulk)
									? {
											bulk: {
												...bulk,
												onDelete:
													guardCustom('deleteMany', bulk.onDelete) ??
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
		useInsertionEffect(() => {
			// Publish before descendant layout effects, while speculative renders leave the
			// visible table's actions and write targets on the previous committed context.
			awaitingSelection.current = !selectionReady
			const options = table.options
			const unpublish = publishGridWriteContext(table, {
				options,
				columns: options.creating || options.editing ? table.getAllColumns() : EMPTY,
				flatColumns: options.editing ? table.getAllFlatColumns() : EMPTY,
				scope,
				selectionReady,
				rows: options.deleting || options.editing ? table.getRowModel().rows : EMPTY,
				rowsById: options.editing ? table.getCoreRowModel().rowsById : {},
			})
			return () => {
				superseded.abort()
				unpublish()
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
					sameCriteria(a, b),
			},
		)
		const { sorting, columnFilters, globalFilter } = axes
		const criteria = useMemo(() => ({ sorting, columnFilters, globalFilter }), [sorting, columnFilters, globalFilter])
		const previousCriteria = useRef(criteria)
		const reset = table.grid.pagination.enabled && !sameCriteria(previousCriteria.current, criteria)
		const params = { ...axes, pagination: reset ? { ...axes.pagination, pageIndex: 0 } : axes.pagination }
		const observedPageIndex = controlledPageIndex ?? axes.pagination.pageIndex
		useEffect(() => {
			if (!reset || observedPageIndex === 0) previousCriteria.current = criteria
			else table.setPageIndex(0)
		}, [criteria, reset, observedPageIndex, table])
		const pagination = infiniteMode
			? { mode: 'infinite' as const, pageSize: params.pagination.pageSize }
			: { mode: 'pages' as const, ...params.pagination }
		const read = source.read[pagination.mode]
		if (!read) throw new Error(`Grid source does not support ${pagination.mode} reads`)
		const readQuery = read.query
		const getRows = read.getItems
		const suppressPlaceholder =
			lastRead.current !== undefined &&
			(lastRead.current.scope !== scope || lastRead.current.query !== readQuery || lastRead.current.getRows !== getRows)
		const infiniteOptions =
			pagination.mode === 'infinite' ? source.read.infinite?.query({ ...pagination, params: criteria }) : undefined
		const listOptions =
			pagination.mode === 'pages' && suppressPlaceholder
				? source.read.pages?.query({ ...pagination, params: criteria })
				: undefined
		const infiniteIdentity = infiniteOptions ? client.defaultQueryOptions(infiniteOptions).queryHash : undefined
		const collectionSource = {
			...source,
			read: {
				...(source.read.pages
					? {
							pages: {
								...source.read.pages,
								query: listOptions ? () => withoutPreviousData(listOptions) : source.read.pages.query,
							},
						}
					: {}),
				...(source.read.infinite
					? {
							infinite: {
								...source.read.infinite,
								query: infiniteOptions
									? () => (suppressPlaceholder ? withoutPreviousData(infiniteOptions) : infiniteOptions)
									: source.read.infinite.query,
							},
						}
					: {}),
			},
		}
		// The public boundary has checked both capability and projection. The active
		// descriptor is checked above and retains its native options here.
		const collection = useCollectionQuery({
			source: collectionSource,
			pagination,
			params: criteria,
			queryOptions: { ...queryOptions, notifyOnChangeProps: 'all' },
		} as unknown as CollectionQueryConfig<typeof collectionSource, 'pages' | 'infinite'>)

		// Publish after TanStack updates observer options in its passive effects.
		useEffect(() => {
			const current: typeof mutations.current = {}
			for (const name of OPERATIONS) {
				const mutation = collection[name]
				if (mutation)
					current[name] = {
						key: operationKey(name),
						// execute() pairs the operation name with its typed action input.
						run: mutation.mutateAsync as (input: unknown) => Promise<unknown>,
					}
			}
			mutations.current = current
			ready.abort()
		})
		const current = collection.query
		const list = current as UseQueryResult<unknown, unknown>
		const pages = current as UseInfiniteQueryResult<InfiniteData<unknown>, unknown>
		useCommitEffect(() => {
			if (current.data !== undefined && !current.isPlaceholderData)
				lastRead.current = { scope, query: readQuery, getRows }
		}, [current.data, current.isPlaceholderData, scope, readQuery, getRows])
		const data = collection.items as object[]
		// Check before publishing records to TanStack Table so a rejected identity cannot poison its row model.
		if (identity.needsRowId) for (const row of data) stableRowId(row)
		const authoritativeTotal = list.isFetchedAfterMount || (list.isEnabled && !list.isStale)
		const rowCount = !infiniteMode && !list.isPlaceholderData && authoritativeTotal ? collection.total : undefined

		const next = {
			scope,
			data: replaceEqualDeep(projection.data, data),
			rowCount,
			hasNextPage: infiniteMode && pages.isEnabled && pages.hasNextPage,
			loadMoreKey: infiniteIdentity,
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
		const { hasNextPage, isEnabled, isFetching, fetchNextPage } = pages
		useCommitEffect(() => {
			nextPageRef.current = async () => {
				if (!infiniteIdentity || !isEnabled) return
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
		}, [infiniteIdentity, hasNextPage, isEnabled, isFetching, fetchNextPage])
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
		return table
	}
	function ConnectedGrid(
		props: Omit<UseDataGridConfig<GridFeatures, object>, 'data'> & {
			dataSource: GridDataSource<object>
			scopeKey?: QueryKey
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
					scopeKey?: QueryKey
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
