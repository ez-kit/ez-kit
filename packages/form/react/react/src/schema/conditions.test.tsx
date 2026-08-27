import { FormFieldType } from '@ez-kit/form-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { createForm } from '../create-form'
import { testComponents } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'

const { FormRenderer } = createForm({ components: testComponents })

type Values = { clientType: string; inn: string }

const conditionalSchema: FormSchema<Values> = {
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'clientType', label: 'Type' },
		{ type: FormFieldType.Text, name: 'inn', label: 'Tax ID', when: { field: 'clientType', eq: 'business' } },
	],
}

function submitForm(container: HTMLElement): void {
	const formElement = container.querySelector('form')
	if (formElement === null) throw new Error('Expected a <form> element in the rendered tree.')
	fireEvent.submit(formElement)
}

test('a field appears and disappears with its condition', async () => {
	const user = userEvent.setup()

	render(
		<FormRenderer
			schema={conditionalSchema}
			defaultValues={{ clientType: '', inn: '' }}
			onSubmit={() => {}}
		/>,
	)
	expect(screen.queryByLabelText('Tax ID')).not.toBeInTheDocument()

	await user.type(screen.getByLabelText('Type'), 'business')
	expect(screen.getByLabelText('Tax ID')).toBeInTheDocument()
})

test('disabledWhen disables rather than hides', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<Values> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'clientType', label: 'Type' },
			{
				type: FormFieldType.Text,
				name: 'inn',
				label: 'Tax ID',
				disabledWhen: { field: 'clientType', eq: 'business' },
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ clientType: '', inn: '' }}
			onSubmit={() => {}}
		/>,
	)

	// Present and enabled while the condition is false — disabledWhen never hides the field.
	expect(screen.getByLabelText('Tax ID')).toBeInTheDocument()
	expect(screen.getByLabelText('Tax ID')).not.toBeDisabled()

	await user.type(screen.getByLabelText('Type'), 'business')

	expect(screen.getByLabelText('Tax ID')).toBeInTheDocument()
	expect(screen.getByLabelText('Tax ID')).toBeDisabled()
})

test('hidden values do not reach onSubmit by default', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()

	const { container } = render(
		<FormRenderer
			schema={conditionalSchema}
			defaultValues={{ clientType: 'business', inn: '' }}
			onSubmit={onSubmit}
		/>,
	)

	await user.type(screen.getByLabelText('Tax ID'), '77')
	await user.clear(screen.getByLabelText('Type'))
	await user.type(screen.getByLabelText('Type'), 'individual')
	expect(screen.queryByLabelText('Tax ID')).not.toBeInTheDocument()

	submitForm(container)

	await waitFor(() => {
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})
	const call = onSubmit.mock.calls[0] as [{ value: Values }]
	expect(call[0].value).not.toHaveProperty('inn')
	expect(call[0].value).toHaveProperty('clientType', 'individual')
})

test('keepHiddenValues includes them', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()

	const { container } = render(
		<FormRenderer
			schema={conditionalSchema}
			defaultValues={{ clientType: 'business', inn: '' }}
			onSubmit={onSubmit}
			keepHiddenValues
		/>,
	)

	await user.type(screen.getByLabelText('Tax ID'), '77')
	await user.clear(screen.getByLabelText('Type'))
	await user.type(screen.getByLabelText('Type'), 'individual')
	expect(screen.queryByLabelText('Tax ID')).not.toBeInTheDocument()

	submitForm(container)

	await waitFor(() => {
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})
	const call = onSubmit.mock.calls[0] as [{ value: Values }]
	expect(call[0].value).toHaveProperty('inn', '77')
})

test('a value survives hiding and re-showing — stripping happens at submit, not on hide', async () => {
	const user = userEvent.setup()

	render(
		<FormRenderer
			schema={conditionalSchema}
			defaultValues={{ clientType: 'business', inn: '' }}
			onSubmit={() => {}}
		/>,
	)

	await user.type(screen.getByLabelText('Tax ID'), '77')
	expect(screen.getByLabelText('Tax ID')).toHaveValue('77')

	await user.clear(screen.getByLabelText('Type'))
	await user.type(screen.getByLabelText('Type'), 'individual')
	expect(screen.queryByLabelText('Tax ID')).not.toBeInTheDocument()

	await user.clear(screen.getByLabelText('Type'))
	await user.type(screen.getByLabelText('Type'), 'business')
	expect(screen.getByLabelText('Tax ID')).toHaveValue('77')
})
