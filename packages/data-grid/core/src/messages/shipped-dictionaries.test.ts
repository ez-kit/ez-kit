import { describe, expect, expectTypeOf, it } from 'vitest'

import { defaultMessages } from './defaults'
import { messages as enMessages } from './en'
import { messages as ruMessages } from './ru'

import type { GridMessages } from './types'

/** Arguments every function entry accepts, whatever context it reads. */
const SAMPLE_CONTEXT = { count: 3, label: 'Name', name: 'Name', columnId: 'name', position: 2, total: 5, parts: ['a'] }

/**
 * Entries whose Russian output may equal the English one: a count in brackets and a join with
 * `: ` read the same in both languages.
 */
const SAME_IN_BOTH = new Set(['grouping.count', 'draft.summary'])

/** Every leaf of a dictionary as `group.key` (or `group.record.key`) → its rendered text. */
function leaves(messages: GridMessages): Map<string, string> {
	const out = new Map<string, string>()
	const visit = (value: unknown, path: string) => {
		if (typeof value === 'string') out.set(path, value)
		else if (typeof value === 'function') out.set(path, String((value as (ctx: unknown) => unknown)(SAMPLE_CONTEXT)))
		else if (typeof value === 'object' && value !== null) {
			for (const [key, entry] of Object.entries(value)) visit(entry, path ? `${path}.${key}` : key)
		}
	}
	visit(messages, '')
	return out
}

describe('enMessages', () => {
	it('is the default dictionary itself', () => {
		expect(enMessages).toBe(defaultMessages)
	})
})

describe('ruMessages', () => {
	it('has every entry the English dictionary has, and nothing else', () => {
		expect([...leaves(ruMessages).keys()].sort()).toEqual([...leaves(defaultMessages).keys()].sort())
	})

	it('translates every entry', () => {
		const english = leaves(defaultMessages)

		for (const [path, text] of leaves(ruMessages)) {
			expect(text, path).not.toBe('')
			if (!SAME_IN_BOTH.has(path)) expect(text, path).not.toBe(english.get(path))
		}
	})

	it('declines counted nouns the Russian way', () => {
		expect([1, 2, 5, 21].map((count) => ruMessages.grid.rowCount({ count }))).toEqual([
			'1 строка',
			'2 строки',
			'5 строк',
			'21 строка',
		])
		expect(ruMessages.draft.filters({ count: 3 })).toBe('3 фильтра')
		expect(ruMessages.deleting.bulkDescription({ count: 1 })).toBe('Удалить 1 строку? Это действие нельзя отменить.')
	})

	it('cannot drop an entry and still be a dictionary', () => {
		const { grid: _omitted, ...incomplete } = ruMessages
		// @ts-expect-error a shipped dictionary is the whole `GridMessages`
		const dictionary: GridMessages = incomplete
		expectTypeOf(dictionary).toEqualTypeOf<GridMessages>()
	})
})
