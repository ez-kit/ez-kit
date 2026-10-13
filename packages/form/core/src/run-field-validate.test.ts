import { describe, expect, test } from 'vitest'

import { runFieldValidate } from './validate'

/**
 * The per-field entry point into the same constraint engine `buildValidator` compiles a
 * schema into. `buildValidator` reaches it by walking a document; this is what the JSX
 * `validate` prop calls with one field's value, and the two must agree by construction —
 * they share `runConstraints`, so these tests pin the *entry point*, not the constraints
 * (`validate.test.ts` covers those through the schema side).
 */

test('returns undefined when every constraint holds', () => {
	expect(runFieldValidate('a@b.co', {}, { required: true, format: 'email' })).toBeUndefined()
})

test('reports required before any other constraint', () => {
	expect(runFieldValidate('', {}, { required: true, format: 'email' })).toBe('This field is required')
})

test('an optional empty value skips the remaining constraints', () => {
	expect(runFieldValidate('', {}, { format: 'email' })).toBeUndefined()
})

test('runs each constraint kind', () => {
	expect(runFieldValidate('nope', {}, { format: 'email' })).toBe('Must be a valid email')
	expect(runFieldValidate(4, {}, { min: 18 })).toBe('Must be at least 18')
	expect(runFieldValidate(400, {}, { max: 120 })).toBe('Must be at most 120')
	expect(runFieldValidate('ab', {}, { minLength: 3 })).toBe('Must be at least 3 characters')
	expect(runFieldValidate(['a', 'b', 'c'], {}, { maxLength: 2 })).toBe('Must be at most 2 items')
})

test('a `messages` override replaces the default text', () => {
	expect(runFieldValidate(['a', 'b'], {}, { maxLength: 1, messages: { maxLength: 'Pick at most one' } })).toBe(
		'Pick at most one',
	)
})

test('a `{ key }` message is resolved through the supplied translate', () => {
	const translate = (key: string, params?: Record<string, string | number>): string =>
		`${key}:${String(params?.limit ?? '')}`

	expect(
		runFieldValidate(
			['a', 'b'],
			{},
			{ maxLength: 1, messages: { maxLength: { key: 'form.tooMany', params: { limit: 1 } } } },
			{ translate },
		),
	).toBe('form.tooMany:1')
})

test('a named rule runs against the whole form values, and an unregistered one throws', () => {
	const rules = {
		'matches-confirmation': (value: unknown, values: unknown) =>
			value === (values as { confirm: string }).confirm || 'Does not match',
	}

	expect(runFieldValidate('abc', { confirm: 'abc' }, { rule: 'matches-confirmation' }, { rules })).toBeUndefined()
	expect(runFieldValidate('abc', { confirm: 'xyz' }, { rule: 'matches-confirmation' }, { rules })).toBe(
		'Does not match',
	)
	expect(() => runFieldValidate('abc', {}, { rule: 'nope' }, { rules })).toThrow(/nope/)
})

describe('the email format', () => {
	const EMAIL = { format: 'email' } as const
	const INVALID = 'Must be a valid email'

	test.each(['a@b.co', 'first.last@example.com', 'x+tag@sub.domain.org', 'a@b.c'])('accepts %s', (address) => {
		expect(runFieldValidate(address, {}, EMAIL)).toBeUndefined()
	})

	test.each(['nope', 'a@b', 'a@@b.co', 'a b@c.co', '@b.co', 'a@.co', 'a@b.', 'a@b.co@'])('rejects %s', (address) => {
		expect(runFieldValidate(address, {}, EMAIL)).toBe(INVALID)
	})

	test('rejects an adversarial address in linear time', () => {
		const ADVERSARIAL_REPEATS = 50_000
		const TIME_BOUND_MS = 250
		const adversarial = `a@${'x.'.repeat(ADVERSARIAL_REPEATS)}@`

		const started = performance.now()
		const message = runFieldValidate(adversarial, {}, EMAIL)
		const elapsed = performance.now() - started

		expect(message).toBe(INVALID)
		expect(elapsed).toBeLessThan(TIME_BOUND_MS)
	})
})
