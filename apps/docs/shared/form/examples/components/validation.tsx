'use client'

import { useState } from 'react'
import { z } from 'zod'

import { Form } from 'shared/form/FormKit'

// A plain standard-schema validator. TanStack Form consumes it natively —
// @ez-kit/form adds no resolver of its own.
const schema = z.object({
	email: z.email('Enter a valid email address'),
	age: z.number().min(18, 'You must be at least 18'),
	terms: z.literal(true, { error: 'You have to accept the terms' }),
})

export function ValidationExample() {
	const [saved, setSaved] = useState<string | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={{ email: '', age: 0, terms: false }}
				validators={{ onChange: schema }}
				onSubmit={({ value }) => {
					setSaved(value.email)
				}}
			>
				{(form) => (
					<>
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
					</>
				)}
			</Form>

			{saved ? <p className='text-sm opacity-70'>Submitted as {saved}</p> : null}
		</div>
	)
}
