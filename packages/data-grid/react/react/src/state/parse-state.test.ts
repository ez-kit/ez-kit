import { describe, expect, it } from 'vitest'

import { parseState } from './parse-state'

describe('parseState', () => {
	it('returns {} for non-object garbage without throwing', () => {
		expect(parseState(null)).toEqual({})
		expect(parseState(42)).toEqual({})
		expect(parseState('nope')).toEqual({})
		expect(parseState(undefined)).toEqual({})
	})

	it('keeps well-formed default-view slices', () => {
		const stored = {
			sorting: [{ id: 'name', desc: true }],
			pagination: { pageIndex: 1, pageSize: 10 },
			globalFilter: 'alice',
		}
		expect(parseState(stored)).toEqual(stored)
	})

	it('drops keys outside the allowlist', () => {
		const result = parseState({ sorting: [], rowSelection: { '0': true } })
		expect('rowSelection' in result).toBe(false)
		expect(result.sorting).toEqual([])
	})

	it('keeps rowSelection only when keys opts in', () => {
		const result = parseState({ rowSelection: { '0': true } }, { keys: ['rowSelection'] })
		expect(result.rowSelection).toEqual({ '0': true })
	})

	it('drops slices with the wrong top-level type', () => {
		const result = parseState({ sorting: 'nope', pagination: { pageIndex: 0, pageSize: 10 } })
		expect('sorting' in result).toBe(false)
		expect(result.pagination).toEqual({ pageIndex: 0, pageSize: 10 })
	})

	it('ignores unknown foreign keys entirely', () => {
		const result = parseState({ sorting: [], somethingElse: 123 })
		expect(result).toEqual({ sorting: [] })
	})
})
