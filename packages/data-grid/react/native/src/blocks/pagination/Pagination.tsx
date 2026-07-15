import { PaginationVariant } from '@ez-kit/data-grid-react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const FIRST_GLYPH = '«'
const PREVIOUS_GLYPH = '‹'
const NEXT_GLYPH = '›'
const LAST_GLYPH = '»'
const RANGE_SEPARATOR = '–'
const OF_LABEL = 'of'
const PAGE_LABEL = 'Page'

function buildRangeLabel(pageIndex: number, pageSize: number, rowCount: number): string {
	const from = pageIndex * pageSize + 1
	const to = Math.min((pageIndex + 1) * pageSize, rowCount)
	return `${String(from)}${RANGE_SEPARATOR}${String(to)} ${OF_LABEL} ${String(rowCount)}`
}

function buildPageLabel(pageIndex: number, pageCount: number): string {
	return `${PAGE_LABEL} ${String(pageIndex + 1)} ${OF_LABEL} ${String(pageCount)}`
}

export function Pagination({
	variant,
	pageIndex,
	pageSize,
	pageCount,
	rowCount,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onFirstPage,
	onLastPage,
	onPageChange,
}: PaginationProps) {
	const isNumbered = variant === PaginationVariant.Numbered
	const rangeLabel = rowCount !== undefined ? buildRangeLabel(pageIndex, pageSize, rowCount) : undefined
	// `simple` is defined by its range label, so when the total is unknown it degrades to
	// the page label rather than rendering bare prev/next with no context.
	const label =
		variant === PaginationVariant.Simple
			? (rangeLabel ?? buildPageLabel(pageIndex, pageCount))
			: buildPageLabel(pageIndex, pageCount)

	return (
		<div data-variant={variant}>
			{isNumbered && (
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
			{isNumbered ? (
				Array.from({ length: pageCount }).map((_, index) => (
					<button
						key={index}
						type='button'
						aria-current={index === pageIndex ? 'page' : undefined}
						onClick={() => {
							onPageChange(index)
						}}
					>
						{index + 1}
					</button>
				))
			) : (
				<span>{label}</span>
			)}
			<button
				type='button'
				onClick={onNextPage}
				disabled={!canNextPage}
			>
				{NEXT_GLYPH}
			</button>
			{isNumbered && (
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
