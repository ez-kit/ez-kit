import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { zodResolver } from './zod-resolver'

describe('zodResolver', () => {
	it('returns null on valid input (flat schema)', () => {
		const schema = z.object({
			email: z.email(),
			age: z.number().int().min(0),
		})
		const resolver = zodResolver(schema)
		const result = resolver({ email: 'a@b.co', age: 25 })
		expect(result).toBeNull()
	})

	it('groups single failure under the columnId key as a string array', () => {
		const schema = z.object({
			email: z.email(),
		})
		const resolver = zodResolver(schema)
		const result = resolver({ email: 'not-an-email' })
		expect(result).not.toBeNull()
		expect(result?.errors?.email).toBeDefined()
		expect(Array.isArray(result?.errors?.email)).toBe(true)
		expect(result?.errors?.email).toHaveLength(1)
	})

	it('collects multi-issue per field into a string array (multi-message)', () => {
		const schema = z.object({
			password: z
				.string()
				.min(8, 'too short')
				.regex(/[A-Z]/, 'needs uppercase'),
		})
		const resolver = zodResolver(schema)
		const result = resolver({ password: 'abc' })
		expect(result).not.toBeNull()
		const messages = result?.errors?.password ?? []
		expect(messages).toContain('too short')
		expect(messages).toContain('needs uppercase')
		expect(messages).toHaveLength(2)
	})

	it('takes only path[0] as key for nested paths', () => {
		const schema = z.object({
			address: z.object({
				street: z.string().min(1, 'street required'),
			}),
		})
		const resolver = zodResolver(schema)
		const result = resolver({ address: { street: '' } })
		expect(result).not.toBeNull()
		// Key must be 'address' (top-level), not 'address.street'
		expect(result?.errors?.address).toEqual(['street required'])
		expect(result?.errors?.['address.street']).toBeUndefined()
	})

	it('skips issues with empty path (form-level zod errors)', () => {
		const schema = z
			.object({
				password: z.string(),
				confirm: z.string(),
			})
			.refine((v) => v.password === v.confirm, { message: 'mismatch' })
		const resolver = zodResolver(schema)
		const result = resolver({ password: 'a', confirm: 'b' })
		expect(result).not.toBeNull()
		// refine without path → empty path → no key set
		expect(result?.errors).toEqual({})
	})

	it('returns ValidationResult shape (errors only, no formError)', () => {
		const schema = z.object({ x: z.string() })
		const resolver = zodResolver(schema)
		const result = resolver({ x: 42 })
		expect(result).not.toBeNull()
		expect(result?.errors).toBeDefined()
		expect(result?.formError).toBeUndefined()
	})
})
