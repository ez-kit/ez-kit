import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import { revalidateLogic } from './index'

import type { ReactNode } from 'react'

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Pair = { password: string; confirm: string }
type SignUp = { email: string; pair: Pair; plan: string; card: string }
const SIGN_UP: SignUp = { email: '', pair: { password: '', confirm: '' }, plan: '', card: '' }
const EMAIL_REQUIRED = 'Enter an email'
const CARD_REQUIRED = 'Enter a card'
const TOO_SHORT = 'At least 8 characters'
const CHOOSE_PLAN = 'Choose a plan'

const signUpSchema = testSchema<SignUp>((values) => [
	...(values.email === '' ? [{ message: EMAIL_REQUIRED, path: ['email'] }] : []),
	...(values.card === '' ? [{ message: CARD_REQUIRED, path: ['card'] }] : []),
])

const Password = withFieldGroup({
	defaultValues: { password: '', confirm: '' },
	validators: {
		onChange: testSchema<Pair>((pair) =>
			pair.password.length < 8 ? [{ message: TOO_SHORT, path: ['password'] }] : [],
		),
	},
	render: ({ group }) => (
		<group.TextField
			name='password'
			label='Password'
		/>
	),
})

type FlowProps = {
	planCheck?: (props: { value: SignUp }) => unknown
	planCheckAsync?: (props: { value: SignUp; signal: AbortSignal }) => Promise<unknown>
}

function Flow({ planCheck, planCheckAsync }: FlowProps): ReactNode {
	return (
		<Form
			defaultValues={SIGN_UP}
			validators={{ onSubmit: signUpSchema }}
		>
			{(form) => (
				<form.Steps>
					<form.Steps.Subscribe selector={(state) => state.current}>
						{(current) => <output data-testid='current'>{current}</output>}
					</form.Steps.Subscribe>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
					</form.Step>
					<form.Step name='security'>
						<Password fields='pair' />
					</form.Step>
					<form.Step
						name='plan'
						validators={{
							...(planCheck === undefined ? {} : { onSubmit: planCheck }),
							...(planCheckAsync === undefined ? {} : { onSubmitAsync: planCheckAsync }),
						}}
					>
						<form.TextField
							name='plan'
							label='Plan'
						/>
					</form.Step>
					<form.Step name='payment'>
						<form.TextField
							name='card'
							label='Card'
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
				</form.Steps>
			)}
		</Form>
	)
}

const current = (): string | null => screen.getByTestId('current').textContent

async function next(user: ReturnType<typeof userEvent.setup>): Promise<void> {
	await user.click(screen.getByRole('button', { name: 'Next' }))
}

