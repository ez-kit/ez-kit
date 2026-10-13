import { FormFieldType } from '@ez-kit/form-core'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const { Form, FormProvider, useForm } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

const { SchemaForm } = createSchemaForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

const REQUIRED = { required: true } as const

function submitButton(name = 'Save'): HTMLElement {
	return screen.getByRole('button', { name })
}

describe('focus on the first error', () => {
	it('focuses the first invalid field in DOM order, not in registration order', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={{ a: '', b: '' }}>
				{(form) => (
					<>
						<form.TextField
							name='b'
							label='B'
							validate={REQUIRED}
						/>
						<form.TextField
							name='a'
							label='A'
							validate={REQUIRED}
						/>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(submitButton())

		await waitFor(() => {
			expect(document.activeElement).toBe(screen.getByLabelText('B'))
		})
	})

	it('skips a valid field before an invalid one', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={{ a: 'filled', b: '' }}>
				{(form) => (
					<>
						<form.TextField
							name='a'
							label='A'
							validate={REQUIRED}
						/>
						<form.TextField
							name='b'
							label='B'
							validate={REQUIRED}
						/>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(submitButton())

		await waitFor(() => {
			expect(document.activeElement).toBe(screen.getByLabelText('B'))
		})
	})

	it('falls back to the first focusable descendant when the id sits on a container', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={{ choice: '' }}>
				{(form) => (
					<>
						<form.Field
							name='choice'
							validate={REQUIRED}
						>
							{(field) => (
								<div
									data-field={field['data-field']}
									data-form-id={field['data-form-id']}
									id={field.id}
								>
									<button type='button'>A</button>
									<button type='button'>B</button>
								</div>
							)}
						</form.Field>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(submitButton())

		await waitFor(() => {
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'A' }))
		})
	})

	it("runs the author's onSubmitInvalid after the focus", async () => {
		const user = userEvent.setup()
		const seen: (Element | null)[] = []
		render(
			<Form
				defaultValues={{ email: '' }}
				onSubmitInvalid={() => {
					seen.push(document.activeElement)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
							validate={REQUIRED}
						/>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(submitButton())

		await waitFor(() => {
			expect(seen).toHaveLength(1)
		})
		expect(seen[0]).toBe(screen.getByLabelText('Email'))
	})

	it('focusOnError={false} leaves focus alone and never reaches the DOM', async () => {
		const user = userEvent.setup()
		const onSubmitInvalid = vi.fn()
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
		const { container } = render(
			<Form
				defaultValues={{ email: '' }}
				focusOnError={false}
				onSubmitInvalid={onSubmitInvalid}
			>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
							validate={REQUIRED}
						/>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		const button = submitButton()
		await user.click(button)

		await waitFor(() => {
			expect(onSubmitInvalid).toHaveBeenCalledTimes(1)
		})
		const errorCalls = [...consoleError.mock.calls]
		consoleError.mockRestore()
		expect(document.activeElement).toBe(button)
		const formElement = container.querySelector('form')
		expect(formElement).not.toBeNull()
		expect(formElement?.hasAttribute('focusOnError')).toBe(false)
		expect(formElement?.hasAttribute('focusonerror')).toBe(false)
		expect(errorCalls).toEqual([])
	})

	it('keeps two forms with the same field names apart', async () => {
		const user = userEvent.setup()

		function ProviderForm(): ReactNode {
			const form = useForm({ defaultValues: { email: '' } })
			return (
				<FormProvider form={form}>
					<form.TextField
						name='email'
						label='Email'
						validate={REQUIRED}
					/>
					<button
						type='button'
						onClick={() => {
							void form.handleSubmit()
						}}
					>
						Submit B
					</button>
				</FormProvider>
			)
		}

		render(
			<>
				<Form defaultValues={{ email: '' }}>
					{(form) => (
						<>
							<form.TextField
								name='email'
								label='Email'
								validate={REQUIRED}
							/>
							<form.SubmitButton>Submit A</form.SubmitButton>
						</>
					)}
				</Form>
				<ProviderForm />
			</>,
		)

		// Both inputs carry `id='email'`, so a label resolves to the first one only; take them by role.
		const [inputA, inputB] = screen.getAllByRole('textbox')

		await user.click(submitButton('Submit B'))
		await waitFor(() => {
			expect(document.activeElement).toBe(inputB)
		})

		await user.click(submitButton('Submit A'))
		await waitFor(() => {
			expect(document.activeElement).toBe(inputA)
		})
	})

	it('focuses through a controlled <Form>', async () => {
		const user = userEvent.setup()

		function Controlled(): ReactNode {
			const form = useForm({ defaultValues: { email: '' } })
			return (
				<Form form={form}>
					<form.TextField
						name='email'
						label='Email'
						validate={REQUIRED}
					/>
					<form.SubmitButton>Save</form.SubmitButton>
				</Form>
			)
		}

		render(<Controlled />)

		await user.click(submitButton())

		await waitFor(() => {
			expect(document.activeElement).toBe(screen.getByLabelText('Email'))
		})
	})

	it('focuses through an uncontrolled <SchemaForm>', async () => {
		const user = userEvent.setup()
		const schema: FormSchema<{ email: string }> = {
			version: 1,
			children: [
				{ type: FormFieldType.Text, name: 'email', label: 'Email', validate: { required: true } },
				{ type: 'submit', label: 'Save' },
			],
		}

		render(
			<SchemaForm
				schema={schema}
				defaultValues={{ email: '' }}
				onSubmit={() => {}}
			/>,
		)

		await user.click(submitButton())

		await waitFor(() => {
			expect(document.activeElement).toBe(screen.getByLabelText('Email'))
		})
	})

	it('focuses nothing when only the form itself has an error', async () => {
		const user = userEvent.setup()
		const onSubmitInvalid = vi.fn()
		render(
			<Form
				defaultValues={{ email: '' }}
				validators={{ onSubmit: () => 'Nope' }}
				onSubmitInvalid={onSubmitInvalid}
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

		const button = submitButton()
		await user.click(button)

		await waitFor(() => {
			expect(onSubmitInvalid).toHaveBeenCalledTimes(1)
		})
		expect(document.activeElement).toBe(button)
	})
})

/** Type-only: the option is accepted by `useForm` and checked as a boolean. Never rendered. */
function useTypeCases(): void {
	useForm({ defaultValues: { a: '' }, focusOnError: false })
	// @ts-expect-error -- not a boolean
	useForm({ defaultValues: { a: '' }, focusOnError: 'no' })
}
void useTypeCases
