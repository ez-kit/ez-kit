import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

type Values = { email: string; tags: { label: string }[] }
const DEFAULTS: Values = { email: '', tags: [{ label: '' }] }

const { Form, useForm } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

function NativeCase({ onSubmit }: { onSubmit: (value: Values) => void }): ReactNode {
	const form = useForm({
		defaultValues: DEFAULTS,
		onSubmit: ({ value }) => {
			onSubmit(value)
		},
	})
	return (
		<Form form={form}>
			<form.NativeField name='email'>
				{(field) => (
					<input
						aria-label='native email'
						value={field.state.value}
						onChange={(event) => {
							field.handleChange(event.target.value)
						}}
					/>
				)}
			</form.NativeField>
			<form.TextField
				name='email'
				label='Bound email'
			/>
			<form.SubmitButton>Save</form.SubmitButton>
		</Form>
	)
}

describe('form.NativeField', () => {
	it("is TanStack's render-prop field, writing the form's value", async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<NativeCase onSubmit={onSubmit} />)

		await user.type(screen.getByLabelText('native email'), 'x@y.z')
		expect(screen.getByLabelText('Bound email')).toHaveValue('x@y.z')

		await user.click(screen.getByRole('button', { name: 'Save' }))
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ email: 'x@y.z' }))
		})
	})

	it('stays native and keeps every bound field working under StrictMode', async () => {
		const user = userEvent.setup()
		render(
			<StrictMode>
				<NativeCase onSubmit={() => {}} />
			</StrictMode>,
		)

		await user.type(screen.getByLabelText('Bound email'), 'a')
		expect(screen.getByLabelText('native email')).toHaveValue('a')
	})

	it('is item-relative on an array entry', async () => {
		const user = userEvent.setup()
		function EntryCase(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					<form.Array
						name='tags'
						newItem={{ label: '' }}
					>
						{({ items }) =>
							items.map((item) => (
								<item.NativeField
									key={item.key}
									name='label'
								>
									{(field) => (
										<input
											aria-label={`native ${field.name}`}
											value={field.state.value}
											onChange={(event) => {
												field.handleChange(event.target.value)
											}}
										/>
									)}
								</item.NativeField>
							))
						}
					</form.Array>
					<form.Subscribe selector={(state) => state.values.tags[0]?.label}>
						{(label) => <output>{label}</output>}
					</form.Subscribe>
				</Form>
			)
		}
		render(<EntryCase />)

		await user.type(screen.getByLabelText('native tags[0].label'), 'q')
		expect(screen.getByRole('status')).toHaveTextContent('q')
	})

	it("keeps TanStack's type", () => {
		function Probe(): ReactNode {
			const _form = useForm({ defaultValues: DEFAULTS })
			expectTypeOf<Parameters<Parameters<typeof _form.NativeField>[0]['children']>[0]>().toHaveProperty('state')
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})
})
