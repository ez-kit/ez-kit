import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Profiler, StrictMode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { createStepCheck } from './steps/check'
import { createStepsController } from './steps/controller'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import type { ReactNode } from 'react'

const { Form } = createForm({ FormElement: testFormElement, fields: testFields, components: testComponents })

type Plan = { email: string; plan: string; card: string }
const PLAN: Plan = { email: '', plan: '', card: '' }

type User = ReturnType<typeof userEvent.setup>

afterEach(() => {
	vi.restoreAllMocks()
})

function deferred() {
	let release: () => void = () => undefined
	const validator = vi.fn(
		() =>
			new Promise<undefined>((resolve) => {
				release = () => {
					resolve(undefined)
				}
			}),
	)
	return {
		validator,
		release: async (): Promise<void> => {
			await act(async () => {
				release()
				await Promise.resolve()
			})
		},
	}
}

type FlowProps = {
	initial?: string
	step?: string
	onStepChange?: (name: string) => void
	planAsync?: () => Promise<undefined>
	planCheck?: () => unknown
	strict?: boolean
}

function Flow({ initial, step, onStepChange, planAsync, planCheck }: FlowProps): ReactNode {
	return (
		<Form defaultValues={PLAN}>
			{(form) => (
				<form.Steps
					{...(initial === undefined ? {} : { initial })}
					{...(step === undefined ? {} : { step })}
					{...(onStepChange === undefined ? {} : { onStepChange })}
				>
					<form.Steps.Subscribe selector={(state) => state.current}>
						{(current) => <output data-testid='current'>{current}</output>}
					</form.Steps.Subscribe>
					<form.Step name='account'>
						<form.TextField
							name='email'
							label='Email'
						/>
					</form.Step>
					<form.Step
						name='plan'
						validators={{
							...(planAsync === undefined ? {} : { onSubmitAsync: planAsync }),
							...(planCheck === undefined ? {} : { onSubmit: planCheck }),
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
						{({ goNext, goBack, stepErrors }) => (
							<>
								<output data-testid='step-errors'>{stepErrors.join('|')}</output>
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
		</Form>
	)
}

const current = (): string | null => screen.getByTestId('current').textContent
const click = async (user: User, name: string): Promise<void> => {
	await user.click(screen.getByRole('button', { name }))
}

describe('a controlled flow whose parent does not follow', () => {
	it('asks again on every Next', async () => {
		const user = userEvent.setup()
		const onStepChange = vi.fn()
		render(
			<Flow
				step='account'
				onStepChange={onStepChange}
			/>,
		)

		await click(user, 'Next')
		await click(user, 'Next')

		await waitFor(() => {
			expect(onStepChange).toHaveBeenCalledTimes(2)
		})
		expect(onStepChange).toHaveBeenLastCalledWith('plan')
		expect(current()).toBe('account')
	})
})

describe('the initial step under StrictMode', () => {
	it('stays on a step that registers after the first, and reports no move', () => {
		const onStepChange = vi.fn()
		render(
			<StrictMode>
				<Flow
					initial='payment'
					onStepChange={onStepChange}
				/>
			</StrictMode>,
		)

		expect(current()).toBe('payment')
		expect(onStepChange).not.toHaveBeenCalled()
	})
})

describe('a step check that fails to run', () => {
	it('stays on the step, reports the error, and leaves no unhandled rejection', async () => {
		const user = userEvent.setup()
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		render(
			<Flow
				initial='plan'
				planCheck={() => {
					throw new Error('plans service down')
				}}
			/>,
		)

		await click(user, 'Next')

		await waitFor(() => {
			expect(error).toHaveBeenCalledWith(expect.stringContaining("'plan'"), expect.any(Error))
		})
		expect(current()).toBe('plan')
	})
})

describe('a move decided after an async check', () => {
	it('is dropped when the user went back meanwhile', async () => {
		const user = userEvent.setup()
		const { validator, release } = deferred()
		render(
			<Flow
				initial='plan'
				planAsync={validator}
			/>,
		)

		await click(user, 'Next')
		await waitFor(() => {
			expect(validator).toHaveBeenCalled()
		})
		await click(user, 'Back')
		expect(current()).toBe('account')
		await release()

		expect(current()).toBe('account')
	})

	it('is dropped when the form was reset meanwhile, though the cancelled check left nothing behind', async () => {
		const user = userEvent.setup()
		const { validator, release } = deferred()
		render(
			<Flow
				initial='plan'
				planAsync={validator}
			/>,
		)

		await click(user, 'Next')
		await waitFor(() => {
			expect(validator).toHaveBeenCalled()
		})
		await click(user, 'Reset')
		await release()

		expect(current()).toBe('plan')
	})
})

describe('the groups a step registered', () => {
	it('start over when the step is entered again', () => {
		const host = { state: { values: {} }, store: { subscribe: () => ({ unsubscribe: () => undefined }) } }
		const controller = createStepsController(host, {})
		const stale = {}
		controller.registerStep('a', { when: () => undefined })
		controller.registerStep('b', { when: () => undefined })
		controller.connect()
		const unregister = controller.registerGroup('a', stale)
		controller.moveTo('b')
		unregister()

		controller.moveTo('a')

		expect(controller.groupsOf('a').has(stale)).toBe(false)
	})
})

describe('form.Step — optional props under exactOptionalPropertyTypes', () => {
	it('takes when and validators that may be undefined', () => {
		const maybeWhen: ((values: Plan) => boolean) | undefined = undefined
		const maybeValidators: { onSubmit: () => undefined } | undefined = undefined
		void (
			<Form defaultValues={PLAN}>
				{(form) => (
					<form.Steps>
						<form.Step
							name='plan'
							when={maybeWhen}
							validators={maybeValidators}
						/>
					</form.Steps>
				)}
			</Form>
		)
	})
})

describe('createStepCheck', () => {
	it('does not pass a step whose own pass was cancelled, though it left nothing behind', async () => {
		const host = { state: { values: {} }, store: { subscribe: () => ({ unsubscribe: () => undefined }) } }
		const controller = createStepsController(host, {})
		controller.registerScope('plan', {
			run: () => Promise.resolve(false),
			isClean: () => true,
			ownErrors: () => [],
			listen: () => () => undefined,
			clear: () => undefined,
		})
		const form = {
			formId: 'f',
			formGroupApis: new Set(),
			fieldInfo: {},
			getFieldMeta: () => undefined,
			setFieldMeta: () => undefined,
			validate: () => undefined,
		}

		expect(await createStepCheck(form as never, controller)('plan')).toBe(false)
	})
})

describe('steps that cannot be listed as written', () => {
	it('warns in development about two steps with one name', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		render(
			<Form defaultValues={PLAN}>
				{(form) => (
					<form.Steps>
						<form.Step name='plan' />
						<form.Step name='plan' />
					</form.Steps>
				)}
			</Form>,
		)

		expect(error).toHaveBeenCalledWith(expect.stringContaining("two steps named 'plan'"))
	})

	it('warns in development about a step that mounts after the flow did', async () => {
		const user = userEvent.setup()
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		function Late(): ReactNode {
			return (
				<Form defaultValues={{ ...PLAN, extra: false }}>
					{(form) => (
						<form.Steps>
							<form.Step name='account'>
								<form.CheckboxField
									name='extra'
									label='Extra'
								/>
							</form.Step>
							<form.Subscribe selector={(state) => state.values.extra}>
								{(extra) => (extra ? <form.Step name='extra' /> : null)}
							</form.Subscribe>
						</form.Steps>
					)}
				</Form>
			)
		}
		render(<Late />)

		await user.click(screen.getByLabelText('Extra'))

		expect(error).toHaveBeenCalledWith(expect.stringContaining("step 'extra' mounted after"))
	})
})

describe('one field bound twice in a step', () => {
	it('stays registered while either binding is mounted', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={{ ...PLAN, second: true }}>
				{(form) => (
					<form.Steps>
						<form.Steps.Subscribe selector={(state) => (state.fields.account ?? []).join(',')}>
							{(fields) => <output data-testid='fields'>{fields}</output>}
						</form.Steps.Subscribe>
						<form.Step name='account'>
							<form.CheckboxField
								name='second'
								label='Second'
							/>
							<form.TextField
								name='email'
								label='Email'
							/>
							<form.Subscribe selector={(state) => state.values.second}>
								{(second) =>
									second ? (
										<form.TextField
											name='email'
											label='Email again'
										/>
									) : null
								}
							</form.Subscribe>
						</form.Step>
					</form.Steps>
				)}
			</Form>,
		)

		await user.click(screen.getByLabelText('Second'))

		expect(screen.getByTestId('fields').textContent.split(',')).toContain('email')
	})
})

type Kind = { type: 'person' | 'company'; inn: string; card: string; email: string }
const KIND: Kind = { type: 'company', inn: '', card: '', email: '' }
const KIND_OPTIONS = [
	{ value: 'person', label: 'Person' },
	{ value: 'company', label: 'Company' },
]

describe('a skipped step keeps its values', () => {
	it('shows them again, and hands them to onSubmit', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<Form
				defaultValues={KIND}
				onSubmit={onSubmit}
			>
				{(form) => (
					<form.Steps>
						<form.Step name='kind'>
							<form.RadioGroupField
								name='type'
								label='Kind'
								options={KIND_OPTIONS}
							/>
						</form.Step>
						<form.Step
							name='company'
							when={(values) => values.type === 'company'}
						>
							<form.TextField
								name='inn'
								label='INN'
							/>
						</form.Step>
						<form.Steps.List>
							{({ goTo }) => (
								<>
									<button
										type='button'
										onClick={() => {
											goTo('kind')
										}}
									>
										to kind
									</button>
									<button
										type='button'
										onClick={() => {
											goTo('company')
										}}
									>
										to company
									</button>
								</>
							)}
						</form.Steps.List>
						<form.SubmitButton>Finish</form.SubmitButton>
					</form.Steps>
				)}
			</Form>,
		)
		await click(user, 'to company')
		await user.type(await screen.findByLabelText('INN'), '123')
		await click(user, 'to kind')
		await user.click(screen.getByLabelText('Person'))
		await user.click(screen.getByLabelText('Company'))
		await click(user, 'to company')

		expect(await screen.findByLabelText('INN')).toHaveValue('123')
		await click(user, 'to kind')
		await user.click(screen.getByLabelText('Person'))
		await click(user, 'Finish')
		await waitFor(() => {
			expect(onSubmit).toHaveBeenCalledTimes(1)
		})
		expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ value: { type: 'person', inn: '123' } })
	})
})

