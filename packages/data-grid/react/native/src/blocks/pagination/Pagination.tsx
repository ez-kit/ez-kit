import { buildPageWindow, buildPaginationLabel, PAGE_GAP, PaginationVariant } from '@ez-kit/data-grid-react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const FIRST_GLYPH = '«'
const PREVIOUS_GLYPH = '‹'
const NEXT_GLYPH = '›'
const LAST_GLYPH = '»'
const GAP_GLYPH = '…'

export function Pagination({
	variant,
	pageIndex,
	pageSize,
	pageCount,
	rowCount,
	siblings,
	boundaries,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onFirstPage,
	onLastPage,
	onPageChange,
}: PaginationProps) {
	const label = buildPaginationLabel({ variant, pageIndex, pageSize, pageCount, rowCount })
	const isNumbered = variant === PaginationVariant.Numbered
	// Page links need a known page count; without one `numbered` degrades to the jumps + prev/next.
	const showLinks = isNumbered && pageCount !== undefined
	// Windowed, never one link per page: 100 pages render as `1 … 4 5 6 … 100`, not 100 controls.
	const pages = showLinks ? buildPageWindow({ pageIndex, pageCount, siblings, boundaries }) : []
	// Jumping to the first page is always page 0 — unlike the last page, it needs no total.
	const showFirst = isNumbered
	const showLast = isNumbered && pageCount !== undefined

	return (
		<div data-variant={variant}>
			{showFirst && (
				<button
					type='button'
					onClick={onFirstPage}
					disabled={!canPreviousPage}
				>
					{FIRST_GLYPH}
				</button>
			)}
			<button
				type='button'
				onClick={onPreviousPage}
				disabled={!canPreviousPage}
			>
				{PREVIOUS_GLYPH}
			</button>
			{label !== undefined && <span>{label}</span>}
			{pages.map((page, slot) =>
				page === PAGE_GAP ? (
					<span
						key={`${PAGE_GAP}-${String(slot)}`}
						aria-hidden
					>
						{GAP_GLYPH}
					</span>
				) : (
					<button
						key={page}
						type='button'
						aria-current={page === pageIndex ? 'page' : undefined}
						onClick={() => {
							onPageChange(page)
						}}
					>
						{page + 1}
					</button>
				),
			)}
			<button
				type='button'
				onClick={onNextPage}
				disabled={!canNextPage}
			>
				{NEXT_GLYPH}
			</button>
			{showLast && (
				<button
					type='button'
					onClick={onLastPage}
					disabled={!canNextPage}
				>
					{LAST_GLYPH}
				</button>
			)}
		</div>
	)
}
