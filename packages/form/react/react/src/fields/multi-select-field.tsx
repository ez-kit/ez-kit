import { FormFieldType } from '@ez-kit/form-core'

import { asOptionValueTexts } from '../coerce'
import { OPTION_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'
import { fromKitValues, toKitOptions } from '../option-values'
import { CLEARED_LIST, FieldOptions } from '../options/field-options'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { MultiSelectFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Build the `MultiSelectField` component bound to one form instance.
 *
 * The binder keeps the option provision and its binding props; everything else the author wrote
 * reaches the kit component flat, ahead of the computed props, so a computed key always wins.
 */
export function createMultiSelectField<TFormData>(
	form: BindableForm,
	KitMultiSelectField: AllFormFieldSlots['MultiSelectField'],
): (props: MultiSelectFieldProps<TFormData>) => ReactNode {
	return function MultiSelectField(props: MultiSelectFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate, searchable, creatable, createLabel } = props
		const kitProps = propsOutside(props, OPTION_FIELD_PROP_KEYS)

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
				creatable={creatable}
				createLabel={createLabel}
			>
				{({ options, loading, search }) => (
					<form.AppField
						name={name}
						validators={fieldValidators(name, validate)}
					>
						{(field) => (
							<KitMultiSelectField
								{...kitProps}
								{...fieldRenderProps(field, FormFieldType.MultiSelect, {
									label,
									description,
									disabled,
									required,
									validate,
								})}
								options={toKitOptions(options)}
								loading={loading}
								search={search}
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
