import { FormFieldType } from '@ez-kit/form-core'

import { asOptionValueTexts } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fromKitValues, toKitOptions } from '../option-values'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { CheckboxGroupFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `CheckboxGroupField` component bound to one form instance. */
export function createCheckboxGroupField<TFormData>(
	form: BindableForm,
	KitCheckboxGroupField: FormComponents['CheckboxGroupField'],
): (props: CheckboxGroupFieldProps<TFormData>) => ReactNode {
	return function CheckboxGroupField({
		name,
		label,
		description,
		disabled,
		required,
		options,
	}: CheckboxGroupFieldProps<TFormData>): ReactNode {
		// See `select-field.tsx` — the same string↔typed-value bridge, for the expanded widget.
		const kitOptions = toKitOptions(options)

		return (
			<form.AppField name={name}>
				{(field) => (
					<KitCheckboxGroupField
						{...fieldRenderProps(field, FormFieldType.CheckboxGroup, { label, description, disabled, required })}
						options={kitOptions}
						value={asOptionValueTexts(field.state.value)}
						onChange={(value) => {
							field.handleChange(fromKitValues(options, value))
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
