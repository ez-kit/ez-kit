/**
 * What a searchable field says while the typed text is shorter than its `minLength` — in the
 * popup's empty state, where it would otherwise say there are no matches. Below the minimum the
 * source was not asked, so "No matches" would be a claim about a search that never ran.
 */
export function minLengthHint(minLength: number): string {
	return `Type at least ${String(minLength)} characters`
}
