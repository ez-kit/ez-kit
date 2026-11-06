import { mutationOptions } from '@tanstack/react-query'
import { expectTypeOf, it } from 'vitest'

import { Mutation } from './mutation'

import type { UseMutationResult } from '@tanstack/react-query'

it('infers data, variables, default error and optimistic context from mutation options', () => {
	const options = mutationOptions({
		mutationFn: (id: number) => Promise.resolve({ id }),
		onMutate: (id) => ({ previous: id }),
	})
	void (
		<Mutation mutation={options}>
			{(m) => {
				expectTypeOf(m).toEqualTypeOf<UseMutationResult<{ id: number }, Error, number, { previous: number }>>()
				expectTypeOf(m.mutateAsync).returns.toEqualTypeOf<Promise<{ id: number }>>()
				if (m.isSuccess) expectTypeOf(m.data).toEqualTypeOf<{ id: number }>()
				// @ts-expect-error — variables are inferred from mutationFn
				m.mutate('wrong')
				return null
			}}
		</Mutation>
	)
})

it('supports mutations without variables', () => {
	void (
		<Mutation mutation={{ mutationFn: () => Promise.resolve('done') }}>
			{(m) => {
				expectTypeOf(m).toEqualTypeOf<UseMutationResult<string, Error, void>>()
				return null
			}}
		</Mutation>
	)
})

it('preserves explicit error types and rejects incompatible children annotations', () => {
	const options = mutationOptions<string, TypeError, number>({ mutationFn: (id) => Promise.resolve(String(id)) })
	void (
		<Mutation mutation={options}>
			{(m) => {
				expectTypeOf(m.error).toEqualTypeOf<TypeError | null>()
				return null
			}}
		</Mutation>
	)
	// @ts-expect-error — children cannot change the types inferred from mutation
	void (<Mutation mutation={options}>{(m: UseMutationResult<number>) => m.data}</Mutation>)
})
