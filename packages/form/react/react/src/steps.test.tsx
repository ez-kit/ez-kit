import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profiler } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'

import type { ReactNode } from 'react'

const { Form } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

type SignUp = { email: string; type: 'person' | 'company'; company: { inn: string }; card: string }
const SIGN_UP: SignUp = { email: '', type: 'person', company: { inn: '' }, card: '' }

type FlowProps = {
	initial?: string
	step?: string
	onStepChange?: (name: string) => void
	values?: SignUp
}

function Flow({ initial, step, onStepChange, values = SIGN_UP }: FlowProps): ReactNode {
	return (
		<Form defaultValues={values}>
			{(form) => (
				<form.Steps
					{...(initial === undefined ? {} : { initial })}
					{...(step === undefined ? {} : { step })}
					{...(onStepChange === undefined ? {} : { onStepChange })}
				>
					<form.Steps.List>
						{({ steps, current }) => (
							<output data-testid='list'>{`${steps.map((entry) => entry.name).join(',')}|${current ?? ''}`}</output>
						)}
					</form.Steps.List>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
						<form.RadioGroupField
							name='type'
							label='Type'
							options={[
								{ value: 'person', label: 'Person' },
								{ value: 'company', label: 'Company' },
							]}
						/>
					</form.Step>
					<form.Step
						name='company'
						when={(current) => current.type === 'company'}
					>
						<form.TextField
							name='company.inn'
							label='INN'
						/>
						<form.RadioGroupField
							name='type'
							label='Kind'
							options={[
								{ value: 'person', label: 'Person' },
								{ value: 'company', label: 'Company' },
							]}
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

const list = (): string | null => screen.getByTestId('list').textContent

describe('form.Steps — registration', () => {
	it('lists the visible steps in JSX order and starts on the first', () => {
		render(<Flow />)

		expect(list()).toBe('account,payment|account')
		expect(screen.getByLabelText('Email')).toBeInTheDocument()
		expect(screen.queryByLabelText('Card')).not.toBeInTheDocument()
	})

	it('keeps a step skipped by when in place once it applies', () => {
		render(<Flow values={{ ...SIGN_UP, type: 'company' }} />)

		expect(list()).toBe('account,company,payment|account')
	})

	it('starts on the initial step in the browser too, though it registers after the first', () => {
		render(<Flow initial='payment' />)

		expect(list()).toBe('account,payment|payment')
	})

	it('renders the initial step on the server', () => {
		const html = renderToString(<Flow initial='payment' />)

		expect(html).toContain('Card')
		expect(html).not.toContain('Email')
	})
})

describe('form.Steps — navigation basics', () => {
	it('goes past a step skipped by when', async () => {
		const user = userEvent.setup()
		render(<Flow />)

		await user.click(screen.getByRole('button', { name: 'Next' }))

		expect(list()).toBe('account,payment|payment')
	})

	it('reports a controlled move and stays until the step prop changes', async () => {
		const user = userEvent.setup()
		const onStepChange = vi.fn()
		const { rerender } = render(
			<Flow
				step='account'
				onStepChange={onStepChange}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Next' }))
		expect(onStepChange).toHaveBeenCalledWith('payment')
		expect(list()).toBe('account,payment|account')

		rerender(
			<Flow
				step='payment'
				onStepChange={onStepChange}
			/>,
		)
		expect(list()).toBe('account,payment|payment')
	})

	it('moves back to the nearest visible step when the current one stops applying', async () => {
		const user = userEvent.setup()
		render(<Flow values={{ ...SIGN_UP, type: 'company' }} />)

		await user.click(screen.getByRole('button', { name: 'Next' }))
		expect(list()).toBe('account,company,payment|company')

		await user.click(screen.getByLabelText('Person'))

		expect(list()).toBe('account,payment|account')
	})
})

type Five = { a: string; b: string; c: string; d: string; e: string }
const FIVE: Five = { a: '', b: '', c: '', d: '', e: '' }
const FIVE_NAMES = ['a', 'b', 'c', 'd', 'e'] as const

describe('form.Steps — subscriptions', () => {
	it('re-renders only the step it leaves and the step it enters', async () => {
		const user = userEvent.setup()
		const commits = new Map<string, number>()
		const count = (id: string): void => {
			commits.set(id, (commits.get(id) ?? 0) + 1)
		}
		render(
			<Form defaultValues={FIVE}>
				{(form) => (
					<form.Steps initial='b'>
						{FIVE_NAMES.map((name) => (
							<Profiler
								key={name}
								id={name}
								onRender={count}
							>
								<form.Step name={name}>
									<form.TextField
										name={name}
										label={name}
									/>
								</form.Step>
							</Profiler>
						))}
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
		commits.clear()

		await user.click(screen.getByRole('button', { name: 'Next' }))

		expect(await screen.findByLabelText('c')).toBeInTheDocument()
		expect([...commits.keys()].sort()).toEqual(['b', 'c'])
	})

	it('keeps a names selector quiet while the user types', async () => {
		const user = userEvent.setup()
		const renders = vi.fn()
		function Names({ read }: { read: () => readonly string[] }): ReactNode {
			renders(read())
			return null
		}
		render(
			<Form defaultValues={FIVE}>
				{(form) => (
					<form.Steps>
						<form.Steps.Subscribe selector={(state) => state.names}>
							{(names) => <Names read={() => names} />}
						</form.Steps.Subscribe>
						{FIVE_NAMES.map((name) => (
							<form.Step
								key={name}
								name={name}
							>
								<form.TextField
									name={name}
									label={name}
								/>
							</form.Step>
						))}
					</form.Steps>
				)}
			</Form>,
		)
		renders.mockClear()

		await user.type(screen.getByLabelText('a'), 'hello')

		expect(renders).not.toHaveBeenCalled()
	})
})
