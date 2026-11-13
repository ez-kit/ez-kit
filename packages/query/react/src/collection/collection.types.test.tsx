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
