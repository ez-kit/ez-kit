/** The one minimum that reads in the singular. */
const SINGULAR_MIN_LENGTH = 1

/**
 * What a searchable field says while the typed text is shorter than its `minLength` — in the
 * popup's empty state, where it would otherwise say there are no matches. Below the minimum the
 * source was not asked, so "No matches" would be a claim about a search that never ran.
 */
export function minLengthHint(minLength: number): string {
	const unit = minLength === SINGULAR_MIN_LENGTH ? 'character' : 'characters'
	return `Type at least ${String(minLength)} ${unit}`
}
