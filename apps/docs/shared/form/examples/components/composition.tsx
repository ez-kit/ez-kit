'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Button } from 'shared/form/Button'
import { Form, TextInputType, withFieldGroup, withForm } from 'shared/form/FormKit'

type PasswordPairValues = { password: string; confirm: string }

type Profile = { displayName: string; security: PasswordPairValues }

type SignUp = { login: string; password: string; confirm: string }

type Sent = { to: string; value: unknown }

const MIN_PASSWORD = 8

const MIN_LOGIN = 3

const passwordPairSchema = z
	.object({ password: z.string().min(MIN_PASSWORD), confirm: z.string() })
	.refine((pair) => pair.password === pair.confirm, { path: ['confirm'], message: 'Passwords do not match' })

const PASSWORD_PAIR_DEFAULTS: PasswordPairValues = { password: '', confirm: '' }

const PasswordPair = withFieldGroup({
	defaultValues: PASSWORD_PAIR_DEFAULTS,
	validators: { onChange: passwordPairSchema },
	render: ({ group }) => (
		<>
			<group.TextField
				name='password'
				type={TextInputType.Password}
				label='Password'
			/>
			<group.TextField
				name='confirm'
				type={TextInputType.Password}
				label='Repeat password'
			/>
		</>
	),
})

const PROFILE_DEFAULTS: Profile = { displayName: 'Ann', security: PASSWORD_PAIR_DEFAULTS }

export function CompositionExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={PROFILE_DEFAULTS}
			onSubmit={({ value }) => {
				setSent({ to: 'saveProfile', value })
			}}
		>
			{(form) => (
				<>
					<form.TextField
						name='displayName'
						label='Display name'
					/>
					<form.FormGroup
						name='security'
						onGroupSubmit={({ value }) => {
							setSent({ to: 'changePassword', value })
						}}
					>
						{(group) => (
							<form.Section title='Password'>
								<PasswordPair fields='security' />
								<Button onClick={() => void group.handleSubmit()}>Change password</Button>
							</form.Section>
						)}
					</form.FormGroup>
					<form.SubmitButton>Save profile</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}

const SIGN_UP_DEFAULTS: SignUp = { login: '', password: '', confirm: '' }

const signUpSchema = z.object({ login: z.string().min(MIN_LOGIN), password: z.string(), confirm: z.string() })

const LoginPart = withForm({
	defaultValues: SIGN_UP_DEFAULTS,
	render: ({ form }) => (
		<form.TextField
			name='login'
			label='Login'
		/>
	),
})

export function CompositionSignUpExample() {
	const [sent, setSent] = useState<Sent | null>(null)

	return (
		<Form
			defaultValues={SIGN_UP_DEFAULTS}
			validators={{ onSubmit: signUpSchema }}
			onSubmit={({ value }) => {
				setSent({ to: 'signUp', value })
			}}
		>
			{(form) => (
				<>
					<LoginPart />
					<PasswordPair fields={{ password: 'password', confirm: 'confirm' }} />
					<form.SubmitButton>Sign up</form.SubmitButton>
					<pre>{JSON.stringify(sent, null, 2)}</pre>
				</>
			)}
		</Form>
	)
}
