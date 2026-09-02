import { FormFieldType } from '@ez-kit/form-core'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { createForm } from '../create-form'
import { testComponents } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'

const { FormRenderer } = createForm({ components: testComponents })

type Values = { email: string; age: number }

test('a section renders through the kit and wraps children in grid items', () => {
	const schema: FormSchema<Values> = {
		version: 1,
		children: [
			{
				type: 'section',
				title: 'Client',
				columns: 2,
				children: [
					{ type: FormFieldType.Text, name: 'email', label: 'Email' },
					{ type: FormFieldType.Number, name: 'age', label: 'Age', colSpan: 2 },
				],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByTestId('section')).toHaveAttribute('data-columns', '2')
	expect(screen.getAllByTestId('grid-item')[1]).toHaveAttribute('data-col-span', '2')
})

test('a section without a title renders no heading', () => {
	const schema: FormSchema<Values> = {
		version: 1,
		children: [{ type: 'section', children: [{ type: FormFieldType.Text, name: 'email' }] }],
	}
	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)
	expect(screen.queryByRole('heading')).not.toBeInTheDocument()
})

test('nested sections build a different grid inside a grid', () => {
	const schema: FormSchema<Values> = {
		version: 1,
		children: [
			{
				type: 'section',
				title: 'Outer',
				columns: 2,
				children: [
					{ type: FormFieldType.Text, name: 'email', label: 'Email' },
					{
						type: 'section',
						title: 'Inner',
						columns: 1,
						children: [{ type: FormFieldType.Number, name: 'age', label: 'Age' }],
					},
				],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)

	const sections = screen.getAllByTestId('section')
	const columns = sections.map((section) => section.getAttribute('data-columns'))
	expect(columns).toContain('2')
	expect(columns).toContain('1')
})
