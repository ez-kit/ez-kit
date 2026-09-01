import { FormFieldType } from '@ez-kit/form-core'

import { asOptionValueTexts } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fromKitValues, toKitOptions } from '../option-values'
import { CLEARED_LIST, FieldOptions } from '../options/field-options'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { MultiSelectFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `MultiSelectField` component bound to one form instance. */
export function createMultiSelectField<TFormData>(
	form: BindableForm,
	KitMultiSelectField: FormComponents['MultiSelectField'],
): (props: MultiSelectFieldProps<TFormData>) => ReactNode {
	return function MultiSelectField(props: MultiSelectFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, placeholder, searchable } = props

		// See `select-field.tsx` — the same string↔typed-value bridge, the same
		// options-above-the-binding layering, and the same `searchable` plumbing, applied to
		// the whole selection. `FieldOptions` hands `useSelectedOptions` every selected value,
		// so each chip can be labelled even when the current page of results holds none of them.
		return (
			<FieldOptions
				binding={props}
				form={form}
				name={name}
				clearedValue={CLEARED_LIST}
				searchable={searchable}
			>
				{({ options, loading, search }) => (
					<form.AppField name={name}>
						{(field) => (
							<KitMultiSelectField
								{...fieldRenderProps(field, FormFieldType.MultiSelect, { label, description, disabled, required })}
								options={toKitOptions(options)}
								loading={loading}
								search={search}
								placeholder={placeholder}
								value={asOptionValueTexts(field.state.value)}
								onChange={(value) => {
									field.handleChange(fromKitValues(options, value))
								}}
							/>
						)}
					</form.AppField>
				)}
			</FieldOptions>
		)
	}
}
