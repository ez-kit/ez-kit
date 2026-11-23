import { queryOptions, mutationOptions } from '@tanstack/react-query'
import { expectTypeOf, it } from 'vitest'

import { createCollectionSourceFactory } from './factory'
import { createCollectionSource } from './source'
import { useCollectionQuery } from './use-collection-query'

const source = createCollectionSource({
	key: ['users'],
	getAll: {
		prepareArgs: (p: { offset: number; team: string }) => ({ skip: p.offset, team: p.team }),
		fetcher: (_args: { skip: number; team: string }) => Promise.resolve({ items: [{ id: '1', name: 'A' }], total: 1 }),
		getItems: (r) => r.items,
		getTotal: (r) => r.total,
	},
	update: {
		prepareArgs: (input: { id: string; name: string }) => ({ path: input.id, body: { name: input.name } }),
		fetcher: (args: { path: string; body: { name: string } }) =>
			Promise.resolve({ id: args.path, name: args.body.name }),
		options: {
			onSuccess: (data, input) => {
				expectTypeOf(input.id).toEqualTypeOf<string>()
				expectTypeOf(data.name).toEqualTypeOf<string>()
			},
		},
	},
})
function Fixture() {
	const result = useCollectionQuery({ source, mode: 'pages', params: { offset: 0, team: 'one' } })
	expectTypeOf(result.items[0]).toEqualTypeOf<{ id: string; name: string } | undefined>()
	expectTypeOf(result.update.mutateAsync).parameter(0).toEqualTypeOf<{ id: string; name: string }>()
	// @ts-expect-error no create capability
	void result.create
	// @ts-expect-error incompatible params
	useCollectionQuery({ source, mode: 'pages', params: { pageIndex: 0 } })
	// @ts-expect-error no infinite capability
	useCollectionQuery({ source, mode: 'infinite', params: { offset: 0, team: 'one' } })
	return null
}
const infinite = createCollectionSource({
	key: ['feed'],
	getInfinite: {
		prepareArgs: (p: { topic: string }) => p,
		preparePageArgs: ({ args, pageParam }) => ({ topic: args.topic, cursor: pageParam }),
		initialPageParam: null as string | null,
		getNextPageParam: (page) => page.next,
		fetcher: (_args: { topic: string; cursor: string | null }) =>
			Promise.resolve({ items: [1], next: null as string | null }),
		getItems: (page) => page.items,
	},
})
function InfiniteFixture() {
	const result = useCollectionQuery({ source: infinite, mode: 'infinite', params: { topic: 'news' } })
	expectTypeOf(result.items).toEqualTypeOf<readonly number[]>()
	void result.query.fetchNextPage()
	return null
}
function MissingReadFixture() {
	// @ts-expect-error a collection needs at least one read
	createCollectionSource({ key: ['empty'] })
}
void MissingReadFixture
it('retains consumer contracts', () => {
	expectTypeOf(Fixture).toBeFunction()
	expectTypeOf(InfiniteFixture).toBeFunction()
})

const convention = createCollectionSourceFactory({
	list: {
		prepareArgs: (p: { page: number }) => ({ offset: p.page * 10 }),
		getItems: (response: { rows: { id: string }[] }) => response.rows,
	},
	mutations: { update: { prepareArgs: (input: { id: string }) => ({ userId: input.id }) } },
})
const conventionSource = convention({
	key: ['convention'],
	getAll: (_args: { offset: number }) => Promise.resolve({ rows: [{ id: '1' }] }),
	update: (args: { userId: string }) => Promise.resolve({ saved: args.userId }),
})
function ConventionFixture() {
	const result = useCollectionQuery({ source: conventionSource, mode: 'pages', params: { page: 0 } })
	expectTypeOf(result.items).toEqualTypeOf<readonly { id: string }[]>()
	expectTypeOf(result.update.mutateAsync).parameter(0).toEqualTypeOf<{ id: string }>()
	// @ts-expect-error convention defaults alone do not enable deletion
	void result.delete
	return null
}
void ConventionFixture

