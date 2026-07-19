'use client'

import { TextInputType, useForm } from '@ez-kit/form-shadcn'
import { useState } from 'react'

type Signup = {
	email: string
	password: string
}

export default function BasicFormExample() {
	const [saved, setSaved] = useState<Signup | null>(null)

	const form = useForm({
		defaultValues: { email: '', password: '' },
		onSubmit: ({ value }) => {
			setSaved(value)
		},
	})

	return (
		<div className='flex flex-col gap-4'>
			<form.Form>
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
			</form.Form>

			{saved ? <pre className='rounded-md bg-fd-muted p-3 text-xs'>{JSON.stringify(saved, null, 2)}</pre> : null}
		</div>
	)
}
