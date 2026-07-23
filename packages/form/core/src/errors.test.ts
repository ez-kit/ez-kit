import { describe, expect, it } from 'vitest'

import { formatFieldErrors, hasFieldErrors } from './errors'

describe('formatFieldErrors', () => {
	it('returns an empty array when the field was never validated', () => {
		expect(formatFieldErrors(undefined)).toEqual([])
	})

	it('reads the message off standard-schema issues', () => {
		const errors = [{ message: 'Required', path: ['email'] }]

		expect(formatFieldErrors(errors)).toEqual(['Required'])
	})

	it('passes plain strings through', () => {
		expect(formatFieldErrors(['Too short'])).toEqual(['Too short'])
	})

	it('reads the message off a thrown Error', () => {
		expect(formatFieldErrors([new Error('Boom')])).toEqual(['Boom'])
	})

	it('drops null, undefined and empty-string slots', () => {
		expect(formatFieldErrors([null, undefined, '', { message: '' }, 'Real'])).toEqual(['Real'])
	})

	it('stringifies an error shape it does not recognise', () => {
		expect(formatFieldErrors([42])).toEqual(['42'])
	})
})

describe('hasFieldErrors', () => {
	it('is false when nothing renderable is present', () => {
		expect(hasFieldErrors(undefined)).toBe(false)
		expect(hasFieldErrors([])).toBe(false)
		expect(hasFieldErrors([undefined, null])).toBe(false)
	})

	it('is true once a renderable error exists', () => {
		expect(hasFieldErrors([{ message: 'Required' }])).toBe(true)
	})
})
