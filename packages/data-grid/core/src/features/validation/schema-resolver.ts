import type { StandardSchemaV1Issue } from './standard-schema'
import type {
	ValidateConfig,
	ValidateContext,
	ValidationErrors,
	ValidationResult,
	ValidationSchema,
} from './validation-types'

/** Separator between form-level messages; both kits render the banner with `white-space: pre-line`. */
const FORM_ERROR_SEPARATOR = '\n'

/**
 * Turns any Standard Schema into a `validate` function with the result `{ schema }` gives, so a
 * schema can be combined with checks of one's own:
 *
 * ```ts
 * validate: async (values, ctx) => (await schemaResolver(schema)(values)) ?? checkEmailOnServer(values, ctx),
 * ```
 *
 * Asynchronous because a schema's `validate` may answer with a promise.
 */
export function schemaResolver(schema: ValidationSchema): (values: unknown) => Promise<ValidationResult> {
	return (values) => validateWithSchema(schema, values)
}

/**
 * Run a `validate` config over `values` — the function form or the `{ schema }` shorthand.
 *
 * @internal — the one dispatcher `creating` and `editing` share.
 */
export async function runValidator<TData>(
	validate: ValidateConfig<TData>,
	values: Record<string, unknown>,
	ctx: ValidateContext,
): Promise<ValidationResult> {
	if (typeof validate === 'function') return await validate(values as Partial<TData>, ctx)
	return await validateWithSchema(validate.schema, values)
}

async function validateWithSchema(schema: ValidationSchema, values: unknown): Promise<ValidationResult> {
	// The type already demands `~standard`, but a schema reaches here untyped often enough — a JS
	// config, a cast, zod before 3.24 — that the bare property read deserves a message of its own.
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (typeof schema['~standard']?.validate !== 'function') {
		throw new TypeError(
			'[@ez-kit/data-grid] `validate: { schema }` needs a Standard Schema (https://standardschema.dev) — ' +
				'zod 3.24 or later, valibot 1, arktype 2, … The schema given has no `~standard.validate`.',
		)
	}
	const result = await schema['~standard'].validate(values)
	if (result.issues === undefined) return null
	return issuesToResult(result.issues)
}

/**
 * The field an issue belongs to: its path's first segment, normalised from `{ key }` to the bare
 * key. Only the first segment, because an error is keyed by `columnId` — `['address', 'street']`
 * is the `address` column's. `undefined` for an issue about the value as a whole.
 */
function fieldKeyOf(issue: StandardSchemaV1Issue): string | undefined {
	const first = issue.path?.[0]
	if (first === undefined) return undefined
	const key = typeof first === 'object' ? first.key : first
	const name = String(key)
	return name === '' ? undefined : name
}

/**
 * Field issues go to `errors` under their key, several messages per field kept in order; issues
 * without a path are joined into `formError`, which is absent when there are none.
 */
function issuesToResult(issues: readonly StandardSchemaV1Issue[]): ValidationResult {
	const errors: ValidationErrors = {}
	const formErrors: string[] = []
	for (const issue of issues) {
		const key = fieldKeyOf(issue)
		if (key === undefined) formErrors.push(issue.message)
		else (errors[key] ??= []).push(issue.message)
	}
	return formErrors.length > 0 ? { errors, formError: formErrors.join(FORM_ERROR_SEPARATOR) } : { errors }
}
