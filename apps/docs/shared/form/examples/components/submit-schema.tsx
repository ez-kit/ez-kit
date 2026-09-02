'use client'

import { useState } from 'react'

import {
	buildValidator,
	defineFormSchema,
	FormFieldType,
	FormRenderer,
	TextInputType,
	useForm,
} from 'shared/form/FormKit'

type Account = {
	email: string
	password: string
}

/** Long enough that the busy button is actually visible, short enough not to feel broken. */
const SERVER_DELAY_MS = 1200

/** The one address the fake backend already knows about — type it to see the field error. */
const TAKEN_EMAIL = 'taken@example.com'

async function createAccount(value: Account): Promise<{ fields: { email: string } } | undefined> {
	await new Promise((resolve) => setTimeout(resolve, SERVER_DELAY_MS))

	return value.email === TAKEN_EMAIL ? { fields: { email: 'That address is already registered' } } : undefined
}

const schema = defineFormSchema<Account>()({
	version: 1,
	children: [
		{
			type: FormFieldType.Text,
			name: 'email',
			label: 'Email',
			placeholder: 'you@example.com',
			inputType: TextInputType.Email,
			description: `Try ${TAKEN_EMAIL} to see the server reject it.`,
			defaultValue: '',
			validate: { required: true, format: 'email' },
		},
		{
			type: FormFieldType.Text,
			name: 'password',
			label: 'Password',
			inputType: TextInputType.Password,
			defaultValue: '',
			validate: { required: true, minLength: 8 },
		},
		{ type: 'submit', label: 'Create account' },
	],
})

/**
 * Hoisted so the validator keeps one identity across renders — the same reason the option
 * registry in the option-sources example is a module constant.
 */
const validator = buildValidator<Account>(schema)

/**
 * The document twin of the JSX submission example — and the one case where the document is
 * rendered **controlled**.
 *
 * Uncontrolled `FormRenderer` compiles the schema's `validate` blocks itself, and it refuses
 * to do that while a `validators` prop is also present: TanStack Form takes exactly one
 * validator per trigger, so merging two issue sets onto one path has no defined precedence.
 * Since the server round trip *is* a validator (`onSubmitAsync` is where a rejection can
 * still be mapped back onto a field), the two have to be assembled in one place. Calling
 * `buildValidator` by hand and owning the instance is that place: the declarative
 * constraints go to `onChange`, the server to `onSubmitAsync`.
 *
 * Owning the instance also means owning the two conveniences the uncontrolled mode adds for
 * free — the schema's `defaultValue` entries are passed as `defaultValues` here, and a
 * document with `when` conditions would need `stripHiddenValues(schema, value)` at the top
 * of `onSubmit` to keep hidden fields out of the payload. This document has neither
 * conditions nor hidden fields, so only the defaults are restated.
 */
export function SubmitSchemaExample() {
	const [saved, setSaved] = useState<Account | null>(null)

	const form = useForm({
		defaultValues: { email: '', password: '' },
		validators: {
			onChange: validator,
			onSubmitAsync: async ({ value }) => createAccount(value),
		},
		onSubmit: ({ value }) => {
			setSaved(value)
		},
	})

	return (
		<div className='flex flex-col gap-4'>
			<FormRenderer
				form={form}
				schema={schema}
			/>

			{saved ? (
				<pre className='rounded-md bg-black/5 p-3 text-xs dark:bg-white/10'>{JSON.stringify(saved, null, 2)}</pre>
			) : null}
		</div>
	)
}
