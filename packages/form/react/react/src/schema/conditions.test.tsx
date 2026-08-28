import { FormFieldType, stripHiddenValues } from '@ez-kit/form-core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { createForm } from '../create-form'
import { testComponents } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'

const { FormRenderer, useForm } = createForm({ components: testComponents })

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

test('a function condition reacts to the whole values object', async () => {
	const user = userEvent.setup()
	type ThresholdValues = { count: string; premium: string }
	const schema: FormSchema<ThresholdValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'count', label: 'Count' },
			{
				type: FormFieldType.Text,
				name: 'premium',
				label: 'Premium',
				// collectRuleFields returns [] for a function condition — it must fall back to
				// subscribing to the whole values object rather than a specific field.
				when: (values) => Number(values.count) > 10,
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ count: '', premium: '' }}
			onSubmit={() => {}}
		/>,
	)
	expect(screen.queryByLabelText('Premium')).not.toBeInTheDocument()

	await user.type(screen.getByLabelText('Count'), '11')
	expect(screen.getByLabelText('Premium')).toBeInTheDocument()

	await user.clear(screen.getByLabelText('Count'))
	await user.type(screen.getByLabelText('Count'), '5')
	expect(screen.queryByLabelText('Premium')).not.toBeInTheDocument()
})

test('a composite condition reacts to a change in either field', async () => {
	const user = userEvent.setup()
	type CompositeValues = { clientType: string; country: string; inn: string }
	const schema: FormSchema<CompositeValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'clientType', label: 'Type' },
			{ type: FormFieldType.Text, name: 'country', label: 'Country' },
			{
				type: FormFieldType.Text,
				name: 'inn',
				label: 'Tax ID',
				// Two different fields, so only changing the second one still has to flip this.
				when: {
					or: [
						{ field: 'clientType', eq: 'business' },
						{ field: 'country', eq: 'US' },
					],
				},
			},
		],
	}

	render(
		<FormRenderer
			schema={schema}
			defaultValues={{ clientType: '', country: '', inn: '' }}
			onSubmit={() => {}}
		/>,
	)
	expect(screen.queryByLabelText('Tax ID')).not.toBeInTheDocument()

	await user.type(screen.getByLabelText('Type'), 'business')
	expect(screen.getByLabelText('Tax ID')).toBeInTheDocument()

	await user.clear(screen.getByLabelText('Type'))
	expect(screen.queryByLabelText('Tax ID')).not.toBeInTheDocument()

	// Changing the second field of the composite rule — not the first — must also flip it.
	await user.type(screen.getByLabelText('Country'), 'US')
	expect(screen.getByLabelText('Tax ID')).toBeInTheDocument()
})

test('a controlled caller composes stripHiddenValues themselves', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()

	function Harness(): ReturnType<typeof FormRenderer> {
		const form = useForm<
			Values,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			unknown
		>({
			defaultValues: { clientType: 'business', inn: '' },
			// The escape hatch documented on `FormRendererControlledProps`: a controlled
			// caller applies `stripHiddenValues` themselves, since `FormRenderer` cannot do
			// it for them.
			onSubmit: ({ value }) => {
				onSubmit(stripHiddenValues(conditionalSchema, value))
			},
		})
		return (
			<FormRenderer
				form={form}
				schema={conditionalSchema}
			/>
		)
	}

	const { container } = render(<Harness />)

	await user.type(screen.getByLabelText('Tax ID'), '77')
	await user.clear(screen.getByLabelText('Type'))
	await user.type(screen.getByLabelText('Type'), 'individual')
	expect(screen.queryByLabelText('Tax ID')).not.toBeInTheDocument()

	submitForm(container)

	await waitFor(() => {
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})
	const call = onSubmit.mock.calls[0] as [Values]
	expect(call[0]).not.toHaveProperty('inn')
	expect(call[0]).toHaveProperty('clientType', 'individual')
})
