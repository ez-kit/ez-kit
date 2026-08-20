import type { MultiSelectOption } from '@ez-kit/data-grid-core'

const DEFAULT_PLACEHOLDER = 'Select…'

/**
 * The label a multi-select filter trigger shows: the placeholder while nothing is picked,
 * the single option's label for exactly one, and a count beyond that.
 *
 * Content, not styling — every kit shows the same words.
 */
export function buildMultiSelectLabel(
	options: MultiSelectOption[],
	selectedValues: string[],
	placeholder?: string,
): string {
	const [first] = selectedValues
	if (first === undefined) return placeholder ?? DEFAULT_PLACEHOLDER
	if (selectedValues.length === 1) return options.find((option) => option.value === first)?.label ?? first
	return `${String(selectedValues.length)} selected`
}
