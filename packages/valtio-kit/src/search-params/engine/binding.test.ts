import { proxy } from 'valtio'
import { describe, expect, it } from 'vitest'

import { paramNumber, paramString } from '../codecs'

import { applyParamsToProxy, createBinding, desiredValues } from './binding'

import type { FieldDescriptor } from '../types'

describe('@ez-kit/valtio-kit binding (path engine + rule C)', () => {
	it('reads and writes nested leaves by path', () => {
		const store = proxy({ filters: { price: { min: 0 } } })
		const min: FieldDescriptor = { path: ['filters', 'price', 'min'], parser: paramNumber() }
		const binding = createBinding(store, [min], {})

		applyParamsToProxy(binding, new URLSearchParams('filters.price.min=5'))
		expect(store.filters.price.min).toBe(5)

		const desired = desiredValues(binding)
		expect(desired.get(min)).toBe(5)
	})

	it('preserves nested object identity on a URL pull (rule C)', () => {
		const store = proxy({ filters: { q: '', min: 0 } })
		const ref = store.filters
		const min: FieldDescriptor = { path: ['filters', 'min'], parser: paramNumber() }
		const binding = createBinding(store, [min], {})

		applyParamsToProxy(binding, new URLSearchParams('filters.min=9'))

		expect(store.filters).toBe(ref)
		expect(store.filters.q).toBe('')
		expect(store.filters.min).toBe(9)
	})

	it('preserves a class instance prototype on a URL pull', () => {
		class Filters {
			q = ''
			clear(): void {
				this.q = ''
			}
		}
		const store = proxy({ filters: new Filters() })
		const qField: FieldDescriptor = { path: ['filters', 'q'], parser: paramString() }
		const binding = createBinding(store, [qField], {})

		applyParamsToProxy(binding, new URLSearchParams('filters.q=react'))

		expect(store.filters.q).toBe('react')
		expect(store.filters).toBeInstanceOf(Filters)
		expect(typeof store.filters.clear).toBe('function')
	})

	it('resets a leaf to its default when the param is absent', () => {
		const store = proxy({ q: 'seed' })
		const qField: FieldDescriptor = { path: ['q'], parser: paramString() }
		const binding = createBinding(store, [qField], {})

		store.q = 'changed'
		applyParamsToProxy(binding, new URLSearchParams())
		expect(store.q).toBe('seed')
	})

	it('drops default-valued fields from desiredValues (clearOnDefault)', () => {
		const store = proxy({ q: 'seed' })
		const qField: FieldDescriptor = { path: ['q'], parser: paramString() }
		const binding = createBinding(store, [qField], {})

		expect(desiredValues(binding).has(qField)).toBe(false)
		store.q = 'other'
		expect(desiredValues(binding).get(qField)).toBe('other')
	})

	describe('bind-time validation', () => {
		it('throws when a path is unreachable', () => {
			const store = proxy({ filters: {} })
			const min: FieldDescriptor = { path: ['filters', 'price', 'min'], parser: paramNumber() }
			expect(() => createBinding(store, [min], {})).toThrow(/unreachable/)
		})

		it('throws when a leaf is a getter without a setter', () => {
			class Model {
				q = ''
				get derived(): string {
					return this.q
				}
			}
			const store = proxy(new Model())
			const derived: FieldDescriptor = { path: ['derived'], parser: paramString() }
			expect(() => createBinding(store, [derived], {})).toThrow(/getter-only/)
		})

		it('throws when a parser targets a class instance', () => {
			class Inner {
				value = 1
			}
			const store = proxy({ inner: new Inner() })
			const inner: FieldDescriptor = { path: ['inner'], parser: paramString() }
			expect(() => createBinding(store, [inner], {})).toThrow(/class instance/)
		})
	})
})