const selected = createCollectionSource({
	key: ['selected'],
	getAll: {
		prepareArgs: (params: { search: string }) => params,
		fetcher: (_args: { search: string }) => Promise.resolve({ values: [1, 2] }),
		options: { select: (response) => response.values.map(String) },
		getItems: (values) => values,
	},
	getInfinite: {
		prepareArgs: (params: { category: number }) => params,
		preparePageArgs: ({ args, pageParam }) => ({ ...args, cursor: pageParam }),
		initialPageParam: 0,
		getNextPageParam: (_page, _pages, cursor) => cursor + 1,
		fetcher: (_args: { category: number; cursor: number }) => Promise.resolve({ items: ['one'] }),
		options: { select: (data) => ({ ...data, pages: data.pages.map((page) => page.items) }) },
		getItems: (page) => page,
	},
})
function SelectedFixture(mode: 'pages' | 'infinite') {
	const result = useCollectionQuery(
		mode === 'pages'
			? { source: selected, mode, params: { search: 'x' } }
			: { source: selected, mode, params: { category: 1 } },
	)
	if (result.mode === 'pages') expectTypeOf(result.query.data).toEqualTypeOf<string[] | undefined>()
	else void result.query.fetchNextPage()
	return null
}
void SelectedFixture

function BadPreparationFixture() {
	createCollectionSource({
		key: ['bad'],
		getAll: {
			// @ts-expect-error preparation must match the fetcher DTO
			prepareArgs: (input: { id: string }) => ({ id: input.id }),
			fetcher: (_args: { id: number }) => Promise.resolve([1]),
			getItems: (items) => items,
		},
	})
}
void BadPreparationFixture

const overridden = convention({
	key: ['override'],
	getAll: (_args: { offset: number }) => Promise.resolve({ rows: [{ id: '1' }] }),
	create: {
		prepareArgs: (input: { name: string }) => ({ body: input.name }),
		fetcher: (args: { body: string }) => Promise.resolve({ id: args.body }),
	},
	update: {
		prepareArgs: (input: { numericId: number }) => input.numericId,
		fetcher: (id: number) => Promise.resolve(id),
	},
})
function OverrideFixture() {
	const result = useCollectionQuery({ source: overridden, mode: 'pages', params: { page: 0 } })
	expectTypeOf(result.update.mutateAsync).parameter(0).toEqualTypeOf<{ numericId: number }>()
	expectTypeOf(result.create.mutateAsync).parameter(0).toEqualTypeOf<{ name: string }>()
	return null
}
void OverrideFixture

const nativeSource = createCollectionSource({
	invalidate: false,
	getAll: {
		query: (params: { id: string }) =>
			queryOptions({ queryKey: ['native', params.id] as const, queryFn: () => Promise.resolve({ rows: [1] }) }),
		getItems: (response) => response.rows,
	},
	update: {
		mutation: mutationOptions({
			mutationKey: ['native-update'],
			mutationFn: (input: { id: string }) => Promise.resolve(input.id),
		}),
	},
})
function NativeFixture() {
	const result = useCollectionQuery({ source: nativeSource, mode: 'pages', params: { id: '1' } })
	expectTypeOf(result.items).toEqualTypeOf<readonly number[]>()
	expectTypeOf(result.update.mutateAsync).parameter(0).toEqualTypeOf<{ id: string }>()
	return null
}
void NativeFixture

// Explicit entity specialization is part of the supported application-factory API.
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
function entityConvention<Row>() {
	return createCollectionSourceFactory({
		list: {
			prepareArgs: (params: { offset: number }) => params,
			getItems: (page: { items: Row[] }) => page.items,
		},
	})
}
const products = entityConvention<{ sku: number }>()({
	key: ['products'],
	getAll: (_args: { offset: number }) => Promise.resolve({ items: [{ sku: 1 }] }),
})
const people = entityConvention<{ name: string }>()({
	key: ['people'],
	getAll: (_args: { offset: number }) => Promise.resolve({ items: [{ name: 'Ada' }] }),
})
function EntityFixture() {
	const product = useCollectionQuery({ source: products, mode: 'pages', params: { offset: 0 } })
	const person = useCollectionQuery({ source: people, mode: 'pages', params: { offset: 0 } })
	expectTypeOf(product.items).toEqualTypeOf<readonly { sku: number }[]>()
	expectTypeOf(person.items).toEqualTypeOf<readonly { name: string }[]>()
	return null
}
void EntityFixture

