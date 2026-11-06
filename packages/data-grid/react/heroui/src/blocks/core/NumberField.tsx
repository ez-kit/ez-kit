'use client'

import { NumberField } from '@heroui/react'
import { useLayoutEffect, useRef } from 'react'

import type { ReactNode } from 'react'

/**
 * `.number-field__group` is a three-column grid — stepper, input, stepper — so without the
 * buttons the input would sit in the 40px stepper column. Span the whole group instead.
 */
const INPUT_CLASS = 'flex-1'
const INPUT_NO_STEPPERS_CLASS = 'flex-1 col-span-full'

type NumberFieldControlProps = {
	id?: string
	className?: string
	/** `undefined` when the field is empty. */
	value: number | undefined
	onChange: (next: number | undefined) => void
	onBlur?: () => void
	/** Filter-only: emit the number already parsed by React Aria while retaining raw input. */
	live?: boolean
	isInvalid?: boolean
	minValue?: number | undefined
	maxValue?: number | undefined
	placeholder?: string
	'aria-label'?: string
	/**
	 * Renders HeroUI's decrement/increment buttons. They are opt-in compound children —
	 * `<NumberField>` shows no steppers unless they are composed in. Editors want them; a
	 * filter value is typed rather than stepped, so filters leave them off.
	 */
	withSteppers?: boolean
	/** Rendered before the input group — the `<Label>`, where the context has one. */
	header?: ReactNode
	/** Rendered after the input group — `<Description>` / `<FieldError>`. */
	footer?: ReactNode
}

/**
 * The kit's one numeric input: `<NumberField>` (parsing, formatting, keyboard stepping)
 * wrapped around a `<NumberField.Group>` so every number field in the grid — cell editor,
 * column filter, both ends of a between-filter — carries the same border and background.
 */
export function NumberFieldControl({
	id,
	className,
	value,
	onChange,
	onBlur,
	isInvalid,
	minValue,
	maxValue,
	placeholder,
	'aria-label': ariaLabel,
	withSteppers = false,
	live = false,
	header,
	footer,
}: NumberFieldControlProps) {
	return (
		<NumberField
			{...(className === undefined ? {} : { className })}
			value={value ?? NaN}
			onChange={(next) => {
				if (!live || !Object.is(Number.isNaN(next) ? undefined : next, value))
					onChange(Number.isNaN(next) ? undefined : next)
			}}
			{...(isInvalid === undefined ? {} : { isInvalid })}
			{...(minValue === undefined ? {} : { minValue })}
			{...(maxValue === undefined ? {} : { maxValue })}
			{...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
		>
			{({ state }) => (
				<>
					{live && (
						<LiveNumberValue
							state={state}
							value={value}
							onChange={onChange}
						/>
					)}

					{header}
					<NumberField.Group>
						{withSteppers && <NumberField.DecrementButton />}
						<NumberField.Input
							className={withSteppers ? INPUT_CLASS : INPUT_NO_STEPPERS_CLASS}
							{...(id === undefined ? {} : { id })}
							{...(placeholder === undefined ? {} : { placeholder })}
							{...(onBlur === undefined ? {} : { onBlur })}
						/>
						{withSteppers && <NumberField.IncrementButton />}
					</NumberField.Group>
					{footer}
				</>
			)}
		</NumberField>
	)
}

/** Reads React Aria's parsed value; never parses or commits/formats the user's raw text. */
function LiveNumberValue({
	state,
	value,
	onChange,
}: {
	state: { inputValue: string; numberValue: number; setInputValue: (value: string) => void }
	value: number | undefined
	onChange: (value: number | undefined) => void
}) {
	const previous = useRef({ value, text: state.inputValue })
	const emitted = useRef<{ value: number | undefined; text: string } | undefined>(undefined)
	useLayoutEffect(() => {
		const old = previous.current
		previous.current = { value, text: state.inputValue }
		if (!Object.is(old.value, value)) {
			if (emitted.current && Object.is(value, emitted.current.value)) {
				// A controlled echo must not format an unfinished decimal or remove leading zeroes.
				if (state.inputValue !== emitted.current.text) {
					previous.current.text = emitted.current.text
					state.setInputValue(emitted.current.text)
				}
			} else emitted.current = undefined
			return
		}
		if (old.text === state.inputValue) return
		if (state.inputValue !== '' && Number.isNaN(state.numberValue)) return
		const next = state.inputValue === '' ? undefined : state.numberValue
		if (emitted.current && Object.is(emitted.current.value, next)) {
			// Formatting on blur (or another spelling of the same number) is not a new scalar edit.
			emitted.current.text = state.inputValue
			return
		}
		emitted.current = { value: next, text: state.inputValue }
		onChange(next)
	}, [state, value, onChange])
	return null
}
