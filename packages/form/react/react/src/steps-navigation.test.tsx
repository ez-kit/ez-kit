import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import type { ReactNode } from 'react'

const { Form } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

type Flow = { email: string; city: string; card: string }
const FLOW: Flow = { email: '', city: '', card: '' }
const EMAIL_REQUIRED = 'Enter an email'
const CITY_REQUIRED = 'Enter a city'
const BLOCKED_CITY = 'Not deliverable to this address'

const flowSchema = testSchema<Flow>((values) => [
	...(values.email === '' ? [{ message: EMAIL_REQUIRED, path: ['email'] }] : []),
	...(values.city === '' ? [{ message: CITY_REQUIRED, path: ['city'] }] : []),
])

/** Reports on `city` — a field of another step — whenever the email is `bad@example.com`. */
const crossStep = testSchema<Flow>((values) =>
	values.email === 'bad@example.com' ? [{ message: BLOCKED_CITY, path: ['city'] }] : [],
)

function Steps({ linear }: { linear?: boolean }): ReactNode {
	return (
		<Form
			defaultValues={FLOW}
			validators={{ onSubmit: flowSchema, onChange: crossStep }}
		>
			{(form) => (
				<form.Steps {...(linear === undefined ? {} : { linear })}>
					<form.Steps.List>
						{({ steps, current, goTo }) => (
							<nav>
								<output data-testid='current'>{current}</output>
								{steps.map((step) => (
									<button
										key={step.name}
										type='button'
										onClick={() => {
											goTo(step.name)
										}}
									>
										{`to ${step.name}`}
									</button>
								))}
							</nav>
						)}
					</form.Steps.List>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
					</form.Step>
					<form.Step name='address'>
						<form.TextField
							name='city'
							label='City'
						/>
					</form.Step>
					<form.Step name='payment'>
						<form.TextField
							name='card'
							label='Card'
						/>
					</form.Step>
					<form.Steps.Controls>
						{({ goNext, goBack, isValidating }) => (
							<>
								<output data-testid='validating'>{String(isValidating)}</output>
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

type User = ReturnType<typeof userEvent.setup>
const current = (): string | null => screen.getByTestId('current').textContent
const click = async (user: User, name: string): Promise<void> => {
	await user.click(screen.getByRole('button', { name }))
}
/** Wait for the check a move started to finish, so a "did not move" assertion is not read too early. */
const checked = async (): Promise<void> => {
	await waitFor(() => {
		expect(screen.getByTestId('validating')).toHaveTextContent('false')
	})
}
const settle = async (step: string): Promise<void> => {
	await waitFor(() => {
		expect(current()).toBe(step)
	})
}

async function passAll(user: User): Promise<void> {
	await user.type(screen.getByLabelText('Email'), 'ann@example.com')
	await click(user, 'Next')
	await settle('address')
	await user.type(screen.getByLabelText('City'), 'Town')
	await click(user, 'Next')
	await settle('payment')
}

describe('linear navigation (the default)', () => {
	it('does not jump past a step that never passed', async () => {
		const user = userEvent.setup()
		render(<Steps />)
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')

		await click(user, 'to payment')
		await checked()

		await settle('account')
		expect(screen.queryByText(EMAIL_REQUIRED)).not.toBeInTheDocument()
	})

	it('jumps forward over steps that passed and are still valid', async () => {
		const user = userEvent.setup()
		render(<Steps />)
		await passAll(user)
		await click(user, 'to account')
		await settle('account')

		await click(user, 'to payment')

		await settle('payment')
	})

	it('checks the step on screen before a jump, and stays on it when it fails', async () => {
		const user = userEvent.setup()
		render(<Steps />)
		await passAll(user)
		await click(user, 'to account')
		await settle('account')
		await user.clear(screen.getByLabelText('Email'))

		await click(user, 'to payment')

		expect(await screen.findByText(EMAIL_REQUIRED)).toBeInTheDocument()
		expect(current()).toBe('account')
	})

	it('does not jump over a passed step that has an error now', async () => {
		const user = userEvent.setup()
		render(<Steps />)
		await passAll(user)
		await click(user, 'to account')
		await settle('account')
		await user.clear(screen.getByLabelText('Email'))
		await user.type(screen.getByLabelText('Email'), 'bad@example.com')

		await click(user, 'to payment')
		await checked()

		await settle('account')
	})

	it('goes back without a check', async () => {
		const user = userEvent.setup()
		render(<Steps />)
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await click(user, 'Next')
		await settle('address')

		await click(user, 'Back')

		await settle('account')
	})
})

describe('free navigation (linear={false})', () => {
	it('jumps anywhere without a check', async () => {
		const user = userEvent.setup()
		render(<Steps linear={false} />)

		await click(user, 'to payment')

		await settle('payment')
		expect(screen.queryByText(EMAIL_REQUIRED)).not.toBeInTheDocument()
	})

	it('still checks the step on Next', async () => {
		const user = userEvent.setup()
		render(<Steps linear={false} />)

		await click(user, 'Next')

		expect(await screen.findByText(EMAIL_REQUIRED)).toBeInTheDocument()
		expect(current()).toBe('account')
	})
})

describe('a reset of the form', () => {
	it('forgets the visited and passed steps and goes back to the first', async () => {
		const user = userEvent.setup()
		render(
			<Form
				defaultValues={FLOW}
				validators={{ onSubmit: flowSchema }}
			>
				{(form) => (
					<form.Steps>
						<form.Steps.Subscribe
							selector={(state) =>
								`${state.current ?? ''}|${[...state.visited].join(',')}|${[...state.passed].join(',')}`
							}
						>
							{(text) => <output data-testid='state'>{text}</output>}
						</form.Steps.Subscribe>
						<form.Step name='account'>
							<form.TextField
								name='email'
								label='Email'
							/>
						</form.Step>
						<form.Step name='address'>
							<form.TextField
								name='city'
								label='City'
							/>
						</form.Step>
						<form.Steps.Controls>
							{({ goNext }) => (
								<button
									type='button'
									onClick={goNext}
								>
									Next
								</button>
							)}
						</form.Steps.Controls>
						<button
							type='button'
							onClick={() => {
								form.reset()
							}}
						>
							Reset
						</button>
					</form.Steps>
				)}
			</Form>,
		)
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await click(user, 'Next')
		await waitFor(() => {
			expect(screen.getByTestId('state').textContent).toBe('address|account|account')
		})

		await click(user, 'Reset')

		expect(screen.getByTestId('state').textContent).toBe('account||')
	})
})
