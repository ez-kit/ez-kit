import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import type { SubmitRenderProps } from './index'

const { Form } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

const SERVER_FORM_ERRORS = { form: ['Same', 'Other'] }

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

	it('puts the server form messages after the form validator errors, de-duplicated', async () => {
		render(
			<Form
				defaultValues={{ name: '' }}
				validators={{ onChange: () => 'Same' }}
				serverErrors={SERVER_FORM_ERRORS}
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
		await waitFor(() => {
			expect(screen.getByTestId('errors').textContent).toBe('["Same","Other"]')
		})
	})

	it("leaves a step's own errors out of formErrors", async () => {
		render(
			<Form defaultValues={{ name: '' }}>
				{(form) => (
					<>
						<button
							type='button'
							onClick={() => {
								form.setErrorMap({ 'onStep:plan': 'Choose a plan', onChange: 'Form-wide' } as never)
							}}
						>
							report
						</button>
						<form.Submit>
							{({ formErrors }) => <output data-testid='errors'>{JSON.stringify(formErrors)}</output>}
						</form.Submit>
					</>
				)}
			</Form>,
		)
		await userEvent.click(screen.getByText('report'))
		await waitFor(() => {
			expect(screen.getByTestId('errors').textContent).toBe('["Form-wide"]')
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

describe('form.Submit formErrors and a form-level standard schema', () => {
	it('lists only the pathless issues of a form-level standard schema in formErrors (R64)', async () => {
		const user = userEvent.setup()
		const rootSchema = testSchema<{ a: string }>((values) => [
			{ message: 'Root problem' },
			...(values.a === '' ? [{ message: 'A is required', path: ['a'] }] : []),
		])
		render(
			<Form
				defaultValues={{ a: '' }}
				validators={{ onSubmit: rootSchema }}
			>
				{(form) => (
					<form.Submit>
						{({ formErrors, submit }) => (
							<>
								<output data-testid='form-errors'>{formErrors.join('|')}</output>
								<button
									type='button'
									onClick={() => void submit()}
								>
									Go
								</button>
							</>
						)}
					</form.Submit>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Go' }))

		expect(screen.getByTestId('form-errors')).toHaveTextContent(/^Root problem$/)
	})

	it('keeps the pathless issue when the form has a field named message', async () => {
		const user = userEvent.setup()
		const contactSchema = testSchema<{ message: string }>(() => [
			{ message: 'Root problem' },
			{ message: 'Message is required', path: ['message'] },
		])
		render(
			<Form
				defaultValues={{ message: '' }}
				validators={{ onSubmit: contactSchema }}
			>
				{(form) => (
					<form.Submit>
						{({ formErrors, submit }) => (
							<>
								<output data-testid='form-errors'>{formErrors.join('|')}</output>
								<button
									type='button'
									onClick={() => void submit()}
								>
									Go
								</button>
							</>
						)}
					</form.Submit>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Go' }))

		expect(screen.getByTestId('form-errors')).toHaveTextContent(/^Root problem$/)
	})
})
