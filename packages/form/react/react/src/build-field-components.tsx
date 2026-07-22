import { createCheckboxField } from './fields/checkbox-field'
import { createFormWrapper, createSubmitButton } from './fields/form-parts'
import { createNumberField } from './fields/number-field'
import { createRadioGroupField } from './fields/radio-group-field'
import { createSelectField } from './fields/select-field'
import { createSliderField } from './fields/slider-field'
import { createSwitchField } from './fields/switch-field'
import { createTextField } from './fields/text-field'
import { createTextareaField } from './fields/textarea-field'

import type { BindableForm } from './bindable-form'
import type { FormComponents } from './contract'
import type { FormFieldComponents } from './field-props'

/**
 * Build the flat field components for one form instance.
 *
 * Each component closes over both the injected `components` and the `form` it belongs to,
 * which is why they are built per instance rather than once per kit: `form.AppField` needs
 * the concrete form. `createForm` memoises the result so the identities stay stable across
 * renders and React never remounts the inputs.
 */
export function buildFieldComponents<TFormData>(
	form: BindableForm,
	components: FormComponents,
): FormFieldComponents<TFormData> {
	const {
		TextField: KitTextField,
		NumberField: KitNumberField,
		TextareaField: KitTextareaField,
		SelectField: KitSelectField,
		CheckboxField: KitCheckboxField,
		SwitchField: KitSwitchField,
		RadioGroupField: KitRadioGroupField,
		SliderField: KitSliderField,
		Button,
		Form,
	} = components

	return {
		TextField: createTextField<TFormData>(form, KitTextField),
		NumberField: createNumberField<TFormData>(form, KitNumberField),
		TextareaField: createTextareaField<TFormData>(form, KitTextareaField),
		SelectField: createSelectField<TFormData>(form, KitSelectField),
		CheckboxField: createCheckboxField<TFormData>(form, KitCheckboxField),
		SwitchField: createSwitchField<TFormData>(form, KitSwitchField),
		RadioGroupField: createRadioGroupField<TFormData>(form, KitRadioGroupField),
		SliderField: createSliderField<TFormData>(form, KitSliderField),
		SubmitButton: createSubmitButton(form, Button),
		Form: createFormWrapper(form, Form),
	}
}
