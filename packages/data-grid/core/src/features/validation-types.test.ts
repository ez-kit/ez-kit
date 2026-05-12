import { describe, expect, it } from 'vitest'

import { ValidationError, isValidationError } from './validation-types'

describe('ValidationError', () => {
	it('exposes name === "ValidationError"', () => {
		const err = new ValidationError({ errors: { email: ['taken'] } })
		expect(err.name).toBe('ValidationError')
	})

	it('defaults errors to empty record when only formError given', () => {
		const err = new ValidationError({ formError: 'rate limited' })
		expect(err.errors).toEqual({})
		expect(err.formError).toBe('rate limited')
	})

	it('preserves passed errors and formError', () => {
		const err = new ValidationError({
			errors: { email: ['taken'], password: ['weak', 'too short'] },
			formError: 'fix below',
		})
		expect(err.errors.email).toEqual(['taken'])
		expect(err.errors.password).toEqual(['weak', 'too short'])
		expect(err.formError).toBe('fix below')
	})

	it('uses message > formError > default for Error.message', () => {
		expect(new ValidationError({ message: 'custom' }).message).toBe('custom')
		expect(new ValidationError({ formError: 'banner' }).message).toBe('banner')
		expect(new ValidationError({}).message).toBe('Validation failed')
	})

	it('is an instance of Error', () => {
		const err = new ValidationError({})
		expect(err).toBeInstanceOf(Error)
	})
})

describe('isValidationError', () => {
	it('returns true for ValidationError instances', () => {
		expect(isValidationError(new ValidationError({}))).toBe(true)
	})

	it('returns false for plain Error', () => {
		expect(isValidationError(new Error('boom'))).toBe(false)
	})

	it('returns false for null/undefined/primitives', () => {
		expect(isValidationError(null)).toBe(false)
		expect(isValidationError(undefined)).toBe(false)
		expect(isValidationError('ValidationError')).toBe(false)
		expect(isValidationError(42)).toBe(false)
	})

	it('detects cross-module instances via brand symbol', () => {
		// Simulate a foreign instance created outside this module's class identity.
		// instanceof would return false here; brand check must succeed.
		const brand = Symbol.for('@ez-kit/validation-error')
		const foreign = Object.assign(new Error('cross-module'), {
			[brand]: true,
			name: 'ValidationError',
			errors: { email: ['taken'] },
			formError: undefined,
		})
		expect(foreign instanceof ValidationError).toBe(false)
		expect(isValidationError(foreign)).toBe(true)
	})

	it('returns false for plain object without brand', () => {
		expect(isValidationError({ name: 'ValidationError', errors: {} })).toBe(false)
	})
})
