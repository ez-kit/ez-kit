import { PaginationVariant } from '@ez-kit/data-grid-react'

import {
	Pagination as ShadcnPagination,
	PaginationContent,
	PaginationLink,
	PaginationItem,
	PaginationPrevious,
	PaginationNext,
} from '@grid-shadcn/components/ui/pagination'


import type { PaginationProps } from '@ez-kit/data-grid-react'

const DISABLED_CLASS = 'pointer-events-none opacity-50'
const LABEL_CLASS = 'mr-3 flex items-center text-sm text-muted-foreground'
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
	onPageChange,
}: PaginationProps) {
	const rangeLabel = rowCount !== undefined ? buildRangeLabel(pageIndex, pageSize, rowCount) : undefined
	// `simple` is defined by its range label, so when the total is unknown it degrades to
	// the page label rather than rendering bare prev/next with no context.
	const label =
		variant === PaginationVariant.Compact
			? buildPageLabel(pageIndex, pageCount)
			: (rangeLabel ?? (variant === PaginationVariant.Simple ? buildPageLabel(pageIndex, pageCount) : undefined))

	return (
		<ShadcnPagination
			className='mt-3'
			data-variant={variant}
		>
			{label !== undefined && <span className={LABEL_CLASS}>{label}</span>}
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						aria-disabled={!canPreviousPage}
						className={canPreviousPage ? undefined : DISABLED_CLASS}
						onClick={canPreviousPage ? onPreviousPage : undefined}
					/>
				</PaginationItem>
				{variant === PaginationVariant.Numbered &&
					Array.from({ length: pageCount }).map((_, index) => (
						<PaginationItem key={index}>
							<PaginationLink
								isActive={index === pageIndex}
								onClick={() => {
									onPageChange(index)
								}}
							>
								{index + 1}
							</PaginationLink>
						</PaginationItem>
					))}
				<PaginationItem>
					<PaginationNext
						aria-disabled={!canNextPage}
						className={canNextPage ? undefined : DISABLED_CLASS}
						onClick={canNextPage ? onNextPage : undefined}
					/>
				</PaginationItem>
			</PaginationContent>
		</ShadcnPagination>
	)
}
