import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { useFieldGroup } from './field-groups'
import { useFormGroup } from './form-group'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { NoRegistry } from './contract'
import type { FormInstance } from './form-instance'
import type { ReactNode } from 'react'

type Values = {
	email: string
	address: { city: string }
	billingCity: string
	tags: { label: string }[]
}
const DEFAULTS: Values = { email: '', address: { city: '' }, billingCity: '', tags: [{ label: '' }] }

const { Form, useForm, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

function NativeInput({
	field,
}: {
	field: { name: string; state: { value: string }; handleChange: (value: string) => void }
}): ReactNode {
	return (
		<input
			aria-label={field.name}
			value={field.state.value}
			onChange={(event) => {
				field.handleChange(event.target.value)
			}}
		/>
	)
}

function ValuesOutput({ form }: { form: FormInstance<Values, NoRegistry, NoRegistry> }): ReactNode {
	return (
		<form.Subscribe selector={(state) => JSON.stringify(state.values)}>
			{(json) => <output>{json}</output>}
		</form.Subscribe>
	)
}

const CityGroup = withFieldGroup({
	defaultValues: { city: '' },
	render: ({ group }) => <group.NativeField name='city'>{(field) => <NativeInput field={field} />}</group.NativeField>,
})

function WithFieldGroupCase({ mapped }: { mapped: boolean }): ReactNode {
	const form = useForm({ defaultValues: DEFAULTS })
	return (
		<Form form={form}>
			{mapped ? (
				<CityGroup
					form={form}
					fields={{ city: 'billingCity' }}
				/>
			) : (
				<CityGroup
					form={form}
					fields='address'
				/>
			)}
			<ValuesOutput form={form} />
		</Form>
	)
}

describe('withFieldGroup — NativeField', () => {
	it('writes a name relative to a path branch', async () => {
		const user = userEvent.setup()
		render(<WithFieldGroupCase mapped={false} />)

		await user.type(screen.getByLabelText('address.city'), 'x')
		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":"x"}')
	})

	it('writes the path a fields map names', async () => {
		const user = userEvent.setup()
		render(<WithFieldGroupCase mapped />)

		await user.type(screen.getByLabelText('billingCity'), 'x')
		expect(screen.getByRole('status')).toHaveTextContent('"billingCity":"x"')
		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":""}')
	})
})

describe('form.FormGroup — NativeField', () => {
	it('writes a name relative to the group', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					<form.FormGroup name='address'>
						{(group) => <group.NativeField name='city'>{(field) => <NativeInput field={field} />}</group.NativeField>}
					</form.FormGroup>
					<ValuesOutput form={form} />
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('address.city'), 'x')
		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":"x"}')
	})

	it('joins an indexed name onto an array branch', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					<form.FormGroup name='tags'>
						{(group) => (
							<group.NativeField name='[0].label'>{(field) => <NativeInput field={field} />}</group.NativeField>
						)}
					</form.FormGroup>
					<ValuesOutput form={form} />
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('tags[0].label'), 'x')
		expect(screen.getByRole('status')).toHaveTextContent('"tags":[{"label":"x"}]')
	})

	it("runs the group's validators and submits the group's value", async () => {
		const user = userEvent.setup()
		const onGroupSubmit = vi.fn()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<Form form={form}>
					<form.FormGroup
						name='address'
						validators={{ onChange: ({ value }) => (value.city === '' ? 'City required' : undefined) }}
						onGroupSubmit={onGroupSubmit}
					>
						{(group) => (
							<>
								<group.NativeField name='city'>{(field) => <NativeInput field={field} />}</group.NativeField>
								<button
									type='button'
									onClick={() => {
										void group.handleSubmit()
									}}
								>
									Submit group
								</button>
							</>
						)}
					</form.FormGroup>
				</Form>
			)
		}
		render(<Case />)

		await user.click(screen.getByRole('button', { name: 'Submit group' }))
		expect(onGroupSubmit).not.toHaveBeenCalled()

		await user.type(screen.getByLabelText('address.city'), 'x')
		await user.click(screen.getByRole('button', { name: 'Submit group' }))
		expect(onGroupSubmit).toHaveBeenCalledWith(expect.objectContaining({ value: { city: 'x' } }))
		expect(onGroupSubmit).toHaveBeenCalledTimes(1)
	})
})

