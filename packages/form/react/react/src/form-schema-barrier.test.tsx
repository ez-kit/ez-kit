import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import { revalidateLogic } from './index'

import type { TestIssue } from './test-schema'
import type { ReactNode } from 'react'

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Address = { street: string; city: string }
type Checkout = { email: string; shipping: Address; separateBilling: boolean; billing: Address }
const EMPTY: Address = { street: '', city: '' }
const CHECKOUT: Checkout = { email: '', shipping: EMPTY, separateBilling: false, billing: EMPTY }
const EMAIL_REQUIRED = 'Enter an email'
const STREET_REQUIRED = 'Enter a street'
const CITY_REQUIRED = 'Enter a city'

function addressIssues(address: Address, at: string): TestIssue[] {
	return [
		...(address.street === '' ? [{ message: STREET_REQUIRED, path: [at, 'street'] }] : []),
		...(address.city === '' ? [{ message: CITY_REQUIRED, path: [at, 'city'] }] : []),
	]
}

/** What a union on `separateBilling` reports: billing's rules only while it is ticked. */
const checkoutSchema = testSchema<Checkout>((values) => [
	...(values.email === '' ? [{ message: EMAIL_REQUIRED, path: ['email'] }] : []),
	...addressIssues(values.shipping, 'shipping'),
	...(values.separateBilling ? addressIssues(values.billing, 'billing') : []),
])

const AddressFields = withFieldGroup({
	defaultValues: EMPTY,
	render: ({ group }) => (
		<>
			<group.TextField
				name='street'
				label='Street'
			/>
			<group.TextField
				name='city'
				label='City'
			/>
		</>
	),
})

function Case({ onSubmit, dynamic = false }: { onSubmit: () => void; dynamic?: boolean }): ReactNode {
	const rules = dynamic
		? { validationLogic: revalidateLogic(), validators: { onDynamic: checkoutSchema } }
		: { validators: { onSubmit: checkoutSchema } }
	return (
		<Form
			defaultValues={CHECKOUT}
			{...rules}
			onSubmit={onSubmit}
		>
			{(form) => (
				<>
					<form.TextField
						name='email'
						label='Email'
					/>
					<section aria-label='Shipping'>
						<AddressFields fields='shipping' />
					</section>
					<form.CheckboxField
						name='separateBilling'
						label='Separate billing'
					/>
					<form.Subscribe selector={(state) => state.values.separateBilling}>
						{(separate) =>
							separate ? (
								<section aria-label='Billing'>
									<AddressFields fields='billing' />
								</section>
							) : null
						}
					</form.Subscribe>
					<form.Subscribe selector={(state) => state.fieldMeta.billing?.errors.length ?? 0}>
						{(count) => <output data-testid='billing-own'>{count}</output>}
					</form.Subscribe>
					<form.Submit>
						{({ formErrors }) => <output data-testid='form-errors'>{formErrors.join('|')}</output>}
					</form.Submit>
					<form.SubmitButton>Place order</form.SubmitButton>
				</>
			)}
		</Form>
	)
}

/** The field root labelled `label` inside the section named `section`. */
function within(section: string, label: string): HTMLElement {
	const region = screen.getByRole('region', { name: section })
	const node = [...region.querySelectorAll('label')].find((candidate) => candidate.textContent === label)
	const root = node?.closest('[data-field]')
	if (!(root instanceof HTMLElement)) throw new Error(`No ${label} field in ${section}`)
	return root
}

/** The input of the field labelled `label` inside the section named `section`. */
function inputIn(section: string, label: string): HTMLElement {
	const input = within(section, label).querySelector('input')
	if (input === null) throw new Error(`No ${label} input in ${section}`)
	return input
}

describe("the form's schema as the last barrier", () => {
	it('reports every part in one submit, on the leaf paths only', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<Case onSubmit={onSubmit} />)

		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByRole('button', { name: 'Place order' }))

		expect(onSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(EMAIL_REQUIRED)).toBeInTheDocument()
		expect(within('Shipping', 'Street')).toHaveTextContent(STREET_REQUIRED)
		expect(within('Billing', 'City')).toHaveTextContent(CITY_REQUIRED)
		expect(screen.getByTestId('billing-own')).toHaveTextContent('0')
		expect(screen.getByTestId('form-errors')).toBeEmptyDOMElement()
	})

	it('drops the billing rules once the box is unticked', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<Case onSubmit={onSubmit} />)

		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		for (const label of ['Street', 'City']) {
			await user.type(inputIn('Shipping', label), 'x')
		}
		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByRole('button', { name: 'Place order' }))
		expect(onSubmit).not.toHaveBeenCalled()

		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByRole('button', { name: 'Place order' }))

		expect(onSubmit).toHaveBeenCalledTimes(1)
	})
})

