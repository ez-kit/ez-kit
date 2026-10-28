import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { defineFieldType } from './field-registry'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const OPTIONS = { FormElement: testFormElement, fields: testFields, components: testComponents }

const RatingField = defineFieldType<Record<never, never>, number>()(function Rating(props): ReactNode {
	return <output data-testid='rating'>{String(props.value)}</output>
})

describe('bundle shapes', () => {
	it('createForm returns no SchemaForm', () => {
		expect(Object.keys(createForm(OPTIONS)).sort()).toEqual([
			'Form',
			'FormProvider',
			'useForm',
			'withFieldGroup',
			'withForm',
		])
	})

	it('createSchemaForm returns the same plus SchemaForm', () => {
		expect(Object.keys(createSchemaForm(OPTIONS)).sort()).toEqual([
			'Form',
			'FormProvider',
			'SchemaForm',
			'useForm',
			'withFieldGroup',
			'withForm',
		])
	})

	it('resolves a custom field registered once, from JSX and from a document', () => {
		const { Form, SchemaForm } = createSchemaForm({ ...OPTIONS, fields: { ...testFields, RatingField } })
		const schema = {
			version: 1,
			children: [{ type: 'rating', name: 'score', label: 'Score' }],
		} as FormSchema<{ score: number }, 'rating'>

		render(
			<>
				<Form defaultValues={{ score: 2 }}>
					{(form) => (
						<form.RatingField
							name='score'
							label='Score'
						/>
					)}
				</Form>
				<SchemaForm
					schema={schema}
					defaultValues={{ score: 3 }}
				/>
			</>,
		)

		expect(screen.getAllByTestId('rating').map((node) => node.textContent)).toEqual(['2', '3'])
	})
})

describe('createSchemaForm — registry guards', () => {
	it('rejects a reserved key at the type level and at runtime', () => {
		expect(() =>
			createSchemaForm({
				// @ts-expect-error -- `Field` is a member of the form instance
				fields: { Field: testFields.TextField },
			}),
		).toThrow(/Field/)
	})
})
