import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { Form, withFieldGroup } from './index'

type Values = { email: string; address: { city: string }; billingCity: string }
const DEFAULTS: Values = { email: '', address: { city: '' }, billingCity: '' }
const CityBlock = withFieldGroup({
	defaultValues: { city: '' },
	props: { label: 'City' },
	render: ({ group, label }) => (
		<group.TextField
			name='city'
			label={label}
		/>
	),
})
const PLACED = [
	['Town', 'address.city'],
	['Billing city', 'billingCity'],
] as const

describe('group fields in this kit', () => {
	it('render the kit field under its absolute path and the form id', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={DEFAULTS}>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
						/>
						<form.FormGroup name='address'>
							{(group) => (
								<group.TextField
									name='city'
									label='Town'
								/>
							)}
						</form.FormGroup>
						<CityBlock
							fields={{ city: 'billingCity' }}
							label='Billing city'
						/>
					</>
				)}
			</Form>,
		)
		const formId = screen.getByLabelText('Email').closest('[data-field]')?.getAttribute('data-form-id') ?? ''
		expect(formId).not.toBe('')

		for (const [label, path] of PLACED) {
			const wrapper = screen.getByLabelText(label).closest('[data-field]')
			expect(wrapper).toHaveAttribute('data-field', path)
			expect(wrapper).toHaveAttribute('data-form-id', formId)
		}
		await user.type(screen.getByLabelText('Town'), 'Oslo')
		expect(screen.getByLabelText('Town')).toHaveValue('Oslo')
	})
})
