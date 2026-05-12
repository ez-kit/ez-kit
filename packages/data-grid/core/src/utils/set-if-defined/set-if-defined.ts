/**
 * Assigns `value` to `target[key]` only when `value` is not `undefined`.
 *
 * Compatible with `exactOptionalPropertyTypes: true` — `undefined` values
 * are skipped rather than written, so optional properties stay absent.
 */
export function setIfDefined<T extends object, K extends keyof T>(
	target: T,
	key: K,
	value: T[K] | undefined,
): void {
	if (value !== undefined) {
		target[key] = value
	}
}
