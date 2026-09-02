import { buildPageWindow, buildPaginationLabel, PAGE_GAP, PaginationVariant } from '@ez-kit/data-grid-react'

import {
	Pagination as ShadcnPagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationLink,
	PaginationItem,
	PaginationPrevious,
	PaginationNext,
} from '@grid-shadcn/components/ui/pagination'

import type { PaginationProps } from '@ez-kit/data-grid-react'

const DISABLED_CLASS = 'pointer-events-none opacity-50'
const LABEL_CLASS = 'mr-3 flex items-center text-sm text-muted-foreground'

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
	onPageChange,
}: PaginationProps) {
	const label = buildPaginationLabel({ variant, pageIndex, pageSize, pageCount, rowCount })
	// Page links need a known page count; without one `numbered` degrades to prev/next.
	const showLinks = variant === PaginationVariant.Numbered && pageCount !== undefined
	// Windowed, never one link per page: 100 pages render as `1 … 4 5 6 … 100`, not 100 controls.
	const pages = showLinks ? buildPageWindow({ pageIndex, pageCount, siblings, boundaries }) : []

	return (
		<ShadcnPagination
			className='mt-3'
			data-slot='pagination'
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
				{pages.map((page, slot) =>
					page === PAGE_GAP ? (
						<PaginationItem key={`${PAGE_GAP}-${String(slot)}`}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={page}>
							<PaginationLink
								isActive={page === pageIndex}
								onClick={() => {
									onPageChange(page)
								}}
							>
								{page + 1}
							</PaginationLink>
						</PaginationItem>
					),
				)}
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
