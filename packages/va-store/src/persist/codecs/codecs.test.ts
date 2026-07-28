import { describe, expect, it } from 'vitest'

import { resolveParser } from './auto'

import {
	paramArray,
	paramBigInt,
	paramBoolean,
	paramDate,
	paramEnum,
	paramJson,
	paramNumber,
	paramString,
} from './index'

import type { AnyCodec } from './codec'

describe('@ez-kit/va-store param parsers', () => {
	describe('paramString', () => {
		it('round-trips strings', () => {
			const parser = paramString()
			expect(parser.stringify('shoes')).toBe('shoes')
			expect(parser.parse('shoes')).toBe('shoes')
		})
	})

	describe('paramNumber', () => {
		it('round-trips finite numbers', () => {
			const parser = paramNumber()
			expect(parser.stringify(5)).toBe('5')
			expect(parser.parse('5')).toBe(5)
		})

		it('omits non-finite numbers', () => {
			const parser = paramNumber()
			expect(parser.stringify(Number.NaN)).toBeNull()
			expect(parser.stringify(Number.POSITIVE_INFINITY)).toBeNull()
		})

		it('throws on invalid input so the engine can fall back', () => {
			const parser = paramNumber()
			expect(() => parser.parse('abc')).toThrow()
			expect(() => parser.parse('')).toThrow()
		})
	})

	describe('paramBoolean', () => {
		it('round-trips booleans and reads 1/0', () => {
			const parser = paramBoolean()
			expect(parser.stringify(true)).toBe('true')
			expect(parser.parse('true')).toBe(true)
			expect(parser.parse('false')).toBe(false)
			expect(parser.parse('1')).toBe(true)
			expect(parser.parse('0')).toBe(false)
		})

		it('throws on invalid input', () => {
			expect(() => paramBoolean().parse('yes')).toThrow()
		})
	})

	describe('paramEnum', () => {
		it('round-trips allowed values', () => {
			const parser = paramEnum(['asc', 'desc'] as const)
			expect(parser.stringify('asc')).toBe('asc')
			expect(parser.parse('desc')).toBe('desc')
		})

		it('throws on values outside the set', () => {
			const parser = paramEnum(['asc', 'desc'] as const)
			expect(() => parser.parse('sideways')).toThrow()
		})
	})

	describe('paramArray', () => {
		it('round-trips arrays and omits empty', () => {
			const parser = paramArray(paramString())
			expect(parser.stringify(['a', 'b'])).toBe('a,b')
			expect(parser.parse('a,b')).toEqual(['a', 'b'])
			expect(parser.stringify([])).toBeNull()
			expect(parser.parse('')).toEqual([])
		})

		it('protects the separator inside item values', () => {
			const parser = paramArray(paramString())
			const encoded = parser.stringify(['a,b', 'c'])
			expect(encoded).not.toBeNull()
			expect(parser.parse(encoded ?? '')).toEqual(['a,b', 'c'])
		})

		it('round-trips numbers via a nested parser', () => {
			const parser = paramArray(paramNumber())
			expect(parser.parse('1,2,3')).toEqual([1, 2, 3])
		})
	})

	describe('paramJson', () => {
		it('round-trips objects', () => {
			const parser = paramJson<{ a: number; b: string }>()
			const value = { a: 1, b: 'x' }
			const raw = parser.stringify(value)
			expect(raw).not.toBeNull()
			expect(parser.parse(raw ?? '')).toEqual(value)
		})

		it('equals is key-order-insensitive', () => {
			const parser = paramJson<Record<string, number>>()
			expect(parser.equals?.({ b: 2, a: 1 }, { a: 1, b: 2 })).toBe(true)
			expect(parser.equals?.({ a: 1 }, { a: 2 })).toBe(false)
		})
	})

	describe('paramDate', () => {
		it('round-trips a Date via ISO', () => {
			const parser = paramDate()
			const date = new Date('2026-06-10T00:00:00.000Z')
			expect(parser.stringify(date)).toBe('2026-06-10T00:00:00.000Z')
			expect(parser.parse('2026-06-10T00:00:00.000Z').getTime()).toBe(date.getTime())
		})

		it('throws on an invalid date string', () => {
			expect(() => paramDate().parse('not-a-date')).toThrow()
		})
	})

	describe('paramBigInt', () => {
		it('round-trips bigints', () => {
			const parser = paramBigInt()
			expect(parser.stringify(42n)).toBe('42')
			expect(parser.parse('42')).toBe(42n)
		})

		it('throws on invalid input', () => {
			expect(() => paramBigInt().parse('x')).toThrow()
		})
	})

	describe('resolveParser (auto)', () => {
		it('resolves built-in brands from runtime values', () => {
			expect(resolveParser('a', 'f').stringify('a')).toBe('a')
			expect(resolveParser(1, 'f').stringify(2)).toBe('2')
			expect(resolveParser(true, 'f').stringify(false)).toBe('false')
			expect(resolveParser(1n, 'f').stringify(3n)).toBe('3')
			expect(
				resolveParser(new Date('2026-01-01T00:00:00.000Z'), 'f').stringify(new Date('2026-01-01T00:00:00.000Z')),
			).toBe('2026-01-01T00:00:00.000Z')
			expect(resolveParser(['a', 'b'], 'f').stringify(['a', 'b'])).toBe('a,b')
		})

		it('throws naming the field for unresolvable values', () => {
			expect(() => resolveParser(null, 'data')).toThrow(/data/)
			expect(() => resolveParser({ a: 1 }, 'data')).toThrow(/data/)
			expect(() => resolveParser(new Set(), 'data')).toThrow(/data/)
		})

		it('throws for an empty array (no item brand to infer)', () => {
			expect(() => resolveParser([], 'tags')).toThrow(/tags/)
		})
	})

	describe('round-trip contract', () => {
		it('stringify(parse(stringify(v))) is stable for every parser', () => {
			const cases: { parser: AnyCodec; value: unknown }[] = [
				{ parser: paramString(), value: 'hello' },
				{ parser: paramNumber(), value: 42 },
				{ parser: paramBoolean(), value: true },
				{ parser: paramEnum(['asc', 'desc'] as const), value: 'asc' },
				{ parser: paramArray(paramNumber()), value: [1, 2, 3] },
				{ parser: paramJson<{ a: number }>(), value: { a: 1 } },
				{ parser: paramBigInt(), value: 7n },
			]

			for (const { parser, value } of cases) {
				const first = parser.stringify(value)
				expect(first).not.toBeNull()
				const decoded = parser.parse(first ?? '')
				const second = parser.stringify(decoded)
				expect(second).toBe(first)
			}
		})
	})
})
