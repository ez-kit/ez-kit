'use client'

import { createForm } from '@ez-kit/form-react'

import { Description, ErrorText, FieldRoot, Label } from './blocks/field-chrome'
import { Button, Form } from './blocks/form-parts'
import { Checkbox, NumberInput, Textarea, TextInput } from './blocks/inputs'
import { Select } from './blocks/select'

import type { FormComponents } from '@ez-kit/form-react'

/**
 * The HeroUI v3 implementation of the UI contract.
 *
 * `satisfies FormComponents` makes a forgotten primitive a compile error.
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
