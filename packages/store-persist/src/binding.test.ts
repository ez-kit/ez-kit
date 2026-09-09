import { describe, expect, it } from 'vitest'

import { applyKeyed, ApplyMode, createBinding, desiredKeyed } from './binding'
import { objectPort, observable } from './test-kit'

import type { FieldDescriptor, Keyed, Parser } from './types'

const str: Parser<string> = { parse: (r) => r, stringify: (v) => v }
const num: Parser<number> = { parse: (r) => Number(r), stringify: (v) => String(v) }

function keyed(entries: Record<string, string>): Keyed {
	return new Map(Object.entries(entries))
}

describe('@ez-kit/store-persist binding', () => {
	it('stringifies values and drops defaults from desiredKeyed (clearOnDefault)', () => {
		const store = observable({ q: 'seed' })
		const qField: FieldDescriptor = { path: ['q'], parser: str }
		const binding = createBinding(store, objectPort, [qField], {})

		expect(desiredKeyed(binding).has('q')).toBe(false)
		store.q = 'other'
		expect(desiredKeyed(binding).get('q')).toBe('other')
	})

	it('keeps default-valued keys when clearOnDefault is disabled', () => {
		const store = observable({ q: 'seed' })
		const binding = createBinding(store, objectPort, [{ path: ['q'], parser: str }], { clearOnDefault: false })
		expect(desiredKeyed(binding).get('q')).toBe('seed')
	})

	it('Pull: present key parses and writes, absent key resets to default', () => {
		const store = observable({ q: 'seed' })
		const binding = createBinding(store, objectPort, [{ path: ['q'], parser: str }], {})

		applyKeyed(binding, keyed({ q: 'shoes' }), ApplyMode.Pull)
		expect(store.q).toBe('shoes')

		applyKeyed(binding, keyed({}), ApplyMode.Pull)
		expect(store.q).toBe('seed')
	})

	it('Hydrate: writes only when the field still holds its default', () => {
		const store = observable({ q: '' })
		const binding = createBinding(store, objectPort, [{ path: ['q'], parser: str }], {})

		applyKeyed(binding, keyed({ q: 'fromUrl' }), ApplyMode.Hydrate)
		expect(store.q).toBe('fromUrl')
	})

	it('Hydrate: leaves a field already moved off its default (first-present-wins)', () => {
		const store = observable({ q: '' })
		const binding = createBinding(store, objectPort, [{ path: ['q'], parser: str }], {})

		store.q = 'fromEarlierSource'
		applyKeyed(binding, keyed({ q: 'fromStorage' }), ApplyMode.Hydrate)
		expect(store.q).toBe('fromEarlierSource')
	})

	it('Hydrate: absent key leaves the field for another source', () => {
		const store = observable({ q: 'seed' })
		const binding = createBinding(store, objectPort, [{ path: ['q'], parser: str }], {})

		applyKeyed(binding, keyed({}), ApplyMode.Hydrate)
		expect(store.q).toBe('seed')
	})

	it('preserves nested object identity on a pull', () => {
		const store = observable({ filters: { q: '', min: 0 } })
		const ref = store.filters
		const binding = createBinding(store, objectPort, [{ path: ['filters', 'min'], parser: num }], {})

		applyKeyed(binding, keyed({ 'filters.min': '9' }), ApplyMode.Pull)

		expect(store.filters).toBe(ref)
		expect(store.filters.q).toBe('')
		expect(store.filters.min).toBe(9)
	})

	it('preserves a class instance prototype on a pull', () => {
		class Filters {
			q = ''
			clear(): void {
				this.q = ''
			}
		}
		const store = observable({ filters: new Filters() })
		const binding = createBinding(store, objectPort, [{ path: ['filters', 'q'], parser: str }], {})

		applyKeyed(binding, keyed({ 'filters.q': 'react' }), ApplyMode.Pull)

		expect(store.filters.q).toBe('react')
		expect(store.filters).toBeInstanceOf(Filters)
		expect(typeof store.filters.clear).toBe('function')
	})

	it('leaves a field unchanged when its incoming value fails to parse', () => {
		const strict: Parser<number> = {
			parse: (r) => {
				const n = Number(r)
				if (Number.isNaN(n)) {
					throw new Error('NaN')
				}
				return n
			},
			stringify: (v) => String(v),
		}
		const store = observable({ page: 1 })
		const binding = createBinding(store, objectPort, [{ path: ['page'], parser: strict }], {})

		applyKeyed(binding, keyed({ page: 'abc' }), ApplyMode.Pull)
		expect(store.page).toBe(1)
	})

	describe('bind-time validation', () => {
		it('throws when a path is unreachable', () => {
			const store = observable({ filters: {} })
			const field: FieldDescriptor = { path: ['filters', 'price', 'min'], parser: num }
			expect(() => createBinding(store, objectPort, [field], {})).toThrow(/unreachable/)
		})

		it('throws when a parser targets a class instance', () => {
			class Inner {
				value = 1
			}
			const store = observable({ inner: new Inner() })
			expect(() => createBinding(store, objectPort, [{ path: ['inner'], parser: str }], {})).toThrow(/class instance/)
		})

		it('throws when a leaf is a getter without a setter', () => {
			class Model {
				q = ''
				get derived(): string {
					return this.q
				}
			}
			const store = observable(new Model())
			expect(() => createBinding(store, objectPort, [{ path: ['derived'], parser: str }], {})).toThrow(/getter-only/)
		})
	})
})
