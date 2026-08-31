/**
 * The wire format for every date the form format carries.
 *
 * A date is a **calendar date string** (`YYYY-MM-DD`), never a `Date` object: a schema has to
 * survive `JSON.stringify` — that is what makes a backend-delivered document possible at all —
 * and a `Date` neither round-trips nor means one thing across time zones. Each kit converts to
 * and from its own representation (`@internationalized/date` for HeroUI, `Date` for
 * react-day-picker) at its own edge, so no date library ever reaches this package.
 */

/** `YYYY-MM-DD`, the ISO 8601 calendar date. Deliberately anchored and non-backtracking. */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Whether `value` is a well-formed `YYYY-MM-DD` string that names a real day.
 *
 * The pattern alone would accept `2026-02-31`, so the parsed date is compared back against
 * its own parts — a document may come from anywhere, and a picker handed an impossible day
 * would either throw inside the kit or silently drift to another date.
 */
export function isIsoDate(value: unknown): value is string {
	if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false

	const parsed = new Date(`${value}T00:00:00Z`)
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
}

/**
 * A closed date range. Both ends are always present: a half-picked range is UI state inside
 * the picker, never form state — see the `daterange` field in `schema.ts`.
 */
export type DateRangeValue = {
	start: string
	end: string
}

export function isDateRangeValue(value: unknown): value is DateRangeValue {
	if (typeof value !== 'object' || value === null) return false

	const range = value as Record<string, unknown>
	return isIsoDate(range.start) && isIsoDate(range.end)
}
