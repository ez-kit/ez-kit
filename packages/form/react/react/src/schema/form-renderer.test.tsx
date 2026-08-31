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

test('resolves a select option label through `translate`', () => {
	const localizedSchema: FormSchema<{ country: string }> = {
		version: 1,
		children: [
			{
				type: FormFieldType.Select,
				name: 'country',
				label: { key: 'country.label' },
				options: [
					{ value: 'RU', label: { key: 'country.ru' } },
					// A plain string stays finished copy — `LocalizedText` is either spelling.
					{ value: 'DE', label: 'Germany' },
				],
			},
		],
	}

	render(
		<FormRenderer
			schema={localizedSchema}
			defaultValues={{ country: 'RU' }}
			translate={(key: string): string => (key === 'country.ru' ? 'Россия' : 'Страна')}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByLabelText('Страна')).toBeInTheDocument()
	expect(screen.getByRole('option', { name: 'Россия' })).toBeInTheDocument()
	expect(screen.getByRole('option', { name: 'Germany' })).toBeInTheDocument()
})

test('binds a date node to the kit input and submits the picked day', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()
	const dateSchema: FormSchema<{ startsOn: string }> = {
		version: 1,
		children: [
			{ type: FormFieldType.Date, name: 'startsOn', label: 'Starts on', min: '2026-01-01', max: '2026-12-31' },
			{ type: 'submit', label: 'Save' },
		],
	}

	const { container } = render(
		<FormRenderer
			schema={dateSchema}
			defaultValues={{ startsOn: '' }}
			onSubmit={onSubmit}
		/>,
	)

	const input = screen.getByLabelText('Starts on')
	expect(input).toHaveAttribute('min', '2026-01-01')
	expect(input).toHaveAttribute('max', '2026-12-31')

	await user.type(input, '2026-08-31')
	await user.click(screen.getByRole('button', { name: 'Save' }))

	expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ value: { startsOn: '2026-08-31' } }))
	expect(container.querySelector('[data-testkit="date"]')).toBeInTheDocument()
})

test('a date range is one field holding one { start, end } value', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()
	const rangeSchema: FormSchema<{ stay: { start: string; end: string } }> = {
		version: 1,
		children: [
			{ type: FormFieldType.DateRange, name: 'stay', label: 'Stay' },
			{ type: 'submit', label: 'Save' },
		],
	}

	render(
		<FormRenderer
			schema={rangeSchema}
			defaultValues={{ stay: { start: '2026-08-01', end: '2026-08-05' } }}
			onSubmit={onSubmit}
		/>,
	)

	await user.clear(screen.getByLabelText('end'))
	await user.type(screen.getByLabelText('end'), '2026-08-09')
	await user.click(screen.getByRole('button', { name: 'Save' }))

	expect(onSubmit).toHaveBeenCalledWith(
		expect.objectContaining({ value: { stay: { start: '2026-08-01', end: '2026-08-09' } } }),
	)
})

test('a schema defaultValue seeds a date field, and a bad one never reaches the kit', () => {
	const seeded: FormSchema<{ startsOn: string; brokenOn: string }> = {
		version: 1,
		children: [
			{ type: FormFieldType.Date, name: 'startsOn', label: 'Starts on', defaultValue: '2026-08-31' },
			// Only `parseFormSchema` rejects this; a TS-authored schema can still carry it, so the
			// binding layer coerces rather than handing the kit something it cannot render.
			{ type: FormFieldType.Date, name: 'brokenOn', label: 'Broken on', defaultValue: '31/08/2026' },
		],
	}

	render(
		<FormRenderer
			schema={seeded}
			onSubmit={() => {}}
		/>,
	)

	expect(screen.getByLabelText('Starts on')).toHaveValue('2026-08-31')
	expect(screen.getByLabelText('Broken on')).toHaveValue('')
})
