import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { createForm } from './create-form'
import { testComponents, testFields, testFormElement } from './test-kit'
import { testSchema } from './test-schema'

import type { FieldGroupScope } from './group-types'
import type { testFields as TestFields } from './test-kit'
import type { LensFieldComponent } from '@tanstack/react-form'
import type { ReactNode } from 'react'

const { Form, useForm, withFieldGroup } = createForm({
	FormElement: testFormElement,
	fields: testFields,
	components: testComponents,
})

type Pair = { password: string; confirm: string }
type Profile = { displayName: string; email: string; security: Pair }
const PROFILE: Profile = { displayName: 'Ann', email: '', security: { password: '', confirm: '' } }
const MIN_PASSWORD = 8
const TOO_SHORT = 'At least 8 characters'
const MISMATCH = 'Passwords do not match'
const VALID_PASSWORD = 'correct horse'

const pairSchema = testSchema<Pair>((pair) => [
	...(pair.password.length < MIN_PASSWORD ? [{ message: TOO_SHORT, path: ['password'] }] : []),
	...(pair.password !== pair.confirm ? [{ message: MISMATCH, path: ['confirm'] }] : []),
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
		</>
	),
})

type Instance = ReturnType<typeof useProfileForm>
function useProfileForm(onSubmit: () => void) {
	return useForm({ defaultValues: PROFILE, onSubmit })
}

/** §4 scenario 2, profile: a FormGroup with no validators around a block that brings the rule. */
function ProfileCase({
	onSubmit,
	onGroupSubmit,
	onForm,
}: {
	onSubmit: () => void
	onGroupSubmit: (props: { value: Pair }) => void
	onForm?: (form: Instance) => void
}): ReactNode {
	const form = useProfileForm(onSubmit)
	useEffect(() => {
		onForm?.(form)
	}, [form, onForm])
	return (
		<Form form={form}>
			<form.TextField
				name='email'
				label='Email'
			/>
			<form.FormGroup
				name='security'
				onGroupSubmit={onGroupSubmit}
			>
				{(group) => (
					<>
						<PasswordPair fields='security' />
						<button
							type='button'
							onClick={() => void group.handleSubmit()}
						>
							Change password
						</button>
					</>
				)}
			</form.FormGroup>
			<form.SubmitButton>Save profile</form.SubmitButton>
			<form.Submit>{({ formErrors }) => <output data-testid='form-errors'>{formErrors.join('|')}</output>}</form.Submit>
		</Form>
	)
}

async function fillPair(user: ReturnType<typeof userEvent.setup>, password: string, confirm: string): Promise<void> {
	await user.type(screen.getByLabelText('Password'), password)
	await user.type(screen.getByLabelText('Repeat'), confirm)
}

