import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormFieldSlots, SelectFieldRenderProps, TextFieldRenderProps } from './contract'
import type { FieldControlProps } from './field-props'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'

type Values = { email: string; seats: number; address: { city: string }; tags: { label: string }[] }
const DEFAULTS: Values = { email: '', seats: 1, address: { city: '' }, tags: [] }

const { useForm, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type ChildOf<T> = T extends { children: (field: infer TField) => unknown } ? TField : never

describe('form.Field — types', () => {
	it("hands the control's props, not a FieldApi — a TanStack example does not compile", () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			type FieldChild = ChildOf<Parameters<typeof form.Field>[0]>
			expectTypeOf<FieldChild>().toHaveProperty('value')
			expectTypeOf<FieldChild>().toHaveProperty('onChange')
			expectTypeOf<FieldChild>().not.toHaveProperty('state')
			expectTypeOf<ChildOf<Parameters<typeof form.NativeField>[0]>>().toHaveProperty('state')
			return (
				<>
					<form.Field
						name='seats'
						validate={{ min: 1 }}
					>
						{(field) => {
							expectTypeOf(field).toEqualTypeOf<FieldControlProps<number>>()
							return null
						}}
					</form.Field>
					<form.Field
						// @ts-expect-error -- not a path of Values
						name='nope'
					>
						{() => null}
					</form.Field>
					<form.Field
						name='email'
						// @ts-expect-error -- form.Field takes validate, not TanStack's validators
						validators={{ onChange: () => undefined }}
					>
						{() => null}
					</form.Field>
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('types group and entry fields relative to their branch', () => {
		const Address = withFieldGroup({
			defaultValues: { city: '' },
			render: ({ group }) => (
				<>
					<group.Field name='city'>{({ value }) => value}</group.Field>
					<group.Field
						// @ts-expect-error -- names are relative to the group
						name='address.city'
					>
						{() => null}
					</group.Field>
				</>
			),
		})
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				<>
					<Address
						form={form}
						fields='address'
					/>
					<form.FormGroup name='address'>
						{(group) => <group.Field name='city'>{({ value }) => value}</group.Field>}
					</form.FormGroup>
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
									{({ value }) => value}
								</item.Field>
							))
						}
					</form.Array>
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})
})

/** A text field taking every native `<input>` attribute the contract does not already compute. */
const InputTextField = (
	_props: TextFieldRenderProps & Omit<ComponentPropsWithoutRef<'input'>, keyof TextFieldRenderProps>,
): ReactNode => null
/** A text field with one prop of its own, the shape a design-system kit's `variant` has. */
const VariantTextField = (_props: TextFieldRenderProps & { variant?: 'flat' | 'bordered' }): ReactNode => null
const VariantSelectField = (_props: SelectFieldRenderProps & { variant?: 'flat' | 'bordered' }): ReactNode => null

const inputKit = createForm({ fields: { ...testFields, TextField: InputTextField } })
const variantKit = createForm({
	fields: { ...testFields, TextField: VariantTextField, SelectField: VariantSelectField },
})

describe('built-in fields — props beyond the binding come from the kit component', () => {
	it('accepts a native attribute when the registered component accepts it', () => {
		function Probe(): ReactNode {
			const form = inputKit.useForm({ defaultValues: DEFAULTS })
			return (
				<form.TextField
					name='email'
					autoComplete='email'
					inputMode='email'
					maxLength={80}
				/>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('accepts a kit-only prop only where the kit declared it, and only its own values', () => {
		function Probe(): ReactNode {
			const withVariant = variantKit.useForm({ defaultValues: DEFAULTS })
			const withInput = inputKit.useForm({ defaultValues: DEFAULTS })
			return (
				<>
					<withVariant.TextField
						name='email'
						variant='bordered'
					/>
					<withVariant.TextField
						name='email'
						// @ts-expect-error -- not one of the kit's own variants
						variant='outlined'
					/>
					<withInput.TextField
						name='email'
						// @ts-expect-error -- this kit's TextField does not declare `variant`
						variant='bordered'
					/>
					<withVariant.TextField
						name='email'
						// @ts-expect-error -- this kit's TextField takes no native attributes
						autoComplete='email'
					/>
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('keeps the computed props out of reach, even of a kit that accepts them natively', () => {
		function Probe(): ReactNode {
			const form = inputKit.useForm({ defaultValues: DEFAULTS })
			return (
				<>
					<form.TextField
						name='email'
						// @ts-expect-error -- `onChange` is the binding's
						onChange={() => undefined}
					/>
					<form.TextField
						name='email'
						// @ts-expect-error -- `value` is the binding's
						value='x'
					/>
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('keeps `name` correlated with `options` on the select union, beside the kit props', () => {
		function Probe(): ReactNode {
			const form = variantKit.useForm({ defaultValues: DEFAULTS })
			return (
				<>
					<form.SelectField
						name='seats'
						options={[{ label: 'One', value: 1 }]}
						variant='flat'
					/>
					{/* @ts-expect-error -- `seats` is a number, the options are strings */}
					<form.SelectField
						name='seats'
						options={[{ label: 'One', value: 'one' }]}
						variant='flat'
					/>
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})
})

describe('built-in fields — props beyond the contract must be optional', () => {
	it('rejects a component that requires a prop the contract does not supply', () => {
		const IconTextField = (_props: TextFieldRenderProps & { icon: string }): ReactNode => null
		// @ts-expect-error -- a required `icon` would have to come from every call site and from the schema renderer
		const fields = { TextField: IconTextField } satisfies FormFieldSlots
		expectTypeOf(fields).not.toBeNever()
	})
})
