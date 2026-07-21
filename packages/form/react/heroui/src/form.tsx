'use client'

import { createForm } from '@ez-kit/form-react'

import { CheckboxField, NumberField, RadioGroupField, SwitchField, TextareaField, TextField } from './blocks/fields'
import { Button, Form } from './blocks/form-parts'
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
	Button,
	Form,
} satisfies FormComponents

const { useForm } = createForm({ components })

export { useForm }
