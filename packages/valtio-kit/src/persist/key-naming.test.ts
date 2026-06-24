import { describe, expect, it } from 'vitest'

import { fieldKey } from './key-naming'

import type { FieldDescriptor } from './types'

const parser = { parse: (r: string): string => r }

describe('@ez-kit/valtio-kit persist key-naming', () => {
	it('joins the path by default', () => {
		const field: FieldDescriptor = { path: ['filters', 'price', 'min'], parser }
		expect(fieldKey(field)).toBe('filters.price.min')
	})

	it('renames the leaf with key', () => {
		const field: FieldDescriptor = { path: ['filters', 'q'], parser, key: 'query' }
		expect(fieldKey(field)).toBe('filters.query')
	})

	it('drops ancestors when absolute', () => {
		const field: FieldDescriptor = { path: ['filters', 'q'], parser, absolute: true }
		expect(fieldKey(field)).toBe('q')
	})

	it('prepends a descriptor prefix', () => {
		const field: FieldDescriptor = { path: ['q'], parser, prefix: 'cart.' }
		expect(fieldKey(field)).toBe('cart.q')
	})

	it('combines absolute and key with a prefix', () => {
		const field: FieldDescriptor = { path: ['filters', 'q'], parser, key: 'query', absolute: true, prefix: 'cart.' }
		expect(fieldKey(field)).toBe('cart.query')
	})
})