describe('the step on screen when steps stop applying', () => {
	it('falls back to the first step that applies when none before it does', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={{ showA: true, showB: true }}>
				{(form) => (
					<form.Steps initial='b'>
						<form.Steps.Subscribe selector={(state) => state.current}>
							{(step) => <output data-testid='current'>{step}</output>}
						</form.Steps.Subscribe>
						<form.Step
							name='a'
							when={(values) => values.showA}
						/>
						<form.Step
							name='b'
							when={(values) => values.showB}
						>
							<form.CheckboxField
								name='showA'
								label='Show a'
							/>
							<form.CheckboxField
								name='showB'
								label='Show b'
							/>
						</form.Step>
						<form.Step name='c' />
					</form.Steps>
				)}
			</Form>,
		)
		await user.click(screen.getByLabelText('Show a'))

		await user.click(screen.getByLabelText('Show b'))

		expect(current()).toBe('c')
	})
})

describe('moves that go nowhere', () => {
	it('ignores goTo to a step that does not apply or does not exist, and Back on the first step', async () => {
		const user = userEvent.setup()
		const onStepChange = vi.fn()
		render(
			<Form defaultValues={KIND}>
				{(form) => (
					<form.Steps onStepChange={onStepChange}>
						<form.Step name='kind' />
						<form.Step
							name='hidden'
							when={() => false}
						/>
						<form.Steps.List>
							{({ goTo }) => (
								<>
									<button
										type='button'
										onClick={() => {
											goTo('hidden')
										}}
									>
										to hidden
									</button>
									<button
										type='button'
										onClick={() => {
											goTo('nowhere')
										}}
									>
										to nowhere
									</button>
								</>
							)}
						</form.Steps.List>
						<form.Steps.Controls>
							{({ goBack }) => (
								<button
									type='button'
									onClick={goBack}
								>
									Back
								</button>
							)}
						</form.Steps.Controls>
					</form.Steps>
				)}
			</Form>,
		)

		await click(user, 'to hidden')
		await click(user, 'to nowhere')
		await click(user, 'Back')

		expect(onStepChange).not.toHaveBeenCalled()
	})
})

