'use client'

import { createForm } from '@ez-kit/form-react'

import { ArrayField, ArrayItem } from '@form-shadcn/blocks/array'
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

import type { FormComponents, FormFieldSlots } from '@ez-kit/form-react'

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

const { useForm, Form, FormRenderer, withForm, withFieldGroup } = createForm({
	components: formComponents,
	fields: formFieldSlots,
})

export { useForm, Form, FormRenderer, withForm, withFieldGroup }

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
