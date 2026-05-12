import type { ValidationErrors, ValidationResult } from './validation-types'
import type { ZodType } from 'zod'

/**
 * Helper for users not using `validate: { schema }` shorthand.
 * Internally we call the same logic via `runValidate`.
 *
 * Strict: only top-level path is used as the error key — matches columnId.
 * Multi-issue per field is preserved as `string[]`.
 */
export function zodResolver(schema: ZodType): (values: unknown) => ValidationResult {
	return (values) => zodSafeParseToResult(schema, values)
}

/** @internal — used by runValidate dispatcher and by zodResolver. */
export function zodSafeParseToResult(schema: ZodType, values: unknown): ValidationResult {
	const r = schema.safeParse(values)
	if (r.success) return null
	const errors: ValidationErrors = {}
	for (const issue of r.error.issues) {
		const top = issue.path[0]
		if (top === undefined || top === '') continue
		const key = String(top)
		;(errors[key] ??= []).push(issue.message)
	}
	return { errors }
}
