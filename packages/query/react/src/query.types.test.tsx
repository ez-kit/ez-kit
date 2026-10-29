import { queryOptions } from '@tanstack/react-query'
import { describe, expectTypeOf, it } from 'vitest'

import { Query } from './query'
import { QueryProvider } from './query-provider'

import type { UseQueryResult } from '@tanstack/react-query'

type Device = { id: number; name: string }

const devicesQuery = queryOptions({
	queryKey: ['devices'],
	queryFn: (): Promise<Device[]> => Promise.resolve([]),
})

describe('Query — types inferred from query', () => {
	it('gives children the data without undefined', () => {
		void (
			<Query query={devicesQuery}>
				{(data) => {
					expectTypeOf(data).toEqualTypeOf<Device[]>()
					return data.length
				}}
			</Query>
		)
	})

	it('gives children the type select returns', () => {
		void (
			<Query query={{ ...devicesQuery, select: (d: Device[]) => d.length }}>
				{(count) => {
					expectTypeOf(count).toEqualTypeOf<number>()
					return count
				}}
			</Query>
		)
	})

	it('gives both render functions the useQuery result for the same options', () => {
		void (
			<Query
				query={devicesQuery}
				error={(_error, q) => {
					expectTypeOf(q).toEqualTypeOf<UseQueryResult<Device[]>>()
					return null
				}}
			>
				{(_data, q) => {
					expectTypeOf(q).toEqualTypeOf<UseQueryResult<Device[]>>()
					return null
				}}
			</Query>
		)
	})

	it("types the error as TanStack's default error when nothing is registered", () => {
		void (
			<Query
				query={devicesQuery}
				error={(error, q) => {
					expectTypeOf(error).toEqualTypeOf<Error>()
					expectTypeOf(q).toEqualTypeOf<UseQueryResult<Device[]>>()
					return error.message
				}}
			>
				{() => null}
			</Query>
		)
	})

	it('types the error from an explicit error parameter of queryOptions', () => {
		const typed = queryOptions<Device[], TypeError>({
			queryKey: ['typed'],
			queryFn: () => Promise.resolve([]),
		})
		void (
			<Query
				query={typed}
				error={(error) => {
					expectTypeOf(error).toEqualTypeOf<TypeError>()
					return null
				}}
			>
				{() => null}
			</Query>
		)
	})

	it('rejects a field the data does not have', () => {
		void (
			<Query query={devicesQuery}>
				{(data) => {
					// @ts-expect-error — `Device[]` has no `total`
					void data.total
					return null
				}}
			</Query>
		)
	})

	it('rejects children typed for other data', () => {
		void (
			(
				// @ts-expect-error — children expects `Device[]`, not `string`
				<Query query={devicesQuery}>{(data: string) => data}</Query>
			)
		)
	})

	it('takes the types from query, never from an annotation on a render function', () => {
		void (
			<Query
				query={devicesQuery}
				// @ts-expect-error — the error type is the query's `Error`, not `string`
				error={(error: string) => error}
			>
				{() => null}
			</Query>
		)
	})
})

describe('QueryProvider — types', () => {
	it("gives the shared error fallback TanStack's default error", () => {
		void (
			<QueryProvider
				error={(error, q) => {
					expectTypeOf(error).toEqualTypeOf<Error>()
					expectTypeOf(q).toEqualTypeOf<UseQueryResult>()
					return error.message
				}}
			/>
		)
	})

	it('rejects a shared error fallback typed for another error', () => {
		// @ts-expect-error — the provider cannot promise a query-specific error type
		void (<QueryProvider error={(error: TypeError & { code: string }) => error.code} />)
	})
})
