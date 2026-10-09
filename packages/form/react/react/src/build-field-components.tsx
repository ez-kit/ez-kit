import { fieldTypeIdFor } from './field-registry'
import { createArray, createArrayField } from './fields/array-field'
import { createCheckboxField } from './fields/checkbox-field'
import { createCheckboxGroupField } from './fields/checkbox-group-field'
import { createCustomField } from './fields/custom-field'
import { createDateField } from './fields/date-field'
import { createDateRangeField } from './fields/date-range-field'
import { createSubmitButton } from './fields/form-parts'
import { createGridItem, createSection } from './fields/layout-parts'
import { createMultiSelectField } from './fields/multi-select-field'
import { createNumberField } from './fields/number-field'
import { createRadioGroupField } from './fields/radio-group-field'
import { createSelectField } from './fields/select-field'
import { createSliderField } from './fields/slider-field'
import { createSwitchField } from './fields/switch-field'
import { createTextField } from './fields/text-field'
import { createTextareaField } from './fields/textarea-field'

import type { BindableForm } from './bindable-form'
import type { FormComponents, FormFieldSlots } from './contract'
import type { FormFieldComponents } from './field-props'
import type { FormFieldRegistry, LAYOUT_COMPONENT_KEYS } from './field-registry'
import type { CustomFieldRenderProps } from './schema/registries'
import type { ReactNode } from 'react'

/**
 * One bespoke binder per built-in field kind, keyed by the slot it binds.
 *
 * `satisfies Record<keyof FormFieldSlots, …>` is what makes a thirteenth built-in a compile
 * error here rather than a slot that quietly falls through to the generic binder — which
 * would still *render*, and would silently drop that kind's own coercion and option
 * handling. The distinction is not cosmetic: `createSelectField` wraps `FieldOptions`
 * *above* `AppField`, and `createTextField` coerces through `asText`; no generic wrapper
 * reproduces either.
 */
const BUILT_IN_BINDERS = {
	TextField: createTextField,
	NumberField: createNumberField,
	TextareaField: createTextareaField,
	SelectField: createSelectField,
	CheckboxField: createCheckboxField,
	SwitchField: createSwitchField,
	RadioGroupField: createRadioGroupField,
	SliderField: createSliderField,
	MultiSelectField: createMultiSelectField,
	CheckboxGroupField: createCheckboxGroupField,
	DateField: createDateField,
	DateRangeField: createDateRangeField,
} satisfies Record<keyof FormFieldSlots, unknown>

/**
 * The twelve binders at their least specific shape.
 *
 * Each real binder takes its own kit component type and returns its own props type — twelve
 * unrelated signatures — so the loop below cannot be written against their intersection. The
 * per-entry checking that matters already happened: at the `satisfies` above, and at the
 * kit's own `satisfies FormFieldSlots`.
 */
type LooseBinder = (form: BindableForm, Component: never) => (props: never) => ReactNode

/**
 * Build the flat field components for one form instance.
 *
 * Each component closes over both the injected components and the `form` it belongs to,
 * which is why they are built per instance rather than once per kit: `form.AppField` needs
 * the concrete form. `createForm` memoises the result so the identities stay stable across
 * renders and React never remounts the inputs.
 *
 * `fields` is looped rather than destructured: a key the binder table names routes to that
 * kind's bespoke binder, and anything else — which is every field the app registered — gets
 * the one generic binder, under the document id its name derives.
 */
export function buildFieldComponents<TFormData>(
	form: BindableForm,
	components: FormComponents,
	fields: FormFieldRegistry,
): FormFieldComponents<TFormData> {
	/**
	 * `Object.hasOwn`, never `binders[key] === undefined`.
	 *
	 * `BUILT_IN_BINDERS` is an object literal, so a registry key named `toString` resolves
	 * `Object.prototype.toString` — a function — and the key is misclassified as a built-in. That
	 * function is then *called as a binder*: it ignores both arguments, returns the string
	 * `'[object Object]'`, and a string lands on the instance where a component belongs. React
	 * dies with "Element type is invalid", naming neither the key nor the kit. `constructor` is
	 * worse: it resolves to `Object` and constructs.
	 *
	 * The trap worth naming is the type. `noUncheckedIndexedAccess` gives `binders[key]` the type
	 * `LooseBinder | undefined`, which *reads* as though the missing case were handled — the type
	 * is honest about the index signature and silent about the prototype. That mismatch is why
	 * this survived a review pass.
	 */
	const binders = BUILT_IN_BINDERS as unknown as Record<string, LooseBinder>
	const { Button, Section: KitSection, GridItem: KitGridItem } = components

	const built: Record<string, unknown> = {}
	for (const [key, Component] of Object.entries(fields)) {
		const binder = Object.hasOwn(BUILT_IN_BINDERS, key) ? binders[key] : undefined
		built[key] =
			binder === undefined
				? createCustomField(form, fieldTypeIdFor(key), Component as (props: CustomFieldRenderProps) => ReactNode)
				: binder(form, Component as never)
	}

	/**
	 * The layout half, anchored to {@link LAYOUT_COMPONENT_KEYS} **before** the cast below.
	 *
	 * `as unknown as` erases checking on everything it covers, so a check that is to mean anything
	 * has to sit on a sub-expression outside it. With the `satisfies` here, a sixth layout member
	 * fails in two places if either is forgotten: at the constant, and here. `built` stays
	 * unchecked, which is correct — its keys are the open registry's, and `deriveFieldTypeIds`
	 * checks them at `createForm`, including against these five.
	 */
	const layout = {
		SubmitButton: createSubmitButton(form, Button),
		Section: createSection(KitSection),
		GridItem: createGridItem(KitGridItem),
		// Replaced below: an array's entries render the *same* field set, scoped to the entry, so
		// the component needs the finished record — including, for a nested array, itself.
		ArrayField: () => null,
		Array: () => null,
	} satisfies Record<keyof typeof LAYOUT_COMPONENT_KEYS, unknown>

	const fieldComponents = { ...built, ...layout } as unknown as FormFieldComponents<TFormData>

	fieldComponents.ArrayField = createArrayField<TFormData>(form, components, fieldComponents)
	fieldComponents.Array = createArray<TFormData>(form, components, fieldComponents)

	return fieldComponents
}
