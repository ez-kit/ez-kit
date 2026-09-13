import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BetweenBranch, useBetweenValue } from './use-between-value'

import type { BetweenInputProps } from '../types'

const PRESETS = [{ id: 'last-7', label: 'Last 7 days', getRange: () => ({ from: 'a', to: 'b' }) }]

function setup(overrides: Partial<BetweenInputProps> = {}) {
	const onChange = vi.fn()
	const props: BetweenInputProps = {
		value: {},
		onChange,
		type: 'number',
		...overrides,
	}
	const { result } = renderHook(() => useBetweenValue(props))
	return { controller: result.current, onChange }
}

describe('branch resolution', () => {
	it('resolves a date column to the one date-range control', () => {
		expect(setup({ type: 'date' }).controller.branch).toBe(BetweenBranch.DateRange)
	})

	it('resolves the slider only for a number column with both bounds', () => {
		expect(setup({ slider: true, min: 0, max: 10 }).controller.branch).toBe(BetweenBranch.Slider)
	})

	it('falls back to number inputs when the slider has no bounded domain', () => {
		expect(setup({ slider: true, min: 0 }).controller.branch).toBe(BetweenBranch.NumberInputs)
		expect(setup({ slider: true }).controller.branch).toBe(BetweenBranch.NumberInputs)
	})

	it('ignores the slider on a date column', () => {
		expect(setup({ slider: true, min: 0, max: 10, type: 'date' }).controller.branch).toBe(BetweenBranch.DateRange)
	})

	it('resolves number inputs by default', () => {
		expect(setup().controller.branch).toBe(BetweenBranch.NumberInputs)
	})
})

describe('slider bounds', () => {
	it('takes the bounds the column declared', () => {
		const { controller } = setup({ slider: true, min: 10, max: 90 })
		expect(controller.slider.min).toBe(10)
		expect(controller.slider.max).toBe(90)
	})

	it('falls each unset end back to its own bound', () => {
		const { controller } = setup({ slider: true, min: 10, max: 90, value: { from: 42 } })
		expect(controller.slider.values).toEqual([42, 90])
	})

	it('ignores an emitted value that is not a numeric pair', () => {
		const { controller, onChange } = setup({ slider: true, min: 0, max: 100 })
		controller.slider.onChange(5)
		controller.slider.onChange(['a', 'b'])
		expect(onChange).not.toHaveBeenCalled()

		controller.slider.onChange([1, 2])
		expect(onChange).toHaveBeenCalledWith({ from: 1, to: 2 })
	})
})

describe('number inputs', () => {
	it('forwards the configured min and max', () => {
		const { controller } = setup({ min: 1, max: 5 })
		expect(controller.numbers.min).toBe(1)
		expect(controller.numbers.max).toBe(5)
	})

	it('omits bounds the column did not configure', () => {
		const { controller } = setup()
		expect('min' in controller.numbers).toBe(false)
		expect('max' in controller.numbers).toBe(false)
	})

	it('renders an unset end as an empty controlled value', () => {
		const { controller } = setup({ value: { from: 3 } })
		expect(controller.numbers.from).toBe(3)
		expect(controller.numbers.to).toBe('')
	})

	it('clears the edited end when the field is emptied', () => {
		const { controller, onChange } = setup({ value: { from: 3, to: 9 } })
		controller.numbers.onFromChange(Number.NaN)
		expect(onChange).toHaveBeenCalledWith({ from: undefined, to: 9 })
	})

	it('keeps the other end untouched when one changes', () => {
		const { controller, onChange } = setup({ value: { from: 3, to: 9 } })
		controller.numbers.onToChange(12)
		expect(onChange).toHaveBeenCalledWith({ from: 3, to: 12 })
	})
})

describe('presets', () => {
	it('is null when the column configures none', () => {
		expect(setup().controller.presets).toBeNull()
		expect(setup({ presets: [] }).controller.presets).toBeNull()
	})

	it('is null when presets exist but nothing handles a selection', () => {
		expect(setup({ presets: PRESETS }).controller.presets).toBeNull()
	})

	it('exposes the presets once both halves are configured', () => {
		const onPresetSelect = vi.fn()
		const { controller } = setup({ presets: PRESETS, onPresetSelect })
		expect(controller.presets?.items).toBe(PRESETS)
		expect(controller.presets?.onSelect).toBe(onPresetSelect)
	})

	it('has no active preset while the range is unset', () => {
		const { controller } = setup({ presets: PRESETS, onPresetSelect: vi.fn() })
		expect(controller.presets?.activeId).toBeNull()
	})

	it('names the preset whose range the current value equals', () => {
		const { controller } = setup({
			presets: PRESETS,
			onPresetSelect: vi.fn(),
			value: { from: 'a', to: 'b' },
		})
		expect(controller.presets?.activeId).toBe('last-7')
	})

	it('has no active preset when only one end matches', () => {
		const { controller } = setup({
			presets: PRESETS,
			onPresetSelect: vi.fn(),
			value: { from: 'a', to: 'other' },
		})
		expect(controller.presets?.activeId).toBeNull()
	})
})
