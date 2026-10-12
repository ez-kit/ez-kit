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
		expect(Object.keys(kit.formFieldSlots)).toHaveLength(12)
		expect(Object.keys(kit.formComponents)).toEqual(
			expect.arrayContaining(['ArrayField', 'ArrayItem', 'Button', 'Form', 'Section', 'GridItem', 'Wizard']),
		)
		for (const name of Object.keys(kit.formFieldSlots)) {
			expect(kit[name as keyof typeof kit]).toBe(kit.formFieldSlots[name as keyof typeof kit.formFieldSlots])
		}
	})

	it('recomposes a bundle from the exported bags that renders the real HeroUI input', () => {
		const { Form: Rebuilt } = kit.createForm({
			components: kit.formComponents,
			fields: { ...kit.formFieldSlots, RatingField },
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

		// HeroUI's own class on the React Aria composition, not the guard placeholder a
		// missing slot renders.
		expect(container.querySelector('.textfield')).toBeInTheDocument()
		expect(screen.getByLabelText('Email')).toBeInTheDocument()
		expect(screen.getByTestId('rating')).toHaveTextContent('0 / 5')
	})
})
