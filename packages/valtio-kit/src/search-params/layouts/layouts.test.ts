import { describe, expect, it } from 'vitest'

import { paramNumber, paramString } from '../codecs'

import { flat, json } from './index'

import type { FieldDescriptor, FieldValues } from '../types'

const q: FieldDescriptor = { path: ['q'], parser: paramString() }
const page: FieldDescriptor = { path: ['page'], parser: paramNumber() }
const fields = [q, page]

/** Build a FieldValues map from descriptor → value pairs. */
function values(...pairs: [FieldDescriptor, unknown][]): FieldValues {
	return new Map(pairs)
}

/** Project a FieldValues map into a path-keyed object for assertions. */
function byPath(map: FieldValues): Record<string, unknown> {
	const out: Record<string, unknown> = {}
	for (const [field, value] of map) {
		out[field.path.join('.')] = value
	}
	return out
}

describe('@ez-kit/valtio-kit layouts', () => {
	describe('flat()', () => {
		it('reads owned params and ignores foreign keys', () => {
			const layout = flat()
			const params = new URLSearchParams('?q=shoes&page=2&theme=dark')
			expect(byPath(layout.read(params, fields))).toEqual({ q: 'shoes', page: 2 })
		})

		it('writes individual params while preserving foreign keys', () => {
			const layout = flat()
			const params = new URLSearchParams('?theme=dark')
			const next = layout.write(params, values([q, 'shoes'], [page, 2]), fields)
			expect(next.get('q')).toBe('shoes')
			expect(next.get('page')).toBe('2')
			expect(next.get('theme')).toBe('dark')
		})

		it('deletes owned keys whose field is absent from values', () => {
			const layout = flat()
			const params = new URLSearchParams('?q=old&page=9')
			const next = layout.write(params, values([q, 'new']), fields)
			expect(next.get('q')).toBe('new')
			expect(next.has('page')).toBe(false)
		})

		it('skips invalid values on read so the field keeps its default', () => {
			const layout = flat()
			const params = new URLSearchParams('?page=abc')
			expect(byPath(layout.read(params, fields))).toEqual({})
		})

		it('keys nested fields by their joined path', () => {
			const layout = flat()
			const min: FieldDescriptor = { path: ['filters', 'price', 'min'], parser: paramNumber() }
			const next = layout.write(new URLSearchParams(), values([min, 5]), [min])
			expect(next.get('filters.price.min')).toBe('5')
			expect(byPath(layout.read(next, [min]))).toEqual({ 'filters.price.min': 5 })
		})

		it('renames the leaf segment with key (relative) and pins with absolute', () => {
			const layout = flat()
			const renamed: FieldDescriptor = { path: ['filters', 'q'], parser: paramString(), key: 'query' }
			const pinned: FieldDescriptor = {
				path: ['filters', 'search', 'q'],
				parser: paramString(),
				key: 'q',
				absolute: true,
			}
			expect(layout.ownedKeys([renamed, pinned])).toEqual(['filters.query', 'q'])
		})

		it('supports a prefix', () => {
			const layout = flat({ prefix: 'cart.' })
			expect(layout.ownedKeys(fields)).toEqual(['cart.q', 'cart.page'])
			const params = new URLSearchParams('?cart.q=shoes')
			expect(byPath(layout.read(params, fields))).toEqual({ q: 'shoes' })
		})
	})

	describe('json()', () => {
		it('bundles fields into one canonical key (stringified leaves)', () => {
			const layout = json('filters')
			const next = layout.write(new URLSearchParams(), values([q, 'shoes'], [page, 2]), fields)
			expect(next.get('filters')).toBe('{"page":"2","q":"shoes"}')
		})

		it('mirrors nested paths as a nested object', () => {
			const layout = json('state')
			const min: FieldDescriptor = { path: ['filters', 'min'], parser: paramNumber() }
			const next = layout.write(new URLSearchParams(), values([min, 0]), [min])
			expect(next.get('state')).toBe('{"filters":{"min":"0"}}')
			expect(byPath(layout.read(next, [min]))).toEqual({ 'filters.min': 0 })
		})

		it('reads bundled fields back through parsers', () => {
			const layout = json('filters')
			const params = new URLSearchParams('?filters=' + encodeURIComponent('{"q":"shoes","page":"2"}'))
			expect(byPath(layout.read(params, fields))).toEqual({ q: 'shoes', page: 2 })
		})

		it('falls back to empty on invalid JSON', () => {
			const layout = json('filters')
			const params = new URLSearchParams('?filters=not-json')
			expect(byPath(layout.read(params, fields))).toEqual({})
		})

		it('removes the key when there are no values, preserving foreign keys', () => {
			const layout = json('filters')
			const params = new URLSearchParams('?filters=%7B%7D&theme=dark')
			const next = layout.write(params, values(), fields)
			expect(next.has('filters')).toBe(false)
			expect(next.get('theme')).toBe('dark')
		})

		it('does not collide with another json store', () => {
			const cartQ: FieldDescriptor = { path: ['q'], parser: paramString() }
			const filtersQ: FieldDescriptor = { path: ['q'], parser: paramString() }
			let params = new URLSearchParams()
			params = json('cart').write(params, values([cartQ, 'a']), [cartQ])
			params = json('filters').write(params, values([filtersQ, 'b']), [filtersQ])
			expect(params.get('cart')).toBe('{"q":"a"}')
			expect(params.get('filters')).toBe('{"q":"b"}')
		})
	})
})