describe('group hooks — NativeField', () => {
	it('useFieldGroup returns one group across renders, whose NativeField writes the branch', async () => {
		const user = userEvent.setup()
		const groups: unknown[] = []
		function Address({ form }: { form: ReturnType<typeof useCaseForm> }): ReactNode {
			const group = useFieldGroup({ form, fields: 'address', defaultValues: { city: '' } })
			groups.push(group)
			return <group.NativeField name='city'>{(field) => <NativeInput field={field} />}</group.NativeField>
		}
		function useCaseForm() {
			return useForm({ defaultValues: DEFAULTS })
		}
		function Case(): ReactNode {
			const form = useCaseForm()
			const [, setTick] = useState(0)
			return (
				<Form form={form}>
					<Address form={form} />
					<button
						type='button'
						onClick={() => {
							setTick((tick) => tick + 1)
						}}
					>
						Rerender
					</button>
					<ValuesOutput form={form} />
				</Form>
			)
		}
		render(<Case />)

		await user.click(screen.getByRole('button', { name: 'Rerender' }))
		await user.type(screen.getByLabelText('address.city'), 'x')
		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":"x"}')
		expect(groups.length).toBeGreaterThan(1)
		expect(groups[0]).toBe(groups.at(-1))
	})

	it('useFormGroup returns a group whose NativeField is relative to its name', async () => {
		const user = userEvent.setup()
		function Address({ form }: { form: ReturnType<typeof useCaseForm> }): ReactNode {
			const group = useFormGroup({ form, name: 'address' })
			return <group.NativeField name='city'>{(field) => <NativeInput field={field} />}</group.NativeField>
		}
		function useCaseForm() {
			return useForm({ defaultValues: DEFAULTS })
		}
		function Case(): ReactNode {
			const form = useCaseForm()
			return (
				<Form form={form}>
					<Address form={form} />
					<ValuesOutput form={form} />
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('address.city'), 'x')
		expect(screen.getByRole('status')).toHaveTextContent('"address":{"city":"x"}')
	})
})

describe('group APIs — types', () => {
	it('take a form whose values hold an array, and reject a branch of another shape', () => {
		const Address = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => (
				<group.NativeField name='city'>{(field) => <NativeInput field={field} />}</group.NativeField>
			),
		})

		function Parent(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			const group = useFieldGroup({ form, fields: 'address', defaultValues: { city: '' } })
			const branch = useFormGroup({ form, name: 'address' })
			expectTypeOf(group.state.values).toEqualTypeOf<{ city: string }>()
			expectTypeOf(branch.state.value).toEqualTypeOf<{ city: string }>()
			return (
				<>
					<Address
						form={form}
						fields='address'
					/>
					<Address
						form={form}
						// @ts-expect-error -- `email` is not a `{ city: string }` branch
						fields='email'
					/>
					<form.FormGroup name='address'>
						{(formGroup) => (
							<formGroup.NativeField
								// @ts-expect-error -- names are relative to the group
								name='address.city'
							>
								{() => null}
							</formGroup.NativeField>
						)}
					</form.FormGroup>
				</>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})
})

type Pair = { first: string; second: string }
type ListenValues = { shipping: Pair; rows: Pair[] }
const LISTEN_DEFAULTS: ListenValues = { shipping: { first: '', second: '' }, rows: [{ first: '', second: '' }] }
const CONFLICT = 'Conflicts with second'

/** `first`'s validator: an error while the sibling `second` under the same prefix reads `bad`. */
function conflictsWithSecond(prefix: string) {
	return ({ fieldApi }: { fieldApi: { form: { state: { values: unknown } } } }): string | undefined => {
		const values = fieldApi.form.state.values as ListenValues
		const second = prefix === 'shipping' ? values.shipping.second : values.rows[0]?.second
		return second === 'bad' ? CONFLICT : undefined
	}
}

function ErrorInput({
	field,
}: {
	field: {
		name: string
		state: { value: string; meta: { errors: unknown[] } }
		handleChange: (value: string) => void
	}
}): ReactNode {
	return (
		<>
			<NativeInput field={field} />
			<span>{field.state.meta.errors.join(', ')}</span>
		</>
	)
}

describe('NativeField — listen-to names are relative too', () => {
	it('re-validates a form-group field when the sibling it listens to changes', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: LISTEN_DEFAULTS })
			return (
				<Form form={form}>
					<form.FormGroup name='shipping'>
						{(group) => (
							<>
								<group.NativeField
									name='first'
									validators={{ onChangeListenTo: ['second'], onChange: conflictsWithSecond('shipping') }}
								>
									{(field) => <ErrorInput field={field} />}
								</group.NativeField>
								<group.NativeField name='second'>{(field) => <NativeInput field={field} />}</group.NativeField>
							</>
						)}
					</form.FormGroup>
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('shipping.second'), 'bad')
		expect(screen.getByText(CONFLICT)).toBeInTheDocument()
	})

	it('re-validates an array-entry field when the sibling it listens to changes', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const form = useForm({ defaultValues: LISTEN_DEFAULTS })
			return (
				<Form form={form}>
					<form.Array
						name='rows'
						newItem={{ first: '', second: '' }}
					>
						{({ items }) =>
							items.map((item) => (
								<div key={item.key}>
									<item.NativeField
										name='first'
										validators={{ onChangeListenTo: ['second'], onChange: conflictsWithSecond('rows') }}
									>
										{(field) => <ErrorInput field={field} />}
									</item.NativeField>
									<item.NativeField name='second'>{(field) => <NativeInput field={field} />}</item.NativeField>
								</div>
							))
						}
					</form.Array>
				</Form>
			)
		}
		render(<Case />)

		await user.type(screen.getByLabelText('rows[0].second'), 'bad')
		expect(screen.getByText(CONFLICT)).toBeInTheDocument()
	})

	it('types the render prop field as the root form one: an absolute, string name', () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: LISTEN_DEFAULTS })
			return (
				<>
					<form.FormGroup name='shipping'>
						{(group) => (
							<group.NativeField name='first'>
								{(field) => {
									expectTypeOf(field.name).toEqualTypeOf<string>()
									expectTypeOf(field.state.value).toEqualTypeOf<string>()
									return null
								}}
							</group.NativeField>
						)}
					</form.FormGroup>
					<form.Array
						name='rows'
						newItem={{ first: '', second: '' }}
					>
						{({ items }) =>
							items.map((item) => (
								<item.NativeField
									key={item.key}
									name='first'
								>
									{(field) => {
										expectTypeOf(field.name).toEqualTypeOf<string>()
										expectTypeOf(field.state.value).toEqualTypeOf<string>()
										return null
									}}
								</item.NativeField>
							))
						}
					</form.Array>
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})
})