function ConditionalCapabilitiesFixture(canDelete: boolean, canLoadMore: boolean) {
	const optional = createCollectionSource({
		key: ['optional'],
		invalidate: false,
		getAll: source.getAll,
		...(canDelete ? { delete: { prepareArgs: (id: string) => id, fetcher: (id: string) => Promise.resolve(id) } } : {}),
		...(canLoadMore ? { getInfinite: infinite.getInfinite } : {}),
	})
	const result = useCollectionQuery({ source: optional, mode: 'pages', params: { offset: 0, team: 'one' } })
	// @ts-expect-error permissions can omit deletion
	result.delete.mutate('1')
	result.delete?.mutate('1')
	// @ts-expect-error a conditional read must be narrowed before selecting its mode
	useCollectionQuery({ source: optional, mode: 'infinite', params: { topic: 'news' } })
	// @ts-expect-error optional query helper must also be checked
	optional.queries.infinite({ topic: 'news' })

	const optionalFactory = convention({
		key: ['optional-convention'],
		getAll: (_args: { offset: number }) => Promise.resolve({ rows: [{ id: '1' }] }),
		...(canDelete ? { delete: { prepareArgs: (id: string) => id, fetcher: (id: string) => Promise.resolve(id) } } : {}),
	})
	const fromFactory = useCollectionQuery({ source: optionalFactory, mode: 'pages', params: { page: 0 } })
	// @ts-expect-error the factory must preserve optional capabilities too
	fromFactory.delete.mutate('1')
	fromFactory.delete?.mutate('1')
}
void ConditionalCapabilitiesFixture

function InvalidIdentityFixture() {
	const read = {
		prepareArgs: () => ({}),
		fetcher: (_args: Record<string, never>) => Promise.resolve([1]),
		getItems: (rows: number[]) => rows,
	}
	// @ts-expect-error generated reads require a base key
	createCollectionSource({ getAll: read })
	// @ts-expect-error native reads require an invalidation policy
	createCollectionSource({ getAll: source.getAll })
	createCollectionSource({ getAll: source.getAll, invalidate: false })
	const emptyConvention = createCollectionSourceFactory({})
	// @ts-expect-error a bare fetcher cannot inherit a missing list convention
	emptyConvention({ key: ['incomplete'], getAll: (_args: unknown) => Promise.resolve([1]) })
	emptyConvention({
		key: ['incomplete'],
		// @ts-expect-error projections alone do not provide preparation
		getAll: { fetcher: (_args: unknown) => Promise.resolve([1]), getItems: (_data: unknown) => [1] },
	})
	// A complete read remains legal even without shared defaults.
	const complete = emptyConvention({
		key: ['complete'],
		getAll: {
			prepareArgs: (params: { offset: number }) => params.offset,
			fetcher: (offset: number) => Promise.resolve([{ id: offset }]),
			getItems: (data) => data,
		},
	})
	expectTypeOf(complete.getAll.query).parameter(0).toEqualTypeOf<{ offset: number }>()
	expectTypeOf(complete.getAll.getItems).returns.toEqualTypeOf<readonly { id: number }[]>()
	const standaloneInfinite = emptyConvention({
		key: ['standalone-infinite'],
		getInfinite: {
			prepareArgs: (params: { search: string }) => params,
			preparePageArgs: ({ args, pageParam }) => ({ ...args, cursor: pageParam }),
			initialPageParam: 0,
			fetcher: (args: { search: string; cursor: number }) => Promise.resolve([{ id: args.search }]),
			getItems: (rows) => rows,
			getNextPageParam: () => undefined,
		},
	})
	expectTypeOf(standaloneInfinite.getInfinite.query).parameter(0).toEqualTypeOf<{ search: string }>()
	expectTypeOf(standaloneInfinite.getInfinite.getItems).returns.toEqualTypeOf<readonly { id: string }[]>()
	const fetchPage = () => Promise.resolve([1])
	// @ts-expect-error a bare infinite fetcher needs an inherited infinite convention
	emptyConvention({ key: ['incomplete-feed'], getInfinite: fetchPage })
}
void InvalidIdentityFixture

