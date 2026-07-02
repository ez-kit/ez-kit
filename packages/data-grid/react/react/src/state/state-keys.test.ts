import { describe, expect, it } from 'vitest'

import { DEFAULT_STATE_KEYS, PERSISTABLE_STATE_KEYS } from './state-keys'

describe('state-keys', () => {
	it('PERSISTABLE_STATE_KEYS lists all ten persistable slices', () => {
		expect([...PERSISTABLE_STATE_KEYS]).toEqual([
			'sorting',
			'columnFilters',
			'globalFilter',
			'pagination',
			'rowSelection',
			'columnVisibility',
			'columnPinning',
			'rowPinning',
			'expanded',
			'columnSizing',
		])
	})

	it('DEFAULT_STATE_KEYS is the view subset — excludes rowSelection and expanded', () => {
		expect(DEFAULT_STATE_KEYS).not.toContain('rowSelection')
		expect(DEFAULT_STATE_KEYS).not.toContain('expanded')
		expect([...DEFAULT_STATE_KEYS]).toEqual([
			'sorting',
			'columnFilters',
			'globalFilter',
			'pagination',
			'columnVisibility',
			'columnPinning',
			'rowPinning',
			'columnSizing',
		])
	})

	it('every DEFAULT key is a member of PERSISTABLE', () => {
		for (const key of DEFAULT_STATE_KEYS) {
			expect(PERSISTABLE_STATE_KEYS).toContain(key)
		}
	})
})
