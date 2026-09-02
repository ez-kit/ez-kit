import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents } from './test-kit'

import type { SelectOption } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

/**
 * The flat fields' `validate` prop — the same `FieldValidate` object a schema field node
 * takes, run through the same core engine.
 *
 * What these tests pin is the **wiring**, not the constraints: the engine itself is covered
 * by `@ez-kit/form-core`'s `run-field-validate.test.ts` and `validate.test.ts`. Here the
 * questions are which TanStack hook it lands on (`onChange`, matching the schema side), how
 * it relates to the purely visual `required` prop, and what happens when a form-level
 * validator is present too.
 */

type Values = { email: string; age: number; tags: string[] }

const TAGS: readonly SelectOption[] = [
	{ label: 'Bug', value: 'bug' },
	{ label: 'Chore', value: 'chore' },
]

const { Form } = createForm({ components: testComponents })

/** Shared, never mutated — every case below starts from the same empty form. */
const DEFAULTS: Values = { email: '', age: 0, tags: [] }

function errorTexts(): (string | null)[] {
	return [...document.querySelectorAll('[data-testkit="error"]')].map((node) => node.textContent)
}

function textInput(): HTMLInputElement {
	const input = document.querySelector('input[data-testkit="text-input"]')
	if (!(input instanceof HTMLInputElement)) throw new Error('No text input rendered')
	return input
}

describe('validate on a flat field', () => {
	it('reports each constraint kind as it fails, and clears once it passes', async () => {
		const user = userEvent.setup()
		function EmailForm(): ReactNode {
			return (
				<Form
					defaultValues={DEFAULTS}
					noValidate
				>
					{(form) => (
						<form.TextField
							name='email'
							label='Email'
							validate={{ minLength: 3, format: 'email' }}
						/>
					)}
				</Form>
			)
		}
		render(<EmailForm />)

		await user.type(textInput(), 'ab')
		expect(errorTexts()).toEqual(['Must be at least 3 characters'])

		await user.type(textInput(), 'cd')
		expect(errorTexts()).toEqual(['Must be a valid email'])

		await user.clear(textInput())
		await user.type(textInput(), 'a@b.co')
		expect(errorTexts()).toEqual([])
	})

	it('runs numeric bounds on a number field', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<form.NumberField
						name='age'
						label='Age'
						validate={{ min: 18, max: 120 }}
					/>
				)}
			</Form>,
		)

		const input = screen.getByLabelText('Age')
		await user.clear(input)
		await user.type(input, '9')
		expect(errorTexts()).toEqual(['Must be at least 18'])

		await user.clear(input)
		await user.type(input, '900')
		expect(errorTexts()).toEqual(['Must be at most 120'])

		await user.clear(input)
		await user.type(input, '30')
		expect(errorTexts()).toEqual([])
	})

	it('counts selected items for a list field, with a `messages` override', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<form.MultiSelectField
						name='tags'
						label='Tags'
						options={TAGS}
						validate={{ maxLength: 1, messages: { maxLength: 'Pick at most one' } }}
					/>
				)}
			</Form>,
		)

		await user.selectOptions(screen.getByLabelText('Tags'), ['bug', 'chore'])
		expect(errorTexts()).toEqual(['Pick at most one'])

		await user.deselectOptions(screen.getByLabelText('Tags'), ['chore'])
		expect(errorTexts()).toEqual([])
	})
})

describe('validate.required and the visual required prop', () => {
	it('`validate.required` marks the control required as well as validating it', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<form.TextField
						name='email'
						label='Email'
						validate={{ required: true }}
					/>
				)}
			</Form>,
		)

		expect(textInput().required).toBe(true)

		await user.type(textInput(), 'a')
		await user.clear(textInput())
		expect(errorTexts()).toEqual(['This field is required'])
	})

	it('the bare `required` prop is visual only — it marks the control and validates nothing', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<form.TextField
						name='email'
						label='Email'
						required
					/>
				)}
			</Form>,
		)

		expect(textInput().required).toBe(true)

		await user.type(textInput(), 'a')
		await user.clear(textInput())
		expect(errorTexts()).toEqual([])
	})
})

describe('validate and submission', () => {
	it('blocks submit while a constraint fails, and lets it through once it holds', async () => {
		const user = userEvent.setup()
		const submitted = vi.fn()
		render(
			<Form
				defaultValues={DEFAULTS}
				onSubmit={({ value }) => {
					submitted(value)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
							validate={{ required: true, format: 'email' }}
						/>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(submitted).not.toHaveBeenCalled()
		// Submit marks every field touched, so the error shows even though nothing was typed.
		expect(errorTexts()).toEqual(['This field is required'])

		await user.type(textInput(), 'a@b.co')
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(submitted).toHaveBeenCalledWith({ email: 'a@b.co', age: 0, tags: [] })
	})

	it('a form-level validator and a field `validate` both run, and the field one wins a tie', async () => {
		const user = userEvent.setup()
		render(
			<Form
				defaultValues={DEFAULTS}
				validators={{
					onChange: ({ value }: { value: Values }) =>
						value.email.endsWith('@example.com') ? undefined : { fields: { email: 'Must be an example.com address' } },
				}}
			>
				{(form) => (
					<form.TextField
						name='email'
						label='Email'
						validate={{ minLength: 20 }}
					/>
				)}
			</Form>,
		)

		// Both land in the field's *same* `onChange` slot of the TanStack error map, and the
		// field-level validator is the one that runs last — so with both failing, only its
		// message is on screen. Neither is silenced, though: the form-level message appears
		// the moment the field-level constraint is satisfied, and both clear together.
		await user.type(textInput(), 'ab')
		expect(errorTexts()).toEqual(['Must be at least 20 characters'])

		await user.clear(textInput())
		await user.type(textInput(), 'aaaaaaaaaaaaaa@b.com')
		expect(errorTexts()).toEqual(['Must be an example.com address'])

		await user.clear(textInput())
		await user.type(textInput(), 'aaaaaaaaaaaa@example.com')
		expect(errorTexts()).toEqual([])
	})
})
