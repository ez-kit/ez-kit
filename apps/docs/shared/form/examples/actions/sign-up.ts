'use server'

import { buildValidator } from '@ez-kit/form-core'

import { signUpSchema } from './sign-up-schema'

import type { SignUpValues } from './sign-up-schema'
import type { ServerErrors } from 'shared/form/FormKit'

export type SignUpResult = {
	serverErrors?: ServerErrors<SignUpValues>
	ok?: true
}

type IssuePath = readonly (PropertyKey | { readonly key: PropertyKey })[]

const TAKEN_USERNAMES = new Set(['admin', 'root'])

const MALFORMED_REQUEST = 'The request could not be read. Reload the page and try again.'

const validator = buildValidator(signUpSchema)

function isSignUpValues(values: unknown): values is SignUpValues {
	return (
		typeof values === 'object' &&
		values !== null &&
		'username' in values &&
		typeof values.username === 'string' &&
		'email' in values &&
		typeof values.email === 'string'
	)
}

function toFieldPath(path: IssuePath): string {
	return path
		.map((segment) => (typeof segment === 'object' ? segment.key : segment))
		.reduce<string>((joined, key) => {
			if (typeof key === 'number') return `${joined}[${String(key)}]`
			return joined === '' ? String(key) : `${joined}.${String(key)}`
		}, '')
}

export async function signUp(_previous: SignUpResult, values: unknown): Promise<SignUpResult> {
	if (!isSignUpValues(values)) {
		return { serverErrors: { form: MALFORMED_REQUEST } }
	}

	const result = await validator['~standard'].validate(values)

	if (result.issues) {
		const fields = Object.fromEntries(result.issues.map((issue) => [toFieldPath(issue.path ?? []), issue.message]))
		return { serverErrors: { fields } }
	}

	if (TAKEN_USERNAMES.has(values.username.trim().toLowerCase())) {
		return { serverErrors: { fields: { username: 'That username is taken' } } }
	}

	return { ok: true }
}
