import { FormFieldType } from '@ez-kit/form-core'

import { asOptionValueTexts } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fromKitValues, toKitOptions } from '../option-values'

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
		loading,
		placeholder,
	}: MultiSelectFieldProps<TFormData>): ReactNode {
		// See `select-field.tsx` — the same string↔typed-value bridge, applied to the whole
		// selection rather than one value.
		const kitOptions = toKitOptions(options)

		return (
			<form.AppField name={name}>
				{(field) => (
					<KitMultiSelectField
						{...fieldRenderProps(field, FormFieldType.MultiSelect, { label, description, disabled, required })}
						options={kitOptions}
						loading={loading ?? false}
						placeholder={placeholder}
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
