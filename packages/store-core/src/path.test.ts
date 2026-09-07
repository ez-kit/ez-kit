import { describe, expect, it } from 'vitest'

import { findPropertyDescriptor, parentOf, readPath, setPath, writePath } from './path'

describe('@ez-kit/store-core path', () => {
	describe('readPath', () => {
		it('reads a nested leaf', () => {
			expect(readPath({ filters: { price: { min: 10 } } }, ['filters', 'price', 'min'])).toBe(10)
		})

		it('returns undefined when an intermediate node is missing', () => {
			expect(readPath({ filters: {} }, ['filters', 'price', 'min'])).toBeUndefined()
		})

		it('returns the root for an empty path', () => {
			const root = { q: '' }
			expect(readPath(root, [])).toBe(root)
		})
	})

	describe('parentOf', () => {
		it('resolves the object holding the leaf', () => {
			const price = { min: 0 }
			expect(parentOf({ filters: { price } }, ['filters', 'price', 'min'])).toBe(price)
		})

		it('returns undefined when the path does not lead to an object', () => {
			expect(parentOf({ filters: 'not-an-object' }, ['filters', 'price'])).toBeUndefined()
		})
	})

	describe('writePath', () => {
		it('assigns the leaf and keeps every node identity', () => {
			const price = { min: 0 }
			const filters = { price }
			const root = { filters }

			writePath(root, ['filters', 'price', 'min'], 42)

			expect(price.min).toBe(42)
			expect(root.filters).toBe(filters)
			expect(root.filters.price).toBe(price)
		})

		it('is a no-op when the parent is unreachable', () => {
			const root = { filters: {} } as { filters: { price?: { min: number } } }
			expect(() => {
				writePath(root, ['filters', 'price', 'min'], 42)
			}).not.toThrow()
			expect(root.filters.price).toBeUndefined()
		})

		it('is a no-op for an empty path', () => {
			const root = { q: 'a' }
			writePath(root, [], 'b')
			expect(root.q).toBe('a')
		})
	})

	describe('setPath', () => {
		it('returns a new root and a new spine, leaving siblings identical', () => {
			const untouched = { keep: true }
			const root = { filters: { price: { min: 0 }, untouched }, other: { n: 1 } }

			const next = setPath(root, ['filters', 'price', 'min'], 42)

			expect(next).not.toBe(root)
			expect(next.filters).not.toBe(root.filters)
			expect(next.filters.price).not.toBe(root.filters.price)
			expect(next.filters.price.min).toBe(42)
			// Siblings on the path and whole untouched branches keep their reference.
			expect(next.filters.untouched).toBe(untouched)
			expect(next.other).toBe(root.other)
			// The original is untouched.
			expect(root.filters.price.min).toBe(0)
		})

		it('returns the SAME root when the leaf already holds the value', () => {
			const root = { filters: { q: 'shoes' } }
			expect(setPath(root, ['filters', 'q'], 'shoes')).toBe(root)
		})

		it('preserves array-ness of a node on the path', () => {
			const root = { items: [{ n: 1 }, { n: 2 }] }

			const next = setPath(root, ['items', '1', 'n'], 9)

			expect(Array.isArray(next.items)).toBe(true)
			expect(next.items).toHaveLength(2)
			expect(next.items[1]?.n).toBe(9)
			expect(next.items[0]).toBe(root.items[0])
		})

		it('returns the root untouched for an empty path or an unreachable node', () => {
			const root = { filters: { q: '' } }
			expect(setPath(root, [], 'x')).toBe(root)
			expect(setPath(root, ['missing', 'deep'], 'x')).toBe(root)
		})
	})

	describe('findPropertyDescriptor', () => {
		it('finds a getter declared on the prototype chain', () => {
			class Model {
				q = ''
				get derived(): string {
					return this.q.toUpperCase()
				}
			}

			const descriptor = findPropertyDescriptor(new Model(), 'derived')

			// A getter-only property is what `validateBinding` refuses to bind, so both halves matter.
			expect(typeof descriptor?.get).toBe('function')
			expect(typeof descriptor?.set).toBe('undefined')
		})

		it('returns undefined for a property nothing on the chain declares', () => {
			expect(findPropertyDescriptor({}, 'nope')).toBeUndefined()
		})
	})
})
