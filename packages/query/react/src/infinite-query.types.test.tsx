import { infiniteQueryOptions } from '@tanstack/react-query'
import { expectTypeOf, it } from 'vitest'

import { InfiniteQuery } from './infinite-query'

import type { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'

type Page = { items: string[]; next: number | undefined }
const options = infiniteQueryOptions({
	queryKey: ['typed-pages'],
	queryFn: ({ pageParam }) => {
		expectTypeOf(pageParam).toEqualTypeOf<number>()
		return Promise.resolve<Page>({ items: [], next: pageParam + 1 })
	},
	initialPageParam: 0,
	getNextPageParam: (page) => page.next,
})

it('infers page data and passes the full native result to both render functions', () => {
	void (
		<InfiniteQuery
			query={options}
			error={(error, q) => {
				expectTypeOf(error).toEqualTypeOf<Error>()
				expectTypeOf(q).toEqualTypeOf<UseInfiniteQueryResult<InfiniteData<Page>>>()
				return null
			}}
		>
			{(data, q) => {
				expectTypeOf(data).toEqualTypeOf<InfiniteData<Page>>()
				expectTypeOf(q).toEqualTypeOf<UseInfiniteQueryResult<InfiniteData<Page>>>()
				expectTypeOf(q.fetchNextPage).toBeFunction()
				// @ts-expect-error — the page is typed from queryFn
				void data.pages[0]?.missing
				return null
			}}
		</InfiniteQuery>
	)
})

it('infers select output and inline page parameters', () => {
	void (
		<InfiniteQuery
			query={{
				queryKey: ['inline'],
				initialPageParam: 'cursor',
				queryFn: ({ pageParam }) => {
					expectTypeOf(pageParam).toEqualTypeOf<string>()
					return Promise.resolve([pageParam])
				},
				getNextPageParam: () => undefined,
				select: (data) => data.pages.flat(),
			}}
		>
			{(data, q) => {
				expectTypeOf(data).toEqualTypeOf<string[]>()
				expectTypeOf(q).toEqualTypeOf<UseInfiniteQueryResult<string[]>>()
				return null
			}}
		</InfiniteQuery>
	)
})

it('rejects render annotations that disagree with the query', () => {
	// @ts-expect-error — children cannot change the inferred data type
	void (<InfiniteQuery query={options}>{(data: string) => data}</InfiniteQuery>)
	void (
		<InfiniteQuery
			query={options}
			// @ts-expect-error — error type comes from query
			error={(error: string) => error}
		>
			{() => null}
		</InfiniteQuery>
	)
})
