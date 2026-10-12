import { FormFieldType } from '@ez-kit/form-core'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSchemaForm } from '../create-schema-form'
import { testComponents, testFields } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'
import type { MockInstance } from 'vitest'

type Values = { name: string; tags: { label: string }[] }

const DEFAULT_VALUES: Values = { name: '', tags: [] }

const { ArrayField: _arrayField, ...fieldsWithoutArray } = testFields

const { SchemaForm: FieldsOnly } = createSchemaForm({ fields: testFields })

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
		const { SchemaForm } = createSchemaForm({ fields: testFields, components: { Section: testComponents.Section } })
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
		const { SchemaForm } = createSchemaForm({ fields: fieldsWithoutArray })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document has an array, but no ArrayField was passed in fields.')
	})

	it('throws naming the slot for a built-in field kind that was not registered', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: FormFieldType.Text, name: 'name' }],
		}
		const { SchemaForm } = createSchemaForm({ fields: { NumberField: testFields.NumberField } })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document has a text field, but no TextField was passed in fields.')
	})

	it('throws on the first render when the node needing the component is hidden by when', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [
				{ type: FormFieldType.Text, name: 'name' },
				{
					type: 'section',
					when: { field: 'name', eq: 'show' },
					children: [{ type: FormFieldType.Text, name: 'name' }],
				},
			],
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

	it('throws on the first render when a built-in field kind nobody registered is hidden by when', () => {
		const schema = {
			version: 1,
			children: [
				{ type: FormFieldType.Text, name: 'name' },
				{ type: FormFieldType.Date, name: 'due', when: { field: 'name', eq: 'show' } },
			],
		} as FormSchema<Values & { due: string }>
		const { SchemaForm } = createSchemaForm({ fields: { TextField: testFields.TextField } })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					defaultValues={{ ...DEFAULT_VALUES, due: '' }}
					onSubmit={() => {}}
				/>,
			)
		}).toThrow('SchemaForm: the document has a date field, but no DateField was passed in fields.')
	})

	it('throws on the first render when a custom field kind nobody registered is hidden by when', () => {
		const schema = {
			version: 1,
			children: [
				{ type: FormFieldType.Text, name: 'name' },
				{ type: 'rating', name: 'score', when: { field: 'name', eq: 'show' } },
			],
		} as FormSchema<Values & { score: number }, 'rating'>
		expect(() => {
			render(
				<FieldsOnly
					schema={schema}
					defaultValues={{ ...DEFAULT_VALUES, score: 0 }}
					onSubmit={() => {}}
				/>,
			)
		}).toThrow(
			'SchemaForm: the document has a field of type "rating", but no component registered in fields derives that type id.',
		)
	})

	it('throws on the first render when the node needing the component is in a later wizard step', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [
				{ type: 'step', title: 'One', children: [{ type: FormFieldType.Text, name: 'name' }] },
				{ type: 'step', title: 'Two', children: [{ type: 'submit', label: 'Save' }] },
			],
		}
		const { SchemaForm } = createSchemaForm({ fields: testFields, components: { Wizard: testComponents.Wizard } })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document has a submit node, but no SubmitButton component was passed in components.')
	})
})
