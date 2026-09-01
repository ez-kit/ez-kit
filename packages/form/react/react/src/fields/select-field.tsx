import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fromKitValue, toKitOptions } from '../option-values'

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
		// The kit contract is string-only at the DOM edge, so a numeric option list goes down
		// stringified and the string that comes back is looked up in this very list — see
		// `option-values.ts`.
		const kitOptions = toKitOptions(options)

		return (
			<form.AppField name={name}>
				{(field) => (
					<KitSelectField
						{...fieldRenderProps(field, FormFieldType.Select, { label, description, disabled, required })}
						options={kitOptions}
						placeholder={placeholder}
						value={asText(field.state.value)}
						onChange={(value) => {
							field.handleChange(fromKitValue(options, value))
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
