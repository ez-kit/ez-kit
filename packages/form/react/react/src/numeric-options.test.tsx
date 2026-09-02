import { FormFieldType } from '@ez-kit/form-core'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, test, vi } from 'vitest'

import { createForm } from './create-form'
import { fromKitValue, fromKitValues, toKitOptions } from './option-values'
import { testComponents } from './test-kit'

import type { FormSchema } from '@ez-kit/form-core'

/**
 * Numeric option values, end to end through the binding layer.
 *
 * The kit contract is string-only at the DOM edge, so the interesting question is not "does
 * the widget show the right label" but **what lands in form state**: a numeric select must
 * write `7`, never `'7'`, or every consumer downstream (a `when` rule's `eq`, the submitted
 * payload, a backend expecting an entity id) sees the wrong type.
 */

type Values = {
	countryId: number
	tagIds: number[]
	roleIds: number[]
	role: string
}

const DEFAULTS: Values = { countryId: 0, tagIds: [], roleIds: [7], role: '' }

const COUNTRY_OPTIONS = [
	{ label: 'Germany', value: 49 },
	{ label: 'France', value: 33 },
]

const TAG_OPTIONS = [
	{ label: 'Design', value: 1 },
	{ label: 'Engineering', value: 2 },
]

const ROLE_ID_OPTIONS = [
	{ label: 'Admin', value: 7 },
	{ label: 'Viewer', value: 8 },
]

const { useForm, Form, FormRenderer } = createForm({ components: testComponents })

/** `typeof value` alongside the value, so a stringified `7` cannot pass for the number. */
function describeValue(value: unknown): string {
	return `${typeof value}:${JSON.stringify(value)}`
}

describe('numeric option values', () => {
	it('writes a number into form state when a numeric select is chosen', async () => {
		const user = userEvent.setup()

		function SelectCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.SelectField
						name='countryId'
						label='Country'
						options={COUNTRY_OPTIONS}
					/>
					<form.Subscribe selector={(state) => state.values.countryId}>
						{(countryId) => <output>{describeValue(countryId)}</output>}
					</form.Subscribe>
				</Form>
			)
		}

		render(<SelectCase />)
		await user.selectOptions(screen.getByLabelText('Country'), '49')

		expect(screen.getByRole('status')).toHaveTextContent('number:49')
	})

	it('writes numbers into form state from a numeric multi-select', async () => {
		const user = userEvent.setup()

		function MultiSelectCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.MultiSelectField
						name='tagIds'
						label='Tags'
						options={TAG_OPTIONS}
					/>
					<form.Subscribe selector={(state) => state.values.tagIds}>
						{(tagIds) => <output>{describeValue(tagIds)}</output>}
					</form.Subscribe>
				</Form>
			)
		}

		render(<MultiSelectCase />)
		await user.selectOptions(screen.getByLabelText('Tags'), ['1', '2'])

		expect(screen.getByRole('status')).toHaveTextContent('object:[1,2]')
	})

	it('renders a numeric defaultValue as the checked boxes of a checkbox group', async () => {
		const user = userEvent.setup()

		function CheckboxGroupCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.CheckboxGroupField
						name='roleIds'
						label='Roles'
						options={ROLE_ID_OPTIONS}
					/>
					<form.Subscribe selector={(state) => state.values.roleIds}>
						{(roleIds) => <output>{describeValue(roleIds)}</output>}
					</form.Subscribe>
				</Form>
			)
		}

		render(<CheckboxGroupCase />)
		expect(screen.getByLabelText('Admin')).toBeChecked()
		expect(screen.getByLabelText('Viewer')).not.toBeChecked()

		await user.click(screen.getByLabelText('Viewer'))

		expect(screen.getByRole('status')).toHaveTextContent('object:[7,8]')
	})

	it('leaves a string-valued select a string', async () => {
		const user = userEvent.setup()

		function StringCase() {
			const form = useForm({ defaultValues: DEFAULTS })

			return (
				<Form form={form}>
					<form.SelectField
						name='role'
						label='Role'
						options={[
							{ label: 'Admin', value: '7' },
							{ label: 'Viewer', value: '8' },
						]}
					/>
					<form.Subscribe selector={(state) => state.values.role}>
						{(role) => <output>{describeValue(role)}</output>}
					</form.Subscribe>
				</Form>
			)
		}

		render(<StringCase />)
		await user.selectOptions(screen.getByLabelText('Role'), '7')

		// The lookup — not `Number(value)` — is what keeps a numeric-looking string a string.
		expect(screen.getByRole('status')).toHaveTextContent('string:"7"')
	})
})

describe('option-values helpers', () => {
	it('stringifies option values for the kit', () => {
		expect(toKitOptions(COUNTRY_OPTIONS)).toEqual([
			{ label: 'Germany', value: '49' },
			{ label: 'France', value: '33' },
		])
	})

	it('maps a kit string back to the original typed value, and passes an unknown one through', () => {
		expect(fromKitValue(COUNTRY_OPTIONS, '49')).toBe(49)
		expect(fromKitValue([{ label: 'Admin', value: '7' }], '7')).toBe('7')
		// "nothing selected" — Radix reserves the empty string and it is on no options list.
		expect(fromKitValue(COUNTRY_OPTIONS, '')).toBe('')
		expect(fromKitValues(TAG_OPTIONS, ['2', '1'])).toEqual([2, 1])
	})
})

test('a schema-driven numeric select round-trips through FormRenderer', async () => {
	const user = userEvent.setup()
	const onSubmit = vi.fn()

	const schema: FormSchema<Values> = {
		version: 1,
		children: [
			{ type: FormFieldType.Select, name: 'countryId', label: 'Country', options: COUNTRY_OPTIONS, defaultValue: 33 },
			{ type: 'submit', label: 'Save' },
		],
	}

	render(
		<FormRenderer
			schema={schema}
			onSubmit={onSubmit}
		/>,
	)

	// The schema's own numeric `defaultValue` seeds form state, and reaches the kit stringified.
	expect(screen.getByLabelText('Country')).toHaveValue('33')

	await user.selectOptions(screen.getByLabelText('Country'), '49')
	await user.click(screen.getByRole('button', { name: 'Save' }))

	await waitFor(() => {
		expect(onSubmit).toHaveBeenCalled()
	})
	expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ value: { countryId: 49 } })
})
