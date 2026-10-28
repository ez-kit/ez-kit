import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { captureField, testComponents, testFields, testFormElement } from './test-kit'

import type { FormFieldSlots } from './contract'
import type { ReactNode } from 'react'

type Values = {
	email: string
	age: number
	bio: string
	role: string
	agree: boolean
	notify: boolean
	plan: string
}

const DEFAULTS: Values = { email: '', age: 0, bio: '', role: '', agree: false, notify: false, plan: '' }

const ROLE_OPTIONS = [
	{ label: 'User', value: 'user' },
	{ label: 'Admin', value: 'admin' },
]

const PLAN_OPTIONS = [
	{ label: 'Free', value: 'free' },
	{ label: 'Pro', value: 'pro' },
]

const { useForm, Form } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

describe('createForm — field binding', () => {
	function TextCase() {
		const form = useForm({ defaultValues: DEFAULTS })

		return (
			<Form form={form}>
				<form.TextField
					name='email'
					label='Email'
					type='email'
					placeholder='you@example.com'
				/>
				<form.Subscribe selector={(state) => state.values.email}>{(email) => <output>{email}</output>}</form.Subscribe>
			</Form>
		)
	}

	it('round-trips value and onChange through form state', async () => {
		const user = userEvent.setup()
		render(<TextCase />)

		await user.type(screen.getByLabelText('Email'), 'a@b.c')

		expect(screen.getByRole('status')).toHaveTextContent('a@b.c')
		expect(screen.getByLabelText('Email')).toHaveValue('a@b.c')
	})

	it('passes field-specific props through to the injected input', () => {
		render(<TextCase />)

		const input = screen.getByLabelText('Email')
		expect(input).toHaveAttribute('type', 'email')
		expect(input).toHaveAttribute('placeholder', 'you@example.com')
	})

	it('binds the number field as a number, and an empty control as undefined', async () => {
		const user = userEvent.setup()

		function NumberCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.NumberField
						name='age'
						label='Age'
					/>
					<form.Subscribe selector={(state) => state.values.age}>
						{(age) => <output>{`${typeof age}:${String(age)}`}</output>}
					</form.Subscribe>
				</Form>
			)
		}

		render(<NumberCase />)
		const input = screen.getByLabelText('Age')

		await user.clear(input)
		expect(screen.getByRole('status')).toHaveTextContent('undefined:undefined')

		await user.type(input, '42')
		await waitFor(() => {
			expect(screen.getByRole('status')).toHaveTextContent('number:42')
		})
	})

	it('binds the textarea field', async () => {
		const user = userEvent.setup()

		function TextareaCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.TextareaField
						name='bio'
						label='Bio'
						rows={4}
					/>
					<form.Subscribe selector={(state) => state.values.bio}>{(bio) => <output>{bio}</output>}</form.Subscribe>
				</Form>
			)
		}

		render(<TextareaCase />)
		await user.type(screen.getByLabelText('Bio'), 'hello')

		expect(screen.getByRole('status')).toHaveTextContent('hello')
		expect(screen.getByLabelText('Bio')).toHaveAttribute('rows', '4')
	})

	it('binds the select field to the injected options', async () => {
		const user = userEvent.setup()

		function SelectCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.SelectField
						name='role'
						label='Role'
						options={ROLE_OPTIONS}
						placeholder='Pick one'
					/>
					<form.Subscribe selector={(state) => state.values.role}>{(role) => <output>{role}</output>}</form.Subscribe>
				</Form>
			)
		}

		render(<SelectCase />)
		await user.selectOptions(screen.getByLabelText('Role'), 'admin')

		expect(screen.getByRole('status')).toHaveTextContent('admin')
	})

	it('binds the checkbox field to a boolean', async () => {
		const user = userEvent.setup()

		function CheckboxCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.CheckboxField
						name='agree'
						label='I agree'
					/>
					<form.Subscribe selector={(state) => state.values.agree}>
						{(agree) => <output>{String(agree)}</output>}
					</form.Subscribe>
				</Form>
			)
		}

		render(<CheckboxCase />)
		expect(screen.getByRole('status')).toHaveTextContent('false')

		await user.click(screen.getByLabelText('I agree'))

		expect(screen.getByRole('status')).toHaveTextContent('true')
	})

	it('binds the switch field to a boolean', async () => {
		const user = userEvent.setup()

		function SwitchCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.SwitchField
						name='notify'
						label='Notify me'
					/>
					<form.Subscribe selector={(state) => state.values.notify}>
						{(notify) => <output>{String(notify)}</output>}
					</form.Subscribe>
				</Form>
			)
		}

		render(<SwitchCase />)
		expect(screen.getByRole('status')).toHaveTextContent('false')

		await user.click(screen.getByLabelText('Notify me'))

		expect(screen.getByRole('status')).toHaveTextContent('true')
	})

	it('binds the radio-group field to the selected option', async () => {
		const user = userEvent.setup()

		function RadioGroupCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.RadioGroupField
						name='plan'
						label='Plan'
						options={PLAN_OPTIONS}
					/>
					<form.Subscribe selector={(state) => state.values.plan}>{(plan) => <output>{plan}</output>}</form.Subscribe>
				</Form>
			)
		}

		render(<RadioGroupCase />)
		await user.click(screen.getByLabelText('Pro'))

		expect(screen.getByRole('status')).toHaveTextContent('pro')
	})

	it('binds the slider field to a number', () => {
		function SliderCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.SliderField
						name='age'
						label='Age'
						min={0}
						max={10}
					/>
					<form.Subscribe selector={(state) => state.values.age}>
						{(age) => <output>{String(age)}</output>}
					</form.Subscribe>
				</Form>
			)
		}

		render(<SliderCase />)
		expect(screen.getByRole('status')).toHaveTextContent('0')

		// A range input reports its value as a string; the adapter must write a real `number` back.
		fireEvent.change(screen.getByLabelText('Age'), { target: { value: '7' } })

		expect(screen.getByRole('status')).toHaveTextContent('7')
	})

	it('rests at the minimum when the bound value is not a real number', () => {
		const { useForm: useSliderForm } = createForm({
			FormElement: testFormElement,
			fields: testFields,
			components: testComponents,
		})

		function FallbackCase() {
			// `NaN` is a `number` to the type system but "no value" to `asNumber`, so the thumb must
			// fall back to the declared `min` rather than render `NaN`.
			const form = useSliderForm({ defaultValues: { level: Number.NaN } })

			return (
				<Form form={form}>
					<form.SliderField
						name='level'
						label='Level'
						min={10}
						max={20}
					/>
				</Form>
			)
		}

		render(<FallbackCase />)

		expect(screen.getByLabelText('Level')).toHaveValue('10')
	})

	it('fires onBlur so blur-time validation can run', async () => {
		const user = userEvent.setup()
		const onBlur = vi.fn(() => undefined)

		function BlurCase() {
			const form = useForm({ defaultValues: DEFAULTS, validators: { onBlur } })

			return (
				<Form form={form}>
					<form.TextField
						name='email'
						label='Email'
					/>
				</Form>
			)
		}

		render(<BlurCase />)
		await user.click(screen.getByLabelText('Email'))
		await user.tab()

		await waitFor(() => {
			expect(onBlur).toHaveBeenCalled()
		})
	})
})

