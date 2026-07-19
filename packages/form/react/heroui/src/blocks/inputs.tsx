import { Checkbox as HeroCheckbox, Input, NumberField, TextArea, TextField } from '@heroui/react'

import { ariaFieldState } from './field-state'

import type { CheckboxProps, NumberInputProps, TextareaProps, TextInputProps } from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * Value-carrying inputs for the HeroUI v3 kit.
 *
 * HeroUI v3 is built on React Aria, so a field is a **composition**: the state-owning root
 * (`TextField`, `NumberField`, `Checkbox`) wraps the actual control. The label, description
 * and error come from the shared field frame as siblings of this composition, and the
 * frame's `id` / `aria-describedby` do the wiring a React Aria composition would otherwise
 * do for itself.
 */

export function TextInput({
	value,
	onChange,
	type,
	placeholder,
	name,
	id,
	onBlur,
	...state
}: TextInputProps): ReactNode {
	return (
		<TextField
			value={value}
			onChange={onChange}
			name={name}
			{...(type !== undefined ? { type } : {})}
			{...ariaFieldState(state)}
		>
			<Input
				id={id}
				onBlur={onBlur}
				{...(placeholder !== undefined ? { placeholder } : {})}
			/>
		</TextField>
	)
}

export function NumberInput({
	value,
	onChange,
	placeholder,
	min,
	max,
	step,
	name,
	id,
	onBlur,
	...state
}: NumberInputProps): ReactNode {
	return (
		<NumberField
			onChange={onChange}
			name={name}
			// An empty numeric control has no number, and React Aria reads an explicit
			// `undefined` differently from an absent prop under `exactOptionalPropertyTypes`.
			{...(value !== undefined ? { value } : {})}
			{...(min !== undefined ? { minValue: min } : {})}
			{...(max !== undefined ? { maxValue: max } : {})}
			{...(step !== undefined ? { step } : {})}
			{...ariaFieldState(state)}
		>
			<NumberField.Group>
				<NumberField.DecrementButton />
				<NumberField.Input
					id={id}
					onBlur={onBlur}
					{...(placeholder !== undefined ? { placeholder } : {})}
				/>
				<NumberField.IncrementButton />
			</NumberField.Group>
		</NumberField>
	)
}

export function Textarea({ value, onChange, placeholder, rows, name, id, onBlur, ...state }: TextareaProps): ReactNode {
	return (
		// The multi-line control is a bare primitive in HeroUI; `TextField` supplies the
		// value, validation state and change handling around it.
		<TextField
			value={value}
			onChange={onChange}
			name={name}
			{...ariaFieldState(state)}
		>
			<TextArea
				id={id}
				onBlur={onBlur}
				{...(placeholder !== undefined ? { placeholder } : {})}
				{...(rows !== undefined ? { rows } : {})}
			/>
		</TextField>
	)
}

export function Checkbox({ checked, onChange, name, id, onBlur, ...state }: CheckboxProps): ReactNode {
	return (
		<HeroCheckbox
			id={id}
			name={name}
			isSelected={checked}
			onChange={onChange}
			onBlur={onBlur}
			{...ariaFieldState(state)}
		>
			<HeroCheckbox.Content>
				<HeroCheckbox.Control>
					<HeroCheckbox.Indicator />
				</HeroCheckbox.Control>
			</HeroCheckbox.Content>
		</HeroCheckbox>
	)
}
