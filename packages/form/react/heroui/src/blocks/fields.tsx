import {
	Checkbox as HeroCheckbox,
	Input,
	NumberField as HeroNumberField,
	TextArea,
	TextField as HeroTextField,
} from '@heroui/react'

import { FieldDescription, FieldErrorText, FieldLabel } from './field-chrome'
import { fieldRoot } from './field-state'

import type {
	CheckboxFieldRenderProps,
	NumberFieldRenderProps,
	TextareaFieldRenderProps,
	TextFieldRenderProps,
} from '@ez-kit/form-react'
import type { ReactNode } from 'react'

/**
 * The value-carrying fields of the HeroUI v3 kit.
 *
 * Every one follows HeroUI's documented anatomy verbatim — `Label`, the control,
 * `Description`, `FieldError`, all children of the state-owning root. That is what earns
 * the kit's real spacing, focus and invalid styling instead of an approximation of it.
 */

export function TextField({
	value,
	onChange,
	type,
	placeholder,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: TextFieldRenderProps): ReactNode {
	return (
		<HeroTextField
			value={value}
			onChange={onChange}
			name={name}
			{...(type !== undefined ? { type } : {})}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<Input
				id={id}
				onBlur={onBlur}
				{...(placeholder !== undefined ? { placeholder } : {})}
			/>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroTextField>
	)
}

export function NumberField({
	value,
	onChange,
	placeholder,
	min,
	max,
	step,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: NumberFieldRenderProps): ReactNode {
	return (
		<HeroNumberField
			onChange={onChange}
			name={name}
			// An empty numeric control has no number, and React Aria reads an explicit
			// `undefined` differently from an absent prop under `exactOptionalPropertyTypes`.
			{...(value !== undefined ? { value } : {})}
			{...(min !== undefined ? { minValue: min } : {})}
			{...(max !== undefined ? { maxValue: max } : {})}
			{...(step !== undefined ? { step } : {})}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<HeroNumberField.Group>
				<HeroNumberField.DecrementButton />
				<HeroNumberField.Input
					id={id}
					onBlur={onBlur}
					{...(placeholder !== undefined ? { placeholder } : {})}
				/>
				<HeroNumberField.IncrementButton />
			</HeroNumberField.Group>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroNumberField>
	)
}

export function TextareaField({
	value,
	onChange,
	placeholder,
	rows,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: TextareaFieldRenderProps): ReactNode {
	return (
		// The multi-line control is a bare primitive in HeroUI; `TextField` supplies the
		// value, validation state and change handling around it.
		<HeroTextField
			value={value}
			onChange={onChange}
			name={name}
			{...fieldRoot(field)}
		>
			<FieldLabel label={label} />
			<TextArea
				id={id}
				onBlur={onBlur}
				{...(placeholder !== undefined ? { placeholder } : {})}
				{...(rows !== undefined ? { rows } : {})}
			/>
			<FieldDescription description={description} />
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroTextField>
	)
}

export function CheckboxField({
	checked,
	onChange,
	id,
	name,
	onBlur,
	label,
	description,
	errors,
	...field
}: CheckboxFieldRenderProps): ReactNode {
	return (
		// The checkbox root is the row: control first, then `Checkbox.Content` — the column
		// holding label and description. That is HeroUI's own anatomy, and it is why this kit
		// no longer needs CSS `order` tricks to get `[control] Label` reading order.
		<HeroCheckbox
			id={id}
			name={name}
			isSelected={checked}
			onChange={onChange}
			onBlur={onBlur}
			{...fieldRoot(field)}
		>
			<HeroCheckbox.Control>
				<HeroCheckbox.Indicator />
			</HeroCheckbox.Control>
			<HeroCheckbox.Content>
				<FieldLabel label={label} />
				<FieldDescription description={description} />
			</HeroCheckbox.Content>
			<FieldErrorText
				errors={errors}
				invalid={field.invalid}
			/>
		</HeroCheckbox>
	)
}
