import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { zodParam } from './zod'

describe('@ez-kit/valtio-kit zodParam', () => {
	it('round-trips a validated enum', () => {
		const codec = zodParam(z.enum(['asc', 'desc']))
		expect(codec.serialize('asc')).toBe('asc')
		expect(codec.deserialize('desc')).toBe('desc')
	})

	it('throws on an invalid deep-link value so the engine falls back', () => {
		const codec = zodParam(z.enum(['asc', 'desc']))
		expect(() => codec.deserialize('sideways')).toThrow()
	})

	it('round-trips a coerced number', () => {
		const codec = zodParam(z.coerce.number().int())
		expect(codec.deserialize('5')).toBe(5)
		expect(codec.serialize(5)).toBe('5')
	})

	it('validates an object via JSON', () => {
		const codec = zodParam(z.object({ min: z.number(), max: z.number() }))
		const raw = codec.serialize({ min: 0, max: 10 })
		if (raw === null) {
			throw new Error('expected a serialized value')
		}
		expect(codec.deserialize(raw)).toEqual({ min: 0, max: 10 })
		expect(() => codec.deserialize('{"min":"x"}')).toThrow()
	})
})
