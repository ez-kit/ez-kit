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
		variant: 'inputs',
		type: 'number',
		...overrides,
	}
	const { result } = renderHook(() => useBetweenValue(props))
	return { controller: result.current, onChange }
}

describe('branch resolution', () => {
	it('resolves the slider branch regardless of value type', () => {
		expect(setup({ variant: 'slider', type: 'number' }).controller.branch).toBe(BetweenBranch.Slider)
		expect(setup({ variant: 'slider', type: 'date' }).controller.branch).toBe(BetweenBranch.Slider)
	})

	it('resolves the calendar branch only for date columns', () => {
		expect(setup({ variant: 'calendar', type: 'date' }).controller.branch).toBe(BetweenBranch.Calendar)
		expect(setup({ variant: 'calendar', type: 'number' }).controller.branch).toBe(BetweenBranch.NumberInputs)
	})

	it('falls back to paired date inputs for date columns', () => {
		expect(setup({ variant: 'inputs', type: 'date' }).controller.branch).toBe(BetweenBranch.DateInputs)
	})
})

describe('slider bounds', () => {
	it('defaults the bounds when the column configures none', () => {
		const { controller } = setup({ variant: 'slider' })
		expect(controller.slider.min).toBe(0)
		expect(controller.slider.max).toBe(100)
	})

	it('falls each unset end back to its own bound', () => {
		const { controller } = setup({ variant: 'slider', min: 10, max: 90, value: { from: 42 } })
		expect(controller.slider.values).toEqual([42, 90])
	})

	it('ignores an emitted value that is not a numeric pair', () => {
		const { controller, onChange } = setup({ variant: 'slider' })
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
})

describe('date inputs', () => {
	it('sets one end without disturbing the other', () => {
		const { controller, onChange } = setup({ type: 'date', value: { from: '2026-01-01', to: '2026-02-01' } })
		controller.dates.onToChange('2026-03-01')
		expect(onChange).toHaveBeenCalledWith({ from: '2026-01-01', to: '2026-03-01' })
	})
})
