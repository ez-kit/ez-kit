import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import type { GroupValidators } from './group-types'
import type { ReactNode } from 'react'

const { Form, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Pair = { password: string; confirm: string }
type SignUp = { login: string; password: string; confirm: string; newPassword: string; other: string }
const SIGN_UP: SignUp = { login: '', password: '', confirm: '', newPassword: '', other: '' }
const MIN_PASSWORD = 8
const TOO_SHORT = 'At least 8 characters'
const MISMATCH = 'Passwords do not match'
const NOT_LOGIN = 'Must differ from the login'
const VALID = 'correct horse'

const pairSchema = testSchema<Pair>((pair) => [
	...(pair.password.length < MIN_PASSWORD ? [{ message: TOO_SHORT, path: ['password'] }] : []),
	...(pair.password !== pair.confirm ? [{ message: MISMATCH, path: ['confirm'] }] : []),
	...(pair.password === 'ann-is-me' ? [{ message: NOT_LOGIN }] : []),
])

const PasswordPair = withFieldGroup({
	defaultValues: { password: '', confirm: '' },
	validators: { onChange: pairSchema },
	render: ({ group }) => (
		<>
			<group.TextField
				name='password'
				label='Password'
			/>
			<group.TextField
				name='confirm'
				label='Repeat'
			/>
			<output data-testid='block-errors'>{group.errors.join('|')}</output>
			<button
				type='button'
				onClick={() => void group.handleSubmit()}
			>
				Save pair
			</button>
		</>
	),
})

const ROOT_MAP = { password: 'password', confirm: 'confirm' } as const

/** Review Focus 1's form schema: it checks only `login`, and passes on an empty one. */
const NO_SPACES = 'No spaces in a login'
const loginSchema = testSchema<SignUp>((values) =>
	values.login.includes(' ') ? [{ message: NO_SPACES, path: ['login'] }] : [],
)

function SignUpCase({
	onSubmit,
	onGroupSubmit,
}: {
	onSubmit: () => void
	onGroupSubmit?: (props: { value: Pair }) => void
}): ReactNode {
	return (
		<Form
			defaultValues={SIGN_UP}
			validators={{ onSubmit: loginSchema }}
			onSubmit={onSubmit}
		>
			{(form) => (
				<>
					<form.TextField
						name='login'
						label='Login'
					/>
					<PasswordPair
						fields={ROOT_MAP}
						onGroupSubmit={onGroupSubmit}
					/>
					<form.SubmitButton>Sign up</form.SubmitButton>
					<form.Submit>
						{({ formErrors, canSubmit }) => (
							<>
								<output data-testid='form-errors'>{formErrors.join('|')}</output>
								<output data-testid='can-submit'>{String(canSubmit)}</output>
							</>
						)}
					</form.Submit>
				</>
			)}
		</Form>
	)
}

describe('withFieldGroup over a field map (R67)', () => {
	it('blocks an untouched sign-up and focuses the first error (Review Focus 1)', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<SignUpCase onSubmit={onSubmit} />)

		await user.click(screen.getByRole('button', { name: 'Sign up' }))

		expect(onSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(TOO_SHORT)).toBeInTheDocument()
		expect(screen.getByLabelText('Password')).toHaveFocus()
	})

	it('puts a path issue on the real field, and submits clean values once valid', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<SignUpCase onSubmit={onSubmit} />)

		await user.type(screen.getByLabelText('Password'), VALID)
		await user.type(screen.getByLabelText('Repeat'), 'x')
		expect(screen.getByLabelText('Repeat').closest('[data-field]')).toHaveTextContent(MISMATCH)

		await user.clear(screen.getByLabelText('Repeat'))
		await user.type(screen.getByLabelText('Repeat'), VALID)
		await user.click(screen.getByRole('button', { name: 'Sign up' }))

		expect(onSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ value: { ...SIGN_UP, password: VALID, confirm: VALID } }),
		)
	})

	it('keeps a pathless issue on the block, out of formErrors, and blocks submitting', async () => {
		const user = userEvent.setup()
		render(<SignUpCase onSubmit={vi.fn()} />)

		await user.type(screen.getByLabelText('Password'), 'ann-is-me')
		await user.type(screen.getByLabelText('Repeat'), 'ann-is-me')

		expect(screen.getByTestId('block-errors')).toHaveTextContent(NOT_LOGIN)
		expect(screen.getByTestId('form-errors')).toHaveTextContent('')
		expect(screen.getByTestId('can-submit')).toHaveTextContent('false')
	})

	it('submits the block alone, with its value assembled from the map', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		render(
			<SignUpCase
				onSubmit={onSubmit}
				onGroupSubmit={onGroupSubmit}
			/>,
		)

		await user.type(screen.getByLabelText('Password'), VALID)
		await user.type(screen.getByLabelText('Repeat'), VALID)
		await user.click(screen.getByRole('button', { name: 'Save pair' }))

		expect(onGroupSubmit).toHaveBeenCalledWith(expect.objectContaining({ value: { password: VALID, confirm: VALID } }))
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('runs onBlur on a mapped field only, and onMount once', async () => {
		const user = userEvent.setup()
		const onBlur = vi.fn(() => undefined)
		const onMount = vi.fn(() => undefined)
		const Watched = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: { onBlur, onMount },
			render: ({ group }) => (
				<group.TextField
					name='password'
					label='Password'
				/>
			),
		})
		render(
			<Form defaultValues={SIGN_UP}>
				{(form) => (
					<>
						<form.TextField
							name='other'
							label='Other'
						/>
						<Watched fields={{ password: 'newPassword', confirm: 'confirm' }} />
					</>
				)}
			</Form>,
		)
		expect(onMount).toHaveBeenCalledTimes(1)

		await user.click(screen.getByLabelText('Other'))
		await user.tab()
		expect(onBlur).not.toHaveBeenCalled()

		await user.click(screen.getByLabelText('Password'))
		await user.tab()
		expect(onBlur).toHaveBeenCalledWith(expect.objectContaining({ value: { password: '', confirm: '' } }))
	})

	it('routes a function validator’s { fields, group } result', async () => {
		const user = userEvent.setup()
		const Card = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: {
				onChange: ({ value }) =>
					value.password === 'x' ? { fields: { confirm: 'Wrong' }, group: 'Declined' } : undefined,
			},
			render: ({ group }) => (
				<>
					<group.TextField
						name='password'
						label='Password'
					/>
					<group.TextField
						name='confirm'
						label='Repeat'
					/>
					<output data-testid='block-errors'>{group.errors.join('|')}</output>
				</>
			),
		})
		render(<Form defaultValues={SIGN_UP}>{() => <Card fields={ROOT_MAP} />}</Form>)

		await user.type(screen.getByLabelText('Repeat'), 'y')
		await user.type(screen.getByLabelText('Password'), 'x')

		expect(screen.getByTestId('block-errors')).toHaveTextContent('Declined')
		expect(screen.getByLabelText('Repeat').closest('[data-field]')).toHaveTextContent('Wrong')
	})

	it('runs an async validator once the sync ones pass, and blocks the block submit on it', async () => {
		const user = userEvent.setup()
		const TAKEN = 'Already used'
		const onChangeAsync = vi.fn(async ({ value }: { value: Pair }) => {
			await Promise.resolve()
			return value.password === VALID ? TAKEN : undefined
		})
		const onGroupSubmit = vi.fn()
		const Checked = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: { onChange: pairSchema, onChangeAsync },
			render: ({ group }) => (
				<>
					<group.TextField
						name='password'
						label='Password'
					/>
					<group.TextField
						name='confirm'
						label='Repeat'
					/>
					<output data-testid='block-errors'>{group.errors.join('|')}</output>
					<button
						type='button'
						onClick={() => void group.handleSubmit()}
					>
						Save pair
					</button>
				</>
			),
		})
		render(
			<Form defaultValues={SIGN_UP}>
				{() => (
					<Checked
						fields={ROOT_MAP}
						onGroupSubmit={onGroupSubmit}
					/>
				)}
			</Form>,
		)

		await user.type(screen.getByLabelText('Password'), 'short')
		expect(onChangeAsync).not.toHaveBeenCalled()

		await user.clear(screen.getByLabelText('Password'))
		await user.type(screen.getByLabelText('Password'), VALID)
		await user.type(screen.getByLabelText('Repeat'), VALID)
		await waitFor(() => {
			expect(screen.getByTestId('block-errors')).toHaveTextContent(TAKEN)
		})

		await user.click(screen.getByRole('button', { name: 'Save pair' }))
		expect(onGroupSubmit).not.toHaveBeenCalled()
	})

	it('removes its errors when the block unmounts', async () => {
		const user = userEvent.setup()
		function Case(): ReactNode {
			const [shown, setShown] = useState(true)
			return (
				<Form defaultValues={SIGN_UP}>
					{(form) => (
						<>
							{shown && <PasswordPair fields={ROOT_MAP} />}
							<button
								type='button'
								onClick={() => {
									setShown(false)
								}}
							>
								Hide
							</button>
							<form.Submit>
								{({ canSubmit }) => <output data-testid='can-submit'>{String(canSubmit)}</output>}
							</form.Submit>
						</>
					)}
				</Form>
			)
		}
		render(<Case />)
		await user.type(screen.getByLabelText('Password'), 'ann-is-me')
		expect(screen.getByTestId('can-submit')).toHaveTextContent('false')

		await user.click(screen.getByRole('button', { name: 'Hide' }))
		await act(async () => {})

		expect(screen.getByTestId('can-submit')).toHaveTextContent('true')
	})
})

