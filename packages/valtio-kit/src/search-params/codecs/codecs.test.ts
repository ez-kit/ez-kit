import { describe, expect, it } from 'vitest'

import { paramArray, paramBoolean, paramEnum, paramJson, paramNumber, paramString } from './index'

describe('@ez-kit/valtio-kit param codecs', () => {
	describe('paramString', () => {
		it('round-trips strings', () => {
			const codec = paramString()
			expect(codec.serialize('shoes')).toBe('shoes')
			expect(codec.deserialize('shoes')).toBe('shoes')
		})
	})

	describe('paramNumber', () => {
		it('round-trips finite numbers', () => {
			const codec = paramNumber()
			expect(codec.serialize(5)).toBe('5')
			expect(codec.deserialize('5')).toBe(5)
		})

		it('omits non-finite numbers', () => {
			const codec = paramNumber()
			expect(codec.serialize(Number.NaN)).toBeNull()
			expect(codec.serialize(Number.POSITIVE_INFINITY)).toBeNull()
		})

		it('throws on invalid input so the engine can fall back', () => {
			const codec = paramNumber()
			expect(() => codec.deserialize('abc')).toThrow()
			expect(() => codec.deserialize('')).toThrow()
		})
	})

	describe('paramBoolean', () => {
		it('round-trips booleans and reads 1/0', () => {
			const codec = paramBoolean()
			expect(codec.serialize(true)).toBe('true')
			expect(codec.deserialize('true')).toBe(true)
			expect(codec.deserialize('false')).toBe(false)
			expect(codec.deserialize('1')).toBe(true)
			expect(codec.deserialize('0')).toBe(false)
		})

		it('throws on invalid input', () => {
			expect(() => paramBoolean().deserialize('yes')).toThrow()
		})
	})

	describe('paramEnum', () => {
		it('round-trips allowed values', () => {
			const codec = paramEnum(['asc', 'desc'] as const)
			expect(codec.serialize('asc')).toBe('asc')
			expect(codec.deserialize('desc')).toBe('desc')
		})

		it('throws on values outside the set', () => {
			const codec = paramEnum(['asc', 'desc'] as const)
			expect(() => codec.deserialize('sideways')).toThrow()
		})
	})

	describe('paramArray', () => {
		it('round-trips arrays and omits empty', () => {
			const codec = paramArray(paramString())
			expect(codec.serialize(['a', 'b'])).toBe('a,b')
			expect(codec.deserialize('a,b')).toEqual(['a', 'b'])
			expect(codec.serialize([])).toBeNull()
			expect(codec.deserialize('')).toEqual([])
		})

		it('protects the separator inside item values', () => {
			const codec = paramArray(paramString())
			const encoded = codec.serialize(['a,b', 'c'])
			expect(encoded).not.toBeNull()
			expect(codec.deserialize(encoded ?? '')).toEqual(['a,b', 'c'])
		})

		it('round-trips numbers via a nested codec', () => {
			const codec = paramArray(paramNumber())
			expect(codec.deserialize('1,2,3')).toEqual([1, 2, 3])
		})
	})

	describe('paramJson', () => {
		it('round-trips objects', () => {
			const codec = paramJson<{ a: number; b: string }>()
			const value = { a: 1, b: 'x' }
			const raw = codec.serialize(value)
			expect(raw).not.toBeNull()
			expect(codec.deserialize(raw ?? '')).toEqual(value)
		})
	})

	describe('round-trip contract', () => {
		it('serialize(deserialize(serialize(v))) is stable for every codec', () => {
			const cases: { codec: { serialize: (v: never) => string | null; deserialize: (raw: string) => unknown }; value: unknown }[] = [
				{ codec: paramString(), value: 'hello' },
				{ codec: paramNumber(), value: 42 },
				{ codec: paramBoolean(), value: true },
				{ codec: paramEnum(['asc', 'desc'] as const), value: 'asc' },
				{ codec: paramArray(paramNumber()), value: [1, 2, 3] },
				{ codec: paramJson<{ a: number }>(), value: { a: 1 } },
			]

			for (const { codec, value } of cases) {
				const first = codec.serialize(value as never)
				expect(first).not.toBeNull()
				const decoded = codec.deserialize(first ?? '')
				const second = codec.serialize(decoded as never)
				expect(second).toBe(first)
			}
		})
	})
})
