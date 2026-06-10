import { describe, expect, it } from 'vitest'

import { paramString } from '../codecs'

import { qs } from './qs'

import type { FieldsRecord } from '../types'

const fields: FieldsRecord = {
	q: paramString(),
	sort: paramString(),
}

describe('@ez-kit/valtio-kit qs encoder', () => {
	it('writes and reads namespaced bracket notation', () => {
		const layout = qs({ namespace: 'f' })
		const next = layout.write(new URLSearchParams(), { q: 'shoes', sort: 'asc' }, fields)
		expect(next.toString()).toContain('f%5Bq%5D=shoes')
		expect(layout.read(next, fields)).toEqual({ q: 'shoes', sort: 'asc' })
	})

	it('preserves foreign keys', () => {
		const layout = qs({ namespace: 'f' })
		const next = layout.write(new URLSearchParams('theme=dark'), { q: 'shoes' }, fields)
		expect(next.get('theme')).toBe('dark')
		expect(layout.read(next, fields)).toEqual({ q: 'shoes' })
	})

	it('writes individual keys without a namespace', () => {
		const layout = qs()
		const next = layout.write(new URLSearchParams(), { q: 'shoes' }, fields)
		expect(layout.read(next, fields)).toEqual({ q: 'shoes' })
	})

	it('removes the namespace when there are no values, keeping foreign keys', () => {
		const layout = qs({ namespace: 'f' })
		const seeded = qs({ namespace: 'f' }).write(new URLSearchParams('theme=dark'), { q: 'old' }, fields)
		const cleared = layout.write(seeded, {}, fields)
		expect(layout.read(cleared, fields)).toEqual({})
		expect(cleared.get('theme')).toBe('dark')
	})
})