describe("the form's schema on onDynamic, after the first submit", () => {
	it('stays quiet before the first submit', async () => {
		const user = userEvent.setup()
		render(
			<Case
				onSubmit={vi.fn()}
				dynamic
			/>,
		)

		await user.type(screen.getByLabelText('Email'), 'a')
		await user.clear(screen.getByLabelText('Email'))

		expect(screen.queryByText(EMAIL_REQUIRED)).not.toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Place order' })).toBeEnabled()
	})

	it('reports a part that appears after a failed submit at once', async () => {
		const user = userEvent.setup()
		render(
			<Case
				onSubmit={vi.fn()}
				dynamic
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Place order' }))
		await user.click(screen.getByLabelText('Separate billing'))

		expect(within('Billing', 'Street')).toHaveTextContent(STREET_REQUIRED)
	})

	it('keeps an error when the field only loses focus', async () => {
		const user = userEvent.setup()
		render(
			<Case
				onSubmit={vi.fn()}
				dynamic
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Place order' }))
		await user.click(screen.getByLabelText('Email'))
		await user.tab()

		expect(screen.getByText(EMAIL_REQUIRED)).toBeInTheDocument()
	})

	it('lets a fixed field drop its error while the others keep theirs', async () => {
		const user = userEvent.setup()
		render(
			<Case
				onSubmit={vi.fn()}
				dynamic
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Place order' }))
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')

		expect(screen.queryByText(EMAIL_REQUIRED)).not.toBeInTheDocument()
		expect(within('Shipping', 'Street')).toHaveTextContent(STREET_REQUIRED)
	})
})

type Account = { showName: boolean; account: { name: string } }
const ACCOUNT: Account = { showName: false, account: { name: '' } }
const NAME_REQUIRED = 'Enter a name'
const accountSchema = testSchema<Account>((values) =>
	values.account.name === '' ? [{ message: NAME_REQUIRED, path: ['account', 'name'] }] : [],
)

describe("the form's schema on a field that is not mounted", () => {
	it('blocks the submit and shows the error once the field mounts', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={ACCOUNT}
				validators={{ onSubmit: accountSchema }}
				onSubmit={onSubmit}
			>
				{(form) => (
					<>
						<form.CheckboxField
							name='showName'
							label='Show name'
						/>
						<form.Subscribe selector={(state) => state.values.showName}>
							{(show) =>
								show ? (
									<form.TextField
										name='account.name'
										label='Name'
									/>
								) : null
							}
						</form.Subscribe>
						<form.SubmitButton>Finish</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Finish' }))
		expect(onSubmit).not.toHaveBeenCalled()

		await user.click(screen.getByLabelText('Show name'))

		expect(screen.getByText(NAME_REQUIRED)).toBeInTheDocument()
	})
})

const BILLING_INCOMPLETE = 'Complete the billing address'
const wholeBillingSchema = testSchema<Checkout>((values) =>
	values.separateBilling && values.billing.street === '' ? [{ message: BILLING_INCOMPLETE, path: ['billing'] }] : [],
)

describe("the form's error on a group's own path", () => {
	it('survives the StrictMode remount of the group that lands on it', async () => {
		const user = userEvent.setup()
		render(
			<StrictMode>
				<Form
					defaultValues={CHECKOUT}
					validationLogic={revalidateLogic()}
					validators={{ onDynamic: wholeBillingSchema }}
				>
					{(form) => (
						<>
							<form.CheckboxField
								name='separateBilling'
								label='Separate billing'
							/>
							<form.Subscribe selector={(state) => state.values.separateBilling}>
								{(separate) => (separate ? <AddressFields fields='billing' /> : null)}
							</form.Subscribe>
							<form.Subscribe selector={(state) => state.fieldMeta.billing?.errors.length ?? 0}>
								{(count) => <output data-testid='billing-own'>{count}</output>}
							</form.Subscribe>
							<form.SubmitButton>Place order</form.SubmitButton>
						</>
					)}
				</Form>
			</StrictMode>,
		)

		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByRole('button', { name: 'Place order' }))
		await user.click(screen.getByLabelText('Separate billing'))
		await user.click(screen.getByLabelText('Separate billing'))

		expect(screen.getByTestId('billing-own')).toHaveTextContent('1')
	})
})
