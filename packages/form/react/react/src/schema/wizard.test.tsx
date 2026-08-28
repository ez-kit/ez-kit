import { FormFieldType } from '@ez-kit/form-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'

import { createForm } from '../create-form'
import { testComponents } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'

const { FormRenderer } = createForm({ components: testComponents })

type TwoStepValues = { name: string; age: string }

/** The chrome the test kit stamps on each entry of `WizardRenderProps.steps`. */
const STEP_MARKER = 'wizard-step'

test('renders only the current step and advances on next', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{ type: 'step', title: 'One', children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }] },
			{ type: 'step', title: 'Two', children: [{ type: FormFieldType.Text, name: 'age', label: 'Age' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByLabelText('Name')).toBeInTheDocument()
	expect(screen.queryByLabelText('Age')).not.toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)).toHaveLength(2)

	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(screen.getByLabelText('Age')).toBeInTheDocument()
	expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)[1]).toHaveAttribute('aria-current', 'step')
})

test('next is blocked while the current step has invalid fields', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name', validate: { required: true } }],
			},
			{ type: 'step', title: 'Two', children: [{ type: FormFieldType.Text, name: 'age', label: 'Age' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(await screen.findByRole('alert')).toHaveTextContent('This field is required')
	expect(screen.getByLabelText('Name')).toBeInTheDocument()
	expect(screen.queryByLabelText('Age')).not.toBeInTheDocument()
})

test('a field on a later step does not block the current step', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{ type: 'step', title: 'One', children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }] },
			{
				type: 'step',
				title: 'Two',
				children: [{ type: FormFieldType.Text, name: 'age', label: 'Age', validate: { required: true } }],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(await screen.findByLabelText('Age')).toBeInTheDocument()
	expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
})

type ConditionalValues = { isCompany: boolean; name: string; company: string; note: string }

test('a step hidden by `when` is removed from steps and indices are recomputed', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<ConditionalValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				children: [
					{ type: FormFieldType.Checkbox, name: 'isCompany', label: 'Company' },
					{ type: FormFieldType.Text, name: 'name', label: 'Name' },
				],
			},
			{
				type: 'step',
				title: 'Two',
				when: { field: 'isCompany', eq: true },
				children: [{ type: FormFieldType.Text, name: 'company', label: 'Company name' }],
			},
			{ type: 'step', title: 'Three', children: [{ type: FormFieldType.Text, name: 'note', label: 'Note' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ isCompany: false, name: '', company: '', note: '' }}
			onSubmit={() => {}}
		/>,
	)

	const steps = screen.getAllByTestId(STEP_MARKER)
	expect(steps).toHaveLength(2)
	expect(steps[0]).toHaveTextContent('One')
	expect(steps[1]).toHaveTextContent('Three')

	// The surviving steps are renumbered, so "next" from index 0 lands on index 1 — the third
	// authored step — rather than on the hidden one.
	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(screen.getByLabelText('Note')).toBeInTheDocument()
	expect(screen.getAllByTestId(STEP_MARKER)[1]).toHaveAttribute('aria-current', 'step')

	// Turning the condition on brings the hidden step back and renumbers again.
	await user.click(screen.getByRole('button', { name: /back/i }))
	await user.click(screen.getByLabelText('Company'))
	expect(screen.getAllByTestId(STEP_MARKER)).toHaveLength(3)
})

test('invalid is false for a step that has never been visited', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'One',
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name', validate: { required: true } }],
			},
			{
				type: 'step',
				title: 'Two',
				children: [{ type: FormFieldType.Text, name: 'age', label: 'Age', validate: { required: true } }],
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
		/>,
	)

	// Both steps hold an empty required field; only the visited one may report as invalid.
	await user.click(screen.getByRole('button', { name: /next/i }))
	await screen.findByRole('alert')

	const steps = screen.getAllByTestId(STEP_MARKER)
	expect(steps[0]).toHaveAttribute('data-invalid', 'true')
	expect(steps[1]).not.toHaveAttribute('data-invalid')
})

type GroupedValues = { contact: { email: string }; note: string }

test('a step with `path` validates through useFormGroup', async () => {
	const user = userEvent.setup()
	const schema: FormSchema<GroupedValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: 'Contact',
				path: 'contact',
				children: [{ type: FormFieldType.Text, name: 'contact.email', label: 'Email', validate: { required: true } }],
			},
			{ type: 'step', title: 'Note', children: [{ type: FormFieldType.Text, name: 'note', label: 'Note' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ contact: { email: '' }, note: '' }}
			onSubmit={() => {}}
		/>,
	)

	await user.click(screen.getByRole('button', { name: /next/i }))
	expect(await screen.findByRole('alert')).toHaveTextContent('This field is required')
	expect(screen.getByLabelText('Email')).toBeInTheDocument()

	await user.type(screen.getByLabelText('Email'), 'a@b.co')
	await user.click(screen.getByRole('button', { name: /next/i }))

	expect(await screen.findByLabelText('Note')).toBeInTheDocument()
})

test('step titles and descriptions are resolved before the kit sees them', () => {
	const schema: FormSchema<TwoStepValues> = {
		version: 1,
		children: [
			{
				type: 'step',
				title: { key: 'step.one.title' },
				description: { key: 'step.one.description' },
				children: [{ type: FormFieldType.Text, name: 'name', label: 'Name' }],
			},
			{ type: 'step', title: 'Two', children: [{ type: FormFieldType.Text, name: 'age', label: 'Age' }] },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ name: '', age: '' }}
			onSubmit={() => {}}
			translate={(key: string): string => (key === 'step.one.title' ? 'Personal' : 'Who you are')}
		/>,
	)

	expect(screen.getByRole('button', { name: 'Personal' })).toBeInTheDocument()
	expect(screen.getByText('Who you are')).toBeInTheDocument()
})
