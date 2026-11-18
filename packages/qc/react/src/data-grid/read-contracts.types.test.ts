import { createCollectionSource } from '@ez-kit/query-react/collection'
import { expectTypeOf, it } from 'vitest'

import { createGridDataSource, createInfiniteSource, createListSource } from './index'

type Row = { id: string }
type Response = { items: Row[] }
const raw = () => Promise.resolve({ items: [{ id: '1' }] })
const rows = (data: Row[]) => data
const base = { key: ['projection'], prepareArgs: () => undefined, fetcher: raw }

// Shared negative contracts: every public entry must reject fabricated selected shapes.
function invalidSources(select: ((data: Response) => Row[]) | undefined) {
	const list = { ...base, getRows: rows }
	// @ts-expect-error Raw object data cannot be projected as an array without select.
	createListSource(list)
	const collection = { key: base.key, getAll: { ...base, getItems: rows } }
	// @ts-expect-error The collection entry enforces the same contract.
	createCollectionSource(collection)
	const infinite = { ...list, preparePageArgs: () => undefined, initialPageParam: 0, getNextPageParam: () => undefined }
	// @ts-expect-error Infinite pages are raw objects too.
	createInfiniteSource(infinite)
	const native = {
		invalidate: false as const,
		getAll: { query: () => ({ queryKey: base.key, queryFn: raw }), getRows: rows },
	}
	// @ts-expect-error Native plain options determine the projection input.
	createGridDataSource(native)
	const conditional = { ...list, options: select ? { select } : {} }
	// @ts-expect-error An array-only getter requires a guaranteed selector.
	createListSource(conditional)
	const conditionalInfinite = {
		...infinite,
		options: select
			? { select: (data: { pages: Response[]; pageParams: unknown[] }) => ({ ...data, pages: data.pages.map(select) }) }
			: {},
	}
	// @ts-expect-error A conditional page selector cannot guarantee an array.
	createInfiniteSource(conditionalInfinite)
	const wrongTotal = { ...base, getRows: (data: Response) => data.items, getRowCount: (data: Row[]) => data.length }
	// @ts-expect-error Counts cannot widen or replace the read's selected type.
	createListSource(wrongTotal)
}

it('preserves valid raw and selected projections across public read entries', () => {
	const list = createListSource({ ...base, options: { select: (data) => data.items }, getRows: rows })
	const rawList = createListSource({ ...base, getRows: (data) => data.items })
	const infinite = createInfiniteSource({
		...base,
		preparePageArgs: () => undefined,
		initialPageParam: 0,
		getNextPageParam: () => undefined,
		options: { select: (data) => ({ ...data, pages: data.pages.map((page) => page.items) }) },
		getRows: rows,
	})
	expectTypeOf(list.getRows).parameter(0).toEqualTypeOf<Row[]>()
	expectTypeOf(rawList.getRows).parameter(0).toEqualTypeOf<Response>()
	expectTypeOf(infinite.getRows).parameter(0).toEqualTypeOf<Row[]>()
	expectTypeOf(invalidSources).toBeFunction()
})