const asyncReadSource = createCollectionSource({
	key: ['async-transport'],
	getAll: {
		prepareArgs: (params: { offset: number }) => params,
		fetcher: async (params: { offset: number }, { signal }) => {
			await Promise.resolve()
			signal.throwIfAborted()
			return { items: [{ id: params.offset, name: 'Ada' }], total: 1 }
		},
		getItems: (response) => response.items,
		getTotal: (response) => response.total,
	},
})
expectTypeOf(asyncReadSource.getAll.getItems).returns.toEqualTypeOf<readonly { id: number; name: string }[]>()

function ObserverOptionsFixture() {
	const result = useCollectionQuery({
		source: asyncReadSource,
		mode: 'pages',
		params: { offset: 0 },
		queryOptions: {
			enabled: (query) => query.state.data?.total !== 0,
			staleTime: 30000,
			retry: (_count, error) => error.message !== 'stop',
		},
	})
	expectTypeOf(result.items).toEqualTypeOf<readonly { id: number; name: string }[]>()
	useCollectionQuery({
		source: asyncReadSource,
		mode: 'pages',
		params: { offset: 0 },
		queryOptions: {
			// @ts-expect-error cache identity belongs to the source
			queryKey: ['other'],
		},
	})
	useCollectionQuery({
		source: asyncReadSource,
		mode: 'pages',
		params: { offset: 0 },
		queryOptions: {
			// @ts-expect-error selection belongs to source projections
			select: () => [],
		},
	})
}
void ObserverOptionsFixture

const selectConvention = createCollectionSourceFactory({
	list: {
		prepareArgs: (offset: number) => ({ offset }),
		getItems: (data: { items: number[]; total: number }) => data.items,
		getTotal: (data) => data.total,
	},
	infinite: {
		prepareArgs: (search: string) => ({ search }),
		preparePageArgs: ({ args, pageParam }: { args: { search: string }; pageParam: number }) => ({
			...args,
			cursor: pageParam,
		}),
		initialPageParam: 0,
		getNextPageParam: (page: { items: number[]; next: number | null }) => page.next,
		getItems: (page) => page.items,
	},
})
const selectedConventionSource = selectConvention({
	key: ['selected-convention'],
	getAll: {
		fetcher: () => Promise.resolve({ items: [1], total: 1 }),
		options: { select: (data) => data.items.map(String) },
		getItems: (data) => data,
	},
	getInfinite: {
		fetcher: () => Promise.resolve({ items: [1], next: null }),
		options: { select: (data) => ({ ...data, pages: data.pages.map((page) => page.items.map(String)) }) },
		getItems: (page) => page,
	},
})
expectTypeOf(selectedConventionSource.getAll.getItems).parameter(0).toEqualTypeOf<string[]>()
expectTypeOf(selectedConventionSource.getAll.getItems).returns.toEqualTypeOf<readonly string[]>()
expectTypeOf(selectedConventionSource.getInfinite.getItems).parameter(0).toEqualTypeOf<string[]>()
expectTypeOf(selectedConventionSource.getInfinite.getItems).returns.toEqualTypeOf<readonly string[]>()
function InvalidSelectionFixture(selectNames: boolean) {
	const options = selectNames
		? { select: (data: { items: number[]; total: number }) => data.items }
		: { staleTime: 1000 }
	selectConvention({
		key: ['conditional-selection'],
		// @ts-expect-error a potentially selected shape needs its own projection too
		getAll: { fetcher: () => Promise.resolve({ items: [1], total: 1 }), options },
	})

	selectConvention({
		key: ['wrong-projection'],
		// @ts-expect-error a projection cannot change the selected input shape without select
		getAll: {
			fetcher: () => Promise.resolve({ items: [1], total: 1 }),
			getItems: (items: string[]) => items,
		},
	})

	selectConvention({
		key: ['missing-projection'],
		// @ts-expect-error selecting another shape requires a new projection
		getAll: { fetcher: () => Promise.resolve({ items: [1], total: 1 }), options: { select: (data) => data.items } },
	})
}
void InvalidSelectionFixture

