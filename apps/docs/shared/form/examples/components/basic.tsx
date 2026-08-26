'use client'

import { useState } from 'react'

import { Form, TextInputType } from 'shared/form/FormKit'

type Signup = {
	email: string
	password: string
}

export function BasicExample() {
	const [saved, setSaved] = useState<Signup | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={{ email: '', password: '' }}
				onSubmit={({ value }) => {
					setSaved(value)
				}}
			>
				{(form) => (
					<>
						<form.TextField
							name='email'
							label='Email'
							placeholder='you@example.com'
							description='We only use this to sign you in.'
						/>
						<form.TextField
							name='password'
							label='Password'
							type={TextInputType.Password}
						/>
						<form.SubmitButton>Create account</form.SubmitButton>
					</>
				)}
			</Form>

			{saved ? (
				<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{JSON.stringify(saved, null, 2)}</pre>
			) : null}
		</div>
	)
}
