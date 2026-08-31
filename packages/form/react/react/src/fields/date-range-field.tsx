import { FormFieldType } from '@ez-kit/form-core'

import { asDateRange } from '../coerce'
import { fieldRenderProps } from '../field-render-props'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { DateRangeFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `DateRangeField` component bound to one form instance. */
export function createDateRangeField<TFormData>(
	form: BindableForm,
	KitDateRangeField: FormComponents['DateRangeField'],
): (props: DateRangeFieldProps<TFormData>) => ReactNode {
	return function DateRangeField({
		name,
		label,
		description,
		disabled,
		required,
		placeholder,
		min,
		max,
	}: DateRangeFieldProps<TFormData>): ReactNode {
		return (
			<form.AppField name={name}>
				{(field) => (
					<KitDateRangeField
						{...fieldRenderProps(field, FormFieldType.DateRange, { label, description, disabled, required })}
						placeholder={placeholder}
						min={min}
						max={max}
						value={asDateRange(field.state.value)}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
