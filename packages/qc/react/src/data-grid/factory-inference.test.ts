import { expectTypeOf, it } from 'vitest'

import { createListSource, createInfiniteSource, createGridDataSource } from './index'

it('specializes a shared generic projection from the entity fetcher', () => {
	const getRows = <T extends object>(response: { items: T[] }) => response.items
	const source = createListSource({
		key: ['users'],
		fetcher: (_args: { limit: number }) => Promise.resolve({ items: [{ id: '1', name: 'Ada' }] }),
		prepareArgs: () => ({ limit: 20 }),
		getRows,
	})
	expectTypeOf(source.getRows).returns.toEqualTypeOf<readonly { id: string; name: string }[]>()
})

it('preserves an explicitly typed API convention in the public factory', async () => {
	const { createGridSourceFactory } = await import('./factory')
	type User = { id: string; name: string }
	const make = createGridSourceFactory({
		list: {
			prepareArgs: () => ({ limit: 20 }),
			getRows: (response: { items: User[] }) => response.items,
		},
	})
	const source = make({
		key: ['users'],
		getAll: (_args: { limit: number }) => Promise.resolve({ items: [{ id: '1', name: 'Ada' }] }),
	})
	expectTypeOf(source.getAll.getRows).returns.toEqualTypeOf<readonly User[]>()
})

it('normalizes exceptional endpoint DTOs through the public helpers without losing row or cursor types', () => {
	type User = { id: number; name: string }
	const source = createGridDataSource({
		getAll: createListSource({
			key: ['special-users'],
			fetcher: (_args: { body: { skip: number } }) => Promise.resolve({ records: [{ id: 1, name: 'Ada' }] }),
			prepareArgs: ({ pagination }) => ({ body: { skip: pagination.pageIndex * pagination.pageSize } }),
			options: { select: (response) => response.records },
			getRows: (rows) => rows,
		}),
		getInfinite: createInfiniteSource({
			key: ['special-users'],
			fetcher: (_args: { term: string; after: number }) =>
				Promise.resolve({ records: [{ id: 1, name: 'Ada' }], next: 2 }),
			prepareArgs: ({ globalFilter }) => ({ term: String(globalFilter ?? '') }),
			preparePageArgs: ({ args, pageParam }) => ({ ...args, after: pageParam }),
			initialPageParam: 0,
			getNextPageParam: (response) => response.next,
			getRows: (page) => page.records,
		}),
		invalidate: { replace: [{ queryKey: ['special-users'] }] },
	})
	expectTypeOf(source.getAll.getRows).returns.toEqualTypeOf<readonly User[]>()
})
