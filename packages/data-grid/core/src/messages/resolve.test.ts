import { describe, expect, it } from 'vitest'

import { defaultMessages } from './defaults'
import { resolveMessages } from './resolve'

import type { PartialGridMessages } from './types'

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

	it('gives the row move entries defaults and lets them be overridden', () => {
		const messages = resolveMessages({ rowActions: { moveUp: 'Выше', moveDown: 'Ниже' } })

		expect(messages.rowActions.moveUp).toBe('Выше')
		expect(messages.rowActions.moveDown).toBe('Ниже')
		expect(messages.rowActions.order).toBe('Order')
		expect(messages.rowActions.ordering).toBe('Row order')
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

		expect(messages.filtering.placeholder({ columnId: 'email', label: 'Email' })).toBe('Фильтр по email')
	})

	it('names a column filter by its label, not its id, by default', () => {
		const messages = resolveMessages()

		expect(messages.filtering.placeholder({ columnId: 'firstName', label: 'First name' })).toBe('Filter First name…')
	})

	it('names the operator trigger by the current operator’s label', () => {
		expect(resolveMessages().filtering.operatorTrigger({ label: 'Contains' })).toBe('Filter operator: Contains')
	})

	it('keeps the default operator trigger name for a dictionary that does not set it', () => {
		const messages = resolveMessages({ filtering: { operator: 'Оператор фильтра' } })

		expect(messages.filtering.operatorTrigger({ label: 'Содержит' })).toBe('Filter operator: Содержит')
	})

	it('keeps a nested record’s other entries when one of them is overridden', () => {
		const messages = resolveMessages({ filtering: { presets: { today: 'Сегодня' } } })

		expect(messages.filtering.presets.today).toBe('Сегодня')
		expect(messages.filtering.presets.yesterday).toBe(defaultMessages.filtering.presets.yesterday)
		expect(messages.filtering.from).toBe(defaultMessages.filtering.from)
	})

	it('merges a nested record across layers, entry by entry', () => {
		const messages = resolveMessages(
			{ filtering: { presets: { today: 'Сегодня', yesterday: 'Вчера' } } },
			{ filtering: { presets: { today: 'Сейчас' } } },
		)

		expect(messages.filtering.presets.today).toBe('Сейчас')
		expect(messages.filtering.presets.yesterday).toBe('Вчера')
	})

	it('replaces a parameterized entry whole rather than merging into it', () => {
		const count = ({ count }: { count: number }) => `Выбрано: ${String(count)}`
		const messages = resolveMessages({ selection: { count } })

		expect(messages.selection.count).toBe(count)
	})

	it('ignores a nested record written as undefined', () => {
		// The type forbids it; a layer assembled at runtime (a spread of an optional value) does not.
		const layer = { filtering: { presets: undefined } } as unknown as PartialGridMessages
		const messages = resolveMessages(layer)

		expect(messages.filtering.presets).toEqual(defaultMessages.filtering.presets)
	})

	it('ignores an entry of a nested record written as undefined', () => {
		const layer = { filtering: { presets: { today: undefined } } } as unknown as PartialGridMessages
		const messages = resolveMessages(layer)

		expect(messages.filtering.presets.today).toBe(defaultMessages.filtering.presets.today)
	})

	it('does not mutate the default dictionary', () => {
		const before = defaultMessages.pagination.rowsPerPage

		resolveMessages({ pagination: { rowsPerPage: 'Строк на странице' } })

		expect(defaultMessages.pagination.rowsPerPage).toBe(before)
	})
})
