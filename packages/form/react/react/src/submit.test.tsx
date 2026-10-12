import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields } from './test-kit'

import type { SubmitRenderProps } from './index'

const { Form } = createForm({ components: testComponents, fields: testFields })

describe('form.Submit', () => {
	it('hands over the submit state', () => {
		render(
			<Form defaultValues={{ name: '' }}>
				{(form) => (
					<form.Submit>
						{(state) => (
							<output data-testid='state'>{JSON.stringify({ ...state, submit: typeof state.submit })}</output>
						)}
					</form.Submit>
				)}
			</Form>,
		)
		expect(JSON.parse(screen.getByTestId('state').textContent)).toEqual({
			canSubmit: true,
			isSubmitting: false,
			isDirty: false,
			formErrors: [],
			submit: 'function',
		})
	})

	it('reports isDirty once a value changes', async () => {
		render(
			<Form defaultValues={{ name: '' }}>
				{(form) => (
					<>
						<form.TextField
							name='name'
							label='Name'
						/>
						<form.Submit>{({ isDirty }) => <output data-testid='dirty'>{String(isDirty)}</output>}</form.Submit>
					</>
				)}
			</Form>,
		)
		await userEvent.type(screen.getByLabelText('Name'), 'x')
		expect(screen.getByTestId('dirty').textContent).toBe('true')
	})

	it('submits through submit(), outside any <form> element', async () => {
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={{ name: 'a' }}
				onSubmit={({ value }) => {
					onSubmit(value)
				}}
			>
				{(form) => (
					<form.Submit>
						{({ submit }) => (
							<button
								type='button'
								onClick={() => void submit()}
							>
								go
							</button>
						)}
					</form.Submit>
				)}
			</Form>,
		)
		await userEvent.click(screen.getByText('go'))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith({ name: 'a' })
		})
	})

	it('surfaces form-level errors as strings, and no field-level ones', async () => {
		render(
			<Form
				defaultValues={{ name: '' }}
				validators={{ onSubmit: () => 'Nothing to save' }}
			>
				{(form) => (
					<form.Submit>
						{({ formErrors, submit }) => (
							<>
								<output data-testid='errors'>{JSON.stringify(formErrors)}</output>
								<button
									type='button'
									onClick={() => void submit()}
								>
									go
								</button>
							</>
						)}
					</form.Submit>
				)}
			</Form>,
		)
		await userEvent.click(screen.getByText('go'))
		await waitFor(() => {
			expect(screen.getByTestId('errors').textContent).toBe('["Nothing to save"]')
		})
	})

	it('types the render props', () => {
		expectTypeOf<SubmitRenderProps>().toEqualTypeOf<{
			canSubmit: boolean
			isSubmitting: boolean
			isDirty: boolean
			formErrors: string[]
			submit: () => Promise<void>
		}>()
	})
})

describe('form.Submit field-level issues', () => {
	it('leaves formErrors empty when a form validator reports field issues only', async () => {
		render(
			<Form
				defaultValues={{ name: '' }}
				validators={{ onChange: () => ({ fields: { name: 'Required' } }) }}
			>
				{(form) => (
					<>
						<form.TextField
							name='name'
							label='Name'
						/>
						<form.Submit>
							{({ formErrors }) => <output data-testid='errors'>{JSON.stringify(formErrors)}</output>}
						</form.Submit>
					</>
				)}
			</Form>,
		)
		await userEvent.type(screen.getByLabelText('Name'), 'x')
		await userEvent.clear(screen.getByLabelText('Name'))
		await waitFor(() => {
			expect(screen.getByText('Required')).toBeTruthy()
		})
		expect(screen.getByTestId('errors').textContent).toBe('[]')
	})
})
