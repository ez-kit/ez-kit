import { FormFieldType } from '@ez-kit/form-core'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { createForm } from '../create-form'
import { testComponents, testFields } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'

/** First match, or a failure that names the problem — `[0]` alone is possibly-undefined here. */
function first<T>(items: readonly T[]): T {
	const [head] = items
	if (head === undefined) throw new Error('expected at least one match')
	return head
}

const { FormRenderer } = createForm({ components: testComponents, fields: testFields })

type Person = { firstName: string; kind: string }
type Values = { people: Person[] }

const schema: FormSchema<Values> = {
	version: 1,
	children: [
		{
			type: 'array',
			name: 'people',
			label: 'People',
			add: { label: 'Add person' },
			remove: { label: 'Remove' },
			item: { label: 'Person' },
			children: [
				{ type: FormFieldType.Text, name: 'firstName', label: 'Name', defaultValue: 'unnamed' },
				{ type: FormFieldType.Text, name: 'kind', label: 'Kind' },
			],
		},
		{ type: 'submit', label: 'Save' },
	],
}

test('renders an array node and appends an entry built from the item defaults', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ people: [] }}
			onSubmit={({ value }) => {
				onSubmit(value)
			}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: 'Add person' }))
	await user.click(screen.getByRole('button', { name: 'Save' }))

	// `firstName` carries a `defaultValue`; `kind` does not, so the entry has no such key at all.
	await waitFor(() => {
		expect(onSubmit).toHaveBeenCalledWith({ people: [{ firstName: 'unnamed' }] })
	})
})

test('binds each entry to its own path', async () => {
	const user = userEvent.setup()
	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ people: [] }}
			onSubmit={() => {}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: 'Add person' }))
	await user.click(screen.getByRole('button', { name: 'Add person' }))

	const names = screen.getAllByLabelText('Name')
	expect(names[0]).toHaveAttribute('name', 'people[0].firstName')
	expect(names[1]).toHaveAttribute('name', 'people[1].firstName')
})

test('hides a field inside one entry without touching its neighbours', async () => {
	const conditional: FormSchema<Values> = {
		version: 1,
		children: [
			{
				type: 'array',
				name: 'people',
				add: { label: 'Add' },
				remove: { label: 'Remove' },
				children: [
					{ type: FormFieldType.Text, name: 'kind', label: 'Kind' },
					{
						type: FormFieldType.Text,
						name: 'firstName',
						label: 'Name',
						when: { field: './kind', eq: 'vip' },
					},
				],
			},
		],
	}

	const user = userEvent.setup()
	render(
		<FormRenderer
			schema={conditional}
			defaultValues={{
				people: [
					{ kind: 'plain', firstName: '' },
					{ kind: 'vip', firstName: '' },
				],
			}}
			onSubmit={() => {}}
		/>,
	)

	// Only the second entry satisfies `./kind eq vip`, so exactly one Name box exists.
	expect(screen.getAllByLabelText('Name')).toHaveLength(1)
	expect(screen.getAllByLabelText('Name')[0]).toHaveAttribute('name', 'people[1].firstName')

	await user.clear(first(screen.getAllByLabelText('Kind')))
	await user.type(first(screen.getAllByLabelText('Kind')), 'vip')
	await waitFor(() => {
		expect(screen.getAllByLabelText('Name')).toHaveLength(2)
	})
})

test('gives each entry its position in the caption', () => {
	render(
		<FormRenderer
			schema={schema}
			defaultValues={{
				people: [
					{ firstName: 'A', kind: '' },
					{ firstName: 'B', kind: '' },
				],
			}}
			onSubmit={() => {}}
		/>,
	)
	const labels = screen.getAllByTestId('array-item-label')
	expect(labels).toHaveLength(2)
})
