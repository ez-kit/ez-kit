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

import type { FormComponents, FormFieldSlots } from '@ez-kit/form-react'

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
