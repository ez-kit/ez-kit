import { PaginationVariant } from '../types'

const RANGE_SEPARATOR = '–'
const OF_LABEL = 'of'
const PAGE_LABEL = 'Page'

/**
 * Inputs for {@link buildPaginationLabel}. `pageCount` / `rowCount` are optional
 * because either can be genuinely unknown: a manually paginated grid that supplies
 * neither `rowCount` nor `pageCount` knows only which page it is on.
 *
 * Both are already normalized by the `Pagination` component — the `-1` "unknown"
 * sentinel that core hands to TanStack never reaches here.
 */
export type PaginationLabelInput = {
	variant: PaginationVariant
	pageIndex: number
	pageSize: number
	// Explicitly `| undefined`: under `exactOptionalPropertyTypes` callers forward
	// `PaginationProps.pageCount` / `.rowCount`, which are `number | undefined`.
	pageCount?: number | undefined
	rowCount?: number | undefined
}

/** `1–10 of 50` — the slice of the total currently on screen. */
function buildRangeLabel(pageIndex: number, pageSize: number, rowCount: number): string {
	const from = rowCount === 0 ? 0 : pageIndex * pageSize + 1
	const to = Math.min((pageIndex + 1) * pageSize, rowCount)
	return `${String(from)}${RANGE_SEPARATOR}${String(to)} ${OF_LABEL} ${String(rowCount)}`
}

/** `Page 2 of 5`, or `Page 2` when the total page count is unknown. */
function buildPageLabel(pageIndex: number, pageCount: number | undefined): string {
	const current = `${PAGE_LABEL} ${String(pageIndex + 1)}`
	return pageCount === undefined ? current : `${current} ${OF_LABEL} ${String(pageCount)}`
}

/**
 * The footer's text label for a variant, or `undefined` when that variant shows none.
 *
 * One implementation shared by every UI kit: the label is content, not styling, and
 * three copies of this rule had already drifted apart. Kits still own placement,
 * markup and styling — they render the returned string however they like.
 *
 * Degradation is deliberate: `simple` is *defined* by its "X–Y of N" range, so when the
 * total is unknown it shows the page label rather than bare prev/next with no context.
 */
export function buildPaginationLabel({
	variant,
	pageIndex,
	pageSize,
	pageCount,
	rowCount,
}: PaginationLabelInput): string | undefined {
	if (variant === PaginationVariant.Compact) return buildPageLabel(pageIndex, pageCount)
	if (rowCount !== undefined) return buildRangeLabel(pageIndex, pageSize, rowCount)
	// No total to range over: `simple` still needs a label, `numbered` has its page links.
	return variant === PaginationVariant.Simple ? buildPageLabel(pageIndex, pageCount) : undefined
}