describe('createForm — errors', () => {
	function ValidationCase() {
		const form = useForm({
			defaultValues: DEFAULTS,
			validators: {
				onChange: ({ value }) => (value.email.includes('@') ? undefined : { fields: { email: 'Enter a valid email' } }),
			},
		})

		return (
			<Form form={form}>
				<form.TextField
					name='email'
					label='Email'
					description='Work address'
				/>
			</Form>
		)
	}

	it('renders validation issues through the injected ErrorText', async () => {
		const user = userEvent.setup()
		render(<ValidationCase />)

		await user.type(screen.getByLabelText('Email'), 'nope')

		const error = await screen.findByRole('alert')
		expect(error).toHaveTextContent('Enter a valid email')
		expect(error).toHaveAttribute('data-testkit', 'error')
	})

	it('marks the field and its input invalid only while an error stands', async () => {
		const user = userEvent.setup()
		const { container } = render(<ValidationCase />)

		const input = screen.getByLabelText('Email')
		expect(container.querySelector('[data-field="email"]')).not.toHaveAttribute('data-invalid')

		await user.type(input, 'nope')

		await waitFor(() => {
			expect(container.querySelector('[data-field="email"]')).toHaveAttribute('data-invalid', 'true')
		})
		expect(input).toHaveAttribute('aria-invalid', 'true')

		await user.type(input, '@example.com')

		await waitFor(() => {
			expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		})
	})

	it('points aria-describedby at the description and the error', async () => {
		const user = userEvent.setup()
		render(<ValidationCase />)

		const input = screen.getByLabelText('Email')
		expect(input).toHaveAttribute('aria-describedby', 'email-description')

		await user.type(input, 'nope')

		await waitFor(() => {
			expect(input).toHaveAttribute('aria-describedby', 'email-description email-error')
		})
		expect(screen.getByText('Work address')).toHaveAttribute('id', 'email-description')
	})
})

