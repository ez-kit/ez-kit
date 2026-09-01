import { FormFieldType } from '@ez-kit/form-core'

import { asStringArray } from '../coerce'
import { fieldRenderProps } from '../field-render-props'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { MultiSelectFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `MultiSelectField` component bound to one form instance. */
export function createMultiSelectField<TFormData>(
	form: BindableForm,
	KitMultiSelectField: FormComponents['MultiSelectField'],
): (props: MultiSelectFieldProps<TFormData>) => ReactNode {
	return function MultiSelectField({
		name,
		label,
		description,
		disabled,
		required,
		options,
		placeholder,
	}: MultiSelectFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitMultiSelectField
						{...fieldRenderProps(field, FormFieldType.MultiSelect, { label, description, disabled, required })}
						options={options}
						placeholder={placeholder}
						value={asStringArray(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
