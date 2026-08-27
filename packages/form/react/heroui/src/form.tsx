'use client'

import { createForm } from '@ez-kit/form-react'

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
import { SelectField } from './blocks/select'

import type { FormComponents } from '@ez-kit/form-react'

/**
 * The HeroUI v3 implementation of the UI contract.
 *
 * `satisfies FormComponents` makes a forgotten field a compile error.
 */
const components = {
	TextField,
	NumberField,
	TextareaField,
	SelectField,
	CheckboxField,
	SwitchField,
	RadioGroupField,
	SliderField,
	Button,
	Form: FormElement,
	Section,
	GridItem,
} satisfies FormComponents

const { useForm, Form, FormRenderer } = createForm({ components })

export { useForm, Form, FormRenderer }
