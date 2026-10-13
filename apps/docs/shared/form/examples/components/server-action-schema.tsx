'use client'

import { startTransition, useActionState } from 'react'

import { SchemaForm } from 'shared/form/FormKit'

import { signUp } from '../actions/sign-up'
import { signUpSchema } from '../actions/sign-up-schema'

export function ServerActionSchemaExample() {
	const [state, action, isPending] = useActionState(signUp, {})

	return (
		<div className='flex flex-col gap-4'>
			<SchemaForm
				schema={signUpSchema}
				serverErrors={state.serverErrors}
				onSubmit={({ value }) => {
					startTransition(() => {
						action(value)
					})
				}}
			/>

			{isPending ? <p className='text-sm'>Signing up…</p> : null}
			{state.ok ? <p className='text-sm'>Signed up.</p> : null}
		</div>
	)
}
