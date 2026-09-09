import { describe, expect, it } from 'vitest'

import { defaultMessages } from './defaults'
import { resolveMessages } from './resolve'

describe('resolveMessages', () => {
	it('returns the English dictionary when nothing overrides it', () => {
		expect(resolveMessages()).toEqual(defaultMessages)
		expect(resolveMessages(undefined)).toEqual(defaultMessages)
	})

	it('keeps a group’s other entries when one of them is overridden', () => {
		const messages = resolveMessages({ pagination: { rowsPerPage: 'Строк на странице' } })

		expect(messages.pagination.rowsPerPage).toBe('Строк на странице')
		expect(messages.pagination.next).toBe(defaultMessages.pagination.next)
		expect(messages.selection.selectRow).toBe(defaultMessages.selection.selectRow)
	})

	it('lets a later layer win over an earlier one, entry by entry', () => {
		const messages = resolveMessages(
			{ selection: { selectRow: 'Выбрать строку', clear: 'Снять выделение' } },
			{ selection: { selectRow: 'Отметить строку' } },
		)

		expect(messages.selection.selectRow).toBe('Отметить строку')
		expect(messages.selection.clear).toBe('Снять выделение')
	})

	it('overrides a parameterized entry with the consumer’s own function', () => {
		const messages = resolveMessages({
			filtering: { placeholder: ({ columnId }) => `Фильтр по ${columnId}` },
		})

		expect(messages.filtering.placeholder({ columnId: 'email' })).toBe('Фильтр по email')
	})

	it('does not mutate the default dictionary', () => {
		const before = defaultMessages.pagination.rowsPerPage

		resolveMessages({ pagination: { rowsPerPage: 'Строк на странице' } })

		expect(defaultMessages.pagination.rowsPerPage).toBe(before)
	})
})
