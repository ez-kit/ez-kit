'use client'

import { createForm } from '@ez-kit/form-react'

import { ArrayField, ArrayItem } from './blocks/array'
import { DateField, DateRangeField } from './blocks/date'
import {
	CheckboxField,
	NumberField,
	RadioGroupField,
	SliderField,
	SwitchField,
	TextareaField,
	TextField,
} from './blocks/fields'
import { Button, Form as FormElement } from './blocks/form-parts'
import { GridItem, Section } from './blocks/layout'
import { CheckboxGroupField, MultiSelectField } from './blocks/multi-value'
import { SelectField } from './blocks/select'
import { Wizard } from './blocks/wizard'

import type { FormBundle, FormComponents, FormFieldSlots } from '@ez-kit/form-react'

/**
 * The HeroUI v3 implementation of the UI contract, in the two bags `createForm` takes.
 *
 * `satisfies` on each makes a forgotten slot a compile error. Both are **exported**: an app
 * that wants a field kind of its own spreads `formFieldSlots` and calls `createForm`
 * itself — the twelve keep their bespoke binders, the new one gets the generic one.
 */
export const formFieldSlots = {
	TextField,
	NumberField,
	TextareaField,
	SelectField,
	CheckboxField,
	SwitchField,
	RadioGroupField,
	SliderField,
	MultiSelectField,
	CheckboxGroupField,
	DateField,
	DateRangeField,
} satisfies FormFieldSlots

export const formComponents = {
	ArrayField,
	ArrayItem,
	Button,
	Form: FormElement,
	Section,
	GridItem,
	Wizard,
} satisfies FormComponents

/**
 * The bundle's type, named through `@ez-kit/form-react` so the kit's declarations do too.
 *
 * Each export below is annotated rather than inferred for that reason: an inferred type is
 * spelled out in `dist/index.d.ts` in terms of the packages it is built from — TanStack Form and
 * `@ez-kit/form-core` — which this kit no longer depends on and so cannot resolve from its own
 * location. An annotation is emitted as written, as a reference into `@ez-kit/form-react`, which
 * does depend on both.
 */
type KitFormBundle = FormBundle<typeof formFieldSlots>

const bundle: KitFormBundle = createForm({
	components: formComponents,
	fields: formFieldSlots,
})

export const useForm: KitFormBundle['useForm'] = bundle.useForm
export const Form: KitFormBundle['Form'] = bundle.Form
export const SchemaForm: KitFormBundle['SchemaForm'] = bundle.SchemaForm
export const withForm: KitFormBundle['withForm'] = bundle.withForm
export const withFieldGroup: KitFormBundle['withFieldGroup'] = bundle.withFieldGroup

/**
 * The twelve field components on their own, so an app that calls `createForm` itself can
 * spread `formFieldSlots` and still reach — or wrap — any single one of them by name.
 */
export {
	CheckboxField,
	CheckboxGroupField,
	DateField,
	DateRangeField,
	MultiSelectField,
	NumberField,
	RadioGroupField,
	SelectField,
	SliderField,
	SwitchField,
	TextField,
	TextareaField,
}
