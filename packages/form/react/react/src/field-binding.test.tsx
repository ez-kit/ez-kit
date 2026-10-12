import { FormFieldType } from '@ez-kit/form-core'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { createSchemaForm } from './create-schema-form'
import { defineFieldType } from './field-registry'
import { testComponents, testFields, testFormElement } from './test-kit'

import type * as FieldBindingModule from './field-binding'
import type { FormSchema } from '@ez-kit/form-core'
import type { ReactNode } from 'react'

const bound = vi.hoisted(() => [] as string[])

vi.mock('./field-binding', async (importOriginal) => {
	const actual = await importOriginal<typeof FieldBindingModule>()
	return {
		...actual,
		createFieldBinding: (NativeField: Parameters<typeof actual.createFieldBinding>[0]) => {
			const Seam = actual.createFieldBinding(NativeField)
			return function RecordingSeam(props: Parameters<typeof Seam>[0]): ReactNode {
				bound.push(props.name)
				return <Seam {...props} />
			}
		},
	}
})

type Values = { email: string; score: number; seats: number; tags: { label: string }[] }
const DEFAULTS: Values = { email: '', score: 0, seats: 1, tags: [{ label: '' }] }

const RatingField = defineFieldType<Record<never, never>, number>()(function Rating(): ReactNode {
	return null
})

describe('the binding seam', () => {
	it('binds every bound field kind and leaves NativeField alone', () => {
		bound.length = 0
		const { Form } = createForm({
			FormElement: testFormElement,
			fields: { ...testFields, RatingField },
			components: testComponents,
		})
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.TextField name='email' />
						<form.RatingField name='score' />
						<form.NativeField name='seats'>{() => null}</form.NativeField>
						<form.ArrayField
							name='tags'
							newItem={{ label: '' }}
						>
							{({ items }) =>
								items.map((item) => (
									<item.TextField
										key={item.key}
										name='label'
									/>
								))
							}
						</form.ArrayField>
					</>
				)}
			</Form>,
		)

		expect(bound).toEqual(expect.arrayContaining(['email', 'score', 'tags', 'tags[0].label']))
		expect(bound).not.toContain('seats')
	})

	it('binds a schema document field', () => {
		bound.length = 0
		const { SchemaForm } = createSchemaForm({ FormElement: testFormElement, fields: testFields })
		const schema: FormSchema<{ name: string }> = { version: 1, children: [{ type: FormFieldType.Text, name: 'name' }] }
		render(
			<SchemaForm
				schema={schema}
				defaultValues={{ name: '' }}
				onSubmit={() => {}}
			/>,
		)
		expect(bound).toContain('name')
	})

	it('leaves NativeField outside the seam under StrictMode and after a formId change', async () => {
		bound.length = 0
		const user = userEvent.setup()
		const { Form, useForm } = createForm({ FormElement: testFormElement, fields: testFields })
		function Probe(): ReactNode {
			const [formId, setFormId] = useState('first')
			const form = useForm({ defaultValues: DEFAULTS, formId })
			return (
				<>
					<button
						type='button'
						onClick={() => {
							setFormId('second')
						}}
					>
						Switch
					</button>
					<Form form={form}>
						<form.NativeField name='seats'>{() => null}</form.NativeField>
						<form.TextField name='email' />
					</Form>
				</>
			)
		}
		render(
			<StrictMode>
				<Probe />
			</StrictMode>,
		)
		await user.click(screen.getByRole('button', { name: 'Switch' }))

		expect(bound).toContain('email')
		expect(bound).not.toContain('seats')
	})

	it('forwards every prop it is handed to TanStack', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		const { Form } = createForm({ FormElement: testFormElement, fields: testFields })
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<form.AppField
						name='email'
						listeners={{ onChange }}
					>
						{(field) => (
							<input
								aria-label='app email'
								value={field.state.value}
								onChange={(event) => {
									field.handleChange(event.target.value)
								}}
							/>
						)}
					</form.AppField>
				)}
			</Form>,
		)

		await user.type(screen.getByLabelText('app email'), 'x')
		expect(onChange).toHaveBeenCalledTimes(1)
		expect(onChange.mock.calls[0]?.[0]).toHaveProperty('value', 'x')
	})

	it('keeps NativeField and AppField identities across a parent re-render', () => {
		const { useForm } = createForm({ FormElement: testFormElement, fields: testFields })
		const seen: { NativeField: unknown; AppField: unknown }[] = []
		let toggle: () => void = () => {}

		function Probe(): ReactNode {
			const [flag, setFlag] = useState(false)
			toggle = () => {
				setFlag((value) => !value)
			}
			const form = useForm({ defaultValues: DEFAULTS })
			seen.push({ NativeField: form.NativeField, AppField: form.AppField })
			return <output>{String(flag)}</output>
		}

		render(<Probe />)
		act(() => {
			toggle()
		})

		expect(screen.getByRole('status')).toHaveTextContent('true')
		const first = seen[0]
		const last = seen.at(-1)
		expect(seen.length).toBeGreaterThan(1)
		expect(first?.NativeField).toBeDefined()
		expect(last?.NativeField).toBe(first?.NativeField)
		expect(last?.AppField).toBe(first?.AppField)
	})
})
