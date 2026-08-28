import { FormFieldType } from '@ez-kit/form-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { createForm } from '../create-form'
import { testComponents } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'

const { FormRenderer } = createForm({ components: testComponents })

type EmailValues = { email: string }

test('constraints in the schema produce field errors', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<EmailValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'email', label: 'Email', validate: { required: true } },
			{ type: 'submit', label: 'Save' },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '' }}
			onSubmit={() => {}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: 'Save' }))

	expect(await screen.findByRole('alert')).toBeInTheDocument()
})

test('the same message from onChange and onSubmit renders exactly once', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<EmailValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'email', label: 'Email', validate: { required: true } },
			{ type: 'submit', label: 'Save' },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '' }}
			onSubmit={() => {}}
		/>,
	)

	// A submit runs both the onChange and onSubmit validators against the same empty field, so
	// this is the exact scenario that used to render "This field is required" twice.
	await user.click(screen.getByRole('button', { name: 'Save' }))

	const error = await screen.findByRole('alert')
	expect(error).toHaveTextContent(/^This field is required$/)
})

test('supplying both schema constraints and validators throws a descriptive error', () => {
	const schema: FormSchema<EmailValues> = {
		version: 1,
		children: [{ type: FormFieldType.Text, name: 'email', label: 'Email', validate: { required: true } }],
	}

	expect(() =>
		render(
			<FormRenderer
				schema={schema}
				defaultValues={{ email: '' }}
				onSubmit={() => {}}
				validators={{ onChange: () => undefined }}
			/>,
		),
	).toThrow(/either .*constraints.* or .*validators/i)
})

test('caller-supplied validators are used verbatim when the schema has no constraints', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<EmailValues> = {
		version: 1,
		children: [{ type: FormFieldType.Text, name: 'email', label: 'Email' }],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '' }}
			onSubmit={() => {}}
			validators={{ onChange: () => ({ fields: { email: 'nope' } }) }}
		/>,
	)

	await user.type(screen.getByLabelText('Email'), 'x')

	const error = await screen.findByRole('alert')
	expect(error).toHaveTextContent('nope')
})

type HiddenValues = { showExtra: boolean; extra: string }

test('a hidden required field does not block submission', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()
	const schema: FormSchema<HiddenValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Checkbox, name: 'showExtra', label: 'Show extra' },
			{
				type: FormFieldType.Text,
				name: 'extra',
				label: 'Extra',
				validate: { required: true },
				when: { field: 'showExtra', eq: true },
			},
			{ type: 'submit', label: 'Save' },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ showExtra: false, extra: '' }}
			onSubmit={onSubmit}
		/>,
	)

	await user.click(screen.getByRole('button', { name: 'Save' }))

	expect(onSubmit).toHaveBeenCalledOnce()
})
