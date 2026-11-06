import { useFilterInput } from './use-filter-input'

import type { InputProps } from '../types'
import type { ComponentType } from 'react'

type FilterTextInputProps = {
	/** DI text input component from the active UI kit. */
	Input: ComponentType<InputProps>
	/** Current committed filter value (string form) coming from the column filter state. */
	value: string
	/** Commits a new value into the column filter. */
	onCommit: (value: string) => void
	placeholder: string
	/**
	 * Accessible name for the input.
	 *
	 * Separate from `placeholder` even though the two carry the same text today: a placeholder is
	 * a hint that disappears the moment the user types, and axe's `label` rule does not accept one
	 * as a name. The kits' `Input` is `InputHTMLAttributes<HTMLInputElement>`, so this reaches the
	 * element whichever kit is mounted.
	 */
	'aria-label': string
	/** Commit debounce in milliseconds. `0` = pass-through (commit on every keystroke). */
	debounce: number
}

/**
 * Debounced text input for column filters.
 *
 * Modeled on {@link GlobalFilterInput}: holds a local `draft`, debounces commits
 * to `onCommit` through the shared commit hook, and syncs the draft back when the
 * external filter value changes (programmatic reset, Clear-all, controlled state).
 *
 * With `debounce === 0` the hook is a pass-through, so commits fire on every
 * keystroke — identical to the previous non-debounced behaviour.
 */
export function FilterTextInput({
	Input,
	value,
	onCommit,
	placeholder,
	'aria-label': ariaLabel,
	debounce,
}: FilterTextInputProps) {
	const input = useFilterInput({ value, onCommit, debounce })

	return (
		<Input
			placeholder={placeholder}
			aria-label={ariaLabel}
			value={input.value}
			onChange={(e) => {
				input.onChange(e.target.value)
			}}
		/>
	)
}
