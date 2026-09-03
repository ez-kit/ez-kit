'use client'

import { useState } from 'react'

import { Form, TextInputType } from 'shared/form/FormKit'

type Account = {
	email: string
	password: string
}

/** Long enough that the busy button is actually visible, short enough not to feel broken. */
const SERVER_DELAY_MS = 1200

/** The one address the fake backend already knows about — type it to see the field error. */
const TAKEN_EMAIL = 'taken@example.com'

/**
 * Stands in for the endpoint. It answers the way a real one does: either nothing to report,
 * or a message keyed by the field that caused the rejection.
 */
async function createAccount(value: Account): Promise<{ fields: { email: string } } | undefined> {
	await new Promise((resolve) => setTimeout(resolve, SERVER_DELAY_MS))

	return value.email === TAKEN_EMAIL ? { fields: { email: 'That address is already registered' } } : undefined
}

/**
 * Submission, end to end: a request that takes a visible moment, a button that reflects it,
 * and a rejection that lands on the field responsible.
 *
 * The request lives in `validators.onSubmitAsync`, not in `onSubmit`, because that is the
 * one place whose return value TanStack Form maps back onto fields: returning
 * `{ fields: { email: '…' } }` writes the message into `email`'s `onSubmit` error slot, and
 * the `onSubmit` handler below never runs. Returning `undefined` lets it run, which is where
 * the success path belongs. (`form` may be set alongside `fields` for a message about the
 * form as a whole.)
 *
 * `isSubmitting` is already true while that validator awaits, and `form.SubmitButton`
 * subscribes to `canSubmit` and `isSubmitting` itself — it is disabled for the whole round
 * trip and again whenever the form is invalid, so there is nothing to wire here. Give it
 * `disabled` only to add a reason of your own.
 *
 * The server error clears itself: editing the field runs its change validation, and a field
 * that now passes drops its stale `onSubmit` error. Without that the button would stay
 * disabled forever, since an unresolved error keeps `canSubmit` false.
 */
export function SubmitExample() {
	const [saved, setSaved] = useState<Account | null>(null)

	return (
		<div className='flex flex-col gap-4'>
			<Form
				defaultValues={{ email: '', password: '' }}
				validators={{ onSubmitAsync: async ({ value }) => createAccount(value) }}
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
							description={`Try ${TAKEN_EMAIL} to see the server reject it.`}
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
