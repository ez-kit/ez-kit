import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { zodParam } from './zod'

describe('@ez-kit/valtio-kit zodParam', () => {
	it('round-trips a validated enum', () => {
		const parser = zodParam(z.enum(['asc', 'desc']))
		expect(parser.stringify('asc')).toBe('asc')
		expect(parser.parse('desc')).toBe('desc')
	})

	it('throws on an invalid deep-link value so the engine falls back', () => {
		const parser = zodParam(z.enum(['asc', 'desc']))
		expect(() => parser.parse('sideways')).toThrow()
	})

	it('round-trips a coerced number', () => {
		const parser = zodParam(z.coerce.number().int())
		expect(parser.parse('5')).toBe(5)
		expect(parser.stringify(5)).toBe('5')
	})

	it('validates an object via JSON', () => {
		const parser = zodParam(z.object({ min: z.number(), max: z.number() }))
		const raw = parser.stringify({ min: 0, max: 10 })
		if (raw === null) {
			throw new Error('expected a serialized value')
		}
		expect(parser.parse(raw)).toEqual({ min: 0, max: 10 })
		expect(() => parser.parse('{"min":"x"}')).toThrow()
	})
})
