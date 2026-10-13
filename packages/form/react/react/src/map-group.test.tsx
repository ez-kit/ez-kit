import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

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
