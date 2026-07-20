import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { fieldRenderProps } from '../field-render-props'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { TextFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `TextField` component bound to one form instance. */
export function createTextField<TFormData>(
	form: BindableForm,
	KitTextField: FormComponents['TextField'],
): (props: TextFieldProps<TFormData>) => ReactNode {
	return function TextField({
		name,
		label,
		description,
		disabled,
		required,
		type,
		placeholder,
	}: TextFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitTextField
						{...fieldRenderProps(field, FormFieldType.Text, { label, description, disabled, required })}
						type={type}
						placeholder={placeholder}
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
