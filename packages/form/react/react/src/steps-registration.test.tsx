import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Person = { firstName: string }
type Account = {
	email: string
	showExtra: boolean
	extra: string
	address: { city: string }
	people: Person[]
	guest: string
	note: string
	pair: { password: string }
	login: string
	secret: string
	card: string
}
const ACCOUNT: Account = {
	email: '',
	showExtra: true,
	extra: '',
	address: { city: '' },
	people: [{ firstName: '' }],
	guest: '',
	note: '',
	pair: { password: '' },
	login: '',
	secret: '',
	card: '',
}

const Password = withFieldGroup({
	defaultValues: { password: '' },
	render: ({ group }) => (
		<group.TextField
			name='password'
			label='Password'
		/>
	),
})

const ACCOUNT_FIELDS = [
	'address',
	'address.city',
	'email',
	'extra',
	'guest',
	'login',
	'pair',
	'pair.password',
	'people',
	'people[0].firstName',
	'secret',
	'showExtra',
]

function Flow(): ReactNode {
	return (
		<Form defaultValues={ACCOUNT}>
			{(form) => (
				<form.Steps>
					<form.Steps.Subscribe selector={(state) => state.fields.account}>
						{(fields) => <output data-testid='account'>{[...(fields ?? [])].sort().join(',')}</output>}
					</form.Steps.Subscribe>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
						<form.CheckboxField
							name='showExtra'
							label='Show extra'
						/>
						<form.Subscribe selector={(state) => state.values.showExtra}>
							{(show) =>
								show ? (
									<form.TextField
										name='extra'
										label='Extra'
									/>
								) : null
							}
						</form.Subscribe>
						<form.FormGroup name='address'>
							{(group) => (
								<group.TextField
									name='city'
									label='City'
								/>
							)}
						</form.FormGroup>
						<form.ArrayField
							name='people'
							newItem={{ firstName: '' }}
							removeLabel='Remove'
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
						<form.Field name='guest'>
							{(field) => (
								<input
									aria-label='Guest'
									value={field.value}
									readOnly
								/>
							)}
						</form.Field>
						<form.NativeField name='note'>{() => null}</form.NativeField>
						<Password fields='pair' />
						<Password fields={{ password: 'secret' }} />
						<form.TextField
							name='login'
							label='Login'
						/>
					</form.Step>
					<form.Step name='payment'>
						<form.TextField
							name='card'
							label='Card'
						/>
					</form.Step>
					<form.Steps.Controls>
						{({ goNext, goBack }) => (
							<>
								<button
									type='button'
									onClick={goBack}
								>
									Back
								</button>
								<button
									type='button'
									onClick={goNext}
								>
									Next
								</button>
							</>
						)}
					</form.Steps.Controls>
				</form.Steps>
			)}
		</Form>
	)
}

const accountFields = (): string | null => screen.getByTestId('account').textContent

describe('form.Step — what registers in it', () => {
	it('takes every bound field, every group branch and every array entry, and no native field', () => {
		render(<Flow />)

		expect(accountFields()).toBe(ACCOUNT_FIELDS.join(','))
	})

	it('drops a field that stops rendering on the step on screen', async () => {
		const user = userEvent.setup()
		render(<Flow />)

		await user.click(screen.getByLabelText('Show extra'))

		expect(accountFields()).toBe(ACCOUNT_FIELDS.filter((name) => name !== 'extra').join(','))
	})

	it('keeps its fields while it is off screen', async () => {
		const user = userEvent.setup()
		render(<Flow />)

		await user.click(screen.getByRole('button', { name: 'Next' }))

		expect(await screen.findByLabelText('Card')).toBeInTheDocument()
		expect(accountFields()).toBe(ACCOUNT_FIELDS.join(','))
	})

	it('keeps every field under StrictMode', () => {
		render(
			<StrictMode>
				<Flow />
			</StrictMode>,
		)

		expect(accountFields()).toBe(ACCOUNT_FIELDS.join(','))
	})
})
