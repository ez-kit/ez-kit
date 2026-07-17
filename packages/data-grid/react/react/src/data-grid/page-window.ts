/**
 * Marker for a run of hidden pages between two rendered page links. Kits map it to their own
 * ellipsis element — a `'gap'` is structure ("pages are missing here"), never markup.
 */
export const PAGE_GAP = 'gap'

/** One slot of the rendered page strip: a zero-based page index, or a run of hidden pages. */
export type PageWindowItem = number | typeof PAGE_GAP

/**
 * Inputs for {@link buildPageWindow}. `pageIndex` is zero-based and every returned page index
 * is too — the +1 for display belongs to the kits, which already own the label markup.
 *
 * `siblings` / `boundaries` are explicitly `| undefined`: under `exactOptionalPropertyTypes`
 * callers forward `PaginationProps.siblings` / `.boundaries`, which are `number | undefined`.
 */
export type PageWindowInput = {
	pageIndex: number
	pageCount: number
	siblings?: number | undefined
	boundaries?: number | undefined
}

/** Pages kept on each side of the current one when the caller specifies no `siblings`. */
export const DEFAULT_PAGE_SIBLINGS = 1
/** Pages kept at each end of the strip when the caller specifies no `boundaries`. */
export const DEFAULT_PAGE_BOUNDARIES = 1

/** A page total of zero — an empty grid has no pages to window over. */
const EMPTY_TOTAL = 0
/** A gap hiding exactly one page is replaced by that page: `…` costs the same room as `7`. */
const COLLAPSIBLE_GAP = 1
/** The two gap slots a fully windowed strip spends, plus the current page itself. */
const WINDOW_OVERHEAD = 3

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max)
}

/**
 * The widest a windowed strip can get: both boundary groups, both gaps, and the current page
 * with its siblings. A grid with no more pages than that gains nothing from windowing — the
 * gaps would hide pages while taking the very slots those pages would have occupied — so it
 * renders in full. This is what keeps a 5-page grid reading `1 2 3 4 5`, never `1 2 … 5`.
 */
function maxWindowSlots(siblings: number, boundaries: number): number {
	return boundaries * 2 + siblings * 2 + WINDOW_OVERHEAD
}

/**
 * Which pages a numbered footer should render, in order, with `'gap'` marking each run of
 * hidden pages: `[0, 'gap', 3, 4, 5, 'gap', 99]` → `1 … 4 5 6 … 100`.
 *
 * One implementation shared by every UI kit, for the same reason as `buildPaginationLabel`:
 * which pages are reachable is content, not styling, and all three kits had independently
 * grown the same unbounded `Array.from({ length: pageCount })` loop — 100 pages meant 100
 * live controls in one unbreakable flex row. Kits still own markup and styling; they map
 * each index to their link element and each {@link PAGE_GAP} to their ellipsis.
 *
 * The strip is the *union* of the boundary pages and the sibling window around the current
 * page, so it narrows near the ends (`1 2 … 100`) rather than padding out to a fixed width:
 * it never renders a page the caller's `siblings`/`boundaries` did not ask for. Grids small
 * enough to fit are exempt and render in full — see {@link maxWindowSlots}.
 *
 * Inputs are defensive because they are effectively user data: `pageIndex` can legitimately
 * sit past the end (a server-paginated grid does not rewind when `rowCount` shrinks under it),
 * and negative `siblings`/`boundaries` would otherwise silently invert the window.
 */
export function buildPageWindow({ pageIndex, pageCount, siblings, boundaries }: PageWindowInput): PageWindowItem[] {
	if (pageCount <= EMPTY_TOTAL) return []

	const siblingCount = Math.max(siblings ?? DEFAULT_PAGE_SIBLINGS, 0)
	const boundaryCount = Math.max(boundaries ?? DEFAULT_PAGE_BOUNDARIES, 0)
	const lastPage = pageCount - 1
	const current = clamp(pageIndex, 0, lastPage)

	if (pageCount <= maxWindowSlots(siblingCount, boundaryCount)) {
		return Array.from({ length: pageCount }, (_, page) => page)
	}

	const visible = new Set<number>()
	for (let page = 0; page < Math.min(boundaryCount, pageCount); page++) visible.add(page)
	for (let page = Math.max(pageCount - boundaryCount, 0); page <= lastPage; page++) visible.add(page)
	for (let page = Math.max(current - siblingCount, 0); page <= Math.min(current + siblingCount, lastPage); page++) {
		visible.add(page)
	}

	const items: PageWindowItem[] = []
	let previous: number | undefined
	for (const page of [...visible].sort((a, b) => a - b)) {
		const hidden = previous === undefined ? 0 : page - previous - 1
		if (hidden === COLLAPSIBLE_GAP && previous !== undefined) items.push(previous + 1)
		else if (hidden > COLLAPSIBLE_GAP) items.push(PAGE_GAP)
		items.push(page)
		previous = page
	}
	return items
}