describe('createForm — submit', () => {
	it('wires the form element to handleSubmit and hands over the values', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		function SubmitCase() {
			const form = useForm({
				defaultValues: DEFAULTS,
				onSubmit: ({ value }) => {
					onSubmit(value)
				},
			})

			return (
				<Form form={form}>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</Form>
			)
		}

		render(<SubmitCase />)
		await user.type(screen.getByLabelText('Email'), 'a@b.c')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.c' }))
		})
	})

	it('disables the submit button while the form cannot be submitted', async () => {
		function BlockedCase() {
			const form = useForm({
				defaultValues: DEFAULTS,
				validators: { onMount: () => 'always invalid' },
			})

			return (
				<Form form={form}>
					<form.SubmitButton>Save</form.SubmitButton>
				</Form>
			)
		}

		render(<BlockedCase />)

		await waitFor(() => {
			expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
		})
	})

	it('honours an explicitly disabled submit button', () => {
		function DisabledCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.SubmitButton disabled>Save</form.SubmitButton>
				</Form>
			)
		}

		render(<DisabledCase />)

		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
	})
})

describe('createForm — native TanStack API', () => {
	it('keeps NativeField, Subscribe, handleSubmit and state on the instance', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		function NativeCase() {
			const form = useForm({
				defaultValues: DEFAULTS,
				onSubmit: ({ value }) => {
					onSubmit(value)
				},
			})

			expect(form.state.values).toEqual(DEFAULTS)
			expect(typeof form.handleSubmit).toBe('function')

			return (
				<Form form={form}>
					{/* TanStack's render-prop field, as `NativeField` */}
					<form.NativeField name='email'>
						{(field) => (
							<input
								aria-label='native email'
								value={field.state.value}
								onChange={(event) => {
									field.handleChange(event.target.value)
								}}
							/>
						)}
					</form.NativeField>
					<form.Subscribe selector={(state) => state.values.email}>
						{(email) => <output>{email}</output>}
					</form.Subscribe>
					<form.SubmitButton>Save</form.SubmitButton>
				</Form>
			)
		}

		render(<NativeCase />)
		await user.type(screen.getByLabelText('native email'), 'x@y.z')

		expect(screen.getByRole('status')).toHaveTextContent('x@y.z')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'x@y.z' }))
		})
	})

	it('binds an own control through form.Field and submits it', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		function BoundCase() {
			const form = useForm({
				defaultValues: DEFAULTS,
				onSubmit: ({ value }) => {
					onSubmit(value)
				},
			})

			expect(form.state.values).toEqual(DEFAULTS)
			expect(typeof form.handleSubmit).toBe('function')

			return (
				<Form form={form}>
					<form.Field name='email'>
						{({ value, onChange }) => (
							<input
								aria-label='bound email'
								value={value}
								onChange={(event) => {
									onChange(event.target.value)
								}}
							/>
						)}
					</form.Field>
					<form.Subscribe selector={(state) => state.values.email}>
						{(email) => <output>{email}</output>}
					</form.Subscribe>
					<form.SubmitButton>Save</form.SubmitButton>
				</Form>
			)
		}

		render(<BoundCase />)
		await user.type(screen.getByLabelText('bound email'), 'x@y.z')

		expect(screen.getByRole('status')).toHaveTextContent('x@y.z')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'x@y.z' }))
		})
	})

	it('exposes AppField alongside the flat fields', () => {
		function AppFieldCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			expect(typeof form.AppField).toBe('function')

			return <Form form={form}>{null}</Form>
		}

		render(<AppFieldCase />)
	})
})

describe('createForm — dependency injection', () => {
	it('renders the injected primitives, not built-in markup', () => {
		function KitCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</Form>
			)
		}

		const { container } = render(<KitCase />)

		expect(container.querySelector('[data-testkit="form"]')).toBeInTheDocument()
		expect(container.querySelector('[data-testkit="field-root"]')).toBeInTheDocument()
		expect(container.querySelector('[data-testkit="label"]')).toBeInTheDocument()
		expect(container.querySelector('[data-testkit="text-input"]')).toBeInTheDocument()
		expect(container.querySelector('[data-testkit="button"]')).toBeInTheDocument()
	})

	it('binds a different component set per createForm call', () => {
		const altFields = {
			...testFields,
			TextField: ({ value, onChange, id, name }) => (
				<input
					data-alt-kit='text-input'
					id={id}
					name={name}
					value={value}
					onChange={(event) => {
						onChange(event.target.value)
					}}
				/>
			),
		} satisfies FormFieldSlots
		const { useForm: useAltForm } = createForm({
			FormElement: testFormElement,
			fields: altFields,
			components: testComponents,
		})

		function AltCase() {
			const form = useAltForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.TextField
						name='email'
						label='Email'
					/>
				</Form>
			)
		}

		const { container } = render(<AltCase />)

		expect(container.querySelector('[data-alt-kit="text-input"]')).toBeInTheDocument()
		expect(container.querySelector('[data-testkit="text-input"]')).not.toBeInTheDocument()
	})

	it('stamps the field kind on the root so kit CSS can target it', () => {
		function KindCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.NumberField
						name='age'
						label='Age'
					/>
					<form.CheckboxField
						name='agree'
						label='Agree'
					/>
				</Form>
			)
		}

		const { container } = render(<KindCase />)

		expect(container.querySelector('[data-field="email"]')).toHaveAttribute('data-field-type', 'text')
		expect(container.querySelector('[data-field="age"]')).toHaveAttribute('data-field-type', 'number')
		expect(container.querySelector('[data-field="agree"]')).toHaveAttribute('data-field-type', 'checkbox')
	})
})

