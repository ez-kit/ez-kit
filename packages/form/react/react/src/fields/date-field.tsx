import { FormFieldType } from '@ez-kit/form-core'

import { asIsoDate } from '../coerce'
import { fieldRenderProps } from '../field-render-props'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { DateFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `DateField` component bound to one form instance. */
export function createDateField<TFormData>(
	form: BindableForm,
	KitDateField: FormComponents['DateField'],
): (props: DateFieldProps<TFormData>) => ReactNode {
	return function DateField({
		name,
		label,
		description,
		disabled,
		required,
		placeholder,
		min,
		max,
	}: DateFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitDateField
						{...fieldRenderProps(field, FormFieldType.Date, { label, description, disabled, required })}
						placeholder={placeholder}
						min={min}
						max={max}
						value={asIsoDate(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
