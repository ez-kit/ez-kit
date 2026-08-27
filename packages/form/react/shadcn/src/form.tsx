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
} from '@form-shadcn/blocks/fields'
import { Button, Form as FormElement } from '@form-shadcn/blocks/form-parts'
import { GridItem, Section } from '@form-shadcn/blocks/layout'
import { SelectField } from '@form-shadcn/blocks/select'

import type { FormComponents } from '@ez-kit/form-react'

/**
 * The shadcn implementation of the UI contract.
 *
 * `satisfies FormComponents` makes a forgotten field a compile error. Every entry is a
 * `blocks/` adapter — the vendored shadcn primitives under `components/ui/` are never
 * edited (see CLAUDE.md).
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
