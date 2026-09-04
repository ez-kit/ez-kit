import { buildPageWindow, buildPaginationLabel, PAGE_GAP, PaginationVariant } from '@ez-kit/data-grid-react'
import { ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'

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
	onFirstPage,
	onLastPage,
	onPageChange,
}: PaginationProps) {
	const label = buildPaginationLabel({ variant, pageIndex, pageSize, pageCount, rowCount })
	// Page links need a known page count; without one `numbered` degrades to prev/next.
	const showLinks = variant === PaginationVariant.Numbered && pageCount !== undefined
	// Windowed, never one link per page: 100 pages render as `1 … 4 5 6 … 100`, not 100 controls.
	const pages = showLinks ? buildPageWindow({ pageIndex, pageCount, siblings, boundaries }) : []
	// Jump-to-edge only under `compact`: that variant navigates without page links, so first/last
	// are the only way to reach the ends. `numbered` already lists the boundary pages, and
	// `simple` deliberately offers nothing but prev/next.
	const showEdges = variant === PaginationVariant.Compact

	return (
		<ShadcnPagination
			className='mt-3'
			data-slot='pagination'
			data-variant={variant}
		>
			{label !== undefined && <span className={LABEL_CLASS}>{label}</span>}
			<PaginationContent>
				{showEdges && (
					<PaginationItem>
						<PaginationLink
							aria-label='Go to first page'
							aria-disabled={!canPreviousPage}
							className={canPreviousPage ? undefined : DISABLED_CLASS}
							onClick={canPreviousPage ? onFirstPage : undefined}
						>
							<ChevronsLeftIcon />
						</PaginationLink>
					</PaginationItem>
				)}
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
				{showEdges && (
					<PaginationItem>
						<PaginationLink
							aria-label='Go to last page'
							aria-disabled={!canNextPage}
							className={canNextPage ? undefined : DISABLED_CLASS}
							onClick={canNextPage ? onLastPage : undefined}
						>
							<ChevronsRightIcon />
						</PaginationLink>
					</PaginationItem>
				)}
			</PaginationContent>
		</ShadcnPagination>
	)
}
