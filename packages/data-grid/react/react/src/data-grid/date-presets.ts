import { OperatorInput, isDateRangePreset } from '@ez-kit/data-grid-core'

import type { BetweenValue, DatePreset } from '@ez-kit/data-grid-core'

/**
 * Which of a column's presets an operator taking `input` can actually take.
 *
 * A preset fills the operator's value, and the two kinds fill different shapes: an operator with
 * `input: 'range'` takes a range, one with `input: 'single'` takes one date, and one that takes a
 * list or no value takes neither. Offering a range to `equals` would mean picking one of its ends,
 * which turns "the last week" into "on last Tuesday" — so the mismatched half is not bent, it is
 * left out.
 */
export function presetsForOperator(presets: DatePreset[], input: OperatorInput | undefined): DatePreset[] {
	if (input === OperatorInput.Range) return presets.filter(isDateRangePreset)
	if (input === OperatorInput.Single) return presets.filter((preset) => !isDateRangePreset(preset))
	return []
}

/** The value a preset writes into the filter: both ends for a range, the date itself otherwise. */
export function presetValue(preset: DatePreset, now?: Date): BetweenValue<string> | string {
	return isDateRangePreset(preset) ? preset.getRange(now) : preset.getDate(now)
}

/**
 * Which preset the current filter value came from, by value rather than by memory of the last
 * click: a value the user then edited by hand stops being "Last 7 days", and one restored from a
 * deep link is recognised without any click having happened in this session.
 */
export function activePresetId(presets: DatePreset[], value: unknown, now?: Date): string | null {
	return (
		presets.find((preset) => {
			if (isDateRangePreset(preset)) {
				if (typeof value !== 'object' || value === null) return false
				const { from, to } = value as BetweenValue
				if (from === undefined || to === undefined) return false
				const range = preset.getRange(now)
				return range.from === from && range.to === to
			}
			return typeof value === 'string' && value !== '' && preset.getDate(now) === value
		})?.id ?? null
	)
}
