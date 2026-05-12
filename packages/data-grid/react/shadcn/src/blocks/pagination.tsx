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

export function Pagination({
	pageIndex,
	pageCount,
	canPreviousPage,
	canNextPage,
	onPreviousPage,
	onNextPage,
	onPageChange,
}: PaginationProps) {
	return (
		<ShadcnPagination className='mt-3'>
			<PaginationContent>
				<PaginationItem>
					<PaginationPrevious
						aria-disabled={!canPreviousPage}
						className={canPreviousPage ? undefined : DISABLED_CLASS}
						onClick={canPreviousPage ? onPreviousPage : undefined}
					/>
				</PaginationItem>
				{Array.from({ length: pageCount }).map((_, index) => (
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
