import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { useForm } from './form'

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

describe('@ez-kit/form-heroui smoke', () => {
	function Case({ onSubmit }: { onSubmit?: (value: Values) => void }) {
		const form = useForm({
			defaultValues: DEFAULTS,
			validators: {
				onChange: ({ value }) => (value.email.includes('@') ? undefined : { fields: { email: 'Enter a valid email' } }),
			},
			onSubmit: ({ value }) => {
				onSubmit?.(value)
			},
		})

		return (
			<form.Form>
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
			</form.Form>
		)
	}

	it('renders every field through the HeroUI primitives', () => {
		const { container } = render(<Case />)

		expect(container.querySelectorAll('[data-slot="form-field"]')).toHaveLength(5)
		// HeroUI v3 stamps its own class names on the React Aria compositions, so their
		// presence proves the kit's components — not fallback markup — did the rendering.
		expect(container.querySelector('.textfield')).toBeInTheDocument()
		expect(container.querySelector('.number-field')).toBeInTheDocument()
		expect(container.querySelector('.checkbox')).toBeInTheDocument()
		expect(container.querySelector('.select')).toBeInTheDocument()
		expect(container.querySelector('[data-slot="form-submit"]')).toBeInTheDocument()
	})

	it('stamps the shared data-* hooks the kit CSS targets', () => {
		const { container } = render(<Case />)

		expect(container.querySelector('[data-form]')).toBeInTheDocument()
		expect(container.querySelector('[data-field="email"]')).toHaveAttribute('data-field-type', 'text')
		expect(container.querySelector('[data-field="role"]')).toHaveAttribute('data-field-type', 'select')
	})

	it('binds text input and renders errors through the HeroUI ErrorText', async () => {
		const user = userEvent.setup()
		render(<Case />)

		const input = screen.getByLabelText('Email')
		await user.type(input, 'nope')

		expect(input).toHaveValue('nope')
		const error = await screen.findByRole('alert')
		expect(error).toHaveTextContent('Enter a valid email')
		expect(error).toHaveAttribute('data-slot', 'form-error')
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
