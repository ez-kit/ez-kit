import { describe, expect, it } from 'vitest'

import { defaultMessages, resolveMessages } from '../../messages'

import {
	DATE_OPERATORS,
	DATE_RANGE_PRESETS,
	FilterOperator,
	localizeDateRangePresets,
	localizeOperators,
	NUMBER_OPERATORS,
	TEXT_OPERATORS,
} from './operators'

import type { FilterOperatorDef } from './operators'

function labelOf(defs: FilterOperatorDef[], id: string): string | undefined {
	return defs.find((def) => def.id === id)?.label
}

describe('localizeOperators', () => {
	it('leaves the English list untouched, and returns it by reference', () => {
		const localized = localizeOperators(TEXT_OPERATORS as FilterOperatorDef[], 'text', defaultMessages.operators)

		expect(localized).toBe(TEXT_OPERATORS)
	})

	it('names the same comparison differently per cell type', () => {
		const messages = defaultMessages.operators

		expect(
			labelOf(
				localizeOperators(NUMBER_OPERATORS as FilterOperatorDef[], 'number', messages),
				FilterOperator.GreaterThan,
			),
		).toBe('Greater than')
		expect(
			labelOf(localizeOperators(DATE_OPERATORS as FilterOperatorDef[], 'date', messages), FilterOperator.GreaterThan),
		).toBe('After')
	})

	it('applies an override without touching the shared list', () => {
		const messages = resolveMessages({
			operators: { text: { ...defaultMessages.operators.text, contains: 'Содержит' } },
		})

		const localized = localizeOperators(TEXT_OPERATORS as FilterOperatorDef[], 'text', messages.operators)

		expect(labelOf(localized, FilterOperator.Contains)).toBe('Содержит')
		expect(labelOf(TEXT_OPERATORS as FilterOperatorDef[], FilterOperator.Contains)).toBe('Contains')
	})

	it('keeps the emptiness pair, which every cell type shares', () => {
		const messages = resolveMessages({
			operators: { empty: { isEmpty: 'Пусто', isNotEmpty: 'Не пусто' } },
		})

		const localized = localizeOperators(TEXT_OPERATORS as FilterOperatorDef[], 'text', messages.operators)

		expect(labelOf(localized, FilterOperator.IsEmpty)).toBe('Пусто')
	})

	it('leaves a custom operator’s own label alone', () => {
		const custom: FilterOperatorDef[] = [{ id: 'fuzzy', label: 'Fuzzy', filterFn: () => true }]

		expect(localizeOperators(custom, 'text', defaultMessages.operators)).toBe(custom)
	})

	it('falls back to the text group for an unknown cell type', () => {
		const messages = resolveMessages({ operators: { text: { ...defaultMessages.operators.text, equals: 'Равно' } } })

		expect(
			labelOf(
				localizeOperators(TEXT_OPERATORS as FilterOperatorDef[], 'rating', messages.operators),
				FilterOperator.Equals,
			),
		).toBe('Равно')
	})
})

describe('localizeDateRangePresets', () => {
	it('renames a preset and leaves the rest', () => {
		const messages = resolveMessages({
			operators: { presets: { ...defaultMessages.operators.presets, today: 'Сегодня' } },
		})

		const localized = localizeDateRangePresets(DATE_RANGE_PRESETS, messages.operators.presets)

		expect(localized.find((preset) => preset.id === 'today')?.label).toBe('Сегодня')
		expect(localized.find((preset) => preset.id === 'yesterday')?.label).toBe('Yesterday')
	})
})
