import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { TextareaFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `TextareaField` component bound to one form instance. */
export function createTextareaField<TFormData>(
	form: BindableForm,
	KitTextareaField: FormComponents['TextareaField'],
): (props: TextareaFieldProps<TFormData>) => ReactNode {
	return function TextareaField({
		name,
		label,
		description,
		disabled,
		required,
		validate,
		placeholder,
		rows,
	}: TextareaFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitTextareaField
						{...fieldRenderProps(field, FormFieldType.Textarea, { label, description, disabled, required, validate })}
						placeholder={placeholder}
						rows={rows}
						value={asText(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
