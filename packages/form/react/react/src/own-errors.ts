import { formatFieldErrors } from '@ez-kit/form-core'

/** The key under which a standard schema reports the issues that name no path. */
const PATHLESS_KEY = ''

function isPathRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value) && !('message' in value)
}

function ownErrorsOf(value: unknown): readonly unknown[] {
	if (Array.isArray(value)) return value
	if (isPathRecord(value)) return value[PATHLESS_KEY] === undefined ? [] : ownErrorsOf(value[PATHLESS_KEY])
	return [value]
}

/**
 * The messages that belong to a group or a form itself, from the values of its `errorMap`.
 *
 * A standard schema on a form or a group reports **every** issue there as a record by relative path
 * — `{ password: [issue], '': [issue] }` — and TanStack hands the paths on to the fields. What stays
 * the owner's own is the `''` entry. A group's slot holds either that record (no pathless issue) or
 * the pathless issues alone (TanStack's `''` distribution overwrites it), so a record contributes its
 * `''` entry and an array its items; anything else is one message, formatted as a field's would be.
 */
export function formatOwnErrors(values: readonly unknown[]): string[] {
	return formatFieldErrors(values.flatMap(ownErrorsOf))
}
