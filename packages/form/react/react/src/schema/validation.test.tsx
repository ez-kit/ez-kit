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

type TwoFieldValues = { a: string; b: string }

const twoRequiredFields: FormSchema<TwoFieldValues> = {
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'a', label: 'A', validate: { required: true } },
		{ type: FormFieldType.Text, name: 'b', label: 'B', validate: { required: true } },
		{ type: 'submit', label: 'Save' },
	],
}

test('typing in one field does not redden the other required fields', async () => {
	const user = userEvent.setup()

	const { container } = render(
		<FormRenderer
			schema={twoRequiredFields}
			defaultValues={{ a: '', b: '' }}
			onSubmit={() => {}}
		/>,
	)

	// The schema compiles to one *form-level* onChange validator (spec §7.2), so this keystroke
	// computes "required" for `b` as well. Running it is right; showing it is not — the user has
	// never touched `b`.
	await user.type(screen.getByLabelText('A'), 'x')

	const untouched = container.querySelector('[data-field="b"]')
	expect(untouched).toBeInTheDocument()
	expect(untouched).not.toHaveAttribute('data-invalid')
	expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('a submit attempt still shows every untouched field its error', async () => {
	const user = userEvent.setup()

	render(
		<FormRenderer
			schema={twoRequiredFields}
			defaultValues={{ a: '', b: '' }}
			onSubmit={() => {}}
		/>,
	)

	// The other half of the gate: submit marks every field touched, so nothing stays hidden
	// once the user has actually tried to submit.
	await user.click(screen.getByRole('button', { name: 'Save' }))

	expect(await screen.findAllByRole('alert')).toHaveLength(2)
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