describe("the step's async check and the sync layer", () => {
	it('is skipped while a field of the step has a sync error from the form', async () => {
		const user = userEvent.setup()
		const checkAsync = vi.fn(() => Promise.resolve(undefined))
		render(
			<Form
				defaultValues={PLAN}
				validators={{
					onSubmit: testSchema<Plan>((values) => (values.plan === '' ? [{ message: 'Pick one', path: ['plan'] }] : [])),
				}}
			>
				{(form) => (
					<form.Steps>
						<form.Step
							name='plan'
							validators={{ onSubmitAsync: checkAsync }}
						>
							<form.TextField
								name='plan'
								label='Plan'
							/>
						</form.Step>
						<form.Step name='end' />
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

		await click(user, 'Next')

		expect(await screen.findByText('Pick one')).toBeInTheDocument()
		expect(checkAsync).not.toHaveBeenCalled()
	})
})

describe("a step's own errors", () => {
	it('go with the step when it stops applying, so they no longer block the form', async () => {
		const user = userEvent.setup()
		render(
			<Form defaultValues={{ skip: false, note: '' }}>
				{(form) => (
					<form.Steps>
						<form.Step name='first'>
							<form.TextField
								name='note'
								label='Note'
							/>
							<form.CheckboxField
								name='skip'
								label='Skip the review'
							/>
						</form.Step>
						<form.Step
							name='review'
							when={(values) => !values.skip}
							validators={{ onChange: ({ value }) => (value.note === 'x' ? 'Not reviewable' : undefined) }}
						/>
						<form.SubmitButton>Finish</form.SubmitButton>
					</form.Steps>
				)}
			</Form>,
		)
		await user.type(screen.getByLabelText('Note'), 'x')
		expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled()

		await user.click(screen.getByLabelText('Skip the review'))

		expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled()
	})
})

describe('a stepper of Items', () => {
	it('re-renders only the item it leaves and the item it enters', async () => {
		const user = userEvent.setup()
		const commits = new Map<string, number>()
		const names = ['a', 'b', 'c', 'd'] as const
		render(
			<Form defaultValues={PLAN}>
				{(form) => (
					<form.Steps initial='b'>
						{names.map((name) => (
							<Profiler
								key={name}
								id={name}
								onRender={(id) => {
									commits.set(id, (commits.get(id) ?? 0) + 1)
								}}
							>
								<form.Steps.Item name={name}>
									{({ isCurrent }) => <span>{`${name}${isCurrent ? '*' : ''}`}</span>}
								</form.Steps.Item>
							</Profiler>
						))}
						{names.map((name) => (
							<form.Step
								key={name}
								name={name}
							/>
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

		await click(user, 'Next')

		expect(await screen.findByText('c*')).toBeInTheDocument()
		expect([...commits.keys()].sort()).toEqual(['b', 'c'])
	})
})

describe("a step's onMount", () => {
	it('runs each time the step comes on screen, with its fields in place', async () => {
		const user = userEvent.setup()
		const onMount = vi.fn(({ value }: { value: Plan }) =>
			value.plan === '' ? { fields: { plan: 'Pick a plan' } } : undefined,
		)
		render(
			<Form defaultValues={PLAN}>
				{(form) => (
					<form.Steps>
						<form.Step name='account'>
							<form.TextField
								name='email'
								label='Email'
							/>
						</form.Step>
						<form.Step
							name='plan'
							validators={{ onMount }}
						>
							<form.TextField
								name='plan'
								label='Plan'
							/>
						</form.Step>
						<form.Subscribe selector={(state) => state.fieldMeta.plan?.errors.length ?? 0}>
							{(count) => <output data-testid='plan-errors'>{count}</output>}
						</form.Subscribe>
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
			</Form>,
		)
		expect(onMount).not.toHaveBeenCalled()

		await click(user, 'Next')
		await screen.findByLabelText('Plan')

		expect(onMount).toHaveBeenCalledTimes(1)
		expect(screen.getByTestId('plan-errors')).toHaveTextContent('1')

		await click(user, 'Back')
		await click(user, 'Next')
		await screen.findByLabelText('Plan')

		expect(onMount).toHaveBeenCalledTimes(2)
	})

	it('runs on the step shown first, too', () => {
		const onMount = vi.fn(() => undefined)
		render(
			<Form defaultValues={PLAN}>
				{(form) => (
					<form.Steps>
						<form.Step
							name='plan'
							validators={{ onMount }}
						>
							<form.TextField
								name='plan'
								label='Plan'
							/>
						</form.Step>
					</form.Steps>
				)}
			</Form>,
		)

		expect(onMount).toHaveBeenCalledTimes(1)
	})
})
