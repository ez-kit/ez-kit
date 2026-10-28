import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Form } from './form'

import * as kit from './index'

import type { ReactNode } from 'react'

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

/**
 * A field kind the kit does not ship, declared the way an app would — the proof that a
 * bundle recomposed from the package root's own exports accepts a thirteenth slot.
 */
const RatingField = kit.defineFieldType<{ max: number }, number>()(function Rating(props): ReactNode {
	return (
		<div data-testid='rating'>
			{props.value} / {props.props.max}
		</div>
	)
})

describe('@ez-kit/form-heroui smoke', () => {
	function Case({ onSubmit }: { onSubmit?: (value: Values) => void }) {
		return (
			<Form
				defaultValues={DEFAULTS}
				validators={{
					onChange: ({ value }) =>
						value.email.includes('@') ? undefined : { fields: { email: 'Enter a valid email' } },
				}}
				onSubmit={({ value }) => {
					onSubmit?.(value)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
							description='Work address'
						/>
						<form.NumberField
							name='age'
							label='Age'
						/>
						<form.TextareaField
							name='bio'
							label='Bio'
						/>
						<form.SelectField
							name='role'
							label='Role'
							options={ROLE_OPTIONS}
							placeholder='Pick one'
						/>
						<form.CheckboxField
							name='agree'
							label='I agree'
						/>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>
		)
	}

	it('renders every field through the HeroUI primitives', () => {
		const { container } = render(<Case />)

		expect(container.querySelectorAll('[data-field]')).toHaveLength(5)
		// HeroUI v3 stamps its own class names on the React Aria compositions, so their
		// presence proves the kit's components — not fallback markup — did the rendering.
		expect(container.querySelector('.textfield')).toBeInTheDocument()
		expect(container.querySelector('.number-field')).toBeInTheDocument()
		expect(container.querySelector('.checkbox')).toBeInTheDocument()
		expect(container.querySelector('.select')).toBeInTheDocument()
		expect(container.querySelector('[data-form-submit]')).toBeInTheDocument()
	})

	it("stamps the shared data-* hooks without clobbering HeroUI's own slots", () => {
		const { container } = render(<Case />)

		expect(container.querySelector('[data-form]')).toBeInTheDocument()
		// HeroUI sets `data-slot` before spreading props, so the kit must never pass one of its
		// own — doing so silently breaks every `@heroui/styles` slot selector.
		expect(container.querySelector('[data-field="agree"]')).toHaveAttribute('data-slot', 'checkbox')
		expect(container.querySelector('[data-slot^="form-"]')).not.toBeInTheDocument()
		expect(container.querySelector('[data-field="email"]')).toHaveAttribute('data-field-type', 'text')
		expect(container.querySelector('[data-field="role"]')).toHaveAttribute('data-field-type', 'select')
	})

	it("binds text input and renders errors through HeroUI's own FieldError", async () => {
		const user = userEvent.setup()
		const { container } = render(<Case />)

		const input = screen.getByLabelText('Email')
		await user.type(input, 'nope')

		expect(input).toHaveValue('nope')
		await waitFor(() => {
			expect(container.querySelector('[data-slot="field-error"]')).toHaveTextContent('Enter a valid email')
		})
		// React Aria's `FieldError`, not a hand-rolled stand-in: it only renders inside a field
		// root, carries the `errorMessage` slot, and is wired into the input's description.
		const error = container.querySelector('[data-slot="field-error"]')
		expect(error).toHaveAttribute('slot', 'errorMessage')
		expect(input.getAttribute('aria-describedby')).toContain(error?.id)
	})

	it('lets React Aria wire description and error into the input', async () => {
		const user = userEvent.setup()
		const { container } = render(<Case />)

		const input = screen.getByLabelText('Email')
		const description = container.querySelector('[data-slot="description"]')

		expect(description).toHaveTextContent('Work address')
		expect(input.getAttribute('aria-describedby')).toContain(description?.id)

		await user.type(input, 'nope')

		// Both ids stay referenced once the field turns invalid — the description does not get
		// replaced by the error.
		await waitFor(() => {
			expect(container.querySelector('[data-slot="field-error"]')).toBeInTheDocument()
		})
		expect(input.getAttribute('aria-describedby')).toContain(description?.id)
	})

	it('submits through the HeroUI button', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<Case onSubmit={onSubmit} />)

		await user.type(screen.getByLabelText('Email'), 'a@b.c')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@b.c' }))
		})
	})

	it('toggles the checkbox field', async () => {
		const user = userEvent.setup()
		render(<Case />)

		const checkbox = screen.getByRole('checkbox', { name: 'I agree' })
		expect(checkbox).not.toBeChecked()

		await user.click(checkbox)

		await waitFor(() => {
			expect(checkbox).toBeChecked()
		})
	})
})

