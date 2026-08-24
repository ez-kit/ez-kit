import { useEffect, useRef, useState } from 'react'

import { useDebouncedValue } from '../utils/use-debounced-value'

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
	/** Commit debounce in milliseconds. `0` = pass-through (commit on every keystroke). */
	debounce: number
	/**
	 * Pressing Enter in the input should apply the whole pending draft, not just this
	 * filter — sorting, filters and search commit together in one request. Left
	 * `undefined` when `deferredApply` is off, so Enter keeps its default meaning.
	 */
	onEnterApply?: () => void
}

/**
 * Debounced text input for column filters.
 *
 * Modeled on {@link GlobalFilterInput}: holds a local `draft`, debounces commits
 * to `onCommit` via {@link useDebouncedValue}, and syncs the draft back when the
 * external filter value changes (programmatic reset, Clear-all, controlled state).
 *
 * With `debounce === 0` the hook is a pass-through, so commits fire on every
 * keystroke — identical to the previous non-debounced behaviour.
 */
export function FilterTextInput({ Input, value, onCommit, placeholder, debounce, onEnterApply }: FilterTextInputProps) {
	const [draft, setDraft] = useState(value)
	const debouncedDraft = useDebouncedValue(draft, debounce)

	// React state-during-render pattern: detect external mutations of the column
	// filter value (programmatic reset, Clear-all, controlled mode) and pull the
	// new value into our draft without an effect.
	const [prevValue, setPrevValue] = useState(value)
	if (value !== prevValue) {
		setPrevValue(value)
		if (value !== draft && value !== debouncedDraft) {
			setDraft(value)
		}
	}

	const isFirstRunRef = useRef(true)
	useEffect(() => {
		if (isFirstRunRef.current) {
			isFirstRunRef.current = false
			return
		}
		onCommit(debouncedDraft)
		// `onCommit` calls a stable `column.setFilterValue` — intentionally omitted
		// from deps so we only commit when the debounced draft actually changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [debouncedDraft])

	return (
		<Input
			placeholder={placeholder}
			value={draft}
			onChange={(e) => {
				setDraft(e.target.value)
			}}
			onKeyDown={(e) => {
				if (e.key !== 'Enter') return
				if (!onEnterApply) return
				e.preventDefault()
				onEnterApply()
			}}
		/>
	)
}
