import { describe, expect, test } from 'vitest'

import { signUp } from '../shared/form/examples/actions/sign-up'

/**
 * The live server action behind the server-actions page. It is a public endpoint — anything can
 * POST to it — so it must answer malformed or oversized input with errors, never throw.
 */
describe('the sign-up server action', () => {
	test('accepts a well-formed payload', async () => {
		await expect(signUp({}, { username: 'ada', email: 'ada@example.com' })).resolves.toEqual({ ok: true })
	})

	test('reports a taken username on its field', async () => {
		const result = await signUp({}, { username: 'Admin', email: 'a@example.com' })

		expect(result.serverErrors?.fields?.username).toBe('That username is taken')
	})

	test.each([undefined, null, 'text', { username: 12345, email: 'a@b.co' }, { username: 'ada' }])(
		'answers a malformed payload (%j) with a form-level error',
		async (payload) => {
			const result = await signUp({}, payload)

			expect(result.serverErrors?.form).toBeDefined()
		},
	)

	test('rejects an oversized email by length before its format is checked', async () => {
		const ADVERSARIAL_REPEATS = 500_000
		const TIME_BOUND_MS = 250
		const email = `a@${'x.'.repeat(ADVERSARIAL_REPEATS)}@`

		const started = performance.now()
		const result = await signUp({}, { username: 'ada', email })
		const elapsed = performance.now() - started

		expect(result.serverErrors?.fields?.email).toBe('Must be at most 254 characters')
		expect(elapsed).toBeLessThan(TIME_BOUND_MS)
	})
})
