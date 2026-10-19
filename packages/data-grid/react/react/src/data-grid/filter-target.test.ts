import { describe, expect, it } from 'vitest'

import { withFilterEntry } from './filter-target'

const NAME = { id: 'name', value: { operator: 'contains', value: 'a' } }

describe('withFilterEntry', () => {
	it('appends a new entry after the existing ones', () => {
		expect(withFilterEntry([NAME], 'warehouse', 'msk')).toEqual([NAME, { id: 'warehouse', value: 'msk' }])
	})

	it('replaces an entry in place, leaving the others untouched', () => {
		const prev = [{ id: 'warehouse', value: 'msk' }, NAME]

		expect(withFilterEntry(prev, 'warehouse', 'spb')).toEqual([{ id: 'warehouse', value: 'spb' }, NAME])
	})

	it.each([
		['undefined', undefined],
		['null', null],
		['an empty string', ''],
		['an empty set', []],
	])('removes the entry for %s', (_, value) => {
		expect(withFilterEntry([{ id: 'warehouse', value: 'msk' }, NAME], 'warehouse', value)).toEqual([NAME])
	})

	it('keeps an operator value that has nothing typed yet', () => {
		const pending = { operator: 'contains', value: undefined }

		expect(withFilterEntry([], 'warehouse', pending)).toEqual([{ id: 'warehouse', value: pending }])
	})
})
