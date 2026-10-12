import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FieldControlProps } from './field-props'
import type { ReactNode } from 'react'

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
