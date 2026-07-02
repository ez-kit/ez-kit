import type { PaginationProps } from '@ez-kit/data-grid-react'

export function Pagination({
	pageIndex,
	pageCount,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onFirstPage,
	onLastPage,
}: PaginationProps) {
	return (
		<div>
			<button
				type='button'
				onClick={onFirstPage}
				disabled={!canPreviousPage}
			>
				{'«'}
			</button>
			<button
				type='button'
				onClick={onPreviousPage}
				disabled={!canPreviousPage}
			>
				{'‹'}
			</button>
			<span>
				{pageIndex + 1} / {pageCount}
			</span>
			<button
				type='button'
				onClick={onNextPage}
				disabled={!canNextPage}
			>
				{'›'}
			</button>
			<button
				type='button'
				onClick={onLastPage}
				disabled={!canNextPage}
			>
				{'»'}
			</button>
		</div>
	)
}
