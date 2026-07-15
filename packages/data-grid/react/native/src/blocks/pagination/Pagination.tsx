import { buildPaginationLabel, PaginationVariant } from '@ez-kit/data-grid-react'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const FIRST_GLYPH = '«'
const PREVIOUS_GLYPH = '‹'
const NEXT_GLYPH = '›'
const LAST_GLYPH = '»'

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
	const label = buildPaginationLabel({ variant, pageIndex, pageSize, pageCount, rowCount })
	// Page links (and a last-page jump) need a known page count; without one `numbered`
	// degrades to prev/next.
	const showLinks = variant === PaginationVariant.Numbered && pageCount !== undefined

	return (
		<div data-variant={variant}>
			{showLinks && (
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
			{showLinks &&
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
				))}
			<button
				type='button'
				onClick={onNextPage}
				disabled={!canNextPage}
			>
				{NEXT_GLYPH}
			</button>
			{showLinks && (
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
