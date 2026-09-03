import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

type Values = { email: string }

const DEFAULTS: Values = { email: '' }

const { useForm, Form } = createForm({ components: testComponents })

describe('Form — uncontrolled', () => {
	it('runs the hook itself and hands the instance to the render prop', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		render(
			<Form
				defaultValues={DEFAULTS}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
						/>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.type(screen.getByLabelText('Email'), 'a@b.c')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.c' })
		})
	})

	it('renders exactly one form element, and it is the kit primitive', () => {
		const { container } = render(<Form defaultValues={DEFAULTS}>{() => null}</Form>)

		expect(container.querySelectorAll('form')).toHaveLength(1)
		expect(container.querySelector('[data-testkit="form"]')).toBeInTheDocument()
	})

	it('routes DOM props to the element and form options to the hook', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		const { container } = render(
			<Form
				id='signup'
				className='stack'
				data-testid='shell'
				defaultValues={DEFAULTS}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => <form.SubmitButton>Save</form.SubmitButton>}
			</Form>,
		)

		const element = container.querySelector('form')
		expect(element).toHaveAttribute('id', 'signup')
		expect(element).toHaveClass('stack')
		expect(element).toHaveAttribute('data-testid', 'shell')
		// An option must never leak onto the element as an unknown attribute.
		expect(element).not.toHaveAttribute('defaultValues')
		expect(element).not.toHaveAttribute('onSubmit')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ email: '' })
		})
	})

	/**
	 * The whole reason the uncontrolled mode exists: the form is created by mounting the
	 * element, so unmounting it — closing a dialog, switching a record — takes the state
	 * with it instead of leaving it alive in whichever parent called the hook.
	 */
	it('creates a fresh instance when the element remounts', async () => {
		const user = userEvent.setup()

		function Remountable() {
			const [instanceKey, setInstanceKey] = useState(0)

			return (
				<>
					<button
						type='button'
						onClick={() => {
							setInstanceKey((previous) => previous + 1)
						}}
					>
						remount
					</button>
					<Form
						key={instanceKey}
						defaultValues={DEFAULTS}
					>
						{(form) => (
							<form.TextField
								name='email'
								label='Email'
							/>
						)}
					</Form>
				</>
			)
		}

		render(<Remountable />)
		await user.type(screen.getByLabelText('Email'), 'a@b.c')
		expect(screen.getByLabelText('Email')).toHaveValue('a@b.c')

		await user.click(screen.getByRole('button', { name: 'remount' }))

		expect(screen.getByLabelText('Email')).toHaveValue('')
	})
})

describe('Form — controlled', () => {
	it('wires a caller-owned instance to the same submit path', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()

		function ControlledCase() {
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

		render(<ControlledCase />)
		await user.type(screen.getByLabelText('Email'), 'a@b.c')
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.c' })
		})
	})

	it('keeps the instance alive across the element unmounting', async () => {
		const user = userEvent.setup()

		function ToggleCase() {
			const form = useForm({ defaultValues: DEFAULTS })
			const [visible, setVisible] = useState(true)

			return (
				<>
					<button
						type='button'
						onClick={() => {
							setVisible((previous) => !previous)
						}}
					>
						toggle
					</button>
					{visible ? (
						<Form form={form}>
							<form.TextField
								name='email'
								label='Email'
							/>
						</Form>
					) : null}
				</>
			)
		}

		render(<ToggleCase />)
		await user.type(screen.getByLabelText('Email'), 'a@b.c')

		await user.click(screen.getByRole('button', { name: 'toggle' }))
		await user.click(screen.getByRole('button', { name: 'toggle' }))

		// The hook lives in the parent, so the value survives — this is exactly the lifetime
		// the uncontrolled mode does not have, and why the docs default to that one.
		expect(screen.getByLabelText('Email')).toHaveValue('a@b.c')
	})

	it('stops the submit event from bubbling past its own form', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const ancestorSaw = vi.fn()

		function BubbleCase() {
			const form = useForm({
				defaultValues: DEFAULTS,
				onSubmit: () => {
					onSubmit()
				},
			})

			// React delegates events at the root, so an ancestor handler still sees a submit
			// that bubbles — which is exactly what an enclosing form would do in a real app.
			return (
				<div onSubmit={ancestorSaw}>
					<Form form={form}>
						<form.SubmitButton>Save</form.SubmitButton>
					</Form>
				</div>
			)
		}

		render(<BubbleCase />)
		await user.click(screen.getByRole('button', { name: 'Save' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
		expect(ancestorSaw).not.toHaveBeenCalled()
	})
})
