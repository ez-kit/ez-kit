import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TextInputType } from './contract'
import { createForm } from './create-form'
import { testComponents } from './test-kit'

import type { FormComponents } from './contract'

type Values = {
	email: string
	age: number
	bio: string
	role: string
	agree: boolean
}

const DEFAULTS: Values = { email: '', age: 0, bio: '', role: '', agree: false }

const ROLE_OPTIONS = [
	{ label: 'User', value: 'user' },
	{ label: 'Admin', value: 'admin' },
]

const { useForm } = createForm({ components: testComponents })

describe('createForm — field binding', () => {
	function TextCase() {
		const form = useForm({ defaultValues: DEFAULTS })

		return (
			<form.Form>
				<form.TextField
					name='email'
					label='Email'
					type={TextInputType.Email}
					placeholder='you@example.com'
				/>
				<form.Subscribe selector={(state) => state.values.email}>{(email) => <output>{email}</output>}</form.Subscribe>
			</form.Form>
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
		expect(input).toHaveAttribute('type', TextInputType.Email)
		expect(input).toHaveAttribute('placeholder', 'you@example.com')
	})

	it('binds the number field as a number, and an empty control as undefined', async () => {
		const user = userEvent.setup()

		function NumberCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<form.Form>
					<form.NumberField
						name='age'
						label='Age'
					/>
					<form.Subscribe selector={(state) => state.values.age}>
						{(age) => <output>{`${typeof age}:${String(age)}`}</output>}
					</form.Subscribe>
				</form.Form>
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
				<form.Form>
					<form.TextareaField
						name='bio'
						label='Bio'
						rows={4}
					/>
					<form.Subscribe selector={(state) => state.values.bio}>{(bio) => <output>{bio}</output>}</form.Subscribe>
				</form.Form>
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
				<form.Form>
					<form.SelectField
						name='role'
						label='Role'
						options={ROLE_OPTIONS}
						placeholder='Pick one'
					/>
					<form.Subscribe selector={(state) => state.values.role}>{(role) => <output>{role}</output>}</form.Subscribe>
				</form.Form>
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
				<form.Form>
					<form.CheckboxField
						name='agree'
						label='I agree'
					/>
					<form.Subscribe selector={(state) => state.values.agree}>
						{(agree) => <output>{String(agree)}</output>}
					</form.Subscribe>
				</form.Form>
			)
		}

		render(<CheckboxCase />)
		expect(screen.getByRole('status')).toHaveTextContent('false')

		await user.click(screen.getByLabelText('I agree'))

		expect(screen.getByRole('status')).toHaveTextContent('true')
	})

	it('fires onBlur so blur-time validation can run', async () => {
		const user = userEvent.setup()
		const onBlur = vi.fn(() => undefined)

		function BlurCase() {
			const form = useForm({ defaultValues: DEFAULTS, validators: { onBlur } })

			return (
				<form.Form>
					<form.TextField
						name='email'
						label='Email'
					/>
				</form.Form>
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
			<form.Form>
				<form.TextField
					name='email'
					label='Email'
					description='Work address'
				/>
			</form.Form>
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
	it('wires form.Form to handleSubmit and hands over the values', async () => {
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
				<form.Form>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</form.Form>
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
				<form.Form>
					<form.SubmitButton>Save</form.SubmitButton>
				</form.Form>
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
				<form.Form>
					<form.SubmitButton disabled>Save</form.SubmitButton>
				</form.Form>
			)
		}

		render(<DisabledCase />)

		expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
	})
})

describe('createForm — native TanStack API', () => {
	it('keeps Field, Subscribe, handleSubmit and state on the instance', async () => {
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
				<form.Form>
					{/* the native render-prop Field, untouched by the flat wrappers */}
					<form.Field name='email'>
						{(field) => (
							<input
								aria-label='native email'
								value={field.state.value}
								onChange={(event) => {
									field.handleChange(event.target.value)
								}}
							/>
						)}
					</form.Field>
					<form.Subscribe selector={(state) => state.values.email}>
						{(email) => <output>{email}</output>}
					</form.Subscribe>
					<form.SubmitButton>Save</form.SubmitButton>
				</form.Form>
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

	it('exposes AppField alongside the flat fields', () => {
		function AppFieldCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			expect(typeof form.AppField).toBe('function')

			return <form.Form>{null}</form.Form>
		}

		render(<AppFieldCase />)
	})
})

describe('createForm — dependency injection', () => {
	it('renders the injected primitives, not built-in markup', () => {
		function KitCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<form.Form>
					<form.TextField
						name='email'
						label='Email'
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</form.Form>
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
		const altComponents: FormComponents = {
			...testComponents,
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
		}
		const { useForm: useAltForm } = createForm({ components: altComponents })

		function AltCase() {
			const form = useAltForm({ defaultValues: DEFAULTS })

			return (
				<form.Form>
					<form.TextField
						name='email'
						label='Email'
					/>
				</form.Form>
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
				<form.Form>
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
				</form.Form>
			)
		}

		const { container } = render(<KindCase />)

		expect(container.querySelector('[data-field="email"]')).toHaveAttribute('data-field-type', 'text')
		expect(container.querySelector('[data-field="age"]')).toHaveAttribute('data-field-type', 'number')
		expect(container.querySelector('[data-field="agree"]')).toHaveAttribute('data-field-type', 'checkbox')
	})
})
