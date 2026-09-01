import { isDateRangeValue, isIsoDate } from '@ez-kit/form-core'

import type { DateRangeValue } from '@ez-kit/form-core'

/**
 * Coercions from the untyped `field.state.value` to the value type an injected input
 * expects.
 *
 * `AnyFieldApi` deliberately erases the field's value type, and a consumer can always
 * hand `defaultValues` that disagree with the field they render. Coercing here keeps a
 * mismatch from reaching the kit's input as an invalid `value` prop.
 */

/** An empty text control is an empty string, never `undefined` — React would uncontrol it. */
export function asText(value: unknown): string {
	if (typeof value === 'string') {
		return value
	}

	return value == null ? '' : String(value)
}

/** An empty numeric control is genuinely "no number", which `undefined` models and `NaN` does not. */
export function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

/**
 * An empty date control is genuinely "no date", so anything that is not a well-formed
 * `YYYY-MM-DD` string — including a `Date` object a caller's `defaultValues` slipped in —
 * arrives at the kit as `undefined` rather than as a value its picker would have to guess at.
 */
export function asIsoDate(value: unknown): string | undefined {
	return isIsoDate(value) ? value : undefined
}

/** The same for a range: both ends present and well-formed, or nothing. */
export function asDateRange(value: unknown): DateRangeValue | undefined {
	return isDateRangeValue(value) ? value : undefined
}

/**
 * A multi-value control always holds a list: anything else in form state (a bare string a
 * consumer's `defaultValues` set, `undefined` before the field is touched) becomes `[]` rather
 * than reaching the kit as a value it would have to guess at. Non-string entries are dropped
 * for the same reason — an option value is a string.
 */
export function asStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
}

export function asBoolean(value: unknown): boolean {
	return value === true
}
