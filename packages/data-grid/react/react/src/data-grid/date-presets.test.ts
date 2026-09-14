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
	it('offers only ranges to between', () => {
		expect(presetsForOperator(PRESETS, 'between')).toEqual([LAST_7])
	})

	it('offers only single dates to the operators that take one value', () => {
		for (const operator of ['equals', 'notEquals', 'lessThan', 'greaterThan', 'lessOrEqual', 'greaterOrEqual']) {
			expect(presetsForOperator(PRESETS, operator)).toEqual([YESTERDAY])
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
