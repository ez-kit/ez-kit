import { FormFieldType } from '@ez-kit/form-core'

import { asNumber } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { NumberFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `NumberField` component bound to one form instance. */
export function createNumberField<TFormData>(
	form: BindableForm,
	KitNumberField: FormComponents['NumberField'],
): (props: NumberFieldProps<TFormData>) => ReactNode {
	return function NumberField({
		name,
		label,
		description,
		disabled,
		required,
		validate,
		placeholder,
		min,
		max,
		step,
	}: NumberFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitNumberField
						{...fieldRenderProps(field, FormFieldType.Number, { label, description, disabled, required, validate })}
						placeholder={placeholder}
						min={min}
						max={max}
						step={step}
						value={asNumber(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