const selectedStandaloneSource = createCollectionSourceFactory({})({
	key: ['standalone-selected'],
	getAll: {
		prepareArgs: (id: number) => id,
		fetcher: (id: number) => Promise.resolve({ items: [id] }),
		options: { select: (data) => data.items.map(String) },
		getItems: (items) => items,
	},
})
expectTypeOf(selectedStandaloneSource.getAll.getItems).returns.toEqualTypeOf<readonly string[]>()

function SelectionSafetyFixture(flag: boolean) {
	createCollectionSource({
		key: ['invalid-projection'],
		getAll: {
			prepareArgs: (page: number) => page,
			fetcher: () => Promise.resolve({ items: [1] }),
			// @ts-expect-error without select, a projection receives the raw envelope
			getItems: (items: string[]) => items.map((item) => item.toUpperCase()),
		},
	})
	const options = flag ? { select: (data: { items: number[]; total: number }) => data.items.map(String) } : {}
	const conditionalRead = {
		prepareArgs: () => undefined,
		fetcher: () => Promise.resolve({ items: [1], total: 1 }),
		options,
		getItems: (names: string[]) => names.map((name) => name.toUpperCase()),
	}
	selectConvention({
		key: ['conditional-selector'],
		// @ts-expect-error a changed selected shape requires select in every branch
		getAll: conditionalRead,
	})
	createCollectionSource({
		key: ['conditional-direct-selector'],
		// @ts-expect-error the standalone source has the same guaranteed-selector contract
		getAll: conditionalRead,
	})
	const infiniteOptions = flag
		? {
				select: (data: { pages: { items: number[]; next: number | null }[]; pageParams: unknown[] }) => ({
					...data,
					pages: data.pages.map((page) => page.items.map(String)),
				}),
			}
		: {}
	const conditionalInfiniteRead = {
		fetcher: () => Promise.resolve({ items: [1], next: null }),
		options: infiniteOptions,
		getItems: (names: string[]) => names.map((name) => name.toUpperCase()),
	}
	selectConvention({
		key: ['conditional-infinite-selector'],
		// @ts-expect-error selected infinite pages also require a guaranteed selector
		getInfinite: conditionalInfiniteRead,
	})
	createCollectionSource({
		key: ['conditional-direct-infinite-selector'],
		// @ts-expect-error standalone infinite pages also require a guaranteed selector
		getInfinite: {
			...conditionalInfiniteRead,
			prepareArgs: () => undefined,
			preparePageArgs: () => undefined,
			initialPageParam: 0,
			getNextPageParam: () => undefined,
		},
	})
	createCollectionSource({
		key: ['invalid-infinite-projection'],
		getInfinite: {
			prepareArgs: () => undefined,
			preparePageArgs: () => undefined,
			fetcher: () => Promise.resolve({ items: [1] }),
			initialPageParam: 0,
			getNextPageParam: () => undefined,
			// @ts-expect-error raw infinite page is an envelope without select
			getItems: (items: string[]) => items,
		},
	})
	// Conditional selection is safe when the projection accepts either possible shape.
	const safeOptions = flag
		? {
				select: (data: { items: number[]; total: number }): { items: number[]; total: number } | string[] =>
					data.items.map(String),
			}
		: {}
	const safe = selectConvention({
		key: ['safe-conditional-selector'],
		getAll: {
			fetcher: () => Promise.resolve({ items: [1], total: 1 }),
			options: safeOptions,
			getItems: (data) => (Array.isArray(data) ? data : data.items.map(String)),
			getTotal: (data) => (Array.isArray(data) ? undefined : data.total),
		},
	})
	expectTypeOf(safe.getAll.getItems).returns.toEqualTypeOf<readonly string[]>()
}
void SelectionSafetyFixture

