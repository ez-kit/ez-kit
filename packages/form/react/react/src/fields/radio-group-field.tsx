import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fromKitValue, toKitOptions } from '../option-values'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { RadioGroupFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `RadioGroupField` component bound to one form instance. */
export function createRadioGroupField<TFormData>(
	form: BindableForm,
	KitRadioGroupField: FormComponents['RadioGroupField'],
): (props: RadioGroupFieldProps<TFormData>) => ReactNode {
	return function RadioGroupField({
		name,
		label,
		description,
		disabled,
		required,
		options,
		loading,
	}: RadioGroupFieldProps<TFormData>): ReactNode {
		// See `select-field.tsx` — the same string↔typed-value bridge, for the expanded widget.
		const kitOptions = toKitOptions(options)

		return (
			<form.AppField name={name}>
				{(field) => (
					<KitRadioGroupField
						{...fieldRenderProps(field, FormFieldType.RadioGroup, { label, description, disabled, required })}
						options={kitOptions}
						loading={loading ?? false}
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
