import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { defineFieldType } from './field-registry'
import { useFormContext } from './form-context'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { CustomFieldRenderProps, FormComponents, FormFieldSlots, FormInstance, NoRegistry } from './index'
import type { ReactNode } from 'react'

describe('createForm options', () => {
	it('works with no options at all: a bare <form> and only the built-in primitives', () => {
		const { Form } = createForm()
		const { container } = render(
			<Form defaultValues={{ a: 1 }}>
				{(form) => <form.Submit>{({ canSubmit }) => <output>{String(canSubmit)}</output>}</form.Submit>}
			</Form>,
		)
		expect(container.querySelector('form')).not.toBeNull()
		expect(screen.getByText('true')).toBeInTheDocument()
	})

	it('renders the kit FormElement when passed', () => {
		const { Form } = createForm({ FormElement: testFormElement })
		const { container } = render(<Form defaultValues={{}}>{() => null}</Form>)
		expect(container.querySelector('[data-testkit="form"]')).not.toBeNull()
	})

	it('puts exactly the passed fields on the instance', () => {
		const { useForm } = createForm({ fields: { TextField: testFields.TextField } })
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: { name: '' } })
			expectTypeOf(form).toHaveProperty('TextField')
			// @ts-expect-error — not registered
			void form.NumberField
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('puts each passed component on the instance as-is, typed by its own props', () => {
		function SaveBar({ label }: { label: string }): ReactNode {
			const form = useFormContext()
			return <form.Submit>{({ canSubmit }) => <button disabled={!canSubmit}>{label}</button>}</form.Submit>
		}
		const { Form } = createForm({ components: { SaveBar } })
		render(<Form defaultValues={{}}>{(form) => <form.SaveBar label='Save' />}</Form>)
		expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
		// @ts-expect-error — SaveBar requires label
		;<Form defaultValues={{}}>{(form) => <form.SaveBar />}</Form>
	})

	it('has form.SubmitButton only when a SubmitButton component was passed', () => {
		const withButton = createForm({ components: { SubmitButton: testComponents.SubmitButton } })
		const without = createForm({ fields: { TextField: testFields.TextField } })
		function Probe(): ReactNode {
			const a = withButton.useForm({ defaultValues: {} })
			const b = without.useForm({ defaultValues: {} })
			expectTypeOf(a).toHaveProperty('SubmitButton')
			// @ts-expect-error — no SubmitButton registered
			void b.SubmitButton
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('re-asserts the contract on known keys', () => {
		// @ts-expect-error — a TextField that cannot take TextFieldRenderProps
		createForm({ fields: { TextField: (_: { totallyUnrelated: symbol }) => null } })
		// @ts-expect-error — a Section that cannot take SectionProps
		createForm({ components: { Section: (_: { nope: number }) => null } })
	})

	it('accepts an all-in kit instance as FormInstance<V> and a subset one as FormInstance<V, Fields, Components>', () => {
		const all = createForm({ fields: testFields, components: testComponents })
		const subset = createForm({ fields: { TextField: testFields.TextField } })
		function Probe(): ReactNode {
			const a = all.useForm({ defaultValues: { name: '' } })
			const b = subset.useForm({ defaultValues: { name: '' } })
			expectTypeOf(a).toExtend<FormInstance<{ name: string }>>()
			expectTypeOf(b).toExtend<FormInstance<{ name: string }, { TextField: typeof testFields.TextField }, NoRegistry>>()
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('runs a headless form.Array without a registered ArrayField, rendering item.Item as its children', () => {
		const { Form } = createForm({ fields: { TextField: testFields.TextField } })
		const { container } = render(
			<Form defaultValues={{ people: [{ name: 'Ada' }] }}>
				{(form) => (
					<form.Array
						name='people'
						newItem={{ name: '' }}
					>
						{({ items }) =>
							items.map((item) => (
								<item.Item key={item.key}>
									<item.TextField
										name='name'
										label={`Name ${String(item.index)}`}
									/>
								</item.Item>
							))
						}
					</form.Array>
				)}
			</Form>,
		)
		expect(screen.getByLabelText('Name 0')).toHaveValue('Ada')
		expect(container.querySelector('[data-field="people[0].name"]')).not.toBeNull()
		expect(container.querySelector('[data-testkit^="array"]')).toBeNull()
	})

	it('needs a provider above an attached component: a caller-owned instance under a plain <form> throws', () => {
		const { useForm } = createForm({ components: testComponents })
		function Bare(): ReactNode {
			const form = useForm({ defaultValues: {} })
			return (
				<form>
					<form.SubmitButton>Save</form.SubmitButton>
				</form>
			)
		}
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		try {
			expect(() => render(<Bare />)).toThrow(
				'useFormContext() must be called inside <Form>, <SchemaForm> or <FormProvider>',
			)
		} finally {
			error.mockRestore()
		}
	})
})

describe('createForm options — what the instance carries', () => {
	it('keeps an optional key optional: a set typed FormFieldSlots may lack any member', () => {
		const fields: FormFieldSlots = { TextField: testFields.TextField }
		const { useForm } = createForm({ fields })
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: { name: '', age: 0 } })
			return (
				<>
					{/* @ts-expect-error — possibly undefined until narrowed */}
					<form.TextField name='name' />
					{/* @ts-expect-error — possibly undefined until narrowed */}
					<form.NumberField name='age' />
					{form.TextField && <form.TextField name='name' />}
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('gives required members for a satisfies-checked or a literal set', () => {
		const checked = { TextField: testFields.TextField } satisfies FormFieldSlots
		const fromChecked = createForm({ fields: checked })
		const fromLiteral = createForm({ fields: { TextField: testFields.TextField } })
		function Probe(): ReactNode {
			const a = fromChecked.useForm({ defaultValues: { name: '' } })
			const b = fromLiteral.useForm({ defaultValues: { name: '' } })
			return (
				<>
					<a.TextField name='name' />
					<b.TextField name='name' />
				</>
			)
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('infers the registries from each option alone, both, an override and an annotated value', () => {
		const annotated: FormComponents = { Section: testComponents.Section }
		const fieldsOnly = createForm({ fields: { TextField: testFields.TextField } })
		const componentsOnly = createForm({ components: { SubmitButton: testComponents.SubmitButton } })
		const both = createForm({ fields: testFields, components: testComponents })
		const override = createForm({ fields: { ...testFields, TextField: testFields.TextField } })
		const fromAnnotated = createForm({ components: annotated })
		const bare = createForm()
		function Probe(): ReactNode {
			const v = { defaultValues: { name: '' } }
			expectTypeOf(fieldsOnly.useForm(v)).toHaveProperty('TextField')
			expectTypeOf(componentsOnly.useForm(v)).toHaveProperty('SubmitButton')
			expectTypeOf(both.useForm(v)).toHaveProperty('DateRangeField')
			expectTypeOf(both.useForm(v)).toHaveProperty('Wizard')
			expectTypeOf(override.useForm(v)).toHaveProperty('ArrayField')
			expectTypeOf(fromAnnotated.useForm(v)).toHaveProperty('Section')
			expectTypeOf(bare.useForm(v)).toHaveProperty('Submit')
			// @ts-expect-error — nothing registered
			void bare.useForm(v).TextField
			return null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('keeps a conditionally spread custom field optional rather than demanding it', () => {
		const RatingField = defineFieldType<{ max: number }, number>()(() => null)
		const flag = Math.random() > 0.5
		const { useForm } = createForm({ fields: { ...testFields, ...(flag ? { RatingField } : {}) } })
		const annotated: typeof testFields & { RatingField?: typeof RatingField } = testFields
		createForm({ fields: annotated })
		function Probe(): ReactNode {
			const form = useForm({ defaultValues: { score: 0 } })
			return form.RatingField ? (
				<form.RatingField
					name='score'
					max={5}
				/>
			) : null
		}
		expectTypeOf(Probe).toBeFunction()
	})

	it('rejects a bare custom field that types its value without defineFieldType', () => {
		createForm({
			fields: {
				// @ts-expect-error — the generic binder can only promise `unknown` without the phantom
				ScoreField: (_: CustomFieldRenderProps<number>) => null,
			},
		})
	})

	it('rejects a misspelt built-in key, which would reach the generic binder with the wrong props', () => {
		createForm({
			fields: {
				...testFields,
				// @ts-expect-error — a text field's props are not what a custom field receives
				TextFeild: testFields.TextField,
			},
		})
	})

	it('re-asserts a built-in key overridden over an annotated set', () => {
		const annotatedFields: FormFieldSlots = testFields
		const annotatedComponents: FormComponents = testComponents
		createForm({
			fields: {
				...annotatedFields,
				// @ts-expect-error — not a TextField
				TextField: (_: { totallyUnrelated: symbol }) => null,
			},
		})
		createForm({
			components: {
				...annotatedComponents,
				// @ts-expect-error — not a Section
				Section: (_: { nope: number }) => null,
			},
		})
	})
})
