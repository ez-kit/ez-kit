import { InfiniteQueryObserver, QueryClient, QueryObserver } from '@tanstack/react-query'
import { expect, expectTypeOf, it } from 'vitest'

import { createGridSourceFactory } from './index'

import type { GridQueryParams } from './types'

type Entity = { id: string }
type Page<Row> = { items: Row[]; total: number; next: string | null }
type User = Entity & { name: string; version: number }
type Project = Entity & { title: string }
const params: GridQueryParams = {
	pagination: { pageIndex: 2, pageSize: 10 },
	sorting: [],
	columnFilters: [],
	globalFilter: 'Ada',
}

// Declared once for the API. Only its row type is specialized at each entity.
function makeSource<Row extends Entity>() {
	return createGridSourceFactory({
		list: {
			prepareArgs: ({ pagination, globalFilter }) => ({
				query: {
					offset: pagination.pageIndex * pagination.pageSize,
					limit: pagination.pageSize,
					search: String(globalFilter),
				},
			}),
			getRows: (response: Page<Row>) => response.items,
			getRowCount: (response) => response.total,
		},
		infinite: {
			prepareArgs: ({ pageSize, globalFilter }) => ({ query: { limit: pageSize, search: String(globalFilter) } }),
			preparePageArgs: ({
				args,
				pageParam,
			}: {
				args: { query: { limit: number; search: string } }
				pageParam: string | null
			}) => ({ query: { ...args.query, cursor: pageParam } }),
			initialPageParam: null as string | null,
			getNextPageParam: (page: Page<Row>) => page.next ?? undefined,
			getRows: (page: Page<Row>) => page.items,
		},
		mutations: {
			create: { prepareArgs: ({ values }) => ({ body: values }) },
			update: {
				prepareArgs: ({ row, values }) => {
					if (!row) throw new Error('The edited row is no longer available')
					return { path: { id: row.id }, body: values }
				},
			},
			delete: { prepareArgs: ({ row }) => ({ path: { id: row.id } }) },
			deleteMany: { prepareArgs: ({ rows }) => ({ body: { ids: rows.map((row) => row.id) } }) },
		},
	})
}

const getUsers = (_args: { query: { limit: number; offset: number; search: string } }): Promise<Page<User>> =>
	Promise.resolve({ items: [], total: 0, next: null })

it('specializes shared conventions once per entity and infers request results', () => {
	const source = makeSource<User>()({
		key: ['users'],
		getAll: getUsers,
		create: (args: { body: Partial<User> }) => Promise.resolve({ created: args.body.name }),
		delete: (args: { path: { id: string } }) => Promise.resolve({ deleted: args.path.id }),
		deleteMany: (args: { body: { ids: string[] } }) => Promise.resolve({ count: args.body.ids.length }),
		update: {
			fetcher: (args: { path: { id: string }; body: { name?: string; version: number } }) =>
				Promise.resolve({ version: args.body.version + 1 }),
			prepareArgs: ({ row, values }) => {
				expectTypeOf(row).toEqualTypeOf<User | undefined>()
				expectTypeOf(values).toEqualTypeOf<Partial<User>>()
				if (!row) throw new Error('The edited row is no longer available')
				return {
					path: { id: row.id },
					body: { ...(values.name === undefined ? {} : { name: values.name }), version: row.version },
				}
			},
			options: {
				onSuccess: (result, variables) => {
					expectTypeOf(result).toEqualTypeOf<{ version: number }>()
					expectTypeOf(variables.body.version).toEqualTypeOf<number>()
				},
			},
		},
	})
	expectTypeOf(source.getAll.getRows).returns.toEqualTypeOf<readonly User[]>()
	expect(source.queries.list(params).queryKey).toEqual([
		'users',
		'list',
		{ query: { offset: 20, limit: 10, search: 'Ada' } },
	])
	expect(source.delete?.prepareArgs({ rowId: 'table-7', row: { id: 'api-9', name: 'Ada', version: 3 } })).toEqual({
		path: { id: 'api-9' },
	})
	expect(
		source.deleteMany?.prepareArgs({ rowIds: ['table-7'], rows: [{ id: 'api-9', name: 'Ada', version: 3 }] }),
	).toEqual({ body: { ids: ['api-9'] } })
	expect(
		source.update?.prepareArgs({
			rowId: 'table-7',
			row: { id: 'api-9', name: 'Ada', version: 3 },
			values: { name: 'Grace' },
		}),
	).toEqual({ path: { id: 'api-9' }, body: { name: 'Grace', version: 3 } })
	expect(() => source.update?.prepareArgs({ rowId: 'missing', row: undefined, values: {} })).toThrow(
		'no longer available',
	)
	const second = makeSource<Project>()({
		key: ['projects'],
		getAll: () => Promise.resolve({ items: [{ id: 'p', title: 'Project' }], total: 1, next: null }),
	})
	expectTypeOf(second.getAll.getRows).returns.toEqualTypeOf<readonly Project[]>()
})

