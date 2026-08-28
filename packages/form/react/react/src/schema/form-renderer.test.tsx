import { FormFieldType } from '@ez-kit/form-core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { createForm } from '../create-form'
import { testComponents } from '../test-kit'

import type { FormSchema } from '@ez-kit/form-core'

const { FormRenderer } = createForm({ components: testComponents })

type Values = { email: string; age: number }

const schema: FormSchema<Values> = {
	version: 1,
	children: [
		{ type: FormFieldType.Text, name: 'email', label: 'Email' },
		{ type: FormFieldType.Number, name: 'age', label: 'Age' },
	],
}

test('renders one bound field per node, through the injected kit', () => {
	const { container } = render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByLabelText('Email')).toBeInTheDocument()
	expect(screen.getByLabelText('Age')).toBeInTheDocument()
	// The kit rendered it, not the adapter — this package ships no visible elements.
	expect(container.querySelectorAll('[data-testkit="field-root"]')).toHaveLength(2)
})

test('the rendered field carries the same data attributes as the JSX API', () => {
	const { container } = render(
		<FormRenderer
			schema={schema}
			defaultValues={{ email: '', age: 0 }}
			onSubmit={() => {}}
		/>,
	)
	const root = container.querySelector('[data-testkit="field-root"]')
	expect(root).toHaveAttribute('data-field', 'email')
	expect(root).toHaveAttribute('data-field-type', 'text')
})

test('builds defaultValues from the schema when the caller does not supply them', () => {
	const schemaWithDefaults: FormSchema<Values> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'email', label: 'Email', defaultValue: 'a@b.com' },
			{ type: FormFieldType.Number, name: 'age', label: 'Age', defaultValue: 42 },
		],
	}

	render(
		<FormRenderer
			schema={schemaWithDefaults}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByLabelText('Email')).toHaveValue('a@b.com')
	expect(screen.getByLabelText('Age')).toHaveValue(42)
})

test('a caller-supplied defaultValues wins over the schema default', () => {
	const schemaWithDefaults: FormSchema<Values> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'email', label: 'Email', defaultValue: 'a@b.com' },
			{ type: FormFieldType.Number, name: 'age', label: 'Age', defaultValue: 42 },
		],
	}

	render(
		<FormRenderer
			schema={schemaWithDefaults}
			defaultValues={{ email: 'override@b.com', age: 7 }}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByLabelText('Email')).toHaveValue('override@b.com')
	expect(screen.getByLabelText('Age')).toHaveValue(7)
})

test('a nested field name gets its default at the nested path, not under a dotted key', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()
	type NestedValues = { company: { inn: string } }
	const nestedSchema: FormSchema<NestedValues> = {
		version: 1,
		children: [
			{ type: FormFieldType.Text, name: 'company.inn', label: 'INN', defaultValue: 'DEFAULT-42' },
			{ type: 'submit', label: 'Save' },
		],
	}

	render(
		<FormRenderer
			schema={nestedSchema}
			onSubmit={onSubmit}
		/>,
	)

	// (a) the author's default actually reaches the input the schema bound to `company.inn`
	expect(screen.getByLabelText('INN')).toHaveValue('DEFAULT-42')

	// (b) and the payload is the shape the value type declares — no phantom `"company.inn"` key
	await user.click(screen.getByRole('button', { name: 'Save' }))

	expect(onSubmit).toHaveBeenCalledOnce()
	const [submitProps] = onSubmit.mock.calls[0] as [{ value: Record<string, unknown> }]
	const { value } = submitProps
	expect(value).toEqual({ company: { inn: 'DEFAULT-42' } })
	expect(value).not.toHaveProperty(['company.inn'])
})

test('renders through a caller-owned form instance in controlled mode', () => {
	const { useForm } = createForm({ components: testComponents })

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
			defaultValues: { email: '', age: 0 },
			onSubmit: () => {},
		})
		return (
			<FormRenderer
				form={form}
				schema={schema}
			/>
		)
	}

	render(<Harness />)

	expect(screen.getByLabelText('Email')).toBeInTheDocument()
	expect(screen.getByLabelText('Age')).toBeInTheDocument()
})
