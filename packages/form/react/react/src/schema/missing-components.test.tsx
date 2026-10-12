import { FormFieldType } from '@ez-kit/form-core'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createForm } from '../create-form'
import { testComponents, testFields } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'
import type { MockInstance } from 'vitest'

type Values = { name: string; tags: { label: string }[] }

const DEFAULT_VALUES: Values = { name: '', tags: [] }

const { ArrayField: _arrayField, ...fieldsWithoutArray } = testFields

const { SchemaForm: FieldsOnly } = createForm({ fields: testFields })

/** The props every case renders with, apart from the document. */
const COMMON = { defaultValues: DEFAULT_VALUES, onSubmit: () => {} }

describe('SchemaForm without the component a document needs', () => {
	let consoleError: MockInstance

	beforeEach(() => {
		// React logs the error a render throws before rethrowing it; the throw is the assertion.
		consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
	})

	afterEach(() => {
		consoleError.mockRestore()
	})

	it('throws naming Section when the document has a section', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: 'section', children: [{ type: FormFieldType.Text, name: 'name' }] }],
		}
		expect(() => {
			render(
				<FieldsOnly
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document has a section, but no Section component was passed in components.')
	})

	it('throws naming GridItem when a section has a grid', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: 'section', columns: 2, children: [{ type: FormFieldType.Text, name: 'name' }] }],
		}
		const { SchemaForm } = createForm({ fields: testFields, components: { Section: testComponents.Section } })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: a section has a grid, but no GridItem component was passed in components.')
	})

	it('throws naming SubmitButton when the document has a submit node', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [
				{ type: FormFieldType.Text, name: 'name' },
				{ type: 'submit', label: 'Save' },
			],
		}
		expect(() => {
			render(
				<FieldsOnly
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document has a submit node, but no SubmitButton component was passed in components.')
	})

	it('throws naming Wizard when the document has steps', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: 'step', title: 'One', children: [{ type: FormFieldType.Text, name: 'name' }] }],
		}
		expect(() => {
			render(
				<FieldsOnly
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document has steps, but no Wizard component was passed in components.')
	})

	it('throws naming ArrayField when the document has an array', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: 'array', name: 'tags', children: [{ type: FormFieldType.Text, name: 'label' }] }],
		}
		const { SchemaForm } = createForm({ fields: fieldsWithoutArray })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document has an array, but no ArrayField was passed in fields.')
	})

	it('keeps the unknown-type error for a built-in field kind that was not registered', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: FormFieldType.Text, name: 'name' }],
		}
		const { SchemaForm } = createForm({ fields: { NumberField: testFields.NumberField } })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('Unknown node type "text".')
	})
})