// Compile-only rejected inputs: they intentionally lack a runtime executor.
function rejectedDefinitions() {
	const factory = makeSource<User>()
	factory({
		key: ['users'],
		getAll: getUsers,
		// @ts-expect-error Partial<User> does not supply a required version.
		update: (args: { body: { version: number } }) => Promise.resolve(args.body.version),
	})
	factory({
		key: ['users'],
		getAll: getUsers,
		delete: {
			fetcher: (_args: { id: number }) => Promise.resolve(),
			// @ts-expect-error The API ID must be numeric for this fetcher.
			prepareArgs: ({ row }) => ({ id: row.id }),
		},
	})
	// @ts-expect-error Shared conventions require an entity with an API id.
	makeSource<{ name: string }>()
}
void rejectedDefinitions

it('infers lifecycle errors and optimistic context independently per operation', () => {
	const source = makeSource<User>()({
		key: ['users'],
		getAll: getUsers,
		create: {
			fetcher: (args: { body: Partial<User> }) => Promise.resolve({ name: args.body.name }),
			options: {
				onMutate: (variables) => ({ oldName: variables.body.name }),
				onError: (error: { reason: string }, variables, previous) => {
					expectTypeOf(error).toEqualTypeOf<{ reason: string }>()
					expectTypeOf(variables).toEqualTypeOf<{ body: Partial<User> }>()
					expectTypeOf(previous).toEqualTypeOf<{ oldName: string | undefined } | undefined>()
				},
			},
		},
		delete: {
			fetcher: (args: { path: { id: string } }) => Promise.resolve(args.path.id),
			options: {
				onMutate: () => ({ deletedId: 7 }),
				onError: (error: { status: number }, _variables, previous) => {
					expectTypeOf(error).toEqualTypeOf<{ status: number }>()
					expectTypeOf(previous).toEqualTypeOf<{ deletedId: number } | undefined>()
				},
			},
		},
	})
	expect(source.create?.mutation.onError).toBeTypeOf('function')
	expect(source.delete?.mutation.onError).toBeTypeOf('function')
})

it('allows an operation with its own preparation when no shared default exists', () => {
	const source = createGridSourceFactory({
		list: {
			prepareArgs: () => ({ limit: 20 }),
			getRows: (response: User[]) => response,
		},
	})({
		key: ['users'],
		getAll: () => Promise.resolve([] as User[]),
		delete: {
			fetcher: (args: { userId: string }) => Promise.resolve(args.userId),
			prepareArgs: ({ row }) => ({ userId: row.id }),
		},
	})
	expect(source.delete?.prepareArgs({ rowId: 'table-1', row: { id: 'api-1', name: 'Ada', version: 1 } })).toEqual({
		userId: 'api-1',
	})
})

it('inherits infinite conventions and overrides page preparation', async () => {
	const requests: { query: { limit: number; search: string; cursor: string | null } }[] = []
	const source = makeSource<User>()({
		key: ['users'],
		getAll: getUsers,
		getInfinite: {
			fetcher: (args) => {
				requests.push(args)
				return Promise.resolve({
					items: [{ id: args.query.cursor ?? 'first', name: 'Ada', version: 1 }],
					total: 2,
					next: args.query.cursor === null ? 'second' : null,
				})
			},
			preparePageArgs: ({ args, pageParam }) => ({
				query: { ...args.query, cursor: pageParam === null ? null : `api-${pageParam}` },
			}),
		},
	})
	if (!source.queries.infinite) throw new Error('Missing infinite source')
	const options = source.queries.infinite({ pageSize: 10, sorting: [], columnFilters: [], globalFilter: 'Ada' })
	const client = new QueryClient()
	const observer = new InfiniteQueryObserver(client, options)
	await observer.refetch()
	await observer.fetchNextPage()
	expect(requests.map((request) => request.query.cursor)).toEqual([null, 'api-second'])
	expect(options.queryKey).toEqual(['users', 'infinite', { query: { limit: 10, search: 'Ada' } }])
	expect(observer.getCurrentResult().data?.pages).toHaveLength(2)
	observer.destroy()
	client.clear()
})