/** A promise per call, settled by the test. */
function deferredValidator<TResult>() {
	const pending: ((result: TResult) => void)[] = []
	const validator = vi.fn(
		() =>
			new Promise<TResult>((resolve) => {
				pending.push(resolve)
			}),
	)
	const settle = async (resolveAll: boolean, result: TResult): Promise<void> => {
		await act(async () => {
			for (const resolve of pending.splice(0, resolveAll ? pending.length : 1)) resolve(result)
			await Promise.resolve()
		})
	}
	return {
		validator,
		settleAll: (result: TResult) => settle(true, result),
		settleOldest: (result: TResult) => settle(false, result),
	}
}

const TAKEN = 'Already used'

function pairBlock(validators: GroupValidators<Pair>) {
	return withFieldGroup<Pair>({
		defaultValues: { password: '', confirm: '' },
		validators,
		render: ({ group }) => (
			<>
				<group.TextField
					name='password'
					label='Password'
				/>
				<group.TextField
					name='confirm'
					label='Repeat'
				/>
				<output data-testid='block-errors'>{group.errors.join('|')}</output>
				<button
					type='button'
					onClick={() => void group.handleSubmit()}
				>
					Save pair
				</button>
			</>
		),
	})
}

describe('map group passes (fix round 1)', () => {
	it('keeps a newer sync error when an older async pass resolves (T6-1)', async () => {
		const user = userEvent.setup()
		const { validator, settleAll } = deferredValidator<undefined>()
		const Block = pairBlock({ onChange: pairSchema, onChangeAsync: validator })
		render(<Form defaultValues={SIGN_UP}>{() => <Block fields={ROOT_MAP} />}</Form>)

		await user.type(screen.getByLabelText('Password'), VALID)
		await user.type(screen.getByLabelText('Repeat'), VALID)
		expect(validator).toHaveBeenCalledTimes(1)
		await user.type(screen.getByLabelText('Repeat'), 'x')
		await settleAll(undefined)

		expect(screen.getByLabelText('Repeat').closest('[data-field]')).toHaveTextContent(MISMATCH)
	})

	it('does not submit a block whose first submit was superseded before its async check (T6-2)', async () => {
		const user = userEvent.setup()
		const { validator, settleOldest } = deferredValidator<string>()
		const onGroupSubmit = vi.fn()
		const Block = pairBlock({ onChange: pairSchema, onSubmitAsync: validator })
		render(
			<Form defaultValues={SIGN_UP}>
				{() => (
					<Block
						fields={ROOT_MAP}
						onGroupSubmit={onGroupSubmit}
					/>
				)}
			</Form>,
		)
		await user.type(screen.getByLabelText('Password'), VALID)
		await user.type(screen.getByLabelText('Repeat'), VALID)

		await user.click(screen.getByRole('button', { name: 'Save pair' }))
		await user.click(screen.getByRole('button', { name: 'Save pair' }))
		expect(onGroupSubmit).not.toHaveBeenCalled()
		await settleOldest(TAKEN)
		await settleOldest(TAKEN)

		expect(onGroupSubmit).not.toHaveBeenCalled()
		expect(screen.getByTestId('block-errors')).toHaveTextContent(TAKEN)
	})

	it('does not let a whole-form submit skip the async check a block submit started (T6-2)', async () => {
		const user = userEvent.setup()
		const { validator, settleOldest } = deferredValidator<string>()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		const Block = pairBlock({ onChange: pairSchema, onSubmitAsync: validator })
		render(
			<Form
				defaultValues={SIGN_UP}
				onSubmit={onSubmit}
			>
				{(form) => (
					<>
						<Block
							fields={ROOT_MAP}
							onGroupSubmit={onGroupSubmit}
						/>
						<form.SubmitButton>Sign up</form.SubmitButton>
					</>
				)}
			</Form>,
		)
		await user.type(screen.getByLabelText('Password'), VALID)
		await user.type(screen.getByLabelText('Repeat'), VALID)

		await user.click(screen.getByRole('button', { name: 'Save pair' }))
		await user.click(screen.getByRole('button', { name: 'Sign up' }))
		await settleOldest(TAKEN)
		await settleOldest(TAKEN)

		expect(onGroupSubmit).not.toHaveBeenCalled()
		expect(onSubmit).not.toHaveBeenCalled()
	})

	type CoreLike = { reset: () => void }
	const RESETS: [string, (instance: CoreLike, core: CoreLike) => void][] = [
		[
			'the instance',
			(instance) => {
				instance.reset()
			},
		],
		[
			'the core formApi',
			(_instance, core) => {
				core.reset()
			},
		],
	]

	it.each(RESETS)(
		'forgets its results on a reset through %s, and runs no change pass for it (T6-3)',
		async (_, reset) => {
			const user = userEvent.setup()
			const onChange = vi.fn(() => undefined)
			const Block = pairBlock({ onBlur: pairSchema, onChange })
			let instance: CoreLike | undefined
			let core: CoreLike | undefined
			render(
				<Form
					defaultValues={SIGN_UP}
					listeners={{
						onMount: ({ formApi }) => {
							core = formApi
						},
					}}
				>
					{(form) => {
						instance = form
						return <Block fields={ROOT_MAP} />
					}}
				</Form>,
			)
			await user.type(screen.getByLabelText('Password'), VALID)
			await user.type(screen.getByLabelText('Repeat'), 'x')
			await user.tab()
			expect(screen.getByLabelText('Repeat').closest('[data-field]')).toHaveTextContent(MISMATCH)
			const changePasses = onChange.mock.calls.length

			act(() => {
				if (instance !== undefined && core !== undefined) reset(instance, core)
			})
			expect(onChange).toHaveBeenCalledTimes(changePasses)

			await user.type(screen.getByLabelText('Password'), 'a')
			expect(screen.queryByText(TOO_SHORT)).not.toBeInTheDocument()
			expect(screen.queryByText(MISMATCH)).not.toBeInTheDocument()
		},
	)

	it("runs the groups mounted inside a map block on the block's own submit (T6-4, R82)", async () => {
		const user = userEvent.setup()
		type Address = { city: string }
		const CITY_REQUIRED = 'City required'
		const AddressBlock = withFieldGroup<Address>({
			defaultValues: { city: '' },
			validators: {
				onChange: testSchema<Address>((address) =>
					address.city === '' ? [{ message: CITY_REQUIRED, path: ['city'] }] : [],
				),
			},
			render: ({ group }) => (
				<group.TextField
					name='city'
					label='City'
				/>
			),
		})
		type Order = { address: Address; note: string }
		const onGroupSubmit = vi.fn()
		const OrderBlock = withFieldGroup<Order>({
			defaultValues: { address: { city: '' }, note: '' },
			render: ({ group }) => (
				<>
					<group.TextField
						name='note'
						label='Note'
					/>
					<AddressBlock fields='shipping' />
					<button
						type='button'
						onClick={() => void group.handleSubmit()}
					>
						Save order
					</button>
				</>
			),
		})
		render(
			<Form defaultValues={{ shipping: { city: '' }, comment: '' }}>
				{() => (
					<OrderBlock
						fields={{ address: 'shipping', note: 'comment' }}
						onGroupSubmit={onGroupSubmit}
					/>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Save order' }))

		expect(onGroupSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(CITY_REQUIRED)).toBeInTheDocument()
	})

	it("reports a routed key that names no field of the block as the block's own", async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const Block = pairBlock({ onChange: () => ({ fields: { confrim: 'Wrong' } }) })
		render(
			<Form
				defaultValues={SIGN_UP}
				onSubmit={onSubmit}
			>
				{(form) => (
					<>
						<Block fields={ROOT_MAP} />
						<form.SubmitButton>Sign up</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.type(screen.getByLabelText('Password'), 'x')
		expect(screen.getByTestId('block-errors')).toHaveTextContent('Wrong')
		await user.click(screen.getByRole('button', { name: 'Sign up' }))
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('leaves focus alone on an invalid block submit when focusOnError is false (R71)', async () => {
		const user = userEvent.setup()
		const Block = pairBlock({ onChange: pairSchema })
		render(
			<Form
				defaultValues={SIGN_UP}
				focusOnError={false}
			>
				{() => <Block fields={ROOT_MAP} />}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Save pair' }))

		expect(screen.getByText(TOO_SHORT)).toBeInTheDocument()
		expect(screen.getByLabelText('Password')).not.toHaveFocus()
	})
})
