/**
 * Normalisation of whatever a validator put into `field.state.meta.errors`.
 *
 * TanStack Form does not constrain the error shape: a standard-schema validator
 * (zod / valibot / arktype) yields issue objects carrying a `message`, a hand-written
 * validator may return a plain string, and a thrown `Error` can surface as-is. The kits'
 * `ErrorText` renders strings, so every shape is funnelled through here.
 */

/** An error carrying a human-readable `message` — the standard-schema issue shape. */
type MessageBearingError = { message: unknown }

function hasMessage(error: unknown): error is MessageBearingError {
	return typeof error === 'object' && error !== null && 'message' in error
}

/**
 * Reduce one raw validator error to its display string, or `null` when it carries
 * nothing renderable (e.g. `undefined` slots left by a cleared validator).
 */
function formatFieldError(error: unknown): string | null {
	if (error == null) {
		return null
	}

	if (typeof error === 'string') {
		return error.length > 0 ? error : null
	}

	if (hasMessage(error)) {
		const { message } = error
		return typeof message === 'string' && message.length > 0 ? message : null
	}

	return String(error)
}

/**
 * Map raw `field.state.meta.errors` to display strings, dropping the empty slots and
 * deduplicating by the final display string (not the raw error object).
 *
 * A field-level validator and a form-level one can both run against the same field — e.g.
 * `FormRenderer`'s schema-driven validator attaches the same compiled check to both
 * `onChange` and `onSubmit` (see `resolveSchemaValidators`) — so `errors` can carry two
 * distinct objects that normalise to the same text. Left alone that reads as the product
 * repeating itself ("This field is required, This field is required"), so this is where every
 * consumer gets the fix at once. Order is preserved: the first occurrence of a message keeps
 * its position, since a field can legitimately carry several different messages and they
 * should not reshuffle between renders.
 *
 * @example
 * formatFieldErrors([{ message: 'Required' }, undefined, 'Too short'])
 * // → ['Required', 'Too short']
 * @example
 * formatFieldErrors([{ message: 'Required' }, { message: 'Required' }])
 * // → ['Required']
 */
export function formatFieldErrors(errors: readonly unknown[] | undefined): string[] {
	if (errors === undefined) {
		return []
	}

	const messages = errors.map(formatFieldError).filter((message): message is string => message !== null)
	return Array.from(new Set(messages))
}

/** Whether the field has at least one renderable error — the `invalid` / `aria-invalid` source. */
export function hasFieldErrors(errors: readonly unknown[] | undefined): boolean {
	return formatFieldErrors(errors).length > 0
}
