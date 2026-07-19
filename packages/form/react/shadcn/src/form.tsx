'use client'

import { createForm } from '@ez-kit/form-react'

import { Description, ErrorText, FieldRoot, Label } from '@form-shadcn/blocks/field-chrome'
import { Button, Form } from '@form-shadcn/blocks/form-parts'
import { Checkbox, NumberInput, Textarea, TextInput } from '@form-shadcn/blocks/inputs'
import { Select } from '@form-shadcn/blocks/select'

import type { FormComponents } from '@ez-kit/form-react'

/**
 * The shadcn implementation of the UI contract.
 *
 * `satisfies FormComponents` makes a forgotten primitive a compile error. Every entry is a
 * `blocks/` adapter — the vendored shadcn primitives under `components/ui/` are never
 * edited (see CLAUDE.md).
 */
const components = {
	FieldRoot,
	Label,
	Description,
	ErrorText,
	TextInput,
	NumberInput,
	Textarea,
	Select,
	Checkbox,
	Button,
	Form,
} satisfies FormComponents

const { useForm } = createForm({ components })

export { useForm }