describe('goNext — the step on screen is checked before it is left', () => {
	it('stays on an invalid step, shows its error and focuses it', async () => {
		const user = userEvent.setup()
		render(<Flow />)

		await next(user)

		expect(await screen.findByText(EMAIL_REQUIRED)).toBeInTheDocument()
		expect(current()).toBe('account')
		expect(screen.getByLabelText('Email')).toHaveFocus()
	})

	it('is not held back by what the form reports on later steps, and does not show it', async () => {
		const user = userEvent.setup()
		render(<Flow />)

		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await next(user)

		await waitFor(() => {
			expect(current()).toBe('security')
		})
		expect(screen.queryByText(CARD_REQUIRED)).not.toBeInTheDocument()
	})

	it("runs the step's groups, untouched", async () => {
		const user = userEvent.setup()
		render(<Flow />)
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await next(user)
		await waitFor(() => {
			expect(current()).toBe('security')
		})

		await next(user)

		expect(await screen.findByText(TOO_SHORT)).toBeInTheDocument()
		expect(current()).toBe('security')
	})

	it("blocks on the step's own error with no path, and on none outside the step", async () => {
		const user = userEvent.setup()
		const planCheck = ({ value }: { value: SignUp }): { fields: Record<string, string>; group?: string } => ({
			fields: { card: 'not this step' },
			...(value.plan === '' ? { group: CHOOSE_PLAN } : {}),
		})
		render(<Flow planCheck={planCheck} />)
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await next(user)
		await user.type(await screen.findByLabelText('Password'), 'long enough')
		await next(user)
		await waitFor(() => {
			expect(current()).toBe('plan')
		})

		await next(user)
		expect(current()).toBe('plan')

		await user.type(screen.getByLabelText('Plan'), 'pro')
		await next(user)
		await waitFor(() => {
			expect(current()).toBe('payment')
		})
		expect(screen.queryByText('not this step')).not.toBeInTheDocument()
	})

	it('skips the async check while a sync one fails', async () => {
		const user = userEvent.setup()
		const planCheckAsync = vi.fn(() => Promise.resolve(undefined))
		render(
			<Flow
				planCheck={({ value }) => (value.plan === '' ? CHOOSE_PLAN : undefined)}
				planCheckAsync={planCheckAsync}
			/>,
		)
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await next(user)
		await user.type(await screen.findByLabelText('Password'), 'long enough')
		await next(user)
		await waitFor(() => {
			expect(current()).toBe('plan')
		})

		await next(user)

		expect(current()).toBe('plan')
		expect(planCheckAsync).not.toHaveBeenCalled()
	})

	it('ignores a second click while the check is in flight', async () => {
		const user = userEvent.setup()
		let release: (() => void) | undefined
		const planCheckAsync = vi.fn(
			() =>
				new Promise<undefined>((resolve) => {
					release = () => {
						resolve(undefined)
					}
				}),
		)
		render(<Flow planCheckAsync={planCheckAsync} />)
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await next(user)
		await user.type(await screen.findByLabelText('Password'), 'long enough')
		await next(user)
		await user.type(await screen.findByLabelText('Plan'), 'pro')

		await next(user)
		await next(user)
		release?.()

		await waitFor(() => {
			expect(current()).toBe('payment')
		})
		expect(planCheckAsync).toHaveBeenCalledTimes(1)
	})
})

describe('a whole-form submit and the steps', () => {
	function Single({
		onSubmit,
		checkAsync,
		check,
	}: {
		onSubmit: () => void
		checkAsync: () => Promise<undefined>
		check?: (props: { value: SignUp }) => unknown
	}): ReactNode {
		return (
			<Form
				defaultValues={SIGN_UP}
				onSubmit={onSubmit}
			>
				{(form) => (
					<form.Steps>
						<form.Step
							name='plan'
							validators={{ onSubmitAsync: checkAsync, ...(check === undefined ? {} : { onChange: check }) }}
						>
							<form.TextField
								name='plan'
								label='Plan'
							/>
						</form.Step>
						<form.SubmitButton>Finish</form.SubmitButton>
					</form.Steps>
				)}
			</Form>
		)
	}

	it("does not run a step's validators", async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const checkAsync = vi.fn(() => Promise.resolve(undefined))
		render(
			<Single
				onSubmit={onSubmit}
				checkAsync={checkAsync}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Finish' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
		expect(checkAsync).not.toHaveBeenCalled()
	})

	it('is blocked by an error the step has already reported', async () => {
		const user = userEvent.setup()
		render(
			<Single
				onSubmit={vi.fn()}
				checkAsync={() => Promise.resolve(undefined)}
				check={({ value }) => (value.plan === 'free' ? CHOOSE_PLAN : undefined)}
			/>,
		)

		await user.type(screen.getByLabelText('Plan'), 'free')

		expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled()
	})
})

describe("goNext and the form's schema on onDynamic", () => {
	it('leaves no stale verdict on the steps ahead, so the last step can submit', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={SIGN_UP}
				validationLogic={revalidateLogic()}
				validators={{ onDynamic: signUpSchema }}
				onSubmit={onSubmit}
			>
				{(form) => (
					<form.Steps>
						<form.Step name='account'>
							<form.TextField
								name='email'
								label='Email'
							/>
						</form.Step>
						<form.Step name='payment'>
							<form.TextField
								name='card'
								label='Card'
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
						<form.SubmitButton>Finish</form.SubmitButton>
					</form.Steps>
				)}
			</Form>,
		)
		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await next(user)
		await user.type(await screen.findByLabelText('Card'), '4242')

		await user.click(screen.getByRole('button', { name: 'Finish' }))

		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
	})
})
