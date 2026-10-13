'use server'

import { buildValidator } from '@ez-kit/form-core'

import { signUpSchema } from './sign-up-schema'

import type { SignUpValues } from './sign-up-schema'
import type { ServerErrors } from 'shared/form/FormKit'

export type SignUpResult = {
	serverErrors?: ServerErrors<SignUpValues>
	ok?: true
}

const TAKEN_USERNAMES = new Set(['admin', 'root'])

const validator = buildValidator(signUpSchema)

export async function signUp(_previous: SignUpResult, values: SignUpValues): Promise<SignUpResult> {
	const result = await validator['~standard'].validate(values)

	if (result.issues) {
		const fields = Object.fromEntries(result.issues.map((issue) => [String(issue.path?.[0]), issue.message]))
		return { serverErrors: { fields } }
	}

	if (TAKEN_USERNAMES.has(values.username.trim().toLowerCase())) {
		return { serverErrors: { fields: { username: 'That username is taken' } } }
	}

	return { ok: true }
}
