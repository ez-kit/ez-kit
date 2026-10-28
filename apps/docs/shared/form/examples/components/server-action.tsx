'use client'

import { startTransition, useActionState } from 'react'

import { Form } from 'shared/form/FormKit'

import { signUp } from '../actions/sign-up'

export function ServerActionExample() {
	const [state, action, isPending] = useActionState(signUp, {})

	return (
		<div className='flex flex-col gap-4'>
			<Form
				method='post'
				defaultValues={{ username: '', email: '' }}
				serverErrors={state.serverErrors}
				onSubmit={({ value }) => {
					startTransition(() => {
						action(value)
					})
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='username'
							label='Username'
							description='Try admin to see the server reject it.'
							validate={{ required: true, minLength: 3, maxLength: 32 }}
						/>
						<form.TextField
							name='email'
							label='Email'
							type='email'
							validate={{ required: true, maxLength: 254, format: 'email' }}
						/>
						<form.SubmitButton disabled={isPending}>Sign up</form.SubmitButton>
					</>
				)}
			</Form>

			{state.ok ? <p className='text-sm'>Signed up.</p> : null}
		</div>
	)
}
