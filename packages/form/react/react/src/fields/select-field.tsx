import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { fieldRenderProps } from '../field-render-props'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { SelectFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `SelectField` component bound to one form instance. */
export function createSelectField<TFormData>(
	form: BindableForm,
	KitSelectField: FormComponents['SelectField'],
): (props: SelectFieldProps<TFormData>) => ReactNode {
	return function SelectField({
		name,
		label,
		description,
		disabled,
		required,
		options,
		placeholder,
	}: SelectFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitSelectField
						{...fieldRenderProps(field, FormFieldType.Select, { label, description, disabled, required })}
						options={options}
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
