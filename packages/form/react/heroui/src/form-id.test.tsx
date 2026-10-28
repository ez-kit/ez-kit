import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Form } from './form'

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
}

const OPTIONS = [
	{ label: 'One', value: 'one' },
	{ label: 'Two', value: 'two' },
]

/** The forms on the page: one with every field kind, and a second whose field shares a name with it. */
const FORM_COUNT = 2

/** Every field kind the kit registers, plus one `ArrayField` entry. */
const FIELD_KIND_COUNT = 13

describe('data-form-id', () => {
	it('stamps every [data-field] wrapper with its own form id', () => {
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

		const wrappers = [...document.querySelectorAll('[data-field]')]
		expect(wrappers.length).toBeGreaterThan(FIELD_KIND_COUNT)
		for (const wrapper of wrappers) {
			expect(wrapper.getAttribute('data-form-id'), wrapper.getAttribute('data-field') ?? '').not.toBeNull()
		}
		expect(new Set(wrappers.map((wrapper) => wrapper.getAttribute('data-form-id'))).size).toBe(FORM_COUNT)
		const [formId] = ids
		expect(document.querySelector('[data-field="people"]')).toHaveAttribute('data-form-id', formId)
		expect(document.querySelector('[data-field="volume"]')).toHaveAttribute('data-form-id', formId)
	})
})
