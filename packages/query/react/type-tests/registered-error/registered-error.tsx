import { queryOptions } from '@tanstack/react-query'
import { expectTypeOf } from 'vitest'

import { InfiniteQuery, Mutation, Query, QueryProvider } from '../../src'
import { createCollectionSource, useCollectionQuery } from '../../src/collection'

import type { InfiniteData, UseInfiniteQueryResult, UseMutationResult, UseQueryResult } from '@tanstack/react-query'

/**
 * Registering an error type is program-wide, so it lives in its own project: in the package's
 * main program it would hide the unregistered default from every other type test.
 */
type ApiError = Error & { code: string }

declare module '@tanstack/react-query' {
	// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- only an interface merges into TanStack's `Register`
	interface Register {
		defaultError: ApiError
	}
}

const devicesQuery = queryOptions({
	queryKey: ['devices'],
	queryFn: (): Promise<string[]> => Promise.resolve([]),
})

export const gate = (
	<Query
		query={devicesQuery}
		error={(error, q) => {
			expectTypeOf(error).toEqualTypeOf<ApiError>()
			expectTypeOf(q).toEqualTypeOf<UseQueryResult<string[]>>()
			return error.code
		}}
	>
		{() => null}
	</Query>
)

export const provider = (
	<QueryProvider
		error={(error) => {
			expectTypeOf(error).toEqualTypeOf<ApiError>()
			return error.code
		}}
	/>
)

export const mutation = (
	<Mutation mutation={{ mutationFn: () => Promise.resolve('saved') }}>
		{(m) => {
			expectTypeOf(m).toEqualTypeOf<UseMutationResult<string, ApiError, void>>()
			return m.error?.code
		}}
	</Mutation>
)

export const infinite = (
	<InfiniteQuery
		query={{
			queryKey: ['registered-pages'],
			queryFn: () => Promise.resolve('page'),
			initialPageParam: 0,
			getNextPageParam: () => undefined,
		}}
		error={(error, q) => {
			expectTypeOf(error).toEqualTypeOf<ApiError>()
			expectTypeOf(q).toEqualTypeOf<UseInfiniteQueryResult<InfiniteData<string>>>()
			return error.code
		}}
	>
		{() => null}
	</InfiniteQuery>
)

const collectionSource = createCollectionSource({
	key: ['registered-collection'],
	getAll: {
		prepareArgs: (params: { offset: number }) => params,
		fetcher: (_args: { offset: number }) => Promise.resolve(['one']),
		getItems: (items) => items,
	},
	update: {
		prepareArgs: (input: string) => input,
		fetcher: (input: string) => Promise.resolve(input),
	},
})
export function RegisteredCollection() {
	const collection = useCollectionQuery({ source: collectionSource, mode: 'pages', params: { offset: 0 } })
	expectTypeOf(collection.query.error).toEqualTypeOf<ApiError | null>()
	expectTypeOf(collection.update.error).toEqualTypeOf<ApiError | null>()
	return null
}
