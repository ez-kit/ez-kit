import { buildPageWindow, PAGE_GAP } from '@ez-kit/data-grid-react'
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
const LABEL_CLASS = 'flex items-center text-sm text-muted-foreground'

export function Pagination({
	links,
	edges,
	label,
	pageIndex,
	pageCount,
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
	// Page links need a known page count; without one they degrade to prev/next.
	const showLinks = links && pageCount !== undefined
	// Windowed, never one link per page: 100 pages render as `1 … 4 5 6 … 100`, not 100 controls.
	const pages = showLinks ? buildPageWindow({ pageIndex, pageCount, siblings, boundaries }) : []

	return (
		<ShadcnPagination
			// shadcn's root centres the whole bar (`mx-auto flex w-full justify-center`), which is
			// its blog-pagination default. A grid footer reads label-left / controls-right, and
			// that is also where a footer-placed PageSizer lands — so both kits use the layout
			// heroui's `.pagination` already has.
			className='mt-3 justify-between'
			data-slot='pagination'
			data-links={links || undefined}
			data-edges={edges || undefined}
		>
			{label !== undefined && <span className={LABEL_CLASS}>{label}</span>}
			<PaginationContent>
				{edges && (
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
				{edges && (
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
