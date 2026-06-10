import { describe, expect, it } from 'vitest'

import { paramNumber, paramString } from '../codecs'

import { flat, json } from './index'

import type { FieldsRecord } from '../types'

const fields: FieldsRecord = {
	q: paramString(),
	page: paramNumber(),
}

describe('@ez-kit/valtio-kit layouts', () => {
	describe('flat()', () => {
		it('reads owned params and ignores foreign keys', () => {
			const layout = flat()
			const params = new URLSearchParams('?q=shoes&page=2&theme=dark')
			expect(layout.read(params, fields)).toEqual({ q: 'shoes', page: 2 })
		})

		it('writes individual params while preserving foreign keys', () => {
			const layout = flat()
			const params = new URLSearchParams('?theme=dark')
			const next = layout.write(params, { q: 'shoes', page: 2 }, fields)
			expect(next.get('q')).toBe('shoes')
			expect(next.get('page')).toBe('2')
			expect(next.get('theme')).toBe('dark')
		})

		it('deletes owned keys whose field is absent from values', () => {
			const layout = flat()
			const params = new URLSearchParams('?q=old&page=9')
			const next = layout.write(params, { q: 'new' }, fields)
			expect(next.get('q')).toBe('new')
			expect(next.has('page')).toBe(false)
		})

		it('skips invalid values on read so the field keeps its default', () => {
			const layout = flat()
			const params = new URLSearchParams('?page=abc')
			expect(layout.read(params, fields)).toEqual({})
		})

		it('supports a prefix', () => {
			const layout = flat({ prefix: 'cart.' })
			expect(layout.ownedKeys(['q', 'page'])).toEqual(['cart.q', 'cart.page'])
			const params = new URLSearchParams('?cart.q=shoes')
			expect(layout.read(params, fields)).toEqual({ q: 'shoes' })
		})
	})

	describe('json()', () => {
		it('bundles fields into one canonical key', () => {
			const layout = json('filters')
			const next = layout.write(new URLSearchParams(), { q: 'shoes', page: 2 }, fields)
			expect(next.get('filters')).toBe('{"page":2,"q":"shoes"}')
		})

		it('reads bundled fields back', () => {
			const layout = json('filters')
			const params = new URLSearchParams('?filters=' + encodeURIComponent('{"q":"shoes","page":2}'))
			expect(layout.read(params, fields)).toEqual({ q: 'shoes', page: 2 })
		})

		it('falls back to empty on invalid JSON', () => {
			const layout = json('filters')
			const params = new URLSearchParams('?filters=not-json')
			expect(layout.read(params, fields)).toEqual({})
		})

		it('removes the key when there are no values, preserving foreign keys', () => {
			const layout = json('filters')
			const params = new URLSearchParams('?filters=%7B%7D&theme=dark')
			const next = layout.write(params, {}, fields)
			expect(next.has('filters')).toBe(false)
			expect(next.get('theme')).toBe('dark')
		})

		it('does not collide with another json store', () => {
			const cart = json('cart')
			const filters = json('filters')
			let params = new URLSearchParams()
			params = cart.write(params, { q: 'a' }, { q: paramString() })
			params = filters.write(params, { q: 'b' }, { q: paramString() })
			expect(params.get('cart')).toBe('{"q":"a"}')
			expect(params.get('filters')).toBe('{"q":"b"}')
		})
	})
})
