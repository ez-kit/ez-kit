import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { NoRegistry } from './contract'
import type { FieldControlProps } from './field-props'
import type { FormInstance } from './form-instance'
import type { ReactNode } from 'react'
import type { MockInstance } from 'vitest'

type Values = {
	seats: number
	guest: string
	address: { city: string }
	billingCity: string
	tags: { label: string }[]
}
const DEFAULTS: Values = { seats: 0, guest: '', address: { city: '' }, billingCity: '', tags: [{ label: '' }] }

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

function ValuesOutput({ form }: { form: FormInstance<Values, NoRegistry, NoRegistry> }): ReactNode {
	return (
		<form.Subscribe selector={(state) => JSON.stringify(state.values)}>
			{(json) => <output>{json}</output>}
		</form.Subscribe>
	)
}

function TextInput({ value, onChange, name }: FieldControlProps<string>): ReactNode {
	return (
		<input
			aria-label={name}
			value={value}
			onChange={(event) => {
				onChange(event.target.value)
			}}
		/>
	)
}

function status(): HTMLElement {
	return screen.getByRole('status')
}

describe('form.Field', () => {
	it("hands the control's props and writes through a value-taking onChange", async () => {
		const user = userEvent.setup()
		const seen = vi.fn()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.Field name='guest'>
							{(field) => {
								seen(field)
								return (
									<button
										type='button'
										onClick={() => {
											field.onChange('Ann')
										}}
									>
										Write
									</button>
								)
							}}
						</form.Field>
						<ValuesOutput form={form} />
					</>
				)}
			</Form>,
		)

		expect(seen).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'guest',
				id: 'guest',
				'data-field': 'guest',
				'data-field-type': 'field',
				value: '',
				errors: [],
				invalid: false,
			}),
		)
		await user.click(screen.getByRole('button', { name: 'Write' }))
		expect(status()).toHaveTextContent('"guest":"Ann"')
	})

	it('runs validate, and shows its errors by the display rule', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.Field
							name='seats'
							validate={{ min: 1, messages: { min: 'At least one seat' } }}
						>
							{({ invalid, errors }) => invalid && <p role='alert'>{errors.join(', ')}</p>}
						</form.Field>
						<form.SubmitButton>Save</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		expect(screen.queryByRole('alert')).toBeNull()
		await user.click(screen.getByRole('button', { name: 'Save' }))
		expect(await screen.findByRole('alert')).toHaveTextContent('At least one seat')
	})

	it('validate.required marks the control and enforces it; a bare required only marks', async () => {
		const user = userEvent.setup()
		const requiredSeen = vi.fn()
		const markedSeen = vi.fn()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.Field
							name='guest'
							validate={{ required: true }}
						>
							{({ required, invalid, errors, onChange }) => {
								requiredSeen(required)
								return (
									<>
										<button
											type='button'
											onClick={() => {
												onChange('')
											}}
										>
											Clear
										</button>
										<button
											type='button'
											onClick={() => {
												onChange('Ann')
											}}
										>
											Fill
										</button>
										{invalid && <p role='alert'>{errors.join(', ')}</p>}
									</>
								)
							}}
						</form.Field>
						<form.Field
							name='billingCity'
							required
						>
							{({ required, errors, onChange }) => {
								markedSeen(required, errors)
								return (
									<button
										type='button'
										onClick={() => {
											onChange('')
										}}
									>
										Clear city
									</button>
								)
							}}
						</form.Field>
					</>
				)}
			</Form>,
		)

		expect(requiredSeen).toHaveBeenNthCalledWith(1, true)
		expect(markedSeen).toHaveBeenNthCalledWith(1, true, [])

		await user.click(screen.getByRole('button', { name: 'Clear' }))
		expect(screen.getByRole('alert')).toHaveTextContent('This field is required')
		await user.click(screen.getByRole('button', { name: 'Fill' }))
		expect(screen.queryByRole('alert')).toBeNull()

		await user.click(screen.getByRole('button', { name: 'Clear city' }))
		expect(markedSeen).toHaveBeenLastCalledWith(true, [])
	})

	describe('spread onto a DOM element', () => {
		let consoleError: MockInstance<typeof console.error>

		beforeEach(() => {
			consoleError = vi.spyOn(console, 'error')
		})

		afterEach(() => {
			consoleError.mockRestore()
		})

		it('leaves nothing React warns about once value, onChange, errors and invalid are taken out', async () => {
			const user = userEvent.setup()
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<>
							<form.Field name='seats'>
								{({ value, onChange, errors, invalid, ...field }) => (
									<>
										<input
											{...field}
											type='number'
											value={value}
											onChange={(event) => {
												onChange(Number(event.target.value))
											}}
										/>
										{invalid && <p role='alert'>{errors.join(', ')}</p>}
									</>
								)}
							</form.Field>
							<ValuesOutput form={form} />
						</>
					)}
				</Form>,
			)

			const input = screen.getByRole('spinbutton')
			await user.clear(input)
			await user.type(input, '3')
			expect(status()).toHaveTextContent('"seats":3')
			expect(consoleError).not.toHaveBeenCalled()
		})
	})

	describe('identity while the parent re-renders on every keystroke', () => {
		const IdentityCity = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => <group.Field name='city'>{(field) => <TextInput {...field} />}</group.Field>,
		})

		function ValuesParent({
			form,
			children,
		}: {
			form: FormInstance<Values, NoRegistry, NoRegistry>
			children: () => ReactNode
		}): ReactNode {
			return (
				<form.Subscribe selector={(state) => state.values}>
					{(values) => (
						<>
							{children()}
							<output>{JSON.stringify(values)}</output>
						</>
					)}
				</form.Subscribe>
			)
		}

		async function expectStableWhileTyping(label: string, written: string): Promise<void> {
			const user = userEvent.setup()
			const before = screen.getByLabelText(label)
			await user.type(before, 'abc')
			const after = screen.getByLabelText(label)

			expect(status()).toHaveTextContent(written)
			expect(after).toBe(before)
			expect(document.activeElement).toBe(after)
			expect(after).toHaveValue('abc')
		}

		it('form.Field', async () => {
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<ValuesParent form={form}>
							{() => <form.Field name='guest'>{(field) => <TextInput {...field} />}</form.Field>}
						</ValuesParent>
					)}
				</Form>,
			)
			await expectStableWhileTyping('guest', '"guest":"abc"')
		})

		it("a form group's group.Field", async () => {
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<ValuesParent form={form}>
							{() => (
								<form.FormGroup name='address'>
									{(group) => <group.Field name='city'>{(field) => <TextInput {...field} />}</group.Field>}
								</form.FormGroup>
							)}
						</ValuesParent>
					)}
				</Form>,
			)
			await expectStableWhileTyping('address.city', '"address":{"city":"abc"}')
		})

		it('item.Field', async () => {
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<ValuesParent form={form}>
							{() => (
								<form.Array
									name='tags'
									newItem={{ label: '' }}
								>
									{({ items }) =>
										items.map((item) => (
											<item.Field
												key={item.key}
												name='label'
											>
												{(field) => <TextInput {...field} />}
											</item.Field>
										))
									}
								</form.Array>
							)}
						</ValuesParent>
					)}
				</Form>,
			)
			await expectStableWhileTyping('tags[0].label', '"tags":[{"label":"abc"}]')
		})

		it("a field group's group.Field", async () => {
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<ValuesParent form={form}>
							{() => (
								<IdentityCity
									form={form}
									fields='address'
								/>
							)}
						</ValuesParent>
					)}
				</Form>,
			)
			await expectStableWhileTyping('address.city', '"address":{"city":"abc"}')
		})
	})

	it('binds an array entry relative to the entry', async () => {
		const user = userEvent.setup()
		const dataField = vi.fn()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.Array
							name='tags'
							newItem={{ label: '' }}
						>
							{({ items }) =>
								items.map((item) => (
									<item.Field
										key={item.key}
										name='label'
									>
										{(field) => {
											dataField(field['data-field'])
											return <TextInput {...field} />
										}}
									</item.Field>
								))
							}
						</form.Array>
						<ValuesOutput form={form} />
					</>
				)}
			</Form>,
		)

		await user.type(screen.getByLabelText('tags[0].label'), 'x')
		expect(status()).toHaveTextContent('"tags":[{"label":"x"}]')
		expect(dataField).toHaveBeenLastCalledWith('tags[0].label')
	})

	describe('on a field group', () => {
		const City = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => <group.Field name='city'>{(field) => <TextInput {...field} />}</group.Field>,
		})

		it('writes a name relative to a path branch', async () => {
			const user = userEvent.setup()
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<>
							<City
								form={form}
								fields='address'
							/>
							<ValuesOutput form={form} />
						</>
					)}
				</Form>,
			)

			await user.type(screen.getByLabelText('address.city'), 'x')
			expect(status()).toHaveTextContent('"address":{"city":"x"}')
		})

		it('writes the path a fields map names', async () => {
			const user = userEvent.setup()
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<>
							<City
								form={form}
								fields={{ city: 'billingCity' }}
							/>
							<ValuesOutput form={form} />
						</>
					)}
				</Form>,
			)

			await user.type(screen.getByLabelText('billingCity'), 'x')
			expect(status()).toHaveTextContent('"billingCity":"x"')
			expect(status()).toHaveTextContent('"address":{"city":""}')
		})
	})

	describe('on a form group', () => {
		it('writes a name relative to a nested branch', async () => {
			const user = userEvent.setup()
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<>
							<form.FormGroup name='address'>
								{(group) => <group.Field name='city'>{(field) => <TextInput {...field} />}</group.Field>}
							</form.FormGroup>
							<ValuesOutput form={form} />
						</>
					)}
				</Form>,
			)

			await user.type(screen.getByLabelText('address.city'), 'x')
			expect(status()).toHaveTextContent('"address":{"city":"x"}')
		})

		it('joins an indexed name onto an array branch', async () => {
			const user = userEvent.setup()
			render(
				<Form defaultValues={DEFAULTS}>
					{(form) => (
						<>
							<form.FormGroup name='tags'>
								{(group) => <group.Field name='[0].label'>{(field) => <TextInput {...field} />}</group.Field>}
							</form.FormGroup>
							<ValuesOutput form={form} />
						</>
					)}
				</Form>,
			)

			await user.type(screen.getByLabelText('tags[0].label'), 'x')
			await waitFor(() => {
				expect(status()).toHaveTextContent('"tags":[{"label":"x"}]')
			})
		})
	})
})
