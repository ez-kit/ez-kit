import { shallow } from '@tanstack/react-store'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import { useStep, useSteps } from './index'

import type { ReactNode } from 'react'

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Values = { email: string; plan: string; code: string }
const VALUES: Values = { email: '', plan: '', code: '' }
const EMAIL_REQUIRED = 'Enter an email'
const CHOOSE_PLAN = 'Choose a plan'
const DATES = 'The trip ends before it starts'
const BAD_CODE = 'This code is taken'

const formSchema = testSchema<Values>((values) => [
	...(values.email === '' ? [{ message: EMAIL_REQUIRED, path: ['email'] }] : []),
	...(values.code === 'x' ? [{ message: DATES }] : []),
])

const Code = withFieldGroup({
	defaultValues: { code: '' },
	validators: { onChange: ({ value }) => (value.code === 'taken' ? BAD_CODE : undefined) },
	render: ({ group }) => (
		<>
			<group.TextField
				name='code'
				label='Code'
			/>
			<output data-testid='block-errors'>{group.errors.join('|')}</output>
		</>
	),
})

function Flow(): ReactNode {
	return (
		<Form
			defaultValues={VALUES}
			validators={{ onSubmit: formSchema }}
		>
			{(form) => (
				<form.Steps>
					<form.Steps.List>
						{({ steps, current }) => (
							<output data-testid='list'>
								{`${current ?? ''}:${steps.map((step) => `${step.name}${step.visited ? '+v' : ''}${step.invalid ? '+i' : ''}`).join(',')}`}
							</output>
						)}
					</form.Steps.List>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
					</form.Step>
					<form.Step
						name='plan'
						validators={{ onSubmit: ({ value }) => (value.plan === '' ? CHOOSE_PLAN : undefined) }}
					>
						<form.TextField
							name='plan'
							label='Plan'
						/>
						<Code fields={{ code: 'code' }} />
					</form.Step>
					<form.Steps.Controls>
						{({ canGoBack, isLast, isValidating, stepErrors, formErrors, goBack, goNext }) => (
							<>
								<output data-testid='controls'>
									{JSON.stringify({ canGoBack, isLast, isValidating, stepErrors, formErrors })}
								</output>
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
					<form.SubmitButton>Finish</form.SubmitButton>
				</form.Steps>
			)}
		</Form>
	)
}

type User = ReturnType<typeof userEvent.setup>
const listText = (): string | null => screen.getByTestId('list').textContent
const controls = (): Record<string, unknown> =>
	JSON.parse(screen.getByTestId('controls').textContent) as Record<string, unknown>

async function toPlan(user: User): Promise<void> {
	await user.type(screen.getByLabelText('Email'), 'ann@example.com')
	await user.click(screen.getByRole('button', { name: 'Next' }))
	await waitFor(() => {
		expect(listText()).toBe('plan:account+v,plan')
	})
}

describe('form.Steps.List', () => {
	it('does not mark a step invalid until the user tried to leave it', () => {
		render(<Flow />)

		expect(listText()).toBe('account:account,plan')
	})

	it('marks a step visited and invalid once leaving it failed', async () => {
		const user = userEvent.setup()
		render(<Flow />)

		await user.click(screen.getByRole('button', { name: 'Next' }))

		await waitFor(() => {
			expect(listText()).toBe('account:account+v+i,plan')
		})
	})

	it('marks a visited step invalid when the final submit reports on it, and stays put', async () => {
		const user = userEvent.setup()
		const SAME = 'The plan must not repeat the email'
		const crossSchema = testSchema<Values>((values) =>
			values.plan !== '' && values.plan === values.email ? [{ message: SAME, path: ['email'] }] : [],
		)
		function Server(): ReactNode {
			return (
				<Form
					defaultValues={VALUES}
					validators={{ onSubmit: crossSchema }}
				>
					{(form) => (
						<form.Steps>
							<form.Steps.List>
								{({ steps, current }) => (
									<output data-testid='list'>
										{`${current ?? ''}:${steps.map((step) => `${step.name}${step.visited ? '+v' : ''}${step.invalid ? '+i' : ''}`).join(',')}`}
									</output>
								)}
							</form.Steps.List>
							<form.Step name='account'>
								<form.TextField
									name='email'
									label='Email'
								/>
							</form.Step>
							<form.Step name='plan'>
								<form.TextField
									name='plan'
									label='Plan'
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
				</Form>
			)
		}
		render(<Server />)
		await user.type(screen.getByLabelText('Email'), 'ann')
		await user.click(screen.getByRole('button', { name: 'Next' }))
		await waitFor(() => {
			expect(listText()).toBe('plan:account+v,plan')
		})
		await user.type(screen.getByLabelText('Plan'), 'ann')

		await user.click(screen.getByRole('button', { name: 'Finish' }))

		await waitFor(() => {
			expect(listText()).toBe('plan:account+v+i,plan')
		})
	})
})

describe('form.Steps.Controls', () => {
	it('hands the position, the step errors with no path and the form errors', async () => {
		const user = userEvent.setup()
		render(<Flow />)
		expect(controls()).toEqual({ canGoBack: false, isLast: false, isValidating: false, stepErrors: [], formErrors: [] })
		await toPlan(user)

		await user.click(screen.getByRole('button', { name: 'Next' }))

		await waitFor(() => {
			expect(controls()).toMatchObject({ canGoBack: true, isLast: true, stepErrors: [CHOOSE_PLAN] })
		})
	})

	it("leaves a group's own errors to the group", async () => {
		const user = userEvent.setup()
		render(<Flow />)
		await toPlan(user)

		await user.type(screen.getByLabelText('Code'), 'taken')

		expect(screen.getByTestId('block-errors')).toHaveTextContent(BAD_CODE)
		expect(controls()).toMatchObject({ stepErrors: [] })
	})

	it("hands the form's errors with no path", async () => {
		const user = userEvent.setup()
		render(<Flow />)
		await toPlan(user)
		await user.type(screen.getByLabelText('Plan'), 'pro')
		await user.type(screen.getByLabelText('Code'), 'x')

		await user.click(screen.getByRole('button', { name: 'Finish' }))

		await waitFor(() => {
			expect(controls()).toMatchObject({ formErrors: [DATES] })
		})
	})
})

describe('one step, and any slice', () => {
	it('hands one step through Item and useStep', async () => {
		const user = userEvent.setup()
		function Dot({ name }: { name: string }): ReactNode {
			const { isCurrent, visited, invalid } = useStep(name)
			return <output data-testid={`dot-${name}`}>{`${String(isCurrent)},${String(visited)},${String(invalid)}`}</output>
		}
		render(
			<Form defaultValues={VALUES}>
				{(form) => (
					<form.Steps>
						<Dot name='account' />
						<form.Steps.Item name='plan'>
							{({ isCurrent, goTo }) => (
								<button
									type='button'
									onClick={goTo}
								>
									{`plan ${String(isCurrent)}`}
								</button>
							)}
						</form.Steps.Item>
						<form.Step name='account'>
							<form.TextField
								name='email'
								label='Email'
							/>
						</form.Step>
						<form.Step name='plan'>
							<form.TextField
								name='plan'
								label='Plan'
							/>
						</form.Step>
					</form.Steps>
				)}
			</Form>,
		)
		expect(screen.getByTestId('dot-account')).toHaveTextContent('true,false,false')

		await user.click(screen.getByRole('button', { name: 'plan false' }))

		expect(await screen.findByRole('button', { name: 'plan true' })).toBeInTheDocument()
		expect(screen.getByTestId('dot-account')).toHaveTextContent('false,true,false')
	})

	it('re-renders a composite selection only when it changes by the equality given', async () => {
		const user = userEvent.setup()
		const renders = vi.fn()
		function Pair(): ReactNode {
			const pair = useSteps((state) => ({ names: state.names, current: state.current }), shallow)
			renders(pair.current)
			return null
		}
		render(
			<Form
				defaultValues={VALUES}
				validators={{ onSubmit: formSchema }}
			>
				{(form) => (
					<form.Steps>
						<Pair />
						<form.Step name='account'>
							<form.TextField
								name='email'
								label='Email'
							/>
						</form.Step>
						<form.Step name='plan' />
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
			</Form>,
		)
		renders.mockClear()

		await user.click(screen.getByRole('button', { name: 'Next' }))
		expect(await screen.findByText(EMAIL_REQUIRED)).toBeInTheDocument()
		expect(renders).not.toHaveBeenCalled()

		await user.type(screen.getByLabelText('Email'), 'ann@example.com')
		await user.click(screen.getByRole('button', { name: 'Next' }))
		await waitFor(() => {
			expect(renders).toHaveBeenCalledWith('plan')
		})
	})

	it('throws a named error outside form.Steps', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		function Outside(): ReactNode {
			useSteps((state) => state.current)
			return null
		}

		expect(() => render(<Outside />)).toThrow('render it inside <form.Steps>')
		error.mockRestore()
	})
})