describe('createForm — props beyond the binding reach the kit flat', () => {
	type KindValues = {
		text: string
		count: number
		notes: string
		agree: boolean
		notify: boolean
		level: number
		day: string
		stay: { start: string; end: string }
	}
	const KIND_DEFAULTS: KindValues = {
		text: 'hi',
		count: 2,
		notes: '',
		agree: false,
		notify: false,
		level: 3,
		day: '',
		stay: { start: '2026-01-01', end: '2026-01-02' },
	}

	/** Each plain built-in, the path it binds, and the attributes the contract used to carry for it. */
	const KINDS = [
		{ key: 'TextField', valueKey: 'value', name: 'text', former: { type: 'password', placeholder: 'Secret' } },
		{ key: 'NumberField', valueKey: 'value', name: 'count', former: { placeholder: '0', min: 1, max: 9, step: 2 } },
		{ key: 'TextareaField', valueKey: 'value', name: 'notes', former: { placeholder: 'Notes', rows: 4 } },
		{ key: 'CheckboxField', valueKey: 'checked', name: 'agree', former: {} },
		{ key: 'SwitchField', valueKey: 'checked', name: 'notify', former: {} },
		{ key: 'SliderField', valueKey: 'value', name: 'level', former: { min: 1, max: 9, step: 2 } },
		{
			key: 'DateField',
			valueKey: 'value',
			name: 'day',
			former: { placeholder: 'Pick', min: '2026-01-01', max: '2026-12-31' },
		},
		{
			key: 'DateRangeField',
			valueKey: 'value',
			name: 'stay',
			former: { placeholder: 'Pick', min: '2026-01-01', max: '2026-12-31' },
		},
	] as const

	/** Render `form.<key>` with arbitrary props, past the per-kind types a table of kinds cannot name. */
	function renderKind(key: string, props: Record<string, unknown>): ReturnType<typeof captureField> {
		const capture = captureField()
		const kit = createForm({ fields: { [key]: capture.Capture } })
		function Case(): ReactNode {
			const form = kit.useForm({ defaultValues: KIND_DEFAULTS })
			const Field = (form as unknown as Record<string, (props: Record<string, unknown>) => ReactNode>)[key]
			return Field === undefined ? null : <Field {...props} />
		}
		render(<Case />)
		return capture
	}

	it.each(KINDS)('$key hands every prop it does not bind to the kit, under its own name', ({ key, name, former }) => {
		const capture = renderKind(key, {
			name,
			label: 'Label',
			autoComplete: 'off',
			'data-testid': 'probe',
			variant: 'bordered',
			...former,
		})

		expect(capture.last()).toMatchObject({
			autoComplete: 'off',
			'data-testid': 'probe',
			variant: 'bordered',
			...former,
		})
	})

	it.each(KINDS)('$key keeps its binding props to itself', ({ key, name }) => {
		const capture = renderKind(key, { name, validate: { required: true } })

		expect(capture.last()).not.toHaveProperty('validate')
		expect(capture.last()).toMatchObject({ required: true })
	})

	it.each(KINDS)('$key passes a prop named after an Object.prototype member', ({ key, name }) => {
		const capture = renderKind(key, { name, toString: 'kept', constructor: 'kept' })

		expect(capture.last()).toMatchObject({ toString: 'kept', constructor: 'kept' })
	})

	it.each(KINDS)('$key resolves `required` from validate, over one written past the types', ({ key, name }) => {
		const capture = renderKind(key, { name, validate: { required: true }, required: false })

		expect(capture.last()).toMatchObject({ required: true })
	})

	it.each(KINDS)(
		'$key lets a computed prop win over the same key written past the types',
		({ key, name, valueKey }) => {
			const authorOnChange = vi.fn()
			const capture = renderKind(key, {
				name,
				onChange: authorOnChange,
				[valueKey]: 'author',
				id: 'author-id',
				'data-field': 'author-field',
			})

			const received = capture.last()
			expect(received).toMatchObject({ id: name, name, 'data-field': name })
			expect(received).toHaveProperty(valueKey)
			expect(received?.[valueKey]).not.toBe('author')
			expect(received?.onChange).not.toBe(authorOnChange)
		},
	)
})