describe('@ez-kit/form-heroui package root', () => {
	it('exports the factory, both contract bags and every field component', () => {
		expect(typeof kit.createForm).toBe('function')
		expect(typeof kit.defineFieldType).toBe('function')
		expect(Object.keys(kit.allFormFields)).toHaveLength(13)
		expect(kit.allFormFields.ArrayField.Item).toBeTypeOf('function')
		expect(Object.keys(kit.allFormComponents).sort()).toEqual(['Grid', 'Section', 'SubmitButton'])
		expect(kit.allFormComponents.SubmitButton).toBe(kit.SubmitButton)
		expect(kit.FormElement).toBeTypeOf('function')
		for (const name of Object.keys(kit.allFormFields)) {
			expect(kit[name as keyof typeof kit]).toBe(kit.allFormFields[name as keyof typeof kit.allFormFields])
		}
		for (const name of Object.keys(kit.allFormComponents)) {
			expect(kit[name as keyof typeof kit]).toBe(kit.allFormComponents[name as keyof typeof kit.allFormComponents])
		}
		expect(kit).not.toHaveProperty('formFieldSlots')
		expect(kit).not.toHaveProperty('formComponents')
	})

	it('recomposes a bundle from the exported bags that renders the real HeroUI input', () => {
		const { Form: Rebuilt } = kit.createForm({
			FormElement: kit.FormElement,
			fields: { ...kit.allFormFields, RatingField },
			components: kit.allFormComponents,
		})

		const { container } = render(
			<Rebuilt defaultValues={{ email: '', score: 0 }}>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
						/>
						<form.RatingField
							name='score'
							label='Score'
							max={5}
						/>
					</>
				)}
			</Rebuilt>,
		)

		// HeroUI's own class on the React Aria composition.
		expect(container.querySelector('.textfield')).toBeInTheDocument()
		expect(screen.getByLabelText('Email')).toBeInTheDocument()
		expect(screen.getByTestId('rating')).toHaveTextContent('0 / 5')
	})
})

const CONTACT: kit.FormSchema<{ email: string }> = {
	version: 1,
	children: [
		{ type: kit.FormFieldType.Text, name: 'email', label: 'Email' },
		{ type: 'block', component: 'SubmitButton', props: { children: 'Save' } },
	],
}

/**
 * The prebuilt `useForm` / `Form` and the prebuilt `SchemaForm` come from two separate factory
 * calls — `createForm` and `createSchemaForm` — so an instance from one rendered by the other is
 * the case that would break if the two bundles stopped agreeing.
 */
describe('@ez-kit/form-heroui prebuilt bundles together', () => {
	it('renders a prebuilt useForm instance through the controlled SchemaForm and submits it', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		function Controlled() {
			const form = kit.useForm({
				defaultValues: { email: '' },
				onSubmit: ({ value }) => {
					onSubmit(value)
				},
			})

			return (
				<kit.SchemaForm
					form={form}
					schema={CONTACT}
				/>
			)
		}

		render(<Controlled />)

		await user.type(screen.getByLabelText('Email'), 'a@b.c')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.c' })
		})
	})
})

describe('@ez-kit/form-heroui — props beyond the contract reach the input', () => {
	it('puts `type`, the input attributes and `placeholder` on the <input>, with no import', () => {
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Password'
							type='password'
							autoComplete='current-password'
							inputMode='text'
							maxLength={64}
							placeholder='••••'
						/>
						<form.NumberField
							name='age'
							label='Age'
							placeholder='18'
							min={1}
							max={120}
							step={1}
						/>
						<form.TextareaField
							name='bio'
							label='Bio'
							rows={5}
							placeholder='About you'
							maxLength={280}
						/>
					</>
				)}
			</Form>,
		)

		const password = screen.getByLabelText('Password')
		expect(password.tagName).toBe('INPUT')
		expect(password).toHaveAttribute('type', 'password')
		expect(password).toHaveAttribute('autocomplete', 'current-password')
		expect(password).toHaveAttribute('inputmode', 'text')
		expect(password).toHaveAttribute('maxlength', '64')
		expect(password).toHaveAttribute('placeholder', '••••')

		expect(screen.getByRole('textbox', { name: 'Age' })).toHaveAttribute('placeholder', '18')

		const bio = screen.getByLabelText('Bio')
		expect(bio).toHaveAttribute('rows', '5')
		expect(bio).toHaveAttribute('placeholder', 'About you')
		expect(bio).toHaveAttribute('maxlength', '280')
	})
})

describe('the step flow and the form-schema helpers', () => {
	it('re-exports revalidateLogic, useStep and useSteps from the adapter', () => {
		expect(typeof kit.revalidateLogic).toBe('function')
		expect(typeof kit.useStep).toBe('function')
		expect(typeof kit.useSteps).toBe('function')
	})
})