function NativeProjectionSafetyFixture() {
	const options = { queryKey: ['native-raw'], queryFn: () => Promise.resolve({ items: [1] }) }
	createCollectionSource({
		invalidate: false,
		getAll: {
			query: () => options,
			// @ts-expect-error native raw options determine the projection input
			getItems: (items: string[]) => items.map((item) => item.toUpperCase()),
		},
	})
	createCollectionSource({
		invalidate: false,
		getInfinite: {
			query: () => ({ ...options, initialPageParam: 0, getNextPageParam: () => undefined }),
			// @ts-expect-error native infinite options determine the page projection input
			getItems: (items: string[]) => items,
		},
	})
	const valid = createCollectionSource({
		invalidate: false,
		getAll: {
			query: () => options,
			getItems: (data) => data.items,
		},
	})
	expectTypeOf(valid.getAll.getItems).parameter(0).toEqualTypeOf<{ items: number[] }>()
	const selected = createCollectionSource({
		invalidate: false,
		getAll: {
			query: () => ({ ...options, select: (data) => data.items.map(String) }),
			getItems: (data) => data,
		},
	})
	expectTypeOf(selected.getAll.getItems).returns.toEqualTypeOf<readonly string[]>()
}
void NativeProjectionSafetyFixture

function InheritedTotalSafetyFixture(flag: boolean) {
	const make = createCollectionSourceFactory({
		list: {
			prepareArgs: () => undefined,
			getItems: (data: { items: string[]; meta: { total: number } }) => data.items,
			getTotal: (data) => data.meta.total,
		},
	})
	const read = {
		fetcher: () => Promise.resolve({ items: ['one'], meta: { total: 1 } }),
		options: flag
			? {
					select: (data: {
						items: string[]
						meta: { total: number }
					}): { items: string[]; meta: { total: number } } | string[] => data.items,
				}
			: {},
		getItems: (data: { items: string[]; meta: { total: number } } | string[]) =>
			Array.isArray(data) ? data : data.items,
	}
	make({
		key: ['unsafe-total'],
		// @ts-expect-error inherited raw-only total cannot accept the expanded selected union
		getAll: read,
	})
	const maybeTotal = createCollectionSourceFactory({
		list: {
			prepareArgs: () => undefined,
			getItems: (data: { items: string[]; meta: { total: number } }) => data.items,
			...(flag ? { getTotal: (data: { items: string[]; meta: { total: number } }) => data.meta.total } : {}),
		},
	})
	maybeTotal({
		key: ['optional-unsafe-total'],
		// @ts-expect-error a possibly inherited getter must also accept the selected input
		getAll: read,
	})
	const safe = make({
		key: ['safe-total'],
		getAll: {
			...read,
			getTotal: (data) => (Array.isArray(data) ? undefined : data.meta.total),
		},
	})
	safe.getAll.getTotal?.(['one'])
}
void InheritedTotalSafetyFixture

function useReadBranches(select?: (raw: { items: number[] }) => string[]) {
	const getAll = {
		query: () => ({
			queryKey: ['optional-select'],
			queryFn: () => Promise.resolve({ items: [1] }),
			...(select ? { select } : {}),
		}),
		getItems: (data: { items: number[] } | string[]) => (Array.isArray(data) ? data : data.items),
	}
	const selected = useCollectionQuery({ source: { getAll, invalidation: [] }, mode: 'pages', params: undefined })
	expectTypeOf(selected.query.data).toEqualTypeOf<{ items: number[] } | string[] | undefined>()

	const seeded = {
		query: () => ({ queryKey: ['cache-only'], initialData: () => ({ items: [1] }), enabled: false }),
		getItems: (data: { items: number[] }) => data.items,
	}
	const cached = useCollectionQuery({ source: { getAll: seeded, invalidation: [] }, mode: 'pages', params: undefined })
	expectTypeOf(cached.query.data).toEqualTypeOf<{ items: number[] } | undefined>()

	const bad = {
		...getAll,
		query: () => ({ ...getAll.query(), initialData: ['wrong'] }),
	}
	// @ts-expect-error initialData holds the raw cache value even when a selector is supplied
	useCollectionQuery({ source: { getAll: bad, invalidation: [] }, mode: 'pages', params: undefined })
}

it('uses the same read branches for native projection inputs and the public query result', () => {
	expectTypeOf(useReadBranches).toBeFunction()
})
