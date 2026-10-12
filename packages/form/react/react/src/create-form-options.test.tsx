import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { createForm } from './create-form'
import { useFormContext } from './form-context'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FormInstance } from './index'
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
			expectTypeOf(b).toExtend<FormInstance<{ name: string }, { TextField: typeof testFields.TextField }>>()
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
})
