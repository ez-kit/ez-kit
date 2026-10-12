import { describe, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { defineFieldType } from './field-registry'
import { testComponents, testFields } from './test-kit'

import type { FormComponents } from './contract'
import type { FormInstance } from './index'
import type { AnyFormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

type Values = { email: string; age: number }
const DEFAULTS: Values = { email: '', age: 0 }

const { useForm, withForm, withFieldGroup, SchemaForm } = createForm({
	components: testComponents,
	fields: testFields,
})

/** Never read at runtime: every case below is a type assertion inside a function nothing calls. */
declare const valuesSchema: AnyFormSchema<Values>
declare const subsetSchema: AnyFormSchema<{ email: string }>

/**
 * `FormInstance` is the one name an app writes for "a form of this shape" — a prop of a component
 * that receives one, say. TanStack's `FormApi` is invariant in its twelve validator parameters, so
 * an alias that defaults them to `undefined | FormValidateOrFn<…>` rejects every instance that has
 * validators. These tests are the reason the defaults are `any`.
 */
describe('FormInstance', () => {
	it('accepts an instance with no validators', () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			expectTypeOf(form).toExtend<FormInstance<Values>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('accepts an instance with sync and async validators', () => {
		function Probe(): ReactNode {
			const form = useForm({
				defaultValues: DEFAULTS,
				validators: {
					onChange: ({ value }) => (value.email === '' ? 'Required' : undefined),
					onSubmitAsync: () => Promise.resolve(undefined),
				},
			})
			expectTypeOf(form).toExtend<FormInstance<Values>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('keeps values and field names typed', () => {
		function Consumer({ form }: { form: FormInstance<Values> }): ReactNode {
			expectTypeOf(form.state.values).toEqualTypeOf<Values>()
			return (
				<>
					<form.TextField name='email' />
					{/* @ts-expect-error — not a path of Values */}
					<form.TextField name='nope' />
				</>
			)
		}
		expectTypeOf(Consumer).toBeFunction()
	})

	it('rejects an instance over different values', () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: { other: '' } })
			expectTypeOf(form).not.toExtend<FormInstance<Values>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('accepts an instance from a factory built with its own components', () => {
		const components: FormComponents = { ...testComponents, Button: () => null }
		const custom = createForm({ components, fields: testFields })

		function Probe(): ReactNode {
			const form = custom.useForm({ defaultValues: DEFAULTS })
			expectTypeOf(form).toExtend<FormInstance<Values>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})
})

/**
 * What the open slots cost. Every member typed from a validator parameter or the submit meta is
 * `any` on a `FormInstance`, so these pins fail the day that changes — in either direction.
 */
describe('FormInstance — erased members', () => {
	it('types errors, the submit meta and the validator options as any', () => {
		function Consumer({ form }: { form: FormInstance<Values> }): ReactNode {
			expectTypeOf(form.state.errors).items.toBeAny()
			expectTypeOf(form.getAllErrors().form.errors).items.toBeAny()
			expectTypeOf(form.options.onSubmitMeta).toBeAny()
			expectTypeOf<Parameters<typeof form.handleSubmit>[0]>().toBeAny()
			return null
		}
		expectTypeOf(Consumer).toBeFunction()
	})

	/**
	 * The reverse direction: `any` is assignable both ways, so a `FormInstance` is accepted where a
	 * block declared specific validators — and that block's typed errors are then a promise the
	 * instance never made.
	 */
	it('is accepted by a block that declares its own validators', () => {
		const Strict = withForm({
			defaultValues: DEFAULTS,
			validators: { onChange: ({ value }) => (value.email === '' ? 'Required' : undefined) },
			render: () => null,
		})

		function Parent({ form }: { form: FormInstance<Values> }): ReactNode {
			return <Strict form={form} />
		}
		expectTypeOf(Parent).toBeFunction()
	})
})

describe('FormInstance — where the kit takes a form', () => {
	it('is the parent form of a field group', () => {
		type Checkout = { email: string; address: { city: string } }

		const AddressGroup = withFieldGroup({
			defaultValues: { city: '' },
			render: () => null,
		})

		function Parent({ form }: { form: FormInstance<Checkout> }): ReactNode {
			return (
				<AddressGroup
					form={form}
					fields='address'
				/>
			)
		}
		expectTypeOf(Parent).toBeFunction()
	})

	/**
	 * The controlled `SchemaForm` takes a `FormInstance`. It took a structural slice before
	 * (`handleSubmit` plus the field components); every case here was checked against that type
	 * too and gives the same answer, so the change rejects only objects `useForm` did not build.
	 */
	it('is what a controlled SchemaForm takes, validators and all', () => {
		function Probe(): ReactNode {
			const form = useForm({
				defaultValues: DEFAULTS,
				validators: {
					onChange: ({ value }) => (value.email === '' ? 'Required' : undefined),
					onSubmitAsync: () => Promise.resolve(undefined),
				},
			})
			return (
				<SchemaForm
					form={form}
					schema={valuesSchema}
				/>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it("carries the factory's own fields into its controlled SchemaForm", () => {
		const NoteField = defineFieldType<{ hint: string }, string>()(function Note(): ReactNode {
			return null
		})
		const extended = createForm({ components: testComponents, fields: { ...testFields, NoteField } })

		function Probe(): ReactNode {
			const form = extended.useForm({ defaultValues: DEFAULTS })
			expectTypeOf(form.NoteField).toBeFunction()
			return (
				<extended.SchemaForm
					form={form}
					schema={valuesSchema}
				/>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('rejects a schema over a subset of the form values, as the structural type did', () => {
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: DEFAULTS })
			return (
				// @ts-expect-error — the schema's values must be the form's values
				<SchemaForm
					form={form}
					schema={subsetSchema}
				/>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})
})
