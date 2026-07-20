/**
 * Coercions from the untyped `field.state.value` to the value type an injected input
 * expects.
 *
 * `AnyFieldApi` deliberately erases the field's value type, and a consumer can always
 * hand `defaultValues` that disagree with the field they render. Coercing here keeps a
 * mismatch from reaching the kit's input as an invalid `value` prop.
 */

/** An empty text control is an empty string, never `undefined` — React would uncontrol it. */
export function asText(value: unknown): string {
	if (typeof value === 'string') {
		return value
	}

	return value == null ? '' : String(value)
}

/** An empty numeric control is genuinely "no number", which `undefined` models and `NaN` does not. */
export function asNumber(value: unknown): number | undefined {
	return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

export function asBoolean(value: unknown): boolean {
	return value === true
}
