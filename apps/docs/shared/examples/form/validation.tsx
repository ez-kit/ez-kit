'use client'

import { useForm } from '@ez-kit/form-shadcn'
import { useState } from 'react'
import { z } from 'zod'

// A plain standard-schema validator. TanStack Form consumes it natively —
// @ez-kit/form adds no resolver of its own.
const schema = z.object({
	email: z.email('Enter a valid email address'),
	age: z.number().min(18, 'You must be at least 18'),
	terms: z.literal(true, { error: 'You have to accept the terms' }),
})

export default function ValidationExample() {
	const [saved, setSaved] = useState<string | null>(null)

	const form = useForm({
		defaultValues: { email: '', age: 0, terms: false },
		validators: { onChange: schema },
		onSubmit: ({ value }) => {
			setSaved(value.email)
		},
	})

	return (
		<div className='flex flex-col gap-4'>
			<form.Form>
				<form.TextField
					name='email'
					label='Email'
					placeholder='you@example.com'
				/>
				<form.NumberField
					name='age'
					label='Age'
				/>
				<form.CheckboxField
					name='terms'
					label='I accept the terms'
				/>
				<form.SubmitButton>Submit</form.SubmitButton>
			</form.Form>

			{saved ? <p className='text-sm text-fd-muted-foreground'>Submitted as {saved}</p> : null}
		</div>
	)
}
