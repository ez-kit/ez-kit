import { describe, expect, it } from 'vitest'

import { pipe, type StoreEnhancer } from './pipe'

type Base = { count: number }

const addHistory: StoreEnhancer<Base, Base & { history: string[] }> = (target) =>
	Object.assign(target, { history: [] as string[] })

const addLabel =
	(label: string): StoreEnhancer<Base & { history: string[] }, Base & { history: string[]; label: string }> =>
	(target) =>
		Object.assign(target, { label })

describe('pipe', () => {
	it('returns the base untouched when given no enhancers', () => {
		const base: Base = { count: 0 }

		const result = pipe(base)

		expect(result).toBe(base)
	})

	it('applies enhancers left to right', () => {
		const order: string[] = []
		const first: StoreEnhancer<Base, Base> = (target) => {
			order.push('first')
			return target
		}
		const second: StoreEnhancer<Base, Base> = (target) => {
			order.push('second')
			return target
		}

		pipe({ count: 0 }, first, second)

		expect(order).toEqual(['first', 'second'])
	})

	it('feeds each enhancer the value the previous one returned', () => {
		const seen: object[] = []
		const replace: StoreEnhancer<Base, Base> = () => ({ count: 1 })
		const capture: StoreEnhancer<Base, Base> = (target) => {
			seen.push(target)
			return target
		}

		const result = pipe({ count: 0 }, replace, capture)

		expect(seen).toEqual([{ count: 1 }])
		expect(result).toEqual({ count: 1 })
	})

	it('accumulates the widened type through the chain', () => {
		const store = pipe({ count: 0 }, addHistory, addLabel('draft'))

		expect(store.count).toBe(0)
		expect(store.history).toEqual([])
		expect(store.label).toBe('draft')
	})

	it('keeps the identity a mutating enhancer returns', () => {
		const base: Base = { count: 0 }

		const store = pipe(base, addHistory)

		expect(store).toBe(base)
	})

	it('applies a chain longer than the declared overloads', () => {
		const bump: StoreEnhancer<Base, Base> = (target) => ({ count: target.count + 1 })

		const result = pipe({ count: 0 }, bump, bump, bump, bump, bump, bump, bump)

		expect(result.count).toBe(7)
	})
})
