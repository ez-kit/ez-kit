import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { fieldRenderProps } from '../field-render-props'
import { fromKitValue, toKitOptions } from '../option-values'
import { CLEARED_VALUE, FieldOptions } from '../options/field-options'

import type { BindableForm } from '../bindable-form'
import type { FormComponents } from '../contract'
import type { SelectFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/** Build the `SelectField` component bound to one form instance. */
export function createSelectField<TFormData>(
	form: BindableForm,
	KitSelectField: FormComponents['SelectField'],
): (props: SelectFieldProps<TFormData>) => ReactNode {
	return function SelectField(props: SelectFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, placeholder } = props

		// `FieldOptions` sits *above* `AppField`: a named source decides what this field may
		// hold, so it must be able to clear the field when its parameters change.
		return (
			<FieldOptions
				binding={props}
				form={form}
				name={name}
				clearedValue={CLEARED_VALUE}
			>
				{({ options, loading }) => (
					<form.AppField name={name}>
						{(field) => (
							<KitSelectField
								{...fieldRenderProps(field, FormFieldType.Select, { label, description, disabled, required })}
								// The kit contract is string-only at the DOM edge, so a numeric option list goes
								// down stringified and the string that comes back is looked up in this very list
								// — see `option-values.ts`.
								options={toKitOptions(options)}
								loading={loading}
								placeholder={placeholder}
								value={asText(field.state.value)}
								onChange={(value) => {
									field.handleChange(fromKitValue(options, value))
								}}
							/>
						)}
					</form.AppField>
				)}
			</FieldOptions>
		)
	}
}
