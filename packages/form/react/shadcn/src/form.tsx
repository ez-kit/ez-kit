'use client'

import { createForm } from '@ez-kit/form-react'

import { CheckboxField, NumberField, TextareaField, TextField } from '@form-shadcn/blocks/fields'
import { Button, Form } from '@form-shadcn/blocks/form-parts'
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
	Button,
	Form,
} satisfies FormComponents

const { useForm } = createForm({ components })

export { useForm }