describe('group submit (D7, §4 scenario 2)', () => {
	it("is blocked by a nested block's rule while untouched, and focuses the group's first error (R63, R71)", async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		render(
			<ProfileCase
				onSubmit={onSubmit}
				onGroupSubmit={onGroupSubmit}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Change password' }))

		expect(onGroupSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(TOO_SHORT)).toBeInTheDocument()
		expect(screen.getByLabelText('Password')).toHaveFocus()
	})

	it('submits only the branch once valid, and never the form', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		render(
			<ProfileCase
				onSubmit={onSubmit}
				onGroupSubmit={onGroupSubmit}
			/>,
		)

		await fillPair(user, VALID_PASSWORD, VALID_PASSWORD)
		await user.click(screen.getByRole('button', { name: 'Change password' }))

		expect(onGroupSubmit).toHaveBeenCalledTimes(1)
		expect(onGroupSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ value: { password: VALID_PASSWORD, confirm: VALID_PASSWORD } }),
		)
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('runs the block on a whole-form submit, untouched (R62)', async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(
			<ProfileCase
				onSubmit={onSubmit}
				onGroupSubmit={vi.fn()}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Save profile' }))

		expect(onSubmit).not.toHaveBeenCalled()
		expect(screen.getByText(TOO_SHORT)).toBeInTheDocument()

		await fillPair(user, VALID_PASSWORD, VALID_PASSWORD)
		await user.click(screen.getByRole('button', { name: 'Save profile' }))
		expect(onSubmit).toHaveBeenCalledTimes(1)
	})

	it("clears only the branch's server errors before a group submit (R61, Review Focus 3)", async () => {
		const user = userEvent.setup()
		let instance: Instance | undefined
		render(
			<ProfileCase
				onSubmit={vi.fn()}
				onGroupSubmit={vi.fn()}
				onForm={(form) => {
					instance = form
				}}
			/>,
		)
		await fillPair(user, VALID_PASSWORD, VALID_PASSWORD)
		act(() => {
			instance?.setServerErrors({ fields: { 'security.password': 'Reused', email: 'Taken' }, form: 'Down' })
		})

		await user.click(screen.getByRole('button', { name: 'Change password' }))

		expect(screen.queryByText('Reused')).not.toBeInTheDocument()
		expect(screen.getByText('Taken')).toBeInTheDocument()
		expect(screen.getByTestId('form-errors')).toHaveTextContent('Down')
	})

	it("withFieldGroup's own handleSubmit submits the block, not the form (R70)", async () => {
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		const onGroupSubmit = vi.fn()
		const Section = withFieldGroup({
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
					<button
						type='button'
						onClick={() => void group.handleSubmit()}
					>
						Save section
					</button>
				</>
			),
		})
		render(
			<Form
				defaultValues={PROFILE}
				onSubmit={onSubmit}
			>
				{() => (
					<Section
						fields='security'
						onGroupSubmit={onGroupSubmit}
					/>
				)}
			</Form>,
		)

		await fillPair(user, VALID_PASSWORD, VALID_PASSWORD)
		await user.click(screen.getByRole('button', { name: 'Save section' }))

		expect(onGroupSubmit).toHaveBeenCalledWith(
			expect.objectContaining({ value: { password: VALID_PASSWORD, confirm: VALID_PASSWORD } }),
		)
		expect(onSubmit).not.toHaveBeenCalled()
	})

	it('shows one message when the group and the form schema state the same rule (R62)', async () => {
		const user = userEvent.setup()
		render(
			<Form
				defaultValues={PROFILE}
				validators={{
					onSubmit: testSchema<Profile>((values) =>
						values.security.password.length < MIN_PASSWORD
							? [{ message: TOO_SHORT, path: ['security', 'password'] }]
							: [],
					),
				}}
			>
				{(form) => (
					<>
						<PasswordPair fields='security' />
						<form.SubmitButton>Save profile</form.SubmitButton>
					</>
				)}
			</Form>,
		)

		await user.click(screen.getByRole('button', { name: 'Save profile' }))

		expect(screen.getAllByText(TOO_SHORT)).toHaveLength(1)
	})

	it("puts a block's pathless issue in group.errors", async () => {
		const user = userEvent.setup()
		const NotName = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: {
				onChange: testSchema<Pair>((pair) => (pair.password === 'ann' ? [{ message: 'Not your name' }] : [])),
			},
			render: ({ group }) => (
				<>
					<group.TextField
						name='password'
						label='Password'
					/>
					<output data-testid='block-errors'>{group.errors.join('|')}</output>
				</>
			),
		})
		render(<Form defaultValues={PROFILE}>{() => <NotName fields='security' />}</Form>)

		await user.type(screen.getByLabelText('Password'), 'ann')

		expect(screen.getByTestId('block-errors')).toHaveTextContent('Not your name')
	})
})

describe('group submit types', () => {
	it("types onGroupSubmit's value by the block, and carries the submit meta through", () => {
		type Meta = { reason: string }
		const Typed = withFieldGroup<Pair, Meta>({
			defaultValues: { password: '', confirm: '' },
			render: ({ group }) => {
				expectTypeOf(group.handleSubmit).parameter(0).toEqualTypeOf<Meta | undefined>()
				expectTypeOf(group.errors).toEqualTypeOf<string[]>()
				return null
			},
		})
		expectTypeOf<FieldGroupScope<Pair, typeof TestFields, Meta>['NativeField']>().toEqualTypeOf<
			LensFieldComponent<Pair, Meta>
		>()
		const cases = (
			<Form defaultValues={PROFILE}>
				{() => (
					<Typed
						fields='security'
						onGroupSubmit={({ value, meta }) => {
							expectTypeOf(value).toEqualTypeOf<Pair>()
							expectTypeOf(meta).toEqualTypeOf<Meta>()
						}}
					/>
				)}
			</Form>
		)
		expectTypeOf(cases).not.toBeAny()
	})

	it("checks a block's validators against its own shape", () => {
		const Checked = withFieldGroup({
			defaultValues: { password: '', confirm: '' },
			validators: {
				onChange: ({ value }) => (value.password === value.confirm ? undefined : MISMATCH),
				// @ts-expect-error -- the block has no `nope`
				onBlur: ({ value }: { value: { nope: string } }) => value.nope,
			},
			render: () => null,
		})
		expectTypeOf(Checked).toBeFunction()
	})
})
