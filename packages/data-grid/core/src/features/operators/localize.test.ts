import { describe, expect, it } from 'vitest'

import { defaultMessages, resolveMessages } from '../../messages'

import { DATE_RANGE_PRESETS, localizeDatePresets } from './operators'

describe('localizeDatePresets', () => {
	it('renames a preset from `filtering.presets` and leaves the rest', () => {
		const messages = resolveMessages({
			filtering: { presets: { ...defaultMessages.filtering.presets, today: 'Сегодня' } },
		})

		const localized = localizeDatePresets(DATE_RANGE_PRESETS, messages.filtering.presets)

		expect(localized.find((preset) => preset.id === 'today')?.label).toBe('Сегодня')
		expect(localized.find((preset) => preset.id === 'yesterday')?.label).toBe('Yesterday')
	})

	it('returns the list by reference on the English default', () => {
		expect(localizeDatePresets(DATE_RANGE_PRESETS, defaultMessages.filtering.presets)).toBe(DATE_RANGE_PRESETS)
	})
})
