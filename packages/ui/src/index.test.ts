// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { clamp, isClientEnvironment, toPx } from './index'

describe('@ez-kit/ui', () => {
	it('clamps values into range', () => {
		expect(clamp(2, 0, 10)).toBe(2)
		expect(clamp(-3, 0, 10)).toBe(0)
		expect(clamp(50, 0, 10)).toBe(10)
	})

	it('throws when min is greater than max', () => {
		expect(() => clamp(1, 3, 2)).toThrowError('min must be less than or equal to max')
	})

	it('converts numbers to px and keeps strings', () => {
		expect(toPx(16)).toBe('16px')
		expect(toPx('1rem')).toBe('1rem')
	})

	it('returns false in node environment for client check', () => {
		expect(isClientEnvironment()).toBe(false)
	})
})
