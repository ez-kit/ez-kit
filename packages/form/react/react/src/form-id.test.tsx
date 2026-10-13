import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { FieldControlProps } from './field-props'
import type { ReactNode } from 'react'

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Values = {
	text: string
	count: number
	notes: string
	pick: string
	agree: boolean
	notify: boolean
	size: string
	volume: number
	born: string
	tags: string[]
	extras: string[]
	stay: { start: string; end: string }
	people: { firstName: string }[]
	address: { city: string }
	custom: string
}

const DEFAULTS: Values = {
	text: '',
	count: 0,
	notes: '',
	pick: '',
	agree: false,
	notify: false,
	size: '',
	volume: 0,
	born: '',
	tags: [],
	extras: [],
	stay: { start: '', end: '' },
	people: [{ firstName: '' }],
	address: { city: '' },
	custom: '',
}

const OPTIONS = [
	{ label: 'One', value: 'one' },
	{ label: 'Two', value: 'two' },
]

/** The forms on the page: the one under test, and a second whose field shares a name with it. */
const FORM_COUNT = 2

/** An author control that keeps what it does not render, the way a custom kit spreads its root. */
function SpreadingInput({
	value,
	onChange,
	label: _label,
	description: _description,
	errors: _errors,
	invalid: _invalid,
	...rest
}: FieldControlProps<string>): ReactNode {
	return (
		<input
			{...rest}
			value={value}
			onChange={(event) => {
				onChange(event.target.value)
			}}
		/>
	)
}

const City = withFieldGroup({
	defaultValues: { city: '' },
	render: ({ group }) => <group.Field name='city'>{(field) => <SpreadingInput {...field} />}</group.Field>,
})

function wrappers(): Element[] {
	return [...document.querySelectorAll('[data-field]')]
}

describe('data-form-id', () => {
	it('stamps every [data-field] wrapper with its own form id', () => {
		const handed: FieldControlProps<string>[] = []
		const ids: string[] = []
		render(
			<>
				<Form defaultValues={DEFAULTS}>
					{(form) => {
						ids.push(form.formId)
						return (
							<>
								<form.TextField
									name='text'
									label='Text'
								/>
								<form.NumberField
									name='count'
									label='Count'
								/>
								<form.TextareaField
									name='notes'
									label='Notes'
								/>
								<form.SelectField
									name='pick'
									label='Pick'
									options={OPTIONS}
								/>
								<form.CheckboxField
									name='agree'
									label='Agree'
								/>
								<form.SwitchField
									name='notify'
									label='Notify'
								/>
								<form.RadioGroupField
									name='size'
									label='Size'
									options={OPTIONS}
								/>
								<form.SliderField
									name='volume'
									label='Volume'
								/>
								<form.DateField
									name='born'
									label='Born'
								/>
								<form.MultiSelectField
									name='tags'
									label='Tags'
									options={OPTIONS}
								/>
								<form.CheckboxGroupField
									name='extras'
									label='Extras'
									options={OPTIONS}
								/>
								<form.DateRangeField
									name='stay'
									label='Stay'
								/>
								<form.ArrayField
									name='people'
									label='People'
									newItem={{ firstName: '' }}
								>
									{({ items }) =>
										items.map((item) => (
											<item.Item key={item.key}>
												<item.TextField
													name='firstName'
													label='First name'
												/>
											</item.Item>
										))
									}
								</form.ArrayField>
								<City
									form={form}
									fields='address'
								/>
								<form.Field name='custom'>
									{(field) => {
										handed.push(field)
										return <SpreadingInput {...field} />
									}}
								</form.Field>
							</>
						)
					}}
				</Form>
				<Form defaultValues={{ text: '' }}>
					{(form) => (
						<form.TextField
							name='text'
							label='Other text'
						/>
					)}
				</Form>
			</>,
		)

		const all = wrappers()
		expect(all.length).toBeGreaterThan(10)
		for (const wrapper of all) {
			expect(wrapper.getAttribute('data-form-id'), wrapper.getAttribute('data-field') ?? '').not.toBeNull()
		}
		expect(new Set(all.map((wrapper) => wrapper.getAttribute('data-form-id'))).size).toBe(FORM_COUNT)

		const [formId] = ids
		expect(formId).toBeTypeOf('string')
		expect(document.querySelector('[data-field="address.city"]')).toHaveAttribute('data-form-id', formId)
		expect(document.querySelector('[data-field="people"]')).toHaveAttribute('data-form-id', formId)
		expect(document.querySelector('input[data-field="custom"]')).toHaveAttribute('data-form-id', formId)
		expect(handed.at(-1)).toEqual(expect.objectContaining({ 'data-form-id': formId }))
	})
})
