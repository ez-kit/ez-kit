import { describe, expect, it, vi } from 'vitest'

import { resolveParser } from './auto'
import { paramArray } from './param-array'
import { paramDate } from './param-date'
import { paramJson } from './param-json'
import { paramString } from './param-string'

import type { Codec } from './codec'

describe('array codec round-trip and equality contracts', () => {
	it('keeps ordinary legacy representations and empty-array decoding unchanged', () => {
		const codec = paramArray(paramString())
		expect(codec.stringify(['a', 'b'])).toBe('a,b')
		expect(codec.stringify(['a,b', 'c'])).toBe('a%2Cb,c')
		expect(codec.stringify(['', ''])).toBe(',')
		expect(codec.parse('a%2Cb,c')).toEqual(['a,b', 'c'])
		expect(codec.parse('')).toEqual([])
		expect(codec.stringify([])).toBeNull()
		const custom = paramArray(paramString(), { separator: '::' })
		expect(custom.stringify(['a::b', 'c'])).toBe('a%3A%3Ab::c')
		expect(custom.parse('a%3A%3Ab::c')).toEqual(['a::b', 'c'])
		const percent = paramArray(paramString(), { separator: '%' })
		expect(percent.stringify(['a', 'b'])).toBe('a%b')
		expect(percent.parse('a%b')).toEqual(['a', 'b'])
		const hexadecimal = paramArray(paramString(), { separator: '2C' })
		expect(hexadecimal.stringify(['left', 'right'])).toBe('left2Cright')
		expect(hexadecimal.parse('left2Cright')).toEqual(['left', 'right'])
	})

	it('distinguishes a singleton empty string from an omitted empty array', () => {
		const codec = paramArray(paramString())
		const raw = codec.stringify([''])
		expect(raw).not.toBeNull()
		expect(raw).not.toBe('')
		expect(codec.parse(raw ?? '')).toEqual([''])
	})

	it('round trips empty, percent, nul and Unicode strings under arbitrary separators', () => {
		const values = [
			'',
			'\0',
			'%',
			'%2C',
			'a,b',
			'a::b',
			'0',
			'A',
			'é',
			'🧪',
			'\ud800',
			'[',
			'{',
			'[%ez-kit.array:1:["legacy"]',
		]
		const separators = [',', '%', '2C', '::', '', '[', '{', '!', 'A', '0', '\0', 'é', '🧪', '[%ez-kit.array:1:']
		for (const separator of separators) {
			const codec = paramArray(paramString(), { separator })
			for (const first of values) {
				for (const second of values) {
					for (const value of [[first], [first, second]]) {
						const raw = codec.stringify(value)
						if (raw === null) throw new Error('A nonempty string array cannot be omitted')
						const decoded = codec.parse(raw)
						expect(decoded, `separator ${JSON.stringify(separator)}, value ${JSON.stringify(value)}`).toEqual(value)
						expect(codec.stringify(decoded)).toBe(raw)
					}
				}
			}
		}
	})

	it('uses a frame prefix that cannot collide with legacy output beginning with a separator', () => {
		const codec = paramArray(paramString(), { separator: '[' })
		expect(codec.stringify(['', 'a'])).toBe('[a')
		expect(codec.parse('[a')).toEqual(['', 'a'])
		const raw = codec.stringify([''])
		expect(raw?.startsWith('{%ez-kit.array:1:')).toBe(true)
		expect(codec.parse(raw ?? '')).toEqual([''])
	})

	it('rejects malformed framed payloads and retains malformed legacy URI errors', () => {
		const codec = paramArray(paramString())
		expect(() => codec.parse('[%ez-kit.array:1:{}')).toThrow(/invalid framed items/)
		expect(() => codec.parse('[%ez-kit.array:1:[1]')).toThrow(/invalid framed items/)
		expect(() => codec.parse('[%ez-kit.array:1:not-json')).toThrow()
		expect(() => codec.parse('a,%ZZ')).toThrow(URIError)
	})

	it('keeps omitted item semantics and never runs a decoder during encoding', () => {
		const parse = vi.fn((raw: string) => Number(raw))
		const item: Codec<number> = { parse, stringify: (value) => (value < 0 ? null : String(value)) }
		const codec = paramArray(item)
		expect(codec.stringify([-1, 2, -3])).toBe('2')
		expect(codec.stringify([-1])).toBeNull()
		expect(parse).not.toHaveBeenCalled()
		const error = new Error('item encode failure')
		expect(() =>
			paramArray({
				parse: (raw: string) => raw,
				stringify: () => {
					throw error
				},
			}).stringify(['a']),
		).toThrow(error)
	})

	it('composes Date and nested array semantic equality instead of object identity', () => {
		const dates = paramArray(paramDate())
		expect(dates.equals?.([new Date(0)], [new Date(0)])).toBe(true)
		expect(dates.equals?.([new Date(0)], [new Date(1)])).toBe(false)
		expect(dates.equals?.([new Date(0)], [])).toBe(false)
		const nested = paramArray(dates)
		expect(nested.equals?.([[new Date(0)]], [[new Date(0)]])).toBe(true)
		expect(nested.equals?.([[new Date(0)]], [[new Date(1)]])).toBe(false)
		const value = [[new Date(0)], [new Date(1), new Date(2)]]
		expect(nested.parse(nested.stringify(value) ?? '')).toEqual(value)
		const strings = paramArray(paramArray(paramString()))
		const exceptional = [[''], ['a,b', '%']]
		expect(strings.parse(strings.stringify(exceptional) ?? '')).toEqual(exceptional)
		const inferred = resolveParser([new Date(0)], 'dates')
		expect(inferred.equals?.([new Date(0)], [new Date(0)])).toBe(true)
	})

	it('preserves custom item equality and stable serialization for opaque object values', () => {
		const json = paramArray(paramJson<Record<string, number>>())
		expect(json.equals?.([{ a: 1, b: 2 }], [{ b: 2, a: 1 }])).toBe(true)
		expect(json.equals?.([{ a: 1 }], [{ a: 2 }])).toBe(false)
		const opaque: Codec<{ id: number }> = {
			parse: (raw) => ({ id: Number(raw) }),
			stringify: (value) => String(value.id),
		}
		const objects = paramArray(opaque)
		expect(objects.equals?.([{ id: 1 }], [{ id: 1 }])).toBe(true)
		expect(objects.equals?.([{ id: 1 }], [{ id: 2 }])).toBe(false)
	})
})
