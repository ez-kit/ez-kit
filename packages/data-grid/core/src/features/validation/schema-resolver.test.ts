import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { runValidator, schemaResolver } from './schema-resolver'

import type { StandardSchemaV1, StandardSchemaV1Issue } from './standard-schema'

/** A schema shaped the way valibot reports: object path segments, synchronous answer. */
function fakeSchema(issues: readonly StandardSchemaV1Issue[] | undefined): StandardSchemaV1 {
	return {
		'~standard': {
			version: 1,
			vendor: 'fake',
			validate: (value) => (issues ? { issues } : { value }),
		},
	}
}

/** The same, answering with a promise — what an async refinement makes a schema do. */
function asyncSchema(issues: readonly StandardSchemaV1Issue[] | undefined): StandardSchemaV1 {
	return {
		'~standard': {
			version: 1,
			vendor: 'fake-async',
			validate: (value) => Promise.resolve(issues ? { issues } : { value }),
		},
	}
}

const ctx = { signal: new AbortController().signal }

describe('schemaResolver', () => {
	it('resolves to null on valid input (zod)', async () => {
		const schema = z.object({ email: z.email(), age: z.number().int().min(0) })
		expect(await schemaResolver(schema)({ email: 'a@b.co', age: 25 })).toBeNull()
	})

	it('groups a single failure under the columnId key as a string array (zod)', async () => {
		const schema = z.object({ email: z.email() })
		const result = await schemaResolver(schema)({ email: 'not-an-email' })
		expect(result?.errors?.email).toHaveLength(1)
	})

	it('keeps every message of one field, in order (zod)', async () => {
		const schema = z.object({
			password: z.string().min(8, 'too short').regex(/[A-Z]/, 'needs uppercase'),
		})
		const result = await schemaResolver(schema)({ password: 'abc' })
		expect(result?.errors?.password).toEqual(['too short', 'needs uppercase'])
	})

	it('keys a nested path by its first segment (zod)', async () => {
		const schema = z.object({ address: z.object({ street: z.string().min(1, 'street required') }) })
		const result = await schemaResolver(schema)({ address: { street: '' } })
		expect(result?.errors).toEqual({ address: ['street required'] })
	})

	it('puts an issue without a path into formError (zod refine)', async () => {
		const schema = z
			.object({ password: z.string(), confirm: z.string() })
			.refine((v) => v.password === v.confirm, { message: 'Passwords do not match' })
		const result = await schemaResolver(schema)({ password: 'a', confirm: 'b' })
		expect(result).toEqual({ errors: {}, formError: 'Passwords do not match' })
	})

	it('leaves formError absent when every issue has a path', async () => {
		const result = await schemaResolver(z.object({ x: z.string() }))({ x: 42 })
		expect(result?.errors?.x).toBeDefined()
		expect(result).not.toHaveProperty('formError')
	})

	it('normalises `{ key }` path segments (valibot-like)', async () => {
		const schema = fakeSchema([
			{ message: 'invalid email', path: [{ key: 'email' }] },
			{ message: 'street required', path: [{ key: 'address' }, { key: 'street' }] },
		])
		expect(await schemaResolver(schema)({})).toEqual({
			errors: { email: ['invalid email'], address: ['street required'] },
		})
	})

	it('joins several form-level issues with a newline', async () => {
		const schema = fakeSchema([
			{ message: 'first' },
			{ message: 'second', path: [] },
			{ message: 'field', path: ['name'] },
		])
		expect(await schemaResolver(schema)({})).toEqual({
			errors: { name: ['field'] },
			formError: 'first\nsecond',
		})
	})

	it('awaits an asynchronous schema', async () => {
		const schema = asyncSchema([{ message: 'taken', path: ['email'] }])
		expect(await schemaResolver(schema)({})).toEqual({ errors: { email: ['taken'] } })
		expect(await schemaResolver(asyncSchema(undefined))({})).toBeNull()
	})
})

describe('runValidator', () => {
	it('calls a function validator with the values and the context', async () => {
		const result = await runValidator<{ a: number }>(
			(values, c) => ({ formError: `${String(values.a)}:${String(c.cell)}` }),
			{ a: 1 },
			ctx,
		)
		expect(result).toEqual({ formError: '1:undefined' })
	})

	it('awaits an async function validator', async () => {
		expect(await runValidator(() => Promise.resolve(null), {}, ctx)).toBeNull()
	})

	it('runs the `{ schema }` shorthand through the Standard Schema interface', async () => {
		const schema = fakeSchema([{ message: 'bad', path: ['x'] }])
		expect(await runValidator({ schema }, {}, ctx)).toEqual({ errors: { x: ['bad'] } })
	})
})

describe('a schema without the Standard Schema interface', () => {
	it('fails with a message naming what is missing', async () => {
		const legacy = { safeParse: () => ({ success: true }) } as unknown as StandardSchemaV1
		await expect(schemaResolver(legacy)({})).rejects.toThrow(/no `~standard.validate`/)
	})
})
