import { OperatorInput } from '@ez-kit/data-grid-core'
import { describe, expect, it } from 'vitest'

import { activePresetId, presetValue, presetsForOperator } from './date-presets'

import type { DatePreset } from '@ez-kit/data-grid-core'

const LAST_7: DatePreset = {
	id: 'last7',
	label: 'Last 7 days',
	getRange: () => ({ from: '2026-09-08', to: '2026-09-14' }),
}

const YESTERDAY: DatePreset = {
	id: 'yesterday',
	label: 'Yesterday',
	getDate: () => '2026-09-13',
}

const PRESETS = [LAST_7, YESTERDAY]

describe('presetsForOperator', () => {
	it('offers only ranges to an operator that takes a range', () => {
		expect(presetsForOperator(PRESETS, OperatorInput.Range)).toEqual([LAST_7])
	})

	it('offers only single dates to an operator that takes one value', () => {
		expect(presetsForOperator(PRESETS, OperatorInput.Single)).toEqual([YESTERDAY])
	})

	it('offers nothing to an operator that takes a list or no value, or one the column does not offer', () => {
		for (const input of [OperatorInput.List, OperatorInput.None, undefined]) {
			expect(presetsForOperator(PRESETS, input)).toEqual([])
		}
	})
})

describe('presetValue', () => {
	it('writes both ends for a range preset', () => {
		expect(presetValue(LAST_7)).toEqual({ from: '2026-09-08', to: '2026-09-14' })
	})

	it('writes the date itself for a single-date preset', () => {
		expect(presetValue(YESTERDAY)).toBe('2026-09-13')
	})
})

describe('activePresetId', () => {
	it('names the range preset the current value equals', () => {
		expect(activePresetId(PRESETS, { from: '2026-09-08', to: '2026-09-14' })).toBe('last7')
	})

	it('names the single-date preset the current value equals', () => {
		expect(activePresetId(PRESETS, '2026-09-13')).toBe('yesterday')
	})

	it('names none when a range only half matches', () => {
		expect(activePresetId(PRESETS, { from: '2026-09-08', to: '2026-09-10' })).toBeNull()
	})

	it('names none when nothing is filtered yet', () => {
		expect(activePresetId(PRESETS, undefined)).toBeNull()
		expect(activePresetId(PRESETS, {})).toBeNull()
		expect(activePresetId(PRESETS, '')).toBeNull()
	})
})
