import { expectTypeOf, it } from 'vitest'

import { useCollectionQuery } from './use-collection-query'

const source = {
	invalidation: [],
	getAll: {
		query: () => ({ queryKey: ['native-options'], queryFn: () => Promise.resolve([1]), enabled: false as const }),
		getItems: (rows: number[]) => rows,
	},
	getInfinite: {
		query: () => ({
			queryKey: ['native-options-infinite'],
			queryFn: () => Promise.resolve([1]),
			initialPageParam: 0,
			getNextPageParam: () => undefined,
		}),
		getItems: (rows: number[]) => rows,
	},
}
function useOptions() {
	useCollectionQuery({
		source,
		mode: 'pages',
		params: undefined,
		queryOptions: {
			enabled: true,
			refetchOnWindowFocus: (query) => {
				expectTypeOf(query.state.data).toEqualTypeOf<number[] | undefined>()
				return false
			},
		},
	})
	useCollectionQuery({
		source,
		mode: 'infinite',
		params: undefined,
		queryOptions: {
			enabled: true,
			refetchOnWindowFocus: (query) => {
				expectTypeOf(query.state.data?.pages[0]).toEqualTypeOf<number[] | undefined>()
				return false
			},
		},
	})
	useCollectionQuery({
		source,
		mode: 'pages',
		params: undefined,
		queryOptions: {
			// @ts-expect-error Even plain native descriptors require a boolean or predicate.
			enabled: 123,
		},
	})
	useCollectionQuery({
		source,
		mode: 'infinite',
		params: undefined,
		queryOptions: {
			// @ts-expect-error Source identity and projection cannot be overridden.
			select: () => [],
		},
	})
}
it('checks complete observer options for structural native sources', () => {
	expectTypeOf(useOptions).toBeFunction()
})
