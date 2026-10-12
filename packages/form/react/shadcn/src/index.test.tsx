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

describe('@ez-kit/form-shadcn smoke', () => {
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

	it('renders every field through the shadcn primitives', () => {
		const { container } = render(<Case />)

		// `data-slot` is shadcn's own marker: its presence proves the vendored primitives,
		// not some fallback markup, did the rendering.
		expect(container.querySelectorAll('[data-slot="form-field"]')).toHaveLength(5)
		expect(container.querySelector('[data-slot="input"]')).toBeInTheDocument()
		expect(container.querySelector('[data-slot="textarea"]')).toBeInTheDocument()
		expect(container.querySelector('[data-slot="select-trigger"]')).toBeInTheDocument()
		expect(container.querySelector('[data-slot="checkbox"]')).toBeInTheDocument()
		expect(container.querySelector('[data-slot="form-submit"]')).toBeInTheDocument()
		expect(container.querySelectorAll('[data-slot="form-label"]')).toHaveLength(5)
	})

	it('stamps the shared data-* hooks the kit CSS targets', () => {
		const { container } = render(<Case />)

		expect(container.querySelector('[data-form]')).toBeInTheDocument()
		expect(container.querySelector('[data-field="email"]')).toHaveAttribute('data-field-type', 'text')
		expect(container.querySelector('[data-field="role"]')).toHaveAttribute('data-field-type', 'select')
	})

	it('binds text input and renders errors through the shadcn ErrorText', async () => {
		const user = userEvent.setup()
		render(<Case />)

		const input = screen.getByLabelText('Email')
		await user.type(input, 'nope')

		expect(input).toHaveValue('nope')
		const error = await screen.findByRole('alert')
		expect(error).toHaveTextContent('Enter a valid email')
		expect(error).toHaveAttribute('data-slot', 'form-error')
		expect(input).toHaveAttribute('aria-invalid', 'true')
	})

	it('submits through the shadcn button', async () => {
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
		expect(checkbox).toHaveAttribute('data-state', 'unchecked')

		await user.click(checkbox)

		await waitFor(() => {
			expect(checkbox).toHaveAttribute('data-state', 'checked')
		})
	})
})

describe('@ez-kit/form-shadcn package root', () => {
	it('exports the factory, both contract bags and every field component', () => {
		expect(typeof kit.createForm).toBe('function')
		expect(typeof kit.defineFieldType).toBe('function')
		expect(Object.keys(kit.allFormFields)).toHaveLength(13)
		expect(kit.allFormFields.ArrayField.Item).toBeTypeOf('function')
		expect(Object.keys(kit.allFormComponents).sort()).toEqual(['GridItem', 'Section', 'SubmitButton', 'Wizard'])
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

	it('recomposes a bundle from the exported bags that renders the real shadcn input', () => {
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

		// The kit's own vendored primitive.
		expect(container.querySelector('[data-slot="input"]')).toBeInTheDocument()
		expect(screen.getByLabelText('Email')).toBeInTheDocument()
		expect(screen.getByTestId('rating')).toHaveTextContent('0 / 5')
	})
})

const CONTACT: kit.FormSchema<{ email: string }> = {
	version: 1,
	children: [
		{ type: kit.FormFieldType.Text, name: 'email', label: 'Email' },
		{ type: 'submit', label: 'Save' },
	],
}

/**
 * The prebuilt `useForm` / `Form` and the prebuilt `SchemaForm` come from two separate factory
 * calls — `createForm` and `createSchemaForm` — so an instance from one rendered by the other is
 * the case that would break if the two bundles stopped agreeing.
 */
describe('@ez-kit/form-shadcn prebuilt bundles together', () => {
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
