import { FormFieldType } from '@ez-kit/form-core'

import { asText } from '../coerce'
import { OPTION_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'
import { fromKitValue, toKitOptions } from '../option-values'
import { CLEARED_VALUE, FieldOptions } from '../options/field-options'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { SelectFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `SelectField` component bound to one form instance.
 *
 * The binder keeps the option provision and its binding props; everything else the author wrote
 * reaches the kit component flat, ahead of the computed props, so a computed key always wins.
 */
export function createSelectField<TFormData>(
	form: BindableForm,
	KitSelectField: AllFormFieldSlots['SelectField'],
): (props: SelectFieldProps<TFormData>) => ReactNode {
	return function SelectField(props: SelectFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate, searchable, creatable, createLabel } = props
		const kitProps = propsOutside(props, OPTION_FIELD_PROP_KEYS)

		// `FieldOptions` sits *above* `AppField`: a named source decides what this field may
		// hold, so it must be able to clear the field when its parameters change.
		return (
			<FieldOptions
				binding={props}
				form={form}
				name={name}
				clearedValue={CLEARED_VALUE}
				searchable={searchable}
				creatable={creatable}
				createLabel={createLabel}
			>
				{({ options, loading, search }) => (
					<form.AppField
						name={name}
						validators={fieldValidators(name, validate)}
					>
						{(field) => (
							<KitSelectField
								{...kitProps}
								{...fieldRenderProps(field, FormFieldType.Select, { label, description, disabled, required, validate })}
								// The kit contract is string-only at the DOM edge, so a numeric option list goes
								// down stringified and the string that comes back is looked up in this very list
								// — see `option-values.ts`.
								options={toKitOptions(options)}
								loading={loading}
								search={search}
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
