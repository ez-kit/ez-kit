'use client'

import { createForm } from '@ez-kit/form-react'

import { ArrayField } from '@form-shadcn/blocks/array'
import { DateField, DateRangeField } from '@form-shadcn/blocks/date'
import {
	CheckboxField,
	NumberField,
	RadioGroupField,
	SliderField,
	SwitchField,
	TextareaField,
	TextField,
} from '@form-shadcn/blocks/fields'
import { Button, Form as FormElement } from '@form-shadcn/blocks/form-parts'
import { GridItem, Section } from '@form-shadcn/blocks/layout'
import { CheckboxGroupField, MultiSelectField } from '@form-shadcn/blocks/multi-value'
import { SelectField } from '@form-shadcn/blocks/select'
import { Wizard } from '@form-shadcn/blocks/wizard'

import type { FormBundle, FormComponents, FormFieldSlots } from '@ez-kit/form-react'

/**
 * The shadcn implementation of the UI contract, in the two bags `createForm` takes.
 *
 * `satisfies` on each makes a forgotten slot a compile error. Both are **exported**: an app
 * that wants a field kind of its own spreads `formFieldSlots` and calls `createForm`
 * itself — the twelve keep their bespoke binders, the new one gets the generic one.
 *
 * Every entry is a `blocks/` adapter — the vendored shadcn primitives under `components/ui/`
 * are never edited (see CLAUDE.md).
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
	ArrayField,
} satisfies FormFieldSlots

export const formComponents = {
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
 * The field components on their own — the twelve kinds and the array frame — so an app that
 * calls `createForm` itself can spread `formFieldSlots` and still reach — or wrap — any single
 * one of them by name.
 */
export {
	ArrayField,
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
