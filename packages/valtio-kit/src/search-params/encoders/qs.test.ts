import { describe, expect, it } from 'vitest'

import { paramNumber, paramString } from '../codecs'

import { qs } from './qs'

import type { FieldDescriptor, FieldValues } from '../types'

const q: FieldDescriptor = { path: ['q'], parser: paramString() }
const sort: FieldDescriptor = { path: ['sort'], parser: paramString() }
const fields = [q, sort]

function values(...pairs: [FieldDescriptor, unknown][]): FieldValues {
	return new Map(pairs)
}

function byPath(map: FieldValues): Record<string, unknown> {
	const out: Record<string, unknown> = {}
	for (const [field, value] of map) {
		out[field.path.join('.')] = value
	}
	return out
}

describe('@ez-kit/valtio-kit qs encoder', () => {
	it('writes and reads namespaced bracket notation', () => {
		const layout = qs({ namespace: 'f' })
		const next = layout.write(new URLSearchParams(), values([q, 'shoes'], [sort, 'asc']), fields)
		expect(next.toString()).toContain('f%5Bq%5D=shoes')
		expect(byPath(layout.read(next, fields))).toEqual({ q: 'shoes', sort: 'asc' })
	})

	it('encodes nested paths as bracket notation', () => {
		const min: FieldDescriptor = { path: ['filters', 'price', 'min'], parser: paramNumber() }
		const layout = qs()
		const next = layout.write(new URLSearchParams(), values([min, 5]), [min])
		expect(next.toString()).toContain('filters%5Bprice%5D%5Bmin%5D=5')
		expect(byPath(layout.read(next, [min]))).toEqual({ 'filters.price.min': 5 })
	})

	it('preserves foreign keys', () => {
		const layout = qs({ namespace: 'f' })
		const next = layout.write(new URLSearchParams('theme=dark'), values([q, 'shoes']), fields)
		expect(next.get('theme')).toBe('dark')
		expect(byPath(layout.read(next, fields))).toEqual({ q: 'shoes' })
	})

	it('writes individual keys without a namespace', () => {
		const layout = qs()
		const next = layout.write(new URLSearchParams(), values([q, 'shoes']), fields)
		expect(byPath(layout.read(next, fields))).toEqual({ q: 'shoes' })
	})

	it('removes the namespace when there are no values, keeping foreign keys', () => {
		const layout = qs({ namespace: 'f' })
		const seeded = qs({ namespace: 'f' }).write(new URLSearchParams('theme=dark'), values([q, 'old']), fields)
		const cleared = layout.write(seeded, values(), fields)
		expect(byPath(layout.read(cleared, fields))).toEqual({})
		expect(cleared.get('theme')).toBe('dark')
	})
})