it('inherits factory error mapping and allows source and operation replacements', () => {
	const factoryError = (error: unknown) => ({ factory: error })
	const sourceError = (error: unknown) => ({ source: error })
	const operationError = (error: unknown) => ({ operation: error })
	const factory = createGridSourceFactory({
		list: { prepareArgs: () => ({}), getRows: (rows: User[]) => rows },
		mutations: { delete: { prepareArgs: ({ row }) => row.id } },
		transformError: factoryError,
	})
	const getAll = () => Promise.resolve([] as User[])
	const inherited = factory({ key: ['users'], getAll, delete: (id: string) => Promise.resolve(id) })
	expect(inherited.transformError).toBe(factoryError)
	const overridden = factory({
		key: ['users'],
		getAll,
		transformError: sourceError,
		delete: { fetcher: (id: string) => Promise.resolve(id), transformError: operationError },
	})
	expect(overridden.transformError).toBe(sourceError)
	expect(overridden.delete?.transformError).toBe(operationError)
})

it('inherits list defaults and replaces explicit projections and options without merging callbacks', async () => {
	const defaults = { staleTime: Infinity, retry: false as const }
	const factory = createGridSourceFactory({
		list: {
			prepareArgs: ({ pagination }) => ({ offset: pagination.pageIndex * pagination.pageSize }),
			getRows: (page: Page<User>) => page.items,
			getRowCount: (page) => page.total,
			options: defaults,
		},
	})
	const response: Page<User> = { items: [{ id: '1', name: 'Ada', version: 1 }], total: 50, next: null }
	const fetcher = (args: { offset: number }) => Promise.resolve({ ...response, total: response.total + args.offset })
	const inherited = factory({ key: ['inherited'], getAll: fetcher })
	expect(inherited.queries.list(params)).toMatchObject({
		staleTime: Infinity,
		retry: false,
		queryKey: ['inherited', 'list', { offset: 20 }],
	})
	const overridden = factory({
		key: ['overridden'],
		getAll: {
			fetcher,
			prepareArgs: () => ({ offset: 7 }),
			options: {
				retry: 0,
				select: (page) => ({ ...page, items: page.items.map((row) => ({ ...row, name: 'Selected' })) }),
			},
			getRows: (page) => page.items.slice(0, 1),
			getRowCount: (page) => page.total - 1,
		},
	})
	const options = overridden.queries.list(params)
	expect(options.staleTime).toBeUndefined()
	expect(defaults).toEqual({ staleTime: Infinity, retry: false })
	const client = new QueryClient()
	const observer = new QueryObserver(client, options)
	await observer.refetch()
	const selected = observer.getCurrentResult().data
	if (!selected) throw new Error('Missing selected result')
	expect(overridden.getAll.getRows(selected)[0]?.name).toBe('Selected')
	expect(overridden.getAll.getRowCount?.(selected)).toBe(56)
	expect(client.getQueryData(options.queryKey)).toEqual({ ...response, total: 57 })
	observer.destroy()
	client.clear()
})

it('inherits bare infinite fetchers and replaces native options at the operation level', () => {
	const factory = createGridSourceFactory({
		list: { prepareArgs: () => ({}), getRows: (rows: User[]) => rows },
		infinite: {
			prepareArgs: ({ pageSize }) => ({ size: pageSize }),
			preparePageArgs: ({ args, pageParam }: { args: { size: number }; pageParam: number }) => ({
				...args,
				cursor: pageParam,
			}),
			initialPageParam: 0,
			getNextPageParam: (_rows: User[]) => undefined,
			getRows: (rows: User[]) => rows,
			options: { staleTime: Infinity, retry: false },
		},
	})
	const fetcher = () => Promise.resolve([] as User[])
	const bare = factory({ key: ['bare'], getAll: fetcher, getInfinite: fetcher })
	const expanded = factory({
		key: ['expanded'],
		getAll: fetcher,
		getInfinite: { fetcher, initialPageParam: 5, options: { retry: 0 } },
	})
	const criteria = { pageSize: 20, sorting: [], columnFilters: [], globalFilter: '' }
	expect(bare.queries.infinite?.(criteria)).toMatchObject({ initialPageParam: 0, staleTime: Infinity, retry: false })
	expect(expanded.queries.infinite?.(criteria)).toMatchObject({ initialPageParam: 5, retry: 0 })
	expect(expanded.queries.infinite?.(criteria).staleTime).toBeUndefined()
})
