import type { OptionValue, SelectOption } from '@ez-kit/form-core'

/**
 * The string↔typed-value bridge for the select-like fields.
 *
 * A select's option values may be strings or numbers (see `OptionValue`), but the kit
 * contract stays **string-only** at the DOM edge: Radix requires string item values and
 * reserves `''`, and React Aria keys are strings too. So the binding layer stringifies option
 * values on the way down and maps the string a kit reports back to the original typed value
 * on the way up. Kits learn nothing about this — one lookup, in one place.
 */

/** Stringify every option value, yielding the string-valued list the kit contract takes. */
export function toKitOptions(options: readonly SelectOption<OptionValue>[]): SelectOption[] {
	return options.map((option) => ({ ...option, value: String(option.value) }))
}

/**
 * Map a string reported by the kit back to the option value it was made from.
 *
 * A **lookup**, never `Number(value)`: the list is the only authority on what type a value
 * had, so looking it up preserves the original exactly — a blind coercion would turn a
 * string-valued `'42'` into a number, and would invent a number for anything numeric-looking
 * the schema never offered. A string that matches no option (the empty string a kit reports
 * for "nothing selected", most of all) passes through unchanged.
 */
export function fromKitValue(options: readonly SelectOption<OptionValue>[], value: string): OptionValue {
	const match = options.find((option) => String(option.value) === value)
	return match === undefined ? value : match.value
}

/** `fromKitValue` for a multi-value field's whole selection. */
export function fromKitValues(options: readonly SelectOption<OptionValue>[], values: readonly string[]): OptionValue[] {
	return values.map((value) => fromKitValue(options, value))
}
