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

	it('does not resolve a custom field kind from Object.prototype', () => {
		const schema = {
			version: 1,
			children: [{ type: 'toString', name: 'name' }],
		} as FormSchema<Values, 'toString'>
		expect(() => {
			render(
				<FieldsOnly
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow(
			'SchemaForm: the document has a field of type "toString", but no component registered in fields derives that type id.',
		)
	})

	it('throws naming the component a block needs', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: 'block', component: 'Section', children: [{ type: FormFieldType.Text, name: 'name' }] }],
		}
		expect(() => {
			render(
				<FieldsOnly
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document has a block "Section", but no Section component was passed in components.')
	})

	it('throws naming Grid when a container sets columns', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [
				{ type: 'block', component: 'Section', columns: 2, children: [{ type: FormFieldType.Text, name: 'name' }] },
			],
		}
		const { SchemaForm } = createSchemaForm({ fields: testFields, components: { Section: testComponents.Section } })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document sets columns, but no Grid component was passed in components.')
	})

	it('throws naming Grid when the document itself sets columns', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			columns: 2,
			children: [{ type: FormFieldType.Text, name: 'name' }],
		}
		const { SchemaForm } = createSchemaForm({ fields: testFields })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: the document sets columns, but no Grid component was passed in components.')
	})

	it('rejects Grid named as a block', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [{ type: 'block', component: 'Grid', children: [{ type: FormFieldType.Text, name: 'name' }] }],
		}
		const { SchemaForm } = createSchemaForm({ fields: testFields, components: testComponents })
		expect(() => {
			render(
				<SchemaForm
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow('SchemaForm: "Grid" is not a block; set "columns" on the container instead.')
	})

	it('throws naming SubmitButton when the document has a SubmitButton block', () => {
		const schema: FormSchema<Values> = {
			version: 1,
			children: [
				{ type: FormFieldType.Text, name: 'name' },
				{ type: 'block', component: 'SubmitButton', props: { children: 'Save' } },
			],
		}
		expect(() => {
			render(
				<FieldsOnly
					schema={schema}
					{...COMMON}
				/>,
			)
		}).toThrow(
			'SchemaForm: the document has a block "SubmitButton", but no SubmitButton component was passed in components.',
		)
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
					type: 'block',
					component: 'Section',
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
		}).toThrow('SchemaForm: the document has a block "Section", but no Section component was passed in components.')
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
})
