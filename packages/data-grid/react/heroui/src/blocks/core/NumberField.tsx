'use client'

import { NumberField } from '@heroui/react'

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
	header,
	footer,
}: NumberFieldControlProps) {
	return (
		<NumberField
			{...(className === undefined ? {} : { className })}
			value={value ?? NaN}
			onChange={(next) => {
				onChange(Number.isNaN(next) ? undefined : next)
			}}
			{...(isInvalid === undefined ? {} : { isInvalid })}
			{...(minValue === undefined ? {} : { minValue })}
			{...(maxValue === undefined ? {} : { maxValue })}
			{...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
		>
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
		</NumberField>
	)
}
