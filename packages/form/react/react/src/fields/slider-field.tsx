import { FormFieldType } from '@ez-kit/form-core'

import { asNumber } from '../coerce'
import { BASE_FIELD_PROP_KEYS } from '../field-registry'
import { fieldRenderProps } from '../field-render-props'
import { fieldValidators } from '../field-validate'
import { propsOutside } from '../kit-props'

import type { BindableForm } from '../bindable-form'
import type { AllFormFieldSlots } from '../contract'
import type { SliderFieldProps } from '../field-props'
import type { ReactNode } from 'react'

/**
 * Where the thumb rests when the form value is not (yet) a number. A slider has no "empty"
 * position, so it falls back to the track's own start — the `min` the kit was given, or the same
 * `0` Radix and React Aria default their minimum to.
 */
const DEFAULT_SLIDER_ORIGIN = 0

/**
 * Build the `SliderField` component bound to one form instance.
 *
 * As every built-in binder, it hands what it does not bind to the kit flat. It **reads** one of
 * those props without owning it: `min`, which is the kit's to declare, is still where the thumb
 * rests while the value is not a number — the contract promises the kit a concrete `value`, and the
 * track's start is the only position that agrees with the track the kit draws.
 */
export function createSliderField<TFormData>(
	form: BindableForm,
	KitSliderField: AllFormFieldSlots['SliderField'],
): (props: SliderFieldProps<TFormData>) => ReactNode {
	return function SliderField(props: SliderFieldProps<TFormData>): ReactNode {
		const { name, label, description, disabled, required, validate } = props
		const kitProps = propsOutside(props, BASE_FIELD_PROP_KEYS)
		const origin = typeof kitProps.min === 'number' ? kitProps.min : DEFAULT_SLIDER_ORIGIN

		return (
			<form.AppField
				name={name}
				validators={fieldValidators(name, validate)}
			>
				{(field) => (
					<KitSliderField
						{...kitProps}
						{...fieldRenderProps(field, FormFieldType.Slider, { label, description, disabled, required, validate })}
						value={asNumber(field.state.value) ?? origin}
						onChange={(value) => {
							field.handleChange(value)
						}}
					/>
				)}
			</form.AppField>
		)
	}
}
